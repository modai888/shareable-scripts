/**
 * https://astexplorer.net/
 * @param {Object} fileInfo 处理文件的信息
 * @param {Object} api jscodeshift 所有的 api，这部分会在源码解析部分详细说明
 * @param {Object} options CLI 传入的参数
 * @returns {string} 生成的代码
 */
const babylon = require('@babel/parser');

/**
 *
 */
module.exports = (fileInfo, api, options) => {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  const targets = root.find(j.TemplateLiteral).filter((path) => {
    if (
      path.value.expressions.length == 1 &&
      path.value.expressions[0].type === 'CallExpression' &&
      path.value.expressions[0].callee.type === 'MemberExpression' &&
      path.value.expressions[0].callee.property.name === 'templateByUuid' &&
      (path.value.quasis[0].value.raw !== '' || path.value.quasis[1].value.raw !== '')
    ) {
      return true;
    }

    return false;
  });

  if (targets.size() > 0) {
    let transformed = false;
    targets.forEach((path) => {
      // 过滤掉没有占位符，或者只有占位符的情况
      j(path)
        .filter((path) => path.value.expressions.length && path.node.quasis.some((q) => q.start !== q.end))
        .forEach((path) => {
          const elements = [...path.node.quasis, ...path.node.expressions].sort((a, b) => a.start - b.start);
          let params = [];
          let formatString = '';
          for (let element of elements) {
            if (element.type === 'TemplateElement') {
              formatString += element.value.raw;
            } else {
              formatString += `{${params.length}}`;
              params.push(element);
            }
          }

          j(path).replaceWith(
            j.callExpression(j.memberExpression(j.identifier('taxLang'), j.identifier('stringFormat')), [
              j.stringLiteral(formatString),
              ...params,
            ])
          );

          transformed = true;
        });
    });

    if (transformed) {
      return root.toSource({});
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
