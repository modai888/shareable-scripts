/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/19
 * @description 自定义脚本
 */

module.exports = (command) => {
  command
    .name('sample')
    .description('The sample command loaded from relative config file.')
    .option('--debug', 'display detail log')
    .action(() => {
      console.log('execute sample command !!!');
    });

  return command;
};
