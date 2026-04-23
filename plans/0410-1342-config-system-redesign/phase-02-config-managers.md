---
phase: 2
title: "Config Manager Architecture"
effort: 4h
depends: [1]
---

# Phase 2: Config Manager Architecture

## Context Links

- Phase 1: `phase-01-config-security.md` (config-security.ts)
- Existing config loader: `src/domains/config/config-loader.ts`
- Existing merger: `src/domains/config/settings-merger.ts`
- Command types: `src/types/commands.ts`
- Constants: `src/shared/constants.ts`

## Overview

- **Priority**: High — core architecture for dual-layer config
- **Status**: completed
- **Description**: Create static facade classes for global and project config managers, plus 3-level merge with per-field source tracking.

## Key Insights

- Current `config-loader.ts` already has `getGlobalConfigPath()` returning `~/.epost-kit/config.json`
- Static facades = no `new`, just class static methods (like claudekit-cli)
- Project config = existing `.claude/.epost-kit.json` (backward-compatible)
- Global config = new `~/.epost-kit/config.json`
- Merge order: code defaults -> global -> project (project wins)
- Source tracking: each field gets `"default"` | `"global"` | `"project"` label

## Requirements

### Functional
- `GlobalConfigManager`: load/save/get/set for `~/.epost-kit/config.json`
- `ProjectConfigManager`: load/save/get/set for `.claude/.epost-kit.json` (existing file)
- `ConfigMerger.mergeWithSources()`: 3-level merge returning `{ merged, sources }`
- `--global` and `--local` flags on get/set/show
- All writes go through `config-security.ts` (permissions + pollution guard)

### Non-Functional
- Each manager file < 150 lines
- Lazy file creation (dirs/files created on first write, not load)
- All reads validated through existing Zod schemas where applicable
- Backward-compatible: no changes to existing `.epost-kit.json` format

<!-- Updated: Validation Session 1 - leaf-level source tracking confirmed -->

## Architecture

```
src/domains/config/
├── config-security.ts          (Phase 1)
├── global-config-manager.ts    (NEW)
├── project-config-manager.ts   (NEW)
├── config-merger.ts            (NEW)
├── config-loader.ts            (EXISTING - unchanged)
├── kit-config-merger.ts        (EXISTING - unchanged)
└── settings-merger.ts          (EXISTING - unchanged)
```

### GlobalConfigManager (static facade)
```ts
class GlobalConfigManager {
  static load(): Promise<Record<string, any>>
  static save(config: Record<string, any>): Promise<void>
  static get(key: string): Promise<any>
  static set(key: string, value: any): Promise<void>
  static ensureDir(): Promise<void>  // creates ~/.epost-kit/ if missing
  static getPath(): string           // ~/.epost-kit/config.json
}
```

### ProjectConfigManager (static facade)
```ts
class ProjectConfigManager {
  static load(installDir: string): Promise<Record<string, any>>
  static save(installDir: string, config: Record<string, any>): Promise<void>
  static get(installDir: string, key: string): Promise<any>
  static set(installDir: string, key: string, value: any): Promise<void>
  static getPath(installDir: string): string  // installDir/.epost-kit.json
}
```

### ConfigMerger
```ts
interface MergedConfig {
  merged: Record<string, any>;
  sources: Record<string, "default" | "global" | "project">;
}

class ConfigMerger {
  static mergeWithSources(
    defaults: Record<string, any>,
    global: Record<string, any>,
    project: Record<string, any>
  ): MergedConfig
}
```

## Related Code Files

### Modify
- `src/types/commands.ts` — add `global?`, `local?`, `sources?` to ConfigOptions/ConfigGetOptions/ConfigSetOptions; add `ConfigUIOptions` interface

### Create
- `src/domains/config/global-config-manager.ts`
- `src/domains/config/project-config-manager.ts`
- `src/domains/config/config-merger.ts`

## Implementation Steps

1. Update `src/types/commands.ts`:
   - Add `global?: boolean` and `local?: boolean` to `ConfigOptions`
   - Add `sources?: boolean` to `ConfigOptions`
   - Add `ConfigUIOptions` with `port?: number`, `host?: string`, `noOpen?: boolean`, `dir?: string`

2. Create `src/domains/config/global-config-manager.ts`:
   - Import `homedir` from `node:os`, `join` from `node:path`
   - Import `safeReadFile`, `safeWriteFile` from `@/shared/file-system.js`
   - Import `enforceFilePermissions`, `enforceDirPermissions`, `safeDeepMerge` from `./config-security.js`
   - `getPath()`: returns `join(homedir(), '.epost-kit', 'config.json')`
   - `ensureDir()`: `mkdir` with `recursive: true`, then `enforceDirPermissions`
   - `load()`: read file, JSON.parse, return `{}` if missing
   - `save(config)`: `ensureDir()`, JSON.stringify, `safeWriteFile`, `enforceFilePermissions`
   - `get(key)`: load, getByPath (dot-notation)
   - `set(key, value)`: load, setByPath with safeDeepMerge, save

3. Create `src/domains/config/project-config-manager.ts`:
   - Import same utilities
   - `load(installDir)`: read `join(installDir, '.epost-kit.json')`, JSON.parse, return `{}` if missing
   - `save(installDir, config)`: write, `enforceFilePermissions`
   - `get(installDir, key)`: load, getByPath
   - `set(installDir, key, value)`: load, setByPath, save
   - `getPath(installDir)`: returns `join(installDir, '.epost-kit.json')`

4. Create `src/domains/config/config-merger.ts`:
   - Import `safeDeepMerge` from `./config-security.js`
   - Define `DEFAULTS` constant with code-level defaults (e.g., `{ skills: { research: { engine: 'websearch' } } }`)
   - `mergeWithSources(defaults, global, project)`: 
     - First merge defaults + global -> intermediate
     - Track source for each field: if field exists in global, mark as "global"
     - Merge intermediate + project -> final
     - If field exists in project, mark as "project"
     - Fields only in defaults get "default"
   - Use recursive leaf-level key walking to build `sources` map with dot-notation keys (confirmed: leaf-level tracking, not top-level)
   - Return `{ merged, sources }`

5. Extract `getByPath` and `setByPath` helpers into a shared utility or keep them in each manager (they're small, ~10 lines each). Recommend: create `src/domains/config/config-path-utils.ts` (< 30 lines) to DRY.

6. Verify build: `npm run build`

## Todo List

- [x] Update `src/types/commands.ts` with new option fields
- [x] Create `src/domains/config/config-path-utils.ts` (getByPath, setByPath, coerceValue)
- [x] Create `src/domains/config/global-config-manager.ts`
- [x] Create `src/domains/config/project-config-manager.ts`
- [x] Create `src/domains/config/config-merger.ts`
- [x] Verify build: `npm run build`
- [x] Verify lint: `npm run lint`

## Success Criteria

- `GlobalConfigManager.load()` returns `{}` when no global config exists
- `GlobalConfigManager.set('skills.research.engine', 'gemini')` creates `~/.epost-kit/config.json`
- `ProjectConfigManager.load(installDir)` reads existing `.epost-kit.json` unchanged
- `ConfigMerger.mergeWithSources(defaults, global, project)` returns correct merged config + source map
- Source tracking: `{ "skills.research.engine": "project", "codingLevel": "global" }`
- File permissions enforced on Unix
- `npm run build` + `npm run lint` pass

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Global config dir creation fails | Low | `mkdir recursive: true` |
| Source tracking incomplete for nested keys | Medium | Recursive key walker covers all nesting levels |
| Breaking existing config read path | Low | ProjectConfigManager reads same file, same format |

## Security Considerations

- All writes through `config-security.ts` (permissions + pollution guard)
- Global config dir (0o700) prevents other users from reading API keys
- `safeDeepMerge` used in all merge operations

## Next Steps

- Phase 3 uses both managers in command phase handlers
- Phase 5 uses ConfigMerger in REST API
