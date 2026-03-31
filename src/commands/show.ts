/**
 * Command: epost-kit show <subcommand>
 *
 * Subcommands:
 *   show routing  — extract and render routing table from CLAUDE.md
 *   show config   — display current .epost.json config
 */

import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import pc from 'picocolors';
import { table, keyValue, heading } from '@/domains/ui/index.js';
import { parseRoutingTable } from '@/domains/routing/routing-parser.js';
import { readEpostConfig } from '@/domains/config/epost-config.js';
import { METADATA_FILE } from '@/shared/constants.js';
import type { GlobalOptions } from '@/types/commands.js';

export interface ShowOptions extends GlobalOptions {
  dir?: string;
  json?: boolean;
}

// ── show routing ─────────────────────────────────────────────────────────────

export async function runShowRouting(opts: ShowOptions): Promise<void> {
  const cwd = opts.dir ? resolve(opts.dir) : resolve(process.cwd());

  const parsed = await parseRoutingTable(cwd);

  if (!parsed) {
    const msg = 'No installed CLAUDE.md found. Run `epost-kit install` first.';
    if (opts.json) {
      console.log(JSON.stringify({ error: msg, rows: [] }, null, 2));
    } else {
      console.error(pc.red(msg));
    }
    process.exit(1);
  }

  const { rows, sourceFile } = parsed;

  if (opts.json) {
    console.log(JSON.stringify({ sourceFile, rows }, null, 2));
    return;
  }

  console.log('');
  console.log(heading('Routing Table'));
  console.log(`  ${pc.dim(`Source: ${sourceFile}`)}`);
  console.log('');

  if (rows.length === 0) {
    console.log(`  ${pc.yellow('No routing rows found in CLAUDE.md')}`);
    console.log('');
    return;
  }

  const headers = ['#', 'Intent', 'Examples (excerpt)', 'Routes To'];
  const tableRows = rows.map((row, i) => {
    // Truncate examples for display
    const examplesTrunc =
      row.examples.length > 55 ? row.examples.slice(0, 52) + '...' : row.examples;
    return [`${i + 1}`, row.intent, examplesTrunc, row.routesTo];
  });

  console.log(table(headers, tableRows));
  console.log('');
}

// ── show config ───────────────────────────────────────────────────────────────

export async function runShowConfig(opts: ShowOptions): Promise<void> {
  const cwd = opts.dir ? resolve(opts.dir) : resolve(process.cwd());

  const metadataPath = join(cwd, METADATA_FILE);
  let metadata: Record<string, any> | null = null;
  if (existsSync(metadataPath)) {
    try {
      metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
    } catch {
      metadata = null;
    }
  }

  const config = await readEpostConfig(cwd).catch(() => null);

  if (!metadata && !config) {
    const msg = 'epost-kit is not installed in this project. Run `epost-kit init` first.';
    if (opts.json) {
      console.log(JSON.stringify({ error: msg }, null, 2));
    } else {
      console.error(pc.red(msg));
    }
    process.exit(1);
  }

  if (opts.json) {
    console.log(JSON.stringify({ metadata, config }, null, 2));
    return;
  }

  console.log('');
  console.log(heading('epost-kit Configuration'));
  console.log('');

  if (metadata) {
    console.log(pc.bold('  Metadata (.epost-metadata.json):'));
    const metaPairs: Array<[string, string]> = Object.entries(metadata)
      .filter(([, v]) => v !== null && v !== undefined && !Array.isArray(v) && typeof v !== 'object')
      .map(([k, v]) => [k, String(v)]);
    if (metaPairs.length > 0) {
      console.log(keyValue(metaPairs, { indent: 4 }));
    }
    if (Array.isArray(metadata.installedPackages) && metadata.installedPackages.length > 0) {
      console.log(`    ${'installedPackages'.padEnd(20)}${metadata.installedPackages.join(', ')}`);
    }
    console.log('');
  }

  if (config) {
    console.log(pc.bold('  Config (.epost.json):'));
    const configPairs: Array<[string, string]> = [
      ['version', config.version ?? ''],
      ['kitVersion', config.kitVersion ?? ''],
      ['role', config.role ?? '(none)'],
      ['updatesMode', config.updatesMode ?? ''],
      ['skills', `${config.skills.length} installed`],
      ['agents', `${config.agents.length} installed`],
      ['lastUpdated', config.lastUpdated ?? ''],
    ];
    console.log(keyValue(configPairs, { indent: 4 }));
    console.log('');

    if (config.skills.length > 0) {
      console.log(`  ${pc.bold('Skills:')} ${config.skills.map((s) => pc.green(s)).join(', ')}`);
      console.log('');
    }
    if (config.agents.length > 0) {
      console.log(`  ${pc.bold('Agents:')} ${config.agents.map((a) => pc.blue(a)).join(', ')}`);
      console.log('');
    }
  }
}
