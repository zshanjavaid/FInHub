---
name: finhub-design-system
description: Operate-mode design system for FinHub — deep teal finance UI. Prefer this over TypeUI registry packs that conflict with the brand.
---

# FinHub design system

Use [DESIGN.md](../../../DESIGN.md) as the source of truth.

## Mission

Ship clear, consistent authenticated finance UI. Brand is deep teal + cool surfaces + mono money. Do not rebrand to TypeUI `professional` / `refined` / TypeUI `impeccable` palettes.

## Foundations

- Fonts: Bricolage Grotesque (UI), IBM Plex Mono (money)
- Primary: `#0d9488` → `#0f766e` → `#042f2e`
- Surface: `#e8eef3`; cards white with `shadow-card` + light ring
- Accent rail: `.fh-surface-accent` or a 2px top bar — never thick `border-t-[3px]` on rounded cards
- Spacing: 4/8/12/16/24/32
- Motion: 150–250ms state feedback only

## Components

Reuse shared modules: `surfaceStyles`, `chartCardStyles`, `sidebarTheme`, `Button`, `FilterBar`, `PageHeader`, `StatCard`, `Modal`, `DataTable`.

## Accessibility

Visible focus-visible rings, skip link, WCAG AA contrast, keyboard paths.

## Don't

- Purple/indigo AI gradients, cream+terracotta, amber poster TypeUI `impeccable`
- Yellow electronics TypeUI `professional`
- Playfair / display serifs in the app shell
- Zero focus styles on buttons
