// Direct Jira API test without dependencies
async function testJira() {
  console.log('=== Prueba de Integración con Jira ===\n');

  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!baseUrl || !email || !apiToken || !projectKey) {
    console.error('❌ Variables de entorno de Jira no configuradas');
    console.log('   JIRA_BASE_URL:', baseUrl ? '✓' : '✗');
    console.log('   JIRA_EMAIL:', email ? '✓' : '✗');
    console.log('   JIRA_API_TOKEN:', apiToken ? '✓' : '✗');
    console.log('   JIRA_PROJECT_KEY:', projectKey ? '✓' : '✗');
    process.exit(1);
  }

  const authHeader = 'Basic ' + Buffer.from(`${email}:${apiToken}`).toString('base64');

  // Test connection
  console.log('1. Probando conexión con Jira...');
  try {
    const projectResponse = await fetch(`${baseUrl}/rest/api/3/project/${projectKey}`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!projectResponse.ok) {
      const errorText = await projectResponse.text();
      console.error('❌ Error de conexión:', projectResponse.status, errorText);
      process.exit(1);
    }

    const project = await projectResponse.json();
    console.log('✅ Conexión exitosa al proyecto:', project.name);
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    process.exit(1);
  }

  // Create test ticket
  console.log('\n2. Creando ticket de prueba...');
  const ticketId = 'TEST-' + Date.now();
  
  const payload = {
    fields: {
      project: { key: projectKey },
      summary: 'Ticket de Prueba - Eliminar después de verificar',
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `Este es un ticket de prueba creado automáticamente para verificar la integración con Jira.

---
**Detalles del Ticket**
- ID Local: ${ticketId}
- Usuario: Sistema de Prueba (test@grua-rd.com)
- Categoría: otro
- Prioridad: baja

Por favor eliminar después de confirmar que funciona.`,
              },
            ],
          },
        ],
      },
      issuetype: { name: 'Task' },
      priority: { name: 'Low' },
      labels: ['other', 'grua-rd', 'support-ticket', 'test'],
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
    console.log('✅ Ticket creado exitosamente!');
    console.log('   - Issue ID:', result.id);
    console.log('   - Issue Key:', result.key);
    console.log('\n🎉 Prueba completada. El ticket fue creado en Jira.');
    console.log('   Guarda este Issue Key para eliminarlo después:', result.key);
  } catch (error) {
    console.error('❌ Error al crear ticket:', error);
    process.exit(1);
  }
}

testJira();
