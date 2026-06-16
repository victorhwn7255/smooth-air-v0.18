---
name: onboard
description: Onboard a new agent to the SmoothAir project — its mission, the binding rules (no agent git commits, honesty principles, Slock design), and which docs to read for web vs iOS work. Use at the start of any session working on SmoothAir, or whenever an agent needs to get up to speed on the project.
---

# Onboarding — SmoothAir

Snapshot: 2026-06-15. Where this conflicts with the live code, the code wins.

## What SmoothAir is

A turbulence-briefing app for a nervous-flyer family: type a flight number, get
an honest answer to **"Will my flight be bumpy?"** — a smoothness grade,
turbulence zones along the timeline, per-zone detail, a plain-language briefing,
and post-flight feedback. There are two codebases: the **web app** (this repo,
Next.js, deployed to Vercel) and the **iOS app** (`../smooth-air-ios/`, a React
Native / Expo rebuild that reuses the web API as its backend).

## Non-negotiables — read these before you touch anything

- **Git: make NO commits.** The owner handles ALL git (commits, branches, PRs,
  pushes). Leave your work as **uncommitted changes** for them to review. Never
  run `git commit` / `git push` / `gh pr create` — even if a task says
  "commit per step," unless the owner personally re-approves.
- **Honesty principles (the product's soul):** grades not fake-precise scores ·
  probability **bands** in prose ("roughly 1-in-3"), never bare decimals ·
  confidence always visible · failures loud (DEMO banner, never silent stale
  data) · the disclaimer always reachable.
- **Slock design is binding:** 0px corner radius everywhere · 2px solid black
  borders (5px salmon left border on zone cards) · one flat shadow
  `2px 2px 0 0 #000`, zero blur · Space Grotesk (400/700) + Space Mono only ·
  loud yellow chrome / cream content. **WCAG AA contrast is the only thing
  allowed to override the style guide.**
- **Work style:** simplicity first · surgical diffs (touch only what the task
  needs, match existing style) · verify before claiming done (run it, don't
  reason about it) · leave `// DECISION:` comments for judgment calls.

## What to read next (by what you're working on)

**Web app (this repo):**
- `CLAUDE.md` — project rules
- `tasks/lessons.md` — past mistakes & gotchas (read before coding)
- `tasks/change-logs.md` — what's been built and why
- `references/slock-design-system.md` + `slock-theme.json` — design canon
- `design_handoff_smoothair_slock/` — the approved UI redesign + screenshots

**iOS app (`../smooth-air-ios/`):**
- `context/README.md` first, then the numbered docs `01`–`07` — the full
  onboarding pack for the native rebuild
- `../smooth-air-ios/IOS-DESIGN-BRIEF.md` — the native design brief

**Data / API contract (either app):**
- `context/03-API-CONTRACT.md` (endpoints, params, the `Briefing` shape, errors)
- `src/lib/types.ts` — the live shared types (source of truth)

## First actions for a fresh agent

1. Read the relevant docs above for your task.
2. Confirm you understand the **git rule** (you don't commit).
3. Establish a green baseline before changing anything: `npm test` and
   `npm run build` (web repo). **Never run `build` against a live `dev` server**
   — it corrupts the dev server's build dir; stop `dev` first.
4. Make surgical changes, verify them, and leave the result uncommitted with a
   clear note of what changed and how you checked it.
