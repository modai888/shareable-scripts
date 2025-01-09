/**
 * @author wangxuebo@yonyou.com
 * @date 2024/12/24
 * @description 代码格式化
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import url from 'node:url';
import { execaCommand, $, execa } from 'execa';

let __dirname;
{
  try {
    const __filename__ = url.fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename__);
  } catch (error) {
    console.error(error);
  }
}

const execute = async (command, options = {}) => {
  return await execaCommand(command, {
    encoding: 'utf8',
    preferLocal: true,
    localDir: path.resolve(__dirname, '..'),
    stderr: 'inherit',
    stdin: 'inherit',
    stdout: 'inherit',
    ...options,
  });
};

export default (command) => {
  command
    .name('$format-project')
    .description('Formating your project.')
    .version('0.0.1')
    .argument('[files...]', 'file/dir/glob ... to format')
    .option('-b, --branch <branchs...>', '指定格式化分支', [])
    .option('--auto-commit', '是否自动提交代码', true)
    .option('--no-auto-commit', '禁止自动提交代码')
    .action(async (files, options, command) => {
      // 待格式化分支
      const branchs = options.branch.filter(Boolean);

      if (branchs.length == 0) {
        throw new Error(
          [
            '参数[--branch]缺失\n',
            '请使用 --branch 参数指定要迁移的分支',
            '示例:',
            '      $format-project --branch=develop --branch=release',
            '      $format-project --branch develop release',
          ].join('\n')
        );
      }

      const cwd = process.cwd();
      //   const resolve = (...args) => path.resolve(cwd, ...args);
      //   const pkg = JSON.parse(fs.readFileSync(resolve('package.json'), 'utf8'));
      //   const tempDir = os.tmpdir();

      console.log('--branchs', branchs);
      console.log('--auto-commit: ', options.autoCommit);

      // 查询分支信息
      const getBranchInfo = async (gitdir, branchs) => {
        // 远程分支
        let { stdout: remote } = await execute(`git ls-remote --heads origin`, {
          stdout: 'pipe',
          cwd: gitdir,
        });
        const remoteBranchs = remote.match(/refs\/heads\/([^\s]+)/g);

        // 本地分支
        const { stdout: local } = await execute(`git show-ref --heads`, {
          stdout: 'pipe',
          cwd: gitdir,
        });
        // await $`git show-ref --heads`;
        const localBranchs = local.match(/refs\/heads\/([^\s]+)/g);

        // 当前分支
        const { stdout: currentBranch } = await execute(`git branch --show-current`, {
          stdout: 'pipe',
          cwd: gitdir,
        });

        // $`git branch --show-current`;

        return branchs.reduce((acc, branch) => {
          acc[branch] = {
            isLocalBranch: localBranchs.includes(`refs/heads/${branch}`),
            isRemoteBranch: remoteBranchs.includes(`refs/heads/${branch}`),
            isCurrentBranch: currentBranch === branch,
          };

          return acc;
        }, {});
      };

      // 提交代码
      const commit = async (gitdir, commitmsg, options = { force: false, branch: null }) => {
        // 暂存代码
        await execute(`git add .`, { cwd: gitdir });

        // 提交代码
        await execute(`git commit -m "${commitmsg}"`, {
          cwd: gitdir,
          shell: true,
        });

        if (!options.branch) {
          const o = await execute(`git branch --show-current`, {
            stdout: 'pipe',
            cwd: gitdir,
          });
          options.branch = o.stdout;
        }

        // 推送远程
        await execute(`git push -u origin ${options.branch} ${options.force ? '--force' : ''}`, {
          cwd: gitdir,
        });
      };

      // 判断代码是否有修改
      const isCodeModified = async (gitdir) => {
        const { stdout: status } = await execute(`git status -s`, {
          stdout: 'pipe',
          cwd: gitdir,
        });

        return status.length > 0;
      };

      const branchInfos = await getBranchInfo(cwd, branchs);

      for (let branch of branchs) {
        const { isCurrentBranch, isLocalBranch, isRemoteBranch } = branchInfos[branch];

        if (!isLocalBranch || !isRemoteBranch) {
          console.warn(`分支[${branch}]不存在，跳过...`);
          continue;
        }

        // 本地有未提交代码，临时存储
        if (await isCodeModified(cwd)) {
          console.log('llalal');
          await execute(`git stash save --all "stash at ${Date.now()}"`, { shell: true });
        }

        return;
        // let { stdout: status } = await execute(`git status -s`, {
        //   stdout: 'pipe',
        // });

        // if (status && status.length > 0) {
        //   await execute(`git stash save --all "stash for formating ${Date.now()}"`, { shell: true });
        // }

        // 分支不在本地，检出
        if (!isLocalBranch) {
          await execute(`git checkout ${branch}`, {});
        }

        // 拉取最新代码
        await execute(`git pull --rebase origin ${branch}`, {});

        // 代码格式化
        await execute(`ctp-fe-scripts format ${files.join(' ')}`, {});

        // 修复多语抽取问题
        const params = [];
        if (fs.existsSync('.prettierignore')) {
          params.push('--ignore-config .prettierignore');
        }
        await execute(
          `ctp-fe-scripts multilang --fix linebreak,repeatextraction ${params.join(' ')} ${files.join(' ')}`
        );

        if (options.autoCommit) {
          const ismodified = await isCodeModified(cwd);
          if (!ismodified) continue;

          // 提交代码
          await commit(cwd, `refactor: format codes automatically at ${Date.now()}`, {
            branch,
          });
        }
      }
    });

  return command;
};
