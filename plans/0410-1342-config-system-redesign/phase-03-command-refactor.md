---
phase: 3
title: "Command Phase Handlers Refactor"
effort: 6h
depends: [2]
---

# Phase 3: Command Phase Handlers Refactor

## Context Links

- Phase 2: `phase-02-config-managers.md` (managers + merger)
- Current monolith: `src/commands/config.ts` (577 lines)
- Existing types: `src/types/commands.ts`
- CLI registration: `src/cli.ts`

## Overview

- **Priority**: High — decompose monolithic config.ts into phase handler pattern
- **Status**: pending
- **Description**: Break 577-line `config.ts` into focused handler modules under `src/commands/config/`. Each handler uses new config managers instead of direct file I/O.

## Key Insights

- Current config.ts has 7 distinct responsibilities: get, set, show, reset, ignore-add, ignore-remove, interactive TUI
- Each maps 1:1 to a phase handler file
- `resolveInstallDir()` and `readCurrentKitConfig()` are shared helpers — move to `config-path-utils.ts` (Phase 2) or keep as shared util in this dir
- `getByPath`, `setByPath`, `coerceValue` extracted in Phase 2 to `config-path-utils.ts`
- The `.env` helpers (`readEnvKey`, `writeEnvKey`) stay in `tui-handler.ts` (only used by TUI)

## Requirements

### Functional
- Each subcommand becomes its own handler file
- `config-command.ts` orchestrator routes action to handler
- All handlers use `GlobalConfigManager` / `ProjectConfigManager` instead of raw file I/O
- `get/set/show` handlers respect `--global` / `--local` flags
- `show` handler supports `--sources` flag via `ConfigMerger`
- Existing TUI behavior unchanged

### Non-Functional
- No handler file > 150 lines
- `index.ts` re-exports all handlers for backward compat
- Backward-compatible: all existing CLI behavior preserved
- `config.ts` deleted after full migration

## Architecture

```
src/commands/config/
├── index.ts                  # re-exports all handler functions
├── config-command.ts         # orchestrator (future use, thin wrapper)
├── types.ts                  # ConfigCommandOptions, ConfigUIOptions
├── phases/
│   ├── get-handler.ts        # config get <key> [-g/-l]
│   ├── set-handler.ts        # config set <key> <value> [-g/-l]
│   ├── show-handler.ts       # config show [-g/-l] [--sources]
│   ├── reset-handler.ts      # config reset
│   ├── ignore-handler.ts     # config ignore add/remove/list
│   └── tui-handler.ts        # config (bare) — interactive TUI
```

### Handler Signatures

```ts
// Each handler receives its options type and returns Promise<void>
export async function runGet(opts: ConfigGetOptions): Promise<void>
export async function runSet(opts: ConfigSetOptions): Promise<void>
export async function runShow(opts: ConfigOptions): Promise<void>
export async function runReset(opts: ConfigOptions): Promise<void>
export async function runIgnore(opts: ConfigOptions): Promise<void>
export async function runIgnoreAdd(opts: ConfigIgnoreAddOptions): Promise<void>
export async function runIgnoreRemove(opts: ConfigIgnoreRemoveOptions): Promise<void>
export async function runInteractive(opts: ConfigOptions): Promise<void>
```

### get-handler.ts Logic

```
if opts.global -> read from GlobalConfigManager.get(key)
if opts.local  -> read from ProjectConfigManager.get(installDir, key)
else           -> read from ConfigMerger.mergeWithSources(), get key from merged
```

### set-handler.ts Logic

```
if opts.global -> GlobalConfigManager.set(key, value)
else           -> ProjectConfigManager.set(installDir, key, value)  // default = project
```

### show-handler.ts Logic

```
if opts.global -> display GlobalConfigManager.load()
if opts.local  -> display ProjectConfigManager.load(installDir)
if opts.sources -> display merged config + source badges per field
else           -> display merged config (default behavior)
```

## Related Code Files

### Create
- `src/commands/config/index.ts`
- `src/commands/config/config-command.ts`
- `src/commands/config/types.ts`
- `src/commands/config/phases/get-handler.ts`
- `src/commands/config/phases/set-handler.ts`
- `src/commands/config/phases/show-handler.ts`
- `src/commands/config/phases/reset-handler.ts`
- `src/commands/config/phases/ignore-handler.ts`
- `src/commands/config/phases/tui-handler.ts`

### Delete
- `src/commands/config.ts` (after full migration verified)

## Implementation Steps

1. Create `src/commands/config/types.ts`:
   - Move config-related types from `src/types/commands.ts` here
   - Add `ConfigCommandOptions` extending `ConfigOptions` with `global?`, `local?`, `sources?`
   - Keep re-exports from `src/types/commands.ts` for backward compat

2. Create `src/commands/config/phases/get-handler.ts`:
   - Import `GlobalConfigManager`, `ProjectConfigManager`, `ConfigMerger`
   - Import `resolveInstallDir` (move from config.ts or use from Phase 2 utils)
   - Implement `runGet(opts)` with --global/--local logic described above
   - ~40 lines

3. Create `src/commands/config/phases/set-handler.ts`:
   - Import managers, `coerceValue` from config-path-utils
   - Implement `runSet(opts)` with --global/--local logic
   - ~40 lines

4. Create `src/commands/config/phases/show-handler.ts`:
   - Import managers, merger, `resolveInstallDir`
   - `--sources`: use `ConfigMerger.mergeWithSources()`, display each key with source badge
   - `--global`/`--local`: display single-scope config
   - Default: display merged config (backward compat with current behavior)
   - ~60 lines

5. Create `src/commands/config/phases/reset-handler.ts`:
   - Migrate existing `runConfigReset` logic from config.ts
   - Uses `mergeAndWriteKitConfig` (unchanged)
   - ~50 lines

6. Create `src/commands/config/phases/ignore-handler.ts`:
   - Migrate `runConfigIgnore`, `runConfigIgnoreAdd`, `runConfigIgnoreRemove` from config.ts
   - All three in one file (~90 lines total) or split into three (~30 each)
   - Recommend: single file, three exported functions
   - ~90 lines

7. Create `src/commands/config/phases/tui-handler.ts`:
   - Migrate `runConfigInteractive` from config.ts (~200 lines)
   - Include `readEnvKey`, `writeEnvKey` helpers (only used by TUI)
   - Include `GEMINI_MODELS` constant
   - Replace direct file I/O with managers where applicable
   - May need to keep `readEnvKey`/`writeEnvKey` as-is since .env is separate from config managers
   - ~180 lines

8. Create `src/commands/config/config-command.ts`:
   - Thin orchestrator, currently just a namespace for future use
   - Re-exports handler functions
   - ~20 lines

9. Create `src/commands/config/index.ts`:
   - Re-export all handler functions for backward compat
   - `export { runGet } from './phases/get-handler.js'`
   - etc.
   - ~15 lines

10. Move `resolveInstallDir` helper:
    - Either into `src/domains/config/config-path-utils.ts` (Phase 2)
    - Or into a shared `src/commands/config/shared.ts`
    - Recommend: Phase 2 config-path-utils.ts since it's config-domain logic

11. Delete `src/commands/config.ts` after verifying all imports updated

12. Verify build: `npm run build`

## Todo List

- [ ] Create `src/commands/config/types.ts`
- [ ] Create `src/commands/config/phases/get-handler.ts`
- [ ] Create `src/commands/config/phases/set-handler.ts`
- [ ] Create `src/commands/config/phases/show-handler.ts`
- [ ] Create `src/commands/config/phases/reset-handler.ts`
- [ ] Create `src/commands/config/phases/ignore-handler.ts`
- [ ] Create `src/commands/config/phases/tui-handler.ts`
- [ ] Create `src/commands/config/config-command.ts`
- [ ] Create `src/commands/config/index.ts`
- [ ] Move `resolveInstallDir` to config-path-utils (Phase 2)
- [ ] Delete `src/commands/config.ts`
- [ ] Verify build: `npm run build`
- [ ] Verify lint: `npm run lint`

## Success Criteria

- All existing `epost-kit config` subcommands work identically
- `epost-kit config get codingLevel --global` reads from global config
- `epost-kit config set codingLevel 2 --local` writes to project config
- `epost-kit config show --sources` displays source badges
- `epost-kit config` (bare) launches interactive TUI unchanged
- No file > 200 lines (tui-handler closest at ~180)
- `npm run build` + `npm run lint` pass

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Breaking existing CLI behavior | Medium | Line-by-line migration, test each handler |
| TUI handler too large | Low | .env helpers stay local, main logic ~150 lines |
| Missing re-export causes import error | Low | index.ts re-exports all handlers |

## Security Considerations

- All config writes go through managers (which use config-security.ts)
- No raw file I/O in any handler
- `.env` helpers remain in tui-handler (separate concern from config files)

## Next Steps

- Phase 4 updates `cli.ts` imports to point at new handler files
