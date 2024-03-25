/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/20
 * @description eslint default configuration
 */
// const { findUp } = require('find-up');
const prettier = require('./prettier.cjs');

module.exports = {
  extends: [
    require.resolve('@maltose/eslint-config'),
    require.resolve('@maltose/eslint-config/jest'),

    // require.resolve('@maltose/eslint-config/react'),
    // require.resolve('@maltose/eslint-config/jsx-a11y'),
    require.resolve('@maltose/eslint-config/prettier'),
  ],

  rules: {
    'prettier/prettier': [
      'error',
      {
        ...prettier,
        usePrettierrc: true,
      },
    ],
  },
};
