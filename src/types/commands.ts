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
  preview?: boolean; // Alias for dryRun — show file list before writing
  dir?: string;
  forceDownload?: boolean; // Skip cache, always download fresh release
  target?: "claude" | "cursor" | "vscode" | "export"; // IDE target override
  source?: string | boolean; // Use source repo for package resolution (local dev mode); string = explicit path
  full?: boolean; // Non-interactive: install full kit (equiv. --profile full)
  bundle?: string; // Non-interactive: install bundle by key (web, ios-developer, etc.)
  skill?: string; // Non-interactive: install single skill
}

export interface DoctorOptions extends GlobalOptions {
  fix?: boolean;
  report?: boolean;
  dir?: string;
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
  json?: boolean;
  dryRun?: boolean;
  preview?: boolean;
  fresh?: boolean;
}

export interface UninstallOptions extends GlobalOptions {
  keepCustom?: boolean;
  force?: boolean;
  dryRun?: boolean;
  dir?: string;
  json?: boolean;
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
  global?: boolean;
  local?: boolean;
  sources?: boolean;
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
  output?: string;   // Output directory (default: .github)
  packages?: string; // Comma-separated package names
  profile?: string;  // Profile filter
  dryRun?: boolean;  // Preview only, no files written
  source?: boolean;  // Use source repo (dev mode)
  target?: "vscode" | "cursor" | "jetbrains"; // IDE target (default: vscode)
}

export interface RolesOptions extends GlobalOptions {
  json?: boolean;
}

export interface AddOptions extends GlobalOptions {
  role?: string;
  dir?: string;
  dryRun?: boolean;
  json?: boolean;
}

export interface RemoveOptions extends GlobalOptions {
  role?: string;
  dir?: string;
  force?: boolean;
  dryRun?: boolean;
  json?: boolean;
}

export interface DryRunCommandOptions extends GlobalOptions {
  dir?: string;
  json?: boolean;
}

export interface TraceOptions extends GlobalOptions {
  dir?: string;
  json?: boolean;
}

export interface ShowOptions extends GlobalOptions {
  dir?: string;
  json?: boolean;
}

export interface ListOptions extends GlobalOptions {
  dir?: string;
  json?: boolean;
}

export interface BrowseOptions extends GlobalOptions {
  dir?: string;
}

export interface ValidateOptions extends GlobalOptions {
  dir?: string;
  json?: boolean;
}

export interface StatusOptions extends GlobalOptions {
  dir?: string;
  json?: boolean;
}

export interface EnableDisableOptions extends GlobalOptions {
  dir?: string;
  json?: boolean;
}

export interface RepairOptions extends GlobalOptions {
  dir?: string;
  json?: boolean;
}

export interface UpgradeOptions extends GlobalOptions {
  check?: boolean;
  noCache?: boolean;
  dir?: string;
  json?: boolean;
}

export interface ConfigUIOptions extends GlobalOptions {
  port?: number;
  host?: string;
  noOpen?: boolean;
  dir?: string;
}
