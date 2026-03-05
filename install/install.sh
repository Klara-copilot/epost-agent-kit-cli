#!/bin/bash
set -e

# ============================================================================
# epost_agent_kit installer for macOS/Linux
# ============================================================================
# Downloads the latest release from GitHub and installs epost-kit packages.
#
# Requirements:
#   - curl
#   - tar
#   - Node.js >=18.0.0 (for epost-kit CLI)
#
# Usage:
#   bash install-macos.sh
#   bash <(curl -s https://raw.githubusercontent.com/Klara-copilot/epost_agent_kit/master/install-macos.sh)
# ============================================================================

REPO="Klara-copilot/epost_agent_kit"
VERSION_URL="https://api.github.com/repos/${REPO}/releases/latest"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.epost}"
EXTRACT_DIR=$(mktemp -d "${TMPDIR:-/tmp}/epost_install.XXXXXX")

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { printf "${BLUE}[INFO]${NC} %s\n" "$1"; }
success() { printf "${GREEN}[OK]${NC}   %s\n" "$1"; }
error()   { printf "${RED}[ERR]${NC}  %s\n" "$1"; }
warn()    { printf "${YELLOW}[WARN]${NC} %s\n" "$1"; }

cleanup() {
  rm -rf "$EXTRACT_DIR"
}
trap cleanup EXIT

# ============================================================================
# 1. Get latest release download URL
# ============================================================================

info "Fetching latest release info from GitHub..."

RELEASE_JSON=$(curl -sf "$VERSION_URL" 2>/dev/null) || {
  error "Failed to fetch release info from GitHub"
  error "URL: $VERSION_URL"
  exit 1
}

RELEASE_URL=$(echo "$RELEASE_JSON" | grep -o '"browser_download_url": *"[^"]*\.tar\.gz"' | head -1 | cut -d'"' -f4)

if [ -z "$RELEASE_URL" ]; then
  error "Failed to find .tar.gz download URL in latest release"
  error "Check: https://github.com/${REPO}/releases/latest"
  exit 1
fi

ARTIFACT=$(basename "$RELEASE_URL")
success "Found release: $ARTIFACT"

# ============================================================================
# 2. Download artifact
# ============================================================================

info "Downloading $ARTIFACT..."
curl -L -o "$EXTRACT_DIR/$ARTIFACT" "$RELEASE_URL" || {
  error "Download failed"
  exit 1
}
success "Downloaded: $ARTIFACT"

# ============================================================================
# 3. Extract
# ============================================================================

info "Extracting..."
tar xzf "$EXTRACT_DIR/$ARTIFACT" -C "$EXTRACT_DIR" || {
  error "Extraction failed"
  exit 1
}

EXTRACTED_DIR=$(ls -d "$EXTRACT_DIR/epost_agent_kit-"* 2>/dev/null | head -1)

if [ -z "$EXTRACTED_DIR" ]; then
  error "Could not find extracted directory (expected epost_agent_kit-X.Y.Z/)"
  exit 1
fi

success "Extracted: $(basename "$EXTRACTED_DIR")"

# ============================================================================
# 4. Install
# ============================================================================

info "Installing to $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"

cp -r "$EXTRACTED_DIR/packages" "$INSTALL_DIR/"
cp "$EXTRACTED_DIR/.epost-metadata.json" "$INSTALL_DIR/"

if [ -d "$EXTRACTED_DIR/profiles" ]; then
  cp -r "$EXTRACTED_DIR/profiles" "$INSTALL_DIR/"
fi

if [ -d "$EXTRACTED_DIR/templates" ]; then
  cp -r "$EXTRACTED_DIR/templates" "$INSTALL_DIR/"
fi

success "Installed to $INSTALL_DIR"

# ============================================================================
# 5. Done
# ============================================================================

printf "\n${GREEN}Installation complete!${NC}\n\n"
printf "  ${BLUE}Next steps:${NC}\n"
printf "    Install the CLI globally:\n"
printf "      npm install -g epost-agent-kit-cli\n\n"
printf "    Or use via npx:\n"
printf "      npx epost-agent-kit-cli init\n\n"
printf "    Then run in your project:\n"
printf "      epost-kit init\n\n"
