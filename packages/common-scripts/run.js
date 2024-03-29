/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/15
 * @description run src/scripts
 */
import path from 'node:path';
import { run, registerCommands, commander } from '@shareable-scripts/core';

import prepare from './src/scripts/prepare.js';
import build from './src/scripts/build.js';

const scripts = [
  build,
  prepare,

  {
    nameAndArgs: 'pre-commit [options]',
    description: 'Lint your staged code before commiting.',
    executableFile: './src/scripts/pre-commit.js',
  },

  {
    nameAndArgs: 'format [options] [file/dir/glob...]',
    description: 'Format your source code with prettier.',
    executableFile: './src/scripts/format.js',
  },

  {
    nameAndArgs: 'lint-es [options] [file/dir/glob...]',
    description: 'Lint your source code with eslint.',
    executableFile: './src/scripts/lint-es.js',
  },
];

run(scripts);

const start = async () => {
  const program = new commander.Command();

  program
    .name(path.basename(process.argv[1]))
    // .usage('[command]')
    .description('Run and test your local scripts')
    .allowUnknownOption(true)
    .enablePositionalOptions()
    .showHelpAfterError('(add --help for additional information)')
    .helpCommand(false)
    .configureHelp({
      subcommandTerm(cmd) {
        return cmd.name();
      },
    });

  registerCommands(
    scripts.map((command) => ({ command })),
    program
  );

  await program.parseAsync();
};

// start();
