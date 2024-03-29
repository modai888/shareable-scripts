/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/15
 * @description Babel构建
 */
import path from 'node:path';
import url from 'node:url';
import { createApplicationPackage } from '@shareable-scripts/core';
import { execa, execaCommandSync } from 'execa';
import * as pkg from '../../package-manager.js';

let __dirname;
{
  try {
    const __filename__ = url.fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename__);
  } catch (error) {
    console.error(error);
  }
}

const _CONFIG_FILES = [
  '.babelrc',
  '.babelrc.json',
  '.babelrc.js',
  '.babelrc.cjs',
  '.babelrc.mjs',
  '.babelrc.cts',
  'babel.config.json',
  'babel.config.js',
  'babel.config.cjs',
  'babel.config.mjs',
  'babel.config.cts',
];

const here = (p) => path.join(__dirname, p);
const hereRelative = (p) => here(p).replace(process.cwd(), '.');

const execute = (command) => {
  const { stdout } = execaCommandSync(command, {
    encoding: 'utf8',
    preferLocal: true,
    localDir: path.resolve(__dirname, '../..'),
  });

  return stdout;
};

const run = async (args) => {
  console.log('~~~~~~~~~~~~ BUILD WITH BABEL ~~~~~~~~~~~~');
  console.log('Where babel: ', execute('where babel'));

  const existUserConfig = () => !!findConfigUp(_CONFIG_FILES) && pkg.hasFieldKey('babel');

  if (!args.includes('--config-file') && !existUserConfig) {
    args.push('--config-file', here('../../config/babelrc.js'));
  }

  if (!args.includes('--out-dir')) {
    args.push('--out-dir', 'lib');
  }

  return execa('babel', [...args, 'src'], {
    verbose: true,
    preferLocal: true,
    localDir: path.resolve(__dirname, '../..'),
    stderr: 'inherit',
    stdin: 'inherit',
    stdout: 'inherit',
  });
};

export { run };
