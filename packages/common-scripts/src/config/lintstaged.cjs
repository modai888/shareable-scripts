/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/22
 * @description config for lintstaged
 */
const path = require('node:path');
const fs = require('node:fs');

const args = process.argv.slice(2);

let bLint = !args.includes('--no-lint');
let bMultilang = !args.includes('--no-multilang');

if (bMultilang) {
  bMultilang = fs.existsSync(path.resolve('multilangconfig.properties'));
}

console.log('received args: ', args);

module.exports = {
  //   'README.md': [`${doctoc} --maxlevel 3 --notitle`],
  '*.+(js|jsx|ts|tsx|cjs|mjs|json|yml|yaml|css|less|scss|ts|tsx|md|gql|graphql|mdx|vue)': [
    `shareable-scripts format`,
    bLint ? `shareable-scripts lint-es` : null,
    bMultilang ? `shareable-scripts multilang --fix linebreak,repeatextraction` : null,
    bMultilang ? `shareable-scripts format` : null,
    // `shareable-scripts test --findRelatedTests`,
  ].filter((_) => !!_),
};
