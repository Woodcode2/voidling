---
name: VOIDLING Prompt 13 Visual Quality Pack
description: Stage 13 visual fixes — full-opacity surfaces, water, shadow, car heading, clay gate, photo mode
---

## Rules applied

**Texture surfaces are BASE layers, not overlays:**
- _paintStaticGround restructured: grass/forest/sand/sidewalk/street/water textures draw at globalAlpha=1.0 FIRST; atmosphere gradient goes ON TOP at α=0.18–0.20
- New `_texZone(cc, key, rect, fallback, understated)` helper encapsulates this pattern
- Tile sizes increased (grass 280→420, sand 360→520, etc.) so grain isn't too busy at full strength
- Legacy "low-alpha overlay" pattern must NOT be used for any new zone texture

**Water exclusion must be footprint-aware:**
- `terrainAtGeom(x, y) === GTERRAIN.WATER` alone is insufficient — lots with centers on land but edges over river still slip through
- Correct pattern: check center + 4 cardinal points at 0.85×fpR: `[[0,0],[fpR,0],[-fpR,0],[0,fpR],[0,-fpR]].some(([ox,oy]) => terrainAtGeom(x+ox*0.85, y+oy*0.85) === WATER)`
- Applied in both Stage 1 (suburbs) and Stage 2 (downtown) of generateLots

**Car heading (east-facing convention):**
- Clay vehicle sheet art faces EAST by convention (toSquareCenter)
- Correct formula: `rot = Math.atan2(dy, dx)` with NO +π/2 offset
- Vehicle draw: pivot at foot (NO pre-translate(0,-r)); drawImage at (-r,-r,2r,2r) → car centered at foot
- Shadow for vehicles: now shares the single-ellipse draw at (0, 5) which is correct since car center=foot

**Single shadow ellipse:**
- Replaced 3-concentric-ellipse stack with: `ctx.ellipse(0, 5, r*0.82, r*0.24, 0, 0, Math.PI*2)` at rgba(0,0,0,0.26)
- Centered directly under foot, wider than tall (flat ground shadow)

**Clay preload gate (no sticker frames):**
- loadClay* + loadWardAssets + loadGroundTextures moved from start() to createGame() time
- structureSpriteKey 'house'/'house_c' returns null (not 'house_a'/'house_b') when clay pool empty
- loadGroundTextures has _texLoadStarted idempotency guard — safe to call at createGame AND after resetGroundCache

**Photo mode (capturePhoto):**
- capturePhoto() uses drawVectorGround(oct, 0, scale, false) — NOT exportGroundBuffer() alone — so it builds the buffer on demand (no race condition)
- drawPhotoLayer filters !o.living && !o.eaten && !o.captured, sorts by foot-Y, draws sprites at (world→photo scale)
- ?debug=photo in App.tsx starts a match, waits 2 rAFs, captures, shows full-screen overlay + download link
- vite.config.ts mapPngPlugin: POST /api/map-png stores buffer, GET /map.png serves it (dev only)
