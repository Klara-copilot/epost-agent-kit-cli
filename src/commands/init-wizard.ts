/**
 * Interactive init wizard — Steps 0–6
 * Guides the user through project detection, scope, bundle, target, and preview.
 */

import { join, basename } from "node:path";
import { select, confirm, checkbox } from "@inquirer/prompts";
import pc from "picocolors";
import { dirExists } from "@/shared/file-system.js";
import { box, keyValue } from "@/domains/ui/index.js";
import { resolvePackages, loadAllManifests, loadProfiles } from "@/domains/packages/package-resolver.js";
import { detectProjectProfile } from "@/domains/packages/profile-loader.js";
import type { TargetName } from "@/domains/installation/target-adapter.js";

// ── Types ──

export interface WizardState {
  projectDir: string;
  projectName: string;
  gitDetected: boolean;
  detectedStack: string | null;
  scope: "single-skill" | "bundle" | "full-kit";
  selectedSkill?: "discover" | "plan" | "fix" | "review";
  selectedBundle?: string;
  addonPackages: string[];
  excludePackages: string[];
  installScope: "project" | "user";
  target: TargetName;
  resolvedPackages: string[];
  profileName: string | undefined;
}

// ── Static mappings ──

/**
 * Bundle definitions sourced from bundles.yaml roles + profiles.yaml package lists.
 * Each entry maps a UI bundle key → { profile for resolvePackages, display label, description, addons }
 */
const BUNDLE_DEFINITIONS: Record<string, {
  profile: string | null;          // null = custom package list (no profile key)
  packages?: string[];             // used when profile is null
  label: string;
  description: string;
  addons: string[];                // optional add-on packages shown as checkboxes
}> = {
  "web-frontend":    { profile: "web-fullstack",  label: "Web Frontend",           description: "React, Next.js, testing, i18n, auth, a11y",         addons: [] },
  "ios-developer":   { profile: "ios-b2c",         label: "iOS Developer",          description: "Swift 6, SwiftUI, UIKit, iOS a11y",                  addons: [] },
  "android-developer": { profile: "android-b2c",  label: "Android Developer",      description: "Kotlin, Jetpack Compose, Android a11y",              addons: [] },
  "backend-api":     { profile: "backend-api",     label: "Backend / API",          description: "Jakarta EE, WildFly, JAX-RS, PostgreSQL, MongoDB",   addons: ["a11y", "design-system"] },
  "designer":        { profile: "web-ui-lib",      label: "Designer",               description: "Design tokens, Figma, UI library, launchpad",        addons: ["a11y"] },
  "kit-author":      { profile: "kit-designer",    label: "Kit Author",             description: "Agent & skill authoring, kit CLI",                   addons: ["a11y", "design-system"] },
  "a11y-specialist": { profile: null, packages: ["core", "a11y"], label: "Accessibility Specialist", description: "Cross-platform WCAG 2.1 AA, all platforms", addons: [] },
};


const SKILL_TO_PACKAGES: Record<string, string[]> = {
  discover: ["core"],
  plan:     ["core", "kit"],
  fix:      ["core"],
  review:   ["core", "kit"],
};

// ── Helpers ──

function printStep(n: number, label: string): void {
  console.log(`\n  ${pc.cyan(pc.bold(`[${n}]`))} ${pc.bold(label)}\n`);
}

async function detectStack(projectDir: string): Promise<string | null> {
  const { readdir } = await import("node:fs/promises");
  try {
    const entries = await readdir(projectDir);
    if (entries.includes("package.json")) return "Node / TypeScript";
    if (entries.some((e) => e.endsWith(".swift"))) return "Swift (iOS)";
    if (entries.some((e) => e.endsWith(".kt"))) return "Kotlin (Android)";
    if (entries.some((e) => e.endsWith(".java"))) return "Java (Backend)";
  } catch {
    // ignore
  }
  return null;
}

// ── Main wizard ──

export async function runInitWizard(
  initialProjectDir: string,
  packagesDir: string,
  profilesPath: string,
): Promise<WizardState | null> {
  let projectDir = initialProjectDir;

  // ── Step 0: Welcome ──
  const welcomeContent = [
    `Welcome to ${pc.bold("epost-kit")} setup!`,
    ``,
    `This wizard will help you install the right agents and skills`,
    `for your project in under a minute.`,
    ``,
    `You can re-run this at any time with ${pc.cyan("epost-kit init")}.`,
  ].join("\n");
  console.log("\n" + box(welcomeContent, { title: "epost-kit init" }));

  const start = await confirm({ message: "Press Enter to start setup", default: true });
  if (!start) return null;

  // ── Step 1: Detect Context ──
  printStep(1, "Detecting project");

  let projectName = basename(projectDir);
  const gitDetected = await dirExists(join(projectDir, ".git"));
  const detectedStack = await detectStack(projectDir);

  const profiles = await loadProfiles(profilesPath);
  const detected = await detectProjectProfile(projectDir, profiles);

  const detectedLines: string[] = [
    `  ${pc.green("✓")} Project   ${pc.dim(projectName)}`,
    `  ${gitDetected ? pc.green("✓") : pc.dim("–")} Git repo  ${gitDetected ? pc.dim("detected") : pc.dim("not found")}`,
  ];
  if (detectedStack) {
    detectedLines.push(`  ${pc.green("✓")} Stack     ${pc.dim(detectedStack)}`);
  }
  if (detected) {
    detectedLines.push(`  ${pc.cyan("→")} Recommended profile: ${pc.bold(detected.displayName)}`);
  }
  console.log(detectedLines.join("\n") + "\n");

  const continueChoice = await select({
    message: "Continue with this project?",
    choices: [
      { name: `Yes, use ${pc.bold(projectName)}`, value: "yes" },
      { name: "Change project path", value: "change" },
    ],
    default: "yes",
  });

  if (continueChoice === "change") {
    const { input } = await import("@inquirer/prompts");
    const newPath = await input({ message: "Enter project path:", default: projectDir });
    const { resolve } = await import("node:path");
    projectDir = resolve(newPath);
    process.chdir(projectDir);
    projectName = basename(projectDir);
  }

  // ── Step 2: Choose Scope ──
  printStep(2, "Choose installation scope");
  console.log("  What do you want to install?\n");

  const scope = await select<"single-skill" | "bundle" | "full-kit">({
    message: "What do you want to install?",
    choices: [
      { name: `Install full kit  ${pc.dim("(all features — web, iOS, Android, backend, design)")}`, value: "full-kit" },
      { name: `Install a bundle  ${pc.dim("(pick a role: web frontend, iOS, Android, backend…)")}`, value: "bundle" },
      { name: `Try a single skill  ${pc.dim("(first-time users, safe exploration)")}`, value: "single-skill" },
    ],
    default: "full-kit",
  });

  if (scope === "full-kit") {
    const fullKitInfo = [
      "Includes:",
      "  • all platforms (web, iOS, Android, backend)",
      "  • design system tools",
      "  • a11y, domains, kit authoring",
      "  • full routing and skill set",
      "",
      "Complexity: High",
    ].join("\n");
    console.log("\n" + box(fullKitInfo, { title: "Full Kit" }) + "\n");
  } else if (scope === "single-skill") {
    const singleSkillInfo = [
      "Best for:",
      "  • first-time users",
      "  • safe exploration",
      "  • minimal setup",
    ].join("\n");
    console.log("\n" + box(singleSkillInfo, { title: "Single Skill" }) + "\n");
  }

  // ── Step 3: Customize ──
  printStep(3, "Customize");

  let selectedSkill: WizardState["selectedSkill"] | undefined;
  let selectedBundle: string | undefined;
  let addonPackages: string[] = [];
  let excludePackages: string[] = [];
  let profileName: string | undefined;
  let resolvedPackages: string[] = [];

  if (scope === "single-skill") {
    selectedSkill = await select<"discover" | "plan" | "fix" | "review">({
      message: "Which skill to try?",
      choices: [
        { name: `discover  ${pc.dim("→ explore the codebase, understand its structure")}`, value: "discover" },
        { name: `plan      ${pc.dim("→ design features, create technical specs")}`, value: "plan" },
        { name: `fix       ${pc.dim("→ debug errors and trace root causes")}`, value: "fix" },
        { name: `review    ${pc.dim("→ review code quality and suggest improvements")}`, value: "review" },
      ],
      default: "discover",
    });

    const packages = SKILL_TO_PACKAGES[selectedSkill] ?? ["core"];
    const res = await resolvePackages({ packagesDir, profilesPath, packages });
    resolvedPackages = res.packages;
    profileName = undefined;

  } else if (scope === "bundle") {
    // Sub-bundle picker — built from BUNDLE_DEFINITIONS
    const defaultBundle = detected ? (detectBundleFromProfile(detected.profile) ?? "web-frontend") : "web-frontend";
    selectedBundle = await select({
      message: "Choose a bundle:",
      choices: Object.entries(BUNDLE_DEFINITIONS).map(([key, def]) => ({
        name: `${def.label.padEnd(28)} ${pc.dim(def.description)}`,
        value: key,
      })),
      default: defaultBundle,
    });

    const bundleDef = BUNDLE_DEFINITIONS[selectedBundle];
    if (bundleDef) {
      profileName = bundleDef.profile ?? undefined;

      // Optional add-ons specific to this bundle
      const allManifests = await loadAllManifests(packagesDir);
      const addOnCandidates = bundleDef.addons.filter((p) => allManifests.has(p));
      if (addOnCandidates.length > 0) {
        addonPackages = await checkbox({
          message: "Add optional packages?",
          choices: addOnCandidates.map((name) => {
            const m = allManifests.get(name);
            const desc = m?.description ?? "";
            return {
              name: desc ? `${name.padEnd(20)} ${pc.dim(desc)}` : name,
              value: name,
              checked: false,
            };
          }),
        });
      }

      const res = await resolvePackages({
        packagesDir,
        profilesPath,
        profile: profileName,
        packages: bundleDef.packages
          ? [...bundleDef.packages, ...addonPackages]
          : addonPackages.length > 0 ? addonPackages : undefined,
      });
      resolvedPackages = res.packages;
    }

  } else {
    // full-kit
    profileName = "full";
    const excludeChoices = await checkbox({
      message: "Exclude any platforms?",
      choices: [
        { name: "Skip mobile  (iOS + Android)", value: "mobile", checked: false },
        { name: "Skip backend  (Java EE)", value: "backend", checked: false },
      ],
    });

    const excludeMap: Record<string, string[]> = {
      mobile:  ["platform-ios", "platform-android"],
      backend: ["platform-backend"],
    };
    for (const choice of excludeChoices) {
      if (excludeMap[choice]) excludePackages.push(...excludeMap[choice]);
    }

    const res = await resolvePackages({
      packagesDir,
      profilesPath,
      profile: "full",
      exclude: excludePackages.length > 0 ? excludePackages : undefined,
    });
    resolvedPackages = res.packages;
  }

  // ── Step 4: Install Scope ──
  printStep(4, "Install location");

  const installScopeChoice = await select<"project" | "user">({
    message: "Where to install?",
    choices: [
      {
        name: `This project  ${pc.dim("(committed with your repo, only active here)")}`,
        value: "project",
      },
      {
        name: `Global (user environment)  ${pc.dim("(available across projects on this machine)")}`,
        value: "user",
      },
    ],
    default: "project",
  });

  // ── Step 5: Editor / Runtime ──
  printStep(5, "Choose editor / runtime");

  const target = await select<TargetName>({
    message: "Which editor / runtime?",
    choices: [
      { name: `Claude Code       ${pc.dim("→ .claude/")}`, value: "claude" as const },
      { name: `VS Code / Copilot ${pc.dim("→ .vscode/")}`, value: "vscode" as const },
      { name: `Cursor            ${pc.dim("→ .cursor/")}`, value: "cursor" as const },
      { name: `Antigravity       ${pc.dim("→ GEMINI.md")}`, value: "antigravity" as const },
      { name: `Export only       ${pc.dim("→ no editor integration")}`, value: "export" as const },
    ],
    default: "claude",
  });

  // ── Step 6: Preview (Trust Step) ──
  printStep(6, "Review before installing");

  const allManifests = await loadAllManifests(packagesDir);
  const agentCount = resolvedPackages.reduce((sum, p) => sum + (allManifests.get(p)?.provides.agents.length ?? 0), 0);
  const skillCount = resolvedPackages.reduce((sum, p) => sum + (allManifests.get(p)?.provides.skills.length ?? 0), 0);

  const targetLabel =
    target === "claude"       ? "Claude Code (.claude/)" :
    target === "vscode"       ? "VS Code / Copilot (.github/)" :
    target === "cursor"       ? "Cursor (.cursor/)" :
    target === "antigravity"  ? "Antigravity (project root)" :
    "Export only (.epost-export/)";

  const scopeLabel =
    installScopeChoice === "user"
      ? "Global (~/ user environment)"
      : `This project (${projectName}/)`;

  const installDirName =
    target === "claude"       ? ".claude" :
    target === "vscode"       ? ".github" :
    target === "cursor"       ? ".cursor" :
    target === "antigravity"  ? "." :
    ".epost-export";

  const previewContent = [
    keyValue([
      ["Scope  ", `${scope}`],
      ["Target ", targetLabel],
      ["Install", scopeLabel],
    ], { indent: 0 }),
    "",
    `Packages (${resolvedPackages.length}):  ${resolvedPackages.join(", ")}`,
    "",
    `You'll get:`,
    `  ${pc.cyan("agents")}  ${agentCount}`,
    `  ${pc.cyan("skills")}  ${skillCount}`,
    "",
    `Files will be created in: ${pc.bold(installDirName + "/")}`,
    "",
    pc.dim("Safe install: existing customized files are backed up before any changes."),
  ].join("\n");

  console.log("\n" + box(previewContent, { title: "Ready to install" }) + "\n");

  let finalDecision: string = "install";
  let loopStep5 = true;

  while (loopStep5) {
    finalDecision = await select({
      message: "Proceed?",
      choices: [
        { name: "Yes, install", value: "install" },
        { name: "Back (change editor)", value: "back" },
        { name: "Cancel", value: "cancel" },
      ],
      default: "install",
    });

    if (finalDecision === "back") {
      printStep(5, "Choose editor / runtime (retry)");
      // Re-run step 5 inline — target is const so we must reassign via a let
      const retarget = await select<TargetName>({
        message: "Which editor / runtime?",
        choices: [
          { name: `Claude Code       ${pc.dim("→ .claude/")}`, value: "claude" as const },
          { name: `VS Code / Copilot ${pc.dim("→ .vscode/")}`, value: "vscode" as const },
          { name: `Cursor            ${pc.dim("→ .cursor/")}`, value: "cursor" as const },
          { name: `Antigravity       ${pc.dim("→ GEMINI.md")}`, value: "antigravity" as const },
          { name: `Export only       ${pc.dim("→ no editor integration")}`, value: "export" as const },
        ],
        default: target,
      });
      // Update result state by returning from loop with new target value
      return runWizardFinish({
        projectDir,
        projectName,
        gitDetected,
        detectedStack,
        scope,
        selectedSkill,
        selectedBundle,
        addonPackages,
        excludePackages,
        installScope: installScopeChoice,
        target: retarget,
        resolvedPackages,
        profileName,
      });
    } else {
      loopStep5 = false;
    }
  }

  if (finalDecision === "cancel") return null;

  return {
    projectDir,
    projectName,
    gitDetected,
    detectedStack,
    scope,
    selectedSkill,
    selectedBundle,
    addonPackages,
    excludePackages,
    installScope: installScopeChoice,
    target,
    resolvedPackages,
    profileName,
  };
}

// Direct return when "back" was used in preview step — avoids nested calls
function runWizardFinish(state: WizardState): WizardState {
  return state;
}

// ── Utility: guess bundle key from a detected profile name ──

function detectBundleFromProfile(profileName: string): string | undefined {
  // Exact profile match
  for (const [key, def] of Object.entries(BUNDLE_DEFINITIONS)) {
    if (def.profile === profileName) return key;
  }
  // Fuzzy match on profile name segments
  if (profileName.includes("web"))                                              return "web-frontend";
  if (profileName.includes("ios"))                                              return "ios-developer";
  if (profileName.includes("android"))                                          return "android-developer";
  if (profileName.includes("backend") || profileName.includes("api"))          return "backend-api";
  if (profileName.includes("design") || profileName.includes("ui-lib"))        return "designer";
  if (profileName.includes("kit") || profileName.includes("author"))           return "kit-author";
  if (profileName.includes("a11y") || profileName.includes("accessibility"))   return "a11y-specialist";
  return undefined;
}
