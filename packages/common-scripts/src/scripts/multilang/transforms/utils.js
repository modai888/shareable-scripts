// 自增
let uid = 0;
const chineseReg = /[\u4e00-\u9fa5]/;
const chineseRegGlobal = /[\u4e00-\u9fa5]+/g;
const invalidVarReg = /\W/g;

module.exports.uid = function () {
  return uid++;
};

module.exports.hasChinese = function (value) {
  return chineseReg.test(value);
};

module.exports.splitByChinese = (value) => {
  if (typeof value !== 'string' || !value || !module.exports.hasChinese(value)) {
    return value;
  }

  return value.split(chineseRegGlobal);
};

module.exports.getAllChinese = (value) => {
  if (typeof value !== 'string' || !value || !module.exports.hasChinese(value)) {
    return [];
  }

  return value.match(chineseRegGlobal);
};

module.exports.firstUpper = (str) => {
  // ''.toUpperCase
  if (!str) {
    return str;
  }
  return str[0].toUpperCase() + str.slice(1);
};

module.exports.firstLower = (str) => {
  if (!str) {
    return str;
  }
  return str[0].toLowerCase() + str.slice(1);
};

module.exports.normalizeVar = (str) => {
  return str.replace(invalidVarReg, '_');
};
