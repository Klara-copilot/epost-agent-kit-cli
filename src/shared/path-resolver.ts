/**
 * Centralized kit path resolution
 * Handles dev mode (sibling repo), legacy dev (nested), and production (GitHub download)
 */

import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fileExists, dirExists } from "./file-system.js";

export interface KitPaths {
  root: string; // Kit repository root
  packages: string; // packages/ directory
  profiles: string; // profiles/profiles.yaml path
  templates: string | null; // templates/ directory (optional)
}

/**
 * Validate if directory is a valid kit root
 * Must have both packages/core/package.yaml AND profiles/profiles.yaml
 */
async function isKitRoot(dir: string): Promise<boolean> {
  const packagesMarker = join(dir, "packages", "core", "package.yaml");
  const profilesMarker = join(dir, "profiles", "profiles.yaml");
  return (
    (await fileExists(packagesMarker)) && (await fileExists(profilesMarker))
  );
}

export class KitPathResolver {
  private cached: KitPaths | null = null;
  private cliDir: string;

  constructor(cliDir?: string) {
    // Default to current module's directory
    this.cliDir =
      cliDir ||
      dirname(fileURLToPath(import.meta.url || "file://" + __filename));
  }

  /**
   * Resolve all kit paths with caching
   * Search order:
   *   1. EPOST_KIT_ROOT env var (explicit override)
   *   2. Sibling repo: ../epost-agent-kit/ (dev mode - NEW)
   *   3. process.cwd() (running from kit repo root)
   *   4. Legacy parent: ../ (old nested structure - DEPRECATED)
   *   5. Binary-relative paths (npm link)
   */
  async resolve(): Promise<KitPaths> {
    if (this.cached) return this.cached;

    // 1. Explicit override via env var
    if (process.env.EPOST_KIT_ROOT) {
      const envRoot = resolve(process.env.EPOST_KIT_ROOT);
      if (await isKitRoot(envRoot)) {
        this.cached = this.buildPaths(envRoot);
        return this.cached;
      }
      throw new Error(
        `EPOST_KIT_ROOT is set but invalid: ${envRoot}\nMust contain packages/core/package.yaml and profiles/profiles.yaml`,
      );
    }

    // Build candidate paths
    const candidates = [
      // 2. Sibling repo (dev mode - NEW separate repo structure)
      resolve(process.cwd(), "..", "epost-agent-kit"),
      // 3. Current working directory
      resolve(process.cwd()),
      // 4. Legacy parent (old nested structure)
      resolve(process.cwd(), ".."),
      // 5. Binary-relative paths (npm link scenarios)
      resolve(this.cliDir, "..", "..", "epost-agent-kit"),
      resolve(this.cliDir, "..", ".."),
      resolve(this.cliDir, "..", "..", "..", "epost-agent-kit"),
      resolve(this.cliDir, "..", "..", ".."),
    ];

    // Search for valid kit root
    for (const candidate of candidates) {
      if (await isKitRoot(candidate)) {
        this.cached = this.buildPaths(candidate);
        return this.cached;
      }
    }

    throw new Error(
      "Cannot find epost-agent-kit repository.\n" +
        "Expected directory structure:\n" +
        "  agent-kit/\n" +
        "  ├── epost-agent-kit/      (kit repo with packages/, profiles/)\n" +
        "  └── epost-agent-kit-cli/  (CLI repo)\n\n" +
        "Set EPOST_KIT_ROOT environment variable to override auto-detection.\n" +
        `Searched: ${candidates.join(", ")}`,
    );
  }

  /**
   * Build KitPaths object from validated root
   */
  private buildPaths(root: string): KitPaths {
    return {
      root,
      packages: join(root, "packages"),
      profiles: join(root, "profiles", "profiles.yaml"),
      templates: join(root, "templates"),
    };
  }

  /**
   * Get packages/ directory or throw
   */
  async getPackagesDir(): Promise<string> {
    const paths = await this.resolve();
    if (!(await dirExists(paths.packages))) {
      throw new Error(`Packages directory not found: ${paths.packages}`);
    }
    return paths.packages;
  }

  /**
   * Get profiles/profiles.yaml path or throw
   */
  async getProfilesPath(): Promise<string> {
    const paths = await this.resolve();
    if (!(await fileExists(paths.profiles))) {
      throw new Error(`Profiles file not found: ${paths.profiles}`);
    }
    return paths.profiles;
  }

  /**
   * Get templates/ directory or null (optional)
   */
  async getTemplatesDir(): Promise<string | null> {
    const paths = await this.resolve();
    if (!paths.templates) return null;
    if (!(await dirExists(paths.templates))) return null;
    return paths.templates;
  }

  /**
   * Get kit root directory
   */
  async getRoot(): Promise<string> {
    const paths = await this.resolve();
    return paths.root;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cached = null;
  }
}

/**
 * Default singleton instance
 */
export const kitPaths = new KitPathResolver();
