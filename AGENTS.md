# Agent Instructions & Design Engineering Standards

## 1. Golden Rule for New & Unfamiliar Features
> **"For unfamiliar features, don't write from scratch—first search GitHub / open-source projects, compare battle-tested approaches, evaluate trade-offs, and then implement cleanly."**
> *(Via 琳小航 @jedeeai / ClaudeCode best practice standards)*

Whenever adding or refactoring complex features (e.g. Stockfish WASM multithreading, WebGL 3D boards, puzzle rating algorithms, opening explorer trees, live WebRTC/Firestore sync):
1. Investigate established open-source implementations (e.g., Lichess/lila, Chess.com open APIs, Stockfish.js, chessground, react-chessboard).
2. Compare architectural trade-offs (memory, frame rate, bundle size, latency).
3. Implement clean, robust, type-safe solutions tailored to our Next.js architecture.

---

## 2. Mandatory Frontend Design Engineering Standards

Every frontend component, page, or modal created in this workspace MUST adhere to:

### A. Layout & Spatial Discipline (`impeccable`)
- Strictly respect the 4px baseline scale (4, 8, 12, 16, 20, 24, 32, 48px).
- Full-screen play & review views MUST lock to `100dvh` (`h-[100dvh] max-h-[100dvh] overflow-hidden`) with zero window jumping or horizontal scrollbars.
- Never cause layout shifts (CLS = 0). Reserve fixed space for dynamic states (captures, timers, badges).

### B. Micro-Polish (`make-interfaces-feel-better`)
- **Concentric Radii**: Maintain $R_{\text{inner}} = R_{\text{outer}} - \text{Padding}$. Outer `rounded-2xl` with `p-2` child gets `rounded-lg`.
- **Optical Alignment**: Adjust icons by optical weight (e.g., play icon `+1px` X-offset).
- **Text Wrap**: Apply `text-wrap: balance` to headers and `text-wrap: pretty` to body copy.
- **Tabular Numerals**: Apply `tabular-nums` / `font-mono` to all timers, clocks, ratings, move counts, and coordinate labels.
- **Tactile Feedback**: Interactive buttons must have active press states (`active:scale-[0.98]` or `active:translate-y-[1px]`).

### C. Motion & Easing (`transitions.dev` & `gsap-skills`)
- Use physics-based cubic-bezier easing (`ease-[cubic-bezier(0.16,1,0.3,1)]` for reveals; `ease-[cubic-bezier(0.7,0,0.84,0)]` for dismissals).
- Hardware-accelerate transforms (`transform`, `opacity`) instead of reflow-triggering properties (`width`, `height`, `margin`).

### D. UI Taste & Palette (`ui-taste`)
- Reject generic AI templates (no neon purple gradients, no garish glowing borders).
- Ground surfaces in warm obsidian (`#161512`), raised cards in `#1c1a17`, and elevated popovers in `#22201c`.
- Use purposeful accents: Emerald (`#10b981`), Amber (`#f59e0b`), Rose (`#f43f5e`), Cyan (`#06b6d4`).

### E. 3D WebGL & Scene Standards (`threejs-3d-scene`)
- Clamp DPR to `Math.min(window.devicePixelRatio, 2)` for mobile performance.
- Use `InstancedMesh` for 3D chess pieces to keep draw calls under 12.
- PBR materials with realistic roughness, clearcoat, and soft contact shadows.
