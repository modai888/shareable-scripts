/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/29
 * @description lint-staged
 */

module.exports = {
  // 'README.md': [`${doctoc} --maxlevel 3 --notitle`],
  '*.+(js|jsx|ts|tsx|cjs|mjs|json|yml|yaml|css|less|scss|ts|tsx|md|gql|graphql|mdx|vue)': [
    `node ./packages/cli/lib/cli.js format`,
    `node ./packages/cli/lib/cli.js lint-es`,
  ],
};
