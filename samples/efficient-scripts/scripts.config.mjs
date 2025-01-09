/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/13
 * @description 扩展脚本
 */
import migrate_project from './src/migrate-project.mjs';
import format_project from './src/format-project.mjs';

export default {
  scripts: [migrate_project, format_project],
};
