#!/usr/bin/env bash
# Injects version into package.json, builds, and publishes to npm.
# Invoked by publish.yml (workflow_dispatch). Can be dry-run locally.
#
# Usage:
#   DRY_RUN=true VERSION_INPUT=v0.2.0 bash .github/scripts/ci-publish.sh
set -euo pipefail

DRY_RUN="${DRY_RUN:-false}"
VERSION_INPUT="${VERSION_INPUT:-}"

if [[ -z "$VERSION_INPUT" ]]; then
  echo "Error: VERSION_INPUT is required (e.g. v0.2.0)" >&2
  exit 1
fi

VERSION="${VERSION_INPUT#v}"  # strip leading 'v' for npm (v0.2.0 → 0.2.0)

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "Error: '$VERSION' is not a valid semver" >&2
  exit 1
fi

echo "==> Version: $VERSION  |  Dry run: $DRY_RUN"

# --- Inject version into package.json (no git tag, CI already tagged) ---
echo "==> Injecting version into package.json"
npm version "$VERSION" --no-git-tag-version

# --- Build (skip prepublishOnly — validation already ran in ci.yml) ---
echo "==> Build"
npm run build

# --- Publish ---
if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY RUN] Skipping: npm publish --provenance --access public --ignore-scripts"
  npm pack --dry-run
else
  echo "==> Publishing to npm"
  npm publish --provenance --access public --ignore-scripts
fi

echo "==> Done: @aavn/epost-kit@$VERSION"
