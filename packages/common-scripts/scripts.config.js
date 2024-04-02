/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/13
 * @description 通用工程化脚本配置
 */
import prepare from './lib/scripts/prepare.js';
import build from './lib/scripts/build.js';

export default {
  scripts: [
    prepare,
    build,

    {
      nameAndArgs: 'pre-commit [options]',
      description: 'Lint your staged code before commiting.',
      executableFile: './lib/scripts/pre-commit.js',
    },

    {
      nameAndArgs: 'format [files...]',
      description: 'format code with prettier',
      executableFile: './lib/scripts/format.js',
    },

    {
      nameAndArgs: 'lint-es [file/dir/glob...]',
      description: 'Lint your source code with eslint.',
      executableFile: './lib/scripts/lint-es.js',
    },

    {
      nameAndArgs: 'multilang [options] [file/dir...]',
      description: 'Refactor your code to solve the multilingual extraction problems.',
      executableFile: './lib/scripts/multilang/index.js',
    },
  ],
};
