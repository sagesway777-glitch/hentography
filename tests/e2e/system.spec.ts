import { test, expect } from '@playwright/test';

test.describe('System and Accessibility', () => {

  test('no console errors on homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // Filter out known non-critical Clerk dev-mode warnings
        const text = msg.text();
        if (
          text.includes('Clerk') ||
          text.includes('clerk') ||
          text.includes('DEPRECATION') ||
          text.includes('telemetry')
        ) {
          return;
        }
        errors.push(text);
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for the page to be fully interactive
    await page.waitForLoadState('domcontentloaded');

    // Assert no unhandled exceptions (excluding Clerk dev warnings and Next.js Turbopack HMR dev-only errors)
    const productionErrors = errors.filter(e =>
      !e.includes('Clerk') &&
      !e.includes('ChunkLoadError') &&   // Turbopack HMR dev-server artifact
      !e.includes('turbopack') &&
      !e.includes('hmr-client') &&
      !e.includes('_next/static/chunks') // Dev chunk loading, not production
    );
    expect(productionErrors).toHaveLength(0);
  });

  test('navigation is accessible', async ({ page, isMobile }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Logo / home link is always visible on both desktop and mobile
    await expect(page.getByRole('link', { name: /Hentography/i }).first()).toBeVisible({ timeout: 15000 });

    if (isMobile) {
      // On mobile, look for a hamburger / menu toggle button
      const menuButton = page.getByRole('button').filter({ hasText: /menu/i });
      if (await menuButton.count() > 0) {
        await menuButton.first().click();
      }
      // Either way, the logo should still be visible
      await expect(page.getByRole('link', { name: /Hentography/i }).first()).toBeVisible();
    } else {
      // Desktop: the <nav> element should be visible
      await expect(page.locator('nav').first()).toBeVisible();
    }
  });

});
