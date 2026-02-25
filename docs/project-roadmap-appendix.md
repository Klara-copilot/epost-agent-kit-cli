# Project Roadmap - Appendix

**Project:** ePost Agent Kit CLI
**Created by:** Phuong Doan
**Last Updated:** 2026-02-25

> **See Also:** [Project Roadmap](./project-roadmap.md) - Current status, completed features, planned features

## Technical Debt

### Priority 1: Refactoring

**1. Split Large Command Files**
**Effort:** Medium | **Impact:** High

- [ ] Split `init.ts` (771 LOC) into `initPackageMode()` and `initKitMode()`
- [ ] Extract utilities from `init.ts` to services: `generateSkillIndex()` → skill-index service
- [ ] Refactor `dev.ts` (228 LOC) - extract debounce logic to `FileWatcher` class

**2. Consolidate Metadata Handling**
**Effort:** Medium | **Impact:** High

- [ ] Create unified `MetadataManager` service
- [ ] Remove scattered metadata logic from `init.ts`, `package.ts`, `uninstall.ts`
- [ ] Centralize read/update/classify methods

**3. Extract Directory Discovery**
**Effort:** Small | **Impact:** Medium

- [ ] Remove `findPackagesDir()`, `findProfilesPath()`, `findTemplatesDir()` duplicates
- [ ] Use `KitPathResolver` extensions throughout codebase
- [ ] Add missing path resolution methods to `KitPathResolver`

### Priority 2: Consistency

**1. Establish Error Semantics**
**Effort:** Small | **Impact:** Medium

- [ ] Document exit code conventions
  - 0: Success
  - 1: Error (user action required)
  - 2: Warning (continue or fix)
- [ ] Standardize error handling across commands
- [ ] Consistent error message format

**2. Validate All Inputs Early**
**Effort:** Small | **Impact:** Medium

- [ ] All commands validate directory existence before `chdir`
- [ ] Consistent validation error messages
- [ ] Input validation utilities

**3. Async Error Handling**
**Effort:** Small | **Impact:** Medium

- [ ] Wrap top-level `runX()` functions in try-catch at CLI boundary
- [ ] Never let domain errors bubble uncaught
- [ ] Consistent error reporting

### Priority 3: Enhancement

**1. Command-Level Metrics**
**Effort:** Small | **Impact:** Low

- [ ] Track command execution time
- [ ] Log device info for diagnostic reports
- [ ] Display performance metrics in `--verbose` mode

**2. Implement Undo/Rollback**
**Effort:** Medium | **Impact:** Medium

- [ ] Leverage existing backup system
- [ ] Add undo command: `epost-kit undo`
- [ ] Rollback to specific backup
- [ ] Tests for undo functionality

**3. CLI Middleware**
**Effort:** Medium | **Impact:** Medium

- [ ] Pre/post hooks for consistent logging, timing, error handling
- [ ] Middleware system for cross-cutting concerns
- [ ] Plugin hooks for extensibility

## Known Issues & Limitations

### Current Limitations

**1. No Semver Constraints**
- **Issue:** Cannot specify version constraints for dependencies
- **Workaround:** Manual package version management
- **Plan:** v0.2.0 feature

**2. Metadata Caching**
- **Issue:** Metadata re-read on every file operation (performance)
- **Workaround:** Acceptable for small projects (< 100 files)
- **Plan:** In-memory cache with invalidation strategy

**3. GitHub API Rate Limits**
- **Issue:** 60 requests/hour for unauthenticated users
- **Workaround:** Local caching (manual)
- **Plan:** v0.2.0 - automatic caching

**4. YAML Parser Limitations**
- **Issue:** No support for flow style `{...}`, anchors `&`, aliases `*`
- **Workaround:** Use simple YAML syntax
- **Plan:** Acceptable trade-off (zero external deps)

**5. Workspace Feature Underutilized**
- **Issue:** Workspace CLAUDE.md generation exists but inheritance unclear
- **Workaround:** Manual workspace management
- **Plan:** Design workspace feature fully in v0.3.0

### Unresolved Questions

1. **Profile Discovery:** Centralized vs. distributed per team?
2. **Package Registry:** Dedicated registry or GitHub-based sufficient?
3. **Versioning:** Full semver or simple version tags?
4. **Telemetry:** Opt-in usage tracking for improving UX?
5. **Migration Path:** Automatic migration from ClaudeKit?
6. **Workspace Inheritance:** How do multi-repo setups share profiles/packages?

## Performance Optimization Opportunities

### Short-Term (v0.2.0)

**1. Template Caching**
- Cache compiled template patterns (regex) instead of recompiling each render
- Expected improvement: 30% faster CLAUDE.md generation

**2. Manifest Caching**
- Cache loaded manifests in memory (invalidate on file change)
- Expected improvement: 50% faster command startup

**3. Dependency Graph Caching**
- Cache dependency graph instead of rebuilding for each operation
- Expected improvement: 40% faster package resolution

### Long-Term (v0.3.0+)

**4. Parallel Package Downloads**
- Download multiple packages concurrently during install
- Expected improvement: 60% faster full install

**5. YAML Parser Optimization**
- Single-pass parser instead of multiple regex replacements
- Expected improvement: 50% faster manifest loading

**6. Incremental Metadata Updates**
- Only re-compute checksums for changed files
- Expected improvement: 70% faster file classification

## Success Metrics

### User Satisfaction (Targets for v1.0.0)
- Onboarding time: < 5 minutes (90% of users)
- Setup errors: < 5% of installations
- NPS score: > 40

### Technical Health (Current Status)
- Test pass rate: 100% (103/103 tests)
- Code coverage: 70% target met
- Build success rate: 100% (local)
- Zero data loss incidents (v0.1.0)

### Adoption Metrics (Targets for v1.0.0)
- Active users: 50+ (after 3 months)
- Package contributions: 10+ community packages (after 6 months)
- Profile diversity: 8+ team-specific profiles

## See Also

- [Project Roadmap](./project-roadmap.md) - Current status and planned features
- [Project Overview & PDR](./project-overview-pdr.md) - Vision and requirements
- [System Architecture](./system-architecture.md) - Technical design
- [Code Standards](./code-standards.md) - Development conventions
- [Codebase Summary](./codebase-summary.md) - High-level organization
