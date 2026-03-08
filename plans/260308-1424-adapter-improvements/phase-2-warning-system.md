---
phase: 2
title: "Compatibility warning system"
effort: 2h
depends: [1]
---

# Phase 2: Compatibility Warning System

## Context Links
- [Plan](./plan.md)
- `src/domains/installation/copilot-adapter.ts` -- all transform methods
- `src/domains/installation/target-adapter.ts` -- TargetAdapter interface
- `src/commands/init.ts:392` -- adapter creation point

## Overview
- Priority: P1
- Status: Completed
- Effort: 2h
- Description: When CopilotAdapter drops features during transform, collect warnings and display a compatibility report to the user after install

## Requirements

### Functional
- Track every feature dropped during VS Code transform (hook matchers, prompt hooks, agent fields: color, skills, memory)
- Display categorized compatibility report after install completes
- Severity levels: HIGH (behavioral change like matchers), MEDIUM (missing functionality), LOW (cosmetic like color)
- Report must be actionable: tell user what was dropped and why

### Non-Functional
- Warning collection must not affect transform output
- Report format: structured terminal output, not a file
- No warnings emitted for Claude/Cursor targets (pass-through = no drops)

## Related Code Files

### Files to Modify
- `src/domains/installation/target-adapter.ts` -- add `getWarnings(): CompatibilityWarning[]` to interface
- `src/domains/installation/copilot-adapter.ts` -- collect warnings during transforms
- `src/domains/installation/claude-adapter.ts` -- return empty warnings array
- `src/commands/init.ts` -- display warnings after install

### Files to Create
- `src/domains/installation/compatibility-report.ts` -- warning types, report formatter

### Files to Delete
- None

## Implementation Steps

1. **Define warning types**
   ```typescript
   interface CompatibilityWarning {
     severity: 'high' | 'medium' | 'low';
     category: 'hooks' | 'agents' | 'skills' | 'config';
     feature: string;      // e.g., "hook matcher: Edit|Write"
     source: string;       // e.g., "PreToolUse hook group"
     reason: string;       // e.g., "VS Code hooks.json does not support matchers"
   }
   ```

2. **Add warnings to TargetAdapter interface**
   - `getWarnings(): CompatibilityWarning[]` -- returns collected warnings
   - ClaudeAdapter: return `[]` always
   - CopilotAdapter: collect warnings in private array during transforms

3. **Instrument CopilotAdapter transforms**
   - `transformAgent`: warn on dropped fields (color, skills, memory, permissionMode subtleties)
   - `transformHooks`: warn on dropped matchers (from Phase 1), dropped prompt-type hooks
   - `transformSkill`: warn if skill references Claude-specific features

4. **Create compatibility report formatter**
   - Group warnings by severity, then category
   - Format for terminal: colored output (HIGH=red, MED=yellow, LOW=dim)
   - Summary line: "X features not available in VS Code target"

5. **Display in init.ts**
   - After all files installed, call `adapter.getWarnings()`
   - If warnings.length > 0, display report
   - HIGH severity: suggest user review specific files

## Todo List
- [x] Define CompatibilityWarning type
- [x] Add getWarnings to TargetAdapter interface
- [x] Implement warning collection in CopilotAdapter
- [x] Create report formatter
- [x] Integrate into init.ts post-install
- [x] Test: VS Code install shows warnings for known drops — 16 new tests pass

## Success Criteria
- VS Code install displays compatibility report listing all dropped features
- Claude/Cursor installs show no warnings
- Each warning includes severity, what was dropped, and why

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Too many warnings overwhelm user | Med | Group by severity; only expand HIGH by default |
| Warning messages become stale as Copilot evolves | Low | Review warnings when Copilot schema changes |

## Security Considerations
- None identified

## Next Steps
- Phase 3 adds handoff warnings for agents without frontmatter handoffs
