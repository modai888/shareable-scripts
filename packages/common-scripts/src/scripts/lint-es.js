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
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.yaml',
  '.eslintrc.yml',
  '.eslintrc.json',
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

// program

function collectCommaOptionArgs(value, previous) {
  return previous.concat(value.split(','));
}

function collectOptionArgs(value, previous) {
  return previous.concat(value);
}

function integerOptionArgs(value) {
  return parseInt(value, 10);
}

const program = new commander.Command();

program
  .addArgument(new commander.Argument('[files...]', 'file/dir/glob ... to lint'))
  .usage('[options] [file/dir/glob ...]')
  .summary('Lint your source code')
  .description('Lint your source code with eslint and will-designed configration')
  .version(`eslint ${execute('eslint --version')}`)
  // Basic configuration:
  .addOption(new commander.Option('--no-eslintrc').hideHelp())
  .addOption(new commander.Option('-c, --config <path>').hideHelp())
  .addOption(new commander.Option('--env [env]').hideHelp().default([]).argParser(collectCommaOptionArgs))
  .addOption(new commander.Option('--ext [ext]').hideHelp().default([]).argParser(collectCommaOptionArgs))
  .addOption(new commander.Option('--global [global]').hideHelp().default([]).argParser(collectCommaOptionArgs))
  .addOption(new commander.Option('--parser <parser>').hideHelp())
  .addOption(new commander.Option('--parser-options <object>').hideHelp().default([]).argParser(collectOptionArgs))
  .addOption(new commander.Option('--resolve-plugins-relative-to').hideHelp())
  // Specify Rules and Plugins:
  .addOption(new commander.Option('--plugin [plugin]').hideHelp().default([]).argParser(collectOptionArgs))
  .addOption(new commander.Option('--rule <rule>').hideHelp().default([]).argParser(collectOptionArgs))
  .addOption(new commander.Option('--ruledir [path]').hideHelp().default([]).argParser(collectOptionArgs))
  // Fix Problems:
  .addOption(new commander.Option('--fix').hideHelp())
  .addOption(new commander.Option('--fix-dry-run').hideHelp())
  .addOption(
    new commander.Option('--fix-type')
      .hideHelp()
      .default([])
      .choices(['directive', 'problem', 'suggestion', 'layout'])
      .argParser(collectCommaOptionArgs)
  )
  // Ignore Files:
  .addOption(new commander.Option('--ignore-path <path>').hideHelp())
  .addOption(new commander.Option('--no-ignore').hideHelp())
  .addOption(new commander.Option('--ignore-pattern <pattern>').hideHelp().default([]).argParser(collectOptionArgs))
  // Use stdin:
  .addOption(new commander.Option('--stdin').hideHelp())
  .addOption(new commander.Option('--stdin-filename <path>').hideHelp())
  // Handle Warnings:
  .addOption(new commander.Option('--quiet').hideHelp())
  .addOption(new commander.Option('--max-warnings <number>').hideHelp().default(-1).argParser(integerOptionArgs))
  // Output:
  .addOption(new commander.Option('-o, --output-file <path>').hideHelp())
  .addOption(new commander.Option('-f, --format <format>').hideHelp().default('stylish'))
  .addOption(new commander.Option('--color').hideHelp())
  .addOption(new commander.Option('--no-color').hideHelp())
  // Inline configuration comments:
  .addOption(new commander.Option('--no-inline-config').hideHelp())
  .addOption(new commander.Option('--report-unused-disable-directives').hideHelp())
  .addOption(new commander.Option('--report-unused-disable-directives-severity <severity>').hideHelp())
  // Caching:
  .addOption(new commander.Option('--cache').hideHelp().default(false))
  .addOption(new commander.Option('--cache-file <file>').hideHelp())
  .addOption(new commander.Option('--cache-location <path>').hideHelp())
  .addOption(new commander.Option('--cache-strategy <metadata|content>').hideHelp().choices(['metadata', 'content']))
  // Miscellaneous:
  .addOption(new commander.Option('--init').hideHelp())
  .addOption(new commander.Option('--env-info').hideHelp())
  .addOption(new commander.Option('--no-error-on-unmatched-pattern').hideHelp())
  .addOption(new commander.Option('--exit-on-fatal-error').hideHelp())
  .addOption(new commander.Option('--debug').hideHelp())
  .addOption(new commander.Option('--print-config <path>').hideHelp())

  .action(action);

program.on('--help', function () {
  console.log('\n================ ESLINT HELP ================\n');
  console.log(execute('eslint --help'));
});

program.parseAsync(process.argv);

async function action(files, options, command) {
  const existUserConfig = () => !!findConfigUp(_CONFIG_FILES);
  const existUserIgnore = () => findConfigUp(['.eslintignore']);

  let lintFiles = [...files];

  const createMultiOptionArgv = (optionKey, comma) => {
    return (key, option, value) => {
      if (!value?.length) return;

      if (comma) return [optionKey, value.join(',')];

      return value.reduce((params, v) => (params.push([optionKey, v]), params), []);
    };
  };

  const params = toArgv(command, {
    '--config': (key, option, value) => {
      if (value) return ['--config', value];

      if (!pkg.hasFieldKey('eslintConfig') && !existUserConfig()) {
        return ['--config', hereRelative('../config/eslint.cjs')];
      }
    },

    '--resolve-plugins-relative-to': (key, option, value) => {
      if (!value) {
        return ['--resolve-plugins-relative-to', hereRelative('../config')];
      }
    },

    '--ignore-path': (key, option, ignore) => {
      if (ignore) return ['--ignore-path', ignore];

      const useUserConfig = existUserIgnore();

      // add default prettierignore
      if (!useUserConfig) {
        return ['--ignore-path', hereRelative('../config/eslintignore')];
      }
    },

    '--ext': (key, option, extensions) => {
      extensions = extensions?.length ? extensions : ['.js', '.jsx', '.ts', '.tsx'];

      lintFiles = lintFiles.filter((a) => !path.extname(a) || extensions.some((e) => a.endsWith(e)));
      return ['--ext', extensions.join(',')];
    },

    '--cache': (key, option, value) => {
      if (value && !options.cacheLocation) {
        return ['--cache-location', pkg.resolvePath('node_modules/.cache')];
      }
    },

    '--env': createMultiOptionArgv('--env', true),
    '--global': createMultiOptionArgv('--global', true),
    '--fix-type': createMultiOptionArgv('--global', true),
    '--parser-options': createMultiOptionArgv('--parser-options'),
    '--plugin': createMultiOptionArgv('--plugin'),
    '--ignore-pattern': createMultiOptionArgv('--ignore-pattern'),
    '--rule': createMultiOptionArgv('--plugin'),
    '--ruledir': createMultiOptionArgv('--ruledir'),
  });

  // files
  {
    const notMatchedFiles = files.length && !lintFiles.length;
    params.push(...(options.printConfig || notMatchedFiles ? [] : lintFiles.length ? [...lintFiles] : ['.']));
  }

  //   console.log('params: ', params);
  //   return;

  await execa('eslint', params, {
    verbose: true,
    preferLocal: true,
    localDir: path.resolve(__dirname, '../..'),
    stderr: process.stderr,
    stdin: process.stdin,
    stdout: process.stdout,
  });
}
