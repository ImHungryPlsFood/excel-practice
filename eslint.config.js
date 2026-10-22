// ESLint flat config (CARD-01A).
// 카드 원문은 .eslintrc.cjs를 지정했으나 ESLint 9+ 표준인 flat config로 대체했다 (사용자 결정 2026-10-22).
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['dist/', 'coverage/', 'playwright-report/', 'test-results/', 'node_modules/'],
  },
  {
    // G-01: eslint-disable 주석으로 규칙을 숨기는 행위를 원천 차단한다.
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'error',
    },
  },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    settings: {
      react: { version: 'detect' },
    },
    extends: [
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
    ],
    rules: {
      // S-08: XSS 차단
      'react/no-danger': 'error',
      // S-09: 동적 코드 실행 차단
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      // G-01: 오류 은폐 차단
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-expect-error': 'allow-with-description',
        },
      ],
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.{js,mjs,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
