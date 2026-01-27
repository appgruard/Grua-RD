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

// Logo URL for emails (hosted logo)
const LOGO_URL = 'https://app.gruard.com/api/assets/logo-email';

// Brand colors
const BRAND_COLORS = {
  primary: '#1a1a2e',
  accent: '#e94560',
  light: '#f8f9fa',
  text: '#333333',
  muted: '#6c757d',
  border: '#e9ecef'
};

// Generate minimalist email header with centered logo
function generateMinimalHeader(): string {
  return `
    <div style="text-align: center; padding: 40px 20px 30px 20px;">
      <img src="${LOGO_URL}" alt="Grua RD" style="height: 50px; margin-bottom: 10px;" />
    </div>`;
}

// Generate minimalist signature HTML for emails
function generateSignatureHTML(config: { department: string; email: string }): string {
  return `
    <div style="text-align: center; padding: 30px 0 20px 0; border-top: 1px solid ${BRAND_COLORS.border}; margin-top: 40px;">
      <p style="margin: 0 0 4px 0; font-size: 13px; color: ${BRAND_COLORS.muted};">${config.department}</p>
      <p style="margin: 0; font-size: 12px; color: ${BRAND_COLORS.muted};">${config.email}</p>
    </div>`;
}

// Generate minimalist footer HTML
function generateFooterHTML(mainFooterContent: string): string {
  return `
    <div style="text-align: center; padding: 20px 0; background: ${BRAND_COLORS.light}; margin-top: 30px;">
      <p style="font-size: 11px; color: ${BRAND_COLORS.muted}; margin: 0 0 8px 0;">
        ${mainFooterContent}
      </p>
      <p style="font-size: 10px; color: #adb5bd; margin: 0;">
        Desarrollado por Four One Solutions
      </p>
    </div>`;
}

// Generate base email template wrapper (minimalist)
function generateEmailWrapper(content: string, signature: string, footer: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: ${BRAND_COLORS.text}; margin: 0; padding: 0; background: #ffffff;">
      <div style="max-width: 560px; margin: 0 auto; padding: 0;">
        ${generateMinimalHeader()}
        <div style="padding: 0 30px;">
          ${content}
          ${signature}
        </div>
        ${footer}
      </div>
    </body>
    </html>`;
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
  sendHighPriorityTicketNotification(adminEmail: string, ticket: TicketEmailData, userName: string, userEmail: string): Promise<boolean>;
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
    
    const resend = await getResendClient(EMAIL_ADDRESSES.verification);
    if (!resend) {
      logger.error('Resend not configured, cannot send OTP email');
      return false;
    }

    const content = `
      <p style="font-size: 15px; margin: 0 0 20px 0;">${greeting},</p>
      
      <p style="font-size: 15px; margin: 0 0 25px 0; color: ${BRAND_COLORS.muted};">
        Tu codigo de verificacion es:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background: ${BRAND_COLORS.light}; padding: 20px 40px; border-radius: 8px;">
          <span style="font-size: 36px; font-weight: 600; letter-spacing: 10px; color: ${BRAND_COLORS.primary};">${code}</span>
        </div>
      </div>
      
      <p style="font-size: 13px; color: ${BRAND_COLORS.muted}; margin: 25px 0 10px 0;">
        Este codigo es valido por <strong>10 minutos</strong>.
      </p>
      
      <p style="font-size: 13px; color: ${BRAND_COLORS.muted}; margin: 0;">
        Si no solicitaste este codigo, puedes ignorar este correo.
      </p>`;

    const html = generateEmailWrapper(
      content,
      generateSignatureHTML(SIGNATURE_CONFIG.seguridad),
      generateFooterHTML('Correo automatico - No responder')
    );

    const text = `${greeting},\n\nTu codigo de verificacion Grua RD es: ${code}\n\nEste codigo es valido por 10 minutos.\n\nSi no solicitaste este codigo, puedes ignorar este correo.\n\n---\nGrua RD | Departamento de Seguridad`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grua RD <${resend.fromEmail}>`,
        to: [email],
        subject: `${code} - Codigo de verificacion`,
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
    const content = `
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 25px 0; color: ${BRAND_COLORS.primary}; text-align: center;">
        Bienvenido a Grua RD
      </h1>
      
      <p style="font-size: 15px; margin: 0 0 20px 0;">Hola ${userName},</p>
      
      <p style="font-size: 14px; color: ${BRAND_COLORS.muted}; margin: 0 0 25px 0;">
        Gracias por unirte. Ahora puedes solicitar servicios de grua en tiempo real, seguir tu servicio en vivo y pagar de forma segura.
      </p>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="https://app.gruard.com" style="display: inline-block; background: ${BRAND_COLORS.primary}; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">Comenzar</a>
      </div>`;

    const html = generateEmailWrapper(
      content,
      generateSignatureHTML(SIGNATURE_CONFIG.atencionCliente),
      generateFooterHTML('Contacto: info@gruard.com')
    );

    const text = `Hola ${userName},\n\nBienvenido a Grua RD. Gracias por unirte.\n\nContacto: info@gruard.com\n\n---\nGrua RD`;

    return this.sendEmail({
      to: email,
      subject: 'Bienvenido a Grua RD',
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

    const content = `
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 25px 0; color: ${BRAND_COLORS.primary}; text-align: center;">
        Bienvenido a Grua RD
      </h1>
      
      <p style="font-size: 15px; margin: 0 0 20px 0;">Hola ${userName},</p>
      
      <p style="font-size: 14px; color: ${BRAND_COLORS.muted}; margin: 0 0 30px 0;">
        Tu cuenta ha sido creada exitosamente. Estamos listos para asistirte cuando lo necesites.
      </p>
      
      <div style="background: ${BRAND_COLORS.light}; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="font-size: 13px; font-weight: 600; color: ${BRAND_COLORS.primary}; margin: 0 0 12px 0;">Como solicitar un servicio:</p>
        <ol style="margin: 0; padding-left: 18px; font-size: 13px; color: ${BRAND_COLORS.muted};">
          <li style="margin-bottom: 6px;">Ingresa a tu cuenta</li>
          <li style="margin-bottom: 6px;">Indica tu ubicacion</li>
          <li style="margin-bottom: 6px;">Selecciona el servicio</li>
          <li style="margin-bottom: 0;">Confirma y espera al operador</li>
        </ol>
      </div>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="https://app.gruard.com" style="display: inline-block; background: ${BRAND_COLORS.primary}; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">Ir a Grua RD</a>
      </div>`;

    const html = generateEmailWrapper(
      content,
      generateSignatureHTML(SIGNATURE_CONFIG.atencionCliente),
      generateFooterHTML('Tu servicio de gruas de confianza')
    );

    const text = `Hola ${userName},\n\nBienvenido a Grua RD. Tu cuenta ha sido creada exitosamente.\n\n---\nGrua RD`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grua RD <${resend.fromEmail}>`,
        to: [email],
        subject: 'Bienvenido a Grua RD',
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

    const content = `
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 25px 0; color: ${BRAND_COLORS.primary}; text-align: center;">
        Bienvenido al Equipo Grua RD
      </h1>
      
      <p style="font-size: 15px; margin: 0 0 20px 0;">Hola ${userName},</p>
      
      <p style="font-size: 14px; color: ${BRAND_COLORS.muted}; margin: 0 0 25px 0;">
        Gracias por registrarte como operador. Estamos emocionados de tenerte en nuestro equipo.
      </p>
      
      <div style="background: ${BRAND_COLORS.light}; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="font-size: 13px; font-weight: 600; color: ${BRAND_COLORS.primary}; margin: 0 0 12px 0;">Proximos pasos:</p>
        <ol style="margin: 0; padding-left: 18px; font-size: 13px; color: ${BRAND_COLORS.muted};">
          <li style="margin-bottom: 6px;">Completa la verificacion de documentos</li>
          <li style="margin-bottom: 6px;">Espera la aprobacion del equipo</li>
          <li style="margin-bottom: 6px;">Configura tu perfil y disponibilidad</li>
          <li style="margin-bottom: 0;">Comienza a recibir solicitudes</li>
        </ol>
      </div>
      
      <div style="background: ${BRAND_COLORS.light}; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="font-size: 13px; font-weight: 600; color: ${BRAND_COLORS.primary}; margin: 0 0 12px 0;">Beneficios:</p>
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: ${BRAND_COLORS.muted};">
          <li style="margin-bottom: 6px;"><strong>80% de comision</strong> por servicio</li>
          <li style="margin-bottom: 6px;"><strong>Flexibilidad total</strong> - Trabaja cuando quieras</li>
          <li style="margin-bottom: 6px;"><strong>Pagos semanales</strong> puntuales</li>
          <li style="margin-bottom: 0;"><strong>Soporte 24/7</strong></li>
        </ul>
      </div>
      
      <p style="font-size: 13px; color: ${BRAND_COLORS.accent}; margin: 0 0 25px 0;">
        <strong>Importante:</strong> Debes completar la verificacion de documentos antes de recibir solicitudes.
      </p>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="https://app.gruard.com" style="display: inline-block; background: ${BRAND_COLORS.primary}; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">Completar Verificacion</a>
      </div>`;

    const html = generateEmailWrapper(
      content,
      generateSignatureHTML(SIGNATURE_CONFIG.operadores),
      generateFooterHTML('Juntos hacemos la diferencia')
    );

    const text = `Hola ${userName},\n\nGracias por registrarte como operador en Grua RD.\n\nProximos pasos:\n1. Completa la verificacion de documentos\n2. Espera la aprobacion\n3. Configura tu perfil\n4. Comienza a recibir solicitudes\n\nBeneficios: 80% comision, flexibilidad, pagos semanales, soporte 24/7.\n\n---\nGrua RD | Departamento de Operadores`;

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
    const resend = await getResendClient(EMAIL_ADDRESSES.info);
    
    const content = `
      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 25px 0; color: ${BRAND_COLORS.primary}; text-align: center;">
        Notificacion de Servicio
      </h1>
      
      <p style="font-size: 14px; color: ${BRAND_COLORS.text}; margin: 0 0 20px 0;">${message}</p>`;

    const html = generateEmailWrapper(
      content,
      generateSignatureHTML(SIGNATURE_CONFIG.servicios),
      generateFooterHTML('Correo automatico - No responder')
    );

    const text = `${message}\n\n---\nGrua RD | Departamento de Servicios`;

    if (!resend) {
      return this.sendEmail({
        to: email,
        subject: `Grúa RD: ${subject}`,
        html,
        text,
      });
    }

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grúa RD Servicios <${resend.fromEmail}>`,
        to: [email],
        subject: `Grúa RD: ${subject}`,
        html,
        text,
      });

      if (error) {
        logger.error('Failed to send service notification:', error);
        return false;
      }

      logger.info(`Service notification sent successfully: ${data?.id}`);
      return true;
    } catch (error) {
      logger.error('Error sending service notification:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetLink: string, userName?: string): Promise<boolean> {
    const greeting = userName ? `Hola ${userName}` : 'Hola';
    
    const content = `
      <p style="font-size: 15px; margin: 0 0 20px 0;">${greeting},</p>
      
      <p style="font-size: 14px; color: ${BRAND_COLORS.muted}; margin: 0 0 25px 0;">
        Recibimos una solicitud para restablecer la contrasena de tu cuenta.
      </p>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="${resetLink}" style="display: inline-block; background: ${BRAND_COLORS.primary}; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">Restablecer Contrasena</a>
      </div>
      
      <p style="font-size: 13px; color: ${BRAND_COLORS.muted}; margin: 25px 0 10px 0;">
        Este enlace es valido por <strong>1 hora</strong>.
      </p>
      
      <p style="font-size: 13px; color: ${BRAND_COLORS.muted}; margin: 0;">
        Si no solicitaste restablecer tu contrasena, ignora este correo.
      </p>`;

    const html = generateEmailWrapper(
      content,
      generateSignatureHTML(SIGNATURE_CONFIG.seguridad),
      generateFooterHTML('Correo automatico - No responder')
    );

    const text = `${greeting},\n\nRecibimos una solicitud para restablecer tu contrasena.\n\nEnlace: ${resetLink}\n\nEste enlace expira en 1 hora.\n\nSi no solicitaste esto, ignora este correo.\n\n---\nGrua RD | Departamento de Seguridad`;

    const resend = await getResendClient(EMAIL_ADDRESSES.verification);
    if (!resend) {
      return this.sendEmail({
        to: email,
        subject: 'Restablecer tu contraseña de Grúa RD',
        html,
        text,
      });
    }

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grúa RD Seguridad <${resend.fromEmail}>`,
        to: [email],
        subject: 'Restablecer tu contraseña de Grúa RD',
        html,
        text,
      });

      if (error) {
        logger.error('Failed to send password reset email:', error);
        return false;
      }

      logger.info(`Password reset email sent successfully: ${data?.id}`);
      return true;
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      return false;
    }
  }

  async sendDocumentApprovalEmail(email: string, documentType: string, approved: boolean, reason?: string): Promise<boolean> {
    const status = approved ? 'aprobado' : 'rechazado';
    const statusColor = approved ? '#28a745' : BRAND_COLORS.accent;
    
    const content = `
      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 25px 0; color: ${BRAND_COLORS.primary}; text-align: center;">
        Actualizacion de Documento
      </h1>
      
      <p style="font-size: 14px; color: ${BRAND_COLORS.text}; margin: 0 0 20px 0;">
        Tu documento <strong>${documentType}</strong> ha sido:
      </p>
      
      <div style="text-align: center; margin: 25px 0;">
        <span style="display: inline-block; background: ${BRAND_COLORS.light}; padding: 12px 30px; border-radius: 6px; font-size: 16px; font-weight: 600; color: ${statusColor}; text-transform: uppercase;">${status}</span>
      </div>
      
      ${reason ? `
      <p style="font-size: 13px; color: ${BRAND_COLORS.muted}; margin: 20px 0;">
        <strong>Motivo:</strong> ${reason}
      </p>
      ` : ''}
      
      ${!approved ? `
      <p style="font-size: 13px; color: ${BRAND_COLORS.muted}; margin: 20px 0;">
        Por favor, sube un nuevo documento que cumpla con los requisitos.
      </p>
      ` : ''}`;

    const html = generateEmailWrapper(
      content,
      generateSignatureHTML(SIGNATURE_CONFIG.verificaciones),
      generateFooterHTML('Correo automatico - No responder')
    );

    const text = `Tu documento ${documentType} ha sido ${status}.${reason ? `\n\nMotivo: ${reason}` : ''}${!approved ? '\n\nPor favor, sube un nuevo documento.' : ''}\n\n---\nGrua RD | Departamento de Verificaciones`;

    const resend = await getResendClient(EMAIL_ADDRESSES.verification);
    if (!resend) {
      return this.sendEmail({
        to: email,
        subject: `Grúa RD: Tu documento ha sido ${status}`,
        html,
        text,
      });
    }

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grúa RD Verificaciones <${resend.fromEmail}>`,
        to: [email],
        subject: `Grúa RD: Tu documento ha sido ${status}`,
        html,
        text,
      });

      if (error) {
        logger.error('Failed to send document approval email:', error);
        return false;
      }

      logger.info(`Document approval email sent successfully: ${data?.id}`);
      return true;
    } catch (error) {
      logger.error('Error sending document approval email:', error);
      return false;
    }
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

    const content = `
      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 25px 0; color: ${BRAND_COLORS.primary}; text-align: center;">
        Ticket Creado
      </h1>
      
      <p style="font-size: 15px; margin: 0 0 20px 0;">Hola ${userName},</p>
      
      <p style="font-size: 14px; color: ${BRAND_COLORS.muted}; margin: 0 0 25px 0;">
        Tu ticket de soporte ha sido creado exitosamente.
      </p>
      
      <div style="background: ${BRAND_COLORS.light}; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0 0 8px 0;"><strong>Numero:</strong> #${ticket.id.slice(-8).toUpperCase()}</p>
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0 0 8px 0;"><strong>Titulo:</strong> ${ticket.titulo}</p>
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0 0 8px 0;"><strong>Categoria:</strong> ${categoriaTexto[ticket.categoria] || ticket.categoria}</p>
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0 0 8px 0;"><strong>Prioridad:</strong> ${ticket.prioridad.charAt(0).toUpperCase() + ticket.prioridad.slice(1)}</p>
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0;"><strong>Estado:</strong> Abierto</p>
      </div>
      
      <p style="font-size: 13px; color: ${BRAND_COLORS.muted}; margin: 0 0 10px 0;">
        <strong>Tiempo estimado:</strong> ${prioridadTexto[ticket.prioridad] || '24-48 horas'}
      </p>
      
      <p style="font-size: 13px; color: ${BRAND_COLORS.muted}; margin: 0;">
        Te notificaremos cuando haya actualizaciones.
      </p>`;

    const html = generateEmailWrapper(
      content,
      generateSignatureHTML(SIGNATURE_CONFIG.soporte),
      generateFooterHTML('Estamos para ayudarte')
    );

    const text = `Hola ${userName},\n\nTu ticket ha sido creado.\n\nNumero: #${ticket.id.slice(-8).toUpperCase()}\nTitulo: ${ticket.titulo}\nCategoria: ${categoriaTexto[ticket.categoria] || ticket.categoria}\nPrioridad: ${ticket.prioridad}\n\nTiempo estimado: ${prioridadTexto[ticket.prioridad] || '24-48 horas'}\n\n---\nGrua RD | Departamento de Soporte`;

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
      'cerrado': { label: 'Cerrado', mensaje: 'Tu ticket ha sido cerrado. Gracias por contactarnos.', color: BRAND_COLORS.muted }
    };

    const estado = estadoTexto[newStatus] || { label: newStatus, mensaje: '', color: BRAND_COLORS.muted };

    const content = `
      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 25px 0; color: ${BRAND_COLORS.primary}; text-align: center;">
        Actualizacion de Ticket
      </h1>
      
      <p style="font-size: 15px; margin: 0 0 20px 0;">Hola ${userName},</p>
      
      <p style="font-size: 14px; color: ${BRAND_COLORS.muted}; margin: 0 0 25px 0;">
        El estado de tu ticket ha sido actualizado.
      </p>
      
      <div style="background: ${BRAND_COLORS.light}; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0 0 8px 0;"><strong>Ticket:</strong> #${ticket.id.slice(-8).toUpperCase()}</p>
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0 0 8px 0;"><strong>Titulo:</strong> ${ticket.titulo}</p>
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0;"><strong>Nuevo Estado:</strong> <span style="color: ${estado.color}; font-weight: 600;">${estado.label}</span></p>
      </div>
      
      <p style="font-size: 13px; color: ${BRAND_COLORS.muted}; margin: 0;">${estado.mensaje}</p>`;

    const html = generateEmailWrapper(
      content,
      generateSignatureHTML(SIGNATURE_CONFIG.soporte),
      generateFooterHTML('Estamos para ayudarte')
    );

    const text = `Hola ${userName},\n\nEl estado de tu ticket #${ticket.id.slice(-8).toUpperCase()} ha cambiado a: ${estado.label}\n\n${estado.mensaje}\n\n---\nGrua RD | Departamento de Soporte`;

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

    const content = `
      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 25px 0; color: ${BRAND_COLORS.primary}; text-align: center;">
        Nueva Respuesta
      </h1>
      
      <p style="font-size: 15px; margin: 0 0 20px 0;">Hola ${userName},</p>
      
      <p style="font-size: 14px; color: ${BRAND_COLORS.muted}; margin: 0 0 25px 0;">
        Nuestro equipo de soporte ha respondido a tu ticket.
      </p>
      
      <div style="background: ${BRAND_COLORS.light}; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="font-size: 12px; color: ${BRAND_COLORS.muted}; margin: 0 0 12px 0;"><strong>Ticket:</strong> #${ticket.id.slice(-8).toUpperCase()} - ${ticket.titulo}</p>
        <div style="border-top: 1px solid ${BRAND_COLORS.border}; padding-top: 12px;">
          <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.text}; white-space: pre-wrap;">${mensaje}</p>
        </div>
      </div>
      
      <p style="font-size: 13px; color: ${BRAND_COLORS.muted}; margin: 0;">
        Puedes responder desde tu cuenta en Grua RD.
      </p>`;

    const html = generateEmailWrapper(
      content,
      generateSignatureHTML(SIGNATURE_CONFIG.soporte),
      generateFooterHTML('Estamos para ayudarte')
    );

    const text = `Hola ${userName},\n\nNuestro equipo ha respondido a tu ticket #${ticket.id.slice(-8).toUpperCase()}.\n\nMensaje:\n${mensaje}\n\n---\nGrua RD | Departamento de Soporte`;

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

  async sendHighPriorityTicketNotification(adminEmail: string, ticket: TicketEmailData, userName: string, userEmail: string): Promise<boolean> {
    const resend = await getResendClient(EMAIL_ADDRESSES.support);
    if (!resend) {
      logger.error('Resend not configured, cannot send high priority ticket notification');
      return false;
    }

    const prioridadColor = ticket.prioridad === 'urgente' ? BRAND_COLORS.accent : '#fd7e14';
    const prioridadLabel = ticket.prioridad === 'urgente' ? 'URGENTE' : 'ALTA';

    const categoriaTexto: Record<string, string> = {
      'problema_tecnico': 'Problema Tecnico',
      'consulta_servicio': 'Consulta de Servicio',
      'queja': 'Queja',
      'sugerencia': 'Sugerencia',
      'problema_pago': 'Problema de Pago',
      'otro': 'Otro'
    };

    const content = `
      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 25px 0; color: ${prioridadColor}; text-align: center;">
        TICKET ${prioridadLabel}
      </h1>
      
      <p style="font-size: 14px; color: ${BRAND_COLORS.text}; margin: 0 0 25px 0; text-align: center;">
        Requiere atencion inmediata
      </p>
      
      <div style="background: ${BRAND_COLORS.light}; padding: 20px; border-radius: 8px; margin: 0 0 20px 0;">
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0 0 8px 0;"><strong>Numero:</strong> #${ticket.id.slice(-8).toUpperCase()}</p>
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0 0 8px 0;"><strong>Titulo:</strong> ${ticket.titulo}</p>
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0 0 8px 0;"><strong>Categoria:</strong> ${categoriaTexto[ticket.categoria] || ticket.categoria}</p>
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0;"><strong>Prioridad:</strong> <span style="color: ${prioridadColor}; font-weight: 600;">${prioridadLabel}</span></p>
      </div>
      
      <div style="background: ${BRAND_COLORS.light}; padding: 20px; border-radius: 8px; margin: 0 0 20px 0;">
        <p style="font-size: 13px; font-weight: 600; color: ${BRAND_COLORS.primary}; margin: 0 0 10px 0;">Usuario:</p>
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0 0 4px 0;">${userName}</p>
        <p style="font-size: 13px; color: ${BRAND_COLORS.muted}; margin: 0;">${userEmail}</p>
      </div>
      
      <div style="background: ${BRAND_COLORS.light}; padding: 20px; border-radius: 8px; margin: 0 0 20px 0;">
        <p style="font-size: 13px; font-weight: 600; color: ${BRAND_COLORS.primary}; margin: 0 0 10px 0;">Descripcion:</p>
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0; white-space: pre-wrap;">${ticket.descripcion}</p>
      </div>
      
      <p style="font-size: 13px; color: ${BRAND_COLORS.accent}; text-align: center; margin: 0;">
        Por favor, atienda este ticket lo antes posible.
      </p>`;

    const html = generateEmailWrapper(
      content,
      generateSignatureHTML(SIGNATURE_CONFIG.soporte),
      generateFooterHTML('Sistema de Notificaciones')
    );

    const text = `TICKET ${prioridadLabel} REQUIERE ATENCION\n\nNumero: #${ticket.id.slice(-8).toUpperCase()}\nTitulo: ${ticket.titulo}\nCategoria: ${categoriaTexto[ticket.categoria] || ticket.categoria}\nPrioridad: ${prioridadLabel}\n\nUsuario: ${userName} (${userEmail})\n\nDescripcion:\n${ticket.descripcion}\n\n---\nGrua RD | Sistema de Soporte`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grúa RD Alertas <${resend.fromEmail}>`,
        to: [adminEmail],
        subject: `🚨 TICKET ${prioridadLabel} #${ticket.id.slice(-8).toUpperCase()} - ${ticket.titulo}`,
        html,
        text,
      });

      if (error) {
        logger.error('Failed to send high priority ticket notification:', error);
        return false;
      }

      logger.info(`High priority ticket notification sent successfully: ${data?.id}`);
      return true;
    } catch (error) {
      logger.error('Error sending high priority ticket notification:', error);
      return false;
    }
  }

  async sendSocioCreatedEmail(email: string, nombre: string, tempPassword: string, porcentaje: string): Promise<boolean> {
    const resend = await getResendClient(EMAIL_ADDRESSES.socios);
    if (!resend) {
      logger.error('Resend not configured, cannot send socio created email');
      return false;
    }

    const content = `
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 25px 0; color: ${BRAND_COLORS.primary}; text-align: center;">
        Bienvenido al Portal de Socios
      </h1>
      
      <p style="font-size: 15px; margin: 0 0 20px 0;">Estimado/a ${nombre},</p>
      
      <p style="font-size: 14px; color: ${BRAND_COLORS.muted}; margin: 0 0 25px 0;">
        Es un placer darle la bienvenida como socio inversor de Grua RD. Su cuenta ha sido creada exitosamente.
      </p>
      
      <div style="background: ${BRAND_COLORS.light}; padding: 20px; border-radius: 8px; margin: 0 0 20px 0;">
        <p style="font-size: 13px; font-weight: 600; color: ${BRAND_COLORS.primary}; margin: 0 0 12px 0;">Credenciales de Acceso:</p>
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0;"><strong>Contrasena temporal:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
      </div>
      
      <p style="font-size: 13px; color: ${BRAND_COLORS.accent}; margin: 0 0 20px 0;">
        <strong>Importante:</strong> Cambie su contrasena en su primer inicio de sesion.
      </p>
      
      <div style="background: ${BRAND_COLORS.light}; padding: 20px; border-radius: 8px; margin: 0 0 20px 0;">
        <p style="font-size: 13px; font-weight: 600; color: ${BRAND_COLORS.primary}; margin: 0 0 8px 0;">Su Participacion:</p>
        <p style="font-size: 18px; font-weight: 600; color: #28a745; margin: 0;">${porcentaje}% de las utilidades</p>
      </div>
      
      <div style="background: ${BRAND_COLORS.light}; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="font-size: 13px; font-weight: 600; color: ${BRAND_COLORS.primary}; margin: 0 0 12px 0;">En su Dashboard podra:</p>
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: ${BRAND_COLORS.muted};">
          <li style="margin-bottom: 6px;">Ver el resumen de sus distribuciones</li>
          <li style="margin-bottom: 6px;">Consultar el historial de pagos</li>
          <li style="margin-bottom: 6px;">Revisar los ingresos del periodo actual</li>
          <li style="margin-bottom: 0;">Descargar reportes financieros</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="https://app.gruard.com" style="display: inline-block; background: ${BRAND_COLORS.primary}; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">Acceder al Portal</a>
      </div>`;

    const html = generateEmailWrapper(
      content,
      generateSignatureHTML(SIGNATURE_CONFIG.inversores),
      generateFooterHTML('Gracias por su confianza e inversion')
    );

    const text = `Estimado/a ${nombre},\n\nBienvenido como socio inversor de Grua RD.\n\nCredenciales:\nEmail: ${email}\nContrasena temporal: ${tempPassword}\n\nSu participacion: ${porcentaje}% de las utilidades\n\n---\nGrua RD | Relaciones con Inversores`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grua RD Inversores <${resend.fromEmail}>`,
        to: [email],
        subject: 'Bienvenido al Portal de Socios Grua RD - Credenciales de Acceso',
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
    const resend = await getResendClient(EMAIL_ADDRESSES.socios);
    if (!resend) {
      logger.error('Resend not configured, cannot send socio first login email');
      return false;
    }

    const content = `
      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 25px 0; color: ${BRAND_COLORS.primary}; text-align: center;">
        Primer Inicio de Sesion
      </h1>
      
      <p style="font-size: 15px; margin: 0 0 20px 0;">Estimado/a ${nombre},</p>
      
      <p style="font-size: 14px; color: ${BRAND_COLORS.muted}; margin: 0 0 25px 0;">
        Gracias por ser parte del equipo inversor de Grua RD. Hemos registrado su primer inicio de sesion en el portal.
      </p>
      
      <p style="font-size: 13px; color: ${BRAND_COLORS.accent}; margin: 0 0 25px 0;">
        <strong>Recordatorio:</strong> Si aun no ha cambiado su contrasena temporal, le recomendamos hacerlo desde "Mi Perfil".
      </p>
      
      <div style="background: ${BRAND_COLORS.light}; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="font-size: 13px; font-weight: 600; color: ${BRAND_COLORS.primary}; margin: 0 0 12px 0;">Guia del Dashboard:</p>
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: ${BRAND_COLORS.muted};">
          <li style="margin-bottom: 6px;"><strong>Resumen:</strong> Vista general de distribuciones</li>
          <li style="margin-bottom: 6px;"><strong>Distribuciones:</strong> Historial de pagos</li>
          <li style="margin-bottom: 6px;"><strong>Reportes:</strong> Informes financieros en PDF</li>
          <li style="margin-bottom: 0;"><strong>Perfil:</strong> Datos bancarios y contrasena</li>
        </ul>
      </div>
      
      <p style="font-size: 13px; color: ${BRAND_COLORS.muted}; margin: 0;">
        Las distribuciones se calculan mensualmente. Recibira una notificacion cuando su distribucion este lista.
      </p>`;

    const html = generateEmailWrapper(
      content,
      generateSignatureHTML(SIGNATURE_CONFIG.inversores),
      generateFooterHTML('Juntos construimos el futuro')
    );

    const text = `Estimado/a ${nombre},\n\nGracias por ser parte del equipo inversor de Grua RD. Hemos registrado su primer inicio de sesion.\n\nRecordatorio: Si no ha cambiado su contrasena temporal, le recomendamos hacerlo.\n\n---\nGrua RD | Relaciones con Inversores`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grua RD Inversores <${resend.fromEmail}>`,
        to: [email],
        subject: 'Bienvenido al Portal de Socios Grua RD - Primer Inicio de Sesion',
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
    const resend = await getResendClient(EMAIL_ADDRESSES.admin);
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
    const permisosList = permisos.map(p => `<li style="margin-bottom: 4px; font-size: 13px;">${permisosLabels[p] || p}</li>`).join('');

    const content = `
      <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 25px 0; color: ${BRAND_COLORS.primary}; text-align: center;">
        Panel de Administracion
      </h1>
      
      <p style="font-size: 15px; margin: 0 0 20px 0;">Estimado/a ${nombre},</p>
      
      <p style="font-size: 14px; color: ${BRAND_COLORS.muted}; margin: 0 0 25px 0;">
        Se le ha asignado acceso al Panel de Administracion de Grua RD.
      </p>
      
      <div style="background: ${BRAND_COLORS.light}; padding: 20px; border-radius: 8px; margin: 0 0 20px 0;">
        <p style="font-size: 13px; font-weight: 600; color: ${BRAND_COLORS.primary}; margin: 0 0 12px 0;">Credenciales de Acceso:</p>
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
        <p style="font-size: 13px; color: ${BRAND_COLORS.text}; margin: 0;"><strong>Contrasena temporal:</strong> <code style="background: white; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
      </div>
      
      <p style="font-size: 13px; color: ${BRAND_COLORS.accent}; margin: 0 0 20px 0;">
        <strong>Importante:</strong> Cambie su contrasena en el primer inicio de sesion. No comparta sus credenciales.
      </p>
      
      <div style="background: ${BRAND_COLORS.light}; padding: 20px; border-radius: 8px; margin: 0 0 20px 0;">
        <p style="font-size: 13px; font-weight: 600; color: ${BRAND_COLORS.primary}; margin: 0 0 10px 0;">Permisos Asignados:</p>
        <ul style="margin: 0; padding-left: 18px; color: ${BRAND_COLORS.text};">
          ${permisosList}
        </ul>
      </div>
      
      <div style="background: ${BRAND_COLORS.light}; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
        <p style="font-size: 13px; font-weight: 600; color: ${BRAND_COLORS.primary}; margin: 0 0 10px 0;">Lineamientos:</p>
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: ${BRAND_COLORS.muted};">
          <li style="margin-bottom: 4px;">Maneje la informacion con confidencialidad</li>
          <li style="margin-bottom: 4px;">Documente acciones administrativas relevantes</li>
          <li style="margin-bottom: 4px;">Reporte incidentes de seguridad</li>
          <li style="margin-bottom: 0;">Cierre sesion cuando no use el sistema</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 35px 0;">
        <a href="https://app.gruard.com/admin" style="display: inline-block; background: ${BRAND_COLORS.primary}; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">Acceder al Panel</a>
      </div>`;

    const html = generateEmailWrapper(
      content,
      generateSignatureHTML(SIGNATURE_CONFIG.administracion),
      generateFooterHTML('Panel de Administracion')
    );

    const text = `Estimado/a ${nombre},\n\nSe le ha asignado acceso al Panel de Administracion de Grua RD.\n\nCredenciales:\nEmail: ${email}\nContrasena temporal: ${tempPassword}\n\nPermisos: ${permisosFormatted}\n\n---\nGrua RD | Administracion`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `Grua RD <${resend.fromEmail}>`,
        to: [email],
        subject: 'Bienvenido al Panel de Administracion Grua RD - Credenciales de Acceso',
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

  async sendHighPriorityTicketNotification(adminEmail: string, ticket: TicketEmailData, userName: string, userEmail: string): Promise<boolean> {
    logger.info(`📧 [MOCK EMAIL] Notificación ticket URGENTE #${ticket.id.slice(-8)} a admin ${adminEmail} - Usuario: ${userName} (${userEmail})`);
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
