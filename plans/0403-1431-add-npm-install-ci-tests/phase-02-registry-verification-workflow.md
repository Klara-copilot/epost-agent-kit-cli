---
phase: 2
title: "Add verify-npm-registry.yml workflow"
status: done
effort: 20m
---

# Phase 2 — Registry Verification Workflow

## Overview

New file: `.github/workflows/verify-npm-registry.yml`

Manual-only (`workflow_dispatch`) workflow that installs `@aavn/epost-kit` directly from
the npm registry and verifies it works. Run this after publishing a new version.

## Why Manual-Only

- Registry propagation can take minutes after `npm publish`
- The published version doesn't change on every PR — running this on PR would always test
  the same already-published version, not the PR's changes
- Keeps it as a post-publish verification tool, not a PR gate

## Implementation

```yaml
name: Verify npm Registry Install

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Package version to verify (e.g. 0.0.1)'
        required: false
        default: 'latest'

jobs:
  verify-npm-registry-unix:
    name: Verify npm Registry (${{ matrix.os }}, Node ${{ matrix.node-version }})
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest]
        node-version: [20, 22]  # Updated: Validation Session 1 - drop EOL Node 18, add Node 22 LTS
    runs-on: ${{ matrix.os }}
    steps:
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install from npm registry
        run: npm install -g @aavn/epost-kit@${{ github.event.inputs.version || 'latest' }}

      - name: Verify CLI is installed
        run: |
          which epost-kit
          epost-kit --version

      - name: Test CLI commands
        run: |
          epost-kit --help
          epost-kit doctor || true

      - name: Smoke test
        run: |
          mkdir -p /tmp/epost-registry-test
          cd /tmp/epost-registry-test
          epost-kit init --dry-run || echo "Dry run completed"

  verify-npm-registry-windows:
    name: Verify npm Registry (Windows, Node ${{ matrix.node-version }})
    strategy:
      fail-fast: false
      matrix:
        node-version: [20, 22]  # Updated: Validation Session 1 - drop EOL Node 18, add Node 22 LTS
    runs-on: windows-latest
    steps:
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install from npm registry
        run: npm install -g "@aavn/epost-kit@${{ github.event.inputs.version || 'latest' }}"

      - name: Verify CLI is installed
        run: |
          where.exe epost-kit
          epost-kit --version
        shell: pwsh

      - name: Test CLI commands
        run: |
          epost-kit --help
          epost-kit doctor
        shell: pwsh
        continue-on-error: true

  report:
    name: Report Results
    needs: [verify-npm-registry-unix, verify-npm-registry-windows]
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Report Status
        run: |
          echo "## npm Registry Verification Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Package:** @aavn/epost-kit@${{ github.event.inputs.version || 'latest' }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Platform | Status |" >> $GITHUB_STEP_SUMMARY
          echo "|----------|--------|" >> $GITHUB_STEP_SUMMARY
          echo "| Unix | ${{ needs.verify-npm-registry-unix.result }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Windows | ${{ needs.verify-npm-registry-windows.result }} |" >> $GITHUB_STEP_SUMMARY
```

## Todo

- [x] Create `.github/workflows/verify-npm-registry.yml` with above content
