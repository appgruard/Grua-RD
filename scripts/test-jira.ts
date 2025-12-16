import { Resend } from 'resend';

async function testHighPriorityTicket() {
  console.log('=== Prueba de Ticket Urgente con Notificación a Admin ===\n');

  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!baseUrl || !email || !apiToken || !projectKey) {
    console.error('❌ Variables de entorno de Jira no configuradas');
    process.exit(1);
  }

  const authHeader = 'Basic ' + Buffer.from(`${email}:${apiToken}`).toString('base64');

  // Delete previous test ticket GR-2
  console.log('1. Eliminando ticket anterior (GR-2)...');
  try {
    const deleteResponse = await fetch(`${baseUrl}/rest/api/3/issue/GR-2`, {
      method: 'DELETE',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    });
    if (deleteResponse.ok || deleteResponse.status === 204) {
      console.log('✅ Ticket GR-2 eliminado');
    } else {
      console.log('⚠️ GR-2 no encontrado o ya eliminado');
    }
  } catch (error) {
    console.log('⚠️ Error al eliminar:', error);
  }

  // Create new urgent ticket in Jira
  console.log('\n2. Creando ticket URGENTE en Jira...');
  const ticketId = 'URGENT-' + Date.now();
  
  const payload = {
    fields: {
      project: { key: projectKey },
      summary: 'TICKET URGENTE - Prueba de Notificación Admin',
      description: {
        type: 'doc',
        version: 1,
        content: [{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: `Este es un ticket URGENTE de prueba para verificar que la notificación llega a admin@fourone.com.do

---
**Detalles del Ticket**
- ID Local: ${ticketId}
- Usuario: Sistema de Prueba (test@grua-rd.com)
- Categoría: problema_tecnico
- Prioridad: URGENTE (Highest)

Este ticket debe generar un correo de notificación al administrador.`,
          }],
        }],
      },
      issuetype: { name: 'Task' },
      priority: { name: 'Highest' },
      labels: ['technical-issue', 'grua-rd', 'support-ticket', 'test', 'urgent'],
    },
  };

  let jiraIssueKey = '';
  try {
    const createResponse = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('❌ Error al crear ticket en Jira:', createResponse.status, errorText);
      process.exit(1);
    }

    const result = await createResponse.json();
    jiraIssueKey = result.key;
    console.log('✅ Ticket URGENTE creado en Jira!');
    console.log('   - Issue Key:', result.key);
    console.log('   - Prioridad: Highest (Urgente)');
  } catch (error) {
    console.error('❌ Error al crear ticket en Jira:', error);
    process.exit(1);
  }

  // Send admin notification email
  console.log('\n3. Enviando notificación a admin@fourone.com.do...');
  
  if (!resendApiKey) {
    console.log('⚠️ RESEND_API_KEY no configurada - no se puede enviar correo');
  } else {
    const resend = new Resend(resendApiKey);
    
    const ticketData = {
      id: ticketId,
      titulo: 'TICKET URGENTE - Prueba de Notificación Admin',
      descripcion: 'Este es un ticket URGENTE de prueba para verificar que la notificación llega a admin@fourone.com.do',
      categoria: 'problema_tecnico',
      prioridad: 'urgente',
      estado: 'abierto'
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #dc3545; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ TICKET URGENTE</h1>
          <p style="color: #ffffff; margin: 10px 0 0 0;">Requiere Atención Inmediata</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; font-weight: bold;">Se ha creado un nuevo ticket de prioridad urgente:</p>
          <div style="background: white; border-left: 4px solid #dc3545; padding: 20px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Número de Ticket:</strong> #${ticketId.slice(-8).toUpperCase()}</p>
            <p style="margin: 5px 0;"><strong>Jira Issue:</strong> ${jiraIssueKey}</p>
            <p style="margin: 5px 0;"><strong>Título:</strong> ${ticketData.titulo}</p>
            <p style="margin: 5px 0;"><strong>Categoría:</strong> Problema Técnico</p>
            <p style="margin: 5px 0;"><strong>Prioridad:</strong> <span style="color: #dc3545; font-weight: bold;">URGENTE</span></p>
          </div>
          <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold;">Información del Usuario:</p>
            <p style="margin: 5px 0;"><strong>Nombre:</strong> Sistema de Prueba</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> test@grua-rd.com</p>
          </div>
          <p style="font-size: 14px; color: #666; text-align: center; margin-top: 20px;">
            Por favor, atienda este ticket lo antes posible.
          </p>
        </div>
      </body>
      </html>
    `;

    try {
      const { data, error } = await resend.emails.send({
        from: 'Grúa RD Alertas <noreply@gruard.com>',
        to: ['admin@fourone.com.do'],
        subject: `🚨 TICKET URGENTE #${ticketId.slice(-8).toUpperCase()} - Prueba de Notificación`,
        html,
      });

      if (error) {
        console.error('❌ Error al enviar correo:', error);
      } else {
        console.log('✅ Correo enviado exitosamente!');
        console.log('   - Email ID:', data?.id);
        console.log('   - Destinatario: admin@fourone.com.do');
      }
    } catch (error) {
      console.error('❌ Error al enviar correo:', error);
    }
  }

  console.log('\n🎉 Prueba completada.');
  console.log('   - Ticket Jira: ' + jiraIssueKey);
  console.log('   - Revisa tu correo en admin@fourone.com.do');
}

testHighPriorityTicket();
