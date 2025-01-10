/**
 * @author wangxuebo@yonyou.com
 * @date 2024/12/24
 * @description 代码格式化
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import url from 'node:url';
import chalk from 'chalk';
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
  console.log(chalk.greenBright(`$$ ${command}`));

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

const readpkg = (file) => {
  const pkg = JSON.parse(
    fs.readFileSync(file, {
      encoding: 'utf-8',
    })
  );
  return pkg;
};

const isValidGitDir = async (dir) => {
  try {
    await $({ cwd: dir })`git branch --show-current`;
    return true;
  } catch (error) {
    return !/not a git repository/.test(error.message);
  }
};

// 判断代码是否有修改
const isCodeModified = async (gitdir) => {
  const { stdout: status } = await execute(`git status -s`, {
    stdout: 'pipe',
    cwd: gitdir,
  });

  console.log('status', status);

  return status.length > 0;
};

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

const warn = (message) => {
  console.log(chalk.yellowBright.bgYellow('[WARNING]', message));
};

const info = (message) => {
  console.log(chalk.magentaBright('[INFO]', message));
};

export default (command) => {
  command
    .name('$format-project')
    .description('Formating your project.')
    .version('0.0.1')
    .argument('[files...]', 'file/dir/glob ... to format')
    .option('-b, --branch <branchs...>', '指定格式化分支', [])
    .option('--project-dir <path>', '指定目标工程根目录')
    .option('--project-giturl <giturl>', '指定目标工程仓库地址')
    .option('--project-backup-base-branch <branch>', '指定目标工程的备份基准分支', 'main-merge')
    .option('--auto-commit', '是否自动提交代码', true)
    .option('--no-auto-commit', '禁止自动提交代码')
    .action(async (files, options, command) => {
      let needCleanProjectDir = false;
      const cwd = process.cwd();
      const tempDir = os.tmpdir();
      const resolve = (...args) => path.resolve(cwd, ...args);

      info('解析工程信息');

      if (files.length == 0) {
        throw new Error(['请指定要格式化的代码目录\n', '示例:', '      $format-project ./src ./apps'].join('\n'));
      }

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

      console.log('--files', files);
      console.log('--branchs', branchs);
      console.log('--auto-commit: ', options.autoCommit);

      // 指定目标工程目录信息
      let projectDir = options.projectDir;
      let projectGiturl = options.projectGiturl;

      if (!projectDir && !projectGiturl) {
        warn('您未指定工程目录或仓库信息，将以当前目录为工程根目录');
        projectDir = cwd;
      }

      if (projectDir) {
        const isGitDir = await isValidGitDir(projectDir);

        if (isGitDir) {
          projectGiturl && warn('同时指定 --project-dir 和 --project-giturl 时，将忽略参数 --project-giturl');
        } else {
          warn(`参数 --project-dir "${projectDir}" 不是一个有效的GIT工程目录`);
          projectDir = null;
        }
      }

      console.log('--project-giturl', projectGiturl);
      console.log('--project-backup-base-branch', options.projectBackupBaseBranch);

      if (!projectDir && projectGiturl) {
        warn(`检测到您指定了--project-giturl "${projectGiturl}" 仓库地址，将尝试克隆仓库代码作为项目目录`);

        // 用户输入的工程仓库地址
        const urlToPath = projectGiturl.replace(/\/*$/, '').replace(/[&@:=#%\/\.\?\+\s]+/g, '_');
        projectDir = resolve(tempDir, `${urlToPath}_git`);

        // 删除原有代码克隆目录
        if (fs.existsSync(projectDir)) {
          await execute(`shx rm -rf ${projectDir}`);
        }

        // 克隆应用指定分支的代码
        await execute(`git clone -b ${options.projectBackupBaseBranch} ${projectGiturl} ${projectDir}`, {});
        needCleanProjectDir = true;
      }

      if (!projectDir) {
        throw new Error(
          [
            '请使用 --project-dir 或 --project-giturl 指定要目标工程信息，或在目标工程目录下执行命令\n',
            '同时指定 --project-dir 和 --project-giturl 时，如果 --project-dir 为有效的GIT目录，将忽略 --project-giturl 参数',
            '同时忽略 --project-dir 和 --project-giturl 时，将以当前目录作为参数 --project-dir 的值，请确保当前目录是一个有效的GIT工程目录',
            '如果指定 --project-giturl 时，将使用此地址客隆代码并将目标目录作为参数 --project-dir 的值',
            '如果指定 --project-dir 时，此目录必须是一个有效的GIT工程目录',
          ].join('\n')
        );
      }

      console.log('--project-dir', projectDir);

      // 切换到工程的迁移基准分支
      await execute(`git checkout ${options.projectBackupBaseBranch}`, { cwd: projectDir });

      const branchInfos = await getBranchInfo(projectDir, branchs);

      // 本地有未提交代码，临时存储
      if (await isCodeModified(projectDir)) {
        info('暂存本地未提交修改');
        await execute(`git stash save --all "stash at ${Date.now()}"`, { shell: true, cwd: projectDir });
      }

      for (let branch of branchs) {
        const { isCurrentBranch, isLocalBranch, isRemoteBranch } = branchInfos[branch];

        if (!isLocalBranch && !isRemoteBranch) {
          warn(`分支 "${branch}" 不存在，跳过...`);
          continue;
        }

        // 拉取分支
        if (!isCurrentBranch) {
          info(`${isLocalBranch ? '重新拉取' : '拉取'}待格式化分支 "${branch}"`);

          // 删除本地分支，重新拉取（包含最新代码）
          if (isLocalBranch) {
            await execute(`git branch -D ${branch}`, { cwd: projectDir });
          }

          await execute(`git checkout ${branch}`, { cwd: projectDir });
        }

        if (isCurrentBranch) {
          // 拉取最新代码
          await execute(`git pull --rebase`, { cwd: projectDir });
        }

        // 代码格式化
        await execute(`npx ctp-fe-scripts format --ignore-unknown --no-error-on-unmatched-pattern ${files.join(' ')}`, {
          cwd: projectDir,
          shell: true,
        });

        // 修复多语抽取问题
        const params = [];
        // if (fs.existsSync(resolve(projectDir, '.gitignore'))) {
        //   params.push('--ignore-config .gitignore');
        // }

        if (fs.existsSync(resolve(projectDir, '.prettierignore'))) {
          params.push('--ignore-config .prettierignore');
        }

        await execute(
          `npx ctp-fe-scripts multilang --fix linebreak,repeatextraction ${params.join(' ')} ${files.join(' ')}`,
          { cwd: projectDir }
        );

        if (options.autoCommit) {
          const ismodified = await isCodeModified(projectDir);
          if (!ismodified) continue;

          // 提交代码
          await commit(projectDir, `refactor: format codes automatically at ${Date.now()}`, {
            branch,
          });
        }
      }

      if (needCleanProjectDir) {
        await execute(`shx rm -rf ${projectDir}`);
      }
    });

  return command;
};
