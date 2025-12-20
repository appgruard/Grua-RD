// Delete test ticket from Jira
async function deleteTestTicket() {
  console.log('=== Eliminando Ticket de Prueba de Jira ===\n');

  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email || !apiToken) {
    console.error('❌ Variables de entorno de Jira no configuradas');
    process.exit(1);
  }

  const authHeader = 'Basic ' + Buffer.from(`${email}:${apiToken}`).toString('base64');

  // Delete GR-3
  console.log('Eliminando ticket GR-3...');
  try {
    const deleteResponse = await fetch(`${baseUrl}/rest/api/3/issue/GR-3`, {
      method: 'DELETE',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    });
    if (deleteResponse.ok || deleteResponse.status === 204) {
      console.log('✅ Ticket GR-3 eliminado exitosamente');
    } else {
      const errorText = await deleteResponse.text();
      console.log('⚠️ No se pudo eliminar GR-3:', deleteResponse.status, errorText);
    }
  } catch (error) {
    console.log('⚠️ Error al eliminar:', error);
  }

  console.log('\n✅ Limpieza completada');
}

deleteTestTicket();
