/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/13
 * @description 扩展脚本
 */
import backup_project from './src/backup-project.mjs';
import clean_project from './src/clean-project.mjs';
import migrate_project from './src/migrate-project.mjs';
import format_project from './src/format-project.mjs';

export default {
  scripts: [backup_project, clean_project, migrate_project, format_project],
};
