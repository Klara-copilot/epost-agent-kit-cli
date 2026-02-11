// Package and profile types (stub - to be populated from package-resolver.ts)
export interface PackageManifest {
  name: string;
  version: string;
  dependencies?: string[];
}

export interface ProfileDefinition {
  name: string;
  packages: string[];
}
