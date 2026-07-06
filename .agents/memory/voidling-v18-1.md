---
name: VOIDLING v18·1 Phase 3a Fix Pack
description: 7 fixes applied in Phase 3a — ground sharpness, debug mask, no coast slow, player glow + fissure void fill, evolution sprites, banner pill ticker, prop walkable gating
---

## What changed

### Fix 1 — Ground sharpness
- `islandMap.ts`: PROC=2048 (was 1024), DRAW=ISLAND_SRC_W=4096 (was 1536)
- Camera zoom clamped to `MAX_ISLAND_ZOOM = 2.5 * ISLAND_SRC_W / MAP_SIZE ≈ 0.853` in both engine init (camZoom at round start) and the render loop's targetZoom
- Procedural 128×128 grain canvas (purple-tinted speckle tile) drawn at 10% opacity, **view-bounded** (camera rect only, ~100 draws/frame not 8836)

**Why:** grain tiling the full MAP_SIZE=12000 in 128px steps = 8836 drawImage calls/frame. Must pass `view` rect and clamp draw area to view bounds.

**How to apply:** `drawGrainOverlay(ctx, view)` — always pass the view rect.

### Fix 2 — Debug mask
- `islandMap.ts`: `drawDebugMask(ctx)` — tints non-walkable cells red 40%
- `engine.ts`: `const debugMask = new URLSearchParams(location.search).get('debug') === 'mask'` — draw after world.drawGround when flag is set

### Fix 3 — Prop walkable gating
- `world.ts`: `isWalkable()` check added in `spawnRespawn()` (runtime spawns skip space)
- `world.ts`: `filterNonWalkable()` public method — `objects = objects.filter(o => isWalkable(o.x, o.y))` — **no exceptions** for infra or living objects; all non-walkable get removed
- `engine.ts`: `loadIslandAssets().then(() => world.filterNonWalkable())` — called once after island mask is ready

**Why:** Initial props are placed before the mask loads. filterNonWalkable purges them once. Old version kept `infra` and `living` objects — those must also be filtered (cars/people spawning in space is bad).

### Fix 4 — No coast water slow
- Removed the `sandD / COAST_WATER_SLOW` block from engine.ts (lines that set `player.eventSlow` from y-position). Rivals' version also removed.
- Island world has no coastal slow zone.

### Fix 5 — Player glow + fissure void fill
- `player.ts draw()`: violet radial glow (30% opacity, radius×1.7) + white filled circle (radius+5) drawn BEFORE drawVoidling → white sticker outline ring
- `world.ts drawGround()`: fissure fallback replaced — wide dark violet `#1A0840` stroke + purple `#7B3FE4` shadowBlur glow + bright `#C27BFF` inner seam

### Fix 6 — Evolution sprites
- `islandMap.ts`: `processEvolutionSheet(img)` — flood-fill BG, slice 4 cells L→R, trim each
- `islandState.formSprites: HTMLCanvasElement[]` — [MUNCHER, GOBBLER, DEVOURER, WORLD ENDER]
- `player.ts draw()`: `formIndex >= 1` → draw `formSprites[formIndex-1]` at radius×2.4 instead of drawVoidling; falls back to drawVoidling if sprites not loaded

### Fix 7 — Ticker → banner
- `UILayer.tsx`: removed `<NewsTicker>` render and the `snap.ticker ? 36 : 32` bottom offset
- `engine.ts`: `queueTicker()` now calls `banner(line, '#9AAFC8', 2)` and does nothing else
- Random ticker timer routes to `banner()` every 40-50s
- `ticker` field removed from Snapshot type and getSnapshot() return — `currentTicker` variable still exists but is never set after Fix 7

## Key invariants
- `ISLAND_SRC_W = 4096` is the source of truth for zoom cap math
- `drawGrainOverlay` MUST receive `view` param (view-bounded by design)
- `filterNonWalkable()` has no exemptions — filters all objects including infra/living
- Evolution sprites: index 0=MUNCHER, 1=GOBBLER, 2=DEVOURER, 3=WORLD ENDER; player formIndex 1→sprite[0]
