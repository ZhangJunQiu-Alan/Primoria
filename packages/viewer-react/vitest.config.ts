import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 30000,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts?(x)'],
    exclude: ['test/e2e/**'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
