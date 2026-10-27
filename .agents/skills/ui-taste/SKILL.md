---
name: ui-taste
description: Acts as a design-taste router for choosing high-end color palettes, luminance layering, typography hierarchy, and avoiding generic AI templates from uizze.sh standards. Use when designing new visual components, color palettes, surfaces, and typography.
---

# UI Taste: High-End Visual Aesthetics & Color Tokens

Inspired by `uizze.sh` and top-tier aesthetic design systems (Linear, Vercel, Apple, Chess.com Diamond).

## 1. The Anti-Generic Manifesto

Generic AI-generated UIs suffer from identifiable anti-patterns. We strictly outlaw them:
- **NO Generic Purple Gradients**: Avoid default neon purples/magentas (`from-purple-600 to-indigo-600`).
- **NO Harsh Glowing Neon Borders**: Avoid `border-blue-500 shadow-[0_0_20px_blue]`.
- **NO Flat Monotonous Gray**: Avoid generic `#808080` and harsh pure black `#000000` backgrounds.
- **NO Centered Paragraph Text in Wide Cards**: Avoid wide body text centered with no balance.

## 2. Intentional, Tailored Dark Palette
Our dark aesthetic is grounded in warm espresso and slate carbon tones:

| Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| **Canvas / Base** | `#161512` | Main page ground, warm deep obsidian |
| **Surface Raised** | `#1c1a17` | Standard cards, boards, HUDs |
| **Surface Elevated** | `#22201c` | Active drawers, dropdowns, hovering cards |
| **Border Subtle** | `rgba(255,255,255,0.06)` | Quiet borders that carve edges without distraction |
| **Border Active** | `rgba(255,255,255,0.14)` | Hovered or focused containers |

### Accent Roles
- **Emerald Accent** (`#10b981`, `#8fd649` / `#699c30`): Primary wins, verified achievements, tactical success, rating gains.
- **Amber Accent** (`#f59e0b`): Warnings, draw offers, pending turns, clocks under 30s.
- **Rose Accent** (`#f43f5e`, `#ef4444`): Resignations, mistakes, blunders, critical time (<10s).
- **Cyan Accent** (`#06b6d4`): Real-time chat, engine depth analysis, book openings.

## 3. Typographic Hierarchy & Contrast
Contrast is created through scale, weight, and tracking deltas:
- **Hero Title**: `text-xl sm:text-2xl font-black tracking-tight text-white`
- **Section Heading**: `text-sm sm:text-base font-black tracking-tight text-white`
- **Card Subtitle**: `text-xs font-bold text-zinc-300`
- **Metadata Label**: `text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold`
- **Micro Ply / Notation**: `text-[10px] font-mono tabular-nums text-zinc-400`

## 4. Luminance Layering (Elevation Without Clutter)
Instead of stacking heavy drop-shadows, use luminance layering:
1. Ground background: `#161512`
2. Card surface: `#1c1a17` + `border border-white/5`
3. Button on card: `#282521` + `border border-white/10`
4. Hovered button: `#332f2a` + `border border-white/20`
Each layer physically rises toward the light source.
