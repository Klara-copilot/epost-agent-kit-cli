---
title: "Fix Windows PowerShell one-liner instructions"
description: "Replace broken Invoke-Expression one-liner with temp-file approach in README docs"
status: completed
priority: P1
effort: 15m
branch: master
tags: [docs, windows, bugfix]
created: 2026-04-01
completed: 2026-04-01
---

# Fix Windows PowerShell One-Liner Instructions

## Problem

Two bugs in the documented Windows PowerShell install one-liner:

1. **`Invoke-Expression` receives `System.Object[]`** -- `gh api ... --jq` pipes output as array of lines. `Invoke-Expression` requires a single `[string]`, so it fails silently or errors.
2. **`&&` operator invalid in PS 5.1** -- `&&` (pipeline chain) was added in PowerShell 7. PS 5.1 users (default on Win 10/11) get a parse error.

## Root Cause

The correct temp-file one-liner already exists in `install.ps1` header (line 10) but was never propagated to the README files.

## Correct One-Liner

```powershell
$temp = Join-Path $env:TEMP 'epost-kit-install.ps1'; gh api repos/Klara-copilot/epost-agent-kit-cli/contents/install/install.ps1 --jq '.content | @base64d' | Set-Content -Path $temp; powershell -NoProfile -ExecutionPolicy Bypass -File $temp; Remove-Item $temp -Force
```

Why this works:
- `;` separators (valid in PS 5.1+)
- Pipes `gh` output to `Set-Content` (handles array-to-file natively)
- Executes saved `.ps1` file (no `Invoke-Expression` on raw string)
- Cleans up temp file

## Phases

| # | Phase | Status | Files | Effort |
|---|-------|--------|-------|--------|
| 1 | [Replace one-liners in READMEs](./phase-01-fix-windows-oneliner.md) | completed | `README.md`, `install/README.md` | 15m |

## Risk Assessment

| Risk | L x I | Mitigation |
|------|-------|------------|
| Correct one-liner has own bug | Low x High | Already tested in install.ps1 header; matches CI workflow |
| Other docs reference old one-liner | Low x Low | Grep repo for `Invoke-Expression` patterns |

## Rollback

Git revert the commit. No runtime changes, docs-only.

## Success Criteria

- [x] No `Invoke-Expression $script` pattern in any README
- [x] No `&&` in PowerShell code blocks in any README
- [x] PS one-liner in READMEs matches `install.ps1` header comment
