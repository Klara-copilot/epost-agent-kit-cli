# Codebase Summary

**Project:** ePost Agent Kit CLI
**Version:** 0.1.0
**Created by:** Phuong Doan
**Last Updated:** 2026-02-11

## High-Level Architecture

The CLI implements a clean 4-layer architecture with ~7,872 lines of code:

```
┌─────────────────────────────────────────┐
│         CLI Layer (Entry Point)          │  src/cli/
│  Command registration, arg parsing       │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│        Commands Layer (2,518 LOC)       │  src/commands/
│  Thin orchestrators, user interaction   │  11 commands
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│        Domains Layer (3,030 LOC)        │  src/domains/
│  Business logic, algorithms, workflows  │  9 domains
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│  Services/Shared Layer (772 LOC)       │  src/services/
│  Cross-cutting utilities, infrastructure│  src/shared/
└─────────────────────────────────────────┘

Test Layer: 1,341 LOC (103 tests, 100% passing)
Types Layer: 211 LOC (centralized type definitions)
```

## Layer Responsibilities

### 1. CLI Layer
**Location:** `src/cli/`
**Size:** Minimal (barrel file)
**Purpose:** Command registration and CLI framework configuration

**Status:** In migration. Currently empty barrel file; main entry likely in `cli.ts` root.

**Expected Responsibilities:**
- Register commands with `cac` framework
- Set up global options (`--verbose`, `--yes`)
- Configure error handling boundaries
- Display version and help information

### 2. Commands Layer
**Location:** `src/commands/`
**Size:** 2,518 LOC across 11 files
**Purpose:** User interaction orchestration

**Pattern:** All commands follow:
```
validate input → load manifests → coordinate domains → display output → exit
```

**Commands:**
1. `doctor.ts` (115 LOC) - Health checks with auto-fix
2. `dev.ts` (228 LOC) - File watcher for kit designers
3. `init.ts` (930 LOC) - Initialize kit (dual mode: package/legacy)
4. `new.ts` (186 LOC) - Create project from template
5. `onboard.ts` (237 LOC) - Guided setup wizard
6. `package.ts` (237 LOC) - Manage packages (list/add/remove)
7. `profile.ts` (143 LOC) - Browse and show profiles
8. `uninstall.ts` (195 LOC) - Remove kit with ownership awareness
9. `update.ts` (80 LOC) - Self-update CLI from npm
10. `versions.ts` (70 LOC) - List available kit versions
11. `workspace.ts` (97 LOC) - Generate workspace CLAUDE.md

**Key Characteristics:**
- Stateless: No internal state between invocations
- Delegating: Minimal logic, delegates to domains
- Interactive: Uses `@inquirer/prompts` for user input
- Friendly: Colored output, spinners, progress indicators

### 3. Domains Layer
**Location:** `src/domains/`
**Size:** 3,030 LOC across 9 domains
**Purpose:** Core business logic and algorithms

**Domains:**

**a) Config (`config/`)** - 85 LOC
- Settings merger: Combine settings from multiple packages
- Strategy: base (first), merge (deep merge), skip (ignore)

**b) GitHub (`github/`)** - 82 LOC
- Fetch releases from GitHub API
- Download tarball assets
- Parse release metadata

**c) Health Checks (`health-checks/`)** - 145 LOC
- Verify file structure, permissions
- Auto-fix missing directories
- Return check results: pass/warn/fail

**d) Help (`help/`)** - 63 LOC
- Branding (logo, tagline, version)
- Display helpers for command output

**e) Installation (`installation/`)** - 704 LOC
- `claude-md-generator.ts` (337 LOC) - Custom template engine
- `smart-merge.ts` (191 LOC) - File ownership classification
- `template-manager.ts` (114 LOC) - GitHub release download
- `package-manager.ts` (61 LOC) - Detect npm/pnpm/yarn/bun

**f) Packages (`packages/`)** - 732 LOC
- `package-resolver.ts` (512 LOC) - Manifest loading, dependency resolution
- `profile-loader.ts` (220 LOC) - Auto-detection, profile enumeration

**g) UI (`ui/`)** - 403 LOC
- Terminal display utilities (pure functions, no side effects)
- Components: banner, box, table, tree, badge, layer diagram
- Respects NO_COLOR and CI environment variables

**h) Versioning (`versioning/`)** - 120 LOC
- CLI self-update detection
- Package manager detection for global installs
- Changelog preview (stub)

**i) Error (`error/`)** - 3 LOC
- Empty barrel (migration in progress)
- Error types defined in `types/errors.ts`

### 4. Services Layer
**Location:** `src/services/`
**Size:** 295 LOC
**Purpose:** Cross-cutting domain utilities

**Services:**

**a) File Operations (`file-operations/`)** - 282 LOC
- `checksum.ts` (56 LOC) - SHA256 hashing with CRLF normalization
- `backup-manager.ts` (81 LOC) - Timestamped backups
- `ownership.ts` (145 LOC) - File classification (epost-owned/modified/user-created)

**b) Template Engine (`template-engine/`)** - 1 LOC
- Stub: Reserved for future expansion
- Logic currently in `installation/claude-md-generator.ts`

**c) Transformers (`transformers/`)** - 1 LOC
- Stub: Reserved for data transformation pipelines

### 5. Shared Layer
**Location:** `src/shared/`
**Size:** 477 LOC
**Purpose:** Reusable infrastructure utilities

**Utilities:**

- `constants.ts` (51 LOC) - App constants, protected patterns, IDE targets
- `environment.ts` (4 LOC) - CI detection, NO_COLOR flag
- `file-system.ts` (132 LOC) - Safe file operations (read/write/copy/exists)
- `logger.ts` (61 LOC) - Colored output, spinners, step logging
- `output-manager.ts` (1 LOC) - Stub for JSON/verbose modes
- `path-resolver.ts` (162 LOC) - Kit root detection with caching
- `process-lock.ts` (1 LOC) - Stub for concurrent operation safety
- `safe-prompts.ts` (1 LOC) - Stub for CI-aware prompts
- `safe-spinner.ts` (1 LOC) - Stub for CI-safe spinners
- `temp-cleanup.ts` (1 LOC) - Stub for temp file management
- `terminal-utils.ts` (32 LOC) - ANSI stripping, indentation, terminal width

### 6. Types Layer
**Location:** `src/types/`
**Size:** 211 LOC
**Purpose:** Centralized type definitions

**Type Files:**

- `commands.ts` (79 LOC) - Command option interfaces (one per command)
- `errors.ts` (40 LOC) - Error hierarchy (ConfigError, NetworkError, FileOwnershipError)
- `packages.ts` (12 LOC) - Package and profile stubs
- `index.ts` (84 LOC) - Core types (EpostConfig, Metadata, FileOwnership, GitHubRelease)

## Key Components

### Package Resolution Pipeline
**Owner:** `domains/packages/package-resolver.ts`

Workflow:
```
1. Load manifests (packages/*/package.yaml)
2. Determine packages (profile or explicit list)
3. Auto-add missing dependencies
4. Validate all dependencies satisfied
5. Topological sort (Kahn's algorithm)
6. Collect recommendations from installed packages
7. Return ResolvedPackages (packages, optional, recommended)
```

### Smart Merge System
**Owner:** `domains/installation/smart-merge.ts`, `services/file-operations/ownership.ts`

Classification Algorithm:
```
For each file in kit:
  If file exists in project:
    Load metadata from .epost-metadata.json
    Compute current checksum
    Compare with install checksum

    If checksums match:
      Classification: epost-owned (safe to overwrite)
    Else if file in metadata:
      Classification: epost-modified (user changed)
    Else:
      Classification: user-created (skip)
  Else:
    Classification: create (new file)
```

Actions:
- `overwrite` → epost-owned files
- `skip` → user-created files
- `conflict` → epost-modified files (require manual resolution)
- `create` → new files

### Template Engine
**Owner:** `domains/installation/claude-md-generator.ts`

Custom regex-based engine supporting:
- Variables: `{{variable}}`, `{{nested.var}}`
- Conditionals: `{{#if var}}...{{else}}...{{/if}}`
- Loops: `{{#each items}}...{{/each}}`
- Unless blocks: `{{#unless var}}...{{/unless}}`
- Array helpers: `{{@index}}`, `{{@last}}`, `{{@first}}`
- Raw output: `{{{variable}}}`

Rendering Order:
1. Process `{{#each}}` blocks (iterate arrays)
2. Process `{{#if}}` conditionals
3. Process `{{#unless}}` negations
4. Substitute `{{{raw}}}` and `{{variables}}`
5. Replace `@` helpers

### YAML Parser
**Owner:** `domains/packages/package-resolver.ts`

Custom line-by-line parser (no external dependencies):
- Supports: key-value, nested objects, arrays, inline arrays, comments
- Type inference: strings, booleans, integers, floats
- Indentation-based structure
- Limitation: No flow style `{...}`, anchors `&`, or aliases `*`

### Path Resolution
**Owner:** `shared/path-resolver.ts`

KitPathResolver class with intelligent search:
```
Search Order:
1. EPOST_KIT_ROOT env var (explicit override)
2. ../epost-agent-kit/ (sibling repo - dev mode)
3. ./ (current directory - running from kit repo)
4. ../ (parent directory - legacy nested structure)
5. Binary-relative paths (npm link scenarios)

Validation:
- Must contain packages/core/package.yaml
- Must contain profiles/profiles.yaml
```

Caching: Single `KitPaths` object cached after first resolution.

### File Ownership Tracker
**Owner:** `services/file-operations/ownership.ts`

Metadata Structure (`.epost-metadata.json`):
```json
{
  "cliVersion": "0.1.0",
  "target": "claude",
  "kitVersion": "1.0.0",
  "profile": "backend-engineer",
  "installedPackages": ["core", "typescript"],
  "installedAt": "2026-02-11T10:00:00Z",
  "files": {
    ".claude/CLAUDE.md": {
      "path": ".claude/CLAUDE.md",
      "checksum": "abc123...",
      "installedAt": "2026-02-11T10:00:00Z",
      "version": "1.0.0",
      "modified": false,
      "package": "core"
    }
  }
}
```

Operations:
- `generateMetadata()` - Create on new install
- `updateMetadata()` - Add/remove/modify files
- `classifyFile()` - Determine ownership tier
- `readMetadata()` / `writeMetadata()` - Persistence

## Data Flow & Integration

### Installation Flow (init command)
```
User Input (profile/packages)
  ↓
Profile Loader → detect project type
  ↓
Package Resolver → load manifests, resolve dependencies
  ↓
Template Manager → download kit from GitHub (if needed)
  ↓
Smart Merge → classify files, plan merge
  ↓
Ownership Tracker → generate metadata
  ↓
Settings Merger → combine package settings
  ↓
CLAUDE.md Generator → collect snippets, render template
  ↓
File System → copy files, write outputs
  ↓
UI Display → show results
```

### Dev Watcher Flow
```
Start Watcher (fs.watch on packages/)
  ↓
File Change Event → debounce (300ms)
  ↓
Determine Invalidation Scope:
  - Settings change? → regenerate settings.json
  - Snippet/template change? → regenerate CLAUDE.md
  - package.yaml change? → regenerate both
  ↓
Load Manifests → resolve packages
  ↓
Execute Regeneration (merge/generate)
  ↓
UI Display → show sync status
```

### Package Add Flow
```
User Input (package name)
  ↓
Package Resolver → load manifests, find package
  ↓
Dependency Check → resolve transitive dependencies
  ↓
Ownership Tracker → read metadata, check conflicts
  ↓
File System → copy package files
  ↓
Ownership Tracker → update metadata with new files
  ↓
Settings Merger → merge package settings (if applicable)
  ↓
UI Display → show added package + files
```

## File Organization Conventions

### Naming Conventions
- **kebab-case** for file names: `package-resolver.ts`, `smart-merge.ts`
- **PascalCase** for types: `PackageManifest`, `FileOwnership`
- **camelCase** for functions/variables: `resolvePackages`, `classifyFile`
- **SCREAMING_SNAKE_CASE** for constants: `METADATA_FILE`, `GITHUB_ORG`

### File Structure Patterns
```
domain/
├── core-logic.ts       # Main algorithms and workflows
├── helpers.ts          # Utility functions (if needed)
├── types.ts            # Domain-specific types (if complex)
└── index.ts            # Barrel export
```

### Import Conventions
- Use path aliases: `@/domains/`, `@/services/`, `@/shared/`, `@/types/`
- ESM imports: `.js` extension in imports (TypeScript compiles to JS)
- Barrel imports preferred: `import { function } from '@/domain'`

### File Size Guidelines
- Commands: Target < 200 LOC (exceptions: `init.ts` at 930 LOC due to dual mode)
- Domains: Target < 400 LOC per file (split if larger)
- Services: Target < 200 LOC per file
- Shared: Target < 150 LOC per file

## External Integrations

### GitHub API
**Used By:** `domains/github/github-client.ts`
**Endpoints:**
- `GET /repos/{owner}/{repo}/releases` - List releases
- Download `.tar.gz` assets via `browser_download_url`

**Error Handling:** NetworkError thrown on HTTP failures

### npm Registry API
**Used By:** `domains/versioning/self-update.ts`
**Command:** `npm view epost-kit version`
**Purpose:** Check for CLI updates

### Package Managers
**Used By:** `domains/installation/package-manager.ts`
**Detection Order:** pnpm → yarn → bun → npm
**Lock Files:**
- pnpm: `pnpm-lock.yaml`
- yarn: `yarn.lock`
- bun: `bun.lockb`
- npm: `package-lock.json`

## Configuration Management

### User Configuration
**File:** `.epostrc`, `.epostrc.json`, `.epostrc.yaml`, `epost.config.js`, etc.
**Discovery:** `cosmiconfig` searches in standard locations
**Schema:**
```typescript
{
  repository?: string        // GitHub URL override
  target?: IDE target        // claude/cursor/github-copilot
  installDir?: string        // custom install directory
  protectedPatterns?: string[] // extra files to never modify
}
```

### Project Metadata
**File:** `.epost-metadata.json`
**Purpose:** Track installed packages, file ownership
**Managed By:** `services/file-operations/ownership.ts`
**Lifecycle:** Created on init, updated on add/remove, read on uninstall

### Package Manifests
**File:** `packages/*/package.yaml`
**Schema:**
```yaml
name: core
version: 1.0.0
description: Foundation layer
layer: 0
platforms: [all]
dependencies: []
recommends: [typescript]
provides:
  agents: [architect]
  skills: [planner]
  commands: [init]
files:
  "templates/CLAUDE.md": ".claude/CLAUDE.md"
  "settings.json": ".claude/settings.json"
settings_strategy: base|merge|skip
claude_snippet: "CLAUDE.snippet.md"
```

### Profile Definitions
**File:** `profiles/profiles.yaml`
**Schema:**
```yaml
backend-engineer:
  display_name: "Backend Engineer"
  teams: [miracle, titan]
  packages: [core, typescript, testing]
  optional: [docker, kubernetes]
  auto_detect:
    - match:
        files: [package.json]
        directories: [src/api]
        dependencies: [express, fastify]
      suggest: backend-engineer
```

## Testing Strategy

### Test Organization
```
tests/
├── cli/               # Smoke tests, command registry
├── commands/          # Command orchestration tests
├── domains/           # Business logic tests
├── services/          # Service layer tests
├── shared/            # Utility tests
└── helpers/           # Test utilities, fixtures
```

### Test Characteristics
- Framework: Vitest 2.1.8
- Total: 103 tests (100% passing)
- Execution: ~1 second full suite
- Approach: Real I/O (no heavy mocking)
- Fixtures: Temp directories created/destroyed per test
- Coverage: 70% target (v8 provider)

### Test Categories
1. **Unit Tests** (majority) - Pure functions, algorithm correctness
2. **Integration Tests** - Commands + domains interaction
3. **Smoke Tests** - CLI entry point, command registration
4. **File System Tests** - Real file operations with cleanup

## Build & Deployment

### Build Process
```bash
npm run build         # Compile TypeScript → JavaScript
tsc                   # Output: dist/
```

Output:
- Compiled `.js` files
- Source maps (`.js.map`)
- Type declarations (`.d.ts`, `.d.ts.map`)

### Distribution
- Package Name: `epost-kit`
- Binary: `epost-kit` → `dist/cli.js`
- Entry Point: `dist/cli.js` (ESM)
- Target: Node.js >= 18.0.0

### Installation Methods
```bash
npm install -g epost-kit    # Global install
npm link                     # Development link
npx epost-kit                # One-time run
```

## Performance Characteristics

### Typical Operations
- Full install (5-10 packages): < 30s
- Health checks: < 10s
- Profile detection: < 5s
- Watcher sync: < 500ms latency
- CLI startup: < 200ms

### Optimization Strategies
- **Caching:** Kit path resolution cached after first lookup
- **Debouncing:** File watcher batches changes (300ms)
- **Parallel Execution:** Independent health checks run concurrently
- **Lazy Loading:** Manifests loaded once per command invocation

### Known Bottlenecks
- GitHub API rate limits (60 req/hour unauthenticated)
- Large kit downloads (network-bound)
- Metadata re-read on every file operation (no caching)

## Security Considerations

### Protected Files
**Pattern:** `.git/**`, `node_modules/**`, `.env*`, `*.key`, `*.pem`, `*.crt`, `.ssh/**`
**Enforcement:** Checked before any write operation

### Checksum Integrity
**Algorithm:** SHA256 with CRLF → LF normalization
**Purpose:** Detect unauthorized modifications

### Safe Operations
- Atomic writes: Temp file + rename pattern
- Backup before destructive updates
- No credential storage or transmission
- Exit codes follow sysexits.h for proper error signaling

## See Also

- [System Architecture](./system-architecture.md) - Detailed technical design
- [Code Standards](./code-standards.md) - Development conventions
- [Project Overview & PDR](./project-overview-pdr.md) - Product requirements
