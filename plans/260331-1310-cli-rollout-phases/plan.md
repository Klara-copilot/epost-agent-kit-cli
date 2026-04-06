# CLI Rollout Phases Plan

**Created**: 2026-03-31  
**Updated**: 2026-03-31 (gap-filled from design doc)  
**Branch**: master

---

## Command Architecture (4 domains)

```
A. Install   — setup and scope
B. Inspect   — what exists and what happened
C. Manage    — enable, disable, add, remove, update
D. Diagnose  — validate, dry-run, trace, repair
```

### Full command surface

```bash
# Install
epost-kit install                       # interactive wizard (current init)
epost-kit install --full                # non-interactive full kit
epost-kit install --bundle web          # non-interactive bundle
epost-kit install --skill discover      # non-interactive single skill
epost-kit install --bundle web --preview  # show file list before writing

# Inspect
epost-kit status                        # installed scope + enabled items + mode
epost-kit list skills
epost-kit list agents
epost-kit list hooks
epost-kit show routing
epost-kit show config

# Diagnose
epost-kit doctor                        # preflight: git, node, tools, env, permissions
epost-kit validate                      # post-install: config, skills, routing, delegation, hooks
epost-kit dry-run "build login page"    # standalone — simulate routing decision
epost-kit trace "commit and push"       # trace routing + dispatch path
epost-kit repair                        # auto-fix validation failures

# Manage
epost-kit enable skill review
epost-kit disable skill discover
epost-kit disable hook auto-capture     # hooks can be enabled/disabled too
epost-kit add skill review
epost-kit remove bundle mobile
epost-kit update
epost-kit uninstall
```

---

## UX Principles (apply to all commands)

1. **Every command answers "what changed?"** — never silent after a write
2. **Preview before write** — `--preview` on install, update, remove
3. **Human-readable first, machine-readable second** — `--json` on all commands
4. **Trace is first-class** — not hidden in logs, standalone command
5. **Scope is explicit** — always show full-kit / bundle / skill context
6. **Safe defaults** — dry-run, confirmation, non-destructive

---

## Phase 1 — Installation Foundation

### 1.1 `install` command (non-interactive flags)

`init` already exists with interactive wizard. Add explicit flags for non-interactive usage:

- `--full` → install full kit (equiv. `--profile full`)
- `--bundle <name>` → install bundle by key (web, ios-developer, android-developer, backend-api, designer, kit-author, a11y-specialist)
- `--skill <name>` → install single skill (discover, plan, fix, review)
- `--preview` → alias for `--dry-run`; shows "Will create / Will enable" list

Files: `src/commands/init.ts`, `src/types/commands.ts`, `src/cli.ts`

### 1.2 `doctor` — preflight (runs before install)

Already exists. Extend to:
- Run automatically as preflight step before any `install` write (warn, don't block)
- Add `--dir <path>` option
- Show: ✓/△/✗ for git, node, repo writable, Claude CLI auth, env vars

Files: `src/commands/doctor.ts`, `src/cli.ts`

### 1.3 `validate` — post-install structured check (new)

Tests after install:
- Config validity
- Skill loading
- Routing availability
- Delegation readiness
- Hook safety

Returns structured pass/fail. Supports `--json`.

Files: `src/commands/validate.ts` (new), `src/cli.ts`, `src/types/commands.ts`

### 1.4 `status` — install inventory (new)

Output:
```
Installed scope:
- bundle: web
- skill: discover

Enabled:
- 4 skills
- 1 hook

Mode:
- safe
- confirmation required
```

Reads `.epost-metadata.json` + `.epost.json`. Supports `--json`.  
This becomes the UI dashboard summary.

Files: `src/commands/status.ts` (new), `src/cli.ts`, `src/types/commands.ts`

---

## Phase 2 — Transparency

### 2.1 `dry-run "<prompt>"` — standalone command (new)

Separate from `--dry-run` flag. Simulates routing for a natural language prompt:
```
Input:        build login page
Intent:       Build
Routing rule: #12
Skill:        /cook
Agent:        epost-builder
Args:         "login page"
Result:       dry-run success
```

Requires routing-rule parser (see 2.3).

Files: `src/commands/dry-run.ts` (new), `src/cli.ts`

### 2.2 `trace "<prompt>"` — routing trace (new)

Full dispatch trace — like `dry-run` but shows the full orchestration path including agent delegation steps.

Files: `src/commands/trace.ts` (new), `src/cli.ts`

### 2.3 Routing parser — shared domain (new)

Parses CLAUDE.md routing rules and skill `@when` triggers to support both `dry-run` and `trace`.

Files: `src/domains/routing/routing-parser.ts` (new)

### 2.4 `show routing` / `show config` — inspect subcommands (new/rename)

- `show routing` — extract and render routing table from installed CLAUDE.md
- `show config` — display current `.epost.json` config (existing `config show` lives at `config show`; add `show config` alias or move to `show` group)

Files: `src/commands/show.ts` (new subcommand group), `src/cli.ts`

**Note on verb order**: Design doc uses `show routing` / `show config` (noun-last). Existing `config show` uses the opposite. Move all to `show <noun>` for consistency. Keep `config show` as alias for backwards compat.

### 2.5 `--preview` flag on `install`/`update`/`remove`

Alias for `--dry-run`. Shows file list before writing:
```
Will create:
- CLAUDE.md
- skills/plan
- skills/cook

Will enable:
- routing rules
- delegation
- safe mode
```

Files: `src/types/commands.ts` (add `preview?` as alias of `dryRun`), update preview output in `init.ts` and `update.ts`

### 2.6 `--dry-run` on `add`/`remove`

Files: `src/commands/add.ts`, `src/commands/remove.ts`, `src/types/commands.ts`

---

## Phase 3 — Management

### 3.1 `enable`/`disable` for skills AND hooks (new)

Both skills and hooks can be toggled:
```bash
epost-kit enable skill review
epost-kit disable skill discover
epost-kit disable hook auto-capture
epost-kit enable hook knowledge-capture
```

Storage: `disabledSkills?: string[]` and `disabledHooks?: string[]` in `.epost.json`.  
Disabled items remain on disk; excluded from CLAUDE.md at generation time.

Files:
- `src/commands/enable-disable.ts` (new)
- `src/types/epost-config.ts` — add `disabledSkills`, `disabledHooks` to schema
- `src/domains/help/claude-md-generator.ts` — filter disabled items

### 3.2 `add`/`remove` — `--json` + `--preview` flags

Already implemented. Add `--json` + `--preview` (dry-run alias).

Files: `src/commands/add.ts`, `src/commands/remove.ts`

### 3.3 `update` — `--json` + `--preview` flags

Files: `src/commands/update.ts`

### 3.4 `uninstall` — expose `--dry-run` CLI flag

`dryRun` is already typed; wire it in `cli.ts`.

Files: `src/cli.ts`

---

## Phase 4 — UI Readiness

### 4.1 `repair` command (new)

Auto-fix validation failures from `validate`. Re-runs the install engine for failed checks only.

Files: `src/commands/repair.ts` (new), `src/cli.ts`

### 4.2 `list hooks` command

List installed hooks (currently `list` covers skills/agents but not hooks).

Files: `src/commands/list.ts` or `src/commands/list-hooks.ts`

### 4.3 `OutputManager` — real implementation

Replace stub in `src/shared/output-manager.ts`. Emit structured JSON-lines progress events when `--json` active.

Event types in `src/types/events.ts` (new):
```typescript
type CliEvent = ProgressEvent | ResultEvent | ErrorEvent
```

### 4.4 Machine-readable errors

When `--json` active, catch all `EpostKitError` at dispatch layer → `{ type: "error", code, message, exitCode }`.

Files: `src/cli.ts`, `src/domains/error/index.ts`

### 4.5 `--json` on all remaining commands

Standardize across: `validate`, `status`, `trace`, `dry-run`, `add`, `remove`, `update`, `upgrade`, `show routing`, `show config`.

### 4.6 "What changed?" output on all write commands

Every write command (install, add, remove, update, enable, disable) prints a structured summary of changes made. Never silent.

---

## Cross-Phase Dependencies

```
Phase 1
  └─ 2.3 routing-parser ──→ 2.1 dry-run, 2.2 trace
  └─ 3.1 disabledSkills schema ──→ 4.3 JSON schema freeze
Phase 4 requires all commands registered (phases 1–3 complete)
```

**Schema change gate**: `disabledSkills`/`disabledHooks` in Phase 3 must land before Phase 4 JSON schema freeze.

---

## Unresolved Questions

1. **`install` vs `init` naming**: Design doc uses `agentkit install`. Keep `init` as primary name with `install` as alias, or rename? Renaming breaks existing users.
2. **`dry-run` matching strategy**: Does CLAUDE.md routing have `@when` frontmatter in SKILL.md? If yes, exact match. If no, keyword matching only.
3. **`repair` scope**: Re-run full install engine for failed checks, or targeted per-check fix? Full re-run is simpler and safe.
4. **`show` command group**: New `show` subcommand group vs aliases on existing `config show` / `routing show`. Recommendation: new `show` group, keep old as hidden aliases.
5. **JSON schema versioning**: Add `schemaVersion` field to all `--json` outputs? Required if UI breaks on CLI version upgrades.
6. **`OutputManager` streaming vs buffering**: Real-time JSON-lines for `install` progress, or final result blob only? Streaming needed for UI progress bar but adds complexity.
7. **Mode field in `.epost.json`**: `status` shows "Mode: safe / confirmation required" — is this stored in config or derived from installed skill set?
