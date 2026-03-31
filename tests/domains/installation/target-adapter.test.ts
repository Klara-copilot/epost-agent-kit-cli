import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "@/domains/installation/target-adapter.js";

describe("parseFrontmatter", () => {
  it("parses flat key:value pairs", () => {
    const { frontmatter } = parseFrontmatter(
      "---\nname: my-agent\nmodel: sonnet\n---\nBody",
    );
    expect(frontmatter.name).toBe("my-agent");
    expect(frontmatter.model).toBe("sonnet");
  });

  it("parses inline arrays", () => {
    const { frontmatter } = parseFrontmatter(
      "---\nskills: [core, debug]\n---\n",
    );
    expect(frontmatter.skills).toEqual(["core", "debug"]);
  });

  it("parses nested handoffs block", () => {
    const content = `---
name: epost-architect
handoffs:
  - label: Implement Plan
    agent: epost-implementer
    prompt: Implement the plan outlined above.
---
Body text`;
    const { frontmatter } = parseFrontmatter(content);
    expect(Array.isArray(frontmatter.handoffs)).toBe(true);
    const handoffs = frontmatter.handoffs as Array<Record<string, unknown>>;
    expect(handoffs).toHaveLength(1);
    expect(handoffs[0].label).toBe("Implement Plan");
    expect(handoffs[0].agent).toBe("epost-implementer");
    expect(handoffs[0].prompt).toBe("Implement the plan outlined above.");
  });

  it("parses multiple handoff entries", () => {
    const content = `---
name: epost-planner
handoffs:
  - label: Build
    agent: epost-builder
    prompt: Build it.
  - label: Review
    agent: epost-reviewer
    prompt: Review it.
---
`;
    const { frontmatter } = parseFrontmatter(content);
    const handoffs = frontmatter.handoffs as Array<Record<string, unknown>>;
    expect(handoffs).toHaveLength(2);
    expect(handoffs[0].label).toBe("Build");
    expect(handoffs[1].label).toBe("Review");
  });

  it("returns empty frontmatter for content without ---", () => {
    const { frontmatter, body } = parseFrontmatter("Just body content");
    expect(frontmatter).toEqual({});
    expect(body).toBe("Just body content");
  });

  it("parses boolean values", () => {
    const { frontmatter } = parseFrontmatter("---\nflag: true\nother: false\n---\n");
    expect(frontmatter.flag).toBe(true);
    expect(frontmatter.other).toBe(false);
  });
});
