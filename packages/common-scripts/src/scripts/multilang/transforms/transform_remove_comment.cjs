/**
 * https://astexplorer.net/
 * @param {Object} fileInfo 处理文件的信息
 * @param {Object} api jscodeshift 所有的 api，这部分会在源码解析部分详细说明
 * @param {Object} options CLI 传入的参数
 * @returns {string} 生成的代码
 */
const babylon = require('@babel/parser');

const trim = (val) => {
  return val?.replace(/^(?:\s+(?:"|')?)|(?:(?:"|')?\s+)$/g, '');
};

/**
 * templateByUuid去注释
 */
module.exports = (fileInfo, api, options) => {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  const targets = root.find(j.CallExpression, {
    callee: { type: 'MemberExpression', property: { name: 'templateByUuid' } },
  });

  if (targets.size() > 0) {
    let transformed = false;
    targets.forEach((path) => {
      const value = path.value.arguments[1]?.value;
      const comments = path.value.comments?.filter((c) => trim(c.value) == value);
      if (!comments?.length) {
        // 查找父级
        let findOk = false;
        let parent = path;
        while (parent.parentPath && parent.parentPath.name !== 'arguments') {
          parent = parent.parentPath;

          if (parent.value.comments?.filter((c) => trim(c.value) == value).length) {
            findOk = true;
            break;
          }

          // parent = parent.parentPath;
        }

        if (findOk) {
          transformed = true;
          parent.value.comments = parent.value.comments?.filter((c) => {
            return c.type == 'CommentBlock' && c.value.split(/\s*"\s*/)?.[1] != value;
          });
        }
      } else {
        transformed = true;
        path.value.comments = path.value.comments?.filter((c) => {
          return c.type == 'CommentBlock' && c.value.split(/\s*"\s*/)?.[1] != value;
        });
      }
    });

    if (transformed) {
      return root.toSource({ quote: 'single', tabWidth: 2 });
    }
  }

  return fileInfo.source;
};

module.exports.parser = {
  parse(code) {
    return babylon.parse(code, {
      // parse in strict mode and allow module declarations
      sourceType: 'module',
      allowHashBang: true,
      ecmaVersion: Infinity,
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      startLine: 1,
      tokens: true,

      plugins: [
        // enable jsx and flow syntax
        // 'estree',
        'jsx',
        'typescript',
        'asyncGenerators',
        'classProperties',
        'doExpressions',
        'exportExtensions',
        'functionBind',
        'functionSent',
        'objectRestSpread',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining',
        'decorators-legacy',
      ],
    });
  },
};
