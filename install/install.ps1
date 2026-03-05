# ============================================================================
# epost_agent_kit installer for Windows (PowerShell)
# ============================================================================
# Downloads the latest release from GitHub and installs epost-kit packages.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File install.ps1
#
# Requirements:
#   - PowerShell 5.1+
#   - Node.js >=18.0.0 (for epost-kit CLI)
# ============================================================================

$ErrorActionPreference = "Stop"

$Repo = "Klara-copilot/epost_agent_kit"
$VersionUrl = "https://api.github.com/repos/$Repo/releases/latest"
$InstallDir = if ($env:INSTALL_DIR) { $env:INSTALL_DIR } else { Join-Path $env:USERPROFILE ".epost" }
$ExtractDir = Join-Path $env:TEMP "epost_install_$([System.Guid]::NewGuid().ToString('N').Substring(0,8))"

function Write-Info  { param([string]$Msg) Write-Host "[INFO] $Msg" -ForegroundColor Cyan }
function Write-Ok    { param([string]$Msg) Write-Host "[OK]   $Msg" -ForegroundColor Green }
function Write-Err   { param([string]$Msg) Write-Host "[ERR]  $Msg" -ForegroundColor Red }
function Write-Warn  { param([string]$Msg) Write-Host "[WARN] $Msg" -ForegroundColor Yellow }

try {
    # ========================================================================
    # 1. Get latest release download URL
    # ========================================================================

    Write-Info "Fetching latest release info from GitHub..."

    $Response = Invoke-WebRequest -Uri $VersionUrl -UseBasicParsing
    $ReleaseData = $Response.Content | ConvertFrom-Json
    $Asset = $ReleaseData.assets | Where-Object { $_.name -like "*.tar.gz" } | Select-Object -First 1

    if (-not $Asset) {
        Write-Err "Failed to find .tar.gz asset in latest release"
        Write-Err "Check: https://github.com/$Repo/releases/latest"
        exit 1
    }

    $ReleaseUrl = $Asset.browser_download_url
    $Artifact = $Asset.name
    Write-Ok "Found release: $Artifact"

    # ========================================================================
    # 2. Download artifact
    # ========================================================================

    Write-Info "Downloading $Artifact..."
    New-Item -ItemType Directory -Force -Path $ExtractDir | Out-Null
    $DownloadPath = Join-Path $ExtractDir $Artifact
    Invoke-WebRequest -Uri $ReleaseUrl -OutFile $DownloadPath
    Write-Ok "Downloaded: $Artifact"

    # ========================================================================
    # 3. Extract
    # ========================================================================

    Write-Info "Extracting..."
    # tar is available on Windows 10+ (build 17063+)
    tar xzf $DownloadPath -C $ExtractDir

    $ExtractedDir = Get-ChildItem -Directory -Path $ExtractDir -Filter "epost_agent_kit-*" | Select-Object -First 1

    if (-not $ExtractedDir) {
        Write-Err "Could not find extracted directory (expected epost_agent_kit-X.Y.Z/)"
        exit 1
    }

    Write-Ok "Extracted: $($ExtractedDir.Name)"

    # ========================================================================
    # 4. Install
    # ========================================================================

    Write-Info "Installing to $InstallDir..."
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

    Copy-Item -Path "$($ExtractedDir.FullName)\packages" -Destination $InstallDir -Recurse -Force
    Copy-Item -Path "$($ExtractedDir.FullName)\.epost-metadata.json" -Destination $InstallDir -Force

    if (Test-Path "$($ExtractedDir.FullName)\profiles") {
        Copy-Item -Path "$($ExtractedDir.FullName)\profiles" -Destination $InstallDir -Recurse -Force
    }
    if (Test-Path "$($ExtractedDir.FullName)\templates") {
        Copy-Item -Path "$($ExtractedDir.FullName)\templates" -Destination $InstallDir -Recurse -Force
    }

    Write-Ok "Installed to $InstallDir"

    # ========================================================================
    # 5. Done
    # ========================================================================

    Write-Host ""
    Write-Host "Installation complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor Cyan
    Write-Host "    Install the CLI globally:"
    Write-Host "      npm install -g epost-agent-kit-cli"
    Write-Host ""
    Write-Host "    Or use via npx:"
    Write-Host "      npx epost-agent-kit-cli init"
    Write-Host ""
    Write-Host "    Then run in your project:"
    Write-Host "      epost-kit init"
    Write-Host ""

} finally {
    # Cleanup temp dir
    if (Test-Path $ExtractDir) {
        Remove-Item -Path $ExtractDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
