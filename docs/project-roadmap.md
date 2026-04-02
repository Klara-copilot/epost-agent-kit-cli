# Project Roadmap

## Current Status

**Version:** 2.0.0
**Last Updated:** 2026-04-01
**Test Status:** 103 tests passing (100%)

## Completed Features

### v2.0.0 (Current)
- 32 commands across 6 categories
- Multi-platform support (Claude Code, Cursor, GitHub Copilot)
- Package management with topological sort dependency resolution
- Profile system with auto-detection and multi-profile selection
- Smart merge with file ownership tracking via SHA256 checksums
- Health checks with auto-fix capabilities
- Dev watcher for kit designers with live-sync
- Claude Code → GitHub Copilot format conversion
- Intent mapping and dry-run/trace diagnostics
- Structured validation (config, skills, routing, hooks, delegation)
- TUI marketplace browser for discovery
- 103 tests (100% passing)

### Recent Commits
- feat(install): migrate to public curl/irm install pattern
- fix(ci): run install.ps1 directly in CMD test job
- fix(build): use cross-platform chmod for dist/cli.js
- fix(install): replace UTF-8 em-dashes with ASCII in ps1
- fix(install): fix ps1 syntax error + CI-safe PATH handling
- fix(install): replace base64 -d with jq @base64d for Windows compat
- fix: set execute permission on dist/cli.js after build
- fix: robust PATH verification for nvm/fnm users

## Planned Features

### v0.2.0 (Next)
- [ ] Semver dependency constraints
- [ ] Advanced package versioning
- [ ] Local package caching (offline mode)
- [ ] Enhanced package search and discovery
- [ ] Performance optimizations for large package sets

### v0.3.0 (Future)
- [ ] Team-level configuration sync
- [ ] Shared profile repositories
- [ ] Multi-user conflict resolution

## Completed in v2.0.0

### convert command
Converts Claude Code commands/agents/skills to GitHub Copilot format. Full implementation with format conversion logic and validation.

## Milestones

### Phase 1: Core Foundation (Complete)
- CLI framework and command system
- Package management
- Profile system
- Basic health checks

### Phase 2: Multi-Platform Support (Complete)
- Claude Code integration
- GitHub Copilot integration
- Cursor integration
- Convert command

### Phase 3: Enterprise Features (Planned)
- Team configuration sync
- Shared profiles
- Conflict resolution

### Phase 4: Ecosystem (Future)
- Package marketplace
- Community contributions
- Plugin system

## Progress Tracking

| Phase | Status | Progress |
|-------|--------|----------|
| Core Foundation | Complete | 100% |
| Multi-Platform | Complete | 100% |
| Enterprise Features | Planned | 0% |
| Ecosystem | Future | 0% |

## Key Dependencies

- TypeScript 5.x
- Node.js >= 18.0.0
- git (for CLI installation and updates)
- GitHub CLI (`gh`) - optional, required only for `epost-kit install` command

## Technical Debt

- Consider modularizing files approaching 200 LOC
- Add more integration tests
- Performance optimization for large package sets

## Contribution Guidelines

1. Follow code standards in `code-standards.md`
2. Write tests for new features
3. Ensure tests pass: `npm test`
4. Run typecheck: `npm run typecheck`
5. Run lint: `npm run lint`

## Documentation Updates

After completing implementation tasks:
- Update roadmap progress
- Update changelog
- Verify all links work
