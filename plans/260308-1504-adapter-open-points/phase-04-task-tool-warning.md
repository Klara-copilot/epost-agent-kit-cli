# Phase 04: Task Tool Conditional Warning

## Context Links
- [Plan](./plan.md)
- [Phase 01](./phase-01-cursor-adapter.md) — prerequisite (CursorAdapter must exist)
- Current warning: `src/domains/installation/claude-adapter.ts:134-143`

## Overview
- Priority: P3
- Status: Pending
- Effort: 1.5h
- Description: Improve Task tool warning to only fire when agent body actually references the Task tool, and add a doc comment for future removal tracking.

## Requirements

### Functional
- Task tool warning fires ONLY when agent body contains Task tool references
- Detection patterns: `Task tool`, `TaskCreate`, `TaskUpdate`, `TaskGet`, `spawn.*task`, `Task\b` (with word boundary)
- Add doc comment in CursorAdapter with tracking reference:
  ```
  // Cursor Task tool bug: https://github.com/getcursor/cursor/issues/XXXX
  // Monitor for fix. Remove this warning when Task tool works in .cursor/agents/
  // Last verified broken: Cursor v2.4-2.5, March 2026
  ```
- Warning severity stays "high" (subagent delegation is a core feature)

### Non-Functional
- Detection regex should be maintainable (single constant, easy to update)
- No external version detection (Cursor doesn't expose version to CLI tools)

## Related Code Files

### Files to Modify
- `src/domains/installation/cursor-adapter.ts` — refine Task tool detection regex, add tracking comment

### Files to Delete
- None

## Implementation Steps

1. **Refine Task tool detection in CursorAdapter**
   - Current regex: `/\bTask\b/.test(body) || /\btask tool\b/i.test(body)`
   - Problem: `\bTask\b` matches too broadly (e.g., "Task Breakdown" in plan descriptions)
   - Better pattern:
     ```typescript
     const TASK_TOOL_PATTERNS = [
       /\bTask\s+tool\b/i,
       /\bTaskCreate\b/,
       /\bTaskUpdate\b/,
       /\bTaskGet\b/,
       /\bTaskList\b/,
       /spawn.*subagent/i,
       /\bTask\b.*\bspawn\b/i,
     ];
     const usesTaskTool = TASK_TOOL_PATTERNS.some(p => p.test(body));
     ```

2. **Add tracking comment**
   - Document the bug reference and removal criteria
   - Include date of last verification

3. **Update warning message**
   - Change date from "Jan 2026" to "March 2026" (last verified)
   - Keep severity "high"

## Todo List
- [ ] Refine Task tool detection patterns in CursorAdapter
- [ ] Add bug tracking comment with removal criteria
- [ ] Update warning date to March 2026
- [ ] Verify: agents without Task tool references get no warning
- [ ] Verify: agents with Task tool references get warning

## Success Criteria
- `epost-planner` agent (which mentions Task tool) triggers warning
- `epost-journal-writer` agent (no Task tool) does NOT trigger warning
- Bug tracking comment exists in source for future maintainers

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| False negatives (missed Task usage) | Low | Patterns cover known usage forms |
| False positives ("Task" in prose) | Med | Word boundary + context patterns reduce this |

## Security Considerations
- None identified
