---
date: 2026-03-08
agent: epost-planner
plan: plans/260308-1424-adapter-improvements/
status: READY
---

# Plan Report: IDE Adapter Improvements

## Executive Summary

Created 5-phase plan to fix critical bugs in VS Code adapter (hook matchers silently dropped, .epost-ignore path not transformed), add compatibility warning system, decouple hardcoded handoffs to agent frontmatter, assess Cursor adapter needs, and evaluate VS Code native `.claude/` reading.

## Plan Details

| # | Phase | Effort | Depends |
|---|-------|--------|---------|
| 1 | Fix VS Code hook matchers + path transform | 2h | -- |
| 2 | Compatibility warning system | 2h | 1 |
| 3 | Decouple handoffs to agent frontmatter | 3h | 1, 2 |
| 4 | Cursor adapter assessment | 3h | -- |
| 5 | VS Code native agent detection | 2h | 1, 2 |

Total effort: 12h across 5 phases. Phases 1 and 4 can run in parallel.

## Key Findings from Codebase Analysis

- `transformHooks` (copilot-adapter.ts:143) reads `g.hooks` but completely ignores `g.matcher` -- all hooks become unconditional
- `.epost-kit.json` contains `.claude/.epost-ignore` path (line 41) -- never transformed for VS Code
- `AGENT_HANDOFFS` hardcoded for 5 agents (line 47-86) -- adding agents requires adapter code changes
- `parseFrontmatter` only handles flat key:value -- needs enhancement for nested handoffs YAML
- `serializeFrontmatter` already handles handoffs serialization (line 142-155) -- output side is ready

## Verdict

**READY** -- All phases have clear scope, identified files, and implementation steps.

## Unresolved Questions

1. Does VS Code Copilot hooks.json support a `matcher`/`pattern` field? (Phase 1 research-first task)
2. What does VS Code Copilot 2026 auto-read from `.claude/`? (Phase 5 research)
3. Does Cursor 2026 use same agent YAML as Claude Code? (Phase 4 research)
4. Source agent .md files live in kit packages repo -- handoff frontmatter additions need coordinated PR (Phase 3)
