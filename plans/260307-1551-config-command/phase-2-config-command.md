---
phase: 2
title: "Standalone config command"
effort: 2h
depends: [1]
---

# Phase 2: Standalone Config Command

## Context Links

- [Plan](./plan.md)
- [Phase 1](./phase-1-init-config-handling.md)
- `src/cli.ts` -- command registration
- `src/domains/config/` -- config domain

## Overview

- Priority: P2
- Status: Complete
- Effort: 2h
- Description: Add `epost-kit config` subcommands to view, edit, and reset `.epost-kit.json` and `.epost-ignore` post-installation.

## Requirements

### Functional

- `epost-kit config show` -- pretty-print current `.epost-kit.json`
- `epost-kit config get <key>` -- get specific value (dot-notation: `plan.dateFormat`)
- `epost-kit config set <key> <value>` -- set value in `.epost-kit.json`
- `epost-kit config reset` -- restore defaults from installed packages (re-merge)
- `epost-kit config ignore` -- show current `.epost-ignore` patterns
- `epost-kit config ignore add <pattern>` -- append pattern
- `epost-kit config ignore remove <pattern>` -- remove pattern

### Non-Functional

- Auto-detect install dir from `.epost-metadata.json` target field
- Support `--dir` flag for non-CWD projects
- JSON output with `--json` flag for `show`/`get`

## Related Code Files

### Files to Modify

- `src/cli.ts` -- register `config show/get/set/reset` and `config ignore` subcommands
- `src/types/commands.ts` -- add `ConfigOptions` type

### Files to Create

- `src/commands/config.ts` -- all config subcommand handlers

### Files to Delete

- None

## Implementation Steps

1. **Add `ConfigOptions` to types**
   - `dir?: string`, `json?: boolean`, `key?: string`, `value?: string`, `pattern?: string`

2. **Create `src/commands/config.ts`**
   - Helper: `resolveInstallDir(dir?)` -- read metadata, get target, resolve `.claude/` or `.github/` etc.
   - Helper: `readCurrentKitConfig(installDir)` -- parse `.epost-kit.json`
   - Helper: `writeKitConfig(installDir, config)` -- write `.epost-kit.json`
   - `runConfigShow(opts)` -- read + display (table or JSON)
   - `runConfigGet(opts)` -- dot-notation get (e.g., `plan.dateFormat`)
   - `runConfigSet(opts)` -- dot-notation set, auto-detect type (number, boolean, string)
   - `runConfigReset(opts)` -- re-run merge from cached packages (same as Phase 1 merge)
   - `runConfigIgnore(opts)` -- show patterns
   - `runConfigIgnoreAdd(opts)` -- append pattern, dedup
   - `runConfigIgnoreRemove(opts)` -- remove pattern

3. **Register in `src/cli.ts`**
   - `config show` with `--json` option
   - `config get <key>`
   - `config set <key> <value>`
   - `config reset` with `--yes` for non-interactive
   - `config ignore` (list)
   - `config ignore add <pattern>`
   - `config ignore remove <pattern>`

4. **Add dot-notation helpers**
   - `getByPath(obj, "plan.dateFormat")` -- returns value
   - `setByPath(obj, "plan.dateFormat", "YYMMDD")` -- sets value in-place

## Todo List

- [x] Add `ConfigOptions` type to `src/types/commands.ts`
- [x] Create `src/commands/config.ts` with all handlers
- [x] Add dot-notation get/set helpers
- [x] Register all subcommands in `src/cli.ts`
- [x] Test: `config show` displays current config (verified logic via node)
- [x] Test: `config set plan.dateFormat YYMMDD-HHmm` persists change
- [x] Test: `config reset` restores defaults
- [x] Test: `config ignore add .terraform` appends pattern
- [x] Test: `config ignore remove vendor` removes pattern

## Success Criteria

- `epost-kit config show` outputs formatted `.epost-kit.json`
- `epost-kit config set plan.dateFormat "YYMMDD"` changes value and persists
- `epost-kit config reset` restores to package defaults
- `epost-kit config ignore add .terraform` appends without duplicates
- All commands work with `--dir` flag

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Dot-notation set on non-existent path | Low | Create intermediate objects automatically |
| Type coercion wrong (string "true" vs boolean) | Med | JSON.parse attempt first, fallback to string |
| Config reset needs cached packages | Med | Read from `~/.epost-kit/packages/` or metadata source |

## Security Considerations

- Config set validates key exists in schema (no arbitrary key injection)
- No secrets stored in `.epost-kit.json`

## Next Steps

- After this phase, hooks read config via same path -- no changes needed
- Future: packages can declare `.epost-kit.json` overrides in their `package.yaml`
