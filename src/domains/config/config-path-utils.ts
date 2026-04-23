/**
 * Dot-notation path utilities for nested config access
 * Shared by GlobalConfigManager and ProjectConfigManager
 */

import { DANGEROUS_KEYS } from '@/shared/constants.js';

/** Check if any segment in a dot-notation path is a prototype-pollution vector */
function isSafePath(path: string): boolean {
  const parts = path.split('.');
  return parts.every(p => !(DANGEROUS_KEYS as readonly string[]).includes(p));
}

/** Get nested value by dot-notation path (e.g. "skills.research.engine") */
export function getByPath(obj: Record<string, any>, path: string): any {
  if (!isSafePath(path)) return undefined;
  const parts = path.split('.');
  let cur: any = obj;
  for (const part of parts) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

/** Set nested value by dot-notation path, creating intermediate objects. Rejects dangerous keys. */
export function setByPath(obj: Record<string, any>, path: string, value: any): void {
  if (!isSafePath(path)) return;
  const parts = path.split('.');
  let cur: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (cur[part] === null || typeof cur[part] !== 'object') {
      cur[part] = {};
    }
    cur = cur[part];
  }
  cur[parts[parts.length - 1]] = value;
}

/** Coerce string to best-fit type: JSON-parseable value or raw string */
export function coerceValue(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
