@echo off
setlocal
REM ============================================================================
REM epost-kit CLI installer for Windows (CMD)
REM ============================================================================
REM Delegates to install.ps1 for full Windows support.
REM
REM Usage:
REM   install.cmd
REM
REM Requirements:
REM   - GitHub CLI (gh), authenticated
REM   - Node.js >=18.0.0
REM   - PowerShell 5.1+ (used internally)
REM ============================================================================

echo.
echo epost-kit CLI Installer
echo.
echo NOTE: This installer delegates to install.ps1 for full Windows support.
echo.
echo Running PowerShell installer...
echo.

set "PS_SCRIPT=%~dp0install.ps1"
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

if not exist "%PS_SCRIPT%" (
    echo.
    echo [ERR]  PowerShell installer not found: "%PS_SCRIPT%"
    echo.
    exit /b 1
)

if not exist "%PS_EXE%" (
    echo.
    echo [ERR]  Windows PowerShell 5.1 not found at "%PS_EXE%"
    echo.
    exit /b 1
)

"%PS_EXE%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%"
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
    echo.
    echo [ERR]  Installation failed. See errors above.
    echo.
    echo Alternative: Clone and build manually:
    echo   gh repo clone Klara-copilot/epost-agent-kit-cli %USERPROFILE%\.epost-kit\cli
    echo   cd %USERPROFILE%\.epost-kit\cli ^&^& npm install ^&^& npm run build ^&^& npm link
    exit /b %EXIT_CODE%
)

exit /b 0
