/**
 * Command: epost-kit list
 * Show installed skills grouped by role (if role-installed) or ungrouped.
 *
 * Subcommand: epost-kit list hooks
 * Show hooks registered in .claude/settings.json
 */

import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import pc from 'picocolors';
import Table from 'cli-table3';
import { logger } from '@/shared/logger.js';
import { readEpostConfig } from '@/domains/config/epost-config.js';
import {
  loadBundles,
  getAllSkillsForRole,
} from '@/domains/resolver/bundles.js';
import type { ListOptions } from '@/types/commands.js';

export async function runList(opts: ListOptions): Promise<void> {
  const cwd = opts.dir ? resolve(opts.dir) : resolve(process.cwd());

  const config = await readEpostConfig(cwd);

  if (!config) {
    logger.error('No .epost.json found. Run `epost-kit init` first.');
    process.exit(1);
  }

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          kitVersion: config.kitVersion,
          role: config.role ?? null,
          skills: config.skills,
          agents: config.agents,
          lastUpdated: config.lastUpdated,
          updatesMode: config.updatesMode,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log('');
  logger.heading('Installed epost-agent-kit');
  console.log('');
  console.log(`  ${pc.dim('Version:')}    ${pc.cyan(config.kitVersion)}`);
  console.log(`  ${pc.dim('Last updated:')} ${new Date(config.lastUpdated).toLocaleDateString()}`);
  console.log(`  ${pc.dim('Updates mode:')} ${config.updatesMode}`);

  if (config.role) {
    console.log(`  ${pc.dim('Role:')}        ${pc.green(config.role)}`);
  }

  console.log('');

  // Skills table
  if (config.skills.length > 0) {
    // Attempt to group skills by role membership
    let bundles;
    try {
      bundles = await loadBundles();
    } catch {
      bundles = null;
    }

    const table = new Table({
      head: [pc.bold('Skill'), pc.bold('Source')],
      style: { head: [], border: [] },
      colWidths: [30, 20],
    });

    for (const skill of config.skills) {
      let source = pc.dim('individual');
      if (config.role && bundles) {
        const roleSkills = getAllSkillsForRole(config.role, bundles.roles);
        if (roleSkills.includes(skill)) {
          source = pc.cyan(config.role);
        }
      }
      table.push([skill, source]);
    }

    console.log(pc.bold('Skills:'));
    console.log(table.toString());
    console.log('');
  } else {
    logger.info('No skills installed.');
  }

  // Agents
  if (config.agents.length > 0) {
    console.log(pc.bold('Agents:'));
    for (const agent of config.agents) {
      console.log(`  ${pc.green('●')} ${agent}`);
    }
    console.log('');
  }
}

/** list hooks — reads hooks from .claude/settings.json */
export async function runListHooks(opts: ListOptions): Promise<void> {
  const cwd = opts.dir ? resolve(opts.dir) : resolve(process.cwd());

  // Try .claude/settings.json first, then .vscode/settings.json
  const claudeSettingsPath = join(cwd, '.claude', 'settings.json');
  const vscodeSettingsPath = join(cwd, '.vscode', 'settings.json');

  let settingsPath: string | null = null;
  if (existsSync(claudeSettingsPath)) {
    settingsPath = claudeSettingsPath;
  } else if (existsSync(vscodeSettingsPath)) {
    settingsPath = vscodeSettingsPath;
  }

  if (!settingsPath) {
    if (opts.json) {
      console.log(JSON.stringify({ hooks: {} }, null, 2));
      return;
    }
    logger.info('No settings.json found (.claude/settings.json or .vscode/settings.json).');
    return;
  }

  let hooksConfig: Record<string, unknown> = {};
  try {
    const raw = await readFile(settingsPath, 'utf-8');
    const settings = JSON.parse(raw);
    hooksConfig = settings.hooks ?? {};
  } catch {
    if (opts.json) {
      console.log(JSON.stringify({ hooks: {} }, null, 2));
      return;
    }
    logger.error('Failed to parse settings.json');
    return;
  }

  if (opts.json) {
    console.log(JSON.stringify({ hooks: hooksConfig }, null, 2));
    return;
  }

  console.log('');
  logger.heading('Installed Hooks');
  console.log('');

  const eventNames = Object.keys(hooksConfig);
  if (eventNames.length === 0) {
    logger.info('No hooks registered in settings.json.');
    console.log('');
    return;
  }

  for (const event of eventNames) {
    console.log(`  ${pc.bold(event)}`);
    const entries = hooksConfig[event];
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (typeof entry === 'object' && entry !== null) {
          const e = entry as Record<string, unknown>;
          const matcher = e.matcher ? ` ${pc.dim(`[${e.matcher}]`)}` : '';
          const hooks = Array.isArray(e.hooks) ? e.hooks : [];
          for (const h of hooks) {
            if (typeof h === 'object' && h !== null) {
              const hook = h as Record<string, unknown>;
              const cmd = typeof hook.command === 'string' ? hook.command : JSON.stringify(hook);
              console.log(`    ${pc.green('→')}${matcher}  ${cmd}`);
            }
          }
        } else if (typeof entry === 'string') {
          console.log(`    ${pc.green('→')}  ${entry}`);
        }
      }
    }
  }
  console.log('');
}
