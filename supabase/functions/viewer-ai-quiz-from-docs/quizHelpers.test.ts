import { buildCourseSlug, buildQuizPrompt } from './quizHelpers.ts';

function assertEquals<T>(actual: T, expected: T, label?: string) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(`${label ? label + ': ' : ''}expected ${b}, got ${a}`);
  }
}

function assertContains(haystack: string, needle: string, label?: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`${label ? label + ': ' : ''}expected string to contain ${JSON.stringify(needle)}`);
  }
}

// ── buildCourseSlug ──────────────────────────────────────────────────────────

Deno.test('buildCourseSlug: normal title', () => {
  const slug = buildCourseSlug('Python Basics', 'abc-123-def');
  assertEquals(slug, 'python-basics-abc');
});

Deno.test('buildCourseSlug: empty title falls back to "course"', () => {
  const slug = buildCourseSlug('', 'abc-123');
  assertEquals(slug, 'course-abc');
});

Deno.test('buildCourseSlug: whitespace-only title falls back to "course"', () => {
  const slug = buildCourseSlug('   ', 'xyz-999');
  assertEquals(slug, 'course-xyz');
});

Deno.test('buildCourseSlug: special characters stripped', () => {
  const slug = buildCourseSlug('C++ & Algorithms!', 'xyz-999');
  assertEquals(slug, 'c-algorithms-xyz');
});

Deno.test('buildCourseSlug: uses only first segment of courseId as suffix', () => {
  const slug = buildCourseSlug('Math', 'seg1-seg2-seg3');
  assertEquals(slug, 'math-seg1');
});

Deno.test('buildCourseSlug: courseId with no dashes uses full id as suffix', () => {
  const slug = buildCourseSlug('Science', 'nohyphens');
  assertEquals(slug, 'science-nohyphens');
});

Deno.test('buildCourseSlug: leading and trailing hyphens trimmed from title part', () => {
  const slug = buildCourseSlug('---Hello---', 'id-001');
  assertEquals(slug, 'hello-id');
});

// ── buildQuizPrompt ──────────────────────────────────────────────────────────

Deno.test('buildQuizPrompt: single document — filename and content appear', () => {
  const docs = [{ id: '1', filename: 'intro.pdf', extracted_text: 'some content here' }];
  const prompt = buildQuizPrompt(docs, 10);
  assertContains(prompt, 'intro.pdf');
  assertContains(prompt, 'some content here');
  assertContains(prompt, '10 题');
});

Deno.test('buildQuizPrompt: multiple documents indexed correctly', () => {
  const docs = [
    { id: '1', filename: 'doc1.pdf', extracted_text: 'alpha' },
    { id: '2', filename: 'doc2.pdf', extracted_text: 'beta' },
  ];
  const prompt = buildQuizPrompt(docs, 5);
  assertContains(prompt, '文件1: doc1.pdf');
  assertContains(prompt, '文件2: doc2.pdf');
  assertContains(prompt, 'alpha');
  assertContains(prompt, 'beta');
  assertContains(prompt, '5 题');
});

Deno.test('buildQuizPrompt: prefers display_title over filename when present', () => {
  const docs = [{ id: '1', filename: 'doc1.pdf', display_title: 'Week 1 review', extracted_text: 'alpha' }];
  const prompt = buildQuizPrompt(docs, 6);
  assertContains(prompt, 'Week 1 review');
});

Deno.test('buildQuizPrompt: output is plain JSON instruction, no markdown wrapper', () => {
  const docs = [{ id: '1', filename: 'a.pdf', extracted_text: 'x' }];
  const prompt = buildQuizPrompt(docs, 10);
  assertContains(prompt, '只输出 JSON');
  assertContains(prompt, '直接从 { 开始');
});

Deno.test('buildQuizPrompt: match count is hard-capped by total question count', () => {
  const docs = [{ id: '1', filename: 'a.pdf', extracted_text: 'x' }];
  const prompt = buildQuizPrompt(docs, 10);
  assertContains(prompt, '总题数 ≤ 15 → 恰好 1 道 match');
  assertContains(prompt, '总题数 16-30 → 恰好 2 道 match');
});

Deno.test('buildQuizPrompt: keeps tf at ~10% and mc filling the rest', () => {
  const docs = [{ id: '1', filename: 'a.pdf', extracted_text: 'x' }];
  const prompt = buildQuizPrompt(docs, 10);
  assertContains(prompt, 'tf（判断）：约 10%');
  assertContains(prompt, '剩余全部由单选/多选填充');
});

Deno.test('buildQuizPrompt: forbids clustering same question types', () => {
  const docs = [{ id: '1', filename: 'a.pdf', extracted_text: 'x' }];
  const prompt = buildQuizPrompt(docs, 10);
  assertContains(prompt, '穿插排列');
  assertContains(prompt, '严禁两道及以上相同 type 连续出现');
});

Deno.test('buildQuizPrompt: enforces option length consistency for mc questions', () => {
  const docs = [{ id: '1', filename: 'a.pdf', extracted_text: 'x' }];
  const prompt = buildQuizPrompt(docs, 10);
  assertContains(prompt, '字符长度差异必须 ≤ 10%');
});

Deno.test('buildQuizPrompt: defaults to English output language', () => {
  const docs = [{ id: '1', filename: 'a.pdf', extracted_text: 'x' }];
  const prompt = buildQuizPrompt(docs, 10);
  assertContains(prompt, 'MUST be written in English');
});

Deno.test('buildQuizPrompt: honors explicit English language', () => {
  const docs = [{ id: '1', filename: 'a.pdf', extracted_text: 'x' }];
  const prompt = buildQuizPrompt(docs, 10, 'en');
  assertContains(prompt, 'MUST be written in English');
});

Deno.test('buildQuizPrompt: honors explicit simplified Chinese language', () => {
  const docs = [{ id: '1', filename: 'a.pdf', extracted_text: 'x' }];
  const prompt = buildQuizPrompt(docs, 10, 'zh-CN');
  assertContains(prompt, '必须使用简体中文');
});
