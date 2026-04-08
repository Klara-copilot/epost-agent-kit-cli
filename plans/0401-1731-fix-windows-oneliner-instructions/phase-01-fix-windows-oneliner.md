---
phase: 1
title: "Replace broken Windows PowerShell one-liners in READMEs"
status: completed
priority: P1
effort: 15m
completed: 2026-04-01
---

# Phase 1: Fix Windows PowerShell One-Liner

## Overview

Replace the broken `Invoke-Expression` one-liner with the correct temp-file approach in both README files.

## Files to Modify

| File | Line(s) | Current (broken) | Replacement |
|------|---------|-------------------|-------------|
| `README.md` | 20 | `$script = gh api ... --jq '...' ; Invoke-Expression $script` | Temp-file one-liner |
| `install/README.md` | 53 | Same broken pattern | Same temp-file one-liner |

## Broken Pattern (to find & replace)

```powershell
$script = gh api repos/Klara-copilot/epost-agent-kit-cli/contents/install/install.ps1 --jq '.content | @base64d'; Invoke-Expression $script
```

## Correct Replacement

```powershell
$temp = Join-Path $env:TEMP 'epost-kit-install.ps1'; gh api repos/Klara-copilot/epost-agent-kit-cli/contents/install/install.ps1 --jq '.content | @base64d' | Set-Content -Path $temp; powershell -NoProfile -ExecutionPolicy Bypass -File $temp; Remove-Item $temp -Force
```

Source: `install/install.ps1` line 10 (already tested).

## Implementation Steps

1. Open `README.md`
2. Replace line 20 PowerShell one-liner with correct temp-file version
3. Open `install/README.md`
4. Replace line 53 PowerShell one-liner with correct temp-file version
5. Grep entire repo for any remaining `Invoke-Expression.*gh api` patterns -- fix if found
6. Grep for `&&` inside PowerShell code blocks -- fix if found

## Verification

```bash
# No broken patterns remain
grep -r "Invoke-Expression \$script" README.md install/README.md
# Should return nothing

# Correct pattern present
grep -c "Set-Content -Path \$temp" README.md install/README.md
# Should return 1 for each file
```

## Success Criteria

- [x] `README.md` PowerShell block uses temp-file one-liner
- [x] `install/README.md` PowerShell block uses temp-file one-liner
- [x] No `Invoke-Expression $script` pattern in repo README files
- [x] No `&&` in PowerShell code blocks in README files
- [x] One-liner matches `install.ps1` header comment exactly
