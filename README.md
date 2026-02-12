# ePost Agent Kit CLI

Command-line interface for managing ePost Agent Kit installations, packages, and configurations across Claude, Cursor, and GitHub Copilot platforms.

**Version:** 0.1.0 | **Node:** >= 18.0.0 | **License:** Private - Klara Copilot

## Installation

### One-Line Install

**macOS / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/Klara-copilot/epost-agent-kit-cli/master/install/install.sh | bash
```

**Windows (PowerShell):**
```powershell
iwr https://raw.githubusercontent.com/Klara-copilot/epost-agent-kit-cli/master/install/install.ps1 -UseBasicParsing | iex
```

**Windows (Command Prompt):**
```cmd
curl -fsSL https://raw.githubusercontent.com/Klara-copilot/epost-agent-kit-cli/master/install/install.cmd -o %TEMP%\install-epost.cmd && %TEMP%\install-epost.cmd
```

**Prerequisites:**
- Node.js >= 18.0.0
- npm (included with Node.js)
- GitHub CLI (`gh`) - [Install here](https://cli.github.com/)
- GitHub authentication: `gh auth login`

See [Installation Guide](./install/README.md) for detailed instructions, troubleshooting, and manual installation.

## Quick Start

```bash
# Install dependencies and build
npm install && npm run build && npm link

# Verify installation
epost-kit doctor

# Guided setup (recommended for first-time users)
epost-kit onboard

# Or initialize manually
epost-kit init --profile backend-engineer
```

## Features

- **Package Management:** Modular installation with automatic dependency resolution
- **Profile System:** Team-based configurations with auto-detection
- **Smart Merge:** Intelligent file tracking prevents data loss during updates
- **Dev Watcher:** Live-sync for kit designers during development
- **Health Checks:** Environment verification with auto-fix capabilities
- **Multi-Platform:** Support for Claude, Cursor, and GitHub Copilot

## Architecture

Clean 4-layer architecture with strict separation of concerns:

```
src/
├── cli/         # CLI entry point, command registration
├── commands/    # Thin orchestrators (11 commands)
├── domains/     # Business logic (9 domains)
├── services/    # Cross-cutting services
├── shared/      # Infrastructure utilities
└── types/       # Type definitions
```

**Key Stats:**
- Total: ~7,872 LOC
- Commands: 2,518 LOC (11 commands)
- Domains: 3,030 LOC (9 domains)
- Services/Shared: 772 LOC
- Tests: 1,341 LOC (103 tests, 100% passing)

See [System Architecture](./docs/system-architecture.md) for detailed design.

## Commands

### Installation & Setup

**`epost-kit init`**
Initialize ePost Agent Kit in existing project. Packages are always downloaded from GitHub (GitHub authentication required).

```bash
# Interactive mode
epost-kit init

# With profile
epost-kit init --profile backend-engineer

# With explicit packages
epost-kit init --packages core,typescript,testing

# Fresh install (overwrite all)
epost-kit init --fresh

# Skip cache, download fresh release
epost-kit init --force-download

# Dry run (preview only)
epost-kit init --dry-run
```

**`epost-kit new`**
Create new project from kit template.

```bash
# Interactive mode
epost-kit new

# Specify directory and kit
epost-kit new --dir my-project --kit advanced
```

**`epost-kit onboard`**
Guided setup wizard for new developers (recommended).

```bash
epost-kit onboard
```

### Package Management

**`epost-kit package`**
Manage installed packages.

```bash
# List all available packages
epost-kit package list

# Add package (with dependencies)
epost-kit package add <package-name>

# Remove package
epost-kit package remove <package-name>

# Force remove (ignore dependents)
epost-kit package remove <package-name> --force
```

### Profile Management

**`epost-kit profile`**
Browse and inspect developer profiles.

```bash
# List all profiles
epost-kit profile list

# Filter by team
epost-kit profile list --team mobile

# Show profile details
epost-kit profile show backend-engineer
```

### Maintenance

**`epost-kit doctor`**
Health checks with auto-fix capabilities.

```bash
# Run all checks
epost-kit doctor

# Auto-fix issues
epost-kit doctor --fix

# JSON report (for CI)
epost-kit doctor --report
```

**`epost-kit uninstall`**
Remove installed kit with ownership awareness.

```bash
# Interactive mode
epost-kit uninstall

# Keep modified files
epost-kit uninstall --keep-custom

# Force removal (including modified files)
epost-kit uninstall --force

# Dry run
epost-kit uninstall --dry-run
```

**`epost-kit update`**
Self-update CLI to latest version from npm.

```bash
# Check for updates
epost-kit update --check

# Update CLI
epost-kit update
```

### Development

**`epost-kit dev`**
Watch packages/ and live-sync to target directory (for kit designers).

```bash
# Watch and sync
epost-kit dev --target .claude --profile backend-engineer

# Force overwrite on sync
epost-kit dev --force
```

**`epost-kit workspace`**
Generate workspace-level CLAUDE.md for multi-repo setups.

```bash
epost-kit workspace init
```

### Information

**`epost-kit versions`**
List available kit versions from GitHub releases.

```bash
# Show latest 10 versions
epost-kit versions

# Show more versions
epost-kit versions --limit 20

# Include pre-releases
epost-kit versions --pre
```

## Global Options

Available for all commands:

- `--verbose` - Enable debug logging
- `--yes` - Skip confirmations (automation mode)
- `--help` - Show command help
- `--version` - Show CLI version

## Configuration

### User Configuration

Create `.epostrc`, `.epostrc.json`, or `.epostrc.yaml` in project root:

```json
{
  "target": "claude",
  "installDir": ".claude",
  "repository": "https://github.com/Klara-copilot/epost_agent_kit",
  "protectedPatterns": [".git/**", "*.env", "*.key"]
}
```

### Environment Variables

- `EPOST_KIT_VERBOSE` - Enable debug logging
- `NO_COLOR` - Disable colored output (CI mode)
- `CI` - Detect CI environment (affects prompts, spinners)

### GitHub Authentication

ePost Kit CLI requires GitHub access to download packages. Ensure:
- `gh` CLI is installed and authenticated: `gh auth login`
- GitHub token is available: `gh auth token` (should return a token)

## Development

### Setup

```bash
# Clone repository
git clone <repo-url>
cd epost-agent-kit-cli

# Install dependencies
npm install

# Build
npm run build

# Link for development
npm link

# Verify
epost-kit --version
```

### Development Workflow

```bash
# Watch mode (auto-compile on changes)
npm run dev

# Run tests
npm test

# Watch tests
npm run test:watch

# Type check
npm run typecheck

# Lint
npm run lint

# Coverage report
npm run test:coverage
```

### Project Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run dev` | Watch mode for development |
| `npm test` | Run test suite (103 tests) |
| `npm run test:watch` | Watch mode for tests |
| `npm run typecheck` | Type check without compilation |
| `npm run lint` | ESLint code quality check |
| `npm run prepublishOnly` | Full validation before publish |

## Testing

**Framework:** Vitest 2.1.8
**Total Tests:** 103 (100% passing)
**Execution Time:** ~1 second
**Coverage Target:** 70%

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Test categories:
- Unit Tests: Pure functions, algorithms
- Integration Tests: Commands + domains interaction
- Smoke Tests: CLI entry point
- File System Tests: Real I/O with temp directories

See `MANUAL-TESTING-GUIDE.md` for comprehensive manual testing procedures.

## Documentation

- [Project Overview & PDR](./docs/project-overview-pdr.md) - Vision, goals, requirements
- [Codebase Summary](./docs/codebase-summary.md) - High-level code organization
- [System Architecture](./docs/system-architecture.md) - Technical design details
- [Code Standards](./docs/code-standards.md) - Development conventions
- [Project Roadmap](./docs/project-roadmap.md) - Current status and future plans

## Key Technologies

**Runtime:**
- TypeScript 5.x (strict mode)
- Node.js >= 18.0.0
- ESM modules

**CLI Framework:**
- `cac` - Command and Conquer (arg parsing)
- `@inquirer/prompts` - Interactive prompts
- `ora` - Spinners and progress
- `picocolors` - Terminal colors

**External Integrations:**
- GitHub Releases API - Kit template downloads
- npm Registry API - CLI self-update
- Package Manager Detection - npm/pnpm/yarn/bun

## Architecture Highlights

### Clean 4-Layer Design
- **CLI Layer:** Command registration and framework config
- **Commands Layer:** Thin orchestrators, user interaction
- **Domains Layer:** Business logic and algorithms
- **Services/Shared Layer:** Cross-cutting utilities

### Core Algorithms
- **Package Resolution:** Topological sort (Kahn's algorithm) for dependency ordering
- **Smart Merge:** Three-tier file ownership classification (epost-owned/modified/user-created)
- **Template Engine:** Custom regex-based renderer (no external deps)
- **YAML Parser:** Custom line-by-line parser (no external deps)

### File Safety
- **Atomic Writes:** Temp file + rename pattern
- **Checksum Tracking:** SHA256 with CRLF normalization
- **Backup System:** Timestamped snapshots before destructive operations
- **Protected Patterns:** Never touches `.git/`, `.env*`, `*.key`, etc.

## Performance

**Typical Operations:**
- CLI startup: < 200ms
- Full install (5-10 packages): < 30s
- Profile detection: < 5s
- Health checks: < 10s
- Watcher sync: < 500ms latency

## Troubleshooting

### Common Issues

**1. "GitHub authentication required"**
```bash
# Install GitHub CLI (if not installed)
# https://github.com/cli/cli

# Authenticate
gh auth login

# Verify authentication
gh auth token
```

**2. "Package manifest not found"**
```bash
# Verify kit structure
ls $EPOST_KIT_ROOT/packages/core/package.yaml
ls $EPOST_KIT_ROOT/profiles/profiles.yaml
```

**3. "Circular dependencies detected"**
- Check package.yaml files for dependency cycles
- Run `epost-kit doctor` for validation

**4. File ownership errors**
- Metadata may be corrupted
- Run `epost-kit uninstall` and reinstall
- Or manually delete `.epost-metadata.json` and reinstall

### Debug Mode

```bash
# Enable verbose logging
epost-kit --verbose <command>

# Or set environment variable
export EPOST_KIT_VERBOSE=1
epost-kit <command>
```

## Contributing

This is a private project. For internal contributors:

1. Follow [Code Standards](./docs/code-standards.md)
2. Write tests for new features
3. Ensure tests pass: `npm test`
4. Type check: `npm run typecheck`
5. Lint: `npm run lint`
6. Document changes in code and commit messages

### Commit Convention

Follow conventional commits:
```
<type>(<scope>): <subject>

feat(packages): add semver constraint validation
fix(ownership): correct checksum comparison for Windows
refactor(init): extract utilities to domain helpers
docs(api): update command reference
test(ownership): add edge case tests
```

## Roadmap

**v0.1.0** (Current)
- ✅ Package management with dependency resolution
- ✅ Profile system with auto-detection
- ✅ Smart merge with file ownership tracking
- ✅ Health checks with auto-fix
- ✅ Dev watcher for kit designers
- ✅ 103 tests (100% passing)

**v0.2.0** (Planned)
- [ ] Semver dependency constraints
- [ ] Package versioning and updates
- [ ] Local package caching (offline mode)
- [ ] Package search and discovery

**v0.3.0** (Future)
- [ ] Team-level configuration sync
- [ ] Shared profile repositories
- [ ] Multi-user conflict resolution

See [Project Roadmap](./docs/project-roadmap.md) for detailed plans.

## License

Private - Klara Copilot

## Support

For internal support:
- File issues in repository issue tracker
- Consult [documentation](./docs/)
- Run `epost-kit doctor` for diagnostics
- Enable debug mode: `epost-kit --verbose <command>`

---

**Created by:** Phuong Doan | **Last Updated:** 2026-02-11
