/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/13
 * @description 扩展脚本
 */
import simple from './src/scripts/simple.mjs';
// const simple = require('./src/scripts/simple.mjs');

export default {
  //   extends:'@shareable-scripts/common-scripts/scripts.config.js',
  extends: ['@shareable-scripts/common-scripts/scripts.config.js', './sample-scripts'],

  scripts: [simple],
};
