/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/13
 * @description 通用工程化脚本配置
 */
import prepare from './lib/scripts/prepare.js';
import build from './lib/scripts/build.js';
import format from './lib/scripts/format.js';
import lintForES from './lib/scripts/lint-es.js';
import precommint from './lib/scripts/pre-commit.js';

export default {
  scripts: {
    prepare,
    build,
    format,
    lintForES,
    precommint,
  },
};
