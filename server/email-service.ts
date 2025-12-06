import { Resend } from 'resend';
import { logger } from './logger';

interface ResendCredentials {
  apiKey: string;
  fromEmail: string;
}

// Email addresses for different purposes
export const EMAIL_ADDRESSES = {
  verification: 'verification@gruard.com',
  support: 'support@gruard.com',
  info: 'info@gruard.com',
};

async function getResendCredentials(): Promise<ResendCredentials | null> {
  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!hostname || !xReplitToken) {
      logger.warn('Replit connector environment not available for Resend');
      return null;
    }

    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );

    const data = await response.json();
    const connectionSettings = data.items?.[0];

    if (!connectionSettings || !connectionSettings.settings.api_key) {
      logger.warn('Resend connector not configured properly');
      return null;
    }

    return {
      apiKey: connectionSettings.settings.api_key,
      fromEmail: connectionSettings.settings.from_email || 'noreply@gruard.com'
    };
  } catch (error) {
    logger.error('Failed to fetch Resend credentials:', error);
    return null;
  }
}

async function getResendClient(customFromEmail?: string): Promise<{ client: Resend; fromEmail: string } | null> {
  const credentials = await getResendCredentials();
  if (!credentials) {
    return null;
  }
  
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: customFromEmail || credentials.fromEmail
  };
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

export interface EmailService {
  sendEmail(options: EmailOptions): Promise<boolean>;
  sendOTPEmail(email: string, code: string, userName?: string): Promise<boolean>;
  sendWelcomeEmail(email: string, userName: string): Promise<boolean>;
  sendServiceNotification(email: string, subject: string, message: string): Promise<boolean>;
  sendPasswordResetEmail(email: string, resetLink: string, userName?: string): Promise<boolean>;
  sendDocumentApprovalEmail(email: string, documentType: string, approved: boolean, reason?: string): Promise<boolean>;
  isConfigured(): Promise<boolean>;
}

class ResendEmailService implements EmailService {
  async isConfigured(): Promise<boolean> {
    const resend = await getResendClient();
    return resend !== null;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const resend = await getResendClient();
    if (!resend) {
      logger.error('Resend not configured, cannot send email');
      return false;
    }

    try {
      const { data, error } = await resend.client.emails.send({
        from: resend.fromEmail,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        logger.error('Failed to send email:', error);
        return false;
      }

      logger.info(`Email sent successfully: ${data?.id}`);
      return true;
    } catch (error) {
      logger.error('Error sending email:', error);
      return false;
    }
  }

  async sendOTPEmail(email: string, code: string, userName?: string): Promise<boolean> {
    const greeting = userName ? `Hola ${userName}` : 'Hola';
    
    // Use verification-specific email address
    const resend = await getResendClient(EMAIL_ADDRESSES.verification);
    if (!resend) {
      logger.error('Resend not configured, cannot send OTP email');
      return false;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">GruaRD</h1>
          <p style="color: #e0e0e0; margin: 10px 0 0 0;">Código de Verificación</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">${greeting},</p>
          
          <p style="font-size: 16px;">Tu código de verificación es:</p>
          
          <div style="background: white; border: 2px solid #1e3a5f; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e3a5f;">${code}</span>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            Este código es válido por <strong>10 minutos</strong>. No compartas este código con nadie.
          </p>
          
          <p style="font-size: 14px; color: #666;">
            Si no solicitaste este código, puedes ignorar este correo.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            Este es un correo automático de GruaRD. Por favor no respondas a este mensaje.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `${greeting},\n\nTu código de verificación GruaRD es: ${code}\n\nEste código es válido por 10 minutos.\n\nSi no solicitaste este código, puedes ignorar este correo.`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `GruaRD Verificación <${resend.fromEmail}>`,
        to: [email],
        subject: `Tu código de verificación GruaRD: ${code}`,
        html,
        text,
      });

      if (error) {
        logger.error('Failed to send OTP email:', error);
        return false;
      }

      logger.info(`OTP email sent successfully: ${data?.id}`);
      return true;
    } catch (error) {
      logger.error('Error sending OTP email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">¡Bienvenido a GruaRD!</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hola ${userName},</p>
          
          <p style="font-size: 16px;">
            ¡Gracias por registrarte en GruaRD! Estamos emocionados de tenerte con nosotros.
          </p>
          
          <p style="font-size: 16px;">
            Con GruaRD puedes:
          </p>
          
          <ul style="font-size: 14px; color: #555;">
            <li>Solicitar servicios de grúa en tiempo real</li>
            <li>Seguir la ubicación de tu grúa en vivo</li>
            <li>Comunicarte directamente con el conductor</li>
            <li>Pagar de forma segura</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://gruard.com" style="background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Comenzar</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            ¿Tienes preguntas? Contáctanos en soporte@gruard.com
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `Hola ${userName},\n\n¡Bienvenido a GruaRD!\n\nGracias por registrarte. Ahora puedes solicitar servicios de grúa en tiempo real, seguir la ubicación de tu grúa, y más.\n\nSi tienes preguntas, contáctanos en soporte@gruard.com`;

    return this.sendEmail({
      to: email,
      subject: '¡Bienvenido a GruaRD!',
      html,
      text,
    });
  }

  async sendServiceNotification(email: string, subject: string, message: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">GruaRD</h1>
          <p style="color: #e0e0e0; margin: 10px 0 0 0;">Notificación de Servicio</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">${message}</p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            Este es un correo automático de GruaRD.
          </p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `GruaRD: ${subject}`,
      html,
      text: message,
    });
  }

  async sendPasswordResetEmail(email: string, resetLink: string, userName?: string): Promise<boolean> {
    const greeting = userName ? `Hola ${userName}` : 'Hola';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">GruaRD</h1>
          <p style="color: #e0e0e0; margin: 10px 0 0 0;">Restablecer Contraseña</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">${greeting},</p>
          
          <p style="font-size: 16px;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta GruaRD.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer Contraseña</a>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            Este enlace expirará en <strong>1 hora</strong>.
          </p>
          
          <p style="font-size: 14px; color: #666;">
            Si no solicitaste restablecer tu contraseña, puedes ignorar este correo. Tu contraseña actual permanecerá sin cambios.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            Este es un correo automático de GruaRD. Por favor no respondas a este mensaje.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `${greeting},\n\nRecibimos una solicitud para restablecer tu contraseña GruaRD.\n\nHaz clic en el siguiente enlace para restablecer tu contraseña:\n${resetLink}\n\nEste enlace expirará en 1 hora.\n\nSi no solicitaste esto, ignora este correo.`;

    return this.sendEmail({
      to: email,
      subject: 'Restablecer tu contraseña de GruaRD',
      html,
      text,
    });
  }

  async sendDocumentApprovalEmail(email: string, documentType: string, approved: boolean, reason?: string): Promise<boolean> {
    const status = approved ? 'aprobado' : 'rechazado';
    const statusColor = approved ? '#28a745' : '#dc3545';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">GruaRD</h1>
          <p style="color: #e0e0e0; margin: 10px 0 0 0;">Actualización de Documento</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Tu documento <strong>${documentType}</strong> ha sido:</p>
          
          <div style="background: white; border-left: 4px solid ${statusColor}; padding: 15px 20px; margin: 20px 0;">
            <span style="font-size: 18px; font-weight: bold; color: ${statusColor}; text-transform: uppercase;">${status}</span>
          </div>
          
          ${reason ? `
          <p style="font-size: 14px; color: #666;">
            <strong>Motivo:</strong> ${reason}
          </p>
          ` : ''}
          
          ${!approved ? `
          <p style="font-size: 14px; color: #666;">
            Por favor, sube un nuevo documento que cumpla con los requisitos.
          </p>
          ` : ''}
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            Este es un correo automático de GruaRD.
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `Tu documento ${documentType} ha sido ${status}.${reason ? `\n\nMotivo: ${reason}` : ''}${!approved ? '\n\nPor favor, sube un nuevo documento que cumpla con los requisitos.' : ''}`;

    return this.sendEmail({
      to: email,
      subject: `GruaRD: Tu documento ha sido ${status}`,
      html,
      text,
    });
  }
}

class MockEmailService implements EmailService {
  async isConfigured(): Promise<boolean> {
    return false;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    logger.info(`📧 [MOCK EMAIL] To: ${options.to}, Subject: ${options.subject}`);
    return true;
  }

  async sendOTPEmail(email: string, code: string, userName?: string): Promise<boolean> {
    logger.info(`📧 [MOCK EMAIL] OTP para ${email}: ${code}`);
    return true;
  }

  async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    logger.info(`📧 [MOCK EMAIL] Bienvenida para ${email} (${userName})`);
    return true;
  }

  async sendServiceNotification(email: string, subject: string, message: string): Promise<boolean> {
    logger.info(`📧 [MOCK EMAIL] Notificación para ${email}: ${subject}`);
    return true;
  }

  async sendPasswordResetEmail(email: string, resetLink: string, userName?: string): Promise<boolean> {
    logger.info(`📧 [MOCK EMAIL] Reset password para ${email}: ${resetLink}`);
    return true;
  }

  async sendDocumentApprovalEmail(email: string, documentType: string, approved: boolean, reason?: string): Promise<boolean> {
    logger.info(`📧 [MOCK EMAIL] Documento ${documentType} ${approved ? 'aprobado' : 'rechazado'} para ${email}`);
    return true;
  }
}

let emailServiceInstance: EmailService | null = null;

export async function getEmailService(): Promise<EmailService> {
  if (!emailServiceInstance) {
    const resendService = new ResendEmailService();
    const isConfigured = await resendService.isConfigured();
    
    if (isConfigured) {
      logger.info('Using Resend email service via Replit connector');
      emailServiceInstance = resendService;
    } else {
      logger.info('Resend not available, using mock email service');
      emailServiceInstance = new MockEmailService();
    }
  }
  return emailServiceInstance;
}
