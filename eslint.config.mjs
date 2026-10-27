import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['**/dist/**', 'graft/**'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
  {
    // These rethrow a redacted message on purpose: chaining the original as `cause` could carry a token.
    files: ['packages/server/src/services/{connect,github,keychain}.ts'],
    rules: { 'preserve-caught-error': 'off' },
  },
  {
    files: ['packages/server/**/*.ts', 'packages/shared/**/*.ts', 'packages/web/vite.config.ts', 'scripts/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['packages/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    // The classic hook rules only; the React Compiler rules assume a compiler this app does not use.
    plugins: { 'react-hooks': reactHooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'error' },
  },
);
