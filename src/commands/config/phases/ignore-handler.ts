/**
 * Config ignore handlers — manage .epost-ignore patterns
 * Three exported functions: list, add, remove
 */

import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import pc from 'picocolors';
import { safeReadFile } from '@/shared/file-system.js';
import { resolveInstallDir } from './shared.js';
import type { ConfigOptions, ConfigIgnoreAddOptions, ConfigIgnoreRemoveOptions } from '../types.js';

/** config ignore — show current .epost-ignore patterns */
export async function runConfigIgnore(opts: ConfigOptions): Promise<void> {
  const { installDir } = await resolveInstallDir(opts.dir);
  const ignorePath = join(installDir, '.epost-ignore');
  const content = await safeReadFile(ignorePath);

  if (!content) {
    console.log(pc.dim('No .epost-ignore file found'));
    return;
  }

  if (opts.json) {
    const patterns = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    console.log(JSON.stringify(patterns, null, 2));
    return;
  }

  console.log(`\n${pc.bold('.epost-ignore')} ${pc.dim(ignorePath)}\n`);
  const lines = content.split('\n');
  for (const line of lines) {
    if (!line.trim()) {
      console.log();
    } else if (line.trimStart().startsWith('#')) {
      console.log(pc.dim(line));
    } else {
      console.log(`  ${line}`);
    }
  }
  console.log();
}

/** config ignore add <pattern> — append pattern (no-op if already present) */
export async function runConfigIgnoreAdd(opts: ConfigIgnoreAddOptions): Promise<void> {
  const { installDir } = await resolveInstallDir(opts.dir);
  const ignorePath = join(installDir, '.epost-ignore');
  const existing = (await safeReadFile(ignorePath)) ?? '';

  const lines = existing.split('\n');
  const patterns = new Set(
    lines.map((l) => l.trim()).filter((l) => l && !l.startsWith('#')),
  );

  if (patterns.has(opts.pattern)) {
    console.log(pc.dim(`Pattern already present: ${opts.pattern}`));
    return;
  }

  const newContent = existing.trimEnd() + '\n' + opts.pattern + '\n';
  await writeFile(ignorePath, newContent, 'utf-8');
  console.log(`${pc.green('✓')} Added ignore pattern: ${pc.cyan(opts.pattern)}`);
}

/** config ignore remove <pattern> — remove pattern */
export async function runConfigIgnoreRemove(opts: ConfigIgnoreRemoveOptions): Promise<void> {
  const { installDir } = await resolveInstallDir(opts.dir);
  const ignorePath = join(installDir, '.epost-ignore');
  const existing = await safeReadFile(ignorePath);

  if (!existing) {
    console.error(pc.red('No .epost-ignore file found'));
    process.exit(1);
  }

  const lines = existing.split('\n');
  const filtered = lines.filter((l) => l.trim() !== opts.pattern);

  if (filtered.length === lines.length) {
    console.log(pc.dim(`Pattern not found: ${opts.pattern}`));
    return;
  }

  await writeFile(ignorePath, filtered.join('\n'), 'utf-8');
  console.log(`${pc.green('✓')} Removed ignore pattern: ${pc.cyan(opts.pattern)}`);
}
