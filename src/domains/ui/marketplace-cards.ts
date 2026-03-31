/**
 * Marketplace card renderer for `epost-kit browse`.
 * Uses cli-table3 for card-style display, picocolors for badges.
 * Respects NO_COLOR / TERM=dumb for ASCII fallback.
 */

import pc from 'picocolors';
import Table from 'cli-table3';
import { noColor, stripAnsi, termWidth } from '@/domains/ui/ui.js';
import { getAllSkillsForRole, getAllAgentsForRole } from '@/domains/resolver/bundles.js';
import type { RoleBundle } from '@/domains/resolver/bundles.js';

// ─── Types ───

export interface InstallState {
  installedRoles: Set<string>;
}

// ─── Status badges ───

export function statusBadge(roleName: string, state: InstallState): string {
  if (state.installedRoles.has(roleName)) {
    return noColor ? '[INSTALLED]' : pc.green('● installed');
  }
  return noColor ? '[available]' : pc.dim('○ available');
}

// ─── Card rendering ───

const CARD_MIN_WIDTH = 46;

/**
 * Render a single role as a card string using cli-table3.
 * Width adapts to cardWidth parameter (default: fits 1-col at 80 cols).
 */
export function renderRoleCard(
  roleName: string,
  role: RoleBundle,
  state: InstallState,
  cardWidth?: number,
): string {
  const allRoles = { [roleName]: role };
  const skills = getAllSkillsForRole(roleName, allRoles);
  const agents = getAllAgentsForRole(roleName, allRoles);

  const width = cardWidth ?? Math.min(termWidth() - 4, 60);
  const innerWidth = Math.max(width - 4, CARD_MIN_WIDTH); // subtract borders + padding

  // First line: name + status badge (right-aligned)
  const sbadge = statusBadge(roleName, state);
  const badgeLen = stripAnsi(sbadge).length;
  const nameDisplay = noColor ? roleName : pc.bold(pc.cyan(roleName));
  const nameLen = stripAnsi(nameDisplay).length;
  const gap = Math.max(1, innerWidth - nameLen - badgeLen);
  const titleLine = `${nameDisplay}${' '.repeat(gap)}${sbadge}`;

  // Description (truncated)
  const desc = role.description ?? '';
  const truncDesc =
    desc.length > innerWidth ? desc.slice(0, innerWidth - 3) + '...' : desc;
  const descDisplay = noColor ? truncDesc : pc.dim(truncDesc);

  // Skills line
  const skillPreview = skills.slice(0, 4).join(', ') + (skills.length > 4 ? ` (+${skills.length - 4})` : '');
  const skillsLabel = noColor ? 'Skills: ' : pc.dim('Skills: ');
  const skillsLine = `${skillsLabel}${skillPreview}`;

  // Agents line
  const agentPreview = agents.slice(0, 2).join(', ') + (agents.length > 2 ? ` (+${agents.length - 2})` : '');
  const agentsLabel = noColor ? 'Agents: ' : pc.dim('Agents: ');
  const agentsLine = `${agentsLabel}${agentPreview}`;

  const t = new Table({
    style: { head: [], border: [] },
    colWidths: [width],
    wordWrap: false,
    chars: noColor
      ? {
          top: '-', 'top-mid': '-', 'top-left': '+', 'top-right': '+',
          bottom: '-', 'bottom-mid': '-', 'bottom-left': '+', 'bottom-right': '+',
          left: '|', 'left-mid': '|', mid: '-', 'mid-mid': '+',
          right: '|', 'right-mid': '|', middle: '|',
        }
      : undefined,
  });

  t.push([`${titleLine}\n${descDisplay}\n${skillsLine}\n${agentsLine}`]);

  return t.toString();
}

/**
 * Render a grid of role cards.
 * Auto-detects 1 or 2 column layout based on terminal width.
 */
export function renderCardGrid(
  roles: Record<string, RoleBundle>,
  state: InstallState,
): string {
  const tw = termWidth();
  const cols = tw >= 130 ? 2 : 1;
  const cardWidth = cols === 2 ? Math.floor((tw - 6) / 2) : Math.min(tw - 4, 78);

  const entries = Object.entries(roles);
  if (entries.length === 0) {
    return noColor ? '  (no roles found)' : pc.dim('  (no roles found)');
  }

  if (cols === 1) {
    return entries.map(([name, role]) => renderRoleCard(name, role, state, cardWidth)).join('\n');
  }

  // 2-column: pair up cards line-by-line
  const lines: string[] = [];
  for (let i = 0; i < entries.length; i += 2) {
    const [nameA, roleA] = entries[i];
    const cardA = renderRoleCard(nameA, roleA, state, cardWidth);
    if (i + 1 >= entries.length) {
      lines.push(cardA);
    } else {
      const [nameB, roleB] = entries[i + 1];
      const cardB = renderRoleCard(nameB, roleB, state, cardWidth);
      const linesA = cardA.split('\n');
      const linesB = cardB.split('\n');
      const maxLen = Math.max(linesA.length, linesB.length);
      for (let j = 0; j < maxLen; j++) {
        const la = linesA[j] ?? ' '.repeat(cardWidth + 2);
        const lb = linesB[j] ?? '';
        // Pad la to fixed width
        const stripped = stripAnsi(la);
        const pad = Math.max(0, cardWidth + 2 - stripped.length);
        lines.push(`${la}${' '.repeat(pad)}  ${lb}`);
      }
    }
  }
  return lines.join('\n');
}
