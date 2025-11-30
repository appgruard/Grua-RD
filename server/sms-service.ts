import twilio from 'twilio';
import { logger } from './logger';
import { db } from './db';
import { otpTokens, verificationAudit } from './schema-extensions';
import { eq, and, gt } from 'drizzle-orm';
import { users } from '@shared/schema';
import bcrypt from 'bcryptjs';

export interface SMSService {
  sendSMS(phone: string, message: string): Promise<boolean>;
  sendOTP(phone: string, code: string): Promise<boolean>;
  isConfigured(): boolean;
}

interface TwilioCredentials {
  accountSid: string;
  apiKey: string;
  apiKeySecret: string;
  phoneNumber: string;
}

let cachedCredentials: TwilioCredentials | null = null;
let credentialsFetchTime: number = 0;
const CREDENTIALS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getTwilioCredentials(): Promise<TwilioCredentials | null> {
  const now = Date.now();
  if (cachedCredentials && (now - credentialsFetchTime) < CREDENTIALS_CACHE_TTL) {
    return cachedCredentials;
  }

  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!hostname || !xReplitToken) {
      logger.warn('Replit connector environment not available');
      return null;
    }

    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );

    const data = await response.json();
    const connectionSettings = data.items?.[0];

    if (!connectionSettings || 
        !connectionSettings.settings.account_sid || 
        !connectionSettings.settings.api_key || 
        !connectionSettings.settings.api_key_secret) {
      logger.warn('Twilio connector not configured properly');
      return null;
    }

    cachedCredentials = {
      accountSid: connectionSettings.settings.account_sid,
      apiKey: connectionSettings.settings.api_key,
      apiKeySecret: connectionSettings.settings.api_key_secret,
      phoneNumber: connectionSettings.settings.phone_number || ''
    };
    credentialsFetchTime = now;

    logger.info('Twilio credentials loaded from Replit connector');
    return cachedCredentials;
  } catch (error) {
    logger.error('Failed to fetch Twilio credentials:', error);
    return null;
  }
}

class ReplitTwilioSMSService implements SMSService {
  private client: twilio.Twilio | null = null;
  private fromPhone: string = '';
  private initialized: boolean = false;

  async ensureInitialized(): Promise<boolean> {
    if (this.initialized && this.client) {
      return true;
    }

    const credentials = await getTwilioCredentials();
    if (!credentials) {
      return false;
    }

    try {
      this.client = twilio(credentials.apiKey, credentials.apiKeySecret, {
        accountSid: credentials.accountSid
      });
      this.fromPhone = credentials.phoneNumber;
      this.initialized = true;
      logger.info('Twilio SMS service initialized via Replit connector');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Twilio client:', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.initialized;
  }

  async sendSMS(phone: string, message: string): Promise<boolean> {
    const ready = await this.ensureInitialized();
    if (!ready || !this.client) {
      logger.error('Twilio not initialized, cannot send SMS');
      return false;
    }

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

class MockSMSService implements SMSService {
  isConfigured(): boolean {
    return false;
  }

  async sendSMS(phone: string, message: string): Promise<boolean> {
    logger.info(`📱 [MOCK SMS] Enviando a ${phone}: ${message}`);
    return true;
  }

  async sendOTP(phone: string, code: string): Promise<boolean> {
    logger.info(`📱 [MOCK OTP] Código para ${phone}: ${code}`);
    return true;
  }
}

async function initializeSMSService(): Promise<SMSService> {
  const twilioService = new ReplitTwilioSMSService();
  const isReady = await twilioService.ensureInitialized();
  
  if (isReady) {
    logger.info('Using Twilio SMS service via Replit connector');
    return twilioService;
  }
  
  logger.info('Twilio not available, using mock SMS service');
  return new MockSMSService();
}

let smsServiceInstance: SMSService | null = null;

export async function getSMSService(): Promise<SMSService> {
  if (!smsServiceInstance) {
    smsServiceInstance = await initializeSMSService();
  }
  return smsServiceInstance;
}

export const smsService: SMSService = new ReplitTwilioSMSService();

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createAndSendOTP(
  userId: string,
  phone: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string; expiresIn?: number }> {
  try {
    const recentOTP = await db.query.otpTokens.findFirst({
      where: (otpTokens, { and, eq, gt }) =>
        and(
          eq(otpTokens.userId, userId),
          eq(otpTokens.phone, phone),
          gt(otpTokens.createdAt, new Date(Date.now() - 60 * 1000))
        ),
    });

    if (recentOTP) {
      logger.warn(`OTP rate limit hit for user ${userId}`);
      return {
        success: false,
        error: 'Por favor espera 1 minuto antes de solicitar un nuevo código.',
      };
    }

    const code = generateOTP();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(otpTokens).values({
      userId,
      phone,
      codeHash,
      expiresAt,
      attempts: 0,
      verified: false,
    });

    const service = await getSMSService();
    const sent = await service.sendOTP(phone, code);

    if (!sent) {
      logger.error(`Failed to send OTP to ${phone}`);
      return {
        success: false,
        error: 'Error al enviar el código. Por favor intente nuevamente.',
      };
    }

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
      expiresIn: 10,
    };
  } catch (error) {
    logger.error('Error creating and sending OTP:', error);
    return {
      success: false,
      error: 'Error al generar el código de verificación.',
    };
  }
}

export async function verifyOTP(
  userId: string,
  phone: string,
  code: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string }> {
  try {
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

    const isValid = await bcrypt.compare(code, otpRecord.codeHash);

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

    await db
      .update(otpTokens)
      .set({ verified: true })
      .where(eq(otpTokens.id, otpRecord.id));

    await db
      .update(users)
      .set({
        phone,
        telefonoVerificado: true,
      })
      .where(eq(users.id, userId));

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
