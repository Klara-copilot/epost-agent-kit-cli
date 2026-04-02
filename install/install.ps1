# ============================================================================
# epost-kit CLI installer for Windows (PowerShell)
# ============================================================================
# Clones the CLI repo to ~/.epost-kit/cli/, builds, and links globally.
#
# Usage:
#   irm https://raw.githubusercontent.com/Klara-copilot/epost-agent-kit-cli/master/install/install.ps1 | iex
#
#   Or save and run:
#   $temp = Join-Path $env:TEMP 'epost-kit-install.ps1'
#   irm https://raw.githubusercontent.com/Klara-copilot/epost-agent-kit-cli/master/install/install.ps1 | Set-Content $temp
#   powershell -NoProfile -ExecutionPolicy Bypass -File $temp
#   Remove-Item $temp -Force
#
# Requirements:
#   - git
#   - Node.js >= 18.0.0
#   - npm
# ============================================================================

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$script:LastNativeExitCode = 0

$CliRepo    = "Klara-copilot/epost-agent-kit-cli"
$CliBranch  = "master"
$InstallDir = if ($env:INSTALL_DIR) { $env:INSTALL_DIR } else { Join-Path $env:USERPROFILE ".epost-kit" }
$CliDir     = Join-Path $InstallDir "cli"
$MinimumPowerShellVersion = [version]"5.1"

function Write-Info { param([string]$Msg) Write-Host "[INFO] $Msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Msg) Write-Host "[OK]   $Msg" -ForegroundColor Green }
function Write-Err  { param([string]$Msg) Write-Host "[ERR]  $Msg" -ForegroundColor Red }
function Write-Warn { param([string]$Msg) Write-Host "[WARN] $Msg" -ForegroundColor Yellow }
function Test-CommandAvailable { param([Parameter(Mandatory = $true)][string]$Name) return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue) }
function New-NativeCommandException {
    param(
        [Parameter(Mandatory = $true)][string]$Description,
        [Parameter(Mandatory = $true)][int]$ExitCode
    )

    $exception = [System.InvalidOperationException]::new("$Description failed with exit code $ExitCode.")
    $exception.Data["ExitCode"] = $ExitCode
    return $exception
}
function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Description,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )

    $result = & $Command
    $exitCode = $LASTEXITCODE
    $script:LastNativeExitCode = $exitCode
    if ($exitCode -ne 0) {
        throw (New-NativeCommandException -Description $Description -ExitCode $exitCode)
    }

    return $result
}
function Test-IsCi {
    return -not [string]::IsNullOrWhiteSpace($env:CI) -and $env:CI -notin @("0", "false", "False")
}
function Get-ProfilePathUpdateLine {
    param([Parameter(Mandatory = $true)][string]$Prefix)

    $escapedPrefix = $Prefix.Replace("'", "''")
    return "if ((`$env:PATH -split ';') -notcontains '$escapedPrefix') { `$env:PATH += ';$escapedPrefix' }"
}
function Add-ProfilePathEntry {
    [CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "Low")]
    param([Parameter(Mandatory = $true)][string]$Prefix)

    $profileDir = Split-Path -Parent $PROFILE
    if (-not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    }

    if (-not (Test-Path $PROFILE)) {
        New-Item -ItemType File -Path $PROFILE -Force | Out-Null
    }

    $profileLine = Get-ProfilePathUpdateLine -Prefix $Prefix
    $existingContent = Get-Content -Path $PROFILE -Raw -ErrorAction SilentlyContinue
    if ($existingContent -and $existingContent.Contains($profileLine)) {
        Write-Info "PowerShell profile already includes the epost-kit PATH entry."
        return
    }

    if ($PSCmdlet.ShouldProcess($PROFILE, "Add epost-kit PATH entry")) {
        Add-Content -Path $PROFILE -Value ""
        Add-Content -Path $PROFILE -Value "# epost-kit - added by installer"
        Add-Content -Path $PROFILE -Value $profileLine
        Write-Ok "Added to `$PROFILE - restart terminal or run: . `$PROFILE"
    }
}
function Get-ExitCodeFromError {
    param([Parameter(Mandatory = $true)][System.Management.Automation.ErrorRecord]$ErrorRecord)

    if ($ErrorRecord.Exception.Data.Contains("ExitCode")) {
        return [int]$ErrorRecord.Exception.Data["ExitCode"]
    }

    if ($script:LastNativeExitCode -gt 0) {
        return $script:LastNativeExitCode
    }

    return 1
}

$originalLocation = Get-Location

# ============================================================================
# 1. Prerequisite checks
# ============================================================================

try {
    Write-Info "Checking prerequisites..."

    if ($PSVersionTable.PSVersion -lt $MinimumPowerShellVersion) {
        throw "PowerShell $MinimumPowerShellVersion or newer is required (found: $($PSVersionTable.PSVersion))."
    }

    if (-not (Test-CommandAvailable -Name "git")) {
        throw "git not found. Install Git from: https://git-scm.com/download/win"
    }

    if (-not (Test-CommandAvailable -Name "node")) {
        throw "Node.js not installed. Required: >= 18. Install from: https://nodejs.org/"
    }

    if (-not (Test-CommandAvailable -Name "npm")) {
        throw "npm not found. Install Node.js from: https://nodejs.org/"
    }

    $nodeOutput = Invoke-NativeCommand -Description "node --version" -Command { node --version 2>$null }
    if (-not $nodeOutput) {
        throw "Node.js version could not be determined."
    }

    $nodeVersion = ($nodeOutput | Select-Object -First 1) -replace "^v", ""
    $nodeMajor = [int]($nodeVersion -split '\.')[0]
    if ($nodeMajor -lt 18) {
        throw "Node.js >= 18 required (found: v$nodeVersion). Upgrade at: https://nodejs.org/"
    }

    Write-Ok "Prerequisites OK (node v$nodeVersion)"

    # ============================================================================
    # 2. Clone or update CLI repo to persistent location
    # ============================================================================

    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

    if (Test-Path (Join-Path $CliDir ".git")) {
        Write-Info "Existing installation found at $CliDir - updating..."
        Set-Location -Path $CliDir
        Invoke-NativeCommand -Description "git pull" -Command { git pull origin $CliBranch }
    } else {
        Write-Info "Cloning CLI repository to $CliDir..."
        Invoke-NativeCommand -Description "git clone" -Command { git clone --branch $CliBranch "https://github.com/$CliRepo.git" $CliDir }
    }

    Write-Ok "Repository ready"

    # ============================================================================
    # 3. Build
    # ============================================================================

    Set-Location -Path $CliDir

    Write-Info "Installing dependencies..."
    Invoke-NativeCommand -Description "npm install" -Command { npm install }

    Write-Info "Building..."
    Invoke-NativeCommand -Description "npm run build" -Command { npm run build }

    Write-Ok "Build complete"

    # ============================================================================
    # 4. Link globally
    # ============================================================================

    Write-Info "Linking CLI globally..."
    Invoke-NativeCommand -Description "npm link" -Command { npm link }
    Write-Ok "CLI linked globally"

    # ============================================================================
    # 5. Verify installation
    # ============================================================================

    # On Windows, npm places linked bins in the prefix dir directly (no bin/ subdir)
    $NpmPrefix = (Invoke-NativeCommand -Description "npm config get prefix" -Command { npm config get prefix }).Trim()
    if (-not $NpmPrefix) {
        throw "npm config get prefix returned an empty prefix."
    }

    $EpostBin = Join-Path $NpmPrefix "epost-kit.cmd"

    # Confirm .cmd shim was created (definitive proof npm link worked)
    if (-not (Test-Path $EpostBin)) {
        throw "Verification failed - epost-kit.cmd not found at $EpostBin. Try manually: cd $CliDir && npm link"
    }

    Write-Ok "CLI installed at: $EpostBin"

    # Check PATH (advisory only - do NOT exit on failure)
    $epostCommand = Get-Command epost-kit -ErrorAction SilentlyContinue
    $versionOutput = $null
    if ($epostCommand) {
        $versionOutput = & $epostCommand.Source --version 2>$null
    }

    if ($LASTEXITCODE -eq 0 -and $versionOutput) {
        Write-Ok "Installed: epost-kit $versionOutput"
    } else {
        Write-Warn "epost-kit not yet in PATH for this session."
        $profileLine = Get-ProfilePathUpdateLine -Prefix $NpmPrefix

        if (Test-IsCi) {
            # Non-interactive in CI - just print instructions
            Write-Warn "CI environment detected. Add manually to PATH:"
            Write-Warn "  $profileLine"
        } else {
            # Offer to auto-append to PowerShell profile
            $reply = Read-Host "Add epost-kit to PATH in `$PROFILE? [Y/n]"
            if ($reply -eq "" -or $reply -match "^[Yy]$") {
                Add-ProfilePathEntry -Prefix $NpmPrefix
            } else {
                Write-Warn "Skipped. Add manually to `$PROFILE:"
                Write-Warn "  $profileLine"
            }
        }

        Write-Ok "Installation complete - restart terminal to use epost-kit"
    }

    # ============================================================================
    # 6. Done
    # ============================================================================

    Write-Host ""
    Write-Host "Installation complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor Cyan
    Write-Host "    epost-kit install  # Set up kit in your project"
    Write-Host "    epost-kit doctor   # Check installation health"
    Write-Host ""
    Write-Host "  Note: GitHub CLI (gh) is required to use 'epost-kit install'." -ForegroundColor Yellow
    Write-Host "    Install: https://cli.github.com/ and run: gh auth login"
    Write-Host ""
} catch {
    Write-Err $_.Exception.Message
    exit (Get-ExitCodeFromError -ErrorRecord $_)
} finally {
    if ($null -ne $originalLocation) {
        Set-Location -Path $originalLocation
    }
}
