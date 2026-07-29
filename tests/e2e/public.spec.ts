import { test, expect } from '@playwright/test';

test.describe('Public Pages and Reader', () => {

  test('homepage loads and displays content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await expect(page).toHaveTitle(/Hentography/, { timeout: 10000 });

    // Check something universally visible regardless of viewport — the logo link
    await expect(page.getByRole('link', { name: /Hentography/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('search functionality', async ({ page }) => {
    // Go directly to the search page which has its own dedicated search input
    await page.goto('/search', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // The search page has a specific input (not in the hidden nav bar)
    const searchInput = page.locator('input[name="q"]');
    await expect(searchInput).toBeVisible({ timeout: 20000 });

    // Perform a search via form submission
    await searchInput.fill('test');
    await page.keyboard.press('Enter');

    // Wait for the URL to update with the query parameter
    await expect(page).toHaveURL(/[?&]q=test/, { timeout: 15000 });
  });

  test('SEO: robots.txt is served', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    // Next.js generates "User-Agent" (capital A) — use case-insensitive check
    expect(body.toLowerCase()).toContain('user-agent');
  });

  test('SEO: sitemap.xml is served', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    expect(body).toContain('<?xml');
  });

  test('route protection - admin redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Should redirect to the admin login page
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 15000 });
  });

});
