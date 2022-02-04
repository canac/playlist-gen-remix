'use strict';

module.exports = {
  extends: ['airbnb-base', 'prettier'],
  ignorePatterns: ['build/', 'public/build/', 'app/lib/labelGrammar.server.ts'],
  plugins: ['prettier'],
  root: true,
  overrides: [
    {
      files: ['*.js'],
      parserOptions: {
        sourceType: 'script',
      },
    },
    {
      files: ['app/**/*.{ts,tsx}'],
      extends: [
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:import/errors',
        'plugin:import/warnings',
        'plugin:import/typescript',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: 'tsconfig.json',
      },
      plugins: ['@typescript-eslint', 'react'],
      rules: {
        'import/extensions': 'off',
        'import/order': [
          'error',
          {
            alphabetize: { order: 'asc' },
          },
        ],
        'import/prefer-default-export': 'off',
        // Allow for .. of statements
        'no-restricted-syntax': [
          'error',
          {
            selector: 'ForInStatement',
            message:
              'for..in loops iterate over the entire prototype chain, which is virtually never what you want. ' +
              'Use Object.{keys,values,entries}, and iterate over the resulting array.',
          },
          {
            selector: 'LabeledStatement',
            message:
              'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
          },
          {
            selector: 'WithStatement',
            message:
              '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
          },
        ],
        'no-underscore-dangle': ['error', { allow: ['_count'] }],
        'react/react-in-jsx-scope': 'off',
        'sort-imports': ['error', { ignoreDeclarationSort: true }],

        // Required to fix 'React' was used before it was defined errors (https://stackoverflow.com/a/64024916)
        // 'no-use-before-define': 'off',
        // '@typescript-eslint/no-use-before-define': ['error'],
      },
      settings: {
        'import/resolver': {
          alias: {
            map: [['~', './app/']],
            extensions: ['.ts', '.tsx'],
          },
        },
        react: {
          version: 'detect',
        },
      },
    },
  ],
  rules: {
    'max-len': ['error', { code: 120 }],
    strict: ['error', 'global'],
  },
};
