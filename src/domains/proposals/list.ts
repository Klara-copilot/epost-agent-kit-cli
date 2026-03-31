/**
 * List and filter proposal files from docs/proposals/
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Proposal, ProposalStatus, Confidence } from './types.js';

// --- Simple YAML frontmatter parser (no external deps) --------------------
function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }

  return { meta, body: match[2] || '' };
}

/** Load all proposal files from the proposals directory */
export function loadProposals(projectDir: string): Proposal[] {
  const dir = resolve(projectDir, 'docs', 'proposals');
  if (!existsSync(dir)) return [];

  const proposals: Proposal[] = [];

  for (const entry of readdirSync(dir)) {
    // Skip README, signals.json, and other non-proposal files
    if (!entry.endsWith('.md') || entry === 'README.md') continue;
    // Proposal files match: {skill-name}-{YYMMDD}.md
    if (!/^[a-z].*-\d{6}\.md$/.test(entry)) continue;

    const filePath = join(dir, entry);
    let content: string;
    try { content = readFileSync(filePath, 'utf-8'); }
    catch { continue; }

    const { meta, body } = parseFrontmatter(content);
    if (!meta.id) continue;

    proposals.push({
      id: meta.id,
      targetSkill: meta.targetSkill || 'unknown',
      targetFile: meta.targetFile || '',
      signal: meta.signal || '',
      confidence: (meta.confidence || 'low') as Confidence,
      status: (meta.status || 'pending') as ProposalStatus,
      created: meta.created || '',
      old_string: meta.old_string,
      new_string: meta.new_string,
      rejectedReason: meta.rejectedReason,
      filePath,
      body,
    });
  }

  return proposals.sort((a, b) => b.created.localeCompare(a.created));
}

/** Filter proposals by status */
export function filterByStatus(proposals: Proposal[], statuses: ProposalStatus[]): Proposal[] {
  const set = new Set(statuses);
  return proposals.filter(p => set.has(p.status));
}

/** Load signals.json for stats */
export function loadSignalsSummary(projectDir: string) {
  const file = resolve(projectDir, 'docs', 'proposals', 'signals.json');
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf-8'));
  } catch { return null; }
}
