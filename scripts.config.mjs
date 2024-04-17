/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/13
 * @description 扩展脚本
 */
import publishynpm from './scripts/publish-ynpm.mjs';

export default {
  //   extends: ['@shareable-scripts/common-scripts/scripts.config.js'],
  extends: ['./packages/common-scripts/scripts.config.js'],

  scripts: [publishynpm],
};
