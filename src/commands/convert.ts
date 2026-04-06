/**
 * Command: epost-kit convert
 * Convert Claude-Code commands/agents/skills to IDE-specific format.
 *
 * Supports --target vscode (default), cursor, jetbrains.
 * Uses the same TargetAdapter pipeline as `epost-kit init` to ensure
 * tool mappings, path references, and agent transforms are identical.
 */

import { join, dirname, basename } from "node:path";
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
  parseClaudeSkill,
} from "@/domains/conversion/claude-parser.js";
import {
  formatSkillAsInstructions,
  generateInstructionsMarkdown,
} from "@/domains/conversion/copilot-formatter.js";
import { createTargetAdapter } from "@/domains/installation/target-adapter.js";
import type { ConvertOptions } from "@/types/commands.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const kitPaths = new KitPathResolver(__dirname);

/** Per-target output directory defaults */
const TARGET_DEFAULTS: Record<string, { outputDir: string }> = {
  vscode:    { outputDir: ".github" },
  cursor:    { outputDir: ".cursor" },
  jetbrains: { outputDir: "." },
};

/**
 * Run convert command
 */
export async function runConvert(options: ConvertOptions): Promise<void> {
  const target = options.target ?? "vscode";
  const targetDefaults = TARGET_DEFAULTS[target] ?? TARGET_DEFAULTS["vscode"];
  const outputDir = options.output ?? targetDefaults.outputDir;

  const spinner = ora("Analyzing packages...").start();

  try {
    // Resolve packages to convert
    const packages = await resolvePackagesForConversion(options);
    if (packages.length === 0) {
      spinner.fail("No packages found to convert");
      return;
    }

    spinner.text = `Converting ${packages.length} package(s) for target: ${target}...`;

    // Get packages dir
    const packagesDir = options.source
      ? await kitPaths.getPackagesDir()
      : join(homedir(), ".epost-kit", "packages");

    // Create adapter — same pipeline as `epost-kit init`
    const adapter = await createTargetAdapter(target as Parameters<typeof createTargetAdapter>[0]);

    // Convert all packages
    const agents: Array<{ filename: string; content: string }> = [];
    const instructions: Array<{ filename: string; content: string }> = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const pkgName of packages) {
      const pkgDir = join(packagesDir, pkgName);

      if (!(await dirExists(pkgDir))) {
        warnings.push(`Package not found: ${pkgName}`);
        continue;
      }

      try {
        const files = await discoverPackageFiles(pkgDir);

        // Convert agents — use adapter.transformAgent() for identical output to init
        for (const agentPath of files.agents) {
          const rawContent = await readFile(agentPath, "utf-8");
          const filename = basename(agentPath);
          const result = adapter.transformAgent(rawContent, filename);
          agents.push(result);
        }

        // Convert commands (treated as agents)
        for (const cmdPath of files.commands) {
          const rawContent = await readFile(cmdPath, "utf-8");
          const filename = basename(cmdPath);
          const result = adapter.transformAgent(rawContent, filename);
          agents.push(result);
        }

        // Convert skills — vscode uses instructions files, other targets skip
        if (target === "vscode") {
          for (const skillDir of files.skills) {
            const skillPath = join(skillDir, "SKILL.md");
            const content = await readFile(skillPath, "utf-8");
            const skill = parseClaudeSkill(skillDir, content);
            const inst = formatSkillAsInstructions(skill);
            instructions.push({
              filename: sanitizeFileName(inst.description || "instruction") + ".instructions.md",
              content: generateInstructionsMarkdown(inst),
            });
          }
        }
      } catch (error) {
        errors.push(
          `Failed to convert ${pkgName}: ${error instanceof Error ? error.message : error}`
        );
      }
    }

    // Collect adapter warnings
    for (const w of adapter.getWarnings()) {
      warnings.push(`[${w.severity}] ${w.source}: ${w.reason}`);
    }

    spinner.succeed(
      `Converted ${agents.length} agents${instructions.length > 0 ? `, ${instructions.length} instructions` : ""} (target: ${target})`
    );

    // Display results
    displayResults({ agents, instructions, errors, warnings });

    // Write files (unless dry run)
    if (!options.dryRun) {
      await writeResults(agents, instructions, outputDir, target);
      console.log(pc.green(`\n✓ Files written to ${outputDir}/`));
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
  let packagesDir: string;
  let profilesPath: string;

  if (options.source) {
    packagesDir = await kitPaths.getPackagesDir();
    profilesPath = await kitPaths.getProfilesPath();
  } else {
    packagesDir = join(homedir(), ".epost-kit", "packages");
    profilesPath = join(homedir(), ".epost-kit", "profiles", "profiles.yaml");
  }

  if (options.packages) {
    return options.packages.split(",").map((p: string) => p.trim());
  }

  if (options.profile) {
    const resolved = await resolvePackages({
      profile: options.profile,
      packagesDir,
      profilesPath,
    });
    return resolved.packages;
  }

  return ["core"];
}

/**
 * Display results summary
 */
function displayResults(result: {
  agents: Array<{ filename: string }>;
  instructions: Array<{ filename: string }>;
  errors: string[];
  warnings: string[];
}): void {
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
      console.log(indent(`• ${agent.filename}`, 2));
    }
  }

  if (result.instructions.length > 0) {
    console.log(pc.bold("\nGenerated Instructions:"));
    for (const inst of result.instructions) {
      console.log(indent(`• ${inst.filename}`, 2));
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
 * Write results to disk
 */
async function writeResults(
  agents: Array<{ filename: string; content: string }>,
  instructions: Array<{ filename: string; content: string }>,
  outputDir: string,
  target: string,
): Promise<void> {
  if (target === "jetbrains") {
    // JetBrains: single AGENTS.md at project root
    const agentsContent = agents
      .map((a) => `## ${a.filename.replace(/\.md$/, "")}\n\n${a.content}`)
      .join("\n\n---\n\n");
    const filePath = join(outputDir, "AGENTS.md");
    await writeFile(filePath, agentsContent || "# Agents\n\n(No agents converted)\n", "utf-8");
    return;
  }

  const agentsDir = join(outputDir, "agents");
  await mkdir(agentsDir, { recursive: true });

  for (const agent of agents) {
    const filePath = join(agentsDir, agent.filename);
    await writeFile(filePath, agent.content, "utf-8");
  }

  if (instructions.length > 0) {
    const instructionsDir = join(outputDir, "instructions");
    await mkdir(instructionsDir, { recursive: true });
    for (const inst of instructions) {
      const filePath = join(instructionsDir, inst.filename);
      await writeFile(filePath, inst.content, "utf-8");
    }
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

  return sanitized.slice(0, 100);
}
