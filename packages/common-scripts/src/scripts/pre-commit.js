/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/14
 * @description 代码风格格式化
 */
/* eslint no-unused-vars: "warn" */
import path from 'node:path';
import url from 'node:url';
import { commander, toArgv } from '@shareable-scripts/core';
import { execa, execaCommandSync } from 'execa';
import { findConfigUp } from '../utils.js';
import * as pkg from '../package-manager.js';

let __dirname;
{
  try {
    const __filename__ = url.fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename__);
  } catch (error) {
    console.error(error);
  }
}

const _CONFIG_FILES = [
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
];

// const _IGNORE_FILES = ['.gitignore', '.eslintignore'];

const execute = (command) => {
  const { stdout } = execaCommandSync(command, {
    encoding: 'utf8',
    preferLocal: true,
    localDir: path.resolve(__dirname, '../..'),
  });

  return stdout;
};

const here = (p) => path.join(__dirname, p);
const hereRelative = (p) => here(p).replace(process.cwd(), '.');
// const rootRelative = (p) => path.resolve(p).replace(process.cwd(), '.');

// programe

// function collectCommaOptionArgs(value, previous) {
//   return previous.concat(value.split(','));
// }

// function collectOptionArgs(value, previous) {
//   return previous.concat(value);
// }

// function integerOptionArgs(value) {
//   return parseInt(value, 10);
// }

function concurrentOptionArgs(value) {
  console.log('concurrent ', value);
  if (value === 'false') return false;

  return parseInt(value, 10);
}

const program = new commander.Command();

program
  .usage('[options]')
  .summary('Run tasks for git-staged files')
  .description('Run tasks for git-staged files and will-designed configration')
  .version(`lint-staged ${execute('lint-staged --version')}`)

  .addOption(new commander.Option('--no-lint', 'do not eslint your code'))
  .addOption(new commander.Option('--no-multilang', 'do not fix multilang extraction problems in your code'))

  .addOption(new commander.Option('--allow-empty').hideHelp().default(false))
  .addOption(new commander.Option('-p, --concurrent [number]').hideHelp().default(true).argParser(concurrentOptionArgs))
  .addOption(new commander.Option('-c, --config <path>').hideHelp())
  .addOption(new commander.Option('--cwd [path]').hideHelp())
  .addOption(new commander.Option('-d, --debug').hideHelp())
  .addOption(new commander.Option('--no-stash').hideHelp())
  .addOption(new commander.Option('--no-hide-partially-staged').hideHelp())
  .addOption(new commander.Option('--diff [string]').hideHelp().implies({ stash: false }))
  .addOption(new commander.Option('--diff-filter [string]').hideHelp())
  .addOption(new commander.Option('--max-arg-length [number]').hideHelp().default(0))
  .addOption(new commander.Option('-q, --quiet').hideHelp().default(false))
  .addOption(new commander.Option('-r, --relative').hideHelp().default(false))
  .addOption(new commander.Option('-x, --shell [path]').hideHelp().default(false))
  .addOption(new commander.Option('-v, --verbose').hideHelp().default(false))

  .action(action);

program.on('--help', function () {
  console.log('\n================ LINT-STAGED HELP ================\n');
  console.log(execute('lint-staged --help'));
});

program.parseAsync(process.argv);

async function action(options, command) {
  const toArgvIgnore = () => null;
  const existUserConfig = () => !!findConfigUp(_CONFIG_FILES, { stopAt: process.cwd() });

  let configFile = null;

  const params = toArgv(command, {
    '--config': (key, option, value) => {
      if (value) {
        if (/\.(m|c)?js$/.test(value)) {
          configFile = value;
          value = '-';
        }
        return ['--config', value];
      }

      if (!pkg.hasFieldKey('lint-staged') && !existUserConfig()) {
        configFile = here('../config/lintstaged.cjs');
        return ['--config', '-'];
      }
    },

    '--no-lint': toArgvIgnore,
    '--no-multilang': toArgvIgnore,
  });

  let input;
  // 支持将argv参数传入到../config/lintstaged.cjs默认配置
  if (configFile) {
    if (options.multilang && !findConfigUp(['multilangconfig.properties'])) {
      process.argv.push('--no-multilang');
    }
    const config = await import(url.pathToFileURL(configFile));
    input = JSON.stringify(config.default ?? config);
  }

  await execa('lint-staged', params, {
    verbose: true,
    preferLocal: true,
    localDir: path.resolve(__dirname, '../..'),
    stderr: 'inherit',
    // stdin: input ? null : 'inherit',
    stdout: 'inherit',
    input: input,
  });
}
