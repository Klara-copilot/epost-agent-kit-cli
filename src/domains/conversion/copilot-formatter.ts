/**
 * Copilot format formatter
 * Converts Claude-Code types to GitHub Copilot format
 */

import type {
  ClaudeCommand,
  ClaudeAgent,
  ClaudeSkill,
  CopilotAgent,
  CopilotInstructions,
} from "@/types/conversion.js";
import { inferTools } from "./tool-mappers.js";

const MAX_CONTENT_LENGTH = 30000;
const ARGUMENTS_PLACEHOLDER = /\$ARGUMENTS/g;

/**
 * Format Claude command as Copilot agent
 */
export function formatCommandAsAgent(cmd: ClaudeCommand): CopilotAgent {
  // Replace $ARGUMENTS with Expected Input section
  let content = cmd.content;

  if (cmd.hasArguments) {
    content = addExpectedInputSection(content, cmd.argumentHint);
  }

  // Infer tools from content
  const tools = inferTools(cmd.content);

  return {
    name: cmd.title || cmd.name,
    description: cmd.description || `Claude command: ${cmd.name}`,
    tools,
    userInvocable: true,
    content: truncateContent(content),
  };
}

/**
 * Format Claude agent as Copilot agent
 */
export function formatAgentAsAgent(agent: ClaudeAgent): CopilotAgent {
  const tools = inferTools(agent.content);

  return {
    name: agent.name,
    description: agent.description || `Agent: ${agent.name}`,
    tools,
    userInvocable: true,
    content: truncateContent(agent.content),
  };
}

/**
 * Format Claude skill as Copilot instructions
 */
export function formatSkillAsInstructions(
  skill: ClaudeSkill
): CopilotInstructions {
  const applyTo = skill.fileTypes?.length
    ? skill.fileTypes.map((ext) => `**/*.${ext}`).join(",")
    : "**/*";

  return {
    description: skill.description || `Skill: ${skill.name}`,
    applyTo,
    content: truncateContent(skill.content),
  };
}

/**
 * Add Expected Input section for $ARGUMENTS
 */
function addExpectedInputSection(content: string, hint?: string): string {
  // Remove $ARGUMENTS placeholder
  let processed = content.replace(ARGUMENTS_PLACEHOLDER, "");

  // Add Expected Input section
  const inputSection = `
## Expected Input

${
  hint
    ? `**Format:** ${hint}`
    : "Provide the feature description or task details."
}

When invoking this agent, describe what you want to accomplish.
`;

  // Insert after first heading if exists
  const headingMatch = processed.match(/^(#{1,3}\s+.+)\n/m);
  if (headingMatch) {
    const insertPos = processed.indexOf(headingMatch[0]) + headingMatch[0].length;
    processed =
      processed.slice(0, insertPos) + inputSection + processed.slice(insertPos);
  } else {
    processed = inputSection + processed;
  }

  return processed;
}

/**
 * Truncate content to Copilot limit
 */
function truncateContent(content: string): string {
  if (content.length <= MAX_CONTENT_LENGTH) {
    return content;
  }

  // Truncate and add notice
  const truncated = content.slice(0, MAX_CONTENT_LENGTH - 200);
  const lastNewline = truncated.lastIndexOf("\n");

  return (
    truncated.slice(0, lastNewline) +
    "\n\n---\n*Content truncated (Copilot limit: 30,000 chars)*"
  );
}

/**
 * Escape special characters for YAML
 */
function escapeYaml(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

/**
 * Generate YAML frontmatter for Copilot agent
 */
export function generateAgentFrontmatter(agent: CopilotAgent): string {
  const lines = ["---"];

  lines.push(`name: "${escapeYaml(agent.name)}"`);
  lines.push(`description: "${escapeYaml(agent.description)}"`);

  if (agent.target) {
    lines.push(`target: "${agent.target}"`);
  }

  if (agent.tools?.length) {
    lines.push(`tools: ${JSON.stringify(agent.tools)}`);
  }

  if (agent.disableModelInvocation !== undefined) {
    lines.push(`disable-model-invocation: ${agent.disableModelInvocation}`);
  }

  if (agent.userInvocable !== undefined) {
    lines.push(`user-invocable: ${agent.userInvocable}`);
  }

  lines.push("---");

  return lines.join("\n");
}

/**
 * Generate YAML frontmatter for Copilot instructions
 */
export function generateInstructionsFrontmatter(
  instructions: CopilotInstructions
): string {
  const lines = ["---"];

  lines.push(`description: "${escapeYaml(instructions.description)}"`);

  if (instructions.applyTo) {
    lines.push(`applyTo: "${instructions.applyTo}"`);
  }

  lines.push("---");

  return lines.join("\n");
}

/**
 * Generate complete agent markdown file
 */
export function generateAgentMarkdown(agent: CopilotAgent): string {
  const frontmatter = generateAgentFrontmatter(agent);
  return `${frontmatter}\n\n${agent.content}`;
}

/**
 * Generate complete instructions markdown file
 */
export function generateInstructionsMarkdown(
  instructions: CopilotInstructions
): string {
  const frontmatter = generateInstructionsFrontmatter(instructions);
  return `${frontmatter}\n\n${instructions.content}`;
}
