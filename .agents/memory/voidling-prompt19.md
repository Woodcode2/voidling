---
name: VOIDLING Prompt 19 Quality Bar
description: 6 visual-quality stages — lineup debug, aspect-correct draws, sitter pose, vehicle no-wobble, water refinements, sports field lines baked.
---

## Stages implemented

1. **`?debug=lineup`** — `lineupDebug.ts` exports `drawLineup(ctx,fw,fh)` + `lineupScroll(dy)`. Engine.ts imports both; wheel listener registered when debugLineup flag is set; render returns early calling drawLineup instead of game view.

2. **Scale calibration** — `spriteAspect: Map<string,number>` in `sprites.ts` stores tight content width/height before square-padding. All clay loaders (life/city/scenery/zoo/food/airport/military) call `spriteAspect.set(key, w/h)` after cutout, before squaring. `world.ts drawOne` uses `spriteAspect.get(spriteKey)` for both vehicle (center-anchor) and foot-anchor draws, and for shadow ellipse width.

3. **Pose classification** — `SITTER_CLAY_INDICES = new Set([8, 11])` in `clayLife.ts`; sitter keys tracked in `sitterClayKeys[]`. `makeObj` in `world.ts` sets `obj.sitter=true`, `obj.living=false`, `obj.tether=0` for matching clay person kinds+indices.

4. **Motion dignity** — pedBob amplitude `1.6→0.8` (halved). Vehicle sprites (`clay_vehicle*`, `clay_airport*`, `clay_military*`) skip the tilt+vacWobble rotate entirely. The `isVehicleSprite` check uses the hoisted `spriteKey`.

5. **Water** — `RIVER_HALF_W 90→62` (drawMap.ts proportional — all strokes use multiplier). Water tile `480→200`. Shimmer: alpha `0.22→0.11`, `0.09→0.045`; speed `5200→8500` ms/cycle. Pond: soft blur bank ring (filter:blur(14px)), texture-fill with gradient fallback, depth overlay, shore highlight, 3 lily pads (dark green with `#3a7ab8` notch, NOT COL.riverMid).

6. **Sports field lines** — `setMatchSportsFields()` exported from `drawMap.ts`; stores `_matchSportsFields[]`, nulls `_groundBuf`. `world.ts initSportsFields` calls `setMatchSportsFields(this.fieldDecals)` at end. `_paintStaticGround` paints `_paintSoccerField/BasketballCourt/TennisCourt` for each field before closing. Old sprite-sticker draw loop in `drawGround` removed (no-op comment left).

## Critical fix

`spriteKey` must be **hoisted before `ctx.save()`** in `drawOne` — the `isVehicleSprite` check references it before the original declaration site. Moving the `const spriteKey` and `const r = obj.size` to just above `ctx.save()` fixes the TS use-before-declare error.

## Lily pad notch

Use **fixed color `#3a7ab8`** for the lily pad notch gap — not `COL.riverMid` which is a palette token that can shift and mismatches against textured pond fill.

## Remaining-gaps pass (task #3)

7. **KIND_INFO calibration** — Skyscraper `minR:125/maxR:150 → 185/215` (≈6.5× person mean 31). Elephant `minR:88/maxR:108 → 62/74` (≈2.2× person). Lineup reference row and skyscraper category row both updated to r=200 in `lineupDebug.ts`.

8. **Lagoon lily pads** — Added 2 lily pads to the lagoon section of `drawMap.ts` after the shore highlight stroke, using `LAGOON_RX/LAGOON_RY` proportional coords. Same `#3a7ab8` notch color. Lagoon already had bank ring + texture + depth overlay from an earlier pass.

9. **No stray river ellipse found** — The "large translucent ellipse over the river" described in the spec had already been replaced in the previous pass with the proper pond treatment.

10. **`?debug=lineup` UILayer bypass** — Added `debugLineup` flag (after hooks) + early `return null` in UILayer.tsx so the canvas lineup is fully visible without React UI overlays covering it.

11. **`?debug=autostart`** — `_DEBUG_AUTOSTART` at module scope (before useState calls), `showSplash` initialized to `!_DEBUG_AUTOSTART` to skip the splash, and a `useEffect` that calls `engine.start(false)` immediately. Splash is bypassed entirely, match starts at page load — useful for proof screenshots.

## Proof (all audits 0)
Every screenshot run logged: RIVER OVERLAPS:0, BUILDING OVERLAPS:0, BUILDINGS ON ROADS:0, OFF-ISLAND ENTITIES:0, SCENERY OFF-ISLAND:0, SCENERY ON ROADS:0, SCENERY ON BUILDINGS:0, ZOO OFF-BLOCK:0, SPAWN AUDIT:0.
