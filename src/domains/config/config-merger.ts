/**
 * 3-level config merger with leaf-level source tracking
 * Merge order: code defaults -> global -> project (project wins)
 */

import { safeDeepMerge } from './config-security.js';

export interface MergedConfig {
  merged: Record<string, any>;
  sources: Record<string, 'default' | 'global' | 'project'>;
}

/** Code-level defaults when no config file provides a value */
const DEFAULTS: Record<string, any> = {
  skills: { research: { engine: 'websearch' } },
  statusline: 'full',
  codingLevel: -1,
};

type SourceLabel = 'default' | 'global' | 'project';

/**
 * Recursively walk an object, building a dot-notation source map.
 * For each leaf key, checks project -> global -> default to determine source.
 */
function buildSourceMap(
  defaults: Record<string, any>,
  global: Record<string, any>,
  project: Record<string, any>,
  prefix = '',
): Record<string, SourceLabel> {
  const sources: Record<string, SourceLabel> = {};

  // Collect all keys across all three layers at this level
  const allKeys = new Set([
    ...Object.keys(defaults),
    ...Object.keys(global),
    ...Object.keys(project),
  ]);

  for (const key of allKeys) {
    const dotKey = prefix ? `${prefix}.${key}` : key;
    const defVal = defaults[key];
    const globVal = global[key];
    const projVal = project[key];

    const isObj = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v);

    if (isObj(defVal) || isObj(globVal) || isObj(projVal)) {
      // Recurse into nested objects
      const childDefaults = isObj(defVal) ? defVal : {};
      const childGlobal = isObj(globVal) ? globVal : {};
      const childProject = isObj(projVal) ? projVal : {};
      const childSources = buildSourceMap(childDefaults, childGlobal, childProject, dotKey);
      Object.assign(sources, childSources);
    } else {
      // Leaf value — project wins over global wins over default
      if (projVal !== undefined) {
        sources[dotKey] = 'project';
      } else if (globVal !== undefined) {
        sources[dotKey] = 'global';
      } else {
        sources[dotKey] = 'default';
      }
    }
  }

  return sources;
}

/**
 * Merge three config layers with source tracking.
 * Result.merged has the fully resolved config.
 * Result.sources maps each dot-notation leaf key to its origin layer.
 */
export class ConfigMerger {
  static mergeWithSources(
    defaults: Record<string, any>,
    global: Record<string, any>,
    project: Record<string, any>,
  ): MergedConfig {
    const intermediate = safeDeepMerge(defaults, global);
    const merged = safeDeepMerge(intermediate, project);
    const sources = buildSourceMap(defaults, global, project);
    return { merged, sources };
  }

  /** Get the built-in code-level defaults */
  static getDefaults(): Record<string, any> {
    return { ...DEFAULTS };
  }
}
