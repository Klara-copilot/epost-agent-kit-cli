---
title: "IDE adapter improvements: VS Code bug fixes, warnings, and handoff decoupling"
status: active
created: 2026-03-08
updated: 2026-03-08
effort: 12h
phases: 5
platforms: [all]
breaking: false
---

# IDE Adapter Improvements

## Summary

Fix critical bugs in CopilotAdapter (hook matchers silently dropped, .epost-ignore path not transformed), add a compatibility warning system for dropped features, decouple hardcoded handoffs into agent frontmatter, assess Cursor adapter needs, and evaluate VS Code native `.claude/` reading.

## Current State

- **ClaudeAdapter** (`claude-adapter.ts`): Pass-through for Claude Code + Cursor. Same class, constructor takes `target` param
- **CopilotAdapter** (`copilot-adapter.ts`): Full transformation for VS Code GitHub Copilot
- Factory in `target-adapter.ts`: `claude` -> ClaudeAdapter, `cursor` -> ClaudeAdapter("cursor"), `vscode` -> CopilotAdapter
- Hook `matcher` field (e.g., `"Edit|Write|MultiEdit"`) silently dropped during VS Code transform -- hooks fire unconditionally
- Prompt-type hooks silently dropped with no user feedback
- `AGENT_HANDOFFS` hardcoded in adapter -- any new agent requires code change
- `.epost-kit.json` contains `.claude/.epost-ignore` path -- not transformed for VS Code target

## Key Dependencies

- `src/domains/installation/target-adapter.ts` -- interface, factory, frontmatter utils
- `src/domains/installation/copilot-adapter.ts` -- VS Code transform logic
- `src/domains/installation/claude-adapter.ts` -- pass-through for Claude/Cursor
- `src/commands/init.ts` -- adapter usage during install (line 392)
- `src/domains/config/kit-config-merger.ts` -- writes .epost-kit.json
- `.claude/settings.json` -- hook source with matchers
- `.claude/agents/*.md` -- agent frontmatter (handoffs will move here)

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | Fix VS Code hook matchers + path transform | 2h | pending | [phase-1](./phase-1-vscode-bugfixes.md) |
| 2 | Compatibility warning system | 2h | pending | [phase-2](./phase-2-warning-system.md) |
| 3 | Decouple handoffs to agent frontmatter | 3h | pending | [phase-3](./phase-3-handoff-decoupling.md) |
| 4 | Cursor adapter assessment | 3h | pending | [phase-4](./phase-4-cursor-adapter.md) |
| 5 | VS Code native agent detection | 2h | pending | [phase-5](./phase-5-vscode-native.md) |

## Critical Constraints

- Copilot hooks.json format supports `matcher` equivalent or it does not -- Phase 1 must verify actual Copilot hooks schema
- Agent frontmatter parser (`parseFrontmatter`) is simple key:value -- nested `handoffs:` needs `serializeFrontmatter` (already handles it)
- Changes to adapter interface affect all 3 targets -- keep interface backward-compatible
- Phases 4 and 5 are research-first -- may result in "no change needed" decisions

## Success Criteria

- [ ] VS Code hooks preserve matcher semantics or warn clearly when dropped
- [ ] `.epost-kit.json` paths transformed for VS Code target
- [ ] User sees compatibility report after VS Code install listing dropped features
- [ ] `AGENT_HANDOFFS` removed from copilot-adapter.ts; handoffs read from frontmatter
- [ ] Cursor adapter decision documented (separate class or pass-through with tweaks)
- [ ] VS Code native `.claude/` reading assessed; adapter strategy updated if needed
