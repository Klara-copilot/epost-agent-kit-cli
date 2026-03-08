---
phase: 1
title: "Fix VS Code hook matchers + path transform"
effort: 2h
depends: []
---

# Phase 1: Fix VS Code Hook Matchers + Path Transform

## Context Links
- [Plan](./plan.md)
- `src/domains/installation/copilot-adapter.ts:128-171` -- transformHooks method
- `src/domains/config/kit-config-merger.ts:47-83` -- mergeAndWriteKitConfig
- `.claude/settings.json` -- source hooks with `matcher` fields

## Overview
- Priority: P0
- Status: Completed
- Effort: 2h
- Description: Fix two critical bugs in CopilotAdapter

## Requirements

### Functional
- Hook matchers must be preserved in VS Code hooks.json output (if Copilot supports it) or clearly warned (Phase 2 dependency)
- `.epost-kit.json` paths containing `.claude/` must be transformed to `.github/` for VS Code target
- `replacePathRefs` must also be applied to `.epost-kit.json` content

### Non-Functional
- No new dependencies
- Backward compatible with existing Claude/Cursor installs

## Related Code Files

### Files to Modify
- `src/domains/installation/copilot-adapter.ts` -- add matcher support to transformHooks (line 148: matcher field dropped)
- `src/commands/init.ts` -- apply adapter.replacePathRefs to .epost-kit.json content before writing

### Files to Create
- None

### Files to Delete
- None

## Implementation Steps

1. **Research Copilot hooks.json schema**
   - Check if VS Code Copilot hooks.json supports a `matcher` or `pattern` field
   - If yes: map Claude `matcher` -> Copilot equivalent
   - If no: store matcher info as comment/metadata and queue warning (Phase 2)

2. **Fix transformHooks matcher handling**
   - Current code at line 143-144: `const g = group as Record<string, unknown>` -- reads `g.hooks` but ignores `g.matcher`
   - If Copilot supports matchers: add `matcher` or equivalent field to output entries
   - If not: at minimum, preserve matcher as a `// matcher: Edit|Write` comment in hooks.json or return it as metadata for warning system
   - Return dropped features list from transformHooks for Phase 2

3. **Fix .epost-kit.json path transformation**
   - In `init.ts`, after `mergeAndWriteKitConfig` writes the file, read it back and apply `adapter.replacePathRefs()`
   - Alternative: add adapter param to `mergeAndWriteKitConfig` and transform paths inline
   - Preferred: pass adapter to merger, transform JSON string values recursively

4. **Add replacePathRefs to kit-config-merger**
   - New optional param: `pathTransformer?: (content: string) => string`
   - Apply to JSON string values that contain path-like strings (`.claude/`, `.cursor/`)

## Todo List
- [x] Verify Copilot hooks.json matcher support — no matcher field; records as `DroppedFeature`
- [x] Update `transformHooks` to handle matchers — returns `droppedFeatures` array
- [x] Add path transform to kit-config-merger output — `pathTransformer` optional param
- [x] Test: VS Code install produces hooks.json with matcher info — 10 new tests pass
- [x] Test: VS Code .epost-kit.json has `.github/` paths — 4 new tests pass

## Success Criteria
- hooks.json preserves matcher semantics or returns metadata about dropped matchers
- `.epost-kit.json` for VS Code target contains `.github/.epost-ignore` not `.claude/.epost-ignore`

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Copilot hooks.json schema undocumented | High | Research first; fall back to warning-only approach |
| Path replacement too aggressive (replaces in non-path contexts) | Med | Only transform known path fields, not full content |

## Security Considerations
- None identified

## Next Steps
- Phase 2 consumes dropped-features metadata from this phase
