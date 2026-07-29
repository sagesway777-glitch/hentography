import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/admin.json';

setup('authenticate as admin', async ({ request }) => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
  }

  const response = await request.post('/api/admin/login', {
    data: {
      email,
      password,
    }
  });

  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  expect(json.success).toBeTruthy();

  // Save the authenticated state (cookies, etc.) to the auth file
  await request.storageState({ path: authFile });
});
