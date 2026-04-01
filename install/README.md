# ePost-Kit CLI Installation Guide

Complete installation instructions for macOS, Linux, and Windows platforms.

## Prerequisites

Before installing ePost-Kit CLI, ensure you have:

- **Node.js >= 18.0.0** - [Download from nodejs.org](https://nodejs.org/)
- **npm** - Included with Node.js installation
- **GitHub CLI (gh)** - [Installation instructions](https://cli.github.com/)
- **GitHub Authentication** - Active GitHub session with repository access

### Verify Prerequisites

```bash
node --version  # Should be >= v18.0.0
npm --version
gh --version
gh auth status
```

If `gh auth status` fails:

```bash
gh auth login
```

## Supported Installation Methods

**Note:** This repository is private. You must authenticate first: `gh auth login`
These are the documented/supported install paths for this CLI today; npm-registry global install is not documented here as a supported primary entrypoint.

Recommended:
1. macOS / Linux one-line installer
2. Windows PowerShell one-line installer

Fallback:
3. Windows Command Prompt installer wrapper

Manual:
4. Clone, build, and link locally

### macOS / Linux

```bash
gh api repos/Klara-copilot/epost-agent-kit-cli/contents/install/install.sh --jq .content | base64 -d | bash
```

### Windows (PowerShell)

```powershell
$script = gh api repos/Klara-copilot/epost-agent-kit-cli/contents/install/install.ps1 --jq '.content | @base64d'; Invoke-Expression $script
```

### Windows (Command Prompt)

```cmd
gh api repos/Klara-copilot/epost-agent-kit-cli/contents/install/install.cmd --jq .content > %TEMP%\install-epost-b64.txt && certutil -decode %TEMP%\install-epost-b64.txt %TEMP%\install-epost.cmd && %TEMP%\install-epost.cmd
```

Note: `install.cmd` is a thin wrapper that delegates to `install.ps1`.

All installer entrypoints use the same underlying flow:
1. Clone the CLI repo to `~/.epost-kit/cli/` (or update it with `git pull` if already present)
2. Build from source with `npm install && npm run build`
3. Link the CLI globally with `npm link`
4. Verify the install via `epost-kit --version`

Re-running the installer on an existing installation does a `git pull` + rebuild instead of re-cloning.

## Verify Installation

```bash
epost-kit --version
epost-kit doctor
epost-kit --help
```

## Directory Layout

```
~/.epost-kit/
├── cli/        ← cloned CLI repo (enables git pull upgrades)
├── packages/   ← kit data (managed by epost-kit init)
├── profiles/   ← profiles (managed by epost-kit init)
└── cache/      ← release cache
```

## Upgrading

```bash
epost-kit upgrade
```

This does `git pull origin master` + `npm install` + `npm run build` inside `~/.epost-kit/cli/`.

Options:
- `--check` — report if update available, don't install
- `--yes` — skip confirmation prompt

**Manual upgrade:**

```bash
cd ~/.epost-kit/cli && git pull origin master && npm install && npm run build
```

## Manual Installation

If the automated installer fails:

Use this if the scripted installer fails or if you want a transparent local install flow.

```bash
# Clone to persistent location
gh repo clone Klara-copilot/epost-agent-kit-cli ~/.epost-kit/cli -- --branch master
cd ~/.epost-kit/cli

# Build
npm install
npm run build

# Link globally (add sudo if permission error)
npm link
```

## Troubleshooting

### Issue: GitHub CLI Not Installed

```
[ERR]  GitHub CLI (gh) not installed
```

**macOS (Homebrew):**
```bash
brew install gh
```

**Ubuntu/Debian:**
```bash
sudo apt install gh
```

**Windows (Winget):**
```cmd
winget install GitHub.cli
```

Or download from [cli.github.com](https://cli.github.com/)

### Issue: Not Authenticated

```
[ERR]  Not authenticated with GitHub CLI
```

```bash
gh auth login
gh auth status
```

### Issue: No Access to Repository

```
[ERR]  Clone failed. Check your GitHub access to Klara-copilot/epost-agent-kit-cli
```

1. Verify you're a member of the Klara-copilot organization
2. Check authentication: `gh auth status`
3. Check org access: `gh org list`

### Issue: Node.js Version Too Old

```
[ERR]  Node.js >= 18 required
```

Download Node.js 18 LTS or newer from [nodejs.org](https://nodejs.org/).

### Issue: Permission Error on npm link

```
[ERR]  npm link failed
```

Run manually with sudo:
```bash
cd ~/.epost-kit/cli && sudo npm link
```

Or fix npm prefix permissions:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
```

### Issue: CLI Command Not Found After Install

```
epost-kit: command not found
```

Check npm global bin is in PATH:
```bash
npm config get prefix
# Add <prefix>/bin to your PATH
```

Restart your terminal after updating PATH.

### Issue: Build Failures

```
[ERR]  npm run build failed
```

Clear npm cache and retry:
```bash
npm cache clean --force
cd ~/.epost-kit/cli && npm install && npm run build
```

## Uninstallation

```bash
# Remove global link
npm unlink -g epost-kit

# Remove install directory
rm -rf ~/.epost-kit/cli
```

## Next Steps

After installation:

```bash
epost-kit init      # Set up kit in your project
epost-kit doctor    # Check installation health
epost-kit --help    # Explore commands
```

## System Requirements

| Requirement | Minimum |
|-------------|---------|
| Node.js | 18.0.0 |
| npm | 9.0.0 |
| OS | macOS 10.15+ / Ubuntu 20.04+ / Windows 10+ |

---

**Last Updated:** 2026-03-31
