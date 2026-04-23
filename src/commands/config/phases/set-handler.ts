/**
 * Config set handler — set a config value by dot-notation key
 * Default: project config. --global: global config.
 */

import pc from 'picocolors';
import { GlobalConfigManager } from '@/domains/config/global-config-manager.js';
import { ProjectConfigManager } from '@/domains/config/project-config-manager.js';
import { coerceValue } from '@/domains/config/config-path-utils.js';
import { resolveInstallDir } from './shared.js';
import type { ConfigSetOptions } from '../types.js';

/** config set <key> <value> — set value by dot-notation */
export async function runSet(opts: ConfigSetOptions): Promise<void> {
  const { installDir } = await resolveInstallDir(opts.dir);
  const coerced = coerceValue(opts.value);

  if (opts.global) {
    await GlobalConfigManager.set(opts.key, coerced);
    console.log(
      `${pc.green('✓')} Set ${pc.cyan(opts.key)} = ${JSON.stringify(coerced)} (global)`,
    );
    return;
  }

  // Default: project config (backward compat)
  await ProjectConfigManager.set(installDir, opts.key, coerced);
  console.log(
    `${pc.green('✓')} Set ${pc.cyan(opts.key)} = ${JSON.stringify(coerced)}`,
  );
}
