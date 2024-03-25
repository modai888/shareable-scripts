/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/21
 * @description eslint for react
 */
module.exports = {
  env: {
    browser: true,
  },
  extends: ['plugin:react/recommended', 'plugin:react-hooks/recommended'],
  // recommended 配置中包含了如下parserOptions选项
  //   parserOptions: {
  //     ecmaFeatures: {
  //       jsx: true,
  //     },
  //   },
  rules: {},

  settings: {
    react: {
      version: 'detect',
    },
  },

  overrides: [
    {
      files: ['**/*.ts?(x)'],
      rules: {
        'react/jsx-filename-extension': ['error', { extensions: ['.ts', '.tsx'] }],
        'react/prop-types': 'off',
      },
    },
  ],
};
