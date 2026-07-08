---
name: VOIDLING clay scenery scatter (Rebuild Prompt 5)
description: How clay scenery (nature/park/beach) is scattered as bonus food excluded from win math + respawn, and the load-order rule that makes it work.
---

# VOIDLING clay scenery scatter

Scatters clay cutouts (trees/bushes/rocks/park props/beach props) across forest/park/beach
zones so the island reads lush. Lives in `clayScenery.ts` (mirrors clayCity/clayLife) plus a
`scatterScenery()` method on the world.

## Bonus-food-excluded-from-balance rule
Scenery objects use a neutral kind (`apple`) plus an `obj.scenery` flag and `obj.sceneryKey`.
The flag MUST gate every balance-coupling site or the win math drifts:
- **Denominator** — skip the `totalStartArea +=` in makeObj.
- **Numerator** — skip `eatenArea +=` at ALL THREE increment sites: world consumeByPlayer,
  engine heli-vacuum, engine singularity. Miss one and eating scenery moves % devoured.
- **Respawn** — exclude from `initialPopulation` AND the `remaining` getter, or the respawn
  target inflates and real-object spawn balance shifts.
**Why:** author kept scenery eatable (gives score, satisfying) but it must not count toward
the percent-devoured win condition. **How to apply:** any new consume path or population
counter added later must re-check `!o.scenery`.

## Load-order rule (the bug that ate the first attempt)
`loadClayScenery` is fire-and-forget async (like clayCity/clayLife), but `scatterScenery`
runs synchronously inside `world.init()` at round start. If the placement pools are populated
*inside* the async loader, init runs first and every zone places **0** items (empty defs).
**Fix:** build the placement + remap pools (SCENERY_FOREST/GREEN/PARK/BEACH, clayTree/Bush/
FlowerKeys) from the STATIC metadata tables at module load — the clay draw keys
(`clay_nature_N`/`clay_park_N`/`clay_beach_N`) are deterministic. The async loader then only
injects the bitmaps into `objectSprites`; the draw falls back to the procedural sprite until
they arrive. **Why:** clayCity/clayLife dodge this because they only remap at draw time (no
init dependency); scenery is the first clay feature that needs the pools at init.

## Injection + draw
- Visual-bounds-only injection: set `spriteBounds` to {0,0,1,1}, NEVER `spriteContactFrac`
  (contact radius is passed explicitly per cutout as `R*0.85`).
- Non-square cutouts are padded to a square canvas, foot-anchored (bottom-centre), to reuse
  the fixed 2r×2r foot-Y depth draw without distortion.
- `structureSpriteKey(kind, id, sceneryKey?)`: honors sceneryKey first, and remaps existing
  `tree`/`bush`/`flower` kinds onto the clay nature pools (replace, not stack) — draw-only,
  contact/gameplay untouched.

## Placement gating (scatterScenery)
Per candidate: `isOnIsland(x,y,120)` + `terrainAtGeom` (beach props require SAND; greenery
rejects SAND/WATER/SPACE/ROAD) + `roadClear` + not inside any `structureLots` footprint +
min-spacing vs already-placed scenery. Three debug audits (SCENERY OFF-ISLAND / ON ROADS /
ON BUILDINGS) must all read 0. Density: forest 60, park 16, beach 18, map-wide greenery 60.
`mapData.TERRAIN` (aliased GTERRAIN in world.ts) is distinct from `islandMap.TERRAIN` — use
the mapData one with `terrainAtGeom`.
