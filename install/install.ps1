# ============================================================================
# epost-kit CLI installer for Windows (PowerShell)
# ============================================================================
# Clones the CLI repo to ~/.epost-kit/cli/, builds, and links globally.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File install.ps1
#
# Requirements:
#   - GitHub CLI (gh), authenticated
#   - Node.js >= 18.0.0
#   - npm
# ============================================================================

$ErrorActionPreference = "Stop"

$CliRepo    = "Klara-copilot/epost-agent-kit-cli"
$CliBranch  = "master"
$InstallDir = if ($env:INSTALL_DIR) { $env:INSTALL_DIR } else { Join-Path $env:USERPROFILE ".epost-kit" }
$CliDir     = Join-Path $InstallDir "cli"

function Write-Info { param([string]$Msg) Write-Host "[INFO] $Msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Msg) Write-Host "[OK]   $Msg" -ForegroundColor Green }
function Write-Err  { param([string]$Msg) Write-Host "[ERR]  $Msg" -ForegroundColor Red }
function Write-Warn { param([string]$Msg) Write-Host "[WARN] $Msg" -ForegroundColor Yellow }

# ============================================================================
# 1. Prerequisite checks
# ============================================================================

Write-Info "Checking prerequisites..."

# Check gh CLI
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Err "GitHub CLI (gh) not installed. See: https://cli.github.com/"
    exit 1
}

# Check gh auth
gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Err "Not authenticated with GitHub CLI. Run: gh auth login"
    exit 1
}

# Check node >= 18
$nodeOutput = node --version 2>$null
if (-not $nodeOutput) {
    Write-Err "Node.js not installed. Required: >= 18. Install from: https://nodejs.org/"
    exit 1
}
$nodeVersion = $nodeOutput -replace 'v', ''
$nodeMajor   = [int]($nodeVersion -split '\.')[0]
if ($nodeMajor -lt 18) {
    Write-Err "Node.js >= 18 required (found: v$nodeVersion). Upgrade at: https://nodejs.org/"
    exit 1
}

# Check npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Err "npm not found"
    exit 1
}

Write-Ok "Prerequisites OK (node v$nodeVersion)"

# ============================================================================
# 2. Clone or update CLI repo to persistent location
# ============================================================================

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

if (Test-Path (Join-Path $CliDir ".git")) {
    Write-Info "Existing installation found at $CliDir — updating..."
    Set-Location $CliDir
    git pull origin $CliBranch
    if ($LASTEXITCODE -ne 0) {
        Write-Err "git pull failed. Try re-running the installer."
        exit 1
    }
} else {
    Write-Info "Cloning CLI repository to $CliDir..."
    gh repo clone $CliRepo $CliDir -- --branch $CliBranch
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Clone failed. Check your GitHub access to $CliRepo"
        exit 1
    }
}

Write-Ok "Repository ready"

# ============================================================================
# 3. Build
# ============================================================================

Set-Location $CliDir

Write-Info "Installing dependencies..."
npm install
if ($LASTEXITCODE -ne 0) { Write-Err "npm install failed"; exit 1 }

Write-Info "Building..."
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "npm run build failed"; exit 1 }

Write-Ok "Build complete"

# ============================================================================
# 4. Link globally
# ============================================================================

Write-Info "Linking CLI globally..."
npm link
if ($LASTEXITCODE -ne 0) {
    Write-Err "npm link failed. Run manually:"
    Write-Err "  cd $CliDir"
    Write-Err "  npm link"
    exit 1
}

Write-Ok "CLI linked globally"

# ============================================================================
# 5. Verify installation
# ============================================================================

$versionOutput = epost-kit --version 2>$null
if ($LASTEXITCODE -ne 0 -or -not $versionOutput) {
    Write-Err "Verification failed — epost-kit not found in PATH"
    Write-Err "Restart your terminal or add npm bin to PATH."
    exit 1
}

Write-Ok "Installed: epost-kit $versionOutput"

# ============================================================================
# 6. Done
# ============================================================================

Write-Host ""
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Cyan
Write-Host "    epost-kit init     # Set up kit in your project"
Write-Host "    epost-kit doctor   # Check installation health"
Write-Host ""
