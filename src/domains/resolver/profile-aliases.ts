/**
 * Profile compatibility aliases.
 * Maps legacy --profile values to new role bundle names.
 * Consumers should emit a deprecation warning when these are used.
 */

export const PROFILE_ALIASES: Record<string, string[]> = {
  full: ['web-fullstack', 'designer', 'ios-developer', 'android-developer', 'a11y-specialist', 'kit-author'],
  web: ['web-fullstack'],
  ios: ['ios-developer'],
  android: ['android-developer'],
  backend: ['web-backend'],
  'design-system': ['designer'],
};

/**
 * Resolve a legacy profile name to role bundle names.
 * Returns null if the name is not a known alias (may be a new role name already).
 */
export function resolveProfileAlias(profile: string): { roles: string[]; deprecated: boolean } | null {
  const roles = PROFILE_ALIASES[profile];
  if (!roles) return null;
  return { roles, deprecated: true };
}
