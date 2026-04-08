# Codebase Summary

## Overview

The epost-agent-kit-cli is a CLI tool for managing AI agent kit installations across multiple platforms. It follows a clean 4-layer architecture.

## Statistics

| Metric | Value |
|--------|-------|
| Total LOC | ~8,200+ |
| Commands | 7,576+ LOC (32 commands) |
| Domains | ~8,000 LOC (15 domains) |
| Services | 3 modules (file-operations, template-engine, transformers) |
| Shared | 6 utilities (logger, file-system, path-resolver, terminal-utils, process-lock, environment) |
| Tests | ~3,731 LOC (32 test files, 100% passing) |

## Directory Structure

```
src/
├── cli.ts              # Main CLI entry point
├── commands/           # Command implementations
├── domains/            # Business logic domains
├── services/           # Cross-cutting services
├── shared/            # Infrastructure utilities
└── types/             # TypeScript definitions
```

## Commands (32 total)

### Installation & Setup (3)
- `new.ts` - Create new project from template
- `init.ts` - Initialize kit (alias: `install`)
- `onboard.ts` - Guided setup wizard

### Health & Validation (5)
- `doctor.ts` - Health checks with auto-fix
- `validate.ts` - Structured validation (config, skills, routing, delegation, hooks)
- `lint.ts` - Validate references and standards
- `verify.ts` - Full audit
- `repair.ts` - Auto-fix failures

### Status & Display (6)
- `status.ts` - Show install scope/enabled items
- `show.ts` - Display routing/config
- `list.ts` - List installed items
- `versions.ts` - Available versions
- `roles.ts` - List roles
- `profile.ts` - Browse profiles

### Package Management (6)
- `add.ts` - Add skills/bundles
- `remove.ts` - Remove skills/bundles
- `package.ts` - Manage packages
- `update.ts` - Re-install from metadata
- `upgrade.ts` - Check and apply updates
- `uninstall.ts` - Remove with ownership

### Development (4)
- `dev.ts` - Watch and live-sync
- `dev-spawn.ts` - Spawn processes
- `browse.ts` - TUI marketplace
- `proposals.ts` - List/apply proposals

### Configuration & Tools (8)
- `config.ts` - View/edit config
- `dry-run-command.ts` - Simulate routing
- `trace.ts` - Verbose trace
- `fix-refs.ts` - Fix references
- `enable-disable.ts` - Toggle skills/hooks
- `workspace.ts` - Generate workspace CLAUDE.md
- `convert.ts` - Convert Claude→Copilot
- `init-wizard.ts` - Interactive setup

## Domains (15 total)

### config/
Configuration loading, merging, environment variables, Zod validation, cosmiconfig integration.

### conversion/
Claude Code → GitHub Copilot format transformation (claude-parser, copilot-formatter, tool-mappers).

### error/
Error handling with POSIX exit codes (ConfigError 78, NetworkError 69, FileOwnershipError 73).

### github/
GitHub API client with auth fallback (GITHUB_TOKEN > gh CLI > unauthenticated), release downloader, cache/validator.

### health-checks/
Environment verification (Node version, Claude dir, metadata, GitHub auth, file permissions, dependencies, research engine).

### help/
CLAUDE.md generator, branding utilities.

### installation/
Multi-IDE adapters (Claude, Cursor, Copilot, Export), template manager, smart merge, MDC/CLAUDE.md generators. Copilot adapter supports April 2026 VS Code agent spec with `.agent.md` output. Includes: claude-adapter.ts, cursor-adapter.ts, copilot-adapter.ts, export-adapter.ts, target-adapter.ts, mdc-generator.ts.

### packages/
Package resolver with BFS + topological sort (Kahn's), profile loader, YAML parser, skill locator, role bundles.

### proposals/
List and apply feature proposals.

### resolver/
Dependency resolution with circular dependency detection, max 3 hops, profile-aliases, skill-locator.

### routing/
Intent map parser from CLAUDE.md, word-overlap scoring for dry-run/trace commands.

### ui/
Terminal UI (tables, cards, spinners), TUI marketplace (cards, search, tabs).

### validation/
Reference validator for kit integrity.

### versioning/
Self-update and version comparison.

## Services (3 modules)

**file-operations/** — SHA256 checksum tracking, backup/restore, file ownership classification
**template-engine/** — Regex-based variable substitution, YAML template processing
**transformers/** — Format converters (YAML→JSON, env→config)

## Shared (6 utilities)

**logger.ts** — Verbose logging, JSON output mode, multi-level severity
**file-system.ts** — Atomic writes, temp file cleanup, safe directory operations
**path-resolver.ts** — CWD detection, install directory resolution, cross-platform paths
**terminal-utils.ts** — Colors, spinners, interactive prompts, table formatting
**process-lock.ts** — Mutual exclusion, prevent concurrent CLI runs
**environment.ts** — Environment variable parsing, defaults, validation

## Types

TypeScript type definitions for commands, domains, and configuration.

## Key Files

| File | LOC | Description |
|------|-----|-------------|
| cli.ts | 376 | Main CLI entry point |
| commands/init.ts | ~200 | Initialize command |
| domains/packages/resolver.ts | ~300 | Dependency resolution |
| domains/installation/installer.ts | ~300 | Package installation |

## Dependencies

### Runtime
- `cac` - Command parsing
- `@inquirer/prompts` - Interactive prompts
- `ora` - Spinners
- `picocolors` - Terminal colors

### Development
- `typescript` - Type checking
- `vitest` - Testing
- `eslint` - Linting

## Testing

- **Framework:** Vitest 2.1.8
- **Test Files:** 32 files (~3,731 LOC)
- **Coverage Target:** 70%
- **Execution:** ~1-2 seconds

Test categories:
- Unit Tests - Pure functions, algorithms
- Integration Tests - Commands + domains interaction
- Smoke Tests - CLI entry point
- File System Tests - Real I/O with temp directories
