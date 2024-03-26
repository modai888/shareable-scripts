/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/20
 * @description ESLint配置
 */
const fs = require('fs');
const path = require('path');

const tsconfig = fs.existsSync('tsconfig.json')
  ? path.resolve('tsconfig.json')
  : fs.existsSync('types/tsconfig.json')
    ? path.resolve('types/tsconfig.json')
    : undefined;

module.exports = {
  env: {
    browser: true,
    node: true,
    // es2020: true,
    es2024: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    sourceType: 'module',
  },
  rules: {},

  overrides: [
    {
      env: {
        es2022: true,
      },
      files: ['**/*.ts?(x)'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        sourceType: 'module',
        project: tsconfig,
      },
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended'],
      rules: {},
    },
  ],
};
