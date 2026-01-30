import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5000';
const OUTPUT_DIR = './screenshots';

const ACCOUNTS = {
  client: { email: 'googleplay.cliente@gruard.test', password: 'Test123456!' },
  driver: { email: 'googleplay.conductor@gruard.test', password: 'Test123456!' },
};

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  
  // Mobile viewport (similar to phone)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro size
    deviceScaleFactor: 3,
  });
  
  const page = await context.newPage();
  
  console.log('📱 Capturing screenshots...\n');

  // 1. Login screen
  console.log('1. Capturing login screen...');
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUTPUT_DIR}/01-login.png`, fullPage: false });
  console.log('   ✓ Login captured\n');

  // 2. Client dashboard (map) - login as client
  console.log('2. Logging in as client...');
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Wait for React to render
  
  // Wait for email input to be visible
  try {
    await page.waitForSelector('[data-testid="input-email"]', { timeout: 10000 });
    await page.fill('[data-testid="input-email"]', ACCOUNTS.client.email);
    await page.fill('[data-testid="input-password"]', ACCOUNTS.client.password);
    await page.click('[data-testid="button-login"]');
    await page.waitForTimeout(4000);
    await page.waitForLoadState('networkidle');
    console.log('   Login successful');
  } catch (e) {
    console.log('   Could not find login form, continuing...');
  }
  
  // Navigate to client dashboard
  await page.goto(`${BASE_URL}/client`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUTPUT_DIR}/02-client-map.png`, fullPage: false });
  console.log('   ✓ Client map captured\n');

  // Clear cookies and storage for new login
  await context.clearCookies();
  
  // 3. Driver dashboard
  console.log('3. Logging in as driver...');
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  try {
    await page.waitForSelector('[data-testid="input-email"]', { timeout: 10000 });
    await page.fill('[data-testid="input-email"]', ACCOUNTS.driver.email);
    await page.fill('[data-testid="input-password"]', ACCOUNTS.driver.password);
    await page.click('[data-testid="button-login"]');
    await page.waitForTimeout(4000);
    await page.waitForLoadState('networkidle');
    console.log('   Login successful');
  } catch (e) {
    console.log('   Could not find login form, continuing...');
  }
  
  await page.goto(`${BASE_URL}/driver`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUTPUT_DIR}/03-driver-dashboard.png`, fullPage: false });
  console.log('   ✓ Driver dashboard captured\n');

  // 4. Admin panel
  console.log('4. Capturing admin panel...');
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUTPUT_DIR}/04-admin-panel.png`, fullPage: false });
  console.log('   ✓ Admin panel captured\n');

  await browser.close();
  
  console.log('✅ All screenshots saved to ./screenshots/');
  console.log('\nFiles:');
  console.log('  - 01-login.png');
  console.log('  - 02-client-map.png');
  console.log('  - 03-driver-dashboard.png');
  console.log('  - 04-admin-panel.png');
}

captureScreenshots().catch(console.error);
