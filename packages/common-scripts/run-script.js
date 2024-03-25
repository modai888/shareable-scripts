/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/15
 * @description run src/scripts
 */
// import parser from "yargs-parser";
import fs from 'node:fs';
import yargs from 'yargs';

(async function () {
  const scripts = fs
    .readdirSync('./src/scripts')
    .filter((fp) => /\.js$/.test(fp))
    .map((fp) => fp.split(/\.[^.]+$/, 1)[0]);

  // 注册命令
  const argv = yargs(process.argv.slice(2));
  argv.parserConfiguration({ 'populate--': true });

  for (let script of scripts) {
    const command = await import(`./src/scripts/${script}.js`);
    argv.command(command.default ? command.default : command);
  }

  argv.help().parse();
})();
