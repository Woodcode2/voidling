---
name: VOIDLING Prompt 15 — Composition Fix
description: New 6×6 district grid, cozy/fancy block types, fountain plaza, re-routed river, expanded forest, photo-mode fix, tone adjustments.
---

## New FIXED_PLAN (6×6)
```
gy=0: cozy  cozy  cozy     cozy     forest  forest
gy=1: cozy  cozy  downtown downtown forest  zoo
gy=2: fancy fancy downtown plaza    park    forest
gy=3: fancy fancy downtown downtown park    forest
gy=4: cozy  cozy  fancy    fancy    forest  airport
gy=5: beach beach beach    beach    beach   military
```
planName = 'COMPOSITION FIX'

## New BlockTypes: 'cozy' and 'fancy'
Both are sub-variants of residential. Every place that filtered `b.type === 'residential'` now checks `=== 'residential' || === 'cozy' || === 'fancy'`:
- Block fill dispatch
- generateLots (cozy/legacy→COZY_POOL, fancy→FANCY_POOL; gx-based logic removed)
- resBlocks (water tower, initSportsFields, initVignettes)
- STREET_BLOCKS
- scatterPeople 'residential' zone filter

## Zone rectangles (updated in mapData.ts)
- ZONE_DOWNTOWN_R: [bx0(2), by0(1), bx1(3), by1(3)] — 6-block core incl. plaza
- ZONE_PARK_R: [bx0(4), by0(2), bx1(4), by1(3)] — 2 park blocks east
- ZONE_FOREST_R: [bx0(4), by0(0), bx1(5), by1(4)] — full east columns 4-5, rows 0-4
- ZONE_ZOO_R: [bx0(5), by0(1), bx1(5), by1(1)]
- ZONE_AIRPORT_R: [bx0(5), by0(4), bx1(5), by1(4)]
- ZONE_MILITARY_R: [bx0(5), by0(5), bx1(5), by1(5)]
- ZONE_BEACH_R: unchanged (full gy=5 row)

## POND relocated
POND_CX = bx0(4) + BLOCK×0.50 ≈ 8700  (park gx=4,gy=2)
POND_CY = by0(2) + BLOCK×0.62 ≈ 5292

## RIVER_PATH (8 waypoints)
0: north entry forest gx=4,gy=0
1: south forest gx=4,gy=1
2: park pond (POND_CX, POND_CY)
3: south park gx=4,gy=3
4: forest bend gx=4,gy=4
5: forest exit — bottom edge of gx=4,gy=4 (bx0(5)-ROAD_W×0.4, by1(4)-60) ≈ (9620,9440)
6: waterfall approach (military/beach area — unavoidable since WATERFALL_PT is fixed)
7: WATERFALL_PT (9800, 10150)

**Why:** WATERFALL_PT is a fixed island-boundary coordinate. The river MUST enter the beach/military area for the final approach — this is not a violation, it's the physical constraint.

## fillPlaza rewrite
Fountain at exact block centre. 4 benches in a ring (BLOCK×0.25 radius, π/4 offset). 4 corner trees (BLOCK×0.40 radius). Scatter: flower×6, flowerpot×4, cafetable×3, foodcart×1, apple×2, people×5.

## fillForest density
tree 14→22, bush 8→12, flower 4→3 (fewer flowers, more canopy).

## drawMap.ts tone
Mowing stripes alpha halved: 0.044→0.022 / 0.030→0.015.
Grass atmosphere: was white→black gradient; now rgba(20,70,10,0.12) → rgba(0,0,0,0.04) → rgba(0,0,0,0.09) for richer green.

## drawPhotoLayer fix (Stage 0)
Now uses spriteBounds for proper source-rect clipping (same logic as main game draw loop). capturePhoto background changed from flat blue to dark-purple gradient; forceRebuild=true to ensure fresh ground buffer on each capture.
