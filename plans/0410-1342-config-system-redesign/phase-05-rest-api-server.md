---
phase: 5
title: "REST API Server"
effort: 4h
depends: [2]
---

# Phase 5: REST API Server

## Context Links

- Phase 2: `phase-02-config-managers.md` (GlobalConfigManager, ProjectConfigManager, ConfigMerger)
- Design ref: `plans/reports/epost-brainstormer-0410-1342-config-system-redesign.md` (REST API table)
- Package: `package.json` (needs express + @types/express)

## Overview

- **Priority**: Medium — enables web dashboard
- **Status**: pending
- **Description**: Create Express REST API server for config CRUD, hooks management, ignore patterns, and env var status. Lazy-loaded only when `config ui` runs.

## Key Insights

- Server must be lazy-imported — zero impact on main CLI startup
- Port auto-select from 3456-3460 range to avoid conflicts
- Express is a new production dependency (only loaded on `config ui`)
- REST API is the bridge between React SPA and config managers
- Env var endpoints expose status (set/not-set) but never reveal values
- Static file serving for built SPA (Phase 6)

## Requirements

### Functional

**Config Endpoints:**
- `GET /api/config` — merged config + source map via `ConfigMerger.mergeWithSources()`
- `GET /api/config/:scope` — single scope config (`global` or `project`)
- `PUT /api/config/:scope/:key` — set value in scope, body = `{ value: any }`
- `DELETE /api/config/:scope/:key` — reset key to inherited value

**Hooks Endpoints:**
- `GET /api/hooks` — hooks status from merged config
- `PUT /api/hooks/:name` — toggle hook enabled/disabled, body = `{ enabled: boolean }`

**Ignore Endpoints:**
- `GET /api/ignore` — list patterns from `.epost-ignore`
- `POST /api/ignore` — add pattern, body = `{ pattern: string }`
- `DELETE /api/ignore/:pattern` — remove pattern

**Env Endpoints:**
- `GET /api/env/:key` — status only: `{ set: boolean }` (never value)
- `PUT /api/env/:key` — set env var, body = `{ value: string }`

**Server:**
- Port auto-select: try 3456, 3457, 3458, 3459, 3460
- Auto-open browser on start
- CORS: localhost only
- Graceful shutdown on SIGINT/SIGTERM

<!-- Updated: Validation Session 1 - API routes MUST mount before SPA catch-all -->

### Non-Functional
- `server.ts` < 150 lines (Express app setup + port logic)
- `config-routes.ts` < 200 lines (all route handlers)
- `config-ui-command.ts` < 80 lines (CLI launcher)
- Zero impact on CLI startup time (dynamic import only)

## Architecture

```
src/domains/web-dashboard/
├── server.ts                 # Express app, port auto-select, static serving
└── api/
    └── config-routes.ts      # All REST API route handlers

src/commands/config/
└── config-ui-command.ts      # CLI entry point: launches server + opens browser
```

### server.ts Structure

```ts
// Dynamic import of express (not in main bundle)
export async function startServer(options: ServerOptions): Promise<void>

interface ServerOptions {
  port?: number;
  host?: string;
  noOpen?: boolean;
  installDir: string;  // resolved project install dir
}
```

### config-routes.ts Structure

```ts
export function createConfigRouter(installDir: string): Router
// Creates Express Router with all /api/* routes
// Uses GlobalConfigManager, ProjectConfigManager, ConfigMerger
```

### config-ui-command.ts Structure

```ts
export async function runConfigUI(opts: ConfigUIOptions): Promise<void>
// 1. Resolve installDir
// 2. Dynamic import server.ts
// 3. Call startServer({ ...opts, installDir })
```

## Related Code Files

### Create
- `src/domains/web-dashboard/server.ts`
- `src/domains/web-dashboard/api/config-routes.ts`
- `src/commands/config/config-ui-command.ts`

### Modify
- `package.json` — add `express` to dependencies, `@types/express` to devDependencies
- `src/commands/config/index.ts` — add `runConfigUI` re-export

## Implementation Steps

1. Install dependencies:
   ```bash
   npm install express
   npm install -D @types/express
   ```

2. Create `src/domains/web-dashboard/api/config-routes.ts`:
   - Dynamic import of express `Router`
   - `createConfigRouter(installDir)`: returns Router with all routes
   - Config routes: use GlobalConfigManager, ProjectConfigManager, ConfigMerger
   - Hooks routes: read/write `hooks.*` keys from merged config
   - Ignore routes: read/write `.epost-ignore` file (reuse existing logic from ignore-handler)
   - Env routes: read `.env` file, return `{ set: boolean }` only (no value exposed)
   - Error handling: try/catch each route, return 500 with message
   - ~180 lines

3. Create `src/domains/web-dashboard/server.ts`:
   - Dynamic import of express
   - `startServer(options)`:
     - Create Express app
     - **CRITICAL**: Mount `createConfigRouter` at `/api` BEFORE SPA catch-all
     - Serve static files from `ui-dist/` if exists (Phase 6) — mount AFTER API routes
     - SPA catch-all `app.get('*')` must be LAST middleware
     - Auto-select port from 3456-3460 range
     - Auto-open browser (unless `noOpen`)
     - Log URL to console
     - Handle SIGINT/SIGTERM for graceful shutdown
   - ~100 lines

4. Create `src/commands/config/config-ui-command.ts`:
   - Import `ConfigUIOptions` from types
   - Import `resolveInstallDir` from config-path-utils
   - `runConfigUI(opts)`:
     - Resolve installDir from opts.dir
     - Dynamic import `../../domains/web-dashboard/server.js`
     - Call `startServer({ ...opts, installDir })`
   - ~40 lines

5. Update `src/commands/config/index.ts`:
   - Add: `export { runConfigUI } from './config-ui-command.js'`

6. Verify build: `npm run build`

## Todo List

- [ ] Install express + @types/express
- [ ] Create `src/domains/web-dashboard/api/config-routes.ts`
- [ ] Create `src/domains/web-dashboard/server.ts`
- [ ] Create `src/commands/config/config-ui-command.ts`
- [ ] Update `src/commands/config/index.ts` with runConfigUI re-export
- [ ] Verify build: `npm run build`
- [ ] Verify lint: `npm run lint`
- [ ] Test: `epost-kit config ui` starts server on port 3456

## Success Criteria

- `epost-kit config ui` starts Express server on auto-selected port
- `GET /api/config` returns merged config with source map
- `PUT /api/config/global/skills.research.engine` with `{ value: "gemini" }` writes to global config
- `DELETE /api/config/project/codingLevel` resets to inherited value
- `GET /api/hooks` returns hooks status
- `GET /api/env/GEMINI_API_KEY` returns `{ set: true }` without exposing value
- `epost-kit config ui --port 4000` starts on port 4000
- `epost-kit config ui --no-open` starts without opening browser
- Server auto-opens browser by default
- Express is NOT in main CLI bundle (lazy import)
- `npm run build` + `npm run lint` pass

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Express bundled into main CLI | Medium | All imports in config-ui-command are dynamic |
| Port range exhausted | Low | 5 ports sufficient for local dev; error message if all taken |
| CORS/security | Low | Bind to localhost only |

## Security Considerations

- Bind to localhost only (no external access)
- Env var endpoint never exposes values, only set/not-set status
- All config writes go through config-security.ts
- No authentication needed for localhost-only v1 (revisit if remote access ever needed)

## Next Steps

- Phase 6 builds React SPA that consumes this API
- Phase 6 adds static file serving for built SPA
