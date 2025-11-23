import twilio from 'twilio';
import { logger } from './logger';
import { db } from './db';
import { otpTokens, verificationAudit } from './schema-extensions';
import { eq, and, gt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export interface SMSService {
  sendSMS(phone: string, message: string): Promise<boolean>;
  sendOTP(phone: string, code: string): Promise<boolean>;
}

/**
 * Twilio SMS Service (production)
 */
class TwilioSMSService implements SMSService {
  private client: twilio.Twilio;
  private fromPhone: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromPhone = process.env.TWILIO_PHONE_NUMBER || '';

    if (!accountSid || !authToken || !this.fromPhone) {
      throw new Error('Twilio credentials not configured');
    }

    this.client = twilio(accountSid, authToken);
  }

  async sendSMS(phone: string, message: string): Promise<boolean> {
    try {
      await this.client.messages.create({
        body: message,
        from: this.fromPhone,
        to: phone,
      });
      logger.info(`SMS sent successfully to ${phone}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send SMS to ${phone}:`, error);
      return false;
    }
  }

  async sendOTP(phone: string, code: string): Promise<boolean> {
    const message = `Tu código de verificación GruaRD es: ${code}. Válido por 10 minutos.`;
    return this.sendSMS(phone, message);
  }
}

/**
 * Mock SMS Service (development/testing)
 */
class MockSMSService implements SMSService {
  async sendSMS(phone: string, message: string): Promise<boolean> {
    logger.info(`📱 [MOCK SMS] Enviando a ${phone}: ${message}`);
    return true;
  }

  async sendOTP(phone: string, code: string): Promise<boolean> {
    logger.info(`📱 [MOCK OTP] Código para ${phone}: ${code}`);
    return true;
  }
}

/**
 * Initialize SMS service based on environment
 */
function initializeSMSService(): SMSService {
  const hasTwilioCredentials = 
    process.env.TWILIO_ACCOUNT_SID && 
    process.env.TWILIO_AUTH_TOKEN && 
    process.env.TWILIO_PHONE_NUMBER;

  if (hasTwilioCredentials) {
    try {
      logger.info('Initializing Twilio SMS service');
      return new TwilioSMSService();
    } catch (error) {
      logger.warn('Failed to initialize Twilio, falling back to mock service:', error);
      return new MockSMSService();
    }
  } else {
    logger.info('Twilio credentials not found, using mock SMS service');
    return new MockSMSService();
  }
}

export const smsService: SMSService = initializeSMSService();

/**
 * Generates a 6-digit OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Creates and sends an OTP to a phone number
 */
export async function createAndSendOTP(
  userId: string,
  phone: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string; expiresIn?: number }> {
  try {
    // Check for recent OTP requests (rate limiting)
    const recentOTP = await db.query.otpTokens.findFirst({
      where: (otpTokens, { and, eq, gt }) =>
        and(
          eq(otpTokens.userId, userId),
          eq(otpTokens.phone, phone),
          gt(otpTokens.createdAt, new Date(Date.now() - 60 * 1000)) // Within last minute
        ),
    });

    if (recentOTP) {
      logger.warn(`OTP rate limit hit for user ${userId}`);
      return {
        success: false,
        error: 'Por favor espera 1 minuto antes de solicitar un nuevo código.',
      };
    }

    // Generate OTP and hash it
    const code = generateOTP();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await db.insert(otpTokens).values({
      userId,
      phone,
      codeHash,
      expiresAt,
      attempts: 0,
      verified: false,
    });

    // Send OTP via SMS
    const sent = await smsService.sendOTP(phone, code);

    if (!sent) {
      logger.error(`Failed to send OTP to ${phone}`);
      return {
        success: false,
        error: 'Error al enviar el código. Por favor intente nuevamente.',
      };
    }

    // Log successful OTP generation
    await db.insert(verificationAudit).values({
      userId,
      verificationType: 'phone_otp',
      success: true,
      ipAddress,
      userAgent,
      metadata: JSON.stringify({ action: 'otp_sent', phone }),
    });

    logger.info(`OTP sent successfully to ${phone} for user ${userId}`);

    return {
      success: true,
      expiresIn: 10, // minutes
    };
  } catch (error) {
    logger.error('Error creating and sending OTP:', error);
    return {
      success: false,
      error: 'Error al generar el código de verificación.',
    };
  }
}

/**
 * Verifies an OTP code
 */
export async function verifyOTP(
  userId: string,
  phone: string,
  code: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the most recent unverified OTP for this user and phone
    const otpRecord = await db.query.otpTokens.findFirst({
      where: (otpTokens, { and, eq }) =>
        and(
          eq(otpTokens.userId, userId),
          eq(otpTokens.phone, phone),
          eq(otpTokens.verified, false)
        ),
      orderBy: (otpTokens, { desc }) => [desc(otpTokens.createdAt)],
    });

    if (!otpRecord) {
      await db.insert(verificationAudit).values({
        userId,
        verificationType: 'phone_otp',
        success: false,
        ipAddress,
        userAgent,
        errorMessage: 'No OTP found',
      });

      return {
        success: false,
        error: 'No se encontró un código de verificación. Por favor solicita uno nuevo.',
      };
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await db.insert(verificationAudit).values({
        userId,
        verificationType: 'phone_otp',
        success: false,
        ipAddress,
        userAgent,
        errorMessage: 'OTP expired',
      });

      return {
        success: false,
        error: 'El código ha expirado. Por favor solicita uno nuevo.',
      };
    }

    // Check attempt limit (max 3 attempts)
    if (otpRecord.attempts >= 3) {
      await db.insert(verificationAudit).values({
        userId,
        verificationType: 'phone_otp',
        success: false,
        ipAddress,
        userAgent,
        errorMessage: 'Max attempts exceeded',
      });

      return {
        success: false,
        error: 'Máximo de intentos excedido. Por favor solicita un nuevo código.',
      };
    }

    // Verify the code
    const isValid = await bcrypt.compare(code, otpRecord.codeHash);

    // Increment attempt counter
    await db
      .update(otpTokens)
      .set({ attempts: otpRecord.attempts + 1 })
      .where(eq(otpTokens.id, otpRecord.id));

    if (!isValid) {
      await db.insert(verificationAudit).values({
        userId,
        verificationType: 'phone_otp',
        success: false,
        ipAddress,
        userAgent,
        errorMessage: 'Invalid code',
      });

      const attemptsLeft = 3 - (otpRecord.attempts + 1);
      return {
        success: false,
        error: `Código incorrecto. Te quedan ${attemptsLeft} intentos.`,
      };
    }

    // Mark OTP as verified
    await db
      .update(otpTokens)
      .set({ verified: true })
      .where(eq(otpTokens.id, otpRecord.id));

    // Update user's phone verification status
    await db
      .update(db.query.users)
      .set({
        phone,
        telefonoVerificado: true,
      })
      .where(eq(db.query.users.id, userId));

    // Log successful verification
    await db.insert(verificationAudit).values({
      userId,
      verificationType: 'phone_otp',
      success: true,
      ipAddress,
      userAgent,
      metadata: JSON.stringify({ action: 'otp_verified', phone }),
    });

    logger.info(`Phone verified successfully for user ${userId}`);

    return {
      success: true,
    };
  } catch (error) {
    logger.error('Error verifying OTP:', error);
    return {
      success: false,
      error: 'Error al verificar el código.',
    };
  }
}
