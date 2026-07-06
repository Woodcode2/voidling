---
name: VOIDLING v19·0 Phase 4 — Vector Rebuild
description: Phase 4 complete — vector ground, geometry terrain, power-button fix, retired island image from gameplay.
---

## What shipped

- **mapData.ts** (new): island polygon (14 ctrl pts, midpoint-bezier smooth), zone rects, lagoon ellipse, river polyline, road network, `HOUSE_LOTS` (30–38 validated lots), all geometry helpers (`isInsideIsland`, `isOnRoad`, `terrainAtGeom`, `bakeTerrainGrid`, `getTerrainGrid`, `isWalkableGrid`). 192×192 baked terrain grid.
- **drawMap.ts** (new): `drawVectorGround()` calls `_buildGroundCache(ctx)` **directly on the world-space ctx** every frame (no offscreen cache — 12 000×12 000 canvas would be ~576 MB OOM risk on mobile). All clip regions wrapped in `save()/restore()`. Exports `tracIslandPath`, `drawDebugTerrainVec`.
- **islandMap.ts** (rewritten): removed `processIsland`, pixel classifier, `walkableMask`, `terrainGrid`, `islandCanvas`, `grainCanvas`. `isWalkable`/`getTerrainAt` delegate to `isWalkableGrid`/`getTerrainGrid` from mapData. `drawIsland` → `drawVectorGround`. `drawGrainOverlay` → no-op. `loadIslandAssets` loads only space_bg / drift_sheet / evolution_sheet and calls `bakeTerrainGrid()`.
- **world.ts**: imports `HOUSE_LOTS`; removed house scatter from `fillResidential`; places lots in `init()` after vignettes; added junction-turning in `stepCar` (uses `obj.wanderAngle` as cooldown); `drawGround` accepts `camZoom` param.
- **engine.ts**: removed `MAX_ISLAND_ZOOM` clamp (`camZoom = fh / startView`); changed `viewHeight = radius * 28.57` (player ~7% screen height); always calls `world.drawDressing`; passes `camZoom` to `world.drawGround`.
- **UILayer.tsx**: `BUILD_STAMP = 'v19·0'`; power button `onClick` → `onPointerDown` + `e.preventDefault()` + `console.log('POWER ACTIVATED: …')` + `touchAction: 'manipulation'`; splash now uses `island_map.png` with `blur(5px) brightness(0.62)`.

## Critical gotcha — TDZ in generateHouseLots

`HOUSE_LOTS` is a module-level const initialized at import time. The lot `add()` helper calls `isInsideIsland()` which uses the lazy `_islandPoly` cache (a `let`). Calling the lazy getter at module-init time hits **temporal dead zone** — the `let` variable hasn't been initialized yet even though the getter function is hoisted.

**Fix**: in `generateHouseLots()` build the validation polygon directly (`const validPoly = buildIslandPolyApprox(100)`) and call `pointInPoly(validPoly, x, y)` — never `isInsideIsland()` — inside `add()`. Both `buildIslandPolyApprox` and `pointInPoly` are `function` declarations (hoisted, no TDZ).

**Rule**: any module-level const that calls geometry helpers at init time must use function declarations directly, not lazy-cached `let` getters.

## Why no offscreen ground cache

Caching at world size (12 000×12 000) = 576 MB raw → OOM on mobile. Caching at screen size requires knowing viewport dims and rebuilding on pan+zoom. Direct per-frame draw is fast enough because the camera clip restricts actual rasterization to the visible viewport area only.
