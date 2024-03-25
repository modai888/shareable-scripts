/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/19
 * @description 包操作
 */
import fs from 'node:fs';
import path from 'node:path';
import testEngines from 'check-engines';
import { findPackageUp, hasProp } from './utils.js';

const pkg = findPackageUp();

export const applicationRoot = path.dirname(pkg.path);

/**
 * 检查engines是否满足
 */
export const checkEngines = (json) => {
  return new Promise((resolve, reject) => {
    testEngines(json || pkg.packageJson, (error, info) => {
      error ? reject(error) : resolve(info);
    });
  });
};

/**
 * 更新package.json文件
 */
export const updateJson = (update) => {
  update = typeof update === 'function' ? update : () => null;
  const ret = update(pkg.packageJson);

  if (ret === true) {
    fs.writeFileSync(pkg.path, JSON.stringify(pkg.packageJson, null, /*/\t/.test(s) ? '\t' :*/ 2) + '\n');
  }
};

//
const fromRoot = (...p) => path.join(applicationRoot, ...p);

export const resolvePath = (...p) => fromRoot(...p);

export const fileExist = (file) => fs.existsSync(fromRoot(file));

/**
 * package.json是否存在属性字段
 */
export const hasFieldKey = (key) => hasProp(pkg.packageJson, key);

export const ifDep = (deps, t, f) => (deps.map((d) => `dependencies.${d}`).some((prop) => hasFieldKey(prop)) ? t : f);
// export const ifAnyDep = (deps, t, f)=> hasFieldKey
