#!/bin/bash
set -e

# ============================================================================
# epost-kit CLI installer for macOS/Linux
# ============================================================================
# Clones the CLI repo to ~/.epost-kit/cli/, builds, and links globally.
#
# Requirements:
#   - GitHub CLI (gh), authenticated
#   - Node.js >= 18.0.0
#   - npm
#
# Usage:
#   bash install.sh
#   gh api repos/Klara-copilot/epost-agent-kit-cli/contents/install/install.sh \
#     --jq .content | base64 -d | bash
# ============================================================================

CLI_REPO="Klara-copilot/epost-agent-kit-cli"
CLI_BRANCH="master"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.epost-kit}"
CLI_DIR="$INSTALL_DIR/cli"

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { printf "${BLUE}[INFO]${NC} %s\n" "$1"; }
success() { printf "${GREEN}[OK]${NC}   %s\n" "$1"; }
error()   { printf "${RED}[ERR]${NC}  %s\n" "$1" >&2; }
warn()    { printf "${YELLOW}[WARN]${NC} %s\n" "$1"; }

# ============================================================================
# 1. Prerequisite checks
# ============================================================================

info "Checking prerequisites..."

# Check gh CLI installed
command -v gh >/dev/null 2>&1 || {
  error "GitHub CLI (gh) not installed"
  error "Install from: https://cli.github.com/"
  exit 1
}

# Check gh auth
gh auth status >/dev/null 2>&1 || {
  error "Not authenticated with GitHub CLI"
  error "Run: gh auth login"
  exit 1
}

# Check node >= 18
NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//') || {
  error "Node.js not installed. Required: >= 18. Install from: https://nodejs.org/"
  exit 1
}
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if ! [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
  error "Node.js >= 18 required (found: v${NODE_VERSION})"
  error "Upgrade at: https://nodejs.org/"
  exit 1
fi

# Check npm
command -v npm >/dev/null 2>&1 || {
  error "npm not found"
  exit 1
}

success "Prerequisites OK (node v${NODE_VERSION})"

# ============================================================================
# 2. Clone or update CLI repo to persistent location
# ============================================================================

mkdir -p "$INSTALL_DIR"

if [ -d "$CLI_DIR/.git" ]; then
  info "Existing installation found at $CLI_DIR — updating..."
  cd "$CLI_DIR"
  git pull origin "$CLI_BRANCH" || {
    error "git pull failed. Try re-running the installer."
    exit 1
  }
else
  info "Cloning CLI repository to $CLI_DIR..."
  gh repo clone "$CLI_REPO" "$CLI_DIR" -- --branch "$CLI_BRANCH" || {
    error "Clone failed. Check your GitHub access to $CLI_REPO"
    exit 1
  }
fi

success "Repository ready"

# ============================================================================
# 3. Build
# ============================================================================

cd "$CLI_DIR"

info "Installing dependencies..."
npm install || { error "npm install failed"; exit 1; }

info "Building..."
npm run build || { error "npm run build failed"; exit 1; }

success "Build complete"

# ============================================================================
# 4. Link globally (with sudo fallback on EACCES)
# ============================================================================

info "Linking CLI globally..."
npm link 2>/dev/null || {
  warn "Permission denied, retrying with sudo..."
  sudo npm link || {
    error "npm link failed. Run manually:"
    error "  cd $CLI_DIR && sudo npm link"
    exit 1
  }
}

success "CLI linked globally"

# ============================================================================
# 5. Verify installation
# ============================================================================

epost-kit --version >/dev/null 2>&1 || {
  error "Verification failed — epost-kit not found in PATH"
  error "Try restarting your terminal or check npm bin is in PATH:"
  error "  npm config get prefix"
  exit 1
}

INSTALLED_VERSION=$(epost-kit --version 2>/dev/null)
success "Installed: epost-kit ${INSTALLED_VERSION}"

# ============================================================================
# 6. Done
# ============================================================================

printf "\n${GREEN}Installation complete!${NC}\n\n"
printf "  ${BLUE}Next steps:${NC}\n"
printf "    epost-kit init     # Set up kit in your project\n"
printf "    epost-kit doctor   # Check installation health\n\n"
