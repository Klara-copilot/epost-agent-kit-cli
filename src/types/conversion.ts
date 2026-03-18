/**
 * Type definitions for Claude-Code to GitHub Copilot conversion
 */

/** Claude-Code command format */
export interface ClaudeCommand {
  sourcePath: string; // Original file path
  name: string; // Command name (from directory/file)
  title: string; // YAML frontmatter title
  description: string; // YAML frontmatter description
  agent?: string; // Referenced agent name
  argumentHint?: string; // Expected arguments hint
  content: string; // Raw markdown content
  hasArguments: boolean; // Contains $ARGUMENTS
}

/** Claude-Code agent format */
export interface ClaudeAgent {
  sourcePath: string;
  name: string; // Agent filename without ext
  description?: string; // First paragraph as description
  content: string; // Full markdown content
}

/** Claude-Code skill format */
export interface ClaudeSkill {
  sourcePath: string;
  name: string; // Skill directory name
  description?: string; // SKILL.md description
  content: string; // SKILL.md content
  references?: string[]; // Reference file paths
  fileTypes?: string[]; // Applicable file types
}

/** GitHub Copilot custom agent format */
export interface CopilotAgent {
  name: string; // Agent display name
  description: string; // REQUIRED - agent purpose
  target?: "vscode" | "github-copilot";
  tools?: string[]; // Tool aliases
  disableModelInvocation?: boolean;
  userInvocable?: boolean;
  content: string; // Markdown instructions (max 30,000 chars)
}

/** GitHub Copilot instructions format */
export interface CopilotInstructions {
  description: string;
  applyTo?: string; // Glob pattern
  content: string;
}

/** Conversion options */
export interface ConversionOptions {
  outputDir: string; // Output directory
  packages?: string[]; // Specific packages
  profile?: string; // Profile filter
  dryRun: boolean; // Preview only
  verbose: boolean; // Debug output
  source?: boolean; // Use source repo (dev mode)
}

/** Conversion result */
export interface ConversionResult {
  agents: CopilotAgent[];
  instructions: CopilotInstructions[];
  globalInstructions?: string;
  errors: string[];
  warnings: string[];
}
