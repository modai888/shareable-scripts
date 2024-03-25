/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/20
 * @description eslint default configuration
 */
const readPkgUp = require('read-pkg-up');
const prettier = require('./prettier.cjs');

let hasReactDep = false;
try {
  const { packageJson } = readPkgUp.sync({ normalize: true });
  const allDeps = Object.keys({
    ...packageJson.peerDependencies,
    ...packageJson.devDependencies,
    ...packageJson.dependencies,
  });

  hasReactDep = allDeps.includes('react');
} catch (error) {
  // ignore error
}

module.exports = {
  extends: [
    require.resolve('@maltose888/eslint-config'),
    require.resolve('@maltose888/eslint-config/jest'),

    hasReactDep ? require.resolve('@maltose888/eslint-config/react') : null,
    hasReactDep ? require.resolve('@maltose888/eslint-config/jsx-a11y') : null,
    require.resolve('@maltose888/eslint-config/prettier'),
  ].filter(Boolean),

  rules: {
    'prettier/prettier': [
      'error',
      {
        ...prettier,
        usePrettierrc: true,
      },
    ],
  },
};
