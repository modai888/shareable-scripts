/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/28
 * @description 提供脚本测试
 */
import path from 'node:path';
import { Command } from 'commander';
import { Script } from './config/config';

export type RegistrableCommand = {
  base?: string;
  command: Script;
};

/**
 * 注册自定义命令
 */
export const registerCommands = (commands: RegistrableCommand[], program?: Command) => {
  program = program ?? new Command();

  let current: RegistrableCommand | undefined;

  try {
    commands.map(({ base, command }) => {
      current = { base, command };
      base = base ?? process.cwd();

      //   base = base.replace(`${process.cwd()}/`, "");

      if (command instanceof Command) {
        program!.addCommand(command);
        return;
      }

      if (typeof command === 'function') {
        const cmd = new Command();
        command(cmd);
        program!.addCommand(cmd);
        return;
      }

      if (command.description) {
        program!.command(command.nameAndArgs, command.description, {
          executableFile: path.resolve(base, command.executableFile),
          hidden: command.hidden,
          isDefault: command.isDefault,
        });
      }
    });
  } catch (error) {
    throw new Error(`Command [from "${current?.base}"] register error: ${(error as Error).message}`);
  }

  return program;
};

/**
 * 开发阶段测试运行本地命令
 */
export const run = async (commands: Script[]) => {
  const program = new Command();
  const name = path.basename(process.argv[1]);

  const examples = `
Examples:
  $ ${name} --help
  $ ${name} help
  $ ${name} [command] --help
  $ ${name} help [command]
`;

  program
    .name(name)
    .usage('[command]')
    .description('Run and test your local scripts')
    .allowUnknownOption(true)
    .enablePositionalOptions()

    .showHelpAfterError('(add --help for additional information)')
    // .helpCommand(false)
    .addHelpCommand(false)
    .addHelpText('after', examples)
    .configureHelp({
      subcommandTerm(cmd) {
        return cmd.name();
      },
    });

  registerCommands(
    commands.map((command) => ({ command })),
    program
  );

  await program.parseAsync();
};
