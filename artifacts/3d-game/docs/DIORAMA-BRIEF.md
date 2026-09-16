# THE MENU AS A FLOATING DIORAMA — findings, numbers and open questions

## 0 · WHERE THIS ACTUALLY STANDS — read this before anything below

This document grew by accretion and has been corrected six times. **Sections 1–10
are the original design and several of their numbers are wrong**; §11 onward is
the record of what survived. If you read only one section, read this one.

### AND THEN HE REPLACED IT AGAIN: THE MENU HERO IS A PAINTING, NOT A RENDER.

**Everything below this heading — the whole brief, the ?dio=1 build included — is
now the record of a road not taken.** It is kept because its instrument findings
are still true and were expensive, not because the screen it describes is the one
being built.

The owner, on the photographs the section below calls a success:

> "we're missing the mark… it's a giant picture of the island itself… far away…
> the quality is not good… can we not leverage Higgsfield… Maple Island can just
> be a snapshot of something picturesque that represents Maple Island… just like
> a slightly animated image… we really need to keep this simple, Claude…
> there's kids playing this."

So the menu hero stops being a rendered scene and becomes **one painted poster
with a float on it** — `#menuArt` in index.html, `MENU_ART` / `paintMenuArt()` in
prototype3d.ts, `qa/_float.mjs` for the probe. **Maple Falls only**, on his
instruction: *"Can we focus on one until it's perfect once we agree we do it for
the other levels."* A world with no poster keeps today's live 3D menu unchanged,
which is what makes this safe to have on a branch at all.

**Three things this route learned that the route below never could:**

- **`body.diorama` is on for the SHIPPED menu, not just under the flag.** So
  `body.diorama #menu::after` has been hiding the painted splash on every phone
  for weeks, and what a child sees today is the live world through a gradient
  with a clear band at 44%–54%. Closing that band is the poster's actual job; the
  splash was never the thing being replaced.
- **Two CSS animations on one element do not compose.** Both writing `transform`
  means the last one wins outright and the first is silently dropped. The bob and
  the tilt are on different elements for that reason alone, and `_float.mjs` (d)
  exists to prove it stayed that way.
- **A poster is a rectangle until it is masked, and a mask with the wrong sizing
  keyword is a no-op that photographs as a success.** `ellipse 96% 96%` put the
  solid stop past the box edges; `ellipse 50% 50%` is the one that makes the
  percentages mean what they read as.

### THE OWNER REPLACED THE DESIGN. Everything below about the hero in frame is dead.

Shown a hole.io level-picker screenshot beside a photo of our live menu, the owner
gave two directions:

1. the picker should read as **a floating island on flat colour**
2. **the void comes OFF the picker** — hole.io puts no character on theirs at all

**(2) dissolved the fork this brief spent three refuted proposals trying to
escape.** The camera sat at 178 units only to keep the hero legible at ~240 px,
and at 178 the 92-unit block is **1.95× the frame width** — it runs off both sides
and can never read as an object. That conflict was real and irreducible. It was
not solved by a cleverer camera; it was dissolved by taking the hero out of the
shot, which no measurement here could have proposed.

### Built, behind `?dio=1`, gate-green at 45/45

| | |
|---|---|
| camera | **500 units** back, lookAhead **0.16** (was 178 / 0.085) |
| the cut | `renderer.clippingPlanes`, half **56** — the world ends at a hard edge |
| the earth | a slab with **no top face**, DoubleSide, warm brown |
| the hero | **not on the picker at all** |
| the scrim | `body.diorama.island` opens the window 18%–58% |
| per-world | pirate only: half 46, shifted (−18, −18) |

**`cut ≤ 0.26 × D`.** The island is `2·cut` wide and the frame is
`2·D·tan16·430/932`; at 460 units a cut of 72 overflows the sides again. Three
attempts at this screen have now foundered on some version of *the thing is wider
than the frame*.

### The three things that actually made it work

- **Clipping planes, not a cull.** A cull cannot reach scenery (a tree is not in
  `edibles`), instanced lane dashes and crowd discs, or the additive ground halo.
  The refutation round that produced **no surviving proposal** is what identified
  all three — a map of where the ground gives way is worth more than a proposal.
- **The bay had to opt into clipping.** three honours `renderer.clippingPlanes` in
  a `ShaderMaterial` only with `clipping: true` *and* the four chunks compiled in.
  Without it the bay floated over the island as a teal disc. All four custom
  shaders were audited; the bay was the only one affected.
- **"Not crisp" was a CSS gradient, not fog and not light.** The scrim laid up to
  **76% violet** across the object. Fog contributes nothing at 500 units (near
  plane 529, island 400–520) and maple is authored *noon*. The light rig's own
  comment records a brightness lift already tried and retracted for this exact
  complaint — I would have re-run a retracted experiment.

### Verified by looking, not by measuring

Six worlds rendered; the swing photographed at **+7° and −7°**, where a square
island is widest on screen. It holds at both.

**Five instruments produced confident wrong numbers today** — a prop count, a
ground-exists check, a farthest-ray-hit, three disagreeing copies of one occlusion
measure, and a corner projection that claimed a 112-unit island spanned 1290 px in
a 132-unit frame. Every one was caught by a picture. **None was caught by more
measurement.** The working rule: *when a measurement and a photograph of the same
thing disagree, suspect the measurement* — and a measurement with no picture to
check it against can be wrong exactly this way and never say so.

### Superseded — historical only

### Measured, per world

| world | occluded before → after | the frame |
|---|---|---|
| gameday | 0% → 0% | the stadium as an object — best of the six |
| lantern | **100% → 0%** | pagoda, lanterns, market — transformed |
| maple | 9.3% → 6.1% | park, fountain, crowd, road |
| pirate | **100% → 7.7%** | coastline reads as the wedge's edge |
| powder | **100% → 0%** | face recovered, **subject lost** — he covers the lodge |
| skylark | 0% → 0% | hero fine, **frame is an empty field** |

### Open, in order

1. **The cast list** as an `Object3D.layers` bit assigned at build time — before any
   plinth, because `visible=false` leaks geometry buffers (§11.4).
2. **The plinth and the flat card.** The island's own wedge **can never come into
   shot** — settled three ways in §17.
3. **A floor for `qa/_dioful.mjs`**, the "is there anything on the object" bar.
   Skylark and Powder are what it is for. Written, unrun, threshold deliberately
   unset.
4. **An honest cost figure.** `qa/_diocost.mjs` is written and unrun. The
   instrument for this already existed (§18 correction).
5. **`deriveStage` re-scored** for 178 units — it optimises for a 58–95 unit
   camera. Do **not** relax its shared `blockers`/`blocksShot` constants:
   `qa/levels.mjs` hard-gates on the `blocked` they publish.

### Known, measured, out of scope

On the five worlds reached by a world switch, **the match clock runs ~3 s before
the child's first touch** and the opening descent is ~930 ms against an authored
1100–1300. Pre-existing, verified against commit `835b90c`. Live profile only. §18.

---

**Status: REFUTED AND SALVAGED (2026-09-12, 21:30).** The three adversarial
agents ran. **The picture survives; the mechanism does not.** Four of the things
this brief asserted are wrong, two of them numbers I reported to the owner as
fact. They are corrected in §11, which is the first section to read.

**Previous status line, kept because it was true when written: UNREFUTED.** The adversarial pass that was supposed to attack this
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

## 6 · The void — ANSWERED IN §11.2, read that instead

> **Closed.** His form is pinned on the menu (`MENU_VSTAGE = 3`) and his radius is
> free, so the answer is **r=12 at a 178-unit camera: 219 px of body, the top of
> today's measured 135–218 px band, wearing the creature a child already knows.**
> Everything below is the reasoning that got there, including two pixel figures
> §11.2 retracts. Do not quote this section's numbers.

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

**ANSWERED, 2026-09-12: HE SURVIVES.** `qa/_diovoid.mjs` sweeps his world radius
at the diorama camera and measures his on-screen height by projecting his real
`Box3`, then shoots a frame at each. Evidence:
`docs/crews/round-8/diorama-void-r12.png` (reads) and `-r8.png` (does not).

| target radius | px tall | % of 932 | clearance to plinth edge (world units) | reads? |
|---|---|---|---|---|
| 3 | 14.9 | 1.6% | 24.6 - 61.4 | no — a dot |
| 5 | 20.8 | 2.2% | 22.6 - 59.4 | no |
| 8 | 34.7 | 3.7% | 19.6 - 56.4 | barely — a purple blob, no face |
| **12** | **67.1** | **7.2%** | **15.6 - 52.4** | **YES — eyes, blush and mouth all read** |
| 17 | 94.1 | 10.1% | 10.6 - 47.4 | yes, but a third of the block wide |

**r = 12 is the answer**: he stands in the town among the maples at 67 px, still
plainly a creature, and the 8-unit silhouette rule holds with 15.6 units to
spare on the tightest side. The composition survives its own kill test.

**SIX ERRORS IN THAT ONE PROBE, recorded because every one produced a confident
number first.** (1) `window.__voidRadius?.() ?? 1` — a hook that does not exist,
so every figure would have been against a radius of 1. (2) `VG.scale.setScalar`
plus `rw = voidR * sc`, which assumes the rig's base mesh is unit-radius; it is
not, and the "42.8 px" void overflowed a 220 px crop. (3) `rw = sc` printed as
"r built", a tautology dressed as a measurement. (4) The camera was set once, and
the game's own `animate()` re-rendered with the MENU camera between the evaluate
and the screenshot — five runs shot a void alone in the dark and I read it as
"too big" rather than "not my frame". (5) A patch script asserted and threw
before writing, so two edits I believed were applied never were. (6) His POSITION
had the same fault as the camera: `voidling.update()` writes the group position
from `voidState` every frame, so a one-time `VG.position.set` was overwritten and
he floated beside the block. Both the camera and the position now re-assert
inside the redraw loop.

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

## 8 · Four bugs found on the way past

0. **THE MENU HAS BEEN FIRING AN EVOLUTION CEREMONY, EVERY LOAD, ON EVERY
   WORLD** — 6 of 6 measured, including `track('evolve')`, so the evolve funnel
   counts one phantom per session. And **the menu showed two different creatures
   across six worlds**, decided by how far back each world's camera sits. Both
   fixed and guarded; see §11.2 for the measurements. Neither has anything to do
   with the diorama — the diorama work is only what made anyone look.

1. **The ferris wheel is in the sea.** `island.ts:3880-3881` places Maple's
   Higgsfield ferris wheel at `[w(blockCenter(1)) - 120, w(blockCenter(1)) + 260]`
   — world-unit offsets applied to **already-converted 3D coordinates**, a 20x
   scale error. It lands at 3D (-248.25, +131.75), **outside the smoothed
   coastline** (0.40 units past the waterline on the west shore) and 286 units
   from the county fairground the comment says it belongs to. A 16-unit-tall GLB
   landmark floating just off the coast. The Pirate branch on the same line does
   it correctly as `w(6650)`. Intended is almost certainly
   `w(blockCenter(1) - 120)` → 3D (-134.25, -115.25), inside fair block (1,1).
2. **`PLAN_GRID` was stale by construction — a trap, not a live bug.** `island.ts`
   `export const PLAN_GRID = PLAN;` was evaluated once at module load, after
   `setWorld('maple')` at `:174`, so it was always Maple's plan whatever world was
   built. **This brief called it a bug; it was not one.** All five call sites in
   `life.ts` are gated on `worldId() === 'maple'` and Maple's plan is exactly what
   they want, so nothing was ever wrong on screen. It was a trap for the next
   person, because `PLAN_GRID` reads like "the plan" and silently was not. Now
   `planGrid()`, a function, which cannot go stale.

**Both fixed.** The ferris wheel's two positions were tested against the island's
own `silhouetteWorld(12)` plus its point-in-polygon test, run outside the browser:

| | 3D | world | grid cell | verdict |
|---|---|---|---|---|
| shipped | (-248.25, +131.75) | (1035, 8635) | (0,4) = **the strip** (the highway) | **in the sea**, 0.40 units past the waterline, 286 units from the fair |
| now | (-134.25, -115.25) | (3315, 3695) | (1,1) = **fair** | on land, 110 units inside the waterline, **on the midway**, 14.3 units from the fairground centre |

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

---

## 11 · WHAT THE REFUTATION KILLED — read this first

### 11.1 The void cannot be placed the way §6 places him

`void3d.ts:2046` — `group.position.set(s.x, lift + arriveLift, s.z)` — runs inside
`voidling.update()`, called every frame from `prototype3d.ts:12082` with
`{ x: voidState.x, z: voidState.z }`. **Any write to `voidling.group.position` is
overwritten within one frame.** Found independently twice: by the refuter reading
the code, and by me watching five probe runs photograph a void floating beside
the block and misreading it as "he is too big".

**Salvage:** move him through the STAGE POINT, not the group. `enterMenu` already
writes `voidState.x = st.x; voidState.z = st.z` at `prototype3d.ts:1130-1131`.
Make the authored block centre plus the front-right offset BE the stage point.

### 11.2 Making him bigger fires an EVOLUTION on the menu — ANSWERED, and it was worse than the refutation said

`FORM_MIN = [0, 1.6, 2.5, 3.6, 5.5, 8.0, 13.5]` (`prototype3d.ts:4757`),
`VISUAL_STAGE = [0, 1, 2, 3, 3, 4, 4]` (`:4761`), `stageFor` at `:4762`.

The refutation was right that my r=12 kill test photographed a different form of
the creature from the one the menu shows. `docs/crews/round-8/diorama-void-r12.png`
is a real frame of the wrong animal.

**Then `qa/_menuform.mjs` measured the live menu on all six worlds, and found two
live bugs that had nothing to do with the diorama.**

| | before | after |
|---|---|---|
| distinct creatures worn across six worlds | **2** (Maple visual stage 2, the other five 3) | **1** (stage 3 everywhere) |
| worlds firing an evolution ceremony on the menu, per load | **6 of 6** | **0 of 6** |
| his body's on-screen height | 130.4–206.2 px | 134.7–215.2 px |

Logs: `docs/crews/round-8/menuform-before.log`, `menuform-after.log`. The height
row moves a few px between runs of the same build, because before the fix the
ceremony's body pop (+16.1% peaking 0.20 s in) is still in flight when the shutter
opens — 0.7 s of game time is ~10 s of wall clock at this sandbox's frame rate.
That is noise in the height row and does not touch the two verdicts.

1. **The menu's creature was a function of camera distance.** `menuVoidR` is
   `dist/18` clamped to 1.8–3.8 and `FORM_MIN[3]` is 3.6, so a world staged closer
   than 64.8 units shows a different animal. Maple is staged 58 units back and
   showed GOBBLIN; the other five (80–92) showed CHOMPOSAURUS. Nobody chose that.

2. **The evolution check was not gated on `menuMode` or on `started`.** `curStage`
   and `bestStage` both start at 0 and the menu's radius implies 2 or 3, so the
   first menu frame took the ceremony branch: `audio.evolve()`, `camPunch(5)`,
   `camDist *= 1.07`, `fx.ring`, `buzz(45)`, `townReacts({kind:'evolve'})` and
   **`track('evolve')`** — so every analytics funnel over the evolve event has been
   counting one phantom evolution per session. Invisible by looking, because the
   EVOLVED card itself is suppressed by `tClock > titleUntil` at boot.

**The fix is one branch** (`if (menuMode) { setStage(MENU_VSTAGE) } else { …old
block… }`) plus `MENU_VSTAGE = 3`, which is what five of the six worlds already
showed. And that branch **is** the decoupling: on the menu his form is chosen and
his radius is free. The growth-law clamps that would fight a big menu radius all
live inside `if (started && !ended && !paused)`, so nothing else had to change.

**Measured with the branch disabled and the hook left in** — the picker at r=17
wore visual stage 4 and fired **three** ceremonies as the radius climbed, the last
being the WORLD ENDER finale: `fx.flash('#ffffff', 0.55)`, `fx.shake(1.1)` and
`buzz(120)`. Camera shake is ZERO by the owner's standing order. Pulling the
camera back without this branch would have put a white flash and a screen shake on
the level picker.

Guarded by `qa/menuform.mjs` (registered, push+live, 68 s). All three bars fail on
the pre-fix build.

#### The size question, answered with the engine's own formula

`void3d.ts:2118` computes the hero's pixel radius for its own LOD ladder:
`pxR = (innerHeight / (2 * camD * tan(fov/2))) * dispR`. Validated against the
live menu on four distances — **max error 0.15%**. Against a 92-unit block at
fov 32 on a 430x932 screen, body **diameter** in px:

| framing | camera back | px/unit | r=3.8 | r=5.28 | r=8 | r=12 | r=17 |
|---|---|---|---|---|---|---|---|
| block at 90% of frame height | 178 | 9.12 | 69 | 96 | **146** | **219** | 310 |
| block at 75% | 214 | 7.60 | 58 | 80 | 122 | **182** | 258 |
| block at 60% | 267 | 6.08 | 46 | 64 | 97 | **146** | 207 |

**Today's menu reads 135–218 px, measured.** So **r=12 lands in that band at every
framing under consideration, and r=8 lands in it at the tight one** — with the form
pinned, so he stays the creature a child knows. **The tension §11.2 called "the
single open question" is closed: r=12, form pinned at visual stage 3.**

#### Two numbers I gave the owner that this corrects

- **"the void survives at 67 px"** — retracted twice over. The refutation already
  established the shot was the wrong form. The 67 px *itself* is also void: it came
  from projecting the eight corners of a `Box3`, which for a ball overstates by up
  to sqrt(3) (the silhouette of the cube, plus near corners `R*sqrt(3)` closer to
  the camera), at a radius the probe could not report. `qa/_menuform.mjs` printed
  289 px for a body that is 204 px before this was caught. Every pixel figure in
  `qa/_diovoid.mjs` is measured that way and none should be quoted.
- **"a form-safe void on a block-filling frame is ~30 px across"** — wrong twice.
  30.1 was a *radius* reported as "across", so 60 px diameter; and it assumed a
  285-unit camera rather than the 178 a block-filling frame actually needs. The
  honest figure for r=5.28 is **96 px diameter at 178 units** — and the pin makes
  5.28 irrelevant anyway.

### 11.3 The frame arithmetic is wrong by sqrt(2)

At azimuth 225 the square plinth is **corner-on**, so the frame must hold its
DIAGONAL — 96 * 1.414 = **135.8 units**, not 96 — against a 113.8-unit frame.
Measured off our own published PNG with pngjs: the widest diorama row spans
**810 of 860 px, 94.2% of the frame width**. It does not fit; it nearly
overflows. The "84% with air on both sides" in §4 is wrong.

### 11.4 The cost table was in a unit that excludes 54% of the frame

The probe priced the menu as one direct `renderer.render()`. That call contains
**no shadow pass** (`shadowMap.autoUpdate = false`, `prototype3d.ts:150`) and no
composer. Re-measured in the day-9 unit (composer/2 + shadow/4, validated against
the live frame to within 4%):

| | design claimed | actually |
|---|---|---|
| Maple, block + cast list | 1.17x | **165 calls — 0.72x the match, 0.59x today's menu** |
| Lantern | 1.13x | **~168 calls — 0.26x the match** |

**It undersold itself by roughly 2x.** I reported "256 calls vs 219 baseline" to
the owner; both figures are in the wrong unit.

Two consequences the design did not know about:
- **The shadow box — and this warning asked the wrong question.** `fitShadow` is
  63.8 units on Maple today and 96.8 on Lantern, and left alone the pull-back
  would open it toward the 220 cap: at `dist` 178 the target is `clamp(196, 45,
  220)` = **196**, a 3.1x linear and **9.4x area** at the same texture.
  **But the box follows the SUBJECT, not the camera.** It is sized from camera
  distance because for a follow camera distance *is* how much ground is in shot —
  on a diorama those come apart for the first time, and the subject is ONE BLOCK.
  A box of `DIO_HALF` = 46 covers everything in frame, which is **tighter than the
  63.8 the menu uses today**. So the diorama makes the shadow pass *sharper and
  cheaper*, not 6.7x dearer. Pinned in the same statement as the pull-back
  regardless, because the failure mode if anyone removes the pin is silent.
- **A geometry upload leak.** MEASURED via `renderer.info.memory.geometries`: one
  uncalled pulled-back frame takes Maple 734 → **4,580** (+3,846) and Lantern
  1,727 → **6,358**, and applying the cast list afterwards **does not give them
  back**. So the cull must happen BEFORE the first pulled-back frame ever renders.

### 11.5 `scene.fog = null` deletes the only place `camera.far` is set

`prototype3d.ts:12366-12391`: the entire fog law **and** the
`const wantFar = … ; if (camera.far !== wantFar)` write live inside
`if (scene.fog) { … }`. Null the fog for a flat card and `camera.far` is never
assigned in the `stageCam` branch at all.

### 11.6 The camera that took the shots is not the camera the game has

The probe sets `C.position.set(CX + sin*dist, dist*0.60, CZ + cos*dist)` — but in
the shipped branch (`prototype3d.ts:12362`) `dist` is the **slant range**, not the
horizontal one. The same numbers through the shipped code give a **38.2 degree**
elevation, not 31 — outside the reference's 30-35 band and 18% different in
frame. **Author the camera as (elevation, fill) and derive dist and h**, rather
than as (dist, h-fraction).

### 11.7 What survives, verbatim from the refutation

> KEEP THE BLOCK. The reference is a block, the shot in `qa/out/plinth2-maple.png`
> genuinely reads as the reference done better, and the plinth's shared-bake UV
> trick is verified exact to six figures. Nothing in this refutation touches the
> core idea, only four of its mechanisms.

Also surviving: the one-time AABB cast list (**but as an `Object3D.layers` bit
assigned at build time during `breathe()`, not `visible = false` over 14,456
meshes — that is what fixes the geometry leak**), the flat `Color` card, an
absolute far plane, the `crowdGate` clamp, and `fadeOccluders` suspended under
`menuMode`.

---

## 12 · STEP 1 IS WRITTEN, BEHIND `?dio=1`

The pull-back exists in `prototype3d.ts` and is **inert by default**. Four pieces,
all of them small because the machinery was already written against
`stageCam.dist`:

| | |
|---|---|
| `DIORAMA` | `?dio=1` only. This is the first screen a child sees; it ships when it has been LOOKED AT, not when it typechecks. Day 8 got its framing wrong four times and every wrong version was arithmetic that checked out. |
| `dioCam(lookY)` | Pure arithmetic, no scene, no state — a 92-unit block at 90% of frame height at fov 32 needs the camera **178.2 units** back, 99.7 up, 147.8 out. |
| the drift | `enterMenu` sets the aim bias and the per-frame drift block **recomputes it every frame**, so a bias set once would be undone within one frame. Both now read `stageCam.dist` and the diorama's own 0.085 (today's 0.22 of 178 units would be 39 units, sliding the block out of shot). |
| `fitShadow` | pinned to the block, in the same statement as the pull-back. |

`menuVoidR` returns `DIO_VOID_R` = 12 under the flag — chosen against the FRAME,
not derived from the camera, because `dist/18` at 178 units would be 9.9 by
accident rather than by decision. **The form pin is what makes 12 spendable.**

**With the flag off nothing changes.** The only line touched in the default path
is the drift's `ms.dist` → `stageCam.dist`, and `stageCam.dist` is assigned from
`menuStage.dist`, which *is* `ms.dist`.

### What step 1 does NOT have yet

The plinth, the cast list as an `Object3D.layers` bit, the `crowdGate` clamp, and
`fadeOccluders` suspended — all of §9 as revised by §11. Step 1 is the smallest
thing that can be photographed, and the next action is to photograph it on all six
worlds and look, because that is the only question it can answer.

## 13 · TWO THINGS THAT WILL BREAK STEP 2, MEASURED BEFORE BUILDING THEM

Both were named in §9/§11 as things to handle. Both are now numbers rather than
worries, and one of the two mechanisms in the brief was described wrongly.

### 13.1 `fadeOccluders` ghosts half the block

`fadeOccluders` (`prototype3d.ts:1676`) fades any prop whose centre lies inside a
cylinder along the camera→hero axis, of radius `voidling.radius * 1.35 + 1.2` plus
the prop's own radius. Both of its inputs move on the diorama:

| | hero r | shield | axis length |
|---|---|---|---|
| today (Maple) | 3.8 | 6.33 | 57.9 |
| diorama | 12 | **17.40** | **178.2** |

That is **2.75x the radius (7.56x the cross-section) and 3.08x the length —
23.3x the volume.** The tube is 35 units across against a 92-unit block: **38% of
the block's width**, and since a prop's own radius is added, a 6-unit building
fades from 23.4 units off the axis, which is a **47-unit corridor through a
92-unit block**. Half the block, ghosted, in a straight line at the camera.

**Suspend it on the diorama**, and the justification is not just the number: it
exists so nothing stands in front of the hero, and it was written for a low follow
camera with a small hero. On the diorama he is 219 px seen from 34 degrees above.
The conditions it was built for do not hold.

### 13.2 The speech bubbles — and the mechanism was stated backwards

The brief said "townspeople speech bubbles enormous at diorama scale". The effect
is right; the mechanism is the opposite of what that implies, and the mechanism is
what points at the fix.

**The bubbles do not scale at all.** They are DOM elements positioned by projecting
a world point to screen space (`bubbles.ts:249`, `:404`), sized in CSS pixels —
`font-size: 12.5px`, `max-width: min(64vw, 300px)`. They are the same size at every
camera distance. **It is the world that shrinks under them**, by 3.08x:

| | px per world unit | a 1.8-unit person |
|---|---|---|
| today (camD 57.9) | 28.07 | 51 px |
| diorama (camD 178.2) | 9.12 | **16 px** |

So: a bubble up to **275 px wide over a 16-px person**.

**And the distance gate lets them through**, so this is live rather than
hypothetical. `gate = max(BUBBLE_MAX_CAMD, camera.position.y * 2.4)`; the diorama
camera sits at y ≈ 101.7, giving a gate of 244 against a camera-to-subject distance
of 178.2. They fire.

The fix is a decision the photograph has to inform — a CSS scale of ~0.33 puts a
275 px bubble at 91 px with 4 px text, which is not readable, so "scale them" may
not survive contact. Suppressing them on the diorama loses the one thing that says
the town is alive. **Not decided here on purpose.**

---

## 14 · SIX WORLDS, PHOTOGRAPHED — THREE WINS, TWO BROKEN, ONE EMPTY

`qa/_dioshot6.mjs`, every world twice, `?dio=1` against `?dio=0`, same build and
same seeded profile. **The measured part held exactly:**

| | camD (dio → off) | hero px (dio → off) |
|---|---|---|
| maple | 174.1 → 58.2 | **225 → 182** |
| pirate | — → — | **224 → 153** |
| gameday | — → — | **224 → 140** |
| lantern | 175.6 → 89.5 | **224 → 139** |
| powder | 175.5 → 85.3 | **224 → 146** |
| skylark | 177.7 → 95.5 | **221 → 131** |

Predicted 178.2 and 219. And note the second column's *spread*: today the hero is
**131–182 px** depending on world; on the diorama he is **221–225**. The form pin
plus a fixed radius makes him the same creature at the same size on every world,
which is what a picker needs and what it has never had.

**But the pictures do not all agree with the numbers, and that is the finding.**

| world | verdict |
|---|---|
| **Game Day** | **best of the six.** The whole stadium in frame as an OBJECT, the field inside it, the tailgate lot behind. This is the reference shot. |
| **Maple** | **win.** A town block: park, fountain, a crowd walking through it, a road with a car, autumn trees. |
| **Pirate** | **win.** The coastline cuts against deep blue sea and already reads as the wedge's own edge — but a palm frond crosses the hero's face. |
| **Skylark** | hero reads beautifully; **the frame is an empty green field.** |
| **Lantern** | **broken.** A pagoda renders across the hero. |
| **Powder** | **broken.** The lodge's roof renders across the hero's face. |

### 14.1 "Renders across him" is not a rendering fault — he is standing behind the building

The face draws over the roof while the body does not, which is the signature of
`occludedSilhouette` (`void3d.ts:692`, `depthFunc: GreaterDepth`) — the x-ray ghost
that exists so he is never invisible. It is working exactly as designed.

The cause is upstream. `enterMenu` parks him **on the stage point**, and the stage
point was chosen to photograph a subject — Powder's lodge, Lantern's pagoda. At 85
units and low he stands in front of it; at 178 units and 34 degrees up, its roof
rises into the line of sight. **The hero has to move off the stage point toward the
camera on the diorama.** That is §11.1's salvage, unbuilt, and the photographs are
what proved it is required rather than nice.

So the occluder story is now two things, and neither is "suspend it":
- `fadeOccluders` must be **replaced** on the diorama, not removed (§13.1 says its
  shield, sized off hero radius, would ghost a 47-unit corridor through a 92-unit
  block; the photographs say something still has to clear Pirate's frond).
- The hero needs his own parking offset.

### 14.2 The stage points were chosen for the wrong camera

`deriveStage()` picks a spot that photographs well **at 58–95 units**. At 178 the
same spot frames something else entirely: on Skylark, an empty field; on Powder and
Lantern, the inside of a building. Three worlds got lucky. **The stages need
re-deriving at the diorama's distance**, which is a change to `deriveStage`'s
scoring, not a per-world authoring job.

### 14.3 The speech bubbles, confirmed by looking

§13.2 computed a 275 px bubble over a 16 px person. **Four of the six diorama shots
carry one** — "We are out of the big towels", "Gate C has the short queue.",
"Nobody wipes their boots. nobody.", "The lodge cocoa is famous in three valleys" —
each a full-size white slab against a town rendered a third of its former size. The
prediction was exact.

### 14.4 An instrument that does not work: `__menuState().drawCalls`

It reads **1** on every world on both sides. Not a sampling error — the max over 40
frames is still 1. `renderer.info.render.calls` after a `composer.render()` reports
only the LAST pass, and that pass is a fullscreen quad. **Whenever bloom is on, that
hook returns 1 and means nothing.** No cost figure in this section, because none had
been taken.

**CORRECTION (§18):** I went on to write that no honest cost figure was *possible*
yet. That was wrong — `qa/menucost.mjs` has solved this since day 1, and its
header states the exact trap above in as many words: *"on a rung carrying bloom
the composer makes about fifteen of those per animation frame, so a naive read
returns the cost of the LAST post pass — usually 1."* It turns `autoReset` off,
uses `animate()`'s own frame count as the unit, samples both shadow parities, and
A/Bs on ONE page load via `__menuOptim`. **The instrument existed and I did not
look for it before declaring there was none.** `qa/_diocost.mjs` borrows its
method verbatim and changes only the axis — `__dio` instead of `__menuOptim`.

---

## 15 · THE MENU HAS BEEN SHIPPING A FACELESS HERO ON HALF THE WORLDS

`qa/_dioocc.mjs`. §14 called powder and lantern "broken on the diorama". **That was
wrong, and backwards.** Measured geometrically — a 25×25 grid of rays from the lens
across the hero's projected disc, asking whether the scene's triangles stop each one
before it reaches his surface:

| world | % of the hero with something in front of him — **diorama** | **today's shipped menu** |
|---|---|---|
| maple | **2.7%** | 46.5% |
| pirate | **26.1%** | **100%** |
| gameday | **0.2%** | 0% |
| lantern | **59.2%** | **100%** |
| powder | **31.5%** | **100%** |
| skylark | **0%** | 0% |

**Three of six worlds ship a level picker where the hero is entirely behind
something**, and a fourth is half behind. Confirmed by looking:
`powder-dio0.png` is two eyes on a flat dark disc — no mouth, no blush, no face — and
`pirate-dio0.png` is a palm trunk and fronds drawn straight through a translucent
disc. What a child sees on those worlds is the **x-ray ghost**
(`void3d.ts` `occludedSilhouette`), which exists so she never *loses* her character —
not the character.

**So the diorama camera does not break occlusion. It strictly improves it on every
world**, and dramatically on the three that were already at 100%. Powder and lantern
are not "broken by the diorama"; they were broken before and are now merely bad.

### 15.1 Why the fade does not save them

`fadeOccluders` runs every frame on the menu. It is not firing on these, and the
candidate reason is that only `edibles` carrying a `fadeTo` qualify — a landmark
building or a palm may not be in that list at all. If that holds, `fadeOccluders` was
never going to fix pirate, powder or lantern, on the diorama *or* today.

### 15.2 The instrument, and the two ways I got it wrong first

The first version ported `qa/occlusion.mjs`'s O3 — five renders, hero visibility as a
luminance *contribution* ratio. On powder it reported **102.4% visible** and printed
PASS, on the world whose photograph plainly shows a lodge across his face.

1. **The denominator hid one mesh.** A raycast names the *first* mesh in the way and
   the probe switched that off. A lodge is not one mesh. Most of the building was
   still in the "occluder removed" render, so numerator and denominator were nearly
   the same frame — and the ratio passed 1, because removing one mesh also changes
   the backdrop behind him.
2. **A luminance test cannot see this symptom at all.** The x-ray ghost is working, so
   he *does* reach the screen through the lodge and "can you see him" is honestly
   ~100%. The fault is not that he is invisible — it is that a building is drawn
   **across** him. That is geometry, and no colour test will ever answer it.

A probe that disagrees with a screenshot is wrong until proven otherwise. This one now
agrees with all twelve.

---

## 16 · RETRACTION: THE OCCLUSION FADE HAS NEVER RENDERED A PIXEL

The previous commit fixed `fadeOccluders`' along-axis test — a real bug, and the
fix stands — but it claimed a visible result and showed a before/after pair of
Powder's menu to prove it. **The visible claim is withdrawn.**

**The dissolve is inert, deliberately, and has been since an earlier round:**
- `setDissolve` ends `void fade;` (`island.ts:4672`)
- `_fadeHook` pins `uFade.value = 1` unconditionally (`island.ts:4553`)
- the shader dithers only `if (uFade < 0.995 …) discard` (`island.ts:4362`)
- nothing else reads `userData.fade` for rendering

`island.ts:4545` says it outright: *"the machinery stays wired and INERT —
fadeOccluders still tracks who is in the way … so the next attempt starts from a
working selection rather than from nothing."*

So the render **cannot** depend on the value the fix changes. The difference
between those two screenshots was **the menu's own camera drift**: `menuT`
accumulates in GAME time, and a 20-second wall-clock wait at this sandbox's
0.4–2.9 fps is a different amount of game time on every load, so two shots of one
build sample different phases of the pendulum and the lodge moves relative to the
hero. The two images have been deleted rather than left to mislead.

**What the fix is worth, honestly:** the selection was wrong and is now right,
which is precisely what `island.ts:4545` asks to be kept true. Nothing a child can
see changes today. Found by an adversarial reader, not by me — I had the two lines
in front of me in §15 and wrote "the candidate reason is eligibility" instead of
reading them.

**And it moves the real fix.** With the dissolve inert, the x-ray ghost is not a
fallback — it *is* the guarantee (`island.ts:4663`: *"the guarantee moved to the
hero: he is drawn over whatever hides him"*). So the faceless hero on pirate,
lantern and powder is not a fade failure at all. **It is a parking failure**, and
the only fix is not standing him behind a building.

### 16.1 Two more corrections from the same pass

- **§14.3 undercounted the speech bubbles.** Five of six diorama shots carry one,
  not four — Maple's is lavender (the `event` palette) and was missed. Measured
  boxes: powder 258.5×29.5, skylark 213.5×30, lantern 179×29.5, gameday 177×28,
  maple 172×30.
- **§14's "a palm frond crosses the hero's face" on Pirate is wrong.** Measured off
  the PNG: 0.1% of his upper half and 1.35% of his face band carry a frond; 21.8%
  of his *lower* half does. **His face is clean.** Pirate is a win, and its flaw is
  somewhere else.
- **§13.1's 23.3× is a volume of air.** Props sit at y = 0 while the hero's centre
  is 10.8 above them, so at 32° the sight line leaves the prop plane immediately.
  The qualifying *ground* area grows 1.85× for buildings and 4.0× for street props
  — not 23.3×.

---

## 17 · THE WEDGE CAN NEVER COME INTO SHOT — AND TWO MORE OF MY NUMBERS

§12 hoped the islands' existing skirt (`island.ts:3773-3792`, `DEPTH = 9`) might
already be the floating wedge and the fix might be framing. **It is not, and the
reason is structural.** Three independent computations, each re-derived and
confirmed:

1. **The wall is invisible from any camera over the land, on any world, at any
   distance.** The skirt extrudes straight DOWN from the coast edge at the coast's
   own (x,z). A ray from a camera on the land side that clears the edge is already
   at y > 0 when it crosses the wall's plane; any steeper ray hits the land first.
   Worked at our own camera — 147.8 units back, 99.7 up — the grazing ray passes
   the wall plane at **y = +0.9**. The wall's screen width is exactly **zero**.

2. **Where the camera does stand over the sea, the near coast is below the bottom
   of the frame.** The ground visible runs 72.5 units in front of the aim to 112.9
   beyond it. Nearest coastline to each world's stage aim:

   | pirate | powder | lantern | skylark | gameday |
   |---|---|---|---|---|
   | **17.2** | 59.8 | 75.7 | 93.8 | 118.3 |

   **Only pirate's is inside the 72.5-unit near reach — and pirate is precisely the
   one world whose photograph has the edge in it.** That is the entire explanation
   for §14's "Pirate already half-reads as the object", and it is not a
   generalisable win.

3. **On the far side it is beyond reach and beyond the fog** (fog near = 204.9,
   far = 374.2 at this distance).

**So the plinth has to be built. There is no framing that gets it for free.**

### 17.1 Two errors in the code I shipped in §12

Both found by an adversarial reader, both re-derived here before accepting:

- **`DIO_FILL = 0.90` is a HEIGHT fill and the screen is PORTRAIT, so width binds.**
  At 178.2 units the frame is 102.2 units tall and **47.2 units wide**. A 92-unit
  block is 0.90× the height and **1.95× the width** — what is in shot is **half a
  block (51%)**, not a block. I wrote "a 92-unit block at 90% fill" in this brief
  and in the commit that shipped it. Independently confirmed by measuring the hero
  in `maple-dio1.png`: his disc spans 222 of 430 CSS px, putting the frame at 46.5
  units — 1.5% from the trig's 47.2.

- **`DIO_ELEV = 34` is the CAMERA's elevation, not the view axis.** The 0.085
  `lookAhead` pulls the aim 15.15 units toward the camera along the ground, which
  steepens the axis to **36.93°** below horizontal. §11.6's trap — "the camera that
  took the shots is not the camera the game has" — was still live, in my own code.

**The numbers are deliberately left alone.** Framing a whole block by width at 90%
needs the camera **386 units** back, where the hero reads **101 px** against
today's 131–182. The block-filling goal and "he reads as a character" are in direct
conflict, and the photographs already chose: at 178 Game Day frames its whole
stadium and Maple frames a park, a fountain, a crowd and a road, with the hero at
222 px. **The composition is right; only the rationale was wrong.**

### 17.2 The revised order, after the adversarial pass

Nothing survived both lenses unrefuted, and the refutations were mostly of PLANS
rather than DIAGNOSES. What is left, in order:

1. **Done.** The picker is quiet (§ bubbles, `qa/menuquiet.mjs`).
2. **The cast list first, before any plinth** — an `Object3D.layers` bit assigned at
   build time, not `visible=false` (§11.4's geometry leak).
3. **The hero's mark and the stage re-derive, in ONE change** — they are the only
   fix for lantern and powder, because the view axis is distance-invariant. The
   refuter's constraint: do NOT relax `deriveStage`'s shared `blockers`/`blocksShot`
   constants (`qa/levels.mjs` hard-gates `blocked !== 0`); build a second local list
   and a `marksClear()` that runs the full segment at the hero's eye height. And
   recentre the sun on the AIM in the frame loop, or the ±46 shadow box follows him
   off the block and the back row's shadows stop at a straight line.
4. **Then the plinth and the flat card.**
5. **The occlusion bar on all six worlds with a stated target** (≤5%), not only on
   the three that already pass.
6. **A "the object has something on it" bar** — skylark passes every test above and
   is still an empty field.

---

## 18 · A PRE-EXISTING FAILURE THE PUSH GATE HAS NEVER RUN

Chunking the gate surfaced this and then nearly mis-attributed it.

`qa/gate.mjs` registers `opening` on the push profile (maple only) and
`opening:<world>` for all six on **live** only. Its `--only` filter *replaced* the
profile filter rather than narrowing it, and a name also matches its per-world
children — so `--profile=push --only=opening` silently ran six live-only steps.
**Five failed, and it read as a regression from this branch's work.**

**It is not.** Verified by building commit `835b90c` — the last 44/44 push gate,
before any of today's changes — in a worktree and running it there:

| bar | at 835b90c | on HEAD |
|---|---|---|
| A1 clock ticks before the first touch | **2.996 s** (want 0) | 3.082 s |
| A5 descent duration | **929 ms** (want 1100–1300) | 932 ms |

Identical. The filter is fixed (`--only` now narrows the profile; use
`--profile=live` to reach live steps), so this cannot be misread again.

**But the finding is real and should not be lost.** On the five worlds reached by
a world switch — that is, every world except the one that never reloads — the
match clock has already run ~3 seconds before the child's first touch, and the
opening descent is ~930 ms against an authored 1100–1300. She loses three seconds
of a 180-second match before she can steer, and the establishing shot is a quarter
too fast. `qa/opening.mjs` was written to catch exactly this and has been saying so
on the live profile. Out of scope here; recorded so it is not rediscovered a third
time.

---

## 19 · THE DIORAMA COSTS 2.10x TODAY'S MENU FRAME — AND DAY 9 HALVED IT

`qa/_diocost.mjs`, all six worlds, **A/B on one page load** via `__dio` so the
island's scatter cannot move between the samples, `info.autoReset` off so the
composer's ~15 renders per frame accumulate, `animate()`'s own frame count as the
unit, and OFF → DIORAMA → OFF so the third sample controls the first.

| world | menu | diorama | ratio | tris menu → diorama | control drift |
|---|---|---|---|---|---|
| maple | 288 | 617 | **2.14x** | 94,546 → 173,705 | 5.2% |
| pirate | 284 | 781 | **2.75x** | 110,294 → 221,356 | 0.4% |
| gameday | 351 | 530 | **1.51x** | 112,658 → 126,943 | 1.1% |
| lantern | 550 | 979 | **1.78x** | 143,252 → 171,245 | 0.0% |
| powder | 223 | 536 | **2.40x** | 54,497 → 102,363 | 8.5% |
| skylark | 540 | 1101 | **2.04x** | 144,050 → 218,430 | 9.4% |

**Mean 2.10x over six stable worlds.** Every control sample returned within 10%, so
no row is thrown out.

**Day 9 halved this frame and the saving is not to be given back. The diorama gives
back all of it and a little more.** That is a standing constraint, not a preference,
and this is the first number that tests it.

### 19.1 What it settles

**The cast list is required, not a premature optimisation.** I deferred it twice on
the grounds that optimising before measuring is backwards, and asked the design pass
to argue it either way. The measurement answers it: 2.10x has to come down before
the diorama can ship off the flag.

**Skylark is paying the most to show the least** — 1101 calls a frame, the highest
of any world, for the frame that scores 29.7% on the fullness bar and reads as an
empty field. It is simultaneously the worst picture and the dearest one.

**Gameday is the cheapest ratio at 1.51x** and is also the best frame. Whatever it
is doing, it is the reference for the other five.

### 19.2 What it does not say

These are **draw calls and triangles** — what the CPU submits, which is
renderer-independent and meaningful under swiftshader. **Frame TIME is not**, and
none is quoted. A phone's actual cost also depends on fill rate and shader work,
which this does not measure. The ratio is the honest claim; a millisecond figure
needs the device day (MENU-BRIEF §6 day 15).
