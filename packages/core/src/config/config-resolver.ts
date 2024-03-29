/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/19
 * @description 配置解析
 */
import module from 'node:module';
import path from 'node:path';
import url from 'node:url';
import { findUp } from 'find-up';

import { Config, Script } from './config.js';

/**
 * 配置解析上下文
 */
export interface ConfigResoverContext {
  /**
   * 配置搜索的基准目录
   */
  basePath: string;
}

/**
 * 配置解析选项
 */
export type ConfigResolverOptions = {
  configFiles?: string[];
  require?: (id: string) => Promise<NodeModule>;
  moduleResolver?: (id: string, pathBase?: string | URL) => Promise<string>;
};

/**
 * 配置解析结构
 */
export interface ConfigResolverResult {
  context: string;
  extends: ConfigExtend;
  scripts: ScriptEntry[];
}

interface ConfigExtend {
  [k: string]: ConfigExtend;
}

type ScriptEntry = {
  script: Script;
  scriptConfigFile: string;
};

export const createRequire = () => (id: string) => {
  if (path.isAbsolute(id)) {
    id = url.pathToFileURL(id).href;
  }

  return import(id);
};

const _interop = (mod: any) => {
  return (mod && mod.__esModule) || mod.default ? mod : { default: mod };
};

interface ConfigContext {
  configFile: string;
}

const createConfigContext: (configFile: string) => ConfigContext = (configFile: string) => {
  return { configFile };
};

/**
 * 创建配置解析
 */
export function createConfigResolver(options: ConfigResolverOptions) {
  const _require = options.require ?? createRequire();

  const _resolver =
    options.moduleResolver ??
    ((id: string, pathBase?: string) => {
      pathBase = pathBase || path.dirname(url.fileURLToPath(import.meta.url));

      return module.createRequire(pathBase).resolve(id, {
        paths: [pathBase],
      });
    });

  const _parse = async (context: ConfigContext, resolved: string[] = []): Promise<ConfigResolverResult> => {
    const config: Config = _interop(await _require(context.configFile)).default;

    let configExtends = config.extends ?? [];

    if (typeof configExtends == 'string') {
      configExtends = [configExtends];
    }

    const imports = Promise.all(
      configExtends.map(async (extend) => {
        if (resolved.includes(extend)) {
          throw `Circular reference for "${extend}"\n${resolved.join(' -> ')}`;
        }

        const extendFile = await _resolver(extend, path.dirname(context.configFile));

        return _parse(createConfigContext(extendFile), resolved.concat(extend));
      })
    );

    const extendedConfigs = await imports;

    const extendedScripts = extendedConfigs.reduce<ScriptEntry[]>((scripts, rc) => {
      scripts.push(...(rc.scripts ?? []));
      return scripts;
    }, []);

    const ownScripts = (config.scripts ?? []).map((script) => {
      return {
        scriptConfigFile: context.configFile as string,
        script,
      };
    });

    return {
      context: context.configFile,
      extends: Object.fromEntries(configExtends.map((k, i) => [k, extendedConfigs[i].extends])),
      scripts: [...extendedScripts, ...ownScripts],
    };
  };

  return {
    resolve: async () => {
      let filenames = options.configFiles ?? ['scripts.config'];

      filenames = filenames.reduce<string[]>((files, file) => {
        if (!/\.(c|m)?js$/.test(file)) {
          files.push(`${file}.js`, `${file}.cjs`, `${file}.mjs`);
          return files;
        }

        files.push(file);
        return files;
      }, []);

      const foundConfigFile = await findUp(filenames);

      if (!foundConfigFile) {
        return;
      }

      const context = createConfigContext(foundConfigFile);

      return _parse(context);
    },
  };
}
