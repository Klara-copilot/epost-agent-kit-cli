# Scout Report: Services & Shared Infrastructure

## Overview

The epost-agent-kit-cli implements a clean separation of concerns with three distinct layers below the command orchestrators:

1. **Services Layer** (`src/services/`) - Cross-cutting domain utilities
2. **Shared Layer** (`src/shared/`) - Reusable infrastructure utilities
3. **Types Layer** (`src/types/`) - Centralized type definitions and schemas

This report analyzes ~1200 lines of infrastructure code providing file operations, path resolution, logging, error handling, and type safety for the CLI.

---

## Services Layer

### 1. File Operations Service (`src/services/file-operations/`)

**Purpose:** Atomic file management with ownership tracking and backup capabilities

#### Components:

**a) Checksum Management (`checksum.ts`, 56 lines)**
- Computes SHA256 hashes with line-ending normalization (CRLF → LF)
- Cross-platform consistency: prevents false modifications on Windows
- Functions:
  - `hashFile(path)` - async file hashing
  - `hashString(content)` - string hashing
  - `verifyChecksum(path, expected)` - validation with error handling
- Error handling: wraps errors in `FileOwnershipError` with context

**b) Backup Management (`backup-manager.ts`, 81 lines)**
- Manages timestamped backup snapshots in `.epost-kit-backup/` directory
- Non-intrusive: filters backup dir from recursive copies
- Functions:
  - `createBackup(sourceDir, label)` - creates timestamped snapshot
  - `restoreBackup(backupPath, targetDir)` - point-in-time restore
  - `listBackups(projectDir)` - enumerates available backups
  - `cleanOldBackups(projectDir, keepCount)` - retention policy enforcement
- Smart sorting: by modification time to keep N most recent
- Safety: uses `safeCopyDir` for atomic operations

**c) Ownership Tracking (`ownership.ts`, 145 lines)**
- Three-tier classification: `epost-owned` | `epost-modified` | `user-created`
- Determines file safety for updates based on checksum comparison
- Core functions:
  - `readMetadata(projectDir)` - loads JSON metadata with validation
  - `writeMetadata(projectDir, metadata)` - persists with error handling
  - `generateMetadata(cliVersion, target, kitVersion, files, options?)` - new install
  - `updateMetadata(projectDir, updates)` - partial updates (add/remove/modify)
  - `classifyFile(filePath, projectDir, metadata)` - determines ownership tier
  - `getFilesByOwnership(projectDir, metadata, tier)` - queries by classification
  - `getOwnedFiles()` / `getModifiedFiles()` - convenience accessors
  - `isProtectedPath(relativePath)` - checks against pattern list

**Pattern:** Protected patterns (`.git/**`, `node_modules/**`, `*.key`, etc.) are excluded from tracking.

#### Reusability:
- Loose coupling: imports only from `file-system`, `logger`, and type definitions
- Composable: backup manager and ownership are independent
- Testable: pure functions with clear I/O contracts

---

### 2. Template Engine (`src/services/template-engine/index.ts`)

**Status:** Stub implementation (1 function)
- `renderTemplate(_template, _data): string` - placeholder for future expansion
- Comment references: "to be populated from claude-md-generator.ts"

**Future pattern:** Will likely render templates from epost-agent-kit for code generation.

---

### 3. Transformers Service (`src/services/transformers/index.ts`)

**Status:** Stub implementation (1 function)
- `transform(_input): any` - identity function placeholder
- No-op currently; reserved for data transformation pipelines

---

## Shared Utilities Layer

### 1. Constants (`src/shared/constants.ts`, 51 lines)

Centralized configuration values:

```typescript
// Application identity
APP_NAME = 'epost-kit'
GITHUB_ORG = 'Klara-copilot'
GITHUB_REPO = 'epost_agent_kit'

// Configuration file discovery (cosmiconfig order)
CONFIG_FILE_NAMES = ['.epostrc', '.epostrc.json', '.epostrc.yaml', ...]

// Protected patterns (never modified)
PROTECTED_FILE_PATTERNS = ['.git/**', 'node_modules/**', '.env*', '*.key', '*.pem', ...]

// IDE target directories
IDE_TARGETS = { CLAUDE: '.claude', CURSOR: '.cursor', GITHUB_COPILOT: '.github' }

// Metadata file name
METADATA_FILE = '.epost-metadata.json'
```

**Usage:** Imported by file-operations and file-system modules for consistent configuration.

---

### 2. Environment Detection (`src/shared/environment.ts`, 4 lines)

Flags for runtime behavior:
```typescript
isCI = !!process.env.CI
noColor = !!process.env.NO_COLOR || isCI
isVerbose = !!process.env.VERBOSE
```

**Usage:** Controls logger output, spinner behavior, and prompt safety.

---

### 3. File System Utilities (`src/shared/file-system.ts`, 132 lines)

Safe, error-tolerant file operations wrapping Node.js `fs/promises`:

**Read/Write Operations:**
- `safeReadFile(path)` → `string | null` (returns null on error)
- `safeWriteFile(path, content)` → atomic write with temp file + rename
- Parent directories auto-created

**Directory Operations:**
- `safeCopyDir(src, dest, options?)` - recursive copy with optional filter predicate
- Useful for backup snapshots and installation templates
- Filter example: exclude `.epost-kit-backup/` from copies

**Existence Checks:**
- `fileExists(path)` - checks R_OK permission and file type
- `dirExists(path)` - checks R_OK permission and directory type

**Protection:**
- `isProtectedFile(filePath)` - matches against PROTECTED_FILE_PATTERNS
- Supports glob patterns (*.key), directory patterns (.git/), exact matches

**Pattern:** All operations handle errors gracefully (return null/false vs throw).

---

### 4. Logger (`src/shared/logger.ts`, 61 lines)

Colored output with NO_COLOR and EPOST_KIT_VERBOSE support:

```typescript
logger = {
  info(msg)         // "ℹ" prefix (blue)
  success(msg)      // "✓" prefix (green)
  warn(msg)         // "⚠" prefix (yellow)
  error(msg)        // "✗" prefix (red)
  debug(msg)        // "[DEBUG]" prefix (dim) - only if EPOST_KIT_VERBOSE
  
  spinner(text)     // returns ora() instance
  step(current, total, label)    // formatted step counter
  heading(text)     // section heading
  box(content, opts?)  // bordered output
}
```

**Features:**
- Respects `NO_COLOR` env var (strips ANSI codes in CI)
- Spinner integration: returns `ora` instance for manual control
- UI helpers: step headers, headings, boxes for structured output
- Integration with `terminal-utils` for formatting

---

### 5. Output Manager (`src/shared/output-manager.ts`)

**Status:** Stub (1 method)
- `OutputManager.log(message)` - placeholder for JSON/verbose output modes

---

### 6. Path Resolver (`src/shared/path-resolver.ts`, 162 lines)

**KitPathResolver Class:** Intelligent kit root detection with caching

**Search Order:**
1. `EPOST_KIT_ROOT` env var (explicit override)
2. Sibling repo: `../epost-agent-kit/` (dev mode - new structure)
3. Current working directory: `./` (running from kit repo)
4. Legacy parent: `../` (old nested structure - deprecated)
5. Binary-relative paths: for `npm link` scenarios

**Validation:** Directory must contain both:
- `packages/core/package.yaml`
- `profiles/profiles.yaml`

**API:**
```typescript
// Accessors (all async)
resolve()              // KitPaths { root, packages, profiles, templates }
getRoot()              // kit repository root
getPackagesDir()       // packages/ directory
getProfilesPath()      // profiles/profiles.yaml
getTemplatesDir()      // templates/ or null if missing
clearCache()           // for testing

// Singleton
kitPaths = new KitPathResolver()
```

**Caching:** Single `KitPaths` object cached after first resolution.

**Error Handling:** Detailed error message showing all candidates searched and expected structure.

**Pattern:** Handles dev (sibling repo), legacy (nested), and production (GitHub) layouts transparently.

---

### 7. Process Lock (`src/shared/process-lock.ts`)

**Status:** Stub (2 functions)
- `acquireLock(lockFile)` - placeholder for concurrent operation safety
- `releaseLock(lockFile)` - placeholder

---

### 8. Safe Prompts (`src/shared/safe-prompts.ts`)

**Status:** Stub (1 function)
- `safePrompt(options)` - placeholder for CI-aware user input
- Would skip interactive prompts in CI mode

---

### 9. Safe Spinner (`src/shared/safe-spinner.ts`)

**Status:** Stub (1 function)
- `safeSpinner(text)` - returns no-op object in CI mode
- Prevents spinner ANSI artifacts in logs

---

### 10. Temporary Cleanup (`src/shared/temp-cleanup.ts`)

**Status:** Stub (2 functions)
- `registerTempDir(path)` - tracks temp directories
- `cleanupAllTemp()` - removes all registered temps on exit

---

### 11. Terminal Utilities (`src/shared/terminal-utils.ts`, 32 lines)

Helper functions for terminal formatting:

```typescript
stripAnsi(str)              // removes ANSI color codes
termWidth()                 // terminal width or default 80
indent(text, spaces)        // adds indentation to each line

box(text, opts?)            // bordered output (stub)
heading(text)               // section heading formatter
stepHeader(step, total, text) // "[n] text" format
```

**Usage:** By logger and output formatting functions.

---

### 12. Shared Index (`src/shared/index.ts`)

Barrel export file:
```typescript
export * from './file-system.js'
export * from './constants.js'
export * from './logger.js'
export * from './environment.js'
export * from './terminal-utils.js'
export * from './path-resolver.js'
```

**Pattern:** Excludes stubs (process-lock, safe-prompts, safe-spinner, temp-cleanup, output-manager) - only exports production utilities.

---

## Type System

### 1. Command Options (`src/types/commands.ts`, 79 lines)

Interface-per-command pattern (thin Commander.js wrapper):

```typescript
GlobalOptions              // verbose?, yes?
NewOptions                 // kit?, dir?
InitOptions                // kit, profile, packages, optional, exclude, fresh, dryRun, dir
DoctorOptions              // fix?, report?
VersionsOptions            // limit?, pre?
UpdateOptions              // check?
UninstallOptions           // keepCustom?, force?, dryRun?, dir?
ProfileListOptions         // team?
ProfileShowOptions         // name
PackageListOptions
PackageAddOptions          // name
PackageRemoveOptions       // name, force?
OnboardOptions             // dir?
WorkspaceInitOptions       // dir?
DevWatcherOptions          // target?, profile?, force?
```

**Pattern:** Each command gets its own typed interface extending `GlobalOptions`.

---

### 2. Error Types (`src/types/errors.ts`, 40 lines)

Hierarchical error classes with exit codes:

```typescript
EpostKitError (extends Error)     // base, exitCode=1
├── ConfigError                    // exitCode=78 (EX_CONFIG)
├── NetworkError                   // exitCode=69 (EX_UNAVAILABLE)
└── FileOwnershipError             // exitCode=73 (EX_CANTCREAT)

// Legacy alias
EpostError → EpostKitError
```

**Pattern:** Exit codes follow sysexits.h conventions for proper shell integration.

**Implementation:** `Error.captureStackTrace()` for clean stack traces.

---

### 3. Package Types (`src/types/packages.ts`, 12 lines)

Minimal stubs for future expansion:
```typescript
PackageManifest {
  name: string
  version: string
  dependencies?: string[]
}

ProfileDefinition {
  name: string
  packages: string[]
}
```

---

### 4. Core Types (`src/types/index.ts`, 84 lines)

Domain models for configuration and metadata:

**EpostConfig** - User configuration (`.epostrc`, `epost.config.*`):
```typescript
{
  repository?: string           // GitHub URL
  target?: 'claude' | 'cursor' | 'github-copilot'
  installDir?: string           // default: .claude/.cursor/.github
  protectedPatterns?: string[]  // extra files to never modify
}
```

**FileOwnership** - Per-file metadata:
```typescript
{
  path: string                 // relative to project root
  checksum: string             // SHA256 (after LF normalization)
  installedAt: string          // ISO 8601 timestamp
  version: string              // source version
  modified: boolean            // checksum mismatch flag
  package?: string             // owning package name
}
```

**Metadata** - Installation snapshot (`.epost-metadata.json`):
```typescript
{
  cliVersion: string           // CLI version at install
  target: 'claude' | 'cursor' | 'github-copilot'
  kitVersion: string           // epost-agent-kit version
  profile?: string             // active profile
  installedPackages?: string[] // list of package names
  installedAt: string          // ISO 8601
  updatedAt?: string           // last update time
  files: Record<string, FileOwnership>  // all tracked files
}
```

**CommandOptions** - Common flags:
```typescript
{
  verbose?: boolean            // enable debug logs
  yes?: boolean                // skip prompts (CI mode)
  dryRun?: boolean             // no file modifications
}
```

**GitHubRelease** - API response schema:
```typescript
{
  tag_name: string
  name: string
  published_at: string
  assets: Array<{
    name: string
    browser_download_url: string
    size: number
  }>
}
```

---

## Patterns & Best Practices

### 1. Error Handling Strategy

**Typed Errors:**
- Custom error hierarchy with exit codes
- Each error type maps to sysexits.h standard exit codes
- Enables shell script integration and proper CI signaling

**Graceful Degradation:**
- File system utilities return null/false on error (no throw)
- Metadata operations throw structured errors with context
- Allows caller to decide: suppress error or fail fast

**Example:**
```typescript
// Safe utility pattern
const content = await safeReadFile(path) // null on any error
if (content === null) { /* handle */ }

// Required operation pattern
const metadata = await readMetadata(dir)  // throws if invalid
```

### 2. Type Safety

**Layered Typing:**
- Domain types in `types/` (EpostConfig, Metadata, FileOwnership)
- Command types tied to CLI framework (Commander.js options)
- Enforces compile-time safety for configuration and errors

**No Loose Any:**
- Only stub functions use `_input: any` (placeholders)
- All production code has explicit types
- Generic patterns rare (limited use of Record<>, Array<>)

### 3. Separation of Concerns

**Service Layer:**
- File operations (checksum, backup, ownership)
- Domain-specific logic independent of CLI framework

**Shared Layer:**
- Infrastructure (file I/O, logging, paths)
- No business logic; pure utilities
- Used by both services and commands

**Types Layer:**
- Configuration schemas (EpostConfig)
- Installation metadata (Metadata, FileOwnership)
- Error definitions
- Command option interfaces

**Isolation:** No circular imports; clean dependency flow: commands → services/shared → types.

### 4. Atomic Operations

**File Write Safety:**
- Temp file + rename pattern for atomic writes
- Prevents corruption if process crashes mid-write
- Works across POSIX systems; Windows-safe via Node.js

**Metadata Persistence:**
- Single writeable entry point: `writeMetadata()`
- Atomic via safeWriteFile (temp + rename)
- No partial updates to disk

### 5. Cross-Platform Consistency

**Line Ending Normalization:**
- Checksum hashing normalizes CRLF → LF before hashing
- Prevents false "modified" detection on Windows
- Ensures portability between dev environments

**Protected Patterns:**
- Built into constants (never hardcoded)
- Checked before any modification attempt
- Prevents accidental deletion of `.git/`, credentials, etc.

### 6. Caching & Performance

**KitPathResolver Caching:**
- Resolves kit root once, caches KitPaths
- Avoids repeated filesystem searches
- Clearable for testing

**Metadata Caching:**
- Not cached (each call re-reads from disk)
- Ensures consistency in long-running processes
- Acceptable cost: metadata files are small JSON

### 7. Configuration Discovery

**Constants-Driven:**
- IDE_TARGETS, PROTECTED_FILE_PATTERNS, CONFIG_FILE_NAMES in constants.ts
- Single source of truth for all config
- Easy to extend without code changes

**Environment-Aware:**
- EPOST_KIT_ROOT for explicit override
- EPOST_KIT_VERBOSE for debug logging
- NO_COLOR for CI-safe output
- CI detection (process.env.CI flag)

---

## Dependencies

### External Packages

**Production:**
- `picocolors` - minimal color library (used by logger)
- `ora` - spinner component (used by logger)
- `minimatch` - glob pattern matching (used by ownership)

**Node.js Built-ins:**
- `node:fs/promises` - async file I/O
- `node:path` - path manipulation
- `node:crypto` - SHA256 hashing
- `node:url` - fileURLToPath for ESM module paths

### No Direct Coupling

Services and shared utilities import from each other but not from:
- Commands layer (avoided)
- Domain layer (avoided)
- External CLIs or APIs (avoided)

---

## Key Insights

### Strengths

1. **Imminent Implementation:** File operations are production-ready (not stubs)
   - Backup system is complete and tested
   - Ownership tracking uses checksums for safety
   - All error cases handled

2. **Defensive Design:** Constants and patterns prevent common mistakes
   - Protected file patterns prevent accidental deletion
   - Line ending normalization prevents false positives
   - Type system enforces option correctness

3. **Infrastructure Completeness:** Most utilities are implemented
   - Only stubs: process-lock, safe-prompts, safe-spinner, temp-cleanup, transformers, template-engine, output-manager
   - Production utilities fully featured: file-system, logger, path-resolver, constants

4. **Clear Ownership Model:** Three-tier classification simplifies update logic
   - epost-owned → safe to overwrite
   - epost-modified → user made changes, keep or warn
   - user-created → never touched

5. **Path Resolution Intelligence:** Handles multiple deployment scenarios
   - Dev mode (sibling repo)
   - Legacy mode (nested structure)
   - Production mode (GitHub-sourced)
   - npm link scenarios

### Design Tradeoffs

1. **Error Handling Duality:**
   - Safe utilities return null/false (silent failure)
   - Core operations throw errors (fail fast)
   - Caller must choose; no middle ground

2. **No Metadata Caching:**
   - Every operation re-reads JSON from disk
   - Ensures consistency but higher I/O cost
   - Acceptable for small projects; may need optimization at scale

3. **Protected Patterns Hard-Coded:**
   - Good: prevents accidental damage
   - Limitation: not user-configurable at install time (config option exists but unused)

4. **Stub Services:**
   - Template engine and transformers reserved but not implemented
   - Keeps door open for future expansion
   - Current commands don't rely on them

---

## Unresolved Questions

1. **Process Locking:** When is `acquireLock`/`releaseLock` needed? Multi-process safety or CLI concurrency?
2. **Safe Prompts Implementation:** Which prompt library? (inquirer, prompts, etc.)
3. **Temp Cleanup Scope:** Which commands create temps? How are they tracked?
4. **Template Engine Source:** Will render from claude-md-generator.ts? What format?
5. **Output Manager Usage:** When does JSON/verbose mode activate? CLI option?
6. **Config File Discovery:** Is cosmiconfig used, or custom search logic?
7. **Metadata Update Performance:** File re-read on every operation - bottleneck at scale?

