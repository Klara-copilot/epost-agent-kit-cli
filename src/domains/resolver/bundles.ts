/**
 * Bundle loader — reads bundles.yaml from the kit source repo.
 *
 * bundles.yaml lives in the epost_agent_kit repository root.
 * Resolved via EPOST_KIT_ROOT env var or sibling repo pattern.
 */

import { readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSimpleYaml } from '@/domains/packages/package-resolver.js';
import { fileExists } from '@/shared/file-system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Types ───

export interface RoleBundle {
  description: string;
  skills: string[];
  agents: string[];
  /** Roles this bundle merges into itself */
  extends?: string[];
  /** Suggested but not auto-installed skills */
  suggested?: string[];
}

export interface BundlesFile {
  version: string;
  roles: Record<string, RoleBundle>;
}

/** Shared base skills/agents included in every role */
export const SHARED_SKILLS = ['core', 'skill-discovery', 'knowledge-retrieval'];
export const SHARED_AGENTS = [
  'epost-planner',
  'epost-debugger',
  'epost-researcher',
  'epost-docs-manager',
  'epost-git-manager',
];

// ─── Resolution ───

/**
 * Find the bundles.yaml path.
 * Search order:
 *   1. EPOST_KIT_ROOT env var
 *   2. Sibling repo: ../epost_agent_kit/ (dev mode)
 *   3. Binary-relative: ../../../../ (npm link from dist/)
 */
async function findBundlesYaml(): Promise<string> {
  const candidates: string[] = [];

  if (process.env.EPOST_KIT_ROOT) {
    candidates.push(join(resolve(process.env.EPOST_KIT_ROOT), 'bundles.yaml'));
  }

  // Sibling repo (dev mode): CLI is at ../epost-agent-kit-cli, kit is at ../epost_agent_kit
  const siblingPath = resolve(__dirname, '../../../../..', 'epost_agent_kit', 'bundles.yaml');
  candidates.push(siblingPath);

  // npm-linked: dist/domains/resolver -> root is 3 levels up inside cli, then sibling
  const linkedPath = resolve(__dirname, '../../../..', 'epost_agent_kit', 'bundles.yaml');
  candidates.push(linkedPath);

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }

  throw new Error(
    'Cannot find bundles.yaml. Set EPOST_KIT_ROOT to the epost_agent_kit repo path.',
  );
}

/**
 * Load and parse bundles.yaml.
 */
export async function loadBundles(): Promise<BundlesFile> {
  const bundlesPath = await findBundlesYaml();
  const content = await readFile(bundlesPath, 'utf-8');
  const parsed = parseSimpleYaml(content) as BundlesFile;
  return parsed;
}

/**
 * Merge a role's skills/agents with its extended parents (recursive, max 3 hops).
 * Returns the fully merged skill + agent lists for a given role.
 */
export function mergeRoleBundle(
  roleName: string,
  roles: Record<string, RoleBundle>,
  depth = 0,
): { skills: string[]; agents: string[] } {
  if (depth > 3) return { skills: [], agents: [] };

  const role = roles[roleName];
  if (!role) return { skills: [], agents: [] };

  let skills = [...(role.skills ?? [])];
  let agents = [...(role.agents ?? [])];

  for (const parent of role.extends ?? []) {
    const parentMerged = mergeRoleBundle(parent, roles, depth + 1);
    skills = [...new Set([...parentMerged.skills, ...skills])];
    agents = [...new Set([...parentMerged.agents, ...agents])];
  }

  return { skills, agents };
}

/**
 * Get all skills for a role (including shared baseline).
 */
export function getAllSkillsForRole(
  roleName: string,
  roles: Record<string, RoleBundle>,
): string[] {
  const { skills } = mergeRoleBundle(roleName, roles);
  return [...new Set([...SHARED_SKILLS, ...skills])];
}

/**
 * Get all agents for a role (including shared agents).
 */
export function getAllAgentsForRole(
  roleName: string,
  roles: Record<string, RoleBundle>,
): string[] {
  const { agents } = mergeRoleBundle(roleName, roles);
  return [...new Set([...SHARED_AGENTS, ...agents])];
}
