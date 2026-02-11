/**
 * SHA256 checksum utilities with line ending normalization
 * Per validation: normalize CRLF → LF before hashing to prevent false modifications on Windows
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { FileOwnershipError } from '@/types/errors.js';

/**
 * Normalize line endings (CRLF → LF) before hashing
 * Prevents false modification detection on cross-platform development
 */
function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n');
}

/**
 * Compute SHA256 hash of file contents with line ending normalization
 * @param path Absolute path to file
 * @returns Hex digest string (64 chars)
 */
export async function hashFile(path: string): Promise<string> {
  const content = await readFile(path, 'utf-8');
  const normalized = normalizeLineEndings(content);
  return hashString(normalized);
}

/**
 * Compute SHA256 hash of string with line ending normalization
 * @param content String to hash
 * @returns Hex digest string (64 chars)
 */
export function hashString(content: string): string {
  const normalized = normalizeLineEndings(content);
  const hash = createHash('sha256');
  hash.update(normalized, 'utf-8');
  return hash.digest('hex');
}

/**
 * Verify file checksum matches expected hash
 * @param path Absolute path to file
 * @param expected Expected SHA256 hex digest
 * @returns true if match, false otherwise
 */
export async function verifyChecksum(path: string, expected: string): Promise<boolean> {
  try {
    const actual = await hashFile(path);
    return actual === expected;
  } catch (error) {
    throw new FileOwnershipError(
      `Failed to verify checksum for ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
