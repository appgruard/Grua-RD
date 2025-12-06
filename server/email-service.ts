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
  sendServiceNotification(email: string, subject: string, message: string): Promise<boolean>;
  sendPasswordResetEmail(email: string, resetLink: string, userName?: string): Promise<boolean>;
  sendDocumentApprovalEmail(email: string, documentType: string, approved: boolean, reason?: string): Promise<boolean>;
  sendTicketCreatedEmail(email: string, userName: string, ticket: TicketEmailData): Promise<boolean>;
  sendTicketStatusChangedEmail(email: string, userName: string, ticket: TicketEmailData, oldStatus: string, newStatus: string): Promise<boolean>;
  sendTicketSupportResponseEmail(email: string, userName: string, ticket: TicketEmailData, mensaje: string): Promise<boolean>;
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
          <h1 style="color: white; margin: 0; font-size: 24px;">GruaRD Soporte</h1>
          <p style="color: #e0e0e0; margin: 10px 0 0 0;">Ticket Creado</p>
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
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            GruaRD Soporte - support@gruard.com
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `Hola ${userName},\n\nTu ticket de soporte ha sido creado.\n\nNumero: #${ticket.id.slice(-8).toUpperCase()}\nTitulo: ${ticket.titulo}\nCategoria: ${categoriaTexto[ticket.categoria] || ticket.categoria}\nPrioridad: ${ticket.prioridad}\n\nTiempo estimado de respuesta: ${prioridadTexto[ticket.prioridad] || '24-48 horas'}\n\nGruaRD Soporte`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `GruaRD Soporte <${resend.fromEmail}>`,
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
          <h1 style="color: white; margin: 0; font-size: 24px;">GruaRD Soporte</h1>
          <p style="color: #e0e0e0; margin: 10px 0 0 0;">Actualizacion de Ticket</p>
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
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            GruaRD Soporte - support@gruard.com
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `Hola ${userName},\n\nEl estado de tu ticket #${ticket.id.slice(-8).toUpperCase()} ha cambiado a: ${estado.label}\n\n${estado.mensaje}\n\nGruaRD Soporte`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `GruaRD Soporte <${resend.fromEmail}>`,
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
          <h1 style="color: white; margin: 0; font-size: 24px;">GruaRD Soporte</h1>
          <p style="color: #e0e0e0; margin: 10px 0 0 0;">Nueva Respuesta</p>
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
            Puedes responder a este ticket desde tu cuenta en GruaRD.
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            GruaRD Soporte - support@gruard.com
          </p>
        </div>
      </body>
      </html>
    `;

    const text = `Hola ${userName},\n\nNuestro equipo de soporte ha respondido a tu ticket #${ticket.id.slice(-8).toUpperCase()}.\n\nMensaje:\n${mensaje}\n\nPuedes responder desde tu cuenta en GruaRD.\n\nGruaRD Soporte`;

    try {
      const { data, error } = await resend.client.emails.send({
        from: `GruaRD Soporte <${resend.fromEmail}>`,
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
