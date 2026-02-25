# Scout Report: epost-agent-kit-cli Codebase Scan

**Date:** 2026-02-25 | **Mode:** Quick

## Codebase Structure

```
src/
├── cli.ts           # Entry point (170 LOC)
├── commands/        # CLI commands (11 files, 2,358 LOC)
├── domains/         # Business logic (27 files, 3,619 LOC, 10 domains)
├── services/        # Cross-cutting (6 files, 295 LOC)
├── shared/          # Utilities (12 files, 477 LOC)
└── types/           # Type definitions (4 files, 211 LOC)
```

## LOC Summary

| Layer | Files | LOC | % of Total |
|-------|-------|-----|------------|
| Domains | 27 | 3,619 | 50.8% |
| Commands | 11 | 2,358 | 33.1% |
| Shared | 12 | 477 | 6.7% |
| Services | 6 | 295 | 4.1% |
| Types | 4 | 211 | 3.0% |
| CLI (root) | 1 | 170 | 2.4% |
| **Total** | **61** | **7,130** | **100%** |

## Commands Layer (2,358 LOC)

| File | LOC | Description |
|------|-----|-------------|
| init.ts | 771 | Package initialization |
| package.ts | 235 | Package management |
| dev.ts | 228 | Development watcher |
| onboard.ts | 220 | Guided setup wizard |
| uninstall.ts | 214 | Remove installations |
| new.ts | 162 | New project creation |
| profile.ts | 138 | Profile management |
| versions.ts | 119 | Version listing |
| doctor.ts | 110 | Health checks |
| update.ts | 92 | Self-update |
| workspace.ts | 69 | Workspace config |

## Domains Layer (3,619 LOC)

### Packages Domain (843 LOC)
- `package-resolver.ts` (512) - Dependency resolution, topological sort
- `profile-loader.ts` (328) - Profile loading/processing

### Installation Domain (704 LOC)
- `claude-md-generator.ts` (337) - CLAUDE.md generation
- `smart-merge.ts` (191) - Three-tier merge logic
- `template-manager.ts` (114) - Template processing
- `package-manager.ts` (61) - Package operations

### GitHub Domain (726 LOC)
- `release-cache.ts` (172) - Release caching
- `release-downloader.ts` (157) - Download handling
- `access-checker.ts` (146) - Access validation
- `github-client.ts` (143) - GitHub API client
- `release-validator.ts` (108) - Release validation

### Help Domain (365 LOC)
- `claude-md-generator.ts` (337) - Help docs generation
- `branding.ts` (26) - Branding utilities

### Config Domain (268 LOC)
- `settings-merger.ts` (163) - Settings merging
- `config-loader.ts` (104) - Configuration loading

### Health-Checks Domain (181 LOC)
- `health-checks.ts` (180) - Health check logic

### UI Domain (405 LOC)
- `ui.ts` (402) - UI components

### Versioning Domain (120 LOC)
- `self-update.ts` (119) - Self-update logic

### Error Domain (2 LOC)
- `index.ts` (2) - Error barrel file

## Services Layer (295 LOC)

| File | LOC | Description |
|------|-----|-------------|
| ownership.ts | 144 | File ownership tracking |
| backup-manager.ts | 81 | Backup operations |
| checksum.ts | 56 | SHA256 checksums |

## Shared Layer (477 LOC)

| File | LOC | Description |
|------|-----|-------------|
| path-resolver.ts | 161 | Path resolution |
| file-system.ts | 131 | File system utils |
| logger.ts | 60 | Logging utilities |
| constants.ts | 50 | App constants |
| terminal-utils.ts | 31 | Terminal helpers |

## Types Layer (211 LOC)

| File | LOC | Description |
|------|-----|-------------|
| index.ts | 83 | Main type exports |
| commands.ts | 78 | Command types |
| errors.ts | 39 | Error types |
| packages.ts | 11 | Package types |

## Drift Detection (vs. Documentation)

| Metric | Doc Value | Actual | Drift |
|--------|-----------|--------|-------|
| Total LOC | ~7,872 | 7,130 | -9.4% |
| Commands LOC | 2,518 | 2,358 | -6.4% |
| Domains LOC | 3,030 | 3,619 | +19.4% |
| init.ts LOC | 930 | 771 | -17.1% |
| Domain count | 10 | 10 | ✓ Match |

## Key Dependencies

**Runtime:**
- cac - CLI framework
- @inquirer/prompts - Interactive prompts
- ora - Spinners
- picocolors - Terminal colors
- tar - Archive extraction
- zod - Validation
- execa - Process execution
- minimatch - Pattern matching
- cosmiconfig - Config loading
- cli-table3 - Table output

**Dev:**
- TypeScript 5.7.3
- Vitest 2.1.8
- ESLint 9.x

## Version Info

- Package version: 0.1.0
- Node requirement: >=18.0.0
- License: MIT

## Unresolved Questions

1. Why did domains layer grow 19.4% while total LOC decreased?
2. Are architecture sub-docs planned (referenced but don't exist)?
3. Should Open Questions be consolidated to single location?
