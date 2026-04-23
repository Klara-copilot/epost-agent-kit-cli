/**
 * Config show handler — display config with scope filtering
 * Supports --global, --local, --sources flags
 */

import { join } from 'node:path';
import pc from 'picocolors';
import { GlobalConfigManager } from '@/domains/config/global-config-manager.js';
import { ProjectConfigManager } from '@/domains/config/project-config-manager.js';
import { ConfigMerger } from '@/domains/config/config-merger.js';
import { resolveInstallDir, printConfig } from './shared.js';
import type { ConfigOptions } from '../types.js';

/** Format source badge with color */
function sourceBadge(source: string): string {
  switch (source) {
    case 'global':
      return pc.magenta('[global]');
    case 'project':
      return pc.blue('[project]');
    default:
      return pc.dim('[default]');
  }
}

/** Print config with source annotations per leaf key */
function printConfigWithSources(
  obj: Record<string, any>,
  sources: Record<string, 'default' | 'global' | 'project'>,
  prefix = '',
): void {
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      printConfigWithSources(val, sources, fullKey);
    } else {
      const badge = sourceBadge(sources[fullKey] ?? 'default');
      const display = JSON.stringify(val);
      console.log(`  ${pc.cyan(fullKey.padEnd(36))} ${display}  ${badge}`);
    }
  }
}

/** config show — display current config */
export async function runShow(opts: ConfigOptions): Promise<void> {
  const { installDir } = await resolveInstallDir(opts.dir);

  // --global: show global config only
  if (opts.global) {
    const config = await GlobalConfigManager.load();
    if (opts.json) {
      console.log(JSON.stringify(config, null, 2));
      return;
    }
    console.log(`\n${pc.bold('Global config')} ${pc.dim(GlobalConfigManager.getPath())}\n`);
    if (Object.keys(config).length === 0) {
      console.log(pc.dim('  (empty)'));
    } else {
      printConfig(config);
    }
    console.log();
    return;
  }

  // --local: show project config only
  if (opts.local) {
    const config = await ProjectConfigManager.load(installDir);
    if (opts.json) {
      console.log(JSON.stringify(config, null, 2));
      return;
    }
    const configPath = ProjectConfigManager.getPath(installDir);
    console.log(`\n${pc.bold('Project config')} ${pc.dim(configPath)}\n`);
    if (Object.keys(config).length === 0) {
      console.log(pc.dim('  (empty)'));
    } else {
      printConfig(config);
    }
    console.log();
    return;
  }

  // --sources: show merged config with source badges
  if (opts.sources) {
    const defaults = ConfigMerger.getDefaults();
    const global = await GlobalConfigManager.load();
    const project = await ProjectConfigManager.load(installDir);
    const { merged, sources } = ConfigMerger.mergeWithSources(defaults, global, project);

    if (opts.json) {
      console.log(JSON.stringify(merged, null, 2));
      return;
    }
    console.log(`\n${pc.bold('Merged config')} ${pc.dim('(with sources)')}\n`);
    printConfigWithSources(merged, sources);
    console.log();
    return;
  }

  // Default: show project config (backward compat)
  const config = await ProjectConfigManager.load(installDir);
  if (opts.json) {
    console.log(JSON.stringify(config, null, 2));
    return;
  }
  const configPath = join(installDir, '.epost-kit.json');
  console.log(`\n${pc.bold('.epost-kit.json')} ${pc.dim(configPath)}\n`);
  if (Object.keys(config).length === 0) {
    console.log(pc.dim('  (empty)'));
  } else {
    printConfig(config);
  }
  console.log();
}
