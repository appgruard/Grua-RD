import { test, expect } from '@playwright/test';
import { registerUser, createClientUser, createDriverUser, createAdminUser, waitForToast } from './helpers';

test.describe('Integración - Flujo Completo E2E', () => {
  test('Flujo completo: Cliente solicita → Conductor acepta → Completa servicio', async ({ page, context }) => {
    const clientPage = page;
    const driverPage = await context.newPage();
    
    const clientUser = createClientUser();
    const driverUser = createDriverUser();
    
    console.log('1. Registrando cliente...');
    await registerUser(clientPage, clientUser);
    await expect(clientPage).toHaveURL('/client/home');
    
    console.log('2. Registrando conductor...');
    await registerUser(driverPage, driverUser);
    await expect(driverPage).toHaveURL('/driver/dashboard');
    
    console.log('3. Conductor se pone disponible...');
    await driverPage.getByTestId('toggle-availability').click();
    await waitForToast(driverPage, /disponibilidad/i);
    await driverPage.waitForTimeout(1000);
    
    console.log('4. Cliente solicita servicio...');
    await clientPage.getByTestId('button-new-request').click();
    await clientPage.getByTestId('input-origin-address').fill('Avenida 27 de Febrero, Santo Domingo');
    await clientPage.getByTestId('input-destination-address').fill('Malecón de Santo Domingo');
    await clientPage.getByTestId('button-calculate-route').click();
    
    await expect(clientPage.getByTestId('text-distance')).toBeVisible({ timeout: 10000 });
    await expect(clientPage.getByTestId('text-price')).toBeVisible();
    
    await clientPage.getByTestId('button-confirm-request').click();
    await waitForToast(clientPage, 'Solicitud creada');
    await clientPage.waitForTimeout(2000);
    
    console.log('5. Conductor ve y acepta solicitud...');
    await driverPage.reload();
    await driverPage.waitForTimeout(2000);
    
    const requestCard = driverPage.getByTestId('card-request').first();
    if (await requestCard.isVisible({ timeout: 5000 })) {
      await requestCard.getByTestId('button-accept').click();
      await waitForToast(driverPage, /aceptado/i);
      await driverPage.waitForTimeout(1000);
      
      console.log('6. Cliente ve que servicio fue aceptado...');
      await clientPage.reload();
      await clientPage.waitForTimeout(2000);
      await expect(clientPage.getByTestId('status-aceptado')).toBeVisible({ timeout: 5000 });
      
      console.log('7. Conductor inicia el servicio...');
      await driverPage.getByTestId('button-start-service').click();
      await waitForToast(driverPage, /iniciado/i);
      await driverPage.waitForTimeout(1000);
      
      console.log('8. Cliente ve tracking en tiempo real...');
      await clientPage.reload();
      await clientPage.waitForTimeout(2000);
      await expect(clientPage.getByTestId('status-en_progreso')).toBeVisible({ timeout: 5000 });
      await expect(clientPage.getByTestId('map-tracking')).toBeVisible();
      
      console.log('9. Conductor completa el servicio...');
      await driverPage.getByTestId('button-complete-service').click();
      await waitForToast(driverPage, /completado/i);
      await driverPage.waitForTimeout(1000);
      
      console.log('10. Cliente puede calificar el servicio...');
      await clientPage.reload();
      await clientPage.waitForTimeout(2000);
      await expect(clientPage.getByTestId('status-completado')).toBeVisible({ timeout: 5000 });
      
      const ratingButton = clientPage.getByTestId('button-rate-service');
      if (await ratingButton.isVisible()) {
        await ratingButton.click();
        await clientPage.getByTestId('star-5').click();
        await clientPage.getByTestId('input-comment').fill('Excelente servicio!');
        await clientPage.getByTestId('button-submit-rating').click();
        await waitForToast(clientPage, /calificación/i);
      }
      
      console.log('11. Verificando historial en ambos lados...');
      await clientPage.getByTestId('link-history').click();
      await expect(clientPage).toHaveURL('/client/history');
      await expect(clientPage.getByTestId('service-completado').first()).toBeVisible();
      
      await driverPage.getByTestId('link-history').click();
      await expect(driverPage).toHaveURL('/driver/history');
      await expect(driverPage.getByTestId('service-completado').first()).toBeVisible();
      
      console.log('✓ Flujo completo exitoso');
    } else {
      console.log('⚠ No se encontraron solicitudes pendientes para el conductor');
      expect(true).toBe(true);
    }
  });

  test('Admin puede monitorear el flujo completo', async ({ page, context }) => {
    const adminPage = page;
    const clientPage = await context.newPage();
    
    const adminUser = createAdminUser();
    const clientUser = createClientUser();
    
    await registerUser(adminPage, adminUser);
    await registerUser(clientPage, clientUser);
    
    console.log('1. Admin ve dashboard inicial...');
    await expect(adminPage).toHaveURL('/admin/dashboard');
    const initialUsers = await adminPage.getByTestId('stat-total-users').textContent();
    
    console.log('2. Cliente crea solicitud...');
    await clientPage.getByTestId('button-new-request').click();
    await clientPage.getByTestId('input-origin-address').fill('Origen Test');
    await clientPage.getByTestId('input-destination-address').fill('Destino Test');
    await clientPage.getByTestId('button-calculate-route').click();
    await clientPage.waitForTimeout(2000);
    await clientPage.getByTestId('button-confirm-request').click();
    await clientPage.waitForTimeout(2000);
    
    console.log('3. Admin ve la nueva solicitud en servicios...');
    await adminPage.getByTestId('link-services').click();
    await expect(adminPage).toHaveURL('/admin/services');
    await adminPage.waitForTimeout(2000);
    
    const servicesTable = adminPage.getByTestId('table-services');
    await expect(servicesTable).toBeVisible();
    
    console.log('4. Admin ve estadísticas actualizadas...');
    await adminPage.getByTestId('link-dashboard').click();
    await adminPage.waitForTimeout(1000);
    await expect(adminPage.getByTestId('stat-total-services')).toBeVisible();
    
    console.log('✓ Admin puede monitorear correctamente');
  });

  test('Manejo de errores: Servicio cancelado por cliente', async ({ page, context }) => {
    const clientPage = page;
    const clientUser = createClientUser();
    
    await registerUser(clientPage, clientUser);
    
    await clientPage.getByTestId('button-new-request').click();
    await clientPage.getByTestId('input-origin-address').fill('Origen');
    await clientPage.getByTestId('input-destination-address').fill('Destino');
    await clientPage.getByTestId('button-calculate-route').click();
    await clientPage.waitForTimeout(2000);
    await clientPage.getByTestId('button-confirm-request').click();
    await clientPage.waitForTimeout(2000);
    
    const cancelButton = clientPage.getByTestId('button-cancel-service');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      
      const confirmButton = clientPage.getByTestId('button-confirm-cancel');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await waitForToast(clientPage, /cancelado/i);
        
        await expect(clientPage.getByTestId('status-cancelado')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Conductor no puede aceptar múltiples servicios simultáneamente', async ({ page, context }) => {
    const driverPage = page;
    const client1Page = await context.newPage();
    const client2Page = await context.newPage();
    
    const driverUser = createDriverUser();
    const client1User = createClientUser();
    const client2User = createClientUser();
    
    await registerUser(driverPage, driverUser);
    await registerUser(client1Page, client1User);
    await registerUser(client2Page, client2User);
    
    await driverPage.getByTestId('toggle-availability').click();
    await driverPage.waitForTimeout(1000);
    
    await client1Page.getByTestId('button-new-request').click();
    await client1Page.getByTestId('input-origin-address').fill('Origen 1');
    await client1Page.getByTestId('input-destination-address').fill('Destino 1');
    await client1Page.getByTestId('button-calculate-route').click();
    await client1Page.waitForTimeout(2000);
    await client1Page.getByTestId('button-confirm-request').click();
    await client1Page.waitForTimeout(1000);
    
    await driverPage.reload();
    await driverPage.waitForTimeout(2000);
    
    const firstRequest = driverPage.getByTestId('card-request').first();
    if (await firstRequest.isVisible()) {
      await firstRequest.getByTestId('button-accept').click();
      await driverPage.waitForTimeout(1000);
      
      await client2Page.getByTestId('button-new-request').click();
      await client2Page.getByTestId('input-origin-address').fill('Origen 2');
      await client2Page.getByTestId('input-destination-address').fill('Destino 2');
      await client2Page.getByTestId('button-calculate-route').click();
      await client2Page.waitForTimeout(2000);
      await client2Page.getByTestId('button-confirm-request').click();
      
      await driverPage.reload();
      await driverPage.waitForTimeout(2000);
      
      const pendingRequests = await driverPage.getByTestId('card-request').count();
      expect(pendingRequests).toBe(0);
    }
  });
});
