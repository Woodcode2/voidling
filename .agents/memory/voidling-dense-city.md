---
name: VOIDLING Dense City + 2.5D Depth
description: How suburb/downtown lots are generated and how the void participates in painter's-order depth
---

# Dense City + 2.5D Depth

## Zoning is per-block, not polygons
- Suburbs/downtown are NOT fixed zone polygons. Each match picks one of 3 rotating 6×6 city plans (day-of-year) that assign a `BlockType` per grid block. `ZONE_*_R` rects in `mapData.ts` are terrain-coloring only — never use them for placement.
- **Rule:** any lot/structure generation must key off the day's block types at runtime in `world.ts`, not off static geometry in `mapData.ts`.
- **Why:** the old static `HOUSE_LOTS` in `mapData.ts` had no knowledge of which blocks were residential that day, so it could only approximate along hardcoded road lines. It was removed.

## Lot generation (`world.ts` `generateLots`)
- Runs after `this.blocks` is assigned, before the fill loop. Produces `houseLots` (residential blocks) and per-block `block.buildingLots` (downtown blocks), plus `structureLots` (both, for the audit).
- Every lot is gated: `isInsideIsland` + `isOnIsland(x,y,round(fpR))` + `roadClear(x,y,fpR)` + `lotFree` (no footprint overlap). Footprint radius `fpR = size * 0.55`.
- Downtown blocks must repeat the same `isOnIsland(center,0)` guard the fill loop uses, or generated lots get orphaned (added to structureLots but never rendered because `fillDowntown` is skipped for that block).
- Structures are placed via `makeObj(kind, x, y, { size, baseSize })` with the lot's exact size so the audit footprints are deterministic.

## Draw order / 2.5D (`world.draw` + `engine.ts` render)
- `world.draw(ctx,t,view, actors?)` merges visible objects (foot = `obj.y`, sprites are bottom-anchored there) with actor voids (foot = `y + radius`) into ONE painter's pass sorted ascending by foot-Y. Nearer (larger foot-Y) draws last = on top.
- In `engine`: `drawPowerAuras` moved BEFORE the pass (ground glow); player + rivals are fed as actors INTO `world.draw`; the old standalone `player.draw`/`rivals` loop was removed (else double-draw). Rims, power ring, gnome crown, fx stay after as overlays.
- Actor closures must capture `player` in a local const (`const pl = player`) — the arrow loses TS null-narrowing otherwise.

## Perf note
- Total object count (~2800) is dominated by the pre-existing trickle-to-`TARGET_POPULATION` fill, NOT by house count. Changing suburb lot count barely moves total objects/FPS (trickle compensates). FPS ~40-51 is the game's baseline envelope; don't blame Dense City. No offscreen cache was needed.

## Audit log lines (match start, must read 0 for last 3)
`SUBURB LOTS`, `DOWNTOWN LOTS`, `BUILDING OVERLAPS`(0), `BUILDINGS ON ROADS`(0), `OFF-ISLAND ENTITIES`(0). Overlap/on-road audits reuse `lotFree`/`roadClear` so they are 0 by construction.
