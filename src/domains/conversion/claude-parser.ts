/**
 * Claude-Code format parser
 * Parses markdown files with YAML frontmatter into structured types
 */

import { readFile, readdir } from "node:fs/promises";
import { join, basename, dirname } from "node:path";
import type {
  ClaudeCommand,
  ClaudeAgent,
  ClaudeSkill,
} from "@/types/conversion.js";

const ARGUMENTS_PATTERN = /\$ARGUMENTS/g;
const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const EMPTY_FRONTMATTER_PATTERN = /^---\n*---\n([\s\S]*)$/;

/**
 * Strip surrounding quotes from a string
 */
function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Parse YAML frontmatter from markdown content
 */
export function parseFrontmatter(content: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  // Check for empty frontmatter first
  const emptyMatch = content.match(EMPTY_FRONTMATTER_PATTERN);
  if (emptyMatch) {
    return { frontmatter: {}, body: emptyMatch[1] };
  }

  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter: Record<string, string> = {};
  const lines = match[1].split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = stripQuotes(line.slice(colonIndex + 1).trim());
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body: match[2] };
}

/**
 * Parse a Claude-Code command file
 */
export function parseClaudeCommand(
  filePath: string,
  content: string
): ClaudeCommand {
  const { frontmatter, body } = parseFrontmatter(content);
  const fileName = basename(filePath, ".md");
  const parentDir = basename(dirname(filePath));

  return {
    sourcePath: filePath,
    name: parentDir === "commands" ? fileName : `${parentDir}-${fileName}`,
    title: frontmatter.title || frontmatter.name || fileName,
    description: frontmatter.description || "",
    agent: frontmatter.agent,
    argumentHint: frontmatter["argument-hint"],
    content: body.trim(),
    hasArguments: ARGUMENTS_PATTERN.test(content),
  };
}

/**
 * Parse a Claude-Code agent file
 */
export function parseClaudeAgent(
  filePath: string,
  content: string
): ClaudeAgent {
  const { body } = parseFrontmatter(content);
  const name = basename(filePath, ".md");

  // Extract first paragraph as description
  const firstParagraph = body
    .split("\n\n")[0]
    ?.replace(/^#\s+/, "")
    .slice(0, 200) || "";

  return {
    sourcePath: filePath,
    name,
    description: firstParagraph,
    content: body.trim(),
  };
}

/**
 * Parse a Claude-Code skill (SKILL.md)
 */
export function parseClaudeSkill(
  skillDir: string,
  content: string
): ClaudeSkill {
  const { frontmatter, body } = parseFrontmatter(content);
  const name = basename(skillDir);

  return {
    sourcePath: join(skillDir, "SKILL.md"),
    name,
    description: frontmatter.description,
    content: body.trim(),
    fileTypes: inferFileTypes(name),
  };
}

/**
 * Infer applicable file types from skill name
 */
function inferFileTypes(skillName: string): string[] {
  const typeMap: Record<string, string[]> = {
    typescript: ["ts", "tsx"],
    javascript: ["js", "jsx"],
    swift: ["swift"],
    ios: ["swift"],
    android: ["kt", "java"],
    python: ["py"],
    rust: ["rs"],
    go: ["go"],
    testing: ["test.ts", "test.js", "spec.ts", "spec.js"],
    react: ["tsx", "jsx"],
    vue: ["vue"],
    svelte: ["svelte"],
  };

  const lowerName = skillName.toLowerCase();
  for (const [key, extensions] of Object.entries(typeMap)) {
    if (lowerName.includes(key)) {
      return extensions;
    }
  }

  return [];
}

/**
 * Discover all convertable files in a package
 */
export async function discoverPackageFiles(packageDir: string): Promise<{
  commands: string[];
  agents: string[];
  skills: string[];
}> {
  const commands: string[] = [];
  const agents: string[] = [];
  const skills: string[] = [];

  // Discover commands
  const commandsDir = join(packageDir, "commands");
  try {
    const commandDirs = await readdir(commandsDir, { withFileTypes: true });
    for (const dir of commandDirs) {
      if (dir.isDirectory()) {
        const files = await readdir(join(commandsDir, dir.name));
        for (const file of files) {
          if (file.endsWith(".md")) {
            commands.push(join(commandsDir, dir.name, file));
          }
        }
      }
    }
  } catch {
    /* ignore */
  }

  // Discover agents
  const agentsDir = join(packageDir, "agents");
  try {
    const files = await readdir(agentsDir);
    for (const file of files) {
      if (file.endsWith(".md")) {
        agents.push(join(agentsDir, file));
      }
    }
  } catch {
    /* ignore */
  }

  // Discover skills
  const skillsDir = join(packageDir, "skills");
  try {
    const skillDirs = await readdir(skillsDir, { withFileTypes: true });
    for (const dir of skillDirs) {
      if (dir.isDirectory()) {
        const skillPath = join(skillsDir, dir.name, "SKILL.md");
        try {
          await readFile(skillPath);
          skills.push(join(skillsDir, dir.name));
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }

  return { commands, agents, skills };
}
