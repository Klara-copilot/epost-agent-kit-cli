# CLI Rollout Phases — Status

**Last Updated**: 2026-03-31

---

## Progress

| Phase | Item | Status |
|-------|------|--------|
| 1 | 1.1 `init` non-interactive flags (`--full`, `--bundle`, `--skill`, `--preview`, `install` alias) | Done |
| 1 | 1.2 `doctor` — add `--dir <path>` option | Done |
| 1 | 1.3 `validate` command (new) | Done |
| 1 | 1.4 `status` command (new) | Done |
| 2 | 2.1 `dry-run "<prompt>"` standalone command | Pending |
| 2 | 2.2 `trace "<prompt>"` routing trace | Pending |
| 2 | 2.3 Routing parser domain | Pending |
| 2 | 2.4 `show routing` / `show config` subcommands | Pending |
| 2 | 2.5 `--preview` on `update`/`remove` | Pending |
| 2 | 2.6 `--dry-run` on `add`/`remove` | Pending |
| 3 | 3.1 `enable`/`disable` for skills and hooks | Pending |
| 3 | 3.2 `add`/`remove` `--json` + `--preview` | Pending |
| 3 | 3.3 `update` `--json` + `--preview` | Pending |
| 3 | 3.4 `uninstall` expose `--dry-run` CLI flag | Pending |
| 4 | 4.1 `repair` command | Pending |
| 4 | 4.2 `list hooks` command | Pending |
| 4 | 4.3 `OutputManager` real implementation | Pending |
| 4 | 4.4 Machine-readable errors | Pending |
| 4 | 4.5 `--json` on all remaining commands | Pending |
| 4 | 4.6 "What changed?" output on all write commands | Pending |

---

## Key Decisions

| Date | Decision | Why |
|------|----------|-----|
| 2026-03-31 | `--full` maps to `profile: "full"` + `yes: true` | Reuses existing profile/package resolution in runInit |
| 2026-03-31 | `--bundle <name>` maps to `profile: <name>` + `yes: true` | Bundles are role names in the existing resolver |
| 2026-03-31 | `--skill <name>` maps to `packages: <name>` + `yes: true` | Single-package install path already exists |
| 2026-03-31 | `--preview` is CLI-level alias for `--dry-run` | Wired in cli.ts action, not at type level |
| 2026-03-31 | `init` gets `install` alias | Design doc uses `epost-kit install`; `init` stays primary |
| 2026-03-31 | `validate` checks: config, skills-on-disk, CLAUDE.md routing, agents, hooks settings | Covers all 5 areas from spec |
| 2026-03-31 | `status` reads `.epost-metadata.json` + `.epost.json` | metadata has packages/profile, config has skills/agents |

---

## Architecture Reference

- `src/cli.ts` — command registrations (status, validate added; init updated with new flags)
- `src/commands/validate.ts` — new; 5 checks, structured pass/fail, `--json` support
- `src/commands/status.ts` — new; reads metadata + config, `--json` support
- `src/commands/doctor.ts` — updated; `--dir` wired in
- `src/types/commands.ts` — `InitOptions`, `DoctorOptions`, `ValidateOptions`, `StatusOptions` updated

---

## Known Bugs

_None_
