---
phase: 6
title: "React Dashboard SPA"
effort: 6h
depends: [5]
---

# Phase 6: React Dashboard SPA

## Context Links

- Phase 5: `phase-05-rest-api-server.md` (REST API endpoints)
- Design ref: `plans/reports/epost-brainstormer-0410-1342-config-system-redesign.md` (Dashboard Stack)

## Overview

- **Priority**: Low — visual enhancement, not core functionality
- **Status**: pending
- **Description**: Build React SPA with Vite for visual config editing. Consumes REST API from Phase 5. Pre-built into `ui-dist/` and served by Express in production.

## Key Insights

- React + Vite are devDependencies only — not shipped in npm package as source
- Pre-built `ui-dist/` folder is shipped as static assets
- Dashboard is a single-page app with client-side routing
- No server-side rendering needed (SPA + REST API)
- Vite dev server proxies `/api` to Express during development

## Requirements

### Functional
- Dashboard page: overview of config state, source badges
- Settings page: edit config values with scope selection
- Hooks page: toggle hooks on/off
- Plan page: view plan naming settings
- Ignore page: manage ignore patterns
- Keys page: manage API key status (set/not-set)
- All pages consume REST API from Phase 5

### Non-Functional
- Each component file < 100 lines
- Each page file < 150 lines
- No heavy UI framework — use inline styles or minimal CSS
- Build output in `ui-dist/` served by Express
- Vite config handles API proxy for dev mode

## Architecture

```
src/domains/web-dashboard/ui/
├── index.html                 # SPA entry point
├── vite.config.ts             # Vite config with API proxy
├── src/
│   ├── App.tsx                # Root component with routing
│   ├── main.tsx               # React entry point
│   ├── api/
│   │   └── client.ts          # Fetch wrapper for REST API
│   ├── components/
│   │   ├── config-editor.tsx  # Key-value editor with scope selector
│   │   ├── source-badge.tsx   # "default"|"global"|"project" badge
│   │   ├── hook-toggle.tsx    # Toggle switch for hooks
│   │   ├── ignore-list.tsx    # Pattern list with add/remove
│   │   └── api-key-input.tsx  # Password input for API keys
│   └── pages/
│       ├── dashboard-page.tsx # Overview with source map
│       ├── settings-page.tsx  # Config editor
│       ├── hooks-page.tsx     # Hook toggles
│       ├── plan-page.tsx      # Plan naming settings
│       ├── ignore-page.tsx    # Ignore pattern management
│       └── keys-page.tsx      # API key management
```

### Build Pipeline

```
vite build src/domains/web-dashboard/ui --outDir src/domains/web-dashboard/ui-dist
```

Pre-built `ui-dist/` is committed to repo and served by Express in production.

## Related Code Files

### Create
- `src/domains/web-dashboard/ui/index.html`
- `src/domains/web-dashboard/ui/vite.config.ts`
- `src/domains/web-dashboard/ui/src/main.tsx`
- `src/domains/web-dashboard/ui/src/App.tsx`
- `src/domains/web-dashboard/ui/src/api/client.ts`
- `src/domains/web-dashboard/ui/src/components/config-editor.tsx`
- `src/domains/web-dashboard/ui/src/components/source-badge.tsx`
- `src/domains/web-dashboard/ui/src/components/hook-toggle.tsx`
- `src/domains/web-dashboard/ui/src/components/ignore-list.tsx`
- `src/domains/web-dashboard/ui/src/components/api-key-input.tsx`
- `src/domains/web-dashboard/ui/src/pages/dashboard-page.tsx`
- `src/domains/web-dashboard/ui/src/pages/settings-page.tsx`
- `src/domains/web-dashboard/ui/src/pages/hooks-page.tsx`
- `src/domains/web-dashboard/ui/src/pages/plan-page.tsx`
- `src/domains/web-dashboard/ui/src/pages/ignore-page.tsx`
- `src/domains/web-dashboard/ui/src/pages/keys-page.tsx`

### Modify
- `package.json` — add devDependencies (vite, react, react-dom, @vitejs/plugin-react), add `build:dashboard` script
- `src/domains/web-dashboard/server.ts` — add static file serving for `ui-dist/`

## Implementation Steps

1. Install devDependencies:
   ```bash
   npm install -D vite react react-dom @vitejs/plugin-react @types/react @types/react-dom
   ```

2. Add build script to `package.json`:
   ```json
   "build:dashboard": "vite build src/domains/web-dashboard/ui --outDir src/domains/web-dashboard/ui-dist"
   ```

3. Create `src/domains/web-dashboard/ui/vite.config.ts`:
   - Configure React plugin
   - Set proxy: `/api` -> `http://localhost:3456`
   - Set build output to `ui-dist/`

4. Create `src/domains/web-dashboard/ui/index.html`:
   - Minimal HTML5 boilerplate
   - `<div id="root">` mount point
   - Script tag pointing to `src/main.tsx`

5. Create `src/domains/web-dashboard/ui/src/main.tsx`:
   - Import React, ReactDOM
   - Render `<App />` into `#root`

6. Create `src/domains/web-dashboard/ui/src/api/client.ts`:
   - `fetchApi(path, options)` wrapper
   - Base URL: empty (same origin in production, proxied in dev)
   - JSON parsing, error handling

7. Create components (each < 100 lines):
   - `source-badge.tsx`: colored badge showing "default"|"global"|"project"
   - `config-editor.tsx`: key-value editor with scope selector dropdown
   - `hook-toggle.tsx`: checkbox/switch for hook enable/disable
   - `ignore-list.tsx`: list of patterns with add input + remove button
   - `api-key-input.tsx`: password field, shows "set"/"not set" status

8. Create pages (each < 150 lines):
   - `dashboard-page.tsx`: fetch `GET /api/config`, display all keys with source badges
   - `settings-page.tsx`: config editor for each key, scope selector
   - `hooks-page.tsx`: fetch `GET /api/hooks`, render toggle for each
   - `plan-page.tsx`: plan naming fields (namingFormat, dateFormat, issuePrefix)
   - `ignore-page.tsx`: fetch `GET /api/ignore`, render ignore list
   - `keys-page.tsx`: fetch env var status, render key inputs

9. Create `src/domains/web-dashboard/ui/src/App.tsx`:
   - Simple tab/nav layout (no router library needed for 6 pages)
   - State: active page
   - Render active page component
   - ~60 lines

10. Update `src/domains/web-dashboard/server.ts`:
    - Add static file serving: `app.use(express.static(path.join(__dirname, 'ui-dist')))`
    - SPA fallback: `app.get('*', (req, res) => res.sendFile('ui-dist/index.html'))`

11. Build dashboard: `npm run build:dashboard`

12. Verify: `epost-kit config ui` serves dashboard in browser

## Todo List

- [ ] Install devDependencies (vite, react, react-dom, @vitejs/plugin-react)
- [ ] Add `build:dashboard` script to package.json
- [ ] Create `ui/vite.config.ts`
- [ ] Create `ui/index.html`
- [ ] Create `ui/src/main.tsx`
- [ ] Create `ui/src/api/client.ts`
- [ ] Create all components (5 files)
- [ ] Create all pages (6 files)
- [ ] Create `ui/src/App.tsx`
- [ ] Update `server.ts` for static serving
- [ ] Build dashboard: `npm run build:dashboard`
- [ ] Verify full flow: `epost-kit config ui`
- [ ] Verify build: `npm run build`

## Success Criteria

- `epost-kit config ui` opens browser with dashboard
- Dashboard displays merged config with source badges
- Can edit config values and save to correct scope
- Hook toggles work (enable/disable)
- Ignore patterns can be added/removed
- API key status shows set/not-set correctly
- `npm run build:dashboard` produces `ui-dist/` folder
- `npm run build` still passes (main CLI build)

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Vite config complexity | Low | Standard React+Vite setup, well-documented |
| Dashboard bundle too large | Low | No heavy deps, minimal UI |
| Build order dependency | Low | `build:dashboard` runs separately from `build` |

## Security Considerations

- No API keys displayed in dashboard UI (only set/not-set status)
- All writes proxied through REST API (which uses config-security.ts)
- Dashboard only accessible via localhost

## Next Steps

- Phase 7 adds integration tests for the full stack
