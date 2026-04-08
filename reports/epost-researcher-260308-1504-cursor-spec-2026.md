# Research: Cursor IDE Agent Specification & Task Tool Status (2026)

**Date**: March 8, 2026
**Agent**: epost-researcher
**Status**: ACTIONABLE
**Scope**: Cursor IDE agent file format, Task tool functionality, Cursor vs Claude Code compatibility

---

## Executive Summary

Cursor IDE (v2.5+) uses a **different agent architecture** from Claude Code:

- **Agents**: Markdown `.md` files with YAML frontmatter in `.cursor/agents/`
- **Rules**: `.mdc` files (not equivalent to CLAUDE.md)
- **Task Tool**: **Known bug as of March 2026** — Task tool unavailable when `subagent_delegation_context` is injected. Multiple unresolved reports on Cursor forum.
- **Compatibility**: Cursor **does NOT read** `.claude/agents/` files. Separate agent ecosystem.

**Key Finding**: Cursor removed Custom Modes in v2.1 and is moving away from extensible custom agents. VS Code + Claude Code are doubling down. Not compatible at agent format level.

---

## Research Question

1. What YAML frontmatter fields does Cursor `.cursor/agents/` support?
2. Is there a complete Cursor agent spec comparable to Claude Code's subagent format?
3. What is the `.mdc` file format for rules? Replacement for `.cursorrules`?
4. Does Cursor support a root instructions file like CLAUDE.md?
5. What is the Task tool bug status in Cursor agents?
6. Can Cursor read `.claude/agents/` files natively?

---

## Sources Consulted

1. [Cursor Docs — Subagents](https://cursor.com/docs/context/subagents) — Credibility: High (official)
2. [Claude Code Docs — Create custom subagents](https://code.claude.com/docs/en/sub-agents) — Credibility: High (official)
3. [Cursor Docs — Rules](https://cursor.com/docs/context/rules) — Credibility: High (official)
4. [Cursor Forum — Task tool not available with subagent_delegation_context](https://forum.cursor.com/t/task-tool-not-available-to-agent-when-subagent-delegation-context-is-injected-2-5-17-windows/152174) — Credibility: High (official bug report)
5. [Cursor Forum — Task Tool Missing for Custom Agents](https://forum.cursor.com/t/task-tool-missing-for-custom-agents-in-cursor-agents-documentation-pages-return-errors/149771) — Credibility: High (Jan 23, 2026)
6. [Cursor Forum — Sub-agent task broken in 2.4.22](https://forum.cursor.com/t/sub-agent-task-broken-in-2-4-22/150210) — Credibility: High (reported regression)
7. [Medium — A Rule That Writes the Rules: Exploring rules.mdc](https://medium.com/@devlato/a-rule-that-writes-the-rules-exploring-rules-mdc-288dc6cf4092) — Credibility: Medium (community analysis)
8. [GitHub — rule-porter: Convert Cursor rules to CLAUDE.md](https://github.com/RayFernando1337/llm-cursor-rules) — Credibility: Medium (community tool)
9. [GitHub — Custom Agents: Cursor removes its own](https://forum.cursor.com/t/custom-agents-vs-code-cc-double-down-cursor-removes-its-own/145931) — Credibility: High (feature decision)
10. [Builder.io — Claude Code vs Cursor 2026](https://www.builder.io/blog/claude-code-vs-cursor-2026) — Credibility: Medium (comparative analysis)

---

## Key Findings

### 1. Cursor Agent Format (`.cursor/agents/*.md`)

**Supported YAML Frontmatter Fields** (as of Cursor 2.5–2.6):

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `name` | string | No | Unique identifier (defaults to filename) |
| `description` | string | No | When/why to use this agent; influences auto-delegation |
| `model` | string | No | `"fast"`, `"inherit"`, or model ID (default: `"inherit"`) |
| `readonly` | boolean | No | Block write operations when `true` |
| `background` | boolean | No | Run as background task without blocking |

**Structure**:
```yaml
---
name: my-agent
description: What this agent does
model: inherit
readonly: false
background: false
---

# System Prompt
You are an expert at [domain]. Your job is to...
```

**File Locations**:
- `.cursor/agents/` — Project-level agents
- `~/.cursor/agents/` — User-level agents (all projects)

**Note**: This is **NOT a superset** of Claude Code's subagent format. Cursor has a much simpler agent model with no tools list, no skills injection, no hooks, no memory fields.

---

### 2. Cursor Rules Format (`.mdc` files)

**NOT a replacement for `.cursorrules`** — rather, an enhancement to it.

**Supported YAML Frontmatter** (`.cursor/rules/*.mdc`):

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `description` | string | Yes (for agent-requested mode) | Rule purpose; AI decides if relevant |
| `globs` | string or array | No | File patterns to auto-attach rule when files match |
| `alwaysApply` | boolean | No | If `true`, rule always included; globs ignored |

**Activation Modes**:
- **Always** (`alwaysApply: true`, no globs) — Rule always in context
- **Auto-Attach** (globs defined, `alwaysApply: false`) — Rule attached if file glob matches
- **Agent-Requested** (`description` only) — AI decides if relevant based on context
- **Manual** (none of above) — Never auto-attached; user includes manually

**Example**:
```yaml
---
description: "Enforce TypeScript strict mode in all components"
globs: ["src/components/**/*.tsx", "src/**/*.ts"]
alwaysApply: false
---

# TypeScript Strict Mode
- All .ts files must use strict mode
- No `any` type without justification
```

**Key Insight**: `.mdc` format is **stricter** and more controlled than plain `.cursorrules`. The `.cursorrules` file still exists and works but is plain text (no YAML, no globs, always applied).

---

### 3. Root Instructions File (Cursor's CLAUDE.md Equivalent)

**Cursor does NOT have a direct CLAUDE.md equivalent**.

**What Cursor uses**:
- `.cursorrules` — Plain text (no YAML), always applied to all agent interactions
- `.cursor/rules/*.mdc` — Structured rules with YAML and glob patterns
- **No project-level `settings.json` equivalent** for orchestration

**Recommended Setup for Dual Cursor + Claude Code Projects**:
```
project/
├── CLAUDE.md               # Claude Code instructions + agent definitions
├── .cursorrules            # Cursor instructions (plain text)
├── .cursor/rules/          # Cursor structured rules (optional, for advanced control)
└── .claude/agents/         # Claude Code agents (NOT read by Cursor)
```

The formats are **intentionally separate**. Cursor's philosophy is simpler (plain text first, optional YAML), while Claude Code uses structured frontmatter.

---

### 4. Cursor Task Tool Bug Status

**CRITICAL FINDING**: Multiple unresolved bugs reported in Cursor v2.4–2.5 (Jan–Mar 2026):

| Bug | Reported | Status | Impact |
|-----|----------|--------|--------|
| Task tool unavailable when `subagent_delegation_context` injected | ~2 weeks ago (Feb 24) | UNRESOLVED | Agents cannot spawn subagents |
| Task tool missing for custom agents in `.cursor/agents/` | Jan 23, 2026 | UNRESOLVED | Custom agents cannot delegate |
| Sub-agent task broken in v2.4.22 | Jan 2026 | REGRESSION | Worked in 2.4.21, broke in 2.4.22 |
| Task tool not injected in Cursor CLI | ~1 week ago (Mar 1) | UNRESOLVED | CLI agents cannot spawn tasks |

**Forum Posts** (Cursor Community):
1. [Task tool not available to agent when subagent_delegation_context is injected (2.5.17, Windows)](https://forum.cursor.com/t/task-tool-not-available-to-agent-when-subagent-delegation-context-is-injected-2-5-17-windows/152174)
2. [Task Tool Missing for Custom Agents in .cursor/agents/](https://forum.cursor.com/t/task-tool-missing-for-custom-agents-in-cursor-agents-documentation-pages-return-errors/149771)
3. [Sub-agent task broken in 2.4.22](https://forum.cursor.com/t/sub-agent-task-broken-in-2-4-22/150210)

**Verdict**: Do NOT rely on Cursor's Task tool for agent subdelegation at this time. Workflows requiring custom agent spawning are broken in Cursor as of March 2026.

---

### 5. Cursor vs Claude Code Agent Compatibility

**No native compatibility**:

| Aspect | Claude Code | Cursor |
|--------|-------------|--------|
| Agent file location | `.claude/agents/*.md` | `.cursor/agents/*.md` |
| YAML frontmatter | name, description, model, tools, skills, memory, hooks, permissionMode, etc. (14+ fields) | name, description, model, readonly, background (5 fields) |
| Rules format | CLAUDE.md (optional, plain markdown) | `.cursorrules` (plain text) or `.cursor/rules/*.mdc` (structured) |
| Task tool | **WORKS** (Agent tool for spawning subagents) | **BROKEN** (Task tool disabled in many scenarios as of Mar 2026) |
| Skills injection | Yes (`skills` field in frontmatter) | No direct equivalent |
| Persistent memory | Yes (`memory` field: user/project/local) | No equivalent |
| Hooks | Yes (PreToolUse, PostToolUse, Stop, SubagentStart, SubagentStop) | No equivalent |
| Tool restrictions | Yes (allowlist `tools`, denylist `disallowedTools`) | Yes (`readonly` only) |

**Can Cursor read `.claude/agents/`?**
**No.** Cursor only reads `.cursor/agents/`. The formats are separate, and Cursor does not attempt to load or parse Claude Code agent files.

---

### 6. Strategic Context: Cursor's Direction in Agent Space

**Cursor v2.1 removed Custom Modes** (basic agent customization), signaling a retreat from extensible custom agent support.

**Contrast with Claude Code**:
- Claude Code: **Doubling down** on custom subagents with rich YAML, skills, memory, hooks
- Cursor: **Simplifying** agents, removing custom modes, focusing on built-in agents + rules

**Community tool: rule-porter** exists to convert:
- Cursor `.mdc` rules → CLAUDE.md
- Cursor `.cursorrules` → AGENTS.md
- But **not the reverse** (Cursor's simpler format loses structure)

This suggests Cursor is consolidating around **built-in agents + rules**, not pursuing extensible custom agent definitions like Claude Code is.

---

## Comparison Table: Agent & Rule Formats

| Criterion | Cursor Agents (`.md`) | Claude Code Subagents (`.md`) | Cursor Rules (`.mdc`) | CLAUDE.md |
|-----------|------------------------|-------------------------------|------------------------|-----------|
| Location | `.cursor/agents/` | `.claude/agents/` | `.cursor/rules/` | `project/` root |
| YAML fields | 5 (minimal) | 14+ (rich) | 3 (description, globs, alwaysApply) | None (plain MD) |
| Tools control | readonly flag only | Full allowlist/denylist (tools, disallowedTools) | N/A (rules, not tools) | N/A |
| Skill injection | No | Yes (skills field) | N/A | N/A |
| Memory support | No | Yes (user/project/local) | N/A | N/A |
| Hooks support | No | Yes (6+ hook types) | N/A | N/A |
| Task tool | BROKEN (as of Mar 2026) | WORKS | N/A | N/A |
| Auto-delegation | Yes (based on description) | Yes (based on description) | N/A (rules always/on-glob) | N/A |

---

## Best Practices & Recommendations

### For epost-kit (Dual Cursor + Claude Code Support)

**Verdict**: Build separate agent ecosystems. Do NOT attempt cross-compatibility.

**Recommended project structure**:

```
project/
├── CLAUDE.md                    # Claude Code instructions + orchestration
├── .claude/agents/              # Claude Code custom subagents
│   ├── code-reviewer.md
│   ├── debugger.md
│   └── ...
├── .claude/skills/              # Claude Code skill modules
├── .cursorrules                 # Cursor instructions (plain text)
├── .cursor/rules/               # Cursor structured rules (optional)
│   ├── typescript-strict.mdc
│   └── ...
└── .cursor/agents/              # Cursor custom agents (if needed)
    ├── code-improver.md
    └── ...
```

**If targeting Cursor only**:
- Use `.cursorrules` (simpler, no YAML overhead)
- OR use `.cursor/rules/*.mdc` for fine-grained glob control
- Keep agents simple (5 frontmatter fields only)
- **Avoid Task tool for agent spawning** until Cursor fixes the bugs

**If targeting Claude Code only**:
- Use `.claude/agents/` with full YAML richness
- Leverage skills injection, memory, hooks
- Use Task tool freely for agent orchestration
- Structure CLAUDE.md as a simple index

### For epost-kit Upgrade Path

**DO NOT**:
- Try to make `.claude/agents/` readable by Cursor
- Use Claude Code's advanced fields (hooks, memory, skills) in a Cursor-compatible agent
- Rely on Cursor's Task tool for custom agent delegation (broken in Mar 2026)

**DO**:
- Generate separate agent definitions for each IDE using templates
- Use `rule-porter` to auto-convert rules between systems
- Document which agents/rules are IDE-specific
- Test both systems independently

---

## Unresolved Questions

1. **Will Cursor fix the Task tool bug by end of March 2026?** Unclear; multiple reports suggest it's not a priority.
2. **Does Cursor plan to re-introduce custom agent modes?** No public roadmap; v2.1 removal suggests they're moving away from extensibility.
3. **Is the `.mdc` format a long-term commitment or transitional?** Unclear; could be superseded by simpler format.
4. **What is Cursor's long-term vision for agent extensibility?** Not published; current signals suggest built-in agents + rules only.
5. **Will epost-kit target Cursor at all, or focus on Claude Code?** Out of scope for this research; strategic decision for project maintainers.

---

## Conclusion

**Cursor IDE and Claude Code have fundamentally different agent architectures as of March 2026**. They are **not compatible at the agent definition level**. Cursor's agent format is simpler (5 YAML fields) and has a known broken Task tool for spawning subagents. Claude Code's format is richer (14+ YAML fields) and fully functional for agent orchestration.

For epost-kit, the recommendation is **to build separate agent definitions for each IDE** rather than attempt a unified format. If Cursor support is desired in the future, use templating to generate IDE-specific agents from a common semantic specification.

---

## Sources

- [Cursor Docs — Subagents](https://cursor.com/docs/context/subagents)
- [Claude Code Docs — Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- [Cursor Docs — Rules](https://cursor.com/docs/context/rules)
- [Cursor Forum — Task tool not available with subagent_delegation_context](https://forum.cursor.com/t/task-tool-not-available-to-agent-when-subagent-delegation-context-is-injected-2-5-17-windows/152174)
- [Cursor Forum — Task Tool Missing for Custom Agents](https://forum.cursor.com/t/task-tool-missing-for-custom-agents-in-cursor-agents-documentation-pages-return-errors/149771)
- [Cursor Forum — Sub-agent task broken in 2.4.22](https://forum.cursor.com/t/sub-agent-task-broken-in-2-4-22/150210)
- [Medium — A Rule That Writes the Rules: Exploring rules.mdc](https://medium.com/@devlato/a-rule-that-writes-the-rules-exploring-rules-mdc-288dc6cf4092)
- [GitHub — Custom Agents: Cursor removes its own](https://forum.cursor.com/t/custom-agents-vs-code-cc-double-down-cursor-removes-its-own/145931)
- [Builder.io — Claude Code vs Cursor 2026](https://www.builder.io/blog/claude-code-vs-cursor-2026)
