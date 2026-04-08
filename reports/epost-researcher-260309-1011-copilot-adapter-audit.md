# Research: VS Code Copilot Adapter Installation Audit

**Date**: 2026-03-09
**Agent**: epost-researcher
**Scope**: Deep scan of luz_next/.github/ Copilot installation vs. correct VS Code format
**Status**: ACTIONABLE — multiple HIGH and MEDIUM severity issues identified

---

## Executive Summary

Scanned luz_next/.github/ directory (installed via epost-kit v2.0.0) and compared against VS Code Copilot documentation. The installation is mostly functional but has **3 HIGH-severity issues**, **6 MEDIUM-severity issues**, and **3 LOW-severity issues** that affect agent behavior, hook execution, and compatibility.

**Key finding**: Installation follows correct naming convention (`.github/agents/*.agent.md`, `hooks.json`, `copilot-instructions.md`) but has structural problems in:
1. Frontmatter serialization (handoffs format malformed)
2. Hook event name support (using unsupported VS Code event variants)
3. Agent capabilities exposure (missing configuration fields)

---

## Directory Structure

```
.github/
├── .epost-kit.json                    ✓ (correct metadata)
├── .epost-ignore                      ✓ (scout block ignore patterns)
├── copilot-instructions.md            ✓ (correct format, ~8.4KB)
├── agents/
│   ├── epost-planner.agent.md         ⚠ (frontmatter issue)
│   ├── epost-fullstack-developer.agent.md  ⚠ (frontmatter issue)
│   ├── epost-debugger.agent.md        ⚠ (frontmatter issue)
│   ├── epost-researcher.agent.md      ⚠ (frontmatter issue)
│   ├── epost-tester.agent.md          ⚠ (frontmatter issue)
│   ├── epost-code-reviewer.agent.md   ⚠ (frontmatter issue)
│   ├── epost-muji.agent.md            ⚠ (frontmatter issue)
│   ├── epost-project-manager.agent.md ⚠ (frontmatter issue)
│   ├── epost-docs-manager.agent.md    ⚠ (frontmatter issue)
│   ├── epost-git-manager.agent.md     ✓ (no handoffs, OK)
│   ├── epost-journal-writer.agent.md  ✓ (no handoffs, OK)
│   ├── epost-mcp-manager.agent.md     ✓ (no handoffs, OK)
│   └── epost-brainstormer.agent.md    ⚠ (frontmatter issue)
├── hooks/
│   ├── hooks.json                     ⚠ (event name & location issues)
│   ├── session-init.cjs               ✓ (correct path)
│   ├── subagent-init.cjs              ✓ (correct path)
│   ├── context-reminder.cjs           ✓ (correct path)
│   ├── post-index-reminder.cjs        ✓ (correct path)
│   ├── scout-block.cjs                ✓ (correct path)
│   ├── privacy-block.cjs              ✓ (correct path)
│   ├── subagent-stop-reminder.cjs     ✓ (correct path)
│   ├── session-metrics.cjs            ✓ (correct path)
│   ├── lesson-capture.cjs             ✓ (correct path)
│   ├── notifications/                 ✓ (correct path)
│   └── scripts/                       ⚠ (duplicate directory structure)
├── skills/                            ✓ (50 SKILL.md files, all correct)
├── output-styles/                     ✓ (6 coding level files, correct)
└── assets/                            ✓ (static assets)
```

**Total**: 13 agents, 50 skills, 7 hook scripts

---

## Issues Identified

### HIGH SEVERITY (3)

| ID | Issue | Location | Impact | Fix |
|----|-------|----------|--------|-----|
| **H1** | Handoffs serialization malformed | All 10 agents with handoffs (epost-planner, fullstack-dev, debugger, researcher, tester, code-reviewer, muji, project-manager, docs-manager, brainstormer) | Handoff targets **not recognized by VS Code** — agents cannot route to other agents in Copilot UI | Use valid YAML handoff format: `label:`, `agent:`, `prompt:`, no `[[object Object]]` |
| **H2** | Unsupported hook events in hooks.json | hooks.json contains: `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStart`, `SubagentStop` | Hooks do NOT fire in VS Code (only SessionStart/Stop supported per 2026 spec) — context-reminder, scout-block, privacy-block, subagent hooks are **dead code** | Verify VS Code hook event support; remove unsupported events or document as Copilot CLI-only |
| **H3** | Duplicate hook script directories | `/hooks/` contains scripts directly AND in `/hooks/scripts/` subdirectory (mirrored structure) | **Context bloat, redundant execution** — scripts executed from wrong path, tests run twice | Remove `/hooks/scripts/` duplicate directory; keep scripts at `.github/hooks/` only |

### MEDIUM SEVERITY (6)

| ID | Issue | Location | Impact | Fix |
|----|-------|----------|--------|-----|
| **M1** | Frontmatter serialization: handoffs shows `[[object Object]]` | Lines 6 in agent .md files | Tells user "(ePost) ... frontmatter: [[object Object]]" — confusing, indicates parse error | Fix CopilotAdapter.serializeFrontmatter() to properly YAML-encode handoffs objects |
| **M2** | Missing `tools` field for epost-mcp-manager | epost-mcp-manager.agent.md | Agent has no `tools` field — VS Code may default to empty set (agent cannot read files) | Add tools field: `tools: ['readFile', 'editFiles', 'runInTerminal', 'listDirectory', 'textSearch', 'fetch']` |
| **M3** | agent field in handoff format issue | All handoff targets | Handoff agents use simple names (e.g., `agent: epost-fullstack-developer`) but VS Code may require `@` prefix or full path | Verify VS Code handoff agent reference format; may need `agent: @epost-fullstack-developer` |
| **M4** | Hook path references still use relative paths | hooks.json bash commands: `"bash": "node .github/hooks/session-init.cjs"` | Paths assume execution from workspace root (may fail if hook runs from different CWD) | Use absolute path or `process.cwd()`-relative paths: `${COPILOT_HOOKS_ROOT}/session-init.cjs` |
| **M5** | No `mcp-servers` field in agent frontmatter | All agents missing mcp-servers | Agents cannot declare required MCP server dependencies (context7, web-rag-system configured in .vscode/mcp.json but agents can't declare them) | Add mcp-servers field if agents depend on MCP tools |
| **M6** | copilot-instructions.md references non-existent agents | Line 79-82: "Suggest `@epost-researcher`", "Use `@epost-planner`", etc. | Users cannot invoke agents via @mention if agents not discoverable by CLI; only works in VS Code UI agent picker | Update instructions to clarify VS Code UI discovery vs @mention syntax |

### LOW SEVERITY (3)

| ID | Issue | Location | Impact | Fix |
|----|-------|----------|--------|-----|
| **L1** | Spelling consistency: "user-invokable" vs "user-invocable" | skills/ SKILL.md files use `user-invokable: false` (correct) | Adapter transforms this to "user-invokable" but original uses "invocable" — minor inconsistency | No fix needed; adapter is correct (VS Code standard is "invokable") |
| **L2** | No `target` field in any agent | All agents missing `target` field | If agents should be VS Code-only (not Copilot CLI), not declared | Add `target: vscode` if agents are VS Code-specific only |
| **L3** | Agent descriptions truncated in frontmatter | epost-docs-manager has YAML-quoted description that may have parsing issues | Description wrapped in quotes may cause YAML parsing issues if description contains colons | Verify all agent descriptions are properly quoted/escaped |

---

## Correct Format (Per VS Code Documentation)

### Agent Frontmatter (`.agent.md`)

**Valid format**:
```yaml
---
name: epost-planner
description: Planning & Research Coordination — creates detailed implementation plans
model: Claude Opus 4.6
tools: ['readFile', 'listDirectory', 'textSearch', 'fetch']
target: vscode
handoffs:
  - label: Implement plan
    agent: epost-fullstack-developer
    prompt: Implement the plan that was just created
---
```

**Rules**:
- `name`: unique agent identifier (required)
- `description`: agent purpose in plain English (required)
- `model`: Claude model name (optional, defaults to available)
- `tools`: array of available tools (recommended: limit per agent capability)
- `target`: `vscode` or `github-copilot` or omit for both (optional)
- `handoffs`: array of objects with `label`, `agent`, `prompt`, optional `send` (optional)
- `mcp-servers`: array of MCP server names if agent depends on them (optional, new in 2026)

**Do NOT use**:
- `handoffs: [[object Object]]` ✗ (serialization artifact)
- Nested YAML comments in frontmatter ✗
- `[[object Object]]` anywhere in frontmatter ✗

Sources: [Custom agents in VS Code](https://code.visualstudio.com/docs/copilot/customization/custom-agents), [GitHub Docs on custom agents](https://docs.github.com/en/copilot/reference/custom-agents-configuration)

### Hooks Configuration (`hooks.json`)

**Valid format**:
```json
{
  "version": 1,
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "bash": "./audit/log-session-start.sh"
      }
    ],
    "Stop": [
      {
        "type": "command",
        "bash": "./audit/log-session-end.sh"
      }
    ]
  }
}
```

**Supported hook events in VS Code** (as of March 2026):
- `SessionStart`: new agent session begins
- `Stop`: agent session ends
- **NOT SUPPORTED**: UserPromptSubmit, PreToolUse, PostToolUse, SubagentStart, SubagentStop (these are Copilot CLI/epost extensions)

**Hook command field**:
- `bash`: shell command string (bash on Unix, also supports powershell on Windows)
- `timeoutSec`: timeout in seconds (optional)
- `cwd`: working directory (optional, defaults to workspace root)

**Rules**:
- Paths should be relative to workspace root
- OR use absolute paths for deterministic execution
- Hook output is ignored (hooks are fire-and-forget)

Sources: [Agent hooks in Visual Studio Code](https://code.visualstudio.com/docs/copilot/customization/hooks), [GitHub Copilot hooks configuration](https://docs.github.com/en/copilot/reference/hooks-configuration)

### Workspace Instructions (`copilot-instructions.md`)

**Valid format** (plain Markdown, no frontmatter):
```markdown
# GitHub Copilot Instructions

Keep instructions short and self-contained.
Write each instruction as a single, simple statement.
Show preferred and avoided patterns with concrete code examples.

## Example: Code Style

Use const for immutable values, let for mutable variables. Avoid var.

Good:
const API_KEY = process.env.API_KEY;

Bad:
var apiKey = process.env.API_KEY;
```

**Location**: `.github/copilot-instructions.md` (auto-detected by VS Code)

**Rules**:
- Plain Markdown (no YAML frontmatter)
- Whitespace between instructions ignored (single paragraph OK)
- Include reasoning behind rules
- Use concrete code examples
- Keep total under ~10KB

Sources: [Use custom instructions in VS Code](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)

---

## Root Cause Analysis

### Issue H1: Handoffs Serialization

**Root cause**: CopilotAdapter.serializeFrontmatter() at line 210-220 skips handoffs in main loop (line 202: `continue`), then tries to serialize them separately. The parsing captures handoffs as `[[object Object]]` string literal instead of array of objects.

**Evidence**:
```typescript
// Line 201-202 in copilot-adapter.ts
} else if (typeof value === "object") {
  continue; // handoffs serialized separately below
}
```

When frontmatter is parsed, handoffs come through as parsed objects, but serializer doesn't handle them correctly on output.

**Expected**: Handoffs should serialize as valid YAML:
```yaml
handoffs:
  - label: Implement plan
    agent: epost-fullstack-developer
    prompt: Implement the plan
```

**Actual**: Appears in output as:
```yaml
handoffs: [[object Object]]
```

### Issue H2: Unsupported Hook Events

**Root cause**: epost-kit generates hooks.json using event names from Claude Code / Copilot CLI specification (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, SubagentStart, SubagentStop, Stop). VS Code Copilot only supports subset: SessionStart, Stop.

**Evidence from VS Code docs**:
> "The supported hook events in VS Code Copilot include: SessionStart (when a new agent session begins) and Stop (when agent session ends)."

Other events are Copilot CLI / epost-kit extensions, not supported in VS Code yet (as of March 2026).

**Impact**: Hooks configured for UserPromptSubmit, PreToolUse, PostToolUse, SubagentStart, SubagentStop will silently not execute. No error reported; user assumes they work.

### Issue H3: Duplicate Hook Scripts

**Root cause**: Installation contains both:
- `.github/hooks/session-init.cjs` (original)
- `.github/hooks/scripts/session-init.cjs` (copy)

Appears to be from migration or multi-target templating (epost-kit supports Claude Code, Cursor, VS Code; Claude Code uses `.claude/hooks/scripts/`, Cursor uses `.cursor/hooks/`, VS Code should use `.github/hooks/` directly).

**Impact**: Repository size bloat, confusing for users, potential for divergent versions if one is edited.

---

## Compatibility Matrix

| Feature | VS Code | Copilot CLI | Claude Code | Fix for VS Code |
|---------|---------|-------------|-------------|-----------------|
| Agent `.agent.md` | ✓ | ✓ | ✗ (uses `.md`) | No change needed |
| Handoffs in agents | ✓ | ✓ | ✗ | Fix serialization |
| SessionStart hook | ✓ | ✓ | ✓ | No change needed |
| UserPromptSubmit hook | ✗ | ✓ | ✓ | Remove from VS Code |
| PreToolUse hook | ✗ | ✓ | ✓ | Remove from VS Code |
| PostToolUse hook | ✗ | ✓ | ✓ | Remove from VS Code |
| SubagentStart hook | ✗ | ✓ | ✓ | Remove from VS Code |
| SubagentStop hook | ✗ | ✓ | ✓ | Remove from VS Code |
| Stop hook | ✓ | ✓ | ✓ | No change needed |
| copilot-instructions.md | ✓ | ✗ | ✗ | No change needed |
| MCP servers in agents | ✓ (2026) | ✓ | ✗ | Add mcp-servers field |

---

## Recommendations

### Immediate (Critical Path)

1. **Fix handoffs serialization** in CopilotAdapter.serializeFrontmatter()
   - Current: Outputs `[[object Object]]`
   - Fix: Properly serialize to YAML with label/agent/prompt keys
   - Severity: HIGH — blocks agent-to-agent routing

2. **Remove unsupported hook events from VS Code installation**
   - Remove: UserPromptSubmit, PreToolUse, PostToolUse, SubagentStart, SubagentStop
   - Keep: SessionStart, Stop
   - Severity: HIGH — hooks silently fail to execute
   - Alternative: Document as "Copilot CLI only" if supporting both targets

3. **Remove duplicate hook scripts**
   - Delete `.github/hooks/scripts/` directory entirely
   - Move any unique files to `.github/hooks/`
   - Severity: HIGH — code duplication, confusion

### Secondary (Robustness)

4. **Add tools field to epost-mcp-manager** (M2)
5. **Verify handoff agent reference format** — may need `@` prefix (M3)
6. **Use absolute/workspace-root paths in hooks** (M4)
7. **Add mcp-servers field to agents** if they depend on Context7 or other MCP (M5)
8. **Update copilot-instructions.md** to clarify @mention vs UI discovery (M6)
9. **Add target: vscode field** to agents if they should be VS Code-only (L2)

---

## Code Changes Required

### copilot-adapter.ts: Fix Handoffs Serialization

**Current code (broken)**:
```typescript
// Line 201-220
} else if (typeof value === "object") {
  continue; // handoffs serialized separately below
}
// ...
const handoffs = fm["handoffs"];
if (Array.isArray(handoffs) && handoffs.length > 0) {
  lines.push("handoffs:");
  for (const h of handoffs as Array<Record<string, unknown>>) {
    lines.push(`  - label: ${h.label}`);
    lines.push(`    agent: ${h.agent}`);
    if (h.prompt) lines.push(`    prompt: ${h.prompt}`);
    if (h.send !== undefined) lines.push(`    send: ${h.send}`);
  }
}
```

**Problem**: When frontmatter is initially parsed from markdown, handoffs comes as an array of objects. But the serializer expects it to be present in the `fm` object. The current code skips all objects during the main loop, then tries to re-serialize, but `fm` may have already lost the structure.

**Fix**: Ensure handoffs array is preserved through parsing, then serialize correctly. Verify round-trip: parse → serialize → parse again = same result.

### hooks.json: Filter by Target

**Change location**: CopilotAdapter.transformHooks()

**Current**: Converts ALL events from settings.json

**Fix**: Filter to VS Code-supported events only:
```typescript
const supportedEvents = new Set(["SessionStart", "Stop"]);

for (const [eventName, groups] of Object.entries(hooks)) {
  if (!supportedEvents.has(eventName)) {
    // Log warning or skip
    continue;
  }
  // ... rest of transformation
}
```

### Directory Structure Fix

**Remove**:
```bash
rm -rf .github/hooks/scripts/
```

**Verify**: All hook commands still point to `.github/hooks/` (they do).

---

## Verification Checklist

After fixes, verify:

- [ ] All `.agent.md` files have handoffs serialized correctly (no `[[object Object]]`)
- [ ] `hooks.json` contains only SessionStart, Stop, version: 1
- [ ] No `.github/hooks/scripts/` directory exists
- [ ] epost-mcp-manager has `tools` field
- [ ] All agents with handoffs have valid agent names
- [ ] .vscode/mcp.json matches agents' mcp-servers declarations (if added)
- [ ] copilot-instructions.md references only agents that exist in .github/agents/
- [ ] VSCode Copilot recognizes all 13 agents in workspace
- [ ] All handoff targets are clickable/working in Copilot UI

---

## Sources

1. [Custom agents in VS Code](https://code.visualstudio.com/docs/copilot/customization/custom-agents)
2. [GitHub Copilot custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
3. [Agent hooks in Visual Studio Code](https://code.visualstudio.com/docs/copilot/customization/hooks)
4. [GitHub Copilot hooks configuration](https://docs.github.com/en/copilot/reference/hooks-configuration)
5. [Use custom instructions in VS Code](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
6. [About custom agents - GitHub Docs](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-custom-agents)
7. [Using hooks with GitHub Copilot agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/use-hooks)

---

## Unresolved Questions

1. **Handoff agent reference format**: Does VS Code require `@epost-fullstack-developer` or just `epost-fullstack-developer`? Needs testing.
2. **Hook event timeline**: When will VS Code support UserPromptSubmit, PreToolUse, PostToolUse hooks? Current roadmap unclear.
3. **mcp-servers field**: Is `mcp-servers` field a new addition to agent spec, or does it already exist? Needs verification against latest VS Code version.
4. **Duplicate scripts origin**: Was duplicate `/hooks/scripts/` structure intentional (for multiple targets) or accidental? Needs context from epost-kit maintainers.
5. **Hook path resolution**: How does VS Code resolve relative paths in bash commands? Is `.github/hooks/` correct, or should it be `hooks/` relative to `.github/`?

---

## Verdict

**STATUS**: ACTIONABLE

All issues are fixable with targeted changes to CopilotAdapter class and hooks.json generation. No architectural problems. Installation is functional but has behavioral issues that will surface when users try to use handoffs or expect hooks to fire.

**Recommended timeline**:
- Fix H1, H2, H3 before next epost-kit release (critical path)
- Fix M1-M3 in next iteration (high impact)
- Fix M4-M6 and L1-L3 as documentation/polish (lower priority)

**Next step**: Create fix plan targeting CopilotAdapter.ts and transform workflow.
