/**
 * Command: epost-kit config ui
 * Launches the config dashboard web server
 */

import type { ConfigUIOptions } from '@/types/commands.js';
import { resolveInstallDir } from './phases/shared.js';

/**
 * Launch the config dashboard web server.
 * Dynamic import ensures Express is NOT bundled into the main CLI.
 */
export async function runConfigUI(opts: ConfigUIOptions): Promise<void> {
  const { installDir } = await resolveInstallDir(opts.dir);

  // Dynamic import — Express only loaded when this command runs
  const { startServer } = await import('../../domains/web-dashboard/server.js');

  await startServer({
    port: opts.port,
    host: opts.host,
    noOpen: opts.noOpen,
    installDir,
  });
}
