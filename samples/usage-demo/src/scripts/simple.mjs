/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/19
 * @description 自定义脚本
 */
import { commander } from '@shareable-scripts/core';

const program = new commander.Command();

program
  .name('simple')
  .description('A simple demo command loaded from relative config file.')
  .option('--debug', 'display detail log')
  .action(() => {
    console.log('execute simple command !!!');
  });

export default program;
