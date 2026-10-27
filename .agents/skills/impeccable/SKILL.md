---
name: impeccable
description: Enforces strict layout discipline, robust grid systems, zero layout shift, responsive viewport containment, and production-grade component structuring. Use when building or refactoring UI components, layouts, screens, or grids.
---

# Impeccable: Production-Grade Layout & Grid Discipline

This skill governs spatial layout, containment, responsive hierarchy, and DOM structuring across all frontend screens and components.

## Core Tenets

### 1. The Strict 4px Spatial Grid
All margins, paddings, gaps, and dimensions MUST strictly align with the 4px baseline scale:
- `1` = 4px
- `1.5` = 6px (micro-spacing only)
- `2` = 8px
- `2.5` = 10px
- `3` = 12px
- `4` = 16px
- `5` = 20px
- `6` = 24px
- `8` = 32px
- `10` = 40px
- `12` = 48px
- `16` = 64px

**Forbidden**: Arbitrary magic numbers like `top-[13px]`, `px-[19px]`, or `gap-[7px]`.

### 2. Viewport Containment & Zero Layout Shift (CLS = 0)
- **Viewport Lock**: Immersive pages (board play, live arena, puzzles, game review) MUST lock to `100dvh` (`h-[100dvh] max-h-[100dvh] overflow-hidden`).
- **Reserved Space**: Never introduce components that conditionally push or shrink adjacent siblings. If an element conditionally renders (e.g. captured pieces, thinking badges, evaluation bars), reserve its slot or use absolute overlays with fixed heights.
- **Scroll Containment**: Nested scrollable elements must specify `overscroll-behavior: contain` and clean scrollbars (`no-scrollbar` or subtle 4px track).

### 3. Component Hierarchy Tree
Every structured component follows this strict inverted pyramid:
```
Surface Container (background, border, shadow, max-width)
└── Layout Grid / Flex Rack (gap, items alignment, wrap strategy)
    └── Section / Group (header, body, footer)
        └── Interactive Elements & Typography (buttons, badges, inputs)
```

### 4. Responsive Breakpoint Discipline
- **Mobile** (`< 640px` / default): Single-column, thumb-reachable bottom actions (minimum 44x44px touch targets), zero side-scrolling on main page.
- **Tablet** (`640px - 1024px` / `sm:`, `md:`): Two-column or compact side-by-side; board takes priority with balanced HUDs.
- **Desktop** (`>= 1024px` / `lg:`, `xl:`): Full side-by-side consoles with high-density stats and dual action rows.

### 5. Containment & Hardware Acceleration
- Use `contain: layout style` or `contain: paint` on high-frequency rendering blocks (chessboards, clocks, move lists).
- Layer promote with `transform: translateZ(0)` or `will-change: transform` only on actively animating elements, never on static DOM.
