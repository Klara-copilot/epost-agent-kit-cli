---
phase: 7
title: "Integration Testing & Cleanup"
effort: 4h
depends: [1, 2, 3, 4, 5, 6]
---

# Phase 7: Integration Testing & Cleanup

## Context Links

- All phases (1-6) must be complete
- Test framework: vitest (already configured)
- Existing tests: `tests/` directory

## Overview

- **Priority**: Medium — validates all phases work together
- **Status**: pending
- **Description**: Write tests for new modules, verify backward compatibility, ensure full build and lint pass.

## Key Insights

- Vitest already configured in `package.json` (`npm run test`)
- Existing tests should still pass after refactoring
- New modules need unit tests: config-security, config-merger, config managers
- REST API needs integration tests (Express route testing)
- No need to test React SPA components (dev-only, no runtime impact on CLI)

## Requirements

### Functional
- Unit tests for `config-security.ts` (pollution guard, permissions, sanitization)
- Unit tests for `global-config-manager.ts` (load, save, get, set)
- Unit tests for `project-config-manager.ts` (load, save, get, set)
- Unit tests for `config-merger.ts` (3-level merge, source tracking)
- Integration tests for REST API endpoints
- Backward compatibility test: existing `.epost-kit.json` reads as project-level

### Non-Functional
- Each test file < 150 lines
- Use temp directories for file I/O tests (no real config mutated)
- Clean up temp files after tests

## Architecture

```
tests/
├── domains/
│   └── config/
│       ├── config-security.test.ts
│       ├── global-config-manager.test.ts
│       ├── project-config-manager.test.ts
│       └── config-merger.test.ts
├── commands/
│   └── config/
│       ├── get-handler.test.ts
│       ├── set-handler.test.ts
│       └── show-handler.test.ts
└── web-dashboard/
    └── config-routes.test.ts
```

## Related Code Files

### Create
- `tests/domains/config/config-security.test.ts`
- `tests/domains/config/global-config-manager.test.ts`
- `tests/domains/config/project-config-manager.test.ts`
- `tests/domains/config/config-merger.test.ts`
- `tests/commands/config/get-handler.test.ts`
- `tests/commands/config/set-handler.test.ts`
- `tests/commands/config/show-handler.test.ts`
- `tests/web-dashboard/config-routes.test.ts`

## Implementation Steps

1. Create `tests/domains/config/config-security.test.ts`:
   - Test `isSafeKey` rejects `__proto__`, `constructor`, `prototype`
   - Test `isSafeKey` accepts normal keys
   - Test `safeDeepMerge` strips dangerous keys
   - Test `safeDeepMerge` preserves safe keys
   - Test `sanitizeConfigValue` strips functions/symbols
   - Test `enforceFilePermissions` on Unix (skip on Windows)
   - ~80 lines

2. Create `tests/domains/config/global-config-manager.test.ts`:
   - Setup: create temp dir in `os.tmpdir()`
   - Mock `homedir()` to return temp dir
   - Test `load()` returns `{}` when no config exists
   - Test `set()` creates file and directory
   - Test `get()` returns value after `set()`
   - Test `save()` and `load()` round-trip
   - Teardown: remove temp dir
   - ~80 lines

3. Create `tests/domains/config/project-config-manager.test.ts`:
   - Setup: create temp install dir with `.epost-kit.json`
   - Test `load()` reads existing file
   - Test `set()` updates existing file
   - Test `get()` with dot-notation key
   - Teardown: remove temp dir
   - ~70 lines

4. Create `tests/domains/config/config-merger.test.ts`:
   - Test merge with all three levels present
   - Test project overrides global
   - Test global overrides defaults
   - Test source tracking: each field gets correct source label
   - Test with missing global (only defaults + project)
   - Test with empty project (only defaults + global)
   - Test nested key tracking (e.g., `skills.research.engine`)
   - ~100 lines

5. Create `tests/commands/config/get-handler.test.ts`:
   - Test `--global` flag reads from global config
   - Test `--local` flag reads from project config
   - Test default reads from merged config
   - Test missing key returns error
   - ~60 lines

6. Create `tests/commands/config/set-handler.test.ts`:
   - Test `--global` writes to global config
   - Test `--local` (or default) writes to project config
   - Test value coercion (string to number, boolean)
   - ~60 lines

7. Create `tests/commands/config/show-handler.test.ts`:
   - Test `--sources` displays source map
   - Test `--global` shows global config only
   - Test `--local` shows project config only
   - Test default shows merged config
   - ~50 lines

8. Create `tests/web-dashboard/config-routes.test.ts`:
   - Use `supertest` or manual fetch to test Express routes
   - Or: extract route handlers and test them directly
   - Test `GET /api/config` returns merged + sources
   - Test `PUT /api/config/global/:key` writes to global
   - Test `DELETE /api/config/project/:key` resets value
   - Test `GET /api/env/:key` returns `{ set: boolean }`
   - ~100 lines

9. Run all tests: `npm run test`

10. Run full verification:
    ```bash
    npm run typecheck
    npm run lint
    npm run build
    npm run test
    ```

11. Backward compatibility verification:
    - Create `.claude/.epost-kit.json` with existing format
    - Run `epost-kit config show` — should display correctly
    - Run `epost-kit config get codingLevel` — should read existing value
    - Verify no migration needed, file reads as project-level

## Todo List

- [ ] Create config-security tests
- [ ] Create global-config-manager tests
- [ ] Create project-config-manager tests
- [ ] Create config-merger tests
- [ ] Create get-handler tests
- [ ] Create set-handler tests
- [ ] Create show-handler tests
- [ ] Create config-routes tests
- [ ] All tests pass: `npm run test`
- [ ] Typecheck passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build passes: `npm run build`
- [ ] Backward compat verified with existing `.epost-kit.json`

## Success Criteria

- All new tests pass
- All existing tests still pass
- `npm run typecheck` passes
- `npm run lint` passes
- `npm run build` passes
- Existing `.epost-kit.json` reads correctly as project-level config
- No regression in any existing CLI command

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Existing tests break from refactor | Medium | Run full suite after each phase, fix incrementally |
| Temp file cleanup in tests | Low | Use `afterEach`/`afterAll` for cleanup |
| REST API test complexity | Medium | Test route handlers directly, not via HTTP |

## Security Considerations

- Tests must not write to real config files
- Temp directories used for all file I/O tests
- No real API keys in test fixtures

## Next Steps

- Plan complete — run `set-active-plan.cjs` to activate
