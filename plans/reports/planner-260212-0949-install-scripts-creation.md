# Installation Scripts Creation - Planning Report

**Date:** 2026-02-12 09:49
**Agent:** planner (a560df6)
**Plan:** /Users/ddphuong/Projects/agent-kit/epost-agent-kit-cli/plans/260212-0949-install-scripts-creation/plan.md

## Summary

Created comprehensive plan for cross-platform installation scripts (macOS bash, Windows PowerShell, Windows CMD) for epost-kit CLI. Strategy: GitHub source installation (private repo) using `gh` CLI authentication.

## Key Decisions

**Installation Strategy:** GitHub source (NOT npm)
- Private repo requires auth anyway
- Direct source control
- Simpler for internal team
- Matches current manual workflow

**Prerequisites:** Node.js 18+, npm, `gh` CLI authenticated
**Installation Flow:** Check → Clone → Build → Link → Cleanup → Verify

## Implementation Structure

**4 Phases (4h total):**
1. Bash script (1.5h) - macOS/Linux primary
2. PowerShell script (1.5h) - Windows primary
3. CMD script (0.5h) - Windows fallback
4. Documentation (0.5h) - READMEs + roadmap

**Files Created:**
- `install/install.sh` (bash)
- `install/install.ps1` (PowerShell)
- `install/install.cmd` (CMD)
- `install/README.md` (guide)
- `.github/workflows/test-install.yml` (CI)

**Files Modified:**
- `README.md` (add install section)
- `docs/project-roadmap.md` (mark complete)

## Technical Approach

**All scripts follow same flow:**
1. Validate prerequisites (Node 18+, npm, gh CLI, auth)
2. Clone to temp: `gh repo clone Klara-copilot/epost_agent_kit`
3. Build: `npm install && npm run build`
4. Install: `npm link` (with sudo fallback)
5. Verify: `epost-kit --version`
6. Cleanup temp directory

**Error handling:** Each prerequisite failure shows clear fix instructions

## One-Line Install Examples

**macOS/Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/Klara-copilot/epost_agent_kit/main/epost-agent-kit-cli/install/install.sh | bash
```

**Windows PowerShell:**
```powershell
iwr https://raw.githubusercontent.com/Klara-copilot/epost_agent_kit/main/epost-agent-kit-cli/install/install.ps1 -UseBasicParsing | iex
```

**Windows CMD:**
```cmd
curl -fsSL https://raw.githubusercontent.com/Klara-copilot/epost_agent_kit/main/epost-agent-kit-cli/install/install.cmd -o %TEMP%\install-epost.cmd && %TEMP%\install-epost.cmd
```

## Testing Strategy

**Automated (CI/CD):**
- GitHub Actions workflow tests all 3 scripts
- Runs on: macos-latest, windows-latest
- Validates: install completes + `epost-kit --version` works

**Manual (checklist per platform):**
- Fresh install
- Re-install (upgrade)
- Error scenarios (missing prereqs, no auth, no access)
- Cleanup verification

**Test environments:**
- macOS 13+ (M1/M2 + Intel)
- Ubuntu 22.04
- Windows 10 (CMD + PowerShell 5.1)
- Windows 11 (PowerShell 7+)

## Security

- Scripts use `gh` CLI (authenticated, user-managed tokens)
- All ops in temp directory
- No sudo unless needed for npm link
- No external dependencies
- Cleanup on success/failure

## Success Criteria

**Functional:**
- All 3 scripts work on target platforms
- Prerequisites validated correctly
- Build completes without errors
- Global install: `epost-kit --version` works
- Temp files cleaned up
- Error messages actionable

**Quality:**
- Platform conventions followed
- Code readable, maintainable
- Comprehensive error handling
- Comments on complex sections

**Documentation:**
- README.md updated with install section
- install/README.md covers all platforms
- Troubleshooting complete
- Manual fallback documented

**UX:**
- Install < 2 minutes
- Success shows next steps
- Errors guide to solution

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| GitHub auth fails | Clear error + link to `gh auth login` |
| No org access | Instructions to contact admin |
| Build fails | Show npm errors, suggest manual install |
| npm link permissions | Auto-detect, prompt sudo if needed |
| Platform differences | Test all target platforms |

## Next Steps (Execution)

1. Create `install/` directory
2. Implement bash script (Phase 1)
3. Test macOS + Ubuntu
4. Implement PowerShell script (Phase 2)
5. Test Windows 10/11
6. Implement CMD script (Phase 3)
7. Test Windows 10
8. Write documentation (Phase 4)
9. Create CI workflow
10. Internal beta with team
11. Merge to main

## Context Used

- `/epost-agent-kit-cli/package.json` - Package config, engines, bin entry
- `/epost-agent-kit-cli/README.md` - Current manual install process, commands
- `gh repo view` output - Confirmed private repo (requires auth)
- Environment check - Node 25.6.0, npm 11.8.0, gh 2.86.0

## Notes

- Repository is private (visibility: PRIVATE)
- Requires Klara-copilot org access
- Current manual: `npm install && npm run build && npm link`
- CLI package: `epost-kit` (bin: `dist/cli.js`)
- Node engine: >=18.0.0
- Already has prepublishOnly script (typecheck, lint, test, build)

---

**Created by:** Phuong Doan
**Plan File:** /Users/ddphuong/Projects/agent-kit/epost-agent-kit-cli/plans/260212-0949-install-scripts-creation/plan.md
