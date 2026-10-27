---
title: frontend-design-engineering
description: Enforces production-grade frontend design engineering, optical spacing, micro-polish, cubic-bezier easing, tabular numbers, and the open-source investigation golden rule across all React/Next.js files.
---

# Frontend Design Engineering Rules

1. **Golden Rule**: Before writing complex unfamiliar features, search GitHub and open-source references first.
2. **Layout Discipline**: Use 4px grid rhythm, lock viewport to `100dvh` for play screens, ensure 0 layout shifts.
3. **Concentric Radii**: Maintain $R_{\text{inner}} = R_{\text{outer}} - \text{Padding}$.
4. **Optical Polish**: Tabular numbers for clocks/ratings, `text-wrap: balance` on headings, `text-wrap: pretty` on body text.
5. **Color Discipline**: Obsidian/slate warm dark surfaces (`#161512`, `#1c1a17`, `#22201c`), purposeful emerald/amber/rose/cyan accents. Never generic neon purple gradients.
6. **Transitions**: Snappy cubic-bezier curves (`0.16, 1, 0.3, 1`) and hardware-accelerated transforms (`transform`, `opacity`).
7. **3D WebGL**: Clamp DPR <= 2, use instanced meshes, and PBR textures.
