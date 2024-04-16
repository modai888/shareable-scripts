/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/22
 * @description 默认Husky配置
 */
module.exports = {
  hooks: {
    ['pre-commit']: `npx shareable-scripts pre-commit`,
  },
};
