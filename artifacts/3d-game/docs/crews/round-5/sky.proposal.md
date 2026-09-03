# DRAFT — in progress (sky, Stream C) — governor-run, 2026-09-03

## The owner's words
> The space behind the island — it's a vast improvement but there's still a lot
> of work. In some levels the planet in the back is cut off, like an image was
> half cut and put on there. It doesn't look crisp, it doesn't look real, it's
> all faded.

## The instrument
`qa/skycut.mjs <world> [port] --json --shots` (SEED=7): for every sky body
(sprites tagged `userData.planet`, island.ts SKIES) at five camera moments —
orbit (u=1), mid-swing (u=0.5), end of dive (u=0), the far pull-back of an R=8
void, and the COAST (the void warped to the last inside point on the -x,-z
diagonal, the direction the camera looks) — it reports the fraction of the disc
inside the frame, the fraction behind island geometry (rays from the camera),
and the body's luminance in the canvas screenshot against the darkest block of
space along the top edge. Every frame is screenshot (`shots/sky/`).
`qa/_skyocc.mjs` names what the ray to each body's centre/top/bottom hits first.

## What I measured (first pass, no coast sample — sky-data/*.log, commit 90cae3d)
- **Orbit and mid-swing (u=1, u=0.5): every body is OFF SCREEN** on all five worlds
  (projected 300-3000 px outside the frame). The bodies sit at the camera's own
  azimuth ±0.11 rad, 56-77° BELOW the horizontal; the establishing shot looks at the
  landmark, not down that line.
- **End of dive and far pull-back: every visible body is fully behind the island**
  (occFrac 1.0 on all five worlds; Maple far frame and Powder far frame are 100 %
  island — shots/sky/maple-far.png, powder-far.png).
- So in play a body is on screen ONLY past the island's far coast, when the void
  stands near it. Lantern's far frame happened to (shots/sky/lantern-far.png): the
  small body (size 58) shows below the coast with a hard edge; a large dark arc
  crosses the bottom of the frame.

## What is wrong — mechanisms named
1. **The ring runs off its own canvas (Pirate, Powder).** paint() draws the disc at
   R = 0.40 S and the ring's arcs at 1.34-1.64 R (+ half a line): 274, 305, 336 px
   on a 512 canvas whose half-width is 256. The ring's far reaches are sliced flat
   by the sprite's square — "like an image was half cut". Arithmetic, verified by
   reading paint(); the fix is landed at the source in 37192a7 (disc at 0.29 S on a
   640 canvas, sprite scaled by 0.40/0.29 so the on-screen size is unchanged) and
   NOT yet built or measured.
2. **The coast slices the big body.** `qa/_skyocc.mjs` on Lantern's far frame: the
   ray to the size-98 body's centre, top and bottom all hit the island ground
   (ShapeGeometry 291×491, opaque, depthWrite) at 246-270 u before the body at 640 u.
   The size-58 body: top ray hits the ground at 221 u; centre and bottom hit only
   the violet halo plane (564×564 at y=-3, `depthWrite:false`) — i.e. visible. A
   disc at 56° below the horizon and ~250 px wide can only ever show as the sliver
   that clears the coast, and that sliver is the DARK limb (the terminator is
   painted upper-left; the coast reveals the lower/left of the disc).
3. **The disc is flat — a sticker, not a sphere.** The coast frames
   (shots/sky/lantern-coast.png, powder-coast.png) show the big bodies at size:
   a uniform pink disc and a uniform white one, each with a wide soft glow and no
   visible terminator. paint()'s ramp held the full hue to 0.58 R and fell to
   `dark` only at the rim, and ACES compressed what was left. This is the
   "faded, not crisp, not real" — not luminance against space (space is a rich
   violet with stars in these frames) but the absence of shading on the body.
   Fix at the source in 6f24377: a small bright core, the hue to 0.42, a mid-tone
   by 0.74, the dark limb from there. Measured by qa/skycut.mjs `Lrange` (the
   luminance range along the lit-to-dark diameter) before/after — owed below.
4. **The flat edge on Lantern's small body (far frame)** — not reproduced in the
   coast frame at size; left open. The probe's own occlusion column was wrong
   in the first pass (rays cast from the camera's LOCAL position; fixed in
   ee23904 to the world position), so the "HIDDEN-ISLAND" readings above are
   retracted as measurements — the frames are the evidence.

**Photographed:** powder-coast.png — the ring's arcs end in straight cuts at the
sprite's square, exactly the owner's "like an image was half cut and put on
there". That frame is the finding.

## The patch
(appended per hunk as each is measured)
- H1 ring fit — island.ts paint()/DISC_FIT — landed at source 37192a7; after-run owed.
- H2 terminator — island.ts paint() lit ramp — landed at source 6f24377; after-run owed
  (bar: Lrange on a visible big body rises from the before figure; FLAT flag clears).

## After-run (build of 6f24377 on :4177; shots/sky-after/, sky-data/*-after.*)
**H1 (ring fit):** powder-coast.png and pirate-coast.png, before vs after — the ring's
arcs now sweep the whole way round; the straight cuts at the sprite's square are
gone. `qa/skyfit.mjs` (source arithmetic) FAILS on main's island.ts (ring reaches
0.676 S of a 0.500 S half-canvas) and PASSES on this one (0.490 S).
**H2 (terminator):** luminance along the lit-to-dark diagonal of the big body's disc,
same 114 px screen radius, same coast frame, before → after:

| world | before range | after range | frame |
|---|---|---|---|
| Powder (pale ice, ringed) | 93 | 122 | a soft white ball with a faint limb → a visible limb |
| Pirate (teal, ringed) | 105 | 126 | banded disc → banded sphere with a dark lower-right |
| Lantern (red) | 71 | 109 | a flat pink disc → a bright core and a dark limb (lantern-coast.png) |

Space itself in these frames is a rich violet with stars — "faded" was the disc,
not the sky. The measurement script is in this file's history (offline pngjs over
the committed frames; the in-probe `Lrange` sampled the quad, not the disc, in
this run and is superseded by the table).

## Residue
- Powder's body is pale by design (#bfe6ff on #122844): the new ramp gives it a
  limb but it still reads soft; a deeper `dark` for that body is an art call.
- The flat edge on Lantern's small body in the far frame: not reproduced at
  size; open.
- The probe's occlusion column (rays vs island geometry) reads 1.0 on planets
  plainly in the sky even from the camera's world position — retracted as a
  measurement; the frames are the evidence. Left in the JSON, not in any verdict.

## What I could not verify yet
The coast frames (all five worlds), the flat-edge cause, the FADED measurement in
a frame where a body is actually visible, and the after-run of H1.
