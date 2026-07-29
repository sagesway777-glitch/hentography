import { test, expect } from '@playwright/test';

test.describe('User Auth and Features (Clerk)', () => {

  test('sign in page loads Clerk widget', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Clerk renders into a component with class cl-rootBox or cl-signIn-root
    // We wait for ANY Clerk root element to appear
    const clerkRoot = page.locator('[class*="cl-"]').first();
    await expect(clerkRoot).toBeVisible({ timeout: 20000 });
  });

  test('sign up page loads Clerk widget', async ({ page }) => {
    await page.goto('/sign-up', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const clerkRoot = page.locator('[class*="cl-"]').first();
    await expect(clerkRoot).toBeVisible({ timeout: 20000 });
  });

  test('protected dashboard redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Clerk should redirect to sign-in
    await expect(page).toHaveURL(/.*sign-in.*/, { timeout: 15000 });
  });

  test('public user API: bookmarks require auth', async ({ request }) => {
    const response = await request.get('/api/bookmarks');
    expect(response.status()).toBe(401);
  });

  test('public user API: ratings require auth', async ({ request }) => {
    const response = await request.post('/api/ratings', { data: {} });
    // Should be 400 (bad request) or 401 (unauthorized) — not 500
    expect([400, 401]).toContain(response.status());
  });

  test('public user API: comments require auth', async ({ request }) => {
    const response = await request.post('/api/comments', { data: {} });
    expect([400, 401]).toContain(response.status());
  });

  test('public user API: likes require auth', async ({ request }) => {
    const response = await request.post('/api/likes', { data: {} });
    expect([400, 401]).toContain(response.status());
  });

});
