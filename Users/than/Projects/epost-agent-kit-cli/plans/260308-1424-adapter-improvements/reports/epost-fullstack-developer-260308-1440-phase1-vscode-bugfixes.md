## Phase Implementation Report

### Executed Phase
- Phase: phase-1-vscode-bugfixes
- Plan: /Users/than/Projects/epost-agent-kit-cli/plans/260308-1424-adapter-improvements
- Status: completed

### Files Modified
- `src/domains/installation/target-adapter.ts` — added `DroppedFeature` interface export; updated `transformHooks` return type signature to include optional `droppedFeatures`
- `src/domains/installation/copilot-adapter.ts` — `transformHooks` now collects `DroppedFeature` entries for: (a) `hook-matcher` when `matcher` is set to non-wildcard value, (b) `prompt-hook` when `hook.type === "prompt"`. Returns `droppedFeatures` array in result.
- `src/domains/config/kit-config-merger.ts` — added optional `pathTransformer?: (content: string) => string` param; applied to JSON string output before write
- `src/commands/init.ts` — VS Code branch `mergeAndWriteKitConfig` call now passes `(content) => adapter.replacePathRefs(content)` as transformer

### Files Created
- `tests/domains/installation/copilot-adapter.test.ts` — 10 tests covering: null return, command conversion, timeout conversion, matcher dropped, wildcard not dropped, prompt-hook dropped, all-prompt returns null, clean hooks no droppedFeatures, replacePathRefs
- `tests/domains/config/kit-config-merger.test.ts` — 4 tests covering: empty result, multi-package merge, pathTransformer applied, no transformer preserves paths

### Tasks Completed
- [x] Copilot hooks.json matcher support verified — schema has no matcher/pattern equivalent; approach is warning-only via `DroppedFeature`
- [x] `transformHooks` updated: captures matcher drops + prompt-hook drops
- [x] `.epost-kit.json` path transformation for VS Code via `pathTransformer` param
- [x] All tests pass (136 total, +14 new)
- [x] TypeScript strict mode: no errors

### Tests Status
- Type check: pass
- Unit tests: 136/136 pass (15 test files)
- Integration tests: n/a

### Key Decision
Copilot hooks.json (confirmed by schema: only `type`, `bash`, `timeoutSec` fields) has no matcher equivalent. Chose warning-only approach: hooks still fire unconditionally, `droppedFeatures` metadata returned for Phase 2 warning system to consume. Wildcard `*` matcher is not flagged as dropped (semantically equivalent to no matcher).

### Issues Encountered
None.

### Next Steps
- Phase 2 can consume `hookResult.droppedFeatures` from `adapter.transformHooks()` to display compatibility report to user after VS Code install
- Claude/Cursor `init.ts` branch does not need `pathTransformer` — paths are already correct for those targets
