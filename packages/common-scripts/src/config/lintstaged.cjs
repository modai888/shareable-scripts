/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/22
 * @description config for lintstaged
 */
module.exports = {
  //   'README.md': [`${doctoc} --maxlevel 3 --notitle`],
  '*.+(js|jsx|ts|tsx|cjs|mjs|json|yml|yaml|css|less|scss|ts|tsx|md|gql|graphql|mdx|vue)': [
    `shareable-scripts format`,
    `shareable-scripts lint-es`,
    // `shareable-scripts test --findRelatedTests`,
  ],
};
