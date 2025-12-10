import { test, expect } from '@playwright/test';
import { generateUniqueId, waitForToast, generateValidCedula, generateDominicanPhone, loginUser } from './helpers';

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

  test('REGRESIÓN: Cliente autenticado debe poder completar registro de conductor secundario y redirigir a /driver', async ({ page }) => {
    const uuid = generateUniqueId();
    const email = `cliente-conductor-${uuid}@gruard.com`;
    const password = 'TestPassword123!';
    const nombre = 'Maria';
    const apellido = 'Rodriguez';
    const cedula = generateValidCedula();
    const phone = generateDominicanPhone();
    const licencia = `LIC${uuid.slice(0, 8).toUpperCase()}`;
    const placaGrua = `B${uuid.slice(0, 6).toUpperCase()}`;
    const marcaGrua = 'Chevrolet';
    const modeloGrua = 'Silverado 3500';

    await page.goto('/onboarding');
    
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
    
    await page.getByTestId('button-send-otp').click();
    await waitForToast(page, 'Código enviado');
    
    await page.getByTestId('input-otp-code').fill('123456');
    await page.getByTestId('button-verify-otp').click();
    await waitForToast(page, '¡Teléfono verificado!');
    
    await page.getByTestId('button-complete-registration').click();
    await waitForToast(page, '¡Registro completado!');
    
    await page.waitForURL('/client/**', { timeout: 10000 });
    expect(page.url()).toContain('/client');
    
    await page.goto('/onboarding?tipo=conductor');
    await page.waitForTimeout(2000);
    
    expect(page.url()).toContain('tipo=conductor');
    
    const pageContent = await page.content();
    const hasConductorContext = 
      pageContent.toLowerCase().includes('conductor') ||
      pageContent.toLowerCase().includes('licencia') ||
      pageContent.toLowerCase().includes('grúa') ||
      pageContent.toLowerCase().includes('grua');
    
    expect(hasConductorContext).toBe(true);
    
    const cedulaStep = page.getByTestId('input-cedula');
    if (await cedulaStep.isVisible().catch(() => false)) {
      await cedulaStep.fill(cedula);
      const verifyCedulaBtn = page.getByTestId('button-verify-cedula');
      if (await verifyCedulaBtn.isVisible().catch(() => false)) {
        await verifyCedulaBtn.click();
        await page.waitForTimeout(2000);
      }
    }
    
    const otpInput = page.getByTestId('input-otp-code');
    if (await otpInput.isVisible().catch(() => false)) {
      const sendOtpBtn = page.getByTestId('button-send-otp');
      if (await sendOtpBtn.isVisible().catch(() => false)) {
        await sendOtpBtn.click();
        await page.waitForTimeout(1000);
      }
      await otpInput.fill('123456');
      const verifyOtpBtn = page.getByTestId('button-verify-otp');
      if (await verifyOtpBtn.isVisible().catch(() => false)) {
        await verifyOtpBtn.click();
        await page.waitForTimeout(1000);
      }
    }
    
    let driverFieldsFound = false;
    const maxAttempts = 10;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const licenciaInput = page.getByTestId('input-licencia');
      const placaInput = page.getByTestId('input-placa-grua');
      
      if (await licenciaInput.isVisible().catch(() => false) || 
          await placaInput.isVisible().catch(() => false)) {
        driverFieldsFound = true;
        
        if (await licenciaInput.isVisible().catch(() => false)) {
          await licenciaInput.fill(licencia);
        }
        if (await placaInput.isVisible().catch(() => false)) {
          await placaInput.fill(placaGrua);
        }
        
        const marcaInput = page.getByTestId('input-marca-grua');
        const modeloInput = page.getByTestId('input-modelo-grua');
        if (await marcaInput.isVisible().catch(() => false)) {
          await marcaInput.fill(marcaGrua);
        }
        if (await modeloInput.isVisible().catch(() => false)) {
          await modeloInput.fill(modeloGrua);
        }
        break;
      }
      
      const continueBtn = page.getByTestId('button-continue');
      const nextBtn = page.locator('button:has-text("Continuar"), button:has-text("Siguiente")').first();
      
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click();
      } else if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
      }
      
      await page.waitForTimeout(1500);
    }
    
    expect(driverFieldsFound).toBe(true);
    
    const completeBtn = page.getByTestId('button-complete-registration');
    await expect(completeBtn).toBeVisible({ timeout: 10000 });
    await completeBtn.click();
    
    await page.waitForTimeout(5000);
    
    const finalUrl = page.url();
    const isDriverDashboard = finalUrl.includes('/driver');
    const isVerifyPending = finalUrl.includes('/verify-pending');
    
    expect(isDriverDashboard || isVerifyPending).toBe(true);
    expect(finalUrl).not.toMatch(/\/client(?!.*tipo)/);
  });
});
