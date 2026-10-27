---
name: transitions-and-gsap
description: Establishes animation choreography, smooth easing curves, damped spring physics, and cinematic state transitions from transitions.dev and GSAP standards. Use when designing animations, modal transitions, board movements, and slide-over sheets.
---

# Transitions & GSAP Animation Choreography

Governs motion physics, state transitions, ease curves, and visual feedback across the application.

## 1. Physics-Based Easing Standards

Never use generic CSS transitions (`transition: all 0.3s ease`). They feel linear, sluggish, and robotic. Use precise cubic-bezier curves:

| Interaction Type | Timing Function | Duration | Tailwind / CSS Class |
| :--- | :--- | :--- | :--- |
| **Enter / Reveal / Slide-In** | `cubic-bezier(0.16, 1, 0.3, 1)` (Decel / Snappy) | `250ms - 350ms` | `ease-[cubic-bezier(0.16,1,0.3,1)]` |
| **Exit / Dismiss / Slide-Out** | `cubic-bezier(0.7, 0, 0.84, 0)` (Accelerate away) | `150ms - 200ms` | `ease-[cubic-bezier(0.7,0,0.84,0)]` |
| **Tactile Press / Click** | `cubic-bezier(0.34, 1.56, 0.64, 1)` (Micro-Spring) | `100ms - 150ms` | `ease-[cubic-bezier(0.34,1.56,0.64,1)]` |
| **Morph / Smooth Layout (FLIP)** | `cubic-bezier(0.25, 1, 0.5, 1)` (Smooth Fluid) | `300ms - 450ms` | `ease-[cubic-bezier(0.25,1,0.5,1)]` |

## 2. Animation Choreography & Staggering
- **List / Card Reveals**: When opening drawers, move lists, or modal grids, stagger each item by `30ms - 50ms` (`stagger: 0.04`).
- **Directional Consistency**:
  - Drawers enter from bottom, exit down (`slide-in-from-bottom` -> `slide-out-to-bottom`).
  - Dropdowns enter with subtle scale + fade (`zoom-in-95 fade-in`).
  - Alert banners drop from top (`slide-in-from-top-2 fade-in`).

## 3. Hardware Acceleration & Performance
- **Transform Only**: Animate strictly `transform` and `opacity`. Never animate `width`, `height`, `top`, `left`, `margin`, or `padding` during frequent interactions (leads to CPU layout reflows).
- **Will-Change Strategy**: Apply `will-change: transform, opacity` only while moving; remove it upon transition end to conserve GPU memory.

## 4. Chess Piece Animation Rules
- **Move Duration**: Standard moves animate at `200ms - 220ms`.
- **Capture Animation**: Piece scales up slightly (`1.08x`), translates to destination square, then captured piece scales down to `0` with a subtle particle or sound pop.
- **Check Indicator**: Pulse a soft red vignette on the king's square (`pulse` 2 iterations, not infinite).
- **Prefers Reduced Motion**: Always respect `prefers-reduced-motion: reduce` by degrading animations into instant transitions or opacity-only fades.
