---
name: VOIDLING v18·4 Quality Pack
description: Camera zoom clamp fix, component-based sprite extraction, terrain classification + NPC avoidance
---

## Camera Zoom Fix

**Rule:** `ISLAND_SRC_W = 2048` (actual source PNG resolution), NOT 4096 (display canvas).
The display canvas is hardcoded to 4096 in `processIsland` DRAW const for bilinear quality.
The zoom cap formula `2.5 * ISLAND_SRC_W / MAP_SIZE = 0.427` is now correct.

**Why:** island_map.png is 2048×2048. Processing at 2048→upscale to 4096 adds no new detail.
Old cap of 0.853 magnified source pixels at 5×, causing blur. New cap allows max 2.5× magnification.

**How to apply:** Always use the actual source image resolution for zoom caps, not the display canvas size.

## Component Sprite Extraction

**Rule:** `extractComponents(img, cols, rows, name)` in `spriteExtract.ts` replaces fixed-grid slicing.
Pipeline: BG flood-fill (#1E1338, border seeds) → CC labelling → discard <0.2% specks → 8px bbox merge → assign to nearest grid cell → tight crop.

**Why:** Fixed-grid slicing cuts sprites at cell boundaries, producing half-sprites and white-block artifacts when sprites don't perfectly fit their allocated cell.

**How to apply:** Use for all ward sheets (wardSprites.ts) and evolution/drift sheets (islandMap.ts). `extractionLog[]` (exported) is consumed by `?debug=sprites` overlay in engine.ts.

## Terrain Classification

**Rule:** `processIsland` builds a 128×128 `Uint8Array terrainGrid` alongside `walkableMask`.
`classifyTerrain(r, g, b, a)` returns TERRAIN.{SPACE, WATER, SAND, ROAD, GRASS, PAVEMENT}.
`getTerrainAt(worldX, worldY)` exported from islandMap.ts.

**Why:** walkableMask only knew on-island vs off-island. Blue river pixels are opaque (on-island) but were classified as walkable, letting NPCs stand in the river.

**Color thresholds (tuned to island_map.png):**
- WATER: `b > r+35 && (b >= g-25 || g > r+20)` OR teal `g > r+30 && b > r+30`
- GRASS: `g > r+20 && g > b+20`
- SAND: `r >= g && g > b+20 && r-b > 35 && bright > 130`
- ROAD: achromatic (chroma < 28) AND bright ≤ 155
- PAVEMENT: default (achromatic bright > 155 OR warm neutral)

**NPC terrain avoidance:** After the wander branch in world.ts, `if (!obj.fleeing && obj.living)` checks the projected next position; if WATER, reverses `wanderAngle` + random wobble (0.8 rad). Spawn functions retry up to 4 times to find non-WATER cells.

**Spot-check counts at first load:** SPACE:6722, WATER:1135, SAND:1474, ROAD:610, GRASS:3270, PAVEMENT:3173.
