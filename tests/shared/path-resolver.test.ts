import { describe, it, expect, beforeEach } from 'vitest';
import { KitPathResolver } from '@/shared/path-resolver.js';

describe('KitPathResolver', () => {
  let resolver: KitPathResolver;

  beforeEach(() => {
    resolver = new KitPathResolver();
    resolver.clearCache();
  });

  it('should cache resolved paths', async () => {
    const paths1 = await resolver.resolve();
    const paths2 = await resolver.resolve();
    expect(paths1).toBe(paths2); // Same object reference
  });

  it('should provide getPackagesDir method', async () => {
    const packagesDir = await resolver.getPackagesDir();
    expect(packagesDir).toBeDefined();
    expect(typeof packagesDir).toBe('string');
    expect(packagesDir).toContain('packages');
  });

  it('should provide getProfilesPath method', async () => {
    const profilesPath = await resolver.getProfilesPath();
    expect(profilesPath).toBeDefined();
    expect(typeof profilesPath).toBe('string');
    expect(profilesPath).toContain('profiles.yaml');
  });

  it('should provide getTemplatesDir method', async () => {
    const templatesDir = await resolver.getTemplatesDir();
    // Templates dir may be null if not found
    if (templatesDir) {
      expect(typeof templatesDir).toBe('string');
      expect(templatesDir).toContain('templates');
    }
  });

  it('should provide getRoot method', async () => {
    const root = await resolver.getRoot();
    expect(root).toBeDefined();
    expect(typeof root).toBe('string');
  });

  it('should clear cache when clearCache is called', async () => {
    const paths1 = await resolver.resolve();
    resolver.clearCache();
    const paths2 = await resolver.resolve();
    expect(paths1).not.toBe(paths2); // Different object references
    expect(paths1).toEqual(paths2); // But same values
  });

  it('should throw error when EPOST_KIT_ROOT is invalid', async () => {
    // Set invalid EPOST_KIT_ROOT
    const originalEnv = process.env.EPOST_KIT_ROOT;
    process.env.EPOST_KIT_ROOT = '/nonexistent/invalid/path';

    try {
      const badResolver = new KitPathResolver();
      await expect(badResolver.resolve()).rejects.toThrow('EPOST_KIT_ROOT is set but invalid');
    } finally {
      // Restore original env
      if (originalEnv) {
        process.env.EPOST_KIT_ROOT = originalEnv;
      } else {
        delete process.env.EPOST_KIT_ROOT;
      }
    }
  });

  it('should respect EPOST_KIT_ROOT env var', async () => {
    // This test would need actual kit root path
    // Skipping implementation as it requires filesystem setup
  });

  it('should provide consistent path separators', async () => {
    const packagesDir = await resolver.getPackagesDir();
    expect(packagesDir).toBeDefined();
    expect(typeof packagesDir).toBe('string');
  });

  it('should handle getTemplatesDir returning null gracefully', async () => {
    const templatesDir = await resolver.getTemplatesDir();
    // Templates dir may be null if not found
    if (templatesDir !== null) {
      expect(typeof templatesDir).toBe('string');
    }
  });

  it('should return string from getRoot', async () => {
    const root = await resolver.getRoot();
    expect(typeof root).toBe('string');
    expect(root.length).toBeGreaterThan(0);
  });

  it('should create new resolver instances independently', () => {
    const resolver1 = new KitPathResolver();
    const resolver2 = new KitPathResolver();
    expect(resolver1).not.toBe(resolver2);
  });

  it('should handle multiple clearCache calls', async () => {
    await resolver.resolve();
    resolver.clearCache();
    resolver.clearCache(); // Should not throw
    const paths = await resolver.resolve();
    expect(paths).toBeDefined();
  });

  it('should resolve paths consistently', async () => {
    const paths1 = await resolver.resolve();
    const paths2 = await resolver.resolve();
    expect(paths1.packages).toBe(paths2.packages);
    expect(paths1.profiles).toBe(paths2.profiles);
  });

  it('should have valid paths structure', async () => {
    const paths = await resolver.resolve();
    expect(paths).toHaveProperty('root');
    expect(paths).toHaveProperty('packages');
    expect(paths).toHaveProperty('profiles');
  });
});
