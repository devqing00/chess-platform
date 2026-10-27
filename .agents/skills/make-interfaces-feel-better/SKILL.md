---
name: make-interfaces-feel-better
description: Injects micro-polish rules from affaan-m/ECC standards including concentric border radii, optical icon alignment, text-wrap balance and pretty, tabular numbers for timers and ratings, and tactile micro-interactions. Use whenever building or polishing interactive frontend components.
---

# Make Interfaces Feel Better (Micro-Polish & Interaction Rules)

Derived from the premier interface engineering principles established by affaan-m/ECC, Linear, and Vercel design standards.

## 1. Concentric Border Radii
When an element sits inside a container with padding, their border radii MUST be concentric:
$$\text{Radius}_{\text{inner}} = \max(0, \text{Radius}_{\text{outer}} - \text{Padding})$$

**Example**:
- Outer card: `rounded-2xl` (16px) with `p-2` (8px padding).
- Inner child: `rounded-lg` (8px) -> Perfect concentric curvature ($16px - 8px = 8px$).
- **Anti-pattern**: An outer card with `rounded-3xl` (24px) containing a child with `rounded-3xl` (24px), creating awkward pinched corners.

## 2. Optical Alignment for Icons & Badges
- **Visual Weight vs Bounding Box**: Symmetrical icons (like play arrows, shields, chevrons) have visual centroids that differ from their geometric box.
  - Play triangle inside a circle: Shift right by `+1px` (`translate-x-0.5`).
  - Chevron right: Shift right by `+0.5px`.
- **Badge and Pill Alignment**:
  - Always center icons and text with `leading-none` and `flex items-center gap-1.5`.
  - Icon stroke should match text weight (e.g. `stroke-[2]` for font-medium, `stroke-[2.5]` for font-black).

## 3. Typography Micro-Polish
- **Headings**: ALWAYS apply `text-wrap: balance` (`[text-wrap:balance]`). This prevents awkward two-word overflows and breaks lines proportionally.
- **Body & Captions**: ALWAYS apply `text-wrap: pretty` (`[text-wrap:pretty]`) to paragraphs and sublines to eliminate lonely single-word orphan lines.
- **Tabular Numerals**: Numeric counters, chess clocks, ply numbers, ratings, and time-controls MUST use `tabular-nums` (`font-mono` or `[font-variant-numeric:tabular-nums]`).
  - This eliminates jitter, layout twitching, and visual shaking when digits tick over (e.g., from `1` to `0`).

## 4. Tactile Active States (Micro-Haptics)
Every clickable surface must feel physical:
- **Buttons**:
  - Hover: Subtle luminance lift (`brightness-105` or subtle border glow).
  - Active: Scale down slightly (`active:scale-[0.98]` or `active:translate-y-[1px]`).
  - Tactile 3D button variant: 2px - 4px solid shadow (`shadow-[0_3px_0_0_#2b5c14]`), with `active:translate-y-[2px]` and `active:shadow-none`.
- **Keyboard Focus**: Never hide focus rings without an accessible replacement. Use `focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:outline-none`.

## 5. Truncation with Grace
- Never allow flex children to push their siblings off-screen.
- Always apply `min-w-0` to the flex child and `truncate` to the text span.
- For tooltips, always provide a native `title="..."` attribute whenever text can be truncated.
