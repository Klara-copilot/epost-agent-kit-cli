---
phase: 6
title: "Announce, follow-up, and post-release hygiene"
effort: 20m
depends: [5]
---

# Phase 06 — Announce & follow-up

Polish release notes, record post-release learnings, queue future improvements.

## Context

Auto-generated notes from `gh release --generate-notes` are functional but may lack a high-signal summary. This phase adds a short "Highlights" header without re-authoring the full body. Also captures follow-up items surfaced during the release (changeset automation, LICENSE gap findings, etc.).

## Requirements

- Release page has a short "Highlights" section prepended to auto-gen body
- Post-release journal entry recorded (via `journal` skill)
- Follow-up items noted for next release
- Monitoring window documented (48h)

## Related Files

- `plan.md` — update Status to `completed` at end
- `docs/journals/` — new journal entry (via journal skill)
- No source changes

## Steps

1. **Polish release notes (if auto-gen is thin):**
   - `gh release view v0.1.0 --json body -q .body` — inspect current body
   - If body is just a PR list: edit to prepend Highlights section:
     ```markdown
     ## Highlights

     - New CLI phases: `inspect`, `manage`, `diagnose` commands (PR #12)
     - `update` command now preserves user-modified files via smart-merge (PR #13)
     - New IDE adapters: Antigravity, JetBrains
     - New Cursor `.mdc` generator
     - Requires Node.js >= 18

     ## Changes
     ```
   - Append auto-gen body below `## Changes`
   - Update via: `gh release edit v0.1.0 --notes-file -` (read from stdin) or `--notes "..."`
   - If auto-gen is already adequate: skip this step

2. **Announce** (optional, not blocking):
   - Post in team channel: "@aavn/epost-kit 0.1.0 is live: npmjs.com/package/@aavn/epost-kit"
   - Include highlights bullet list
   - No CI/automation for this — manual

3. **Record journal entry** (via `journal` skill):
   - Epic: `release-v0-1-0`
   - Content: version decision rationale, trade-offs picked (from plan.md), any surprises during phases 01-05
   - Save to `docs/journals/` per journal skill convention

4. **Queue follow-up items** (record in journal entry OR create plans/issues as appropriate):

   | Item | Why | Priority |
   |---|---|---|
   | Adopt `changesets` or `semantic-release` | Avoid manual version decisions for next release | Medium |
   | Add `CHANGELOG.md` seeded from v0.0.1 → v0.1.0 history | Better for downstream changelog aggregators | Low |
   | Resolve `signals.json` timestamp drift (gitignore or regenerate deterministic) | Prevents re-dirty on every session | Low |
   | Add pre-release `beta` channel to `publish.yml` | Safer path for experimental changes | Low |
   | Document `LICENSE` creation as part of kit bootstrap | Prevent future missing-LICENSE gaps | Low |
   | Add provenance verification to `verify-npm-registry.yml` | Catch attestation drift automatically | Medium |

5. **48-hour monitoring window** (set calendar reminder or poll manually):
   - Day+1: `npm view @aavn/epost-kit` download count sanity check
   - Day+1: scan issue tracker for install failures
   - Day+2: final `verify-npm-registry.yml` run green

6. **Mark plan complete:**
   ```bash
   node .claude/scripts/complete-plan.cjs plans/0409-1130-npm-release-v0-1-0
   ```

## Todo

- [ ] Inspect `gh release view v0.1.0 --json body -q .body`
- [ ] Decide: polish or leave as-is
- [ ] If polish: prepend Highlights section
- [ ] (optional) Post team announcement
- [ ] Create journal entry via `journal` skill (epic: `release-v0-1-0`)
- [ ] Record follow-up items in journal or tracker
- [ ] Set 48h monitoring reminder
- [ ] Day+1 check: downloads, issue tracker
- [ ] Day+2 check: final workflow run
- [ ] Run `complete-plan.cjs` script
- [ ] Plan status → `completed`

## Success Criteria

- Release notes on GH have adequate summary (either polished or auto-gen is sufficient)
- Journal entry exists documenting decisions and learnings
- Follow-up items recorded
- Plan marked `completed` in `plans/index.json`
- 48h monitoring window observed with no critical issues

## Risks

| Risk | Mitigation |
|---|---|
| Regression reported in 48h window | Use rollback playbook in phase-05 (deprecate + fix-forward) |
| Follow-up items forgotten | Record in journal + optional GitHub issues |
| Team channel announcement missed | Non-blocking — release is public regardless |

## Unresolved

- None. Follow-up items are captured as future-work, not blockers for this release.
