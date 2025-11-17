import { test, expect } from '@playwright/test';
import { registerUser, loginUser, createClientUser, waitForToast } from './helpers';

test.describe('Cliente - Flujo Completo', () => {

  test('Debe poder registrarse como cliente', async ({ page }) => {
    const clientUser = createClientUser();
    await registerUser(page, clientUser);
    
    await expect(page).toHaveURL('/client/home');
    
    await expect(page.getByTestId('text-welcome')).toContainText(clientUser.nombre);
  });

  test('Debe poder iniciar sesión como cliente', async ({ page }) => {
    const clientUser = createClientUser();
    await registerUser(page, clientUser);
    
    await page.getByTestId('button-logout').click();
    await page.waitForURL('/login');
    
    await loginUser(page, clientUser.email, clientUser.password);
    await expect(page).toHaveURL('/client/home');
  });

  test('Debe poder solicitar un servicio de grúa', async ({ page }) => {
    const clientUser = createClientUser();
    await registerUser(page, clientUser);
    
    await expect(page).toHaveURL('/client/home');
    
    await page.getByTestId('button-new-request').click();
    
    await page.getByTestId('input-origin-address').fill('Avenida 27 de Febrero, Santo Domingo');
    
    await page.getByTestId('input-destination-address').fill('Malecón de Santo Domingo');
    
    await page.getByTestId('button-calculate-route').click();
    
    await expect(page.getByTestId('text-distance')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('text-price')).toBeVisible();
    
    await page.getByTestId('button-confirm-request').click();
    
    await waitForToast(page, 'Solicitud creada');
    
    await expect(page.getByTestId('status-pending')).toBeVisible();
  });

  test('Debe poder ver el historial de servicios', async ({ page }) => {
    const clientUser = createClientUser();
    await registerUser(page, clientUser);
    
    await page.getByTestId('link-history').click();
    await expect(page).toHaveURL('/client/history');
    
    const heading = page.getByRole('heading', { name: /historial/i });
    await expect(heading).toBeVisible();
  });

  test('Debe poder ver su perfil', async ({ page }) => {
    const clientUser = createClientUser();
    await registerUser(page, clientUser);
    
    await page.getByTestId('link-profile').click();
    await expect(page).toHaveURL('/client/profile');
    
    await expect(page.getByTestId('text-email')).toContainText(clientUser.email);
    await expect(page.getByTestId('text-nombre')).toContainText(clientUser.nombre);
  });

  test('Debe mostrar mensaje de error con credenciales inválidas', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByTestId('input-email').fill('noexiste@email.com');
    await page.getByTestId('input-password').fill('wrongpassword');
    await page.getByTestId('button-login').click();
    
    await waitForToast(page, 'Credenciales inválidas');
  });

  test('Debe validar campos requeridos en el registro', async ({ page }) => {
    await page.goto('/register');
    
    await page.getByTestId('button-register').click();
    
    await expect(page.getByText(/nombre es requerido/i)).toBeVisible();
    await expect(page.getByText(/email es requerido/i)).toBeVisible();
  });
});
