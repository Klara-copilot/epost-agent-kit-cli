/**
 * Unit tests for ProjectConfigManager
 * Uses temp install directory — no real files touched
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProjectConfigManager } from '@/domains/config/project-config-manager.js';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'epost-project-cfg-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true });
});

describe('ProjectConfigManager', () => {
  it('load() returns {} when no config exists', async () => {
    const config = await ProjectConfigManager.load(tempDir);
    expect(config).toEqual({});
  });

  it('load() reads existing .epost-kit.json', async () => {
    const { writeFile } = await import('node:fs/promises');
    const configPath = ProjectConfigManager.getPath(tempDir);
    await writeFile(configPath, JSON.stringify({ skills: ['core'] }), 'utf-8');

    const config = await ProjectConfigManager.load(tempDir);
    expect(config.skills).toEqual(['core']);
  });

  it('load() returns {} for invalid JSON', async () => {
    const { writeFile } = await import('node:fs/promises');
    const configPath = ProjectConfigManager.getPath(tempDir);
    await writeFile(configPath, 'not-json', 'utf-8');

    const config = await ProjectConfigManager.load(tempDir);
    expect(config).toEqual({});
  });

  it('set() creates file and writes value', async () => {
    await ProjectConfigManager.set(tempDir, 'statusline', 'compact');

    const configPath = ProjectConfigManager.getPath(tempDir);
    const content = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.statusline).toBe('compact');
  });

  it('get() returns value after set()', async () => {
    await ProjectConfigManager.set(tempDir, 'skills.research.engine', 'perplexity');
    const value = await ProjectConfigManager.get(tempDir, 'skills.research.engine');
    expect(value).toBe('perplexity');
  });

  it('get() with dot-notation key', async () => {
    await ProjectConfigManager.set(tempDir, 'a.b.c', 42);
    const value = await ProjectConfigManager.get(tempDir, 'a.b.c');
    expect(value).toBe(42);
  });

  it('get() returns undefined for missing key', async () => {
    const value = await ProjectConfigManager.get(tempDir, 'nonexistent.key');
    expect(value).toBeUndefined();
  });

  it('save() and load() round-trip', async () => {
    const config = { skills: ['core', 'web-frontend'], statusline: 'full' };
    await ProjectConfigManager.save(tempDir, config);

    const loaded = await ProjectConfigManager.load(tempDir);
    expect(loaded).toEqual(config);
  });

  it('set() updates existing file without losing other keys', async () => {
    await ProjectConfigManager.set(tempDir, 'keyA', 'valueA');
    await ProjectConfigManager.set(tempDir, 'keyB', 'valueB');

    const config = await ProjectConfigManager.load(tempDir);
    expect(config.keyA).toBe('valueA');
    expect(config.keyB).toBe('valueB');
  });

  it('getPath() returns path inside install dir', () => {
    const path = ProjectConfigManager.getPath(tempDir);
    expect(path).toBe(join(tempDir, '.epost-kit.json'));
  });
});
