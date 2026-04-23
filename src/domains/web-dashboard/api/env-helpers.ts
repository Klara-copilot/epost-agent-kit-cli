/**
 * Env file helpers for REST API routes
 * Read/write .env file for env var status tracking
 */

import { safeReadFile } from '@/shared/file-system.js';
import { readFile, writeFile } from 'node:fs/promises';

/** Read .env file, parse lines into key-value map */
export async function parseEnvFile(envPath: string): Promise<Record<string, string>> {
  const content = await safeReadFile(envPath);
  if (!content) return {};
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eq = trimmed.indexOf('=');
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = value;
  }
  return result;
}

/** Set or update a single env key in .env file */
export async function writeEnvKey(envPath: string, key: string, value: string): Promise<void> {
  let content = '';
  try { content = await readFile(envPath, 'utf-8'); } catch { /* new file */ }

  const lines = content.split('\n');
  const idx = lines.findIndex((l) => {
    const t = l.trim();
    return !t.startsWith('#') && t.startsWith(`${key}=`);
  });

  const newLine = `${key}=${value}`;
  if (idx !== -1) {
    lines[idx] = newLine;
  } else {
    if (content && !content.endsWith('\n')) lines.push('');
    lines.push(newLine);
  }
  await writeFile(envPath, lines.join('\n'), 'utf-8');
}
