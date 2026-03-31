/**
 * EpostConfig — per-project installed state schema
 * Written to .epost.json at project root after epost-kit init/add.
 */

import { z } from 'zod';

export const EpostConfigSchema = z.object({
  version: z.literal('1'),
  /** e.g. "epost-kit@2.1.0" */
  installer: z.string(),
  /** Kit release all installed skills are pinned to */
  kitVersion: z.string(),
  /** Active role bundle name, null when individual skills were picked */
  role: z.string().nullable().optional(),
  /** Installed skill names (resolved, ordered) */
  skills: z.array(z.string()),
  /** Installed agent names */
  agents: z.array(z.string()),
  updatesMode: z.enum(['interactive', 'auto', 'manual']).default('interactive'),
  /** ISO date of last install/update */
  lastUpdated: z.string(),
  /** Skill names that are installed but temporarily disabled */
  disabledSkills: z.array(z.string()).optional(),
  /** Hook names that are installed but temporarily disabled */
  disabledHooks: z.array(z.string()).optional(),
});

export type EpostProjectConfig = z.infer<typeof EpostConfigSchema>;

/** Filename written at project root */
export const EPOST_CONFIG_FILE = '.epost.json';
