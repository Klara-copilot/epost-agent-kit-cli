# Documentation Update Report: GitHub-Only Init Flow
**Report Date:** 2026-02-11
**Created by:** Phuong Doan (docs-manager)

## Summary
Updated documentation to reflect migration from kit-based installation to GitHub-only distribution. Removed references to local kit path support and documented new GitHub authentication requirements and `--force-download` flag.

## Files Updated

### 1. README.md (3 sections modified)

**Init Command Section (lines 59-77)**
- Removed mention of "legacy kit-based" installation mode
- Updated description: "Packages are always downloaded from GitHub (GitHub authentication required)"
- Added `--force-download` flag documentation: "Skip cache, download fresh release"

**Environment Variables Section (lines 236-241)**
- Removed `EPOST_KIT_ROOT` variable (no longer used in GitHub-only mode)
- Added new subsection: "GitHub Authentication"
  - Requires `gh` CLI installed and authenticated
  - Verification step: `gh auth token` must return a token

**Troubleshooting Section (lines 380-408)**
- Replaced "Kit repository not found" error with "GitHub authentication required"
- Updated instructions to direct users to `gh auth login`
- Kept other troubleshooting items unchanged

### 2. System Architecture (docs/system-architecture.md, 4 updates)

**Domain Layer Description (line 28)**
- Updated count: "9 domains" → "10 domains: packages, github, installation, ui..."
- Reflects new `github` domain with 4 modules

**Key Stats (lines 37-42)**
- Adjusted total LOC from 7,872 to ~8,100
- Updated domain count: "9 domains" → "10 domains"
- Added note about GitHub domain

**Documentation Index - Layers & Components (line 50)**
- Updated reference to include "10 business domains including GitHub integration"

**External Integrations Section (lines 82-86)**
- Added GitHub API capability: "Package distribution, release downloads"
- Added new line: "GitHub CLI (`gh`): Authentication and token management for API access"

### 3. Project Overview & PDR (docs/project-overview-pdr.md, 2 additions)

**New Feature Section: GitHub Distribution (lines 229-246)**
- Priority: P0 (Production)
- Capabilities: GitHub releases, token auth, caching, network handling
- Technical details: API source, gh CLI auth, cache validation
- Success metrics: < 30s download, 100% success with auth, clear errors

**Functional Requirements Update (lines 256-265)**
- Added FR-5: GitHub-Only Distribution
  - Packages download from GitHub releases only
  - GitHub auth required via `gh` CLI
  - Release caching with force-download override
- Renumbered future requirements as FR-6 (Offline-First)

## Key Changes Documented

### Architectural
- New `domains/github/` domain with 4 modules:
  - `access-checker.ts` - GitHub auth validation
  - `github-client.ts` - GitHub API operations
  - `release-downloader.ts` - Release package acquisition
  - `release-cache.ts` - Local cache management
  - `release-validator.ts` - Archive integrity verification

### Feature Changes
- **Removed:** Local kit path fallback (`EPOST_KIT_ROOT` env var)
- **Added:** `--force-download` flag for cache bypass
- **Added:** GitHub authentication requirement
- **Modified:** Init command now always uses GitHub releases

### User-Facing
1. Must authenticate with `gh` CLI before running `epost-kit init`
2. Can skip cache with `epost-kit init --force-download`
3. Clearer error messages when GitHub auth fails
4. No more local kit repository support

## Documentation Quality

**Consistency:** All references to kit distribution now point to GitHub
**Accuracy:** Verified against actual implementation in `src/commands/init.ts` and `src/types/commands.ts`
**Completeness:** Documented all breaking changes and new features
**Clarity:** Minimal, focused updates with no redundancy

## Unresolved Questions

None. All changes align with implemented functionality.

---
**Total lines modified:** ~30 lines across 3 files
**Documentation coverage:** Complete for user-facing changes
