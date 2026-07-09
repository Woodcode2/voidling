---
name: VOIDLING Prompt 20 Sharp Ground Rebuild
description: Live viewport-clipped ground rendering, tower shadow fix, road-only traffic, sitter guard completeness, couple scale.
---

## Stage 1: Sharp ground — live clip path (drawMap.ts + islandMap.ts)
`drawVectorGround` gains an optional `view?` param. When `camZoom >= LIVE_ZOOM_MIN (0.8 px/wu)`, clips ctx to the visible viewport + 250wu pad and calls `_paintStaticGround` live every frame (GPU clips fills to the small rect — fast). Below the threshold the full 3600×3600 buffer blit is used (adequate at overview zoom).

**How to apply:** Always thread `view` through `world.drawGround → drawIsland → drawVectorGround`. The live path activates automatically above the zoom threshold. The existing `?nocache=1` debug path is preserved.

**Why:** The 3600px buffer is 0.30 px/world unit. At street zoom (camZoom ≈ 3–5), the viewport is only ~84–141 buffer pixels, GPU-upscaled 13–17× → heavy blur.

## Stage 2: Tower shadow footprint (world.ts)
Shadow formula now:
- `formulaW = r * 0.85 * min(aspect * 1.1, 1.7)` (original)
- `footprintW = r * min(aspect + 0.3, 1.1)` (visual base width floor)
- `shadowW = max(formulaW, footprintW)` — always ≥ visual footprint
- `shadowH = aspect < 0.8 ? r*0.14 : r*0.22` (flatter under tall buildings)
- `shadowYOff = aspect < 0.8 ? 2 : 5` (hugs tower base)

**Why:** Tall narrow sprites (skyscrapers, watertowers, aspect ~0.25) produced a pinhole shadow `r*0.234` wide against a visual base `r*0.5` wide — looked airborne.

## Stage 3: Road-only traffic (world.ts stepLiving)
`stepCar()` now fires for: `car, schoolbus, taxi, convertible, fire_truck, school_bus` — GATED by `!obj.infra`. The infra gate is critical: parked `taxi/convertible` at curbside are spawned with `{ infra: true }` and must NOT enter traffic AI.

**Why:** Previously only `car` and `schoolbus` drove the road network; all other TRAFFIC_POOL kinds used free-wander and drove off roads.

## Stage 4: Sitter guard completeness + couple scale (world.ts)
- `VIGNETTE_SITTER_KINDS` is a module-level `Set<ObjectKind>` constant (not re-created per `makeObj` call).
- Vignette kinds (`vig_proposal`, `vig_couple`, etc.) now checked for sitter assignment in `makeObj`, same as clay person kinds — fixes gliding-seated-man bug where a vignette entity rendered as seated clay pose while still living/wandering.
- `vig_couple` gets `coupleScale = 1.3` hoisted BEFORE the shadow draw so both shadow dimensions (shadowW, shadowH) and sprite fdH use the same scale factor — shadow and sprite are consistent.

**Why:** Vignette kinds route to clay people pool via `structureSpriteKey(id % clayPeopleKeys.length)`, so they can land on sitter cells 8 or 11 while bypassing the CLAY_PERSON_KINDS sitter guard.
