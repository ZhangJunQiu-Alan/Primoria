import path from 'path';
import { readFile, writeFile } from 'node:fs/promises';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function interactiveVisualDebugLogPlugin(): Plugin {
  const logPath = path.resolve(__dirname, '../../.iv-debug.json');
  async function readExisting(): Promise<Record<string, unknown>> {
    try {
      const raw = await readFile(logPath, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {
    name: 'iv-debug-log',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dev/iv-log', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST only');
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', async () => {
          const body = Buffer.concat(chunks).toString('utf8');
          let merged: Record<string, unknown>;
          try {
            const parsed = JSON.parse(body);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              const existing = await readExisting();
              merged = { ...existing, ...(parsed as Record<string, unknown>) };
            } else {
              merged = { raw: body };
            }
          } catch {
            merged = { raw: body };
          }
          try {
            await writeFile(logPath, JSON.stringify(merged, null, 2), 'utf8');
            res.statusCode = 204;
            res.end();
          } catch (error) {
            res.statusCode = 500;
            res.end(`failed to write log: ${(error as Error).message}`);
          }
        });
      });
    },
  };
}

function manualChunks(id: string) {
  if (id.includes('node_modules')) {
    if (
      id.includes('@tiptap/') ||
      id.includes('prosemirror') ||
      id.includes('orderedmap') ||
      id.includes('rope-sequence') ||
      id.includes('w3c-keyname') ||
      id.includes('@floating-ui/')
    ) {
      return 'editor-richtext';
    }
    if (id.includes('/react/') || id.includes('/scheduler/')) {
      return 'framework';
    }
    if (id.includes('react-router-dom')) {
      return 'router';
    }
    if (id.includes('@reduxjs/toolkit') || id.includes('react-redux') || id.includes('@tanstack/react-query')) {
      return 'state-query';
    }
    if (id.includes('@supabase/supabase-js')) {
      return 'supabase';
    }
    if (id.includes('lucide-react')) {
      return 'icons';
    }
    if (id.includes('posthog-js')) {
      return 'posthog';
    }
    if (id.includes('@sentry/')) {
      return 'sentry';
    }
  }
  return undefined;
}

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '../..');
  const env = loadEnv(mode, envDir, '');
  const fixtureMode = mode === 'test' || env.VITE_VIEWER_DEMO_MODE === '1';
  const requestedBase = env.VITE_PUBLIC_BASE_PATH?.trim() || '/';
  const base = requestedBase === '/' ? '/' : requestedBase.endsWith('/') ? requestedBase : `${requestedBase}/`;

  return {
    base,
    envDir,
    plugins: [
      react(),
      interactiveVisualDebugLogPlugin(),
      {
        name: 'require-supabase-env',
        buildStart() {
          if (fixtureMode) return;
          if (!env.VITE_SUPABASE_URL?.trim() || !env.VITE_SUPABASE_ANON_KEY?.trim()) {
            throw new Error(
              '[require-supabase-env] Build requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n' +
                'For fixture/demo builds, set VITE_VIEWER_DEMO_MODE=1.',
            );
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5180,
    },
    build: {
      manifest: 'manifest.json',
      modulePreload: false,
      sourcemap: true,
      chunkSizeWarningLimit: 450,
      rollupOptions: {
        output: {
          manualChunks,
        },
      },
    },
  };
});
