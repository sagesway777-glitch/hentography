/**
 * Diagnostic 2: Intercept the exact login fetch response
 */
const { chromium } = require('playwright');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/Sampad Chowdhury/.gemini/antigravity-ide/brain/abb3bdc0-a24f-47ae-9816-b3d7d370d098';
const BASE_URL = 'http://localhost:3000';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Intercept ALL network requests - including fetch from JS
  page.on('request', req => {
    if (req.url().includes('localhost:3000')) {
      console.log(`→ ${req.method()} ${req.url().replace('http://localhost:3000', '')}`);
    }
  });
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('localhost:3000')) {
      let body = '';
      try { body = await res.text(); } catch {}
      const headers = res.headers();
      const setCookie = headers['set-cookie'] || '';
      console.log(`← ${res.status()} ${url.replace('http://localhost:3000', '')} ${setCookie ? '[SET-COOKIE: ' + setCookie.substring(0, 80) + ']' : ''}`);
      if (url.includes('/api/admin/login')) {
        console.log(`  LOGIN API BODY: ${body}`);
        console.log(`  LOGIN API HEADERS: ${JSON.stringify(res.headers())}`);
      }
    }
  });
  page.on('console', msg => {
    if (!msg.text().includes('DevTools') && !msg.text().includes('[HMR]') && !msg.text().includes('React DevTools') && !msg.text().includes('Clerk')) {
      console.log(`[browser ${msg.type()}] ${msg.text()}`);
    }
  });

  console.log('\n=== Navigate to /admin/login ===');
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle', timeout: 30000 });

  console.log('\n=== Fill and submit ===');
  await page.fill('input[type="email"]', 'sampadchowdhury777@gmail.com');
  await page.fill('input[type="password"]', 'wb24q0929');

  // Listen for the fetch call specifically
  const loginResponsePromise = page.waitForResponse(
    res => res.url().includes('/api/admin/login'),
    { timeout: 15000 }
  );

  await page.click('button[type="submit"]');
  console.log('  Submit clicked, waiting for /api/admin/login response...');

  try {
    const loginRes = await loginResponsePromise;
    const status = loginRes.status();
    const headers = loginRes.headers();
    let body = '';
    try { body = await loginRes.text(); } catch {}
    console.log(`\n=== LOGIN API RESULT ===`);
    console.log(`  Status: ${status}`);
    console.log(`  Set-Cookie: ${headers['set-cookie'] || 'NONE'}`);
    console.log(`  Body: ${body}`);
  } catch (e) {
    console.log(`\n  ❌ NO /api/admin/login response within 15s: ${e.message}`);
  }

  await page.waitForTimeout(3000);
  console.log(`\n  URL after submit: ${page.url()}`);

  const cookies = await context.cookies();
  console.log(`\n=== Cookies ===`);
  cookies.forEach(c => console.log(`  ${c.name}=${c.value.substring(0, 30)}... (domain=${c.domain}, httpOnly=${c.httpOnly})`));

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'diag2_result.png') });
  await browser.close();
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
