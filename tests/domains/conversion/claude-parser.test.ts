/**
 * Tests for Claude-Code parser functions
 */

import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  parseClaudeCommand,
  parseClaudeAgent,
  parseClaudeSkill,
} from "@/domains/conversion/claude-parser.js";

describe("parseFrontmatter", () => {
  it("should parse valid YAML frontmatter", () => {
    const content = `---
title: "Cook: Fast"
description: Direct implementation
agent: epost-implementer
---

# Content here`;

    const { frontmatter, body } = parseFrontmatter(content);
    expect(frontmatter.title).toBe("Cook: Fast");
    expect(frontmatter.description).toBe("Direct implementation");
    expect(frontmatter.agent).toBe("epost-implementer");
    expect(body).toContain("# Content here");
  });

  it("should handle content without frontmatter", () => {
    const content = "# Just markdown\n\nNo frontmatter";
    const { frontmatter, body } = parseFrontmatter(content);
    expect(frontmatter).toEqual({});
    expect(body).toBe(content);
  });

  it("should handle empty frontmatter", () => {
    const content = `---
---

# Content`;
    const { frontmatter, body } = parseFrontmatter(content);
    expect(frontmatter).toEqual({});
    expect(body.trim()).toBe("# Content");
  });

  it("should handle multiline content", () => {
    const content = `---
title: Test
---

# Heading

Paragraph 1

Paragraph 2`;

    const { body } = parseFrontmatter(content);
    expect(body).toContain("Paragraph 1");
    expect(body).toContain("Paragraph 2");
  });
});

describe("parseClaudeCommand", () => {
  it("should extract all frontmatter fields", () => {
    const content = `---
title: "Cook: Fast"
description: Direct implementation
agent: epost-implementer
argument-hint: "[feature description]"
---

# Cook Fast`;
    const cmd = parseClaudeCommand("commands/cook/fast.md", content);

    expect(cmd.title).toBe("Cook: Fast");
    expect(cmd.description).toBe("Direct implementation");
    expect(cmd.agent).toBe("epost-implementer");
    expect(cmd.argumentHint).toBe("[feature description]");
  });

  it("should create kebab-case name from nested path", () => {
    const content = `---
title: Test
---
Content`;
    const cmd = parseClaudeCommand("commands/cook/fast.md", content);
    expect(cmd.name).toBe("cook-fast");
  });

  it("should detect $ARGUMENTS placeholder", () => {
    const content = `---
title: Test
---
$ARGUMENTS`;
    const cmd = parseClaudeCommand("commands/test/test.md", content);
    expect(cmd.hasArguments).toBe(true);
  });

  it("should handle missing optional fields", () => {
    const content = `---
title: Test
---
Content`;
    const cmd = parseClaudeCommand("commands/test/test.md", content);
    expect(cmd.agent).toBeUndefined();
    expect(cmd.argumentHint).toBeUndefined();
  });

  it("should use filename as fallback title", () => {
    const content = `---
description: Just a description
---
Content`;
    const cmd = parseClaudeCommand("commands/test/mycommand.md", content);
    expect(cmd.title).toBe("mycommand");
  });
});

describe("parseClaudeAgent", () => {
  it("should extract agent name from filename", () => {
    const content = `---
---
# Agent Content`;
    const agent = parseClaudeAgent("agents/epost-implementer.md", content);
    expect(agent.name).toBe("epost-implementer");
  });

  it("should extract description from first paragraph", () => {
    const content = `---
---
# EPost Implementer

This is the main implementer agent for ePost Kit.

More content here.`;
    const agent = parseClaudeAgent("agents/test.md", content);
    expect(agent.description).toBe("EPost Implementer");
  });
});

describe("parseClaudeSkill", () => {
  it("should parse SKILL.md content", () => {
    const content = `---
description: iOS development skill
---

# iOS Development Skill

Content here.`;
    const skill = parseClaudeSkill("/packages/core/skills/ios-developer", content);
    expect(skill.name).toBe("ios-developer");
    expect(skill.description).toBe("iOS development skill");
  });

  it("should infer file types from skill name", () => {
    const content = `---
description: Test
---
Content`;

    const swiftSkill = parseClaudeSkill("/skills/swift", content);
    expect(swiftSkill.fileTypes).toContain("swift");

    const tsSkill = parseClaudeSkill("/skills/typescript", content);
    expect(tsSkill.fileTypes).toContain("ts");
    expect(tsSkill.fileTypes).toContain("tsx");

    const pythonSkill = parseClaudeSkill("/skills/python", content);
    expect(pythonSkill.fileTypes).toContain("py");
  });
});
