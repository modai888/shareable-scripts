/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/29
 * @description 管理应用package.json
 */
import fs from 'node:fs';
import path from 'node:path';
import resolvePackagePath from 'resolve-package-path';
import { findUpSync, pathExistsSync } from 'find-up';
import { readJsonFile, writeJsonFile } from './json-file.js';

export interface FindPackageUpOptions {
  /**
   * The package name
   */
  name?: string;

  /**
   * Allow symbolic links to match if they point to the requested path type.
   * Default true
   */
  readonly allowSymlinks?: boolean;

  /**
   * The current working directory.
   * Default process.cwd()
   */
  readonly cwd?: URL | string;

  /**
   * A directory path where the search halts if no matches are found before reaching this point.
   * Default: Root directory
   */
  readonly stopAt?: string;
}

export function findPackageUp(options: FindPackageUpOptions = {}) {
  const { name, ...opts } = options;
  const filename = 'package.json';

  const pkgfile = findUpSync(
    (directory) => {
      const p = path.join(directory, filename);
      if (pathExistsSync(p)) {
        if (options.name) {
          const json = JSON.parse(fs.readFileSync(p, { encoding: 'utf-8' }));

          if (json?.name === options.name) {
            return p;
          }
        }

        return p;
      }

      return;
    },
    { ...opts }
  );

  return pkgfile;
}

export function sortByKey(object: { [key: string]: any }): {
  [key: string]: any;
} {
  return Object.keys(object)
    .sort()
    .reduce(
      (sorted, key) => {
        sorted[key] = object[key];
        return sorted;
      },
      {} as { [key: string]: any }
    );
}

export interface Author {
  name: string;
  email: string;
}

export interface Maintainer {
  username: string;
  email: string;
}

export interface Dependencies {
  [name: string]: string | undefined;
}

export interface NodePackage {
  name?: string;
  version?: string;
  description?: string;
  publisher?: Maintainer;
  author?: string | Author;
  maintainers?: Maintainer[];
  keywords?: string[];
  dependencies?: Dependencies;
  peerDependencies?: Dependencies;
  [property: string]: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApplicationLog = (message?: any, ...optionalParams: any[]) => void;

export type ApplicationModuleResolver = (modulePath: string) => string;

export interface ApplicationPackageOptions {
  readonly projectPath: string;
  readonly log?: ApplicationLog;
  readonly error?: ApplicationLog;
  //   readonly registry?: NpmRegistry;
  //   readonly appTarget?: ApplicationProps.Target;
}

export class ApplicationPackage {
  readonly projectPath: string;
  readonly log: ApplicationLog;
  readonly error: ApplicationLog;

  constructor(protected readonly options: ApplicationPackageOptions) {
    this.projectPath = options.projectPath;
    this.log = options.log || console.log.bind(console);
    this.error = options.error || console.error.bind(console);
  }

  protected _pck: NodePackage | undefined;
  get pck(): NodePackage {
    if (this._pck) {
      return this._pck;
    }
    return (this._pck = readJsonFile(this.packagePath));
  }

  get packagePath(): string {
    return this.path('package.json');
  }

  relative(p: string): string {
    return path.relative(this.projectPath, p);
  }

  path(...segments: string[]): string {
    return path.resolve(this.projectPath, ...segments);
  }

  lib(...segments: string[]): string {
    return this.path('lib', ...segments);
  }

  setDependency(name: string, version: string | undefined): boolean {
    const dependencies = this.pck.dependencies || {};
    const currentVersion = dependencies[name];
    if (currentVersion === version) {
      return false;
    }
    if (version) {
      dependencies[name] = version;
    } else {
      delete dependencies[name];
    }
    this.pck.dependencies = sortByKey(dependencies);
    return true;
  }

  save(): Promise<void> {
    return writeJsonFile(this.packagePath, this.pck, {
      detectIndent: true,
    });
  }

  protected _moduleResolver: undefined | ApplicationModuleResolver;
  /**
   * A node module resolver in the context of the application package.
   */
  get resolveModule(): ApplicationModuleResolver {
    if (!this._moduleResolver) {
      const resolutionPaths = this.packagePath || process.cwd();

      this._moduleResolver = (modulePath) => {
        const resolved = resolvePackagePath(modulePath, resolutionPaths);
        if (!resolved) {
          throw new Error('Could not resolve module: ' + modulePath);
        }
        return resolved;
      };
    }
    return this._moduleResolver!;
  }

  resolveModulePath(moduleName: string, ...segments: string[]): string {
    return path.resolve(this.resolveModule(moduleName + '/package.json'), '..', ...segments);
  }
}

export interface CreateApplicationPackageOption extends FindPackageUpOptions {
  readonly log?: ApplicationLog;
  readonly error?: ApplicationLog;
}

export function createApplicationPackage(options: CreateApplicationPackageOption = {}) {
  const pkgfile = findPackageUp(options);

  if (!pkgfile) {
    throw new Error(`Failed to create package: No package.json file.`);
  }

  return new ApplicationPackage({
    projectPath: path.dirname(pkgfile),
    log: options.log,
    error: options.error,
  });
}
