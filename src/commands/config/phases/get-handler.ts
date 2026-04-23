/**
 * Config get handler — retrieve a config value by dot-notation key
 * Supports --global, --local, and default (merged) scopes
 */

import pc from 'picocolors';
import { GlobalConfigManager } from '@/domains/config/global-config-manager.js';
import { ProjectConfigManager } from '@/domains/config/project-config-manager.js';

import { resolveInstallDir } from './shared.js';
import type { ConfigGetOptions } from '../types.js';

/** config get <key> — get value by dot-notation */
export async function runGet(opts: ConfigGetOptions): Promise<void> {
  const { installDir } = await resolveInstallDir(opts.dir);

  if (opts.global) {
    const value = await GlobalConfigManager.get(opts.key);
    if (value === undefined) {
      console.error(pc.red(`Key not found in global config: ${opts.key}`));
      process.exit(1);
    }
    console.log(opts.json ? JSON.stringify(value) : JSON.stringify(value, null, 2));
    return;
  }

  if (opts.local) {
    const value = await ProjectConfigManager.get(installDir, opts.key);
    if (value === undefined) {
      console.error(pc.red(`Key not found in project config: ${opts.key}`));
      process.exit(1);
    }
    console.log(opts.json ? JSON.stringify(value) : JSON.stringify(value, null, 2));
    return;
  }

  // Default: read merged config (backward compat with original behavior)
  const config = await ProjectConfigManager.load(installDir);
  const { getByPath } = await import('@/domains/config/config-path-utils.js');
  const value = getByPath(config, opts.key);

  if (value === undefined) {
    console.error(pc.red(`Key not found: ${opts.key}`));
    process.exit(1);
  }

  console.log(opts.json ? JSON.stringify(value) : JSON.stringify(value, null, 2));
}
