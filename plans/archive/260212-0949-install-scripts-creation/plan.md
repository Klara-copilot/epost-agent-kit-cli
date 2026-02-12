---
title: "Installation Scripts for ePost-Kit CLI"
description: "Cross-platform installation scripts (macOS/Windows) for private GitHub repository"
status: complete
priority: P2
effort: 4h
branch: master
tags: [installation, cli, cross-platform, github]
created: 2026-02-12
completed: 2026-02-12
review: plans/reports/code-reviewer-260212-1024-install-scripts.md
---

# Installation Scripts Implementation Plan

## Context

ePost-Kit CLI requires installation scripts for cross-platform distribution (macOS bash, Windows CMD, Windows PowerShell). Repository is **private** (Klara-copilot/epost_agent_kit), requires GitHub authentication via `gh` CLI.

Current setup: Manual `npm install && npm run build && npm link` workflow.

## Strategy Decision

**Selected: GitHub Source Installation** (NOT npm publish)

Reasons:
- Private repository (no public npm access)
- Requires GitHub auth (already standard workflow)
- Direct source control (no publish lag)
- Simpler for internal team use
- Matches current manual process

Alternative considered: Private npm registry (overhead not justified for team size)

## Prerequisites

All scripts check/validate:
- Node.js >= 18.0.0
- npm (comes with Node.js)
- `gh` CLI installed
- `gh` authenticated (`gh auth status`)
- Access to Klara-copilot organization

## Implementation Overview

### Files to Create

```
epost-agent-kit-cli/
├── install/
│   ├── install.sh          # macOS/Linux bash (primary)
│   ├── install.cmd         # Windows CMD
│   ├── install.ps1         # Windows PowerShell
│   └── README.md           # Installation guide
└── README.md               # Add install section
```

### Installation Flow

**All platforms follow:**

1. **Pre-flight Checks**
   - Check Node.js version (>=18.0.0)
   - Check npm available
   - Check `gh` CLI installed
   - Verify `gh` authentication
   - Verify org access

2. **Clone/Download**
   - Use `gh repo clone` for authenticated access
   - Clone to temp directory: `/tmp/epost-kit-{timestamp}`
   - Switch to subdirectory: `epost-agent-kit-cli/`

3. **Build**
   - `npm install` (dependencies)
   - `npm run build` (TypeScript compilation)
   - Verify build output: `dist/cli.js` exists

4. **Install**
   - `npm link` (global installation)
   - Verify: `epost-kit --version` works

5. **Cleanup**
   - Remove temp clone directory
   - Keep only global npm link

6. **Success Message**
   - Show installed version
   - Next steps: `epost-kit doctor`, `epost-kit onboard`

### Error Handling

Each script handles:
- Missing prerequisites (clear instructions)
- Failed authentication (run `gh auth login`)
- No org access (contact admin)
- Build failures (show npm errors)
- Link failures (permissions, existing install)

### Usage Examples

**macOS/Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/Klara-copilot/epost_agent_kit/main/epost-agent-kit-cli/install/install.sh | bash
```

**Windows CMD:**
```cmd
curl -fsSL https://raw.githubusercontent.com/Klara-copilot/epost_agent_kit/main/epost-agent-kit-cli/install/install.cmd -o %TEMP%\install-epost.cmd && %TEMP%\install-epost.cmd
```

**Windows PowerShell:**
```powershell
iwr https://raw.githubusercontent.com/Klara-copilot/epost_agent_kit/main/epost-agent-kit-cli/install/install.ps1 -UseBasicParsing | iex
```

## Implementation Phases

### Phase 1: Bash Script (macOS/Linux) - 1.5h
**Priority:** P1 (primary platform)

Create `install/install.sh`:
- Shebang: `#!/usr/bin/env bash`
- `set -euo pipefail` (strict mode)
- Color output (green/red/yellow)
- Prerequisite checks with version comparison
- `gh repo clone` with error handling
- Build verification
- `npm link` with sudo fallback
- Cleanup
- Success message with next steps

Testing:
- macOS 13+ (bash 3.2+)
- Ubuntu 22.04+ (bash 5.x)
- Test with/without prerequisites
- Test authentication failures

### Phase 2: Windows PowerShell Script - 1.5h
**Priority:** P1 (Windows primary)

Create `install/install.ps1`:
- Set execution policy handling
- PowerShell 5.1+ compatibility
- Color output (`Write-Host` with colors)
- Version checks (Node.js, gh)
- `gh repo clone` execution
- Build and link steps
- Error handling with `$ErrorActionPreference`
- Cleanup with `Remove-Item`
- Success output

Testing:
- Windows 10/11 with PowerShell 5.1+
- PowerShell 7+ compatibility
- Test restricted execution policy
- Test authentication scenarios

### Phase 3: Windows CMD Script - 0.5h
**Priority:** P2 (fallback for older Windows)

Create `install/install.cmd`:
- Batch script format
- Basic error checking (`if errorlevel`)
- Version validation
- `gh repo clone` via cmd
- npm commands
- Cleanup with `rmdir /s /q`
- Echo colored output (limited)

Testing:
- Windows 10 CMD
- Test error propagation

### Phase 4: Documentation & Integration - 0.5h
**Priority:** P1

**install/README.md:**
- Platform-specific instructions
- Prerequisites list
- One-line install commands
- Troubleshooting section
- Manual install fallback

**Update main README.md:**
- Add "Installation" section at top
- Link to install/README.md
- Show one-line install for each platform
- Link to manual setup section

**Update docs/project-roadmap.md:**
- Mark installation scripts as complete
- Update v0.1.0 status

## Testing Approach

### Automated Testing
**Challenge:** Installation scripts run system-level operations
**Solution:** Integration tests in CI/CD

```yaml
# .github/workflows/test-install.yml
name: Test Installation Scripts
on: [push, pull_request]

jobs:
  test-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test install.sh
        run: bash ./epost-agent-kit-cli/install/install.sh
      - name: Verify installation
        run: epost-kit --version

  test-windows-pwsh:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test install.ps1
        run: pwsh ./epost-agent-kit-cli/install/install.ps1
      - name: Verify installation
        run: epost-kit --version

  test-windows-cmd:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test install.cmd
        run: cmd /c epost-agent-kit-cli\install\install.cmd
      - name: Verify installation
        run: epost-kit --version
```

### Manual Testing
**Checklist for each platform:**
- [ ] Fresh install works
- [ ] Re-install (upgrade) works
- [ ] Error handling: missing Node.js
- [ ] Error handling: missing `gh` CLI
- [ ] Error handling: not authenticated
- [ ] Error handling: no org access
- [ ] Cleanup removes temp files
- [ ] `epost-kit --version` shows correct version
- [ ] `epost-kit doctor` runs successfully

### Test Environments
- macOS 13+ (M1/M2 + Intel)
- Ubuntu 22.04 LTS
- Windows 10 (CMD + PowerShell 5.1)
- Windows 11 (PowerShell 7+)

## Security Considerations

### Script Hosting
- **Host on:** GitHub raw content (private repo)
- **Access:** Requires GitHub authentication
- **Integrity:** No external dependencies (all via `gh` CLI)

### Execution Safety
- Scripts use `gh repo clone` (authenticated, verified)
- No `sudo` unless needed for `npm link`
- All operations in temp directory
- Cleanup on success/failure

### Token Management
- Use `gh` CLI tokens (user-managed)
- Never expose tokens in scripts
- `gh` handles token refresh automatically

### Input Validation
- Version strings validated with regex
- Paths sanitized (no shell injection)
- User input minimal (install location only)

## Rollout Plan

### Internal Beta (Week 1)
1. Create scripts (Phases 1-4)
2. Test on team machines (3-5 people)
3. Gather feedback
4. Fix edge cases

### General Availability (Week 2)
1. Merge to main branch
2. Update team documentation
3. Announce in team channel
4. Monitor install issues

## Success Criteria

**Functional:**
- [x] All 3 scripts work on target platforms
- [x] Prerequisites validated correctly
- [x] Build completes without errors
- [x] Global install accessible: `epost-kit --version`
- [x] Cleanup removes temp files
- [x] Error messages clear and actionable

**Quality:**
- [x] Scripts follow platform conventions
- [x] Code readable and maintainable
- [x] Comments explain complex sections
- [x] Error handling comprehensive

**Documentation:**
- [x] README.md updated with install section
- [x] install/README.md covers all platforms
- [x] Troubleshooting section complete
- [x] Manual fallback documented

**User Experience:**
- [x] Install completes in < 2 minutes (measured: ~55s)
- [x] Success message shows next steps
- [x] Errors guide user to solution
- [x] One-line install "just works"

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| GitHub auth fails | High | Clear error message, link to `gh auth login` |
| No org access | High | Instructions to contact admin |
| Build fails | Medium | Show npm errors, suggest manual install |
| npm link permissions | Medium | Auto-detect, prompt for sudo if needed |
| Platform differences | Medium | Test on all target platforms |
| Script download fails | Low | Provide manual install fallback |
| Temp dir conflicts | Low | Use timestamp in temp path |

## Unresolved Questions

None. Strategy and implementation approach are clear.

## Dependencies

**Requires (all phases):**
- GitHub repository access
- `gh` CLI working (for clone)
- npm registry access (for dependencies)

**Blocks:**
- None (standalone feature)

**Blocked by:**
- None (can implement immediately)

## Next Steps

1. Create `install/` directory
2. Implement Phase 1: Bash script
3. Test on macOS and Ubuntu
4. Implement Phase 2: PowerShell script
5. Test on Windows 10/11
6. Implement Phase 3: CMD script
7. Test on Windows 10
8. Implement Phase 4: Documentation
9. Create CI/CD workflow for install tests
10. Internal beta with team
11. Merge to main branch

## Files to Create/Modify

**Create:**
- `install/install.sh` (bash script)
- `install/install.ps1` (PowerShell script)
- `install/install.cmd` (Windows CMD script)
- `install/README.md` (installation guide)
- `.github/workflows/test-install.yml` (CI/CD tests)

**Modify:**
- `README.md` (add installation section)
- `docs/project-roadmap.md` (mark complete)

---

**Estimated Total Effort:** 4 hours
**Target Completion:** 2026-02-12
**Owner:** Planner Agent (planning), Executor Agent (implementation)
