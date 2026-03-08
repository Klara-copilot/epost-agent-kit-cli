---
phase: 3
title: "Decouple handoffs to agent frontmatter"
effort: 3h
depends: [1, 2]
---

# Phase 3: Decouple Handoffs to Agent Frontmatter

## Context Links
- [Plan](./plan.md)
- `src/domains/installation/copilot-adapter.ts:47-86` -- AGENT_HANDOFFS constant
- `src/domains/installation/copilot-adapter.ts:111-114` -- handoff lookup during transform
- `src/domains/installation/target-adapter.ts:118-155` -- serializeFrontmatter (already handles handoffs)
- `.claude/agents/*.md` -- agent frontmatter files

## Overview
- Priority: P1
- Status: Complete
- Effort: 3h
- Description: Move hardcoded AGENT_HANDOFFS map from copilot-adapter into source agent .md frontmatter. CopilotAdapter reads handoffs from parsed frontmatter instead of internal map.

## Requirements

### Functional
- New `handoffs` field in agent frontmatter (YAML array of objects)
- CopilotAdapter reads handoffs from parsed agent frontmatter, not internal constant
- ClaudeAdapter ignores handoffs field (Claude Code doesn't use it, but preserves it)
- If agent has no handoffs in frontmatter, no handoffs in output (no silent defaults)

### Non-Functional
- `parseFrontmatter` must handle nested YAML arrays (it currently parses flat key:value only)
- `serializeFrontmatter` already handles handoffs serialization (line 142-155) -- verified
- Existing agent files in packages must be updated with handoffs

## Related Code Files

### Files to Modify
- `src/domains/installation/copilot-adapter.ts` -- remove AGENT_HANDOFFS, read from frontmatter
- `src/domains/installation/target-adapter.ts` -- enhance parseFrontmatter for nested YAML lists

### Files to Create
- None (agent .md files in source packages are outside this repo, but document the schema)

### Files to Delete
- None

## Implementation Steps

1. **Define handoffs frontmatter schema**
   ```yaml
   handoffs:
     - label: "Implement Plan"
       agent: epost-implementer
       prompt: "Implement the plan outlined above."
   ```

2. **Enhance parseFrontmatter for nested YAML**
   - Current parser handles flat key:value and inline arrays `[a, b]`
   - Need to parse indented list items under `handoffs:` key
   - Approach: detect `handoffs:` line with no value, then parse subsequent indented `- label:` blocks
   - Keep simple -- only support the handoffs structure, not full YAML

3. **Update CopilotAdapter.transformAgent**
   - Remove `AGENT_HANDOFFS` constant entirely
   - Read `fm.handoffs` from parsed frontmatter
   - If present and non-empty, pass through to output frontmatter
   - If absent, no handoffs in output

4. **Update source agent files**
   - Add `handoffs:` to agents that currently have entries in AGENT_HANDOFFS:
     - epost-architect -> handoff to epost-implementer
     - epost-implementer -> handoff to epost-reviewer
     - epost-reviewer -> handoff to epost-git-manager
     - epost-debugger -> handoff to epost-tester
     - epost-tester -> handoff to epost-git-manager
   - Note: These agents are in the epost-agent-kit packages repo, not this CLI repo
   - Document expected schema so package authors can add handoffs

5. **Backward compatibility**
   - If installed agents lack handoffs field, CopilotAdapter produces no handoffs (clean degradation)
   - No fallback to hardcoded map

## Todo List
- [x] Enhance parseFrontmatter to parse nested handoffs YAML
- [x] Remove AGENT_HANDOFFS constant from copilot-adapter.ts
- [x] Update transformAgent to read handoffs from frontmatter
- [x] Test: agent with handoffs in frontmatter -> correct .agent.md output
- [x] Test: agent without handoffs -> no handoffs in output
- [ ] Document handoffs schema for package authors (gap — see below)

## Success Criteria
- AGENT_HANDOFFS removed from copilot-adapter.ts
- Adding a new agent with handoffs requires zero adapter code changes
- Existing agent transforms produce same output (with handoffs in frontmatter)

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| parseFrontmatter YAML extension too complex | Med | Only parse handoffs structure, not generic YAML |
| Source agent packages not updated simultaneously | Low | Graceful degradation -- no handoffs if not in frontmatter |

## Security Considerations
- None identified

## Next Steps
- Package authors add handoffs to agent frontmatter in kit packages
