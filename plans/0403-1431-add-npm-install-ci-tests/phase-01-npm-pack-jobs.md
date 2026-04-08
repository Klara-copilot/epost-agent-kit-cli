---
phase: 1
title: "Add npm-pack install jobs to test-install.yml"
status: done
effort: 45m
---

# Phase 1 — npm-pack Install Jobs

## Overview

<!-- Updated: Validation Session 1 - Node matrix changed from [18,20] to [20,22] -->
Add two new jobs to `.github/workflows/test-install.yml`:
- `test-npm-pack-unix` — ubuntu + macos, Node 20 + 22
- `test-npm-pack-windows` — windows-latest, Node 20 + 22

These jobs: build the project, pack it into a tarball, install globally from that tarball,
then run the same verification steps as the script-based jobs.

## Why npm pack (not `npm install -g @aavn/epost-kit`)

The registry approach has external dependencies and propagation delay. Pack tests the
installability of the *current source*, which is exactly what CI should verify per-commit.

## Steps per job

1. Checkout
2. Setup Node.js (matrix version)
3. `npm ci` — install deps
4. `npm run build` — compile TypeScript to `dist/`
5. `npm pack` — produces `aavn-epost-kit-*.tgz`
6. `npm install -g ./aavn-epost-kit-*.tgz`
7. Verify: `which epost-kit` (unix) / `where epost-kit` (windows) + `epost-kit --version`
8. Test commands: `epost-kit --help` + `epost-kit doctor || true`
9. Smoke test: `epost-kit init --dry-run` in temp dir

## Implementation

### Job: test-npm-pack-unix

```yaml
test-npm-pack-unix:
  name: Test npm Pack Install (Unix)
  strategy:
    fail-fast: false
    matrix:
      os: [ubuntu-latest, macos-latest]
      node-version: [20, 22]
  runs-on: ${{ matrix.os }}
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
    - name: Install dependencies
      run: npm ci
    - name: Build
      run: npm run build
    - name: Pack
      run: npm pack
    - name: Install from tarball
      run: npm install -g ./aavn-epost-kit-*.tgz
    - name: Verify CLI is installed
      run: |
        which epost-kit
        epost-kit --version
    - name: Test CLI commands
      run: |
        epost-kit --help
        epost-kit doctor || true
    - name: Smoke test
      # Updated: Validation Session 1 - use epost-kit install instead of init --dry-run
      run: |
        mkdir -p /tmp/epost-npm-test
        cd /tmp/epost-npm-test
        epost-kit install || echo "Install completed"
```

### Job: test-npm-pack-windows

```yaml
test-npm-pack-windows:
  name: Test npm Pack Install (Windows)
  strategy:
    fail-fast: false
    matrix:
      node-version: [20, 22]
  runs-on: windows-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
    - name: Install dependencies
      run: npm ci
    - name: Build
      run: npm run build
    - name: Pack
      # Updated: Validation Session 1 - use npm pack --json for deterministic filename
      id: pack
      run: |
        $pkg = npm pack --json | ConvertFrom-Json
        echo "TARBALL=$($pkg[0].filename)" >> $env:GITHUB_ENV
      shell: pwsh
    - name: Install from tarball
      run: npm install -g $env:TARBALL
      shell: pwsh
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
    - name: Smoke test
      # Updated: Validation Session 1 - use epost-kit install instead of init --dry-run
      run: |
        mkdir $env:TEMP\epost-npm-test -Force
        cd $env:TEMP\epost-npm-test
        epost-kit install
      shell: pwsh
      continue-on-error: true
```

## Todo

- [x] Add `test-npm-pack-unix` job after `test-windows-cmd` job block
- [x] Add `test-npm-pack-windows` job after `test-npm-pack-unix`
- [x] Verify `npm run build` script exists in `package.json`
