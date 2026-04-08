# Project Overview - PDR

## Project Definition

**Project Name:** epost-agent-kit-cli
**Project Type:** CLI Tool (Command-Line Interface)
**Version:** 0.0.1 (npm: @aavn/epost-kit)

## Purpose

Command-line interface for managing ePost Agent Kit installations, packages, and configurations across Claude Code, Cursor, and GitHub Copilot platforms. Distributed as scoped npm package `@aavn/epost-kit` via npmjs.com.

## Problem Statement

Developers need a unified way to manage AI agent configurations across multiple platforms. Each platform (Claude Code, GitHub Copilot, Cursor) has its own configuration format, commands, and agent/skill system. This creates friction when:
- Switching between AI assistants
- Sharing team configurations
- Maintaining consistent development environments
- Onboarding new team members

## Goals

1. **Unified Package Management** - Modular installation with automatic dependency resolution
2. **Profile System** - Team-based configurations with auto-detection
3. **Smart Merge** - Intelligent file tracking prevents data loss during updates
4. **Dev Watcher** - Live-sync for kit designers during development
5. **Health Checks** - Environment verification with auto-fix capabilities
6. **Multi-Platform Support** - Claude, Cursor, and GitHub Copilot

## Commands (32 total, 6 categories)

### Project Setup
- `new` - Create new project from template
- `init` - Initialize kit in existing project
- `onboard` - Guided setup wizard

### Health & Validation
- `doctor` - Health checks with auto-fix
- `validate` - Structured validation (config, skills, routing, hooks)
- `lint` - Validate references and standards
- `verify` - Full audit of installation
- `repair` - Auto-fix validation failures

### Status & Display
- `status` - Show install scope and configuration
- `show` - Display routing table or config
- `list` - List installed items (skills, agents, hooks)
- `versions` - Available version information
- `roles` - List available roles
- `profile` - Browse and inspect developer profiles

### Package Management
- `add` - Add skill or bundle to install
- `remove` - Remove skill or bundle
- `package` - Manage packages
- `update` - Re-install from existing metadata
- `upgrade` - Check and apply updates
- `uninstall` - Remove with ownership awareness

### Development
- `dev` - Watch and live-sync (kit authors)
- `dev-spawn` - Spawn development processes
- `browse` - TUI marketplace browser
- `proposals` - List and apply proposals

### Configuration & Tools
- `config` - View and edit configuration
- `dry-run-command` - Simulate routing without execution
- `trace` - Verbose orchestration trace
- `fix-refs` - Fix stale references
- `enable-disable` - Toggle skills/hooks
- `workspace` - Generate workspace CLAUDE.md
- `convert` - Convert Claude Code → GitHub Copilot
- `init-wizard` - Interactive setup

## Technical Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript 5.x (strict mode) |
| Runtime | Node.js >= 18.0.0 |
| Modules | ESM |
| CLI Framework | cac (Command and Conquer) |
| Prompts | @inquirer/prompts |
| Testing | Vitest 2.1.8 |

## Target Users

- Individual developers using Claude Code, GitHub Copilot, or Cursor
- Development teams needing consistent AI agent configurations
- Platform engineers maintaining agent kits

## Success Metrics

- 103 tests passing (100%)
- CLI startup < 200ms
- Full install (5-10 packages) < 30s
- Profile detection < 5s
- Health checks < 10s

## Non-Goals

- GUI/IDE integration (CLI-only)
- Direct AI model interaction
- Code execution/terminal commands

## Roadmap

See [Project Roadmap](./project-roadmap.md) for detailed phases and milestones.
