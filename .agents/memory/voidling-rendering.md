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

## Missions have no numeric targets
- `meta.ts` missions are only `{id, progress, completed}` — there is **no** target/threshold
  field anywhere, and no mission UI surfaces them. So a spec item like "daily mission
  targets ×1.5" has nothing to scale; implementing it would mean inventing a whole
  mission-target system (scope creep). Left untouched intentionally.
