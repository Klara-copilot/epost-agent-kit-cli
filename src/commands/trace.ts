/**
 * Command: epost-kit trace "<prompt>"
 * Shows full orchestration path for a natural language prompt.
 * Verbose version of dry-run with routing decision steps.
 */

import { resolve } from 'node:path';
import pc from 'picocolors';
import { keyValue, box, divider } from '@/domains/ui/index.js';
import { parseRoutingTable, matchPrompt } from '@/domains/routing/routing-parser.js';
import type { GlobalOptions } from '@/types/commands.js';

export interface TraceOptions extends GlobalOptions {
  dir?: string;
  json?: boolean;
}

interface TraceStep {
  step: number;
  label: string;
  detail: string;
  outcome: string;
}

export async function runTrace(
  prompt: string | undefined,
  opts: TraceOptions,
): Promise<void> {
  if (!prompt || prompt.trim() === '') {
    console.error(pc.red('Usage: epost-kit trace "<prompt>"'));
    console.error('Example: epost-kit trace "commit and push"');
    process.exit(1);
  }

  const cwd = opts.dir ? resolve(opts.dir) : resolve(process.cwd());

  // Step 1: Locate CLAUDE.md
  const parsed = await parseRoutingTable(cwd);

  if (!parsed) {
    const msg = 'No installed CLAUDE.md found. Run `epost-kit install` first.';
    if (opts.json) {
      console.log(JSON.stringify({ error: msg }, null, 2));
    } else {
      console.error(pc.red(msg));
    }
    process.exit(1);
  }

  // Step 2: Extract routing table
  const { rows, sourceFile } = parsed;

  // Step 3: Score all rows
  const scores = rows.map((row, i) => {
    const promptLower = prompt.toLowerCase();
    const promptWords = promptLower.split(/\s+/).filter(Boolean);
    const examples = row.examples.toLowerCase();
    let score = 0;
    const matchedWords: string[] = [];
    for (const word of promptWords) {
      if (examples.includes(word)) {
        score += 1;
        matchedWords.push(word);
      }
    }
    return { row, index: i + 1, score, matchedWords };
  });

  // Step 4: Find best match
  const match = matchPrompt(prompt, rows);

  const steps: TraceStep[] = [
    {
      step: 1,
      label: 'Locate CLAUDE.md',
      detail: sourceFile,
      outcome: `Found — ${rows.length} routing rules`,
    },
    {
      step: 2,
      label: 'Extract Intent Map',
      detail: `Parsed markdown table`,
      outcome: `${rows.length} intents loaded`,
    },
    {
      step: 3,
      label: 'Tokenize prompt',
      detail: `"${prompt}"`,
      outcome: `${prompt.split(/\s+/).filter(Boolean).length} tokens`,
    },
    {
      step: 4,
      label: 'Score each intent',
      detail: scores
        .filter((s) => s.score > 0)
        .map((s) => `${s.row.intent}(${s.score})`)
        .join(', ') || 'No keyword matches — using first row as fallback',
      outcome: `Best: ${match?.intent ?? 'none'} (score ${match?.score ?? 0})`,
    },
    {
      step: 5,
      label: 'Select routing rule',
      detail: match ? `Rule #${match.ruleIndex}: ${match.row.routesTo}` : 'No match',
      outcome: match ? 'Matched' : 'Fallback applied',
    },
    {
      step: 6,
      label: 'Extract agent/skill',
      detail: [
        match?.agent ? `agent: ${match.agent}` : null,
        match?.skill ? `skill: ${match.skill}` : null,
      ]
        .filter(Boolean)
        .join(', ') || '(none extracted)',
      outcome: 'Dispatch target resolved',
    },
  ];

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          input: prompt,
          sourceFile,
          steps: steps.map((s) => ({
            step: s.step,
            label: s.label,
            detail: s.detail,
            outcome: s.outcome,
          })),
          result: {
            intent: match?.intent,
            routingRule: match?.ruleIndex,
            skill: match?.skill,
            agent: match?.agent,
            routesTo: match?.row.routesTo,
            score: match?.score,
          },
          allScores: scores.map((s) => ({
            intent: s.row.intent,
            score: s.score,
            matchedWords: s.matchedWords,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log('');
  console.log(pc.bold(`  Routing trace for: ${pc.cyan(`"${prompt}"`)}`));
  console.log(`  ${pc.dim(divider())}`);
  console.log('');

  for (const s of steps) {
    const stepTag = pc.dim(`[${s.step}/${steps.length}]`);
    const label = pc.bold(s.label);
    console.log(`  ${stepTag} ${label}`);
    console.log(`      ${pc.dim('detail:')}  ${s.detail}`);
    console.log(`      ${pc.dim('outcome:')} ${pc.green(s.outcome)}`);
    console.log('');
  }

  console.log(`  ${pc.dim(divider())}`);
  console.log('');

  if (match) {
    const pairs: Array<[string, string]> = [
      ['Intent', pc.cyan(match.intent)],
      ['Routing rule', pc.dim(`#${match.ruleIndex}`)],
      ['Skill', match.skill ? pc.green(match.skill) : pc.dim('(none)')],
      ['Agent', match.agent ? pc.blue(match.agent) : pc.dim('(none)')],
      ['Routes to', pc.white(match.row.routesTo)],
    ];
    console.log(box(keyValue(pairs), { title: 'Result' }));
  }

  console.log('');
}
