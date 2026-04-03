---
updated: 2026-04-03
title: "Add npm install CI tests for @aavn/epost-kit"
description: "Extend test-install.yml with npm-pack-based install jobs (every PR) and a separate registry verification workflow (post-publish/manual)"
status: done
priority: P1
effort: 1.5h
branch: fix/lint-cleanup-npm-release-docs
tags: [ci, npm, install, testing, distribution]
created: 2026-04-03
blockedBy: []
blocks: []
---

# Add npm Install CI Tests

## Context

Package `@aavn/epost-kit@0.0.1` is now published to npmjs.com as the primary distribution
method. The existing `test-install.yml` only covers `install.sh` / `install.ps1` / `install.cmd`
(curl/irm scripts). The npm pathway has no CI coverage.

**Tarball:** `aavn-epost-kit-0.0.1.tgz` (258.9 kB, 482 files)
**Binary:** `epost-kit` (registered in `bin`)

## Two-Layer Test Strategy

| Layer | How | Trigger | Purpose |
|-------|-----|---------|---------|
| **npm pack** | Build → `npm pack` → `npm install -g ./tarball` | Every PR/push | Verify installability from source, fast feedback |
| **npm registry** | `npm install -g @aavn/epost-kit` | `workflow_dispatch` only | Verify live registry publish is correct |

The pack layer runs on every CI run (no external dependency). The registry layer is manual
because: (a) the published version won't change on every PR, and (b) registry propagation
latency can cause flaky failures.

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Add npm-pack install jobs to `test-install.yml` | done | phase-01.md |
| 2 | Add `verify-npm-registry.yml` workflow | done | phase-02.md |
| 3 | Update `report-results` job dependencies | done | phase-03.md |

## Files to Modify

- `.github/workflows/test-install.yml` — add `test-npm-pack-unix` + `test-npm-pack-windows` jobs + update `report-results`
- `.github/workflows/verify-npm-registry.yml` — NEW file, manual-trigger only

## Success Criteria

- [ ] `npm run lint` passes (no new ESLint errors)
- [ ] `test-npm-pack-unix` job passes in CI (matrix: ubuntu + macos × Node 20 + 22)
- [ ] `test-npm-pack-windows` job passes in CI (matrix: Node 20 + 22)
- [ ] `verify-npm-registry.yml` exists and is structurally valid
- [ ] `report-results` includes npm pack job statuses

## Validation Log

### Session 1 — 2026-04-03
**Trigger:** Pre-implementation validation interview
**Questions asked:** 5

#### Questions & Answers

1. **[Risk]** Phase 1 installs the tarball with `(Get-Item .\aavn-epost-kit-*.tgz).FullName`. How should we resolve the tarball filename on Windows?
   - Options: `npm pack --json` | Keep glob as-is | Explicit filename
   - **Answer:** `npm pack --json`
   - **Rationale:** Deterministic filename extraction; eliminates stale-artifact risk.

2. **[Assumption]** Does `epost-kit init --dry-run` exist in the current CLI?
   - Options: Yes, it exists | No — replace with --help | No — remove smoke test
   - **Answer:** Yes, but use `epost-kit install` instead
   - **Custom input:** "should use epost-kit install instead"
   - **Rationale:** `epost-kit install` is the more representative smoke test command.

3. **[Architecture]** Should npm-pack jobs block PRs (required checks)?
   - Options: Required checks | Informational only | Unix required, Windows optional
   - **Answer:** Required checks
   - **Rationale:** Strong signal quality from day one; pack failures = broken distribution.

4. **[Assumption]** Is `epost-kit doctor` expected to fail on a clean CI runner?
   - Options: Expected to fail — keep `|| true` | Remove doctor | Doctor should pass
   - **Answer:** Expected to fail — keep `|| true`
   - **Rationale:** Doctor checks external deps (Claude auth, git config) absent in CI.

5. **[Scope]** Node.js version matrix — 18+20 or adjust?
   - Options: 18+20 as planned | 20+22 | 18+20+22
   - **Answer:** 20+22
   - **Rationale:** Node 18 is EOL. Covering active LTS (20) and next LTS (22) is the right target.

#### Confirmed Decisions
- Windows tarball install: `npm pack --json` — deterministic, no glob risk
- Smoke test command: `epost-kit install` — more representative than `init --dry-run`
- npm-pack jobs: required checks — block PRs on failure
- `doctor` in CI: keep `|| true` — expected to fail, not a signal we care about
- Node matrix: `[20, 22]` — drop EOL Node 18, add Node 22 LTS

#### Action Items
- [ ] Update Phase 1: Windows install → `npm pack --json` pattern
- [ ] Update Phase 1: Smoke test → `epost-kit install` (both Unix and Windows)
- [ ] Update Phase 1: Node matrix → `[20, 22]`
- [ ] Update Phase 2: Node matrix → `[20, 22]`

#### Impact on Phases
- Phase 1: Windows tarball install + smoke test command + Node matrix all updated
- Phase 2: Node matrix updated
- Phase 3: No changes (required checks already the plan)
