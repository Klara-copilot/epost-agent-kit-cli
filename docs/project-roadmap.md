# Project Roadmap

## Current Status

**Version:** 0.0.1 (public npm release, @aavn/epost-kit)
**Last Updated:** 2026-04-10
**Test Status:** ~3,731 test LOC across 32 files (100% passing)

## Completed Features

### v0.0.1 (Current - Public npm Release)
- 32 commands across 6 categories
- Multi-platform support: 6 IDE adapters (Claude Code, Cursor, VS Code Copilot, JetBrains, Antigravity, Export)
- April 2026 VS Code agent spec support (copilot-adapter outputs `.agent.md`)
- Package management with topological sort dependency resolution
- Profile system with auto-detection and multi-profile selection
- Smart merge with file ownership tracking via SHA256 checksums (kit-owned vs user-modified classification)
- Health checks with auto-fix capabilities
- Dev watcher for kit designers with live-sync
- Claude Code → GitHub Copilot format conversion
- Intent mapping and dry-run/trace diagnostics
- Structured validation (config, skills, routing, delegation, hooks)
- TUI marketplace browser for discovery
- ~3,731 test LOC (100% passing)
- Published to npm as `@aavn/epost-kit` v0.0.1 (public registry)
- CI/CD improvements (manual publish workflow, validation scripts)
- Config system redesign: dual-layer config (global `~/.epost-kit/config.json` + project `.claude/.epost-kit.json`), 3-level merge with source tracking, static facade managers, security hardening (file perms, prototype pollution guard), Express + React web dashboard (`config ui`)

### v0.1.0 (Next)
- [x] Config system redesign (dual-layer, source tracking, web dashboard)
- [ ] Semver dependency constraints
- Merge PR #11: Copilot spec update (April 2026)
- test(path-resolver): CI compatibility fix
- ci: add manual publish workflow and validation scripts
- feat(copilot): update adapter to April 2026 VS Code agent spec
- Merge PR #10: Lint cleanup + npm release docs
- ci(install): npm-pack install jobs + registry verification
- docs: update version references for v0.0.1 public npm release
- fix(lint): resolve unused variable warnings

## Planned Features

### v0.1.0 (Next)
- [ ] Semver dependency constraints
- [ ] Advanced package versioning
- [ ] Local package caching (offline mode)
- [ ] Enhanced package search and discovery
- [ ] Performance optimizations for large package sets

### v0.2.0 (Future)
- [ ] Team-level configuration sync
- [ ] Shared profile repositories
- [ ] Multi-user conflict resolution

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

### Phase 2.5: Config System Redesign (Complete)
- Dual-layer config (global + project)
- 3-level merge with leaf-level source tracking
- Static facade managers (GlobalConfigManager, ProjectConfigManager)
- Security hardening (file permissions, prototype pollution guard)
- Express + React web dashboard (`config ui`)
- Phase handler pattern for command decomposition

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
| April 2026 Spec Update | Complete | 100% |
| Config System Redesign | Complete | 100% |
| Enterprise Features | Planned | 0% |
| Ecosystem | Future | 0% |

## Installation

Primary installation method:
```bash
npm install -g @aavn/epost-kit
```

Alternative install scripts available in `install/` directory for bash, PowerShell, and cmd.

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
