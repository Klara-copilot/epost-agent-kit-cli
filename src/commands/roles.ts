/**
 * Command: epost-kit roles
 * List all available role bundles with description, skill count, agent count, and install status.
 */

import { resolve } from 'node:path';
import pc from 'picocolors';
import Table from 'cli-table3';
import { logger } from '@/shared/logger.js';
import { readEpostConfig } from '@/domains/config/epost-config.js';
import {
  loadBundles,
  getAllSkillsForRole,
  getAllAgentsForRole,
} from '@/domains/resolver/bundles.js';
import type { RolesOptions } from '@/types/commands.js';

export async function runRoles(opts: RolesOptions): Promise<void> {
  const cwd = resolve(process.cwd());

  // Load bundles
  let bundles;
  try {
    bundles = await loadBundles();
  } catch (err: any) {
    logger.error(`Cannot load bundles.yaml: ${err.message}`);
    process.exit(1);
  }

  // Load installed config to check status (optional — no error if absent)
  const config = await readEpostConfig(cwd).catch(() => null);
  const installedRoles = new Set<string>(config?.role ? [config.role] : []);

  const roleNames = Object.keys(bundles.roles);

  if (opts.json) {
    const output = roleNames.map((name) => {
      const skills = getAllSkillsForRole(name, bundles.roles);
      const agents = getAllAgentsForRole(name, bundles.roles);
      return {
        name,
        description: bundles.roles[name].description,
        skillCount: skills.length,
        agentCount: agents.length,
        installed: installedRoles.has(name),
      };
    });
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  const table = new Table({
    head: [
      pc.bold('Role'),
      pc.bold('Description'),
      pc.bold('Skills'),
      pc.bold('Agents'),
      pc.bold('Status'),
    ],
    style: { head: [], border: [] },
    colWidths: [20, 40, 8, 8, 14],
  });

  for (const name of roleNames) {
    const role = bundles.roles[name];
    const skills = getAllSkillsForRole(name, bundles.roles);
    const agents = getAllAgentsForRole(name, bundles.roles);
    const isInstalled = installedRoles.has(name);
    const status = isInstalled
      ? pc.green('● installed')
      : pc.dim('○ available');

    table.push([
      pc.cyan(name),
      role.description,
      String(skills.length),
      String(agents.length),
      status,
    ]);
  }

  console.log('');
  console.log(table.toString());
  console.log('');
  logger.info(`${roleNames.length} roles available. Use ${pc.cyan('epost-kit add --role <name>')} to install.`);
}
