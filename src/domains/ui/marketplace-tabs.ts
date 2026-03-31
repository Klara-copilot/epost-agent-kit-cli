/**
 * Marketplace tab navigation for `epost-kit browse`.
 * Uses @inquirer/prompts select() for navigation menus.
 */

import { select, Separator } from '@inquirer/prompts';
import pc from 'picocolors';
import { noColor } from '@/domains/ui/ui.js';

// ─── Types ───

export type TabValue = 'all' | 'installed' | 'updates' | 'search' | 'exit';

// ─── Tab menu ───

/**
 * Prompt the user to select a navigation tab.
 * @param installedCount  Number of installed roles
 * @param updatesCount    Number of roles with available updates (0 = no updates tab shown if offline)
 * @param isOffline       When true, show offline warning in updates tab label
 */
export async function promptTabSelect(
  installedCount: number,
  updatesCount = 0,
  isOffline = false,
): Promise<TabValue> {
  const installedLabel = noColor
    ? `Installed (${installedCount})`
    : `Installed ${pc.dim(`(${installedCount})`)}`;

  // Updates tab label — show count badge or offline indicator
  let updatesLabel: string;
  if (isOffline) {
    updatesLabel = noColor ? 'Updates (offline)' : `Updates ${pc.dim('(offline)')}`;
  } else if (updatesCount > 0) {
    updatesLabel = noColor
      ? `Updates (${updatesCount})`
      : `Updates ${pc.yellow(`(${updatesCount})`)}`;
  } else {
    updatesLabel = noColor ? 'Updates' : `Updates ${pc.dim('(up to date)')}`;
  }

  const choices = [
    { name: 'All Roles', value: 'all' as TabValue },
    { name: installedLabel, value: 'installed' as TabValue },
    { name: updatesLabel, value: 'updates' as TabValue },
    new Separator(),
    { name: noColor ? 'Search' : `Search`, value: 'search' as TabValue },
    new Separator(),
    { name: 'Exit', value: 'exit' as TabValue },
  ];

  return select({
    message: noColor ? 'epost-kit marketplace' : pc.bold('epost-kit marketplace'),
    choices,
    pageSize: 9,
  });
}

// ─── Role action menu ───

export type RoleAction = 'install' | 'remove' | 'back';

/**
 * Prompt the user for an action on a selected role.
 */
export async function promptRoleAction(
  roleName: string,
  isInstalled: boolean,
): Promise<RoleAction> {
  const choices: Array<{ name: string; value: RoleAction } | Separator> = [];

  if (isInstalled) {
    choices.push({ name: 'Remove this role', value: 'remove' });
  } else {
    choices.push({ name: 'Install this role', value: 'install' });
  }
  choices.push(new Separator());
  choices.push({ name: 'Back', value: 'back' });

  return select({
    message: noColor ? `Action for: ${roleName}` : `Action for: ${pc.cyan(roleName)}`,
    choices,
    pageSize: 6,
  });
}

// ─── Role card selector ───

export interface RoleChoice {
  name: string;
  value: string;
  description?: string;
}

/**
 * Prompt the user to select a role from a filtered list.
 * Returns the selected role name, or '__back__' if back is chosen.
 */
export async function promptRoleSelect(
  roleNames: string[],
  label: string,
): Promise<string> {
  if (roleNames.length === 0) {
    return '__back__';
  }

  const choices: Array<{ name: string; value: string } | Separator> = roleNames.map((r) => ({
    name: r,
    value: r,
  }));
  choices.push(new Separator());
  choices.push({ name: 'Back', value: '__back__' });

  return select({
    message: label,
    choices,
    pageSize: Math.min(roleNames.length + 3, 15),
  });
}
