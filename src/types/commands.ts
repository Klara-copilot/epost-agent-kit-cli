/**
 * Command-specific option types for Commander.js
 */

export interface GlobalOptions {
  verbose?: boolean;
  yes?: boolean;
}

export interface NewOptions extends GlobalOptions {
  kit?: string;
  dir?: string;
}

export interface InitOptions extends GlobalOptions {
  profile?: string;
  packages?: string;
  optional?: string;
  exclude?: string;
  fresh?: boolean;
  dryRun?: boolean;
  dir?: string;
  forceDownload?: boolean; // Skip cache, always download fresh release
  target?: "claude" | "cursor" | "vscode"; // IDE target override
  source?: string | boolean; // Use source repo for package resolution (local dev mode); string = explicit path
}

export interface DoctorOptions extends GlobalOptions {
  fix?: boolean;
  report?: boolean;
}

export interface VersionsOptions extends GlobalOptions {
  limit?: number;
  pre?: boolean;
}

export interface UpdateOptions extends GlobalOptions {
  check?: boolean;
  dir?: string;
  source?: string | boolean;
  forceDownload?: boolean;
}

export interface UninstallOptions extends GlobalOptions {
  keepCustom?: boolean;
  force?: boolean;
  dryRun?: boolean;
  dir?: string;
}

export interface ProfileListOptions extends GlobalOptions {
  team?: string;
}

export interface ProfileShowOptions extends GlobalOptions {
  name: string;
}

export interface PackageListOptions extends GlobalOptions {}

export interface PackageAddOptions extends GlobalOptions {
  name: string;
}

export interface PackageRemoveOptions extends GlobalOptions {
  name: string;
  force?: boolean;
}

export interface OnboardOptions extends GlobalOptions {
  dir?: string;
}

export interface WorkspaceInitOptions extends GlobalOptions {
  dir?: string;
}

export interface DevWatcherOptions extends GlobalOptions {
  target?: string;
  profile?: string;
  force?: boolean;
  source?: string; // Local kit source path (default: ../epost_agent_kit)
}

export interface ConfigOptions extends GlobalOptions {
  dir?: string;
  json?: boolean;
}

export interface ConfigGetOptions extends ConfigOptions {
  key: string;
}

export interface ConfigSetOptions extends ConfigOptions {
  key: string;
  value: string;
}

export interface ConfigIgnoreAddOptions extends ConfigOptions {
  pattern: string;
}

export interface ConfigIgnoreRemoveOptions extends ConfigOptions {
  pattern: string;
}

export interface ConvertOptions extends GlobalOptions {
  output?: string; // Output directory (default: .github)
  packages?: string; // Comma-separated package names
  profile?: string; // Profile filter
  dryRun?: boolean; // Preview only, no files written
  source?: boolean; // Use source repo (dev mode)
}
