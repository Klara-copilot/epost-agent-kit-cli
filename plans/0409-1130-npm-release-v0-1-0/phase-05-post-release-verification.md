---
phase: 5
title: "Post-release verification"
effort: 30m
depends: [4]
---

# Phase 05 — Post-release verification

Confirm `0.1.0` is fully live, installable, attested, and discoverable. Last gate before declaring success.

## Context

`npm publish` success ≠ end-user success. npm CDN propagation, provenance attestation, `verify-npm-registry.yml`, and clean-install smoke test all need to be confirmed independently.

## Requirements

- `npm view` reports `0.1.0` as latest
- `npx @aavn/epost-kit@0.1.0` installs and runs from a clean directory
- GH Release page exists with auto-generated notes
- Provenance badge visible on npm package page
- `verify-npm-registry.yml` passes on `master`

## Related Files

- `.github/workflows/verify-npm-registry.yml` — post-release smoke test workflow
- None to edit — this phase is verification only

## Steps

1. **Wait for CDN propagation** (~30-60s after phase-04 workflow success), then verify npm state:
   ```bash
   npm view @aavn/epost-kit version
   # expect: 0.1.0

   npm view @aavn/epost-kit dist-tags
   # expect: { latest: '0.1.0' }

   npm view @aavn/epost-kit time.0.1.0
   # expect: ISO timestamp of publish
   ```

2. **Clean-directory install smoke test** (simulates fresh user):
   ```bash
   cd /tmp && rm -rf epost-verify && mkdir epost-verify && cd epost-verify
   npx @aavn/epost-kit@0.1.0 --version
   # expect: 0.1.0
   npx @aavn/epost-kit@0.1.0 --help
   # expect: exit 0, lists commands (init, update, convert, inspect, manage, diagnose, ...)
   ```
   Read ACTUAL output — do not trust memory. If either command crashes, go to Rollback section immediately.

3. **Verify GH Release page:**
   ```bash
   gh release view v0.1.0
   # expect: title v0.1.0, body with auto-generated notes, asset list may be empty (no binaries — npm is the distribution)
   ```
   Also check in browser: `https://github.com/Klara-copilot/epost-agent-kit-cli/releases/tag/v0.1.0`

4. **Verify provenance attestation:**
   - Open `https://www.npmjs.com/package/@aavn/epost-kit` in browser
   - Look for "Provenance" or "Built and signed on GitHub Actions" badge on the `0.1.0` version
   - Alternative CLI check: `npm view @aavn/epost-kit@0.1.0 --json | grep -i "attestations\|provenance"`

5. **Verify git tag on remote:**
   ```bash
   git fetch --tags
   git tag -l v0.1.0
   git ls-remote origin refs/tags/v0.1.0
   ```

6. **Run / wait for `verify-npm-registry.yml` workflow:**
   ```bash
   gh run list --workflow=verify-npm-registry.yml --limit=1
   ```
   - If it auto-runs on schedule/push: wait for latest run
   - If manual: `gh workflow run verify-npm-registry.yml`
   - Must complete with `success`

7. **Optional: cross-platform install check** — have a teammate on a different OS run `npx @aavn/epost-kit@0.1.0 --help` (not blocking — nice-to-have)

## Todo

- [ ] `npm view @aavn/epost-kit version` → `0.1.0`
- [ ] `npm view @aavn/epost-kit dist-tags` → `{ latest: '0.1.0' }`
- [ ] `npx @aavn/epost-kit@0.1.0 --version` from clean tempdir runs OK
- [ ] `npx @aavn/epost-kit@0.1.0 --help` from clean tempdir runs OK
- [ ] `gh release view v0.1.0` shows generated notes
- [ ] Provenance badge visible on npmjs.com package page
- [ ] `git ls-remote origin refs/tags/v0.1.0` returns sha
- [ ] `verify-npm-registry.yml` latest run on master is `success`

## Success Criteria (all from plan.md must pass)

- `npm view @aavn/epost-kit version` → `0.1.0` ✓
- `npm view @aavn/epost-kit dist-tags` → `{ latest: '0.1.0' }` ✓
- `npx @aavn/epost-kit@0.1.0 --version` from clean tempdir → `0.1.0` ✓
- `npx @aavn/epost-kit@0.1.0 --help` exits 0 with expected commands ✓
- GH Release `v0.1.0` page exists with generated notes ✓
- Provenance badge visible on npm ✓
- Git tag `v0.1.0` on `origin/master` ✓
- `verify-npm-registry.yml` passes ✓

## Rollback (emergency only)

If any of the above fails in a way that affects end users:

| Severity | Action |
|---|---|
| Binary crashes on install | `npm deprecate @aavn/epost-kit@0.1.0 "critical bug — upgrade to 0.1.1 when available"` immediately |
| Provenance missing but otherwise working | Document in phase-06 follow-up; do NOT deprecate |
| Wrong files in tarball (e.g. secrets) | `npm deprecate` + investigate + ship `0.1.1` within 24h |
| Within 72h AND zero downloads AND catastrophic | `npm unpublish @aavn/epost-kit@0.1.0` (last resort) |

## Risks

| Risk | Mitigation |
|---|---|
| CDN propagation delay longer than expected | Retry `npm view` after 60s, up to 3 minutes |
| `npx` caches old tarball | Use `npx --yes @aavn/epost-kit@0.1.0 ...` or clear `~/.npm/_npx` |
| Provenance badge takes time to appear | Non-blocking — check again in 10 minutes before triggering deprecation |
| `verify-npm-registry.yml` flakes on network | Re-run once before declaring failure |

## Unresolved

- None.
