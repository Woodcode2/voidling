# THE MENU AS A FLOATING DIORAMA — findings, numbers and open questions

**Status: UNREFUTED.** The adversarial pass that was supposed to attack this
design never ran — all three refuters died on a session limit. Everything below
is a design plus measurements taken by the agent that produced it. Nothing here
has been attacked, and today alone this stream shipped four things that looked
right and were not (an infinite ring pulse, a blast-radius audit that asked the
wrong question, a registry parser that dropped four rows in silence, and four
probes that quietly tested a two-world game). Treat accordingly.

The two frames it produced are `docs/crews/round-8/diorama-maple.png` and
`diorama-lantern.png` — real shots of the real game, not mockups.

---

## 1 · The ask

The owner's reference is hole.io's level picker: a curated block of city on a
wedge of earth, floating against flat purple, seen from ~30-35 degrees, whole
thing in frame. Three things move on it — a helicopter, two cars, three clouds.
Level chips underneath, PLAY under those.

> "at the level picker I want a 3d animation of the world. Doesn't have to be
> exactly. Like the frame picture of what we have now but animated somehow."
> … "This is what hole.io is doing. We can do much, much better."

**Why "much better" is available rather than aspirational:** their diorama is a
static model with three moving props. Maple Falls already animates a hot-air
balloon orbiting at radius 125, a four-car train on a ~50s loop, a twelve-person
marching parade, four rowboats with individual oar strokes and hull bob, ~30 cars
on a real road grid, a school bus, a pedalling bike gang, dog walkers, joggers,
ducks in a follow-line, birds, and several hundred townspeople with full limb
cycles. All of it running now. **None of it in the menu frame.**

## 2 · Why today's menu cannot be that picture

From an adversarial pass on the previous design (2026-09-12):

- fov is 32 vertical at 430x932, so the horizontal half-angle is **7.54 degrees**.
  At the void's depth (66.4u Maple, 101.4u Game Day) the visible frame is only
  **13-27 world units wide**.
- `h = dist*0.62` and `lookY` put the view axis **33.3-35.9 degrees below
  horizontal**; half-fov is 16, so the top edge of every menu frame sits 17-20
  degrees **below the horizon**. There is no sky and no horizon in any menu
  frame. All six shots in `qa/out/dioshot/` confirm it.

Today's menu is a view INTO a place. The reference is a picture OF one.

## 3 · The finding that makes this cheap

**The islands are already floating wedges and nobody has ever seen it.**

- `island.ts:3762-3783`: `const DEPTH = 9` — a vertical wall extruded from y=0 to
  y=-9 along **every** silhouette segment (DoubleSide, flatShading, `WORLD.cliff`
  0x574a63, emissive 0x3a2a4e at 0.3), plus an underside cap that is
  `topGeo.clone()` at y=-DEPTH in 0x1c1636.
- **There is no sea plane anywhere.** `inWater3`/`inDeepWater3` early-return
  false for pirate, lantern, gameday, powder and skylark (`island.ts:419-497`).
  The only water mesh in the game is Pirate Bay's inland bay sheet
  (`island.ts:3907-3952`), which is *inside* the coastline. Five of six worlds:
  the coast is where the slab ends and space begins.
- The background is already a painted sky canvas as `scene.background`
  (`island.ts:648`, per-world `SKY_MOOD` at `:679-705`) — not a landscape. The
  closest thing in the codebase to the reference's purple card.

We have been shipping dioramas and photographing them from the pavement.

## 4 · The design that won (2 of 3 judges)

**ONE CURATED BLOCK ON A PLINTH.** A 96-unit square guillotined out of the
island, floating on a plinth of its own earth against the house violet, the town
alive on top, the void standing in it.

- Camera: fov 32 unchanged, **dist 430**, `h = dist*0.60 = 258`, lookY -8 — a
  **31 degree elevation**, inside the reference's 30-35.
- At 430 units a 32-degree lens diverges only **6.4 degrees** across a 96-unit
  object, so it reads **near-orthographic** — back row and front row at the same
  scale. The isometric toy-model look comes free from a narrow lens far back
  rather than from swapping in an `OrthographicCamera`.
- Frame width there is **114 world units**; the plinth is 96, so it fills 84% of
  the width with air both sides, and sits between 37% and 57% of screen height —
  inside the transparent window `body.diorama` already opens
  (`index.html:1223-1229`).

**Why a block and not the island:** whole-island framing needs 2,123-2,993 units
of standoff against `PLAY_FAR = 1000` (`prototype3d.ts:721`) and measures ~8,900
calls. And at phone size it is not even a trade — dist 430 gives **3.46 px per
world unit**; a whole island gives **0.75**, every house a two-pixel dot.

## 5 · The measured cost

Draw calls per animation frame, 430x932 DPR2, colour pass only
(`shadowMap.autoUpdate` is false, so excluded on both sides):

| world | today | block framing, nothing culled | with the cast list |
|---|---|---|---|
| Maple | 219 | **5,530** | **256** |
| Lantern (worst: 16,834 meshes, 972 movers) | 227 | 1,592 | **256** |

Intermediate levers, Maple: +AABB cull (half 46) → 416; +drop radius < 1.6 →
278; half 40 / minR 2.2 / 24 movers → 198. Lantern: +minR 1.6 → 950; +cap 30
movers → 336. **The crowd cap is the dominant lever on Lantern (950 → 336); the
radius thin is dominant on Maple (416 → 278).** Every world lands 0.90x-1.27x.

**What pays for the pull-back** is not the far plane — the design argues
`wantFar = d*2.3` (`prototype3d.ts:12389`) buys ~0 and turns **anti-cull** above
d=435. It is an explicit **CAST LIST** computed once at `enterMenu`: walk the
scene one time, set `visible=false` on every mesh outside the block AABB.
Measured **14,161 of 14,550 meshes hidden on Maple**, 15,284 on Lantern. One
pass, nothing per frame — unlike `fadeOccluders` (`prototype3d.ts:1615`), which
walks 5,614 edibles every frame for a void who is now 60px tall and cannot be
occluded; suspend it under `menuMode`.

## 6 · The void — THE OPEN QUESTION, and the one that can still kill it

In the reference there is no character at all. In this game the void is the
star, and the further back the camera goes the smaller he gets. **Both shipped
shots have him wrong:** a floating orb in the old top-left slot on Maple, and
absent entirely on Lantern.

The design's answer, unbuilt: he stands on the plinth, front-right third,
mid-meal, at `menuVoidR = half*0.17` — and **he must never break the
silhouette**, because a purple void against a purple card is a hole, which is
the one thing this game may never show. The rule is geometric, not by eye: the
camera ray through his centre must land on the plinth **top face** with at least
8 world units of face beyond him on every side.

**This is step 2 of the build order and it is the kill test.** If he cannot read
as a character at that size, the composition is wrong however good the frame is.

## 7 · The design's own named weakness, visible in the shot

**The guillotine edge.** The cut removes geometry by object *origin*, but the
ground is one 3072x3072 baked canvas (`island.ts:1334, 3676-3683`) that does not
know the cut is coming. A house whose origin sits 2 units outside the square
vanishes while its driveway, footpath and painted footprint stay on the top face.
You get a driveway leading to nothing. **Look at the left edge of
`diorama-maple.png` — a road runs off the cut.**

Second, from looking: **Lantern is dark-on-dark.** The plinth's edges vanish into
the violet and the floating-object read is lost. Maple works because autumn
maples are orange.

## 8 · Two bugs found on the way past

1. **The ferris wheel is in the sea.** `island.ts:3880-3881` places Maple's
   Higgsfield ferris wheel at `[w(blockCenter(1)) - 120, w(blockCenter(1)) + 260]`
   — world-unit offsets applied to **already-converted 3D coordinates**, a 20x
   scale error. It lands at 3D (-248.25, +131.75), **outside the smoothed
   coastline** (0.40 units past the waterline on the west shore) and 286 units
   from the county fairground the comment says it belongs to. A 16-unit-tall GLB
   landmark floating just off the coast. The Pirate branch on the same line does
   it correctly as `w(6650)`. Intended is almost certainly
   `w(blockCenter(1) - 120)` → 3D (-134.25, -115.25), inside fair block (1,1).
2. **`PLAN_GRID` is stale by construction.** `island.ts:334`
   `export const PLAN_GRID = PLAN;` is evaluated once at module load, after
   `setWorld('maple')` at `:174` — so it is always Maple's plan whatever world is
   built.

## 9 · Build order, smallest kill test first

1. ~~The kill shot~~ — **already run**, and it is what produced the two frames.
2. **The void as the star** — the thing step 1 did not prove. `menuVoidR` from
   the dist ratio to `half*0.17`, front-right with the 8-unit clearance rule,
   shot on all six. **Kill criterion: if he does not read as a character, stop.**
3. The cast list as real code behind `menuMode` — AABB cull, radius thin, mover
   cap, and a QA gate asserting kept-mesh count ≤ the per-world budget.
4. The plinth as a menu-only object — `PlaneGeometry` top sharing `groundMat`, a
   `BoxGeometry` wedge at depth 30, a soft shadow disc; hide the island ground,
   skirt, cap and the 654.9-unit halo. **Do not touch `const DEPTH = 9`** — the
   match needs it.
5. The budget work as one measurable change: absolute `camera.far`, the
   `crowdGate` clamp, `fitShadow` pinned to the block, `fadeOccluders` suspended.
   Re-run `qa/menucost.mjs`.
6. The motion: limited yaw ±22 degrees on a 44s ease, 1.5-unit bob on 6s, the
   mover leash. **Watch it for a full two minutes** — a slow eased sweep's
   failure mode is looking broken at the turnaround.

## 10 · Before any of it

**Run the refutation.** It is written and it never executed: does every symbol
exist, does the frame geometry actually produce the described picture, and what
does it really cost. The script is
`workflows/scripts/menu-diorama-wf_b167e9f0-1a7.js` and it resumes from cache —
only the three refuters would re-run.
