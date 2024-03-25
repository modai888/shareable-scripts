/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/22
 * @description 默认Husky配置
 */
module.exports = {
  hooks: {
    ['pre-commit']: `pnpm shareable-scripts pre-commit`,
  },
};
