import yargs from 'yargs/yargs';
import { createConfigResolver } from './resolve-config.js';

export async function start() {
  process.stdout.columns = process.stdout.columns ?? 240;
  const args = process.argv.slice(2);
  const yarg = yargs(args);
  yarg.wrap(yarg.terminalWidth() ?? 120);

  // 解析配置
  const resolver = createConfigResolver({
    configFiles: ['scripts.config', 'shareable-scripts.config'],
  });

  const config = await resolver.resolve();
  const scripts = Object.keys(config!.scripts);

  for (const script of scripts) {
    const command = config!.scripts[script];

    /*eslint-disable-next-line*/
    const s = command.script as any;
    if (command.configuredBy.length) {
      s.description = `${s.description || s.describe || s.desc} -- ${command.configuredBy}`;
    }

    yarg.command(s);
  }

  yarg.usage('\nshareable-scripts [命令]');
  yarg.scriptName('');
  yarg.demandCommand(1, '\n请指定一个需要运行的命令');
  yarg.showHelpOnFail(false, '指定 --help 选项查看当前可用命令');
  yarg.help();

  yarg.parse();
}

start().catch((code) => {
  if (typeof code === 'number') {
    process.exit(code);
  } else {
    process.stderr.write(`Script "${process.argv[2]}" aborted with error:\n${String(code)}\n`);
    process.exit(2);
  }
});
