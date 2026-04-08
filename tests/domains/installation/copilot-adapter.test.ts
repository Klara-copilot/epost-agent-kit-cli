import { describe, it, expect } from "vitest";
import { CopilotAdapter } from "@/domains/installation/copilot-adapter.js";

describe("CopilotAdapter", () => {
  const adapter = new CopilotAdapter();

  describe("transformHooks", () => {
    it("returns null when no hooks present", () => {
      expect(adapter.transformHooks({})).toBeNull();
    });

    it("converts command hooks to Copilot format", () => {
      const result = adapter.transformHooks({
        hooks: {
          SessionStart: [
            {
              hooks: [{ type: "command", command: ".claude/hooks/post.cjs" }],
            },
          ],
        },
      });
      expect(result).not.toBeNull();
      expect(result!.filename).toBe("hooks.json");
      const parsed = JSON.parse(result!.content);
      expect(parsed.version).toBe(1);
      expect(parsed.hooks.SessionStart[0].bash).toBe(".github/hooks/post.cjs");
      expect(parsed.hooks.SessionStart[0].type).toBe("command");
    });

    it("converts timeout from ms to seconds", () => {
      const result = adapter.transformHooks({
        hooks: {
          SessionStart: [
            {
              hooks: [
                { type: "command", command: "node script.cjs", timeout: 5000 },
              ],
            },
          ],
        },
      });
      expect(result).not.toBeNull();
      const parsed = JSON.parse(result!.content);
      expect(parsed.hooks.SessionStart[0].timeoutSec).toBe(5);
    });

    it("records dropped feature when matcher is present (non-wildcard)", () => {
      const result = adapter.transformHooks({
        hooks: {
          SessionStart: [
            {
              matcher: "Edit|Write|MultiEdit",
              hooks: [{ type: "command", command: "node script.cjs" }],
            },
          ],
        },
      });
      expect(result).not.toBeNull();
      expect(result!.droppedFeatures).toHaveLength(1);
      expect(result!.droppedFeatures![0].feature).toBe("hook-matcher");
      expect(result!.droppedFeatures![0].event).toBe("SessionStart");
      expect(result!.droppedFeatures![0].detail).toBe("Edit|Write|MultiEdit");
    });

    it("does not record dropped feature for wildcard matcher", () => {
      const result = adapter.transformHooks({
        hooks: {
          SessionStart: [
            {
              matcher: "*",
              hooks: [{ type: "command", command: "node script.cjs" }],
            },
          ],
        },
      });
      expect(result).not.toBeNull();
      // wildcard '*' means "fire on all tools" — same as no matcher, so not dropped
      expect(result!.droppedFeatures).toBeUndefined();
    });

    it("records dropped feature for prompt-type hooks", () => {
      const result = adapter.transformHooks({
        hooks: {
          SessionStart: [
            {
              hooks: [
                { type: "prompt", command: "Summarize changes." },
                { type: "command", command: "node script.cjs" },
              ],
            },
          ],
        },
      });
      expect(result).not.toBeNull();
      const dropped = result!.droppedFeatures;
      expect(dropped).toBeDefined();
      expect(dropped!.some((d) => d.feature === "prompt-hook")).toBe(true);
      // command hook should still be included
      const parsed = JSON.parse(result!.content);
      expect(parsed.hooks.SessionStart).toHaveLength(1);
    });

    it("returns null when only prompt-type hooks exist", () => {
      const result = adapter.transformHooks({
        hooks: {
          PostToolUse: [
            {
              hooks: [{ type: "prompt", command: "Do something." }],
            },
          ],
        },
      });
      expect(result).toBeNull();
    });

    it("droppedFeatures is undefined when all hooks translate cleanly", () => {
      const result = adapter.transformHooks({
        hooks: {
          SessionStart: [
            { hooks: [{ type: "command", command: "node script.cjs" }] },
          ],
        },
      });
      expect(result).not.toBeNull();
      expect(result!.droppedFeatures).toBeUndefined();
    });
  });

  describe("transformAgent — target field", () => {
    it("emits target: vscode in agent frontmatter", () => {
      const content = `---\nname: test\ndescription: Test\nmodel: sonnet\n---\nBody`;
      const result = adapter.transformAgent(content, "test.md");
      expect(result.content).toContain("target: vscode");
    });
  });

  describe("transformAgent — model handling", () => {
    it("maps single model string via MODEL_MAP", () => {
      const content = `---\nname: test\ndescription: Test\nmodel: opus\n---\nBody`;
      const result = adapter.transformAgent(content, "test.md");
      expect(result.content).toContain("model: Claude Opus 4.6");
    });

    it("maps model array preserving order", () => {
      const content = `---\nname: test\ndescription: Test\nmodel: [opus, GPT-5.2]\n---\nBody`;
      const result = adapter.transformAgent(content, "test.md");
      // serializeFrontmatter quotes values with spaces/dots (non-alphanumeric-dash)
      expect(result.content).toContain("model: ['Claude Opus 4.6', 'GPT-5.2']");
    });

    it("passes through unknown model names untouched", () => {
      const content = `---\nname: test\ndescription: Test\nmodel: custom-model-v3\n---\nBody`;
      const result = adapter.transformAgent(content, "test.md");
      expect(result.content).toContain("model: custom-model-v3");
    });
  });

  describe("transformAgent — tools and agents (April 2026)", () => {
    it("maps sub-tool specifier search/codebase through TOOL_MAP", () => {
      const content = `---\nname: test\ndescription: Test\ntools: [Read, search/codebase]\n---\nBody`;
      const result = adapter.transformAgent(content, "test.md");
      expect(result.content).toContain("search/codebase");
      expect(result.content).toContain("read");
    });

    it("uses explicit tools list when present in source", () => {
      const content = `---\nname: test\ndescription: Test\ntools: [Read, Bash, web/fetch]\n---\nBody`;
      const result = adapter.transformAgent(content, "test.md");
      // serializeFrontmatter quotes values with '/' (non-alphanumeric-dash)
      expect(result.content).toContain("tools: [read, execute, 'web/fetch']");
    });

    it("passes through agents: '*' (allow all) with quotes", () => {
      const content = `---\nname: test\ndescription: Test\nagents: '*'\n---\nBody`;
      const result = adapter.transformAgent(content, "test.md");
      expect(result.content).toContain("agents: '*'");
    });

    it("passes through agents as explicit list", () => {
      const content = `---\nname: test\ndescription: Test\nagents: [reviewer, planner]\n---\nBody`;
      const result = adapter.transformAgent(content, "test.md");
      expect(result.content).toContain("agents: [reviewer, planner]");
    });

    it("omits agents field when not present in source", () => {
      const content = `---\nname: test\ndescription: Test\n---\nBody`;
      const result = adapter.transformAgent(content, "test.md");
      expect(result.content).not.toContain("agents:");
    });
  });

  describe("transformAgent", () => {
    it("uses short-form VS Code tool names (read/edit/execute/search/web)", () => {
      const content = `---
name: epost-developer
description: Developer agent
model: sonnet
---
Body`;
      const result = adapter.transformAgent(content, "epost-developer.md");
      // Verify short-form names are present
      expect(result.content).toContain("tools: [read, edit, execute, search, web]");
      // Verify verbose names are absent
      expect(result.content).not.toContain("readFile");
      expect(result.content).not.toContain("editFiles");
      expect(result.content).not.toContain("runInTerminal");
      expect(result.content).not.toContain("textSearch");
      expect(result.content).not.toContain("listDirectory");
    });

    it("uses read-only tools for permissionMode: plan", () => {
      const content = `---
name: epost-reviewer
description: Reviewer agent
model: sonnet
permissionMode: plan
---
Body`;
      const result = adapter.transformAgent(content, "epost-reviewer.md");
      expect(result.content).toContain("tools: [read, search, web]");
      expect(result.content).not.toContain("edit");
      expect(result.content).not.toContain("execute");
    });

    it("includes handoffs from frontmatter when present", () => {
      const content = `---
name: epost-architect
description: Architect agent
model: sonnet
handoffs:
  - label: Implement Plan
    agent: epost-implementer
    prompt: Implement the plan outlined above.
---
Body`;
      const result = adapter.transformAgent(content, "epost-architect.md");
      expect(result.filename).toBe("epost-architect.agent.md");
      expect(result.content).toContain("handoffs:");
      expect(result.content).toContain("label: Implement Plan");
      expect(result.content).toContain("agent: epost-implementer");
    });

    it("produces no handoffs for agents not in HANDOFF_MAP", () => {
      // epost-tester has no auto-generated handoffs
      const content = `---
name: epost-tester
description: Tester agent
model: sonnet
---
Body`;
      const result = adapter.transformAgent(content, "epost-tester.md");
      expect(result.content).not.toContain("handoffs:");
    });

    it("auto-generates handoffs for known workflow agents when frontmatter has none", () => {
      // epost-planner is in HANDOFF_MAP — should get auto-generated handoffs
      const content = `---
name: epost-planner
description: Planner agent
model: sonnet
---
Body`;
      const result = adapter.transformAgent(content, "epost-planner.md");
      expect(result.content).toContain("handoffs:");
      expect(result.content).toContain("agent: epost-fullstack-developer");
    });

    it("produces no handoffs for empty handoffs array on unknown agent", () => {
      // Edge case: handoffs: [] — no items, unknown agent — should be excluded
      const content = `---
name: epost-docs-manager
description: Docs agent
---
Body`;
      const result = adapter.transformAgent(content, "epost-docs-manager.md");
      expect(result.content).not.toContain("handoffs:");
    });
  });

  describe("transformSkill", () => {
    it("preserves user-invocable without introducing typo transform", () => {
      const input = "This skill is user-invocable.";
      const result = adapter.transformSkill(input);
      expect(result).toContain("user-invocable");
      expect(result).not.toContain("user-invokable");
    });
  });

  describe("replacePathRefs", () => {
    it("replaces .claude/ with .github/", () => {
      expect(adapter.replacePathRefs("node .claude/hooks/post.cjs")).toBe(
        "node .github/hooks/post.cjs",
      );
    });

    it("replaces .cursor/ with .github/", () => {
      expect(adapter.replacePathRefs("node .cursor/hooks/post.cjs")).toBe(
        "node .github/hooks/post.cjs",
      );
    });
  });
});
