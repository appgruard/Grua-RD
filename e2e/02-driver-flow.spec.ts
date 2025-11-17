import { test, expect } from '@playwright/test';
import { registerUser, loginUser, createDriverUser, waitForToast } from './helpers';

test.describe('Conductor - Flujo Completo', () => {

  test('Debe poder registrarse como conductor con datos de grúa', async ({ page }) => {
    const driverUser = createDriverUser();
    await registerUser(page, driverUser);
    
    await expect(page).toHaveURL('/driver/dashboard');
    
    await expect(page.getByTestId('text-welcome')).toContainText(driverUser.nombre);
  });

  test('Debe poder iniciar sesión como conductor', async ({ page }) => {
    const driverUser = createDriverUser();
    await registerUser(page, driverUser);
    
    await page.getByTestId('button-logout').click();
    await page.waitForURL('/login');
    
    await loginUser(page, driverUser.email, driverUser.password);
    await expect(page).toHaveURL('/driver/dashboard');
  });

  test('Debe poder cambiar su disponibilidad', async ({ page }) => {
    const driverUser = createDriverUser();
    await registerUser(page, driverUser);
    
    await expect(page).toHaveURL('/driver/dashboard');
    
    const toggleButton = page.getByTestId('toggle-availability');
    await expect(toggleButton).toBeVisible();
    
    const initialState = await toggleButton.getAttribute('data-state');
    await toggleButton.click();
    
    await waitForToast(page, /disponibilidad actualizada/i);
    
    const newState = await toggleButton.getAttribute('data-state');
    expect(newState).not.toBe(initialState);
  });

  test('Debe poder ver solicitudes pendientes', async ({ page }) => {
    const driverUser = createDriverUser();
    await registerUser(page, driverUser);
    
    await page.getByTestId('toggle-availability').click();
    
    const requestsSection = page.getByTestId('section-pending-requests');
    await expect(requestsSection).toBeVisible();
  });

  test('Debe poder ver su historial de servicios', async ({ page }) => {
    const driverUser = createDriverUser();
    await registerUser(page, driverUser);
    
    await page.getByTestId('link-history').click();
    await expect(page).toHaveURL('/driver/history');
    
    const heading = page.getByRole('heading', { name: /historial/i });
    await expect(heading).toBeVisible();
  });

  test('Debe poder ver y editar su perfil con datos de grúa', async ({ page }) => {
    const driverUser = createDriverUser();
    await registerUser(page, driverUser);
    
    await page.getByTestId('link-profile').click();
    await expect(page).toHaveURL('/driver/profile');
    
    await expect(page.getByTestId('text-licencia')).toContainText(driverUser.licencia);
    await expect(page.getByTestId('text-placa')).toContainText(driverUser.placaGrua);
    await expect(page.getByTestId('text-marca')).toContainText(driverUser.marcaGrua);
  });

  test('Debe validar campos requeridos específicos del conductor', async ({ page }) => {
    await page.goto('/register');
    
    await page.getByTestId('input-nombre').fill('Test');
    await page.getByTestId('input-apellido').fill('Driver');
    await page.getByTestId('input-email').fill('test@driver.com');
    await page.getByTestId('input-password').fill('Test123!');
    
    await page.getByTestId('select-user-type').click();
    await page.getByTestId('option-conductor').click();
    
    await page.getByTestId('button-register').click();
    
    await expect(page.getByText(/licencia es requerida/i)).toBeVisible();
    await expect(page.getByText(/placa es requerida/i)).toBeVisible();
  });
});
