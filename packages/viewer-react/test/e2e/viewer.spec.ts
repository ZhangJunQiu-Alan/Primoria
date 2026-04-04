import { test, expect } from '@playwright/test';

test('landing and protected route redirect work', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /掌握任何学科/i })).toBeVisible();

  await page.getByRole('link', { name: /免费开始学习/i }).click();
  await expect(page).toHaveURL(/\/register$/);

  await page.goto('/home');
  await expect(page).toHaveURL(/\/login$/);
});

test('demo learner flow reaches lesson result', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('primoria.viewer.demo-role', 'user');
  });

  await page.goto('/library');
  await page.getByRole('link', { name: /react viewer foundations/i }).click();
  await expect(page).toHaveURL(/\/course\//);

  await page.getByRole('button', { name: /start lesson/i }).first().click();
  await expect(page).toHaveURL(/\/lesson\//);

  await page.getByLabel(/react \+ typescript \+ vite/i).click();
  await page.getByRole('button', { name: /^check$/i }).click();
  await expect(page.getByText(/the gated block is now visible/i)).toBeVisible();

  await page.getByRole('button', { name: /^next$/i }).click();
  await page.getByRole('button', { name: /^complete$/i }).click();

  await expect(page).toHaveURL(/\/result$/);
  await expect(page.getByText(/result summary/i)).toBeVisible();
});

test('demo parent users normalize to the parent dashboard', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('primoria.viewer.demo-role', 'parent');
  });

  await page.goto('/home');
  await expect(page).toHaveURL(/\/parent$/);
  await expect(page.getByText(/parent dashboard/i)).toBeVisible();
});

test('demo learner can sign out from settings', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('primoria.viewer.demo-role', 'user');
  });

  await page.goto('/settings');
  await page.getByRole('button', { name: /sign out/i }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /掌握任何学科/i })).toBeVisible();
});

test('demo learner uses ai tutor tools in fixture mode', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('primoria.viewer.demo-role', 'user');
  });

  await page.goto('/ai-tutor');
  await page.getByPlaceholder(/开始输入/i).fill('Summarize my lesson notes');
  await page.getByRole('button', { name: /^发送$/i }).click();

  await expect(page.getByText(/fixture tutor reply/i)).toBeVisible();
  await page.getByRole('button', { name: /打开思维导图/i }).click();
  await expect(page.getByRole('heading', { name: /fixture mind map/i })).toBeVisible();
});

test('demo learner community changes persist across refresh', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('primoria.viewer.demo-role', 'user');
  });

  await page.goto('/community');
  await page.getByRole('button', { name: /messages/i }).click();
  await page.getByPlaceholder(/发送一条消息/i).fill('Persistent e2e message');
  await page.getByRole('button', { name: /^发送$/i }).click();
  await expect(page.getByText(/persistent e2e message/i)).toHaveCount(2);

  await page.reload();
  await page.getByRole('button', { name: /messages/i }).click();
  await expect(page.getByText(/persistent e2e message/i)).toHaveCount(2);
});
