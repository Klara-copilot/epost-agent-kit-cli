# Scout Report: CLI & Commands Layer

**Report Date**: 2026-02-11 | **Scope**: `src/cli/` + `src/commands/` | **Status**: Complete

---

## Overview

The CLI & Commands Layer serves as the **command orchestration and user interaction surface** of epost-agent-kit-cli. This 2-tier structure implements a clean separation of concerns:

- **CLI Configuration** (`src/cli/index.ts`) - Barrel file for command registration (in-progress migration)
- **Commands** (`src/commands/*.ts`) - 11 thin orchestrator functions delegating to domain logic

All commands follow a consistent pattern: **validate input → coordinate domains → display output**. Commands are stateless, lightweight orchestrators that compose domain services and infrastructure layers.

---

## CLI Configuration (src/cli/)

### Status
- `src/cli/index.ts` - **Barrel file (empty, in migration)**
  - Currently a placeholder with comment: "Exports will be added during migration"
  - Indicates CLI setup is being refactored to 4-layer architecture
  - Command registration likely in main `cli.ts` (not in analyzed scope)

### Architecture Pattern
The empty barrel suggests planned consolidation of CLI setup. Commands are likely registered centrally elsewhere (possibly `src/cli.ts` root).

---

## Commands Analysis

### 1. **doctor** (`src/commands/doctor.ts`)
**Purpose**: Verify installation and environment health

**Key Features**:
- Runs all health checks sequentially
- Supports `--fix` auto-repair for fixable issues
- Supports `--report` JSON output mode
- Exit codes: 0 (pass), 2 (warnings), 1 (failures)
- Interactive UI with progress spinner

**Dependencies**:
- `@/domains/health-checks/health-checks.js` - `runAllChecks()`, `CheckResult` type
- `@/shared/logger.js` - Logging & spinner
- `@/domains/ui/index.js` - `heading()`, `checkResult()`, `checkSummary()`

**Architecture**: 
- Calls `runAllChecks(cwd)` → processes results → displays UI → auto-fixes if requested
- Decouples check logic (domain) from display (UI)

**Error Handling**: Try-catch around fix operations with fallback to debug logging

---

### 2. **dev** (`src/commands/dev.ts`)
**Purpose**: Watch packages/ and live-sync to target `.claude/` directory (for kit designers)

**Key Features**:
- Recursive file watcher with 300ms debounce
- Tracks file changes across multiple packages
- Regenerates `settings.json` and `CLAUDE.md` on relevant changes
- Handles single-file & directory mappings per manifest
- Graceful signal handling (SIGINT)

**Dependencies**:
- `node:fs` watch API
- `@/domains/packages/package-resolver.js` - `loadAllManifests()`, `resolvePackages()`
- `@/domains/config/settings-merger.js` - `mergeAndWriteSettings()`
- `@/domains/help/claude-md-generator.js` - `collectSnippets()`, `generateClaudeMd()`
- `@/shared/logger.js`, `@/shared/file-system.js`

**Architecture**:
- Maps manifest file entries → watches changes → processes changes → regenerates outputs
- Debounced batching to reduce redundant operations
- Context-aware (platform, layer, snippet info passed to generators)

**Complexity**: Highest complexity command - manages file mapping state, debouncing, watchers lifecycle

---

### 3. **init** (`src/commands/init.ts`)
**Purpose**: Initialize epost-agent-kit in existing project (package-based or legacy kit-based)

**Key Features**:
- Dual installation modes: **Package-based** (new) or **Kit-based** (legacy with migration)
- 7-step package-based flow: locate → detect profile → resolve → select → backup → install → finalize
- Auto-detects project type (team/role profiling)
- Intelligent file ownership tracking via checksums
- Skill index generation from installed SKILL.md files
- Settings merge from multiple packages
- CLAUDE.md generation with handlebars templates

**Dependencies**:
- `@inquirer/prompts` - `select()`, `confirm()`, `checkbox()`
- `@/domains/packages/package-resolver.js` - Resolution, profiling
- `@/domains/installation/template-manager.js` - Kit download, file listing
- `@/domains/installation/smart-merge.js` - Conflict detection & resolution (legacy mode)
- `@/domains/config/settings-merger.js` - JSON settings aggregation
- `@/domains/help/claude-md-generator.js` - Documentation generation
- `@/services/file-operations/ownership.js` - Metadata tracking
- `@/services/file-operations/backup-manager.js` - Pre-update backup

**Architecture**:
- Shared utilities: `scanDirFiles()`, `generateSkillIndex()`, `extractSkillFrontmatter()`
- Frontmatter extraction parses YAML metadata from SKILL.md files
- File ownership metadata maps files to packages + versions + checksums
- Supports migration from ClaudeKit (legacy)

**Complexity**: Second highest - 930 lines, dual modes, complex file tracking

---

### 4. **new** (`src/commands/new.ts`)
**Purpose**: Create new project from kit template

**Key Features**:
- Interactive template selection
- Directory creation with validation
- IDE target selection (Claude/Cursor/GitHub Copilot)
- Metadata generation with file checksums
- Optional git init and npm install

**Dependencies**:
- `@inquirer/prompts` - Input prompts
- `@/domains/installation/template-manager.js` - `listAvailableKits()`, `downloadKit()`, `getKitFiles()`
- `@/services/file-operations/ownership.js` - Metadata generation
- `@/services/file-operations/checksum.js` - `hashFile()`
- `@/domains/installation/package-manager.js` - `detectPackageManager()`
- `execa` - Git & npm execution

**Architecture**:
- Sequential: template selection → dir validation → IDE choice → download → metadata → init → optional deps

---

### 5. **onboard** (`src/commands/onboard.ts`)
**Purpose**: Guided first-time setup wizard for new developers

**Key Features**:
- 6-step interactive wizard
- Team-based profile suggestions
- Auto-detection of single-profile teams
- Package selection with visual manifest table
- Target directory selection (cwd / path / git clone)
- Delegates to `runInit()` for final install

**Dependencies**:
- `@inquirer/prompts` - Complex selection flows
- `@/domains/packages/package-resolver.js` - Profile & manifest loading
- `@/domains/packages/profile-loader.js` - `listProfiles()`, `findProfilesByTeam()`, `getProfileInfo()`, `getOrderedTeamChoices()`
- `@/domains/ui/index.js` - `banner()`, `box()`, `packageTable()`
- Local `./init.js` - Delegates to `runInit()`

**Architecture**:
- Orchestrates user flow with smart defaults based on team selection
- Defers installation to `runInit()` (command composition)

---

### 6. **package** (`src/commands/package.ts`)
**Purpose**: Manage installed packages (list, add, remove)

**Key Features**:
- **list**: Display all packages with layer diagram, installation status
- **add**: Install package + dependencies with manifest-aware file copying
- **remove**: Uninstall with dependency checking & file cleanup

**Dependencies**:
- `@/domains/packages/package-resolver.js` - Manifest loading
- `@/services/file-operations/ownership.js` - Metadata read/write
- `@/shared/file-system.js` - Safe directory operations
- `@/domains/ui/ui.js` - `heading()`, `layerDiagram()`

**Architecture**:
- Reuses core `loadAllManifests()` across subcommands
- File safety: Dependency checking before add, reverse-dependency checking before remove
- Metadata-driven cleanup (tracks package ownership)

---

### 7. **profile** (`src/commands/profile.ts`)
**Purpose**: Browse available developer profiles

**Key Features**:
- **list**: Show all profiles (filterable by team)
- **show**: Display profile details + resolved packages + stats

**Dependencies**:
- `@/domains/packages/package-resolver.js` - Manifest loading
- `@/domains/packages/profile-loader.js` - Profile queries
- `@/domains/ui/ui.js` - `heading()`, `table()`, `keyValue()`

**Architecture**:
- Profile info queried from YAML + manifests combined for display

---

### 8. **uninstall** (`src/commands/uninstall.ts`)
**Purpose**: Remove installed kit with ownership awareness

**Key Features**:
- 4-step removal: detect → analyze → remove → clean
- Ownership classification: epost-owned / epost-modified / user-created
- Preserves user modifications unless `--force`
- Recursive empty directory cleanup
- Modified files warning

**Dependencies**:
- `@/services/file-operations/ownership.js` - `readMetadata()`, `classifyFile()`
- `@/shared/file-system.js` - Safe file operations
- `@/shared/constants.js` - `METADATA_FILE` path

**Architecture**:
- Classifier tier: `classifyFile()` determines ownership per file before removal
- Plan generation before execution for safety
- Supports `--force` for complete removal including user edits

**Utility Functions**:
- `createUninstallPlan()` - Builds removal/preservation lists
- `executeUninstall()` - Performs file deletion
- `cleanEmptyDirsRecursive()` - Recursive cleanup

---

### 9. **update** (`src/commands/update.ts`)
**Purpose**: Self-update CLI to latest version from npm registry

**Key Features**:
- Check for updates from npm
- Show changelog preview
- `--check` flag for info-only mode
- Detect package manager (npm/yarn/pnpm)
- Verify update succeeded
- Fallback to manual update instructions on failure

**Dependencies**:
- `@/domains/versioning/self-update.js` - `checkForUpdate()`, `detectPackageManager()`, `getUpdateCommand()`, `executeUpdate()`, `verifyUpdate()`, `getChangelogPreview()`

**Architecture**:
- Wraps versioning domain logic with user interaction & error handling

---

### 10. **versions** (`src/commands/versions.ts`)
**Purpose**: List available kit versions from GitHub releases

**Key Features**:
- Fetch releases from `Klara-copilot/epost_agent_kit` repo
- Display with version | date | status (LATEST/PRE/STABLE) | changelog
- Configurable limit (default 10)
- Pre-release filtering
- Network error handling

**Dependencies**:
- `@/domains/github/github-client.js` - `fetchReleases()`
- `@/types/errors.js` - `NetworkError`

**Architecture**:
- Lightweight display wrapper around GitHub API client

---

### 11. **workspace** (`src/commands/workspace.ts`)
**Purpose**: Generate workspace-level CLAUDE.md for multi-repo setups

**Key Features**:
- Single command: `workspace init`
- Generates workspace-level documentation
- Template-based with handlebars
- Overwrite confirmation

**Dependencies**:
- `@/domains/installation/claude-md-generator.js` - `generateWorkspaceClaudeMd()`

**Architecture**:
- Minimal orchestration (1 main function, 1 utility for template discovery)

---

## Patterns & Conventions

### Common Architecture
All commands follow this pattern:
```
1. Validate input (check directories, files)
2. Load manifests/metadata (one-time)
3. Coordinate domain operations
4. Display results with UI components
5. Exit with appropriate code
```

### User Interaction
- **Prompts**: `@inquirer/prompts` for interactive flows
- **Progress**: `ora` spinners for async operations
- **Output**: Custom UI components (`heading()`, `box()`, `table()`, `packageTable()`)
- **Logging**: Centralized `@/shared/logger.js`

### Error Handling Patterns
- **Validation**: Throw early with clear messages
- **Operations**: Try-catch with logger fallback
- **Recovery**: `--force` flags for manual override, `--yes` for automation

### Options Management
Commands share a `GlobalOptions` interface:
- `--verbose`: Debug logging
- `--yes`: Skip confirmations (automation)
- Command-specific: `--profile`, `--package`, `--force`, etc.

---

## Dependencies Matrix

### External Packages (package.json)
| Package | Usage |
|---------|-------|
| `@inquirer/prompts` | Interactive CLI prompts (select, confirm, checkbox, input) |
| `ora` | Spinner animations for long operations |
| `picocolors` | ANSI color formatting for terminal output |
| `cac` | CLI argument parsing (likely in main cli.ts) |

### Internal Domains
| Domain | Used By | Purpose |
|--------|---------|---------|
| `health-checks` | doctor | Environment verification |
| `packages` | init, onboard, profile, package, dev | Manifest resolution & profiling |
| `installation` | init, new, workspace | Template management & merging |
| `config` | init, dev | Settings aggregation |
| `help` | init, dev | Documentation generation |
| `versioning` | update | CLI self-update |
| `github` | versions | GitHub API client |
| `ui` | All (11 commands) | Terminal formatting |

### Internal Services
| Service | Used By | Purpose |
|---------|---------|---------|
| `file-operations` | init, new, package, uninstall | Ownership tracking, checksums, backups |
| `ownership` | uninstall, package | File classification & metadata |

### Shared Utilities
| Utility | Used By | Purpose |
|---------|---------|---------|
| `logger` | All (11 commands) | Logging, spinners, colors |
| `file-system` | All (11 commands) | Safe file operations (exists checks, copy, remove) |
| `path-resolver` | init, onboard | Locate packages, profiles, templates |
| `constants` | uninstall | Hardcoded paths (METADATA_FILE) |

---

## Key Architectural Insights

### Strengths
1. **Clean Delegation**: Commands are thin orchestrators, real logic in domains
2. **Consistent UX**: Shared logger, UI components, prompt patterns across all commands
3. **Dual Modes**: `init` supports both legacy (kit-based) and new (package-based) flows
4. **File Safety**: Ownership tracking prevents data loss during uninstall
5. **Composability**: Commands call each other (e.g., `onboard` → `init`)
6. **Configuration-Driven**: Manifests, profiles, YAML define behavior vs. hardcoded

### Concerns & Code Smells

#### 1. **Large Commands**
- `init.ts` - 930 lines (complex dual mode)
  - Could split: `initPackageMode()` + `initKitMode()` separately
  - Utility functions at bottom (`scanDirFiles`, `generateSkillIndex`, etc.) could be extracted to services

- `dev.ts` - 228 lines (watcher with complex state)
  - Debounce timer + pending changes map could be a dedicated `FileWatcher` class

#### 2. **Repeated Pattern: "Find Directory"**
Multiple commands re-implement directory discovery:
- `package.ts`: `findPackagesDir()`
- `profile.ts`: `findProfilesPath()`
- `workspace.ts`: `findTemplatesDir()`

**Fix**: Centralize in `KitPathResolver` (already exists but only partially used)

#### 3. **Metadata Handling Scattered**
File ownership tracking logic split across:
- `src/services/file-operations/ownership.js` - `readMetadata()`, `classifyFile()`
- `init.ts` - Generates metadata + file tracking
- `package.ts` - Updates metadata
- `uninstall.ts` - Reads & modifies metadata

**Fix**: Create unified metadata service layer

#### 4. **Type Definitions Location**
All command options in single file (`src/types/commands.ts`):
- Good: Single source of truth
- Risk: Could grow unwieldy as commands multiply

**Better**: Keep but organize by command group (e.g., `ProfileOptions`, `PackageOptions`)

#### 5. **Error Handling Inconsistency**
- Some commands throw immediately (`init`, `new`, `uninstall`)
- Others return silently (`profile list` with no results)
- Inconsistent exit codes handling

**Pattern**: Establish error vs. warning vs. info semantics

#### 6. **Async/Promise Handling**
All commands are async but no command-level error boundary exists. If a domain throws, it bubbles up uncaught.

**Risk**: Poor error messages to users

---

## Integration Points

### Upstream (Called By)
- Main CLI entry (`cli.ts`) - Registers commands, parses args
- Interactive flows - `onboard()` calls `init()`, both use shared prompts

### Downstream (Calls)
```
Commands
  ├─→ Domains (business logic, manifests, health checks)
  ├─→ Services (file operations, versioning, GitHub API)
  ├─→ Shared (logger, file-system, path-resolver)
  └─→ UI Components (formatting, tables, boxes)
```

---

## Code Quality Assessment

| Criterion | Rating | Notes |
|-----------|--------|-------|
| **Separation of Concerns** | A | Clean orchestration layer, minimal business logic |
| **Testability** | B+ | Commands are thin but lack dependency injection for easier mocking |
| **Maintainability** | B | Good for <200 LOC; some commands exceed 400-900 lines |
| **Consistency** | B | Patterns followed but some duplication (dir finding, metadata handling) |
| **Error Handling** | B- | Inconsistent exit codes, some commands don't validate inputs fully |
| **Documentation** | A | JSDoc on functions, clear purpose statements |

---

## Recommendations

### Priority 1: Refactoring
1. **Extract directory discovery** into `KitPathResolver` extensions
   - `getPackagesDir()`, `getProfilesPath()`, `getTemplatesDir()` already exist
   - Remove `findPackagesDir()`, `findProfilesPath()`, `findTemplatesDir()` duplicates

2. **Split `init.ts` into modes**
   - `initPackageMode()` (380 lines) + `initKitMode()` (210 lines)
   - Extract utilities to services: `generateSkillIndex()` → skill-index service

3. **Consolidate metadata handling**
   - Create `MetadataManager` service with read/update/classify methods
   - Remove scattered logic from `init.ts`, `package.ts`, `uninstall.ts`

### Priority 2: Consistency
1. **Establish error semantics**
   - Exit code 0: Success
   - Exit code 1: Error (user action required)
   - Exit code 2: Warning (continue or fix)

2. **Validate all inputs early**
   - All commands should validate directory existence before chdir
   - Consistent error message format

3. **Standardize async error handling**
   - Wrap top-level `runX()` functions in try-catch at CLI boundary
   - Never let domain errors bubble uncaught

### Priority 3: Enhancement
1. **Add command-level metrics** (already have task completion)
   - Track command execution time
   - Log device info for diagnostic reports

2. **Implement undo/rollback**
   - Backup system exists (`backup-manager.js`)
   - Add undo capabilities to install/remove commands

3. **CLI middleware**
   - Add pre/post hooks for consistent logging, timing, error handling
   - Currently no hook system

---

## Unresolved Questions

1. **Command Registration**: Where is the main CLI entry point (`cli.ts`)? The barrel in `src/cli/index.ts` is empty. How are commands registered?

2. **Dependency Resolution**: Package resolution supports optional + exclude lists. Are there transitive dependency cycles or version conflicts handled?

3. **Performance**: File watching in `dev` command doesn't deduplicate watches across packages. If 10 packages watch same directory, will there be duplicate events?

4. **Backward Compatibility**: Legacy kit-based mode (`initKitMode`) - is this being phased out? Should it be removed?

5. **Workspace Feature**: `workspace init` generates CLAUDE.md but commands don't use workspace context. How does inheritance work?

---

**Report End**
