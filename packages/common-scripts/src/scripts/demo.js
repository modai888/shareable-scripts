/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/15
 * @description 构建分发
 */
// import { execa } from "execa";

export const command = 'command-demo <arg01> <arg02> [arg03] [args..]';
export const alias = ['demo001', 'demo002'];
export const description = '';

export const builder = (yargs) => {
  return yargs
    .options({
      foo: {
        alias: ['f', 'fooo'],
        description: 'option foo',
      },

      bar: {
        alias: ['b', 'barr'],
        description: 'option bar',
        choices: ['1', '2', '3'],
      },
    })
    .positional('arg01', {
      describe: 'the required string-argument arg01',
      type: 'string',
    })
    .positional('arg02', {
      describe: 'the required number-argument arg01',
      type: 'number',
    })
    .positional('arg03', {
      describe: 'the optional boolean-argument arg01, default false',
      //   default: false,
      type: 'boolean',
    })
    .positional('args', {
      description: 'the variadic args...',
    });
};

export const handler = async (argv) => {
  console.log('Execution demo command!!');
  console.log(argv);
};
