/**
 * Minimal login diagnostic - tests cookie flow precisely
 */
const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/Sampad Chowdhury/.gemini/antigravity-ide/brain/abb3bdc0-a24f-47ae-9816-b3d7d370d098';
const BASE_URL = 'http://localhost:3000';

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 }); // headed so we can see
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const logs = [];
  const failures = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('response', res => {
    const s = res.status();
    const u = res.url();
    if (u.includes('localhost:3000')) {
      console.log(`  ${s} ${u}`);
    }
    if (s >= 400) failures.push(`${s} ${u}`);
  });
  page.on('request', req => {
    const u = req.url();
    if (u.includes('localhost:3000')) {
      console.log(`  → ${req.method()} ${u}`);
    }
  });

  console.log('\n=== PHASE 1: Navigate to /admin/login ===');
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle', timeout: 30000 });
  console.log(`  Current URL: ${page.url()}`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'diag_01_login_page.png') });

  console.log('\n=== PHASE 2: Fill credentials ===');
  await page.fill('input[type="email"]', 'sampadchowdhury777@gmail.com');
  await page.fill('input[type="password"]', 'wb24q0929');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'diag_02_filled.png') });
  console.log(`  Fields filled`);

  console.log('\n=== PHASE 3: Click Sign In ===');
  await page.click('button[type="submit"]');
  console.log(`  Clicked submit, waiting 5s...`);
  await page.waitForTimeout(5000);
  console.log(`  Current URL after 5s: ${page.url()}`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'diag_03_after_submit.png') });

  console.log('\n=== PHASE 4: Check cookies ===');
  const cookies = await context.cookies();
  const adminToken = cookies.find(c => c.name === 'admin_token');
  console.log(`  admin_token: ${adminToken ? 'FOUND, length=' + adminToken.value.length : 'NOT FOUND'}`);
  console.log(`  All cookies: ${cookies.map(c => c.name).join(', ')}`);

  console.log('\n=== PHASE 5: Navigate to /admin manually ===');
  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
  console.log(`  Final URL: ${page.url()}`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'diag_04_admin_page.png') });

  const bodyText = await page.$eval('body', el => el.innerText.substring(0, 500));
  console.log(`  Body text: ${bodyText}`);

  console.log('\n=== PHASE 6: Console logs ===');
  logs.forEach(l => console.log(`  ${l}`));
  console.log('\n=== PHASE 7: Network failures ===');
  failures.forEach(f => console.log(`  ${f}`));

  await browser.close();
  console.log('\nDone.');
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
