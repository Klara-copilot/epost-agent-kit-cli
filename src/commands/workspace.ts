/**
 * Command: epost-kit workspace init
 * Generate workspace-level CLAUDE.md for multi-repo setups
 */

import { resolve, join, basename } from "node:path";
import { confirm } from "@inquirer/prompts";
import ora from "ora";
import { logger } from "@/shared/logger.js";
import { fileExists, dirExists } from "@/shared/file-system.js";
import { generateWorkspaceClaudeMd } from "@/domains/installation/claude-md-generator.js";
import type { WorkspaceInitOptions } from "@/types/commands.js";

async function findTemplatesDir(): Promise<string | null> {
  const paths = [
    join(process.cwd(), "templates"),
    join(process.cwd(), "..", "templates"),
  ];
  for (const p of paths) {
    if (await dirExists(resolve(p))) return resolve(p);
  }
  return null;
}

export async function runWorkspaceInit(
  opts: WorkspaceInitOptions,
): Promise<void> {
  const workspaceDir = opts.dir ? resolve(opts.dir) : resolve(process.cwd());
  const claudeMdPath = join(workspaceDir, "CLAUDE.md");

  // Check if CLAUDE.md already exists
  if (await fileExists(claudeMdPath)) {
    if (!opts.yes) {
      const overwrite = await confirm({
        message: "CLAUDE.md already exists in workspace root. Overwrite?",
        default: false,
      });
      if (!overwrite) {
        logger.info("Cancelled");
        return;
      }
    }
  }

  const spinner = ora("Generating workspace CLAUDE.md...").start();

  // Find template
  const templatesDir = await findTemplatesDir();
  const templatePath = templatesDir
    ? join(templatesDir, "workspace-claude.md.hbs")
    : "";

  const context = {
    workspaceName: basename(workspaceDir),
    generatedDate: new Date().toISOString().split("T")[0],
  };

  await generateWorkspaceClaudeMd(templatePath, context, claudeMdPath);
  spinner.succeed("Workspace CLAUDE.md generated");

  logger.info(`\nGenerated: ${claudeMdPath}`);
  logger.info(
    "\nThis file is automatically inherited by all repos in subdirectories.",
  );
  logger.info("Edit it to add:");
  logger.info("  - Team ownership and responsibilities");
  logger.info("  - Cross-repo conventions (API format, branch naming)");
  logger.info("  - Links to internal resources (Figma, Confluence, API docs)");
}
