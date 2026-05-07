#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(repoRoot, '.env');

function parseEnvValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  const parsed = {};
  const contents = readFileSync(filePath, 'utf8');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    parsed[key] = parseEnvValue(line.slice(separatorIndex + 1));
  }

  return parsed;
}

const fileEnv = parseEnvFile(envPath);
const baseEnv = { ...fileEnv, ...process.env };
const supabaseUrl = baseEnv.VITE_SUPABASE_URL || baseEnv.SUPABASE_URL;
const supabaseAnonKey = baseEnv.VITE_SUPABASE_ANON_KEY || baseEnv.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Connected dev requires Supabase credentials in .env as VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ' +
      'or SUPABASE_URL/SUPABASE_ANON_KEY.',
  );
  process.exit(1);
}

const child = spawn(
  'pnpm',
  ['--filter', '@primoria/viewer-react', 'dev'],
  {
    cwd: repoRoot,
    env: {
      ...baseEnv,
      VITE_SUPABASE_URL: supabaseUrl,
      VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
      VITE_VIEWER_DEMO_MODE: '0',
    },
    stdio: 'inherit',
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
