/**
 * Command: epost-kit remove [skill] | --role <name>
 * Uninstall a skill or role bundle; warns about reverse deps; updates .epost.json.
 */

import { resolve, join } from 'node:path';
import { rm, unlink } from 'node:fs/promises';
import { confirm } from '@inquirer/prompts';
import pc from 'picocolors';
import { logger } from '@/shared/logger.js';
import { readEpostConfig, writeEpostConfig } from '@/domains/config/epost-config.js';
import { loadBundles, getAllSkillsForRole, getAllAgentsForRole } from '@/domains/resolver/bundles.js';
import { dirExists, fileExists } from '@/shared/file-system.js';
import type { RemoveOptions } from '@/types/commands.js';
import type { SkillEntry } from '@/domains/resolver/resolver.js';

const PROTECTED_SKILLS = new Set(['core']);

/** Load skill-index.json from installed .claude/ dir */
async function loadSkillIndex(claudeDir: string): Promise<SkillEntry[]> {
  const indexPath = join(claudeDir, 'skills', 'skill-index.json');
  try {
    const fs = await import('node:fs/promises');
    const raw = await fs.readFile(indexPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (parsed.skills ?? []);
  } catch {
    return [];
  }
}

/**
 * Find which installed skills depend on the given skill (reverse deps).
 */
function findReverseDeps(skillName: string, installed: string[], index: SkillEntry[]): string[] {
  return installed.filter((s) => {
    const entry = index.find((e) => e.name === s);
    if (!entry) return false;
    return (
      entry.connections.extends.includes(skillName) ||
      entry.connections.requires.includes(skillName)
    );
  });
}

export async function runRemove(name: string | undefined, opts: RemoveOptions): Promise<void> {
  const cwd = opts.dir ? resolve(opts.dir) : resolve(process.cwd());
  const claudeDir = join(cwd, '.claude');

  const config = await readEpostConfig(cwd);
  if (!config) {
    logger.error('No .epost.json found. Nothing to remove.');
    process.exit(1);
  }

  const isRole = !!opts.role;
  const isDryRun = !!opts.dryRun;
  const isJson = !!opts.json;

  if (isDryRun && !isJson) {
    logger.info(pc.yellow('[dry-run] No files will be removed.'));
  }

  // ── Role mode ──
  if (isRole) {
    let bundles;
    try {
      bundles = await loadBundles();
    } catch (err: any) {
      logger.error(`Cannot load bundles.yaml: ${err.message}`);
      process.exit(1);
    }

    const roleName = opts.role!;
    if (!bundles.roles[roleName]) {
      logger.error(`Unknown role: "${roleName}". Run \`epost-kit roles\` to see available roles.`);
      process.exit(1);
    }

    const roleSkills = getAllSkillsForRole(roleName, bundles.roles);
    const roleAgents = getAllAgentsForRole(roleName, bundles.roles);

    // Only remove skills/agents that are part of this role and not protected
    const skillsToRemove = roleSkills.filter(
      (s) => config.skills.includes(s) && !PROTECTED_SKILLS.has(s),
    );
    const agentsToRemove = roleAgents.filter((a) => config.agents.includes(a));

    if (skillsToRemove.length === 0 && agentsToRemove.length === 0) {
      if (isJson) {
        console.log(JSON.stringify({ removed: [], packages: [roleName] }, null, 2));
      } else {
        logger.info(`Role "${roleName}" has no installed skills or agents to remove.`);
      }
      return;
    }

    if (!isJson) {
      console.log('');
      console.log(pc.bold(`${isDryRun ? '[dry-run] Would remove' : 'Removing'} role: ${pc.cyan(roleName)}`));
      if (skillsToRemove.length > 0) {
        console.log(`  Skills: ${skillsToRemove.map((s) => pc.yellow(s)).join(', ')}`);
      }
      if (agentsToRemove.length > 0) {
        console.log(`  Agents: ${agentsToRemove.map((a) => pc.yellow(a)).join(', ')}`);
      }
      console.log('');
    }

    if (isDryRun) {
      if (isJson) {
        console.log(JSON.stringify({ removed: [...skillsToRemove, ...agentsToRemove], packages: [roleName], dryRun: true }, null, 2));
      } else {
        logger.info('[dry-run] No changes applied.');
      }
      return;
    }

    if (!opts.yes && !opts.force && !isJson) {
      const ok = await confirm({ message: 'Proceed?', default: false });
      if (!ok) {
        logger.info('Cancelled.');
        return;
      }
    }

    const spinner = isJson ? null : logger.spinner('Removing...');
    spinner?.start();

    for (const skill of skillsToRemove) {
      const skillDir = join(claudeDir, 'skills', skill);
      if (await dirExists(skillDir)) {
        await rm(skillDir, { recursive: true, force: true });
      }
    }

    for (const agent of agentsToRemove) {
      const agentFile = join(claudeDir, 'agents', `${agent}.md`);
      if (await fileExists(agentFile)) {
        await unlink(agentFile);
      }
    }

    spinner?.stop();

    config.skills = config.skills.filter((s) => !skillsToRemove.includes(s));
    config.agents = config.agents.filter((a) => !agentsToRemove.includes(a));
    if (config.role === roleName) config.role = null;
    config.lastUpdated = new Date().toISOString();
    await writeEpostConfig(cwd, config);

    if (isJson) {
      console.log(JSON.stringify({ removed: [...skillsToRemove, ...agentsToRemove], packages: [roleName] }, null, 2));
    } else {
      logger.success(`Removed role "${roleName}": ${skillsToRemove.length} skills, ${agentsToRemove.length} agents`);
    }
    return;
  }

  // ── Skill mode ──
  if (!name) {
    logger.error('Usage: epost-kit remove <skill-name> | --role <role-name>');
    process.exit(1);
  }

  if (PROTECTED_SKILLS.has(name)) {
    logger.error(`Cannot remove protected skill: "${name}"`);
    process.exit(1);
  }

  if (!config.skills.includes(name)) {
    if (isJson) {
      console.log(JSON.stringify({ removed: [], packages: [name] }, null, 2));
    } else {
      logger.info(`Skill "${name}" is not installed.`);
    }
    return;
  }

  // Reverse dep check
  const skillIndex = await loadSkillIndex(claudeDir);
  const reverseDeps = findReverseDeps(name, config.skills, skillIndex);

  if (reverseDeps.length > 0) {
    if (!isJson) {
      logger.warn(
        `Other installed skills depend on "${name}": ${reverseDeps.join(', ')}`,
      );
      logger.warn('Removing it may break those skills.');
    }

    if (isDryRun) {
      if (isJson) {
        console.log(JSON.stringify({ removed: [name], packages: [name], dryRun: true, reverseDeps }, null, 2));
      } else {
        logger.info(`[dry-run] Would remove skill "${name}" (with reverse-dep warning).`);
      }
      return;
    }

    if (!opts.force && !isJson) {
      if (!opts.yes) {
        const ok = await confirm({
          message: 'Remove anyway?',
          default: false,
        });
        if (!ok) {
          logger.info('Cancelled.');
          return;
        }
      }
    }
  } else {
    if (!isJson) {
      console.log('');
      console.log(`${isDryRun ? '[dry-run] Would remove' : 'Removing'} skill: ${pc.yellow(name)}`);
      console.log('');
    }

    if (isDryRun) {
      if (isJson) {
        console.log(JSON.stringify({ removed: [name], packages: [name], dryRun: true }, null, 2));
      } else {
        logger.info('[dry-run] No changes applied.');
      }
      return;
    }

    if (!opts.yes && !opts.force && !isJson) {
      const ok = await confirm({ message: 'Proceed?', default: false });
      if (!ok) {
        logger.info('Cancelled.');
        return;
      }
    }
  }

  const skillDir = join(claudeDir, 'skills', name);
  if (await dirExists(skillDir)) {
    await rm(skillDir, { recursive: true, force: true });
  }

  config.skills = config.skills.filter((s) => s !== name);
  config.lastUpdated = new Date().toISOString();
  await writeEpostConfig(cwd, config);

  if (isJson) {
    console.log(JSON.stringify({ removed: [name], packages: [name] }, null, 2));
  } else {
    logger.success(`Removed skill: "${name}"`);
  }
}
