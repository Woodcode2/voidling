---
name: VOIDLING terrain — roads baked + 2.5D river
description: How roads/river live in the baked ground buffer vs the live layer, and the techniques that make roads sit in the terrain and the river read as flowing.
---

# Roads in the terrain + flowing river (drawMap.ts)

## What is baked vs live
- Roads AND the static river channel are painted once inside `_paintStaticGround` → baked into the capped offscreen ground buffer. They cost nothing per frame. Recoloring/edge work goes here.
- The ONLY live water layers are `_drawWaterfall` and `_drawWaterShimmer` (lagoon glow + river highlight bands). New per-frame water cost must go here and stay tiny.
- River geometry connects to the waterfall **by construction**: `RIVER_PATH`'s last point IS `WATERFALL_PT = ISLAND_CTRL[WATERFALL_IDX]`, and the waterfall draws at that same coord. Don't reroute the river endpoint or the join breaks.

## Making roads sit IN the clay (not a flat sticker)
- Warm clay-asphalt tone (not cool grey), muted warm lane paint with ROUND line caps + gappy dash so dashes read as soft pills.
- Recessed look = a blurred warm-dark **shoulder halo** drawn slightly wider than each road rect BEFORE the asphalt fill, so a soft shadow peeks out where road meets grass/sand; then the asphalt fill (with a small edge blur) covers the center. Faint warm curb highlight, not a hard white line.
- Baked mottling over the asphalt: clip to the **union** of all road rects by adding every rect as a subpath in ONE `beginPath()` then a single `clip()`. Calling `clip()` per-rect intersects (→ empty), which is wrong.

## River as a 2.5D flowing band
- Soft clay-blue fill + a wide **blurred feather stroke** for soft banks instead of a hard cyan edge.
- Flow = 2 soft highlight bands scrolling downstream, same trick as the waterfall's scrolling bands. Interpolate position+tangent by **arc-length** (precompute cumulative segment lengths once; `_riverPointAt(t)`), so the band moves at even speed. Orient each band's ellipse with its long axis ACROSS the river width; draw with `globalCompositeOperation='lighter'` and reset to `'source-over'` after.

**Why (canvas-state hygiene):** every `ctx.filter='blur()'` must be reset to `'none'` and every `globalCompositeOperation` change restored, or the setting bleeds into the later ground blit / sprite passes in the same context.
