/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/18
 * @description Default babel config
 */
import module from 'node:module';

const _require = typeof require !== 'undefined' ? require : module.createRequire(import.meta.url);

export default (api) => {
  api.cache(true);

  return {
    presets: [
      [
        _require.resolve('@babel/preset-env'),
        {
          modules: false,
          loose: false,
          targets: {
            node: '14',
          },
        },
      ],
    ],
    // plugins: [],
  };
};
