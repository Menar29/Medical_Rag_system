import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

async function ss(name) { await page.screenshot({ path: `/tmp/${name}.png` }); }

// ── 1. RoleSelector ───────────────────────────────────────────────────────────
await page.goto('http://localhost:8082/');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(800);
await ss('role_selector');

// ── 2. Click admin card ───────────────────────────────────────────────────────
await page.getByText('Administrateur').first().click();
await page.waitForTimeout(800);
await ss('auth_modal_admin');

// ── 3. Switch to "Se connecter" tab ──────────────────────────────────────────
await page.getByText('Se connecter').first().click();
await page.waitForTimeout(400);
await page.fill('input[type="email"]', 'admin2@test.com');
await page.fill('input[type="password"]', 'admin1234');
await page.getByText('Se connecter', { exact: false }).nth(1).click(); // submit button
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
await ss('admin_home');
console.log('Admin connecté — URL:', page.url());

// ── 4. Sidebar contient Administration ───────────────────────────────────────
const hasAdminNav = await page.isVisible('text=Administration');
console.log('Sidebar admin — lien Administration:', hasAdminNav);
await ss('admin_sidebar');

// ── 5. /admin panel ───────────────────────────────────────────────────────────
await page.click('text=Administration');
await page.waitForTimeout(1200);
await ss('admin_panel');
const usersTitle = await page.isVisible('text=Gestion des utilisateurs') || await page.isVisible('text=User management');
console.log('Panel admin — titre affiché:', usersTitle);

// ── 6. Déconnexion ────────────────────────────────────────────────────────────
await page.click('text=Déconnexion');
await page.waitForTimeout(800);

// ── 7. Patiente login ─────────────────────────────────────────────────────────
await page.getByText('Patiente').first().click();
await page.waitForTimeout(600);
await page.getByText('Se connecter').first().click();
await page.waitForTimeout(300);
await page.fill('input[type="email"]', 'patient@test.com');
await page.fill('input[type="password"]', 'test1234');
await page.getByText('Se connecter', { exact: false }).nth(1).click();
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
await ss('patient_home');

const patientHasDocuments = await page.isVisible('text=Documents');
const patientHasAdmin = await page.isVisible('text=Administration');
console.log('Patiente — Documents masqués:', !patientHasDocuments, '| Admin masqué:', !patientHasAdmin);

// ── 8. Patient essaie /admin → doit être redirigé ────────────────────────────
await page.goto('http://localhost:8082/admin');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(800);
await ss('patient_tries_admin');
console.log('Patiente redirigée depuis /admin:', page.url().endsWith('/'));

await browser.close();
console.log('\n✓ Tests terminés');
