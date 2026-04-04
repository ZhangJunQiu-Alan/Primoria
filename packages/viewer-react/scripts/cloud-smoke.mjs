import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const baseUrl = process.env.VIEWER_BASE_URL?.trim() || 'http://127.0.0.1:5180';
const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const artifactDir = path.resolve('test-results', `cloud-smoke-${runId}`);

const accounts = {
  learner: {
    email: process.env.VIEWER_SMOKE_LEARNER_EMAIL || 'viewer-smoke-learner@primoria.dev',
    password: process.env.VIEWER_SMOKE_LEARNER_PASSWORD || 'PrimoriaSmoke!2026',
    displayName: 'Viewer Smoke Learner',
  },
  bindLearner: {
    email: process.env.VIEWER_SMOKE_BIND_LEARNER_EMAIL || 'viewer-smoke-bind-learner@primoria.dev',
    password: process.env.VIEWER_SMOKE_BIND_LEARNER_PASSWORD || 'PrimoriaSmoke!2026',
    displayName: 'Viewer Smoke Bind Learner',
  },
  parent: {
    email: process.env.VIEWER_SMOKE_PARENT_EMAIL || 'viewer-smoke-parent@primoria.dev',
    password: process.env.VIEWER_SMOKE_PARENT_PASSWORD || 'PrimoriaSmoke!2026',
    displayName: 'Viewer Smoke Parent',
  },
};

const learnerBio = `Cloud smoke bio ${runId}`;
const noteTitle = `Cloud smoke note ${runId}`;
const noteBody = `Persisted via cloud smoke ${runId}`;
const tutorPrompt = `Give me one concise explanation about revenue and expenses. Run ${runId}.`;

const report = {
  runId,
  baseUrl,
  startedAt: new Date().toISOString(),
  artifactDir,
  steps: [],
  verification: {},
};

function addStep(name, status, detail = '') {
  report.steps.push({
    name,
    status,
    detail,
    timestamp: new Date().toISOString(),
  });
  const suffix = detail ? `: ${detail}` : '';
  console.log(`[${status}] ${name}${suffix}`);
}

async function saveScreenshot(page, name) {
  const target = path.join(artifactDir, `${name}.png`);
  await page.screenshot({ path: target, fullPage: true });
  return target;
}

async function login(page, email, password, expectedPath) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => new URL(url).pathname === expectedPath, { timeout: 20_000 });
}

async function waitForText(page, text, timeout = 20_000) {
  await page.getByText(text, { exact: false }).waitFor({ state: 'visible', timeout });
}

async function completeLesson(page) {
  for (let index = 0; index < 12; index += 1) {
    const pathname = new URL(page.url()).pathname;
    if (pathname.includes('/result')) {
      return pathname;
    }

    const checkButton = page.getByRole('button', { name: /^check$/i });
    if (await checkButton.isVisible().catch(() => false)) {
      await checkButton.click();
      await page.waitForTimeout(250);
    }

    const completeButton = page.getByRole('button', { name: /^complete$/i }).first();
    try {
      await completeButton.waitFor({ timeout: 2_000 });
      await completeButton.click();
    } catch {
      await page.getByRole('button', { name: /^next$/i }).first().click();
    }
    await page.waitForTimeout(600);
  }

  throw new Error('Lesson runtime did not reach the result page within 12 transitions.');
}

async function writeReport() {
  report.finishedAt = new Date().toISOString();
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(path.join(artifactDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
}

function maybeAdminClient() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function verifyRemoteState(admin, lessonId) {
  if (!admin) {
    addStep('remote verification skipped', 'SKIP', 'SUPABASE_URL or SUPABASE_SECRET_KEY is missing');
    return;
  }

  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) {
    throw users.error;
  }

  const ids = {
    learner: users.data.users.find((candidate) => candidate.email?.toLowerCase() === accounts.learner.email.toLowerCase())?.id,
    bindLearner: users.data.users.find((candidate) => candidate.email?.toLowerCase() === accounts.bindLearner.email.toLowerCase())?.id,
    parent: users.data.users.find((candidate) => candidate.email?.toLowerCase() === accounts.parent.email.toLowerCase())?.id,
  };

  if (!ids.learner || !ids.bindLearner || !ids.parent) {
    throw new Error('Could not resolve smoke account ids from Supabase Auth.');
  }

  const [profileResult, noteResult, completionResult, bindingResult] = await Promise.all([
    admin.from('profiles').select('bio').eq('id', ids.learner).single(),
    admin
      .from('community_notes')
      .select('id,title,body')
      .eq('owner_id', ids.learner)
      .eq('title', noteTitle)
      .maybeSingle(),
    admin
      .from('lesson_completions')
      .select('lesson_id,score,correct_count,total_count,completed_at')
      .eq('user_id', ids.learner)
      .eq('lesson_id', lessonId)
      .maybeSingle(),
    admin
      .from('parent_child_links')
      .select('parent_id,child_id')
      .eq('parent_id', ids.parent)
      .eq('child_id', ids.bindLearner)
      .maybeSingle(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (noteResult.error) throw noteResult.error;
  if (completionResult.error) throw completionResult.error;
  if (bindingResult.error) throw bindingResult.error;

  if (profileResult.data?.bio !== learnerBio) {
    throw new Error('Remote profile verification failed: learner bio did not persist.');
  }
  if (!noteResult.data || noteResult.data.body !== noteBody) {
    throw new Error('Remote community note verification failed.');
  }
  if (!completionResult.data) {
    throw new Error('Remote lesson completion verification failed.');
  }
  if (!bindingResult.data) {
    throw new Error('Remote parent-child binding verification failed.');
  }

  report.verification = {
    lessonId,
    learnerBio,
    noteTitle,
    noteBody,
    lessonCompletion: completionResult.data,
    parentChildLink: bindingResult.data,
  };
  addStep('remote Supabase verification', 'PASS', 'profile, note, lesson completion, and parent-child link persisted');
}

const admin = maybeAdminClient();
let browser;

try {
  await fs.mkdir(artifactDir, { recursive: true });
  browser = await chromium.launch({ headless: true });

  const learnerContext = await browser.newContext();
  const learnerPage = await learnerContext.newPage();

  await login(learnerPage, accounts.learner.email, accounts.learner.password, '/home');
  addStep('learner login', 'PASS', learnerPage.url());
  await saveScreenshot(learnerPage, 'learner-home');

  await learnerPage.goto(`${baseUrl}/library`, { waitUntil: 'networkidle' });
  await waitForText(learnerPage, 'Course library');
  await learnerPage.getByRole('link', { name: /open course/i }).first().click();
  await learnerPage.waitForURL((url) => new URL(url).pathname.startsWith('/course/'), { timeout: 15_000 });
  await learnerPage.getByRole('heading', { name: /lesson list/i }).waitFor({ timeout: 15_000 });

  const enrollButton = learnerPage.getByRole('button', { name: /enroll now/i }).first();
  if (await enrollButton.isVisible().catch(() => false)) {
    await enrollButton.click();
    try {
      await learnerPage.getByRole('button', { name: /start lesson/i }).first().waitFor({ timeout: 10_000 });
    } catch {
      await learnerPage.reload({ waitUntil: 'networkidle' });
      await learnerPage.getByRole('button', { name: /start lesson/i }).first().waitFor({ timeout: 15_000 });
    }
  }
  await learnerPage.getByRole('button', { name: /start lesson/i }).first().click();
  await learnerPage.waitForURL((url) => new URL(url).pathname.startsWith('/lesson/'), { timeout: 15_000 });
  const resultPath = await completeLesson(learnerPage);
  const lessonId = resultPath.split('/')[2] || '';
  await learnerPage.waitForURL((url) => new URL(url).pathname.includes('/result'), { timeout: 20_000 });
  await waitForText(learnerPage, 'XP awarded');
  addStep('learner lesson completion', 'PASS', learnerPage.url());
  await saveScreenshot(learnerPage, 'learner-result');

  await learnerPage.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle' });
  await waitForText(learnerPage, 'Settings center');
  const bioField = learnerPage.locator('textarea').first();
  await bioField.fill(learnerBio);
  await learnerPage.getByRole('button', { name: /save changes/i }).click();
  await waitForText(learnerPage, 'Profile updated.');
  await learnerPage.reload({ waitUntil: 'networkidle' });
  await learnerPage.waitForFunction(
    (expected) => {
      const textarea = document.querySelector('textarea');
      return textarea instanceof HTMLTextAreaElement && textarea.value === expected;
    },
    learnerBio,
    { timeout: 15_000 },
  );
  addStep('learner settings persistence', 'PASS', learnerBio);
  await saveScreenshot(learnerPage, 'learner-settings');

  await learnerPage.goto(`${baseUrl}/community`, { waitUntil: 'networkidle' });
  await learnerPage.getByRole('button', { name: /^notes$/i }).click();
  await learnerPage.getByRole('button', { name: /add note/i }).click();
  await learnerPage.locator('input[value="Untitled note"]').first().fill(noteTitle);
  await learnerPage.locator('textarea').first().fill(noteBody);
  await learnerPage.getByRole('button', { name: /save note/i }).first().click();
  await waitForText(learnerPage, 'Note saved.');
  await learnerPage.reload({ waitUntil: 'networkidle' });
  await learnerPage.getByRole('button', { name: /^notes$/i }).click();
  await learnerPage.locator(`input[value="${noteTitle}"]`).waitFor({ timeout: 15_000 });
  addStep('community note persistence', 'PASS', noteTitle);
  await saveScreenshot(learnerPage, 'learner-community');

  await learnerPage.goto(`${baseUrl}/ai-tutor`, { waitUntil: 'networkidle' });
  await learnerPage.getByPlaceholder(/ask the tutor something/i).fill(tutorPrompt);
  await learnerPage.getByRole('button', { name: /^send$/i }).click();
  await learnerPage.getByText(tutorPrompt, { exact: false }).waitFor({ timeout: 15_000 });
  await learnerPage.getByRole('button', { name: /^mind map$/i }).click();
  await learnerPage.getByRole('button', { name: /^close$/i }).waitFor({ timeout: 30_000 });
  addStep('AI Tutor edge function', 'PASS', 'reply and mind map modal succeeded');
  await saveScreenshot(learnerPage, 'learner-ai-tutor');
  await learnerPage.getByRole('button', { name: /^close$/i }).click();

  await learnerPage.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle' });
  await learnerPage.getByRole('button', { name: /sign out/i }).click();
  await learnerPage.waitForURL((url) => new URL(url).pathname === '/login', { timeout: 15_000 });
  addStep('learner sign out', 'PASS');
  await learnerContext.close();

  const bindLearnerContext = await browser.newContext();
  const bindLearnerPage = await bindLearnerContext.newPage();
  await login(bindLearnerPage, accounts.bindLearner.email, accounts.bindLearner.password, '/home');
  await bindLearnerPage.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle' });
  await bindLearnerPage.getByRole('button', { name: /generate binding code/i }).click();
  const bindingStatus = bindLearnerPage.getByText(/^Code:/i);
  await bindingStatus.waitFor({ timeout: 15_000 });
  const bindingText = (await bindingStatus.textContent())?.trim() || '';
  const bindingCode = bindingText.replace(/^Code:\s*/i, '').trim();
  if (!bindingCode) {
    throw new Error('Learner binding code was not generated.');
  }
  addStep('learner binding code generation', 'PASS', bindingCode);
  await saveScreenshot(bindLearnerPage, 'bind-learner-settings');
  await bindLearnerPage.getByRole('button', { name: /sign out/i }).click();
  await bindLearnerPage.waitForURL((url) => new URL(url).pathname === '/login', { timeout: 15_000 });
  await bindLearnerContext.close();

  const parentContext = await browser.newContext();
  const parentPage = await parentContext.newPage();
  await login(parentPage, accounts.parent.email, accounts.parent.password, '/parent');
  addStep('parent login redirect', 'PASS', parentPage.url());
  await saveScreenshot(parentPage, 'parent-dashboard');

  const bindInput = parentPage.getByPlaceholder(/bind child with code/i);
  await bindInput.fill(bindingCode);
  await parentPage.getByRole('button', { name: /bind child with code/i }).click();
  await waitForText(parentPage, 'Child bound.');
  await parentPage.getByRole('button', { name: new RegExp(accounts.bindLearner.displayName, 'i') }).waitFor({ timeout: 15_000 });
  await parentPage.getByRole('button', { name: new RegExp(accounts.learner.displayName, 'i') }).click();
  await waitForText(parentPage, 'Selected child report');
  addStep('parent bind child flow', 'PASS', accounts.bindLearner.displayName);
  await saveScreenshot(parentPage, 'parent-bound-child');
  await parentContext.close();

  await verifyRemoteState(admin, lessonId);
  await writeReport();
  console.log(`Cloud smoke passed. Report saved to ${path.join(artifactDir, 'report.json')}`);
} catch (error) {
  addStep('cloud smoke failed', 'FAIL', error instanceof Error ? error.message : String(error));
  await writeReport();
  console.error(error);
  process.exitCode = 1;
} finally {
  if (browser) {
    await browser.close();
  }
}
