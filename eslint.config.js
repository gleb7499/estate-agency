// ESLint flat config for the vanilla-JS modules of the property card page
export default [
  {
    ignores: ['node_modules/**'],
  },
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        CustomEvent: 'readonly',
        ResizeObserver: 'readonly',
        MutationObserver: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        getComputedStyle: 'readonly',
        CSS: 'readonly',
        URL: 'readonly',
        Intl: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        Date: 'readonly',
        Math: 'readonly',
        Number: 'readonly',
        parseFloat: 'readonly',
        Promise: 'readonly',
        Array: 'readonly',
        String: 'readonly',
        isFinite: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off',
    },
  },
  {
    files: ['js/mock-data.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
    },
  },
];
