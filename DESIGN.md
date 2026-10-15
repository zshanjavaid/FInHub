---
name: FinHub
mode: Operate
colors:
  primary: "#0d9488"
  primaryStrong: "#0f766e"
  primaryDeep: "#042f2e"
  surface: "#e8eef3"
  surfaceCard: "#ffffff"
  ink: "#1e293b"
  danger: "#dc2626"
  warning: "#d97706"
typography:
  sans: "Bricolage Grotesque"
  mono: "IBM Plex Mono"
  sourceScale: "12/13/14/15/16/20/24/32/40/52"
  weights: "400, 500, 600, 700, 800"
rounded:
  control: 8px
  card: 16px
spacing:
  sourceScale: "4/8/12/16/24/32/40"
---

## Overview

FinHub is an authenticated finance Operate UI: dashboards, tables, filters, and forms. Brand lives in deep teal, calm cool surfaces, and precise mono numerals — not marketing posters or decorative glass.

## Style foundations

- **Visual style:** restrained finance tool; one accent (teal); cool slate neutrals
- **Typography:** Bricolage Grotesque for UI; IBM Plex Mono for money and tabular data
- **Surfaces:** soft cool-gray canvas; white elevated cards with a single depth cue (tint shadow preferred over border+shadow stacking)
- **Accent:** 2px top teal rail (`.fh-surface-accent` or a span) on key panels — never thick `border-t` on rounded cards
- **Motion:** 150–250ms state feedback; no page-load choreography

## Component rules

- Buttons: primary filled teal, secondary white+border, danger red; must show focus-visible rings
- Cards / charts: shared `surfaceStyles` + `chartCardStyles` — do not invent local card recipes
- Tables: dense, tabular nums, clear hover/selected/disabled
- Sidebar: deep teal gradient rail; active item high-contrast white
- Filters: one FilterBar pattern (fields + optional stats + tags)

## Accessibility

- WCAG 2.2 AA contrast on body and controls
- Visible keyboard focus on every interactive control
- Skip link to main content
- Privacy masking must not rely on color alone

## Anti-patterns

- Purple/blue AI gradients, cream+terracotta marketing palettes, Playfair/display serifs in the app shell
- All-caps micro-labels with extreme tracking as the only hierarchy
- Blueprint grid as decoration at high opacity
- Zero focus rings on buttons
- Nested cards and competing accent colors
---

## Rationale

Documented from the incumbent implementation (tokens in `src/index.css`, `tailwind.config.js`, shared surface/chart/sidebar constants). TypeUI registry packs (`professional`, `refined`, TypeUI `impeccable`) were evaluated and **not** adopted — their palettes/type conflict with FinHub’s teal Operate identity. Polish follows Cursor Impeccable Operate mode + redesign-existing-projects priorities while preserving product function and copy.
