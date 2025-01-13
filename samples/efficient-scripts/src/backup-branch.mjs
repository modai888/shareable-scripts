/**
 * @author wangxuebo@yonyou.com
 * @date 2025/01/10
 * @description 分支备份脚本
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import url from 'node:url';
import chalk from 'chalk';
import yaml from 'js-yaml';
import { writeJsonFile } from 'write-json-file';
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

const updateYamlFile = async (file, updatefn, options = {}) => {
  try {
    const doc = yaml.load(fs.readFileSync(file, 'utf8'), options.loadOptions);

    let ret = await updatefn?.(doc);

    ret = ret ?? doc;

    ret = yaml.dump(ret, options.dumpOptions);
    fs.writeFileSync(file, ret, { flag: 'w', encoding: 'utf8' });
  } catch (err) {
    console.error(`Error: update yaml file: `, err.message);
  }
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

const warn = (message) => {
  console.log(chalk.yellowBright.bgYellow('[WARNING]', message));
};

const info = (message) => {
  console.log(chalk.magentaBright('[INFO]', message));
};

export default (command) => {
  command
    .name('$backup-branch')
    .description('Backup your branchs')
    .version('0.0.1')
    .option('--project-dir <path>', '指定目标工程根目录')
    .option('--project-giturl <giturl>', '指定目标工程仓库地址')
    .option('--project-backup-base-branch <branch>', '指定目标工程的备份基准分支', 'main-merge')
    .option('-b, --branch <branchs...>', '指定备份分支', [])
    .option('--branch-backup-name <backup-name>', '分支备份名称，$占位符用于填入原分支名称', '$__migration-backup')
    .option('--clean', '清理备份分支', false)
    // .option('--app <apps...>', '指定要迁移的工程信息', [])
    // .option('--appdir <dir>', '指定代码迁移到的子目录', '')
    // .option('--remain-target-branch', '是否复用目标分支', false)
    // .option('--update-workspace-yaml', '是否更新pnpm-worksapce.yaml配置', false)
    // .option('--update-build-scripts', '是否更新scripts脚本', false)
    // .option('--update-module-xml', '是否写入module.xml文件', false)

    .action(async (options, command) => {
      let needCleanProjectDir = false;
      const cwd = process.cwd();
      const tempDir = os.tmpdir();
      const resolve = (...args) => path.resolve(cwd, ...args);

      info('解析工程信息');
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

      // 读取工程的包信息
      const pkg = readpkg(resolve(projectDir, 'package.json'));

      // 待迁移分支
      const branchs = options.branch.filter(Boolean);

      if (branchs.length == 0) {
        throw new Error(
          [
            '请使用 --branch 参数指定要迁移的分支\n',
            '示例：$migrate-project --branch=target-branch::source-branch --branch=master',
            '说明：[target-branch]为工程要迁移至的目标工程的分支名称，[source-branch]为待迁移工程要迁移的分支，省略时同[target-branch]',
          ].join('\n')
        );
      }

      if (branchs.length && !options.branchBackupName.includes('$')) {
        throw new Error(
          [
            '您当前正在备份多个分支，分支备份名称中不包含$占位，会导致备份分支存在冲突，请修改备份名称，添加$占位符，脚本将填入原分支名称\n',
            '示例：$backup-branch --branch develop release --branch-backup-name $_migration-backup',
          ].join('\n')
        );
      }

      console.log('--branchs', branchs);
      console.log('--clean', options.branchBackupName);
      console.log('--clean', options.clean);
      console.log('--tempdir: ', tempDir);

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

      info('查询工程分支信息');
      const tBranchInfos = await getBranchInfo(projectDir, [
        ...branchs,
        ...branchs.map((b) => options.branchBackupName.replace(/\$/g, b)),
      ]);

      info(JSON.stringify(tBranchInfos, null, '    '));

      for (let branch of branchs) {
        const { isCurrentBranch, isLocalBranch, isRemoteBranch } = tBranchInfos[branch] || {};

        if (!isLocalBranch && !isRemoteBranch) {
          // 分支不存在，跳过
          warn(`待备份分支"${branch}"不存在，跳过！`);
          continue;
        }

        // 清理历史备份分支
        const tbranch = options.branchBackupName.replace(/\$/g, branch);
        info(`分支 "${branch}" 目标备份分支为 "${tbranch}"`);
        {
          const { isLocalBranch, isRemoteBranch } = tBranchInfos[tbranch] || {};

          if (isLocalBranch || isRemoteBranch) {
            info(`备份目标分支 "${tbranch}" 已存在，进行删除"`);
          }

          // 删除历史备份
          if (isLocalBranch) {
            await execute(`git branch -D ${tbranch}`, { cwd: projectDir });
          }

          if (isRemoteBranch) {
            await execute(`git push origin --delete ${tbranch}`, { cwd: projectDir });
          }
        }

        if (!options.clean) {
          info(`开始备份分支 "${branch}"`);

          // 分支备份
          if (!isCurrentBranch) {
            info(`${isLocalBranch ? '重新拉取' : '拉取'}待备份分支 "${branch}"`);

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

          info(`生成目标备份分支 "${tbranch}" 并推送远程仓库`);

          await execute(`git checkout -b ${tbranch}`, { cwd: projectDir });
          await execute(`git push --set-upstream origin ${tbranch}`, { cwd: projectDir });
        }
      }

      if (needCleanProjectDir) {
        await execute(`shx rm -rf ${projectDir}`);
      }
    });

  return command;
};
