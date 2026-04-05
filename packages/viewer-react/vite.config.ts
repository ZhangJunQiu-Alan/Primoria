import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

function manualChunks(id: string) {
  if (id.includes('node_modules')) {
    if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
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
    plugins: [react()],
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
