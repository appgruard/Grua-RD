import { test, expect } from '@playwright/test';
import { generateUniqueId, waitForToast, generateValidCedula, generateDominicanPhone } from './helpers';

function generateUniqueId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${timestamp}${randomPart}`;
}

test.describe('Wizard de Onboarding - Verificación de Identidad', () => {
  
  test('Debe completar el flujo completo de onboarding como cliente', async ({ page }) => {
    const uuid = generateUniqueId();
    const email = `cliente-wizard-${uuid}@gruard.com`;
    const password = 'TestPassword123!';
    const nombre = 'Juan';
    const apellido = 'Pérez';
    const cedula = generateValidCedula();
    const phone = generateDominicanPhone();
    const otpCode = '123456';

    await page.goto('/onboarding');
    
    await expect(page.getByTestId('progress-wizard')).toBeVisible();
    
    await page.getByTestId('input-nombre-step1').fill(nombre);
    await page.getByTestId('input-apellido-step1').fill(apellido);
    await page.getByTestId('input-phone-step1').fill(phone);
    await page.getByTestId('input-email').fill(email);
    await page.getByTestId('input-password').fill(password);
    
    await page.getByTestId('select-user-type').click();
    await page.getByRole('option', { name: /cliente/i }).click();
    
    await page.getByTestId('button-continue-step1').click();
    
    await waitForToast(page, '¡Cuenta creada!');
    
    await page.getByTestId('input-cedula').fill(cedula);
    await page.getByTestId('button-verify-cedula').click();
    
    await waitForToast(page, '¡Cédula verificada!');
    
    await expect(page.getByTestId('input-phone')).toHaveValue(phone);
    
    await page.getByTestId('button-send-otp').click();
    
    await waitForToast(page, 'Código enviado');
    
    await page.getByTestId('input-otp-code').fill(otpCode);
    await page.getByTestId('button-verify-otp').click();
    
    await waitForToast(page, '¡Teléfono verificado!');
    
    await page.getByTestId('button-complete-registration').click();
    
    await waitForToast(page, '¡Registro completado!');
    
    await page.waitForURL('/client/**', { timeout: 10000 });
    await expect(page).toHaveURL(/\/client/);
  });

  test('Debe completar el flujo completo de onboarding como conductor', async ({ page }) => {
    const uuid = generateUniqueId();
    const email = `conductor-wizard-${uuid}@gruard.com`;
    const password = 'TestPassword123!';
    const nombre = 'Carlos';
    const apellido = 'González';
    const cedula = generateValidCedula();
    const phone = generateDominicanPhone();
    const otpCode = '123456';
    const licencia = `LIC${uuid.slice(0, 8).toUpperCase()}`;
    const placaGrua = `A${uuid.slice(0, 8).toUpperCase()}`;
    const marcaGrua = 'Ford';
    const modeloGrua = 'F-450';

    await page.goto('/onboarding');
    
    await page.getByTestId('input-nombre-step1').fill(nombre);
    await page.getByTestId('input-apellido-step1').fill(apellido);
    await page.getByTestId('input-phone-step1').fill(phone);
    await page.getByTestId('input-email').fill(email);
    await page.getByTestId('input-password').fill(password);
    
    await page.getByTestId('select-user-type').click();
    await page.getByRole('option', { name: /conductor/i }).click();
    
    await page.getByTestId('button-continue-step1').click();
    
    await waitForToast(page, '¡Cuenta creada!');
    
    await page.getByTestId('input-cedula').fill(cedula);
    await page.getByTestId('button-verify-cedula').click();
    
    await waitForToast(page, '¡Cédula verificada!');
    
    await page.getByTestId('button-send-otp').click();
    
    await waitForToast(page, 'Código enviado');
    
    await page.getByTestId('input-otp-code').fill(otpCode);
    await page.getByTestId('button-verify-otp').click();
    
    await waitForToast(page, '¡Teléfono verificado!');
    
    await page.getByTestId('input-licencia').fill(licencia);
    await page.getByTestId('input-placa-grua').fill(placaGrua);
    await page.getByTestId('input-marca-grua').fill(marcaGrua);
    await page.getByTestId('input-modelo-grua').fill(modeloGrua);
    
    await page.getByTestId('button-complete-registration').click();
    
    await waitForToast(page, '¡Registro completado!');
    
    await page.waitForURL('/driver/**', { timeout: 10000 });
    await expect(page).toHaveURL(/\/driver/);
  });

  test('Debe validar formato de cédula inválido', async ({ page }) => {
    const uuid = generateUniqueId();
    const email = `test-cedula-${uuid}@gruard.com`;
    const password = 'TestPassword123!';
    const nombre = 'Test';
    const apellido = 'User';
    const phone = generateDominicanPhone();

    await page.goto('/onboarding');
    
    await page.getByTestId('input-nombre-step1').fill(nombre);
    await page.getByTestId('input-apellido-step1').fill(apellido);
    await page.getByTestId('input-phone-step1').fill(phone);
    await page.getByTestId('input-email').fill(email);
    await page.getByTestId('input-password').fill(password);
    
    await page.getByTestId('button-continue-step1').click();
    
    await waitForToast(page, '¡Cuenta creada!');
    
    await page.getByTestId('input-cedula').fill('123-4567890-1');
    await page.getByTestId('button-verify-cedula').click();
    
    await waitForToast(page, 'Error');
  });

  test('Debe validar código OTP incorrecto', async ({ page }) => {
    const uuid = generateUniqueId();
    const email = `test-otp-${uuid}@gruard.com`;
    const password = 'TestPassword123!';
    const nombre = 'Test';
    const apellido = 'User';
    const cedula = generateValidCedula();
    const phone = generateDominicanPhone();

    await page.goto('/onboarding');
    
    await page.getByTestId('input-nombre-step1').fill(nombre);
    await page.getByTestId('input-apellido-step1').fill(apellido);
    await page.getByTestId('input-phone-step1').fill(phone);
    await page.getByTestId('input-email').fill(email);
    await page.getByTestId('input-password').fill(password);
    
    await page.getByTestId('button-continue-step1').click();
    
    await waitForToast(page, '¡Cuenta creada!');
    
    await page.getByTestId('input-cedula').fill(cedula);
    await page.getByTestId('button-verify-cedula').click();
    
    await waitForToast(page, '¡Cédula verificada!');
    
    await page.getByTestId('button-send-otp').click();
    
    await waitForToast(page, 'Código enviado');
    
    await page.getByTestId('input-otp-code').fill('999999');
    await page.getByTestId('button-verify-otp').click();
    
    await waitForToast(page, 'Código incorrecto');
  });

  test('Debe permitir reenviar código OTP', async ({ page }) => {
    const uuid = generateUniqueId();
    const email = `test-resend-${uuid}@gruard.com`;
    const password = 'TestPassword123!';
    const nombre = 'Test';
    const apellido = 'User';
    const cedula = generateValidCedula();
    const phone = generateDominicanPhone();

    await page.goto('/onboarding');
    
    await page.getByTestId('input-nombre-step1').fill(nombre);
    await page.getByTestId('input-apellido-step1').fill(apellido);
    await page.getByTestId('input-phone-step1').fill(phone);
    await page.getByTestId('input-email').fill(email);
    await page.getByTestId('input-password').fill(password);
    
    await page.getByTestId('button-continue-step1').click();
    
    await waitForToast(page, '¡Cuenta creada!');
    
    await page.getByTestId('input-cedula').fill(cedula);
    await page.getByTestId('button-verify-cedula').click();
    
    await waitForToast(page, '¡Cédula verificada!');
    
    await page.getByTestId('button-send-otp').click();
    
    await waitForToast(page, 'Código enviado');
    
    await page.waitForTimeout(2000);
    
    const resendButton = page.getByTestId('button-resend-otp');
    await expect(resendButton).toBeVisible();
  });

  test('Debe persistir estado del wizard en sessionStorage', async ({ page }) => {
    const uuid = generateUniqueId();
    const email = `test-persist-${uuid}@gruard.com`;
    const password = 'TestPassword123!';
    const nombre = 'Test';
    const apellido = 'User';
    const phone = generateDominicanPhone();

    await page.goto('/onboarding');
    
    await page.getByTestId('input-nombre-step1').fill(nombre);
    await page.getByTestId('input-apellido-step1').fill(apellido);
    await page.getByTestId('input-phone-step1').fill(phone);
    await page.getByTestId('input-email').fill(email);
    await page.getByTestId('input-password').fill(password);
    
    await page.getByTestId('button-continue-step1').click();
    
    await waitForToast(page, '¡Cuenta creada!');
    
    await page.reload();
    
    await expect(page.getByTestId('input-cedula')).toBeVisible();
  });

  test('Debe validar campos requeridos en paso 1', async ({ page }) => {
    await page.goto('/onboarding');
    
    await page.getByTestId('button-continue-step1').click();
    
    await expect(page.locator('text=/nombre es requerido/i')).toBeVisible();
    await expect(page.locator('text=/apellido es requerido/i')).toBeVisible();
    await expect(page.locator('text=/teléfono es requerido/i')).toBeVisible();
    await expect(page.locator('text=/correo.*requerido/i')).toBeVisible();
    await expect(page.locator('text=/contraseña es requerida/i')).toBeVisible();
  });
});
