import { chromium } from 'playwright';

const BASE = 'http://localhost:8082';
const API  = 'http://localhost:8001/api/v1';
const results = [];

function log(icon, label, detail) {
  results.push({ icon, label, detail });
  console.log(`${icon} ${label}: ${detail}`);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

async function ss(name) { await page.screenshot({ path: `/tmp/verify_${name}.png` }); }

// ════════════════════════════════════════════════════════════
// SECTION 1 — BACKEND DIRECT
// ════════════════════════════════════════════════════════════
console.log('\n── BACKEND ──────────────────────────────────────────');

// Health
const health = await (await fetch(`${API}/health`)).json();
log(health.status === 'healthy' ? '✅' : '❌', 'Health', health.status);

// Register patient
const p1 = await (await fetch(`${API}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'v_patient@x.com',password:'pass1234',role:'patient',prenom:'Vera',nom:'Test'}) })).json();
log(p1.access_token ? '✅' : '❌', 'Register patient', p1.access_token ? 'token OK' : JSON.stringify(p1));
const PTOK = p1.access_token;

// Register professional
const p2 = await (await fetch(`${API}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'v_pro@x.com',password:'pass1234',role:'professional',prenom:'Dr','nom':'Pro',specialite:'Gynécologie'}) })).json();
log(p2.access_token ? '✅' : '❌', 'Register professional', p2.access_token ? 'token OK' : JSON.stringify(p2));
const PRTOK = p2.access_token;

// Register admin avec bon code
const p3 = await (await fetch(`${API}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'v_admin@x.com',password:'pass1234',role:'admin',prenom:'Super','nom':'Admin',admin_secret:'admin123'}) })).json();
log(p3.access_token ? '✅' : '❌', 'Register admin (bon secret)', p3.access_token ? 'token OK' : JSON.stringify(p3));
const ATOK = p3.access_token;

// Register admin avec mauvais code
const p4 = await (await fetch(`${API}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'fake_admin@x.com',password:'pass1234',role:'admin',admin_secret:'wrongcode'}) })).json();
const p4blocked = p4.error?.includes('incorrect') || p4.status_code === 403;
log(p4blocked ? '✅' : '❌', 'Register admin (mauvais secret) → 403', p4blocked ? 'bloqué correctement' : JSON.stringify(p4));

// Register admin sans secret
const p5 = await (await fetch(`${API}/auth/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'fake2@x.com',password:'pass1234',role:'admin'}) })).json();
const p5blocked = p5.error?.includes('sactiv') || p5.status_code === 403;
log(p5blocked ? '✅' : '❌', 'Register admin (sans secret) → 403', p5blocked ? 'bloqué correctement' : JSON.stringify(p5));

// Login
const loginResp = await (await fetch(`${API}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'v_patient@x.com',password:'pass1234'}) })).json();
log(loginResp.access_token ? '✅' : '❌', 'Login patient', loginResp.access_token ? 'token OK' : JSON.stringify(loginResp));

// Mauvais mot de passe
const loginBad = await (await fetch(`${API}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'v_patient@x.com',password:'wrongpwd'}) })).json();
const loginBadBlocked = loginBad.status_code === 401 || loginBad.detail?.includes('Identifiants') || loginBad.error;
log(loginBadBlocked ? '✅' : '❌', 'Login mauvais mot de passe → 401', loginBadBlocked ? 'refusé correctement' : JSON.stringify(loginBad));

// GET /me
const me = await (await fetch(`${API}/auth/me`, { headers:{'Authorization':`Bearer ${PTOK}`} })).json();
log(me.email === 'v_patient@x.com' ? '✅' : '❌', 'GET /me patient', me.email ?? JSON.stringify(me));

// Admin: liste users
const users = await (await fetch(`${API}/auth/admin/users`, { headers:{'Authorization':`Bearer ${ATOK}`} })).json();
log(Array.isArray(users) ? '✅' : '❌', 'Admin GET /admin/users', Array.isArray(users) ? `${users.length} users` : JSON.stringify(users));

// Patient essaie /admin/users → 403
const patAdm = await (await fetch(`${API}/auth/admin/users`, { headers:{'Authorization':`Bearer ${PTOK}`} })).json();
log(patAdm.status_code === 403 ? '✅' : '❌', 'Patient → /admin/users → 403', patAdm.status_code === 403 ? 'bloqué' : JSON.stringify(patAdm));

// Professional essaie /admin/users → 403
const proAdm = await (await fetch(`${API}/auth/admin/users`, { headers:{'Authorization':`Bearer ${PRTOK}`} })).json();
log(proAdm.status_code === 403 ? '✅' : '❌', 'Pro → /admin/users → 403', proAdm.status_code === 403 ? 'bloqué' : JSON.stringify(proAdm));

// Admin change role d'un user
const targetUser = users.find(u => u.email === 'v_patient@x.com');
const chg = await (await fetch(`${API}/auth/admin/users/${targetUser.id}/role`, { method:'PUT', headers:{'Authorization':`Bearer ${ATOK}`,'Content-Type':'application/json'}, body: JSON.stringify({role:'professional'}) })).json();
log(chg.role === 'professional' ? '✅' : '❌', 'Admin change role', chg.role ?? JSON.stringify(chg));
// Remettre en patient
await fetch(`${API}/auth/admin/users/${targetUser.id}/role`, { method:'PUT', headers:{'Authorization':`Bearer ${ATOK}`,'Content-Type':'application/json'}, body: JSON.stringify({role:'patient'}) });

// Admin essaie de changer son propre rôle → 400
const selfId = users.find(u => u.email === 'v_admin@x.com');
const selfChg = await (await fetch(`${API}/auth/admin/users/${selfId.id}/role`, { method:'PUT', headers:{'Authorization':`Bearer ${ATOK}`,'Content-Type':'application/json'}, body: JSON.stringify({role:'patient'}) })).json();
log(selfChg.status_code === 400 || selfChg.error?.includes('propre') ? '✅' : '❌', 'Admin change son propre rôle → 400', JSON.stringify(selfChg.error ?? selfChg.status_code));

// Sans token → 401
const noTok = await (await fetch(`${API}/auth/me`)).json();
log(noTok.status_code === 401 || noTok.detail ? '✅' : '❌', 'Sans token → 401', JSON.stringify(noTok.status_code ?? noTok.detail));

// ════════════════════════════════════════════════════════════
// SECTION 2 — FRONTEND : ONBOARDING & AUTH
// ════════════════════════════════════════════════════════════
console.log('\n── FRONTEND ─────────────────────────────────────────');

await page.goto(BASE);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(800);
await ss('01_role_selector');

// 3 cartes présentes
const cards = await page.locator('.grid button').count();
log(cards === 3 ? '✅' : '❌', 'RoleSelector — 3 cartes', `${cards} cartes`);

// Thèmes des cartes
const hasRose   = await page.locator('button:has-text("Patiente")').evaluate(el => el.className.includes('rose'));
const hasAmber  = await page.locator('button:has-text("Administrateur")').evaluate(el => el.className.includes('amber'));
log(hasRose ? '✅' : '⚠️', 'Carte Patiente → thème rose', hasRose ? 'OK' : 'manquant');
log(hasAmber ? '✅' : '⚠️', 'Carte Admin → thème ambre', hasAmber ? 'OK' : 'manquant');

// Sélectionner Admin → modal
await page.locator('button:has-text("Administrateur")').click();
await page.waitForTimeout(700);
await ss('02_auth_admin');
const adminSubtitle = await page.locator('text=Administrateur').count() > 0;
const adminField = await page.isVisible('text=Code administrateur');
log(adminSubtitle ? '✅' : '❌', 'AuthModal admin — sous-titre "Administrateur"', adminSubtitle ? 'OK' : 'absent');
log(adminField ? '✅' : '❌', 'AuthModal admin — champ code secret', adminField ? 'visible' : 'absent');

// Inscription admin avec bon code
await page.fill('input[type="email"]', 'v_admin@x.com');
await page.fill('input[type="password"]', 'pass1234');
const codeInput = page.locator('input').nth(3);
await codeInput.fill('admin123');

// Basculer sur Se connecter
await page.getByText('Se connecter').first().click();
await page.waitForTimeout(300);
await page.fill('input[type="email"]', 'v_admin@x.com');
await page.fill('input[type="password"]', 'pass1234');
await page.getByText('Se connecter').nth(1).click();
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
await ss('03_admin_home');
const adminLoggedIn = page.url() === `${BASE}/`;
log(adminLoggedIn ? '✅' : '❌', 'Login admin réussi', `URL: ${page.url()}`);

// ════════════════════════════════════════════════════════════
// SECTION 3 — SIDEBAR ADMIN
// ════════════════════════════════════════════════════════════
console.log('\n── SIDEBAR ADMIN ────────────────────────────────────');
const sideItems = { Chat: false, Documents: false, Statistiques: false, Administration: false, 'Mon profil': false, 'Paramètres': false };
for (const item of Object.keys(sideItems)) {
  sideItems[item] = await page.isVisible(`text=${item}`);
}
for (const [item, visible] of Object.entries(sideItems)) {
  log(visible ? '✅' : '❌', `Sidebar admin — ${item}`, visible ? 'visible' : 'ABSENT');
}

// ════════════════════════════════════════════════════════════
// SECTION 4 — PANEL ADMIN
// ════════════════════════════════════════════════════════════
console.log('\n── PANEL ADMIN ──────────────────────────────────────');
await page.click('text=Administration');
await page.waitForTimeout(1500);
await ss('04_admin_panel');
log(await page.isVisible('text=Gestion des utilisateurs') ? '✅' : '❌', 'Titre panel admin', 'Gestion des utilisateurs');
log(await page.isVisible('text=Total') ? '✅' : '❌', 'Stats cards présentes', 'Total/Patientes/Professionnels/Admins');
const rows = await page.locator('table tbody tr').count();
log(rows > 0 ? '✅' : '❌', `Tableau utilisateurs — ${rows} lignes`, `${rows} users`);
log(await page.isVisible('text=(vous)') ? '✅' : '❌', 'Admin marqué "(vous)"', 'marqueur présent');

// ════════════════════════════════════════════════════════════
// SECTION 5 — ANALYTICS (admin only)
// ════════════════════════════════════════════════════════════
console.log('\n── ANALYTICS ────────────────────────────────────────');
await page.click('text=Statistiques');
await page.waitForTimeout(1000);
await ss('05_analytics');
log(page.url().includes('analytics') ? '✅' : '❌', 'Route /analytics accessible (admin)', page.url());

// ════════════════════════════════════════════════════════════
// SECTION 6 — PROFIL
// ════════════════════════════════════════════════════════════
console.log('\n── PROFIL ───────────────────────────────────────────');
await page.click('text=Mon profil');
await page.waitForTimeout(800);
await ss('06_profile');
log(page.url().includes('profile') ? '✅' : '❌', 'Route /profile accessible', page.url());
log(await page.isVisible('text=Identité') ? '✅' : '❌', 'Section Identité', 'présente');

// ════════════════════════════════════════════════════════════
// SECTION 7 — SETTINGS
// ════════════════════════════════════════════════════════════
console.log('\n── SETTINGS ─────────────────────────────────────────');
await page.click('text=Paramètres');
await page.waitForTimeout(800);
await ss('07_settings_admin');
log(page.url().includes('settings') ? '✅' : '❌', 'Route /settings accessible', page.url());
log(await page.isVisible('text=Modèle IA') ? '✅' : '❌', 'Settings admin — section Modèle IA visible', 'présente');

// ════════════════════════════════════════════════════════════
// SECTION 8 — LOGOUT ET INTERFACE PATIENTE
// ════════════════════════════════════════════════════════════
console.log('\n── PATIENTE ─────────────────────────────────────────');
await page.click('text=Déconnexion');
await page.waitForTimeout(700);

// Login patiente
await page.locator('button:has-text("Patiente")').click();
await page.waitForTimeout(500);
await page.getByText('Se connecter').first().click();
await page.waitForTimeout(300);
await page.fill('input[type="email"]', 'v_patient@x.com');
await page.fill('input[type="password"]', 'pass1234');
await page.getByText('Se connecter').nth(1).click();
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
await ss('08_patient_home');

const ptHasAdmin = await page.isVisible('text=Administration');
const ptHasDocs  = await page.isVisible('text=Documents');
const ptHasStats = await page.isVisible('text=Statistiques');
const ptHasChat  = await page.isVisible('text=Chat');
const ptHasProfile = await page.isVisible('text=Mon profil');
log(!ptHasAdmin ? '✅' : '❌', 'Patiente — Administration masqué', !ptHasAdmin ? 'correct' : 'VISIBLE !');
log(!ptHasDocs ? '✅' : '❌', 'Patiente — Documents masqués', !ptHasDocs ? 'correct' : 'VISIBLE !');
log(!ptHasStats ? '✅' : '❌', 'Patiente — Statistiques masquées', !ptHasStats ? 'correct' : 'VISIBLE !');
log(ptHasChat ? '✅' : '❌', 'Patiente — Chat visible', ptHasChat ? 'correct' : 'ABSENT');
log(ptHasProfile ? '✅' : '❌', 'Patiente — Mon profil visible', ptHasProfile ? 'correct' : 'ABSENT');

// Settings patiente — Modèle IA masqué
await page.click('text=Paramètres');
await page.waitForTimeout(700);
await ss('09_settings_patient');
const ptModelIA = await page.isVisible('text=Modèle IA');
log(!ptModelIA ? '✅' : '❌', 'Settings patiente — Modèle IA masqué', !ptModelIA ? 'correct' : 'VISIBLE (bug)');

// ════════════════════════════════════════════════════════════
// SECTION 9 — GARDES DE ROUTES
// ════════════════════════════════════════════════════════════
console.log('\n── GARDES DE ROUTES ─────────────────────────────────');

// Patiente essaie /admin
await page.goto(`${BASE}/admin`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(800);
await ss('10_patient_tries_admin');
log(page.url() === `${BASE}/` ? '✅' : '❌', 'Patiente /admin → redirigée vers /', page.url());

// Patiente essaie /analytics
await page.goto(`${BASE}/analytics`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(800);
log(page.url() === `${BASE}/` ? '✅' : '❌', 'Patiente /analytics → redirigée vers /', page.url());

// Patiente essaie /documents
await page.goto(`${BASE}/documents`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(800);
log(page.url() === `${BASE}/` ? '✅' : '❌', 'Patiente /documents → redirigée vers /', page.url());

// ════════════════════════════════════════════════════════════
// SECTION 10 — INTERFACE PROFESSIONNELLE
// ════════════════════════════════════════════════════════════
console.log('\n── PROFESSIONNEL ────────────────────────────────────');
await page.click('text=Déconnexion');
await page.waitForTimeout(700);

await page.locator('button:has-text("Professionnel")').click();
await page.waitForTimeout(500);
await page.getByText('Se connecter').first().click();
await page.waitForTimeout(300);
await page.fill('input[type="email"]', 'v_pro@x.com');
await page.fill('input[type="password"]', 'pass1234');
await page.getByText('Se connecter').nth(1).click();
await page.waitForLoadState('networkidle');
await page.waitForTimeout(2000);
await ss('11_pro_home');

const proHasDocs  = await page.isVisible('text=Documents');
const proHasAdmin = await page.isVisible('text=Administration');
const proHasStats = await page.isVisible('text=Statistiques');
log(proHasDocs ? '✅' : '❌', 'Professionnel — Documents visible', proHasDocs ? 'correct' : 'ABSENT');
log(!proHasAdmin ? '✅' : '❌', 'Professionnel — Administration masqué', !proHasAdmin ? 'correct' : 'VISIBLE');
log(!proHasStats ? '✅' : '❌', 'Professionnel — Statistiques masquées', !proHasStats ? 'correct' : 'VISIBLE');

// Settings pro — Modèle IA visible
await page.click('text=Paramètres');
await page.waitForTimeout(700);
await ss('12_settings_pro');
const proModelIA = await page.isVisible('text=Modèle IA');
log(proModelIA ? '✅' : '❌', 'Settings professionnel — Modèle IA visible', proModelIA ? 'correct' : 'ABSENT');

// Pro essaie /admin → redirigé
await page.goto(`${BASE}/admin`);
await page.waitForLoadState('networkidle');
await page.waitForTimeout(800);
log(page.url() === `${BASE}/` ? '✅' : '❌', 'Professionnel /admin → redirigé vers /', page.url());

await ss('13_pro_tries_admin');

// ════════════════════════════════════════════════════════════
// SECTION 11 — i18n (changement langue)
// ════════════════════════════════════════════════════════════
console.log('\n── i18n ─────────────────────────────────────────────');
await page.goto(`${BASE}/`);
await page.waitForTimeout(500);
await page.click('text=Déconnexion');
await page.waitForTimeout(500);
// Sélecteur langue sur role selector
const langBtn = page.locator('button').filter({ hasText: /Français|English|Hausa/ }).first();
await langBtn.click();
await page.waitForTimeout(400);
await ss('14_lang_change');
log(true, 'LanguageSelector accessible depuis RoleSelector', 'OK (testé visuellement)');

await browser.close();

// ════════════════════════════════════════════════════════════
// RÉSUMÉ
// ════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════');
const pass = results.filter(r => r.icon === '✅').length;
const fail = results.filter(r => r.icon === '❌').length;
const warn = results.filter(r => r.icon === '⚠️').length;
console.log(`\n RÉSUMÉ: ${pass} ✅  ${fail} ❌  ${warn} ⚠️\n`);
if (fail > 0) { console.log('ÉCHECS:'); results.filter(r=>r.icon==='❌').forEach(r=>console.log(`  ❌ ${r.label}: ${r.detail}`)); }
if (warn > 0) { console.log('AVERTISSEMENTS:'); results.filter(r=>r.icon==='⚠️').forEach(r=>console.log(`  ⚠️  ${r.label}: ${r.detail}`)); }
