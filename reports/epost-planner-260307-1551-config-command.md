---
agent: epost-planner
date: 2026-03-07
type: plan
---

# Plan Report: Config Command + Explicit Config Handling

## Plan Location

`/Users/than/Projects/epost-agent-kit-cli/plans/260307-1551-config-command/`

## Summary

- **Total phases**: 2
- **Estimated effort**: 4h
- **Status**: draft (active)

## Phases

| # | Title | Effort | Depends |
|---|-------|--------|---------|
| 1 | Explicit config handling in init | 2h | - |
| 2 | Standalone config command | 2h | Phase 1 |

## Key Findings

- `.epost-kit.json` and `.epost-ignore` already installed via generic file copy in init -- works but no merge support
- Only `core` package provides these files currently -- but architecture should support multi-package merge
- `settings.json` is the established pattern (explicit skip + merge) -- Phase 1 follows same pattern
- Config files live in install dir (`.claude/`, `.github/`, etc.) -- target-adapter aware

## Key Dependencies

- `src/domains/config/settings-merger.ts` -- `deepMerge()` reusable
- `src/commands/init.ts:409-429` -- generic file copy to modify
- Hook scripts read `.epost-kit.json` at runtime -- output path must not change

## Risks

- Low risk overall -- extends established patterns
- Config reset needs access to cached packages (`~/.epost-kit/packages/`)

## Unresolved Questions

1. Should `config set` validate against a schema, or allow arbitrary keys?
2. Should `.epost-ignore` support per-package sections (commented headers) for traceability?
3. Do any other packages besides `core` plan to ship `.epost-kit.json` or `.epost-ignore` overlays?
