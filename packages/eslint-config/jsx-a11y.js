/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/21
 * @description eslint-plugin-jsx-a11y
 */
module.exports = {
  env: {
    browser: true,
  },
  extends: ['plugin:jsx-a11y/recommended'],
  // recommended 配置中包含了如下parserOptions选项
  //   parserOptions: {
  //     ecmaFeatures: {
  //       jsx: true,
  //     },
  //   },
  rules: {},
};
