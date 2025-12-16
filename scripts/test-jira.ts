// Direct Jira API test without dependencies
async function testJira() {
  console.log('=== Prueba de Integración con Jira ===\n');

  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!baseUrl || !email || !apiToken || !projectKey) {
    console.error('❌ Variables de entorno de Jira no configuradas');
    process.exit(1);
  }

  const authHeader = 'Basic ' + Buffer.from(`${email}:${apiToken}`).toString('base64');

  // Delete previous ticket GR-1
  console.log('1. Eliminando ticket anterior (GR-1)...');
  try {
    const deleteResponse = await fetch(`${baseUrl}/rest/api/3/issue/GR-1`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (deleteResponse.ok || deleteResponse.status === 204) {
      console.log('✅ Ticket GR-1 eliminado exitosamente');
    } else {
      const errorText = await deleteResponse.text();
      console.log('⚠️ No se pudo eliminar GR-1:', deleteResponse.status, errorText);
    }
  } catch (error) {
    console.log('⚠️ Error al eliminar:', error);
  }

  // Create new ticket with highest priority
  console.log('\n2. Creando nuevo ticket con prioridad URGENTE...');
  const ticketId = 'TEST-' + Date.now();
  
  const payload = {
    fields: {
      project: { key: projectKey },
      summary: 'Ticket de Prueba URGENTE - Eliminar después de verificar',
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `Este es un ticket de prueba con PRIORIDAD MÁXIMA creado automáticamente para verificar la integración con Jira.

---
**Detalles del Ticket**
- ID Local: ${ticketId}
- Usuario: Sistema de Prueba (test@grua-rd.com)
- Categoría: problema_tecnico
- Prioridad: URGENTE (Highest)

Por favor eliminar después de confirmar que funciona.`,
              },
            ],
          },
        ],
      },
      issuetype: { name: 'Task' },
      priority: { name: 'Highest' },
      labels: ['technical-issue', 'grua-rd', 'support-ticket', 'test', 'urgent'],
    },
  };

  try {
    const createResponse = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('❌ Error al crear ticket:', createResponse.status, errorText);
      process.exit(1);
    }

    const result = await createResponse.json();
    console.log('✅ Ticket URGENTE creado exitosamente!');
    console.log('   - Issue ID:', result.id);
    console.log('   - Issue Key:', result.key);
    console.log('   - Prioridad: Highest (Urgente)');
    console.log('\n🎉 Prueba completada.');
    console.log('   Guarda este Issue Key para eliminarlo después:', result.key);
  } catch (error) {
    console.error('❌ Error al crear ticket:', error);
    process.exit(1);
  }
}

testJira();
