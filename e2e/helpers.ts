import { Page, expect } from '@playwright/test';

type ClientUser = {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  userType: 'cliente';
};

type DriverUser = {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  userType: 'conductor';
  licencia: string;
  placaGrua: string;
  marcaGrua: string;
  modeloGrua: string;
};

type AdminUser = {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  userType: 'admin';
};

function generateUniqueId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${timestamp}${randomPart}`;
}

export function createClientUser(): ClientUser {
  const uuid = generateUniqueId();
  return {
    email: `cliente-test-${uuid}@gruard.com`,
    password: 'TestPassword123!',
    nombre: 'Cliente',
    apellido: 'Test',
    userType: 'cliente' as const,
  };
}

export function createDriverUser(): DriverUser {
  const uuid = generateUniqueId();
  return {
    email: `conductor-test-${uuid}@gruard.com`,
    password: 'TestPassword123!',
    nombre: 'Conductor',
    apellido: 'Test',
    userType: 'conductor' as const,
    licencia: `LIC${uuid.slice(0, 6).toUpperCase()}`,
    placaGrua: `A${uuid.slice(0, 6).toUpperCase()}`,
    marcaGrua: 'Ford',
    modeloGrua: 'F-350',
  };
}

export function createAdminUser(): AdminUser {
  const uuid = generateUniqueId();
  return {
    email: `admin-test-${uuid}@gruard.com`,
    password: 'TestPassword123!',
    nombre: 'Admin',
    apellido: 'Test',
    userType: 'admin' as const,
  };
}

export async function registerUser(
  page: Page,
  userData: ClientUser | DriverUser | AdminUser
) {
  await page.goto('/');
  
  await page.getByTestId('link-register').click();
  await expect(page).toHaveURL('/register');

  await page.getByTestId('input-nombre').fill(userData.nombre);
  await page.getByTestId('input-apellido').fill(userData.apellido);
  await page.getByTestId('input-email').fill(userData.email);
  await page.getByTestId('input-password').fill(userData.password);
  
  await page.getByTestId(`select-user-type`).click();
  await page.getByTestId(`option-${userData.userType}`).click();

  if (userData.userType === 'conductor') {
    const driverData = userData as DriverUser;
    await page.getByTestId('input-licencia').fill(driverData.licencia);
    await page.getByTestId('input-placa').fill(driverData.placaGrua);
    await page.getByTestId('input-marca').fill(driverData.marcaGrua);
    await page.getByTestId('input-modelo').fill(driverData.modeloGrua);
  }

  await page.getByTestId('button-register').click();
  
  await page.waitForURL(/\/(client|driver|admin)/, { timeout: 5000 });
}

export async function loginUser(
  page: Page,
  email: string,
  password: string
) {
  await page.goto('/');
  
  if (await page.getByTestId('link-login').isVisible()) {
    await page.getByTestId('link-login').click();
  }
  
  await expect(page).toHaveURL('/login');

  await page.getByTestId('input-email').fill(email);
  await page.getByTestId('input-password').fill(password);
  await page.getByTestId('button-login').click();
  
  await page.waitForURL(/\/(client|driver|admin)/, { timeout: 5000 });
}

export async function logoutUser(page: Page) {
  await page.getByTestId('button-logout').click();
  await page.waitForURL('/login', { timeout: 5000 });
}

export async function waitForToast(page: Page, message: string) {
  const toast = page.locator(`text=${message}`);
  await expect(toast).toBeVisible({ timeout: 5000 });
}

export async function clearDatabase(page: Page) {
  await page.goto('/');
}

/**
 * Generates a valid Dominican Republic cédula using Luhn algorithm
 * Format: XXX-XXXXXXX-X (11 digits total)
 */
export function generateValidCedula(): string {
  const timestamp = Date.now().toString().slice(-7);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const first10 = random + timestamp;
  
  let sum = 0;
  let alternate = false;
  
  for (let i = first10.length - 1; i >= 0; i--) {
    let digit = parseInt(first10[i], 10);
    
    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    alternate = !alternate;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  const fullNumber = first10 + checkDigit;
  
  return `${fullNumber.slice(0, 3)}-${fullNumber.slice(3, 10)}-${fullNumber.slice(10)}`;
}

/**
 * Generates a valid Dominican Republic phone number
 */
export function generateDominicanPhone(): string {
  const areaCode = ['809', '829', '849'][Math.floor(Math.random() * 3)];
  const number = Math.floor(1000000 + Math.random() * 9000000);
  return `+1${areaCode}${number}`;
}
