/**
 * Command: epost-kit convert
 * Convert Claude-Code commands/agents/skills to GitHub Copilot format
 */

import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ora from "ora";
import pc from "picocolors";
import { dirExists } from "@/shared/file-system.js";
import { KitPathResolver } from "@/shared/path-resolver.js";
import { box, keyValue, indent } from "@/domains/ui/ui.js";
import { resolvePackages } from "@/domains/packages/package-resolver.js";
import {
  discoverPackageFiles,
  parseClaudeCommand,
  parseClaudeAgent,
  parseClaudeSkill,
} from "@/domains/conversion/claude-parser.js";
import {
  formatCommandAsAgent,
  formatAgentAsAgent,
  formatSkillAsInstructions,
  generateAgentMarkdown,
  generateInstructionsMarkdown,
} from "@/domains/conversion/copilot-formatter.js";
import type {
  ConversionResult,
  CopilotAgent,
  CopilotInstructions,
} from "@/types/conversion.js";
import type { ConvertOptions } from "@/types/commands.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const kitPaths = new KitPathResolver(__dirname);

/**
 * Run convert command
 */
export async function runConvert(options: ConvertOptions): Promise<void> {
  const spinner = ora("Analyzing packages...").start();

  try {
    // Resolve packages to convert
    const packages = await resolvePackagesForConversion(options);
    if (packages.length === 0) {
      spinner.fail("No packages found to convert");
      return;
    }

    spinner.text = `Converting ${packages.length} package(s)...`;

    // Convert all packages
    const result = await convertPackages(packages, options);

    spinner.succeed(
      `Converted ${result.agents.length} agents, ${result.instructions.length} instructions`
    );

    // Display results
    displayConversionResult(result);

    // Write files (unless dry run)
    if (!options.dryRun) {
      await writeConversionResult(result, options);
      console.log(pc.green("\n✓ Files written to .github/"));
    } else {
      console.log(pc.yellow("\n--dry-run: No files written"));
    }
  } catch (error) {
    spinner.fail("Conversion failed");
    throw error;
  }
}

/**
 * Resolve packages for conversion
 */
async function resolvePackagesForConversion(
  options: ConvertOptions
): Promise<string[]> {
  // Get packages directory
  let packagesDir: string;
  let profilesPath: string;

  if (options.source) {
    packagesDir = await kitPaths.getPackagesDir();
    profilesPath = await kitPaths.getProfilesPath();
  } else {
    packagesDir = join(homedir(), ".epost-kit", "packages");
    profilesPath = join(homedir(), ".epost-kit", "profiles", "profiles.yaml");
  }

  // If specific packages requested
  if (options.packages) {
    return options.packages.split(",").map((p: string) => p.trim());
  }

  // If profile specified, resolve from profile
  if (options.profile) {
    const resolved = await resolvePackages({
      profile: options.profile,
      packagesDir,
      profilesPath,
    });
    return resolved.packages;
  }

  // Default: convert core package only
  return ["core"];
}

/**
 * Convert all packages
 */
async function convertPackages(
  packageNames: string[],
  options: ConvertOptions
): Promise<ConversionResult> {
  const agents: CopilotAgent[] = [];
  const instructions: CopilotInstructions[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  let packagesDir: string;
  if (options.source) {
    packagesDir = await kitPaths.getPackagesDir();
  } else {
    packagesDir = join(homedir(), ".epost-kit", "packages");
  }

  for (const pkgName of packageNames) {
    const pkgDir = join(packagesDir, pkgName);

    if (!(await dirExists(pkgDir))) {
      warnings.push(`Package not found: ${pkgName}`);
      continue;
    }

    try {
      // Discover files in package
      const files = await discoverPackageFiles(pkgDir);

      // Convert commands
      for (const cmdPath of files.commands) {
        const content = await readFile(cmdPath, "utf-8");
        const cmd = parseClaudeCommand(cmdPath, content);
        agents.push(formatCommandAsAgent(cmd));
      }

      // Convert agents
      for (const agentPath of files.agents) {
        const content = await readFile(agentPath, "utf-8");
        const agent = parseClaudeAgent(agentPath, content);
        agents.push(formatAgentAsAgent(agent));
      }

      // Convert skills
      for (const skillDir of files.skills) {
        const skillPath = join(skillDir, "SKILL.md");
        const content = await readFile(skillPath, "utf-8");
        const skill = parseClaudeSkill(skillDir, content);
        instructions.push(formatSkillAsInstructions(skill));
      }
    } catch (error) {
      errors.push(
        `Failed to convert ${pkgName}: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  return { agents, instructions, errors, warnings };
}

/**
 * Display conversion results
 */
function displayConversionResult(result: ConversionResult): void {
  console.log(
    "\n" +
      box(
        [
          keyValue([
            ["Agents", result.agents.length.toString()],
            ["Instructions", result.instructions.length.toString()],
            ["Errors", result.errors.length.toString()],
            ["Warnings", result.warnings.length.toString()],
          ]),
        ].join("\n"),
        { title: "Conversion Summary" }
      )
  );

  if (result.agents.length > 0) {
    console.log(pc.bold("\nGenerated Agents:"));
    for (const agent of result.agents) {
      console.log(indent(`• ${agent.name}`, 2));
    }
  }

  if (result.instructions.length > 0) {
    console.log(pc.bold("\nGenerated Instructions:"));
    for (const inst of result.instructions) {
      console.log(indent(`• ${inst.description}`, 2));
    }
  }

  if (result.errors.length > 0) {
    console.log(pc.red("\nErrors:"));
    for (const err of result.errors) {
      console.log(indent(`• ${err}`, 2));
    }
  }

  if (result.warnings.length > 0) {
    console.log(pc.yellow("\nWarnings:"));
    for (const warn of result.warnings) {
      console.log(indent(`• ${warn}`, 2));
    }
  }
}

/**
 * Write conversion results to files
 */
async function writeConversionResult(
  result: ConversionResult,
  options: ConvertOptions
): Promise<void> {
  const outputDir = options.output || ".github";

  // Create directories
  const agentsDir = join(outputDir, "agents");
  const instructionsDir = join(outputDir, "instructions");

  await mkdir(agentsDir, { recursive: true });
  await mkdir(instructionsDir, { recursive: true });

  // Write agents
  for (const agent of result.agents) {
    const fileName = sanitizeFileName(agent.name) + ".agent.md";
    const filePath = join(agentsDir, fileName);
    const content = generateAgentMarkdown(agent);
    await writeFile(filePath, content, "utf-8");
  }

  // Write instructions
  for (const inst of result.instructions) {
    const fileName =
      sanitizeFileName(inst.description || "instruction") + ".instructions.md";
    const filePath = join(instructionsDir, fileName);
    const content = generateInstructionsMarkdown(inst);
    await writeFile(filePath, content, "utf-8");
  }
}

/**
 * Sanitize file name (max 100 chars to avoid ENAMETOOLONG)
 */
function sanitizeFileName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Truncate to 100 chars to avoid file system limits
  return sanitized.slice(0, 100);
}
