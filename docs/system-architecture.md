# System Architecture

**Project:** ePost Agent Kit CLI
**Created by:** Phuong Doan
**Last Updated:** 2026-02-25

## Overview

ePost Agent Kit CLI uses a clean 4-layer architecture with strict separation of concerns. This document provides an index to the detailed architecture documentation.

## Architecture Layers

```
┌──────────────────────────────────────────────────────┐
│                    CLI Layer                          │
│  Entry point, command registration, arg parsing      │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────┐
│                 Commands Layer                        │
│  Thin orchestrators, user interaction                │
│  11 commands: init, new, doctor, profile, package... │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────┐
│                 Domains Layer                         │
│  Business logic, algorithms, core workflows          │
│  10 domains: packages, github, installation, ui...   │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────┐
│            Services & Shared Layer                    │
│  Cross-cutting utilities, infrastructure             │
└──────────────────────────────────────────────────────┘
```

**Key Stats:**
- Total: ~7,130 LOC
- Commands: 2,358 LOC (11 files)
- Domains: 3,619 LOC (10 domains)
- Services/Shared: 772 LOC
- Tests: 1,341 LOC (103 tests, 100% passing)

## Core Algorithms

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

### YAML Parser
**Owner:** `domains/packages/package-resolver.ts`

Custom line-by-line parser (no external dependencies):
- Supports: key-value, nested objects, arrays, inline arrays, comments
- Type inference: strings, booleans, integers, floats
- Indentation-based structure
- Limitation: No flow style `{...}`, anchors `&`, or aliases `*`

### Topological Sort
Kahn's algorithm for dependency resolution - ensures packages install in correct order with cycle detection.

## Quick Reference

### Layer Responsibilities

**CLI Layer:** Command registration, global options, version display
**Commands Layer:** User interaction, input validation, domain coordination
**Domains Layer:** Business logic, pure algorithms, workflows
**Services/Shared Layer:** File operations, logging, path resolution
**Types Layer:** Type definitions, error classes, schemas

### External Integrations

- **GitHub API:** Package distribution, release downloads, version listings (REQUIRED)
- **GitHub CLI (`gh`):** Authentication and token management for API access (REQUIRED per FR-5)
- **npm Registry:** CLI self-update checks
- **Package Managers:** Detection and execution (npm/pnpm/yarn/bun)

### Configuration Files

- `.epostrc` - User configuration
- `.epost-metadata.json` - File ownership tracking
- `packages/*/package.yaml` - Package manifests
- `profiles/profiles.yaml` - Profile definitions

## Architecture Principles

### 1. Separation of Concerns
- Each layer has clear responsibilities
- No circular dependencies
- Clean import paths via aliases

### 2. Domain-Driven Design
- Business logic isolated in domains
- Commands orchestrate, don't implement
- Services provide cross-cutting utilities

### 3. Type Safety
- TypeScript strict mode enabled
- Explicit return types for exported functions
- No `any` types in production code

### 4. File Safety
- Atomic writes (temp + rename)
- Checksum tracking (SHA256)
- Backup before destructive operations
- Protected file patterns

### 5. Error Handling
- Custom error hierarchy (sysexits.h codes)
- Graceful degradation in shared utilities
- Fail-fast in core operations
- Clear error messages with context

### 6. Performance
- Caching (kit path resolution)
- Debouncing (file watcher)
- Lazy loading (manifests)
- Parallel execution (health checks)

## See Also

- [Code Standards](./code-standards.md) - Development conventions
- [Code Standards - Patterns](./code-standards-patterns.md) - Common patterns, anti-patterns, IDE/Git config
- [Codebase Summary](./codebase-summary.md) - High-level organization
- [Codebase Integrations](./codebase-integrations.md) - External integrations, config, build/deploy
- [Project Overview & PDR](./project-overview-pdr.md) - Product requirements
- [Project Roadmap](./project-roadmap.md) - Current status and planned features
- [Project Roadmap - Appendix](./project-roadmap-appendix.md) - Technical debt, known issues, metrics
