/**
 * Conversion domain exports
 * Claude-Code to GitHub Copilot format conversion
 */

export {
  parseFrontmatter,
  parseClaudeCommand,
  parseClaudeAgent,
  parseClaudeSkill,
  discoverPackageFiles,
} from "./claude-parser.js";

export {
  TOOL_ALIASES,
  DEFAULT_TOOLS_BY_TYPE,
  inferTools,
  mapToolsFromContent,
} from "./tool-mappers.js";

export {
  formatCommandAsAgent,
  formatAgentAsAgent,
  formatSkillAsInstructions,
  generateAgentFrontmatter,
  generateInstructionsFrontmatter,
  generateAgentMarkdown,
  generateInstructionsMarkdown,
} from "./copilot-formatter.js";
