# Codebase Integrations & Operations

**Project:** ePost Agent Kit CLI
**Version:** 0.1.0
**Created by:** Phuong Doan
**Last Updated:** 2026-02-25

> **See Also:** [Codebase Summary](./codebase-summary.md) - Architecture, layers, key components

## External Integrations

### GitHub API
**Used By:** `domains/github/github-client.ts`
**Endpoints:**
- `GET /repos/{owner}/{repo}/releases` - List releases
- Download `.tar.gz` assets via `browser_download_url`

**Error Handling:** NetworkError thrown on HTTP failures

### npm Registry API
**Used By:** `domains/versioning/self-update.ts`
**Command:** `npm view epost-kit version`
**Purpose:** Check for CLI updates

### Package Managers
**Used By:** `domains/installation/package-manager.ts`
**Detection Order:** pnpm → yarn → bun → npm
**Lock Files:**
- pnpm: `pnpm-lock.yaml`
- yarn: `yarn.lock`
- bun: `bun.lockb`
- npm: `package-lock.json`

## Configuration Management

### User Configuration
**File:** `.epostrc`, `.epostrc.json`, `.epostrc.yaml`, `epost.config.js`, etc.
**Discovery:** `cosmiconfig` searches in standard locations
**Schema:**
```typescript
{
  repository?: string        // GitHub URL override
  target?: IDE target        // claude/cursor/github-copilot
  installDir?: string        // custom install directory
  protectedPatterns?: string[] // extra files to never modify
}
```

### Project Metadata
**File:** `.epost-metadata.json`
**Purpose:** Track installed packages, file ownership
**Managed By:** `services/file-operations/ownership.ts`
**Lifecycle:** Created on init, updated on add/remove, read on uninstall

### Package Manifests
**File:** `packages/*/package.yaml`
**Schema:**
```yaml
name: core
version: 1.0.0
description: Foundation layer
layer: 0
platforms: [all]
dependencies: []
recommends: [typescript]
provides:
  agents: [architect]
  skills: [planner]
  commands: [init]
files:
  "templates/CLAUDE.md": ".claude/CLAUDE.md"
  "settings.json": ".claude/settings.json"
settings_strategy: base|merge|skip
claude_snippet: "CLAUDE.snippet.md"
```

### Profile Definitions
**File:** `profiles/profiles.yaml`
**Schema:**
```yaml
backend-engineer:
  display_name: "Backend Engineer"
  teams: [miracle, titan]
  packages: [core, typescript, testing]
  optional: [docker, kubernetes]
  auto_detect:
    - match:
        files: [package.json]
        directories: [src/api]
        dependencies: [express, fastify]
      suggest: backend-engineer
```

## Testing Strategy

### Test Organization
```
tests/
├── cli/               # Smoke tests, command registry
├── commands/          # Command orchestration tests
├── domains/           # Business logic tests
├── services/          # Service layer tests
├── shared/            # Utility tests
└── helpers/           # Test utilities, fixtures
```

### Test Characteristics
- Framework: Vitest 2.1.8
- Total: 103 tests (100% passing)
- Execution: ~1 second full suite
- Approach: Real I/O (no heavy mocking)
- Fixtures: Temp directories created/destroyed per test
- Coverage: 70% target (v8 provider)

### Test Categories
1. **Unit Tests** (majority) - Pure functions, algorithm correctness
2. **Integration Tests** - Commands + domains interaction
3. **Smoke Tests** - CLI entry point, command registration
4. **File System Tests** - Real file operations with cleanup

## Build & Deployment

### Build Process
```bash
npm run build         # Compile TypeScript → JavaScript
tsc                   # Output: dist/
```

Output:
- Compiled `.js` files
- Source maps (`.js.map`)
- Type declarations (`.d.ts`, `.d.ts.map`)

### Distribution
- Package Name: `epost-kit`
- Binary: `epost-kit` → `dist/cli.js`
- Entry Point: `dist/cli.js` (ESM)
- Target: Node.js >= 18.0.0

### Installation Methods
```bash
npm install -g epost-kit    # Global install
npm link                     # Development link
npx epost-kit                # One-time run
```

## Performance Characteristics

### Typical Operations
- Full install (5-10 packages): < 30s
- Health checks: < 10s
- Profile detection: < 5s
- Watcher sync: < 500ms latency
- CLI startup: < 200ms

### Optimization Strategies
- **Caching:** Kit path resolution cached after first lookup
- **Debouncing:** File watcher batches changes (300ms)
- **Parallel Execution:** Independent health checks run concurrently
- **Lazy Loading:** Manifests loaded once per command invocation

### Known Bottlenecks
- GitHub API rate limits (60 req/hour unauthenticated)
- Large kit downloads (network-bound)
- Metadata re-read on every file operation (no caching)

## Security Considerations

### Protected Files
**Pattern:** `.git/**`, `node_modules/**`, `.env*`, `*.key`, `*.pem`, `*.crt`, `.ssh/**`
**Enforcement:** Checked before any write operation

### Checksum Integrity
**Algorithm:** SHA256 with CRLF → LF normalization
**Purpose:** Detect unauthorized modifications

### Safe Operations
- Atomic writes: Temp file + rename pattern
- Backup before destructive updates
- No credential storage or transmission
- Exit codes follow sysexits.h for proper error signaling

## See Also

- [Codebase Summary](./codebase-summary.md) - High-level organization
- [System Architecture](./system-architecture.md) - Detailed technical design
- [Code Standards](./code-standards.md) - Development conventions
- [Project Overview & PDR](./project-overview-pdr.md) - Product requirements
