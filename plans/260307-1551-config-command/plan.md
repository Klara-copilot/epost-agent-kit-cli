---
title: "Config command and explicit config handling in init"
status: complete
created: 2026-03-07
updated: 2026-03-07
effort: 4h
phases: 2
platforms: [all]
breaking: false
---

# Config Command + Explicit Config Handling in Init

## Summary

Add a standalone `epost-kit config` command to view/edit `.epost-kit.json` and `.epost-ignore`, and make init handle these config files explicitly (like it does for `settings.json`) rather than relying on generic file copy.

## Current State

- `settings.json` -- explicitly merged by `mergeAndWriteSettings()` in init (line 606-614)
- `.epost-kit.json` -- silently copied as generic single file (init.ts:409-429)
- `.epost-ignore` -- silently copied as generic single file (init.ts:409-429)
- No CLI command to view/edit/reset these config files post-install

## Key Dependencies

- `src/commands/init.ts` -- current installation flow
- `src/domains/config/settings-merger.ts` -- existing merge pattern for settings.json
- `src/domains/config/config-loader.ts` -- existing config loading (cosmiconfig for CLI config, not kit config)
- Core package: `packages/core/.epost-kit.json`, `packages/core/.epost-ignore`

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Explicit config handling in init | 2h | complete | [phase-1](./phase-1-init-config-handling.md) |
| 2 | Standalone config command | 2h | complete | [phase-2-config-command.md](./phase-2-config-command.md) |

## Critical Constraints

- `.epost-kit.json` is a runtime config read by hooks (scout-block, session-init, etc.) -- must not break hook behavior
- `.epost-ignore` is gitignore-syntax read by scout-block.cjs -- merging must preserve comment structure
- Multiple packages could contribute `.epost-ignore` patterns in future (only core does now)
- Config files live inside install dir (`.claude/`) -- not project root

## Success Criteria

- [ ] Init explicitly processes `.epost-kit.json` and `.epost-ignore` (not generic copy)
- [ ] `epost-kit config show` displays current config values
- [ ] `epost-kit config set <key> <value>` updates `.epost-kit.json`
- [ ] `epost-kit config reset` restores defaults from installed packages
- [ ] `epost-kit config ignore` shows/edits `.epost-ignore` patterns
- [ ] Existing hook scripts continue working after changes
