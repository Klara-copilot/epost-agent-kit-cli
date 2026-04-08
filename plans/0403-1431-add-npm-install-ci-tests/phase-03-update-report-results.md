---
phase: 3
title: "Update report-results job dependencies"
status: done
effort: 5m
---

# Phase 3 — Update report-results Job

## Overview

Add `test-npm-pack-unix` and `test-npm-pack-windows` to the `needs` array of the
`report-results` job in `test-install.yml`, and add their status rows to the summary table.

## Current needs array

```yaml
needs: [test-unix-install, test-windows-powershell, test-windows-cmd, verify-documentation, verify-url-accessible]
```

## Updated needs array

```yaml
needs: [test-unix-install, test-windows-powershell, test-windows-cmd, verify-documentation, verify-url-accessible, test-npm-pack-unix, test-npm-pack-windows]
```

## Updated summary table (add 2 rows)

```bash
echo "| npm Pack Unix | ${{ needs.test-npm-pack-unix.result }} |" >> $GITHUB_STEP_SUMMARY
echo "| npm Pack Windows | ${{ needs.test-npm-pack-windows.result }} |" >> $GITHUB_STEP_SUMMARY
```

## Todo

- [x] Update `needs` array in `report-results` job
- [x] Add 2 new rows to the step summary echo block
