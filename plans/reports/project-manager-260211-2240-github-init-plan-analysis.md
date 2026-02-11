# Project Manager Report: GitHub-Only Init Flow Implementation

**Created by:** Phuong Doan
**Date:** 2026-02-11 22:40
**Plan:** /Users/ddphuong/Projects/agent-kit/epost-agent-kit-cli/plans/260211-2207-github-access-check-init/plan.md
**Status:** Ready for Implementation

---

## Executive Summary

Analyzed implementation plan for GitHub-only init flow. Plan replaces existing dual-mode complexity (local packages + kit-based) with single flow: GitHub access check → release download → package installation.

**Complexity:** Medium
**Estimated Time:** 3 hours
**Tasks Identified:** 27 (9 implementation + 6 testing + 3 review + 3 finalization + 6 validation criteria)
**Ambiguities:** 5 unresolved questions
**Breaking Changes:** Yes - removes local packages and kit-based modes

---

## Task Breakdown

### Step 0: Plan Initialization ✓
- [x] GitHub-Only Init Flow - Implementation

### Step 1: Analysis & Task Extraction ✓
- [x] Analyzed plan structure, dependencies, edge cases
- [x] Extracted 27 tasks across 5 phases
- [x] Identified 5 unresolved questions

### Step 2: Implementation (IN PROGRESS)

**2.1 Create GitHub Access Checker** (30 min)
- File: `src/domains/github/access-checker.ts`
- Functions: `getGitHubToken()`, `checkRepoAccess()`
- Error handling: gh CLI not installed, not authenticated, network errors

**2.2 Create Release Downloader** (60 min)
- File: `src/domains/github/release-downloader.ts`
- Download from releases API tarball_url
- Extract to temp directory
- Copy packages/ + profiles.yaml
- Progress tracking for large downloads
- Integration with cache layer

**2.3 Add Release Validator** (20 min)
- File: `src/domains/github/release-validator.ts`
- Validate packages/ directory exists
- Check packages/core/package.yaml presence
- Zod schema validation for profiles.yaml
- Return ValidationResult with errors/warnings

**2.4 Implement Download Cache** (25 min)
- File: `src/domains/github/release-cache.ts`
- Cache dir: `~/.epost-kit/cache/releases/`
- 24h TTL with metadata JSON
- Functions: `getCachedRelease()`, `cacheRelease()`, `clearCache()`
- Support --force-download flag

**2.5 Simplify Init Command** (45 min)
- File: `src/commands/init.ts`
- Remove: `runKitInit()`, `usePackageMode()`, dual-mode detection
- New flow: checkGitHubAccess() → downloadLatestRelease() → runPackageInit()
- Clear error messages for 404 (no access), 401 (expired token)

**2.6 Add Migration Helper** (25 min)
- File: `src/domains/migration/local-packages-migrator.ts`
- Detect local packages/ directory
- Prompt migration with deprecation warning
- Backup to `.epost-kit-backup/local-packages-{timestamp}/`
- Update metadata: source=github, migratedAt timestamp

**2.7 Update CLI Registration** (10 min)
- File: `src/cli/index.ts`
- Remove obsolete flags (--kit if exists)
- Verify init command options unchanged

**2.8 Enhanced Error Handling** (20 min)
- Rate limiting (429): exponential backoff, max 3 retries
- Expired token (401): prompt `gh auth refresh`
- Network timeout: 60s with AbortController
- Large downloads (>50MB): progress bar

**2.9 Add Debug Logging** (15 min)
- File: `src/core/logger.ts`
- Debug log dir: `~/.epost-kit/logs/`
- Generate diagnostic report on error
- Include: error stack, environment, gh CLI status

### Step 3: Testing

**3.1 Unit: access-checker.test.ts**
- Mock `gh auth token` command (success/failure)
- Mock GitHub API responses (200, 404, 401, 429)
- Test error handling for missing gh CLI

**3.2 Unit: release-downloader.test.ts**
- Mock GitHub releases API
- Mock tarball download with fixtures
- Test extraction and cleanup

**3.3 Unit: release-validator.test.ts**
- Valid release structure
- Missing packages/ directory
- Missing core/package.yaml
- Malformed profiles.yaml

**3.4 Unit: release-cache.test.ts**
- Cache hit/miss scenarios
- TTL expiration (mock Date.now)
- Cache invalidation

**3.5 Integration: init-github-flow.test.ts**
- Full flow: check access → download → validate → install
- Test with cached release
- Test with --force-download

**3.6 Integration: init-migration.test.ts**
- Detect local packages
- Migration flow (backup → download → metadata)
- Decline migration (preserve local)

**Coverage Target:** 85%

### Step 4: Code Review

**4.1 Review GitHub domain modules**
- access-checker, release-downloader, release-validator, release-cache
- Verify error handling completeness
- Check TypeScript types and interfaces

**4.2 Review init command changes**
- Confirm legacy modes removed
- Verify simplified flow logic
- Check error message clarity

**4.3 Review migration helper**
- Backup strategy correctness
- Migration rollback safety
- User experience (prompts, warnings)

### Step 5: Finalize

**5.1 Update documentation**
- README.md: remove local mode, add GitHub setup
- docs/deployment-guide.md: GitHub auth section
- CHANGELOG.md: v0.2.0 breaking changes
- JSDoc: all new domain functions

**5.2 Verify success criteria**
- Core functionality (GitHub access, download, install)
- Validation & security (release structure, schema)
- Caching (24h TTL, --force-download)
- Migration (detect, backup, prompt)
- Error handling (429, 401, timeout, progress)
- Testing (85% coverage, all scenarios)

**5.3 Run final compilation check**
- `npm run build` - verify no errors
- `npm run test` - all tests passing
- `npm run lint` - code quality check

---

## Success Criteria Status

**Core Functionality:**
- [ ] GitHub access check with gh CLI
- [ ] 200 downloads packages + profiles
- [ ] 404 shows invitation message
- [ ] Downloaded packages work with runPackageInit()
- [ ] Error handling for all failure modes
- [ ] Legacy modes removed

**Validation & Security:**
- [ ] Release structure validated
- [ ] profiles.yaml schema validated (Zod)
- [ ] packages/core/package.yaml verified
- [ ] Corrupted releases rejected

**Caching:**
- [ ] 24h cache in ~/.epost-kit/cache/releases/
- [ ] Cache hit skips download
- [ ] --force-download bypasses cache

**Migration:**
- [ ] Auto-detect local packages
- [ ] Migration prompt with deprecation warning
- [ ] Backup before GitHub download
- [ ] Allow decline (temporary)

**Error Handling:**
- [ ] Rate limit retry with backoff
- [ ] Expired token refresh instructions
- [ ] Network timeout clear error
- [ ] Large download progress bar

**Testing:**
- [ ] 85% coverage for new modules
- [ ] Integration tests validate full flow
- [ ] Mock fixtures for GitHub API
- [ ] All edge cases covered

---

## Dependencies

**Required:**
- gh CLI (verified with `which gh`)
- GitHub API v3 (RESTful)
- Existing KitPathResolver (directory paths)
- Existing file operations (backup, copy)

**External:**
- Private repo access: `Klara-copilot/epost_agent_kit`
- GitHub releases API endpoint
- Release tarball_url structure

---

## Breaking Changes

**Removed Features:**
1. Local packages mode (no longer checks local packages/ directory)
2. Kit-based mode (runKitInit() removed)
3. --kit flag (if existed)
4. Mode detection (usePackageMode(), checkGitHubMode())

**Impact:**
- Simplifies codebase (~200 LOC removed)
- Single source of truth: GitHub
- All users require gh CLI + GitHub access
- No manual package setup needed

**Migration Path:**
- Automatic detection of local packages/
- Prompt for migration with backup
- Deprecation warning if declined
- Hard removal in v0.3.0

---

## Risk Assessment

**High Risk:**
1. **GitHub API rate limiting** - Mitigation: exponential backoff, cache layer
2. **Large download failures** - Mitigation: progress tracking, resume capability (future)
3. **Breaking existing users** - Mitigation: migration helper, clear deprecation warnings

**Medium Risk:**
1. **Cache corruption** - Mitigation: validation before extraction, metadata checksums
2. **Token expiration** - Mitigation: clear refresh instructions, auto-detect 401
3. **Network instability** - Mitigation: timeout handling, retry logic

**Low Risk:**
1. **gh CLI not installed** - Mitigation: clear installation instructions
2. **Invalid release structure** - Mitigation: validator with detailed errors

---

## Unresolved Questions

1. **Security:** Should we verify tarball checksums/signatures?
   - **Impact:** Prevents MITM attacks, adds complexity
   - **Recommendation:** Track in v0.3.0, use GitHub release assets checksums

2. **Schema evolution:** How to handle breaking changes in profiles.yaml?
   - **Impact:** User upgrades may fail validation
   - **Recommendation:** Version schema, migration scripts per major version

3. **Rollback capability:** Support rollback to previous cached release if latest broken?
   - **Impact:** Better reliability, more complex cache management
   - **Recommendation:** Add in v0.3.0 with `epost-kit rollback` command

4. **Release tagging:** Semantic versioning or date-based tags?
   - **Impact:** Determines cache keys, version detection
   - **Recommendation:** Confirm with Klara-copilot/epost_agent_kit maintainers

5. **Telemetry:** Add analytics for download failures (opt-in)?
   - **Impact:** Better debugging, privacy considerations
   - **Recommendation:** Add in v0.3.0 with clear opt-in/out

---

## Next Steps for Main Agent

**CRITICAL:** This plan is comprehensive and ready for implementation. All tasks are clearly defined with file paths, function signatures, and acceptance criteria.

**Immediate Actions:**
1. Mark Step 2 (Implementation) as in_progress
2. Start with Step 2.1 (GitHub Access Checker) - foundational module
3. Follow sequential order: 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.7 → 2.8 → 2.9
4. After each module, run `npm run build` to verify compilation
5. Complete Step 3 (Testing) before moving to review

**Delegation Strategy:**
- Implementation: Executor agent (sonnet model)
- Testing: Test-engineer agent (sonnet model)
- Code Review: Code-reviewer agent (opus model)
- Documentation: Docs-manager agent (haiku model)

**Estimated Timeline:**
- Implementation: 3 hours (as estimated in plan)
- Testing: 40 minutes (unit + integration)
- Review: 30 minutes
- Documentation: 30 minutes
- **Total:** 4 hours 40 minutes

**IMPORTANT:** This plan removes ~200 LOC of legacy code and replaces it with cleaner, single-flow architecture. Complete implementation is required - no partial states allowed.

---

## Required Skills/Tools from Catalog

**Skills:**
- `sequential-thinking` - For complex flow logic
- `debugging` - For error handling scenarios
- `code-reviewer` - For Step 4 review phase
- `docs-manager` - For Step 5.1 documentation updates

**Tools:**
- Git: Grep, Read, Write, Edit
- LSP: For TypeScript type checking
- Bash: For gh CLI commands, npm scripts
- AST: For structural code refactoring

---

## Ambiguities Found

1. **Test Fixtures Path:** Plan mentions `tests/fixtures/releases/` but doesn't specify if this directory exists or needs creation
   - **Resolution Needed:** Check existing test structure, create fixtures directory if missing

2. **Cache Cleanup Strategy:** Plan defines 24h TTL but doesn't specify automatic cleanup mechanism
   - **Resolution Needed:** Add cleanup logic in getCachedRelease() or separate cleanup command

3. **Migration Decline Behavior:** Plan allows declining migration "for now" but unclear when hard enforcement begins
   - **Resolution Needed:** Clarify v0.3.0 timeline, add deprecation notice with clear date

4. **Progress Bar Implementation:** Plan references "ProgressBar" class but doesn't specify library
   - **Resolution Needed:** Check if existing progress implementation exists, or use ora spinner with percentage

5. **Diagnostic Report Sharing:** Plan suggests sharing report when filing issue but no issue template provided
   - **Resolution Needed:** Create GitHub issue template with diagnostic report section

---

## Token Efficiency Notes

- Plan is 797 lines - comprehensive but verbose
- Core implementation steps: lines 97-580 (483 lines)
- Testing section: lines 582-661 (79 lines)
- Success criteria: lines 663-707 (44 lines)
- Could be condensed to ~400 lines by removing redundant code examples
- **Recommendation:** Extract code snippets to separate example files

---

**Report Status:** Complete
**Next Action:** Main agent should begin Step 2.1 (GitHub Access Checker)
**Blocking Issues:** None - plan is implementation-ready

