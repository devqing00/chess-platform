# Check.mate Design System & Frontend Engineering Manifesto

## 1. The Core Philosophy
Check.mate is engineered as a premier, high-fidelity chess platform. It rejects generic AI aesthetics, cookie-cutter templates, and uninspired layouts in favor of tactile physical surfaces, optical balance, and fluid motion design.

---

## 2. The Golden Rule of Feature Engineering
> **"For unfamiliar features, don't write from scratch—first search GitHub / open-source projects, compare battle-tested approaches, understand the trade-offs, and then implement cleanly."**
> *(Via @jedeeai / ClaudeCode best practice standards)*

---

## 3. The 4 Design Pillars

### Pillar I: Layout Discipline & Spatial Hierarchy (`impeccable`)
- **4px Base Rhythm**: All paddings, margins, gaps, and sizes must be multiples of 4px (`p-1`, `p-2`, `p-3`, `p-4`, `p-6`). Zero magic numbers.
- **Viewport Lock**: Active gameplay, puzzles, arenas, and review consoles are strictly locked to `100dvh` (`h-[100dvh] max-h-[100dvh] overflow-hidden`). No accidental page scrollbars or layout twitching.
- **Zero Cumulative Layout Shift (CLS)**: Space for conditional elements (captures, thinking dots, turn badges) is always strictly pre-sized or slotted.

### Pillar II: Micro-Polish & Optical Harmony (`make-interfaces-feel-better`)
- **Concentric Radii**: Outer radius = inner radius + padding ($R_{\text{outer}} = R_{\text{inner}} + P$). Never mix mismatched corner radii.
- **Optical Centering**: Triangle icons, badges, and asymmetric glyphs are offset by visual centroid, not mechanical center.
- **Typography Balance**: Headings MUST use `text-wrap: balance` (`[text-wrap:balance]`). Paragraphs MUST use `text-wrap: pretty` (`[text-wrap:pretty]`).
- **Tabular Numerals**: All clocks, ratings, move counts, and evaluations MUST use `tabular-nums` (`font-mono` / `[font-variant-numeric:tabular-nums]`) to eliminate text jitter.

### Pillar III: Animation Choreography (`transitions.dev` & `gsap-skills`)
- **Physics Easing**:
  - Enter: `cubic-bezier(0.16, 1, 0.3, 1)` (snappy ease-out, 250ms).
  - Exit: `cubic-bezier(0.7, 0, 0.84, 0)` (quick ease-in, 180ms).
  - Tactile Click: `cubic-bezier(0.34, 1.56, 0.64, 1)` (micro-spring, 120ms).
- **Transform Only**: Animate strictly `transform` and `opacity`. Never animate layout-triggering properties (`width`, `height`, `margin`, `padding`).

### Pillar IV: UI Taste & Color Tokens (`ui-taste`)
- **No AI Clichés**: Banished generic purple-to-indigo gradients, saturated neon borders, and flat unstyled grays.
- **Rich Palette**:
  - Obsidian Ground: `#161512`
  - Raised Surface: `#1c1a17`
  - Elevated Container: `#22201c`
  - Subtle Border: `rgba(255, 255, 255, 0.06)`
  - Active Border: `rgba(255, 255, 255, 0.14)`
  - Accents: Emerald (`#10b981`), Amber (`#f59e0b`), Rose (`#f43f5e`), Cyan (`#06b6d4`).

---

## 4. 3D WebGL Standards (`threejs-3d-scene`)
- **DPR Clamping**: Always clamp device pixel ratio to `Math.min(window.devicePixelRatio, 2)` to protect mobile battery and GPU.
- **Mesh Instancing**: 32 chess pieces must use `InstancedMesh` per piece type (less than 12 draw calls total).
- **Smooth Interpolation**: Board flip tweening and piece elevation use damped spring physics.
