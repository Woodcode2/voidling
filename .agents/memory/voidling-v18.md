---
name: VOIDLING v18 World Update (Phase 2)
description: Floating island world — replaces tile grid with painted island, space parallax, ledge falloff, drift objects
---

## Key changes

**islandMap.ts (new module)**
- `loadIslandAssets(base)` — loads 3 PNGs async at engine creation (fallback-safe via `islandState.ready` flag)
- BFS flood-fill from edges removes background; `keepLargest` keeps only the island blob
- 128×128 `Uint8Array` walkable mask (`islandState.walkableMask`) — `isWalkable(worldX, worldY)` queries it
- `drawSpaceBg` — tiled parallax at 0.25× using camCX/camCY (not player raw pos)
- `drawIsland` — draws processed 1536px canvas to fill world rect
- `drawDriftObjects` — 6-sprite (3×2 sheet) drift objects float through space (spawn every 20–40s)
- `updateDrift(dt)` — called from engine.ts game loop
- `islandState` must be typed with explicit `Uint8Array` (non-generic) for walkableMask to avoid TypeScript 5.x `Uint8Array<ArrayBufferLike>` ↔ `Uint8Array<ArrayBuffer>` assignment error

**config.ts scale (2.5×)**
- MAP_SIZE 4800→12000, BLOCK_SIZE 700→1600, ROAD_WIDTH 100→200, SIDEWALK 44→100
- TARGET_POPULATION 800→2000, RESPAWN_MIN 540→1200, TRAFFIC_CARS 12→24, BOT_WALL_MARGIN 150→400
- GRID stays 6; MARGIN/STRIDE auto-recompute (MARGIN=700px, STRIDE=1800px)

**world.ts drawGround()**
- Tile grid section (grass/roads/blocks/torn-rim/coast) fully removed
- Replaced with: `drawSpaceBg → drawStars → drawSpaceChunks → drawDriftObjects → drawIsland`
- Dirt patches + fissure decals retained as-is

**engine.ts**
- Import: `{ loadIslandAssets, updateDrift, isWalkable, islandState }` from islandMap
- `loadIslandAssets(import.meta.env.BASE_URL)` called once in createGame() after FXManager
- `updateDrift(dt)` called after `world.update()` in game loop
- Fall detection after `player.update(dt)`: checks `isWalkable(player.x, player.y)`
- Fall resolution: preHp > 0 → deduct heart + respawn with 2s ghost; preHp ≤ 0 → `endRound()`
- `drawDressing` gated with `if (!islandState.ready)` — skips legacy road/block dressing in island mode
- `drawGround` called with `camCX, camCY` (smooth camera centre, not raw player pos) for correct parallax
- Camera max: `fh * 3.5 → fh * 6`

**player.ts ledge fall**
- Fields: `fallState: 'none'|'falling'`, `fallTimer`, `fallRot`, `fallAlpha`
- `startFall()` — freezes velocity, starts 1000ms animation
- `respawnFromFall(x,y)` — repositions, clears state, sets 2s ghostTime
- `update()` — early return during fall; ticks fallTimer/fallRot/fallAlpha; skips physics
- `draw()` — fall case: shrink (1→4%) + spin + fade then `return` before normal draw

**rivals.ts avoidWalls()**
- Samples 350px ahead in travel direction; if not walkable, adds 1.8× repulsion toward island center (MAP_SIZE/2, MAP_SIZE/2)
- Combined with existing rectangular edge repulsion

## Why
- Tile grid was replaced to give the game a distinct floating-island aesthetic
- Walkable mask approach keeps ledge detection cheap (single byte lookup)

## How to apply
- Any new "off-island" gameplay feature should use `isWalkable(x, y)` from islandMap
- To tune island shape adjust BG_THRESHOLD (default 65) in islandMap.ts
- New drift sprites: update the 3×2 sprite sheet at public/assets/drift_sheet.png
