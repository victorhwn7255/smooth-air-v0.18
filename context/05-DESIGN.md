# 05 — Design: where it lives & how to translate it to native

**Snapshot: 2026-06-15.** The visual brand is **decided** — do not reinvent it.
Your job is to translate the Slock design language to native iOS.

## Where the design lives (read these)

- **Slock canon** (the binding design system): `../smooth-air/references/slock-design-system.md`
  and `../smooth-air/references/slock-theme.json` (exact token values).
- **The approved web redesign** (component-by-component, exact copy, all states,
  22 screenshots): `../smooth-air/design_handoff_smoothair_slock/`.
- **The iOS design brief** (what to build natively, the decisions to resolve):
  `smooth-air-ios/IOS-DESIGN-BRIEF.md`.
- **The Design agent's iOS output** — *add the path here once it exists;* that
  becomes the primary screen-by-screen spec for the build.

## Binding Slock rules (summary — canon wins on detail)

- **0px corner radius everywhere.** Only a status dot / toggle may be round.
- **2px solid black borders** on every surface; **5px salmon left border** on
  zone cards. No 1px, no gray borders.
- **One flat shadow:** `2px 2px 0 0 #000` — hard offset, **zero blur**.
- **Fonts:** Space Grotesk (400 / 700) + Space Mono only. Never 500/600/800.
- **Loud yellow chrome `#FFD700` / quiet cream content `#FFF8E7`.** Never yellow
  in the content area.
- **Accent semantics, one job each:** pink `#FF6B9D` = active/selected/focus ·
  cyan `#5BC0EB` = create (the generate button) · lavender `#C4B5FD` = mechanism
  chips · salmon `#F4845F` = zone-card borders · teal `#2EC4B6` = technical tags.
- **Severity:** success `#2DC653` / warning `#FF9F1C` / error `#E63946`, **black
  text on all chips**.
- **Motion:** instant 50ms color swaps, stamp-press active state
  (`translate(2px,2px)` + shadow removed), nothing fancy. Skeleton-pulse (1.2s)
  is the one sanctioned animation. Honor Reduce Motion.
- **WCAG AA contrast is the ONLY thing that outranks the style guide.**

## Slock → React Native translation notes

- **The flat hard shadow has no native equivalent** (iOS shadows blur).
  Reproduce it with a layered offset `View` behind the surface. Define this
  once, reuse app-wide.
- **The flight ribbon and the Changi strip → `react-native-svg`** (number
  squares on bands, the 24-cell bar). Keep the numbered legend; no absolute ticks.
- **The route table** has no `<details>` — use a native disclosure/expand, and
  handle horizontal scroll for the data columns.
- **Hover states are meaningless on touch** — implement pressed/active only; all
  tap targets **≥ 44pt**.
- **Fonts** via `expo-font` (Space Grotesk, Space Mono); type scale
  12/14/16/18/24/30, weights 400/700 only.
- **Inlined Lucide icons** (plane-takeoff, plane-landing, send) — reuse the SVG
  paths verbatim via `react-native-svg`; see `../smooth-air/src/components/icons.tsx`.

## Authority order when things conflict

iOS design brief & Design-agent output (for *native* layout/flow) → Slock canon
(for *visual language*) → this pack (for product behavior). Apple HIG overrides
web habits only where they genuinely clash (navigation, safe areas, share,
haptics). Accessibility overrides everything.
