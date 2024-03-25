/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/14
 * @description 代码风格格式化
 */
/* eslint no-unused-vars: "warn" */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { execa } from 'execa';
import * as pkg from '../package-manager.js';
import { findConfigUp } from '../utils.js';

let __dirname;
try {
  const __filename__ = url.fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename__);
} catch (error) {
  console.error(error);
}

const here = (p) => path.join(__dirname, p);
const hereRelative = (p) => here(p).replace(process.cwd(), '.');

const rootRelative = (p) => path.resolve(p).replace(process.cwd(), '.');

const existUserConfig = () =>
  !!findConfigUp(['.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.yaml', '.eslintrc.yml', '.eslintrc.json']);

const existUserIgnore = () => findConfigUp(['.eslintignore']);

const command = {
  command: 'lint-es [files...]',
  description: '使用【eslint】进行代码质量检查',

  builder: (yargs) => {
    return yargs.positional('files', {
      description: '执行检测的代码目录或文件',
    });
  },

  handler: async (argv) => {
    let args = process.argv.slice(3);

    const params = [];

    // --config
    {
      const useUserConfig = argv.config || pkg.hasFieldKey('eslintConfig') || existUserConfig();
      // --no-eslintrc
      const noEslintrc = argv.eslintrc === false || argv['no-eslintrc'];

      params.push(...(useUserConfig ? [] : ['--config', hereRelative('../config/eslint.cjs')]));
    }

    // --ignore-path
    {
      const useUserIgnore = argv['ignore-path'] || existUserIgnore();
      params.push(...(useUserIgnore ? [] : ['--ignore-path', hereRelative('../config/eslintignore')]));
    }

    // --ext
    {
      params.push(...(argv.ext ? [] : ['--ext', 'js,jsx,ts,tsx']));
    }

    // --cache
    {
      const enable = argv.cache;
      const location = argv.cacheLocation || argv['cache-location'];

      if (enable && !location) {
        params.push('--cache-location', pkg.resolvePath('node_modules/.cache'));
      }
    }

    // --print-config
    {
      const printConfig = argv.printConfig || argv['print-config'];

      if (printConfig !== undefined && argv.files.length) {
        // 剔除需要检查的文件或目录
        args = args.filter((a) => !argv.files.includes(a));
      }
    }

    // 其他参数
    // params.push(...args.map((arg) => arg.replace(`${process.cwd()}/`, '')));
    if (argv.files.length) {
      const extensions = (argv.ext || 'js,jsx,ts,tsx').split(',');
      params.push(...args.filter((a) => !argv.files.includes(a) || extensions.some((e) => a.endsWith(e))));
    }

    // files...
    {
      params.push(...(argv.files.length ? [] : ['.']));
    }

    await execa('eslint', params, {
      verbose: true,
      preferLocal: true,
      localDir: path.resolve(__dirname, '../..'),
      stderr: process.stderr,
      stdin: process.stdin,
      stdout: process.stdout,
    });
  },
};

export default command;
