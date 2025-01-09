# 开发

环境准备：

```bash
pnpm build

pnpm --filter ./samples/efficient-scripts exec ctp-fe-scripts
// 或
pnpm --filter @ctp-fe-scripts/efficient-scripts exec ctp-fe-scripts

```

```bash
pnpm --filter ./samples/efficient-scripts exec ctp-fe-scripts $migrate-project

pnpm --filter ./samples/efficient-scripts exec ctp-fe-scripts $migrate-project --project-dir D:\Work\02-projects\sscplatform\yonbip-fi-ctmpub-fe

pnpm --filter ./samples/efficient-scripts exec ctp-fe-scripts $migrate-project --project-dir D:\Work

pnpm --filter ./samples/efficient-scripts exec ctp-fe-scripts $migrate-project --project-giturl git@git.yyrd.com:CTM/yonbip-fi-ctmpub-fe.git

```