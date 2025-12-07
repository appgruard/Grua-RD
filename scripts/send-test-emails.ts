import { getEmailService } from '../server/email-service';

async function sendTestEmails() {
  const email = 'admin@fourone.com.do';
  
  console.log(`Enviando correos de prueba a: ${email}\n`);
  
  const emailService = await getEmailService();
  const isConfigured = await emailService.isConfigured();
  
  if (!isConfigured) {
    console.error('❌ Servicio de email no configurado. Verifique RESEND_API_KEY');
    process.exit(1);
  }
  
  console.log('✓ Servicio de email configurado\n');
  
  const mockTicket = {
    id: 'TKT-12345',
    titulo: 'Prueba de Soporte',
    descripcion: 'Este es un ticket de prueba para verificar el sistema de correos.',
    categoria: 'technical',
    prioridad: 'high',
    estado: 'open'
  };
  
  const mockTransaction = {
    id: 'TXN-98765',
    amount: 5000,
    currency: 'DOP',
    type: 'deposit' as const,
    description: 'Depósito de prueba para verificar emails',
    balance: 15000
  };
  
  const mockService = {
    id: 'SRV-54321',
    clientName: 'Juan Pérez',
    operatorName: 'Carlos Rodríguez',
    vehicleType: 'Sedán',
    vehiclePlate: 'A123456',
    pickupLocation: 'Santo Domingo',
    dropoffLocation: 'Santiago',
    price: 3500,
    status: 'completed' as const
  };

  const templates = [
    {
      name: 'OTP/Verificación',
      send: () => emailService.sendOTPEmail(email, '123456')
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
      name: 'Notificación de Servicio',
      send: () => emailService.sendServiceNotificationEmail(email, 'Juan Pérez', { status: 'accepted', serviceId: 'SRV-001' })
    },
    {
      name: 'Restablecer Contraseña',
      send: () => emailService.sendPasswordResetEmail(email, 'https://gruard.com/reset-password?token=test-token-12345', 'Usuario de Prueba')
    },
    {
      name: 'Documento Aprobado',
      send: () => emailService.sendDocumentApprovalEmail(email, 'Licencia de Conducir', true)
    },
    {
      name: 'Documento Rechazado',
      send: () => emailService.sendDocumentApprovalEmail(email, 'Seguro del Vehículo', false, 'El documento está vencido o ilegible')
    },
    {
      name: 'Ticket Creado',
      send: () => emailService.sendTicketCreatedEmail(email, 'Usuario de Prueba', mockTicket)
    },
    {
      name: 'Ticket Estado Cambiado',
      send: () => emailService.sendTicketStatusChangedEmail(email, 'Usuario de Prueba', mockTicket, 'in_progress')
    },
    {
      name: 'Transacción de Wallet',
      send: () => emailService.sendWalletTransactionEmail(email, 'Usuario de Prueba', mockTransaction)
    },
    {
      name: 'Resumen de Servicio Completado',
      send: () => emailService.sendServiceCompletedSummaryEmail(email, 'Juan Pérez', mockService)
    }
  ];

  const results: { name: string; success: boolean; error?: string }[] = [];
  
  for (const template of templates) {
    try {
      console.log(`📧 Enviando: ${template.name}...`);
      await template.send();
      results.push({ name: template.name, success: true });
      console.log(`   ✓ ${template.name} - Enviado`);
    } catch (error: any) {
      results.push({ name: template.name, success: false, error: error.message });
      console.log(`   ✗ ${template.name} - Error: ${error.message}`);
    }
  }

  console.log('\n=== RESUMEN ===');
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  console.log(`✓ Enviados: ${successCount}`);
  console.log(`✗ Fallidos: ${failedCount}`);
  console.log(`Total: ${results.length}`);
  
  if (failedCount > 0) {
    console.log('\nCorreos fallidos:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
}

sendTestEmails().catch(console.error);
