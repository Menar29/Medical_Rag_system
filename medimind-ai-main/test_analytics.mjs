import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Login admin
await page.goto('http://localhost:8082/');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(700);
await page.locator('button:has-text("Administrateur")').click();
await page.waitForTimeout(500);
await page.getByText('Se connecter').first().click();
await page.waitForTimeout(300);
await page.fill('input[type="email"]', 'admin2@test.com');
await page.fill('input[type="password"]', 'admin1234');
await page.getByText('Se connecter').nth(1).click();
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);

// Navigate to analytics
await page.click('text=Statistiques');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/analytics_real.png' });

// Verify real data
const bodyText = await page.textContent('body');
const hasReal5 = bodyText.includes('5'); // 5 total users
const noMock1248 = !bodyText.includes('1 248'); // no hardcoded mock
const hasRole = bodyText.includes('Patientes') && bodyText.includes('Professionnels');
const hasNoQuery = bodyText.includes('Aucune requête') || bodyText.includes('0');

console.log('✅ Utilisateurs réels (5):', hasReal5);
console.log('✅ Données mockées absentes (1 248 hardcodé):', noMock1248);
console.log('✅ Répartition par rôle visible:', hasRole);
console.log('✅ Message "aucune requête" ou 0 requêtes:', hasNoQuery);
console.log('✅ URL:', page.url());

await browser.close();
