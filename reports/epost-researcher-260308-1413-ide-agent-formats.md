# Research: IDE Agent & Extension Formats (Claude Code, Cursor, VS Code Copilot) — 2026

**Date**: 2026-03-08
**Agent**: epost-researcher
**Scope**: Current state of agent/extension formats for three IDEs vs epost-agent-kit implementation
**Status**: ACTIONABLE with caveats

---

## Executive Summary

The three IDEs now converge on similar agent formats but with critical differences in maturity, hook support, and cross-IDE compatibility:

| Aspect | Claude Code | Cursor | VS Code Copilot |
|--------|-------------|--------|-----------------|
| **Agent format** | `.md` + YAML frontmatter (stable) | `.md` + YAML (emerging) | `.agent.md` + YAML (stable) |
| **Directory** | `.claude/agents/` | `.cursor/agents/` | `.github/agents/` + `.claude/agents/` |
| **Required fields** | `name`, `description` | Unclear, appears same as CC | `description`, `tools` |
| **Frontmatter support** | Rich (15+ fields) | Limited (name, desc, model, color) | Basic (description, name, tools) |
| **Hook/automation** | Full (PreToolUse, PostToolUse, SubagentStart/Stop) | Limited/emerging | None documented |
| **MCP server support** | Native (.mcp.json + settings.json) | Partial (MCP config exists) | Native (tools config) |
| **Permissions/Access** | Granular (allow/ask/deny + tool-specific rules) | Not documented | Not documented |
| **Cross-IDE compatibility** | `.claude/agents/` recognized by VS Code | CLI support emerging | Reads `.claude/agents/` natively |
| **Task tool** | ✓ Full delegation via Task tool | ✗ NOT working in `.cursor/agents/` | ✓ Task/agent handoffs supported |
| **Maturity** | Mature (v2.0+) | In-progress (known bugs) | Stable |

---

## Findings: Detailed Comparison

### 1. Claude Code — Mature, Rich Feature Set

**Location**: `.claude/agents/` (project-level) or `~/.claude/agents/` (user-level)

**Format**: Markdown file with YAML frontmatter

**Required YAML fields**:
- `name` — Unique identifier (lowercase + hyphens)
- `description` — When Claude should delegate to this agent

**Optional YAML fields** (15 total):
- `tools` — Allowlist (space or comma-separated or array)
- `disallowedTools` — Denylist
- `model` — `sonnet` | `opus` | `haiku` | `inherit` (default: inherit)
- `permissionMode` — `default` | `acceptEdits` | `dontAsk` | `bypassPermissions` | `plan`
- `maxTurns` — Max agentic iterations
- `skills` — Preload skill content
- `mcpServers` — MCP server config (by name or inline definition)
- `hooks` — PreToolUse, PostToolUse, Stop/SubagentStop
- `memory` — `user` | `project` | `local`
- `background` — Run as background task (true/false)
- `isolation` — `worktree` for git isolation
- `color` — UI background color (optional)

**Key capabilities**:
- ✓ Automatic delegation based on task description
- ✓ Task tool available (spawn subagents from agents)
- ✓ Persistent memory directories with auto-included MEMORY.md
- ✓ Skill preloading (full content injected)
- ✓ Hook system with PreToolUse validation (supports `exit code 2` for blocking)
- ✓ MCP server configuration per-agent
- ✓ Permission modes for tool restrictions
- ✓ Worktree isolation for parallel work

**CLI support**: `claude --agents '{...}'` JSON format (same fields as YAML)

**Maturity**: Stable, well-documented. Latest features in v2.1.63+ (Task tool rename from Agent).

**Sources**: [Claude Code sub-agents docs](https://code.claude.com/docs/en/sub-agents), [Claude Code settings](https://code.claude.com/docs/en/settings)

---

### 2. Cursor — Partially Implemented, Known Gaps

**Location**: `.cursor/agents/` (emerging support)

**Format**: Markdown with YAML frontmatter (attempting to match Claude Code)

**Known fields**:
- `name` — Agent identifier
- `description` — Agent purpose
- `model` — Which model to use
- `color` — UI color (appears in examples)

**Critical gaps**:
- ✗ **Task tool NOT available** in `.cursor/agents/` agents. Bug: Task tool missing for custom agents (reported Jan 2026)
- ✗ Unclear which frontmatter fields are actually supported (documentation incomplete)
- ✗ User-level agent discovery fails with `--user-data-dir` on some configurations
- ✗ No documented hook/automation support

**Rules system** (NOT agents):
- `.cursor/rules/` directory (replacing `.cursorrules` file)
- `.mdc` format for individual rule files
- Frontmatter: `description`, `globs`, `alwaysApply`
- `.cursorrules` deprecated (backward compatible, will be removed)

**MCP support**: Mentioned in search results but configuration details missing

**CLI Agent Modes**: Plan mode (`/plan` or `--mode=plan`) and Ask mode; JSON output support

**Maturity**: In-progress, known issues, incomplete documentation. Appears to be tracking Claude Code format but lagging behind.

**Sources**: [Cursor customizing agents](https://cursor.com/learn/customizing-agents), [Cursor subagents docs](https://cursor.com/docs/context/subagents), [Cursor community forum — Task tool issue](https://forum.cursor.com/t/task-tool-missing-for-custom-agents-in-cursor-agents-documentation-pages-return-errors-bug-reports/149771)

---

### 3. VS Code GitHub Copilot — Stable, Basic Features

**Location**: `.github/agents/` (primary) OR `.claude/agents/` (Claude Code compatibility)

**Format**: `.agent.md` Markdown files with YAML frontmatter

**Required/common YAML fields**:
- `description` — Brief agent description (shown as placeholder)
- `name` — Unique identifier
- `tools` — Array of tool names (required if agent needs capabilities)

**Optional fields**:
- `model` — `Claude Opus 4.5`, `GPT-5.2`, etc.
- `handoffs` — Agent handoff configuration (label + target agent)
- `agents` — Not clearly documented in available content

**Markdown body**:
- Custom prompts and guidelines (max 30,000 characters)
- Markdown links to reference files
- `#tool:<tool-name>` syntax to reference tools

**Key capabilities**:
- ✓ Detects agents in `.github/agents/` automatically
- ✓ **Also detects `.claude/agents/` for compatibility** with Claude Code
- ✓ Workspace + user profile + configurable locations via `chat.agentFilesLocations` setting
- ✓ Tool configuration (allow all via `tools: ["*"]` or specific tools)
- ✓ Agent handoff support (link agents for workflow)

**Limitations**:
- ✗ No documented permission modes
- ✗ No hook/automation system
- ✗ No memory persistence system
- ✗ Basic tool configuration only

**Maturity**: Stable. Basic but consistent with GitHub's philosophy.

**Standards compliance**: Supports AGENTS.md open standard (shared with Copilot CLI, Cursor, Gemini CLI)

**Sources**: [VS Code custom agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents), [GitHub Copilot custom agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents), [GitHub awesome-copilot agents](https://github.com/github/awesome-copilot/blob/main/AGENTS.md)

---

### 4. Cross-IDE Compatibility

**Best strategy for sharing agents**:
1. Define agents in `.claude/agents/` using Claude Code format (richest feature set)
2. VS Code Copilot will auto-detect `.claude/agents/` ✓
3. Cursor also recognizes `.cursor/agents/` but with known gaps

**AGENTS.md open standard**:
- Linux Foundation / Agentic AI Foundation spec
- Used by: GitHub Copilot, Claude Code, Cursor, Gemini CLI
- Enables sharing across tools
- However, individual IDE implementations differ on hooks, memory, MCP

**Recommended approach**:
- Primary format: Claude Code `.md` + YAML (`.claude/agents/`)
- VS Code compatibility: Automatic (detects `.claude/agents/`)
- Cursor compatibility: Put copies in `.cursor/agents/` (but understand Task tool limitation)

---

## epost-agent-kit Current Implementation vs Standards

**Current epost-kit structure**:
- `.claude/agents/` — Agent definitions ✓
- `.claude/skills/` — Skill definitions
- `.claude/commands/` — Slash commands
- `settings.json` + `settings.local.json` — Config

**What epost-kit implements correctly**:
- ✓ `.claude/agents/` directory (Claude Code standard)
- ✓ Agent YAML frontmatter with proper fields
- ✓ Skill system (Claude Code specific, not in Cursor/VS Code)
- ✓ Hook system (via settings.json)
- ✓ Permission management

**Gaps for cross-IDE support**:
- `.cursor/agents/` not populated (would require duplicate agents)
- `.github/agents/` not populated (would require agent copies)
- No automatic sync/generation of IDE-specific agent formats
- Cursor agents cannot use Task tool (known limitation)

**For epost-agent-kit to support multiple IDEs**:
1. Keep `.claude/agents/` as source of truth (richest format)
2. Generate `.cursor/agents/` copies (stripped to supported fields)
3. Generate `.github/agents/` copies (converted to VS Code format)
4. Document limitations per IDE (Task tool in Cursor, hooks only in CC, etc.)

---

## Technology Comparison Table

| Capability | Claude Code | Cursor | VS Code Copilot | Notes |
|-----------|-------------|--------|-----------------|-------|
| Basic agent format | `.md` + YAML | `.md` + YAML (emerging) | `.agent.md` + YAML | All converging |
| Automatic delegation | ✓ | ✓ | ✓ | Based on description field |
| Tool allowlist/denylist | ✓ Granular | Partial | Partial | CC most granular |
| Model selection | ✓ 3 aliases + inherit | ✓ | ✓ | All support choice |
| Permission modes | ✓ 5 modes | ✗ | ✗ | CC only |
| Skill preloading | ✓ | ✗ | ✗ | CC specific |
| Memory persistence | ✓ 3 scopes | ✗ | ✗ | CC only |
| Hook system | ✓ Full | ✗ Limited | ✗ | CC mature |
| MCP server config | ✓ Per-agent | Partial | ✓ | CC richest |
| Task/Agent spawning | ✓ Working | ✗ Broken | ✓ Works | Known bug in Cursor |
| Worktree isolation | ✓ | ✗ | ✗ | CC only |
| Background tasks | ✓ | ✗ | ✗ | CC only |
| Cross-IDE detection | VS Code reads `.claude/agents/` | — | Reads `.claude/agents/` | Good interop |

---

## Best Practices & Recommendations

### For epost-agent-kit Implementation

1. **Keep Claude Code as primary IDE** (richest feature set, mature)
   - Define all agents in `.claude/agents/`
   - Use full YAML spec for maximum capability

2. **For Cursor support** (limited):
   - Replicate agents to `.cursor/agents/` with subset of fields
   - Document Task tool limitation in agent prompts
   - Avoid relying on hooks/memory in Cursor agents
   - Test in Cursor regularly (known bugs)

3. **For VS Code Copilot support** (stable but basic):
   - Reuse `.claude/agents/` directly (auto-detected)
   - Or copy to `.github/agents/` for explicit convention
   - Convert rich CC YAML to basic Copilot YAML if needed
   - No conversion required for body/prompt content

4. **Hook/Automation strategy**:
   - All hooks in `.claude/settings.json` (CC only supports)
   - Document that Cursor/VS Code don't support hooks
   - Suggest equivalent workarounds per IDE

5. **Validation approach**:
   - Validate agent YAML against Claude Code spec
   - Generate warnings if agent uses unsupported features for target IDE
   - Provide IDE-specific linting in toolkit

### For Agent Definition Standards

**Minimum baseline** (works everywhere):
```yaml
---
name: agent-id
description: Clear description for delegation
tools: [Read, Bash]
---

Your system prompt here.
```

**Rich format** (Claude Code only, don't expect in Cursor):
```yaml
---
name: agent-id
description: When to use this agent
tools: Read, Grep, Bash
disallowedTools: Write
model: sonnet
permissionMode: dontAsk
memory: project
skills: [skill-name]
mcpServers:
  - github
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./validate.sh"
---

Your system prompt with mission, constraints, and workflow.
```

---

## Unresolved Questions

1. **Cursor agent format finalization**: Is Cursor finalizing agent YAML spec to match Claude Code exactly, or staying divergent? (Docs incomplete as of 2026-03-08)

2. **Cursor Task tool fix timeline**: When will the Task tool become available in `.cursor/agents/`? (Known bug, no timeline found)

3. **VS Code Copilot hook support**: Is Microsoft planning to add hook/automation support to Copilot, or keeping it intentionally minimal? (Not documented)

4. **Cross-IDE agent sync**: Is there tooling to auto-sync agent definitions across `.claude/agents/`, `.cursor/agents/`, `.github/agents/`? (No standard found)

5. **AGENTS.md adoption**: How widely adopted is the AGENTS.md standard? Will it drive convergence or remain a theoretical spec? (Mentioned but unclear adoption status)

6. **epost-kit multi-IDE support**: Should epost-kit explicitly target Cursor/VS Code, or focus on Claude Code as primary? (Strategic question for maintainers)

---

## Verdict

**Status**: `ACTIONABLE`

**epost-agent-kit is currently implementing Claude Code standards correctly** (`.claude/agents/` directory, YAML frontmatter, hooks via settings.json).

**VS Code Copilot compatibility is automatic** — it detects `.claude/agents/` natively.

**Cursor compatibility requires work** — agents can be placed in `.cursor/agents/`, but:
- Task tool is broken (known bug, Jan 2026)
- Frontmatter spec incomplete/undocumented
- Unclear which features are supported

**Recommendation**: Continue investing in Claude Code (mature, feature-rich). Provide Cursor integration as secondary option with clear documentation of limitations. VS Code support is automatic and requires no additional work.

---

## References

- [Claude Code sub-agents documentation](https://code.claude.com/docs/en/sub-agents)
- [Claude Code settings & hooks](https://code.claude.com/docs/en/settings)
- [Cursor customizing agents](https://cursor.com/learn/customizing-agents)
- [Cursor subagents docs](https://cursor.com/docs/context/subagents)
- [Cursor community forum — Task tool issue (Jan 2026)](https://forum.cursor.com/t/task-tool-missing-for-custom-agents-in-cursor-agents-documentation-pages-return-errors-bug-reports/149771)
- [VS Code custom agents](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
- [GitHub Copilot custom agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents)
- [GitHub awesome-copilot agents (AGENTS.md standard)](https://github.com/github/awesome-copilot/blob/main/AGENTS.md)
- [GitHub Copilot CLI custom agents](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli)
- [Medium — Comprehensive Cursor Rules Guide](https://medium.com/@devlato/a-rule-that-writes-the-rules-exploring-rules-mdc-288dc6cf4092)
- [Cursor changelog — CLI Agent Modes (Jan 16, 2026)](https://forum.cursor.com/t/cursor-cli-jan-16-2026-cli-agent-modes-and-cloud-handoff/149171)
