/**
 * Project config manager — static facade for .claude/.epost-kit.json
 * Handles project-level settings stored inside the install directory
 */

import { join } from 'node:path';
import { safeReadFile, safeWriteFile } from '@/shared/file-system.js';
import { enforceFilePermissions } from './config-security.js';
import { getByPath, setByPath } from './config-path-utils.js';

/** Relative filename inside the install directory */
const PROJECT_CONFIG_FILE = '.epost-kit.json';

export class ProjectConfigManager {
  /** Absolute path to the project config file */
  static getPath(installDir: string): string {
    return join(installDir, PROJECT_CONFIG_FILE);
  }

  /** Load project config; returns {} when file is missing or invalid */
  static async load(installDir: string): Promise<Record<string, any>> {
    const content = await safeReadFile(ProjectConfigManager.getPath(installDir));
    if (!content) return {};
    try {
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  /** Persist config to disk with restricted file permissions (0o600) */
  static async save(installDir: string, config: Record<string, any>): Promise<void> {
    const path = ProjectConfigManager.getPath(installDir);
    const json = JSON.stringify(config, null, 2) + '\n';
    await safeWriteFile(path, json);
    await enforceFilePermissions(path);
  }

  /** Get a single value by dot-notation key */
  static async get(installDir: string, key: string): Promise<any> {
    const config = await ProjectConfigManager.load(installDir);
    return getByPath(config, key);
  }

  /** Set a single value by dot-notation key, then save */
  static async set(installDir: string, key: string, value: any): Promise<void> {
    const config = await ProjectConfigManager.load(installDir);
    setByPath(config, key, value);
    await ProjectConfigManager.save(installDir, config);
  }
}
