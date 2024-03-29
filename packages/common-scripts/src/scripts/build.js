/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/15
 * @description 构建分发
 */
import { commander } from '@shareable-scripts/core';

const program = new commander.Command();

program
  .name('build')
  .description('Compile and bundle your source code.')
  .option('--bundle', 'bundle compible output, default false', false)
  .allowUnknownOption()
  .action(action);

async function action(options, command) {
  const buildScript = options.bundle ? './build/rollup' : './build/babel.js';
  return import(buildScript).then((mod) => {
    return mod.run(command.args);
  });
}

export default program;
