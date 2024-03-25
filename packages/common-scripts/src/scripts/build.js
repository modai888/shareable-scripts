/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/15
 * @description 构建分发
 */
// import { execa } from "execa";

// const here = (p) => new URL(p, import.meta.url);

const command = {
  command: 'build',
  description: '构建代码',

  builder: (yargs) => {
    return yargs.options({
      bundle: {
        description: '是否需要对编译产物进行打包',
        type: 'boolean',
      },
    });
  },

  handler: async (argv) => {
    const buildScript = argv.bundle ? './build/rollup' : './build/babel.js';
    return import(buildScript).then((mod) => {
      return mod.run(argv);
    });
  },
};

export default command;
