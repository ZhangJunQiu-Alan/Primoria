import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const maxSharedRawBytes = Number(process.env.VIEWER_MAX_SHARED_RAW_BYTES || 450 * 1024);
const maxInitialGzipBytes = Number(process.env.VIEWER_MAX_INITIAL_GZIP_BYTES || 250 * 1024);
const distDir = path.resolve('dist');
const manifestPath = path.join(distDir, 'manifest.json');

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

const staticImportPattern =
  /(?:^|;)\s*import(?:[\w*{}\s,]+from\s*)?["'](\.\/[^"']+\.js)["']/gm;

function normalizeAssetPath(fromFile, relativeImport) {
  const fromDirectory = path.posix.dirname(fromFile);
  return path.posix.normalize(path.posix.join(fromDirectory, relativeImport));
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const entry = Object.values(manifest).find((item) => item && item.isEntry);
  if (!entry) {
    throw new Error('Could not find Vite entry chunk in manifest.json.');
  }

  const visited = new Set();

  async function walk(file) {
    if (visited.has(file)) {
      return;
    }
    visited.add(file);
    if (!file.endsWith('.js')) {
      return;
    }

    const absolutePath = path.join(distDir, file);
    const content = await fs.readFile(absolutePath, 'utf8');
    const imports = [...content.matchAll(staticImportPattern)];
    for (const match of imports) {
      const importedFile = normalizeAssetPath(file, match[1]);
      await walk(importedFile);
    }
  }

  await walk(entry.file);

  const sizedFiles = await Promise.all(
    [...visited].map(async (file) => {
      const absolutePath = path.join(distDir, file);
      const content = await fs.readFile(absolutePath);
      return {
        file,
        raw: content.byteLength,
        gzip: gzipSync(content).byteLength,
      };
    }),
  );

  const entryFile = entry.file;
  const sharedChunks = sizedFiles.filter((item) => item.file !== entryFile);
  const largestShared = sharedChunks.reduce(
    (largest, current) => (current.raw > largest.raw ? current : largest),
    { file: '', raw: 0, gzip: 0 },
  );
  const initialRouteGzip = sizedFiles.reduce((total, item) => total + item.gzip, 0);

  console.log(`Entry chunk: ${entryFile}`);
  console.log(`Initial route JS gzip total: ${formatBytes(initialRouteGzip)}`);
  if (largestShared.file) {
    console.log(`Largest shared JS chunk: ${largestShared.file} (${formatBytes(largestShared.raw)} raw)`);
  }

  const topFiles = [...sizedFiles].sort((a, b) => b.raw - a.raw).slice(0, 6);
  for (const file of topFiles) {
    console.log(`- ${file.file}: ${formatBytes(file.raw)} raw / ${formatBytes(file.gzip)} gzip`);
  }

  if (largestShared.raw > maxSharedRawBytes) {
    throw new Error(
      `Largest shared chunk ${largestShared.file} is ${formatBytes(largestShared.raw)}, above ${formatBytes(maxSharedRawBytes)}.`,
    );
  }

  if (initialRouteGzip > maxInitialGzipBytes) {
    throw new Error(
      `Initial route JS gzip total is ${formatBytes(initialRouteGzip)}, above ${formatBytes(maxInitialGzipBytes)}.`,
    );
  }
}

await main();
