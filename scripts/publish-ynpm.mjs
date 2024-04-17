/**
 * @author wangxuebo@yonyou.com
 * @date 2024/04/17
 * @description 发布ynpm
 */
import path from 'node:path';
import fs from 'node:fs';
import url from 'node:url';
import { execa, execaCommand, execaCommandSync } from 'execa';
import { writeJsonFile } from 'write-json-file';

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
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve('package.json'), {
      encoding: 'utf-8',
    })
  );

  command
    .name('publish-ynpm')
    .description('Publish shareable-scripts to ynpm registry.')
    .version('0.0.1')
    .option('--dry-run', 'run in dry mode')
    .action(async (options) => {
      //   // 1、安装更新依赖
      //   await execute('pnpm install --no-frozen-lockfile --ignore-scripts');

      // 2、更改依赖版本
      {
        if (!pkg.workspaces || !pkg.workspaces.includes('packages/*')) {
          pkg.workspaces = pkg.workspaces || [];
          pkg.workspaces.push('packages/*');

          await writeJsonFile(path.resolve('package.json'), pkg, {
            detectIndent: true,
          });
        }

        const packages = fs.readdirSync('./packages');

        const { jsons, pkgnames } = packages.reduce(
          (ret, pack) => {
            const p = path.resolve(`./packages/${pack}/package.json`);
            const content = JSON.parse(fs.readFileSync(p, { encoding: 'utf-8' }));

            ret.pkgnames.push(content.name);
            ret.jsons[pack] = ret.jsons[content.name] = { path: p, content };

            return ret;
          },
          { jsons: {}, pkgnames: [] }
        );

        await Promise.all(
          packages
            .map((pack) => {
              const pkg = jsons[pack];

              let dirty = false;

              for (let dep of pkgnames) {
                if (dep === pkg.content.name) continue;

                ['dependencies', 'devDependencies', 'optionalDependencies'].forEach((field) => {
                  if (pkg.content[field]?.[dep] && pkg.content[field][dep] !== jsons[dep].content.version) {
                    dirty = true;
                    pkg.content[field][dep] = jsons[dep].content.version;

                    console.log(
                      `Changed ${field} "${dep}" version to ${jsons[dep].content.version} for package "${pkg.content.name}"`
                    );
                  }
                });
              }

              return dirty
                ? writeJsonFile(pkg.path, pkg.content, {
                    detectIndent: true,
                  })
                : null;
            })
            .filter((p) => p != null)
        );

        console.log('Changed deps version');
      }

      // 3、构建
      await execute(`pnpm run build`);

      // 4、新增tag
      await execute(`git tag`, { stdin: null, stdout: null, stderr: null })
        .then((res) => {
          const tags = res.stdout.split('\n');
          if (tags.includes(pkg.version)) {
            throw new Error('TagExistError');
          }
        })
        .catch((error) => {
          if (error.message === 'TagExistError') {
            return execute(`git tag -d ${pkg.version}`);
          }

          throw error;
        })
        .then(() => {
          console.log(`Creating tag ${pkg.version}`);
          return execute(`git tag ${pkg.version}`);
        });

      // 发布
      await execute(`ynpm publish -w packages --access public ${options.dryRun ? '--dry-run' : ''}`);

      // 恢复发布产生的临时修改
      await execute(`git checkout .`);
    });

  return command;
};
