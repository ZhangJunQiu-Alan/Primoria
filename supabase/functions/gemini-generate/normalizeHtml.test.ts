import { normalizeGeminiHtml } from './normalizeHtml.ts';

function assertEqual(actual: string, expected: string) {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

Deno.test('keeps raw html untouched', () => {
  const html = '<!DOCTYPE html><html><body><h1>Hello</h1></body></html>';
  assertEqual(normalizeGeminiHtml(html), html);
});

Deno.test('strips a fenced html block', () => {
  const raw = '```html\n<!DOCTYPE html><html><body><h1>Hello</h1></body></html>\n```';
  assertEqual(normalizeGeminiHtml(raw), '<!DOCTYPE html><html><body><h1>Hello</h1></body></html>');
});

Deno.test('extracts the first fenced html block from mixed text', () => {
  const raw = [
    'Here is the animation you asked for.',
    '```html',
    '<!DOCTYPE html><html><body><canvas></canvas></body></html>',
    '```',
    'Let me know if you need adjustments.',
  ].join('\n');
  assertEqual(normalizeGeminiHtml(raw), '<!DOCTYPE html><html><body><canvas></canvas></body></html>');
});

Deno.test('returns an empty string for an empty fenced block', () => {
  assertEqual(normalizeGeminiHtml('```html\n\n```'), '');
});
