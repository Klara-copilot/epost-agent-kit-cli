/**
 * Marketplace search/filter for `epost-kit browse`.
 * Uses @inquirer/prompts input() for keyword entry.
 */

import { input } from '@inquirer/prompts';
import type { RoleBundle } from '@/domains/resolver/bundles.js';

// ─── Search ───

/**
 * Prompt for a search keyword.
 * Returns trimmed string — empty string signals "back".
 */
export async function promptSearch(): Promise<string> {
  const query = await input({
    message: 'Search roles (empty to go back):',
  });
  return query.trim();
}

/**
 * Filter roles by case-insensitive substring match on:
 * name, description, skill names.
 */
export function filterRoles(
  roles: Record<string, RoleBundle>,
  query: string,
): Record<string, RoleBundle> {
  if (!query) return roles;
  const q = query.toLowerCase();

  const result: Record<string, RoleBundle> = {};
  for (const [name, role] of Object.entries(roles)) {
    const haystack = [
      name,
      role.description ?? '',
      ...(role.skills ?? []),
      ...(role.agents ?? []),
    ]
      .join(' ')
      .toLowerCase();

    if (haystack.includes(q)) {
      result[name] = role;
    }
  }
  return result;
}
