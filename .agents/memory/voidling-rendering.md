---
name: VOIDLING rendering & perf conventions
description: Canvas render-transform state, hot-path perf rules, and the missions-target gap in the VOIDLING game.
---

# VOIDLING rendering conventions (artifacts/3d-game)

## Screen-space vs world-space in `engine.render`
- `render()` starts with `ctx.setTransform(dpr,0,0,dpr,0,0)`, then wraps the world in
  `save()/translate/scale(camZoom)/translate/…/restore()`. After that `restore()` the
  transform is back to the **dpr scale**, so any screen-space overlay (vignette, grain,
  flash, HUD) draws in **CSS/logical pixels**, not device pixels. Size cached overlay
  canvases (vignette) to `fw`/`fh` (logical), and `drawImage(...,0,0)` at natural size.
- Render order matters: ground → dressing → world objects → events → rivals → power auras
  → player → fx (all world space), then `drawPostFX` (grain+vignette) → flash → HUD.
  Post-fx sits **under** the HUD so HUD text stays crisp.

## Hot-path perf rules (learned via architect review)
- Any helper called every frame must bound work to what's *visible / needed*, not the
  whole viewport. `drawEdgeDither` iterates only the EDGE_FADE-wide border strips
  (work ∝ edge length), never the full view rect.
- **Never** create a `CanvasPattern` per frame — `ctx.createPattern` allocates. Build the
  grain pattern once and cache it; rebuild only on resize/context change.
- Cache static sprites: the voidling body (orb+crescent+highlight) is a 3× supersampled
  offscreen canvas keyed by body colour (`bodyCache` in voidling.ts); the per-frame path
  is one `drawImage` per void. Dynamic parts (face/eyes/mouth/form layers) stay live.
- Module/closure-scoped caches (body sprites, vignette, grain) are fine for this
  single-canvas SPA — bounded, reused, no teardown needed.
- The fixed-step `simulate()` runs every tick too: keep per-tick logic allocation-free.
  Derive leaderboard rank by counting `rivals` with strictly greater score (O(n), no
  temp array/sort) rather than building+sorting a scores array each frame. **Why:** a
  per-tick `[...].sort()` was flagged as a 60fps regression in review.

## Gameplay debug logs must be throttled
- Effect-fired `console.log`s (spec asks each power-up to log when it fires) live in per-frame
  collision/update hot paths. Gate them behind a small ms cooldown (e.g. a `tremorLogCd`
  decremented in `player.update`, reset to ~500ms on log) — an un-throttled log inside a
  contact branch floods the console at 60fps and skews profiling.

## Every spawnable ObjectKind needs a KIND_INFO entry
- `world.makeObj(kind)` reads `CONFIG.KIND_INFO[kind].minR/maxR/tier` with no guard. A kind that
  exists in the `ObjectKind` union / `LIVING_KINDS` / any `spawnX()` but is missing from the
  `KIND_INFO` table throws `undefined is not an object (evaluating 'info.minR')` at populate time,
  which crashes the whole round on Play (and silently kills audio, since `startMusic()` runs after
  population). **Why:** the union type doesn't force a KIND_INFO row. When adding an object kind,
  add its KIND_INFO sizing row in the same edit.

## Fixed-count event spawners: count total, never live-array length
- A limited spawner ("exactly N lightning strikes per storm") must gate on a running
  total counter reset when the parent event starts, NOT on `activeArray.length < N`.
  Expired entries are spliced out, which frees slots and lets extra spawns slip through
  late in the window. **Why:** the SHRINK-STORM strike cap allowed a 4th strike because
  the check used the live `strikes[]` length. **How to apply:** any bounded-per-event
  spawner (strikes, waves) keeps a `xCount` incremented on spawn, gated `xCount < N`,
  reset in both the event-start method and `reset()`.

## Storm dim / meteor tint / screen bump are engine-side, event-driven
- Full-screen tints (storm 8% dim, meteor warm tint) live in `engine.drawPostFX`, gated on
  boolean getters exposed by EventManager (`stormActive`, `meteorActive`) — the event file
  never draws screen-space overlays itself (it renders in world space before the post-fx
  pass). A one-off "screen bump" is just `fx.shake(dur, smallAmp, freq)`, not a new system.

## Missions have no numeric targets
- `meta.ts` missions are only `{id, progress, completed}` — there is **no** target/threshold
  field anywhere, and no mission UI surfaces them. So a spec item like "daily mission
  targets ×1.5" has nothing to scale; implementing it would mean inventing a whole
  mission-target system (scope creep). Left untouched intentionally.

## v10 sprite pipeline (§1)
- `sprites.ts` holds two Maps: `skinSprites` (by skin id) and `layerSprites` (`flame-crown`, `galaxy-core`).
- `preloadSprites(BASE_URL)` is fire-and-forget at App boot; missing PNGs resolve silently.
- `voidling.ts` checks `skinSprites.get(skin.id)` before calling `getBodySprite`; skips `drawSkinBody` when sprite active.
- Layer sprites hook: `drawFlames` early-exits if `layerSprites.get('flame-crown')` exists; `drawFormBody` WORLD ENDER section uses `layerSprites.get('galaxy-core')` when present.

## v10 form badge (§5)
- Drawn in world space inside the world transform (camZoom in scope as closure var).
- Font size = `max(5, 10/camZoom)` → always ~10 screen px regardless of zoom.
- Badge pill centre: `by + br + 44 + pillH/2` — clears orbit chips which extend to `r+37` (ORBIT_RADIUS_OFFSET 26 + chip radius 11).
- Full opacity 2s after evolution (`roundElapsed - lastEvoElapsed < 2000`), then 40%.
- Rivals shown only at formIndex ≥ DEVOURER_FORM_INDEX (≥3).

## v10 score pooling (§3)
- `lastScoreText: FloatingText | null` ref mutated directly: `lastScoreText.text = '+N'`.
- Rolling 150ms window: `lastScoreMs` resets on EVERY merge, not just on creation.
- Score events pushed by `player.absorbObject`; engine drains `pendingFx` once per frame.
