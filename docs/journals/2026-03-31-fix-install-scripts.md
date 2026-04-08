# Fix Install Scripts - Install Completes but Binary Not Found

**Date**: 2026-03-31 14:35
**Severity**: High
**Component**: Install pipeline, self-update system
**Status**: Resolved

## What Happened

`install.sh` completed without errors but the `epost-kit` command was never available post-install. Root cause: script only copied kit data files and never installed the CLI binary itself.

## The Brutal Truth

Spent hours debugging what appeared to be a PATH issue. The real problem was the install script was fundamentally incomplete — it did half a job and called it success. Users would run the installer, see no errors, then get command-not-found. Unacceptable.

## Technical Details

**Before**: `install.sh` copied files to `~/.epost-kit/` but never built or linked the CLI binary. `npm link` was entirely missing.

**Error pattern**: User runs `install.sh` → script exits 0 → user runs `epost-kit --version` → zsh: command not found → user thinks install is broken.

## What We Tried

- Path variable debugging (wrong problem)
- Shell configuration checks (irrelevant)
- Finally audited the install script itself and found the gap

## Root Cause Analysis

**Design flaw**: Original script treated `epost-kit` as a data package, not a CLI tool requiring build + installation. No npm build step. No npm link.

**Why it happened**: Install was written before CLI needed binary installation — never updated when architecture changed.

## Changes Made

- **install.sh**: Complete rewrite — clone repo, `npm install`, `npm run build`, `npm link` with auto-sudo fallback
- **install.ps1**: Mirrored Windows version
- **self-update.ts**: Switched from npm registry to git-based (`git fetch`, `git pull`)
- **upgrade.ts**: Simplified to use git-based functions
- **install/README.md**: Corrected docs, removed invalid curl/tarball approaches

## Lessons Learned

1. **Always test the happy path to completion** — running installer and verifying command works post-install would have caught this immediately
2. **Install scripts are not data scripts** — if your tool is a binary, the install must build and link it
3. **Keep install and self-update aligned** — we now use git-based updates everywhere, not npm registry

## Next Steps

- Verify TypeScript build passes (done — clean)
- All 4 plan phases complete
- `epost-kit upgrade` works for git-based installs
- No further blockers
