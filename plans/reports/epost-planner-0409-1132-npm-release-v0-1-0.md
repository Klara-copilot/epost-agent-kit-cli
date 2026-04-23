---
date: 2026-04-09
agent: epost-planner
plan: plans/0409-1130-npm-release-v0-1-0/
status: READY
---

# Planner Report — Release @aavn/epost-kit v0.1.0

## Executive Summary

Phased release plan for shipping `@aavn/epost-kit` v0.1.0 to public npm registry. Ship-existing-code only; no source changes. Reuses existing `publish.yml` + `ci-publish.sh` mechanism — no new tooling proposed.

Version decision: **0.1.0** (minor bump from 0.0.2). Rationale: 3 new public CLI commands (inspect/manage/diagnose), 2 new IDE adapters (antigravity/jetbrains), behavior change in `update` command (smart-merge). First feature milestone beyond 0.0.x experiments.

## Plan Details

| Item | Value |
|---|---|
| Plan dir | `plans/0409-1130-npm-release-v0-1-0/` |
| Total phases | 6 (sequential) |
| Estimated effort | ~3h total |
| Platform | backend (Node.js CLI) |
| Breaking | false |
| Status | active |

### Phases

| # | Phase | Effort |
|---|---|---|
| 1 | Pre-release hygiene (dirty tree, LICENSE creation) | 30m |
| 2 | Version & package.json metadata audit | 20m |
| 3 | Local validation (prepublishOnly + pack + DRY_RUN) | 30m |
| 4 | Ship (push + trigger publish.yml) | 30m |
| 5 | Post-release verification (npm + npx + provenance) | 30m |
| 6 | Announce & follow-up (notes polish + journal + 48h monitor) | 20m |

### Trade-offs Documented

1. Version bump: 0.0.3 vs **0.1.0** vs 0.2.0 → picked **0.1.0** (minor)
2. Release channel: **latest** vs next → picked **latest**
3. Release notes: **gh --generate-notes** vs curated CHANGELOG.md → picked **auto-gen**
4. Dirty tree: **commit as chore:** vs gitignore vs leave → picked **commit**

## Key Findings

### Ground Truth Verified
- `.github/workflows/publish.yml` exists (workflow_dispatch with `version` input)
- `.github/scripts/ci-publish.sh` exists, supports `DRY_RUN=true`
- `npm view @aavn/epost-kit version` → `0.0.2`, dist-tags `{ latest: '0.0.2' }`
- Provenance attestation configured via OIDC (`id-token: write`)
- `prepublishOnly` chain: typecheck → lint → test → build

### Gap Found (resolved in phase-01)
- **`LICENSE` file is declared in `package.json` `files` allowlist but does NOT exist on disk.** Phase-01 creates MIT LICENSE (author `Phuong Doan`, year 2026). Not blocking publish (`npm` silently skips missing listed files) but a scoped public package declaring MIT should have the file.

### Dirty Tree (resolved in phase-01)
- `docs/proposals/signals.json` — timestamp-only regen (`generated` field, one line diff)
- `plans/reports/260409-1110-get-started-env-verify-epost-fullstack-developer.md` — untracked
- `plans/reports/260409-1110-kb-verification-epost-docs-manager.md` — untracked
- Resolution: single `chore:` commit in phase-01

### Cross-Plan Dependencies
- 2 active plans exist (`adapter-improvements`, `adapter-open-points`) — neither conflicts. They touch source code; this plan touches release meta only (package.json version, git tags, workflow dispatch). No file overlap. No `blockedBy`/`blocks` entries added.

## Risks Called Out

| Risk | Phase | Mitigation |
|---|---|---|
| Publish same version twice | phase-04 | `npm publish` errors fatally; must bump to 0.1.1 if re-ship needed |
| Provenance attestation fails | phase-04/05 | OIDC already configured; fallback to `--no-provenance` requires user approval |
| CDN propagation delay | phase-05 | Retry `npm view` up to 3 minutes |
| Install smoke test crash post-publish | phase-05 | Rollback playbook: `npm deprecate` immediately, ship 0.1.1 |
| `signals.json` re-drift after commit | phase-01 | Accepted — follow-up item queued for separate plan (gitignore vs deterministic regen) |
| Broken `prepublishOnly` chain | phase-03 | Local run catches before CI; hard gate before phase-04 |

## Security Called Out

- `npm pack --dry-run` scan for secrets (phase-03) — grep for `sk-`, `Bearer`, `password`, `API_KEY`, `SECRET`
- `files` allowlist verified restrictive (`dist/`, `README.md`, `LICENSE` only) — phase-02
- `--ignore-scripts` on publish prevents dependency postinstall hijack — already set in `ci-publish.sh`
- Provenance via OIDC — already configured in `publish.yml`

## Platform Implications

- Backend (Node.js CLI) only — no iOS/Android/Web impact
- Downstream consumers: `npx @aavn/epost-kit`, `npm i -g`, workflow dependents
- Blast radius: public scoped package — a bad publish affects anyone installing

## Verdict

**READY**

Plan is actionable. Ground truth verified via direct inspection of `package.json`, workflows, scripts, git state, and live `npm view`. One gap found (missing LICENSE on disk) and captured as phase-01 work. No blockers.

## Unresolved Questions

1. **LICENSE content source** — use standard OSI MIT template verbatim for phase-01? Default yes.
2. **Git tag creation timing** — `gh release create v0.1.0` in `publish.yml` implicitly creates the tag; confirm this matches intent vs explicit `git tag && git push` in phase-04. Default: let `gh release` handle it (current workflow design).
3. **`update` smart-merge as breaking change** — pre-1.0 we bundle under minor; strictly post-1.0 semver would require minor-bump signal. Default: bundle in 0.1.0, note in release notes, no breaking flag.
4. **`signals.json` auto-regeneration** — is a hook regenerating it every session? If yes, `.gitignore` is cleaner than re-committing. Orthogonal to this release; queued as phase-06 follow-up.
5. **Changesets/semantic-release adoption** — out of scope for this plan, queued as phase-06 follow-up.

---

**Status:** DONE
**Summary:** Created 6-phase release plan at `plans/0409-1130-npm-release-v0-1-0/` with plan.md + 6 phase files. Plan activated via `set-active-plan.cjs`. Ground truth verified (package.json, workflows, scripts, git state, npm view). One gap found (missing LICENSE on disk) captured in phase-01. No blockers.
