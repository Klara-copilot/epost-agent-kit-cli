# Phase 03: Handoff Graph for 15 Agents

## Context Links
- [Plan](./plan.md)
- Kit agents: `/Users/than/Projects/epost_agent_kit/packages/*/agents/`
- `src/domains/installation/target-adapter.ts:207-218` — handoffs serialization

## Overview
- Priority: P2
- Status: Pending
- Effort: 2.5h
- Description: Design the complete handoff graph for all 15 kit agents and add `handoffs:` frontmatter to agent files in the kit repo. Independent of Phases 1-2.

## Requirements

### Functional
- Add `handoffs:` to agent frontmatter where a natural workflow transition exists
- Schema per handoff: `{label: string, agent: string, prompt?: string}`
- Not every agent needs handoffs — only add where there's a clear workflow chain

### Non-Functional
- Cross-repo change (epost_agent_kit, not epost-agent-kit-cli)
- Handoffs are already parsed by `parseFrontmatter()` and serialized by CopilotAdapter
- Claude Code reads handoffs natively from frontmatter

## Handoff Graph Design

### Primary Workflow Chains

```
epost-planner ──(Implement plan)──▸ epost-fullstack-developer
epost-fullstack-developer ──(Review code)──▸ epost-code-reviewer
epost-code-reviewer ──(Ship changes)──▸ epost-git-manager
epost-debugger ──(Verify fix)──▸ epost-tester
epost-tester ──(Ship after tests)──▸ epost-git-manager
```

### Secondary Handoffs

```
epost-brainstormer ──(Create plan)──▸ epost-planner
epost-researcher ──(Create plan from findings)──▸ epost-planner
epost-project-manager ──(Create plan)──▸ epost-planner
epost-project-manager ──(Implement)──▸ epost-fullstack-developer
epost-docs-manager ──(Ship docs)──▸ epost-git-manager
epost-a11y-specialist ──(Fix violations)──▸ epost-fullstack-developer
epost-muji ──(Implement component)──▸ epost-fullstack-developer
```

### Agents with NO handoffs (terminal or self-contained)
- `epost-git-manager` — terminal node (ships code)
- `epost-journal-writer` — self-contained (writes journals)
- `epost-mcp-manager` — self-contained (manages MCP tools)
- `epost-kit-designer` — self-contained (creates kit artifacts)

## Related Code Files

### Files to Modify (cross-repo: epost_agent_kit)
- `packages/core/agents/epost-planner.md` — add 1 handoff
- `packages/core/agents/epost-fullstack-developer.md` — add 1 handoff
- `packages/core/agents/epost-code-reviewer.md` — add 1 handoff
- `packages/core/agents/epost-debugger.md` — add 1 handoff
- `packages/core/agents/epost-tester.md` — add 1 handoff
- `packages/core/agents/epost-brainstormer.md` — add 1 handoff
- `packages/core/agents/epost-researcher.md` — add 1 handoff
- `packages/core/agents/epost-project-manager.md` — add 2 handoffs
- `packages/core/agents/epost-docs-manager.md` — add 1 handoff
- `packages/a11y/agents/epost-a11y-specialist.md` — add 1 handoff
- `packages/design-system/agents/epost-muji.md` — add 1 handoff

### Files NOT modified (no handoffs)
- `packages/core/agents/epost-git-manager.md`
- `packages/core/agents/epost-journal-writer.md`
- `packages/core/agents/epost-mcp-manager.md`
- `packages/kit/agents/epost-kit-designer.md`

## Implementation Steps

1. **Add handoffs to each agent file**
   - Insert `handoffs:` block in YAML frontmatter, before the `---` closing
   - Example for epost-planner:
     ```yaml
     handoffs:
       - label: Implement plan
         agent: epost-fullstack-developer
     ```

2. **Verify frontmatter parsing**
   - Run through `parseFrontmatter()` to confirm handoffs are correctly parsed
   - Verify `serializeFrontmatter()` round-trips correctly

3. **Verify CopilotAdapter handoff transform**
   - CopilotAdapter already passes handoffs through — verify it works with real data

## Todo List
- [ ] Add handoffs to epost-planner
- [ ] Add handoffs to epost-fullstack-developer
- [ ] Add handoffs to epost-code-reviewer
- [ ] Add handoffs to epost-debugger
- [ ] Add handoffs to epost-tester
- [ ] Add handoffs to epost-brainstormer
- [ ] Add handoffs to epost-researcher
- [ ] Add handoffs to epost-project-manager (2 handoffs)
- [ ] Add handoffs to epost-docs-manager
- [ ] Add handoffs to epost-a11y-specialist
- [ ] Add handoffs to epost-muji
- [ ] Verify: parseFrontmatter() reads handoffs correctly
- [ ] Verify: CopilotAdapter transforms handoffs in output

## Success Criteria
- 11 of 15 agents have `handoffs:` in frontmatter
- `parseFrontmatter()` correctly parses all handoff blocks
- `epost-kit init --target vscode` includes handoffs in `.agent.md` files

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Handoff graph creates cycles | Low | Git-manager is terminal — no cycles possible |
| Wrong agent names in handoffs | Med | All 15 names verified in this research |

## Security Considerations
- None identified

## Next Steps
- After kit agents updated, re-install with `epost-kit init` to verify handoffs appear in target
