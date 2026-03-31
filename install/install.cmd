@echo off
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

powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERR]  Installation failed. See errors above.
    echo.
    echo Alternative: Clone and build manually:
    echo   gh repo clone Klara-copilot/epost-agent-kit-cli %USERPROFILE%\.epost-kit\cli
    echo   cd %USERPROFILE%\.epost-kit\cli ^&^& npm install ^&^& npm run build ^&^& npm link
    exit /b 1
)

exit /b 0
