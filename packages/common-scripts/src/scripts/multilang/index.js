/**
 * @author wangxuebo@yonyou.com
 * @date 2024/04/02
 * @description 用友多语处理
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { commander, toArgv } from '@shareable-scripts/core';
import { execa, execaCommandSync } from 'execa';
import { createEditor } from 'properties-parser';

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

const here = (p) => path.join(__dirname, p);
const hereRelative = (p) => here(p).replace(process.cwd(), '.');
// const rootRelative = (p) => path.resolve(p).replace(process.cwd(), '.');

// program

function collectOptionArgs(value, previous) {
  return previous.concat([value]);
}

function integerOptionArgs(value) {
  return parseInt(value, 10);
}

const program = new commander.Command();

program
  .addArgument(new commander.Argument('[files...]', 'file/dir ... to refactor'))
  .usage('[options] [file/dir ...]')
  .description('Refactor your code to solve the multilingual extraction problems')

  // Output options:
  .addOption(new commander.Option('--babel').hideHelp().default(true))
  .addOption(new commander.Option('--no-babel').hideHelp())
  .addOption(new commander.Option('-c, --cpus <n>').hideHelp().argParser(integerOptionArgs))
  .addOption(new commander.Option('--dry').default(false).hideHelp())
  .addOption(new commander.Option('--no-dry').hideHelp())
  .addOption(new commander.Option('--extensions <ext>').hideHelp().default('cjs,es,es6,js,jsx,mjs,ts,tsx'))

  .addOption(new commander.Option('--fail-on-error').default(false).hideHelp())
  .addOption(new commander.Option('--no-fail-on-error').hideHelp())

  .addOption(new commander.Option('--ignore-config <path>').hideHelp().default([]).argParser(collectOptionArgs))
  .addOption(new commander.Option('--ignore-pattern <glob>').hideHelp().default([]).argParser(collectOptionArgs))

  .addOption(new commander.Option('--gitignore').default(false).hideHelp())
  .addOption(new commander.Option('--no-gitignore').hideHelp())

  .addOption(
    new commander.Option('--parser <parser>')
      .hideHelp()
      .default('babel')
      .choices(['babel', 'babylon', 'flow', 'ts', 'tsx'])
  )
  .addOption(new commander.Option('--parser-config <path>').hideHelp())

  .addOption(new commander.Option('-p, --print').default(false).hideHelp())
  .addOption(new commander.Option('--no-print').hideHelp())

  .addOption(new commander.Option('--run-in-band').default(false).hideHelp())
  .addOption(new commander.Option('--no-run-in-band').hideHelp())

  .addOption(new commander.Option('-s, --silent').default(false).hideHelp())
  .addOption(new commander.Option('--no-silent').hideHelp())

  .addOption(new commander.Option('--stdin').default(false).hideHelp())
  .addOption(new commander.Option('--no-stdin').hideHelp())

  //   .addOption(new commander.Option('--transform <path>').hideHelp())

  .addOption(new commander.Option('--verbose <verbose>').hideHelp().default(0).choices(['0', '1', '2']))

  // 自定义功能选项

  .addOption(
    new commander.Option('--check-syntax', '检查代码是否存在多语抽取的语法错误').default(false).implies({ dry: true })
  )
  .addOption(new commander.Option('--revert', '移除多语抽取，恢复代码').default(false))

  .addOption(
    new commander.Option(
      '--fix <problems>',
      '要修复的多语抽取问题，包括：linebreak(代码格式化换行导致的重复抽取) | repeatextraction(重复抽取问题)，修复多个问题用逗号隔开'
    )
  )

  .addOption(new commander.Option('--remove-comments', '移除抽取工具抽取后添加的多语注释').default(false))
  .version(`jscodeshift ${execute('jscodeshift --version')}`)
  .action(action);

program.on('--help', function () {
  console.log('\n================ JSCODESHIFT HELP ================\n');
  console.log(execute('jscodeshift --help'));
});

program.parseAsync(process.argv);

async function action(files, options, command) {
  const toArgvIgnore = () => null;

  const params = toArgv(command, {
    '--ignore-config': (key, option, value) => {
      if (value?.length) return ['--ignore-config', value];

      return ['--ignore-config', hereRelative('../../config/multilangignore')];
    },

    '--fix': toArgvIgnore,
    '--remove-comments': toArgvIgnore,
    '--check-syntax': toArgvIgnore,
    '--revert': toArgvIgnore,
  });

  // files
  {
    const _files = files.length ? [...files] : ['.'];
    params.push(..._files);
  }

  // 分析工程多语配置
  {
    const multilangconfig = path.resolve('multilangconfig.properties');
    if (fs.existsSync(multilangconfig)) {
      console.log(`Found multilangconfig.properties config file: ${multilangconfig}`);
      const editor = createEditor({ path: multilangconfig });

      const lineexclude = editor.get('lineexclude');

      const rules = lineexclude.split(';');

      const additions = [
        `(cb\\.)?lang\\.templateByUuid`,
        `\\{\\{\\s*translate\\(`,
        `\\/\\*\\s*@ignore-extract-line\\s*\\*\\/`,
        `html-ignore-lang`,
        `\\s*(console|logger)\\.(debug|info|log|warn|error)\\(`,
        `import[\\s\\S]+from\\s*[\\S]+`,
      ].filter((rule) => !rules.includes(rule));

      if (additions.length) {
        rules.push(...additions);
        editor.set('lineexclude', rules.map((rule) => rule.replace(/\\/g, '\\\\')).join(';'));

        await new Promise((resolve) => {
          editor.save(resolve);
        });
      }
    } else {
      console.log("Can't multilangconfig.properties config file.");
    }
  }

  const trim = (s) => s.replace(/^\s+|\s+$/, '');
  const problems = options.fix?.split(',').map(trim) ?? [];
  if (problems.includes('linebreak')) {
    await execute(['--transform', hereRelative('./transforms/transform_fix-linebreak.cjs'), ...params]);
  }

  if (problems.includes('repeatextraction')) {
    await execute(['--transform', hereRelative('./transforms/transform_fix-repeatextraction.cjs'), ...params]);
  }

  // 移除注释
  if (options.removeComments) {
    await execute(['--transform', hereRelative('./transforms/transform_remove_comment.cjs'), ...params]);
  }

  // 恢复多语代码
  if (options.revert) {
    await execute(['--transform', hereRelative('./transforms/transform_revert.cjs'), ...params]);
  }

  // 代码语法检查
  if (options.checkSyntax) {
    await execute(['--transform', hereRelative('./transforms/transform_check-syntax.cjs'), ...params]);
  }

  //

  async function execute(params) {
    console.log(params);
    await execa('jscodeshift', params, {
      verbose: true,
      preferLocal: true,
      localDir: path.resolve(__dirname, '../..'),
      stderr: process.stderr,
      stdin: process.stdin,
      stdout: process.stdout,
    });
  }
}
