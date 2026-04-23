/**
 * REST API routes for config dashboard
 * All config CRUD, hooks management, ignore patterns, and env var status
 */

import { Router } from 'express';
import { GlobalConfigManager } from '@/domains/config/global-config-manager.js';
import { ProjectConfigManager } from '@/domains/config/project-config-manager.js';
import { ConfigMerger } from '@/domains/config/config-merger.js';
import { safeReadFile, safeWriteFile } from '@/shared/file-system.js';
import { join } from 'node:path';
import { isSafeKey } from '@/domains/config/config-security.js';
import { parseEnvFile, writeEnvKey } from './env-helpers.js';
import { readIgnorePatterns } from './ignore-helpers.js';

/** Helper: validate scope param, return 400 if invalid */
function validateScope(scope: string, res: any): boolean {
  if (scope === 'global' || scope === 'project') return true;
  res.status(400).json({ error: 'Invalid scope. Use "global" or "project".' });
  return false;
}

/** Helper: reject dangerous key segments (prototype-pollution guard) */
function validateKey(key: string, res: any): boolean {
  const parts = key.split('.');
  if (parts.every(p => isSafeKey(p))) return true;
  res.status(400).json({ error: 'Invalid key: contains forbidden segment.' });
  return false;
}

export function createConfigRouter(installDir: string): Router {
  const router = Router();
  const envPath = join(installDir, '.env');
  const ignorePath = join(installDir, '.epost-ignore');

  // ── Config endpoints ──────────────────────────────────────────────────────

  /** GET /config — merged config + source map */
  router.get('/config', async (_req, res) => {
    try {
      const defaults = ConfigMerger.getDefaults();
      const global = await GlobalConfigManager.load();
      const project = await ProjectConfigManager.load(installDir);
      res.json(ConfigMerger.mergeWithSources(defaults, global, project));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  /** GET /config/:scope — single scope config */
  router.get('/config/:scope', async (req, res) => {
    try {
      const { scope } = req.params;
      if (!validateScope(scope, res)) return;
      const config = scope === 'global'
        ? await GlobalConfigManager.load()
        : await ProjectConfigManager.load(installDir);
      res.json(config);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  /** PUT /config/:scope/:key — set value in scope */
  router.put('/config/:scope/:key', async (req, res) => {
    try {
      const { scope, key } = req.params;
      const { value } = req.body;
      if (value === undefined) { res.status(400).json({ error: 'Body must include { value: ... }' }); return; }
      if (!validateScope(scope, res)) return;
      if (!validateKey(key, res)) return;
      if (scope === 'global') await GlobalConfigManager.set(key, value);
      else await ProjectConfigManager.set(installDir, key, value);
      res.json({ ok: true, scope, key });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  /** DELETE /config/:scope/:key — reset key (remove from scope) */
  router.delete('/config/:scope/:key', async (req, res) => {
    try {
      const { scope, key } = req.params;
      if (!validateScope(scope, res)) return;
      if (!validateKey(key, res)) return;
      if (scope === 'global') {
        const config = await GlobalConfigManager.load();
        deleteNestedKey(config, key);
        await GlobalConfigManager.save(config);
      } else {
        const config = await ProjectConfigManager.load(installDir);
        deleteNestedKey(config, key);
        await ProjectConfigManager.save(installDir, config);
      }
      res.json({ ok: true, scope, key, action: 'reset' });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Hooks endpoints ───────────────────────────────────────────────────────

  /** GET /hooks — hooks status from merged config */
  router.get('/hooks', async (_req, res) => {
    try {
      const defaults = ConfigMerger.getDefaults();
      const global = await GlobalConfigManager.load();
      const project = await ProjectConfigManager.load(installDir);
      const merged = ConfigMerger.mergeWithSources(defaults, global, project).merged;
      const hooks = merged.hooks ?? {};
      const status: Record<string, { enabled: boolean }> = {};
      for (const [name, val] of Object.entries(hooks)) {
        if (val !== null && typeof val === 'object' && 'enabled' in (val as any)) {
          status[name] = { enabled: (val as any).enabled };
        }
      }
      res.json(status);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  /** PUT /hooks/:name — toggle hook enabled/disabled */
  router.put('/hooks/:name', async (req, res) => {
    try {
      const { name } = req.params;
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') { res.status(400).json({ error: 'Body must include { enabled: boolean }' }); return; }
      await ProjectConfigManager.set(installDir, `hooks.${name}.enabled`, enabled);
      res.json({ ok: true, hook: name, enabled });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Ignore endpoints ──────────────────────────────────────────────────────

  /** GET /ignore — list patterns */
  router.get('/ignore', async (_req, res) => {
    try {
      const patterns = await readIgnorePatterns(ignorePath);
      res.json({ patterns });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  /** POST /ignore — add pattern */
  router.post('/ignore', async (req, res) => {
    try {
      const { pattern } = req.body;
      if (!pattern || typeof pattern !== 'string') { res.status(400).json({ error: 'Body must include { pattern: "..." }' }); return; }
      const existing = await readIgnorePatterns(ignorePath);
      if (existing.includes(pattern)) { res.json({ ok: true, pattern, note: 'already exists' }); return; }
      const content = (await safeReadFile(ignorePath) ?? '').trimEnd();
      await safeWriteFile(ignorePath, content + '\n' + pattern + '\n');
      res.json({ ok: true, pattern });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  /** DELETE /ignore/:pattern — remove pattern */
  router.delete('/ignore/:pattern', async (req, res) => {
    try {
      const { pattern } = req.params;
      const content = await safeReadFile(ignorePath);
      if (!content) { res.status(404).json({ error: 'No .epost-ignore file found' }); return; }
      const lines = content.split('\n');
      const filtered = lines.filter((l) => l.trim() !== pattern);
      if (filtered.length === lines.length) { res.status(404).json({ error: `Pattern not found: ${pattern}` }); return; }
      await safeWriteFile(ignorePath, filtered.join('\n'));
      res.json({ ok: true, pattern });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Env endpoints ─────────────────────────────────────────────────────────

  /** GET /env/:key — status only: { set: boolean } — NEVER expose value */
  router.get('/env/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const envMap = await parseEnvFile(envPath);
      res.json({ key, set: key in envMap });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  /** PUT /env/:key — set env var */
  router.put('/env/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      if (typeof value !== 'string') { res.status(400).json({ error: 'Body must include { value: "..." }' }); return; }
      await writeEnvKey(envPath, key, value);
      res.json({ ok: true, key, set: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  return router;
}

/** Delete a nested key by dot-notation path (e.g. "skills.research.engine") */
function deleteNestedKey(obj: Record<string, any>, path: string): void {
  const parts = path.split('.');
  if (!parts.every(p => isSafeKey(p))) return;
  let cur: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] === undefined) return;
    cur = cur[parts[i]];
  }
  delete cur[parts[parts.length - 1]];
}
