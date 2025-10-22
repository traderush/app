import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import nextPlugin from '@next/eslint-plugin-next';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.config(nextPlugin.configs['core-web-vitals']),
  ...compat.extends('plugin:import/recommended', 'plugin:react-hooks/recommended'),
  ...compat.config({
    plugins: ['@typescript-eslint'],
    rules: {
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  }),
  ...compat.config({
    overrides: [
      {
        files: ['src/**/*.ts', 'src/**/*.tsx'],
        parser: '@typescript-eslint/parser',
        parserOptions: {
          project: ['./tsconfig.json'],
          tsconfigRootDir: __dirname,
        },
        rules: {
          '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', disallowTypeAnnotations: false }],
          '@typescript-eslint/no-explicit-any': 'error',
          '@typescript-eslint/no-floating-promises': 'error',
          '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
        },
      },
    ],
  }),
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'dist/**',
      'next-env.d.ts',
      'eslint.config.mjs',
      'clearingHouse/**',
    ],
  },
];
