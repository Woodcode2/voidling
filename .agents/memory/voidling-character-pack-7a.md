---
name: VOIDLING Character Pack Phase 7a
description: Procedural voids, instant-cast powers, nightfall fix, splash TAP TO START, guide rewrite, spawn feast, duck space-leak guards.
---

## Part 1 — Procedural Voids (voidling.ts)

- `drawProceduralBody(ctx, v)` replaces all sprite-based body rendering.
- Gradient: `#2A1745 → #3B2165 → #4C3585`, light source offset at `(-0.2r, -0.2r)`.
- Swirl arcs: 2 at base, 3 at GOBBLER+ (form ≥ 2); rotation = `t * 0.00005` rad/ms.
- Star specks at MUNCHER+ (form ≥ 1) using golden-angle distribution.
- White stroke outline: `max(3, r * 0.08)` — no PNG fringe or halo possible.
- Removed imports: `skinSprites`, `formSprites`, `spriteOrb` from `./sprites`.
- Kept import: `layerSprites` (used for flame-crown and galaxy-core accessories).
- `drawSkinBody` call removed from body draw path (skin differentiation via eyes/accessories only).
- `drawFormLayers` and `drawFormBody`: removed `formSprites.has` conditional guards — always show procedural flames + galaxy.

**Why:** PNG-sprite body path created white haloes and cutout edges at every radius. Procedural scales perfectly to any size.

## Part 1 — Player.draw() sprite override removed (player.ts)

- Old code: `islandState.formSprites[formIndex - 1]` was used for forms 1+ in `Player.draw()`.
- **Removed**: Now unconditionally calls `drawVoidling(ctx, rx, ry + bobOffset, this.visual(t))` for all forms.
- Ghost branch kept (translucency + dashed outline still applies).

**Why:** The sprite override bypassed all of the new procedural body, swirl, and form-layer rendering for evolved player forms.

## Part 1 — VoidlingVisual additions

- `nearFood?: boolean` field added to interface.
- `Player.nearFood = false` class field updated from engine vacuum-scan loop.
- `visual()` returns `nearFood: this.nearFood`.
- `drawFace` uses `nearFood` to dilate pupils 15% and draws fangs (form ≥ 2).

## Part 2 — Auto-Cast Powers

- `queuedSpell: string | null = null` added to engine state.
- `_executeCast(spellId)` private function factors out all 4 spell cases (event_horizon, wormhole, time_warp, singularity). Logs `POWER ACTIVATED: <id>`.
- `chooseBoon` for spell picks: banner + sparkle ring → 600ms timeout → `_executeCast` or `queuedSpell = spellId` if busy.
- Spell expiry drains `queuedSpell` immediately after `activeSpell = null`.
- `castSpell()` public API: still clears `heldSpell` and calls `_executeCast` for compat.
- UILayer: power button removed; replaced with non-interactive radial-sweep indicator (display only) while `activeSpell` is active.

## Part 3 — Nightfall Fix

- Old: `rgba(6,3,18,0.87)` fill + `destination-out` composite punching light holes.
- New: `rgba(18,10,55,0.22)` dusk tint only — readable at all times, no compositing.

## Part 4 — Splash TAP TO START

- "TAP TO START" `<p>` added below tagline with `vd-pulse` animation.
- `onClick` now calls `audio.init()`, `audio.loadSamples()`, and `import('tone').then(T => T.start())` before `onDone()`.

## Part 5 — Guide Rewrite + Spawn Feast

- `ONBOARD_PANELS`: 3 new cards — "DRAG TO MOVE", "GROW TO EVOLVE", "POWERS ARE AUTOMATIC".
- `fillPark` spawn ring: 8 → 14 items across 3 ring radii (65 / 110 / 155), guarded with `isOnIsland`.

## Part 6 — Duck Space-Leak Guards

- `fillPark` and `fillZoo` pond duck spawns: added `if (!isOnIsland(dx, dy)) continue;` before `makeObj`.
- Respawn loop already uses `isWalkable` (safe; not changed).
