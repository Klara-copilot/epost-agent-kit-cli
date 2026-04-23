---
phase: 4
title: "CLI Registration Updates"
effort: 2h
depends: [3]
---

# Phase 4: CLI Registration Updates

## Context Links

- Phase 3: `phase-03-command-refactor.md` (new handler files)
- CLI entry: `src/cli.ts` (lines 488-554 = config registrations)
- Types: `src/types/commands.ts`

## Overview

- **Priority**: Medium — wires new handler files into CLI
- **Status**: pending
- **Description**: Update `cli.ts` config command registrations to import from new handler files, add `--global`/`--local`/`--sources` flags, and register new `config ui` subcommand.

## Key Insights

- Current config registrations span lines 488-554 in `cli.ts`
- 7 subcommands registered: `show`, `get`, `set`, `reset`, `ignore`, `ignore add`, `ignore remove`, + bare `config`
- All currently import from `./commands/config.js` — will change to `./commands/config/index.js`
- `config ui` is a new subcommand — registered here but handler created in Phase 5
- Must keep `preprocessArgv` working for multi-word commands like `config show`

## Requirements

### Functional
- Update all config command imports from `./commands/config.js` to `./commands/config/index.js`
- Add `--global` / `-g` flag to `config get`, `config set`, `config show`
- Add `--local` / `-l` flag to `config get`, `config set`, `config show`
- Add `--sources` flag to `config show`
- Register `config ui` subcommand with `--port`, `--host`, `--no-open` options
- Bare `config` continues to launch interactive TUI (unchanged)

### Non-Functional
- No changes to non-config commands in `cli.ts`
- `preprocessArgv` must handle `config ui` as two-word command

## Architecture

### Updated Command Registrations

```
config show       → import from ./commands/config/index.js, add --global/--local/--sources
config get <key>  → import from ./commands/config/index.js, add --global/--local
config set <k> <v>→ import from ./commands/config/index.js, add --global/--local
config reset      → import from ./commands/config/index.js (unchanged)
config ignore     → import from ./commands/config/index.js (unchanged)
config ignore add → import from ./commands/config/index.js (unchanged)
config ignore rm  → import from ./commands/config/index.js (unchanged)
config ui         → NEW, import from ./commands/config/index.js
config            → import from ./commands/config/index.js (unchanged)
```

### `config ui` Registration

```ts
cli
  .command("config ui", "Launch web dashboard for visual config editing")
  .option("--port <number>", "Port number (default: auto-select 3456-3460)")
  .option("--host <addr>", "Bind address (default: localhost)")
  .option("--no-open", "Don't auto-open browser")
  .action(async (opts: any) => {
    const { runConfigUI } = await import("./commands/config/index.js");
    await runConfigUI({ ...cli.globalCommand.options, ...opts });
  });
```

## Related Code Files

### Modify
- `src/cli.ts` — update config command registrations (lines 488-554)

## Implementation Steps

1. Update `config show` registration in `cli.ts`:
   - Change import to `./commands/config/index.js`
   - Add `.option("--global", "Show global config only")`
   - Add `.option("--local", "Show project config only")`
   - Add `.option("--sources", "Show where each value comes from")`

2. Update `config get <key>` registration:
   - Change import to `./commands/config/index.js`
   - Add `.option("--global", "Read from global config")`
   - Add `.option("--local", "Read from project config")`

3. Update `config set <key> <value>` registration:
   - Change import to `./commands/config/index.js`
   - Add `.option("--global", "Write to global config")`
   - Add `.option("--local", "Write to project config")`

4. Update remaining config commands (`reset`, `ignore`, `ignore add`, `ignore remove`):
   - Change imports to `./commands/config/index.js`
   - No new flags needed

5. Update bare `config` registration:
   - Change import to `./commands/config/index.js`

6. Register `config ui` subcommand:
   - Must be registered BEFORE bare `config` (CAC matches specific before general)
   - Options: `--port`, `--host`, `--no-open`
   - Handler: `runConfigUI` (stub in Phase 5, for now create placeholder that prints "Not yet implemented")

7. Verify `preprocessArgv` handles `config ui` correctly:
   - `config ui` is two-word command, should be in the prefixes list
   - Test: `epost-kit config ui` should route correctly

8. Verify build: `npm run build`

## Todo List

- [ ] Update `config show` registration with new flags
- [ ] Update `config get` registration with new flags
- [ ] Update `config set` registration with new flags
- [ ] Update `config reset` registration (import only)
- [ ] Update `config ignore*` registrations (import only)
- [ ] Update bare `config` registration (import only)
- [ ] Register `config ui` subcommand with options
- [ ] Add `runConfigUI` placeholder export to `src/commands/config/index.ts`
- [ ] Verify `preprocessArgv` handles `config ui`
- [ ] Verify build: `npm run build`
- [ ] Verify lint: `npm run lint`

## Success Criteria

- `epost-kit config show --global` shows global config only
- `epost-kit config show --local` shows project config only
- `epost-kit config show --sources` shows merged config with source badges
- `epost-kit config get codingLevel --global` reads from global
- `epost-kit config set codingLevel 2 --local` writes to project
- `epost-kit config ui` recognized as valid subcommand (even if placeholder)
- `epost-kit config` (bare) still launches TUI
- All existing config subcommands work unchanged without new flags
- `npm run build` + `npm run lint` pass

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| CAC multi-word command matching breaks | Low | `config ui` follows same pattern as `config show` |
| `--no-open` flag parsing in CAC | Medium | Test CAC's handling of `--no-` prefix flags |
| Import path regression | Low | index.ts re-exports everything |

## Security Considerations

- No new security concerns — this phase only wires existing handlers

## Next Steps

- Phase 5 implements the actual `runConfigUI` handler and REST API
