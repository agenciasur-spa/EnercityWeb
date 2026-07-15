import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import astro from 'eslint-plugin-astro'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import * as prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

const browserGlobals = {
  ...globals.browser,
  console: 'readonly',
  fetch: 'readonly',
  React: 'readonly'
}

const nodeGlobals = {
  ...globals.node,
  console: 'readonly',
  fetch: 'readonly',
  __dirname: 'readonly',
  React: 'readonly'
}

const testGlobals = {
  ...nodeGlobals,
  describe: 'readonly',
  it: 'readonly',
  expect: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  vi: 'readonly'
}

export default tseslint.config(
  {
    ignores: [
      'dist/',
      '.astro/',
      'node_modules/',
      '.vercel/',
      '*.test.*',
      '*.spec.*'
    ]
  },
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: browserGlobals
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      ...prettierConfig.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // Use TS version only; the base rule reports false positives on TS types
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Pre-existing patterns throughout the admin tables; downgrade to warn
      'jsx-a11y/label-has-associated-control': 'warn',
      'react/no-unescaped-entities': 'warn',
      'react-hooks/purity': 'warn',
      'no-useless-assignment': 'warn'
    }
  },
  ...astro.configs.recommended,
  {
    files: ['src/pages/api/**/*.ts'],
    languageOptions: {
      globals: nodeGlobals
    }
  },
  {
    files: ['src/scripts/**/*.ts', 'export_supabase.js', 'src/lib/email.ts'],
    languageOptions: {
      globals: nodeGlobals
    }
  },
  {
    files: ['vitest.config.ts'],
    languageOptions: {
      globals: nodeGlobals
    }
  },
  {
    files: ['src/**/*.test.*', 'src/**/*.spec.*'],
    languageOptions: {
      globals: testGlobals
    }
  }
)