/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/19
 * @description 自定义脚本
 */

const command = 'sample <path>';
const description = 'Your sample script';

const builder = function (yargs) {
  return yargs.positional('path', {
    describe: 'the required args <path>',
    type: 'string',
  });
};

const handler = async function (argv) {
  console.log('Execution custom command!!');
  console.log(argv);
};

module.exports = { command, description, builder, handler };
