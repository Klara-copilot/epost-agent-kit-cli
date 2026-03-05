@echo off
REM ============================================================================
REM epost_agent_kit installer for Windows (CMD)
REM ============================================================================
REM Downloads and installs the latest release from GitHub.
REM
REM Usage:
REM   install.cmd
REM
REM Requirements:
REM   - Node.js >=18.0.0
REM   - PowerShell 5.1+ (used internally for download)
REM ============================================================================

echo.
echo epost_agent_kit Installer
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
    echo Alternative: Install via npm directly:
    echo   npm install -g epost-agent-kit-cli
    echo   npx epost-agent-kit-cli init
    exit /b 1
)

exit /b 0
