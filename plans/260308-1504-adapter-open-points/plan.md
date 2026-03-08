---
title: "Adapter open points: CursorAdapter, .mdc rules, handoff graph"
status: active
created: 2026-03-08
updated: 2026-03-08
effort: 8h
phases: 4
platforms: [all]
breaking: false
---

# Adapter Open Points

## Summary

Fix broken Cursor pass-through (currently uses ClaudeAdapter unchanged), generate `.cursor/rules/*.mdc` files for Cursor target, design and add handoff graph to all 15 kit agents, and improve Task tool warning fidelity.

## Key Dependencies

- Kit repo: `/Users/than/Projects/epost_agent_kit/packages/*/agents/` (Phase 3 — cross-repo)
- Cursor agent format: 5 YAML fields only (name, description, model, readonly, background)
- Cursor rules: `.cursor/rules/*.mdc` with 3 frontmatter fields (description, globs, alwaysApply)

## Execution Strategy

Sequential. Phase 1 (CursorAdapter) is prerequisite for Phase 2 (.mdc generation). Phase 3 (handoffs) is independent. Phase 4 (Task tool warning) depends on Phase 1.

## Phases

| # | Phase | Effort | Status | File |
|---|-------|--------|--------|------|
| 1 | CursorAdapter — real transform | 2h | pending | [phase-01](./phase-01-cursor-adapter.md) |
| 2 | Generate .cursor/rules/*.mdc | 2h | pending | [phase-02](./phase-02-cursor-rules-mdc.md) |
| 3 | Handoff graph for 15 agents | 2.5h | pending | [phase-03](./phase-03-handoff-graph.md) |
| 4 | Task tool conditional warning | 1.5h | pending | [phase-04](./phase-04-task-tool-warning.md) |

## Critical Constraints

- CursorAdapter must NOT break ClaudeAdapter (separate class, not shared)
- `.mdc` files go inside `.cursor/rules/` (not project root)
- Handoffs are additive — no existing agent behavior changes
- Cursor Task tool bug is unresolved as of March 2026

## Success Criteria

- [ ] `epost-kit init --target cursor` produces agents with only (name, description, model, readonly, background)
- [ ] `epost-kit init --target cursor` generates `.cursor/rules/epost-kit.mdc`
- [ ] All 15 kit agents have `handoffs:` frontmatter where applicable
- [ ] Task tool warning only fires when agent body references Task tool
