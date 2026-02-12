#!/usr/bin/env bash

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Constants
REQUIRED_NODE_VERSION="18.0.0"
REPO="Klara-copilot/epost-agent-kit-cli"
CLI_NAME="epost-kit"

# Utility functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_banner() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     ePost-Kit CLI Installer v1.0      ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""
}

# Version comparison function
version_gte() {
    # Returns 0 if $1 >= $2, 1 otherwise
    printf '%s\n%s' "$2" "$1" | sort -V -C
}

check_node() {
    print_info "Checking Node.js version..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        echo "Please install Node.js >= ${REQUIRED_NODE_VERSION} from https://nodejs.org/"
        exit 1
    fi

    local node_version
    node_version=$(node --version | sed 's/v//')

    if ! version_gte "$node_version" "$REQUIRED_NODE_VERSION"; then
        print_error "Node.js version $node_version is too old"
        echo "Required: >= ${REQUIRED_NODE_VERSION}"
        echo "Please upgrade Node.js from https://nodejs.org/"
        exit 1
    fi

    print_success "Node.js $node_version detected"
}

check_npm() {
    print_info "Checking npm availability..."

    if ! command -v npm &> /dev/null; then
        print_error "npm is not available"
        echo "Please reinstall Node.js with npm included"
        exit 1
    fi

    local npm_version
    npm_version=$(npm --version)
    print_success "npm $npm_version detected"
}

check_gh_cli() {
    print_info "Checking GitHub CLI..."

    if ! command -v gh &> /dev/null; then
        print_error "GitHub CLI (gh) is not installed"
        echo ""
        echo "Install instructions:"
        echo "  macOS:  brew install gh"
        echo "  Ubuntu: sudo apt install gh"
        echo ""
        echo "Or visit: https://cli.github.com/"
        exit 1
    fi

    local gh_version
    gh_version=$(gh --version | head -n1 | awk '{print $3}')
    print_success "GitHub CLI $gh_version detected"
}

check_gh_auth() {
    print_info "Checking GitHub authentication..."

    if ! gh auth status &> /dev/null; then
        print_error "Not authenticated with GitHub CLI"
        echo ""
        echo "Please run: gh auth login"
        echo "Then re-run this installer"
        exit 1
    fi

    print_success "GitHub CLI authenticated"
}

check_org_access() {
    print_info "Verifying access to ${REPO}..."

    if ! gh repo view "$REPO" &> /dev/null; then
        print_error "Cannot access repository: ${REPO}"
        echo ""
        echo "Possible causes:"
        echo "  1. Repository doesn't exist"
        echo "  2. You don't have access to the organization"
        echo "  3. Network connectivity issues"
        echo ""
        echo "Please verify your GitHub permissions and try again"
        exit 1
    fi

    print_success "Repository access verified"
}

clone_repository() {
    local temp_dir
    temp_dir="/tmp/epost-kit-$(date +%s)"

    print_info "Cloning repository to temporary directory..." >&2

    if ! gh repo clone "$REPO" "$temp_dir" -- --quiet; then
        print_error "Failed to clone repository" >&2
        exit 1
    fi

    print_success "Repository cloned to $temp_dir" >&2
    echo "$temp_dir"
}

build_cli() {
    local repo_dir="$1"

    cd "$repo_dir"

    print_info "Installing dependencies..."
    if ! npm install --silent; then
        print_error "Failed to install dependencies"
        exit 1
    fi
    print_success "Dependencies installed"

    print_info "Building TypeScript project..."
    if ! npm run build; then
        print_error "Build failed"
        exit 1
    fi

    if [[ ! -f "dist/cli.js" ]]; then
        print_error "Build output not found: dist/cli.js"
        exit 1
    fi

    print_success "Build completed successfully"
}

install_cli() {
    print_info "Installing CLI globally..."

    if npm link &> /dev/null; then
        print_success "CLI installed globally"
    elif sudo npm link &> /dev/null; then
        print_warning "Required sudo permissions for global installation"
        print_success "CLI installed globally with sudo"
    else
        print_error "Failed to install CLI globally"
        echo ""
        echo "Try running manually:"
        echo "  cd $PWD"
        echo "  sudo npm link"
        exit 1
    fi
}

verify_installation() {
    print_info "Verifying installation..."

    if ! command -v "$CLI_NAME" &> /dev/null; then
        print_error "CLI command not found in PATH"
        echo ""
        echo "Installation completed but CLI is not accessible"
        echo "You may need to:"
        echo "  1. Restart your terminal"
        echo "  2. Check your npm global bin directory is in PATH"
        exit 1
    fi

    local version
    if version=$("$CLI_NAME" --version 2>&1); then
        print_success "Installation verified: $version"
    else
        print_error "CLI installed but --version check failed"
        exit 1
    fi
}

cleanup() {
    local temp_dir="$1"

    if [[ -d "$temp_dir" ]]; then
        print_info "Cleaning up temporary files..."
        rm -rf "$temp_dir"
        print_success "Cleanup completed"
    fi
}

print_next_steps() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     Installation Successful! 🎉        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "Next steps:"
    echo ""
    echo "  1. Run system diagnostics:"
    echo -e "     ${BLUE}${CLI_NAME} doctor${NC}"
    echo ""
    echo "  2. Onboard your project:"
    echo -e "     ${BLUE}${CLI_NAME} onboard${NC}"
    echo ""
    echo "  3. Get help:"
    echo -e "     ${BLUE}${CLI_NAME} --help${NC}"
    echo ""
}

# Main installation flow
main() {
    local temp_dir=""

    # Trap cleanup on exit
    trap 'cleanup "$temp_dir"' EXIT

    print_banner

    # Prerequisites
    check_node
    check_npm
    check_gh_cli
    check_gh_auth
    check_org_access

    echo ""

    # Clone and build
    temp_dir=$(clone_repository)
    build_cli "$temp_dir"

    echo ""

    # Install
    install_cli
    verify_installation

    # Success
    print_next_steps
}

# Run main function
main
