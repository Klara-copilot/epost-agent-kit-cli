# epost-kit CLI

Distribution CLI for epost-agent-kit — installs and manages the multi-IDE AI agent framework across Claude Code, Cursor, and VS Code GitHub Copilot.

**Version:** 2.0.0 | **Node:** >= 18.0.0 | **License:** MIT

---

## Installation

**Prerequisite:** GitHub CLI authenticated (`gh auth login`)

**macOS / Linux:**
```bash
gh api repos/Klara-copilot/epost-agent-kit-cli/contents/install/install.sh --jq .content | base64 -d | bash
```

**Windows (PowerShell):**
```powershell
$script = gh api repos/Klara-copilot/epost-agent-kit-cli/contents/install/install.ps1 --jq .content | base64 -d; Invoke-Expression $script
```

See [install/README.md](./install/README.md) for manual installation and troubleshooting.

---

## Quick Start

```bash
# Set up kit in your project (interactive)
epost-kit init

# Re-install with existing config (no prompts)
epost-kit update

# Check installation health
epost-kit doctor

# Customize settings
epost-kit config
```

---

## Commands

### `epost-kit init`
Interactive setup wizard. Installs agents, skills, and hooks into your project.

```bash
epost-kit init                                        # interactive
epost-kit init --profile web-fullstack                # skip profile prompt
epost-kit init --target cursor                        # target Cursor IDE
epost-kit init --target vscode                        # target VS Code Copilot
epost-kit init --packages core,platform-web           # explicit packages
epost-kit init --fresh                                # wipe + reinstall
epost-kit init --source /path/to/epost_agent_kit      # use local source (dev)
epost-kit init --dry-run                              # preview only
```

**Targets:**
| Flag | Installs to | Format |
|------|-------------|--------|
| `--target claude` *(default)* | `.claude/` | Claude Code agents |
| `--target cursor` | `.cursor/` + `.cursor/rules/` | Cursor agents + `.mdc` rules |
| `--target vscode` | `.github/` | Copilot `.agent.md` + `hooks.json` |

### `epost-kit update`
Re-installs from existing metadata (profile + target preserved, no prompts).

```bash
epost-kit update                                      # reinstall current setup
epost-kit update --source /path/to/epost_agent_kit    # use local source
```

### `epost-kit upgrade`
Upgrade the CLI itself to the latest version.

```bash
epost-kit upgrade           # upgrade CLI
epost-kit upgrade --check   # check if upgrade available
```

### `epost-kit config`
Interactive TUI to view and edit kit configuration.

```bash
epost-kit config                          # interactive panel
epost-kit config show                     # print current config
epost-kit config get plan.engine          # get a value
epost-kit config set plan.engine gemini   # set a value
epost-kit config reset                    # restore defaults
epost-kit config ignore                   # show ignore patterns
epost-kit config ignore add <glob>        # add ignore pattern
epost-kit config ignore remove <glob>     # remove ignore pattern
```

### `epost-kit doctor`
Health checks for installation integrity and environment.

```bash
epost-kit doctor            # run all checks
epost-kit doctor --fix      # auto-fix issues
epost-kit doctor --report   # detailed JSON report
```

### `epost-kit dev`
Live-sync a local kit source into your project (for kit authors).

```bash
epost-kit dev init    # install from ../epost_agent_kit + start watcher
epost-kit dev update  # one-shot update from local source
epost-kit dev stop    # stop background watcher
epost-kit dev         # start watcher only (requires prior init)
```

### `epost-kit uninstall`
Remove the installed kit, respecting file ownership.

```bash
epost-kit uninstall                 # interactive
epost-kit uninstall --keep-custom   # keep user-modified files
epost-kit uninstall --force         # remove everything
```

### `epost-kit profile`
Browse available developer profiles.

```bash
epost-kit profile list                  # list all profiles
epost-kit profile show web-fullstack    # show profile details
```

### `epost-kit package`
Manage individual packages.

```bash
epost-kit package list          # list available packages
epost-kit package add <name>    # add to existing install
epost-kit package remove <name> # remove from install
```

### `epost-kit versions`
List available kit releases.

```bash
epost-kit versions              # latest 10 releases
epost-kit versions --limit 20
epost-kit versions --pre        # include pre-releases
```

### `epost-kit lint` / `fix-refs` / `verify`
Quality checks for kit package authors.

```bash
epost-kit lint                # validate references in installed files
epost-kit fix-refs            # preview stale reference fixes
epost-kit fix-refs --apply    # apply fixes
epost-kit verify              # full audit: integrity + lint + health + deps
epost-kit verify --strict     # fail on warnings
epost-kit verify --json       # machine-readable output
```

---

## Global Options

```
--verbose    Enable debug logging
--yes        Skip all prompts (CI mode)
--help       Show command help
--version    Show CLI version
```

---

## Configuration

Kit config is stored in `<installDir>/.epost-kit.json`. Edit via `epost-kit config` or directly:

```json
{
  "target": "claude",
  "profile": "web-fullstack",
  "plan": {
    "engine": "gemini",
    "dateFormat": "YYMMDD-HHmm"
  }
}
```

**Environment variables:**
| Variable | Purpose |
|----------|---------|
| `EPOST_KIT_TARGET` | Override IDE target |
| `EPOST_KIT_PROFILE` | Override profile |
| `EPOST_KIT_REGISTRY` | Override package registry URL |
| `EPOST_RESEARCH_ENGINE` | Override research engine (`websearch` \| `gemini` \| `perplexity`) |

**API keys** (stored in `<installDir>/.env`, never committed):
- `GEMINI_API_KEY` — for Gemini research engine

---

## Multi-IDE Support

| Feature | Claude Code | Cursor | VS Code Copilot |
|---------|:-----------:|:------:|:---------------:|
| Agents | ✓ `.md` | ✓ `.md` (5 fields) | ✓ `.agent.md` |
| Skills | ✓ | ✓ | ✓ |
| Hooks | ✓ (all events) | ✓ (settings.json) | ✓ (SessionStart, Stop) |
| Rules/Context | CLAUDE.md | CLAUDE.md + `.cursor/rules/*.mdc` | `copilot-instructions.md` |
| Agent handoffs | ✓ | ✗ | ✓ |
| Compatibility report | — | ✓ (warns on dropped fields) | ✓ (warns on dropped fields) |

---

## Development

```bash
git clone <repo>
cd epost-agent-kit-cli
npm install && npm run build && npm link

npm test           # run tests
npm run dev        # watch mode
npm run typecheck  # type check only
```

**Use local kit source during development:**
```bash
epost-kit init --source /path/to/epost_agent_kit
# or
epost-kit dev init
```

---

## Troubleshooting

**"GitHub authentication required"**
```bash
gh auth login && gh auth token
```

**Update fails with combined profile name**
Combined profiles (`web-fullstack+web-ui-lib`) are supported — `update` expands them automatically.

**VS Code hooks not firing**
VS Code only supports `SessionStart` and `Stop` hook events. Other events (UserPromptSubmit, PreToolUse, etc.) are Claude Code extensions and silently fail in VS Code — this is expected.

**Debug mode**
```bash
epost-kit --verbose <command>
```

---

## Architecture

```
src/
├── cli.ts                    # entry point, command registration
├── commands/                 # thin orchestrators (init, update, config, dev…)
├── domains/
│   ├── config/               # config loading, merging, ignore patterns
│   ├── installation/         # target adapters (Claude, Cursor, VS Code)
│   ├── packages/             # package resolver, profile loader, YAML parser
│   ├── health-checks/        # doctor checks
│   └── validation/           # lint, fix-refs
├── services/                 # file operations, template engine
├── shared/                   # logger, file-system utils, constants
└── types/                    # TypeScript interfaces
```

**Key design decisions:**
- Adapter pattern for multi-IDE output (ClaudeAdapter / CursorAdapter / CopilotAdapter)
- Custom YAML parser — no `js-yaml` dependency
- File ownership tracking via SHA256 checksums (`.epost-metadata.json`)
- Topological sort (Kahn's algorithm) for package dependency ordering

---

*Last updated 2026-03-09*
