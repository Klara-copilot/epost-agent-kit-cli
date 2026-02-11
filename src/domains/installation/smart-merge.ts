/**
 * Smart merge: file classification and merge planning for init command
 */

import { join } from 'node:path';
import { readdir, copyFile } from 'node:fs/promises';
import { classifyFile } from '@/services/file-operations/ownership.js';
import { fileExists } from '@/shared/file-system.js';
import { logger } from '@/shared/logger.js';
import type { Metadata } from '@/types/index.js';

export type MergeAction = 'overwrite' | 'skip' | 'conflict' | 'create';

export interface FileClassification {
  owned: string[];
  modified: string[];
  userCreated: string[];
  new: string[];
}

export interface MergePlan {
  actions: Map<string, MergeAction>;
  summary: {
    overwrite: number;
    skip: number;
    conflict: number;
    create: number;
  };
}

/** Classify files based on ownership and existence */
export async function classifyFiles(
  projectDir: string,
  newFiles: string[],
  metadata: Metadata | null
): Promise<FileClassification> {
  const classification: FileClassification = {
    owned: [],
    modified: [],
    userCreated: [],
    new: [],
  };

  // Scan existing files
  const existingFiles = new Set<string>();
  if (await fileExists(projectDir)) {
    await scanDir(projectDir, existingFiles);
  }

  // Classify new kit files
  for (const relativePath of newFiles) {
    const fullPath = join(projectDir, relativePath);
    const exists = await fileExists(fullPath);

    if (!exists) {
      classification.new.push(relativePath);
      continue;
    }

    if (!metadata) {
      // No metadata, treat all existing files as user-created
      classification.userCreated.push(relativePath);
      continue;
    }

    // Classify based on ownership
    const tier = await classifyFile(fullPath, projectDir, metadata);
    if (tier === 'epost-owned') {
      classification.owned.push(relativePath);
    } else if (tier === 'epost-modified') {
      classification.modified.push(relativePath);
    } else {
      classification.userCreated.push(relativePath);
    }
  }

  return classification;
}

/** Plan merge actions based on classification */
export function planMerge(classification: FileClassification): MergePlan {
  const actions = new Map<string, MergeAction>();

  // Safe to overwrite epost-owned files
  for (const file of classification.owned) {
    actions.set(file, 'overwrite');
  }

  // Skip user-created files
  for (const file of classification.userCreated) {
    actions.set(file, 'skip');
  }

  // Conflict for modified files
  for (const file of classification.modified) {
    actions.set(file, 'conflict');
  }

  // Create new files
  for (const file of classification.new) {
    actions.set(file, 'create');
  }

  return {
    actions,
    summary: {
      overwrite: classification.owned.length,
      skip: classification.userCreated.length,
      conflict: classification.modified.length,
      create: classification.new.length,
    },
  };
}

/** Execute merge plan */
export async function executeMerge(
  plan: MergePlan,
  kitPath: string,
  projectDir: string,
  options: { resolveConflicts?: Map<string, 'keep' | 'overwrite'> } = {}
): Promise<void> {
  const { resolveConflicts = new Map() } = options;

  for (const [relativePath, action] of plan.actions) {
    const srcPath = join(kitPath, relativePath);
    const destPath = join(projectDir, relativePath);

    switch (action) {
      case 'overwrite':
      case 'create':
        logger.debug(`${action}: ${relativePath}`);
        await copyFile(srcPath, destPath);
        break;

      case 'skip':
        logger.debug(`skip: ${relativePath}`);
        break;

      case 'conflict': {
        const resolution = resolveConflicts.get(relativePath);
        if (resolution === 'overwrite') {
          logger.debug(`conflict resolved (overwrite): ${relativePath}`);
          await copyFile(srcPath, destPath);
        } else {
          logger.debug(`conflict resolved (keep): ${relativePath}`);
        }
        break;
      }
    }
  }
}

/** Preview merge plan (dry-run) */
export function previewMerge(plan: MergePlan): string {
  const lines: string[] = [];

  lines.push('Merge Plan:');
  lines.push(`  Overwrite: ${plan.summary.overwrite} file(s)`);
  lines.push(`  Create: ${plan.summary.create} file(s)`);
  lines.push(`  Skip: ${plan.summary.skip} file(s)`);
  lines.push(`  Conflict: ${plan.summary.conflict} file(s)`);

  if (plan.summary.conflict > 0) {
    lines.push('\nConflicts require manual resolution:');
    for (const [file, action] of plan.actions) {
      if (action === 'conflict') {
        lines.push(`  - ${file}`);
      }
    }
  }

  return lines.join('\n');
}

/** Scan directory recursively for files */
async function scanDir(dir: string, files: Set<string>, prefix = ''): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.git')) continue;
    if (entry.name === 'node_modules') continue;

    const relativePath = join(prefix, entry.name);

    if (entry.isDirectory()) {
      await scanDir(join(dir, entry.name), files, relativePath);
    } else {
      files.add(relativePath);
    }
  }
}
