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
# Check Node.js version
node --version  # Should be >= v18.0.0

# Check npm
npm --version

# Check GitHub CLI
gh --version

# Check GitHub authentication
gh auth status
```

If `gh auth status` fails, authenticate with:

```bash
gh auth login
```

## One-Line Installation

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/Klara-copilot/epost-agent-kit-cli/master/install/install.sh | bash
```

### Windows (PowerShell)

```powershell
iwr https://raw.githubusercontent.com/Klara-copilot/epost-agent-kit-cli/master/install/install.ps1 -UseBasicParsing | iex
```

### Windows (Command Prompt)

```cmd
curl -fsSL https://raw.githubusercontent.com/Klara-copilot/epost-agent-kit-cli/master/install/install.cmd -o %TEMP%\install-epost.cmd && %TEMP%\install-epost.cmd
```

## Verify Installation

After installation completes, verify the CLI is working:

```bash
# Check version
epost-kit --version

# Run diagnostics
epost-kit doctor

# Show help
epost-kit --help
```

## Troubleshooting

### Issue: Node.js Version Too Old

**Symptom:**
```
✗ Node.js version 16.x.x is too old
Required: >= 18.0.0
```

**Solution:**
1. Visit [nodejs.org](https://nodejs.org/)
2. Download and install Node.js 18 LTS or newer
3. Verify with `node --version`
4. Re-run the installer

### Issue: GitHub CLI Not Installed

**Symptom:**
```
✗ GitHub CLI (gh) is not installed
```

**Solution:**

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

**Windows (Chocolatey):**
```cmd
choco install gh
```

Or download from [cli.github.com](https://cli.github.com/)

### Issue: Not Authenticated with GitHub

**Symptom:**
```
✗ Not authenticated with GitHub CLI
```

**Solution:**
```bash
# Authenticate with GitHub
gh auth login

# Follow the interactive prompts to:
# 1. Select GitHub.com
# 2. Choose HTTPS or SSH
# 3. Authenticate via browser or token

# Verify authentication
gh auth status
```

### Issue: No Access to Repository

**Symptom:**
```
✗ Cannot access repository: Klara-copilot/epost_agent_kit
```

**Possible Causes:**
1. **Private repository** - Request access from repository administrator
2. **Organization membership** - Ensure you're a member of Klara-copilot organization
3. **Network issues** - Check internet connectivity and GitHub status

**Solution:**
1. Verify you can access the repository in a browser:
   ```
   https://github.com/Klara-copilot/epost_agent_kit
   ```
2. Request organization membership if needed
3. Verify authentication: `gh auth status`
4. Check organization access: `gh org list`

### Issue: Build Failures

**Symptom:**
```
✗ Build failed
npm ERR! code ELIFECYCLE
```

**Possible Causes:**
- Corrupted npm cache
- Missing build dependencies
- Insufficient disk space

**Solution:**

**Clear npm cache:**
```bash
npm cache clean --force
```

**Check disk space:**
```bash
df -h  # Unix/macOS
dir    # Windows
```

**Manual build:**
```bash
# Clone repository
gh repo clone Klara-copilot/epost_agent_kit
cd epost_agent_kit/epost-agent-kit-cli

# Install and build
npm install
npm run build

# Link globally
npm link
# Or with sudo if permissions required
sudo npm link
```

### Issue: Permission Errors During Install

**Symptom:**
```
✗ Failed to install CLI globally
npm ERR! code EACCES
```

**Solution:**

**Option 1: Use sudo (macOS/Linux):**
```bash
sudo npm link
```

**Option 2: Fix npm permissions (recommended):**
```bash
# Configure npm to use user directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH=~/.npm-global/bin:$PATH

# Reload shell configuration
source ~/.bashrc  # or source ~/.zshrc
```

**Option 3: Use package manager permissions fix:**
```bash
# macOS/Linux
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

### Issue: CLI Command Not Found After Install

**Symptom:**
```
epost-kit: command not found
```

**Solution:**

**1. Verify npm global bin directory:**
```bash
npm config get prefix
```

**2. Check PATH includes npm bin:**
```bash
echo $PATH  # Unix/macOS
echo %PATH% # Windows
```

**3. Add npm bin to PATH:**

**macOS/Linux (Bash):**
```bash
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**macOS/Linux (Zsh):**
```bash
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Windows:**
1. Open System Properties → Advanced → Environment Variables
2. Edit user PATH variable
3. Add: `%APPDATA%\npm`
4. Restart terminal

**4. Restart terminal and verify:**
```bash
epost-kit --version
```

### Issue: Installation Hangs or Times Out

**Symptom:**
- Installer stuck on "Cloning repository..."
- Installer stuck on "Installing dependencies..."

**Solution:**

**Check network connectivity:**
```bash
ping github.com
curl -I https://registry.npmjs.org
```

**Use verbose mode for debugging:**
```bash
# Download and run with debug output
curl -fsSL https://raw.githubusercontent.com/Klara-copilot/epost_agent_kit/main/epost-agent-kit-cli/install/install.sh > install.sh
bash -x install.sh
```

**Configure npm proxy (if behind corporate firewall):**
```bash
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
```

## Manual Installation

If the automated installer fails, install manually:

### Step 1: Clone Repository

```bash
gh repo clone Klara-copilot/epost_agent_kit
cd epost_agent_kit/epost-agent-kit-cli
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Build Project

```bash
npm run build
```

### Step 4: Link CLI Globally

```bash
# Try without sudo first
npm link

# If permission error, use sudo
sudo npm link
```

### Step 5: Verify Installation

```bash
epost-kit --version
epost-kit doctor
```

## Uninstallation

To remove ePost-Kit CLI:

```bash
# Unlink global CLI
npm unlink -g @klara-copilot/epost-kit

# Or manually remove link
rm $(which epost-kit)

# Clean up global packages
npm ls -g --depth=0
```

## Next Steps

After successful installation:

1. **Run diagnostics:**
   ```bash
   epost-kit doctor
   ```

2. **Onboard your project:**
   ```bash
   epost-kit onboard
   ```

3. **Explore commands:**
   ```bash
   epost-kit --help
   ```

4. **Initialize in existing project:**
   ```bash
   cd your-project
   epost-kit init
   ```

## Getting Help

- **CLI Help:** `epost-kit --help`
- **Command Help:** `epost-kit <command> --help`
- **Debug Mode:** `epost-kit --verbose <command>`
- **GitHub Issues:** [Report installation issues](https://github.com/Klara-copilot/epost_agent_kit/issues)

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 18.0.0 | 20.x LTS |
| npm | 9.0.0 | Latest |
| RAM | 512MB | 1GB+ |
| Disk Space | 100MB | 500MB |
| OS | macOS 10.15+ / Ubuntu 20.04+ / Windows 10+ | Latest versions |

## Supported Platforms

- **macOS:** 10.15 (Catalina) and newer
- **Linux:** Ubuntu 20.04+, Debian 10+, Fedora 33+, RHEL 8+
- **Windows:** 10, 11 (PowerShell 5.1+ or PowerShell Core 7+)

## Security Considerations

- Installation scripts are served over HTTPS
- GitHub CLI handles authentication securely
- Scripts verify repository access before installation
- Build process runs in temporary directory
- No credentials are stored by installer

## Contributing

For installation script improvements, see [Contributing Guide](../README.md#contributing).

---

**Created by:** Phuong Doan | **Last Updated:** 2026-02-12
