/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/15
 * @description Babel构建
 */
import path from 'node:path';
import url from 'node:url';
import { execa } from 'execa';

const __filename__ = typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url);
const __dirname__ = path.dirname(__filename__);

const here = (p) => path.join(__dirname__, p);

const run = async (argv) => {
  console.log('~~~~ babel ~~~~');
  console.log(argv);

  const config = ['--config-file', here('../../config/babelrc.js')];
  const outDir = ['--out-dir', argv.outDir ?? 'lib'];

  // 其他参数
  const args = process.argv.slice(3).map((arg) => arg.replace(`${process.cwd()}/`, ''));

  return execa('babel', [...config, ...outDir, 'src'].concat(args), {
    verbose: true,
    stderr: process.stderr,
    stdin: process.stdin,
    stdout: process.stdout,
  });
};

export { run };
