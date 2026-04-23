---
phase: 2
title: "Version decision & package.json metadata audit"
effort: 20m
depends: [1]
---

# Phase 02 — Version & metadata

Document version decision and sanity-check `package.json` metadata before publish.

## Context

`ci-publish.sh` injects version via `npm version --no-git-tag-version` at CI time — local `package.json` version (`0.0.1`) is stale and does not need manual bumping. BUT package.json must still have correct metadata (description, keywords, repo URL, files allowlist).

## Requirements

- Version decision `0.1.0` documented (in `plan.md` — already done)
- `package.json` metadata audited: `description`, `keywords`, `repository`, `author`, `license`, `files`, `publishConfig`, `engines`
- No need to bump local `package.json` version field — CI handles it
- No CHANGELOG.md in this plan (auto-gen via `gh release --generate-notes`)

## Related Files

- `package.json` — metadata audit only, do NOT bump version locally
- `plan.md` — version decision recorded

## Steps

1. Read `package.json` in full
2. Verify each field against checklist:
   - `name`: `@aavn/epost-kit` ✓ (scoped)
   - `description`: present, accurate
   - `keywords`: representative (cli, agent-kit, claude-code, etc.)
   - `repository.url`: `git+https://github.com/Klara-copilot/epost-agent-kit-cli.git`
   - `author`: `Phuong Doan`
   - `license`: `MIT`
   - `files`: `["dist/", "README.md", "LICENSE"]` — verify no drift
   - `publishConfig.access`: `public`
   - `engines.node`: `>=18.0.0`
   - `bin.epost-kit`: `./dist/cli.js`
   - `type`: `module`
   - `exports`: valid
   - `prepublishOnly` script chains: `typecheck → lint → test → build`
3. If any field is wrong: edit `package.json`, stage as part of this phase's commit
4. Record version decision in `plan.md` Key Trade-offs (already done) — no action
5. Decision: skip authoring `CHANGELOG.md`. Auto-gen release notes are sufficient for a feature release in pre-1.0. Note as follow-up in phase-06.
6. If `package.json` was edited: commit as `chore: audit package.json metadata for v0.1.0 release`. If untouched: no commit for this phase.

## Todo

- [ ] Read `package.json` fully
- [ ] Verify all 12 metadata fields against checklist
- [ ] Confirm `files` allowlist is `["dist/", "README.md", "LICENSE"]` (no drift)
- [ ] Confirm `publishConfig.access` is `public`
- [ ] Confirm `prepublishOnly` chain intact
- [ ] If edits needed: commit with `chore:` prefix
- [ ] Decide + document: no CHANGELOG.md for this release

## Success Criteria

- All 12 metadata fields verified correct
- `npm view @aavn/epost-kit` will match repository identity post-publish
- No `CHANGELOG.md` created (intentional — follow-up noted)

## Risks

| Risk | Mitigation |
|---|---|
| `files` allowlist drifted to include extraneous paths | Verified in this phase; `npm pack --dry-run` in phase-03 is secondary check |
| `prepublishOnly` chain broken (e.g. test step removed) | Verified in this phase; phase-03 runs it end-to-end |
| Description/keywords stale | Audit + fix here — cheap |

## Unresolved

- None. Auto-gen notes decision documented in plan.md trade-offs table.
