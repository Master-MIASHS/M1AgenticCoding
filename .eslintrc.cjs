module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  plugins: ['react', 'react-hooks'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'no-unused-vars': 'warn',
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
        message: 'Math.random() interdit. Utilisez le RNG du Core (src/core/rng.js).'
      }
    ],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['src/core/*', '../core/*'],
            message: 'Import direct depuis le Core interdit. Passez par src/services/coreService.js.'
          }
        ]
      }
    ]
  },
  ignorePatterns: ['dist'],
  overrides: [
    {
      files: ['src/services/coreService.js'],
      rules: {
        'no-restricted-imports': 'off'
      }
    }
  ]
};
