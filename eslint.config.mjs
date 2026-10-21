import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'graphify-out/**',
      '.vercel/**',
      'api/**',
      'jest.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // env.ts loga antes do logger existir; logger é o wrapper do console; seed e scripts são CLIs.
    files: [
      'src/core/config/env.ts',
      'src/core/lib/logger.ts',
      'src/modules/category/seed-categories.ts',
      'src/scripts/**',
    ],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['__tests__/**', 'jest.*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  }
);
