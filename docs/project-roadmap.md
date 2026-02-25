# Project Roadmap

**Project:** ePost Agent Kit CLI
**Created by:** Phuong Doan
**Last Updated:** 2026-02-25

## Current Status: v0.1.0

**Status:** Production-ready for internal use
**Release Date:** 2026-02-11
**Codebase:** ~7,130 LOC
**Tests:** 103 (100% passing)
**Coverage:** 70% target

## Completed Features (v0.1.0)

### ✅ Core Package Management
**Status:** Complete | **Priority:** P0

- [x] Package manifest loading from `packages/*/package.yaml`
- [x] Dependency resolution with topological sort (Kahn's algorithm)
- [x] Circular dependency detection with clear error messages
- [x] Auto-include missing dependencies
- [x] Layer-based ordering (Foundation → Platforms → Domain)
- [x] Package add/remove commands
- [x] Metadata tracking for installed packages

**Key Files:**
- `domains/packages/package-resolver.ts` (512 LOC)
- `commands/package.ts` (235 LOC)

### ✅ Profile System
**Status:** Complete | **Priority:** P0

- [x] Team-based profile definitions
- [x] Auto-detection via file/directory/dependency patterns
- [x] Confidence scoring (high/medium/low)
- [x] Profile browsing and inspection
- [x] Profile-to-package resolution
- [x] Multi-team support (single profile matches multiple teams)

**Key Files:**
- `domains/packages/profile-loader.ts` (328 LOC)
- `commands/profile.ts` (138 LOC)

### ✅ Smart Merge System
**Status:** Complete | **Priority:** P0

- [x] Three-tier file ownership classification
- [x] Checksum-based change detection (SHA256)
- [x] CRLF normalization for cross-platform consistency
- [x] Conflict detection and resolution
- [x] Protected file patterns (`.git/`, `.env*`, `*.key`)
- [x] Metadata persistence (`.epost-metadata.json`)

**Key Files:**
- `domains/installation/smart-merge.ts` (191 LOC)
- `services/file-operations/ownership.ts` (145 LOC)
- `services/file-operations/checksum.ts` (56 LOC)

### ✅ Installation Commands
**Status:** Complete | **Priority:** P0

- [x] `init` - Initialize kit (package-based and legacy kit-based modes)
- [x] `new` - Create project from template
- [x] `onboard` - Guided setup wizard with smart defaults
- [x] Template download from GitHub releases
- [x] Metadata generation for file tracking

**Key Files:**
- `commands/init.ts` (771 LOC)
- `commands/new.ts` (162 LOC)
- `commands/onboard.ts` (220 LOC)

### ✅ CLAUDE.md Generation
**Status:** Complete | **Priority:** P1

- [x] Custom template engine (regex-based, no external deps)
- [x] Snippet collection from packages
- [x] Layer-ordered rendering
- [x] Template syntax: variables, conditionals, loops, helpers
- [x] Context injection (profile, packages, versions, counts)

**Key Files:**
- `domains/installation/claude-md-generator.ts` (337 LOC)
- `domains/help/claude-md-generator.ts` (moved from installation)

### ✅ Health Checks
**Status:** Complete | **Priority:** P1

- [x] Environment verification
- [x] Auto-fix capabilities
- [x] JSON report mode (for CI)
- [x] Exit codes: 0 (pass), 2 (warnings), 1 (failures)
- [x] Interactive UI with progress spinner

**Key Files:**
- `commands/doctor.ts` (110 LOC)
- `domains/health-checks/` (181 LOC)

### ✅ Dev Watcher
**Status:** Complete | **Priority:** P2

- [x] File watching with `fs.watch` API
- [x] Debounced syncing (300ms)
- [x] Smart invalidation (settings vs. CLAUDE.md)
- [x] Graceful shutdown (SIGINT handler)
- [x] File mapping support (single-file and directory)

**Key Files:**
- `commands/dev.ts` (228 LOC)

### ✅ Maintenance Commands
**Status:** Complete | **Priority:** P1

- [x] `uninstall` - Remove kit with ownership awareness
- [x] `update` - Self-update CLI from npm registry
- [x] `versions` - List available kit versions from GitHub
- [x] `workspace` - Generate workspace-level CLAUDE.md

**Key Files:**
- `commands/uninstall.ts` (214 LOC)
- `commands/update.ts` (92 LOC)
- `commands/versions.ts` (119 LOC)
- `commands/workspace.ts` (69 LOC)

### ✅ Infrastructure
**Status:** Complete | **Priority:** P0

- [x] Clean 4-layer architecture
- [x] TypeScript strict mode
- [x] Comprehensive test suite (103 tests)
- [x] Safe file operations (atomic writes, backups)
- [x] Kit path resolution with caching
- [x] Logger with colored output and NO_COLOR support
- [x] Error hierarchy with sysexits.h codes

**Key Files:**
- `shared/` (477 LOC)
- `services/` (295 LOC)
- `types/` (211 LOC)

### ✅ Installation Scripts
**Status:** Complete | **Priority:** P0 | **Completed:** 2026-02-12

- [x] Platform-specific installation scripts (Bash, PowerShell, CMD)
- [x] Installation documentation with troubleshooting guide
- [x] CI/CD workflow for installation testing
- [x] Updated README.md with installation section

**Key Files:**
- `install/install.sh` (284 LOC) - Unix/macOS installation
- `install/install.ps1` (279 LOC) - Windows PowerShell installation
- `install/install.cmd` (206 LOC) - Windows CMD installation
- `install/README.md` (425 LOC) - Installation guide
- `.github/workflows/test-install.yml` (270 LOC) - CI testing

## In Progress

### Documentation
**Status:** In Progress | **Priority:** P1 | **Target:** v0.1.1

- [x] Project overview and PDR
- [x] Codebase summary
- [x] System architecture
- [x] Code standards
- [x] Enhanced README
- [x] Installation guide with troubleshooting
- [ ] API reference
- [ ] Package authoring guide
- [ ] Profile creation guide
- [ ] Migration guide from ClaudeKit

**Action Items:**
- Create API reference documenting all public functions
- Write package authoring guide for kit designers
- Document profile creation and auto-detection rules
- Create migration guide from legacy ClaudeKit

## See Also

- [Project Roadmap - Appendix](./project-roadmap-appendix.md) - Technical debt, known issues, performance, success metrics
- [Project Overview & PDR](./project-overview-pdr.md) - Vision and requirements
- [System Architecture](./system-architecture.md) - Technical design
- [Code Standards](./code-standards.md) - Development conventions
- [Codebase Summary](./codebase-summary.md) - High-level organization
