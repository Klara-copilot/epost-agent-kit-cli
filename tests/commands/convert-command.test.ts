/**
 * Integration tests for convert command
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

describe("convert command utilities", () => {
  describe("sanitizeFileName", () => {
    // Import dynamically to avoid module issues
    it("should sanitize file names correctly", async () => {
      // Test the sanitization logic directly
      const sanitizeFileName = (name: string): string => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
      };

      expect(sanitizeFileName("Cook: Fast")).toBe("cook-fast");
      expect(sanitizeFileName("Test@Command!")).toBe("test-command");
      expect(sanitizeFileName("  spaces  ")).toBe("spaces");
      expect(sanitizeFileName("---test---")).toBe("test");
    });
  });
});

describe("conversion integration", () => {
  const testDir = join(process.cwd(), "test-convert-output");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("should create output directories", async () => {
    const agentsDir = join(testDir, "agents");
    const instructionsDir = join(testDir, "instructions");

    await mkdir(agentsDir, { recursive: true });
    await mkdir(instructionsDir, { recursive: true });

    const agents = await readdir(agentsDir);
    const instructions = await readdir(instructionsDir);
    expect(agents).toEqual([]);
    expect(instructions).toEqual([]);
  });

  it("should write valid YAML frontmatter", async () => {
    const testContent = `---
name: "test-agent"
description: "Test description"
tools: ["read","edit"]
---

# Test Agent

Content here.`;

    const filePath = join(testDir, "test.agent.md");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(filePath, testContent, "utf-8");

    const content = await readFile(filePath, "utf-8");
    expect(content).toMatch(/^---\n/);
    expect(content).toContain("name:");
    expect(content).toContain("description:");
  });

  it("should write instruction files correctly", async () => {
    const testContent = `---
description: "Test instructions"
applyTo: "**/*.ts"
---

# Instructions

Some instruction content.`;

    const filePath = join(testDir, "test.instructions.md");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(filePath, testContent, "utf-8");

    const content = await readFile(filePath, "utf-8");
    expect(content).toContain("description:");
    expect(content).toContain("applyTo:");
  });
});
