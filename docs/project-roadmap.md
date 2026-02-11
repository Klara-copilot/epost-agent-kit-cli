# Project Roadmap

**Project:** ePost Agent Kit CLI
**Created by:** Phuong Doan
**Last Updated:** 2026-02-11

## Current Status: v0.1.0

**Status:** Production-ready for internal use
**Release Date:** 2026-02-11
**Codebase:** ~7,872 LOC
**Tests:** 103 (100% passing)
**Coverage:** 70% target

## Completed Features (v0.1.0)

### ✅ Core Package Management
**Status:** Complete | **Priority:** P0

- [x] Package manifest loading from `packages/*/package.yaml`
- [x] Dependency resolution with topological sort (Kahn's algorithm)
- [x] Circular dependency detection with clear error messages
- [x] Auto-include missing dependencies
- [x] Layer-based ordering (Foundation → Platforms → Domain)
- [x] Package add/remove commands
- [x] Metadata tracking for installed packages

**Key Files:**
- `domains/packages/package-resolver.ts` (512 LOC)
- `commands/package.ts` (237 LOC)

### ✅ Profile System
**Status:** Complete | **Priority:** P0

- [x] Team-based profile definitions
- [x] Auto-detection via file/directory/dependency patterns
- [x] Confidence scoring (high/medium/low)
- [x] Profile browsing and inspection
- [x] Profile-to-package resolution
- [x] Multi-team support (single profile matches multiple teams)

**Key Files:**
- `domains/packages/profile-loader.ts` (220 LOC)
- `commands/profile.ts` (143 LOC)

### ✅ Smart Merge System
**Status:** Complete | **Priority:** P0

- [x] Three-tier file ownership classification
- [x] Checksum-based change detection (SHA256)
- [x] CRLF normalization for cross-platform consistency
- [x] Conflict detection and resolution
- [x] Protected file patterns (`.git/`, `.env*`, `*.key`)
- [x] Metadata persistence (`.epost-metadata.json`)

**Key Files:**
- `domains/installation/smart-merge.ts` (191 LOC)
- `services/file-operations/ownership.ts` (145 LOC)
- `services/file-operations/checksum.ts` (56 LOC)

### ✅ Installation Commands
**Status:** Complete | **Priority:** P0

- [x] `init` - Initialize kit (package-based and legacy kit-based modes)
- [x] `new` - Create project from template
- [x] `onboard` - Guided setup wizard with smart defaults
- [x] Template download from GitHub releases
- [x] Metadata generation for file tracking

**Key Files:**
- `commands/init.ts` (930 LOC)
- `commands/new.ts` (186 LOC)
- `commands/onboard.ts` (237 LOC)

### ✅ CLAUDE.md Generation
**Status:** Complete | **Priority:** P1

- [x] Custom template engine (regex-based, no external deps)
- [x] Snippet collection from packages
- [x] Layer-ordered rendering
- [x] Template syntax: variables, conditionals, loops, helpers
- [x] Context injection (profile, packages, versions, counts)

**Key Files:**
- `domains/installation/claude-md-generator.ts` (337 LOC)

### ✅ Health Checks
**Status:** Complete | **Priority:** P1

- [x] Environment verification
- [x] Auto-fix capabilities
- [x] JSON report mode (for CI)
- [x] Exit codes: 0 (pass), 2 (warnings), 1 (failures)
- [x] Interactive UI with progress spinner

**Key Files:**
- `commands/doctor.ts` (115 LOC)
- `domains/health-checks/` (145 LOC)

### ✅ Dev Watcher
**Status:** Complete | **Priority:** P2

- [x] File watching with `fs.watch` API
- [x] Debounced syncing (300ms)
- [x] Smart invalidation (settings vs. CLAUDE.md)
- [x] Graceful shutdown (SIGINT handler)
- [x] File mapping support (single-file and directory)

**Key Files:**
- `commands/dev.ts` (228 LOC)

### ✅ Maintenance Commands
**Status:** Complete | **Priority:** P1

- [x] `uninstall` - Remove kit with ownership awareness
- [x] `update` - Self-update CLI from npm registry
- [x] `versions` - List available kit versions from GitHub
- [x] `workspace` - Generate workspace-level CLAUDE.md

**Key Files:**
- `commands/uninstall.ts` (195 LOC)
- `commands/update.ts` (80 LOC)
- `commands/versions.ts` (70 LOC)
- `commands/workspace.ts` (97 LOC)

### ✅ Infrastructure
**Status:** Complete | **Priority:** P0

- [x] Clean 4-layer architecture
- [x] TypeScript strict mode
- [x] Comprehensive test suite (103 tests)
- [x] Safe file operations (atomic writes, backups)
- [x] Kit path resolution with caching
- [x] Logger with colored output and NO_COLOR support
- [x] Error hierarchy with sysexits.h codes

**Key Files:**
- `shared/` (477 LOC)
- `services/` (295 LOC)
- `types/` (211 LOC)

## In Progress

### 🔄 Documentation
**Status:** In Progress | **Priority:** P1 | **Target:** v0.1.1

- [x] Project overview and PDR
- [x] Codebase summary
- [x] System architecture
- [x] Code standards
- [x] Enhanced README
- [ ] API reference
- [ ] Package authoring guide
- [ ] Profile creation guide
- [ ] Migration guide from ClaudeKit

**Action Items:**
- Create API reference documenting all public functions
- Write package authoring guide for kit designers
- Document profile creation and auto-detection rules
- Create migration guide from legacy ClaudeKit

## Planned Features

### v0.2.0 - Enhanced Package Management
**Target:** Q2 2026 | **Priority:** P1

#### Semver Constraint Validation
**Effort:** Medium | **Status:** Not Started

- [ ] Add version constraints to package manifests (e.g., `^1.0.0`, `~2.3.0`)
- [ ] Implement semver parsing and validation
- [ ] Detect version conflicts
- [ ] Display upgrade paths for conflicts
- [ ] Update package resolver to respect constraints

**Acceptance Criteria:**
- Package manifests support `dependencies: { "core": "^1.0.0" }`
- Resolver validates constraints during resolution
- Clear error messages for version conflicts
- Tests for constraint validation

#### Package Versioning & Updates
**Effort:** Large | **Status:** Not Started

- [ ] Track installed package versions in metadata
- [ ] Detect outdated packages
- [ ] `epost-kit package outdated` command
- [ ] `epost-kit package upgrade <name>` command
- [ ] Upgrade all packages: `epost-kit package upgrade --all`
- [ ] Version pinning: lock packages to specific versions

**Acceptance Criteria:**
- Metadata includes version per package
- Update detection compares installed vs. available versions
- Upgrade command safely updates packages
- No data loss during upgrades (smart merge)
- Tests for version comparison and upgrade logic

#### Local Package Caching
**Effort:** Medium | **Status:** Not Started

- [ ] Cache downloaded templates locally
- [ ] Cache manifests and profiles for offline mode
- [ ] Cache invalidation strategy (TTL or manual)
- [ ] `epost-kit cache clear` command
- [ ] Display cache status in `doctor` checks

**Acceptance Criteria:**
- Templates cached in `~/.epost-kit/cache/`
- Offline mode works with cached data
- Cache automatically refreshed after TTL
- Manual cache clearing works
- Tests for cache operations

#### Package Search & Discovery
**Effort:** Medium | **Status:** Not Started

- [ ] `epost-kit package search <query>` command
- [ ] Search by name, description, tags
- [ ] Filter by layer, platform, team
- [ ] Display package details (description, dependencies, provides)
- [ ] Fuzzy search support

**Acceptance Criteria:**
- Search returns relevant packages
- Filters work correctly
- Clear display of package details
- Tests for search logic

### v0.3.0 - Collaboration Features
**Target:** Q3 2026 | **Priority:** P2

#### Team-Level Configuration Sync
**Effort:** Large | **Status:** Not Started

- [ ] Shared configuration repository
- [ ] Pull team configs: `epost-kit team sync`
- [ ] Push local changes: `epost-kit team push`
- [ ] Conflict detection and resolution
- [ ] Version control for team configs

**Acceptance Criteria:**
- Teams can share profiles and packages
- Sync works bidirectionally
- Conflicts detected and resolved
- Tests for sync logic

#### Shared Profile Repositories
**Effort:** Medium | **Status:** Not Started

- [ ] Support remote profile repositories (GitHub, GitLab)
- [ ] Add remote: `epost-kit profile add-remote <url>`
- [ ] List remotes: `epost-kit profile remotes`
- [ ] Profile discovery from multiple sources
- [ ] Version pinning for remote profiles

**Acceptance Criteria:**
- Remote profiles loaded from Git repositories
- Multiple remotes supported
- Profile updates pulled automatically
- Tests for remote loading

#### Package Recommendations
**Effort:** Small | **Status:** Not Started

- [ ] Track package usage across team
- [ ] Recommend packages based on team patterns
- [ ] Display recommendations during `init`
- [ ] Opt-in telemetry for usage tracking

**Acceptance Criteria:**
- Recommendations displayed during setup
- Usage data collected with opt-in
- Clear privacy policy
- Tests for recommendation logic

### v0.4.0 - Advanced Workflows
**Target:** Q4 2026 | **Priority:** P3

#### Custom Template Creation
**Effort:** Medium | **Status:** Not Started

- [ ] `epost-kit template create` command
- [ ] Template scaffolding from existing project
- [ ] Template validation and testing
- [ ] Publish to GitHub releases

**Acceptance Criteria:**
- Templates created from existing projects
- Templates validated before publishing
- Templates work with `epost-kit new`
- Tests for template creation

#### Plugin System
**Effort:** Large | **Status:** Not Started

- [ ] Plugin API definition
- [ ] Plugin discovery mechanism
- [ ] Load plugins from `~/.epost-kit/plugins/`
- [ ] Custom commands, domains, UI components
- [ ] Plugin marketplace (future)

**Acceptance Criteria:**
- Plugins extend CLI functionality
- Clear plugin API documentation
- Plugins loaded dynamically
- Tests for plugin system

#### CI/CD Integration
**Effort:** Small | **Status:** Not Started

- [ ] GitHub Actions example workflows
- [ ] GitLab CI example configs
- [ ] Docker image for reproducible environments
- [ ] Validation scripts for CI

**Acceptance Criteria:**
- Example workflows work in CI
- Docker image published
- Documentation for CI setup
- Tests run in CI

### v1.0.0 - Production Ready
**Target:** 2027 | **Priority:** P0

#### Comprehensive Documentation
**Effort:** Medium | **Status:** Not Started

- [ ] Complete API reference
- [ ] Package authoring guide
- [ ] Profile creation guide
- [ ] Migration guides from legacy kits
- [ ] Video tutorials

**Acceptance Criteria:**
- All public APIs documented
- Guides cover common workflows
- Migration paths clear
- Tutorials available

#### Migration Guides
**Effort:** Small | **Status:** Not Started

- [ ] ClaudeKit to ePost Agent Kit migration
- [ ] Step-by-step migration instructions
- [ ] Automated migration script (if possible)
- [ ] Compatibility matrix

**Acceptance Criteria:**
- Migration guide published
- Users can migrate successfully
- No data loss during migration
- Tests for migration script

#### Telemetry (Opt-In)
**Effort:** Medium | **Status:** Not Started

- [ ] Usage tracking (opt-in)
- [ ] Error reporting
- [ ] Performance metrics
- [ ] Privacy-first design

**Acceptance Criteria:**
- Telemetry opt-in during setup
- Clear privacy policy
- Data anonymized
- Telemetry dashboard for insights

#### LTS Support Commitment
**Effort:** Ongoing | **Status:** Not Started

- [ ] Long-term support plan
- [ ] Backward compatibility guarantees
- [ ] Security update policy
- [ ] Deprecation guidelines

**Acceptance Criteria:**
- LTS commitment published
- Versioning policy clear
- Security updates timely
- Deprecation notices advance

## Technical Debt

### Priority 1: Refactoring

**1. Split Large Command Files**
**Effort:** Medium | **Impact:** High

- [ ] Split `init.ts` (930 LOC) into `initPackageMode()` and `initKitMode()`
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
- ✅ Test pass rate: 100% (103/103 tests)
- ✅ Code coverage: 70% target met
- ✅ Build success rate: 100% (local)
- ✅ Zero data loss incidents (v0.1.0)

### Adoption Metrics (Targets for v1.0.0)
- Active users: 50+ (after 3 months)
- Package contributions: 10+ community packages (after 6 months)
- Profile diversity: 8+ team-specific profiles

## See Also

- [Project Overview & PDR](./project-overview-pdr.md) - Vision and requirements
- [System Architecture](./system-architecture.md) - Technical design
- [Code Standards](./code-standards.md) - Development conventions
- [Codebase Summary](./codebase-summary.md) - High-level organization
