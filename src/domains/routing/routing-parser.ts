/**
 * Routing parser — shared domain for dry-run and trace commands.
 * Reads the installed CLAUDE.md, extracts the Intent Map table,
 * and scores a prompt against each intent row.
 */

import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export interface RoutingRow {
  intent: string;
  examples: string;
  routesTo: string;
}

export interface RoutingMatch {
  intent: string;
  skill: string | null;
  agent: string | null;
  ruleIndex: number;
  score: number;
  row: RoutingRow;
}

export interface RoutingParseResult {
  rows: RoutingRow[];
  sourceFile: string;
}

/**
 * Find the installed CLAUDE.md. Checks .claude/CLAUDE.md then project root CLAUDE.md.
 */
export function findClaudeMd(cwd: string): string | null {
  const candidates = [
    join(cwd, 'CLAUDE.md'),
    join(cwd, '.claude', 'CLAUDE.md'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Extract the Intent Map table from CLAUDE.md content.
 * Looks for a markdown table with columns: Intent | Natural prompts | Routes To
 */
export function extractIntentMap(content: string): RoutingRow[] {
  const rows: RoutingRow[] = [];

  // Find the Intent Map section — look for the table header row
  const lines = content.split('\n');
  let inTable = false;
  let headerFound = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Look for the header row containing all three column names
    if (!headerFound && trimmed.includes('Intent') && trimmed.includes('Routes To') && trimmed.startsWith('|')) {
      headerFound = true;
      inTable = true;
      continue;
    }

    if (!inTable) continue;

    // Skip separator row (---|---|---)
    if (trimmed.startsWith('|') && /^\|[-| ]+\|$/.test(trimmed)) {
      continue;
    }

    // Stop at blank line or non-table line after table starts
    if (!trimmed.startsWith('|')) {
      if (headerFound && rows.length > 0) break;
      continue;
    }

    // Parse table row
    const cells = trimmed
      .split('|')
      .slice(1, -1)  // remove leading/trailing empty strings from outer |
      .map((c) => c.trim());

    if (cells.length >= 3 && cells[0] && cells[0] !== 'Intent') {
      rows.push({
        intent: cells[0],
        examples: cells[1],
        routesTo: cells[2],
      });
    }
  }

  return rows;
}

/**
 * Parse the installed CLAUDE.md and return the routing table.
 */
export async function parseRoutingTable(cwd: string): Promise<RoutingParseResult | null> {
  const filePath = findClaudeMd(cwd);
  if (!filePath) return null;

  const content = await readFile(filePath, 'utf-8');
  const rows = extractIntentMap(content);

  return { rows, sourceFile: filePath };
}

/**
 * Score a prompt against a single routing row.
 * Matches by lowercase word overlap with the examples cell.
 */
function scoreRow(prompt: string, row: RoutingRow): number {
  const promptWords = prompt.toLowerCase().split(/\s+/).filter(Boolean);
  const examples = row.examples.toLowerCase();

  let score = 0;
  for (const word of promptWords) {
    if (examples.includes(word)) {
      score += 1;
    }
  }
  return score;
}

/**
 * Extract agent name from a "Routes To" cell value.
 * Examples: "`epost-fullstack-developer` via Agent tool" → "epost-fullstack-developer"
 */
function extractAgent(routesTo: string): string | null {
  // Match backtick-quoted name
  const backtickMatch = routesTo.match(/`([^`]+)`/);
  if (backtickMatch) return backtickMatch[1];

  // Match epost-* pattern directly
  const nameMatch = routesTo.match(/(epost-[\w-]+)/);
  if (nameMatch) return nameMatch[1];

  return null;
}

/**
 * Extract skill from "Routes To" cell value.
 * Examples: "/cook skill" → "/cook"
 */
function extractSkill(routesTo: string): string | null {
  const skillMatch = routesTo.match(/(\/[\w-]+)\s+skill/i);
  if (skillMatch) return skillMatch[1];

  // Also check for slash commands without "skill" suffix
  const slashMatch = routesTo.match(/(\/[\w-]+)/);
  if (slashMatch) return slashMatch[1];

  return null;
}

/**
 * Match a prompt against the routing table and return the best match.
 */
export function matchPrompt(prompt: string, rows: RoutingRow[]): RoutingMatch | null {
  if (rows.length === 0) return null;

  let bestScore = -1;
  let bestRow: RoutingRow | null = null;
  let bestIndex = 0;

  for (let i = 0; i < rows.length; i++) {
    const score = scoreRow(prompt, rows[i]);
    if (score > bestScore) {
      bestScore = score;
      bestRow = rows[i];
      bestIndex = i;
    }
  }

  // Fall back to first row if no matches at all
  if (!bestRow || bestScore === 0) {
    bestRow = rows[0];
    bestIndex = 0;
    bestScore = 0;
  }

  return {
    intent: bestRow.intent,
    agent: extractAgent(bestRow.routesTo),
    skill: extractSkill(bestRow.routesTo),
    ruleIndex: bestIndex + 1,
    score: bestScore,
    row: bestRow,
  };
}

/**
 * Full pipeline: parse CLAUDE.md → match prompt → return result.
 */
export async function routePrompt(
  prompt: string,
  cwd: string,
): Promise<{ match: RoutingMatch; sourceFile: string } | null> {
  const parsed = await parseRoutingTable(cwd);
  if (!parsed) return null;

  const match = matchPrompt(prompt, parsed.rows);
  if (!match) return null;

  return { match, sourceFile: parsed.sourceFile };
}
