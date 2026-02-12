@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM ePost-Kit CLI Installation Script for Windows CMD
REM Requires: Node.js >= 18.0.0, npm, gh CLI (authenticated)
REM Compatible with: Windows 10+ CMD (cmd.exe)
REM ============================================================

REM Constants
set REQUIRED_NODE_VERSION=18
set REPO=Klara-copilot/epost_agent_kit
set SUBDIR=epost-agent-kit-cli
set CLI_NAME=epost-kit

REM Display banner
echo.
echo ============================================
echo      ePost-Kit CLI Installer v1.0
echo ============================================
echo.

REM Step 1: Check Node.js
echo [*] Checking Node.js installation...
where node >nul 2>&1
if errorlevel 1 (
    echo [X] Node.js not found
    echo     Download from: https://nodejs.org/
    goto :error
)

for /f "tokens=*" %%i in ('node --version 2^>^&1') do set NODE_VERSION=%%i
set NODE_VERSION=!NODE_VERSION:v=!
for /f "tokens=1 delims=." %%a in ("!NODE_VERSION!") do set NODE_MAJOR=%%a

if !NODE_MAJOR! LSS %REQUIRED_NODE_VERSION% (
    echo [X] Node.js version !NODE_VERSION! is too old
    echo     Required: >= %REQUIRED_NODE_VERSION%.0.0
    echo     Download from: https://nodejs.org/
    goto :error
)
echo [+] Node.js !NODE_VERSION! detected

REM Step 2: Check npm
echo [*] Checking npm installation...
where npm >nul 2>&1
if errorlevel 1 (
    echo [X] npm not found
    echo     Reinstall Node.js with npm included
    goto :error
)

for /f "tokens=*" %%i in ('npm --version 2^>^&1') do set NPM_VERSION=%%i
echo [+] npm !NPM_VERSION! detected

REM Step 3: Check gh CLI
echo [*] Checking GitHub CLI...
where gh >nul 2>&1
if errorlevel 1 (
    echo [X] GitHub CLI (gh) not found
    echo     Install from: https://cli.github.com/
    echo     Then run: gh auth login
    goto :error
)
echo [+] GitHub CLI detected

REM Step 4: Check gh authentication
echo [*] Checking GitHub authentication...
gh auth status >nul 2>&1
if errorlevel 1 (
    echo [X] GitHub CLI not authenticated
    echo     Run: gh auth login
    goto :error
)
echo [+] GitHub authenticated

REM Step 5: Verify org access
echo [*] Verifying access to %REPO%...
gh repo view %REPO% --json name >nul 2>&1
if errorlevel 1 (
    echo [X] Cannot access repository: %REPO%
    echo     Contact your administrator for organization access
    goto :error
)
echo [+] Repository access confirmed

REM Step 6: Create temp directory
set TEMP_DIR=%TEMP%\epost-kit-%RANDOM%%RANDOM%
echo [*] Creating temporary directory: %TEMP_DIR%
mkdir "%TEMP_DIR%" >nul 2>&1
if errorlevel 1 (
    echo [X] Failed to create temp directory
    goto :error
)

REM Step 7: Clone repository
echo [*] Cloning repository...
cd /d "%TEMP_DIR%"
gh repo clone %REPO% >nul 2>&1
if errorlevel 1 (
    echo [X] Failed to clone repository
    goto :error
)
echo [+] Repository cloned

REM Step 8: Navigate to CLI directory
set CLI_DIR=%TEMP_DIR%\epost_agent_kit\%SUBDIR%
if not exist "%CLI_DIR%" (
    echo [X] Directory not found: %SUBDIR%
    goto :error
)

cd /d "%CLI_DIR%"

REM Step 9: Install dependencies
echo [*] Installing dependencies...
call npm install --silent >nul 2>&1
if errorlevel 1 (
    echo [X] npm install failed
    echo     Try running manually: npm install
    goto :error
)
echo [+] Dependencies installed

REM Step 10: Build
echo [*] Building project...
call npm run build >nul 2>&1
if errorlevel 1 (
    echo [X] Build failed
    echo     Try running manually: npm run build
    goto :error
)

REM Verify build output
if not exist "%CLI_DIR%\dist\cli.js" (
    echo [X] Build output not found: dist\cli.js
    goto :error
)
echo [+] Build completed

REM Step 11: Install globally
echo [*] Installing %CLI_NAME% CLI globally...
call npm link >nul 2>&1
if errorlevel 1 (
    echo [!] npm link failed (may require administrator privileges)
    echo     Try running CMD as Administrator, or:
    echo       cd "%CLI_DIR%"
    echo       npm link
    goto :error
)
echo [+] Global installation completed

REM Step 12: Verify installation
echo [*] Verifying installation...
call %CLI_NAME% --version >nul 2>&1
if errorlevel 1 (
    echo [X] Installation verification failed
    echo     Try running: %CLI_NAME% --version
    goto :error
)

for /f "tokens=*" %%i in ('%CLI_NAME% --version 2^>^&1') do set INSTALLED_VERSION=%%i
echo [+] %CLI_NAME% CLI v!INSTALLED_VERSION! installed successfully!

REM Step 13: Cleanup
echo [*] Cleaning up temporary files...
cd /d "%TEMP%"
rmdir /s /q "%TEMP_DIR%" >nul 2>&1
if errorlevel 1 (
    echo [!] Failed to remove temp directory: %TEMP_DIR%
    echo     You can manually delete it later
) else (
    echo [+] Cleanup completed
)

REM Success message
echo.
echo ============================================
echo     Installation Successful!
echo ============================================
echo.
echo Next steps:
echo   1. Run '%CLI_NAME% doctor' to verify installation
echo   2. Run '%CLI_NAME% onboard' to set up your project
echo.
echo For help: %CLI_NAME% --help
echo.

exit /b 0

:error
REM Error handler
echo.
echo [X] Installation failed
echo     For manual installation, see:
echo     https://github.com/%REPO%/tree/main/%SUBDIR%
echo.

REM Cleanup on error
if exist "%TEMP_DIR%" (
    echo [*] Cleaning up temporary files...
    cd /d "%TEMP%"
    rmdir /s /q "%TEMP_DIR%" >nul 2>&1
)

exit /b 1
