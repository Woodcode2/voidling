---
name: VOIDLING Alive Pack (Phase 5)
description: Island-only world spawn guards + void body-language transforms
---

## Part A — Island is the Only World

### isOnIsland(wx, wy, inset=150) — mapData.ts
- Checks `isWalkableGrid` (excludes SPACE), then `getTerrainGrid !== WATER` (excludes lagoon/river/pond), then 4 cardinal neighbor checks at `inset` distance for rim clearance.
- Falls back gracefully before the terrain grid is baked.
- `inset=0` is used for road-based spawns (spawnCar/spawnBus) where rim clearance is not needed.

### Key guard rule
- `isOnIsland` = on-island **AND** not water **AND** with rim inset. Use for all prop/NPC spawns.
- `isWalkable` = on-island (includes roads, water — the old "not SPACE" definition). Use for movement checks (stepCar cliff, drone waypoints, clearSpawnFootprint).

### Block center check
- `init()` skips fill routines for blocks whose center fails `isOnIsland(cx, cy, inset=0)`.
- Straddling-rim blocks still run their fill — per-item checks in scatter/scatterPeople catch stragglers.

### SPAWN AUDIT
- At end of `world.init()`, iterates all objects, logs and removes any off-island ones.
- Count MUST be 0 in production; any non-zero means a spawn path still needs a guard.
- Note: runs before `clearSpawnFootprint()` in engine.ts — clearSpawnFootprint now also checks `isWalkable` on relocation targets.

### Drone retargeting
- `stepLiving()` retargeting loop uses `isWalkable(nhx, nhy)` (up to 6 attempts) when picking a new drone waypoint.

### Car cliff check
- `stepCar()` checks `!isWalkable(nx, ny)` before advancing; reverses direction on failure.

## Part B — Void Body Language

### Player (player.ts)
- `chompSquashT` (ms): set to 80 in `finalizeOrbitItem()` and `eatRival()`, decays in `update()`.
- `visual()`: `wobbleY` multiplied by `lerp(1.0, 0.85, chompSquashT/80)` for eat-chomp squash.
- `bobOffset`: computed from `breathePhase × 0.006` × speed threshold (>22 px/s), applied as Y offset in `draw()`.
- Stretch reduced from 0.14 → 0.07 (7%).
- Sparkle trail called for `formIndex >= 2` before drawOrbit.

### Rivals (rivals.ts)
- Same `chompSquashT` pattern; set in `eatObject()`.
- `bobOffset` computed in `update()`.
- `getEaten()` now retries until `isWalkable(nx, ny)` (up to 30 iterations).
- Stretch reduced from 0.13 → 0.07.
- Lean bumped from 0.12 → 0.14 (8°).
- Sparkle trail called for `formIndex >= 2`.

### drawSparkleTrail (voidling.ts)
- 3 orbs drift behind the void in a slow sinusoidal path; speed threshold 25 px/s.
- Colors: gold, white, lavender.

### World reactions (world.ts draw)
- Trees/bushes: individual ±1.5° sway via `Math.sin(t/2200 + obj.wobble)`.
- Pedestrians: vertical bob (gentle: `sin(t/380 + wobble) × 1.6px`; panic: `sin(t/72 + wobble) × 2.8px`).
- Vacuum wobble: `spd > 12` threshold, `sin(t/78 + wobble) × 0.14rad × clamp(spd/80)`.

### Water shimmer (drawMap.ts)
- `_drawWaterShimmer()` runs every frame after `_buildGroundCache()`, clipped to island path.
- Lagoon: radial gradient drifts in a slow ellipse (period ~3400ms).
- River: shimmer band travels downstream (period ~2200ms per pass).
