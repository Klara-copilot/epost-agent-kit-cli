/**
 * Central UI utility module for terminal display
 * All functions return strings. Callers decide when to print.
 * Respects NO_COLOR, TERM=dumb for ASCII fallback.
 */

import pc from "picocolors";
import Table from "cli-table3";
import { LOGO, LOGO_PLAIN, VERSION, TAGLINE } from "@/domains/help/branding.js";

// ── Environment detection ──

const noColor =
  process.env.NO_COLOR !== undefined || process.env.TERM === "dumb";

const isCI =
  process.env.CI !== undefined ||
  process.env.GITHUB_ACTIONS !== undefined ||
  process.env.JENKINS_URL !== undefined ||
  process.env.BUILDKITE !== undefined;

export function termWidth(): number {
  return process.stdout.columns || 80;
}

// ── Branding ──

export function banner(): string {
  if (noColor || isCI) {
    return `\n  ${LOGO_PLAIN}\n  ${TAGLINE}\n`;
  }
  return `${pc.bold(LOGO)}\n\n  ${pc.cyan(`epost-kit`)} ${pc.dim(`v${VERSION}`)}\n  ${pc.dim(TAGLINE)}\n`;
}

// ── Layout primitives ──

export interface BoxOptions {
  title?: string;
  padding?: number;
  width?: number;
}

export function box(content: string, opts: BoxOptions = {}): string {
  const lines = content.split("\n");
  const pad = opts.padding ?? 1;
  const maxLineLen = Math.max(...lines.map((l) => stripAnsi(l).length));
  const innerWidth = opts.width
    ? opts.width - 2
    : Math.max(maxLineLen + pad * 2, 40);

  const tl = noColor ? "+" : "┌";
  const tr = noColor ? "+" : "┐";
  const bl = noColor ? "+" : "└";
  const br = noColor ? "+" : "┘";
  const h = noColor ? "-" : "─";
  const v = noColor ? "|" : "│";

  let topLine: string;
  if (opts.title) {
    const titleStr = noColor ? ` ${opts.title} ` : ` ${opts.title} `;
    topLine = `${tl}${h}${titleStr}${h.repeat(Math.max(0, innerWidth - stripAnsi(titleStr).length - 1))}${tr}`;
  } else {
    topLine = `${tl}${h.repeat(innerWidth)}${tr}`;
  }

  const bottomLine = `${bl}${h.repeat(innerWidth)}${br}`;
  const emptyLine = `${v}${" ".repeat(innerWidth)}${v}`;

  const paddedLines = lines.map((line) => {
    const stripped = stripAnsi(line);
    const rightPad = Math.max(0, innerWidth - pad - stripped.length - pad);
    return `${v}${" ".repeat(pad)}${line}${" ".repeat(rightPad + pad)}${v}`;
  });

  const result: string[] = [topLine];
  if (pad > 0) result.push(emptyLine);
  result.push(...paddedLines);
  if (pad > 0) result.push(emptyLine);
  result.push(bottomLine);

  return result.join("\n");
}

export function divider(char?: string, width?: number): string {
  const c = char ?? (noColor ? "-" : "─");
  const w = width ?? Math.min(termWidth(), 50);
  return c.repeat(w);
}

export function heading(text: string): string {
  const line = divider(undefined, Math.max(stripAnsi(text).length + 4, 40));
  return noColor ? `\n  ${text}\n  ${line}` : `\n  ${pc.bold(text)}\n  ${line}`;
}

export function subheading(text: string): string {
  return noColor ? `  ${text}` : `  ${pc.dim(text)}`;
}

// ── Progress ──

export function stepHeader(
  current: number,
  total: number,
  label: string,
): string {
  const tag = `[${current}/${total}]`;
  return noColor
    ? `\n  ${tag} ${label}`
    : `\n  ${pc.cyan(pc.bold(tag))} ${pc.bold(label)}`;
}

// ── Data display ──

export function keyValue(
  pairs: Array<[string, string]>,
  opts: { indent?: number } = {},
): string {
  const indent = " ".repeat(opts.indent ?? 2);
  const maxKeyLen = Math.max(...pairs.map(([k]) => k.length));
  return pairs
    .map(([key, value]) => {
      const paddedKey = key.padEnd(maxKeyLen + 2);
      return noColor
        ? `${indent}${paddedKey}${value}`
        : `${indent}${pc.dim(paddedKey)}${value}`;
    })
    .join("\n");
}

export function table(
  headers: string[],
  rows: string[][],
  opts: { compact?: boolean } = {},
): string {
  const tbl = new Table({
    head: noColor ? headers : headers.map((h) => pc.bold(h)),
    style: {
      head: [],
      border: [],
      "padding-left": 1,
      "padding-right": 1,
    },
    chars: noColor
      ? {
          top: "-",
          "top-mid": "+",
          "top-left": "+",
          "top-right": "+",
          bottom: "-",
          "bottom-mid": "+",
          "bottom-left": "+",
          "bottom-right": "+",
          left: "|",
          "left-mid": "+",
          mid: "-",
          "mid-mid": "+",
          right: "|",
          "right-mid": "+",
          middle: "|",
        }
      : opts.compact
        ? {
            top: "",
            "top-mid": "",
            "top-left": "",
            "top-right": "",
            bottom: "",
            "bottom-mid": "",
            "bottom-left": "",
            "bottom-right": "",
            left: "",
            "left-mid": "",
            mid: "",
            "mid-mid": "",
            right: "",
            "right-mid": "",
            middle: "  ",
          }
        : undefined,
  });

  for (const row of rows) {
    tbl.push(row);
  }

  return tbl.toString();
}

// ── Tree ──

export interface TreeNode {
  label: string;
  badge?: string;
  children?: TreeNode[];
}

export function tree(nodes: TreeNode[], prefix = ""): string {
  const lines: string[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const connector = noColor
      ? isLast
        ? "`-- "
        : "|-- "
      : isLast
        ? "└── "
        : "├── ";
    const childPrefix = noColor
      ? isLast
        ? "    "
        : "|   "
      : isLast
        ? "    "
        : "│   ";

    const badgeStr = node.badge
      ? noColor
        ? ` ${node.badge}`
        : ` ${pc.dim(node.badge)}`
      : "";
    lines.push(`${prefix}${connector}${node.label}${badgeStr}`);

    if (node.children && node.children.length > 0) {
      lines.push(tree(node.children, `${prefix}${childPrefix}`));
    }
  }

  return lines.join("\n");
}

// ── Badges ──

export type BadgeVariant = "info" | "success" | "warn" | "error" | "dim";

export function badge(label: string, variant: BadgeVariant): string {
  const tag = `[${label}]`;
  if (noColor) return tag;

  switch (variant) {
    case "success":
      return pc.green(tag);
    case "warn":
      return pc.yellow(tag);
    case "error":
      return pc.red(tag);
    case "info":
      return pc.blue(tag);
    case "dim":
      return pc.dim(tag);
  }
}

// ── Package display ──

export interface PackageManifestSummary {
  name: string;
  description?: string;
  layer: number;
  agents: number;
  skills: number;
  commands: number;
  platforms?: string[];
  dependencies?: string[];
  installed?: boolean;
}

export function packageTable(manifests: PackageManifestSummary[]): string {
  const headers = ["Package", "Layer", "Agents", "Skills", "Cmds"];
  const rows = manifests.map((m) => [
    m.name,
    `${m.layer}`,
    `${m.agents}`,
    `${m.skills}`,
    `${m.commands}`,
  ]);
  return table(headers, rows);
}

export function layerDiagram(
  manifests: PackageManifestSummary[],
  selected?: Set<string>,
): string {
  const byLayer = new Map<number, PackageManifestSummary[]>();
  for (const m of manifests) {
    if (!byLayer.has(m.layer)) byLayer.set(m.layer, []);
    byLayer.get(m.layer)!.push(m);
  }

  const layerNames: Record<number, string> = {
    0: "Foundation",
    1: "Platforms",
    2: "Domain & Specialty",
  };

  const lines: string[] = [];

  for (const [layer, pkgs] of [...byLayer.entries()].sort(
    ([a], [b]) => a - b,
  )) {
    const name = layerNames[layer] ?? `Layer ${layer}`;
    lines.push(
      noColor
        ? `\n  Layer ${layer} -- ${name}`
        : `\n  ${pc.bold(`Layer ${layer}`)} ${pc.dim(`— ${name}`)}`,
    );

    for (const pkg of pkgs) {
      const isInstalled = pkg.installed || (selected && selected.has(pkg.name));
      const marker = isInstalled
        ? noColor
          ? "[*]"
          : pc.green("[*]")
        : noColor
          ? "[ ]"
          : pc.dim("[ ]");
      const dots = ".".repeat(Math.max(1, 24 - pkg.name.length));
      const counts = `${pkg.agents}A ${pkg.skills}S ${pkg.commands}C`;
      lines.push(
        noColor
          ? `    ${marker} ${pkg.name} ${dots} ${counts}`
          : `    ${marker} ${pkg.name} ${pc.dim(dots)} ${counts}`,
      );
    }
  }

  if (selected || manifests.some((m) => m.installed)) {
    lines.push(
      noColor ? "\n  [*] = installed" : `\n  ${pc.dim("[*] = installed")}`,
    );
  }

  return lines.join("\n");
}

// ── Post-install ──

export function nextSteps(
  commands: Array<{ cmd: string; desc: string }>,
): string {
  const maxCmdLen = Math.max(...commands.map((c) => c.cmd.length));
  const lines = commands.map((c) => {
    const paddedCmd = c.cmd.padEnd(maxCmdLen + 2);
    return noColor
      ? `  ${paddedCmd}${c.desc}`
      : `  ${pc.cyan(paddedCmd)}${c.desc}`;
  });
  return box(lines.join("\n"), { title: "What's Next?" });
}

// ── Doctor display ──

export type CheckStatus = "pass" | "warn" | "fail";

export function checkResult(status: CheckStatus, message: string): string {
  const tags: Record<CheckStatus, string> = noColor
    ? { pass: "[PASS]", warn: "[WARN]", fail: "[FAIL]" }
    : {
        pass: pc.green("[PASS]"),
        warn: pc.yellow("[WARN]"),
        fail: pc.red("[FAIL]"),
      };
  return `  ${tags[status]} ${message}`;
}

export function checkSummary(
  passed: number,
  warned: number,
  failed: number,
): string {
  const parts: string[] = [];
  parts.push(noColor ? `${passed} passed` : pc.green(`${passed} passed`));
  parts.push(
    noColor
      ? `${warned} warning${warned !== 1 ? "s" : ""}`
      : pc.yellow(`${warned} warning${warned !== 1 ? "s" : ""}`),
  );
  parts.push(
    noColor
      ? `${failed} failure${failed !== 1 ? "s" : ""}`
      : pc.red(`${failed} failure${failed !== 1 ? "s" : ""}`),
  );
  return box(parts.join("   "), { title: "Summary" });
}

// ── Utilities ──

export function indent(text: string, spaces = 2): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

export { noColor, isCI, stripAnsi };
