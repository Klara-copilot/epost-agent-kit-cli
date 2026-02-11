# Scout Report: Domain Layer Part 2

## Overview

Analyzed 5 specialized business domains (Installation, Packages, UI, Versioning, Error) totaling 4 core modules with sophisticated workflows for template management, package resolution, dependency handling, terminal UI rendering, and CLI versioning. These domains handle critical orchestration tasks for the ePost Agent Kit CLI's main features.

## Domain: Installation (704 LOC)

### Purpose
Manages kit template downloading, extraction, CLAUDE.md generation, package installation, and smart merge conflict resolution for init command workflow.

### File Structure
- `claude-md-generator.ts` (337 LOC) - Template engine + snippet collection
- `smart-merge.ts` (191 LOC) - File ownership classification & merge planning
- `template-manager.ts` (114 LOC) - GitHub release download & extraction
- `package-manager.ts` (61 LOC) - Package manager detection & execution
- `index.ts` (1 LOC) - Barrel export

### Core Algorithms

#### 1. Template Rendering Engine (claude-md-generator.ts)
**Custom template engine** without external deps. Supports:
- Variable substitution: `{{variable}}`, `{{nested.var}}`
- Conditionals: `{{#if var}}...{{else}}...{{/if}}`
- Loops: `{{#each items}}...{{/each}}`
- Unless blocks: `{{#unless var}}...{{/unless}}`
- Array helpers: `{{@index}}`, `{{@last}}`, `{{@first}}`
- Raw output: `{{{variable}}}`

**Implementation**: Regex-based pattern replacement with recursive rendering for nested structures. Processes in order: each loops, if/else blocks, unless blocks, triple-brace, double-brace, and @ helpers.

```typescript
// Execution sequence:
1. Extract {{#each}} blocks and map over arrays
2. Process {{#if}} conditionals with else branches
3. Handle {{#unless}} negation blocks
4. Substitute {{{raw}}} and {{variables}}
5. Replace @-prefixed helpers (@index, @last, @first)
```

**Data Flow**: Template string → Regex replacements → Rendered output with context variables injected.

#### 2. Snippet Collection (claude-md-generator.ts)
- Loads `CLAUDE.snippet.md` from each package directory
- Collects snippets in layer order (lower layers first)
- Merges into single CLAUDE.md with template

**Generation Strategy**:
1. Load template from disk
2. Collect snippets from packages in layer order
3. Render template with context + snippets
4. Append snippets if template doesn't reference `{{snippetContent}}`
5. Write final CLAUDE.md

#### 3. Smart Merge System (smart-merge.ts)
**File Classification Algorithm**:
1. Scan existing project files
2. For each new kit file:
   - Check if file exists
   - If exists, classify by ownership tier:
     - `epost-owned`: Safe to overwrite
     - `epost-modified`: Marked as conflict
     - `user-created`: Skip to preserve user changes
   - If not exists: Mark as `create`

**Ownership Classification**: Uses `classifyFile()` service which reads metadata from `.epost/metadata.json` to track file provenance.

**Merge Plan Actions**:
```
overwrite → epost-owned files (safe to replace)
skip      → user-created files (preserve modifications)
conflict  → epost-modified files (require manual review)
create    → new files (add to project)
```

**Conflict Resolution**: Optional map of file→decision ('keep'|'overwrite') passed to execution phase.

#### 4. Template Download & Extraction (template-manager.ts)
**Workflow**:
1. Fetch GitHub releases for kit repository
2. Find target release by version ('latest' or tag)
3. Locate `.tar.gz` source archive in release assets
4. Download to temp directory with timestamp naming
5. Extract to destination with `tar --strip-components=1` (flattens top-level directory)
6. Clean up temp directory

**Error Handling**: NetworkError thrown if release/tarball not found.

#### 5. Package Manager Detection (package-manager.ts)
**Lock File Priority**: `pnpm > yarn > bun > npm`

**Algorithm**: Check for lock files in order of priority, return first found, fallback to npm.

```typescript
Lock File Mapping:
pnpm → pnpm-lock.yaml
yarn → yarn.lock
bun  → bun.lockb
npm  → package-lock.json
```

### Data Structures

```typescript
// Installation Domain
interface ClaudeMdContext {
  profile?: string;
  packages: string[];
  target: string;
  kitVersion: string;
  projectName: string;
  platforms: string[];
  agentCount: number;
  skillCount: number;
  commandCount: number;
  [key: string]: any;
}

interface PackageSnippet {
  packageName: string;
  layer: number;
  content: string;
}

interface FileClassification {
  owned: string[];        // epost-owned files
  modified: string[];     // epost-modified files
  userCreated: string[];  // user-created files
  new: string[];          // new kit files
}

interface MergePlan {
  actions: Map<string, MergeAction>;
  summary: {
    overwrite: number;
    skip: number;
    conflict: number;
    create: number;
  };
}

type MergeAction = 'overwrite' | 'skip' | 'conflict' | 'create';

interface KitTemplate {
  id: string;
  name: string;
  description: string;
  targets: Array<'claude' | 'cursor' | 'github-copilot'>;
}
```

### File Operations
- **Read**: safeReadFile for templates, manifests, snippets
- **Write**: safeWriteFile for generated CLAUDE.md
- **Copy**: copyFile for merge execution (overwrite/create actions)
- **Network**: HTTP download for GitHub releases (execa curl)
- **Archive**: tar extraction via execa('tar', [...]) cross-platform
- **Directory**: readdir for file scanning, mkdir for temp dirs

### Integration Points
- **Services**: classifyFile (file-operations/ownership), safeReadFile/safeWriteFile (shared)
- **Domains**: github-client (fetch releases), packages (manifest loading)
- **Shared**: logger, constants (GITHUB_ORG, GITHUB_REPO)
- **External**: execa (process execution), picocolors (logging color)

## Domain: Packages (732 LOC)

### Purpose
Resolves profiles and package manifests, validates dependencies, performs topological sorting, detects project types, and loads configuration from YAML.

### File Structure
- `package-resolver.ts` (512 LOC) - Manifest loading, profiles, dependency validation, topological sort
- `profile-loader.ts` (220 LOC) - Auto-detection, profile enumeration, team management
- `index.ts` (3 LOC) - Barrel exports

### Core Algorithms

#### 1. Simple YAML Parser (package-resolver.ts)
**No External Dependencies**: Custom line-by-line parser for subset of YAML.

**Supported Features**:
- Key-value pairs: `key: value`
- Nested objects (indent-based)
- Arrays (- syntax)
- Inline arrays: `[a, b, c]`
- Comments: `# comment`
- Type inference: strings, booleans (true/false), integers, floats

**Algorithm**:
1. Split by newlines, filter comments
2. Maintain stack of nested objects by indentation
3. Track array context when `- ` detected
4. Parse values based on syntax (arrays vs. objects)
5. Pop stack when indentation decreases

**Limitation**: Does not support flow style `{...}`, anchors `&`, aliases `*`.

#### 2. Package Dependency Validation (package-resolver.ts)
**Algorithm**:
1. Collect all package names in set
2. For each package, iterate dependencies
3. Check if dependency exists in set
4. Return missing dependencies

**Output**: Array of `{package, missingDep}` tuples.

#### 3. Topological Sort (Kahn's Algorithm) (package-resolver.ts)
**Purpose**: Order packages so dependencies install before dependents.

**Algorithm**:
1. Build in-degree map (count incoming edges)
2. Build adjacency list from dependencies
3. Start with zero in-degree nodes (no dependencies)
4. Process queue, decrementing in-degrees
5. Sort queue by layer for stable ordering
6. Detect cycles if final sorted list length < input length

**Tie-Breaker**: When multiple packages have zero in-degree, sort by manifest.layer (lower first).

**Cycle Detection**: Throws ConfigError with remaining packages if graph has cycles.

#### 4. Package Resolution Pipeline (package-resolver.ts)
**Full Workflow**:
```
Input: profile | explicit packages → Load manifests → Determine packages
  ↓
Auto-add missing dependencies
  ↓
Validate all dependencies satisfied
  ↓
Topological sort (install order)
  ↓
Collect recommendations (from installed packages)
  ↓
Build optional list (from profile)
  ↓
Output: ResolvedPackages {
  packages: string[]      // sorted install order
  optional: string[]      // available but not selected
  recommended: string[]   // suggested by installed packages
  profile?: string        // which profile resolved it
}
```

#### 5. Auto-Detection Rules (profile-loader.ts)
**Match Strategy**: AND logic (all rules must match for rule to apply).

**Rule Types**:
```typescript
match: {
  files?: string[]        // e.g., "package.json", "*.env"
  directories?: string[]  // e.g., "src", "app/*"
  dependencies?: string[] // e.g., "react", "next"
}
```

**Confidence Calculation**:
- high: All checks match
- medium: Some checks match
- low: No checks match

**File Pattern Matching**: Simple glob support (`*` → `.*` regex).

#### 6. Team Ordering (profile-loader.ts)
**Curated Order**: Feature Teams → Mobile → Specialist teams.
**Teams**: helios, miracle, titan, hacka, kepler, optimus, future, muji.
**UI Display**: Grouped with Separator dividers, "Others / I'm exploring" always at end.

### Data Structures

```typescript
// Package Resolver
interface PackageManifest {
  name: string;
  version: string;
  description: string;
  layer: number;                    // 0=Foundation, 1=Platforms, 2=Domain
  platforms: string[];              // ["all", "macos", "linux", ...]
  dependencies: string[];           // Required packages
  recommends?: string[];            // Optional suggestions
  provides: {
    agents: string[];               // Agent names
    skills: string[];               // Skill names
    commands: string[];             // Command names
  };
  files: Record<string, string>;    // File mappings
  settings_strategy: "base" | "merge" | "skip";
  claude_snippet?: string;          // Path to snippet file
}

interface ProfileDefinition {
  display_name: string;
  teams?: string[];
  packages: string[];
  optional?: string[];
}

interface ResolvedPackages {
  packages: string[];               // Topological order
  optional: string[];
  recommended: string[];
  profile?: string;
}

interface AutoDetectRule {
  match: {
    files?: string[];
    directories?: string[];
    dependencies?: string[];
  };
  suggest: string;
}

// Profile Loader
interface DetectionResult {
  profile: string;
  displayName: string;
  confidence: "high" | "medium" | "low";
  matchedRules: string[];
}

interface ProfileInfo {
  name: string;
  displayName: string;
  teams: string[];
  packages: string[];
  optional: string[];
}
```

### File Operations
- **Read**: readFile for package.yaml, profiles.yaml, package.json
- **Directory**: readdir for scanning packages directory
- **Validation**: fileExists, dirExists for pattern matching

### Integration Points
- **Shared**: logger (debug), ConfigError exceptions
- **Services**: None (self-contained)
- **External**: None (minimal dependencies)

## Domain: UI (403 LOC)

### Purpose
Centralized terminal display utilities for consistent formatting across CLI. All functions return strings; callers decide when to print. Respects NO_COLOR and CI environment variables.

### Core Features

#### 1. Environment Detection
```typescript
const noColor = process.env.NO_COLOR !== undefined || process.env.TERM === "dumb"
const isCI = CI || GITHUB_ACTIONS || JENKINS_URL || BUILDKITE
```

#### 2. Layout Primitives
- **banner()**: Branding with logo, version, tagline
- **box()**: Bordered container with padding, optional title
- **divider()**: Horizontal line (default 50 chars)
- **heading()**: Bold text with divider
- **subheading()**: Dimmed text
- **stepHeader()**: Progress indicator `[1/5] Label`

#### 3. Data Display
- **keyValue()**: Aligned key-value pairs with max key length padding
- **table()**: CLI-table3 with optional compact style
- **tree()**: Nested tree with recursive rendering, badges, connectors
- **badge()**: Colored tags [INFO], [SUCCESS], [WARN], [ERROR], [DIM]

#### 4. Package/Layer Visualization
- **packageTable()**: Columns = Name, Layer, Agents, Skills, Commands
- **layerDiagram()**: Grouped by layer (0=Foundation, 1=Platforms, 2=Domain) with install status markers [*]

#### 5. Doctor Display
- **checkResult()**: [PASS]/[WARN]/[FAIL] status messages
- **checkSummary()**: Summary box with pass/warn/fail counts

#### 6. Post-Install
- **nextSteps()**: Commands in box with cyan highlighting

### Character Sets

**Color Fallback** (NO_COLOR or CI):
- Box: `+`, `-`, `|` instead of `┌┐└┘─│`
- Tree: `|--`, `` `--` `` instead of `├──`, `└──`
- Progress: `[*]`, `[ ]` (no color)

### Data Structures

```typescript
interface BoxOptions {
  title?: string;
  padding?: number;
  width?: number;
}

interface TreeNode {
  label: string;
  badge?: string;
  children?: TreeNode[];
}

interface PackageManifestSummary {
  name: string;
  description?: string;
  layer: number;
  agents: number;
  skills: number;
  commands: number;
  platforms?: string[];
  dependencies?: string[];
  installed?: boolean;
}

type BadgeVariant = "info" | "success" | "warn" | "error" | "dim";
type CheckStatus = "pass" | "warn" | "fail";
```

### Utilities
- **stripAnsi()**: Remove ANSI color codes (regex: `/\x1b\[[0-9;]*m/g`)
- **indent()**: Add leading spaces to all lines
- **termWidth()**: Get terminal width (fallback 80)

### Integration Points
- **Dependencies**: picocolors (color codes), cli-table3 (tables)
- **Shared**: branding (LOGO, VERSION, TAGLINE from help domain)
- **Usage**: All functions pure (no side effects), string return

## Domain: Versioning (120 LOC)

### Purpose
Manages CLI self-update detection, version checking, package manager selection, and changelog preview.

### Core Functions

#### 1. Version Management
- **getCurrentVersion()**: Read version from package.json at build location
- **getLatestVersion()**: Fetch from npm registry via `npm view epost-kit version`
- **checkForUpdate()**: Returns `{current, latest, updateAvailable}`

#### 2. Package Manager Detection (Versioning)
**Detection Strategy** (for globally installed CLI):
1. Try `npm prefix -g` to get global prefix
2. Check `pnpm list -g epost-kit`
3. Check `yarn global list`
4. Fallback to npm

#### 3. Update Execution
- **getUpdateCommand()**: Display string for each PM
  - npm: `npm install -g epost-kit@latest`
  - pnpm: `pnpm add -g epost-kit@latest`
  - yarn: `yarn global add epost-kit@latest`
- **executeUpdate()**: Run command via execa with stdio: inherit
- **verifyUpdate()**: Check if version matches expected after update

#### 4. Changelog Preview
**Current**: Placeholder returning GitHub releases link.
**Future**: Parse GitHub releases API between versions, format into preview.

### Data Structures

```typescript
type PackageManager = 'npm' | 'pnpm' | 'yarn';

// Returned by functions
{
  current: string;
  latest: string;
  updateAvailable: boolean;
}
```

### Integration Points
- **Shared**: logger, APP_NAME constant
- **External**: execa (process execution)
- **Services**: None (standalone)

## Domain: Error (3 LOC)

### Purpose
Placeholder for error domain. Currently empty barrel file.

**Status**: "Exports will be added during migration"

**Expected Purpose**: Centralize error types and handling (ConfigError, NetworkError, ValidationError, etc. already defined in `/types/errors.ts`).

## Architecture Insights

### Domain Cohesion
- **Installation**: Tight cohesion - all functions support template→merge workflow
- **Packages**: High cohesion - manifest loading, resolution, auto-detection tightly coupled
- **UI**: Modular cohesion - independent display functions composable
- **Versioning**: Tight cohesion - all functions support update workflow
- **Error**: Empty (migration in progress)

### Domain Coupling
```
Installation → Packages (loads manifests)
            → GitHub (fetch releases)
            → Services (file ownership)

Packages → No external domain dependencies
         → Self-contained YAML + logic

UI → Help (branding)
   → External: picocolors, cli-table3

Versioning → No external domain dependencies
           → npm registry API calls
```

### Execution Flow: Installation Init Command
```
1. detectPackageManager() → determine PM
2. resolvePackages() → dependencies + topological sort
3. downloadKit() → fetch GitHub release
4. classifyFiles() → merge planning
5. planMerge() → conflict detection
6. collectSnippets() → CLAUDE.md assembly
7. generateClaudeMd() → template rendering
8. executeMerge() → file deployment
```

### Critical Paths
1. **Smart Merge**: File classification accuracy critical - wrong tier causes data loss
2. **Topological Sort**: Cycle detection essential - prevents infinite loops
3. **YAML Parser**: Must handle all package.yaml structures - no fallback
4. **Template Engine**: Must preserve snippet formatting - no escaping needed (raw content)
5. **Package Resolution**: Must auto-add transitive dependencies - missing breaks install

## Dependencies

### External Libraries
- **execa**: Process execution (CLI commands)
- **picocolors**: Terminal colors (lightweight)
- **cli-table3**: Terminal tables
- **@inquirer/prompts**: UI components (Separator for teams)

### Internal Dependencies
- `@/shared/logger` (universal)
- `@/shared/file-system` (read/write/exists)
- `@/shared/constants` (GITHUB_ORG, GITHUB_REPO, APP_NAME)
- `@/shared/path-resolver` (KitPathResolver)
- `@/types/errors` (ConfigError, NetworkError)
- `@/services/file-operations/ownership` (classifyFile)
- `@/domains/github/github-client` (fetch releases)
- `@/domains/help/branding` (LOGO, VERSION)

## Key Insights

### Design Patterns
1. **Pure Functions**: UI domain returns strings; no print side effects
2. **YAML Parsing**: Custom parser avoids heavyweight dependency (js-yaml)
3. **Template Engine**: Simple regex-based avoids Handlebars complexity
4. **Ownership Tracking**: Metadata-based classification enables smart merges
5. **Layer-Based Ordering**: Manifests include layer for stable topo sort

### Potential Issues
1. **YAML Parser Limitations**: Does not support anchors, aliases, flow style - assumes manual config authoring
2. **Template Recursion**: Deep nesting could cause stack overflow (no depth limit)
3. **File Classification**: Depends on metadata accuracy - if metadata corrupt, merge fails
4. **Temp Directory Cleanup**: Uses timestamp naming but no UUID - could collide under rapid calls
5. **Update Verification**: Only checks version, doesn't validate functionality

### Optimizations
1. **Template Caching**: Could cache compiled patterns (regex) instead of recompiling each render
2. **Manifest Caching**: Currently reloads all manifests even if unchanged
3. **Dependency Graph**: Could use adjacency list instead of rebuilding for each operation
4. **YAML Parsing**: Could be optimized with single pass instead of multiple regex replacements

## Unresolved Questions
1. **Error Domain**: What error types will be centralized when migration completes?
2. **CLAUDE.md Snippet File**: Where is `CLAUDE.snippet.md` location convention documented for package authors?
3. **Metadata Persistence**: How often is file ownership metadata updated - at every init or only first?
4. **Layer Numbering**: Are there conventions for layer assignment beyond 0/1/2?
5. **Team Mapping**: How are team-to-profile mappings discovered dynamically vs hardcoded list?
