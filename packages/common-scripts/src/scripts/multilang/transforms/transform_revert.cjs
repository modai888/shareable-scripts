/**
 * https://astexplorer.net/
 * @param {Object} fileInfo 处理文件的信息
 * @param {Object} api jscodeshift 所有的 api，这部分会在源码解析部分详细说明
 * @param {Object} options CLI 传入的参数
 * @returns {string} 生成的代码
 */
const babylon = require('@babel/parser');

/**
 * 恢复templateByUuid替换代码
 */
module.exports = (fileInfo, api, options) => {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  const targets = root.find(j.CallExpression, {
    callee: { type: 'MemberExpression', property: { name: 'templateByUuid' } },
  });

  if (targets.size() > 0) {
    let transformed = true;
    targets.forEach((path) => {
      const value = path.value.arguments[1]?.value;
      const comments = path.value.comments?.filter((c) => c.value != value);
      if (comments == null) {
        // 查找父级
        let parent = path.parentPath;
        while (parent) {
          if (parent.value.comments?.filter((c) => c.value != value).length) {
            break;
          }

          parent = parent.parentPath;
        }

        if (parent) {
          parent.value.comments = parent.value.comments.filter((c) => {
            return c.type == 'CommentBlock' && c.value.split(/\s*"\s*/)?.[1] != value;
          });
        }
      }

      j(path).replaceWith(j.stringLiteral(value));
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
