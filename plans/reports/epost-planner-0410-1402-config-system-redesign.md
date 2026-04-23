# Plan Report: Config System Redesign

**Date**: 2026-04-10
**Agent**: epost-planner
**Plan**: `plans/0410-1342-config-system-redesign/`
**Status**: ACTIVE

---

## Executive Summary

Created 7-phase implementation plan for config system redesign. Decomposes monolithic 577-line `config.ts` into modular architecture with dual-layer config (global + project), 3-level merge with per-field source tracking, and Express+Vite+React web dashboard.

## Plan Details

| # | Phase | Effort | Depends | Key Files |
|---|-------|--------|---------|-----------|
| 1 | Config Security Module | 2h | - | `src/domains/config/config-security.ts`, `src/shared/constants.ts` |
| 2 | Config Manager Architecture | 4h | 1 | `global-config-manager.ts`, `project-config-manager.ts`, `config-merger.ts` |
| 3 | Command Phase Handlers Refactor | 6h | 2 | `src/commands/config/**`, deletes `src/commands/config.ts` |
| 4 | CLI Registration Updates | 2h | 3 | `src/cli.ts` |
| 5 | REST API Server | 4h | 2 | `src/domains/web-dashboard/server.ts`, `api/config-routes.ts` |
| 6 | React Dashboard SPA | 6h | 5 | `src/domains/web-dashboard/ui/**` |
| 7 | Integration Testing & Cleanup | 4h | 1-6 | `tests/**` |

**Total effort**: 28h
**Dependencies**: express (prod), vite+react (dev)
**Breaking changes**: None (backward-compatible)
**Supersedes**: plan `260307-1551-config-command` (complete)

### Parallelization Opportunities

- Phases 1-2-3-4 are sequential (each depends on previous)
- Phase 5 can start after Phase 2 (independent of 3-4)
- Phase 6 depends on Phase 5 only
- Phase 7 depends on all

### File Ownership Matrix

No overlapping file ownership between phases. Each phase owns distinct files.

## Scope Rationale

1. **Problem**: Monolithic 577-line config.ts, single-layer config, no source tracking
2. **Why this way**: Claudekit-cli proves static facade + 3-level merge works
3. **Why now**: Config complexity blocks future features
4. **Simplest value**: Dual-layer config with --global/--local flags (Phases 1-3)
5. **50% cut**: Drop web dashboard (Phases 5-6), keep CLI refactoring only

## Cross-Plan Dependencies

- No `blockedBy` — no active plan conflicts with this scope
- No `blocks` — no other plan depends on this
- Supersedes completed plan `260307-1551-config-command`

## Verdict

**READY** — Architecture decisions locked (brainstorm report approved), no blocking dependencies, clear phase separation.

## Unresolved Questions

1. Should global config schema be identical to project config, or subset? (Recommend: identical)
2. Dashboard auth -- localhost-only sufficient for v1? (Recommend: yes)
3. Dashboard auto-reload via fs.watch? (Recommend: skip for v1)
