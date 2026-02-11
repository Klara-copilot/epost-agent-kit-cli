# System Architecture

**Project:** ePost Agent Kit CLI
**Created by:** Phuong Doan
**Last Updated:** 2026-02-11

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
- Total: ~8,100 LOC (after GitHub domain addition)
- Commands: 2,518 LOC (11 files)
- Domains: 3,200+ LOC (10 domains)
- Services/Shared: 772 LOC
- Tests: 1,341 LOC (103 tests, 100% passing)

## Documentation Index

### 1. [Layers & Components](./architecture/layers-and-components.md)
Detailed breakdown of each architectural layer:
- CLI Layer (command registration)
- Commands Layer (11 commands)
- Domains Layer (10 business domains including GitHub integration)
- Services/Shared Layer (utilities)
- Types Layer (definitions)

### 2. [Core Algorithms](./architecture/core-algorithms.md)
Deep dive into key algorithms:
- Package Resolution Pipeline
- Smart Merge System (file ownership classification)
- Template Engine (custom regex-based renderer)
- YAML Parser (custom implementation)
- Topological Sort (Kahn's algorithm)
- File Ownership Tracking

### 3. [Data Flow & Integration](./architecture/data-flow-integration.md)
System interactions and workflows:
- Installation Flow (init command)
- Dev Watcher Flow
- Package Add/Remove Flows
- Component Dependency Graph
- External Integrations (GitHub, npm)
- Configuration Management

## Quick Reference

### Layer Responsibilities

**CLI Layer:** Command registration, global options, version display
**Commands Layer:** User interaction, input validation, domain coordination
**Domains Layer:** Business logic, pure algorithms, workflows
**Services/Shared Layer:** File operations, logging, path resolution
**Types Layer:** Type definitions, error classes, schemas

### External Integrations

- **GitHub API:** Package distribution, release downloads, version listings
- **GitHub CLI (`gh`):** Authentication and token management for API access
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
- [Codebase Summary](./codebase-summary.md) - High-level organization
- [Project Overview & PDR](./project-overview-pdr.md) - Product requirements
- [Project Roadmap](./project-roadmap.md) - Future plans
