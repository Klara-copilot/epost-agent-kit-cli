---
title: "Release @aavn/epost-kit v0.1.0 to public npm"
status: active
created: 2026-04-09
updated: 2026-04-09
effort: 3h
phases: 6
platforms: [backend]
breaking: false
---

# Release @aavn/epost-kit v0.1.0

Ship accumulated changes since v0.0.2 to public npm registry via existing `publish.yml` workflow.
Ship-existing-code only — no source changes.

## Scope Rationale (5-Why)

1. **Problem:** 7 commits + new public CLI surface accumulated since v0.0.2 — need versioned release for downstream consumers
2. **Why this way:** existing `publish.yml` + `ci-publish.sh` mechanism already in place — reuse, do not rebuild
3. **Why now:** feature-bearing commits (new `inspect/manage/diagnose` commands, 2 new IDE adapters, `update` smart-merge behavior change) deserve a minor bump
4. **Simplest MVP:** version bump → trigger workflow → verify npm
5. **Cut 50%:** drop curated CHANGELOG authoring (use `gh --generate-notes`), drop standalone announce phase — fold into post-verification

## Key Trade-offs

| Decision | Options | Pick | Rationale |
|---|---|---|---|
| Version bump | 0.0.3 / **0.1.0** / 0.2.0 | **0.1.0** | New public CLI commands + behavior change in `update` + 2 new adapters = first feature milestone beyond 0.0.x experiments. Pre-1.0 semver is loose but minor signals "new surface" to downstream |
| Release channel | **latest** / next (beta) | **latest** | No experimental-only changes; features landed behind merged PRs #12 and #13, both reviewed |
| Release notes | **gh --generate-notes** / curated CHANGELOG.md | **gh auto-gen** | No existing CHANGELOG infra; 7 commits with conventional messages — auto-gen is sufficient. Curated changelog is a future improvement (noted in phase-06) |
| Dirty tree | commit / gitignore / leave | **commit** as `chore:` | `signals.json` is auto-generated timestamp drift (one-line `generated` field); plan reports are legit artifacts. Combine into one `chore:` commit before tagging |

## Pre-Investigated State (Ground Truth)

| Item | Value |
|---|---|
| Package name | `@aavn/epost-kit` (scoped public) |
| Current npm latest | `0.0.2` (2026-04-06) |
| Target version | `0.1.0` (v prefix for workflow input: `v0.1.0`) |
| package.json local | `0.0.1` (stale — CI injects via `npm version --no-git-tag-version`) |
| Commits since v0.0.2 | 7 (`ec45cd6` ← `067a54…`) |
| Node engine | `>=18.0.0` |
| Publish mechanism | `.github/workflows/publish.yml` (workflow_dispatch) → `.github/scripts/ci-publish.sh` |
| Provenance | enabled via OIDC (`id-token: write`) |
| `files` allowlist | `dist/`, `README.md`, `LICENSE` |
| **Gap found** | `LICENSE` file NOT present at repo root (listed in `files` but missing on disk) — phase-01 resolves |
| Dirty files | `M docs/proposals/signals.json` (timestamp regen), `?? plans/reports/*.md` (2 files) |

## Phases

| # | Phase | Effort | Status | File |
|---|---|---|---|---|
| 1 | Pre-release hygiene | 30m | pending | [phase-01](./phase-01-pre-release-hygiene.md) |
| 2 | Version & metadata | 20m | pending | [phase-02-version-and-metadata.md](./phase-02-version-and-metadata.md) |
| 3 | Local validation | 30m | pending | [phase-03-local-validation.md](./phase-03-local-validation.md) |
| 4 | Ship (trigger publish) | 30m | pending | [phase-04-ship.md](./phase-04-ship.md) |
| 5 | Post-release verification | 30m | pending | [phase-05-post-release-verification.md](./phase-05-post-release-verification.md) |
| 6 | Announce & follow-up | 20m | pending | [phase-06-announce-and-followup.md](./phase-06-announce-and-followup.md) |

## Operational Concerns

### Rollback

| Window | Action | Command |
|---|---|---|
| Any time | Deprecate (soft) | `npm deprecate @aavn/epost-kit@0.1.0 "reason — upgrade to 0.1.1"` |
| Within 72h AND zero downloads | Unpublish (hard) | `npm unpublish @aavn/epost-kit@0.1.0` |
| After 72h | Only deprecate + ship `0.1.1` forward-fix | (same version cannot be re-published) |

### Pre-flight checklist (must be green before phase-04)

- [ ] All CI workflows green on `master` HEAD
- [ ] No open P0 bugs referencing v0.1.0 scope
- [ ] Working tree clean (phase-01 done)
- [ ] `NPM_TOKEN` secret valid in repo settings (inherited — not rotated)
- [ ] `prepublishOnly` passes locally (phase-03)
- [ ] `npm pack --dry-run` tarball sane (phase-03)

### Blast radius

Public scoped package. Bad publish affects anyone running `npx @aavn/epost-kit@0.1.0` or `npm i -g`. Local `npm pack` smoke test + `DRY_RUN=true` script run in phase-03 is mandatory.

### Monitoring (48h window post-release)

- `verify-npm-registry.yml` workflow output
- `npm view @aavn/epost-kit` download stats
- GitHub issue tracker for install failures
- Provenance badge on `npmjs.com/package/@aavn/epost-kit`

### Failure modes

| Failure | Detection | Recovery |
|---|---|---|
| `prepublishOnly` fails locally | phase-03 red | Fix → re-run → do not proceed |
| CI publish fails before `npm publish` | workflow red, version un-published | Re-run workflow with same `v0.1.0` input |
| CI publishes but GH release step fails | workflow red, npm has 0.1.0 | Run `gh release create v0.1.0 --generate-notes` manually |
| Published then smoke test fails | phase-05 red | `npm deprecate` immediately → ship fix as `0.1.1` |
| Provenance attestation fails | CI log, npm page no badge | Check OIDC `id-token: write` permission; fall back to `--no-provenance` ONLY with user approval |
| Same version re-publish attempted | CI error: "cannot publish over previously published version" | Bump to `0.1.1` |

### Security

- No secrets in tarball → `npm pack --dry-run` output scanned in phase-03 (grep for `.env`, `token`, `password`, `API_KEY`)
- `files` allowlist verified to restrict to `dist/`, `README.md`, `LICENSE` (already correct — confirm no drift in phase-02)
- `--ignore-scripts` on publish prevents postinstall hijack — confirmed set in `ci-publish.sh`
- Provenance via OIDC — verified enabled in `publish.yml`

## Success Criteria (all must pass)

- [ ] `npm view @aavn/epost-kit version` → `0.1.0`
- [ ] `npm view @aavn/epost-kit dist-tags` → `{ latest: '0.1.0' }`
- [ ] `npx @aavn/epost-kit@0.1.0 --version` from clean tempdir → `0.1.0`
- [ ] `npx @aavn/epost-kit@0.1.0 --help` exits 0 and shows expected commands
- [ ] GH Release `v0.1.0` page exists with auto-generated notes
- [ ] Provenance badge visible on `npmjs.com/package/@aavn/epost-kit`
- [ ] Git tag `v0.1.0` exists on `origin/master`
- [ ] `verify-npm-registry.yml` workflow passes post-release

## Canonical References

- `.github/workflows/publish.yml` — workflow_dispatch entrypoint
- `.github/scripts/ci-publish.sh` — version injection + build + publish
- `.github/workflows/verify-npm-registry.yml` — post-release smoke test
- `package.json` lines 21-25 (files allowlist), line 30-32 (publishConfig), line 19 (prepublishOnly)

## Unresolved Questions

1. **LICENSE file gap** — MIT declared in `package.json`, listed in `files`, but not present on disk. Should phase-01 create an MIT LICENSE file (author `Phuong Doan`, year 2026), or remove `LICENSE` from `files` allowlist? Default assumption in phase-01: **create it** (aligns with stated license).
2. **Git tag creation timing** — `gh release create v0.1.0` in `publish.yml` implicitly creates the tag on target sha. Confirm this matches intent, or should phase-04 explicitly `git tag v0.1.0 && git push origin v0.1.0` before triggering workflow? Default: **let `gh release create` handle it** (current workflow design).
3. **Changeset automation follow-up** — user did not ask for this, noted as future improvement in phase-06. Adopt `changesets` or `semantic-release` for next release cycle? Out of scope for this plan.
4. **`update` smart-merge behavior change** — technically a behavior change on an existing command. Strictly speaking post-1.0 semver would require minor bump. Pre-1.0 we bundle it into 0.1.0 but call it out in release notes. Worth a breaking-change flag? Default: **no, note in release notes only** (downstream impact is "safer, not breaking").
