/**
 * Command: epost-kit add [skill] | --role <name>
 * Install a skill (with dependency resolution) or an entire role bundle.
 */

import { resolve, join } from 'node:path';
import { mkdir, copyFile, readdir } from 'node:fs/promises';
import { confirm } from '@inquirer/prompts';
import pc from 'picocolors';
import { logger } from '@/shared/logger.js';
import { readEpostConfig, writeEpostConfig } from '@/domains/config/epost-config.js';
import { resolveDependencies } from '@/domains/resolver/resolver.js';
import {
  loadBundles,
  getAllSkillsForRole,
  getAllAgentsForRole,
} from '@/domains/resolver/bundles.js';
import { findSkillSource, findAgentSource } from '@/domains/resolver/skill-locator.js';
import { dirExists } from '@/shared/file-system.js';
import type { AddOptions } from '@/types/commands.js';

/** Load skill-index.json from installed .claude/ dir */
async function loadSkillIndex(claudeDir: string) {
  const indexPath = join(claudeDir, 'skills', 'skill-index.json');
  const raw = await import('node:fs/promises').then((fs) =>
    fs.readFile(indexPath, 'utf-8').catch(() => '{"skills":[]}'),
  );
  try {
    const parsed = JSON.parse(raw);
    // Accept both { skills: [...] } and plain array
    return Array.isArray(parsed) ? parsed : (parsed.skills ?? []);
  } catch {
    return [];
  }
}

/** Copy a skill directory recursively into .claude/skills/ */
async function copySkillDir(sourceDir: string, targetDir: string): Promise<void> {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(sourceDir, entry.name);
    const dstPath = join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await copySkillDir(srcPath, dstPath);
    } else if (entry.isFile()) {
      await copyFile(srcPath, dstPath);
    }
  }
}

/** Install a list of skills and agents into .claude/ */
async function installItems(
  skillNames: string[],
  agentNames: string[],
  claudeDir: string,
): Promise<{ installedSkills: string[]; installedAgents: string[]; skipped: string[] }> {
  const installedSkills: string[] = [];
  const installedAgents: string[] = [];
  const skipped: string[] = [];

  for (const skillName of skillNames) {
    const sourceDir = await findSkillSource(skillName);
    if (!sourceDir) {
      skipped.push(`skill:${skillName} (source not found)`);
      continue;
    }
    const targetDir = join(claudeDir, 'skills', skillName);
    await copySkillDir(sourceDir, targetDir);
    installedSkills.push(skillName);
  }

  for (const agentName of agentNames) {
    const sourceFile = await findAgentSource(agentName);
    if (!sourceFile) {
      skipped.push(`agent:${agentName} (source not found)`);
      continue;
    }
    const agentsDir = join(claudeDir, 'agents');
    await mkdir(agentsDir, { recursive: true });
    const targetFile = join(agentsDir, `${agentName}.md`);
    await copyFile(sourceFile, targetFile);
    installedAgents.push(agentName);
  }

  return { installedSkills, installedAgents, skipped };
}

export async function runAdd(name: string | undefined, opts: AddOptions): Promise<void> {
  const cwd = opts.dir ? resolve(opts.dir) : resolve(process.cwd());
  const claudeDir = join(cwd, '.claude');

  if (!(await dirExists(claudeDir))) {
    logger.error('No .claude/ directory found. Run `epost-kit init` first.');
    process.exit(1);
  }

  // Load or create .epost.json
  let config = await readEpostConfig(cwd);
  if (!config) {
    logger.warn('.epost.json not found — creating fresh install state');
    config = {
      version: '1',
      installer: 'epost-kit',
      kitVersion: '0.0.0',
      role: null,
      skills: [],
      agents: [],
      updatesMode: 'interactive',
      lastUpdated: new Date().toISOString(),
    };
  }

  const isRole = !!opts.role;
  const isDryRun = !!opts.dryRun;
  const isJson = !!opts.json;

  if (isDryRun && !isJson) {
    logger.info(pc.yellow('[dry-run] No files will be written.'));
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

    const allSkills = getAllSkillsForRole(roleName, bundles.roles);
    const allAgents = getAllAgentsForRole(roleName, bundles.roles);

    // Filter already-installed
    const newSkills = allSkills.filter((s) => !config!.skills.includes(s));
    const newAgents = allAgents.filter((a) => !config!.agents.includes(a));

    if (newSkills.length === 0 && newAgents.length === 0) {
      if (isJson) {
        console.log(JSON.stringify({ added: [], skipped: [], packages: [roleName] }, null, 2));
      } else {
        logger.success(`Role "${roleName}" is already fully installed.`);
      }
      return;
    }

    if (!isJson) {
      console.log('');
      console.log(pc.bold(`${isDryRun ? '[dry-run] Would install' : 'Installing'} role: ${pc.cyan(roleName)}`));
      if (newSkills.length > 0) {
        console.log(`  Skills: ${newSkills.map((s) => pc.green(s)).join(', ')}`);
      }
      if (newAgents.length > 0) {
        console.log(`  Agents: ${newAgents.map((a) => pc.blue(a)).join(', ')}`);
      }
      console.log('');
    }

    if (isDryRun) {
      if (isJson) {
        console.log(JSON.stringify({ added: [...newSkills, ...newAgents], skipped: [], packages: [roleName], dryRun: true }, null, 2));
      } else {
        logger.info('[dry-run] No changes applied.');
      }
      return;
    }

    if (!opts.yes && !isJson) {
      const ok = await confirm({ message: 'Proceed?', default: true });
      if (!ok) {
        logger.info('Cancelled.');
        return;
      }
    }

    const spinner = isJson ? null : logger.spinner('Installing...');
    spinner?.start();

    const { installedSkills, installedAgents, skipped } = await installItems(
      newSkills,
      newAgents,
      claudeDir,
    );

    spinner?.stop();

    // Update config
    config.skills = [...new Set([...config.skills, ...installedSkills])];
    config.agents = [...new Set([...config.agents, ...installedAgents])];
    config.role = roleName;
    config.lastUpdated = new Date().toISOString();
    await writeEpostConfig(cwd, config);

    if (isJson) {
      console.log(JSON.stringify({
        added: [...installedSkills, ...installedAgents],
        skipped,
        packages: [roleName],
      }, null, 2));
    } else {
      logger.success(
        `Installed role "${roleName}": ${installedSkills.length} skills, ${installedAgents.length} agents`,
      );
      if (skipped.length > 0) {
        logger.warn(`Skipped (source not found): ${skipped.join(', ')}`);
      }
    }
    return;
  }

  // ── Skill mode ──
  if (!name) {
    logger.error('Usage: epost-kit add <skill-name> | --role <role-name>');
    process.exit(1);
  }

  // Load skill-index for dependency resolution
  const skillIndex = await loadSkillIndex(claudeDir);
  const resolved = resolveDependencies([name], skillIndex);

  if (resolved.warnings.length > 0) {
    for (const w of resolved.warnings) logger.warn(w);
  }

  const newSkills = resolved.skills.filter((s) => !config.skills.includes(s));

  if (newSkills.length === 0) {
    if (isJson) {
      console.log(JSON.stringify({ added: [], skipped: [], packages: [name] }, null, 2));
    } else {
      logger.success(`"${name}" is already installed (including all deps).`);
    }
    return;
  }

  if (!isJson) {
    console.log('');
    console.log(pc.bold(`${isDryRun ? '[dry-run] Would install' : 'Installing'} skill: ${pc.cyan(name)}`));
    console.log(`  Will install: ${newSkills.map((s) => pc.green(s)).join(', ')}`);
    console.log('');
  }

  if (isDryRun) {
    if (isJson) {
      console.log(JSON.stringify({ added: newSkills, skipped: [], packages: [name], dryRun: true }, null, 2));
    } else {
      logger.info('[dry-run] No changes applied.');
    }
    return;
  }

  if (!opts.yes && !isJson) {
    const ok = await confirm({ message: 'Proceed?', default: true });
    if (!ok) {
      logger.info('Cancelled.');
      return;
    }
  }

  const spinner = isJson ? null : logger.spinner('Installing...');
  spinner?.start();

  const { installedSkills, skipped } = await installItems(newSkills, [], claudeDir);

  spinner?.stop();

  config.skills = [...new Set([...config.skills, ...installedSkills])];
  config.lastUpdated = new Date().toISOString();
  await writeEpostConfig(cwd, config);

  if (isJson) {
    console.log(JSON.stringify({ added: installedSkills, skipped, packages: [name] }, null, 2));
  } else {
    logger.success(`Installed: ${installedSkills.join(', ')}`);
    if (skipped.length > 0) {
      logger.warn(`Skipped (source not found): ${skipped.join(', ')}`);
    }
  }
}
