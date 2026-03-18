# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.


## Project: epost-agent-kit-cli


## Installed Profile: `full`

**Packages**: core, a11y, platform-web, platform-ios, platform-android, platform-backend, kit, design-system, domains

**Installed by**: epost-kit v2.0.0 on 2026-03-18

---

## Claude Code Agent System

### Configuration
- **Agents**: `.claude/agents/` — 15 agents
- **Commands**: `.claude/commands/` — Slash commands
- **Skills**: `.claude/skills/` — Passive knowledge



---


## What This Is

epost_agent_kit is a multi-agent development toolkit for Claude Code. Specialized agents load platform-specific skills on demand and follow shared orchestration rules. The main conversation is always the orchestrator — it dispatches agents via Agent tool and merges results.

---

## Routing

On every user prompt, sense context before acting:
1. Check git state (branch, staged/unstaged files)
2. Detect platform from file extensions (`.tsx`→web, `.swift`→ios, `.kt`→android, `.java`→backend)
3. Check for active plans in `./plans/`
4. Route to best-fit agent based on intent + context

### Prompt Classification

- **Dev task** (action/problem/question about code) → route via intent table below
- **Kit question** ("which agent", "list skills", "our conventions") → `epost-project-manager`
- **External tech question** ("how does React...", "what is gRPC") → `epost-researcher`
- **Conversational** (greetings, opinions, clarifications) → respond directly

### Intent Map

| Intent | Natural prompts (examples) | Routes To |
|--------|---------------------------|-----------|
| Build / Create | "add a button", "implement login", "make X work", "continue the plan" | `epost-fullstack-developer` via Agent tool |
| Fix / Debug | "something is broken", "this crashes", "why does X happen", "it's not working" | `epost-debugger` via Agent tool |
| Plan / Design | "how should we build X", "let's plan", "what's the approach for" | `epost-planner` via Agent tool |
| Research | "how does X work", "best practices for", "compare A vs B" | `epost-researcher` via Agent tool |
| Review / Audit | "check my code", "is this good", "review before merge", "audit this" | `epost-code-reviewer` via Agent tool |
| Test | "add tests", "is this covered", "validate this works" | `epost-tester` via Agent tool |
| Docs | "document this", "update the docs", "write a spec" | `epost-docs-manager` via Agent tool |
| Git | "commit", "push", "create a PR", "ship it", "done" | `epost-git-manager` via Agent tool |
| Onboard | "what is this project", "I'm new", "get started" | `/get-started` skill |

**Fuzzy matching** — classify by verb type when no exact signal word:
- Creation verbs (add, make, create, build, set up) → Build
- Problem verbs (broken, wrong, failing, slow, crash) → Fix/Debug
- Question verbs (how, why, what, should, compare) → Research or Plan
- Quality verbs (check, review, improve, clean up, refactor, simplify) → Review
- Still ambiguous → infer from git context (staged files → Review, active plan → Build, error in prompt → Fix)

**Less common intents**: scaffold → `/bootstrap`, convert → `/convert`, journal → `epost-journal-writer`, MCP → `epost-mcp-manager`, design/UI → `epost-muji`

### Routing Rules

1. Explicit slash command → execute directly, skip routing
2. TypeScript/build errors in context → route to Fix first
3. Staged files → boost Review or Git intent
4. Active plan exists → boost Build ("continue" → cook)
5. Merge conflicts → suggest fix/resolve
6. Ambiguous after context boost → ask user (max 1 question)
7. All delegations follow `core/references/orchestration.md`

---

## Orchestration

**Single intent** → spawn the matched agent directly via Agent tool.

**Multi-intent** ("plan and build X", "research then implement") → spawn `epost-project-manager`, which decomposes and delegates sequentially.

**Parallel work** (3+ independent tasks, cross-platform) → use `subagent-driven-development` skill from main context.

**Subagent constraint**: Subagents cannot spawn further subagents. Multi-agent workflows must be orchestrated from the main conversation. Skills that need multi-agent dispatch must NOT use `context: fork`.

**Hybrid audits** (klara-theme code): Orchestrated from main context via `/audit` skill. Dispatch muji (Template A+) first, then code-reviewer with muji's report. Never free-form prompt muji — use structured delegation templates from `audit/references/delegation-templates.md`.

**Escalation**: 3 consecutive failures → surface findings to user. Ambiguous request → ask 1 question max.

See `core/references/orchestration.md` for full protocol.

---


## Accessibility (WCAG 2.1 AA)

### Agent
- `epost-a11y-specialist` — Multi-platform accessibility orchestrator (iOS, Android, Web)

### Skills
- `a11y` — Cross-platform WCAG 2.1 AA foundation (POUR, scoring)
- `ios-a11y` — iOS (VoiceOver, UIKit-primary, SwiftUI) *(extends a11y)*
- `android-a11y` — Android (Compose, Views/XML, TalkBack) *(extends a11y)*
- `web-a11y` — Web (ARIA, keyboard, screen readers) *(extends web/\*)*

---


## Web Platform

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS + SCSS
- **UI Components**: shadcn/ui or klara-theme
- **Testing**: Jest + React Testing Library, Playwright
- **State**: Redux Toolkit + Redux Persist
- **Containerization**: Docker + Docker Compose

### Skills
- `web-frontend` — React components, hooks, Redux Toolkit dual-store, composition patterns
- `web-nextjs` — Next.js 14 App Router, routing, middleware, server actions, performance
- `web-api-routes` — FetchBuilder HTTP client, caller patterns, API constants
- `web-i18n` — next-intl configuration, translation patterns, locale routing
- `web-auth` — NextAuth + Keycloak, session management, feature switches
- `web-testing` — Jest + RTL unit tests, Playwright E2E, test patterns
- `web-modules` — B2B module integration

---


## iOS Platform

### Tech Stack
- **Language**: Swift 6
- **UI**: SwiftUI + UIKit
- **Minimum Target**: iOS 18+
- **Testing**: XCTest, XCUITest
- **Build**: Xcode, XcodeBuildMCP

### Skills
- `ios-development` — Swift 6, SwiftUI/UIKit patterns, Xcode builds
- `ios-ui-lib` — iOS theme SwiftUI components and design tokens
- `ios-rag` — iOS codebase vector search

---


## Android Platform

### Tech Stack
- **Language**: Kotlin
- **UI**: Jetpack Compose
- **Architecture**: MVVM, Hilt DI
- **Database**: Room
- **Networking**: Retrofit
- **Testing**: JUnit, Espresso, Compose UI Testing
- **Build**: Gradle (Kotlin DSL)

### Skills
- `android-development` — Kotlin, Jetpack Compose, Hilt DI patterns
- `android-ui-lib` — Android theme Compose components and design tokens

---


## Backend Platform

### Tech Stack
- **Language**: Java 8
- **Platform**: Jakarta EE 8 / WildFly 26.1
- **REST**: JAX-RS via RESTEasy
- **CDI/EJB**: Jakarta CDI + EJB
- **ORM**: Hibernate 5.6
- **Databases**: PostgreSQL + MongoDB
- **Build**: Maven
- **Microprofile**: Eclipse MicroProfile 4.1
- **Testing**: JUnit 4, Mockito, PowerMock, Arquillian
- **Coverage**: JaCoCo
- **Quality**: SonarQube
- **Artifacts**: GCP Artifact Registry

### Conventions
- WAR packaging deployed to WildFly
- `@Inject`, `@EJB`, `@Path` annotations (Jakarta EE, not Spring)
- `persistence.xml` for JPA configuration
- Maven profiles for SonarQube analysis

### Skills
- `backend-javaee` — Jakarta EE patterns, WildFly deployment, Maven builds
- `backend-databases` — PostgreSQL + MongoDB persistence

---


## Kit Authoring Tools

### Skills
- `kit-agents` — Agent ecosystem reference and naming conventions
- `kit-agent-development` — Agent frontmatter, system prompts, triggering patterns
- `kit-skill-development` — Skill authoring, progressive disclosure, validation
- `kit-hooks` — Hook event types, I/O contract, creation workflow
- `kit-cli` — epost-kit CLI development (Commander.js, TypeScript)

---


## Design System

### Agent
- `epost-muji` — MUJI UI library agent for design system development, component knowledge, Figma-to-code pipeline

### Skills
- `figma` — Figma MCP tool patterns and design token extraction (all platforms)
- `design-tokens` — Vien 2.0 design system variable architecture (1,059 variables, 42 collections)
- `ui-lib-dev` — UI library development pipeline (plan, implement, audit, fix, document); integration guidance via `references/guidance.md`

---


## Business Domains

### B2B Domain
B2B modules: Monitoring, Communities, Inbox, Smart Send, Composer, Archive, Contacts, Organization, Smart Letter.

### B2C Domain
Consumer mobile application patterns for iOS and Android.

---



## Guidelines

### Decision Authority
**Auto-execute**: dependency installs, lint fixes, documentation formatting
**Ask first**: deleting files, modifying production configs, introducing new dependencies, multi-file refactors, changing API contracts

### Code Changes
- Verify environment state before operations
- Use relative paths from project root
- Prefer existing patterns over introducing new conventions
- Conservative defaults: safety over speed, clarity over cleverness

### Core Rules
See `.claude/skills/core/SKILL.md` for operational boundaries.

## Related Documents
- `.claude/skills/core/SKILL.md` — Operational rules and boundaries

