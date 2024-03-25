/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/19
 * @description helpers
 */
import fs from 'node:fs';
import { findUpSync } from 'find-up';

export function findPackageUp(options = { cwd: process.cwd() }) {
  const packageFile = findUpSync('package.json', { ...options });
  if (!packageFile) {
    throw new Error('No package.json file');
  }

  const packageJson = JSON.parse(fs.readFileSync(packageFile, { encoding: 'utf-8' }));
  return { packageJson, path: packageFile };
}

export function findConfigUp(configs, options = { cwd: process.cwd() }) {
  const config = findUpSync(configs, { ...options });
  return config;
}

const _propReg = /[[\]."']+/g;
// a["b-prop"].c["d.dd"] ==> a(●●)b-prop(●●)c(●●)d.dd ==> ["a", "b-props", "c", "d.dd"]
const arrifyProp = (prop) => prop.replace(_propReg, '(●●)').split('(●●)').filter(Boolean);

/**
 * 获取指定属性路径上的值
 *
 * @example
 * getPropValue({ a: { b: { c: 1 } } }, 'a.b.c')
 */
export function getPropValue(obj, prop) {
  if (!obj || !prop) return undefined;

  const props = arrifyProp(prop);
  if (!props.length) return undefined;

  let target = obj;
  for (let i = 0; i < props.length; i++) {
    if (!target || target[props[i]] === undefined) {
      return undefined;
    }

    target = target[props[i]];
  }

  return target;
}

/**
 * 按指定的属性路径进行赋值
 *
 * @example
 * setPropValue({ }, 'a.b.c', 1)
 */
export function setPropValue(obj, prop, value) {
  if (!prop) return false;

  const props = arrifyProp(prop);
  if (!props.length) return false;

  let target = obj || {};
  let i = 0;
  for (; i < props.length - 1; i++) {
    if (target[props[i]] == null) {
      target[props[i]] = {};
    }

    target = target[props[i]];
  }

  target[props[i]] = value;

  return true;
}

/**
 * 查找指定属性路径是否存在
 *
 * @example
 * getPropValue({ a: { b: { c: 1 } } }, 'a.b.c')
 */
export const hasProp = (obj, prop) => {
  return getPropValue(obj, prop) !== undefined;
};
