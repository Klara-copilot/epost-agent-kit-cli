<#
.SYNOPSIS
    ePost-Kit CLI Installation Script for Windows PowerShell

.DESCRIPTION
    Installs ePost-Kit CLI from private GitHub repository (Klara-copilot/epost_agent_kit)
    Requires: Node.js >= 18.0.0, npm, gh CLI (authenticated)

.NOTES
    Compatible with PowerShell 5.1+ and PowerShell 7+
    Requires GitHub authentication via gh CLI
#>

# Error handling
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# Color output functions
function Write-Success { param([string]$Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Error { param([string]$Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Warning { param([string]$Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }
function Write-Info { param([string]$Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }

# Version comparison function
function Compare-Version {
    param(
        [string]$Version,
        [string]$RequiredVersion
    )

    try {
        $v1 = [version]::new($Version)
        $v2 = [version]::new($RequiredVersion)
        return $v1 -ge $v2
    }
    catch {
        Write-Warning "Version comparison failed for $Version vs $RequiredVersion"
        return $false
    }
}

# Parse version from command output
function Get-CleanVersion {
    param([string]$VersionString)

    if ($VersionString -match 'v?(\d+\.\d+\.\d+)') {
        return $matches[1]
    }
    return $null
}

# Main installation function
function Install-EPostKit {
    Write-Info "Starting ePost-Kit CLI installation..."
    Write-Host ""

    # Check execution policy
    $executionPolicy = Get-ExecutionPolicy -Scope CurrentUser
    if ($executionPolicy -eq 'Restricted') {
        Write-Warning "PowerShell execution policy is Restricted"
        Write-Info "Run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser"
        exit 1
    }

    # Step 1: Check Node.js
    Write-Info "Checking Node.js installation..."
    try {
        $nodeVersionOutput = node --version 2>&1
        if ($LASTEXITCODE -ne 0) { throw }

        $nodeVersion = Get-CleanVersion $nodeVersionOutput
        if (-not $nodeVersion) {
            Write-Error "Failed to parse Node.js version"
            exit 1
        }

        if (Compare-Version $nodeVersion "18.0.0") {
            Write-Success "Node.js $nodeVersion detected"
        }
        else {
            Write-Error "Node.js >= 18.0.0 required (found $nodeVersion)"
            Write-Info "Download from: https://nodejs.org/"
            exit 1
        }
    }
    catch {
        Write-Error "Node.js not found"
        Write-Info "Download from: https://nodejs.org/"
        exit 1
    }

    # Step 2: Check npm
    Write-Info "Checking npm installation..."
    try {
        $npmVersion = npm --version 2>&1
        if ($LASTEXITCODE -ne 0) { throw }
        Write-Success "npm $npmVersion detected"
    }
    catch {
        Write-Error "npm not found (should come with Node.js)"
        exit 1
    }

    # Step 3: Check gh CLI
    Write-Info "Checking GitHub CLI..."
    try {
        $ghVersionOutput = gh --version 2>&1
        if ($LASTEXITCODE -ne 0) { throw }
        Write-Success "GitHub CLI detected"
    }
    catch {
        Write-Error "GitHub CLI (gh) not found"
        Write-Info "Install from: https://cli.github.com/"
        Write-Info "Then run: gh auth login"
        exit 1
    }

    # Step 4: Check gh authentication
    Write-Info "Checking GitHub authentication..."
    try {
        $ghAuthOutput = gh auth status 2>&1
        if ($LASTEXITCODE -ne 0) { throw }
        Write-Success "GitHub authenticated"
    }
    catch {
        Write-Error "GitHub CLI not authenticated"
        Write-Info "Run: gh auth login"
        exit 1
    }

    # Step 5: Verify org access
    Write-Info "Verifying access to Klara-copilot organization..."
    try {
        $repoCheck = gh repo view Klara-copilot/epost_agent_kit --json name 2>&1
        if ($LASTEXITCODE -ne 0) { throw }
        Write-Success "Repository access confirmed"
    }
    catch {
        Write-Error "Cannot access Klara-copilot/epost_agent_kit"
        Write-Info "Contact your administrator for organization access"
        exit 1
    }

    # Step 6: Create temp directory
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $tempDir = Join-Path $env:TEMP "epost-kit-$timestamp"

    Write-Info "Creating temporary directory: $tempDir"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    try {
        # Step 7: Clone repository
        Write-Info "Cloning repository..."
        Push-Location $tempDir

        try {
            gh repo clone Klara-copilot/epost_agent_kit 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Failed to clone repository"
                exit 1
            }
            Write-Success "Repository cloned"

            # Step 8: Navigate to CLI directory
            $cliDir = Join-Path $tempDir "epost_agent_kit\epost-agent-kit-cli"
            if (-not (Test-Path $cliDir)) {
                Write-Error "Directory not found: epost-agent-kit-cli"
                exit 1
            }

            Set-Location $cliDir

            # Step 9: Install dependencies
            Write-Info "Installing dependencies..."
            npm install --silent 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Error "npm install failed"
                Write-Warning "Try running manually: npm install"
                exit 1
            }
            Write-Success "Dependencies installed"

            # Step 10: Build
            Write-Info "Building project..."
            npm run build --silent 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Error "Build failed"
                Write-Warning "Try running manually: npm run build"
                exit 1
            }

            # Verify build output
            $distFile = Join-Path $cliDir "dist\cli.js"
            if (-not (Test-Path $distFile)) {
                Write-Error "Build output not found: dist\cli.js"
                exit 1
            }
            Write-Success "Build completed"

            # Step 11: Install globally
            Write-Info "Installing ePost-Kit CLI globally..."

            try {
                npm link 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    Write-Warning "npm link failed (may require administrator privileges)"
                    Write-Info "Try running PowerShell as Administrator, or:"
                    Write-Info "  cd `"$cliDir`""
                    Write-Info "  npm link"
                    exit 1
                }
                Write-Success "Global installation completed"
            }
            catch {
                Write-Warning "Installation may require administrator privileges"
                Write-Info "Run PowerShell as Administrator and try again"
                exit 1
            }

            # Step 12: Verify installation
            Write-Info "Verifying installation..."
            Pop-Location

            try {
                $installedVersion = epost-kit --version 2>&1
                if ($LASTEXITCODE -ne 0) { throw }
                Write-Success "ePost-Kit CLI v$installedVersion installed successfully!"
            }
            catch {
                Write-Error "Installation verification failed"
                Write-Warning "Try running: epost-kit --version"
                exit 1
            }
        }
        finally {
            # Return to original location
            if ((Get-Location).Path -ne $tempDir) {
                Pop-Location
            }
        }
    }
    finally {
        # Step 13: Cleanup
        Write-Info "Cleaning up temporary files..."
        try {
            if (Test-Path $tempDir) {
                Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
                Write-Success "Cleanup completed"
            }
        }
        catch {
            Write-Warning "Failed to remove temp directory: $tempDir"
            Write-Info "You can manually delete it later"
        }
    }

    # Success message
    Write-Host ""
    Write-Success "Installation complete!"
    Write-Host ""
    Write-Info "Next steps:"
    Write-Host "  1. Run 'epost-kit doctor' to verify installation"
    Write-Host "  2. Run 'epost-kit onboard' to set up your project"
    Write-Host ""
    Write-Info "For help: epost-kit --help"
    Write-Host ""
}

# Execute installation
try {
    Install-EPostKit
    exit 0
}
catch {
    Write-Host ""
    Write-Error "Installation failed: $_"
    Write-Info "For manual installation, see: https://github.com/Klara-copilot/epost_agent_kit/tree/main/epost-agent-kit-cli"
    exit 1
}
