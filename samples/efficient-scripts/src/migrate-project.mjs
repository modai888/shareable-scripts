/**
 * @author wangxuebo@yonyou.com
 * @date 2024/12/24
 * @description 代码迁移脚本
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
    .name('$migrate-project')
    .description('Migrating your project.')
    .version('0.0.1')
    .option('--project-dir <path>', '指定目标工程根目录')
    .option('--project-giturl <giturl>', '指定目标工程仓库地址')
    .option('--project-base-branch <branch>', '指定目标工程的迁移基准分支', 'main-merge')
    .option('-b, --branch <branchs...>', '指定迁移分支', [])
    .option('--app <apps...>', '指定要迁移的工程信息', [])
    .option('--appdir <dir>', '指定代码迁移到的子目录', '')
    .option('--remain-target-branch', '是否复用目标分支', false)
    .option('--update-workspace-yaml', '是否更新pnpm-worksapce.yaml配置', false)
    .option('--update-build-scripts', '是否更新scripts脚本', false)
    .option('--update-module-xml', '是否写入module.xml文件', false)
    // .option("--gituser <gituser>", "拥有工程权限的GIT用户名", [])
    // .option("--gitpwd <gitpwd>", "拥有工程权限的GIT用户密码", [])

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
      console.log('--project-migration-branch', options.projectBaseBranch);

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
        await execute(`git clone -b ${options.projectMigrationBaseBranch} ${projectGiturl} ${projectDir}`, {});
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

      // 读取工程的包信息
      const pkg = readpkg(resolve(projectDir, 'package.json'));

      // 待迁移分支
      const branchs = options.branch.filter(Boolean).map((branch) => {
        const [target, source] = branch.split('::');
        return [target, source || target];
      });

      const apps = options.app.filter(Boolean).map((branch) => {
        const [target, source] = branch.split('::');
        return [target, source || target];
      });

      if (apps.length == 0) {
        throw new Error(
          [
            '请使用 --app 参数指定要迁移的工程信息\n',
            '示例：$migrate-project --app=app1::giturl --app=app2::giturl',
            '说明：[app[n]]为待迁移工程的DomainKey，[giturl]为待迁移工程的GIT仓库地址',
          ].join('\n')
        );
      }

      if (branchs.length == 0) {
        throw new Error(
          [
            '请使用 --branch 参数指定要迁移的分支\n',
            '示例：$migrate-project --branch=target-branch::source-branch --branch=master',
            '说明：[target-branch]为工程要迁移至的目标工程的分支名称，[source-branch]为待迁移工程要迁移的分支，省略时同[target-branch]',
          ].join('\n')
        );
      }

      console.log('--branchs', branchs);
      console.log('--apps', apps);
      console.log('--appdir', options.appdir);
      console.log('--update-module-xml', options.updateModuleXml);
      console.log('--update-workspace-yaml', options.updateWorkspaceYaml);
      console.log('--update-build-scripts', options.updateBuildScripts);
      console.log('--remain-target-branch', options.remainTargetBranch);
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

      // 迁移指定工程的指定分支代码
      const migrate = async (projectDir, app, gitUrl, sbranch) => {
        info(`> [migration] 开始迁移工程 [${app}] 的分支 [${sbranch}] 代码`);
        // 创建应用代码克隆目录
        const tmpGitCloneDir = resolve(tempDir, `${app}_${sbranch}_git`);
        info(`> [migration] 临时代码克隆目录 [${tmpGitCloneDir}]`);
        // 删除原有代码克隆目录
        if (fs.existsSync(tmpGitCloneDir)) {
          info(`> [migration] 临时代码克隆目录清理`);
          await execute(`shx rm -rf ${tmpGitCloneDir}`);
        }

        try {
          // 克隆应用指定分支的代码
          info(`> [migration] 克隆应用代码`);
          await execute(`git clone -b ${sbranch} ${gitUrl} ${tmpGitCloneDir}`, {});
        } catch (error) {
          warn(error.message);
          return;
        }

        // 按迁移目录结构调整代码目录
        const migrationBranch = `${sbranch}_migration`;
        info(`> [migration] 按迁移目录结构调整代码目录，调整分支 [${migrationBranch}]`);
        const branchInfos = await getBranchInfo(tmpGitCloneDir, [migrationBranch]);

        // 创建迁移分支
        const { isCurrentBranch, isLocalBranch, isRemoteBranch } = branchInfos[migrationBranch];
        if (!isCurrentBranch) {
          info(`> [migration] 重建调整分支 [${migrationBranch}]`);

          if (isLocalBranch) {
            await execute(`git branch -D ${migrationBranch}`, {
              cwd: tmpGitCloneDir,
            });
          }

          if (isRemoteBranch) {
            await execute(`git push origin --delete ${migrationBranch}`, {
              cwd: tmpGitCloneDir,
            });
          }

          await execute(`git checkout -b ${migrationBranch}`, {
            cwd: tmpGitCloneDir,
          });
        }

        info(`> [migration] 调整代码结构`);
        // 调整代码结构
        const dir = resolve(tmpGitCloneDir, 'apps', options.appdir, app);
        await execute(`shx mkdir -p ${dir}`);

        const files = fs.readdirSync(tmpGitCloneDir);
        for (let file of files) {
          if (file === 'apps' || file === '.git') continue;
          await execute(`shx mv -f ${tmpGitCloneDir}/${file}  ${dir}`, {});
        }

        info(`> [migration] 提交调整结构后的代码`);
        await commit(tmpGitCloneDir, `refactor: reorganize code for migrating project ${app}`, {
          force: true,
          branch: migrationBranch,
        });

        info(`> [migration] 将调整后的代码拉取到目标工程`);
        // 关联远程仓库到本项目
        const { stdout: remote } = await execute(`git remote -v`, {
          stdout: 'pipe',
          cwd: projectDir,
        });

        const isRemoteAdded = remote.split('\n').some((r) => r.startsWith(`${app}\t`));
        if (!isRemoteAdded) {
          await execute(`git remote add ${app} ${gitUrl}`, { cwd: projectDir });
        }

        // 拉取代码到本项目
        await execute(`git pull ${app} ${migrationBranch} --allow-unrelated-histories --no-edit`, { cwd: projectDir });

        // 修改部分scripts脚本命令中的路径
        if (options.updateBuildScripts) {
          info(`> [migration] 调整 scripts 脚本命令中的命令行程序引用路径`);

          const appdir = resolve(projectDir, 'apps', options.appdir, app);
          const pathprefix = path.relative(appdir, projectDir).replace(/\\/g, '/');

          const pkgpath = resolve(appdir, 'package.json');
          const pkg = readpkg(pkgpath);

          const scripts = pkg.scripts;
          Object.keys(scripts).forEach((key) => {
            let script = scripts[key];

            if (/(\s*)([^\s]+\/)?node_modules\//.test(script)) {
              script = script.replace(/(\s*)([^\s]+\/)?node_modules\//g, `$1${pathprefix}/node_modules/`);
            }

            scripts[key] = script;
          });

          await writeJsonFile(pkgpath, pkg, { indent: '  ', detectIndent: true });
        }
      };

      let tBranchInfos = null;
      const tbranchs = [options.projectBaseBranch, ...branchs.map((b) => b[0])];
      while (!tBranchInfos || !tBranchInfos[options.projectBaseBranch].isCurrentBranch) {
        info('查询工程分支信息');
        tBranchInfos = await getBranchInfo(projectDir, tbranchs);

        const baseBranchInfo = tBranchInfos[options.projectBaseBranch];
        if (!baseBranchInfo.isLocalBranch && !baseBranchInfo.isRemoteBranch) {
          throw new Error(
            [
              `基准迁移分支 [${options.projectBaseBranch}] 不存在，请参考文档创建基准迁移分支后再进行工程合并\n`,
              '示例：$migrate-project --project-base-branch main-merge',
              '说明：基准迁移分支用于配置初始化微服务合并的工程信息，请参考文档【MDF工程微服务合并实践-资税项.pdf】',
            ].join('\n')
          );
        }

        if (!baseBranchInfo.isCurrentBranch) {
          // 切换到迁移基准分支
          info(`切换到迁移基准分支 [${options.projectBaseBranch}]`);
          await execute(`git checkout ${options.projectBaseBranch}`, { cwd: projectDir });
        }
      }

      info(JSON.stringify(tBranchInfos, null, '    '));
      
      for (let [tbranch, sbranch] of branchs) {
        // 切换到迁移基准分支
        info(`切换到迁移基准分支 [${options.projectBaseBranch}]`);
        await execute(`git checkout ${options.projectBaseBranch}`, { cwd: projectDir });

        info(`开始迁移源分支 [${sbranch}] 处理`);
        const { isLocalBranch, isRemoteBranch } = tBranchInfos[tbranch];

        if (!options.remainTargetBranch) {
          info(`重建目标分支 [${tbranch}] 处理`);

          if (isLocalBranch) {
            await execute(`git branch -D ${tbranch}`, { cwd: projectDir });
          }

          if (isRemoteBranch) {
            await execute(`git push origin --delete ${tbranch}`, { cwd: projectDir });
          }

          await execute(`git checkout -b ${tbranch}`, { cwd: projectDir });
          await execute(`git push --set-upstream origin ${tbranch}`, { cwd: projectDir });
        } else {
          info(`复用目标分支 [${tbranch}] 处理`);

          if (!isLocalBranch && !isRemoteBranch) {
            // 分支不存在
            await execute(`git checkout -b ${tbranch}`, { cwd: projectDir });
          } else {
            await execute(`git checkout ${tbranch}`, { cwd: projectDir });
          }

          if (isRemoteBranch) {
            await execute(`git push --set-upstream origin ${tbranch}`, { cwd: projectDir });
          }
        }

        for (let [app, gitUrl] of apps) {
          await migrate(projectDir, app, gitUrl, sbranch);
        }

        // update module.xml
        if (options.updateModuleXml) {
          info(chalk.yellow('updating module.xml file'));
          // 生成module.xml文件
          const code = options.appdir || pkg.name;
          const desc = pkg.description || code;
          const content = `
<?xml version="1.0" encoding="UTF-8"?>
<module name="${code}" description="${desc}">
    <nginx_mode>mdf</nginx_mode>
    <ucf_engine>
        <merge>
            <domainKeys>
                ${apps.map((app) => `<domainKey>${app[0]}</domainKey>`).join('\n                ')}
            </domainKeys>
        </merge>
    </ucf_engine>
</module>
                  `;

          if (!fs.existsSync(resolve(projectDir, 'apps', options.appdir))) {
            await execute(`shx mkdir -p ${resolve(projectDir, 'apps', options.appdir)}`);
          }

          // 写入apps目录
          fs.writeFileSync(resolve(projectDir, 'apps', options.appdir, 'module.xml'), content.trim(), {
            flag: 'w',
            encoding: 'utf8',
          });

          // 写入根目录
          fs.writeFileSync(
            resolve(projectDir, options.appdir ? `${options.appdir}-module.xml` : 'module.xml'),
            content.trim(),
            {
              flag: 'w',
              encoding: 'utf8',
            }
          );

          await commit(projectDir, 'chore: update module.xml', {
            branch: tbranch,
          });
        }

        // update pnpm-workspace.yaml
        if (options.updateWorkspaceYaml) {
          info(chalk.yellow('updating pnpm-workspace.yaml file'));

          const file = resolve(projectDir, 'pnpm-workspace.yaml');
          await updateYamlFile(file, (doc) => {
            doc.packages = doc.packages || [];
            doc.packages = doc.packages.filter((p) => p !== 'apps/*' && p !== `apps/${options.appdir}/*`);

            doc.packages.push(options.appdir ? `apps/${options.appdir}/*` : 'apps/*');
            doc.packages.sort();
          });

          await commit(projectDir, 'chore: update pnpm-workspace.yaml', {
            branch: tbranch,
          });
        }

        info(`源分支 [${sbranch}] 迁移完毕`);
      }

      if (needCleanProjectDir) {
        info(`迁移完毕，清理目录 ${projectDir}`);
        await execute(`shx rm -rf ${projectDir}`);
      }
    });

  return command;
};
