# ============================================================================
# epost-kit CLI installer for Windows (PowerShell)
# ============================================================================
# Clones the CLI repo to ~/.epost-kit/cli/, builds, and links globally.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File install.ps1
#
#   One-liner (cross-platform, no base64 dependency):
#   $script = gh api repos/Klara-copilot/epost-agent-kit-cli/contents/install/install.ps1 --jq '.content | @base64d'; Invoke-Expression $script
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

# On Windows, npm places linked bins in the prefix dir directly (no bin/ subdir)
$NpmPrefix = (npm config get prefix).Trim()
$EpostBin  = Join-Path $NpmPrefix "epost-kit.cmd"

# Confirm .cmd shim was created (definitive proof npm link worked)
if (-not (Test-Path $EpostBin)) {
    Write-Err "Verification failed — epost-kit.cmd not found at $EpostBin"
    Write-Err "Try manually: cd $CliDir && npm link"
    exit 1
}

Write-Ok "CLI installed at: $EpostBin"

# Check PATH (advisory only — do NOT exit on failure)
$versionOutput = & epost-kit --version 2>$null
if ($LASTEXITCODE -eq 0 -and $versionOutput) {
    Write-Ok "Installed: epost-kit $versionOutput"
} else {
    Write-Warn "epost-kit not yet in PATH for this session."

    # Offer to auto-append to PowerShell profile
    $reply = Read-Host "Add epost-kit to PATH in `$PROFILE? [Y/n]"
    if ($reply -eq "" -or $reply -match "^[Yy]$") {
        if (-not (Test-Path (Split-Path $PROFILE))) {
            New-Item -ItemType Directory -Path (Split-Path $PROFILE) -Force | Out-Null
        }
        Add-Content -Path $PROFILE -Value ""
        Add-Content -Path $PROFILE -Value "# epost-kit — added by installer"
        Add-Content -Path $PROFILE -Value "`$env:PATH += `";$NpmPrefix`""
        Write-Ok "Added to `$PROFILE — restart terminal or run: . `$PROFILE"
    } else {
        Write-Warn "Skipped. Add manually to `$PROFILE:"
        Write-Warn "  `$env:PATH += `";$NpmPrefix`""
    }

    Write-Ok "Installation complete — restart terminal to use epost-kit"
}

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
