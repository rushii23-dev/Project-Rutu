import globals from 'globals'

/**
 * A deliberately small lint config. It exists for ONE bug class.
 *
 * Vite compiles an undefined identifier without complaint — it does no scope
 * analysis — so `district` referenced but never destructured from useStore()
 * built cleanly and then threw ReferenceError at render, blanking every crop
 * page. `npm run build` reported success the whole time.
 *
 * So this is not a style pass. Formatting, hook exhaustive-deps and the rest
 * are off: two days before a demo, a linter that yells about quote marks is a
 * linter nobody runs. The rules kept here are the ones where a violation is a
 * crash or dead code, and they are errors, not warnings.
 */
export default [
  {
    files: ['src/**/*.{js,jsx}', 'scripts/**/*.mjs', '*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.es2021 },
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    rules: {
      // the one that matters: a name used but never bound
      'no-undef': 'error',
      // catches a half-finished rename, which is the same mistake caught later
      'no-unused-vars': ['error', {
        args: 'none',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      'no-const-assign': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-unreachable': 'error',
      'no-cond-assign': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
    },
  },
]
