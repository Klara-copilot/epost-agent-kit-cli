@echo off
setlocal

REM ============================================================================
REM epost-kit CLI installer for Windows (CMD)
REM ============================================================================
REM Downloads and runs install.ps1 from GitHub.
REM
REM Usage:
REM   curl -fsSL https://raw.githubusercontent.com/Klara-copilot/epost-agent-kit-cli/master/install/install.cmd -o "%TEMP%\epost-kit-install.cmd" && "%TEMP%\epost-kit-install.cmd" && del "%TEMP%\epost-kit-install.cmd"
REM
REM Requirements:
REM   - curl (built-in on Windows 10+)
REM   - PowerShell 5.1+
REM   - Node.js >=18.0.0
REM   - git
REM ============================================================================

set "PS1_URL=https://raw.githubusercontent.com/Klara-copilot/epost-agent-kit-cli/master/install/install.ps1"
set "PS1_TEMP=%TEMP%\epost-kit-install.ps1"
set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

echo.
echo epost-kit CLI Installer
echo.

REM Check PowerShell is available
if not exist "%PS_EXE%" (
    echo [ERR]  Windows PowerShell 5.1 not found at "%PS_EXE%"
    exit /b 1
)

REM Check curl is available
where curl >nul 2>&1
if errorlevel 1 (
    echo [ERR]  curl not found. Windows 10+ includes curl by default.
    echo        Download from: https://curl.se/windows/
    exit /b 1
)

echo Downloading installer...
curl -fsSL "%PS1_URL%" -o "%PS1_TEMP%"
if errorlevel 1 (
    echo [ERR]  Failed to download installer from:
    echo        %PS1_URL%
    exit /b 1
)

echo Running PowerShell installer...
echo.
"%PS_EXE%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%PS1_TEMP%"
set "EXIT_CODE=%ERRORLEVEL%"

del "%PS1_TEMP%" >nul 2>&1

if not "%EXIT_CODE%"=="0" (
    echo.
    echo [ERR]  Installation failed. See errors above.
    echo.
    echo Alternative: run PowerShell directly:
    echo   irm https://raw.githubusercontent.com/Klara-copilot/epost-agent-kit-cli/master/install/install.ps1 ^| iex
    exit /b %EXIT_CODE%
)

exit /b 0
