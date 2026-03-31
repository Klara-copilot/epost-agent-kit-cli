/**
 * Command: epost-kit dry-run "<prompt>"
 * Simulate routing for a natural language prompt against the installed CLAUDE.md.
 */

import { resolve } from 'node:path';
import pc from 'picocolors';
import { keyValue, box } from '@/domains/ui/index.js';
import { routePrompt } from '@/domains/routing/routing-parser.js';
import type { GlobalOptions } from '@/types/commands.js';

export interface DryRunCommandOptions extends GlobalOptions {
  dir?: string;
  json?: boolean;
}

export async function runDryRunCommand(
  prompt: string | undefined,
  opts: DryRunCommandOptions,
): Promise<void> {
  if (!prompt || prompt.trim() === '') {
    console.error(pc.red('Usage: epost-kit dry-run "<prompt>"'));
    console.error('Example: epost-kit dry-run "build login page"');
    process.exit(1);
  }

  const cwd = opts.dir ? resolve(opts.dir) : resolve(process.cwd());

  const result = await routePrompt(prompt, cwd);

  if (!result) {
    const msg = 'No installed CLAUDE.md found. Run `epost-kit install` first.';
    if (opts.json) {
      console.log(JSON.stringify({ error: msg }, null, 2));
    } else {
      console.error(pc.red(msg));
    }
    process.exit(1);
  }

  const { match } = result;

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          input: prompt,
          intent: match.intent,
          routingRule: match.ruleIndex,
          skill: match.skill,
          agent: match.agent,
          routesTo: match.row.routesTo,
          score: match.score,
          result: 'dry-run success',
        },
        null,
        2,
      ),
    );
    return;
  }

  const pairs: Array<[string, string]> = [
    ['Input', pc.white(prompt)],
    ['Intent', pc.cyan(match.intent)],
    ['Routing rule', pc.dim(`#${match.ruleIndex}`)],
    ['Skill', match.skill ? pc.green(match.skill) : pc.dim('(none)')],
    ['Agent', match.agent ? pc.blue(match.agent) : pc.dim('(none)')],
    ['Result', pc.green('dry-run success')],
  ];

  console.log('');
  console.log(box(keyValue(pairs), { title: 'Routing Simulation' }));
  console.log('');
}
