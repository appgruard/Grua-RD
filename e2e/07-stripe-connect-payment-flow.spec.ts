import { test, expect } from '@playwright/test';
import { loginAs, generateValidCedula, generateDominicanPhone } from './helpers';

const isStripeConfigured = !!process.env.VITE_STRIPE_PUBLIC_KEY && !!process.env.STRIPE_SECRET_KEY;

test.describe('Stripe Connect & Payment Methods Flow', () => {
  test.describe('Client Payment Methods Management', () => {
    test('should display payment methods section in client profile', async ({ page }) => {
      const clientEmail = `cliente-payment-${Date.now()}@test.com`;
      const password = 'TestPassword123!';
      
      await page.goto('/register');
      await page.fill('[data-testid="input-email"]', clientEmail);
      await page.fill('[data-testid="input-password"]', password);
      await page.fill('[data-testid="input-nombre"]', 'Juan');
      await page.fill('[data-testid="input-apellido"]', 'Pérez');
      await page.fill('[data-testid="input-phone"]', generateDominicanPhone());
      await page.selectOption('[data-testid="select-usertype"]', 'cliente');
      await page.click('[data-testid="button-register"]');
      
      await expect(page).toHaveURL('/client');
      
      await page.click('[data-testid="nav-profile"]');
      await expect(page).toHaveURL('/client/profile');
      
      await expect(page.getByText('Métodos de Pago')).toBeVisible();
      
      if (isStripeConfigured) {
        const emptyState = page.getByText('No tienes métodos de pago guardados');
        const addButton = page.locator('[data-testid="button-add-payment-method"]');
        
        await expect(emptyState.or(addButton)).toBeVisible();
      } else {
        await expect(page.getByText('El sistema de pagos aún no está configurado')).toBeVisible();
      }
    });

    test('should show configuration message when Stripe is not configured', async ({ page }) => {
      test.skip(isStripeConfigured, 'Skipping when Stripe is configured');
      
      const clientEmail = `cliente-payment-dialog-${Date.now()}@test.com`;
      const password = 'TestPassword123!';
      
      await page.goto('/register');
      await page.fill('[data-testid="input-email"]', clientEmail);
      await page.fill('[data-testid="input-password"]', password);
      await page.fill('[data-testid="input-nombre"]', 'María');
      await page.fill('[data-testid="input-apellido"]', 'González');
      await page.fill('[data-testid="input-phone"]', generateDominicanPhone());
      await page.selectOption('[data-testid="select-usertype"]', 'cliente');
      await page.click('[data-testid="button-register"]');
      
      await expect(page).toHaveURL('/client');
      
      await page.click('[data-testid="nav-profile"]');
      
      await expect(page.getByText('El sistema de pagos aún no está configurado')).toBeVisible();
      await expect(page.getByText('Por favor, contacta al administrador')).toBeVisible();
      
      const addButton = page.locator('[data-testid="button-add-payment-method"]');
      await expect(addButton).not.toBeVisible();
    });
  });

  test.describe('Service Receipt Download', () => {
    test('should show download receipt button for completed services', async ({ page, request }) => {
      const clientEmail = `cliente-receipt-${Date.now()}@test.com`;
      const driverEmail = `conductor-receipt-${Date.now()}@test.com`;
      const password = 'TestPassword123!';

      await page.goto('/register');
      await page.fill('[data-testid="input-email"]', clientEmail);
      await page.fill('[data-testid="input-password"]', password);
      await page.fill('[data-testid="input-nombre"]', 'Pedro');
      await page.fill('[data-testid="input-apellido"]', 'Martínez');
      await page.fill('[data-testid="input-phone"]', generateDominicanPhone());
      await page.selectOption('[data-testid="select-usertype"]', 'cliente');
      await page.click('[data-testid="button-register"]');
      await expect(page).toHaveURL('/client');

      await page.goto('/register');
      await page.fill('[data-testid="input-email"]', driverEmail);
      await page.fill('[data-testid="input-password"]', password);
      await page.fill('[data-testid="input-nombre"]', 'Carlos');
      await page.fill('[data-testid="input-apellido"]', 'Rodríguez');
      await page.fill('[data-testid="input-phone"]', generateDominicanPhone());
      await page.selectOption('[data-testid="select-usertype"]', 'conductor');
      await page.click('[data-testid="button-register"]');
      await expect(page).toHaveURL('/driver/dashboard');

      await loginAs(page, clientEmail, password);
      
      const origin = { lat: 18.4861, lng: -69.9312 };
      const destination = { lat: 18.5000, lng: -69.9500 };
      
      const requestUrl = `/api/services/request?origenLat=${origin.lat}&origenLng=${origin.lng}&destinoLat=${destination.lat}&destinoLng=${destination.lng}`;
      const serviceResponse = await request.post(requestUrl, {
        headers: { 'Cookie': await page.context().cookies().then(cookies => cookies.map(c => `${c.name}=${c.value}`).join('; ')) }
      });
      expect(serviceResponse.ok()).toBeTruthy();
      const service = await serviceResponse.json();
      const serviceId = service.id;

      await loginAs(page, driverEmail, password);
      await page.goto('/driver/dashboard');
      
      await page.waitForTimeout(1000);
      
      const acceptButton = page.locator(`[data-testid="button-accept-${serviceId}"]`);
      if (await acceptButton.isVisible()) {
        await acceptButton.click();
        await page.waitForTimeout(500);
      }

      const completeUrl = `/api/services/${serviceId}/complete`;
      await request.post(completeUrl, {
        headers: { 'Cookie': await page.context().cookies().then(cookies => cookies.map(c => `${c.name}=${c.value}`).join('; ')) }
      });

      await loginAs(page, clientEmail, password);
      await page.goto('/client/history');
      
      await page.waitForTimeout(1000);
      
      const serviceCard = page.locator(`[data-testid="service-card-${serviceId}"]`);
      await expect(serviceCard).toBeVisible();
      
      const downloadButton = page.locator(`[data-testid="button-download-receipt-${serviceId}"]`);
      await expect(downloadButton).toBeVisible();
      await expect(downloadButton).toContainText('Descargar Recibo');
    });
  });

  test.describe('Driver Stripe Connect Account', () => {
    test('should display Stripe Connect account section in driver profile', async ({ page }) => {
      const driverEmail = `conductor-connect-${Date.now()}@test.com`;
      const password = 'TestPassword123!';
      
      await page.goto('/register');
      await page.fill('[data-testid="input-email"]', driverEmail);
      await page.fill('[data-testid="input-password"]', password);
      await page.fill('[data-testid="input-nombre"]', 'Luis');
      await page.fill('[data-testid="input-apellido"]', 'Fernández');
      await page.fill('[data-testid="input-phone"]', generateDominicanPhone());
      await page.selectOption('[data-testid="select-usertype"]', 'conductor');
      await page.click('[data-testid="button-register"]');
      
      await expect(page).toHaveURL('/driver/dashboard');
      
      await page.click('[data-testid="nav-profile"]');
      await expect(page).toHaveURL('/driver/profile');
      
      await expect(page.getByText('Cuenta de Pagos')).toBeVisible();
      
      if (isStripeConfigured) {
        await expect(page.getByText('Configurar Cuenta de Pagos', { exact: false })).toBeVisible();
      } else {
        await expect(page.getByText('El sistema de pagos aún no está configurado')).toBeVisible();
      }
    });

    test('should show setup account button when Stripe is configured and not onboarded', async ({ page }) => {
      test.skip(!isStripeConfigured, 'Skipping when Stripe is not configured');
      
      const driverEmail = `conductor-setup-${Date.now()}@test.com`;
      const password = 'TestPassword123!';
      
      await page.goto('/register');
      await page.fill('[data-testid="input-email"]', driverEmail);
      await page.fill('[data-testid="input-password"]', password);
      await page.fill('[data-testid="input-nombre"]', 'Ana');
      await page.fill('[data-testid="input-apellido"]', 'Torres');
      await page.fill('[data-testid="input-phone"]', generateDominicanPhone());
      await page.selectOption('[data-testid="select-usertype"]', 'conductor');
      await page.click('[data-testid="button-register"]');
      
      await expect(page).toHaveURL('/driver/dashboard');
      
      await page.click('[data-testid="nav-profile"]');
      
      const setupButton = page.locator('[data-testid="button-setup-stripe-account"]');
      await expect(setupButton).toBeVisible();
    });
  });

  test.describe('Payment Flow Integration', () => {
    test('should verify client can navigate to payment methods section', async ({ page }) => {
      const clientEmail = `cliente-payment-flow-${Date.now()}@test.com`;
      const password = 'TestPassword123!';

      await page.goto('/register');
      await page.fill('[data-testid="input-email"]', clientEmail);
      await page.fill('[data-testid="input-password"]', password);
      await page.fill('[data-testid="input-nombre"]', 'Laura');
      await page.fill('[data-testid="input-apellido"]', 'Ramírez');
      await page.fill('[data-testid="input-phone"]', generateDominicanPhone());
      await page.selectOption('[data-testid="select-usertype"]', 'cliente');
      await page.click('[data-testid="button-register"]');
      await expect(page).toHaveURL('/client');

      await page.click('[data-testid="nav-profile"]');
      await expect(page).toHaveURL('/client/profile');
      
      await expect(page.getByText('Métodos de Pago')).toBeVisible();
    });
  });
});
