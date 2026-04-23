---
title: "Config System Redesign: dual-layer config, source tracking, web dashboard"
status: completed
created: 2026-04-10
updated: 2026-04-10
effort: 28h
phases: 7
platforms: [all]
breaking: false
blockedBy: []
blocks: []
supersedes: "260307-1551-config-command"
---

# Config System Redesign

## Scope Rationale

1. **Problem**: Monolithic 577-line `config.ts`, single-layer config, no source tracking, no web UI
2. **Why this way**: Claudekit-cli proves static facade + 3-level merge + web dashboard works
3. **Why now**: Config complexity blocks future features (per-user defaults, team sharing)
4. **Simplest value**: Dual-layer config with `--global`/`--local` flags (Phase 1-3)
5. **50% cut**: Drop web dashboard (Phases 5-6), keep CLI refactoring only

## Summary

Redesign config system from monolithic command to modular architecture:
- Static facade classes for global (`~/.epost-kit/config.json`) and project (`.claude/.epost-kit.json`) config
- 3-level merge: defaults -> global -> project with per-field source tracking
- Phase handler pattern to decompose 577-line config.ts
- Express + Vite + React SPA web dashboard (`config ui`)
- Security hardening: file permissions, prototype pollution guard

## Phases

| # | Phase | Effort | Depends | Status | File |
|---|-------|--------|---------|--------|------|
| 1 | Config Security Module | 2h | - | completed | [phase-01](./phase-01-config-security.md) |
| 2 | Config Manager Architecture | 4h | 1 | completed | [phase-02](./phase-02-config-managers.md) |
| 3 | Command Phase Handlers Refactor | 6h | 2 | completed | [phase-03](./phase-03-command-refactor.md) |
| 4 | CLI Registration Updates | 2h | 3 | completed | [phase-04](./phase-04-cli-registration.md) |
| 5 | REST API Server | 4h | 2 | completed | [phase-05](./phase-05-rest-api-server.md) |
| 6 | React Dashboard SPA | 6h | 5 | completed | [phase-06](./phase-06-react-dashboard.md) |
| 7 | Integration Testing & Cleanup | 4h | 1-6 | completed | [phase-07](./phase-07-integration-testing.md) |

## Critical Constraints

- **Backward-compatible**: existing `.epost-kit.json` reads as project-level, no migration needed
- **Lazy import**: Express/React only loaded on `config ui`, not in main CLI bundle
- **Static facades**: no DI framework, class static methods (like claudekit-cli)
- **File size**: every new file < 200 lines
- **Security**: file perms + prototype pollution guard on all config writes

## Dependencies

| Package | Type | Phase |
|---------|------|-------|
| express | prod | 5 |
| @types/express | dev | 5 |
| vite | dev | 6 |
| react | dev | 6 |
| react-dom | dev | 6 |
| @vitejs/plugin-react | dev | 6 |

## File Ownership Matrix

| Phase | Files Owned | No Overlap With |
|-------|-------------|-----------------|
| 1 | `src/domains/config/config-security.ts`, `src/shared/constants.ts` | 3-7 |
| 2 | `src/domains/config/global-config-manager.ts`, `project-config-manager.ts`, `config-merger.ts` | 3-7 |
| 3 | `src/commands/config/**`, deletes `src/commands/config.ts` | 1-2, 5-7 |
| 4 | `src/cli.ts` | 1-3, 5-7 |
| 5 | `src/domains/web-dashboard/server.ts`, `api/config-routes.ts`, `config-ui-command.ts` | 1-4, 6 |
| 6 | `src/domains/web-dashboard/ui/**` | 1-5, 7 |
| 7 | `tests/**` | 1-6 |

## Success Criteria

- [x] `config get/set/show` work with `--global`/`--local` flags
- [x] `config show --sources` displays where each value originates
- [x] Web dashboard displays and edits config via REST API
- [x] Existing `.epost-kit.json` reads as project-level without migration
- [x] Security: file perms + prototype pollution guard on all writes
- [x] All existing TUI functionality preserved
- [x] `npm run build` + `npm run lint` pass

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Web dashboard bundle size | Medium | Lazy import, only on `config ui` |
| Breaking existing config | Low | Backward-compatible read path |
| Port conflicts | Low | Auto-select 3456-3460, `--port` override |
| Express in main bundle | Medium | Dynamic import in config-ui-command.ts |

## Unresolved Questions

1. ~~Should global config schema be subset of project config, or identical?~~ → **RESOLVED**: identical schema (Validation Session 1)
2. Dashboard auth -- localhost-only binding sufficient, or need API key? (Recommend: localhost-only for v1)
3. Dashboard auto-reload on config file changes (fs.watch)? (Recommend: skip for v1)

## Validation Log

### Session 1 — 2026-04-10
**Trigger:** `/ck:plan --validate` before implementation
**Questions asked:** 6

#### Questions & Answers

1. **[Architecture]** Global config and project config — should they share the same Zod schema, or should global be a subset?
   - Options: Identical schema | Subset schema | Schema-free
   - **Answer:** Identical schema
   - **Rationale:** One schema to maintain, global just stores fewer fields. Simpler implementation.

2. **[Scope]** Phase 6 pre-builds React SPA into ui-dist/. How should the built assets be distributed?
   - Options: Commit to repo | Build at npm publish time | Build on-demand
   - **Answer:** Commit ui-dist/ to repo
   - **Rationale:** Simplest. Pre-built assets always available. Binary diffs acceptable for git history.

3. **[Tradeoffs]** Express adds ~2MB to global install. Dependency strategy?
   - Options: Production dependency | Optional peer dependency | Bundle with CLI
   - **Answer:** Production dependency
   - **Rationale:** Always available. npm install -g includes express. Acceptable size increase.

4. **[Assumptions]** Phase 4 registers --no-open flag for config ui. CAC doesn't natively support --no-* negation. How to handle?
   - Options: Use --no-open as-is | Use --open + negate | Rename to --no-browser
   - **Answer:** Use --no-open as-is
   - **Rationale:** CAC will parse it as a boolean flag. Acceptable even if double-negative is slightly confusing.

5. **[Architecture]** Source tracking granularity: leaf-level or top-level only?
   - Options: Leaf-level tracking | Top-level only
   - **Answer:** Leaf-level tracking
   - **Rationale:** Every leaf value gets source label. Most useful for dashboard display.

6. **[Architecture]** Server.ts route ordering: API routes mount before SPA catch-all?
   - Options: Confirmed | Needs discussion
   - **Answer:** Confirmed
   - **Rationale:** Critical for correct routing. API routes MUST mount before app.get('*').

#### Confirmed Decisions
- Global/project identical schema: identical — one schema, global stores fewer fields
- UI dist strategy: commit to repo — simplest distribution
- Express dep type: production dependency — always available, ~2MB acceptable
- CAC --no-open: use as-is — CAC parses as boolean flag
- Source tracking: leaf-level — most useful for dashboard
- API route ordering: API before SPA catch-all — confirmed

#### Action Items
- [x] Phase 2: use identical Zod schema for both managers
- [x] Phase 2: ConfigMerger tracks every leaf key with dot-notation source map
- [x] Phase 4: use `--no-open` as regular boolean flag
- [x] Phase 5: mount API routes before SPA catch-all in server.ts
- [x] Phase 6: commit ui-dist/ to repo, add to .gitignore exceptions

#### Impact on Phases
- Phase 2: ConfigMerger needs recursive leaf-level source tracking (not top-level only)
- Phase 5: server.ts must explicitly document API-before-SPA mount order
- Phase 6: ui-dist/ added to repo, .gitignore exception needed
