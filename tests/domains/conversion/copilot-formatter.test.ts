/**
 * Tests for Copilot formatter functions
 */

import { describe, it, expect } from "vitest";
import {
  formatCommandAsAgent,
  formatAgentAsAgent,
  formatSkillAsInstructions,
  generateAgentFrontmatter,
  generateInstructionsFrontmatter,
} from "@/domains/conversion/copilot-formatter.js";
import type {
  ClaudeCommand,
  ClaudeAgent,
  ClaudeSkill,
  CopilotAgent,
  CopilotInstructions,
} from "@/types/conversion.js";

describe("formatCommandAsAgent", () => {
  it("should create valid CopilotAgent", () => {
    const cmd: ClaudeCommand = {
      sourcePath: "commands/cook/fast.md",
      name: "cook-fast",
      title: "Cook: Fast",
      description: "Direct implementation",
      content: "# Cook Fast\n\nImplement directly.",
      hasArguments: false,
    };

    const agent = formatCommandAsAgent(cmd);
    expect(agent.name).toBe("Cook: Fast");
    expect(agent.description).toBe("Direct implementation");
    expect(agent.tools).toBeDefined();
    expect(agent.tools!.length).toBeGreaterThan(0);
    expect(agent.userInvocable).toBe(true);
  });

  it("should add Expected Input section for $ARGUMENTS", () => {
    const cmd: ClaudeCommand = {
      sourcePath: "test.md",
      name: "test",
      title: "Test",
      description: "Test",
      content: "# Test\n\n$ARGUMENTS",
      hasArguments: true,
      argumentHint: "[feature description]",
    };

    const agent = formatCommandAsAgent(cmd);
    expect(agent.content).toContain("## Expected Input");
    expect(agent.content).toContain("[feature description]");
    expect(agent.content).not.toContain("$ARGUMENTS");
  });

  it("should infer tools from content", () => {
    const cmd: ClaudeCommand = {
      sourcePath: "test.md",
      name: "test",
      title: "Test",
      description: "Test",
      content: "Run npm install and xcodebuild commands",
      hasArguments: false,
    };

    const agent = formatCommandAsAgent(cmd);
    expect(agent.tools).toContain("execute");
  });

  it("sets target: vscode", () => {
    const cmd: ClaudeCommand = {
      sourcePath: "test.md",
      name: "test",
      title: "Test",
      description: "Test",
      content: "Content",
      hasArguments: false,
    };
    expect(formatCommandAsAgent(cmd).target).toBe("vscode");
  });

  it("should use fallback description if missing", () => {
    const cmd: ClaudeCommand = {
      sourcePath: "test.md",
      name: "my-command",
      title: "My Command",
      description: "",
      content: "Content",
      hasArguments: false,
    };

    const agent = formatCommandAsAgent(cmd);
    expect(agent.description).toContain("my-command");
  });
});

describe("formatAgentAsAgent", () => {
  it("should create valid CopilotAgent", () => {
    const agent: ClaudeAgent = {
      sourcePath: "agents/test.md",
      name: "test-agent",
      description: "A test agent",
      content: "# Test Agent\n\nContent here.",
    };

    const result = formatAgentAsAgent(agent);
    expect(result.name).toBe("test-agent");
    expect(result.description).toBe("A test agent");
    expect(result.tools).toBeDefined();
    expect(result.userInvocable).toBe(true);
  });

  it("sets target: vscode", () => {
    const agent: ClaudeAgent = {
      sourcePath: "test.md",
      name: "test",
      description: "Test",
      content: "Content",
    };
    expect(formatAgentAsAgent(agent).target).toBe("vscode");
  });

  it("should truncate long content", () => {
    const longContent = "x".repeat(35000);
    const agent: ClaudeAgent = {
      sourcePath: "test.md",
      name: "test",
      content: longContent,
    };

    const result = formatAgentAsAgent(agent);
    expect(result.content.length).toBeLessThanOrEqual(30000);
    expect(result.content).toContain("truncated");
  });
});

describe("formatSkillAsInstructions", () => {
  it("should create valid CopilotInstructions", () => {
    const skill: ClaudeSkill = {
      sourcePath: "skills/test/SKILL.md",
      name: "test-skill",
      description: "A test skill",
      content: "# Test Skill\n\nInstructions here.",
      fileTypes: ["ts", "tsx"],
    };

    const result = formatSkillAsInstructions(skill);
    expect(result.description).toBe("A test skill");
    expect(result.applyTo).toBe("**/*.ts,**/*.tsx");
  });

  it("should generate default applyTo if no file types", () => {
    const skill: ClaudeSkill = {
      sourcePath: "skills/test/SKILL.md",
      name: "test-skill",
      content: "Content",
      fileTypes: [],
    };

    const result = formatSkillAsInstructions(skill);
    expect(result.applyTo).toBe("**/*");
  });
});

describe("generateAgentFrontmatter", () => {
  it("should generate valid YAML frontmatter", () => {
    const agent: CopilotAgent = {
      name: "test-agent",
      description: "Test description",
      tools: ["read", "edit"],
      content: "",
    };

    const yaml = generateAgentFrontmatter(agent);
    expect(yaml).toContain('name: "test-agent"');
    expect(yaml).toContain('description: "Test description"');
    expect(yaml).toContain('tools: ["read","edit"]');
    expect(yaml.startsWith("---")).toBe(true);
    expect(yaml.endsWith("---")).toBe(true);
  });

  it("should escape special characters", () => {
    const agent: CopilotAgent = {
      name: 'test "quoted"',
      description: "Line1\nLine2",
      content: "",
    };

    const yaml = generateAgentFrontmatter(agent);
    expect(yaml).toContain('\\"quoted\\"');
    expect(yaml).toContain("\\n");
  });

  it("should include all optional fields", () => {
    const agent: CopilotAgent = {
      name: "test",
      description: "Test",
      target: "vscode",
      tools: ["read"],
      disableModelInvocation: true,
      userInvocable: false,
      content: "",
    };

    const yaml = generateAgentFrontmatter(agent);
    expect(yaml).toContain('target: "vscode"');
    expect(yaml).toContain("disable-model-invocation: true");
    expect(yaml).toContain("user-invocable: false");
  });
});

describe("generateInstructionsFrontmatter", () => {
  it("should generate valid YAML frontmatter", () => {
    const instructions: CopilotInstructions = {
      description: "Test instructions",
      applyTo: "**/*.ts",
      content: "",
    };

    const yaml = generateInstructionsFrontmatter(instructions);
    expect(yaml).toContain('description: "Test instructions"');
    expect(yaml).toContain('applyTo: "**/*.ts"');
    expect(yaml.startsWith("---")).toBe(true);
    expect(yaml.endsWith("---")).toBe(true);
  });
});
