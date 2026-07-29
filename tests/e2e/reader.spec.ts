import { test, expect } from '@playwright/test';

test.describe('Reader Features', () => {

  test('reader page loads when manga and chapter exist', async ({ request, page }) => {
    // First check if there's any published manga with a chapter via the public API
    const mangaResponse = await request.get('/api/manga?page=1&limit=1');

    if (!mangaResponse.ok()) {
      test.skip(true, 'Public manga API not reachable.');
    }

    const mangaData = await mangaResponse.json();
    const manga = mangaData?.data?.[0];

    if (!manga?.slug) {
      test.skip(true, 'No manga found in the database — seed data needed for reader tests.');
    }

    // Visit the manga detail page
    await page.goto(`/manga/${manga.slug}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await expect(page).toHaveURL(`/manga/${manga.slug}`);

    // Check for the "Read Now" or chapter link
    const readLink = page.locator('a[href*="/read/"]').first();
    if (await readLink.count() === 0) {
      test.skip(true, 'No chapters found on manga page.');
    }

    const readHref = await readLink.getAttribute('href');
    if (!readHref) {
      test.skip(true, 'Could not get read link href.');
    }

    // Navigate to the reader
    await page.goto(readHref!, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await expect(page).toHaveURL(/\/read\//);

    // Reader page should have at least one image
    await expect(page.locator('img').first()).toBeVisible({ timeout: 20000 });
  });

});
