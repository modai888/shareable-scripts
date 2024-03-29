#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { commander, toArgv } from '@shareable-scripts/core';
import { execa, execaCommandSync } from 'execa';
import * as pkg from '../package-manager.js';
import { findConfigUp } from '../utils.js';

let __dirname;
{
  try {
    const __filename__ = url.fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename__);
  } catch (error) {
    console.error(error);
  }
}

const _PRETTIER_CONFIG_FILES = [
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
];

// const _PRETTIER_IGNORE_FILES = ['.gitignore', '.prettierignore'];

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
const rootRelative = (p) => path.resolve(p).replace(process.cwd(), '.');

// program

function collectOptionArgs(value, previous) {
  return previous.concat([value]);
}

function integerOptionArgs(value) {
  return parseInt(value, 10);
}

const program = new commander.Command();

program
  .addArgument(new commander.Argument('[files...]', 'file/dir/glob ... to format'))
  .usage('[options] [file/dir/glob ...]')
  .description('Format your source code with prettier and will-designed configration')
  .version(`prettier ${execute('prettier --version')}`)
  // Output options:
  .addOption(new commander.Option('-c, --check').hideHelp())
  .addOption(new commander.Option('-l, --list-different').hideHelp())
  .addOption(new commander.Option('--write').default(true).hideHelp())
  .addOption(new commander.Option('--no-write', 'Edit files in dry-run mode'))
  // Config options:
  .addOption(new commander.Option('--config <path>').hideHelp())
  .addOption(new commander.Option('--no-config', 'Do not look for a configuration file.').hideHelp())
  .addOption(
    new commander.Option('--config-precedence <cli-override|file-override|prefer-file>')
      .hideHelp()
      .default('cli-override')
      .choices(['cli-override', 'file-override', 'prefer-file'])
  )
  .addOption(new commander.Option('--no-editorconfig').hideHelp())
  .addOption(new commander.Option('--find-config-path <path>').hideHelp())
  .addOption(new commander.Option('--ignore-path <path>').hideHelp().default([]).argParser(collectOptionArgs))
  .addOption(new commander.Option('--plugin <path>').hideHelp().default([]).argParser(collectOptionArgs))
  .addOption(new commander.Option('--with-node-modules').hideHelp())
  // Editor options:
  .addOption(new commander.Option('--cursor-offset <int>').hideHelp().default(-1).argParser(integerOptionArgs))
  .addOption(new commander.Option('--range-end <int>').hideHelp().default(Infinity).argParser(integerOptionArgs))
  .addOption(new commander.Option('--range-start <int>').hideHelp().default(0).argParser(integerOptionArgs))
  // Other options
  .addOption(new commander.Option('--cache').hideHelp().default(false))
  .addOption(new commander.Option('--cache-location <path>').hideHelp())
  .addOption(new commander.Option('--cache-strategy <metadata|content>').hideHelp().choices(['metadata', 'content']))
  .addOption(new commander.Option('--no-color').hideHelp())
  .addOption(new commander.Option('--no-error-on-unmatched-pattern').hideHelp())
  .addOption(new commander.Option('--file-info <path>').hideHelp())
  .addOption(new commander.Option('-u, --ignore-unknown').hideHelp())
  .addOption(
    new commander.Option('--log-level <silent|error|warn|log|debug>')
      .hideHelp()
      .default('log')
      .choices(['silent', 'error', 'warn', 'log', 'debug'])
  )
  .addOption(new commander.Option('--require-pragma').hideHelp())
  .addOption(new commander.Option('--stdin-filepath <path>').hideHelp())
  .addOption(new commander.Option('--support-info').hideHelp())

  .action(action);

program.on('--help', function () {
  console.log('\n================ PRETTIER HELP ================\n');
  console.log(execute('prettier --help'));
});

// program.configureHelp({
//   formatHelp(cmd, helper) {
//     return execute('prettier --help');
//   },
// });

program.parseAsync(process.argv);

async function action(files, options, command) {
  const hasUserConfig = () => !!findConfigUp(_PRETTIER_CONFIG_FILES);
  const hasUserIgnoreConfig = () => findConfigUp(['.prettierignore']);

  const params = toArgv(command, {
    '--write': (key, option, value) => {
      // --no-write
      if (value === false) return;
      return ['--write'];
    },

    '--no-write': () => {
      return;
    },

    '--config': (key, option, value) => {
      // --no-config
      if (value === false) return;

      if (value) return ['--config', value];

      if (!pkg.hasFieldKey('perttier') && !hasUserConfig()) {
        return ['--config', hereRelative('../config/prettier.cjs')];
      }
    },

    '--ignore-path': (key, option, ignores) => {
      const useUserConfig = ignores.length || hasUserIgnoreConfig();

      // add gitignore
      if (!ignores.some((ignore) => ignore.endWith('.gitignore'))) {
        const gitignore = path.resolve('.gitignore');
        if (fs.existsSync(gitignore)) {
          ignores.push(rootRelative('.gitignore'));
        }
      }

      // add default prettierignore
      if (!useUserConfig) {
        ignores.push(hereRelative('../config/prettierignore'));
      }

      return ignores.map((ignore) => ['--ignore-path', ignore]);
    },

    '--plugin': (key, option, value) => {
      return value.reduce((params, v) => (params.push(['--plugin', v]), params), []);
    },
  });

  // files
  {
    const _files = options.findConfigPath
      ? []
      : files.length
        ? [...files]
        : ['**/*.+(js|jsx|json|yml|yaml|css|less|scss|ts|tsx|md|gql|graphql|mdx|vue)'];

    params.push(..._files);
  }

  //   console.log('files: ', files);
  //   console.log('options: ', command.opts());
  //   console.log('args: ', command.args);
  //   console.log(params);

  await execa('prettier', params, {
    verbose: true,
    preferLocal: true,
    localDir: path.resolve(__dirname, '../..'),
    stderr: process.stderr,
    stdin: process.stdin,
    stdout: process.stdout,
  });
}

// function toArgv(command, visitor) {
//   const params = [];

//   const capitalize = (word) => word.slice(0, 1).toUpperCase() + word.slice(1);
//   const parseKey = (option) => {
//     const key = option.long || option.short;

//     if (!key) return null;

//     let parties = key.split(/[-]+/g).filter((_) => !!_);
//     if (option.negate) {
//       parties = parties.slice(1);
//     }

//     return [parties[0]].concat(parties.slice(1).map(capitalize)).join('');
//   };

//   const push = (option, ...pairs) => {
//     if (!pairs.length) return;

//     for (let [key, value] of pairs) {
//       if (!key) continue;

//       params.push(key);
//       value !== undefined && params.push(value);
//     }
//   };

//   for (let option of command.options) {
//     const key = parseKey(option);
//     const optionKey = option.long || option.short;

//     if (key == null) {
//       console.warn(`Failed to parse key from option "${option.flags}"`);
//       continue;
//     }

//     const value = command.getOptionValue(key);
//     const valueSource = command.getOptionValueSource(key);

//     if (visitor?.[optionKey]) {
//       let p = visitor[optionKey](key, option, value, valueSource);
//       if (p && Array.isArray(p) && p.length) {
//         if (!Array.isArray(p[0])) {
//           p = [p];
//         }

//         push(option, ...p);
//       }

//       continue;
//     }

//     //

//     // 未传参/参数值来自默认值
//     if (value === undefined) continue;
//     if (valueSource === 'default') continue;

//     if (option.negate) {
//       if (value !== false) continue;
//       push(option, [optionKey]);
//       continue;
//     }

//     // 布尔参数
//     if (option.isBoolean()) {
//       push(option, [optionKey]);
//       continue;
//     }

//     push(option, [optionKey, value]);
//   }

//   return params;
// }
