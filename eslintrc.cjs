/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/21
 * @description eslint config
 */
const config = require('@shareable-scripts/common-scripts/lib/config/eslint.cjs');

module.exports = {
  root: true,
  ...config,

  //   overrides: [
  //     {
  //       files: ["**/*.ts?(x)"],

  //       parserOptions: {
  //         project: "./packages/shareable-scripts/tsconfig.json",
  //       },
  //     },
  //   ],

  //   ignorePatterns: ["**/node_modules/**"],
};
