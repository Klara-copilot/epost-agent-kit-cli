/**
 * Registry Client — fetch remote bundles.yaml and skill-index.json from GitHub.
 *
 * Uses GitHub raw content (no auth required for public repo).
 * Falls back gracefully to null on network errors.
 */

import { logger } from '@/shared/logger.js';
import { parseSimpleYaml } from '@/domains/packages/package-resolver.js';
import { readRegistryCache, writeRegistryCache } from './registry-cache.js';
import type { BundlesFile } from '@/domains/resolver/bundles.js';

// GitHub raw content base — override via EPOST_KIT_REGISTRY_URL env
const DEFAULT_REGISTRY_BASE =
  'https://raw.githubusercontent.com/Klara-copilot/epost_agent_kit/main';

function registryBase(): string {
  return (process.env.EPOST_KIT_REGISTRY_URL ?? DEFAULT_REGISTRY_BASE).replace(/\/$/, '');
}

// Cache keys
const CACHE_KEY_BUNDLES = 'remote-bundles.yaml';
const CACHE_KEY_SKILL_INDEX = 'remote-skill-index.json';
const CACHE_KEY_KIT_VERSION = 'remote-kit-version.txt';

// Fetch timeout: 8 seconds
const FETCH_TIMEOUT_MS = 8000;

/** Fetch a remote text resource with timeout */
async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'epost-kit-cli' },
    });
    if (!res.ok) {
      logger.debug(`Registry fetch failed: ${url} → ${res.status}`);
      return null;
    }
    return res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.debug(`Registry fetch error: ${url} → ${msg}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

export interface RemoteRegistry {
  bundles: BundlesFile | null;
  skillIndex: RemoteSkillIndex | null;
  kitVersion: string | null;
}

export interface RemoteSkillIndex {
  version: string;
  count: number;
  skills: Array<{ name: string; [key: string]: unknown }>;
}

/**
 * Fetch remote bundles.yaml.
 * Returns null if unreachable or unparseable.
 */
export async function fetchRemoteBundles(noCache = false): Promise<BundlesFile | null> {
  const cached = await readRegistryCache<BundlesFile>(CACHE_KEY_BUNDLES, noCache);
  if (cached) return cached;

  const text = await fetchText(`${registryBase()}/bundles.yaml`);
  if (!text) return null;

  try {
    const parsed = parseSimpleYaml(text) as BundlesFile;
    if (!parsed?.roles) return null;
    await writeRegistryCache(CACHE_KEY_BUNDLES, parsed);
    return parsed;
  } catch (err) {
    logger.debug(`Failed to parse remote bundles.yaml: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

/**
 * Fetch remote skill-index.json.
 * Returns null if unreachable or invalid.
 */
export async function fetchRemoteSkillIndex(noCache = false): Promise<RemoteSkillIndex | null> {
  const cached = await readRegistryCache<RemoteSkillIndex>(CACHE_KEY_SKILL_INDEX, noCache);
  if (cached) return cached;

  const text = await fetchText(`${registryBase()}/.claude/skills/skill-index.json`);
  if (!text) return null;

  try {
    const parsed: RemoteSkillIndex = JSON.parse(text);
    if (!parsed?.skills) return null;
    await writeRegistryCache(CACHE_KEY_SKILL_INDEX, parsed);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Fetch the latest kit version from the remote package.yaml or bundles.yaml.
 * Returns null if unreachable.
 */
export async function fetchRemoteKitVersion(noCache = false): Promise<string | null> {
  const cached = await readRegistryCache<string>(CACHE_KEY_KIT_VERSION, noCache);
  if (cached) return cached;

  // Fetch bundles.yaml and read version field
  const bundles = await fetchRemoteBundles(noCache);
  const version = (bundles as any)?.version ?? null;
  if (version) {
    await writeRegistryCache(CACHE_KEY_KIT_VERSION, version);
  }
  return version;
}

/**
 * Fetch full remote registry in one call.
 * Returns partial results — each field is null if that fetch failed.
 */
export async function fetchRemoteRegistry(noCache = false): Promise<RemoteRegistry> {
  const [bundles, skillIndex] = await Promise.all([
    fetchRemoteBundles(noCache),
    fetchRemoteSkillIndex(noCache),
  ]);

  const kitVersion = (bundles as any)?.version ?? null;

  return { bundles, skillIndex, kitVersion };
}
