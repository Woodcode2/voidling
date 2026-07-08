---
name: VOIDLING ground cache + waterfall look pass
description: Why the vector ground is baked into an offscreen buffer, the mobile size cap, and the lifecycle-reset rule for cached/transient render state.
---

# Ground cache + animated waterfall (drawMap.ts)

The vector ground (zones, roads, river, lagoon, rim + enrichment) is rasterised
ONCE into a world-space offscreen buffer and blitted each frame, instead of
re-running ~1,600 path/fill/stroke ops per frame. Only the animated waterfall +
water shimmer are drawn live on top.

## Mobile canvas-area cap is the real constraint
- Do NOT make the ground buffer full map resolution. A 12000×12000 buffer is
  ~576MB and exceeds iOS's canvas-area limit (~16.7M px = 4096²) → silent blank.
- Buffer side is capped (`BUF_MAX`, currently 3600 → area ~13M px, safely under
  the cap). Draw into it with `bc.scale(BUF_SCALE = BUF_MAX/MAP_SIZE)` so all the
  existing world-coordinate draw code works unchanged; blit back scaled to full
  map size with `imageSmoothing` on.
- **Why:** the old code redrew everything every frame and its header wrongly
  claimed "no cache needed"; the enriched ground (grass-texture speckles + blur
  filters) is far too expensive to repaint per frame, so baking is mandatory.

## Lifecycle rule: reset cached AND transient render state at match start
- `resetGroundCache()` (clears the buffer) and `resetWaterfallState()` (clears
  the mist particle pool + its clock ref) are called right after `world.init()`
  at round start. Module-global render pools/timers MUST be reset per round or
  stale visual state carries across matches. This is the same class of bug as
  the audio-scheduler teardown rule.
- Don't leave invalidation APIs as dead plumbing — wire them from the round-start
  path even though map geometry is currently static.

## Canvas-state hygiene
- When temporarily setting `imageSmoothingEnabled`/`imageSmoothingQuality` or
  `globalCompositeOperation='lighter'` for a blit/effect, restore BOTH the enabled
  flag and the quality (and composite op + globalAlpha) afterward, or the setting
  bleeds into later drawImage passes in the same context.

## Debug flags
- `?debug=fps` — top-right smoothed-FPS + live object-count overlay (EMA updated
  in the frame loop; near-zero cost).
- `?nocache=1` — bypasses the ground buffer and repaints every frame; A/B tool to
  measure what the cache buys. Note: under the testing harness the shared
  container is CPU-contended, so PERF fps samples swing wildly (20→50) in BOTH
  modes and can't cleanly isolate the cache delta — don't trust harness FPS
  numbers as a precise before/after; use them only to confirm no gross regression.
