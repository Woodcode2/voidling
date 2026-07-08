---
name: VOIDLING stabilize (drift / float / void halo)
description: Root causes + fixes for the three "world looks glitchy" defects — building drift, floating structures, and the white ring around the void. Where each lives and the rules to keep them fixed.
---

# Stabilize the World — three render defects

## 1. Building/scenery drift (oscillation in place)
- **Root cause:** `obj.wobble` is a per-frame accumulating phase (`obj.wobble += dt * 0.004` in the update loop). The draw loop's idle tilt `Math.sin(obj.wobble) * 0.04` therefore oscillates continuously (~±2.3°, ~1.5s period) and was applied to ALL non-captured objects — buildings, houses, scenery included.
- **Fix / rule:** idle tilt + vacuum-wobble are body-language ONLY for things meant to move. Gate them on `obj.living` (the `LIVING_KINDS` set already covers people + animals + vehicles; buildings/houses/scenery are `living === false`). Structures' only allowed motion is the capture/swallow rotation (`obj.captured` branch). The separate tree/bush ±1.5° wind sway was also removed (trees/bushes are scenery → must be still).
- **Why the tester missed it:** comparing two static screenshots a couple seconds apart rarely reveals a subtle few-degree tilt; the drift is obvious only as continuous motion. Trust the code cause, don't rely on still-frame diffs to (dis)prove sub-5° oscillation.

## 2. The white ring / halo around the void
- **There were THREE white sources, in TWO files — fixing one is not enough:**
  1. `player.ts` draw(): a filled white circle sticker at `radius + 5` behind the body (the outer ring).
  2. `player.ts` ghost branch: a white dashed stroke outline when invulnerable.
  3. `voidling.ts` `drawProceduralBody()`: a crisp `#FFFFFF` stroke at exactly the body radius (the tight ring hugging the orb) — this is the most visible one and the easiest to overlook.
- **Fix / rule:** no white outline/glow on the void. Grounding/readability = a soft DARK contact shadow beneath the orb + a subtle dark rim on the body edge. The violet glow (`glowColor`, e.g. classic `#B388FF`) is fine — it is not white. If a "white halo" is reported again, check `drawProceduralBody` in voidling.ts first, not just player.ts.

## 3. "Floating structures" — could NOT reproduce
- Investigated both draw paths: the sprite path draws into a fixed `(-r, -2r, 2r, 2r)` box whose bottom sits at `obj.y` and foot-anchors content there (clay cutouts are padded square + bottom-aligned, bounds `{0,0,1,1}`). The procedural fallback (`drawParkObject`) instead centers content on the origin with its base ~+0.7–0.9r below it and its own internal shadow. Each path is **self-consistently grounded**, so neither produces a visible float; testing + screenshots showed props flush.
- **Rule:** the two anchor conventions differ but are individually correct. Do NOT "fix" the anchor blindly — shifting the procedural or sprite baseline by ~r would create a real float/sink across the whole set. If a specific object type is reported floating, trace that exact kind's draw fn rather than changing the shared anchor.
