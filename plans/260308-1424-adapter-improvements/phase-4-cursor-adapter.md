---
phase: 4
title: "Cursor adapter assessment"
effort: 3h
depends: []
---

# Phase 4: Cursor Adapter Assessment

## Context Links
- [Plan](./plan.md)
- `src/domains/installation/claude-adapter.ts` -- current pass-through for Cursor
- Research report: `reports/epost-researcher-260308-1413-ide-agent-formats.md`

## Overview
- Priority: P2
- Status: Completed
- Effort: 3h
- Description: Research Cursor's actual agent format and determine if a separate CursorAdapter is needed or if pass-through with minor tweaks suffices

## Requirements

### Functional
- Determine Cursor's current agent YAML spec (2026 state)
- Assess whether `.cursorrules` generation is needed
- Decide: separate CursorAdapter class or enhanced ClaudeAdapter with cursor-specific branches
- If CursorAdapter needed: implement transforms

### Non-Functional
- Research-first phase -- may result in "no change needed" decision
- Document findings in ADR format regardless of outcome

## Research Questions

1. **Does Cursor use the same `.cursor/agents/*.md` frontmatter as Claude Code?**
   - Same fields? Different fields? Additional fields?
   - Does Cursor respect `skills:`, `memory:`, `permissionMode:`?

2. **Is Cursor's Task tool functional in 2026?**
   - If broken: should we warn users about subagent patterns not working?
   - If working: any differences from Claude Code's Task tool?

3. **Does Cursor support `.cursorrules`?**
   - Equivalent to CLAUDE.md? Different format?
   - Should we generate both CLAUDE.md and .cursorrules for Cursor target?

4. **Does Cursor support settings.json hooks?**
   - Same format as Claude Code?
   - Any missing hook events?

## Implementation Steps

1. **Research Cursor documentation**
   - Check Cursor docs for agent format spec
   - Check .cursorrules format and purpose
   - Check hook support

2. **Test current pass-through**
   - Install to `.cursor/` with current adapter
   - Verify agents load in Cursor
   - Verify hooks execute
   - Note any failures or warnings

3. **Decision: Separate adapter or not**
   - If formats identical: keep ClaudeAdapter pass-through, add .cursorrules generation only
   - If minor diffs: add cursor-specific branches in ClaudeAdapter
   - If major diffs: create CursorAdapter class

4. **Implement decision**
   - If .cursorrules needed: add `rootInstructionsFilename()` override for cursor
   - If CursorAdapter: implement with specific transforms
   - If pass-through correct: document why and close

5. **Document decision**
   - Write ADR in docs/decisions/ explaining Cursor adapter strategy

## Todo List
- [x] Research Cursor agent format (2026) — researcher report `reports/epost-researcher-260308-1413-ide-agent-formats.md`
- [x] Research .cursorrules format — deprecated, replaced by `.cursor/rules/*.mdc`
- [x] Test current pass-through in Cursor — pass-through is correct; file format is same
- [x] Make adapter decision — keep ClaudeAdapter pass-through, add cursor warning collection
- [x] Implement changes — warning collection for unsupported fields + Task tool detection
- [x] Document decision as ADR — `docs/decisions/ADR-001-cursor-adapter-strategy.md`

## Success Criteria
- Clear decision documented on whether Cursor needs separate adapter
- If yes: CursorAdapter implemented with correct transforms
- If no: documentation explains why pass-through is correct
- .cursorrules generation added if Cursor uses it

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Cursor format changes frequently | Med | Design adapter to be easily updateable |
| Limited Cursor documentation | Med | Test empirically with actual Cursor install |

## Security Considerations
- None identified

## Next Steps
- Findings may inform Phase 5 (VS Code native detection interplay)
