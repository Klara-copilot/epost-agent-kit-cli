/**
 * Global config manager — static facade for ~/.epost-kit/config.json
 * Handles user-level settings that apply across all projects
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { safeReadFile, safeWriteFile } from '@/shared/file-system.js';
import {
  enforceFilePermissions,
  enforceDirPermissions,
} from './config-security.js';
import { getByPath, setByPath } from './config-path-utils.js';

const GLOBAL_DIR = () => join(homedir(), '.epost-kit');
const GLOBAL_CONFIG_PATH = () => join(GLOBAL_DIR(), 'config.json');

export class GlobalConfigManager {
  /** Absolute path to ~/.epost-kit/config.json */
  static getPath(): string {
    return GLOBAL_CONFIG_PATH();
  }

  /** Create ~/.epost-kit/ with restricted permissions (0o700) */
  static async ensureDir(): Promise<void> {
    await mkdir(GLOBAL_DIR(), { recursive: true });
    await enforceDirPermissions(GLOBAL_DIR());
  }

  /** Load global config; returns {} when file is missing or invalid */
  static async load(): Promise<Record<string, any>> {
    const content = await safeReadFile(GLOBAL_CONFIG_PATH());
    if (!content) return {};
    try {
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  /** Persist config to disk with restricted file permissions (0o600) */
  static async save(config: Record<string, any>): Promise<void> {
    await GlobalConfigManager.ensureDir();
    const json = JSON.stringify(config, null, 2) + '\n';
    await safeWriteFile(GLOBAL_CONFIG_PATH(), json);
    await enforceFilePermissions(GLOBAL_CONFIG_PATH());
  }

  /** Get a single value by dot-notation key */
  static async get(key: string): Promise<any> {
    const config = await GlobalConfigManager.load();
    return getByPath(config, key);
  }

  /** Set a single value by dot-notation key, then save */
  static async set(key: string, value: any): Promise<void> {
    const config = await GlobalConfigManager.load();
    setByPath(config, key, value);
    await GlobalConfigManager.save(config);
  }
}
