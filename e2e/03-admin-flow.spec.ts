import { test, expect } from '@playwright/test';
import { registerUser, loginUser, createAdminUser, waitForToast } from './helpers';

test.describe('Admin - Flujo Completo', () => {

  test('Debe poder registrarse como administrador', async ({ page }) => {
    const adminUser = createAdminUser();
    await registerUser(page, adminUser);
    
    await expect(page).toHaveURL('/admin/dashboard');
    
    await expect(page.getByTestId('text-welcome')).toContainText(adminUser.nombre);
  });

  test('Debe poder iniciar sesión como administrador', async ({ page }) => {
    const adminUser = createAdminUser();
    await registerUser(page, adminUser);
    
    await page.getByTestId('button-logout').click();
    await page.waitForURL('/login');
    
    await loginUser(page, adminUser.email, adminUser.password);
    await expect(page).toHaveURL('/admin/dashboard');
  });

  test('Debe mostrar estadísticas en el dashboard', async ({ page }) => {
    const adminUser = createAdminUser();
    await registerUser(page, adminUser);
    
    await expect(page).toHaveURL('/admin/dashboard');
    
    await expect(page.getByTestId('stat-total-users')).toBeVisible();
    await expect(page.getByTestId('stat-total-drivers')).toBeVisible();
    await expect(page.getByTestId('stat-total-services')).toBeVisible();
    await expect(page.getByTestId('stat-total-revenue')).toBeVisible();
  });

  test('Debe poder ver la lista de usuarios', async ({ page }) => {
    const adminUser = createAdminUser();
    await registerUser(page, adminUser);
    
    await page.getByTestId('link-users').click();
    await expect(page).toHaveURL('/admin/users');
    
    const usersTable = page.getByTestId('table-users');
    await expect(usersTable).toBeVisible();
  });

  test('Debe poder ver la lista de conductores', async ({ page }) => {
    const adminUser = createAdminUser();
    await registerUser(page, adminUser);
    
    await page.getByTestId('link-drivers').click();
    await expect(page).toHaveURL('/admin/drivers');
    
    const driversTable = page.getByTestId('table-drivers');
    await expect(driversTable).toBeVisible();
  });

  test('Debe poder ver todos los servicios', async ({ page }) => {
    const adminUser = createAdminUser();
    await registerUser(page, adminUser);
    
    await page.getByTestId('link-services').click();
    await expect(page).toHaveURL('/admin/services');
    
    const servicesTable = page.getByTestId('table-services');
    await expect(servicesTable).toBeVisible();
  });

  test('Debe poder crear una nueva tarifa', async ({ page }) => {
    const adminUser = createAdminUser();
    await registerUser(page, adminUser);
    
    await page.getByTestId('link-pricing').click();
    await expect(page).toHaveURL('/admin/pricing');
    
    await page.getByTestId('button-new-pricing').click();
    
    await page.getByTestId('input-nombre').fill('Tarifa Especial Test');
    await page.getByTestId('input-precio-base').fill('500');
    await page.getByTestId('input-tarifa-km').fill('35');
    
    await page.getByTestId('button-save-pricing').click();
    
    await waitForToast(page, 'Tarifa creada');
    
    await expect(page.getByText('Tarifa Especial Test')).toBeVisible();
  });

  test('Debe poder ver el monitoreo en tiempo real', async ({ page }) => {
    const adminUser = createAdminUser();
    await registerUser(page, adminUser);
    
    await page.getByTestId('link-monitoring').click();
    await expect(page).toHaveURL('/admin/monitoring');
    
    const mapContainer = page.getByTestId('map-monitoring');
    await expect(mapContainer).toBeVisible();
  });

  test('Debe poder filtrar servicios por estado', async ({ page }) => {
    const adminUser = createAdminUser();
    await registerUser(page, adminUser);
    
    await page.getByTestId('link-services').click();
    await expect(page).toHaveURL('/admin/services');
    
    await page.getByTestId('filter-status').click();
    await page.getByTestId('option-pendiente').click();
    
    const table = page.getByTestId('table-services');
    await expect(table).toBeVisible();
  });
});
