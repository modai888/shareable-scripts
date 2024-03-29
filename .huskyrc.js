/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/22
 * @description 配置husky钩子
 */
const config = require('./packages/common-scripts/lib/config/husky.cjs');

config.hooks = config.hooks ?? {};
config.hooks['pre-commit'] = 'node ./packages/cli/lib/cli.js pre-commit';

module.exports = config;
