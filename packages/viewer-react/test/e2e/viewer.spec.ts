import { test, expect } from '@playwright/test';

test('landing and protected route redirect work', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /从创作到学习|From course creation to active learning/i }),
  ).toBeVisible();

  await page.getByTestId('landing-hero-primary-cta').click();
  await expect(page).toHaveURL(/\/register$/);

  await page.goto('/');
  await page.getByTestId('landing-header-login').click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/home');
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fhome$/);
});

test('demo learner flow reaches lesson result', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('primoria.viewer.demo-role', 'user');
  });

  await page.goto('/library');
  await page.getByRole('link', { name: /react viewer foundations/i }).click();
  await expect(page).toHaveURL(/\/course\//);

  await page.getByRole('button', { name: /start lesson|开始本课/i }).first().click();
  await expect(page).toHaveURL(/\/lesson\//);

  await page.getByLabel(/react \+ typescript \+ vite/i).click();
  await page.getByRole('button', { name: /^next step$|^下一步$/i }).click();
  await expect(page.getByText(/the gated block is now visible/i)).toBeVisible();

  await page.getByRole('button', { name: /^next step$|^下一步$/i }).click();
  await page.getByRole('checkbox', { name: /^home$/i }).click();
  await page.getByRole('checkbox', { name: /^library$/i }).click();
  await page.getByRole('button', { name: /^next step$|^下一步$/i }).click();
  await page.getByRole('button', { name: /^next step$|^下一步$/i }).click();
  await page.getByRole('textbox').fill('web');
  await page.getByRole('button', { name: /^next step$|^下一步$/i }).click();
  await page.getByRole('button', { name: /^next step$|^下一步$/i }).click();
  await page.getByRole('combobox').nth(0).selectOption({ label: 'Progress' });
  await page.getByRole('combobox').nth(1).selectOption({ label: 'Catalog' });
  await page.getByRole('button', { name: /^next step$|^下一步$/i }).click();
  await page.getByRole('button', { name: /^complete$|^完成$/i }).click();

  await expect(page).toHaveURL(/\/result$/);
  await expect(page.getByText(/result summary|结果总结/i)).toBeVisible();
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
  await page.getByRole('button', { name: /支持与关于|support & about/i }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /退出当前账号|sign out/i }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { name: /从创作到学习|From course creation to active learning/i }),
  ).toBeVisible();
});

test('demo learner uses ai tutor tools in fixture mode', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('primoria.viewer.demo-role', 'user');
  });

  await page.goto('/ai-tutor');
  await page.getByPlaceholder(/开始输入|Start typing/i).fill('Summarize my lesson notes');
  await page.getByRole('button', { name: /^发送$|^Send$/i }).click();

  await expect(page.getByText(/fixture tutor reply/i)).toBeVisible();
  await page.getByRole('button', { name: /生成思维导图|Generate mind map/i }).click();
  await expect(page.getByRole('heading', { name: /fixture mind map/i })).toBeVisible();
});

test('demo learner community changes persist across refresh', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('primoria.viewer.demo-role', 'user');
  });

  await page.goto('/community');
  await page.getByRole('button', { name: /messages/i }).click();
  await page.getByPlaceholder(/发送一条消息/i).fill('Persistent e2e message');
  await page.getByRole('button', { name: /^发送$|^Send$/i }).click();
  await expect(page.getByText(/persistent e2e message/i)).toHaveCount(2);

  await page.reload();
  await page.getByRole('button', { name: /messages/i }).click();
  await expect(page.getByText(/persistent e2e message/i)).toHaveCount(2);
});
