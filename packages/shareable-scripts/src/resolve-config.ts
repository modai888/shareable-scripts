/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/19
 * @description 配置解析
 */
import module from 'node:module';
// import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { findUp } from 'find-up';
import { CommandModule } from 'yargs';

/**
 * 配置解析选项
 */
export type ConfigResolverOptions = {
  configFiles?: string[];
  require?: (id: string) => Promise<NodeModule>;
  moduleResolver?: (id: string, pathBase?: string | URL) => Promise<string>;
};

export interface Config {
  extends?: string | string[];
  scripts?: { [key: string]: CommandModule };
}

interface Extended {
  [k: string]: Extended;
}

export interface ResolvedConfig {
  configPath: string;
  extends: Extended;
  scripts: {
    [id: string]: {
      configuredBy: string[];
      script: CommandModule;
    };
  };
}

type scriptsEntry = [string, { configuredBy: string[]; script: CommandModule }];

export const createRequire = () => (id: string) => {
  if (path.isAbsolute(id)) {
    id = url.pathToFileURL(id).href;
  }

  return import(id);
};

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

  const _resolveExtends = async (
    configPath: string,
    config: Config,
    resolved: string[] = []
  ): Promise<ResolvedConfig> => {
    let configExtends = config.extends ?? [];
    configExtends = typeof configExtends == 'string' ? [configExtends] : configExtends;

    const imports = Promise.all(
      configExtends.map(async (c) => {
        if (resolved.includes(c)) {
          throw `Circular reference for "${c}"\n${resolved.join(' -> ')}`;
        }

        c = await _resolver(c, path.dirname(configPath));
        const config = await _require(c);
        return await _resolveExtends(c, config.default ?? config, resolved.concat(c));
      })
    );

    const extendedConfigs = await imports;
    const extendedScriptsEntries = extendedConfigs.map((c_1) =>
      Object.entries(c_1.scripts).map<scriptsEntry>(([id_1, entry]) => [
        id_1,
        {
          ...entry,
          configuredBy: [c_1.configPath].concat(entry.configuredBy),
        },
      ])
    );
    const ownScriptsEntries = Object.entries(config.scripts ?? {}).map<scriptsEntry>(([id_2, script]) => [
      id_2,
      {
        configuredBy: [],
        script,
      },
    ]);

    return {
      configPath,
      extends: Object.fromEntries(configExtends.map((k, i) => [k, extendedConfigs[i].extends])),
      scripts: Object.fromEntries(([] as scriptsEntry[]).concat(...extendedScriptsEntries, ownScriptsEntries)),
    };
  };

  return {
    resolve: async () => {
      const configFiles = options.configFiles ?? ['scripts.config'];

      const configFile = await findUp(
        configFiles.reduce(
          (files, config) => (files.push(`${config}.js`, `${config}.cjs`, `${config}.mjs`), files),
          [] as string[]
        )
      );

      if (!configFile) {
        return;
      }

      const config = await _require(configFile);
      return _resolveExtends(configFile, config.default ?? config);
    },
  };
}
