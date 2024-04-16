/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/26
 * @description shareable-scripts
 */
import url from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { commander, createConfigResolver, registerCommands } from '@shareable-scripts/core';

let __dirname: string;
try {
  const __filename = url.fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (error) {
  console.error(error);
}

const COMMAND_NAME = 'shareable-scripts';

const examples = `
Examples:
  $ ${COMMAND_NAME} --help
  $ ${COMMAND_NAME} help
  $ ${COMMAND_NAME} [command] --help
  $ ${COMMAND_NAME} help [command]
`;

export async function run() {
  const pkgfile = path.join(__dirname, '../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgfile, { encoding: 'utf-8' }));

  const program = new commander.Command();

  program.name(COMMAND_NAME).usage('[command]').description('Run and share your scripts').version(pkg.version);

  // 解析配置
  const resolver = createConfigResolver({
    configFiles: ['scripts.config', 'shareable-scripts.config'],
  });

  const config = await resolver.resolve();

  registerCommands(
    config?.scripts?.map((script) => {
      const base = path.dirname(script.scriptConfigFile);
      const command = script.script;

      return { base, command };
    }) ?? [],
    program
  );

  program
    // .helpCommand(false)
    .addHelpCommand(false)
    .allowUnknownOption(true)
    .showHelpAfterError('(add --help for additional information)')
    .addHelpText('after', examples)
    .configureHelp({
      subcommandTerm(cmd) {
        return cmd.name();
      },
    });

  await program.parseAsync();
}

run().catch((code) => {
  if (typeof code === 'number') {
    process.exit(code);
  } else {
    process.stderr.write(`Script "${process.argv[2]}" aborted with error:\n${String(code)}\n`);
    process.exit(2);
  }
});
