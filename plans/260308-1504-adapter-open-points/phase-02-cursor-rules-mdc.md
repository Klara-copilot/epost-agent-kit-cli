# Phase 02: Generate .cursor/rules/*.mdc for Cursor Target

## Context Links
- [Plan](./plan.md)
- [Phase 01](./phase-01-cursor-adapter.md) — prerequisite
- `src/domains/installation/claude-md-generator.ts` — snippet pipeline
- `src/commands/init.ts:774-786` — CLAUDE.md generation block

## Overview
- Priority: P1
- Status: Pending
- Effort: 2h
- Description: When target=cursor, generate `.cursor/rules/epost-kit.mdc` from the same snippet pipeline that builds CLAUDE.md. This gives Cursor users equivalent project context.

## Requirements

### Functional
- Generate `.cursor/rules/epost-kit.mdc` with frontmatter: `description`, `globs` (omitted), `alwaysApply: true`
- Content: same snippets as CLAUDE.md, assembled in layer order
- CursorAdapter.rootInstructionsFilename() returns `"rules/epost-kit.mdc"` (relative to install dir)
- init.ts: when target=cursor, generate BOTH CLAUDE.md at project root AND `.cursor/rules/epost-kit.mdc`
  - Reasoning: Cursor also reads CLAUDE.md for context, so keep it
  - The .mdc file provides structured rules with `alwaysApply` semantics

### Non-Functional
- .mdc file uses same snippet content — no separate template needed
- Keep generator function reusable for future per-package .mdc files

## Related Code Files

### Files to Create
- `src/domains/installation/mdc-generator.ts` — generates .mdc files from snippets

### Files to Modify
- `src/domains/installation/cursor-adapter.ts` — update rootInstructionsFilename()
- `src/commands/init.ts:774-786` — add .mdc generation when target=cursor (after CLAUDE.md generation)

### Files to Delete
- None

## Implementation Steps

1. **Create `mdc-generator.ts`**
   - Export `generateMdcFile(snippets: PackageSnippet[], outputPath: string, options?: { description?: string, globs?: string, alwaysApply?: boolean })`
   - Generates `.mdc` format:
     ```
     ---
     description: epost-kit project context and conventions
     alwaysApply: true
     ---
     {assembled snippet content}
     ```
   - Assemble snippets in layer order, separated by horizontal rules
   - Strip YAML frontmatter from individual snippets if present

2. **Update CursorAdapter**
   - `rootInstructionsFilename()` → `"rules/epost-kit.mdc"`

3. **Update init.ts**
   - In the `adapter.usesSettingsJson()` branch (Claude/Cursor path, line ~724):
   - After CLAUDE.md generation, add:
     ```
     if (target === "cursor") {
       const rulesDir = join(installDir, "rules");
       await mkdir(rulesDir, { recursive: true });
       await generateMdcFile(snippets, join(rulesDir, "epost-kit.mdc"));
     }
     ```
   - Track the .mdc file in `allFiles` metadata for ownership

## Todo List
- [ ] Create `src/domains/installation/mdc-generator.ts`
- [ ] Update CursorAdapter.rootInstructionsFilename()
- [ ] Update init.ts to generate .mdc when target=cursor
- [ ] Verify: `.cursor/rules/epost-kit.mdc` has correct frontmatter
- [ ] Verify: content matches CLAUDE.md snippets

## Success Criteria
- `epost-kit init --target cursor` creates `.cursor/rules/epost-kit.mdc`
- File has valid .mdc frontmatter (description, alwaysApply: true)
- Content includes all package snippets in layer order
- CLAUDE.md is also still generated at project root

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cursor .mdc format changes | Low | Simple 3-field format, unlikely to change |
| Snippets too large for Cursor context | Med | Cursor handles large rules files; monitor for issues |

## Security Considerations
- None identified
