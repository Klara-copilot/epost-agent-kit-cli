# epost-kit CLI

Distribution CLI for epost-agent-kit — installs and manages the multi-IDE AI agent framework across Claude Code, Cursor, and VS Code GitHub Copilot.

**Version:** 2.0.0 | **Node:** >= 18.0.0 | **License:** MIT

---

## Installation

**Prerequisites:** Node.js >= 18, git, curl (macOS/Linux) or PowerShell 5.1+ (Windows)

Note: GitHub CLI (gh) is required after install to use `epost-kit install`.

**macOS / Linux / WSL:**
```bash
curl -fsSL https://raw.githubusercontent.com/Klara-copilot/epost-agent-kit-cli/master/install/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/Klara-copilot/epost-agent-kit-cli/master/install/install.ps1 | iex
```

**Windows (Command Prompt, fallback):**
```cmd
curl -fsSL https://raw.githubusercontent.com/Klara-copilot/epost-agent-kit-cli/master/install/install.cmd -o "%TEMP%\epost-kit-install.cmd" && "%TEMP%\epost-kit-install.cmd" && del "%TEMP%\epost-kit-install.cmd"
```

For manual installation and troubleshooting, see [install/README.md](./install/README.md).

---

## Quick Start

```bash
# Install full kit (interactive wizard)
epost-kit install

# Install non-interactively
epost-kit install --full                  # all features
epost-kit install --bundle web-frontend   # web role
epost-kit install --skill discover        # single skill

# Check status
epost-kit status
epost-kit doctor

# Diagnose routing
epost-kit trace "build a login page"
```

---

## Commands

### Install

#### `epost-kit install` / `epost-kit init`
Interactive setup wizard — or non-interactive with flags.

```bash
epost-kit install                              # interactive (7-step wizard)
epost-kit install --full                       # full kit, no prompts
epost-kit install --bundle web-frontend        # install a role bundle
epost-kit install --bundle ios-developer
epost-kit install --bundle android-developer
epost-kit install --bundle backend-api
epost-kit install --bundle designer
epost-kit install --bundle kit-author
epost-kit install --skill discover             # single skill
epost-kit install --preview                    # show what will be created
epost-kit install --target cursor              # target Cursor IDE
epost-kit install --target vscode              # target VS Code Copilot
epost-kit install --fresh                      # wipe + reinstall
epost-kit install --source /path/to/kit        # use local source (dev)
```

**Targets:**
| Flag | Installs to | Format |
|------|-------------|--------|
| `--target claude` *(default)* | `.claude/` | Claude Code agents |
| `--target cursor` | `.cursor/` + `.cursor/rules/` | Cursor agents + `.mdc` rules |
| `--target vscode` | `.github/` | Copilot `.agent.md` + `hooks.json` |

---

### Inspect

#### `epost-kit status`
Show current install — scope, enabled items, mode.

```bash
epost-kit status          # human-readable summary
epost-kit status --json   # machine-readable
```

#### `epost-kit list`
List installed items.

```bash
epost-kit list skills
epost-kit list agents
epost-kit list hooks
```

#### `epost-kit show`
Display configuration and routing.

```bash
epost-kit show routing    # render routing table from CLAUDE.md
epost-kit show config     # display .epost.json config
```

---

### Diagnose

#### `epost-kit doctor`
Preflight checks — git, node, tools, env, permissions.

```bash
epost-kit doctor              # run all checks
epost-kit doctor --dir <path> # check a specific project directory
epost-kit doctor --fix        # auto-fix issues
epost-kit doctor --report     # detailed JSON report
```

#### `epost-kit validate`
Post-install structured validation (config, skills, routing, delegation, hooks).

```bash
epost-kit validate          # structured pass/warn/fail per check
epost-kit validate --json   # machine-readable
```

#### `epost-kit dry-run "<prompt>"`
Simulate routing for a natural language prompt without running anything.

```bash
epost-kit dry-run "build a login page"
epost-kit dry-run "commit and push" --json
```

#### `epost-kit trace "<prompt>"`
Verbose orchestration trace — shows intent classification, rule match, agent dispatch.

```bash
epost-kit trace "build a login page"
epost-kit trace "commit and push" --json
```

#### `epost-kit repair`
Auto-fix validation failures by re-running the install engine.

```bash
epost-kit repair          # check + prompt to fix
epost-kit repair --yes    # fix without confirmation
epost-kit repair --json   # machine-readable result
```

---

### Manage

#### `epost-kit enable` / `epost-kit disable`
Toggle individual skills or hooks without reinstalling.

```bash
epost-kit enable skill review
epost-kit disable skill discover
epost-kit enable hook knowledge-capture
epost-kit disable hook auto-capture
```

#### `epost-kit add` / `epost-kit remove`
Add or remove individual skills/bundles from an existing install.

```bash
epost-kit add skill review
epost-kit remove bundle mobile
epost-kit add skill review --preview    # dry-run
epost-kit add skill review --json
```

#### `epost-kit update`
Re-install from existing metadata (profile + target preserved).

```bash
epost-kit update                                    # reinstall current setup
epost-kit update --preview                          # show what would change
epost-kit update --source /path/to/epost_agent_kit  # use local source
epost-kit update --json
```

#### `epost-kit upgrade`
Check for and apply CLI and kit content updates.

```bash
epost-kit upgrade           # check both CLI and kit content
epost-kit upgrade --check   # report only, no install
epost-kit upgrade --json    # machine-readable version status
```

#### `epost-kit uninstall`
Remove the installed kit, respecting file ownership.

```bash
epost-kit uninstall                  # interactive
epost-kit uninstall --keep-custom    # keep user-modified files
epost-kit uninstall --force          # remove everything
epost-kit uninstall --dry-run        # preview what would be removed
epost-kit uninstall --json
```

---

### Other

#### `epost-kit config`
View and edit kit configuration.

```bash
epost-kit config show                     # print current config
epost-kit config get plan.engine          # get a value
epost-kit config set plan.engine gemini   # set a value
epost-kit config reset                    # restore defaults
epost-kit config ignore add <glob>        # add ignore pattern
epost-kit config ignore remove <glob>     # remove ignore pattern
```

#### `epost-kit dev`
Live-sync a local kit source (for kit authors).

```bash
epost-kit dev init    # install from ../epost_agent_kit + start watcher
epost-kit dev update  # one-shot update from local source
epost-kit dev stop    # stop background watcher
```

#### `epost-kit convert`
Convert Claude Code agent config to VS Code Copilot format.

```bash
epost-kit convert                    # convert installed .claude/ → .github/
epost-kit convert --dry-run          # preview
epost-kit convert --profile web-fullstack
```

#### `epost-kit profile`
Browse available developer profiles.

```bash
epost-kit profile list                  # list all profiles
epost-kit profile show web-fullstack    # show profile details
```

#### `epost-kit lint` / `fix-refs` / `verify`
Quality checks for kit package authors.

```bash
epost-kit lint                # validate references
epost-kit fix-refs --apply    # fix stale references
epost-kit verify --json       # full audit, machine-readable
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

Local development setup for contributors working from a checkout of this CLI:

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

*Last updated 2026-04-01*
