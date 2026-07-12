#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");
const nextRoot = path.join(webRoot, process.env.NEXT_DIST_DIR || ".next");

function kiB(bytes) {
  return bytes / 1024;
}

function format(value) {
  return `${value.toFixed(1)} KiB`;
}

function normalizeChunk(chunk) {
  return chunk.replace(/^\/_next\//, "");
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readClientManifest(file) {
  const source = await readFile(file, "utf8");
  const assignment = source.lastIndexOf(" = ");
  if (assignment < 0) throw new Error(`could not parse client manifest ${file}`);
  return JSON.parse(source.slice(assignment + 3).trim().replace(/;$/, ""));
}

const budgets = await readJson(path.join(webRoot, "bundle-budgets.json"));
const buildManifest = await readJson(path.join(nextRoot, "build-manifest.json"));
let failed = false;

for (const [route, budget] of Object.entries(budgets.routes)) {
  const manifest = await readClientManifest(path.join(nextRoot, budget.manifest));
  const chunks = new Set(buildManifest.rootMainFiles.map(normalizeChunk));

  for (const clientModule of Object.values(manifest.clientModules)) {
    for (const chunk of clientModule.chunks ?? []) chunks.add(normalizeChunk(chunk));
  }
  for (const entry of Object.values(manifest.entryJSFiles)) {
    for (const chunk of entry) chunks.add(normalizeChunk(chunk));
  }

  let rawBytes = 0;
  let gzipBytes = 0;
  for (const chunk of chunks) {
    const contents = await readFile(path.join(nextRoot, chunk));
    rawBytes += contents.length;
    gzipBytes += gzipSync(contents).length;
    if (kiB(contents.length) > budgets.maxChunkKiB) {
      failed = true;
      console.error(`${route}: ${chunk} is ${format(kiB(contents.length))}, budget ${budgets.maxChunkKiB} KiB`);
    }
  }

  const raw = kiB(rawBytes);
  const gzip = kiB(gzipBytes);
  console.log(`${route}: ${format(raw)} raw / ${format(gzip)} gzip (${chunks.size} chunks)`);
  if (raw > budget.maxRawKiB || gzip > budget.maxGzipKiB) {
    failed = true;
    console.error(`${route}: exceeds budget ${budget.maxRawKiB} KiB raw / ${budget.maxGzipKiB} KiB gzip`);
  }
}

if (failed) process.exitCode = 1;
