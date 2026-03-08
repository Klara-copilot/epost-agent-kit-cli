---
phase: 5
title: "VS Code native agent detection"
effort: 2h
depends: [1, 2]
---

# Phase 5: VS Code Native Agent Detection

## Context Links
- [Plan](./plan.md)
- `src/domains/installation/copilot-adapter.ts` -- current VS Code adapter
- `src/commands/init.ts` -- multi-target install flow

## Overview
- Priority: P2
- Status: Completed
- Effort: 2h
- Description: Evaluate whether VS Code Copilot's native `.claude/agents/` reading makes the `.github/` duplication partially or fully redundant, and redesign VS Code adapter strategy accordingly

## Requirements

### Functional
- Determine what VS Code Copilot reads natively from `.claude/`
- Determine what MUST live in `.github/` (copilot-instructions.md, hooks.json, etc.)
- If overlap exists: decide on "thin overlay" vs "full duplication" strategy
- Consider users who install to both claude+vscode targets simultaneously

### Non-Functional
- Research-first phase -- may result in "keep current approach" decision
- Must not break existing VS Code-only installs

## Research Questions

1. **What does VS Code Copilot auto-read from `.claude/`?**
   - Agent .md files?
   - Skills?
   - Hooks/settings.json?
   - CLAUDE.md?

2. **What is `.github/`-only?**
   - copilot-instructions.md
   - hooks.json (Copilot format, not settings.json)
   - .agent.md extension
   - Copilot-specific frontmatter (tools, handoffs)

3. **Dual-install scenario**
   - User runs `epost-kit init --target claude --target vscode`
   - Does Copilot see both `.claude/agents/` and `.github/agents/`?
   - Conflict risk: same agent loaded twice with different formats?

## Implementation Steps

1. **Research VS Code Copilot's .claude/ reading behavior**
   - Check VS Code Copilot extension documentation
   - Test: does VS Code read `.claude/agents/*.md` with Claude frontmatter?
   - Test: does VS Code read `.claude/CLAUDE.md`?

2. **Map feature coverage**
   | Feature | .claude/ native? | .github/ needed? |
   |---------|-----------------|-----------------|
   | Agent definitions | ? | ? |
   | Skills | ? | ? |
   | Hooks | No (different format) | Yes (hooks.json) |
   | Root instructions | ? (CLAUDE.md) | ? (copilot-instructions.md) |

3. **Decision: thin overlay vs full duplication**
   - **Thin overlay**: VS Code target only generates what `.github/` uniquely needs (hooks.json, copilot-instructions.md). Agents/skills read from `.claude/`
   - **Full duplication**: Keep current approach, transform everything to `.github/`
   - **Hybrid**: Generate `.github/` but skip agents/skills if `.claude/` exists

4. **Implement decision**
   - If thin overlay: modify CopilotAdapter to skip agent/skill transforms when `.claude/` exists
   - Add detection: does `.claude/` exist in project root?
   - If dual-target: warn about potential conflicts

5. **Document decision**

## Todo List
- [x] Research VS Code Copilot .claude/ reading (2026 state) — reads `.claude/agents/` natively
- [x] Map feature coverage table — documented in ADR-002
- [x] Make strategy decision — keep full duplication, add dual-target warning
- [x] Implement changes — dual-target detection + warning in `init.ts`
- [x] Test dual-target install scenario — warning fires when `.claude/agents/` exists during vscode install
- [x] Document decision — `docs/decisions/ADR-002-vscode-native-claude-detection.md`

## Success Criteria
- Clear understanding of what VS Code reads from `.claude/` vs `.github/`
- Strategy decision documented
- No regressions for VS Code-only users
- Dual-target installs handled correctly (no agent duplication/conflicts)

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| VS Code Copilot .claude/ support incomplete or undocumented | Med | Test empirically; fall back to full duplication |
| Thin overlay breaks VS Code-only users (no .claude/) | High | Only apply thin overlay when .claude/ exists |

## Security Considerations
- None identified

## Next Steps
- Adapter strategy applies to all future target additions
