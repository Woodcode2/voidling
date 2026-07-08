---
name: VOIDLING Map Rebuild (Prompt 12)
description: Fixed plan NEW EARTH, reserved zones, ground texture system, yards/sidewalks baked into ground cache.
---

## Fixed Plan
`FIXED_PLAN` in `world.ts` — single 6×6 plan named `'NEW EARTH'` replacing rotating A/B/C plans. Block types include `'forest' | 'airport' | 'military'` in addition to previous types. Zones exported from `mapData.ts`: `ZONE_ZOO_R`, `ZONE_AIRPORT_R`, `ZONE_MILITARY_R`, `ZONE_FOREST_R`, `ZONE_DOWNTOWN_R`, `ZONE_BEACH_R`.

## Ground Texture System (Stage 3)
`drawMap.ts` exports:
- `loadGroundTextures(base)` — loads 6 tex_*.png files (grass/sand/forest/water/street/sidewalk), downscales each to a small tile canvas keyed by world-unit tile size, then nulls `_groundBuf`. Has an `_texLoadStarted` idempotency guard — safe to call multiple times per app lifecycle (called from engine.ts at init time once).
- `setMatchLots(lots)` — stores lot geometry in `_groundLots`, nulls `_groundBuf`. Called from `world.ts` right after `generateLots()`. Lot interface: `{x, y, fpR}`.

`_paintStaticGround` additions (baked into the 3600×3600 off-screen buffer at BUF_SCALE=0.30):
- **§2c** — Texture overlays: grass island-wide (α=0.16), forest over ZONE_FOREST_R (α=0.26), sand over ZONE_BEACH_R (α=0.22), sidewalk paving over ZONE_DOWNTOWN_R (α=0.12)
- **§2d** — Mowing stripes: 160-wu alternating dark/light bands clipped to island path
- **§3** (river) — water texture stroked along RIVER_PATH at lineWidth=RIVER_HALF_W×1.8, α=0.16
- **§4** (lagoon) — water texture filled in lagoon ellipse, α=0.18
- **§5 c.5** — Street texture filled over all road rects, α=0.18
- **§5 c.6** — Sidewalk strips: SW=28wu strips on BOTH sides of every ROAD_CENTERS entry (H and V), clipped to island. Uses sidewalk pattern if loaded, else COL.pavement fallback.
- **§5.5** — `_paintYards(cc)`: for each lot, draws grass-texture + tint lawn fill, picket fence stroke, south-facing driveway (sidewalk texture or pavement fallback), pink+green flowerbed ellipses

Helper functions added to `drawMap.ts`:
- `_texFill(cc, key, alpha, x0, y0, x1, y1)` — clips to rect, fills with named texture tile
- `_paintMowingStripes(cc)` — alternating bands over island
- `_paintYards(cc)` — pre-creates grassPat+swPat once, then iterates _groundLots

## Contact Shadow (Stage 3)
`world.ts` `drawOne()` — single hard ellipse replaced by 3 concentric ellipses:
- Outer (rgba 0,0,0,0.10) at r×1.05 × r×0.32
- Mid   (rgba 0,0,0,0.14) at r×0.80 × r×0.24
- Core  (rgba 0,0,0,0.20) at r×0.55 × r×0.16

## Live Receipts (Stage 5)
From Playwright run:
- SUBURB LOTS: 148 (target ≥120 ✓)
- DOWNTOWN LOTS: 96 (target ≥16 ✓)
- BUILDING OVERLAPS: 0 ✓
- BUILDINGS ON ROADS: 0 ✓
- OFF-ISLAND ENTITIES: 0 ✓ (SPAWN AUDIT removed 1 library → 0 remaining)
- SCENERY COUNT: 106
- SCENERY OFF-ISLAND: 0 ✓
- SCENERY ON ROADS: 0 ✓
- SCENERY ON BUILDINGS: 0 ✓
- [clayCity] NEW EARTH art — skyscrapers=4 fancy=8 cottage=8 houses_sheet=ok downtown_sheet=ok ✓
- [clayFood] cutouts=12/12 ✓
- FPS: 54.3 at 2527 objects (in-game, §debug overlay shows 36-39 FPS in residential view)

## Visual Receipts (Stage 5)
- Road surface: textured (non-flat), crosswalks and lane dashes visible ✓
- Sidewalk strips: lighter strips bordering roads visible in gameplay screenshots ✓
- Yards (residential): faint yard rectangles, driveway strips, flowerbed accents confirmed by Playwright tester in residential screenshot ✓
- Grass texture: confirmed visible in residential view ✓
- Mowing stripes: confirmed by Playwright tester ✓
- Contact shadows: soft multi-layer ellipse clearly visible under all objects ✓
- Cars moving on roads: confirmed (car mid-turn seen in screenshot) ✓

**Why:** Stage 3 items were entirely unimplemented after Prompt 12 Stage 2 — ground textures were present as PNG files but never wired into drawMap.ts. Stage 3 wires all six tex_* files into the baked ground buffer.
