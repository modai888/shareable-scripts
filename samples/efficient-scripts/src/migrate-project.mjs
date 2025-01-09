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
  console.log(chalk.blue(`$$ ${command}`));

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

export default (command) => {
  const pkg = readpkg('./package.json');

  command
    .name('$migrate-project')
    .description('Migrating your project.')
    .version('0.0.1')
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

      const tempDir = os.tmpdir();
      const cwd = process.cwd();
      const resolve = (...args) => path.resolve(cwd, ...args);

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
      const migrate = async (app, gitUrl, tbranch, sbranch) => {
        // 创建应用代码克隆目录
        const tmpGitCloneDir = resolve(tempDir, `${app}_${sbranch}_git`);
        // 删除原有代码克隆目录
        if (fs.existsSync(tmpGitCloneDir)) {
          await execute(`shx rm -rf ${tmpGitCloneDir}`);
        }

        // 克隆应用指定分支的代码
        await execute(`git clone -b ${sbranch} ${gitUrl} ${tmpGitCloneDir}`, {});

        // 按迁移目录结构调整代码目录
        const migrationBranch = `${sbranch}_migration`;
        const branchInfos = await getBranchInfo(tmpGitCloneDir, [migrationBranch]);

        // 创建迁移分支
        const { isCurrentBranch, isLocalBranch, isRemoteBranch } = branchInfos[migrationBranch];
        if (!isCurrentBranch) {
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

        // 调整代码结构
        const dir = resolve(tmpGitCloneDir, 'apps', options.appdir, app);
        await execute(`shx mkdir -p ${dir}`);

        const files = fs.readdirSync(tmpGitCloneDir);
        for (let file of files) {
          if (file === 'apps' || file === '.git') continue;
          await execute(`shx mv -f ${tmpGitCloneDir}/${file}  ${dir}`, {});
        }

        await commit(tmpGitCloneDir, `refactor: reorganize code for migrating project ${app}`, {
          force: true,
          branch: migrationBranch,
        });

        // 关联远程仓库到本项目
        const { stdout: remote } = await execute(`git remote -v`, {
          stdout: 'pipe',
        });

        const isRemoteAdded = remote.split('\n').some((r) => r.startsWith(`${app}\t`));
        if (!isRemoteAdded) {
          await execute(`git remote add ${app} ${gitUrl}`, {});
        }

        // 拉取代码到本项目
        await execute(`git pull ${app} ${migrationBranch} --allow-unrelated-histories --no-edit`, {});

        // 修改部分scripts脚本命令中的路径
        if (options.updateBuildScripts) {
          const appdir = resolve('apps', options.appdir, app);
          const pathprefix = path.relative(appdir, cwd).replace(/\\/g, '/');

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

      const tbranchs = branchs.map((b) => b[0]);
      const tBranchInfos = await getBranchInfo(cwd, tbranchs);

      for (let [tbranch, sbranch] of branchs) {
        const { isCurrentBranch, isLocalBranch, isRemoteBranch } = tBranchInfos[tbranch];

        if (!isCurrentBranch) {
          if (!options.remainTargetBranch) {
            if (isLocalBranch) {
              await execute(`git branch -D ${tbranch}`, {});
            }

            if (isRemoteBranch) {
              await execute(`git push origin --delete ${tbranch}`, {});
            }

            await execute(`git checkout -b ${tbranch}`, {});
            await execute(`git push --set-upstream origin ${tbranch}`, {});
          } else {
            if (!isLocalBranch && !isRemoteBranch) {
              // 分支不存在
              await execute(`git checkout -b ${tbranch}`, {});
            } else {
              await execute(`git checkout ${tbranch}`, {});
            }

            if (isRemoteBranch) {
              await execute(`git push --set-upstream origin ${tbranch}`, {});
            }
          }
        }

        for (let [app, gitUrl] of apps) {
          await migrate(app, gitUrl, tbranch, sbranch);
        }

        // update module.xml
        if (options.updateModuleXml) {
          console.log(chalk.yellow('updating module.xml file'));
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

          if (!fs.existsSync(resolve('apps', options.appdir))) {
            await execute(`shx mkdir -p ${resolve('apps', options.appdir)}`);
          }

          // 写入apps目录
          fs.writeFileSync(resolve('apps', options.appdir, 'module.xml'), content.trim(), {
            flag: 'w',
            encoding: 'utf8',
          });

          // 写入根目录
          fs.writeFileSync(resolve(options.appdir ? `${options.appdir}-module.xml` : 'module.xml'), content.trim(), {
            flag: 'w',
            encoding: 'utf8',
          });

          await commit(cwd, 'chore: update module.xml', {
            branch: tbranch,
          });
        }

        // update pnpm-workspace.yaml
        if (options.updateWorkspaceYaml) {
          console.log(chalk.yellow('updating pnpm-workspace.yaml file'));

          const file = resolve('pnpm-workspace.yaml');
          await updateYamlFile(file, (doc) => {
            doc.packages = doc.packages || [];
            doc.packages = doc.packages.filter((p) => p !== 'apps/*' && p !== `apps/${options.appdir}/*`);

            doc.packages.push(options.appdir ? `apps/${options.appdir}/*` : 'apps/*');
            doc.packages.sort();
          });

          await commit(cwd, 'chore: update pnpm-workspace.yaml', {
            branch: tbranch,
          });
        }

        // // 代码格式化
        // await execute(`ctp-fe-scripts format ./apps/${options.appdir}`, {});

        // // 修复多语抽取问题
        // const params = [];
        // if (fs.existsSync('.prettierignore')) {
        //   params.push('--ignore-config .prettierignore');
        // }
        // await execute(
        //   `ctp-fe-scripts multilang --fix linebreak,repeatextraction ${params.join(' ')} ./apps/${options.appdir}`
        // );
        // await commit(cwd, 'refactor: format codes', {
        //   branch: tbranch,
        // });
      }
    });

  return command;
};
