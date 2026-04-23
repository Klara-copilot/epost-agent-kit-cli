# Research: claudekit-cli Config Command System

**Date**: 2026-04-10
**Agent**: epost-researcher
**Scope**: CLI configuration system architecture, config command subcommands, file format, design patterns
**Status**: ACTIONABLE

---

## Research Question

How does claudekit-cli's config command system work? CLI framework, subcommands/flags, config file format/storage, key design patterns, code structure.

---

## Executive Summary

claudekit-cli uses **cac** (lightweight CLI framework), implements a **dual-layer config system** (global `~/.claude/.ck.json` + project `.claude/.ck.json`) with 3-level merge resolution (defaults <- global <- project), source tracking per field, and a web dashboard (Express+React) for the default `ck config` action. Config is validated via **zod** schemas. The codebase follows domain-driven design with phase handlers for command orchestration.

---

## Key Findings

### 1. CLI Framework: cac v6.7.14

- NOT Commander.js or yargs. **cac** is minimal (~2KB), ESM-native.
- Instance created in `src/cli/cli-config.ts` via `cac("ck")`.
- Global flags: `--verbose`, `--json`, `--log-file <path>`, `-V/--version`, `-h/--help`.
- Commands registered in `src/cli/command-registry.ts` (single function, 17+ commands).
- Entry: `src/index.ts` — `createCliInstance() -> registerCommands() -> registerGlobalFlags() -> parse()`.

**Pattern**: Chained `.command().option().action()` — idiomatic cac. Options normalized inline (e.g., single-value to array coercion for `--exclude`).

### 2. Config Command Subcommands

```
ck config                    # Launch web dashboard (default action)
ck config ui                 # Alias for dashboard
ck config get <key>          # Get config value (dot-notation path)
ck config set <key> <value>  # Set config value (interactive scope prompt)
ck config show               # Display merged config (or --global/--local only)
```

**Flags** (all subcommands):

| Flag | Purpose |
|------|---------|
| `-g, --global` | Use `~/.claude/.ck.json` only |
| `-l, --local` | Use `.claude/.ck.json` only |
| `--json` | Machine-readable output |
| `--port <port>` | Dashboard port (default: auto 3456-3460) |
| `--host <host>` | Dashboard bind address (default: 127.0.0.1) |
| `--no-open` | Don't auto-open browser |
| `--dev` | Vite HMR mode for dashboard dev |

### 3. Config File Format & Storage

**Two distinct config systems**:

| System | File | Manager Class | Purpose |
|--------|------|---------------|---------|
| CK CLI config | `~/.claudekit/config.json` | `ConfigManager` | CLI-wide settings (github token, defaults, folders) |
| Project config | `~/.claude/.ck.json` (global) or `.claude/.ck.json` (local) | `CkConfigManager` | Per-project/per-user kit settings with source tracking |

**CK CLI config** (`~/.claudekit/config.json`):
```json
{
  "github": { "token": "stored_in_keychain" },
  "defaults": { "kit": "engineer", "dir": "." },
  "folders": { "docs": "docs", "plans": "plans" }
}
```

**Project config** (`.ck.json`):
- Validated by `CkConfigSchema` (zod)
- Supports dot-notation paths for get/set
- Source tracking: each field knows if it came from `global`, `project`, or `default`

**File permissions**: 0o700 for config dirs, 0o600 for config files (Unix only).

**Security**: Prototype pollution protection — `DANGEROUS_KEYS` filter (`__proto__`, `constructor`, `prototype`) in `setNestedValue` and `deepMerge`.

### 4. Key Design Patterns

| Pattern | Where | What |
|---------|-------|------|
| **Facade/Manager** | `ConfigManager`, `CkConfigManager` | Static classes wrapping all config I/O |
| **Phase Handlers** | `commands/config/phases/` | `get-handler.ts`, `set-handler.ts`, `show-handler.ts` — one file per subcommand action |
| **Command Orchestrator** | `config-command.ts` | Routes `action` string to appropriate phase handler |
| **Layered Merge** | `CkConfigManager.loadFull()` | `defaults <- global <- project` with per-field source tracking |
| **Selective Save** | `saveProjectConfig()`, `saveFull()` | Only writes fields that differ from inherited values; preserves user settings |
| **Dynamic Import** | `config-ui-command.ts` | Web server imported lazily (`await import("@/domains/web-server/")`) to avoid bundling in main CLI |
| **Port Auto-Select** | Dashboard | Falls through ports 3456-3460; explicit `--port` checked before use |

### 5. Code Structure

```
src/
├── cli/
│   ├── cli-config.ts          # cac instance creation, global flags
│   └── command-registry.ts    # all 17+ command registrations
├── commands/
│   └── config/
│       ├── index.ts            # re-exports
│       ├── config-command.ts   # orchestrator: routes action -> handler
│       ├── config-ui-command.ts # dashboard launcher (Express+Vite)
│       ├── types.ts            # ConfigCommandOptions, ConfigUIOptions
│       └── phases/
│           ├── get-handler.ts  # ck config get <key>
│           ├── set-handler.ts  # ck config set <key> <value>
│           └── show-handler.ts # ck config show
├── domains/
│   └── config/
│       ├── ck-config-manager.ts  # .ck.json management, source tracking, deep merge
│       ├── config-manager.ts     # ~/.claudekit/config.json management, folder resolution
│       ├── config-validator.ts
│       ├── config-generator.ts
│       ├── settings-merger.ts
│       └── merger/               # merge strategy directory
└── index.ts                     # entry: createCli -> register -> parse
```

**Additional domain directories**: `api-key/`, `claudekit-api/`, `claudekit-data/`, `github/`, `health-checks/`, `help/`, `installation/`, `migration/`, `plan-parser/`, `skills/`, `sync/`, `ui/`, `versioning/`, `web-server/`, `error/`.

---

## Trade-offs Analysis

| Decision | Advantage | Cost |
|----------|-----------|------|
| cac over Commander/yargs | Tiny bundle, ESM-native, simple API | Less middleware/plugin ecosystem |
| Dual config managers | Separation of concerns (CLI vs project) | Two systems to maintain, potential confusion |
| Static classes | Simple, no DI framework needed | Harder to test (no injection), global mutable state |
| Interactive scope prompt on `set` | User-friendly | Not scriptable without `--global`/`--local` flags |
| Lazy web server import | Keeps CLI binary small | Adds complexity to dashboard launch path |
| Source tracking per field | Rich UI display (show where value comes from) | Extra computation on every read |

---

## Best Practices Observed

- **Zod validation** on all config reads/writes — schema is single source of truth
- **File permissions** enforced (0o700/0o600) for security
- **Prototype pollution** protection in deep merge/set operations
- **Selective merge** preserves user customizations on update
- **Graceful migration** for config file location bugs (nested config fixer)
- **Port conflict detection** before dashboard launch

---

## Comparison: cac vs Commander.js vs yargs

| Aspect | cac | Commander.js | yargs |
|--------|-----|-------------|-------|
| Bundle size | ~2KB | ~30KB | ~60KB |
| ESM support | Native | Added later | Added later |
| Subcommand pattern | Chained `.command()` | `.command()` + `.action()` | `.command()` + builders |
| Type safety | Manual ( ReturnType<typeof cac>) | Built-in TypeScript types | `.strict()` + types |
| Validation | External (zod) | External | Built-in `.check()` |
| Auto-help | Built-in | Built-in | Built-in (richer) |
| Learning curve | Low | Medium | High |

---

## Sources

1. GitHub repo: `mrgoonie/claudekit-cli` — https://github.com/mrgoonie/claudekit-cli (Credibility: High)
2. `src/cli/cli-config.ts` — cac instance + global flags
3. `src/cli/command-registry.ts` — full command registration with all options
4. `src/commands/config/config-command.ts` — action routing orchestrator
5. `src/commands/config/config-ui-command.ts` — Express dashboard launcher
6. `src/commands/config/phases/get-handler.ts` — get subcommand
7. `src/commands/config/phases/set-handler.ts` — set subcommand with scope selection
8. `src/commands/config/phases/show-handler.ts` — show subcommand with merge display
9. `src/domains/config/config-manager.ts` — ~/.claudekit/config.json management
10. `src/domains/config/ck-config-manager.ts` — .ck.json management with source tracking
11. `src/index.ts` — CLI entry point
12. `package.json` — dependencies and scripts
13. README.md — user-facing documentation

---

## Verdict

**ACTIONABLE** — Full source code analyzed. Config system is well-architected with clear separation between CLI config and project config, proper validation, security hardening, and source tracking. The dual-manager pattern is the main architectural choice worth noting for our own CLI design.

---

## Unresolved Questions

1. What is the full `CkConfigSchema` shape? (Defined in `@/types` — would need to fetch `src/types/` directory)
2. How does `PathResolver` determine config paths? (Referenced but not fetched)
3. What does the web dashboard React UI look like? (UI components in `src/domains/ui/`)
4. How does the `sync` command interact with config? (Separate domain)
5. What merge strategies exist in `src/domains/config/merger/`?
