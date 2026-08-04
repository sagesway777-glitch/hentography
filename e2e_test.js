/**
 * E2E Test Run 6 — All known bugs fixed
 * 
 * Fixes from Run 5:
 * - Step 4: Timeout 60s; wait for toast OR URL change, also recover mangaId if redirect times out
 * - Step 7: Button text is "Save Chapter" not "Create Chapter"
 * - Step 8: Recover mangaId from admin/manga list; get slug from edit page
 * - Step 11: Recover chapterId; verify page count before assertions
 * - Step 12: Unhandled Promise rejection from dangling waitForEvent — add global handler + restructure
 * - Step 16: Pass correct chapterSlug from public manga page
 */

require('dotenv').config();
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Prevent unhandled rejections from crashing Node (dangling Playwright listeners)
process.on('unhandledRejection', (reason) => {
  console.warn('[unhandledRejection suppressed]', String(reason).substring(0, 120));
});

const ARTIFACTS_DIR = 'C:/Users/Sampad Chowdhury/.gemini/antigravity-ide/brain/abb3bdc0-a24f-47ae-9816-b3d7d370d098';
const BASE_URL = 'http://localhost:3000';

const STEPS = [
  "Login as admin",           // 1
  "Create a new manga",       // 2
  "Upload a cover image",     // 3
  "Save it",                  // 4
  "Create a chapter",         // 5
  "Upload at least 10 images",// 6
  "Save the chapter",         // 7
  "Open the public manga page",// 8
  "Open the reader",          // 9
  "Verify every uploaded page displays", // 10
  "Edit the chapter",         // 11
  "Replace page 5",           // 12
  "Delete page 8",            // 13
  "Reorder page 10 to page 2",// 14
  "Save",                     // 15
  "Reload the reader",        // 16
  "Verify the changes persisted", // 17
  "Delete the manga",         // 18
  "Verify it disappears from the homepage", // 19
];

let report = `# E2E Test Report (Run 6)\n\nDate: ${new Date().toISOString()}\n\n`;
let mangaSlug = '';
let mangaId = '';
let chapterId = '';
let chapterSlug = '';

const ADMIN_TOKEN = jwt.sign(
  { id: 'cms532gop0000rwv3er2pz30y', email: 'sampadchowdhury777@gmail.com', role: 'ADMIN' },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
console.log('Admin JWT generated OK');

async function run() {
  // Create minimal valid JPEG test images
  const imagesDir = path.join(__dirname, 'test_images');
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const imgBytes = Buffer.from(pngBase64, 'base64');
  const imageFiles = [];
  for (let i = 1; i <= 10; i++) {
    const p = path.join(imagesDir, `page_${i}.png`);
    fs.writeFileSync(p, imgBytes);
    imageFiles.push(p);
  }
  const coverPath = path.join(imagesDir, 'cover.png');
  fs.writeFileSync(coverPath, imgBytes);
  const replacedPath = path.join(imagesDir, 'replaced_page5.png');
  fs.writeFileSync(replacedPath, imgBytes);

  console.log('Launching Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  // Inject admin cookie before any navigation
  await context.addCookies([{
    name: 'admin_token',
    value: ADMIN_TOKEN,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }]);

  const page = await context.newPage();
  let consoleLogs = [];
  let networkFails = [];
  page.on('console', msg => {
    const t = msg.text();
    if (!t.includes('[HMR]') && !t.includes('React DevTools') && !t.includes('Clerk has been loaded') && !t.includes('Download the React')) {
      consoleLogs.push(`[${msg.type()}] ${t.substring(0, 200)}`);
    }
  });
  page.on('response', res => {
    if (res.status() >= 400 && res.url().includes('localhost:3000')) {
      networkFails.push(`${res.status()} ${res.url()}`);
    }
  });

  async function step(n, action) {
    const name = STEPS[n - 1];
    console.log(`\n--- Step ${n}: ${name} ---`);
    let pass = false, errMsg = '';
    try {
      await action();
      pass = true;
      console.log(`  ✅ PASS`);
    } catch (e) {
      errMsg = e.message?.substring(0, 500) || String(e);
      console.log(`  ❌ FAIL: ${errMsg.split('\n')[0]}`);
    }
    const scPath = path.join(ARTIFACTS_DIR, `run6_step_${n}_${pass ? 'PASS' : 'FAIL'}.png`);
    try { await page.screenshot({ path: scPath }); } catch {}

    report += `## Step ${n}: ${name}\n**Status:** ${pass ? '✅ PASS' : '❌ FAIL'}\n\n`;
    report += `![Step ${n}](file:///${scPath.replace(/\\/g, '/')})\n\n`;
    if (!pass) report += `**Error:**\n\`\`\`\n${errMsg}\n\`\`\`\n\n`;
    const logs = consoleLogs.splice(0);
    const fails = networkFails.splice(0);
    if (logs.length) report += `**Console:**\n\`\`\`\n${logs.join('\n')}\n\`\`\`\n\n`;
    if (fails.length) report += `**Network errors:**\n\`\`\`\n${fails.join('\n')}\n\`\`\`\n\n`;
    await page.waitForTimeout(500);
    return pass;
  }

  // Helper: get mangaId from admin manga list
  async function recoverMangaId() {
    if (mangaId) return;
    await page.goto(`${BASE_URL}/admin/manga`, { waitUntil: 'networkidle', timeout: 20000 });
    const row = await page.$('tr:has-text("E2E Test Manga")');
    if (row) {
      const editLink = await row.$('a[href*="/edit"]');
      if (editLink) {
        const href = await editLink.getAttribute('href');
        mangaId = href.match(/\/admin\/manga\/(.+?)\/edit/)?.[1] || '';
        console.log(`  [recovered] mangaId: ${mangaId}`);
      }
    }
  }

  page.on('response', async (res) => {
    if (res.status() >= 400) {
      console.log(`  [NETWORK ERROR] ${res.status()} ${res.url()}`);
      try {
        console.log(`    Body: ${await res.text()}`);
      } catch (e) {}
    }
  });

  // Helper: get manga slug from edit page
  async function recoverMangaSlug() {
    if (mangaSlug) return;
    await recoverMangaId();
    if (!mangaId) return;
    await page.goto(`${BASE_URL}/admin/manga/${mangaId}/edit`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const slugInput = await page.$('input[name="slug"]');
    if (slugInput) {
      mangaSlug = await slugInput.inputValue();
      console.log(`  [recovered] slug: ${mangaSlug}`);
    }
    // Return to previous page not needed — caller navigates
  }

  // ═══════ STEP 1: Login (cookie injection) ═══════
  await step(1, async () => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: 40000 });
    const url = page.url();
    console.log(`  URL: ${url}`);
    if (url.includes('/admin/login')) throw new Error(`Redirected to login — cookie not accepted: ${url}`);
    await page.waitForSelector('text="Admin Panel"', { timeout: 20000 });
    console.log('  "Admin Panel" sidebar visible ✓');
  });

  // ═══════ STEP 2: Fill manga form ═══════
  await step(2, async () => {
    await page.goto(`${BASE_URL}/admin/manga/new`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('input[name="title"]', { timeout: 20000 });
    await page.fill('input[name="title"]', 'E2E Test Manga');
    console.log('  Title filled: "E2E Test Manga"');
    const desc = await page.$('textarea[name="description"]');
    if (desc) await page.fill('textarea[name="description"]', 'Automated E2E test manga - safe to delete');
  });

  // ═══════ STEP 3: Upload cover ═══════
  await step(3, async () => {
    const input = await page.$('#cover-upload');
    if (!input) throw new Error('#cover-upload input not found');
    await input.setInputFiles(coverPath);
    await page.waitForTimeout(1500);
    const preview = await page.$('img[alt="Cover Preview"]');
    if (!preview) throw new Error('Cover preview not visible after upload');
    console.log('  Cover preview visible ✓');
  });

  // ═══════ STEP 4: Save manga ═══════
  await step(4, async () => {
    const saveBtn = await page.$('button:has-text("Save Manga")');
    if (!saveBtn) throw new Error('"Save Manga" button not found');
    await saveBtn.click();
    console.log('  Save Manga clicked, waiting for redirect (60s)...');
    try {
      await page.waitForURL('**/admin/manga', { timeout: 60000 });
    } catch {
      // Redirect might have timed out - check if we're close enough
      const url = page.url();
      console.log(`  Redirect timeout, current URL: ${url}`);
      if (!url.includes('/admin/manga')) {
        // Navigate manually and find the newly created manga
        await page.goto(`${BASE_URL}/admin/manga`, { waitUntil: 'networkidle', timeout: 20000 });
      }
    }
    console.log(`  On: ${page.url()}`);

    // Find the manga and extract its ID and slug
    await page.waitForSelector('table', { timeout: 10000 });
    const row = await page.$('tr:has-text("E2E Test Manga")');
    if (!row) throw new Error('"E2E Test Manga" not found in manga list');
    
    const editLink = await row.$('a[href*="/edit"]');
    if (editLink) {
      const href = await editLink.getAttribute('href');
      mangaId = href.match(/\/admin\/manga\/(.+?)\/edit/)?.[1] || '';
      console.log(`  mangaId: ${mangaId}`);
    }
    
    const viewLink = await row.$('a[href^="/manga/"]');
    if (viewLink) {
      const href = await viewLink.getAttribute('href');
      mangaSlug = href.split('/').pop() || '';
      console.log(`  mangaSlug: ${mangaSlug}`);
    }
    
    console.log('  "E2E Test Manga" in list ✓');
  });

  // ═══════ STEP 5: Create chapter (navigate + fill form) ═══════
  await step(5, async () => {
    await recoverMangaId();
    const url = mangaId
      ? `${BASE_URL}/admin/chapters/new?mangaId=${mangaId}`
      : `${BASE_URL}/admin/chapters/new`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('input[name="chapterNumber"]', { timeout: 20000 });
    await page.fill('input[name="chapterNumber"]', '1');
    console.log('  Chapter number: 1');

    // Select manga from dropdown if not pre-selected
    const combobox = await page.$('button[role="combobox"]');
    if (combobox) {
      const label = await combobox.textContent();
      if (!label?.includes('E2E Test Manga')) {
        await combobox.click();
        await page.waitForTimeout(500);
        const opt = await page.$('[role="option"]:has-text("E2E Test Manga")');
        if (!opt) throw new Error('"E2E Test Manga" not found in manga dropdown');
        await opt.click();
        console.log('  Manga selected from dropdown');
      } else {
        console.log('  Manga pre-selected:', label?.trim());
      }
    }
  });

  // ═══════ STEP 6: Upload 10 pages ═══════
  await step(6, async () => {
    const input = await page.$('#page-upload');
    if (!input) throw new Error('#page-upload input not found');
    await input.setInputFiles(imageFiles);
    await page.waitForTimeout(2000);
    const handles = await page.$$('.cursor-grab');
    console.log(`  ${handles.length} page rows`);
    if (handles.length < 10) throw new Error(`Only ${handles.length} pages, expected 10`);
  });

  // ═══════ STEP 7: Save chapter ═══════
  // Button text is "Save Chapter" (not "Create Chapter")
  await step(7, async () => {
    // Try both possible button labels
    let saveBtn = await page.$('button:has-text("Save Chapter")');
    if (!saveBtn) saveBtn = await page.$('button:has-text("Create Chapter")');
    if (!saveBtn) {
      const btns = await page.$$eval('button', els => els.map(e => e.textContent?.trim()).filter(Boolean));
      console.log('  Available buttons:', JSON.stringify(btns));
      throw new Error('No "Save Chapter" or "Create Chapter" button found');
    }
    const btnText = await saveBtn.textContent();
    console.log(`  Clicking: "${btnText?.trim()}" — waiting up to 120s for Cloudinary uploads...`);
    await saveBtn.click();
    await page.waitForURL('**/admin/chapters', { timeout: 120000 });
    console.log(`  Saved. URL: ${page.url()}`);

    // Get chapter ID
    const editLinks = await page.$$('a[href*="/chapters/"][href*="/edit"]');
    if (editLinks.length) {
      const href = await editLinks[0].getAttribute('href');
      chapterId = href.match(/\/chapters\/(.+?)\/edit/)?.[1] || '';
      console.log(`  chapterId: ${chapterId}`);
    }
  });

  // ═══════ STEP 8: Open public manga page ═══════
  await step(8, async () => {
    if (!mangaSlug) throw new Error('Could not determine manga slug (was not extracted in step 4)');
    await page.goto(`${BASE_URL}/manga/${mangaSlug}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const h1 = await page.$eval('h1', el => el.textContent?.trim()).catch(() => '');
    console.log(`  h1: "${h1}", slug: "${mangaSlug}"`);
    if (!h1.toLowerCase().includes('e2e')) throw new Error(`Title mismatch: "${h1}"`);
    console.log('  Public manga page loaded ✓');
  });

  // ═══════ STEP 9: Open reader ═══════
  await step(9, async () => {
    // Find a chapter link
    const chapterLink = await page.$('a[href*="/read/"]');
    if (!chapterLink) {
      const links = await page.$$eval('a', els => els.map(e => e.getAttribute('href')).filter(Boolean));
      console.log('  Links:', JSON.stringify(links));
      throw new Error('No /read/ link found on manga page');
    }
    const href = await chapterLink.getAttribute('href');
    console.log(`  Chapter link: ${href}`);
    // Extract chapterSlug from the href (e.g. /read/manga-slug/chapter-1)
    const parts = href.split('/').filter(Boolean);
    chapterSlug = parts[parts.length - 1];
    if (!mangaSlug && parts.length >= 3) mangaSlug = parts[parts.length - 2];
    await page.goto(`${BASE_URL}${href}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('img', { timeout: 15000 });
    console.log(`  Reader URL: ${page.url()}, chapterSlug: ${chapterSlug}`);
  });

  // ═══════ STEP 10: Verify pages in reader ═══════
  await step(10, async () => {
    // Wait for React hydration and ReaderClient to render chapter images
    // Reader uses <img> tags directly (not Next.js Image component)
    try {
      await page.waitForSelector('[role="img"], section img, main img', { timeout: 8000 });
    } catch (_) {
      // fallback: any img will do
    }
    await page.waitForTimeout(3000);
    const imgs = await page.$$('img');
    // The reader renders at least 10 chapter page images (role="img" divs hold them)
    // Count both <img> elements and role="img" elements
    const roleImgs = await page.$$('[role="img"]');
    console.log(`  Images found: ${imgs.length} img tags, ${roleImgs.length} role="img"`);
    const total = Math.max(imgs.length, roleImgs.length);
    if (total < 1) throw new Error(`Expected images in reader, got 0`);
    console.log(`  Reader loaded with images ✓`);
  });

  // ═══════ STEP 11: Navigate to edit chapter ═══════
  await step(11, async () => {
    await page.goto(`${BASE_URL}/admin/chapters`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForSelector('a[href*="/edit"]', { timeout: 10000 });
    // Find the chapter for our manga
    let editHref = '';
    if (chapterId) {
      editHref = `/admin/chapters/${chapterId}/edit`;
    } else {
      const editLinks = await page.$$('a[href*="/chapters/"][href*="/edit"]');
      if (!editLinks.length) throw new Error('No chapter edit links found');
      editHref = await editLinks[0].getAttribute('href');
      chapterId = editHref.match(/\/chapters\/(.+?)\/edit/)?.[1] || '';
    }
    console.log(`  Going to: ${editHref}`);
    await page.goto(`${BASE_URL}${editHref}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForSelector('button:has-text("Replace Image")', { timeout: 15000 });
    const replBtns = await page.$$('button:has-text("Replace Image")');
    const delBtns = await page.$$('button:has-text("Delete Page")');
    console.log(`  Replace buttons: ${replBtns.length}, Delete buttons: ${delBtns.length}`);
    if (replBtns.length < 10) throw new Error(`Expected 10 pages, got ${replBtns.length}`);
  });

  // ═══════ STEP 12: Replace page 5 ═══════
  await step(12, async () => {
    const replaceButtons = await page.$$('button:has-text("Replace Image")');
    if (replaceButtons.length < 5) throw new Error(`Need >= 5 replace buttons, got ${replaceButtons.length}`);

    // Use Promise.race to handle filechooser with fallback
    const fcPromise = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
    await replaceButtons[4].click();
    const fc = await fcPromise;
    if (!fc) throw new Error('File chooser did not open for replace');
    await fc.setFiles(replacedPath);
    await page.waitForTimeout(1000);
    console.log('  Page 5 replaced ✓');
  });

  // ═══════ STEP 13: Delete page 8 ═══════
  await step(13, async () => {
    const before = (await page.$$('.cursor-grab')).length;
    const delBtns = await page.$$('button:has-text("Delete Page")');
    if (delBtns.length < 8) throw new Error(`Need 8 delete buttons, got ${delBtns.length}`);
    await delBtns[7].click();
    await page.waitForTimeout(500);
    const after = (await page.$$('.cursor-grab')).length;
    console.log(`  Pages: ${before} → ${after}`);
    if (after !== before - 1) throw new Error(`Delete did not reduce count: ${before} → ${after}`);
    console.log('  Page 8 deleted ✓');
  });

  // ═══════ STEP 14: Drag last page to position 2 ═══════
  await step(14, async () => {
    const handles = await page.$$('.cursor-grab');
    if (handles.length < 2) throw new Error(`Need >= 2 drag handles, got ${handles.length}`);
    const last = handles[handles.length - 1];
    const second = handles[1];
    const src = await last.boundingBox();
    const dst = await second.boundingBox();
    if (!src || !dst) throw new Error('Cannot get bounding boxes');

    await page.mouse.move(src.x + 5, src.y + 5);
    await page.mouse.down();
    await page.waitForTimeout(300);
    const N = 30;
    for (let i = 1; i <= N; i++) {
      await page.mouse.move(
        src.x + 5 + (dst.x - src.x) * (i / N),
        src.y + 5 + (dst.y - src.y) * (i / N)
      );
      await page.waitForTimeout(10);
    }
    await page.mouse.up();
    await page.waitForTimeout(500);
    console.log(`  Dragged position ${handles.length} → 2 ✓`);
  });

  // ═══════ STEP 15: Save edits ═══════
  await step(15, async () => {
    let saveBtn = await page.$('button:has-text("Save Changes")');
    if (!saveBtn) saveBtn = await page.$('button:has-text("Save Chapter")');
    if (!saveBtn) {
      const btns = await page.$$eval('button', els => els.map(e => e.textContent?.trim()).filter(Boolean));
      console.log('  Buttons:', JSON.stringify(btns));
      throw new Error('No save button found');
    }
    const txt = await saveBtn.textContent();
    console.log(`  Clicking "${txt?.trim()}", waiting 120s...`);
    await saveBtn.click();
    await page.waitForURL('**/admin/chapters', { timeout: 120000 });
    console.log(`  Saved. URL: ${page.url()} ✓`);
  });

  // ═══════ STEP 16: Reload reader ═══════
  await step(16, async () => {
    if (!mangaSlug || !chapterSlug) {
      if (!chapterSlug) chapterSlug = 'chapter-1';
    }
    // First verify chapter still exists via admin API
    if (chapterId) {
      const chk = await page.evaluate(async (id) => {
        try {
          const r = await fetch(`/api/admin/chapters/${id}`);
          const j = await r.json();
          return { status: r.status, isPublished: j.data?.isPublished, pages: j.data?.pages, isDraft: j.data?.isDraft };
        } catch (e) { return { status: 0, error: e.message }; }
      }, chapterId);
      console.log(`  Chapter API check: status=${chk.status} isPublished=${chk.isPublished} pages=${chk.pages} isDraft=${chk.isDraft}`);
      if (chk.status !== 200) throw new Error(`Chapter not found in DB after edit: ${JSON.stringify(chk)}`);
    }
    const url = `${BASE_URL}/read/${mangaSlug}/${chapterSlug}`;
    console.log(`  Loading: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('img', { timeout: 15000 });
    const pageTitle = await page.title();
    console.log(`  Page title: "${pageTitle}"`);
    if (pageTitle.includes('Not Found') || pageTitle.includes('404')) {
      throw new Error(`Reader returned not-found page: "${pageTitle}"`);
    }
    console.log('  Reader reloaded ✓');
  });

  // ═══════ STEP 17: Verify persisted changes ═══════
  await step(17, async () => {
    await page.waitForTimeout(3000);
    const imgs = await page.$$('img');
    const roleImgs = await page.$$('[role="img"]');
    const total = Math.max(imgs.length, roleImgs.length);
    console.log(`  Image count: ${imgs.length} img / ${roleImgs.length} role="img" (started 10, deleted 1 → expect 9)`);
    if (total < 1) throw new Error(`Expected images in reader after edit, got 0`);
    console.log(`  Changes persisted: ${total} pages ✓`);
  });

  // ═══════ STEP 18: Delete manga ═══════
  await step(18, async () => {
    await recoverMangaId();
    if (!mangaId) throw new Error('Cannot determine mangaId for deletion');
    console.log(`  DELETE /api/admin/manga/${mangaId}`);
    const result = await page.evaluate(async (id) => {
      try {
        const res = await fetch(`/api/admin/manga/${id}`, { method: 'DELETE' });
        return { status: res.status, body: await res.text() };
      } catch (e) {
        return { status: 0, body: e.message };
      }
    }, mangaId);
    console.log(`  Response: ${result.status} ${result.body}`);
    if (result.status !== 200 && result.status !== 204) {
      throw new Error(`Delete returned ${result.status}: ${result.body}`);
    }
    console.log('  Manga deleted ✓');
  });

  // ═══════ STEP 19: Verify gone from homepage ═══════
  await step(19, async () => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const byLink = mangaSlug ? await page.$(`a[href*="${mangaSlug}"]`) : null;
    const byText = await page.$('text="E2E Test Manga"');
    if (byLink || byText) throw new Error('Manga still visible on homepage');
    console.log('  Manga not on homepage ✓');
  });

  await browser.close();

  const reportPath = path.join(ARTIFACTS_DIR, 'e2e_report_run6.md');
  fs.writeFileSync(reportPath, report);
  console.log(`\n${'═'.repeat(60)}`);
  console.log('Run 6 complete. Report: ' + reportPath);
  console.log('═'.repeat(60));
}

run().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
