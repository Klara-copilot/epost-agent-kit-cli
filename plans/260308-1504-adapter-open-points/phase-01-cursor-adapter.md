# Phase 01: CursorAdapter — Real Transform

## Context Links
- [Plan](./plan.md)
- `src/domains/installation/claude-adapter.ts` — current broken pass-through
- `src/domains/installation/target-adapter.ts` — factory + interface
- `src/domains/installation/compatibility-report.ts` — warning formatter

## Overview
- Priority: P1
- Status: Pending
- Effort: 2h
- Description: Create a dedicated CursorAdapter class that properly transforms agent frontmatter to Cursor's 5-field spec, instead of copying all Claude Code fields unchanged.

## Requirements

### Functional
- CursorAdapter.transformAgent: keep only `name`, `description`, `model`; map `permissionMode: plan` to `readonly: true`; map `background` field if present; drop all other fields
- Emit compatibility warnings for every dropped field (reuse existing warning infrastructure)
- Task tool body detection stays (moved to CursorAdapter)
- `rootInstructionsFilename()` returns `"CLAUDE.md"` for now (Phase 2 changes this)
- `replacePathRefs()` replaces `.claude/` with `.cursor/`
- `usesSettingsJson()` returns `true` (Cursor uses settings.json)

### Non-Functional
- CursorAdapter class under 150 LOC
- No changes to ClaudeAdapter (it stays pure pass-through for Claude target)

## Related Code Files

### Files to Create
- `src/domains/installation/cursor-adapter.ts` — new CursorAdapter class

### Files to Modify
- `src/domains/installation/target-adapter.ts:78-84` — factory: `cursor` case imports CursorAdapter
- `src/domains/installation/claude-adapter.ts` — remove cursor-specific code (CURSOR_UNSUPPORTED_FIELDS, _collectCursorWarnings, constructor target param); rename class doc to "Claude Code only"

### Files to Delete
- None

## Implementation Steps

1. **Create `cursor-adapter.ts`**
   - Implement `TargetAdapter` interface
   - `name = "cursor"`, `installDir = ".cursor"`
   - `transformAgent()`: parse frontmatter, build new frontmatter with only allowed fields:
     - `name` → keep
     - `description` → keep
     - `model` → keep (no mapping needed — Cursor accepts same model names)
     - `permissionMode: plan` → `readonly: true`
     - `background` field → keep if present (Cursor supports it)
     - Everything else → drop + add warning
   - `replacePathRefs()`: `.claude/` → `.cursor/`
   - Move Task tool body warning from ClaudeAdapter

2. **Update factory in `target-adapter.ts`**
   - `cursor` case: import `./cursor-adapter.js`, instantiate `CursorAdapter`
   - `claude` case: only imports `ClaudeAdapter` (no target param needed)

3. **Clean up `claude-adapter.ts`**
   - Remove `CURSOR_UNSUPPORTED_FIELDS` constant
   - Remove `_collectCursorWarnings()` method
   - Remove target param from constructor (always "claude")
   - Update class doc comment

4. **Update `CURSOR_UNSUPPORTED_FIELDS` concept in CursorAdapter**
   - Correct field list based on verified 5-field Cursor spec
   - Fields to warn about: `color`, `skills`, `memory`, `permissionMode` (when not `plan`), `hooks`, `isolation`, `disallowedTools`, `mcpServers`, `argument-hint`, `user-invocable`, `disable-model-invocation`

## Todo List
- [ ] Create `src/domains/installation/cursor-adapter.ts`
- [ ] Update factory in `target-adapter.ts`
- [ ] Clean up `claude-adapter.ts` (remove cursor-specific code)
- [ ] Verify: `epost-kit init --target cursor` produces correct agent files
- [ ] Verify: compatibility report shows correct warnings

## Success Criteria
- Agent files in `.cursor/agents/` contain only (name, description, model, readonly, background) in frontmatter
- ClaudeAdapter has zero cursor-specific code
- All dropped fields generate warnings in compatibility report

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cursor adds new supported fields | Low | Fields list is easy to update |
| Breaking existing cursor installs | Med | Old installs had wrong fields anyway — this is a fix |

## Security Considerations
- None identified
