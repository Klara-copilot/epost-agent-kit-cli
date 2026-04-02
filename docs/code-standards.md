# Code Standards

## Overview

This document outlines development conventions for the epost-agent-kit-cli project.

## File Naming

- **Use kebab-case** for file names with descriptive names
- Long file names are acceptable - they should be self-documenting for LLM tools
- Examples: `dependency-resolver.ts`, `file-ownership-tracker.ts`

## Code Organization

### Directory Structure

```
src/
├── cli.ts              # Main CLI entry point (376 LOC)
├── commands/           # 32 command files
│   ├── add.ts
│   ├── browse.ts
│   ├── config.ts
│   ├── convert.ts
│   ├── dev-spawn.ts
│   ├── dev.ts
│   ├── doctor.ts
│   ├── dry-run-command.ts
│   ├── enable-disable.ts
│   ├── fix-refs.ts
│   ├── init-wizard.ts
│   ├── init.ts
│   ├── lint.ts
│   ├── list.ts
│   ├── new.ts
│   ├── onboard.ts
│   ├── package.ts
│   ├── proposals.ts
│   ├── profile.ts
│   ├── repair.ts
│   ├── remove.ts
│   ├── show.ts
│   ├── status.ts
│   ├── trace.ts
│   ├── uninstall.ts
│   ├── update.ts
│   ├── upgrade.ts
│   ├── validate.ts
│   ├── verify.ts
│   ├── versions.ts
│   ├── roles.ts
│   └── workspace.ts
├── domains/            # 15 domain areas
│   ├── config/         # Configuration loading and validation
│   ├── conversion/     # Claude to Copilot format conversion
│   ├── error/          # Error handling and types
│   ├── github/         # GitHub API integration
│   ├── health-checks/  # Environment verification
│   ├── help/           # Help and CLAUDE.md generation
│   ├── installation/   # Installation and multi-IDE adapters
│   ├── packages/       # Package management and resolution
│   ├── proposals/      # Feature proposals
│   ├── resolver/       # Dependency resolution
│   ├── routing/        # Intent mapping and routing
│   ├── ui/             # Terminal UI components
│   ├── validation/     # Reference validation
│   └── versioning/     # Version management
├── services/          # Cross-cutting services
├── shared/            # Infrastructure utilities
└── types/             # TypeScript definitions
```

## Modularization Rules

- **Keep files under 200 lines** for optimal context management
- Split large files into smaller, focused components
- Use composition over inheritance
- Extract utility functions into separate modules
- Create dedicated service classes for business logic

## TypeScript Conventions

### Type Definitions
- Place shared types in `src/types/`
- Use interfaces for object shapes
- Use type aliases for unions/intersections

### Strict Mode
- TypeScript strict mode enabled
- No implicit any
- Strict null checks

## Error Handling

- Use try-catch for operations that may fail
- Create domain-specific error classes in `domains/error/`
- Provide actionable error messages

## Testing

- Use Vitest framework
- Target 70% code coverage
- Test categories: unit, integration, smoke, file-system

## Code Quality

- Run `npm run lint` before commit
- Run `npm test` before push
- Run `npm run typecheck` for type validation

## Git Conventions

### Commit Messages
Follow conventional commits:
```
<type>(<scope>): <subject>

feat(packages): add semver constraint validation
fix(ownership): correct checksum comparison for Windows
refactor(init): extract utilities to domain helpers
docs(api): update command reference
test(ownership): add edge case tests
```

### File Safety
- Atomic writes: temp file + rename
- Checksum tracking: SHA256 with CRLF normalization
- Backup system: timestamped snapshots
- Protected patterns: `.git/**`, `.env*`, `*.key`
