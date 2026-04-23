/**
 * Config reset handler — re-merge .epost-kit.json from installed packages
 */

import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import pc from 'picocolors';
import { readMetadata } from '@/services/file-operations/ownership.js';
import { mergeAndWriteKitConfig } from '@/domains/config/kit-config-merger.js';
import { resolveInstallDir } from './shared.js';
import type { ConfigOptions } from '../types.js';

/** config reset — re-merge from installed packages */
export async function runReset(opts: ConfigOptions): Promise<void> {
  const { projectDir, installDir } = await resolveInstallDir(opts.dir);
  const metadata = await readMetadata(projectDir);

  if (!metadata?.installedPackages || metadata.installedPackages.length === 0) {
    console.error(
      pc.red('No installed packages found in metadata. Run epost-kit init first.'),
    );
    process.exit(1);
  }

  if (!opts.yes) {
    const { confirm } = await import('@inquirer/prompts');
    const proceed = await confirm({
      message: 'Reset .epost-kit.json to package defaults?',
      default: false,
    });
    if (!proceed) {
      console.log('Cancelled');
      return;
    }
  }

  // Resolve packages directory
  const packagesDir = metadata.source
    ? join(resolve(metadata.source), 'packages')
    : join(homedir(), '.epost-kit', 'packages');

  const packages = metadata.installedPackages.map((name) => ({
    name,
    dir: join(packagesDir, name),
  }));

  const { sources } = await mergeAndWriteKitConfig(
    packages,
    join(installDir, '.epost-kit.json'),
  );

  if (sources.length === 0) {
    console.log(pc.yellow('No kit config found in packages'));
  } else {
    console.log(
      `${pc.green('✓')} Kit config reset from ${sources.length} package${sources.length !== 1 ? 's' : ''}`,
    );
  }
}
