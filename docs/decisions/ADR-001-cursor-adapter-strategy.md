# ADR-001: Cursor Adapter Strategy

**Date**: 2026-03-08
**Status**: Accepted
**Deciders**: epost-fullstack-developer (phase 4 implementation)

---

## Context

The `ClaudeAdapter` class serves both `claude` and `cursor` targets via a constructor flag, using a pass-through approach (no file transformation). This ADR documents the decision on whether to:

1. Keep the shared `ClaudeAdapter` pass-through for Cursor
2. Add Cursor-specific branches to `ClaudeAdapter`
3. Create a separate `CursorAdapter` class

Research basis: `reports/epost-researcher-260308-1413-ide-agent-formats.md`

---

## Findings

### Cursor Agent Format (2026 state)

| Aspect | Status |
|--------|--------|
| Format | `.md` + YAML frontmatter in `.cursor/agents/` |
| Supported fields | `name`, `description`, `model`, `color` |
| Unsupported fields | `permissionMode`, `skills`, `memory`, `hooks`, `isolation`, `background`, `disallowedTools`, `mcpServers` |
| Task tool | **BROKEN** (known bug, Jan 2026 — reported on Cursor forum) |
| Hooks/automation | Not supported |
| `.cursorrules` | **Deprecated** — replaced by `.cursor/rules/*.mdc` format |
| Documentation | Incomplete as of 2026-03-08 |

### `.cursorrules` Assessment

`.cursorrules` is a legacy file that is deprecated in favor of the `.cursor/rules/` directory with `.mdc` format files. epost-kit should NOT generate `.cursorrules`. No equivalent to CLAUDE.md generation is needed for Cursor — root instructions can be placed in a `.cursor/rules/*.mdc` file if needed in the future.

### What Pass-Through Gets Right

Cursor agents use the same `.md` + YAML format and directory convention as Claude Code. The file content itself is valid for Cursor — only a **subset of frontmatter fields** is actually acted upon by Cursor. The rest are silently ignored.

This means: **file content pass-through is correct**. Cursor can read the files as-is.

---

## Decision

**Keep `ClaudeAdapter` as the shared class for both `claude` and `cursor` targets.**

Rationale:
- Cursor file format IS the same as Claude Code format — no structural transformation required
- Cursor simply ignores unsupported fields rather than erroring
- A separate `CursorAdapter` would only strip fields, which loses information for users who switch between IDEs
- Keeping full frontmatter in `.cursor/agents/` is harmless and forward-compatible (Cursor may add support for more fields)

**Add warning collection to `ClaudeAdapter` for Cursor target** (implemented):
- Warn on `permissionMode`, `skills`, `memory`, `hooks`, `isolation`, `background`, `disallowedTools`, `mcpServers`
- Warn when agent body uses Task tool (broken in Cursor)
- Display warnings via `formatCompatibilityReport` with `"Cursor"` label

---

## Consequences

### Positive
- No duplication of adapter logic
- Forward-compatible with Cursor improvements (ignored fields become active as Cursor matures)
- Users are informed of limitations without losing data

### Negative
- Cursor users will see warnings for features their IDE doesn't support
- No automatic field-stripping means `.cursor/agents/` files contain unused frontmatter

### Neutral
- `.cursorrules` not generated (deprecated format, not needed)
- Cursor rules (`.cursor/rules/*.mdc`) not generated — out of scope for current phase

---

## Alternatives Considered

| Option | Reason Rejected |
|--------|----------------|
| Separate `CursorAdapter` class | Only benefit would be stripping unsupported fields — creates code duplication for minimal gain |
| Strip fields in `ClaudeAdapter` cursor branch | Loses data for hybrid users; Cursor ignores fields rather than erroring |
| Generate `.cursorrules` | Deprecated format, not needed |

---

## References

- Research report: `reports/epost-researcher-260308-1413-ide-agent-formats.md`
- Cursor forum bug report: https://forum.cursor.com/t/task-tool-missing-for-custom-agents/149771
- Implementation: `src/domains/installation/claude-adapter.ts`
