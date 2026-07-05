---
name: VOIDLING v13 Sandy Shores
description: v13 implementation details — beach biome, coastline, new world events, bot-eat cooldown sating, rival rim arcs, district tagging.
---

## Bot-eat sating (§0)
- `rivals.ts`: `voidSatedMs` field + `eatVoidBotOnBot(r)` — 25% mass transfer (not 50%), sets 10s cooldown.
- `engine.ts resolveVoids()`: bots check `voidSatedMs <= 0` before initiating another void-eat.
- **Why:** Bots were mass-pumping each other to near-WORLD-EATER size via rapid chain-eating.

## Rival rim arcs (§0)
- Drawn in world space after `rivals.draw()` using `CONFIG.RIVAL_EAT_RATIO`.
- Green = you can eat them (player.radius >= rival.radius * ratio). Red = danger. None if neither.
- `lineWidth = 3 / camZoom` keeps rim constant in screen space.

## Sandy Shores biome (§1 + §2)
- Layout: gx=0 column + gy=4 row = 9 beach blocks (SW corner). `BlockType` union includes `'beach'`.
- `drawTornRim`: south + west edges skipped (now ocean coastline). Top + right remain torn earth.
- `drawCoast()`: module-level function, draws animated ocean (gradient + foam + waterfall streaks) west (x<0) and south (y>S).
- Beach block floor: `#F0DFB8` sand color + warm rgba tint.
- `fillBeach()`: palm×2, umbrella×3, sandcastle×2, towel×4, seashell×5, crab×2, surfboard, kayak, lifeguard, person×3, birds×4.
- `buildDressing()`: beach blocks get 80 sand-speckle tufts (type=4, warm-tan ellipse); skip fences/hedges.
- Non-beach: tuft count doubled 60→120.

## District system (§1)
- `districtAt(x,y)`: checks block interiors first; roads/sidewalks → find nearest block centre (not MAPLE COURT default). Beach/downtown/school/playground/park map to named zones.
- Results show: "Ended as {form} in {district}" or "Finished in {district}".
- Coast slow: applied **BEFORE** `player.update()` in `simulate()` so it takes effect the same frame (not one frame late as it would be in `events.update()`). Still also applied inside `events.update()` for rivals/event coherence.

## Beach objects (§2)
- 11 procedural drawing functions in `objects.ts`: seashell, crab, towel, sandcastle, umbrella, surfboard, palm, lifeguard, kayak, car_parked_a (→car v0), car_parked_b (→car v2).
- All cases added to `drawParkObject()` dispatcher.
- `sprites.ts OBJECT_IDS` extended with beach IDs (PNG assets optional — falls back to procedural).
- `LIVING_KINDS` includes `'crab'` for flee-on-approach behaviour.

## New world events (§4)
- EventId: `'tsunami' | 'nightfall'` added; pool expanded 4→6.
- **TSUNAMI**: wave sweeps west→east at 195 px/s; voids in 72px band get 62% slow + 8% mass drain per 800ms pulse; bots flee east; drawn as animated gradient band in draw().
- **NIGHTFALL**: 15s dark overlay; `nightfallActive` getter read by engine.ts render; screen-space compositing with destination-out radial gradient lights per void.
- **EARTHQUAKE**: trigger-based (every ~45s), 2.2s shake + 10 snack drops; NOT in scheduled event pool.
- Coast slow applied inside `events.update()` AFTER per-frame reset, and independently in `simulate()` before movement.

## Key constants
- `CONFIG.RIVAL_EAT_RATIO = 1.15` (same for player rim threshold and rival-eat logic).
- `CONFIG.COAST_SAND_DEPTH = 75`, `CONFIG.COAST_WATER_SLOW = 0.8`.
- `CONFIG.FORMS[4].radius = 155` (was 125), `CONFIG.MAX_RADIUS = 170` (was 140).
