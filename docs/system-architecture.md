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
- **File:** `domains/packages/resolver.ts`

### Smart Merge
- **Algorithm:** Three-tier file ownership classification
- **Tiers:** epost-owned, modified, user-created
- **Purpose:** Prevent data loss during updates
- **File:** `domains/installation/merger.ts`

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

### User Configuration
Supported files (in order of precedence):
1. `.epostrc` (INI format)
2. `.epostrc.json` (JSON)
3. `.epostrc.yaml` (YAML)

### Configuration Options
```json
{
  "target": "claude",
  "installDir": ".claude",
  "repository": "https://github.com/Klara-copilot/epost_agent_kit",
  "protectedPatterns": [".git/**", "*.env", "*.key"]
}
```

## Domains (15 total)

### config/
Multi-level config loading (env > local > global), Zod validation, cosmiconfig integration.

### installation/
Multi-IDE adapters (Claude, Cursor, Copilot, Export), template manager, smart merge, file generators. Supports claude-adapter, cursor-adapter, copilot-adapter, export-adapter, target-adapter, mdc-generator.

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
