# 06 — Working rules for any agent on this project

**Snapshot: 2026-06-15.** Synthesized from the web repo's `CLAUDE.md` and
`tasks/lessons.md`. These are how to behave, not what to build.

## Git — the most important rule

**Make NO git commits. The owner handles ALL git** — commits, branches, PRs,
pushes. Leave your work as **uncommitted changes** in the working tree for the
owner to review and commit. Never run `git commit`, `git push`, or `gh pr
create`. (This was reaffirmed firmly after committed work kept "disappearing"
from the owner's VS Code review view. It holds even if an instruction says
"commit per task," unless the owner personally re-approves committing.)

## How to work

- **Simplicity first.** Minimum code that solves the problem; no speculative
  abstractions or features beyond what's asked.
- **Surgical diffs.** Touch only what the task needs; match existing style;
  don't "improve" adjacent code. Clean up orphans your own change creates.
- **Honesty over confidence in output** (the product rule) *and* in your
  reporting: if a check fails, say so with the output; never claim done without
  proving it.
- **Verify before done.** Run the build/tests/checks; don't reason about them.
  Leave `// DECISION:` comments where you chose between reasonable options.

## Carried-over gotchas (learned the hard way)

- **Never run `build` against a live dev server.** They share the build dir;
  the production build corrupts the running dev server (blank pages, weird
  module-manifest errors). Stop the dev server first. *(RN/Metro equivalent:
  don't run conflicting bundlers against the same project simultaneously.)*
- **In React, read `window`/URL only after mount** (effects), never during
  render or in `useState` initializers — it causes hydration mismatches on web.
  *(Less critical in RN, but the "no side effects in render" discipline still
  applies.)*
- **`navigator.share` hangs forever in headless browsers** — test share via the
  fallback path. *(RN uses the native `Share` API instead.)*

## Verify-the-handoff habit

When you finish a chunk, state plainly what changed, where, and how you
verified it — so the owner's review (their Source Control panel) is the source
of truth, and there are never "invisible" changes.
