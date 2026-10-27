---
name: threejs-3d-scene
description: Production-grade Three.js, React Three Fiber (R3F), and WebGL engineering for 3D chessboards, realistic PBR materials, smooth 60fps mobile lighting, camera choreography, and asset optimization. Use when building or optimizing 3D chessboards, piece models, shaders, or 3D visual effects.
---

# Three.js & R3F: Production-Grade 3D Scene Engineering

Comprehensive engineering standards for high-performance 3D chessboards, photorealistic piece materials, and cinematic camera choreography in React & Next.js.

## 1. WebGL & R3F Architecture

```
<Canvas (gl: { antialias: true, alpha: false, powerPreference: 'high-performance' })>
├── <PerspectiveCamera (fov: 45, position: [0, 18, 14])>
├── <OrbitControls (enableDamping: true, maxPolarAngle: Math.PI/2.1, minDistance: 8, maxDistance: 32)>
├── <Environment (preset: 'city' or custom HDRI, background: false)>
├── <Lights (Directional with shadow-bias: -0.0001, Ambient light 0.4)>
└── <ChessScene>
    ├── <Board3D (Instanced 64 squares with wood/marble PBR materials)>
    └── <Pieces3D (InstancedMesh or GLTF models with shared geometry & materials)>
```

## 2. Rendering Performance & Mobile WebGL Rules

- **DPR Capping**: ALWAYS clamp Device Pixel Ratio to prevent mobile GPUs from choking on 3x/4x retina screens:
  ```tsx
  dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)]}
  ```
- **InstancedMesh for Pieces**: 32 chess pieces MUST NOT create 32 separate draw calls. Use `InstancedMesh` per piece type (pawns, rooks, knights, bishops, queens, kings) to render all 32 pieces in under 12 draw calls.
- **Frustum Culling**: Ensure bounding spheres and bounding boxes are computed on load so off-screen meshes are culled automatically.
- **Texture Compression**: Use KTX2 / Basis Universal or WebP textures at max 1024x1024 resolution. Never load raw uncompressed 4K PNGs.

## 3. PBR Material Standards for Chess
- **Board Wood Squares**:
  - Light squares: Maple / Ash (`roughness: 0.35`, `metalness: 0.05`).
  - Dark squares: Walnut / Rosewood (`roughness: 0.4`, `metalness: 0.08`).
  - Board border: Mahogany with subtle beveled edge and coordinate embossing.
- **Pieces**:
  - Classic White: Polished ivory/boxwood (`roughness: 0.25`, `clearcoat: 0.4`).
  - Classic Black: Ebony/obsidian (`roughness: 0.2`, `clearcoat: 0.5`).
  - Metallic Theme: Brass & Chrome (`metalness: 0.85`, `roughness: 0.15`).

## 4. Camera Choreography & Interaction
- **Board Flip Animation**: When switching between White and Black view, smoothly tween the camera around the Y-axis using `gsap` or `maath` damped lerping:
  $$\Delta \theta = 180^\circ, \quad \text{duration} = 0.65\text{s}$$
- **Piece Pick & Move**:
  - Raycaster detects square pick-up.
  - Selected piece smoothly elevates by $+0.8\text{ units}$ on the Y-axis with an animated drop shadow beneath it.
  - On release, the piece drops with a damped bounce curve (`ease: 'bounce.out'`).
- **Legal Move Indicators**: Emissive glowing rings or translucent cylinders projected onto valid destination squares.
