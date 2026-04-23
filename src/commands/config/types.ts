/**
 * Config command types — re-exports from central type definitions
 * plus handler-specific option extensions
 */

export type {
  ConfigOptions,
  ConfigGetOptions,
  ConfigSetOptions,
  ConfigIgnoreAddOptions,
  ConfigIgnoreRemoveOptions,
  ConfigUIOptions,
} from '@/types/commands.js';

import type { ConfigOptions } from '@/types/commands.js';

/** Extended options with scope flags (used by show/get/set handlers) */
export interface ConfigCommandOptions extends ConfigOptions {
  global?: boolean;
  local?: boolean;
  sources?: boolean;
}
