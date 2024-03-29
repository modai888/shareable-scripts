/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/20
 * @description eslint default configuration
 */
const path = require('path');
const semver = require('semver');
const readPkgUp = require('read-pkg-up');
const prettier = require('./prettier.cjs');

const read = (pkgname, options = {}) => {
  const pkg = readPkgUp.sync({
    cwd: !pkgname ? process.cwd() : path.dirname(require.resolve(pkgname, { paths: [process.cwd()] })),
    ...options,
  });

  return pkg;
};

const getOldestSupportedVersion = (dep) =>
  semver
    .validRange(dep)
    .replace(/[>=<|]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .sort(semver.compare)[0];

let isMDFApp = false;
// let isYNFApp = false;
let isReactApp = false;
let reactVersion = '16.8.0';

let hasPropTypes = false;

const own = Object.prototype.hasOwnProperty;

// parse react
try {
  const pkgs = [null, '@mdf/create-app/package.json'];

  for (let pkg of pkgs) {
    const { packageJson } = read(pkg, { normalize: true });

    const deps = {
      ...packageJson.peerDependencies,
      ...packageJson.devDependencies,
      ...packageJson.dependencies,
    };

    if (!isMDFApp && own.call(deps, '@mdf/create-app')) {
      isMDFApp = true;
    }

    if (!isReactApp && own.call(deps, 'react')) {
      isReactApp = true;

      hasPropTypes = own.call(deps, 'prop-types');
      reactVersion = getOldestSupportedVersion(deps['react']);

      break;
    }
  }
} catch (error) {
  // ignore error
}

const globals = {};
const rules = {
  ['prettier/prettier']: [
    'off',
    {
      ...prettier,
      usePrettierrc: true,
    },
  ],
};

if (isMDFApp) {
  globals.cb = 'readonly';
  globals.jDiwork = 'readonly';
  globals.lang = 'readonly';
}

if (isReactApp && !hasPropTypes) {
  rules['react/prop-types'] = 'off';
  rules['react/no-unused-prop-types'] = 'off';
  rules['react/forbid-foreign-prop-types'] = 'off';
  rules['react/default-props-match-prop-types'] = 'off';
}

module.exports = {
  globals,
  extends: [
    require.resolve('@shareable-scripts/eslint-config'),
    require.resolve('@shareable-scripts/eslint-config/jest'),

    isReactApp ? require.resolve('@shareable-scripts/eslint-config/react') : null,
    isReactApp ? require.resolve('@shareable-scripts/eslint-config/jsx-a11y') : null,
    require.resolve('@shareable-scripts/eslint-config/prettier'),
  ].filter(Boolean),

  settings: {
    react: {
      version: reactVersion,
    },
  },

  rules,
};
