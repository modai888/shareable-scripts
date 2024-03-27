/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/14
 * @description 代码风格格式化
 */
/* eslint no-unused-vars: "warn" */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { $, execa } from 'execa';
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

const hasUserConfig = () =>
  !!findConfigUp([
    '.prettierrc',
    '.prettierrc.json',
    '.prettierrc.yml',
    '.prettierrc.yaml',
    '.prettierrc.json5',
    '.prettierrc.js',
    '.prettierrc.config.js',
    '.prettierrc.mjs',
    '.prettierrc.config.mjs',
    '.prettierrc.cjs',
    '.prettierrc.config.cjs',
    '.prettierrc.toml',
  ]);

const hasUserIgnoreConfig = () => findConfigUp(['.prettierignore']);

const command = {
  command: 'format [files..]',
  description: '使用【prettier】进行代码格式化',

  builder: (yargs) => {
    return yargs.positional('files', {
      description: '执行格式化的目录/文件',
    });
  },

  handler: async (argv) => {
    let args = process.argv.slice(3);

    const params = [];

    // files
    {
      if (argv.files.length) {
        args = args.filter((a) => !argv.files.includes(a));
      }

      const findConfigPath = argv.findConfigPath || argv['find-config-path'];
      const files = findConfigPath
        ? []
        : argv.files.length
          ? [...argv.files]
          : ['**/*.+(js|jsx|json|yml|yaml|css|less|scss|ts|tsx|md|gql|graphql|mdx|vue)'];

      params.push(...files);
    }

    // --config
    {
      const noConfig = argv.config === false || argv['no-config'];
      const useUserConfig = argv.config || pkg.hasFieldKey('perttier') || hasUserConfig();
      params.push(...(useUserConfig || noConfig ? [] : ['--config', hereRelative('../config/prettier.cjs')]));
    }

    // --ignore-path
    {
      const useUserIgnoreConfig = argv['ignore-path'] || hasUserIgnoreConfig();
      // const ignore = useUserIgnoreConfig ? [] : ['--ignore-path', hereRelative('../config/prettierignore')];
      //   params.push(...(useUserIgnoreConfig ? [] : ['--ignore-path', hereRelative('../config/prettierignore')]));
      if (!useUserIgnoreConfig) {
        params.push('--ignore-path', hereRelative('../config/prettierignore'));

        const gitignore = path.resolve('.gitignore');
        if (fs.existsSync(gitignore)) {
          params.push('--ignore-path', rootRelative('.gitignore'));
        }
      }
    }

    // --write
    {
      const noWrite = argv.write == false || argv['no-write'];
      const debugCheck = argv.debugCheck || argv['debug-check'];
      const write = noWrite || debugCheck != null ? [] : ['--write'];

      params.push(...write);
    }

    // 其他参数
    // const args = process.argv.slice(3).map((arg) => arg.replace(`${process.cwd()}/`, ''));
    params.push(...args.map((arg) => arg.replace(`${process.cwd()}/`, '')));

    // await execa('where', ['prettier'], {
    //   preferLocal: true,
    //   localDir: path.resolve(__dirname, '../..'),
    //   verbose: true,
    //   stderr: process.stderr,
    //   stdin: process.stdin,
    //   stdout: process.stdout,
    // });

    await execa('prettier', params, {
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
