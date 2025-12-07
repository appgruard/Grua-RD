import { getEmailService } from '../server/email-service';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendTestEmails() {
  const email = 'admin@fourone.com.do';
  
  console.log(`Enviando correos de prueba a: ${email}\n`);
  
  const emailService = await getEmailService();
  const isConfigured = await emailService.isConfigured();
  
  if (!isConfigured) {
    console.error('Servicio de email no configurado. Verifique RESEND_API_KEY');
    process.exit(1);
  }
  
  console.log('Servicio de email configurado\n');
  
  const mockTicket = {
    id: 'TKT-12345',
    titulo: 'Prueba de Soporte',
    descripcion: 'Este es un ticket de prueba para verificar el sistema de correos.',
    categoria: 'technical',
    prioridad: 'high',
    estado: 'open'
  };

  const templates = [
    {
      name: 'OTP/Verificacion',
      send: () => emailService.sendOTPEmail(email, '123456', 'Usuario de Prueba')
    },
    {
      name: 'Bienvenida General',
      send: () => emailService.sendWelcomeEmail(email, 'Usuario de Prueba')
    },
    {
      name: 'Bienvenida Cliente',
      send: () => emailService.sendClientWelcomeEmail(email, 'Cliente de Prueba')
    },
    {
      name: 'Bienvenida Operador',
      send: () => emailService.sendOperatorWelcomeEmail(email, 'Operador de Prueba')
    },
    {
      name: 'Notificacion de Servicio',
      send: () => emailService.sendServiceNotification(email, 'Servicio Completado', 'Su servicio de grua ha sido completado exitosamente. Gracias por confiar en Grua RD.')
    },
    {
      name: 'Restablecer Contrasena',
      send: () => emailService.sendPasswordResetEmail(email, 'https://gruard.com/reset-password?token=test-token-12345', 'Usuario de Prueba')
    },
    {
      name: 'Documento Aprobado',
      send: () => emailService.sendDocumentApprovalEmail(email, 'Licencia de Conducir', true)
    },
    {
      name: 'Documento Rechazado',
      send: () => emailService.sendDocumentApprovalEmail(email, 'Seguro del Vehiculo', false, 'El documento esta vencido o ilegible')
    },
    {
      name: 'Ticket Creado',
      send: () => emailService.sendTicketCreatedEmail(email, 'Usuario de Prueba', mockTicket)
    },
    {
      name: 'Ticket Estado Cambiado',
      send: () => emailService.sendTicketStatusChangedEmail(email, 'Usuario de Prueba', mockTicket, 'open', 'in_progress')
    },
    {
      name: 'Respuesta de Soporte',
      send: () => emailService.sendTicketSupportResponseEmail(email, 'Usuario de Prueba', mockTicket, 'Gracias por contactarnos. Hemos recibido su solicitud y estamos trabajando en ella. Le responderemos pronto.')
    },
    {
      name: 'Socio Creado',
      send: () => emailService.sendSocioCreatedEmail(email, 'Socio de Prueba', 'TempPass123!', '15%')
    },
    {
      name: 'Socio Primer Login',
      send: () => emailService.sendSocioFirstLoginEmail(email, 'Socio de Prueba')
    },
    {
      name: 'Admin Creado',
      send: () => emailService.sendAdminCreatedEmail(email, 'Admin de Prueba', 'AdminPass456!', ['dashboard', 'usuarios', 'reportes', 'configuracion'])
    }
  ];

  const results: { name: string; success: boolean; error?: string }[] = [];
  
  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];
    try {
      console.log(`Enviando (${i + 1}/${templates.length}): ${template.name}...`);
      await template.send();
      results.push({ name: template.name, success: true });
      console.log(`   OK - ${template.name} - Enviado`);
      
      if (i < templates.length - 1) {
        await delay(600);
      }
    } catch (error: any) {
      results.push({ name: template.name, success: false, error: error.message });
      console.log(`   ERROR - ${template.name}: ${error.message}`);
    }
  }

  console.log('\n=== RESUMEN ===');
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  console.log(`Enviados: ${successCount}`);
  console.log(`Fallidos: ${failedCount}`);
  console.log(`Total: ${results.length}`);
  
  if (failedCount > 0) {
    console.log('\nCorreos fallidos:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\nRevisa tu bandeja de entrada en:', email);
}

sendTestEmails().catch(console.error);
