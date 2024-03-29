/**
 * @author wangxuebo@yonyou.com
 * @date 2024/03/28
 * @description 配置
 */
import { Command } from 'commander';

/**
 * 独立可执行文件命令
 */
export interface SeparateExecutableScript {
  /**
   * 命令名称和参数
   */
  nameAndArgs: string;
  /**
   * 描述文件
   */
  description: string;

  /**
   * 可执行文件路径
   */
  executableFile: string;

  hidden?: boolean;

  isDefault?: boolean;
}

/**
 * 命令构造器
 */
export type CommandBuilder = (command: Command) => Command;

/**
 * 命令脚本
 */
export type Script = Command | CommandBuilder | SeparateExecutableScript;

/**
 * 配置对象
 */
export interface Config {
  /**
   * 配置扩展
   */
  extends?: string[] | string;

  /**
   * 脚本定义
   */
  scripts?: Script[];
}
