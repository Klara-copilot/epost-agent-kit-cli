---
phase: 4
title: "Ship (push hygiene + trigger publish workflow)"
effort: 30m
depends: [1, 2, 3]
---

# Phase 04 — Ship

Push hygiene commit, confirm CI green on master, trigger `publish.yml` with `v0.1.0`, monitor to completion.

## Context

This is the point of no return. Once `npm publish` succeeds, version `0.1.0` is permanent — the same version can never be re-published (only deprecated or superseded).

## Requirements

- Pre-flight checklist (from `plan.md`) all green
- `publish.yml` workflow triggered with `version: v0.1.0`
- CI run monitored to completion
- `npm publish --provenance` step succeeds
- `gh release create v0.1.0 --generate-notes` step succeeds
- Git tag `v0.1.0` exists on remote (created by `gh release`)

## Related Files

- `.github/workflows/publish.yml` — canonical workflow
- `.github/scripts/ci-publish.sh` — canonical publish script
- No source changes in this phase — release mechanism only

## Pre-flight Checklist (must all be ✓ before step 3)

- [ ] Working tree clean (`git status --short` empty)
- [ ] Phase-01 `chore:` commit on local `master`
- [ ] Phase-02 metadata audit passed
- [ ] Phase-03 all validations green
- [ ] `master` up-to-date with `origin/master` (rebase/pull if needed)
- [ ] Latest `ci.yml` run on `master` HEAD is green
- [ ] No open P0 issues referencing `@aavn/epost-kit`
- [ ] `NPM_TOKEN` secret exists in repo settings (verify via GitHub UI or previous successful publish)

## Steps

1. **Sync and push hygiene commit:**
   ```bash
   git fetch origin
   git status --short  # must be clean
   git pull --ff-only origin master  # verify up-to-date
   git push origin master  # pushes phase-01 chore commit
   ```

2. **Wait for `ci.yml` to pass on `master` HEAD:**
   ```bash
   gh run list --workflow=ci.yml --branch=master --limit=1
   gh run watch  # or just wait, poll every 30s
   ```
   - Must see `completed success` on the sha at `origin/master`
   - If CI fails → STOP. Debug. Do not proceed.

3. **Trigger publish workflow:**
   ```bash
   gh workflow run publish.yml -f version=v0.1.0
   ```

4. **Monitor publish run:**
   ```bash
   gh run list --workflow=publish.yml --limit=1
   gh run watch <run-id>
   ```
   - Watch for:
     - `npm ci` step passes
     - `ci-publish.sh` logs `==> Version: 0.1.0`
     - `ci-publish.sh` logs `==> Publishing to npm`
     - `npm publish` returns `+ @aavn/epost-kit@0.1.0`
     - Provenance attestation line in output (`Provenance:` or `sigstore` keywords)
     - `gh release create v0.1.0 ...` step passes

5. **If ANY CI step fails:**
   - If failure is BEFORE `npm publish` → publish did not happen → safe to re-run workflow with same `v0.1.0` input
   - If failure is AT `npm publish` → check if version was actually published: `npm view @aavn/epost-kit@0.1.0` → if present, the publish succeeded (just the GH release or post-step failed); if absent, re-run workflow
   - If failure is AFTER `npm publish` (e.g. `gh release` step) → version is published; run `gh release create v0.1.0 --generate-notes --title v0.1.0` manually to finish
   - NEVER attempt to re-publish the same version — bump to `0.1.1` if publish succeeded but content is wrong

## Todo

- [ ] Pre-flight checklist all ✓
- [ ] `git pull --ff-only` clean
- [ ] `git push origin master` succeeds
- [ ] `ci.yml` green on pushed sha
- [ ] `gh workflow run publish.yml -f version=v0.1.0` dispatched
- [ ] Workflow run id captured
- [ ] `npm publish` step shows success in logs
- [ ] `gh release create` step shows success in logs
- [ ] Workflow completes with overall `success` status

## Success Criteria

- `gh run list --workflow=publish.yml --limit=1` shows most recent run as `completed success`
- `npm view @aavn/epost-kit version` (from any machine, any directory) returns `0.1.0` within ~60s of workflow completion
- `git ls-remote origin refs/tags/v0.1.0` returns a sha

## Risks

| Risk | Mitigation |
|---|---|
| `NPM_TOKEN` expired or revoked | Pre-flight check; if expired, rotate via npm automation token UI |
| OIDC provenance permission drift | Workflow `permissions: id-token: write` already set; if it fails, phase-05 falls back to manual `--no-provenance` retry (requires user approval) |
| Multiple publish runs triggered accidentally | Second run will fail on `npm publish` with "cannot publish over existing version" — harmless |
| Hygiene commit introduces test regression | Caught by step 2 (ci.yml green on master) before trigger |
| `gh release create` fails because tag already exists | Manual `gh release create` with `--target <sha>` in recovery |
| Network failure during `npm publish` | `npm publish` is not transactional at npm registry — rare but possible. Check `npm view` status and decide |

## Unresolved

- None. Monitoring commands are well-defined.
