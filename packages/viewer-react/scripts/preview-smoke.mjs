import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const baseUrl = process.env.VIEWER_PREVIEW_URL?.trim();
if (!baseUrl) {
  throw new Error('VIEWER_PREVIEW_URL is required.');
}

const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const artifactDir = path.resolve('test-results', `preview-smoke-${runId}`);
const report = {
  runId,
  baseUrl,
  startedAt: new Date().toISOString(),
  checks: [],
};

function addCheck(name, status, detail) {
  report.checks.push({
    name,
    status,
    detail,
    timestamp: new Date().toISOString(),
  });
  console.log(`[${status}] ${name}${detail ? `: ${detail}` : ''}`);
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'viewer-preview-smoke/1.0' },
  });
  const text = await response.text();
  return { response, text };
}

function expectHeader(headers, name, matcher) {
  const value = headers.get(name) ?? '';
  if (!matcher.test(value)) {
    throw new Error(`Header ${name} did not match ${matcher}. Received "${value}".`);
  }
}

async function main() {
  await fs.mkdir(artifactDir, { recursive: true });

  const landing = await fetchText(`${baseUrl}/`);
  if (!landing.response.ok || !/Primoria/i.test(landing.text)) {
    throw new Error('Landing page did not render expected Primoria shell.');
  }
  expectHeader(landing.response.headers, 'cache-control', /no-cache/i);
  expectHeader(landing.response.headers, 'x-content-type-options', /nosniff/i);
  addCheck('landing route', 'PASS', 'rendered Primoria shell');

  const login = await fetchText(`${baseUrl}/login`);
  if (!login.response.ok || !/sign in/i.test(login.text)) {
    throw new Error('Login route did not render expected auth shell.');
  }
  addCheck('login route', 'PASS', 'rendered login form');

  const assetMatch = landing.text.match(/src="(\/assets\/[^"]+\.js)"/i);
  if (!assetMatch) {
    throw new Error('Could not resolve a hashed JS asset from the deployed landing page.');
  }
  const assetUrl = new URL(assetMatch[1], `${baseUrl}/`).toString();
  const assetResponse = await fetch(assetUrl, { headers: { 'User-Agent': 'viewer-preview-smoke/1.0' } });
  if (!assetResponse.ok) {
    throw new Error(`Asset request failed with HTTP ${assetResponse.status}.`);
  }
  expectHeader(assetResponse.headers, 'cache-control', /immutable/i);
  addCheck('asset caching', 'PASS', assetMatch[1]);

  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(artifactDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Preview smoke passed. Report saved to ${path.join(artifactDir, 'report.json')}`);
}

try {
  await main();
} catch (error) {
  addCheck('preview smoke failed', 'FAIL', error instanceof Error ? error.message : String(error));
  report.finishedAt = new Date().toISOString();
  await fs.mkdir(artifactDir, { recursive: true });
  await fs.writeFile(path.join(artifactDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = 1;
}
