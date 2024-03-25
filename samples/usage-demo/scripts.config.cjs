/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/13
 * @description 扩展脚本
 */
const custom = require('./src/scripts/custom');

module.exports = {
  // extends:'@maltose888/common-scripts/scripts.config.js',
  extends: ['./sample-scripts/config.js', '@maltose888/common-scripts/scripts.config.js'],

  scripts: {
    custom,
  },
};
