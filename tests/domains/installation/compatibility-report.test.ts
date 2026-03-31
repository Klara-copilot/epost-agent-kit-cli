import { describe, it, expect } from "vitest";
import {
  formatCompatibilityReport,
  type CompatibilityWarning,
} from "@/domains/installation/compatibility-report.js";
import { CopilotAdapter } from "@/domains/installation/copilot-adapter.js";
import { ClaudeAdapter } from "@/domains/installation/claude-adapter.js";

// ── formatCompatibilityReport ──

describe("formatCompatibilityReport", () => {
  it("returns empty string for no warnings", () => {
    expect(formatCompatibilityReport([])).toBe("");
  });

  it("includes summary line with counts", () => {
    const warnings: CompatibilityWarning[] = [
      {
        severity: "high",
        category: "hooks",
        feature: "hook matcher: Edit|Write",
        source: "PreToolUse hook group",
        reason: "Copilot does not support matchers",
      },
    ];
    const report = formatCompatibilityReport(warnings);
    expect(report).toContain("1 high");
    expect(report).toContain("hook matcher");
  });

  it("groups by severity — high appears before medium", () => {
    const warnings: CompatibilityWarning[] = [
      {
        severity: "medium",
        category: "agents",
        feature: "skills: kit-cli",
        source: "epost-dev.md",
        reason: "VS Code does not support skills field",
      },
      {
        severity: "high",
        category: "hooks",
        feature: "hook matcher: Bash",
        source: "PostToolUse hook group",
        reason: "Copilot does not support matchers",
      },
    ];
    const report = formatCompatibilityReport(warnings);
    const highIdx = report.indexOf("hook matcher");
    const medIdx  = report.indexOf("skills");
    expect(highIdx).toBeLessThan(medIdx);
  });

  it("shows source and reason in output", () => {
    const warnings: CompatibilityWarning[] = [
      {
        severity: "low",
        category: "agents",
        feature: "color: blue",
        source: "epost-test.md",
        reason: "VS Code does not support color field",
      },
    ];
    const report = formatCompatibilityReport(warnings);
    expect(report).toContain("epost-test.md");
    expect(report).toContain("VS Code does not support color field");
  });

  it("includes actionable footer when high-severity warnings present", () => {
    const warnings: CompatibilityWarning[] = [
      {
        severity: "high",
        category: "hooks",
        feature: "hook matcher: Edit|Write",
        source: "PreToolUse hook group",
        reason: "Copilot does not support matchers",
      },
    ];
    const report = formatCompatibilityReport(warnings);
    expect(report).toContain("HIGH issues change behavior");
  });

  it("omits footer when only low/medium warnings present", () => {
    const warnings: CompatibilityWarning[] = [
      {
        severity: "low",
        category: "agents",
        feature: "color: red",
        source: "some-agent.md",
        reason: "not supported",
      },
    ];
    const report = formatCompatibilityReport(warnings);
    expect(report).not.toContain("HIGH issues change behavior");
  });
});

// ── CopilotAdapter.getWarnings() ──

describe("CopilotAdapter warning collection", () => {
  it("starts with empty warnings", () => {
    const adapter = new CopilotAdapter();
    expect(adapter.getWarnings()).toHaveLength(0);
  });

  it("collects high-severity warning for hook matcher", () => {
    const adapter = new CopilotAdapter();
    adapter.transformHooks({
      hooks: {
        SessionStart: [
          {
            matcher: "Edit|Write",
            hooks: [{ type: "command", command: "node check.cjs" }],
          },
        ],
      },
    });
    const warnings = adapter.getWarnings();
    expect(warnings.length).toBeGreaterThan(0);
    const matcherWarning = warnings.find((w) => w.feature.includes("Edit|Write"));
    expect(matcherWarning).toBeDefined();
    expect(matcherWarning!.severity).toBe("high");
    expect(matcherWarning!.category).toBe("hooks");
  });

  it("collects medium-severity warning for prompt-type hooks", () => {
    const adapter = new CopilotAdapter();
    adapter.transformHooks({
      hooks: {
        SessionStart: [
          {
            hooks: [{ type: "prompt", prompt: "Do something" }],
          },
        ],
      },
    });
    const warnings = adapter.getWarnings();
    const promptWarning = warnings.find((w) => w.feature.includes("prompt-type"));
    expect(promptWarning).toBeDefined();
    expect(promptWarning!.severity).toBe("medium");
  });

  it("collects low-severity warning for agent color field", () => {
    const adapter = new CopilotAdapter();
    adapter.transformAgent(
      "---\nname: test-agent\ncolor: blue\n---\nBody here.",
      "test-agent.md",
    );
    const warnings = adapter.getWarnings();
    const colorWarning = warnings.find((w) => w.feature.includes("color"));
    expect(colorWarning).toBeDefined();
    expect(colorWarning!.severity).toBe("low");
    expect(colorWarning!.category).toBe("agents");
  });

  it("collects medium-severity warning for agent skills field", () => {
    const adapter = new CopilotAdapter();
    adapter.transformAgent(
      "---\nname: test-agent\nskills: [kit-cli, web-frontend]\n---\nBody.",
      "test-agent.md",
    );
    const warnings = adapter.getWarnings();
    const skillsWarning = warnings.find((w) => w.feature.includes("skills"));
    expect(skillsWarning).toBeDefined();
    expect(skillsWarning!.severity).toBe("medium");
  });

  it("collects medium-severity warning for agent memory field", () => {
    const adapter = new CopilotAdapter();
    adapter.transformAgent(
      "---\nname: test-agent\nmemory: MEMORY.md\n---\nBody.",
      "test-agent.md",
    );
    const warnings = adapter.getWarnings();
    const memWarning = warnings.find((w) => w.feature.includes("memory"));
    expect(memWarning).toBeDefined();
    expect(memWarning!.severity).toBe("medium");
  });

  it("accumulates warnings across multiple transforms", () => {
    const adapter = new CopilotAdapter();
    adapter.transformAgent(
      "---\nname: agent-a\ncolor: red\n---\nBody.",
      "agent-a.md",
    );
    adapter.transformHooks({
      hooks: {
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [{ type: "command", command: "node x.cjs" }],
          },
        ],
      },
    });
    const warnings = adapter.getWarnings();
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });

  it("does not warn when no dropped fields", () => {
    const adapter = new CopilotAdapter();
    adapter.transformAgent(
      "---\nname: clean-agent\ndescription: A clean agent\n---\nBody.",
      "clean-agent.md",
    );
    const warnings = adapter.getWarnings();
    expect(warnings).toHaveLength(0);
  });

  it("does not warn for wildcard matcher (*)", () => {
    const adapter = new CopilotAdapter();
    adapter.transformHooks({
      hooks: {
        PostToolUse: [
          {
            matcher: "*",
            hooks: [{ type: "command", command: "node post.cjs" }],
          },
        ],
      },
    });
    const warnings = adapter.getWarnings().filter((w) => w.feature.includes("matcher"));
    expect(warnings).toHaveLength(0);
  });
});

// ── ClaudeAdapter.getWarnings() ──

describe("ClaudeAdapter warning collection", () => {
  it("always returns empty warnings", () => {
    const adapter = new ClaudeAdapter();
    adapter.transformAgent("---\nname: x\n---\nBody.", "x.md");
    adapter.transformHooks({ hooks: {} });
    expect(adapter.getWarnings()).toHaveLength(0);
  });
});
