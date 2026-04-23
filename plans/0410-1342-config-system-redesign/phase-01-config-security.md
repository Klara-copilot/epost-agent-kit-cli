---
phase: 1
title: "Config Security Module"
effort: 2h
depends: []
---

# Phase 1: Config Security Module

## Context Links

- Design ref: `plans/reports/epost-brainstormer-0410-1342-config-system-redesign.md`
- Existing merger: `src/domains/config/settings-merger.ts` (has `deepMerge` but no pollution guard)
- Constants: `src/shared/constants.ts`

## Overview

- **Priority**: High — foundation for all other phases
- **Status**: pending
- **Description**: Create security module for file permissions enforcement and prototype pollution prevention. Used by all config managers.

## Key Insights

- Current `deepMerge` in `settings-merger.ts` has NO prototype pollution guard
- Config files contain sensitive data (API keys, hooks settings) — need 0o600 perms
- Unix-only for file permissions (Windows ignores chmod, graceful no-op)
- DANGEROUS_KEYS: `__proto__`, `constructor`, `prototype`

## Requirements

### Functional
- Filter DANGEROUS_KEYS in any deep merge/set operation
- Enforce 0o700 on config directories, 0o600 on config files (Unix)
- Sanitize config values on read (strip functions, symbols)
- Provide `safeDeepMerge` that wraps existing `deepMerge` with pollution guard

### Non-Functional
- Zero impact on non-config code paths
- Windows: permission calls are graceful no-ops (no errors)
- < 100 lines for the module

## Architecture

```
config-security.ts
├── DANGEROUS_KEYS: string[]
├── isSafeKey(key: string): boolean
├── sanitizeConfigValue(value: unknown): unknown
├── safeDeepMerge(base, override): Record<string, any>
├── enforceFilePermissions(filePath: string): Promise<void>
└── enforceDirPermissions(dirPath: string): Promise<void>
```

`safeDeepMerge` calls `isSafeKey` on every key at every depth before merging. Rejects keys matching DANGEROUS_KEYS. Falls through to existing `deepMerge` for safe keys.

## Related Code Files

### Modify
- `src/shared/constants.ts` — add `DANGEROUS_KEYS` array

### Create
- `src/domains/config/config-security.ts` — security module

## Implementation Steps

1. Add `DANGEROUS_KEYS` constant to `src/shared/constants.ts`:
   ```ts
   export const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'] as const;
   ```

2. Create `src/domains/config/config-security.ts` with:
   - Import `DANGEROUS_KEYS` from constants
   - `isSafeKey(key)`: returns `true` if key not in DANGEROUS_KEYS
   - `sanitizeConfigValue(value)`: recursively strip functions/symbols from config values
   - `safeDeepMerge(base, override)`: iterate override keys, skip unsafe keys, delegate to `deepMerge` for safe subsets
   - `enforceFilePermissions(filePath)`: `chmod(0o600)` with try/catch, skip on Windows
   - `enforceDirPermissions(dirPath)`: `chmod(0o700)` with try/catch, skip on Windows

3. Add platform check helper: `const isUnix = process.platform !== 'win32'`

4. Export all functions as named exports

## Todo List

- [ ] Add `DANGEROUS_KEYS` to `src/shared/constants.ts`
- [ ] Create `src/domains/config/config-security.ts`
- [ ] Implement `isSafeKey`
- [ ] Implement `sanitizeConfigValue`
- [ ] Implement `safeDeepMerge` (wraps existing `deepMerge`)
- [ ] Implement `enforceFilePermissions`
- [ ] Implement `enforceDirPermissions`
- [ ] Verify build: `npm run build`

## Success Criteria

- `safeDeepMerge({ a: 1 }, { __proto__: { evil: true }, b: 2 })` produces `{ a: 1, b: 2 }` (no pollution)
- `enforceFilePermissions` on Unix sets file to 0o600
- `enforceDirPermissions` on Unix sets dir to 0o700
- On Windows, permission functions complete without error
- `npm run build` passes

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Breaking existing deepMerge callers | Low | safeDeepMerge is new, doesn't modify existing |
| Windows chmod failure | Low | try/catch + platform check |

## Security Considerations

- DANGEROUS_KEYS must cover all prototype pollution vectors
- File permissions prevent other users from reading API keys in config
- sanitizeConfigValue prevents function injection via config

## Next Steps

- Phase 2 uses `safeDeepMerge` in `ConfigMerger`
- Phase 2 uses `enforceFilePermissions` in both config managers
