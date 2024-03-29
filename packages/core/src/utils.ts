/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/28
 * @description 将command解析的options还原为命令行选项
 */
import { Command, Option, OptionValueSource } from 'commander';

export type ToArgvVisitor = {
  [key: string]: (
    key: string,
    option: Option,
    value: any,
    valueSource: OptionValueSource
  ) => [string, string][] | [string, string] | undefined;
};

function capitalize(word: string) {
  return word.slice(0, 1).toUpperCase() + word.slice(1);
}

export function toArgv(command: Command, visitor?: ToArgvVisitor) {
  const params: string[] = [];

  const parseKey = (option: Option) => {
    const key = option.long || option.short;

    if (!key) return null;

    let parties = key.split(/[-]+/g).filter((_) => !!_);
    if (option.negate) {
      parties = parties.slice(1);
    }

    return [parties[0]].concat(parties.slice(1).map(capitalize)).join('');
  };

  const push = (option: Option, ...pairs: ([string, string] | [string])[]) => {
    if (!pairs.length) return;

    for (let [key, value] of pairs) {
      if (!key) continue;

      params.push(key);
      value !== undefined && params.push(value);
    }
  };

  for (let option of command.options) {
    const key = parseKey(option);
    const optionKey = (option.long || option.short)!;

    if (key == null) {
      console.warn(`Failed to parse key from option "${option.flags}"`);
      continue;
    }

    const value = command.getOptionValue(key);
    const valueSource = command.getOptionValueSource(key);

    if (visitor?.[optionKey]) {
      let p = visitor[optionKey](key, option, value, valueSource);
      if (p && Array.isArray(p) && p.length) {
        if (!Array.isArray(p[0])) {
          p = [p as [string, string]];
        }

        push(option, ...(p as [string, string][]));
      }

      continue;
    }

    //

    // 未传参/参数值来自默认值
    if (value === undefined) continue;
    if (valueSource === 'default') continue;

    if (option.negate) {
      if (value !== false) continue;
      push(option, [optionKey]);
      continue;
    }

    // 布尔参数
    if (option.isBoolean()) {
      push(option, [optionKey]);
      continue;
    }

    // 可选参数
    // --filter [path]
    if (option.optional && value == true) {
      push(option, [optionKey]);
      continue;
    }

    push(option, [optionKey, value]);
  }

  return params;
}
