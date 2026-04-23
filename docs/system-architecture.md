# System Architecture

## Overview

The epost-agent-kit-cli follows a clean 4-layer architecture with strict separation of concerns.

## Architecture Layers

```
┌─────────────────────────────────────┐
│         CLI Layer (cli.ts)          │  Command registration, framework config
├─────────────────────────────────────┤
│       Commands Layer (commands/)     │  Thin orchestrators, user interaction
├─────────────────────────────────────┤
│        Domains Layer (domains/)      │  Business logic and algorithms
├─────────────────────────────────────┤
│   Services/Shared Layer (services/)  │  Cross-cutting utilities
└─────────────────────────────────────┘
```

## Layer Responsibilities

### CLI Layer
- Command registration using `cac` framework
- Global options handling
- Version display
- Help generation

### Commands Layer
- Thin orchestrators (< 50 LOC each ideally)
- User interaction (prompts, confirmations)
- Delegate to domains for business logic
- Do not contain complex logic

### Domains Layer
- Business logic implementation
- Algorithms (dependency resolution, file merging)
- External API integration (GitHub, npm)
- State management

### Services/Shared Layer
- Cross-cutting concerns
- File system operations
- Logging
- Configuration loading

## Core Algorithms

### Package Resolution
- **Algorithm:** Topological sort (Kahn's algorithm)
- **Purpose:** Dependency ordering for installation
- **File:** `domains/packages/package-resolver.ts`

### Smart Merge
- **Algorithm:** Three-tier file ownership classification via SHA256 checksums
- **Tiers:** kit-owned (checksum match), user-modified (checksum diverged), new files
- **Purpose:** Prevent data loss during updates; preserve user-modified files
- **File:** `domains/installation/smart-merge.ts`

### Template Engine
- **Type:** Custom regex-based renderer
- **Purpose:** Variable substitution in templates
- **No external dependencies**

### YAML Parser
- **Type:** Custom line-by-line parser
- **Purpose:** Parse package manifests
- **No external dependencies**

## Data Flow

```
User Input → CLI Layer → Commands Layer → Domains Layer → Services/Shared
                ↑                                    ↓
            Results ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
```

## File Safety System

### Atomic Writes
- Write to temp file first
- Rename to target on success
- Prevents partial writes

### Checksum Tracking
- SHA256 hashing
- CRLF normalization for cross-platform
- File integrity verification

### Backup System
- Timestamped snapshots before destructive operations
- Easy rollback on failure

### Protected Patterns
- Never touches: `.git/**`, `.env*`, `*.key`
- Configurable patterns in `.epostrc`

## Configuration

### Dual-Layer Config System

Config values come from two layers, merged at runtime with per-field source tracking.

| Layer | Path | Scope |
|-------|------|-------|
| Global | `~/.epost-kit/config.json` | User-wide defaults across all projects |
| Project | `.claude/.epost-kit.json` | Per-project overrides |

### 3-Level Merge (ConfigMerger)

Merge order: **code defaults -> global -> project** (project wins).

```
src/domains/config/config-merger.ts
```

- Leaf-level source tracking: every value labeled `default | global | project`
- `config show --sources` displays where each value originates
- Used by both CLI commands and web dashboard

### Static Facade Classes

No DI framework. Plain static methods, following claudekit-cli pattern.

| Class | File | Manages |
|-------|------|---------|
| `GlobalConfigManager` | `global-config-manager.ts` | `~/.epost-kit/config.json` (read, write, get/set by dot-path) |
| `ProjectConfigManager` | `project-config-manager.ts` | `.claude/.epost-kit.json` (read, write, get/set by dot-path) |

### Config Security

| Measure | Implementation |
|---------|---------------|
| File permissions | `0o600` for config files, `0o700` for `~/.epost-kit/` directory |
| Prototype pollution guard | `DANGEROUS_KEYS` (`__proto__`, `constructor`, `prototype`) stripped on all merges |
| Value sanitization | Functions and symbols recursively removed before write |

File: `src/domains/config/config-security.ts`

### Web Dashboard

`config ui` launches an Express + React SPA for visual config editing.

| Component | File | Purpose |
|-----------|------|---------|
| REST API server | `src/domains/web-dashboard/server.ts` | Express, auto-port 3456-3460, localhost-only |
| API routes | `src/domains/web-dashboard/api/config-routes.ts` | GET/PUT `/api/config`, GET `/api/status` |
| React SPA | `src/domains/web-dashboard/ui/` | Vite + React, pre-built to `ui-dist/` |

- **Lazy-loaded**: Express/React only imported on `config ui`, zero impact on CLI startup
- **Backward-compatible**: existing `.epost-kit.json` reads as project-level, no migration needed

### Legacy Config (cosmiconfig)

Supported files (in order of precedence):
1. `.epostrc` (INI format)
2. `.epostrc.json` (JSON)
3. `.epostrc.yaml` (YAML)

## Domains (14 total)

### config/
Dual-layer config system: GlobalConfigManager (`~/.epost-kit/config.json`) + ProjectConfigManager (`.claude/.epost-kit.json`), 3-level merge with leaf-level source tracking (ConfigMerger), security hardening (file perms, prototype pollution guard), config-path-utils (dot-path get/set), cosmiconfig integration.

### web-dashboard/
Express REST API server + React SPA for visual config editing (`config ui`). Lazy-loaded on demand, zero CLI startup impact. Files: server.ts, api/config-routes.ts, api/env-helpers.ts, api/ignore-helpers.ts, ui/ (Vite + React SPA).

### installation/
Multi-IDE adapters (6 targets: Claude, Cursor, Copilot, JetBrains, Antigravity, Export), template manager, smart merge (SHA256 checksums), file generators. Copilot adapter generates `.agent.md` files per April 2026 VS Code spec. Adapters: claude-adapter, cursor-adapter, copilot-adapter, jetbrains-adapter, antigravity-adapter, export-adapter, smart-merge, target-adapter.

### packages/
Package resolver with BFS + topological sort, profile loader, YAML parser, skill locator.

### proposals/
List and apply feature proposals.

### resolver/
Dependency resolution with circular dependency detection (max 3 hops), bundles, aliases.

### github/
GitHub API client with auth fallback, release downloader/cache/validator, registry client.

### health-checks/
Node version, Claude dir, metadata, GitHub auth, file permissions, dependencies, research engine.

### validation/
Reference validator for installed kit integrity.

### conversion/
Claude Code config → GitHub Copilot format (parser, formatter, tool-mappers).

### routing/
Intent map parser from CLAUDE.md, word-overlap scoring, used by dry-run/trace commands.

### ui/
Terminal UI (tables, cards, spinners), TUI marketplace (cards, search, tabs).

### help/
CLAUDE.md generator, branding utilities.

### versioning/
Self-update, version comparison.

### error/
Error types with POSIX exit codes (ConfigError 78, NetworkError 69, FileOwnershipError 73).

## External Integrations

### GitHub API
- Releases API - Kit template and CLI downloads
- Authentication via `gh` CLI or GITHUB_TOKEN env var
- Rate-limited with fallback to unauthenticated requests

### npm Registry
- Self-update functionality
- Version checking and comparison

## Performance Targets

| Operation | Target |
|-----------|--------|
| CLI startup | < 200ms |
| Full install (5-10 packages) | < 30s |
| Profile detection | < 5s |
| Health checks | < 10s |
| Watcher sync | < 500ms |

## Key Components

### Package Manager
- Resolves dependencies
- Handles versioning
- Manages installation order

### Profile System
- Team-based configurations
- Auto-detection
- Profile inheritance

### Health Checker
- Environment verification
- Auto-fix capabilities
- JSON report output for CI
