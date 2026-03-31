/**
 * Skill and agent locator.
 * Searches the kit source packages for a skill or agent by name.
 */

import { readdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirExists, fileExists } from '@/shared/file-system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolve the kit repo root.
 * Same search order as bundles.ts.
 */
async function findKitRoot(): Promise<string> {
  const candidates: string[] = [];

  if (process.env.EPOST_KIT_ROOT) {
    candidates.push(resolve(process.env.EPOST_KIT_ROOT));
  }

  candidates.push(resolve(__dirname, '../../../../..', 'epost_agent_kit'));
  candidates.push(resolve(__dirname, '../../../..', 'epost_agent_kit'));

  for (const candidate of candidates) {
    if (await dirExists(join(candidate, 'packages'))) return candidate;
  }

  throw new Error(
    'Cannot find epost_agent_kit repository. Set EPOST_KIT_ROOT to point to it.',
  );
}

/**
 * Find the source directory for a skill (e.g. packages/core/skills/web-frontend).
 * Returns null if not found.
 */
export async function findSkillSource(skillName: string): Promise<string | null> {
  const kitRoot = await findKitRoot();
  const packagesDir = join(kitRoot, 'packages');

  let pkgNames: string[];
  try {
    pkgNames = await readdir(packagesDir);
  } catch {
    return null;
  }

  for (const pkg of pkgNames) {
    const skillDir = join(packagesDir, pkg, 'skills', skillName);
    if (await dirExists(skillDir)) return skillDir;
  }

  return null;
}

/**
 * Find the source file for an agent (e.g. packages/core/agents/epost-fullstack-developer.md).
 * Returns null if not found.
 */
export async function findAgentSource(agentName: string): Promise<string | null> {
  const kitRoot = await findKitRoot();
  const packagesDir = join(kitRoot, 'packages');

  let pkgNames: string[];
  try {
    pkgNames = await readdir(packagesDir);
  } catch {
    return null;
  }

  const filename = agentName.endsWith('.md') ? agentName : `${agentName}.md`;

  for (const pkg of pkgNames) {
    const agentFile = join(packagesDir, pkg, 'agents', filename);
    if (await fileExists(agentFile)) return agentFile;
  }

  return null;
}
