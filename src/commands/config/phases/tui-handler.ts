/**
 * Config TUI handler — interactive menu for viewing and editing .epost-kit.json
 * Migrated from original config.ts runConfigInteractive
 */

import { join } from 'node:path';
import { writeFile, readFile } from 'node:fs/promises';
import pc from 'picocolors';
import { setByPath } from '@/domains/config/config-path-utils.js';
import {
  resolveInstallDir,
  readCurrentKitConfig,
  writeKitConfig,
  getPath,
} from './shared.js';
import type { ConfigOptions } from '../types.js';

// ── .env helpers (only used by TUI) ──────────────────────────────────────────

/** Read a single key from <installDir>/.env (returns undefined if missing) */
async function readEnvKey(installDir: string, key: string): Promise<string | undefined> {
  try {
    const content = await readFile(join(installDir, '.env'), 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const eq = trimmed.indexOf('=');
      if (trimmed.slice(0, eq).trim() === key) {
        return trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch { /* file doesn't exist */ }
  return undefined;
}

/** Write or update a single key in <installDir>/.env */
async function writeEnvKey(installDir: string, key: string, value: string): Promise<void> {
  const envPath = join(installDir, '.env');
  let content = '';
  try { content = await readFile(envPath, 'utf-8'); } catch { /* new file */ }

  const lines = content.split('\n');
  const idx = lines.findIndex((l) => {
    const t = l.trim();
    return !t.startsWith('#') && t.startsWith(`${key}=`);
  });

  const newLine = `${key}=${value}`;
  if (idx !== -1) {
    lines[idx] = newLine;
  } else {
    if (content && !content.endsWith('\n')) lines.push('');
    lines.push(newLine);
  }
  await writeFile(envPath, lines.join('\n'), 'utf-8');
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Known Gemini models for the select prompt */
const GEMINI_MODELS = [
  { name: 'gemini-2.5-flash-preview-04-17  — fast, general research  (default)', value: 'gemini-2.5-flash-preview-04-17' },
  { name: 'gemini-2.5-pro-preview          — deep analysis, slower', value: 'gemini-2.5-pro-preview' },
  { name: 'Enter model ID manually →', value: '__manual__' },
];

// ── Interactive config TUI ───────────────────────────────────────────────────

/** epost-kit config (bare) — interactive menu to view and edit .epost-kit.json */
export async function runConfigInteractive(opts: ConfigOptions): Promise<void> {
  const { installDir } = await resolveInstallDir(opts.dir);
  const { select, input, password, checkbox, Separator } = await import('@inquirer/prompts');

  const dim = (s: string) => pc.dim(`[${s}]`);

  // ── Advanced submenu: Plan naming settings ────────────────────────────────
  async function runPlanMenu(): Promise<boolean> {
    let changed = false;
    while (true) {
      const config = await readCurrentKitConfig(installDir);
      const namingFormat: string = getPath(config, 'plan.namingFormat', '{date}-{slug}');
      const dateFormat: string = getPath(config, 'plan.dateFormat', 'YYMMDD-HHmm');
      const issuePrefix: string | null = getPath(config, 'plan.issuePrefix', null);

      const choice = await select({
        message: 'Plan settings  (select ← Back to return)',
        pageSize: 8,
        choices: [
          new Separator('── Plan naming'),
          { name: `Naming format          ${dim(namingFormat)}`, value: 'plan.namingFormat' },
          { name: `Date format            ${dim(dateFormat)}`, value: 'plan.dateFormat' },
          { name: `Issue prefix           ${dim(issuePrefix ?? 'none')}`, value: 'plan.issuePrefix' },
          new Separator(),
          { name: pc.dim('← Back'), value: '__back__' },
        ],
      }).catch(() => '__back__');

      if (choice === '__back__') break;

      let updated = false;
      if (choice === 'plan.namingFormat') {
        const val = await input({
          message: 'Plan directory name pattern  (tokens: {date} {slug} {issue})',
          default: namingFormat,
        });
        setByPath(config, 'plan.namingFormat', val.trim());
        updated = true;
      } else if (choice === 'plan.dateFormat') {
        const val = await input({
          message: 'Date format for {date} token  (dayjs — e.g. YYMMDD-HHmm → 260307-1530)',
          default: dateFormat,
        });
        setByPath(config, 'plan.dateFormat', val.trim());
        updated = true;
      } else if (choice === 'plan.issuePrefix') {
        const val = await input({
          message: 'Issue tracker prefix for {issue} token  (e.g. PROJ — leave blank to disable)',
          default: issuePrefix ?? '',
        });
        setByPath(config, 'plan.issuePrefix', val.trim() || null);
        updated = true;
      }

      if (updated) {
        await writeKitConfig(installDir, config);
        changed = true;
        console.log(pc.green('✓ Saved\n'));
      }
    }
    return changed;
  }

  // ── Main menu loop ────────────────────────────────────────────────────────
  let hadSaves = false;
  while (true) {
    const config = await readCurrentKitConfig(installDir);

    const engine: string = getPath(config, 'skills.research.engine', 'websearch');
    const statusline: string = getPath(config, 'statusline', 'full');
    const codingLevel: number = getPath(config, 'codingLevel', -1);
    const scoutEnabled: boolean = getPath(config, 'hooks.scout.enabled', true);
    const privacyEnabled: boolean = getPath(config, 'hooks.privacy.enabled', true);
    const packagesGuardEnabled: boolean = getPath(config, 'hooks.packagesGuard.enabled', true);

    const activeCount = [scoutEnabled, privacyEnabled, packagesGuardEnabled].filter(Boolean).length;
    const hooksSummary =
      activeCount === 3 ? pc.green('all active') :
      activeCount === 0 ? pc.red('all off') :
      pc.yellow(`${activeCount}/3 active`);

    const geminiKey = engine === 'gemini' ? await readEnvKey(installDir, 'GEMINI_API_KEY') : undefined;
    const geminiKeyStatus = geminiKey ? pc.green('[set]') : pc.red('[not set]');

    const choice = await select({
      message: 'Configure epost-kit  (↑↓ navigate · Enter select · Ctrl+C exit)',
      pageSize: 14,
      choices: [
        new Separator('── Quick settings'),
        { name: `Research engine        ${dim(engine)}`, value: 'research.engine' },
        ...(engine === 'gemini'
          ? [
              { name: `  Gemini model         ${dim(getPath(config, 'skills.research.gemini.model', ''))}`, value: 'research.gemini.model' },
              { name: `  Gemini API key       ${geminiKeyStatus}`, value: 'research.gemini.apikey' },
            ]
          : []),
        { name: `Coding level           ${dim(codingLevel === -1 ? 'auto' : String(codingLevel))}`, value: 'codingLevel' },
        { name: `Status line            ${dim(statusline)}`, value: 'statusline' },
        new Separator('── Hooks'),
        { name: `Scout · Privacy · Packages guard   ${hooksSummary}`, value: 'hooks' },
        new Separator('── Advanced'),
        { name: `Plan naming & dates    ${pc.dim('→')}`, value: 'advanced' },
        new Separator(),
        { name: pc.dim('Exit'), value: '__exit__' },
      ],
    }).catch(() => '__exit__');

    if (choice === '__exit__') {
      if (!hadSaves) console.log(pc.dim('No changes saved.'));
      break;
    }

    let updated = false;

    if (choice === 'research.engine') {
      const val = await select({
        message: 'Which AI service should agents use for research tasks?',
        choices: [
          { name: 'websearch — Claude\'s built-in web search  (no setup needed)', value: 'websearch' },
          { name: 'gemini    — Google Gemini API  (requires GEMINI_API_KEY)', value: 'gemini' },
        ],
        default: engine,
      });
      setByPath(config, 'skills.research.engine', val);
      updated = true;
    } else if (choice === 'research.gemini.model') {
      const currentModel: string = getPath(config, 'skills.research.gemini.model', 'gemini-2.5-flash-preview-04-17');
      const knownValues = GEMINI_MODELS.map((m) => m.value).filter((v) => v !== '__manual__');
      const defaultModel = knownValues.includes(currentModel) ? currentModel : '__manual__';
      const selected = await select({
        message: 'Which Gemini model should agents use for research?',
        choices: GEMINI_MODELS,
        default: defaultModel,
      });
      if (selected === '__manual__') {
        const val = await input({
          message: 'Enter Gemini model ID',
          default: currentModel,
        });
        setByPath(config, 'skills.research.gemini.model', val.trim());
      } else {
        setByPath(config, 'skills.research.gemini.model', selected);
      }
      updated = true;
    } else if (choice === 'research.gemini.apikey') {
      const existing = await readEnvKey(installDir, 'GEMINI_API_KEY');
      console.log(pc.dim(`  Saved to ${join(installDir, '.env')}  (gitignored)\n`));
      const val = await password({
        message: existing
          ? 'Update GEMINI_API_KEY  (leave blank to keep current)'
          : 'Enter your GEMINI_API_KEY',
        mask: '*',
      });
      if (val.trim()) {
        await writeEnvKey(installDir, 'GEMINI_API_KEY', val.trim());
        hadSaves = true;
        console.log(pc.green('✓ API key saved to .env\n'));
      } else if (!existing) {
        console.log(pc.dim('No key entered — skipped.\n'));
      } else {
        console.log(pc.dim('Unchanged.\n'));
      }
      continue; // writeEnvKey handles saving
    } else if (choice === 'codingLevel') {
      const val = await select({
        message: 'How much explanation should agents include in code responses?',
        choices: [
          { name: 'auto  — detect from project complexity  (recommended)', value: -1 },
          { name: '  0   beginner     — comments, step-by-step explanations', value: 0 },
          { name: '  1   intermediate — balanced detail', value: 1 },
          { name: '  2   advanced     — terse, minimal hand-holding', value: 2 },
        ],
        default: codingLevel,
      });
      setByPath(config, 'codingLevel', val);
      updated = true;
    } else if (choice === 'statusline') {
      const val = await select({
        message: 'What should the status line show at the top of each agent response?',
        choices: [
          { name: 'full     — date, branch, active plan, and all context info', value: 'full' },
          { name: 'compact  — condensed one-line summary', value: 'compact' },
          { name: 'off      — hide the status line entirely', value: 'off' },
        ],
        default: statusline,
      });
      setByPath(config, 'statusline', val);
      updated = true;
    } else if (choice === 'hooks') {
      const selected = await checkbox({
        message: 'Which hooks should be active?',
        choices: [
          {
            name: `Scout          — blocks heavy dirs (node_modules, .git) from LLM context`,
            value: 'scout',
            checked: scoutEnabled,
          },
          {
            name: `Privacy        — scrubs secrets and API keys before sending to LLM`,
            value: 'privacy',
            checked: privacyEnabled,
          },
          {
            name: `Packages guard — protects .claude/ files from being overwritten by tools`,
            value: 'packages',
            checked: packagesGuardEnabled,
          },
        ],
      });
      setByPath(config, 'hooks.scout.enabled', selected.includes('scout'));
      setByPath(config, 'hooks.privacy.enabled', selected.includes('privacy'));
      setByPath(config, 'hooks.packagesGuard.enabled', selected.includes('packages'));
      updated = true;
    } else if (choice === 'advanced') {
      const changed = await runPlanMenu();
      if (changed) hadSaves = true;
      continue; // plan menu saves independently
    }

    if (updated) {
      await writeKitConfig(installDir, config);
      hadSaves = true;
      console.log(pc.green('✓ Saved\n'));
    }
  }
}
