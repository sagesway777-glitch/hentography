const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const ADMIN_TOKEN = jwt.sign(
  { id: 'cms532gop0000rwv3er2pz30y', email: 'sampadchowdhury777@gmail.com', role: 'ADMIN' },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
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
  
  page.on('response', async res => {
    if (res.url().includes('cloudinary.com')) {
      console.log('CLOUDINARY:', res.status());
      console.log('CLOUDINARY BODY:', await res.text().catch(() => ''));
    }
  });

  await page.goto('http://localhost:3000/admin/manga/new');
  await page.fill('input[name="title"]', 'Test Manga 999');
  
  const fs = require('fs');
  const path = require('path');
  const coverPath = path.join(__dirname, 'test_images', 'cover.png');
  const input = await page.$('#cover-upload');
  await input.setInputFiles(coverPath);
  
  await page.waitForTimeout(1000);
  
  console.log('Clicking Save...');
  await page.click('button:has-text("Save Manga")');
  
  await page.waitForTimeout(5000); 
  await browser.close();
}
run();
