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
  author: {
    email: process.env.VIEWER_SMOKE_AUTHOR_EMAIL || 'viewer-smoke-author@primoria.dev',
    password: process.env.VIEWER_SMOKE_AUTHOR_PASSWORD || 'PrimoriaSmoke!2026',
    displayName: process.env.VIEWER_SMOKE_AUTHOR_DISPLAY_NAME || 'Viewer Smoke Author',
  },
};

const learnerBio = `Cloud smoke bio ${runId}`;
const noteTitle = `Cloud smoke note ${runId}`;
const noteBody = `Persisted via cloud smoke ${runId}`;
const tutorPrompt = `Give me one concise explanation about revenue and expenses. Run ${runId}.`;
const smokeCourseTitle = 'Primoria Viewer Publish Smoke Course';
const smokeCourseDescription = 'Reserved course for cloud smoke publish and viewer readback verification.';
const smokeLessonTitle = `Cloud smoke lesson ${runId}`;
const preferredRegressionCourseTitle = 'Python Basics';

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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function login(page, email, password, expectedPath, options = {}) {
  const loginUrl = new URL(`${baseUrl}/login`);
  if (options.returnTo) {
    loginUrl.searchParams.set('returnTo', options.returnTo);
  }

  await page.goto(loginUrl.toString(), { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => new URL(url).pathname === expectedPath, { timeout: 20_000 });
}

async function waitForText(page, matcher, timeout = 20_000) {
  await page.getByText(matcher, { exact: false }).waitFor({ state: 'visible', timeout });
}

function parseMetricValue(rawValue) {
  const numeric = Number(rawValue.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(numeric)) {
    throw new Error(`Could not parse metric value from "${rawValue}".`);
  }
  return numeric;
}

async function readMetricCardValue(page, label) {
  const card = page
    .locator('article.studio-metric-card')
    .filter({ has: page.getByText(label, { exact: true }) })
    .first();
  await card.waitFor({ state: 'visible', timeout: 15_000 });
  const valueText = (await card.locator('strong').first().textContent())?.trim() || '';
  return parseMetricValue(valueText);
}

async function waitForPositiveMetricCardValue(page, label) {
  let lastValue = 0;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (attempt > 0) {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1_000);
    }

    try {
      const value = await readMetricCardValue(page, label);
      lastValue = value;
      if (value > 0) {
        return value;
      }
    } catch {
      // Continue retry loop until analytics data becomes available or attempts are exhausted.
    }
  }

  throw new Error(`Dashboard metric "${label}" did not become positive. Last value: ${lastValue}`);
}

async function waitForTopCourseAnalytics(page) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (attempt > 0) {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1_000);
    }

    const topCourse = page.locator('.studio-top-course').first();
    if (!(await topCourse.count())) {
      continue;
    }

    await topCourse.waitFor({ state: 'visible', timeout: 15_000 });
    const title = (await topCourse.locator('.studio-top-course__copy strong').first().textContent())?.trim() || '';
    const stats = (await topCourse.locator('.studio-top-course__copy p').first().textContent())?.trim() || '';
    const match = stats.match(/Views:\s*(\d+)/i);

    if (title && match && Number(match[1]) > 0) {
      return {
        title,
        views: Number(match[1]),
      };
    }
  }

  throw new Error('Top course analytics did not surface any positive view counts on the author dashboard.');
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

async function signOutFromAccountMenu(page, expectedPath = '/login') {
  await page.getByLabel(/open account menu/i).click();
  await page.getByRole('menuitem', { name: /sign out/i }).click();
  await page.waitForURL((url) => new URL(url).pathname === expectedPath, { timeout: 15_000 });
}

async function signOutFromSettings(page, expectedPath = '/') {
  await page.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle' });
  await waitForText(page, /设置中心|settings center/i);
  await page.getByRole('button', { name: /支持与关于|support & about/i }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /退出登录|sign out/i }).click();
  await page.waitForURL((url) => new URL(url).pathname === expectedPath, { timeout: 15_000 });
}

async function openSmokeCourseEditor(page) {
  await page.goto(`${baseUrl}/builder/dashboard?tab=course`, { waitUntil: 'networkidle' });

  const searchInput = page.getByPlaceholder(/search courses, descriptions, or lesson titles/i);
  await searchInput.waitFor({ timeout: 15_000 });
  await searchInput.fill(smokeCourseTitle);
  await page.waitForTimeout(600);

  const courseCard = page
    .locator('article.studio-course-card')
    .filter({ has: page.getByRole('heading', { name: smokeCourseTitle, exact: true }) })
    .first();

  if (await courseCard.count()) {
    await courseCard.getByRole('button', { name: /open editor/i }).click();
  } else {
    await page.getByRole('button', { name: /^create course$/i }).first().click();
    const dialog = page.locator('.dashboard-dialog').last();
    await dialog.getByLabel(/course title/i).fill(smokeCourseTitle);
    await dialog.getByLabel(/course description/i).fill(smokeCourseDescription);
    await dialog.getByRole('button', { name: /^create course$/i }).click();
  }

  await page.waitForURL((url) => new URL(url).pathname.startsWith('/builder/editor/'), { timeout: 20_000 });
  return new URL(page.url()).pathname.split('/').at(-1) || '';
}

async function renameAndPublishSmokeCourse(page) {
  const lessonEditButton = page.getByLabel(/^Edit lesson /).first();
  await lessonEditButton.waitFor({ timeout: 15_000 });
  await lessonEditButton.click();

  const lessonTitleInput = page.getByLabel(/^Lesson title for /).first();
  await lessonTitleInput.fill(smokeLessonTitle);
  await lessonTitleInput.press('Enter');
  await page.getByText(smokeLessonTitle, { exact: true }).first().waitFor({ timeout: 15_000 });

  await page.getByRole('button', { name: /^save$/i }).click();
  await page.waitForFunction(() => {
    const element = document.querySelector('.editor-toolbar-status');
    return Boolean(element?.textContent?.includes('Saved'));
  }, { timeout: 20_000 });

  await page.getByRole('button', { name: /^publish$/i }).click();
  await page.getByText(/published/i, { exact: false }).waitFor({ state: 'visible', timeout: 20_000 });
}

async function verifyPublishedCourseInViewer(page) {
  await page.goto(`${baseUrl}/library`, { waitUntil: 'networkidle' });

  const searchInput = page.getByPlaceholder(/搜索课程|search/i);
  await searchInput.waitFor({ timeout: 15_000 });
  await searchInput.fill(smokeCourseTitle);

  const courseLink = page.getByRole('link', {
    name: new RegExp(escapeRegExp(smokeCourseTitle), 'i'),
  }).first();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await courseLink.count()) {
      break;
    }
    await page.waitForTimeout(1_000);
    await page.reload({ waitUntil: 'networkidle' });
    await searchInput.fill(smokeCourseTitle);
  }

  await courseLink.waitFor({ timeout: 20_000 });
  await courseLink.click();
  await page.waitForURL((url) => new URL(url).pathname.startsWith('/course/'), { timeout: 15_000 });
  await page.getByRole('heading', { name: smokeCourseTitle, exact: true }).waitFor({ timeout: 15_000 });
  await waitForText(page, smokeLessonTitle);
}

async function verifyAuthorDashboardAnalytics(page) {
  await login(page, accounts.author.email, accounts.author.password, '/builder/dashboard', {
    returnTo: '/builder/dashboard',
  });

  await page.goto(`${baseUrl}/builder/dashboard`, { waitUntil: 'networkidle' });
  await waitForText(page, /weekly learners/i);
  const weeklyLearners = await waitForPositiveMetricCardValue(page, 'Weekly learners');
  const topCourse = await waitForTopCourseAnalytics(page);
  await saveScreenshot(page, 'author-dashboard-home-analytics');

  await page.goto(`${baseUrl}/builder/dashboard?tab=data`, { waitUntil: 'networkidle' });
  await waitForText(page, /published viewers/i);
  const publishedViewers = await waitForPositiveMetricCardValue(page, 'Published viewers');

  const rankingRow = page.locator('.studio-data-list__row').first();
  await rankingRow.waitFor({ state: 'visible', timeout: 15_000 });
  const publishedCourseTitle = (await rankingRow.locator('span').first().textContent())?.trim() || '';
  await saveScreenshot(page, 'author-dashboard-data-analytics');

  addStep(
    'author dashboard analytics',
    'PASS',
    `weekly learners ${weeklyLearners}, published viewers ${publishedViewers}, top course ${topCourse.title}`,
  );

  return {
    weeklyLearners,
    publishedViewers,
    topCourseTitle: topCourse.title,
    topCourseViews: topCourse.views,
    publishedCourseTitle,
  };
}

async function openCompletableCourse(page) {
  await page.goto(`${baseUrl}/library`, { waitUntil: 'networkidle' });
  const searchInput = page.getByPlaceholder(/搜索课程|search/i);
  await searchInput.waitFor({ timeout: 15_000 });
  await searchInput.fill(preferredRegressionCourseTitle);

  const preferredLink = page.getByRole('link', {
    name: new RegExp(escapeRegExp(preferredRegressionCourseTitle), 'i'),
  }).first();

  if (await preferredLink.count()) {
    await preferredLink.click();
    await page.waitForURL((url) => new URL(url).pathname.startsWith('/course/'), { timeout: 15_000 });
    await page.getByRole('heading', { name: /lesson list/i }).waitFor({ timeout: 15_000 });
    return preferredRegressionCourseTitle;
  }

  await searchInput.clear();
  await page.waitForTimeout(750);

  const candidates = await page.locator('a[href^="/course/"]').evaluateAll((nodes) =>
    nodes
      .map((node) => ({
        href: node.getAttribute('href') || '',
        text: (node.textContent || '').trim(),
      }))
      .filter((entry) => entry.href),
  );

  const seen = new Set();
  for (const candidate of candidates) {
    const title = candidate.text.replace(/\s+/g, ' ').trim();
    if (!title || title.includes(smokeCourseTitle) || seen.has(candidate.href)) {
      continue;
    }
    seen.add(candidate.href);

    await page.goto(`${baseUrl}${candidate.href}`, { waitUntil: 'networkidle' });
    const hasLessonList = await page
      .getByRole('heading', { name: /lesson list/i })
      .isVisible()
      .catch(() => false);
    const hasStartLesson = await page
      .getByRole('button', { name: /start lesson/i })
      .first()
      .isVisible()
      .catch(() => false);
    const hasEnrollNow = await page
      .getByRole('button', { name: /enroll now/i })
      .first()
      .isVisible()
      .catch(() => false);

    if (hasLessonList && (hasStartLesson || hasEnrollNow)) {
      return title;
    }
  }

  throw new Error('Could not find a non-smoke published course with a learner-startable lesson.');
}

async function readBindingCode(page) {
  const codeLocator = page.locator('.font-mono').first();
  await codeLocator.waitFor({ timeout: 15_000 });
  const bindingCode = (await codeLocator.textContent())?.trim() || '';
  if (!bindingCode) {
    throw new Error('Learner binding code was not generated.');
  }
  return bindingCode;
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

async function verifyRemoteState(admin, verificationInput) {
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

  const [
    profileResult,
    noteResult,
    completionResult,
    bindingResult,
    courseResult,
    lessonResult,
    courseViewEventResult,
    lessonStartEventResult,
  ] = await Promise.all([
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
      .eq('lesson_id', verificationInput.completedLessonId)
      .maybeSingle(),
    admin
      .from('parent_child_links')
      .select('parent_id,child_id')
      .eq('parent_id', ids.parent)
      .eq('child_id', ids.bindLearner)
      .maybeSingle(),
    admin
      .from('courses')
      .select('id,status,published_at')
      .eq('id', verificationInput.smokeCourseId)
      .maybeSingle(),
    admin
      .from('lessons')
      .select('id,title')
      .eq('course_id', verificationInput.smokeCourseId)
      .order('sort_key')
      .limit(1)
      .maybeSingle(),
    admin
      .from('viewer_analytics_events')
      .select('id,event_type,course_id,lesson_id,occurred_at')
      .eq('actor_id', ids.learner)
      .eq('course_id', verificationInput.smokeCourseId)
      .eq('event_type', 'course_view')
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('viewer_analytics_events')
      .select('id,event_type,course_id,lesson_id,occurred_at')
      .eq('actor_id', ids.learner)
      .eq('lesson_id', verificationInput.completedLessonId)
      .eq('event_type', 'lesson_started')
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (noteResult.error) throw noteResult.error;
  if (completionResult.error) throw completionResult.error;
  if (bindingResult.error) throw bindingResult.error;
  if (courseResult.error) throw courseResult.error;
  if (lessonResult.error) throw lessonResult.error;
  if (courseViewEventResult.error) throw courseViewEventResult.error;
  if (lessonStartEventResult.error) throw lessonStartEventResult.error;

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
  if (!courseResult.data || courseResult.data.status !== 'published') {
    throw new Error('Remote publish verification failed: smoke course is not published.');
  }
  if (!lessonResult.data || lessonResult.data.title !== verificationInput.smokeLessonTitle) {
    throw new Error('Remote publish verification failed: smoke lesson title did not persist.');
  }
  if (!courseViewEventResult.data) {
    throw new Error('Remote analytics verification failed: smoke course view event was not recorded.');
  }
  if (!lessonStartEventResult.data) {
    throw new Error('Remote analytics verification failed: lesson_started event was not recorded.');
  }

  report.verification = {
    completedLessonId: verificationInput.completedLessonId,
    learnerBio,
    noteTitle,
    noteBody,
    smokeCourseId: verificationInput.smokeCourseId,
    smokeLessonTitle: verificationInput.smokeLessonTitle,
    lessonCompletion: completionResult.data,
    parentChildLink: bindingResult.data,
    smokeCourse: courseResult.data,
    smokeLesson: lessonResult.data,
    smokeCourseViewEvent: courseViewEventResult.data,
    completedLessonStartEvent: lessonStartEventResult.data,
    authorDashboardAnalytics: verificationInput.authorDashboardAnalytics,
  };
  addStep(
    'remote Supabase verification',
    'PASS',
    'profile, note, lesson completion, parent-child link, publish state, and analytics events persisted',
  );
}

const admin = maybeAdminClient();
let browser;

try {
  await fs.mkdir(artifactDir, { recursive: true });
  browser = await chromium.launch({ headless: true });

  const authorContext = await browser.newContext();
  const authorPage = await authorContext.newPage();
  await login(authorPage, accounts.author.email, accounts.author.password, '/builder/dashboard', {
    returnTo: '/builder/dashboard?tab=course',
  });
  addStep('author login', 'PASS', authorPage.url());

  const smokeCourseId = await openSmokeCourseEditor(authorPage);
  await renameAndPublishSmokeCourse(authorPage);
  addStep('author publish smoke course', 'PASS', `${smokeCourseTitle} -> ${smokeLessonTitle}`);
  await saveScreenshot(authorPage, 'author-editor-published');
  await signOutFromAccountMenu(authorPage);
  await authorContext.close();

  const learnerContext = await browser.newContext();
  const learnerPage = await learnerContext.newPage();

  await login(learnerPage, accounts.learner.email, accounts.learner.password, '/home');
  addStep('learner login', 'PASS', learnerPage.url());
  await saveScreenshot(learnerPage, 'learner-home');

  await verifyPublishedCourseInViewer(learnerPage);
  addStep('author publish -> viewer consistency', 'PASS', smokeLessonTitle);
  await saveScreenshot(learnerPage, 'learner-published-course');

  const regressionCourseTitle = await openCompletableCourse(learnerPage);

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
  const completedLessonId = resultPath.split('/')[2] || '';
  await learnerPage.waitForURL((url) => new URL(url).pathname.includes('/result'), { timeout: 20_000 });
  await waitForText(learnerPage, /XP awarded/i);
  addStep('learner lesson completion', 'PASS', learnerPage.url());
  await saveScreenshot(learnerPage, 'learner-result');

  await learnerPage.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle' });
  await waitForText(learnerPage, /设置中心|settings center/i);
  const bioField = learnerPage.locator('textarea').first();
  await bioField.fill(learnerBio);
  await learnerPage.getByRole('button', { name: /保存资料|save profile/i }).click();
  await waitForText(learnerPage, /资料已更新|profile updated/i);
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
  await learnerPage.getByRole('button', { name: /添加笔记|add note/i }).click();
  await learnerPage.locator('input[value="未命名笔记"], input[value="Untitled note"]').first().fill(noteTitle);
  await learnerPage.locator('textarea').first().fill(noteBody);
  await learnerPage.getByRole('button', { name: /保存笔记|save note/i }).first().click();
  await waitForText(learnerPage, /笔记已保存|note saved/i);
  await learnerPage.reload({ waitUntil: 'networkidle' });
  await learnerPage.getByRole('button', { name: /^notes$/i }).click();
  await learnerPage.locator(`input[value="${noteTitle}"]`).waitFor({ timeout: 15_000 });
  addStep('community note persistence', 'PASS', noteTitle);
  await saveScreenshot(learnerPage, 'learner-community');

  await learnerPage.goto(`${baseUrl}/ai-tutor`, { waitUntil: 'networkidle' });
  await learnerPage.getByPlaceholder(/开始输入|ask the tutor/i).fill(tutorPrompt);
  await learnerPage.getByRole('button', { name: /^发送$|^send$/i }).click();
  await learnerPage.getByText(tutorPrompt, { exact: false }).waitFor({ timeout: 15_000 });
  await learnerPage.getByRole('button', { name: /打开思维导图|mind map/i }).click();
  await learnerPage.getByRole('button', { name: /^close$/i }).waitFor({ timeout: 30_000 });
  addStep('AI Tutor edge function', 'PASS', 'reply and mind map modal succeeded');
  await saveScreenshot(learnerPage, 'learner-ai-tutor');
  await learnerPage.getByRole('button', { name: /^close$/i }).click();

  await signOutFromSettings(learnerPage);
  addStep('learner sign out', 'PASS');
  await learnerContext.close();

  const authorAnalyticsContext = await browser.newContext();
  const authorAnalyticsPage = await authorAnalyticsContext.newPage();
  const authorDashboardAnalytics = await verifyAuthorDashboardAnalytics(authorAnalyticsPage);
  report.verification.authorDashboardAnalytics = authorDashboardAnalytics;
  await authorAnalyticsContext.close();

  const bindLearnerContext = await browser.newContext();
  const bindLearnerPage = await bindLearnerContext.newPage();
  await login(bindLearnerPage, accounts.bindLearner.email, accounts.bindLearner.password, '/home');
  await bindLearnerPage.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle' });
  await waitForText(bindLearnerPage, /设置中心|settings center/i);
  await bindLearnerPage.getByRole('button', { name: /家长模式|parent mode/i }).click();
  await bindLearnerPage.getByRole('button', { name: /生成绑定码|generate binding code|刷新绑定码|refresh binding code/i }).click();
  const bindingCode = await readBindingCode(bindLearnerPage);
  addStep('learner binding code generation', 'PASS', bindingCode);
  await saveScreenshot(bindLearnerPage, 'bind-learner-settings');
  await signOutFromSettings(bindLearnerPage);
  await bindLearnerContext.close();

  const parentContext = await browser.newContext();
  const parentPage = await parentContext.newPage();
  await login(parentPage, accounts.parent.email, accounts.parent.password, '/parent');
  addStep('parent login redirect', 'PASS', parentPage.url());
  await saveScreenshot(parentPage, 'parent-dashboard');

  const bindInput = parentPage.getByPlaceholder(/bind child with code/i);
  await bindInput.fill(bindingCode);
  await parentPage.getByRole('button', { name: /bind child with code/i }).click();
  await waitForText(parentPage, /child bound\./i);
  await parentPage.getByRole('button', { name: new RegExp(escapeRegExp(accounts.bindLearner.displayName), 'i') }).waitFor({ timeout: 15_000 });
  await parentPage.getByRole('button', { name: new RegExp(escapeRegExp(accounts.learner.displayName), 'i') }).click();
  await waitForText(parentPage, /selected child report/i);
  addStep('parent bind child flow', 'PASS', accounts.bindLearner.displayName);
  await saveScreenshot(parentPage, 'parent-bound-child');
  await parentContext.close();

  await verifyRemoteState(admin, {
    completedLessonId,
    smokeCourseId,
    smokeLessonTitle,
    authorDashboardAnalytics,
  });
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
