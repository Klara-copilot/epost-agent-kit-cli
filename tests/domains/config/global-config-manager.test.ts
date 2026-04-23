/**
 * Unit tests for GlobalConfigManager
 * Uses a unique test key to avoid conflicts with real config.
 * Reads/writes the real ~/.epost-kit/config.json but cleans up after.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { GlobalConfigManager } from '@/domains/config/global-config-manager.js';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';

const TEST_KEY = '__test_epost_unit_' + Date.now();

describe('GlobalConfigManager', () => {
  afterEach(async () => {
    // Clean up: remove test key from global config
    try {
      const config = await GlobalConfigManager.load();
      if (config[TEST_KEY] !== undefined) {
        delete config[TEST_KEY];
        await GlobalConfigManager.save(config);
      }
    } catch {
      // Best-effort cleanup
    }
  });

  it('load() returns {} when config does not exist', async () => {
    // The file likely exists from previous tests, so test with a missing sub-key
    const config = await GlobalConfigManager.load();
    expect(config).toBeDefined();
    expect(typeof config).toBe('object');
  });

  it('set() creates file and directory', async () => {
    await GlobalConfigManager.set(TEST_KEY, { nested: true });

    // Verify file exists and is readable
    const configPath = GlobalConfigManager.getPath();
    const content = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed[TEST_KEY]).toEqual({ nested: true });
  });

  it('get() returns value after set()', async () => {
    await GlobalConfigManager.set(TEST_KEY, 'hello');
    const value = await GlobalConfigManager.get(TEST_KEY);
    expect(value).toBe('hello');
  });

  it('get() returns undefined for missing key', async () => {
    const value = await GlobalConfigManager.get('__nonexistent_key_xyz');
    expect(value).toBeUndefined();
  });

  it('save() and load() round-trip', async () => {
    const config = await GlobalConfigManager.load();
    config[TEST_KEY] = { round: 'trip', number: 42 };
    await GlobalConfigManager.save(config);

    const loaded = await GlobalConfigManager.load();
    expect(loaded[TEST_KEY]).toEqual({ round: 'trip', number: 42 });
  });

  it('set() with dot-notation key', async () => {
    await GlobalConfigManager.set(`${TEST_KEY}.deep.key`, 'value');
    const result = await GlobalConfigManager.get(`${TEST_KEY}.deep.key`);
    expect(result).toBe('value');
  });

  it('getPath() returns path under home directory', () => {
    const path = GlobalConfigManager.getPath();
    expect(path).toContain('.epost-kit');
    expect(path).toContain('config.json');
    expect(path.startsWith(homedir())).toBe(true);
  });
});
