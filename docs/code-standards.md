# Code Standards

**Project:** ePost Agent Kit CLI
**Created by:** Phuong Doan
**Last Updated:** 2026-02-25

## Codebase Structure

### Directory Organization

```
epost-agent-kit-cli/
├── src/
│   ├── cli/              # CLI configuration and registration
│   ├── commands/         # Command orchestrators (11 files)
│   ├── domains/          # Business logic (10 domains)
│   ├── services/         # Cross-cutting services
│   ├── shared/           # Infrastructure utilities
│   └── types/            # Type definitions
├── tests/
│   ├── cli/              # CLI integration tests
│   ├── commands/         # Command tests
│   ├── domains/          # Domain logic tests
│   ├── services/         # Service tests
│   ├── shared/           # Utility tests
│   └── helpers/          # Test fixtures and utilities
├── docs/                 # Documentation
└── dist/                 # Compiled output (gitignored)
```

### Layer Responsibilities

**Layer 1: CLI** (`src/cli/`)
- Command registration with `cac` framework
- Global option configuration
- Version and help display
- Error handling boundaries

**Layer 2: Commands** (`src/commands/`)
- User interaction orchestration
- Input validation
- Domain coordination
- Output formatting
- Exit code management

**Layer 3: Domains** (`src/domains/`)
- Core business logic
- Algorithms and workflows
- Pure functions preferred
- No external I/O (use services)

**Layer 4: Services/Shared** (`src/services/`, `src/shared/`)
- File operations (checksum, backup, ownership)
- Logging and terminal output
- Path resolution
- Constants and configuration
- Error handling utilities

**Layer 5: Types** (`src/types/`)
- Type definitions
- Interfaces
- Error classes
- Schemas

### Naming Conventions

**Files:**
- **kebab-case** for all files: `package-resolver.ts`, `smart-merge.ts`
- Descriptive names that indicate purpose: `claude-md-generator.ts` (not `generator.ts`)
- Test files: Same name with `.test.ts` suffix: `package-resolver.test.ts`

**Types:**
- **PascalCase** for interfaces, types, classes: `PackageManifest`, `ResolvedPackages`
- **PascalCase** for enums: `IDE_TARGETS`, `MergeAction`
- **Interface prefix optional:** `PackageManifest` (not `IPackageManifest`)

**Functions/Variables:**
- **camelCase** for functions: `resolvePackages`, `classifyFile`
- **camelCase** for variables: `packageName`, `filePath`
- **Boolean variables:** Start with `is`, `has`, `should`: `isModified`, `hasConflict`

**Constants:**
- **SCREAMING_SNAKE_CASE** for constants: `METADATA_FILE`, `GITHUB_ORG`
- **SCREAMING_SNAKE_CASE** for environment variables: `EPOST_KIT_ROOT`

**Private Functions:**
- Prefix with underscore (convention only): `_validateInput`, `_buildDependencyGraph`
- Use for internal helpers not exported

### Import Organization

**Order:**
1. Node.js built-ins: `node:fs`, `node:path`, `node:crypto`
2. External packages: `picocolors`, `ora`, `@inquirer/prompts`
3. Internal modules (absolute paths via aliases): `@/domains/`, `@/services/`
4. Types: `@/types/`
5. Relative imports: `./helpers`, `../utils`

**Example:**
```typescript
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import ora from 'ora';
import pc from 'picocolors';

import { resolvePackages } from '@/domains/packages/package-resolver.js';
import { classifyFile } from '@/services/file-operations/ownership.js';
import { logger } from '@/shared/logger.js';
import type { PackageManifest } from '@/types';

import { validateInput } from './helpers.js';
```

**Import Style:**
- Use `.js` extension in imports (ESM requirement)
- Prefer named imports: `import { function } from 'module'`
- Default imports for external packages: `import ora from 'ora'`
- Barrel imports where available: `import { function } from '@/domain'`

### File Size Guidelines

**Commands:**
- Target: < 200 LOC per command
- Exceptions allowed for complex orchestration (`init.ts` at 771 LOC due to dual mode)
- Extract utilities to domain helpers if > 300 LOC

**Domains:**
- Target: < 400 LOC per file
- Split into multiple files if single responsibility exceeds 400 LOC
- Use `helpers.ts` for domain-specific utilities
- GitHub domain is an example of modular organization (726 LOC across 6 files)

**Services/Shared:**
- Target: < 200 LOC per file
- Keep focused on single responsibility
- Extract to separate files if multiple concerns

**Types:**
- Target: < 100 LOC per file
- Group related types together
- Split by domain if types grow large

## TypeScript Conventions

### Type Safety

**Strict Mode Enabled:**
```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

**Type Annotations:**
- Explicit return types for all exported functions
- Parameter types always specified
- Infer local variable types when obvious
- Use `unknown` for truly unknown types (avoid `any`)

**Examples:**
```typescript
// Good: Explicit return type
export function resolvePackages(profile: string): ResolvedPackages {
  // ...
}

// Good: Inferred local variable
const manifests = loadAllManifests(); // Type inferred

// Bad: Missing return type
export function resolvePackages(profile: string) { // ❌
  // ...
}

// Bad: Using any
function parseData(input: any): any { // ❌
  // ...
}

// Good: Using unknown
function parseData(input: unknown): ParsedData {
  // Validate input first
  // ...
}
```

### Interface vs Type

**Use Interface:**
- Object shapes with methods
- Extendable types
- Public APIs

**Use Type:**
- Unions and intersections: `type MergeAction = 'overwrite' | 'skip' | 'conflict'`
- Mapped types: `Record<string, FileOwnership>`
- Complex type expressions

**Examples:**
```typescript
// Interface for objects
interface PackageManifest {
  name: string;
  version: string;
  dependencies: string[];
}

// Type for unions
type IDE = 'claude' | 'cursor' | 'github-copilot';

// Type for mapped types
type FileMetadata = Record<string, FileOwnership>;
```

### Async/Await Patterns

**Prefer async/await:**
```typescript
// Good
async function downloadKit(version: string): Promise<string> {
  const releases = await fetchReleases();
  const release = releases.find(r => r.tag_name === version);
  return await extractArchive(release.tarball_url);
}

// Avoid: Promise chains
function downloadKit(version: string): Promise<string> {
  return fetchReleases()
    .then(releases => releases.find(r => r.tag_name === version))
    .then(release => extractArchive(release.tarball_url));
}
```

**Top-level await:** Allowed in commands (ESM)

**Error handling:**
```typescript
// Wrap async operations in try-catch
async function runCommand(): Promise<void> {
  try {
    const result = await performOperation();
    logger.success('Operation completed');
  } catch (error) {
    if (error instanceof NetworkError) {
      logger.error('Network failure:', error.message);
      process.exit(error.exitCode);
    }
    throw error; // Re-throw unexpected errors
  }
}
```

### Optional Chaining & Nullish Coalescing

**Use optional chaining for nested properties:**
```typescript
// Good
const agentCount = manifest.provides?.agents?.length ?? 0;

// Bad
const agentCount = manifest.provides && manifest.provides.agents
  ? manifest.provides.agents.length
  : 0;
```

**Use nullish coalescing for defaults:**
```typescript
// Good: Only uses default if value is null/undefined
const limit = options.limit ?? 10;

// Bad: Uses default if value is falsy (0, '', false)
const limit = options.limit || 10;
```

### Path Aliases

**Configure in tsconfig.json:**
```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

**Usage:**
```typescript
import { resolvePackages } from '@/domains/packages/package-resolver.js';
import { logger } from '@/shared/logger.js';
import type { Metadata } from '@/types';
```

## Error Handling Patterns

### Error Hierarchy

```typescript
EpostKitError (base, exitCode=1)
├── ConfigError (exitCode=78)      # Invalid configuration
├── NetworkError (exitCode=69)     # Network failures
└── FileOwnershipError (exitCode=73) # File operation failures
```

**Creating Custom Errors:**
```typescript
export class ConfigError extends EpostKitError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
    this.exitCode = 78; // EX_CONFIG from sysexits.h
  }
}
```

### Throwing Errors

**Use specific error types:**
```typescript
// Good: Specific error with context
if (!fileExists(manifestPath)) {
  throw new ConfigError(`Package manifest not found: ${manifestPath}`);
}

// Bad: Generic error
if (!fileExists(manifestPath)) {
  throw new Error('File not found');
}
```

### Error Handling in Commands

**Pattern:**
```typescript
export async function runCommand(options: CommandOptions): Promise<void> {
  try {
    // Validate input early
    validateOptions(options);

    // Perform operations
    const result = await performOperation(options);

    // Display success
    logger.success('Operation completed');
  } catch (error) {
    // Handle known errors
    if (error instanceof ConfigError) {
      logger.error(error.message);
      process.exit(error.exitCode);
    }

    // Re-throw unexpected errors
    throw error;
  }
}
```

### Graceful Degradation (Shared Utilities)

**Safe utilities return null/false on error:**
```typescript
// Good: Returns null on error (caller decides how to handle)
export async function safeReadFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

// Usage
const content = await safeReadFile(path);
if (content === null) {
  logger.warn(`Could not read file: ${path}`);
  return; // Graceful degradation
}
```

**Core operations throw errors:**
```typescript
// Good: Throws on error (caller must handle)
export async function readMetadata(projectDir: string): Promise<Metadata> {
  const metadataPath = join(projectDir, METADATA_FILE);

  if (!fileExists(metadataPath)) {
    throw new FileOwnershipError(`Metadata file not found: ${metadataPath}`);
  }

  const content = await readFile(metadataPath, 'utf-8');
  const metadata = JSON.parse(content);

  // Validate schema
  if (!metadata.cliVersion) {
    throw new FileOwnershipError('Invalid metadata: missing cliVersion');
  }

  return metadata;
}
```

## Code Quality Guidelines

### Function Design

**Single Responsibility:**
```typescript
// Good: Single responsibility
function validatePackageName(name: string): boolean {
  return /^[a-z0-9-]+$/.test(name);
}

function validatePackageDependencies(
  packages: string[],
  manifests: Map<string, PackageManifest>
): MissingDependency[] {
  // ...
}

// Bad: Multiple responsibilities
function validatePackage(name: string, manifests: Map<string, PackageManifest>) {
  // Validates name AND dependencies in one function
}
```

**Pure Functions Preferred:**
```typescript
// Good: Pure function
function calculateChecksum(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized).digest('hex');
}

// Avoid: Functions with side effects
function calculateAndLogChecksum(content: string): string {
  const checksum = calculateChecksum(content);
  logger.info(`Checksum: ${checksum}`); // Side effect
  return checksum;
}
```

**Descriptive Names:**
```typescript
// Good: Clear intent
function getOwnedFiles(projectDir: string): string[] { /* ... */ }
function classifyFileByOwnership(path: string): OwnershipTier { /* ... */ }

// Bad: Vague names
function getFiles(dir: string): string[] { /* ... */ }
function check(path: string): string { /* ... */ }
```

### Comments & Documentation

**JSDoc for Exported Functions:**
```typescript
/**
 * Resolves packages from a profile or explicit list, including dependencies.
 * @param profile - Profile name to resolve (e.g., 'backend-engineer')
 * @param explicitPackages - Optional list of package names to install
 * @returns Resolved packages in topological order
 * @throws {ConfigError} If profile not found or circular dependencies detected
 */
export function resolvePackages(
  profile?: string,
  explicitPackages?: string[]
): ResolvedPackages { /* ... */ }
```

**Inline Comments:** Explain WHY, not WHAT. Avoid redundant comments.

**TODO Comments:** `// TODO(username): description`, `// FIXME: description`

## See Also

- [Code Standards - Patterns & Configuration](./code-standards-patterns.md) - Common patterns, anti-patterns, IDE/Git config
- [System Architecture](./system-architecture.md) - Technical design
- [Codebase Summary](./codebase-summary.md) - High-level organization
- [Project Overview & PDR](./project-overview-pdr.md) - Product requirements
