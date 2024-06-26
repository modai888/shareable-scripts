/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/22
 * @description scripts.prepare
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import semver from 'semver';
import { execa, execaCommandSync } from 'execa';
import { findConfigUp } from '../utils.js';
import * as pkg from '../package-manager.js';

let __dirname;
{
  try {
    const __filename__ = url.fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename__);
  } catch (error) {
    console.error(error);
  }
}

const execute = (command) => {
  const { stdout } = execaCommandSync(command, {
    encoding: 'utf8',
    preferLocal: true,
    localDir: path.resolve(__dirname, '../..'),
  });

  return stdout;
};

export default (command) => {
  const nodeVersion = execute('node --version');
  const gitVersion = execute('git version');
  const huskVersion = '9.0.11';

  command
    .name('prepare')
    .description('Setup your project with husky hooks.')
    .version(`node: ${nodeVersion}\ngit: ${gitVersion}\nhusky: ${huskVersion}`)
    .action(async () => {
      // 生产环境跳过
      if (process.env.NODE_ENV === 'production' || process.env.CI === 'true') {
        return;
      }

      // check git
      {
        const version = await execa('git version', { encoding: 'utf8' });

        if (version.exitCode == 0) {
          const ver = version.stdout.match(/([\d+.]+[\d])/)?.[0];
          if (!semver.satisfies(ver, '>=2.9')) {
            throw new Error(`Git check error: git requires version (>=2.9) but got (${ver.stdout}), please upgrade.`);
          }
        } else {
          throw new Error('Git check error: ' + version.stderr);
        }

        console.log('Git check passed!!!');
      }

      // husky init
      {
        const husky = (await import('husky')).default;
        const ret = husky();

        if (ret) {
          throw new Error(`Husky install failed: ${ret}`);
        }

        pkg.updateJson((json) => {
          const prepareScript = 'shareable-scripts prepare';
          if (json.scripts?.prepare !== prepareScript) {
            json.scripts = json.scripts || {};
            json.scripts.prepare = prepareScript;

            return true;
          }
        });

        // 配置husky脚本
        const huskyrc = findConfigUp(
          ['.huskyrc.js', '.huskyrc.cjs', '.huskyrc.mjs', 'husky.config.js', 'husky.config.cjs', 'huskyrc.config.mjs'],
          { cwd: pkg.applicationRoot }
        );

        if (huskyrc) {
          const m = await import(url.pathToFileURL(huskyrc));

          const hooks = (m.default ?? m).hooks;
          const hookeys = Object.keys(hooks);

          for (let key of hookeys) {
            fs.writeFileSync(`.husky/${key}`, hooks[key] ?? '', { flag: 'w+' });
          }
        }

        console.log('Husky config successfully!!!');
      }
    });

  return command;
};
