/**
 * Dependency resolver for epost-kit skills.
 * Resolves extends/requires chains from skill-index.json.
 */

export { resolveDependencies } from './resolver.js';
export { PROFILE_ALIASES, resolveProfileAlias } from './profile-aliases.js';
export { loadBundles, mergeRoleBundle, getAllSkillsForRole, getAllAgentsForRole, SHARED_SKILLS, SHARED_AGENTS } from './bundles.js';
export { findSkillSource, findAgentSource } from './skill-locator.js';
export type { SkillEntry, ResolvedResult } from './resolver.js';
export type { RoleBundle, BundlesFile } from './bundles.js';
