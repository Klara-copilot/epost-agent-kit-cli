# Brainstorm: Config System Redesign (claudekit-cli-inspired)

**Date**: 2026-04-10
**Agent**: epost-brainstormer
**Status**: APPROVED → Plan requested

---

## Problem Statement

Current `epost-kit config` is a monolithic 577-line file with single-layer config, no source tracking, no web UI. Claudekit-cli demonstrates a superior architecture: dual-layer config with 3-level merge, per-field source tracking, web dashboard, and security hardening.

## Evaluated Approaches

### Dashboard Stack

| Option | Verdict |
|--------|---------|
| Express + Vite + React SPA | **SELECTED** — rich UI, extensible, matches reference |
| Express + server HTML | Rejected — limited interactivity |
| Hono + Alpine.js | Rejected — smaller ecosystem |

### Config Architecture

| Option | Verdict |
|--------|---------|
| Static facade classes | **SELECTED** — matches claudekit pattern, simple |
| Instance + factory | Rejected — unnecessary DI complexity |
| Functional modules | Rejected — no state encapsulation |

### Migration

| Option | Verdict |
|--------|---------|
| Backward-compatible | **SELECTED** — existing .epost-kit.json becomes project-level, add global layer |
| Progressive | Rejected — doesn't deliver full value |
| Clean break | Rejected — breaks existing setups |

## Final Design

### Config Merge Model

```
Read:  defaults (code) → global (~/.epost-kit/config.json) → project (.claude/.epost-kit.json)
Write: config set --global → ~/.epost-kit/config.json
       config set (default) → .claude/.epost-kit.json
Source: { "skills.research.engine": "project", "codingLevel": "default" }
```

### File Structure

```
src/commands/config/
├── index.ts                  # re-exports
├── config-command.ts         # orchestrator: routes action -> handler
├── config-ui-command.ts      # web dashboard launcher (Express+Vite)
├── types.ts                  # ConfigCommandOptions + ConfigUIOptions
└── phases/
    ├── get-handler.ts        # config get <key> [-g/-l]
    ├── set-handler.ts        # config set <key> <value> [-g/-l]
    ├── show-handler.ts       # config show [-g/-l] [--sources]
    ├── reset-handler.ts      # config reset
    ├── ignore-handler.ts     # config ignore add/remove/list
    └── tui-handler.ts        # config (bare) — existing interactive TUI

src/domains/config/
├── global-config-manager.ts  # ~/.epost-kit/config.json static facade
├── project-config-manager.ts # .claude/.epost-kit.json static facade
├── config-merger.ts          # 3-level merge + source tracking
├── config-security.ts        # file perms, prototype pollution guard
└── kit-config-merger.ts      # EXISTING: unchanged

src/domains/web-dashboard/
├── server.ts                 # Express setup + port auto-select (3456-3460)
├── api/config-routes.ts      # REST API for config CRUD + sources
└── ui/                       # React SPA (Vite)
    └── src/
        ├── App.tsx
        ├── components/       # ConfigEditor, SourceBadge, HookToggle
        └── pages/            # Dashboard, Settings, Hooks, Plan, Ignore, Keys
```

### CLI Changes

```
epost-kit config              # Interactive TUI (unchanged)
epost-kit config ui           # NEW: web dashboard (--port, --host, --no-open)
epost-kit config show         # ENHANCED: --global, --local, --sources
epost-kit config get <key>    # ENHANCED: --global, --local
epost-kit config set <key> <value>  # ENHANCED: --global, --local
```

### REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/config` | GET | Merged config + source map |
| `/api/config/:scope` | GET | Global or project config |
| `/api/config/:scope/:key` | PUT | Set value in scope |
| `/api/config/:scope/:key` | DELETE | Reset to inherited |
| `/api/hooks` | GET | Hooks status |
| `/api/hooks/:name` | PUT | Toggle hook |
| `/api/ignore` | GET/POST/DELETE | Manage ignore patterns |
| `/api/env/:key` | GET/PUT | API key status/set |

### New Dependencies

- express (prod)
- vite (dev)
- react, react-dom (dev)
- @vitejs/plugin-react (dev)

### Security

- File permissions: 0o700 dirs, 0o600 files (Unix)
- Prototype pollution guard: filter `__proto__`, `constructor`, `prototype`
- Config value sanitization on read

## Risks

| Risk | Mitigation |
|------|-----------|
| Web dashboard bundle size | Lazy import, only loaded on `config ui` |
| Breaking existing config | Backward-compatible read, existing file = project-level |
| Port conflicts | Auto-select 3456-3460, `--port` override |
| React SPA build complexity | Vite handles build, pre-built in npm package |

## Success Criteria

1. `config get/set/show` work with `--global`/`--local` flags
2. Source tracking shows where each config value originates
3. Web dashboard displays and edits config via REST API
4. Existing `.epost-kit.json` reads as project-level without migration
5. Security: file perms + prototype pollution guard on all config writes
6. All existing TUI functionality preserved

---

## Unresolved Questions

1. Should global config schema be a subset of project config, or identical?
2. Dashboard auth — is localhost-only binding sufficient, or need API key?
3. Should dashboard auto-reload on config file changes (fs.watch)?
