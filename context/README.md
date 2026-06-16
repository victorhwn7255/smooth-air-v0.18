# SmoothAir — iOS build context pack

**Snapshot: 2026-06-15.** The web app keeps evolving; treat anything here as
true *as of this date* and defer to the live code/API when they disagree.

## What this is

You are (or will be) a fresh Claude Code agent helping build the **SmoothAir
iOS app** — a native React Native / Expo rebuild of an existing, deployed web
app. You have no memory of the conversation that built the web app. This pack
is that memory, distilled: read it and you can build the iOS app correctly,
in-voice, without re-deriving the project or reading the whole web codebase.

The iOS app **reuses the web app's deployed API as its backend** and rebuilds
only the UI. So most of what you need is "how the data behaves" and "what the
design/voice is" — both captured here.

## Read in this order

| # | Doc | Read it for |
|---|-----|-------------|
| 1 | `01-PROJECT.md` | What SmoothAir is, who it's for, the honesty principles (binding) |
| 2 | `02-ARCHITECTURE.md` | The build contract: RN/Expo, reuse the API, rebuild only the UI |
| 3 | `03-API-CONTRACT.md` | **The data contract** — endpoints, params, the `Briefing` shape, errors. Build the fetch layer from this. |
| 4 | `04-DOMAIN.md` | What grades / zones / confidence / probability bands mean, and how to present them honestly |
| 5 | `05-DESIGN.md` | Where the design lives (Slock canon + iOS brief) and Slock→RN translation rules |
| 6 | `06-RULES.md` | How to work here — **especially: no agent git commits** |
| 7 | `07-DECISIONS.md` | Product calls already made — don't relitigate these |

**If you only read one doc before coding the data layer, read `03`.**

## Source of truth

This pack *explains and points*; it is not the source of truth for values that
live in code. When in doubt:
- **Data shape & API behavior** → the deployed API + `../smooth-air/src/lib/types.ts`
- **Design** → `../smooth-air/references/` + `IOS-DESIGN-BRIEF.md`
- **Tunable numbers** (thresholds, ramps) → `../smooth-air/src/lib/data/config.ts`

(Paths shown relative to the web repo `smooth-air/`. If this pack was copied
into the iOS project, the web repo is the sibling folder `../smooth-air/`.)
