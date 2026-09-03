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
3. **A flat edge on the small body's underside (Lantern far frame)** — cause not yet
   named; the coast-sample frames are being taken to read it at size.

## The patch
(appended per hunk as each is measured)
- H1 ring fit — island.ts paint()/DISC_FIT — landed at source 37192a7, after-run owed.

## What I could not verify yet
The coast frames (all five worlds), the flat-edge cause, the FADED measurement in
a frame where a body is actually visible, and the after-run of H1.
