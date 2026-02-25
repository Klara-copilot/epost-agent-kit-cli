# ePost Agent Kit CLI - Project Overview & PDR

**Version:** 0.1.0
**Created by:** Phuong Doan
**Last Updated:** 2026-02-25

## Executive Summary

ePost Agent Kit CLI is a command-line tool for managing AI agent development environments across Claude, Cursor, and GitHub Copilot platforms. It provides package-based installation, profile management, and intelligent file synchronization for teams building with the ePost Agent Kit framework.

## Vision & Goals

### Primary Vision
Enable developers to rapidly configure AI-powered development environments with zero manual setup, supporting multiple IDE platforms and team-specific workflows.

### Strategic Goals
1. **Zero-Config Onboarding**: New developers productive in < 5 minutes
2. **Multi-Platform Support**: Unified CLI for Claude, Cursor, GitHub Copilot
3. **Team-Specific Profiles**: Pre-configured environments per role (Frontend, Backend, Mobile, Data)
4. **Safe Updates**: Intelligent file tracking prevents data loss during updates
5. **Developer-First UX**: Clear terminal output, interactive prompts, helpful error messages

## Target Users & Use Cases

### Primary Users

**1. New Team Members**
- Use Case: Join project, run `epost-kit onboard`, select team profile, start coding
- Pain Point: Manual environment setup takes hours, prone to configuration errors
- Solution: Guided wizard auto-detects project type, installs correct packages

**2. Kit Designers**
- Use Case: Create custom packages, watch mode syncs changes to test environment
- Pain Point: Manual copy-paste for testing package changes
- Solution: `epost-kit dev` watches packages/, live-syncs to `.claude/`

**3. Team Leads**
- Use Case: Standardize team tooling across projects
- Pain Point: Inconsistent development environments cause integration issues
- Solution: Team-specific profiles ensure consistent package installations

**4. CI/CD Engineers**
- Use Case: Automate environment setup in pipelines
- Pain Point: Interactive CLIs don't work in CI
- Solution: `--yes` flag skips prompts, `--dry-run` validates configs

### Secondary Users

**5. Open Source Contributors**
- Use Case: Quickly set up project for contributions
- Pain Point: Long setup documentation, tool version mismatches
- Solution: `epost-kit new <template>` bootstraps projects from templates

**6. Multi-Project Developers**
- Use Case: Work on multiple projects with different kit versions
- Pain Point: Global tooling conflicts, version management complexity
- Solution: Per-project `.epost-metadata.json` tracks isolated configs

## Core Features

### Feature: Package Management
**Status:** Production
**Priority:** P0

Modular installation system using manifest-driven packages.

**Capabilities:**
- Install packages by name or profile: `epost-kit init --profile backend-engineer`
- Auto-resolve dependencies via topological sort (Kahn's algorithm)
- Layer-based ordering: Foundation → Platforms → Domain
- Circular dependency detection with clear error messages
- Optional package suggestions based on installed packages

**Technical Details:**
- Manifest format: `package.yaml` with dependencies, layer, platforms, files
- Resolution strategy: Profile → Package names → Dependency graph → Topo sort
- File operations: Copy with metadata tracking (checksums, install time, version)

**Success Metrics:**
- Zero manual dependency resolution
- < 30s install time for typical profile (5-10 packages)
- 100% dependency resolution accuracy

### Feature: Profile System
**Status:** Production
**Priority:** P0

Team and role-based configuration presets.

**Capabilities:**
- Auto-detect project type: `match.files`, `match.directories`, `match.dependencies`
- Team-based profiles: helios (Frontend), miracle (Backend), titan (Mobile), etc.
- Multi-team support: Single profile can match multiple teams
- Profile browsing: `epost-kit profile list --team mobile`
- Profile inspection: `epost-kit profile show backend-engineer`

**Technical Details:**
- Profile definition: `profiles.yaml` with packages[], optional[], teams[]
- Detection rules: AND logic (all conditions must match)
- Confidence levels: high (all match), medium (some match), low (none match)
- Curated team order for UX: Feature Teams → Mobile → Specialists

**Success Metrics:**
- > 90% auto-detection accuracy for common project types
- < 5 seconds to select profile via guided wizard

### Feature: Smart Merge System
**Status:** Production
**Priority:** P0

Intelligent file ownership tracking prevents data loss during updates.

**Capabilities:**
- Three-tier classification: epost-owned, epost-modified, user-created
- Checksum-based change detection (SHA256 with CRLF normalization)
- Metadata tracking: `.epost-metadata.json` records all installed files
- Conflict detection: Warns when user modifications exist before overwrite
- Protected patterns: Never touches `.git/`, `.env*`, `*.key`, etc.

**Technical Details:**
- Ownership algorithm: Compare current checksum vs. install checksum
- Classification logic:
  - epost-owned: Checksum matches → safe to overwrite
  - epost-modified: Checksum differs + tracked → user modified
  - user-created: Not in metadata → skip
- Backup system: Creates timestamped snapshots before updates

**Success Metrics:**
- Zero data loss incidents in production
- 100% accuracy in ownership classification
- Clear conflict resolution prompts

### Feature: Template System
**Status:** Production
**Priority:** P1

Download and extract project templates from GitHub releases.

**Capabilities:**
- List available kits: `epost-kit versions`
- Create new project: `epost-kit new --kit advanced`
- Version selection: Latest, pre-release, or specific tag
- IDE target selection: Claude, Cursor, GitHub Copilot
- Optional git init and npm install

**Technical Details:**
- Source: GitHub releases API (`Klara-copilot/epost_agent_kit`)
- Archive format: `.tar.gz` with `--strip-components=1` extraction
- Metadata generation: Per-file checksums for future updates
- Template discovery: Scans `templates/` directory in kit repo

**Success Metrics:**
- < 60s project creation (download + extract + init)
- Network error resilience (retry + fallback instructions)

### Feature: CLAUDE.md Generation
**Status:** Production
**Priority:** P1

Dynamic documentation generation using custom template engine.

**Capabilities:**
- Collect snippets from packages: `CLAUDE.snippet.md` files
- Layer-ordered rendering: Lower layers rendered first
- Template syntax: Variables, conditionals, loops, helpers
- Workspace-level generation: Multi-repo documentation
- Context injection: Profile, packages, platform, versions

**Technical Details:**
- Engine: Custom regex-based template renderer (no external deps)
- Syntax support: `{{var}}`, `{{#if}}`, `{{#each}}`, `{{@index}}`
- Data flow: Template → Collect snippets → Render → Write
- Auto-append: If template lacks `{{snippetContent}}`, appends at end

**Success Metrics:**
- Clear, accurate documentation for 100% of installs
- Template rendering time < 1s for typical project

### Feature: Health Checks
**Status:** Production
**Priority:** P1

Verify environment correctness with auto-fix capabilities.

**Capabilities:**
- Run all checks: `epost-kit doctor`
- Auto-repair: `epost-kit doctor --fix`
- JSON report: `epost-kit doctor --report` (for CI)
- Exit codes: 0 (pass), 2 (warnings), 1 (failures)
- Interactive UI: Spinner, pass/warn/fail indicators

**Technical Details:**
- Check categories: File presence, permissions, structure, dependencies
- Fixable checks: Create missing directories, restore corrupted metadata
- Non-fixable: Report issues, provide manual fix instructions
- Parallel execution: Independent checks run concurrently

**Success Metrics:**
- < 10s for full check suite
- > 80% of common issues auto-fixable

### Feature: Dev Watcher
**Status:** Production
**Priority:** P2

Live-sync packages for kit designers during development.

**Capabilities:**
- Watch mode: `epost-kit dev --target .claude --profile backend-engineer`
- Debounced syncing: 300ms delay to batch rapid changes
- Smart invalidation: Only regenerates affected files (settings vs. CLAUDE.md)
- Graceful shutdown: SIGINT handler for clean exit
- File mapping: Supports single-file and directory mappings per manifest

**Technical Details:**
- Watcher: Node.js `fs.watch` API (recursive)
- Debounce: Pending changes map with setTimeout batching
- Invalidation logic:
  - Settings change → regenerate `settings.json`
  - Snippet/template change → regenerate `CLAUDE.md`
  - Both on package.yaml change
- Context preservation: Maintains platform, layer info across regenerations

**Success Metrics:**
- < 500ms sync latency after file change
- Zero sync failures on rapid changes
- Clear terminal feedback for each sync

### Feature: GitHub Distribution
**Status:** Production
**Priority:** P0

Package distribution via GitHub releases with authentication support.

**Capabilities:**
- Download latest kit from GitHub releases (`Klara-copilot/epost_agent_kit`)
- GitHub authentication via `gh` CLI token
- Release caching with `--force-download` override
- Network error handling with helpful recovery instructions
- Automatic package extraction and installation

**Technical Details:**
- Distribution source: GitHub Releases API only (no local kit fallback)
- Authentication: GitHub CLI (`gh`) token via `getGitHubToken()`
- Caching strategy: `.epost-cache/` directory with validation
- Access checker: Validates gh CLI installation and authentication
- Release validator: Verifies archive integrity before extraction

**Success Metrics:**
- < 30s total download + extract time
- 100% success rate with valid GitHub auth
- Clear error messages for auth failures

## Technical Requirements

### Functional Requirements

**FR-1: Multi-Platform Support**
- Support Claude (`.claude/`), Cursor (`.cursor/`), GitHub Copilot (`.github/`)
- Single codebase, platform-specific file mappings in manifests
- Platform detection from project metadata

**FR-2: Dependency Resolution**
- Topological sort for install order
- Circular dependency detection with error reporting
- Auto-include missing dependencies
- Version tracking per package (future: semver constraints)

**FR-3: File Safety**
- Checksum-based change detection
- Backup before destructive operations
- Protected pattern enforcement (`.git/`, credentials)
- Atomic file writes (temp + rename pattern)

**FR-4: Profile Auto-Detection**
- Match by file patterns (e.g., `package.json`, `*.rs`)
- Match by directory structure (e.g., `src/`, `app/`)
- Match by dependencies (e.g., `react`, `django`)
- Confidence scoring: high/medium/low

**FR-5: GitHub-Only Distribution (CRITICAL)**
- Packages downloaded **exclusively** from GitHub releases
- **GitHub authentication REQUIRED** via `gh` CLI (`gh auth login`)
- No fallback to local kit sources
- Release caching with `--force-download` override
- Graceful degradation on network errors
- Clear error messages with recovery instructions

**FR-6: Offline-First (Future)**
- Cache manifests and profiles locally
- Graceful degradation on network errors
- Clear error messages with manual fallback instructions

### Non-Functional Requirements

**NFR-1: Performance**
- Full install < 60s for typical profile
- Health checks < 10s
- Watcher sync latency < 500ms
- CLI command startup < 200ms

**NFR-2: Reliability**
- Zero data loss on updates (metadata + backups)
- Graceful error handling with clear messages
- Rollback capability via backup system
- Exit codes follow sysexits.h conventions

**NFR-3: Usability**
- Interactive prompts with smart defaults
- Color-coded terminal output (NO_COLOR support)
- Progress indicators for long operations
- Helpful error messages with suggested fixes

**NFR-4: Maintainability**
- Clean 4-layer architecture (CLI → Commands → Domains → Services/Shared)
- Type-safe TypeScript (strict mode enabled)
- Comprehensive test coverage (103 tests, 70% target)
- Minimal dependencies (7 core packages)

**NFR-5: Security**
- Never modify protected files (`.env*`, `*.key`, `.git/`)
- Checksum verification for integrity
- No credential storage or transmission
- Safe temp file handling (atomic writes)

## Success Metrics

### User Satisfaction
- Onboarding time: < 5 minutes (target: 90% of users)
- Setup errors: < 5% of installations
- NPS score: > 40 (after 6 months)

### Technical Health
- Test pass rate: 100% (103/103 tests)
- Code coverage: > 70% (lines, functions, branches)
- Build success rate: > 99% (CI)
- Zero data loss incidents

### Adoption Metrics
- Active users: 50+ (after 3 months)
- Package contributions: 10+ community packages (after 6 months)
- Profile diversity: 8+ team-specific profiles

## Future Roadmap

### v0.2.0 - Enhanced Package Management
- [ ] Semver dependency constraints
- [ ] Package versioning and updates
- [ ] Local package caching for offline mode
- [ ] Package search and discovery

### v0.3.0 - Collaboration Features
- [ ] Team-level configuration sync
- [ ] Shared profile repositories
- [ ] Package recommendations based on team usage
- [ ] Multi-user conflict resolution

### v0.4.0 - Advanced Workflows
- [ ] Custom template creation
- [ ] Plugin system for extensibility
- [ ] CI/CD integration examples
- [ ] Docker image for reproducible environments

### v1.0.0 - Production Ready
- [ ] Comprehensive documentation
- [ ] Migration guides from legacy kits
- [ ] Telemetry for usage insights (opt-in)
- [ ] LTS support commitment

## Dependencies & Integration

### Core Dependencies
- `@inquirer/prompts` - Interactive CLI prompts
- `cac` - CLI framework and argument parsing
- `execa` - Process execution for git/npm
- `minimatch` - Glob pattern matching
- `picocolors` - Terminal color output
- `cli-table3` - Table formatting
- `ora` - Progress spinners
- `cosmiconfig` - Configuration file discovery
- `zod` - Schema validation
- `tar` - Archive extraction for releases

### External Integrations
- GitHub Releases API - Kit template downloads
- npm Registry API - CLI self-update
- Package Manager APIs - Detect npm/pnpm/yarn/bun

### Platform Requirements
- Node.js >= 18.0.0
- GitHub CLI (`gh`) - **REQUIRED** for package downloads
- Git (optional, for `epost-kit new`)
- Network access for downloads (optional with caching)

## Risk Assessment

### Technical Risks

**Risk: Metadata Corruption**
- **Likelihood:** Low
- **Impact:** High (data loss potential)
- **Mitigation:** Atomic writes, backup system, metadata validation on read
- **Contingency:** Metadata rebuild from checksums

**Risk: Circular Dependencies**
- **Likelihood:** Medium (manual manifest authoring)
- **Impact:** Medium (install failure)
- **Mitigation:** Topological sort with cycle detection, clear error messages
- **Contingency:** Manual dependency resolution instructions

**Risk: Network Failures**
- **Likelihood:** Medium
- **Impact:** Medium (install blocked)
- **Mitigation:** Retry logic, clear error messages, fallback instructions
- **Contingency:** Manual download instructions

### Operational Risks

**Risk: Breaking Changes in Kit Repo**
- **Likelihood:** Low (versioned releases)
- **Impact:** High (CLI breaks)
- **Mitigation:** Manifest schema versioning, backward compatibility checks
- **Contingency:** Pin to last known good version

**Risk: Platform API Changes**
- **Likelihood:** Low (Claude/Cursor stable)
- **Impact:** Medium (feature breaks)
- **Mitigation:** Platform-specific adapters, version detection
- **Contingency:** Community contributions for updates

## See Also

- [System Architecture](./system-architecture.md) - Technical design details
- [Code Standards](./code-standards.md) - Development conventions
- [Code Standards - Patterns](./code-standards-patterns.md) - Common patterns, anti-patterns, IDE/Git config
- [Codebase Summary](./codebase-summary.md) - High-level code organization
- [Codebase Integrations](./codebase-integrations.md) - External integrations, config, build/deploy
- [Project Roadmap](./project-roadmap.md) - Future plans and open questions
- [Project Roadmap - Appendix](./project-roadmap-appendix.md) - Technical debt, known issues, metrics
