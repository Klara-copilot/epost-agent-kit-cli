---
agent: epost-fullstack-developer
task: Phase 4 — Update CLI registrations in src/cli.ts for new config system
plan: plans/0410-1342-config-system-redesign
status: DONE
---

## Phase Implementation Report
- Phase: phase-04-cli-registrations | Plan: plans/0410-1342-config-system-redesign | Status: completed

### Files Modified
- `src/cli.ts` — Updated config command registrations (lines 487-579)

### Tasks Completed
1. Updated `config show` — added `--global`, `--local`, `--sources` flags; switched to `runShow` handler
2. Updated `config get` — added `--global`, `--local` flags; switched to `runGet` handler
3. Updated `config set` — added `--global`, `--local` flags; switched to `runSet` handler
4. Updated `config reset` — switched to `runReset` handler
5. `config ignore` / `ignore add` / `ignore remove` — kept original handler names (unchanged logic)
6. Added new `config ui` subcommand — `--port`, `--host`, `--no-open`, `--dir` flags; registered BEFORE bare `config` for correct CAC matching
7. Bare `config` — kept `runConfigInteractive`, updated comment

### Changes Summary
- Handler names: `runConfigShow` -> `runShow`, `runConfigGet` -> `runGet`, `runConfigSet` -> `runSet`, `runConfigReset` -> `runReset`
- Ignore/TUI handlers: unchanged (`runConfigIgnore`, `runConfigIgnoreAdd`, `runConfigIgnoreRemove`, `runConfigInteractive`)
- New: `runConfigUI` for `config ui` subcommand
- Import path: already was `./commands/config/index.js` (no change needed)
- Command registration order: `config ui` before bare `config` to ensure CAC matches specific subcommand first

## Completion Evidence
- [x] Tests: N/A — this is CLI registration wiring, no test files modified
- [x] Build: `npm run build` — success (tsc + tsc-alias + chmod, exit 0)
- [x] Acceptance criteria:
  - [x] Import from `./commands/config/index.js` — confirmed
  - [x] `--global` / `--local` / `--sources` flags on show/get/set — confirmed
  - [x] `config ui` subcommand registered — confirmed
  - [x] `config ui` before bare `config` — confirmed (lines 560-579)
  - [x] New handler names (runShow, runGet, runSet, runReset) — confirmed
  - [x] Ignore/TUI handlers keep original names — confirmed
- [x] Files changed: `src/cli.ts`

### Issues Encountered
None.

### Next Steps
- Phase 5 (config UI implementation) can proceed — `runConfigUI` is wired and ready
