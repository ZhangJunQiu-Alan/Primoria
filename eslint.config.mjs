import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  // ── 全局忽略 ────────────────────────────────────────────────
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.vite/**',
      'packages/db/src/database.generated.ts',
      'supabase/**',
    ],
  },

  // ── 所有 TS/JS 文件：基础规则 ────────────────────────────────
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // 允许用 _ 前缀标记刻意忽略的变量
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // 第三方库回调里有时需要 any，降级为警告
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // ── viewer-react：追加 React 规则 ────────────────────────────
  {
    files: ['packages/viewer-react/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // set-state-in-effect: v7 新增规则，useEffect 内同步外部数据到 state 是合法的标准模式
      // 需要整体迁移到 react-hook-form reset 或 useSyncExternalStore 才能消除，暂降为 warn
      'react-hooks/set-state-in-effect': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // ── 测试文件：放宽部分规则 ───────────────────────────────────
  {
    files: ['**/test/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
