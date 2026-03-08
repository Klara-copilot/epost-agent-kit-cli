/**
 * Command: epost-kit config
 * View and edit .epost-kit.json and .epost-ignore post-installation.
 */

import { join, resolve } from "node:path";
import { writeFile, readFile } from "node:fs/promises";
import pc from "picocolors";
import { readMetadata } from "@/services/file-operations/ownership.js";
import { safeReadFile } from "@/shared/file-system.js";
import { mergeAndWriteKitConfig } from "@/domains/config/kit-config-merger.js";
import type {
  ConfigOptions,
  ConfigGetOptions,
  ConfigSetOptions,
  ConfigIgnoreAddOptions,
  ConfigIgnoreRemoveOptions,
} from "@/types/commands.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve install directory from metadata.
 * Falls back to <dir>/.claude if metadata is missing.
 */
async function resolveInstallDir(dir?: string): Promise<{ projectDir: string; installDir: string }> {
  const projectDir = dir ? resolve(dir) : resolve(process.cwd());
  const metadata = await readMetadata(projectDir);

  if (metadata?.target) {
    const targetDirMap: Record<string, string> = {
      claude: ".claude",
      cursor: ".cursor",
      vscode: ".github",
    };
    const installDirName = targetDirMap[metadata.target] ?? ".claude";
    return { projectDir, installDir: join(projectDir, installDirName) };
  }

  // Fallback: guess from what exists
  for (const candidate of [".claude", ".cursor", ".github"]) {
    const { dirExists } = await import("@/shared/file-system.js");
    if (await dirExists(join(projectDir, candidate))) {
      return { projectDir, installDir: join(projectDir, candidate) };
    }
  }

  return { projectDir, installDir: join(projectDir, ".claude") };
}

async function readCurrentKitConfig(installDir: string): Promise<Record<string, any>> {
  const configPath = join(installDir, ".epost-kit.json");
  const content = await safeReadFile(configPath);
  if (!content) return {};
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function writeKitConfig(installDir: string, config: Record<string, any>): Promise<void> {
  const configPath = join(installDir, ".epost-kit.json");
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

/** Get nested value by dot-notation path (e.g. "plan.dateFormat") */
function getByPath(obj: Record<string, any>, path: string): any {
  const parts = path.split(".");
  let cur: any = obj;
  for (const part of parts) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = cur[part];
  }
  return cur;
}

/** Set nested value by dot-notation path, creating intermediate objects */
function setByPath(obj: Record<string, any>, path: string, value: any): void {
  const parts = path.split(".");
  let cur: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (cur[part] === null || typeof cur[part] !== "object") {
      cur[part] = {};
    }
    cur = cur[part];
  }
  cur[parts[parts.length - 1]] = value;
}

/** Coerce string to best-fit type: boolean, number, or string */
function coerceValue(raw: string): any {
  // Try JSON parse (handles true, false, null, numbers, arrays, objects)
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Pretty-print a config object as aligned key: value pairs */
function printConfig(obj: Record<string, any>, prefix = ""): void {
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      printConfig(val, fullKey);
    } else {
      const display = JSON.stringify(val);
      console.log(`  ${pc.cyan(fullKey.padEnd(36))} ${display}`);
    }
  }
}

/** Safe nested get with fallback */
function getPath(obj: Record<string, any>, path: string, fallback: any = undefined): any {
  const val = getByPath(obj, path);
  return val === undefined ? fallback : val;
}

// ── .env helpers ─────────────────────────────────────────────────────────────

/** Read a single key from <installDir>/.env (returns undefined if missing) */
async function readEnvKey(installDir: string, key: string): Promise<string | undefined> {
  try {
    const content = await readFile(join(installDir, ".env"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const eq = trimmed.indexOf("=");
      if (trimmed.slice(0, eq).trim() === key) {
        return trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch { /* file doesn't exist */ }
  return undefined;
}

/** Write or update a single key in <installDir>/.env */
async function writeEnvKey(installDir: string, key: string, value: string): Promise<void> {
  const envPath = join(installDir, ".env");
  let content = "";
  try { content = await readFile(envPath, "utf-8"); } catch { /* new file */ }

  const lines = content.split("\n");
  const idx = lines.findIndex((l) => {
    const t = l.trim();
    return !t.startsWith("#") && t.startsWith(`${key}=`);
  });

  const newLine = `${key}=${value}`;
  if (idx !== -1) {
    lines[idx] = newLine;
  } else {
    if (content && !content.endsWith("\n")) lines.push("");
    lines.push(newLine);
  }
  await writeFile(envPath, lines.join("\n"), "utf-8");
}

// ── Interactive config TUI ────────────────────────────────────────────────────

/** Known Gemini models for the select prompt */
const GEMINI_MODELS = [
  { name: "gemini-2.5-flash-preview-04-17  — fast, general research  (default)", value: "gemini-2.5-flash-preview-04-17" },
  { name: "gemini-2.5-pro-preview          — deep analysis, slower", value: "gemini-2.5-pro-preview" },
  { name: "Enter model ID manually →", value: "__manual__" },
];

/** epost-kit config (bare) — interactive menu to view and edit .epost-kit.json */
export async function runConfigInteractive(opts: ConfigOptions): Promise<void> {
  const { installDir } = await resolveInstallDir(opts.dir);
  const { select, input, password, checkbox, Separator } = await import("@inquirer/prompts");

  const dim = (s: string) => pc.dim(`[${s}]`);

  // ── Advanced submenu: Plan naming settings ──────────────────────────────────
  async function runPlanMenu(): Promise<boolean> {
    let changed = false;
    while (true) {
      const config = await readCurrentKitConfig(installDir);
      const namingFormat: string = getPath(config, "plan.namingFormat", "{date}-{slug}");
      const dateFormat: string = getPath(config, "plan.dateFormat", "YYMMDD-HHmm");
      const issuePrefix: string | null = getPath(config, "plan.issuePrefix", null);

      const choice = await select({
        message: "Plan settings  (select ← Back to return)",
        pageSize: 8,
        choices: [
          new Separator("── Plan naming"),
          { name: `Naming format          ${dim(namingFormat)}`, value: "plan.namingFormat" },
          { name: `Date format            ${dim(dateFormat)}`, value: "plan.dateFormat" },
          { name: `Issue prefix           ${dim(issuePrefix ?? "none")}`, value: "plan.issuePrefix" },
          new Separator(),
          { name: pc.dim("← Back"), value: "__back__" },
        ],
      }).catch(() => "__back__");

      if (choice === "__back__") break;

      let updated = false;
      if (choice === "plan.namingFormat") {
        const val = await input({
          message: "Plan directory name pattern  (tokens: {date} {slug} {issue})",
          default: namingFormat,
        });
        setByPath(config, "plan.namingFormat", val.trim());
        updated = true;
      } else if (choice === "plan.dateFormat") {
        const val = await input({
          message: "Date format for {date} token  (dayjs — e.g. YYMMDD-HHmm → 260307-1530)",
          default: dateFormat,
        });
        setByPath(config, "plan.dateFormat", val.trim());
        updated = true;
      } else if (choice === "plan.issuePrefix") {
        const val = await input({
          message: "Issue tracker prefix for {issue} token  (e.g. PROJ — leave blank to disable)",
          default: issuePrefix ?? "",
        });
        setByPath(config, "plan.issuePrefix", val.trim() || null);
        updated = true;
      }

      if (updated) {
        await writeKitConfig(installDir, config);
        changed = true;
        console.log(pc.green("✓ Saved\n"));
      }
    }
    return changed;
  }

  // ── Main menu loop ──────────────────────────────────────────────────────────
  let hadSaves = false;
  while (true) {
    const config = await readCurrentKitConfig(installDir);

    const engine: string = getPath(config, "skills.research.engine", "websearch");
    const statusline: string = getPath(config, "statusline", "full");
    const codingLevel: number = getPath(config, "codingLevel", -1);
    const scoutEnabled: boolean = getPath(config, "hooks.scout.enabled", true);
    const privacyEnabled: boolean = getPath(config, "hooks.privacy.enabled", true);
    const packagesGuardEnabled: boolean = getPath(config, "hooks.packagesGuard.enabled", true);

    const activeCount = [scoutEnabled, privacyEnabled, packagesGuardEnabled].filter(Boolean).length;
    const hooksSummary =
      activeCount === 3 ? pc.green("all active") :
      activeCount === 0 ? pc.red("all off") :
      pc.yellow(`${activeCount}/3 active`);

    const geminiKey = engine === "gemini" ? await readEnvKey(installDir, "GEMINI_API_KEY") : undefined;
    const geminiKeyStatus = geminiKey ? pc.green("[set]") : pc.red("[not set]");

    const choice = await select({
      message: "Configure epost-kit  (↑↓ navigate · Enter select · Ctrl+C exit)",
      pageSize: 14,
      choices: [
        new Separator("── Quick settings"),
        { name: `Research engine        ${dim(engine)}`, value: "research.engine" },
        ...(engine === "gemini"
          ? [
              { name: `  Gemini model         ${dim(getPath(config, "skills.research.gemini.model", ""))}`, value: "research.gemini.model" },
              { name: `  Gemini API key       ${geminiKeyStatus}`, value: "research.gemini.apikey" },
            ]
          : []),
        { name: `Coding level           ${dim(codingLevel === -1 ? "auto" : String(codingLevel))}`, value: "codingLevel" },
        { name: `Status line            ${dim(statusline)}`, value: "statusline" },
        new Separator("── Hooks"),
        { name: `Scout · Privacy · Packages guard   ${hooksSummary}`, value: "hooks" },
        new Separator("── Advanced"),
        { name: `Plan naming & dates    ${pc.dim("→")}`, value: "advanced" },
        new Separator(),
        { name: pc.dim("Exit"), value: "__exit__" },
      ],
    }).catch(() => "__exit__");

    if (choice === "__exit__") {
      if (!hadSaves) console.log(pc.dim("No changes saved."));
      break;
    }

    let updated = false;

    if (choice === "research.engine") {
      const val = await select({
        message: "Which AI service should agents use for research tasks?",
        choices: [
          { name: "websearch — Claude's built-in web search  (no setup needed)", value: "websearch" },
          { name: "gemini    — Google Gemini API  (requires GEMINI_API_KEY)", value: "gemini" },
        ],
        default: engine,
      });
      setByPath(config, "skills.research.engine", val);
      updated = true;
    } else if (choice === "research.gemini.model") {
      const currentModel: string = getPath(config, "skills.research.gemini.model", "gemini-2.5-flash-preview-04-17");
      const knownValues = GEMINI_MODELS.map((m) => m.value).filter((v) => v !== "__manual__");
      const defaultModel = knownValues.includes(currentModel) ? currentModel : "__manual__";
      const selected = await select({
        message: "Which Gemini model should agents use for research?",
        choices: GEMINI_MODELS,
        default: defaultModel,
      });
      if (selected === "__manual__") {
        const val = await input({
          message: "Enter Gemini model ID",
          default: currentModel,
        });
        setByPath(config, "skills.research.gemini.model", val.trim());
      } else {
        setByPath(config, "skills.research.gemini.model", selected);
      }
      updated = true;
    } else if (choice === "research.gemini.apikey") {
      const existing = await readEnvKey(installDir, "GEMINI_API_KEY");
      console.log(pc.dim(`  Saved to ${join(installDir, ".env")}  (gitignored)\n`));
      const val = await password({
        message: existing
          ? "Update GEMINI_API_KEY  (leave blank to keep current)"
          : "Enter your GEMINI_API_KEY",
        mask: "*",
      });
      if (val.trim()) {
        await writeEnvKey(installDir, "GEMINI_API_KEY", val.trim());
        hadSaves = true;
        console.log(pc.green("✓ API key saved to .env\n"));
      } else if (!existing) {
        console.log(pc.dim("No key entered — skipped.\n"));
      } else {
        console.log(pc.dim("Unchanged.\n"));
      }
      continue; // writeEnvKey handles saving — skip the config write below
    } else if (choice === "codingLevel") {
      const val = await select({
        message: "How much explanation should agents include in code responses?",
        choices: [
          { name: "auto  — detect from project complexity  (recommended)", value: -1 },
          { name: "  0   beginner     — comments, step-by-step explanations", value: 0 },
          { name: "  1   intermediate — balanced detail", value: 1 },
          { name: "  2   advanced     — terse, minimal hand-holding", value: 2 },
        ],
        default: codingLevel,
      });
      setByPath(config, "codingLevel", val);
      updated = true;
    } else if (choice === "statusline") {
      const val = await select({
        message: "What should the status line show at the top of each agent response?",
        choices: [
          { name: "full     — date, branch, active plan, and all context info", value: "full" },
          { name: "compact  — condensed one-line summary", value: "compact" },
          { name: "off      — hide the status line entirely", value: "off" },
        ],
        default: statusline,
      });
      setByPath(config, "statusline", val);
      updated = true;
    } else if (choice === "hooks") {
      // Batch toggle — one checkbox for all 3 hooks, confirm once
      const selected = await checkbox({
        message: "Which hooks should be active?",
        choices: [
          {
            name: `Scout          — blocks heavy dirs (node_modules, .git) from LLM context`,
            value: "scout",
            checked: scoutEnabled,
          },
          {
            name: `Privacy        — scrubs secrets and API keys before sending to LLM`,
            value: "privacy",
            checked: privacyEnabled,
          },
          {
            name: `Packages guard — protects .claude/ files from being overwritten by tools`,
            value: "packages",
            checked: packagesGuardEnabled,
          },
        ],
      });
      setByPath(config, "hooks.scout.enabled", selected.includes("scout"));
      setByPath(config, "hooks.privacy.enabled", selected.includes("privacy"));
      setByPath(config, "hooks.packagesGuard.enabled", selected.includes("packages"));
      updated = true;
    } else if (choice === "advanced") {
      const changed = await runPlanMenu();
      if (changed) hadSaves = true;
      continue; // plan menu saves independently — skip block below
    }

    if (updated) {
      await writeKitConfig(installDir, config);
      hadSaves = true;
      console.log(pc.green("✓ Saved\n"));
    }
  }
}

// ── Subcommand handlers ───────────────────────────────────────────────────────

/** config show — pretty-print current .epost-kit.json */
export async function runConfigShow(opts: ConfigOptions): Promise<void> {
  const { installDir } = await resolveInstallDir(opts.dir);
  const config = await readCurrentKitConfig(installDir);

  if (opts.json) {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  const configPath = join(installDir, ".epost-kit.json");
  console.log(`\n${pc.bold(".epost-kit.json")} ${pc.dim(configPath)}\n`);
  if (Object.keys(config).length === 0) {
    console.log(pc.dim("  (empty)"));
  } else {
    printConfig(config);
  }
  console.log();
}

/** config get <key> — get value by dot-notation */
export async function runConfigGet(opts: ConfigGetOptions): Promise<void> {
  const { installDir } = await resolveInstallDir(opts.dir);
  const config = await readCurrentKitConfig(installDir);
  const value = getByPath(config, opts.key);

  if (value === undefined) {
    console.error(pc.red(`Key not found: ${opts.key}`));
    process.exit(1);
  }

  if (opts.json) {
    console.log(JSON.stringify(value));
  } else {
    console.log(JSON.stringify(value, null, 2));
  }
}

/** config set <key> <value> — set value by dot-notation */
export async function runConfigSet(opts: ConfigSetOptions): Promise<void> {
  const { installDir } = await resolveInstallDir(opts.dir);
  const config = await readCurrentKitConfig(installDir);
  const coerced = coerceValue(opts.value);
  setByPath(config, opts.key, coerced);
  await writeKitConfig(installDir, config);
  console.log(
    `${pc.green("✓")} Set ${pc.cyan(opts.key)} = ${JSON.stringify(coerced)}`,
  );
}

/** config reset — re-merge from installed packages */
export async function runConfigReset(opts: ConfigOptions): Promise<void> {
  const { projectDir, installDir } = await resolveInstallDir(opts.dir);
  const metadata = await readMetadata(projectDir);

  if (!metadata?.installedPackages || metadata.installedPackages.length === 0) {
    console.error(
      pc.red("No installed packages found in metadata. Run epost-kit init first."),
    );
    process.exit(1);
  }

  if (!opts.yes) {
    const { confirm } = await import("@inquirer/prompts");
    const proceed = await confirm({
      message: "Reset .epost-kit.json to package defaults?",
      default: false,
    });
    if (!proceed) {
      console.log("Cancelled");
      return;
    }
  }

  // Resolve packages directory
  const { homedir } = await import("node:os");
  const packagesDir = metadata.source
    ? join(resolve(metadata.source), "packages")
    : join(homedir(), ".epost-kit", "packages");

  const packages = metadata.installedPackages.map((name) => ({
    name,
    dir: join(packagesDir, name),
  }));

  const { sources } = await mergeAndWriteKitConfig(
    packages,
    join(installDir, ".epost-kit.json"),
  );

  if (sources.length === 0) {
    console.log(pc.yellow("No kit config found in packages"));
  } else {
    console.log(
      `${pc.green("✓")} Kit config reset from ${sources.length} package${sources.length !== 1 ? "s" : ""}`,
    );
  }
}

/** config ignore — show current .epost-ignore patterns */
export async function runConfigIgnore(opts: ConfigOptions): Promise<void> {
  const { installDir } = await resolveInstallDir(opts.dir);
  const ignorePath = join(installDir, ".epost-ignore");
  const content = await safeReadFile(ignorePath);

  if (!content) {
    console.log(pc.dim("No .epost-ignore file found"));
    return;
  }

  if (opts.json) {
    const patterns = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    console.log(JSON.stringify(patterns, null, 2));
    return;
  }

  console.log(`\n${pc.bold(".epost-ignore")} ${pc.dim(ignorePath)}\n`);
  const lines = content.split("\n");
  for (const line of lines) {
    if (!line.trim()) {
      console.log();
    } else if (line.trimStart().startsWith("#")) {
      console.log(pc.dim(line));
    } else {
      console.log(`  ${line}`);
    }
  }
  console.log();
}

/** config ignore add <pattern> — append pattern (no-op if already present) */
export async function runConfigIgnoreAdd(opts: ConfigIgnoreAddOptions): Promise<void> {
  const { installDir } = await resolveInstallDir(opts.dir);
  const ignorePath = join(installDir, ".epost-ignore");
  const existing = (await safeReadFile(ignorePath)) ?? "";

  const lines = existing.split("\n");
  const patterns = new Set(
    lines.map((l) => l.trim()).filter((l) => l && !l.startsWith("#")),
  );

  if (patterns.has(opts.pattern)) {
    console.log(pc.dim(`Pattern already present: ${opts.pattern}`));
    return;
  }

  const newContent = existing.trimEnd() + "\n" + opts.pattern + "\n";
  await writeFile(ignorePath, newContent, "utf-8");
  console.log(`${pc.green("✓")} Added ignore pattern: ${pc.cyan(opts.pattern)}`);
}

/** config ignore remove <pattern> — remove pattern */
export async function runConfigIgnoreRemove(opts: ConfigIgnoreRemoveOptions): Promise<void> {
  const { installDir } = await resolveInstallDir(opts.dir);
  const ignorePath = join(installDir, ".epost-ignore");
  const existing = await safeReadFile(ignorePath);

  if (!existing) {
    console.error(pc.red("No .epost-ignore file found"));
    process.exit(1);
  }

  const lines = existing.split("\n");
  const filtered = lines.filter((l) => l.trim() !== opts.pattern);

  if (filtered.length === lines.length) {
    console.log(pc.dim(`Pattern not found: ${opts.pattern}`));
    return;
  }

  await writeFile(ignorePath, filtered.join("\n"), "utf-8");
  console.log(`${pc.green("✓")} Removed ignore pattern: ${pc.cyan(opts.pattern)}`);
}
