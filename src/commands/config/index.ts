/**
 * Config command barrel — re-exports all handlers with backward-compatible names
 * Import path `./commands/config.js` resolves here
 */

// New names (internal use)
export { runGet } from './phases/get-handler.js';
export { runSet } from './phases/set-handler.js';
export { runShow } from './phases/show-handler.js';
export { runReset } from './phases/reset-handler.js';
export {
  runConfigIgnore,
  runConfigIgnoreAdd,
  runConfigIgnoreRemove,
} from './phases/ignore-handler.js';
export { runConfigInteractive } from './phases/tui-handler.js';

// Backward-compatible aliases (matching original config.ts exports)
export { runShow as runConfigShow } from './phases/show-handler.js';
export { runGet as runConfigGet } from './phases/get-handler.js';
export { runSet as runConfigSet } from './phases/set-handler.js';
export { runReset as runConfigReset } from './phases/reset-handler.js';

// Phase 5: Web dashboard (lazy-loaded — Express not in main CLI bundle)
export { runConfigUI } from './config-ui-command.js';

// Re-export types for convenience
export type {
  ConfigOptions,
  ConfigGetOptions,
  ConfigSetOptions,
  ConfigIgnoreAddOptions,
  ConfigIgnoreRemoveOptions,
  ConfigUIOptions,
} from './types.js';
