# Code Standards - Patterns & Configuration

**Project:** ePost Agent Kit CLI
**Created by:** Phuong Doan
**Last Updated:** 2026-02-25

> **See Also:** [Code Standards](./code-standards.md) - Core conventions, naming, TypeScript, error handling

## Common Patterns

### Command Pattern

**Structure:**
```typescript
export async function runCommand(options: CommandOptions): Promise<void> {
  // 1. Validate input
  validateOptions(options);

  // 2. Load dependencies (manifests, metadata)
  const manifests = await loadAllManifests();

  // 3. Coordinate domain operations
  const resolved = resolvePackages(options.profile);
  const plan = createInstallPlan(resolved.packages);

  // 4. Execute operations with progress feedback
  const spinner = logger.spinner('Installing packages...');
  await executeInstall(plan);
  spinner.succeed('Installation complete');

  // 5. Display results
  displaySummary(resolved);
}
```

### Ownership Classification Pattern

**Three-tier system:**
```typescript
type OwnershipTier = 'epost-owned' | 'epost-modified' | 'user-created';

function classifyFile(
  filePath: string,
  projectDir: string,
  metadata: Metadata
): OwnershipTier {
  const relativePath = relative(projectDir, filePath);

  // Check metadata
  const tracked = metadata.files[relativePath];
  if (!tracked) {
    return 'user-created'; // Not in metadata
  }

  // Compute current checksum
  const currentChecksum = hashFile(filePath);

  // Compare
  if (currentChecksum === tracked.checksum) {
    return 'epost-owned'; // No changes
  } else {
    return 'epost-modified'; // User changed
  }
}
```

### Atomic Write Pattern

**Safe file writes:**
```typescript
export async function safeWriteFile(
  path: string,
  content: string
): Promise<void> {
  const tempPath = `${path}.tmp.${Date.now()}`;

  try {
    // Ensure parent directory exists
    await mkdir(dirname(path), { recursive: true });

    // Write to temp file
    await writeFile(tempPath, content, 'utf-8');

    // Atomic rename
    await rename(tempPath, path);
  } catch (error) {
    // Cleanup temp file on error
    await rm(tempPath, { force: true });
    throw error;
  }
}
```

### Topological Sort Pattern

**Kahn's algorithm for dependency resolution:**
```typescript
function topologicalSort(
  packages: Map<string, PackageManifest>
): string[] {
  // Build in-degree map
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const [name, manifest] of packages) {
    inDegree.set(name, manifest.dependencies.length);
    for (const dep of manifest.dependencies) {
      if (!adjacency.has(dep)) adjacency.set(dep, []);
      adjacency.get(dep)!.push(name);
    }
  }

  // Start with zero in-degree nodes
  const queue: string[] = [];
  for (const [name, degree] in inDegree) {
    if (degree === 0) queue.push(name);
  }

  // Process queue
  const sorted: string[] = [];
  while (queue.length > 0) {
    // Sort by layer for stable ordering
    queue.sort((a, b) => packages.get(a)!.layer - packages.get(b)!.layer);

    const node = queue.shift()!;
    sorted.push(node);

    for (const dependent of adjacency.get(node) || []) {
      const newDegree = inDegree.get(dependent)! - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) queue.push(dependent);
    }
  }

  // Detect cycles
  if (sorted.length !== packages.size) {
    const remaining = Array.from(packages.keys())
      .filter(name => !sorted.includes(name));
    throw new ConfigError(`Circular dependencies detected: ${remaining.join(', ')}`);
  }

  return sorted;
}
```

## Testing Standards

### Test File Organization
```typescript
// tests/domains/package-resolver.test.ts

import { describe, it, expect } from 'vitest';
import { resolvePackages } from '@/domains/packages/package-resolver.js';

describe('package-resolver', () => {
  describe('resolvePackages', () => {
    it('should resolve packages from profile', () => {
      const result = resolvePackages('backend-engineer');
      expect(result.packages).toContain('core');
    });

    it('should detect circular dependencies', () => {
      expect(() => resolvePackages('invalid-profile'))
        .toThrow(ConfigError);
    });
  });
});
```

### Test Patterns
- Use `describe` for grouping related tests
- Use `it` for individual test cases
- Descriptive test names: `should <expected behavior> when <condition>`
- Arrange-Act-Assert structure
- One assertion per test (preferred)

### Test Fixtures
```typescript
// tests/helpers/fixtures.ts

export async function createTempProject(): Promise<string> {
  const tempDir = join(tmpdir(), `test-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  return tempDir;
}

export async function cleanupTempProject(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}
```

### Coverage Requirements
- Target: 70% coverage (lines, functions, branches, statements)
- Focus on business logic (commands, domains, services)
- Exclude stubs and type-only files

## Anti-Patterns to Avoid

### 1. Large Command Files
**Problem:** Commands > 400 LOC become hard to maintain
**Solution:** Extract utilities to domain helpers or services (e.g., `init.ts` reduced from 930 to 771 LOC)

### 2. Duplicated Directory Discovery
**Problem:** Multiple commands re-implement `findPackagesDir()`
**Solution:** Use `KitPathResolver` singleton from `@/shared/path-resolver.js`

### 3. Scattered Metadata Handling
**Problem:** Metadata logic in commands, services, and domains
**Solution:** Centralize in `services/file-operations/ownership.ts`

### 4. Inconsistent Error Handling
**Problem:** Some commands throw, others return silently
**Solution:** Establish error vs. warning semantics, use exit codes consistently

### 5. Ignoring NO_COLOR
**Problem:** Hardcoded ANSI colors in CI environments
**Solution:** Use `picocolors` and check `process.env.NO_COLOR`

### 6. Missing Input Validation
**Problem:** Commands proceed without checking directory existence
**Solution:** Validate all inputs before `chdir` or file operations

### 7. Overuse of Any
**Problem:** Bypasses type safety
**Solution:** Use `unknown` and validate at runtime, or define specific types

### 8. Mocking Core Logic in Tests
**Problem:** Tests pass but real code fails
**Solution:** Test with real filesystem (use temp directories)

## IDE Configuration

### VS Code Settings (Recommended)

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.exclude": {
    "**/.git": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  }
}
```

### ESLint Configuration

`.eslintrc.cjs`:
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    'no-console': 'off', // Required for CLI
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_'
    }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
  ignorePatterns: ['node_modules/', 'coverage/', 'dist/'],
};
```

## Git Conventions

### Branch Naming
- `feature/package-management` - New features
- `fix/circular-dependency-detection` - Bug fixes
- `refactor/split-init-command` - Code improvements
- `docs/api-reference` - Documentation
- `test/ownership-tracker` - Test additions

### Commit Messages
Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code restructuring
- `docs` - Documentation changes
- `test` - Test additions/updates
- `chore` - Build/tooling changes

**Examples:**
```
feat(packages): add semver constraint validation

- Implement constraint parsing from package.yaml
- Add version compatibility checking
- Update tests for new validation logic

Closes #42
```

```
fix(ownership): correct checksum comparison for Windows

CRLF line endings were causing false positives for file
modifications. Now normalizing to LF before hashing.

Fixes #38
```

### Pre-commit Checks
Run before committing:
```bash
npm run lint      # ESLint check
npm run typecheck # TypeScript check
npm test          # Run tests
```

## See Also

- [Code Standards](./code-standards.md) - Core conventions
- [System Architecture](./system-architecture.md) - Technical design
- [Codebase Summary](./codebase-summary.md) - High-level organization
- [Project Overview & PDR](./project-overview-pdr.md) - Product requirements
