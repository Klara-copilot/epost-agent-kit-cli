/**
 * Command: epost-kit enable <type> <name> / disable <type> <name>
 *
 * Toggle skills and hooks on/off without removing them from disk.
 * State is stored in .epost.json as disabledSkills[] and disabledHooks[].
 *
 * Usage:
 *   epost-kit enable skill review
 *   epost-kit disable skill discover
 *   epost-kit enable hook auto-capture
 *   epost-kit disable hook knowledge-capture
 */

import { resolve, join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { logger } from '@/shared/logger.js';
import { readEpostConfig, writeEpostConfig } from '@/domains/config/epost-config.js';
import type { EnableDisableOptions } from '@/types/commands.js';

type ItemType = 'skill' | 'hook';
type Action = 'enable' | 'disable';

interface EnableDisableResult {
  action: Action;
  type: ItemType;
  name: string;
  changed: boolean;
  alreadyInState: boolean;
  notInstalled: boolean;
}

/**
 * Validate that the type argument is 'skill' or 'hook'.
 */
function parseItemType(raw: string): ItemType | null {
  if (raw === 'skill' || raw === 'hook') return raw;
  return null;
}

/**
 * Get installed hook names from .claude/settings.json.
 * Hook names are derived from the filename of the command (e.g. "session-init" from
 * "node .claude/hooks/session-init.cjs").
 */
async function getInstalledHooks(cwd: string): Promise<string[]> {
  const settingsPath = join(cwd, '.claude', 'settings.json');
  if (!existsSync(settingsPath)) return [];

  try {
    const raw = await readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(raw);
    const hooks = settings.hooks as Record<string, Array<{ hooks: Array<{ command: string }> }>> | undefined;
    if (!hooks) return [];

    const names = new Set<string>();
    for (const entries of Object.values(hooks)) {
      for (const entry of entries) {
        for (const h of entry.hooks ?? []) {
          const cmd = h.command ?? '';
          // Extract filename without extension from path (e.g. "session-init" from "node .claude/hooks/session-init.cjs")
          const match = cmd.match(/hooks\/([^/\s]+?)(?:\.cjs)?\s*(?:2>|$)/);
          if (match) names.add(match[1]);
        }
      }
    }
    return [...names];
  } catch {
    return [];
  }
}

/**
 * Toggle hooks in .claude/settings.json.
 * Disabling removes matching hook entries; enabling re-adds them is not feasible
 * without the original source, so we store state in config only.
 *
 * For settings.json, we mark disabled hooks by wrapping with a
 * __disabled__ prefix on the command to prevent execution.
 * Enabling reverses this by stripping the prefix.
 */
async function toggleHookInSettings(
  cwd: string,
  hookName: string,
  action: Action,
): Promise<void> {
  const settingsPath = join(cwd, '.claude', 'settings.json');
  if (!existsSync(settingsPath)) return;

  try {
    const raw = await readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(raw);
    const hooks = settings.hooks as Record<string, Array<{ hooks: Array<{ command: string }> }>> | undefined;
    if (!hooks) return;

    let changed = false;
    for (const entries of Object.values(hooks)) {
      for (const entry of entries) {
        for (const h of entry.hooks ?? []) {
          const cmd = h.command ?? '';
          if (action === 'disable') {
            // Match hook by filename anywhere in the command string
            const filePattern = new RegExp(`hooks/${hookName}(?:\\.cjs)?`);
            if (filePattern.test(cmd) && !cmd.includes('#disabled#')) {
              h.command = cmd.replace(
                filePattern,
                () => `hooks/#disabled#${hookName}.cjs`,
              );
              changed = true;
            }
          } else {
            // Re-enable: strip #disabled# prefix
            if (cmd.includes(`#disabled#${hookName}`)) {
              h.command = cmd.replace(`#disabled#${hookName}.cjs`, `${hookName}.cjs`);
              changed = true;
            }
          }
        }
      }
    }

    if (changed) {
      await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
    }
  } catch {
    // Non-fatal — config is the source of truth
  }
}

export async function runEnableDisable(
  action: Action,
  typeRaw: string | undefined,
  name: string | undefined,
  opts: EnableDisableOptions,
): Promise<void> {
  const cwd = opts.dir ? resolve(opts.dir) : resolve(process.cwd());

  // ── Validate arguments ──
  if (!typeRaw) {
    logger.error(`Usage: epost-kit ${action} <type> <name>`);
    logger.error('  type: skill | hook');
    logger.error(`  e.g.: epost-kit ${action} skill review`);
    process.exit(1);
  }

  const itemType = parseItemType(typeRaw);
  if (!itemType) {
    logger.error(`Unknown type "${typeRaw}". Must be "skill" or "hook".`);
    process.exit(1);
  }

  if (!name) {
    logger.error(`Usage: epost-kit ${action} ${itemType} <name>`);
    process.exit(1);
  }

  // ── Load config ──
  const config = await readEpostConfig(cwd);
  if (!config) {
    logger.error('No .epost.json found. Run `epost-kit init` first.');
    process.exit(1);
  }

  const result: EnableDisableResult = {
    action,
    type: itemType,
    name,
    changed: false,
    alreadyInState: false,
    notInstalled: false,
  };

  if (itemType === 'skill') {
    const isInstalled = config.skills.includes(name);
    if (!isInstalled) {
      result.notInstalled = true;
      if (opts.json) {
        console.log(JSON.stringify({ ...result, error: `Skill "${name}" is not installed.` }, null, 2));
      } else {
        logger.error(`Skill "${name}" is not installed.`);
      }
      process.exit(1);
    }

    const disabled = config.disabledSkills ?? [];
    const isDisabled = disabled.includes(name);

    if (action === 'disable') {
      if (isDisabled) {
        result.alreadyInState = true;
      } else {
        config.disabledSkills = [...disabled, name];
        config.lastUpdated = new Date().toISOString();
        result.changed = true;
      }
    } else {
      // enable
      if (!isDisabled) {
        result.alreadyInState = true;
      } else {
        config.disabledSkills = disabled.filter((s) => s !== name);
        config.lastUpdated = new Date().toISOString();
        result.changed = true;
      }
    }
  } else {
    // hook
    const installedHooks = await getInstalledHooks(cwd);
    const isInstalled = installedHooks.includes(name);
    if (!isInstalled) {
      result.notInstalled = true;
      if (opts.json) {
        console.log(JSON.stringify({ ...result, error: `Hook "${name}" is not installed.` }, null, 2));
      } else {
        logger.error(`Hook "${name}" is not installed.`);
      }
      process.exit(1);
    }

    const disabled = config.disabledHooks ?? [];
    const isDisabled = disabled.includes(name);

    if (action === 'disable') {
      if (isDisabled) {
        result.alreadyInState = true;
      } else {
        config.disabledHooks = [...disabled, name];
        config.lastUpdated = new Date().toISOString();
        result.changed = true;
      }
    } else {
      // enable
      if (!isDisabled) {
        result.alreadyInState = true;
      } else {
        config.disabledHooks = disabled.filter((h) => h !== name);
        config.lastUpdated = new Date().toISOString();
        result.changed = true;
      }
    }

    // Also patch settings.json if state changed
    if (result.changed) {
      await toggleHookInSettings(cwd, name, action);
    }
  }

  // ── Persist config ──
  if (result.changed) {
    await writeEpostConfig(cwd, config);
  }

  // ── Output ──
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.alreadyInState) {
    const stateLabel = action === 'disable' ? 'already disabled' : 'already enabled';
    logger.info(`${itemType} '${name}' is ${stateLabel}.`);
    return;
  }

  const actionLabel = action === 'disable' ? pc.yellow('disabled') : pc.green('enabled');
  console.log(`${pc.green('✓')} ${itemType} '${pc.cyan(name)}' ${actionLabel}`);
}
