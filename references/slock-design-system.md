# Slock Design System — Implementation Guide

> **Purpose**: This file tells you HOW to build UI that looks like Slock.ai. The companion `slock-theme-v3.json` has every token value. Read both before writing any component.

---

## 1. The One Rule

**Loud sidebar, quiet content.** The sidebar and top chrome are saturated yellow (#FFD700). The content area is warm cream (#FFF8E7) with white (#FFFFFF) cards. Never put yellow backgrounds in the content zone. Never make the sidebar subtle.

---

## 2. Visual Fundamentals

### Typography
- **One font for everything**: `Space Grotesk` (sans-serif). Load weights 400 and 700 only.
- **Monospace**: `Space Mono` for timestamps, code blocks, inline code, and technical labels.
- **Base size**: 14px. The scale is 12 / 14 / 16 / 18px. Nothing else was found in production.
- **Only two weights**: regular (400) and bold (700). No medium, semibold, or extrabold.
- **Letter spacing**: `normal` everywhere. Only exception: uppercase section labels get `0.08em`.

### Borders
- **Every interactive surface has a 2px solid black border.** Cards, buttons, inputs, modals, sidebar, panels, chips, avatars — all of them.
- There are no 1px borders. There are no gray borders on primary surfaces. It's 2px black or nothing.
- Left-accent borders on thread cards and skill cards are 3px (salmon #F4845F or pink #FF6B9D).

### Border Radius
- **0px. Everywhere. No exceptions.** This is the defining visual trait. Sharp corners on everything — buttons, cards, inputs, modals, chips, avatars.
- The ONLY round element is the online-status dot (border-radius: 9999px).
- Do NOT "fix" this. Do NOT add rounded corners thinking it looks better. 0px IS the design.

### Shadows
- **One shadow only**: `2px 2px 0px 0px #000000` (hard offset, zero blur).
- Used on: buttons, elevated cards, modals. NOT on: sidebar items, inputs at rest, message bubbles.
- There is no shadow scale. No small/medium/large. One size.

### Colors

| Role | Hex | Where |
|------|-----|-------|
| Primary yellow | `#FFD700` | Sidebar bg, nav bg, toggle track, search highlight |
| Black | `#000000` | Text, borders, primary button bg, icons |
| Pink | `#FF6B9D` | Active sidebar item, hover states, focus rings, badges |
| Cyan | `#5BC0EB` | "Create" action buttons |
| Lavender | `#C4B5FD` | Task reference chips, channel mentions, tag backgrounds |
| Salmon | `#F4845F` | Thread card left-borders, thread indicators |
| Teal | `#2EC4B6` | Model/tech tags (e.g. "Claude Code") |
| Cream bg | `#FFF8E7` | Page background, detail panel bg |
| White | `#FFFFFF` | Cards, inputs, message area |
| Peach | `#FFE5CC` | Bot/agent message bubbles |
| Code dark | `#1E1E2E` | Code block backgrounds |

### Accent Color Rules
Each accent has **one semantic job**. Do not mix them:
- Pink = selected / active / focus
- Cyan = create / new / add
- Lavender = reference / tag / mention
- Salmon = thread / conversation border
- Teal = technical / model tag

---

## 3. Component Patterns

### Buttons
```
Primary:  bg=#000000, text=#FFD700, border=2px solid black, shadow=2px 2px
Create:   bg=#5BC0EB, text=#000000, border=2px solid black, shadow=2px 2px
Secondary: bg=#FFFFFF, text=#000000, border=2px solid black, shadow=2px 2px
Ghost:    bg=transparent, no border, no shadow → shows border on hover
```
- Font: Space Grotesk 18px bold
- Padding: `2px 8px` (very compact!)
- Hover: color swap in 50ms, no fade
- Active: `translate(2px, 2px)` + shadow disappears (stamp-press)

### Inputs & Textareas
- bg: white, border: 2px solid black, radius: 0px
- Font: Space Grotesk 14px regular
- Focus: border becomes `2px solid #FF6B9D` (pink)
- Placeholder: #767676

### Cards
- bg: white, border: 2px solid black, radius: 0px, padding: 16px
- No shadow at rest. On hover (if interactive): add `2px 2px 0px 0px #000` + `translate(-2px, -2px)`

### Thread Cards
- Same as card but add: `border-left: 3px solid #F4845F` (salmon)

### Skill Cards
- Same as card but add: `border-left: 3px solid #FF6B9D` (pink)

### Chips / Tags
- border: 2px solid black, radius: 0px, padding: 2px 10px
- Font: 14px bold
- Color variants: use the accent color as background, always black text

### Modal
- bg: white, border: 2px solid black, shadow: 2px 2px 0px 0px black
- Header: bg #FFD700, border-bottom: 2px solid black
- Overlay: rgba(0,0,0,0.45)

### Tabs
- Underline style: active tab has `border-bottom: 2px solid #000000`
- Inactive: text #6B6B6B
- Active: text #000000, font-weight 700
- Alternative pill variant (detail panels): active bg #FFD700

### Avatars
- border: 2px solid black, radius: 0px (square!)
- Sizes: 24 / 32 / 40 / 56 / 80px
- Pixel-art style preferred

### Checkbox
- 24px square, 2px black border, radius 0px
- Checked: black bg, white checkmark

### Toggle
- Track: 44×24px, border: 2px solid black, radius: 9999px (the only round element)
- Off: track #D4D4D4. On: track #FFD700. Knob: black.

### Online Indicator
- 10px circle (radius 9999px), 2px white border
- Online: #2DC653, Offline: #D4D4D4

---

## 4. Layout

### Three-Panel (Web)
```
[Sidebar 260px] [Main Content flex-1] [Detail Panel 360px (optional)]
```
- Sidebar: bg #FFD700, border-right: 2px solid black
- Content: bg #FFF8E7
- Detail Panel: bg #FFF8E7, border-left: 2px solid black

### Sidebar Structure
1. Workspace name: bg #000000, text #FFD700, bold, 0px radius
2. Icon tabs row (chat/members toggle): 44px height, bottom border
3. Search, Threads, Saved — plain text items
4. PINNED section label (uppercase, 12px, bold)
5. Channel list with # icons
6. CHANNELS section label + count
7. DIRECT MESSAGES section
8. User footer: avatar + name + settings gear

Active sidebar item: bg #FF6B9D (pink), text black, bold.

### Message Area
- Messages sit on cream (#FFF8E7) background
- Human messages: no border, no background, just avatar + name + timestamp + text
- Bot messages: wrapped in peach (#FFE5CC) card with 2px black border
- Code blocks: bg #1E1E2E, text #CDD6F4, 2px black border
- Channel mentions like #engineering: bg #C4B5FD, mono font
- Username: 14px bold. Timestamp: Space Mono 12px #767676. Role badge: Space Mono 12px #767676.
- Input bar: white bg, 2px black border, pinned to bottom

### Mobile
- Bottom tab bar: bg #FFD700, height 56px, icons in black
- Active tab: pink circle (#FF6B9D) behind icon
- No sidebar — full-screen channel list or content
- Safe areas: respect `env(safe-area-inset-*)` on iOS

---

## 5. Critical Do's and Don'ts

### DO
- Use 2px solid black borders on every surface
- Keep border-radius 0px (including buttons, inputs, cards, avatars)
- Use Space Grotesk for everything, Space Mono for code/timestamps
- Make the sidebar aggressively yellow
- Use only 400 and 700 font weights
- Use hard-offset shadow (2px 2px 0px 0px black) — never blurred
- Make hover states instant color swaps (50ms), not opacity fades
- Keep button padding compact (2px 8px)

### DON'T
- Add border-radius > 0px to anything (except online dots and toggles)
- Use drop-shadows, box-shadow blur, or elevation systems
- Add gradients, glass-morphism, backdrop-blur, or transparency effects
- Use font weights 500, 600, or 800
- Put yellow backgrounds in the content area
- Use gray (#ccc, #eee) borders on primary surfaces — it's 2px black or nothing
- Animate with durations > 200ms or elastic/spring easing
- Add rounded pill buttons — buttons are sharp rectangles

---

## 6. Tailwind Config Mapping

If using Tailwind, override these in `tailwind.config.js`:

```js
module.exports = {
  theme: {
    borderRadius: {
      none: '0px',
      DEFAULT: '0px',
      full: '9999px',
    },
    fontFamily: {
      sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '14px',
      lg: '16px',
      xl: '18px',
      '2xl': '24px',
      '3xl': '30px',
    },
    fontWeight: {
      normal: '400',
      bold: '700',
    },
    colors: {
      primary: '#FFD700',
      black: '#000000',
      white: '#FFFFFF',
      pink: '#FF6B9D',
      cyan: '#5BC0EB',
      lavender: '#C4B5FD',
      salmon: '#F4845F',
      teal: '#2EC4B6',
      cream: '#FFF8E7',
      peach: '#FFE5CC',
      code: '#1E1E2E',
      success: '#2DC653',
      warning: '#FF9F1C',
      error: '#E63946',
      'text-secondary': '#6B6B6B',
      'text-tertiary': '#767676',
    },
    boxShadow: {
      none: 'none',
      DEFAULT: '2px 2px 0px 0px #000000',
      brutal: '2px 2px 0px 0px #000000',
    },
    borderWidth: {
      DEFAULT: '2px',
      0: '0px',
      2: '2px',
      3: '3px',
    },
  },
}
```

---

## 7. File Reference

- **Token values**: see `slock-theme-v3.json` for every hex, px, and CSS value
- **This file**: design intent, spatial rules, component behavior, do's/don'ts
- Use both together. The JSON is the *what*. This MD is the *how* and *why*.
