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
  operadores: 'operadores@gruard.com',
  socios: 'socios@gruard.com',
  admin: 'admin@gruard.com',
};

// Signature configurations for different departments
const SIGNATURE_CONFIG = {
  seguridad: {
    department: 'Departamento de Seguridad',
    email: EMAIL_ADDRESSES.verification,
  },
  atencionCliente: {
    department: 'Departamento de Atención al Cliente',
    email: EMAIL_ADDRESSES.info,
  },
  operadores: {
    department: 'Departamento de Operadores',
    email: EMAIL_ADDRESSES.operadores,
  },
  servicios: {
    department: 'Departamento de Servicios',
    email: EMAIL_ADDRESSES.info,
  },
  verificaciones: {
    department: 'Departamento de Verificaciones',
    email: EMAIL_ADDRESSES.verification,
  },
  soporte: {
    department: 'Departamento de Soporte',
    email: EMAIL_ADDRESSES.support,
  },
  inversores: {
    department: 'Departamento de Relaciones con Inversores',
    email: EMAIL_ADDRESSES.socios,
  },
  administracion: {
    department: 'Departamento de Administración',
    email: EMAIL_ADDRESSES.admin,
  },
};

// Generate signature HTML for emails
function generateSignatureHTML(config: { department: string; email: string }): string {
  return `
          <div style="background: #f0f4f8; border-radius: 8px; padding: 20px; margin: 30px 0 20px 0; text-align: center;">
            <p style="margin: 0 0 5px 0; font-weight: bold; color: #1e3a5f; font-size: 14px;">Grúa RD</p>
            <p style="margin: 0 0 5px 0; color: #666; font-size: 13px;">${config.department}</p>
            <p style="margin: 0 0 5px 0; color: #666; font-size: 12px;">${config.email}</p>
            <p style="margin: 0; color: #999; font-size: 12px;">Moca, Espaillat, República Dominicana</p>
          </div>`;
}

// Generate footer HTML with Four One Solutions branding
function generateFooterHTML(mainFooterContent: string): string {
  return `
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            ${mainFooterContent}
          </p>
          
          <p style="font-size: 10px; color: #bbb; text-align: center; margin-top: 15px;">
            con la tecnología de Four One Solutions
          </p>`;
}

async function getResendCredentials(): Promise<ResendCredentials | null> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey) {
      logger.warn('RESEND_API_KEY not configured');
      return null;
    }

    return {
      apiKey,
      fromEmail: fromEmail || 'noreply@gruard.com'
    };
  } catch (error) {
    logger.error('Failed to get Resend credentials:', error);
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

export interface TicketEmailData {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  prioridad: string;
  estado: string;
}

export interface EmailService {
  sendEmail(options: EmailOptions): Promise<boolean>;
  sendOTPEmail(email: string, code: string, userName?: string): Promise<boolean>;
  sendWelcomeEmail(email: string, userName: string): Promise<boolean>;
  sendClientWelcomeEmail(email: string, userName: string): Promise<boolean>;
  sendOperatorWelcomeEmail(email: string, userName: string): Promise<boolean>;
  sendServiceNotification(email: string, subject: string, message: string): Promise<boolean>;
  sendPasswordResetEmail(email: string, resetLink: string, userName?: string): Promise<boolean>;
  sendDocumentApprovalEmail(email: string, documentType: string, approved: boolean, reason?: string): Promise<boolean>;
  sendTicketCreatedEmail(email: string, userName: string, ticket: TicketEmailData): Promise<boolean>;
  sendTicketStatusChangedEmail(email: string, userName: string, ticket: TicketEmailData, oldStatus: string, newStatus: string): Promise<boolean>;
  sendTicketSupportResponseEmail(email: string, userName: string, ticket: TicketEmailData, mensaje: string): Promise<boolean>;
  sendSocioCreatedEmail(email: string, nombre: string, tempPassword: string, porcentaje: string): Promise<boolean>;
  sendSocioFirstLoginEmail(email: string, nombre: string): Promise<boolean>;
  sendAdminCreatedEmail(email: string, nombre: string, tempPassword: string, permisos: string[]): Promise<boolean>;
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
      } as any);

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
          <h1 style="color: white; margin: 0; font-size: 24px;">Grúa RD</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0;">Código de Verificación</p>
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
          
          ${generateSignatureHTML(SIGNATURE_CONFIG.seguridad)}
          
          ${generateFooterHTML('Este es un correo automático de Grúa RD. Por favor no respondas a este mensaje.')}
        </div>
      </body>
      </html>
    `;

    const text = `${greeting},\n\nTu código de verificación Grúa RD es: ${code}\n\nEste código es válido por 10 minutos.\n\nSi no solicitaste este código, puedes ignorar este correo.\n\n---\nGrúa RD\nDepartamento de Seguridad\nverification@gruard.com\nMoca, Espaillat, República Dominicana\n\ncon la tecnología de Four One Solutions`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grúa RD Verificación <${resend.fromEmail}>`,
        to: [email],
        subject: `Tu código de verificación Grúa RD: ${code}`,
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
          <h1 style="color: white; margin: 0; font-size: 24px;">¡Bienvenido a Grúa RD!</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hola ${userName},</p>
          
          <p style="font-size: 16px;">
            ¡Gracias por registrarte en Grúa RD! Estamos emocionados de tenerte con nosotros.
          </p>
          
          <p style="font-size: 16px;">
            Con Grúa RD puedes:
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
          
          ${generateSignatureHTML(SIGNATURE_CONFIG.atencionCliente)}
          
          ${generateFooterHTML('¿Tienes preguntas? Contáctanos en info@gruard.com')}
        </div>
      </body>
      </html>
    `;

    const text = `Hola ${userName},\n\n¡Bienvenido a Grúa RD!\n\nGracias por registrarte. Ahora puedes solicitar servicios de grúa en tiempo real, seguir la ubicación de tu grúa, y más.\n\nSi tienes preguntas, contáctanos en info@gruard.com\n\n---\nGrúa RD\nDepartamento de Atención al Cliente\ninfo@gruard.com\nMoca, Espaillat, República Dominicana\n\ncon la tecnología de Four One Solutions`;

    return this.sendEmail({
      to: email,
      subject: '¡Bienvenido a Grúa RD!',
      html,
      text,
    });
  }

  async sendClientWelcomeEmail(email: string, userName: string): Promise<boolean> {
    const resend = await getResendClient(EMAIL_ADDRESSES.info);
    if (!resend) {
      logger.error('Resend not configured, cannot send client welcome email');
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
          <h1 style="color: white; margin: 0; font-size: 28px;">Bienvenido a Grúa RD</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Tu servicio de gruas de confianza</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hola ${userName},</p>
          
          <p style="font-size: 16px;">
            Gracias por registrarte en Grúa RD. Estamos comprometidos a brindarte el mejor servicio de asistencia vial en Republica Dominicana.
          </p>
          
          <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e3a5f; margin: 0 0 15px 0;">Como solicitar un servicio:</h3>
            <ol style="margin: 0; padding-left: 20px; color: #555;">
              <li style="margin-bottom: 8px;">Ingresa a tu cuenta en Grúa RD</li>
              <li style="margin-bottom: 8px;">Indica tu ubicacion actual</li>
              <li style="margin-bottom: 8px;">Selecciona el tipo de servicio que necesitas</li>
              <li style="margin-bottom: 8px;">Confirma y espera a tu operador</li>
            </ol>
          </div>
          
          <div style="background: #e8f4fd; border-left: 4px solid #1e3a5f; padding: 15px 20px; margin: 20px 0;">
            <h4 style="color: #1e3a5f; margin: 0 0 10px 0;">Metodos de pago disponibles:</h4>
            <p style="margin: 0; font-size: 14px; color: #555;">
              Efectivo, Tarjeta de credito/debito, Transferencia bancaria
            </p>
          </div>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 20px 0;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">Linea de emergencias 24/7:</h4>
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1e3a5f;">
              +1 (809) 555-GRUA
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://gruard.com" style="background: #1e3a5f; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Ir a Grúa RD</a>
          </div>
          
          ${generateSignatureHTML(SIGNATURE_CONFIG.atencionCliente)}
          
          ${generateFooterHTML('Grúa RD - Tu servicio de gruas de confianza')}
        </div>
      </body>
      </html>
    `;

    const text = `Hola ${userName},\n\nGracias por registrarte en Grúa RD. Estamos comprometidos a brindarte el mejor servicio de asistencia vial.\n\nComo solicitar un servicio:\n1. Ingresa a tu cuenta en Grúa RD\n2. Indica tu ubicacion actual\n3. Selecciona el tipo de servicio\n4. Confirma y espera a tu operador\n\nMetodos de pago: Efectivo, Tarjeta, Transferencia\n\nLinea de emergencias 24/7: +1 (809) 555-GRUA\n\n---\nGrúa RD\nDepartamento de Atención al Cliente\ninfo@gruard.com\nMoca, Espaillat, República Dominicana\n\ncon la tecnología de Four One Solutions`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grúa RD <${resend.fromEmail}>`,
        to: [email],
        subject: 'Bienvenido a Grúa RD - Tu servicio de gruas de confianza',
        html,
        text,
      });

      if (error) {
        logger.error('Failed to send client welcome email:', error);
        return false;
      }

      logger.info(`Client welcome email sent successfully: ${data?.id}`);
      return true;
    } catch (error) {
      logger.error('Error sending client welcome email:', error);
      return false;
    }
  }

  async sendOperatorWelcomeEmail(email: string, userName: string): Promise<boolean> {
    const resend = await getResendClient(EMAIL_ADDRESSES.info);
    if (!resend) {
      logger.error('Resend not configured, cannot send operator welcome email');
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
          <h1 style="color: white; margin: 0; font-size: 28px;">Bienvenido al Equipo Grúa RD</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Gracias por unirte como operador</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hola ${userName},</p>
          
          <p style="font-size: 16px;">
            Gracias por registrarte como operador en Grúa RD. Estamos emocionados de tenerte en nuestro equipo de profesionales.
          </p>
          
          <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px 20px; margin: 20px 0;">
            <h4 style="color: #155724; margin: 0 0 10px 0;">Proximos pasos:</h4>
            <ol style="margin: 0; padding-left: 20px; color: #155724;">
              <li style="margin-bottom: 8px;">Completa la verificacion de tus documentos</li>
              <li style="margin-bottom: 8px;">Espera la aprobacion de nuestro equipo</li>
              <li style="margin-bottom: 8px;">Configura tu perfil y disponibilidad</li>
              <li style="margin-bottom: 8px;">Comienza a recibir solicitudes de servicio</li>
            </ol>
          </div>
          
          <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e3a5f; margin: 0 0 15px 0;">Beneficios de ser operador Grúa RD:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #555;">
              <li style="margin-bottom: 8px;"><strong>80% de comision</strong> - Tu te quedas con el 80% de cada servicio</li>
              <li style="margin-bottom: 8px;"><strong>Flexibilidad total</strong> - Trabaja cuando quieras</li>
              <li style="margin-bottom: 8px;"><strong>Pagos semanales</strong> - Recibe tus ganancias puntualmente</li>
              <li style="margin-bottom: 8px;"><strong>Soporte 24/7</strong> - Siempre estamos para ayudarte</li>
              <li style="margin-bottom: 8px;"><strong>Sin costos ocultos</strong> - Transparencia total</li>
            </ul>
          </div>
          
          <div style="background: #e8f4fd; border-left: 4px solid #1e3a5f; padding: 15px 20px; margin: 20px 0;">
            <h4 style="color: #1e3a5f; margin: 0 0 10px 0;">Tips para maximizar tus ingresos:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 14px;">
              <li style="margin-bottom: 6px;">Mantente disponible en horas pico (7-9am, 5-8pm)</li>
              <li style="margin-bottom: 6px;">Responde rapidamente a las solicitudes</li>
              <li style="margin-bottom: 6px;">Ofrece un servicio profesional y amable</li>
              <li style="margin-bottom: 6px;">Mantiene tu equipo en optimas condiciones</li>
            </ul>
          </div>
          
          <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px 20px; margin: 20px 0;">
            <h4 style="color: #721c24; margin: 0 0 10px 0;">Importante:</h4>
            <p style="margin: 0; font-size: 14px; color: #721c24;">
              Debes completar la verificacion de documentos antes de poder recibir solicitudes. 
              Esto incluye: licencia de conducir, seguro del vehiculo y documentos de la grua.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://gruard.com" style="background: #28a745; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Completar Verificacion</a>
          </div>
          
          ${generateSignatureHTML(SIGNATURE_CONFIG.operadores)}
          
          ${generateFooterHTML('Grúa RD - Juntos hacemos la diferencia')}
        </div>
      </body>
      </html>
    `;

    const text = `Hola ${userName},\n\nGracias por registrarte como operador en Grúa RD. Estamos emocionados de tenerte en nuestro equipo.\n\nProximos pasos:\n1. Completa la verificacion de tus documentos\n2. Espera la aprobacion de nuestro equipo\n3. Configura tu perfil y disponibilidad\n4. Comienza a recibir solicitudes\n\nBeneficios:\n- 80% de comision por servicio\n- Flexibilidad total\n- Pagos semanales\n- Soporte 24/7\n\nImportante: Debes completar la verificacion de documentos antes de poder recibir solicitudes.\n\n---\nGrúa RD\nDepartamento de Operadores\noperadores@gruard.com\nMoca, Espaillat, República Dominicana\n\ncon la tecnología de Four One Solutions`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grúa RD <${resend.fromEmail}>`,
        to: [email],
        subject: 'Bienvenido al Equipo Grúa RD - Proximos pasos',
        html,
        text,
      });

      if (error) {
        logger.error('Failed to send operator welcome email:', error);
        return false;
      }

      logger.info(`Operator welcome email sent successfully: ${data?.id}`);
      return true;
    } catch (error) {
      logger.error('Error sending operator welcome email:', error);
      return false;
    }
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
          <h1 style="color: white; margin: 0; font-size: 24px;">Grúa RD</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0;">Notificación de Servicio</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">${message}</p>
          
          ${generateSignatureHTML(SIGNATURE_CONFIG.servicios)}
          
          ${generateFooterHTML('Este es un correo automático de Grúa RD.')}
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Grúa RD: ${subject}`,
      html,
      text: `${message}\n\n---\nGrúa RD\nDepartamento de Servicios\ninfo@gruard.com\nMoca, Espaillat, República Dominicana\n\ncon la tecnología de Four One Solutions`,
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
          <h1 style="color: white; margin: 0; font-size: 24px;">Grúa RD</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0;">Restablecer Contraseña</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">${greeting},</p>
          
          <p style="font-size: 16px;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta Grúa RD.
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
          
          ${generateSignatureHTML(SIGNATURE_CONFIG.seguridad)}
          
          ${generateFooterHTML('Este es un correo automático de Grúa RD. Por favor no respondas a este mensaje.')}
        </div>
      </body>
      </html>
    `;

    const text = `${greeting},\n\nRecibimos una solicitud para restablecer tu contraseña Grúa RD.\n\nHaz clic en el siguiente enlace para restablecer tu contraseña:\n${resetLink}\n\nEste enlace expirará en 1 hora.\n\nSi no solicitaste esto, ignora este correo.\n\n---\nGrúa RD\nDepartamento de Seguridad\nverification@gruard.com\nMoca, Espaillat, República Dominicana\n\ncon la tecnología de Four One Solutions`;

    return this.sendEmail({
      to: email,
      subject: 'Restablecer tu contraseña de Grúa RD',
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
          <h1 style="color: white; margin: 0; font-size: 24px;">Grúa RD</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0;">Actualización de Documento</p>
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
          
          ${generateSignatureHTML(SIGNATURE_CONFIG.verificaciones)}
          
          ${generateFooterHTML('Este es un correo automático de Grúa RD.')}
        </div>
      </body>
      </html>
    `;

    const text = `Tu documento ${documentType} ha sido ${status}.${reason ? `\n\nMotivo: ${reason}` : ''}${!approved ? '\n\nPor favor, sube un nuevo documento que cumpla con los requisitos.' : ''}\n\n---\nGrúa RD\nDepartamento de Verificaciones\nverification@gruard.com\nMoca, Espaillat, República Dominicana\n\ncon la tecnología de Four One Solutions`;

    return this.sendEmail({
      to: email,
      subject: `Grúa RD: Tu documento ha sido ${status}`,
      html,
      text,
    });
  }

  async sendTicketCreatedEmail(email: string, userName: string, ticket: TicketEmailData): Promise<boolean> {
    const resend = await getResendClient(EMAIL_ADDRESSES.support);
    if (!resend) {
      logger.error('Resend not configured, cannot send ticket created email');
      return false;
    }

    const prioridadTexto: Record<string, string> = {
      'baja': '48-72 horas',
      'media': '24-48 horas',
      'alta': '12-24 horas',
      'urgente': '2-6 horas'
    };

    const categoriaTexto: Record<string, string> = {
      'problema_tecnico': 'Problema Tecnico',
      'consulta_servicio': 'Consulta de Servicio',
      'queja': 'Queja',
      'sugerencia': 'Sugerencia',
      'problema_pago': 'Problema de Pago',
      'otro': 'Otro'
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Grúa RD Soporte</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0;">Ticket Creado</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hola ${userName},</p>
          
          <p style="font-size: 16px;">Tu ticket de soporte ha sido creado exitosamente.</p>
          
          <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Numero de Ticket:</strong> #${ticket.id.slice(-8).toUpperCase()}</p>
            <p style="margin: 5px 0;"><strong>Titulo:</strong> ${ticket.titulo}</p>
            <p style="margin: 5px 0;"><strong>Categoria:</strong> ${categoriaTexto[ticket.categoria] || ticket.categoria}</p>
            <p style="margin: 5px 0;"><strong>Prioridad:</strong> ${ticket.prioridad.charAt(0).toUpperCase() + ticket.prioridad.slice(1)}</p>
            <p style="margin: 5px 0;"><strong>Estado:</strong> Abierto</p>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            <strong>Tiempo estimado de respuesta:</strong> ${prioridadTexto[ticket.prioridad] || '24-48 horas'}
          </p>
          
          <p style="font-size: 14px; color: #666;">
            Te notificaremos por correo cuando haya actualizaciones en tu ticket.
          </p>
          
          ${generateSignatureHTML(SIGNATURE_CONFIG.soporte)}
          
          ${generateFooterHTML('Grúa RD Soporte - Estamos para ayudarte')}
        </div>
      </body>
      </html>
    `;

    const text = `Hola ${userName},\n\nTu ticket de soporte ha sido creado.\n\nNumero: #${ticket.id.slice(-8).toUpperCase()}\nTitulo: ${ticket.titulo}\nCategoria: ${categoriaTexto[ticket.categoria] || ticket.categoria}\nPrioridad: ${ticket.prioridad}\n\nTiempo estimado de respuesta: ${prioridadTexto[ticket.prioridad] || '24-48 horas'}\n\n---\nGrúa RD\nDepartamento de Soporte\nsupport@gruard.com\nMoca, Espaillat, República Dominicana\n\ncon la tecnología de Four One Solutions`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grúa RD Soporte <${resend.fromEmail}>`,
        to: [email],
        subject: `Ticket #${ticket.id.slice(-8).toUpperCase()} creado - ${ticket.titulo}`,
        html,
        text,
      });

      if (error) {
        logger.error('Failed to send ticket created email:', error);
        return false;
      }

      logger.info(`Ticket created email sent successfully: ${data?.id}`);
      return true;
    } catch (error) {
      logger.error('Error sending ticket created email:', error);
      return false;
    }
  }

  async sendTicketStatusChangedEmail(email: string, userName: string, ticket: TicketEmailData, oldStatus: string, newStatus: string): Promise<boolean> {
    const resend = await getResendClient(EMAIL_ADDRESSES.support);
    if (!resend) {
      logger.error('Resend not configured, cannot send ticket status email');
      return false;
    }

    const estadoTexto: Record<string, { label: string; mensaje: string; color: string }> = {
      'abierto': { label: 'Abierto', mensaje: 'Tu ticket ha sido reabierto y sera atendido pronto.', color: '#17a2b8' },
      'en_proceso': { label: 'En Proceso', mensaje: 'Nuestro equipo esta trabajando en tu solicitud.', color: '#ffc107' },
      'resuelto': { label: 'Resuelto', mensaje: 'Tu ticket ha sido resuelto. Si necesitas mas ayuda, puedes responder a este ticket.', color: '#28a745' },
      'cerrado': { label: 'Cerrado', mensaje: 'Tu ticket ha sido cerrado. Gracias por contactarnos.', color: '#6c757d' }
    };

    const estado = estadoTexto[newStatus] || { label: newStatus, mensaje: '', color: '#666' };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Grúa RD Soporte</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0;">Actualizacion de Ticket</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hola ${userName},</p>
          
          <p style="font-size: 16px;">El estado de tu ticket ha sido actualizado.</p>
          
          <div style="background: white; border-left: 4px solid ${estado.color}; padding: 15px 20px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Ticket:</strong> #${ticket.id.slice(-8).toUpperCase()}</p>
            <p style="margin: 5px 0;"><strong>Titulo:</strong> ${ticket.titulo}</p>
            <p style="margin: 5px 0;"><strong>Nuevo Estado:</strong> <span style="color: ${estado.color}; font-weight: bold;">${estado.label}</span></p>
          </div>
          
          <p style="font-size: 14px; color: #666;">${estado.mensaje}</p>
          
          ${generateSignatureHTML(SIGNATURE_CONFIG.soporte)}
          
          ${generateFooterHTML('Grúa RD Soporte - Estamos para ayudarte')}
        </div>
      </body>
      </html>
    `;

    const text = `Hola ${userName},\n\nEl estado de tu ticket #${ticket.id.slice(-8).toUpperCase()} ha cambiado a: ${estado.label}\n\n${estado.mensaje}\n\n---\nGrúa RD\nDepartamento de Soporte\nsupport@gruard.com\nMoca, Espaillat, República Dominicana\n\ncon la tecnología de Four One Solutions`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grúa RD Soporte <${resend.fromEmail}>`,
        to: [email],
        subject: `Ticket #${ticket.id.slice(-8).toUpperCase()} - Estado: ${estado.label}`,
        html,
        text,
      });

      if (error) {
        logger.error('Failed to send ticket status email:', error);
        return false;
      }

      logger.info(`Ticket status email sent successfully: ${data?.id}`);
      return true;
    } catch (error) {
      logger.error('Error sending ticket status email:', error);
      return false;
    }
  }

  async sendTicketSupportResponseEmail(email: string, userName: string, ticket: TicketEmailData, mensaje: string): Promise<boolean> {
    const resend = await getResendClient(EMAIL_ADDRESSES.support);
    if (!resend) {
      logger.error('Resend not configured, cannot send ticket response email');
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
          <h1 style="color: white; margin: 0; font-size: 24px;">Grúa RD Soporte</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0;">Nueva Respuesta</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hola ${userName},</p>
          
          <p style="font-size: 16px;">Nuestro equipo de soporte ha respondido a tu ticket.</p>
          
          <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #666;"><strong>Ticket:</strong> #${ticket.id.slice(-8).toUpperCase()} - ${ticket.titulo}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 10px 0;">
            <p style="margin: 0; font-size: 14px; white-space: pre-wrap;">${mensaje}</p>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            Puedes responder a este ticket desde tu cuenta en Grúa RD.
          </p>
          
          ${generateSignatureHTML(SIGNATURE_CONFIG.soporte)}
          
          ${generateFooterHTML('Grúa RD Soporte - Estamos para ayudarte')}
        </div>
      </body>
      </html>
    `;

    const text = `Hola ${userName},\n\nNuestro equipo de soporte ha respondido a tu ticket #${ticket.id.slice(-8).toUpperCase()}.\n\nMensaje:\n${mensaje}\n\nPuedes responder desde tu cuenta en Grúa RD.\n\n---\nGrúa RD\nDepartamento de Soporte\nsupport@gruard.com\nMoca, Espaillat, República Dominicana\n\ncon la tecnología de Four One Solutions`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grúa RD Soporte <${resend.fromEmail}>`,
        to: [email],
        subject: `Respuesta a Ticket #${ticket.id.slice(-8).toUpperCase()} - ${ticket.titulo}`,
        html,
        text,
      });

      if (error) {
        logger.error('Failed to send ticket response email:', error);
        return false;
      }

      logger.info(`Ticket response email sent successfully: ${data?.id}`);
      return true;
    } catch (error) {
      logger.error('Error sending ticket response email:', error);
      return false;
    }
  }

  async sendSocioCreatedEmail(email: string, nombre: string, tempPassword: string, porcentaje: string): Promise<boolean> {
    const resend = await getResendClient(EMAIL_ADDRESSES.info);
    if (!resend) {
      logger.error('Resend not configured, cannot send socio created email');
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
          <h1 style="color: white; margin: 0; font-size: 28px;">Bienvenido a Grúa RD</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Portal de Socios e Inversores</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Estimado/a ${nombre},</p>
          
          <p style="font-size: 16px;">
            Es un placer darle la bienvenida como socio inversor de Grúa RD. Su cuenta ha sido creada exitosamente.
          </p>
          
          <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e3a5f; margin: 0 0 15px 0;">Credenciales de Acceso:</h3>
            <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 8px 0;"><strong>Contrasena temporal:</strong> <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
          </div>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 20px 0;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">Importante:</h4>
            <p style="margin: 0; font-size: 14px; color: #856404;">
              Por seguridad, le recomendamos cambiar su contrasena en su primer inicio de sesion.
            </p>
          </div>
          
          <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px 20px; margin: 20px 0;">
            <h4 style="color: #155724; margin: 0 0 10px 0;">Su Participacion:</h4>
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #155724;">
              ${porcentaje}% de las utilidades de la empresa
            </p>
          </div>
          
          <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e3a5f; margin: 0 0 15px 0;">En su Dashboard podra:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #555;">
              <li style="margin-bottom: 8px;">Ver el resumen de sus distribuciones</li>
              <li style="margin-bottom: 8px;">Consultar el historial de pagos</li>
              <li style="margin-bottom: 8px;">Revisar los ingresos del periodo actual</li>
              <li style="margin-bottom: 8px;">Descargar reportes financieros</li>
            </ul>
          </div>
          
          <div style="background: #e8f4fd; border-left: 4px solid #1e3a5f; padding: 15px 20px; margin: 20px 0;">
            <h4 style="color: #1e3a5f; margin: 0 0 10px 0;">Calendario de Distribuciones:</h4>
            <p style="margin: 0; font-size: 14px; color: #555;">
              Las distribuciones se calculan mensualmente y se procesan dentro de los primeros 15 dias del mes siguiente.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://gruard.com" style="background: #1e3a5f; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Acceder al Portal</a>
          </div>
          
          ${generateSignatureHTML(SIGNATURE_CONFIG.inversores)}
          
          ${generateFooterHTML('Grúa RD - Gracias por su confianza e inversión')}
        </div>
      </body>
      </html>
    `;

    const text = `Estimado/a ${nombre},\n\nBienvenido como socio inversor de Grúa RD.\n\nCredenciales de acceso:\nEmail: ${email}\nContrasena temporal: ${tempPassword}\n\nSu participacion: ${porcentaje}% de las utilidades\n\nImportante: Cambie su contrasena en el primer inicio de sesion.\n\n---\nGrúa RD\nDepartamento de Relaciones con Inversores\nsocios@gruard.com\nMoca, Espaillat, República Dominicana\n\ncon la tecnología de Four One Solutions`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grúa RD <${resend.fromEmail}>`,
        to: [email],
        subject: 'Bienvenido al Portal de Socios Grúa RD - Credenciales de Acceso',
        html,
        text,
      });

      if (error) {
        logger.error('Failed to send socio created email:', error);
        return false;
      }

      logger.info(`Socio created email sent successfully: ${data?.id}`);
      return true;
    } catch (error) {
      logger.error('Error sending socio created email:', error);
      return false;
    }
  }

  async sendSocioFirstLoginEmail(email: string, nombre: string): Promise<boolean> {
    const resend = await getResendClient(EMAIL_ADDRESSES.info);
    if (!resend) {
      logger.error('Resend not configured, cannot send socio first login email');
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
          <h1 style="color: white; margin: 0; font-size: 28px;">Grúa RD - Portal de Socios</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Primer Inicio de Sesion</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Estimado/a ${nombre},</p>
          
          <p style="font-size: 16px;">
            Gracias por ser parte del equipo inversor de Grúa RD. Hemos registrado su primer inicio de sesion en el portal.
          </p>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 20px 0;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">Recordatorio de Seguridad:</h4>
            <p style="margin: 0; font-size: 14px; color: #856404;">
              Si aun no ha cambiado su contrasena temporal, le recomendamos hacerlo desde la seccion "Mi Perfil" para mayor seguridad.
            </p>
          </div>
          
          <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e3a5f; margin: 0 0 15px 0;">Guia rapida del Dashboard:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #555;">
              <li style="margin-bottom: 10px;"><strong>Resumen:</strong> Vista general de sus distribuciones y participacion</li>
              <li style="margin-bottom: 10px;"><strong>Distribuciones:</strong> Historial detallado de pagos recibidos</li>
              <li style="margin-bottom: 10px;"><strong>Reportes:</strong> Descargue informes financieros en PDF</li>
              <li style="margin-bottom: 10px;"><strong>Perfil:</strong> Actualice sus datos bancarios y contrasena</li>
            </ul>
          </div>
          
          <div style="background: #e8f4fd; border-left: 4px solid #1e3a5f; padding: 15px 20px; margin: 20px 0;">
            <h4 style="color: #1e3a5f; margin: 0 0 10px 0;">Proxima Distribucion:</h4>
            <p style="margin: 0; font-size: 14px; color: #555;">
              Las distribuciones se calculan mensualmente. Recibira una notificacion cuando su distribucion este lista.
            </p>
          </div>
          
          ${generateSignatureHTML(SIGNATURE_CONFIG.inversores)}
          
          ${generateFooterHTML('Grúa RD - Juntos construimos el futuro')}
        </div>
      </body>
      </html>
    `;

    const text = `Estimado/a ${nombre},\n\nGracias por ser parte del equipo inversor de Grúa RD. Hemos registrado su primer inicio de sesion.\n\nRecordatorio: Si no ha cambiado su contrasena temporal, le recomendamos hacerlo por seguridad.\n\nGuia del Dashboard:\n- Resumen: Vista general de distribuciones\n- Distribuciones: Historial de pagos\n- Reportes: Informes financieros\n- Perfil: Datos bancarios y contrasena\n\n---\nGrúa RD\nDepartamento de Relaciones con Inversores\nsocios@gruard.com\nMoca, Espaillat, República Dominicana\n\ncon la tecnología de Four One Solutions`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grúa RD <${resend.fromEmail}>`,
        to: [email],
        subject: 'Bienvenido al Portal de Socios Grúa RD - Primer Inicio de Sesion',
        html,
        text,
      });

      if (error) {
        logger.error('Failed to send socio first login email:', error);
        return false;
      }

      logger.info(`Socio first login email sent successfully: ${data?.id}`);
      return true;
    } catch (error) {
      logger.error('Error sending socio first login email:', error);
      return false;
    }
  }

  async sendAdminCreatedEmail(email: string, nombre: string, tempPassword: string, permisos: string[]): Promise<boolean> {
    const resend = await getResendClient(EMAIL_ADDRESSES.info);
    if (!resend) {
      logger.error('Resend not configured, cannot send admin created email');
      return false;
    }

    const permisosLabels: Record<string, string> = {
      dashboard: "Dashboard",
      analytics: "Analytics",
      usuarios: "Usuarios",
      operadores: "Conductores",
      billeteras: "Billeteras",
      comisiones_pago: "Comisiones de Pago",
      servicios: "Servicios",
      tarifas: "Tarifas",
      monitoreo: "Monitoreo",
      verificaciones: "Verificaciones",
      documentos: "Documentos",
      tickets: "Tickets Soporte",
      socios: "Socios e Inversores",
      aseguradoras: "Aseguradoras",
      empresas: "Empresas",
      configuracion: "Configuracion",
      admin_usuarios: "Gestionar Administradores",
    };

    const permisosFormatted = permisos.map(p => permisosLabels[p] || p).join(', ');
    const permisosList = permisos.map(p => `<li style="margin-bottom: 6px;">${permisosLabels[p] || p}</li>`).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Bienvenido a Grúa RD</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Panel de Administracion</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Estimado/a ${nombre},</p>
          
          <p style="font-size: 16px;">
            Se le ha asignado acceso al Panel de Administracion de Grúa RD. A continuacion encontrara sus credenciales de acceso.
          </p>
          
          <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e3a5f; margin: 0 0 15px 0;">Credenciales de Acceso:</h3>
            <p style="margin: 8px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 8px 0;"><strong>Contrasena temporal:</strong> <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
          </div>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 20px 0;">
            <h4 style="color: #856404; margin: 0 0 10px 0;">Importante - Seguridad:</h4>
            <p style="margin: 0; font-size: 14px; color: #856404;">
              Por seguridad, le recomendamos cambiar su contrasena en su primer inicio de sesion. 
              No comparta sus credenciales con nadie.
            </p>
          </div>
          
          <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px 20px; margin: 20px 0;">
            <h4 style="color: #155724; margin: 0 0 10px 0;">Permisos Asignados:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #155724; font-size: 14px;">
              ${permisosList}
            </ul>
          </div>
          
          <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1e3a5f; margin: 0 0 15px 0;">Lineamientos Internos:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #555;">
              <li style="margin-bottom: 8px;">Maneje la informacion de usuarios con confidencialidad</li>
              <li style="margin-bottom: 8px;">Documente cualquier accion administrativa relevante</li>
              <li style="margin-bottom: 8px;">Reporte cualquier incidente de seguridad inmediatamente</li>
              <li style="margin-bottom: 8px;">No realice cambios sin la debida autorizacion</li>
              <li style="margin-bottom: 8px;">Cierre sesion cuando no este usando el sistema</li>
            </ul>
          </div>
          
          <div style="background: #e8f4fd; border-left: 4px solid #1e3a5f; padding: 15px 20px; margin: 20px 0;">
            <h4 style="color: #1e3a5f; margin: 0 0 10px 0;">Soporte Interno:</h4>
            <p style="margin: 0; font-size: 14px; color: #555;">
              Si tiene alguna pregunta o necesita asistencia, contacte al administrador principal.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://gruard.com/admin" style="background: #1e3a5f; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Acceder al Panel</a>
          </div>
          
          ${generateSignatureHTML(SIGNATURE_CONFIG.administracion)}
          
          ${generateFooterHTML('Grúa RD - Panel de Administración')}
        </div>
      </body>
      </html>
    `;

    const text = `Estimado/a ${nombre},\n\nSe le ha asignado acceso al Panel de Administracion de Grúa RD.\n\nCredenciales de acceso:\nEmail: ${email}\nContrasena temporal: ${tempPassword}\n\nPermisos asignados: ${permisosFormatted}\n\nImportante: Cambie su contrasena en el primer inicio de sesion y no comparta sus credenciales.\n\nLineamientos:\n- Maneje la informacion con confidencialidad\n- Documente acciones administrativas\n- Reporte incidentes de seguridad\n- Cierre sesion cuando no use el sistema\n\n---\nGrúa RD\nDepartamento de Administración\nadmin@gruard.com\nMoca, Espaillat, República Dominicana\n\ncon la tecnología de Four One Solutions`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grúa RD <${resend.fromEmail}>`,
        to: [email],
        subject: 'Bienvenido al Panel de Administracion Grúa RD - Credenciales de Acceso',
        html,
        text,
      });

      if (error) {
        logger.error('Failed to send admin created email:', error);
        return false;
      }

      logger.info(`Admin created email sent successfully: ${data?.id}`);
      return true;
    } catch (error) {
      logger.error('Error sending admin created email:', error);
      return false;
    }
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

  async sendClientWelcomeEmail(email: string, userName: string): Promise<boolean> {
    logger.info(`📧 [MOCK EMAIL] Bienvenida cliente para ${email} (${userName})`);
    return true;
  }

  async sendOperatorWelcomeEmail(email: string, userName: string): Promise<boolean> {
    logger.info(`📧 [MOCK EMAIL] Bienvenida operador para ${email} (${userName})`);
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

  async sendTicketCreatedEmail(email: string, userName: string, ticket: TicketEmailData): Promise<boolean> {
    logger.info(`📧 [MOCK EMAIL] Ticket creado #${ticket.id.slice(-8)} para ${email}`);
    return true;
  }

  async sendTicketStatusChangedEmail(email: string, userName: string, ticket: TicketEmailData, oldStatus: string, newStatus: string): Promise<boolean> {
    logger.info(`📧 [MOCK EMAIL] Ticket #${ticket.id.slice(-8)} cambio de ${oldStatus} a ${newStatus} para ${email}`);
    return true;
  }

  async sendTicketSupportResponseEmail(email: string, userName: string, ticket: TicketEmailData, mensaje: string): Promise<boolean> {
    logger.info(`📧 [MOCK EMAIL] Respuesta a ticket #${ticket.id.slice(-8)} para ${email}`);
    return true;
  }

  async sendSocioCreatedEmail(email: string, nombre: string, tempPassword: string, porcentaje: string): Promise<boolean> {
    logger.info(`📧 [MOCK EMAIL] Socio creado para ${email} (${nombre}) - ${porcentaje}%`);
    return true;
  }

  async sendSocioFirstLoginEmail(email: string, nombre: string): Promise<boolean> {
    logger.info(`📧 [MOCK EMAIL] Primer inicio sesion socio para ${email} (${nombre})`);
    return true;
  }

  async sendAdminCreatedEmail(email: string, nombre: string, tempPassword: string, permisos: string[]): Promise<boolean> {
    logger.info(`📧 [MOCK EMAIL] Admin creado para ${email} (${nombre}) - Permisos: ${permisos.join(', ')}`);
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
