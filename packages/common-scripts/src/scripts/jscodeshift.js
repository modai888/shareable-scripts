/**
 * @author wangxuebo@yonyou.com
 * @date 2024/04/02
 * @description 用友多语处理
 */
import path from 'node:path';
import url from 'node:url';
import { commander, execa } from '@ctp-fe-scripts/core';

let __dirname;
{
  try {
    const __filename__ = url.fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename__);
  } catch (error) {
    console.error(error);
  }
}

const execute = (command) => {
  const { stdout } = execa.execaCommandSync(command, {
    encoding: 'utf8',
    preferLocal: true,
    localDir: path.resolve(__dirname, '../..'),
  });

  return stdout;
};

const program = new commander.Command();

program
  .allowUnknownOption(true)
  .version(`jscodeshift ${execute('jscodeshift --version')}`)
  .action(action);

program.on('--help', function () {
  console.log('\n================ JSCODESHIFT HELP ================\n');
  console.log(execute('jscodeshift --help'));
});

program.parseAsync(process.argv);

async function action() {
  const params = process.argv.slice(2);

  await execa.execa('jscodeshift', params, {
    verbose: true,
    preferLocal: true,
    localDir: path.resolve(__dirname, '../..'),
    stderr: process.stderr,
    stdin: process.stdin,
    stdout: process.stdout,
  });
}
