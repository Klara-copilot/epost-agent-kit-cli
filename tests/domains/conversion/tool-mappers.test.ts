/**
 * Tests for tool mappers
 */

import { describe, it, expect } from "vitest";
import {
  TOOL_ALIASES,
  inferTools,
  mapToolsFromContent,
} from "@/domains/conversion/tool-mappers.js";

describe("TOOL_ALIASES", () => {
  it("should contain all Claude tool names", () => {
    expect(TOOL_ALIASES.Bash).toBe("execute");
    expect(TOOL_ALIASES.Read).toBe("read");
    expect(TOOL_ALIASES.Edit).toBe("edit");
    expect(TOOL_ALIASES.Write).toBe("edit");
    expect(TOOL_ALIASES.Grep).toBe("search");
    expect(TOOL_ALIASES.Glob).toBe("search");
    expect(TOOL_ALIASES.WebSearch).toBe("web");
    expect(TOOL_ALIASES.Task).toBe("agent");
  });

  it("should map to valid Copilot aliases", () => {
    const validAliases = [
      "execute",
      "read",
      "edit",
      "search",
      "web",
      "todo",
      "agent",
      "github/*",
      "playwright/*",
    ];
    for (const alias of Object.values(TOOL_ALIASES)) {
      expect(validAliases).toContain(alias);
    }
  });
});

describe("inferTools", () => {
  it("should detect execute from shell commands", () => {
    const tools = inferTools("Run npm install and xcodebuild");
    expect(tools).toContain("execute");
  });

  it("should detect edit from write keywords", () => {
    const tools = inferTools("Create and modify files");
    expect(tools).toContain("edit");
  });

  it("should detect read from read keywords", () => {
    const tools = inferTools("Read the file and view its contents");
    expect(tools).toContain("read");
  });

  it("should detect search from search keywords", () => {
    const tools = inferTools("Search and find the pattern using grep");
    expect(tools).toContain("search");
  });

  it("should detect web from web keywords", () => {
    const tools = inferTools("Fetch data from web and download");
    expect(tools).toContain("web");
  });

  it("should return default tools when nothing detected", () => {
    const tools = inferTools("Some random text without keywords");
    expect(tools).toContain("read");
    expect(tools).toContain("edit");
    expect(tools).toContain("search");
    expect(tools).toContain("execute");
  });
});

describe("mapToolsFromContent", () => {
  it("should map Bash to execute", () => {
    const tools = mapToolsFromContent("Use Bash to run commands");
    expect(tools).toContain("execute");
  });

  it("should map Read to read", () => {
    const tools = mapToolsFromContent("Call Read to load files");
    expect(tools).toContain("read");
  });

  it("should map Edit to edit", () => {
    const tools = mapToolsFromContent("Use Edit to modify files");
    expect(tools).toContain("edit");
  });

  it("should map multiple tools", () => {
    const tools = mapToolsFromContent("Use Bash, Read, and Edit tools");
    expect(tools).toContain("execute");
    expect(tools).toContain("read");
    expect(tools).toContain("edit");
  });
});
