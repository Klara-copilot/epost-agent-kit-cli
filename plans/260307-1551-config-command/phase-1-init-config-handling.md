---
phase: 1
title: "Explicit config handling in init"
effort: 2h
depends: []
---

# Phase 1: Explicit Config Handling in Init

## Context Links

- [Plan](./plan.md)
- `src/commands/init.ts:395-503` -- package install loop
- `src/domains/config/settings-merger.ts` -- merge pattern to follow

## Overview

- Priority: P1
- Status: Complete
- Effort: 2h
- Description: Make init handle `.epost-kit.json` and `.epost-ignore` as first-class config files with explicit merge logic, rather than generic file copy.

## Requirements

### Functional

- Skip `.epost-kit.json` and `.epost-ignore` in generic file copy loop (like `settings.json` is skipped at init.ts:413)
- Add dedicated merge/write step for `.epost-kit.json` after package loop (deep-merge from all contributing packages)
- Add dedicated merge/write step for `.epost-ignore` (concatenate unique patterns from all contributing packages)
- Track both files in `settingsPackages`-style collection for ordering

### Non-Functional

- Follow existing pattern: collect during package loop, process after loop
- Keep `.epost-kit.json` merge logic in `src/domains/config/` domain

## Related Code Files

### Files to Modify

- `src/commands/init.ts` -- skip config files in generic copy, add explicit merge steps after package loop
- `src/domains/config/settings-merger.ts` -- add `mergeKitConfig()` and `mergeIgnorePatterns()` exports (or create new file)

### Files to Create

- `src/domains/config/kit-config-merger.ts` -- merge logic for `.epost-kit.json` (deep-merge, same pattern as settings-merger)
- `src/domains/config/ignore-merger.ts` -- merge logic for `.epost-ignore` (line-based dedup, preserve comments from base)

### Files to Delete

- None

## Implementation Steps

1. **Create `kit-config-merger.ts`**
   - Reuse `deepMerge` from settings-merger
   - `loadKitConfig(packageDir, packageName)` -- reads `.epost-kit.json` from package
   - `mergeAndWriteKitConfig(packages[], outputPath)` -- deep-merge all, write result

2. **Create `ignore-merger.ts`**
   - `loadIgnorePatterns(packageDir, packageName)` -- reads `.epost-ignore`, returns lines
   - `mergeAndWriteIgnore(packages[], outputPath)` -- concat unique non-empty lines, preserve section comments from first (base) package, dedup patterns

3. **Update init.ts package loop**
   - Add `.epost-kit.json` and `.epost-ignore` to the skip list at line ~413
   - Collect config packages in arrays (like `settingsPackages`)
   - After package loop, call `mergeAndWriteKitConfig()` and `mergeAndWriteIgnore()`
   - Track output files in `allFiles` for metadata checksums

4. **Update init.ts "Generating configuration" step**
   - Add spinners: "Merging kit config..." and "Merging ignore patterns..."
   - Place alongside existing settings merge (lines 606-614)

## Todo List

- [x] Create `src/domains/config/kit-config-merger.ts`
- [x] Create `src/domains/config/ignore-merger.ts`
- [x] Update `src/domains/config/index.ts` exports
- [x] Update `src/commands/init.ts` -- skip in generic copy
- [x] Update `src/commands/init.ts` -- collect config packages
- [x] Update `src/commands/init.ts` -- explicit merge+write step
- [x] Verify hooks still read `.epost-kit.json` and `.epost-ignore` correctly (no path change)

## Success Criteria

- `epost-kit init --source` produces identical `.epost-kit.json` and `.epost-ignore` as before (only core contributes)
- Files tracked in `.epost-metadata.json` with checksums
- If a second package ever provides `.epost-kit.json`, values deep-merge correctly

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Deep-merge changes key ordering | Low | JSON.stringify with sorted keys |
| Ignore dedup drops intentional duplicates | Low | Dedup only exact line matches |
| Hook scripts break if path/format changes | High | No path/format change -- same output location |

## Security Considerations

- `.epost-kit.json` contains no secrets (config values only)
- `.epost-ignore` is read-only patterns file
