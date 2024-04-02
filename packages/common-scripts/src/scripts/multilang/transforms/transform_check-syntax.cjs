/**
 * jscodeshift transform
 * @param {Object} fileInfo 处理文件的信息
 * @param {Object} api jscodeshift 所有的 api，这部分会在源码解析部分详细说明
 * @param {Object} options CLI 传入的参数
 * @returns {string} 进项多语抽取后生成文件的语法错误检查
 */
const babylon = require('@babel/parser');

module.exports = (fileInfo, api, options) => {
  const j = api.jscodeshift;

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
