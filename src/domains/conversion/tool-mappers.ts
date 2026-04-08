/**
 * Tool alias mappings from Claude-Code to GitHub Copilot
 *
 * Short-form tool names (read, edit, execute, search, web) are the valid `tools:` values
 * in VS Code Copilot agent frontmatter — confirmed by VS Code "Configure Tools" UI (Apr 2026).
 * Verbose names (readFile, editFiles, runInTerminal) are internal toolset sub-tools only.
 */

/**
 * Tool alias mappings from Claude-Code to GitHub Copilot
 */
export const TOOL_ALIASES: Record<string, string> = {
  // Shell execution
  Bash: "execute",
  shell: "execute",
  powershell: "execute",
  terminal: "execute",

  // File operations
  Read: "read",
  NotebookRead: "read",
  Edit: "edit",
  MultiEdit: "edit",
  Write: "edit",
  NotebookEdit: "edit",

  // Search
  Grep: "search",
  Glob: "search",

  // Web
  WebSearch: "web",
  WebFetch: "web",

  // Task management
  TodoWrite: "todo",
  Task: "agent",
  "custom-agent": "agent",

  // MCP servers
  github: "github/*",
  playwright: "playwright/*",
};

/**
 * Default tools for different command types
 */
export const DEFAULT_TOOLS_BY_TYPE: Record<string, string[]> = {
  implementer: ["read", "edit", "search", "execute"],
  reviewer: ["read", "search"],
  planner: ["read", "search", "edit"],
  tester: ["read", "edit", "search", "execute"],
  debugger: ["read", "edit", "search", "execute"],
};

/**
 * Infer tools from command content
 */
export function inferTools(content: string): string[] {
  const tools = new Set<string>();

  // Check for common patterns
  if (/\b(npm|yarn|pnpm|bun|xcodebuild|swift|cargo)\b/i.test(content)) {
    tools.add("execute");
  }
  if (/\b(read|view|load)\b/i.test(content)) {
    tools.add("read");
  }
  if (/\b(edit|write|create|modify)\b/i.test(content)) {
    tools.add("edit");
  }
  if (/\b(search|find|grep|glob)\b/i.test(content)) {
    tools.add("search");
  }
  if (/\b(fetch|download|web)\b/i.test(content)) {
    tools.add("web");
  }

  // Default to all tools if nothing detected
  return tools.size > 0 ? Array.from(tools) : ["read", "edit", "search", "execute"];
}

/**
 * Map Claude tools mentioned in content to Copilot aliases
 */
export function mapToolsFromContent(content: string): string[] {
  const tools = new Set<string>();

  for (const [claude, copilot] of Object.entries(TOOL_ALIASES)) {
    const pattern = new RegExp(`\\b${claude}\\b`, "gi");
    if (pattern.test(content)) {
      tools.add(copilot);
    }
  }

  return Array.from(tools);
}
