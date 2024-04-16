/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/22
 * @description config for lintstaged
 */
const path = require('node:path');
const fs = require('node:fs');

const isMultilang = fs.existsSync(path.resolve('multilangconfig.properties'));

module.exports = {
  //   'README.md': [`${doctoc} --maxlevel 3 --notitle`],
  '*.+(js|jsx|ts|tsx|cjs|mjs|json|yml|yaml|css|less|scss|ts|tsx|md|gql|graphql|mdx|vue)': [
    `shareable-scripts format`,
    `shareable-scripts lint-es`,
    isMultilang ? `shareable-scripts multilang --fix linebreak,repeatextraction` : null,
    isMultilang ? `shareable-scripts format` : null,
    // `shareable-scripts test --findRelatedTests`,
  ].filter((_) => !!_),
};
