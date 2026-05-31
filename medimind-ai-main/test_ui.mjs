import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// 1 — RoleSelector
await page.goto('http://localhost:8082/');
await page.waitForLoadState('networkidle');
await page.screenshot({ path: '/tmp/1_role_selector.png' });
console.log('1. RoleSelector:', await page.title());

// 2 — Click "Administrateur"
const adminCard = page.getByText('Administrateur').first();
await adminCard.click();
await page.waitForLoadState('networkidle');
await page.screenshot({ path: '/tmp/2_auth_modal_admin.png' });
console.log('2. AuthModal admin visible:', await page.isVisible('text=Code administrateur') || await page.isVisible('text=Administrator code'));

// 3 — Register as admin
await page.fill('input[type="email"]', 'admintest@ui.com');
await page.fill('input[type="password"]', 'admin1234');

// Fill optional fields if visible
const prenomInput = page.locator('input[placeholder*="Amina"], input[placeholder*="Aminou"]').first();
if (await prenomInput.isVisible()) await prenomInput.fill('Test');

const adminSecretInput = page.locator('input[placeholder*="secret"], input[placeholder*="Secret"], input[placeholder*="code"]').last();
if (await adminSecretInput.isVisible()) await adminSecretInput.fill('admin123');

await page.screenshot({ path: '/tmp/3_form_filled.png' });

// Switch to login tab (admin already registered)
const loginTab = page.getByRole('tab', { name: /connexion|login|se connecter/i }).or(page.getByText(/connexion|login/i).first());
if (await loginTab.isVisible()) {
  await loginTab.click();
  await page.waitForTimeout(500);
  await page.fill('input[type="email"]', 'admin2@test.com');
  await page.fill('input[type="password"]', 'admin1234');
  const submitBtn = page.getByRole('button', { name: /connexion|login|se connecter/i }).first();
  await submitBtn.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

await page.screenshot({ path: '/tmp/4_after_login.png' });
console.log('4. URL after login:', page.url());

await browser.close();
