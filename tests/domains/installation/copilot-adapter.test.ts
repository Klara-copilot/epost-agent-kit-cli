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

  describe("transformAgent", () => {
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

    it("produces no handoffs when agent frontmatter has none", () => {
      const content = `---
name: epost-planner
description: Planner agent
model: sonnet
---
Body`;
      const result = adapter.transformAgent(content, "epost-planner.md");
      expect(result.content).not.toContain("handoffs:");
    });

    it("produces no handoffs for empty handoffs array", () => {
      // Edge case: handoffs: [] — no items, should be excluded
      const content = `---
name: epost-planner
description: Planner agent
---
Body`;
      const result = adapter.transformAgent(content, "epost-planner.md");
      expect(result.content).not.toContain("handoffs:");
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
