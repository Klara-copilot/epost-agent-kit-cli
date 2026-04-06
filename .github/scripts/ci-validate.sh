#!/usr/bin/env bash
# Runs full validation suite: typecheck, lint, tests.
# Invoked by ci.yml on PR/master push, and can be run locally.
#
# Usage:
#   bash .github/scripts/ci-validate.sh
set -euo pipefail

echo "==> Typecheck"
npm run typecheck

echo "==> Lint"
npm run lint

echo "==> Test"
npm run test

echo "==> Validation passed"
