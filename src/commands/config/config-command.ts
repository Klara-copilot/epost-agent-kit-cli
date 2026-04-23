/**
 * Config command orchestrator — thin namespace for future use
 * All logic lives in phase handlers
 */

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
