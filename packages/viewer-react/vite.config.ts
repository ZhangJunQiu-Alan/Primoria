import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

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
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim() || env.SUPABASE_URL?.trim() || '';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY?.trim() || env.SUPABASE_ANON_KEY?.trim() || '';
  const fixtureMode = mode === 'test' || env.VITE_VIEWER_DEMO_MODE === '1';
  const requestedBase = env.VITE_PUBLIC_BASE_PATH?.trim() || '/';
  const base = requestedBase === '/' ? '/' : requestedBase.endsWith('/') ? requestedBase : `${requestedBase}/`;

  return {
    base,
    envDir,
    plugins: [
      react(),
      {
        name: 'require-supabase-env',
        buildStart() {
          if (fixtureMode) return;
          if (!supabaseUrl || !supabaseAnonKey) {
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
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
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
