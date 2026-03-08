# ADR-002: VS Code Native `.claude/` Detection Strategy

**Date**: 2026-03-08
**Status**: Accepted
**Deciders**: epost-fullstack-developer (phase 5 implementation)

---

## Context

VS Code GitHub Copilot **natively reads `.claude/agents/`** in addition to `.github/agents/`. This creates a question: is the `CopilotAdapter`'s full duplication of agents to `.github/agents/` still necessary, or can we adopt a "thin overlay" approach?

Research basis: `reports/epost-researcher-260308-1413-ide-agent-formats.md`

---

## Findings

### What VS Code Copilot Reads Natively

| Feature | `.claude/` native? | `.github/` needed? |
|---------|-------------------|-------------------|
| Agent definitions (`.md` files) | YES — reads `.claude/agents/` | Optional (explicit convention) |
| Skills | No — VS Code has no skill system | N/A |
| Hooks/automation | No — no settings.json hook support | Yes — `hooks.json` (different format) |
| Root instructions | No — CLAUDE.md not read | Yes — `copilot-instructions.md` |
| MCP servers | No — different config mechanism | Via VS Code settings.json |

### Dual-Target Scenario

When a user runs `epost-kit init --target claude` then `epost-kit init --target vscode`:
- `.claude/agents/` — installed by Claude adapter
- `.github/agents/` — installed by Copilot adapter (transforms: `.agent.md` extension, simplified frontmatter)
- VS Code Copilot will **load both directories simultaneously**
- Same agent appears twice in VS Code's agent picker under different names/formats

### Thin Overlay Option

A "thin overlay" approach would have `CopilotAdapter` skip agent/skill transforms when `.claude/agents/` already exists, generating only:
- `copilot-instructions.md`
- `hooks.json`

Risk: VS Code-only users (no `.claude/` directory) would have no agents in `.github/agents/` — they'd need to understand that VS Code reads `.claude/`.

---

## Decision

**Keep full duplication strategy in `CopilotAdapter`** — no change to adapter logic.

Rationale:
- **Safety for VS Code-only users**: Users who only use VS Code have no `.claude/` directory. Full duplication ensures agents are accessible via explicit `.github/` convention
- **Explicit is better**: `.github/agents/` with properly transformed `.agent.md` files is the documented VS Code Copilot convention
- **Thin overlay adds complexity**: Detection of `.claude/` presence adds conditional logic that complicates the installation flow
- **Agent transformation is valuable**: The `CopilotAdapter` strips unsupported fields (permissionMode, skills, memory) and adds required fields (tools array) — this produces cleaner VS Code-native agent files

**Add dual-target detection warning** (implemented):
- When `target === "vscode"` and `.claude/agents/` already exists: warn the user
- Explain that VS Code will see agents from BOTH directories
- This is expected behavior for Claude Code + VS Code dual users

---

## Feature Coverage Table

| Feature | `.claude/` native in VS Code? | `.github/` unique value |
|---------|------------------------------|------------------------|
| Basic agent reading | YES | Explicit convention, cleaner format |
| Agent frontmatter transform | NO — CC format | tools array, .agent.md extension |
| Hook system | NO | `hooks.json` (different format, required) |
| Root instructions | NO | `copilot-instructions.md` (required) |
| Skills | N/A | N/A |
| Permissions | NO | N/A |

---

## Consequences

### Positive
- No regressions for VS Code-only users
- Explicit `.github/` structure follows VS Code convention
- Transformed agent files are cleaner for VS Code (proper tools array, stripped CC-only fields)

### Negative
- Dual-target installs result in agent duplication in VS Code picker
- Duplication is a maintenance concern (agents must be reinstalled via both targets when updated)

### Mitigated
- Dual-target duplication warned at install time via the new detection warning

---

## Future Consideration

If/when Copilot adds a setting to disable `.claude/agents/` auto-detection, or if the AGENTS.md open standard provides a canonical single-directory approach, revisit the thin overlay option.

---

## Alternatives Considered

| Option | Reason Rejected |
|--------|----------------|
| Thin overlay (skip agents if `.claude/` exists) | Breaks VS Code-only users; adds conditional complexity |
| Hybrid (generate `.github/` but mark agents as symlinks) | Symlinks in git repos are fragile; not cross-platform safe |
| User prompt at install to choose strategy | Too much friction for a secondary decision |

---

## References

- Research report: `reports/epost-researcher-260308-1413-ide-agent-formats.md`
- VS Code custom agents: https://code.visualstudio.com/docs/copilot/customization/custom-agents
- Implementation: `src/domains/installation/copilot-adapter.ts`, `src/commands/init.ts`
