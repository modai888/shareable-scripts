/**
 * https://astexplorer.net/
 * @param {Object} fileInfo 处理文件的信息
 * @param {Object} api jscodeshift 所有的 api，这部分会在源码解析部分详细说明
 * @param {Object} options CLI 传入的参数
 * @returns {string} 生成的代码
 */
const babylon = require('@babel/parser');

//
module.exports = (fileInfo, api, options) => {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  const targets = root
    .find(j.CallExpression, { callee: { type: 'MemberExpression', property: { name: 'templateByUuid' } } })
    .filter((path) => {
      const lines = path.value.loc.end.line - path.value.loc.start.line;

      return path.value.arguments[1].type === 'CallExpression';
    });

  if (targets.size() > 0) {
    targets.forEach((path) => {
      j(path).find(j.CallExpression).replaceWith(j.stringLiteral(path.node.arguments[1].arguments[1].value));
    });

    return root.toSource({});
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
