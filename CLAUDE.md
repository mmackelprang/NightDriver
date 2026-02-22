# CLAUDE.md

## Build & Run Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server at http://localhost:5173
npm run build        # TypeScript compile + Vite bundle to /dist
npm run preview      # Preview production build locally
```

There are no tests or linting configured.

## Architecture

Night Driver (1976) arcade clone built with **TypeScript + HTML5 Canvas 2D**. Zero external runtime dependencies — all graphics drawn procedurally via Canvas, all sounds synthesized via Web Audio API.

### Entry Flow

`index.html` → `src/main.ts` → `Game` constructor → FSM starts at `Attract` state → `requestAnimationFrame` loop.

### Core Game Loop

Fixed-timestep accumulator pattern: physics update at locked 60 FPS (16.67ms) while rendering runs at display refresh rate.

### Key Modules

| Directory | Purpose |
|-----------|---------|
| `src/core/` | Constants, enums, input handling (steering + gear), math utilities |
| `src/road/` | Track definitions (Novice, Pro, Expert, Random), road segment data, perspective projection |
| `src/rendering/` | Canvas 2D pseudo-3D renderer — road edge posts, car dashboard silhouette, HUD |
| `src/systems/` | Sound manager (engine pitch, crash), scoring, timer |
| `src/states/` | FSM: Attract, TrackSelect, Playing, GameOver |

### Rendering

Pseudo-3D road rendering: 8 pairs of white rectangular posts marking road edges on pure black background. Perspective projection for depth. Car dashboard silhouette at bottom. Monochrome (white posts on black).

### Gameplay

- Steering left/right, 4-gear system (no brake)
- Timer-based (no lives) — crash costs time
- 4 tracks: Novice, Pro, Expert (ROM-stored curves), Random (procedural)
- Bonus time at 300 points
- Score based on distance traveled

## TypeScript Conventions

- **Strict mode** with `noUnusedLocals` and `noUnusedParameters`
- Zero use of `any`
- ES2022 target, ESNext modules, bundler resolution
- All imports use `.js` extensions for ESM compatibility
