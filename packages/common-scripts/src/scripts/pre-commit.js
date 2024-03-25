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
  !!findConfigUp([
    '.lintstagedrc',
    '.lintstagedrc.json',
    '.lintstagedrc.yaml',
    '.lintstagedrc.yml',
    '.lintstagedrc.js',
    '.lintstagedrc.mjs',
    '.lintstagedrc.cjs',
    'lint-staged.config.js',
    'lint-staged.config.mjs',
    'lint-staged.config.cjs',
  ]);

const existUserIgnore = () => findConfigUp(['.eslintignore']);

const command = {
  command: 'pre-commit',
  description: '基于git钩子【pre-commit】执行代码提交前校验',

  builder: (yargs) => {
    // return yargs.positional('files', {
    //   description: '执行检测的代码目录或文件',
    // });

    yargs.options({
      c: {
        alias: ['config'],
        description: 'path to configuration file, or - to read from stdin',
      },
    });
  },

  handler: async (argv) => {
    let args = process.argv.slice(3);

    const params = [];

    // --config
    {
      const useUserConfig = argv.config || pkg.hasFieldKey('lint-staged') || existUserConfig();

      params.push(...(useUserConfig ? [] : ['--config', hereRelative('../config/lintstaged.cjs')]));
    }

    // 其他参数
    params.push(...args.map((arg) => arg.replace(`${process.cwd()}/`, '')));

    await execa('lint-staged', params, {
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
