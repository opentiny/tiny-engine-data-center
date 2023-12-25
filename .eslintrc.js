const frontPaths = [
  'admin/src/**/**/*.js'
];

module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true
  },
  globals: {
    strapi: true,
    BACKEND_URL: true
  },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:mocha/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  overrides: [
    {
      files: ['packages/**/*.js', 'test/**/*.js', 'scripts/**/*.js'],
      excludedFiles: frontPaths,
      ...require('./.eslintrc.back.js')
    },
    {
      files: frontPaths,
      ...require('./.eslintrc.front.js')
    }
  ],
  settings: {
    react: {
      version: 'detect'
    }
  }
};
