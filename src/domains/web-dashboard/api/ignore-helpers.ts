/**
 * Ignore file helpers for REST API routes
 * Read/write .epost-ignore patterns
 */

import { safeReadFile } from '@/shared/file-system.js';

/** Read .epost-ignore patterns (non-blank, non-comment lines) */
export async function readIgnorePatterns(ignorePath: string): Promise<string[]> {
  const content = await safeReadFile(ignorePath);
  if (!content) return [];
  return content.split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}
