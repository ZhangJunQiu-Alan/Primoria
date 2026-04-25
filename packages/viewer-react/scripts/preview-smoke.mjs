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

function getBootstrapAssetPath(html) {
  return html.match(/src="(\/assets\/[^"]+\.js)"/i)?.[1] ?? null;
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
  if (!login.response.ok || !/Primoria/i.test(login.text)) {
    throw new Error('Login route did not return the expected Primoria SPA shell.');
  }
  expectHeader(login.response.headers, 'cache-control', /no-cache/i);
  expectHeader(login.response.headers, 'content-type', /text\/html/i);
  const loginPathname = new URL(login.response.url).pathname;
  if (loginPathname !== '/login') {
    throw new Error(`Login route resolved to ${loginPathname} instead of /login.`);
  }

  const landingAssetPath = getBootstrapAssetPath(landing.text);
  const loginAssetPath = getBootstrapAssetPath(login.text);
  if (!landingAssetPath) {
    throw new Error('Could not resolve a hashed JS asset from the deployed landing page.');
  }
  if (loginAssetPath !== landingAssetPath) {
    throw new Error(
      `Login route referenced bootstrap asset ${loginAssetPath ?? 'missing'}, expected ${landingAssetPath}.`,
    );
  }
  addCheck('login route', 'PASS', 'served the auth route SPA shell');

  const assetUrl = new URL(landingAssetPath, `${baseUrl}/`).toString();
  const assetResponse = await fetch(assetUrl, { headers: { 'User-Agent': 'viewer-preview-smoke/1.0' } });
  if (!assetResponse.ok) {
    throw new Error(`Asset request failed with HTTP ${assetResponse.status}.`);
  }
  expectHeader(assetResponse.headers, 'cache-control', /immutable/i);
  addCheck('asset caching', 'PASS', landingAssetPath);

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
