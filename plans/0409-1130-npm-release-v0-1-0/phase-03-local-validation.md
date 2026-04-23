---
phase: 3
title: "Local validation (prepublishOnly + pack + smoke test)"
effort: 30m
depends: [1, 2]
---

# Phase 03 — Local validation

Run `prepublishOnly` chain, `npm pack --dry-run`, tarball inspection, and install smoke test locally. Also dry-run the CI publish script with `DRY_RUN=true`.

## Context

Catches issues before triggering CI. Cheaper to debug a local failure than a half-completed CI publish.

`prepublishOnly` script (from `package.json`):
```
npm run typecheck && npm run lint && npm run test && npm run build
```

## Requirements

- `prepublishOnly` chain passes (all 4 steps green)
- `npm pack --dry-run` shows expected files only (dist/, README.md, LICENSE) and no secrets
- `DRY_RUN=true VERSION_INPUT=v0.1.0 bash .github/scripts/ci-publish.sh` succeeds
- Built tarball installs globally and `epost-kit --version` reports injected version
- No secrets detected in tarball

## Related Files

- `package.json` script chain
- `.github/scripts/ci-publish.sh` — supports local dry-run
- `dist/` — build output
- `/tmp/epost-kit-smoketest/` — temp dir for install test

## Steps

1. **Run full prepublishOnly chain locally:**
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   npm run build
   ```
   All four must exit 0. Read ACTUAL output — do not trust memory.

2. **Inspect `dist/` output:**
   - `ls -la dist/cli.js` — confirm executable bit set on unix
   - `head -1 dist/cli.js` — confirm shebang `#!/usr/bin/env node`

3. **Run `npm pack --dry-run`:**
   ```bash
   npm pack --dry-run 2>&1 | tee /tmp/epost-pack-dryrun.log
   ```
   - Verify file list contains: `dist/`, `README.md`, `LICENSE`, `package.json`
   - Verify file list does NOT contain: `src/`, `tests/`, `node_modules/`, `.env*`, `.github/`, `plans/`, `docs/`
   - Scan for secrets:
     ```bash
     grep -iE "(sk-|Bearer |password\s*=|API_KEY|SECRET)" /tmp/epost-pack-dryrun.log || echo "clean"
     ```

4. **Run full CI publish script in dry-run mode:**
   ```bash
   DRY_RUN=true VERSION_INPUT=v0.1.0 bash .github/scripts/ci-publish.sh
   ```
   - Confirms version injection works (temporarily mutates package.json — `git checkout package.json` after)
   - Confirms build works
   - Skips actual publish, runs `npm pack --dry-run` instead
   - After script finishes: `git checkout package.json` to revert version injection

5. **Install smoke test from real tarball:**
   ```bash
   cd /tmp && rm -rf epost-kit-smoketest && mkdir epost-kit-smoketest && cd epost-kit-smoketest
   npm pack /Users/ddphuong/Projects/agent-kit/epost-agent-kit-cli
   npm install -g ./aavn-epost-kit-*.tgz
   epost-kit --version
   epost-kit --help
   npm uninstall -g @aavn/epost-kit
   ```
   - `--version` should print `0.1.0` (if package.json was updated) OR `0.0.1` (the stale local value). Either is acceptable for smoke test — we're verifying the binary runs, not the version.
   - `--help` should exit 0 and list commands: `init`, `update`, `convert`, `inspect`, `manage`, `diagnose`, etc.

6. **Revert any temporary changes:**
   ```bash
   git status  # must be clean
   ```

## Todo

- [ ] `npm run typecheck` → 0
- [ ] `npm run lint` → 0
- [ ] `npm run test` → 0 (all vitest suites pass)
- [ ] `npm run build` → 0 (dist/cli.js present, shebang correct, executable)
- [ ] `npm pack --dry-run` shows expected files only
- [ ] Tarball file list contains no secrets
- [ ] Tarball file list contains no dev artifacts (src/, tests/, .github/, plans/)
- [ ] `DRY_RUN=true VERSION_INPUT=v0.1.0 bash .github/scripts/ci-publish.sh` → 0
- [ ] `git checkout package.json` to revert dry-run version injection
- [ ] Global install from tarball succeeds
- [ ] `epost-kit --version` runs
- [ ] `epost-kit --help` exits 0 with expected commands
- [ ] Global uninstall clean
- [ ] `git status` clean at end of phase

## Success Criteria

- All four `prepublishOnly` steps green
- Tarball contents match `files` allowlist exactly
- Zero secret hits in tarball scan
- Dry-run CI script reaches "Done" line
- Installed binary executes `--version` and `--help` without crash

## Risks

| Risk | Mitigation |
|---|---|
| Test flake during prepublish | Re-run once; if flake persists, debug before proceeding |
| `npm version` in dry-run mutates package.json and leaves dirty tree | Step 6: `git checkout package.json` |
| Global install collides with existing install | `npm uninstall -g @aavn/epost-kit` first, then re-install |
| Tarball accidentally includes `.env` or other secrets | Explicit grep scan in step 3 |
| Shebang missing on windows builds (non-issue for mac smoke test but worth noting) | `chmod` skip on win32 is intentional per package.json line 13 |

## Unresolved

- None. All validation steps are deterministic.
