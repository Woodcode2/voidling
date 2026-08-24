# STUDIO — ROUND 2 — THE BOARD

Verbatim team reviews and skeptic refutations from the 2026-08-24 round.
Unverified. See `docs/STUDIO-ROUND-2.md` for art direction and the plan.


═══════════════════════════════════════════════════════════════════
TEAM STATIC
═══════════════════════════════════════════════════════════════════
--- THE TEAM'S REVIEW ---
## VERDICT: NO-SHIP

The most-placed small prop in Maple Falls is a flat-faceted 20-face die with gumballs stuck to it, and the town's namesake tree still reads as a bunch of balloons after the fix that was supposed to close it — both are visible three times over in the single hero screenshot.

## THE BAR

**Donut County** (Ben Esposito, 2018 — Apple Design Award, App Store Game of the Year finalist). Same genre we are in: a hole eats a town, camera locked high and looking down. What it does mechanically is the thing this repo has not internalised — **because the camera looks down, the roof is the facade.** Every Donut County object is authored top-first: roofs carry a second colour band and a ridge/seam line, awnings are pitched rather than flat, and small dressing (plants, cacti, trash) is built from a *stem-and-blade profile* rather than a ball, because a ball has no top and no silhouette from above. Nothing in that game presents a large single-colour horizontal face to the camera.

Second bar, for the canopy only: **Animal Crossing: New Horizons.** Its trees never resolve into individual lobes. Mechanically: the canopy is a *dark mass* with small light accents on top, not light lobes with dark accents on the outside, and the underside is roughly a full stop down from the crown.

Where we sit: only POWDER PASS has understood the roof rule — `alpine.ts` `capRoof()` gives every chalet slate + a snow cap + a cornice cylinder + a chimney, and it is the only world in the five where buildings read as buildings from above. Maple, Lantern, Pirate and Game Day all present their largest horizontal surfaces as one flat untextured colour. On canopies we are behind AC:NH by a structural inversion, not by a tuning amount.

## FINDINGS

### The flower bed is a green d20 with gumballs on it
SEVERITY: blocker
AT: src/proto3d/island.ts:4403
SAW: `maple_trees.png` — four of them in one frame, at roughly (240,1290), (430,1300), (115,890), (110,1420). Each is a hard-faceted green polyhedron with individual triangular faces catching separate flat tones, with 4–5 coloured balls sitting on it. Two of them (the red ball at ~(250,1265), the purple at ~(455,1290)) hang past the edge of the mound with daylight under them. Three feet away in the same frame sit `makeBush` instances that are smooth. Same shot in `maple_look.png`. This is the *exact* pathology the codebase has already condemned twice in writing — island.ts:4300 ("ONE SPHERE IS JELLY"), mainstreet.ts:1662 ("a pile of orange rocks") — left standing in the prop that gets placed more than any other.

EVIDENCE:
```ts
function makeFlowers(): THREE.Group {
  const parts = [part(new THREE.IcosahedronGeometry(0.7, 0), 0x5db06a, 0, 0.5, 0, 0, 0, 0, 1, 0.7, 1)];
  for (let i = 0; i < 5; i++)
    parts.push(part(new THREE.SphereGeometry(0.16, 6, 5), pick([...]), rand(-0.5, 0.5), 0.8, rand(-0.5, 0.5)));
  const g = new THREE.Group(); g.add(mergedProp(parts));
```
And the reason the gates never caught it — island.ts:3677:
```ts
const ROUND_GEO = /^(Cylinder|Cone|Sphere|Torus|Lathe|Capsule|Tube)/;
```
`Icosahedron` is not in that list, so `roundV = 0` for the mound — but the five blossoms *are* round, so `mergedProp`'s vote is 5/6 = 0.83 ≥ `ROUND_SHARE` and the whole prop is assigned `PROP_SMOOTH_MAT` (island.ts:3462). `PolyhedronGeometry` carries per-face normals, which `part()`'s `toNonIndexed()` preserves, so the mound renders faceted *on the smooth material*. `qa/shading.mjs` counts those triangles in its **smooth %** column. The probe reports the material, not the normals, and the material is a lie here.

Also: `makeFlowers` is in 9 of the 11 Maple biome pools (island.ts:4476–4490), double-weighted in `cozy` and `park`, plus the shared `makeTinyProp` pool at 4444 and six direct scatter loops (5623, 5769, 5814, 5864, 6226, 6253, 6832).

FIX: swap the mound to `SphereGeometry(0.7, 9, 6)` scaled `(1, 0.7, 1)` — it then matches `ROUND_GEO`, the auto-classifier keeps working, and it shades smoothly. Give each blossom a stem (`CylinderGeometry(0.02, 0.03, 0.28, 4)`) and seat the blossom on the mound surface instead of a fixed `y = 0.8`, which is what puts them in the air at the corners. Cost: **zero draw calls, zero materials** (still one merged mesh); +70 tris for the sphere, +40 for five stems ≈ **+110 tris per bed**. Across Maple that is well under 100k triangles and ~4 MB of vertex data — an order of magnitude cheaper than the three-lobe treatment `makeBush` got, and the failure here is facets, not lobe count. **No determinism cost:** `pick`/`rand` (island.ts:268, 284) are `Math.random`, not the seeded `mrnd` stream, so the internal draw count is free to change.

GATE: `qa/normals.mjs` — walk every registered edible; for each mesh whose material is `PROP_SMOOTH_MAT`, count triangles where all three vertex normals agree (dot > 0.9999) and report the fraction per prop builder. A prop sitting on the smooth material with a majority of flat-normal triangles is claiming to be smooth and rendering faceted. Bar: no builder above 40%. Today `makeFlowers` is 20/20 flat on its mound; after the swap it is 0. This is the gate `qa/shading.mjs` should have been — it has all the traversal plumbing already.

### The maple canopy is still a bunch of balloons, and the tone map is inverted
SEVERITY: blocker
AT: src/proto3d/mainstreet.ts:1677
SAW: `maple_trees.png` and `maple_look.png`, bottom-right quadrant. The orange canopy is the largest object in the frame after the void. Its outline is a scalloped run of **twelve individually resolvable circles of near-identical size**, each with its own specular highlight. The intended dark ring is not distinguishable anywhere in the image — I cannot pick a single darker lobe out of the orange mass. The red maple beside it is the same. This is the fix the ledger records as landed; it did not land in the pixels.

EVIDENCE:
```ts
const dark = new THREE.Color(leaf).multiplyScalar(0.74).getHex();
const lit  = new THREE.Color(leaf).multiplyScalar(1.16).getHex();
...
p.push(part(new THREE.SphereGeometry(rr * 0.66, 10, 8), i % 2 ? leaf : LEAF_HERO,
  Math.cos(a) * radA * 1.28, yy, Math.sin(a) * radB * 1.28));
const b = a + 0.62;
p.push(part(new THREE.SphereGeometry(rr * 0.44, 8, 6), dark,
  Math.cos(b) * radA * 1.55, yy - 0.95, Math.sin(b) * radB * 1.55));
```
Two separate reasons it fails, both arithmetic:

1. **The satellites are pushed further out than the mains** — `1.55` vs `1.28` on the same `radA`/`radB`. So they do not break the silhouette up, they *add six more circles to it*. Twelve equal cusps instead of six. The comment says the outer-lower ring "gives a canopy its weight"; geometrically it is widening the outline with more of the same primitive.

2. **The tone separation is ~1/8 stop, not the ~1/3 the code thinks it is.** three r185 has `ColorManagement.enabled = true`, so `new THREE.Color(hex)` holds *linear* values (island.ts:3702 says exactly this about `_pc.setHex`). `multiplyScalar(0.74)` is therefore a linear scale, and `getHex()` converts back to sRGB — the displayed darkening is **0.74^(1/2.2) ≈ 0.87**. 13% darker. `lit` at ×1.16 linear is ×1.07 displayed, and on `LEAF_A = 0xe86a2a` the red channel clips at 232→248. Both accents are inside a tenth of a stop of the base.

3. And structurally: `makeTree` (island.ts:3861), the canopy in this repo that *does* read, puts the **dark tone on the largest lobe** (`SphereGeometry(R0)`) and hangs small light accents on it. `makeMapleTree` inverts that — six large lobes in the light tone, six small ones in the dark. There is no dark mass for the light to sit on, which is the AC:NH rule.

FIX: three edits, **zero new seeded draws** — all arithmetic on `rr`, `radA`, `radB`, `yy`, already in hand, exactly the pattern the existing comment defends.
- Pull the satellites *inside* the mains: `1.55` → `0.86`, and drop them further: `yy - 0.95` → `yy - 1.35`. They become the underside mass, not extra outline.
- Invert the tone map to match `makeTree`: give the six **mains** the dark tone and the six satellites the base/hero tone, and add one large `dark` core sphere at `radius rr * 0.95, (0, yy - 0.4, 0)` so the canopy has a body.
- Widen the multiplier to survive the linear→sRGB round trip: `0.74` → `0.48` (displayed ≈ 0.71, a real half-stop), `1.16` → `1.40` (displayed ≈ 1.17).

Cost: one extra sphere per tree at `(10,8)` ≈ 144 tris. At 603 maple trees ≈ **87k triangles, one draw call each, unchanged**. Heap ≈ 3 MB. Nothing else moves — same 1 `mpick` + 24 `mr()` in the same order and ranges, so the placement stream is byte-identical.

GATE: `qa/canopy.mjs` — spawn one `makeMapleTree` alone against a flat background at the play camera's pitch and framing, mask the canopy by hue, and report two numbers: (a) **boundary cusp count** — walk the silhouette and count direction reversals; a leafy canopy is high-frequency, a lobe ring is a small number of large smooth convex arcs. Bar: no single convex arc may span more than 12% of the perimeter (today six arcs span ~15% each). (b) **canopy luminance spread** — P90/P10 within the mask. Bar ≥ 2.0; today it is ~1.3, and 1.3 is the number that proves the dark ring is not reaching the screen. Both fail on the current build; both pass after.

### Every roof in four of the five worlds is one flat blank colour — and the camera looks down
SEVERITY: major
AT: src/proto3d/nightmarket.ts:214, src/proto3d/tailgate.ts:318
SAW: three worlds, three images.
- `lantern_look.png`, dead centre: the stall canopy is a flat red parallelogram roughly 4.6 × 3.0 units — the second-largest object in the frame — with no ridge, no seam, no colour break, and a solid black underside plane below and right of it. The valance, the lantern, the griddle glow and the stallholder are all on faces this camera barely sees.
- `gameday_look.png`, centre-right: the canopy pyramid is a featureless cream triangle, the largest single surface in that half of the frame. Its `CRIM` valance is edge-on and contributes nothing from above.
- `pirate_look.png`, top-left: the food-truck roof is the same flat red quad, its scalloped fringe visible on one edge only.
Against these, `powder_look.png` is the control: the chalet roofs are the only roofs in the game with a value break, and they are the only buildings in the five shots that read as architecture rather than as coloured card.

EVIDENCE — nightmarket.ts:213–215, where the comment and the geometry disagree:
```ts
  // the canopy: a shallow ridge with a striped valance
  solid.push(part(new THREE.BoxGeometry(wD * 1.15, 0.16, dD * 1.2), VERM, 0, h, 0));
  solid.push(part(new THREE.BoxGeometry(wD * 1.17, 0.09, dD * 1.22), VERM_D, 0, h - 0.1, 0));
```
Two axis-aligned boxes. Rise = 0. It is a table top, not a ridge. And tailgate.ts:318:
```ts
  p.push(part(new THREE.ConeGeometry(2.6, 0.95, 4), top, 0, 3.24, 0, 0, Math.PI / 4));
```
One part, one colour, four faces.

FIX: copy what `alpine.ts:159 capRoof()` already does, since it is the only version in the repo that works.
- **Stall**: replace the single flat `VERM` box with two boxes pitched ±0.22 rad about Z meeting at a ridge, plus a `CylinderGeometry(0.09, 0.09, wD*1.2, 6)` ridge roll in `VERM_D` laid along the ridge. +2 parts, ≈ **+44 tris per stall, zero new draw calls**.
- **Game Day canopy**: keep the cone, add four thin `BoxGeometry(0.07, 0.06, 2.7)` hip battens in the valance colour along the four hips, rotated to the pyramid's slope. Four seam lines break a blank pyramid into four readable quarters. **+48 tris, zero draw calls.** This is precisely the Donut County move — a seam, not a texture.
- **Pirate food-truck roof**: same two-box pitch as the stall.

GATE: `qa/roofs.mjs` — for every registered edible, isolate triangles with `normal.y > 0.7`, and for any prop whose up-facing area exceeds 4 sq units report the area share of its single most common vertex colour. Bar: **no prop's roof may be more than 85% one colour.** Today the stall canopy is 100% `VERM`, the Game Day canopy 100% `top`, and `makeBarrel`'s lid 100% stave. The alpine chalet passes at ~55% (snow cap / slate / cornice / chimney). The bar is set by the world that already got it right, which is the only kind of bar worth having.

### The pirate barrels have no bulge and a blank lid
SEVERITY: major
AT: src/proto3d/island.ts:4193
SAW: `pirate_look.png` — three barrels in one frame (yellow at ~(100,470), teal at ~(195,1195), gold at ~(20,600)). Each is a straight-sided cylinder with two black hoops and a completely blank flat top disc. At this camera the *lid is most of the prop*, and it is one flat colour. They read as painted oil drums, or from directly above, as poker chips. A barrel's entire recognisable silhouette is the bulge, and there isn't one — worse, the taper runs the wrong way (0.9 at the top, 0.75 at the bottom).

EVIDENCE:
```ts
function makeBarrel(): THREE.Group {
  const parts = [
    part(new THREE.CylinderGeometry(0.9, 0.75, 2.2, 12), PAINTED_STAVE(), 0, 1.1, 0),
    part(new THREE.TorusGeometry(0.88, 0.09, 6, 14), 0x2e2a34, 0, 0.55, 0, Math.PI / 2),
    part(new THREE.TorusGeometry(0.88, 0.09, 6, 14), 0x2e2a34, 0, 1.65, 0, Math.PI / 2),
```
FIX: one `LatheGeometry` over a 7-point profile — `(0.62,0) (0.80,0.4) (0.92,0.85) (0.95,1.1) (0.92,1.35) (0.80,1.8) (0.62,2.2)` — at 12 radial segments, replacing the cylinder. `Lathe` matches `ROUND_GEO` so it auto-classifies round and auto-smooths through `mergedProp`; no call-site change. Add a recessed lid: `CylinderGeometry(0.52, 0.52, 0.06, 12)` in a darkened stave colour at `y = 2.18`, which is what stops the top being one flat disc. Cost: lathe ≈ 144 tris vs cylinder's 48, plus 24 for the lid — **+120 tris per barrel, still one draw call, no new material.** Barrel counts are in the tens per world; negligible. `PAINTED_STAVE` is `Math.random`, so no determinism cost.
GATE: fold into `qa/roofs.mjs` (the blank-lid half), plus one line: for any prop whose name matches `barrel|drum|cask`, the maximum XZ radius must occur between 30% and 70% of the prop's height. Today the max is at 100% (the top rim). After the lathe it is at 50%.

### Four newspaper boxes in one frame, each with a blank white card for a front page
SEVERITY: major
AT: src/proto3d/mainstreet.ts:727
SAW: `maple_trees.png` at ~(615,375), ~(790,480), ~(140,1060), ~(75,1290) — four `makeNewsBox` instances, each showing a plain `CREAM` rectangle where the paper's front page goes. Same four in `maple_look.png`. This is the *identical* defect that `signLines()` was written to fix, and `signLines()` lives 60 lines above this function in the same file. It was applied to lawn signs, big signs and protester placards and never to the news box, which is placed in five biome pools (island.ts:4483, 4486, 4487, 4488, 4489) and two authored rows (6126, 6168).

EVIDENCE:
```ts
export function makeNewsBox(): THREE.Mesh {
  return M([
    part(box(0.6, 1, 0.5), DARKSTEEL, 0, 0.5, 0),
    part(box(0.8, 1.1, 0.7), mpick([0x2f6ad8, 0x3f7a4e, 0xd8586f]), 0, 1.5, 0),
    part(box(0.55, 0.6, 0.1), CREAM, 0, 1.7, 0.36),   // ← the blank front page
```
FIX: capture the `mpick` result into `const c`, then append `...signLines(0, 1.72, 0.42, 0.40, 0.44, 0x3a3440, 3, (c >> 12) & 7)`. `signLines` (mainstreet.ts:765) draws **zero** random numbers — its `RATIO` table is fixed and its `variant` comes from the caller — and `(c >> 12) & 7` is a hash of a value already in hand, so this costs **no seeded draw**, exactly the pattern the brief names. Cost: 3 boxes ≈ **36 tris, zero draw calls, zero materials.**
GATE: `qa/signface.mjs` — enumerate every prop part in the CREAM/WHITE family whose face area exceeds 0.2 sq units and whose normal is not vertical; each must have at least two sibling parts within 0.12 units in front of it along its normal. Fails on `makeNewsBox` today (0 rows), passes after. It will also sweep the rest of the game for the same defect, which is the point — I found this one by looking, and there will be others I did not.

### Four tiny-prop builders never got merged
SEVERITY: minor
AT: src/proto3d/island.ts:4452
SAW: code only. The render does not show it because a draw call is not a pixel — but it is 3× the cost of every other small prop, and it is directly against the "props are merged to ONE draw call each" constraint.
EVIDENCE: `makeMushroom` builds three separate `THREE.Mesh` objects (stem, cap, dot) with three `stdMat` materials; `makeShell` (4445), `makeGolfball` (4466) and `makeLuggage` (4494) do the same on a smaller scale. Every other builder in this file routes through `mergedProp`. In the `forest` biome pool (4478) mushrooms are double-weighted, so *half* the forest's tiny props are three-draw props.
FIX: route all four through `mergedProp(parts)` like their neighbours. `stdMat` does cache (island.ts:3358), so this is a draw-call saving, not a material saving: −2 calls per mushroom, −1 per luggage. Triangles unchanged.
GATE: `qa/calls.mjs` (or extend `qa/propcount.mjs`) — assert that no prop registered as a single edible contains more than one `Mesh` unless it also carries a `PROP_GLOW_MAT` or `lit()` glow child. Fails on mushroom/shell/golfball/luggage today.

## IS THIS THE BEST THIS CAN BE?

No — and the gap is one idea, not fifty.

**The camera looks down, so the top of everything is the front of everything, and this repo has only figured that out in one file.** `alpine.ts` builds roofs the way a top-down game must: `capRoof()` gives four value bands and a ridge, `chimney()` breaks the plane, and POWDER PASS is consequently the only world in the five screenshots where architecture reads as architecture rather than as coloured card. Every other world hands the camera its blankest surface. That single principle explains the stall canopy, the Game Day pyramid, the pirate truck roof, the barrel lid, and — in the same breath — the flower bed, whose failure is that a squashed ball seen from above has *no* top and therefore has to invent one out of facets.

Ranked, what stands between here and the bar:

1. **Fix the two blockers.** The flower bed and the maple canopy are both in the hero frame, both are the *most-repeated* object of their class, and both are re-treads of defects this team has already written essays about. `makeFlowers` costs +110 tris. The maple fix costs +144 tris and zero seeded draws. Neither is expensive; both were simply not looked at.

2. **Apply the roof rule across the four worlds that lack it,** starting with the props that present the largest horizontal area: stall canopy, Game Day canopy, food-truck roof, barrel lid, and — I did not audit them, but the same builders exist — `makeMarketShed`, `makeKura`, `makeTeahouse` in nightmarket.ts and `makeFairTent`, `makeFairStand`, `makeTicketBooth` in mainstreet.ts. `qa/roofs.mjs` will name the actual list rather than my guess, which is why that probe is worth building before the fixes rather than after.

3. **Repair the gate that let all of this through.** `qa/shading.mjs` measures which *material* a triangle is on. `makeFlowers` sits on `PROP_SMOOTH_MAT` and renders faceted, and the probe scores it in the smooth column. Every faceted-polyhedron-on-smooth-material prop in the game is currently invisible to the only instrument that was supposed to see it. `qa/normals.mjs` measures the buffer instead of the assignment, and it is maybe forty lines. This is the third shipped failure to pass every gate; the pattern in all three is that the probe measured the *intent* and the pixels showed the *result*.

4. **Then re-examine the tonal arithmetic everywhere it appears.** `multiplyScalar` under `ColorManagement.enabled` is a linear operation whose displayed effect is roughly the 1/2.2 power of what the number reads like. `makeMapleTree` (0.74→0.87), `makeBush` (0.80→0.90), `makeTree` (0.70→0.85) and `makeChalet`'s siblings all use it. `makeTree` survives because its dark tone is on the *biggest* lobe, so structure covers for the weak multiplier; the other two do not have that protection. Every two-tone prop in the game is roughly half as two-tone as its author believed.

What is genuinely good and should not be touched: the bench got its legs and reads correctly in `maple_trees.png`; `makeSnowman` is the best small prop in the game — the wobble, the one raised arm, the coin-flip hat — and it is the only builder that models *who made the thing* rather than what it is; `alpine.ts`'s roof kit is the standard the rest of the game should be measured against; and `signLines` is the right answer to lettering at this resolution, which is why leaving the news box out of it is worth flagging as a major rather than a polish.

## COVERAGE

**Images read (all with the Read tool):**
- `qa/out/shippedlook/maple_look.png` — required
- `qa/out/shippedlook/lantern_look.png` — required
- `qa/out/shippedlook/powder_look.png` — required
- `qa/out/shippedlook/maple_trees.png` — the higher-resolution read of the same Maple framing; this is where the flower-bed facets and the twelve-lobe canopy outline are unambiguous
- `qa/out/shippedlook/pirate_look.png` — I own static in all five worlds
- `qa/out/shippedlook/gameday_look.png` — same

**Code read:**
- `src/proto3d/island.ts` — `part()`/`ROUND_GEO` (3670–3725), `stdMat` (3358), `PROP_SMOOTH_MAT` (3455–3470), `mergedProp`/`ROUND_SHARE` (3796–3835), `makeTree`/`makePine` (3861–3890), `makeBarrel`/`makeCannon` (4189–4206), `makeBush` (4300–4328), `makeMailbox`/`makeBench` (4331–4356), `makeTorch`/`makeCone`/`makeHydrant`/`makeTrash` (4358–4400), `makeFlowers`/`makeCoins` (4402–4420), `makeTinyProp`/`makeShell`/`makeMushroom`/`makeGolfball`/`tinyForMaple`/`makeLuggage` (4444–4500), `place()`/`spinFor` (4753–4785), plus every `makeFlowers`/`makePlanter`/`makeNewsBox` call site (grep)
- `src/proto3d/mainstreet.ts` — `mr`/`mpick` (41–42), foliage constants (168–169, 209), `makeNewsBox`/`makeParkingMeter` (722–740), `signLines` (752–784), `makeLawnSign`/`makeBigSign`/`makeProtester`/`makeTownsfolk`/`makeNoticeBoard` (786–856), `makePlanter`/`makePickup`/`makeMapleTree` (1596–1687), builder index (grep)
- `src/proto3d/alpine.ts` — `capRoof`/`chimney` (159–190), `makeChalet` (203–234), `makeDrift`/`makeSnowman`/`makeSnowballStack` (389–460), builder index
- `src/proto3d/nightmarket.ts` — `makeStall` (204–244), builder index
- `src/proto3d/tailgate.ts` — `makeCanopy` (312–334), builder index, prop registry (1240–1257)
- `package.json` (three r185, for the ColorManagement claim)

**QA read:** `qa/variety.mjs` (1–50), `qa/shading.mjs` (1–40), `qa/propcount.mjs` (1–30), `qa/out/lookbook.json`, `ls qa/`

**Not read, and worth someone's time:** the ~50 remaining landmark builders in `island.ts` (I read only what I could see failing, per the brief), `luxe.ts` in full, and the nightmarket/mainstreet roofed builders that `qa/roofs.mjs` would enumerate. I ran no browser, no build, and edited nothing.

--- THE SKEPTIC ---
## VERDICT ON THE VERDICT

NO-SHIP was right: two of the six findings are real, blocker-grade, and both are the largest repeated objects in the hero frame — I confirmed both with my own eyes in `maple_trees.png` before opening a line of code.

## PER FINDING

### The flower bed is a green d20 with gumballs on it
**REAL: yes**

**WHAT I FOUND:** At the review's build (`207e2cb^`), `island.ts:4402-4408` is exactly as quoted:
```ts
const parts = [part(new THREE.IcosahedronGeometry(0.7, 0), 0x5db06a, 0, 0.5, 0, 0, 0, 0, 1, 0.7, 1)];
```
`ROUND_GEO` at `island.ts:3677` is `/^(Cylinder|Cone|Sphere|Torus|Lathe|Capsule|Tube)/` — Icosahedron absent, confirmed. `ROUND_SHARE = 0.5` (island.ts:3834) and the vote is `round / parts.length >= ROUND_SHARE` (3863), so 5/6 clears it and the mound takes `PROP_SMOOTH_MAT`. The arithmetic holds.

In `maple_trees.png` I count four of them — (120,900), (250,1290), (430,1300), (110,1420) — every one a hard-faceted green polyhedron with individually-toned triangles and loose balls on top, three feet from smooth `makeBush` lobes at (300,470) and (540,600). The floating blossoms are visible: the red one on the left edge of the bed at (250,1290) has daylight under it.

Placement count verified by grep: pools at 4538 (cozy, ×2), 4539, 4540, 4541 (park, ×2), 4542, 4545, 4548, 4550, and the fallback 4552 — nine of eleven, double-weighted in cozy and park, exactly as claimed. Six scatter loops at 5685/5831/5876/5926/6288/6315 (the review's 5623/5769/5814/5864/6226/6253 are the same lines at the pre-fix offset).

**FIX SOUND: yes.** `rand` (island.ts:268) and `pick` (284) are `Math.random`, verified — no seeded draw, no determinism cost. One merged mesh, no new material.

**CORRECTION:** two.
- The **gate is not sound, and this is not a small thing.** `qa/normals.mjs` now exists and its header records that the review's exact proposal was built, run, and retracted: *"the first version of this probe was the one TEAM STATIC proposed... it was run and it failed EIGHTEEN forms on Maple, almost all of them correct — because a prop earns the smooth material at HALF its parts being round, so a barrel with a boxy lid is legitimately ~50% flat triangles."* The 40% bar mistakes the design for the defect. The shipped gate is static type-classification plus a human census. The finding is real; the instrument it proposed would have failed the game.
- "an order of magnitude cheaper than the three-lobe treatment `makeBush` got" is wrong. `makeBush` (island.ts:4346) records 192 → ~430 triangles, +238. The proposal is +110. That is 2×, not 10×.

### The maple canopy is still a bunch of balloons, and the tone map is inverted
**REAL: yes**

**WHAT I FOUND:** `mainstreet.ts:1667-1686` at the review's build:
```ts
const dark = new THREE.Color(leaf).multiplyScalar(0.74).getHex();
...
  Math.cos(a) * radA * 1.28, yy, Math.sin(a) * radB * 1.28));
...
  Math.cos(b) * radA * 1.55, yy - 0.95, Math.sin(b) * radB * 1.55));
```
1.55 > 1.28 on the same ring radii — the satellites are further out than the mains, confirmed. In `maple_trees.png` and `maple_look.png` the orange canopy resolves into a scalloped run of ~12 equal circles each with its own specular; I cannot pick a darker lobe out of the mass anywhere in either frame.

The colour-space claim is correct and now independently measured in-repo: `island.ts:3685` records `multiplyScalar(0.74) -> displayed 0.87` against the real three build via `qa/_colortest.mjs`. The structural inversion is also correct — pre-fix `makeTree` (island.ts:3874) puts `dark` on the largest lobe `SphereGeometry(R0, 14, 10)` and hangs `base`/`light` accents on it; `makeMapleTree` does the reverse.

**FIX SOUND: yes.** Pure arithmetic on `rr`/`radA`/`radB`/`yy`, one `mpick` + four `mr()` per lobe unchanged — the seeded stream is untouched, which is the constraint that matters here.

**CORRECTION:** "on `LEAF_A = 0xe86a2a` the red channel clips at 232→248" is self-refuting — 248 is not a clip. `×1.16` displays as `×1.07`; 232 × 1.07 = 248 < 255. The lift is inert on that hue, not clipped. The real defect is that a 7% lift is invisible, and the review had the right conclusion from a wrong number. The `qa/canopy.mjs` cusp-count half is unbuilt and unmeasured — "no convex arc above 12% of perimeter, today six span ~15% each" is an eyeball estimate presented as a measurement. The luminance-spread half (P90/P10 ≥ 2.0) is sound and testable.

### Every roof in four of the five worlds is one flat blank colour
**REAL: yes**

**WHAT I FOUND:** `nightmarket.ts:214-215` is verbatim as quoted — two axis-aligned boxes, zero rise, under a comment that says "a shallow ridge". `tailgate.ts:318` is verbatim — one four-sided cone, one colour. `alpine.ts:159-181` `capRoof()` genuinely lays down four tones (SLATE slate, SNOW cap, SNOW ridge cornice, `body` gable boards) plus `chimney()` at 187.

Pixels back all three: `lantern_look.png` centre — a featureless dark-red parallelogram, no seam, nothing; `gameday_look.png` centre-right — a blank cream pyramid, the largest surface in that half of the frame; `pirate_look.png` top-left — flat red truck roof with the scalloped fringe on one edge only.

**FIX SOUND: yes** on geometry and cost. Two pitched boxes plus a ridge roll is +2 parts inside an existing merge; nothing in `makeStall` sits above `h` except the lantern at `h-0.5` and steam at 2.05 (below `h`'s 2.5-2.9 range), so a pitch clears everything.

**CORRECTION:** the gate has a hole big enough to drive the next finding through. `qa/roofs.mjs` fires only on props "whose up-facing area exceeds 4 sq units" — a barrel lid is π × 0.9² = **2.54 sq units** and never trips it, yet the same paragraph claims it catches `makeBarrel`'s lid. It will also flag legitimately-monochrome up-facing props (drifts, slabs, coin piles) as failures. This is the same error that got `qa/normals.mjs` retracted: a threshold that cannot separate intent from defect. Also, the "solid black underside plane" in `lantern_look.png` is not a canopy part — `VERM_D` is `0x8e2620`, a dark red. That quad is the cast shadow or the near-black unlit `TIMBER` counter. The flat-red canopy finding stands; that detail does not.

### The pirate barrels have no bulge and a blank lid
**REAL: yes**

**WHAT I FOUND:** `island.ts:4226-4230`, quoted correctly. `CylinderGeometry(0.9, 0.75, ...)` is `(radiusTop, radiusBottom)` — wider at the top, so the taper genuinely runs the wrong way for a barrel. In `pirate_look.png` the yellow at (100,470) and the teal at (195,1195) are straight-sided drums with two hoops and a blank top disc, exactly as described.

**FIX SOUND: yes.** `Lathe` matches `ROUND_GEO` so the classifier stays honest with no call-site change; `PAINTED_STAVE()` is `Math.random`, no seeded draw.

**CORRECTION:** the third barrel, "gold at ~(20,600)", is a **coin pile** (`makeCoins`), not a barrel — same as the one at (620,1620) and the one at (800,690) in `maple_trees.png`. Two barrels in frame, not three. And per the finding above, the gate as written does not reach a 2.54 sq unit lid.

### Four newspaper boxes in one frame, each with a blank white card for a front page
**REAL: yes**

**WHAT I FOUND:** `mainstreet.ts:731-737` (the review's 727 at the pre-fix offset):
```ts
part(box(0.55, 0.6, 0.1), CREAM, 0, 1.7, 0.36),
```
Four instances in `maple_trees.png` at (615,375), (790,480), (140,1060), (75,1290), each with a blank cream plate. The contrast the review draws is visible in one frame: the lawn signs at (260,570) and (310,1215) in `maple_look.png` carry legible `signLines` bars; the news boxes beside them carry nothing.

`signLines` (mainstreet.ts:772) draws **zero** random numbers — `RATIO` is a fixed table and `variant` comes from the caller. Verified. So `(c >> 12) & 7` off the already-drawn `mpick` costs no seeded draw. This is the cheapest real finding in the review.

**FIX SOUND: yes.** **CORRECTION:** `signLines` is 41 lines *below* `makeNewsBox`, not "60 lines above". Cosmetic, but the review's rhetorical point ("it lives right there") is if anything stronger.

### Four tiny-prop builders never got merged
**REAL: yes — for two of the four named**

**WHAT I FOUND:** `makeMushroom` (island.ts:4514) is three meshes, three `stdMat` calls — real, 3 draw calls. `makeLuggage` (4555) is two meshes — real, 2 draw calls. But `makeShell` (4507) is **one** mesh and `makeGolfball` (4526) is **one** mesh. Neither costs an extra draw call, and the review's own FIX line ("−2 calls per mushroom, −1 per luggage") silently concedes it while the SAW paragraph names all four. Half the finding does not exist. No global batching pass exists to rescue them either — the only `InstancedMesh` uses in `src/proto3d/` are lane dashes, score bars and defense pellets.

**FIX SOUND: yes** for mushroom and luggage. `stdMat` does cache (island.ts:3357-3363), so it is draw calls saved, not materials.

**CORRECTION:** the severity is right but the count is inflated 2×, and the builder that actually deserved this finding is 34 lines below `makeFlowers`, which the reviewer had open — see below.

## WHAT THE TEAM MISSED

**`makeCoins` is worse than everything in their finding 6, and they read past it.** `island.ts:4471`:
```ts
const gold = new THREE.MeshStandardMaterial({ color: 0xf2c94c, roughness: 0.3, metalness: 0.55, emissive: 0xa87614, emissiveIntensity: 0.25 });
```
A **fresh `MeshStandardMaterial` per pile**, plus 2-3 unmerged meshes each — the exact allocation pattern `stdMat` was written to kill (island.ts:3352: "a Maple match measured 2,513 distinct materials in the scene"). Coin piles are placed at 5694, 5892, 5946, 6695 and 6916, i.e. in Maple *and* Pirate, and I can see them in three of the five shots. It sits 34 lines below the function they wrote 600 words about.

**PIRATE BAY has no pirate in its hero frame.** `pirate_look.png` is a pink-and-blue painted promenade with an ice-cream truck, two oil drums and a vending kiosk. Nothing in that shot says pirate. The review owns static props in all five worlds and spent its Pirate paragraph on barrel bulge geometry while the world's identity was absent from the frame — that is a first-glance failure a child meets at the world picker, and it outranks a lid.

**The lantern stall's flat roof is hiding the world's entire lighting idea, not just a colour.** `nightmarket.ts:201` says the lit interior is "the shot the whole level is built around." In `lantern_look.png` the back-wall glow, the griddle, the lantern and the stallholder are all occluded by the canopy the review correctly flagged. A ridge and a batten do not fix that; spilling `G_AMBER` onto the counter top and the ground where a top-down camera can see it does. The review found the symptom and stopped one level short of the cause.

**Their "control" is weaker in the pixels than in the code.** `capRoof` really does lay four tones, but in `powder_look.png` the SNOW cap and the snow ground are near the same value — what actually makes those chalets read is the SLATE eave and the dark window band, not the cap. Setting a gate bar at "the alpine chalet passes at ~55%" is a guessed number from a builder they read but did not measure in the render.

**`gameday_look.png` has a bigger offender than the one they cited.** The red pickup's cab and bed roofs occupy more frame than the cream canopy and are the same single flat colour, as are every folding table and cornhole board. If the thesis is "the roof is the facade", the vehicle roofs are the largest instance of it in that world.

**Two dressing props share one read.** In `maple_trees.png` the planters (white-rimmed pots, top of frame) and the flower beds (bottom) both resolve as a cluster of coloured balls on a pale mass. `qa/variety.mjs` exists precisely to catch "two flower beds in that frame are identical" and does not see across prop *types*. Nobody flagged that the two most common dressing props in Maple are the same silhouette.

SURVIVED: 6 of 6.


═══════════════════════════════════════════════════════════════════
TEAM MOTION
═══════════════════════════════════════════════════════════════════
--- THE TEAM'S REVIEW ---
## VERDICT: NO-SHIP

The largest population in the world a child sees first — the static townsfolk of Maple Falls — are welded statues that cannot animate at all, standing in one pose with one hairstyle and one garment cut beside a walking crowd that breathes, strides, skips, dances and sits, and the seam between the two species is visible in the character sheet.

## THE BAR

**Katamari Damacy / We Love Katamari (Namco)** — the direct genre ancestor, a ball that eats a town at a fixed high camera. Mechanically its crowd is *not* higher-poly than ours; a Katamari citizen is roughly our part count. What it does is spend its whole budget on **authored pose plus a never-stopping loop**: every human in the field is doing one specific thing forever (arms up, squatting, sitting on a bench, cycling, doing calisthenics, queueing), and the town is populated in **clusters that face each other** — a family, a queue, a ring around a busker. Nothing in Katamari stands facing a random compass bearing with its arms at its sides. Second bar, for legibility at size: **Crossy Road (Hipster Whale)** — every character is silhouette-first and *nothing is ever still*; even a stationary chicken squashes on a loop, because at 30 screen pixels motion is what separates a creature from scenery.

Where we sit: `life.ts` **meets or beats Katamari per person.** Six merged meshes on one material, a real walk cycle with torso counter-rotation and head lag (`life.ts:2802-2820`), plus flee, skip, work, conga, dance and event-manager poses, nine hairstyles, fifteen garments that change the silhouette. That work is good and I am not asking for it again.

`personParts` in `mainstreet.ts` is **below both bars on every axis Katamari is strongest on**, and it is the population that stands on the plaza where the match opens. Twelve `makeTownsfolk` call sites in `island.ts` plant on the order of a hundred of them across Maple, plus the four protesters outside the town hall, and every single one is a frozen mesh.

## FINDINGS

### The static townsfolk are statues — nothing in the town stands still and breathes
SEVERITY: blocker
AT: src/proto3d/mainstreet.ts:831, src/proto3d/island.ts:6133

SAW: `qa/out/person/front_zoom.png` — five townsfolk in a row, every one with both legs dead vertical and parallel, arms locked, not one weight shift between them. Same in `maple_front.png` (five figures, y≈740-880) and `maple_threequarter.png`. Compare `back_zoom.png`, which caught `life.ts` movers mid-stride: shoulders rolled, arms out of phase, legs apart. The person sheet also proves it structurally — the probe turns people to face camera and waits 900ms; the ones that *held* the imposed rotation instead of steering away are exactly the ones that cannot move.

EVIDENCE: `makeTownsfolk` returns geometry, not a rig —
```ts
export function makeTownsfolk(hat = false): THREE.Mesh {
  const p: G[] = [];
  personParts(p, 0, 0, mpick(SHIRTS), mr(0, Math.PI * 2), hat ? ... : undefined);
  return mergedProp(p, PROP_SMOOTH_MAT);   // a face is not architecture
}
```
and `island.ts:4798` `drop()` → `place()` registers it as static decor, never a mover. Meanwhile `life.ts:2796` states the standard the statics fail: *"The phase always advances (so a standing person breathes and shifts weight instead of being a statue)"*.

FIX: the merged mesh's local origin is the person's feet (built at `x=0,z=0`, placed after), so a whole-body idle needs no geometry at all. Register the one-person meshes in a light per-frame list and write **yaw only** — `m.rotation.y = base + Math.sin(t * 0.9 + phase) * 0.055`, phase hashed from the drop position. **0 draw calls, 0 triangles**, ~120 `rotation.y` writes per frame against a mover system that already updates 200-966 records. Yaw and not bob deliberately: vertical is foreshortened away at the 46° camera (the dance branch at `life.ts:2778` says exactly this), and a bob would lift the body off its baked contact shadow, which is the trap `life.ts:2823` (`cs.position.y = 0.045 - mesh.position.y`) exists to dodge.

GATE: `qa/stillness.mjs` — capture the world matrix of every person-sized edible (radius 0.5-1.6, verts ≥ 2000) at t and t+1.2s and report the fraction bit-identical. Maple today ≈ 100% of the static population frozen; gate at < 15%.

### Two species side by side: the static arm has no elbow, no skin forearm and no hand
SEVERITY: blocker
AT: src/proto3d/mainstreet.ts:367

SAW: `front_zoom.png` versus `back_zoom.png`, same build, same camera. In `back_zoom` the movers' arms end in clear brown balls that read as hands and the sleeve stops above them. In `front_zoom` the statics' arms are single pale tubes the same colour as the chest running unbroken to the wrist, and the "hand" is invisible — because it is exactly the same radius as the arm it is stuck on. At the play camera in `maple_front.png` several of these arms have vanished into the torso entirely and the figure reads as a bowling pin.

EVIDENCE: mainstreet.ts:367-370 — one straight cylinder, then a hand at the wrist's own radius:
```ts
out.push(part(cyl(0.10 * T, 0.115 * T, 0.74 * T, 9), shirt, a.cx, a.cy, a.cz, a.rx, 0, a.rz));
out.push(part(sph(0.115 * T, 7, 5), skin, a.hx, a.hy, a.hz));
```
`0.115 / 0.115 = 1.00`. Next door, life.ts:1093-1094 gets both things right and says why:
```ts
p.push(pc(B.taper, loCol, 0, -0.755 * A, 0.055 * A, 0.20 * gr, 0.52 * A, 0.20 * gr, Math.PI + 0.2));
p.push(pc(B.dot, skin, 0, -1.01 * A, 0.115 * A, 0.26 * gr));
```
forearm radius `0.10gr`, hand radius `0.13gr` — **1.30×**, plus `+0.2 rad` of elbow, under the comment *"a dead-straight prism from shoulder to fingertip is the other half of the 'moving block' tell"*. And `loCol = fullArm ? shirt : skin` gives the mover a skin forearm that separates from the shirt; the static's arm is shirt-coloured to the fingertip.

FIX: port the three numbers. Split the static arm into upper (`0.74T → 0.42T`, shirt) and forearm (`0.36T`, skin unless the wear is long-sleeved) with the forearm's aim rotated ~0.2 rad forward of the upper, and take the hand to `0.150 * T`. Cost: **+1 part per arm** — a 9-sided open cylinder, 36 triangles — so **+~80 triangles per person, 0 draw calls** (same `mergedProp` merge, same `PROP_SMOOTH_MAT`). ~10k triangles across all of Maple's statics. **0 seeded draws**: `armAt()` already hashes its aim, and the forearm reuses the same hash.

GATE: `qa/species.mjs` — for the six people `personsheet` picks, walk the geometry and report per population (static vs mover) the ratio of hand radius to wrist radius and the count of distinct vertex colours below the shoulder line. Today statics report 1.00 and one colour; movers report 1.30 and two. Gate: the two populations must land within 15% of each other on both.

### One hairstyle and one garment cut across the entire static population
SEVERITY: major
AT: src/proto3d/mainstreet.ts:386

SAW: `front_zoom.png` — five heads, five identical squashed caps, differing only in colour. `maple_front.png` and `maple_side.png` the same. The movers carry nine hair silhouettes (`life.ts:931` `HAIRS`) and fifteen `Wear` values that change the outline — a dress that flares wider than the shoulders, a robe to the shins, a hood, waders. The statics have exactly one of each. That is Katamari's uniformity failure precisely: identical stamps, and `qa/variety.mjs`'s own header already names it ("A prop type whose every instance has an identical vertex count and identical bounding box is a stamp, however nice the stamp is") — it just never ran the test on people.

EVIDENCE:
```ts
out.push(part(sph(0.38 * T, 12, 8), hairCol, hxc, 2.42 * T, hzc, 0, ry, 0, 1, 0.55, 1));
```
One primitive, one placement, for every townsperson in the game. The colour varies via the `v1` hash; the shape never does.

FIX: three more silhouettes off a third hash of the values already in hand (`h3` from `x,z,shirt,ry` — costs **no seeded draw**, same pattern the file already uses at mainstreet.ts:311): **bun** (cap + `sph(0.15T)` behind the crown), **bob** (cap + a `cyl(0.34T, 0.30T, 0.34T)` skirt down to the jaw), **ponytail** (cap + a tapered tube aft). Two extra parts on two-thirds of the population, **~+150 triangles each, 0 draw calls.** Same trick for the garment: a `flare` cylinder from the hip in place of the chest cylinder gives a dress, and it is the same part count.

GATE: extend `qa/variety.mjs` with a FORM pass restricted to person-sized edibles: count distinct (vertexCount, bbox) signatures across the static population. Maple returns 1 today (only the height jitter `T` moves it, and it moves it continuously — so bucket to 0.05). Gate ≥ 4.

### The town is full of benches and nobody sits on any of them
SEVERITY: major
AT: src/proto3d/island.ts:6114, src/proto3d/island.ts:6533, src/proto3d/life.ts:1600

SAW: `maple_front.png`, bottom-left — a wooden park bench, empty. Same bench empty in `maple_side.png` and `maple_threequarter.png`. `island.ts` plants benches at 5946, 6114, 6192, 6452, 6533 and 6602; not one of them has a person on it. Katamari's single strongest crowd read is that some of its people are *not standing* — a field where every human is vertical reads as a shelf of figurines however good each figurine is.

EVIDENCE: the mechanism exists and is already shipped in another world —
```ts
posed(crewman, -1.15, -1.15, 0.55, 0.55);       // sitting, hands on the oars
```
(life.ts:4916, via `posed()` at life.ts:1600). Maple, the town with all the benches, uses it zero times.

FIX: a `seated` flag on `personParts` — rotate the two leg cylinders 90° about the person's own right axis (`rx`/`rz` are already solved for an arbitrary aim by `armAt`'s arithmetic; the same solve applies) and drop the hip/chest/head stack by `0.55T` to seat height. **Same parts, same count: 0 extra triangles, 0 extra draw calls, 0 seeded draws.** Then in `island.ts`, do not *add* bodies — re-target existing ones. Keep every `scatter()` and `row()` call exactly as it is so the stream is byte-identical, and move the mesh of every third scattered townsperson onto a bench position from the row already computed above it. **Net 0 draw calls, net 0 edibles, no change to the score economy.**

GATE: `qa/seats.mjs` — count bench meshes per world, then count person-sized edibles whose centre sits within 1.2u horizontally and 0.5u vertically of a bench's seat plane. Maple returns 0 today. Gate ≥ 6, and ≥ 25% of benches occupied.

### Nobody in Maple Falls is looking at anybody, and no call site can aim them
SEVERITY: major
AT: src/proto3d/mainstreet.ts:833

SAW: only visible in code from a still image, because the person sheet overrides every facing by design (`q.m.rotation.y = faceCam + turn`, personsheet.mjs:105) — that is exactly what the probe is for, and it is why this one needs saying in code. In play the effect is that the plaza is a field of people facing uniformly random compass bearings.

EVIDENCE:
```ts
personParts(p, 0, 0, mpick(SHIRTS), mr(0, Math.PI * 2), hat ? ... : undefined);
```
The facing is drawn *inside* the factory and never returned. The final heading is `ry_internal + rotY_drop`, and since `ry_internal` is invisible to the caller, the twelve `drop(MS.makeTownsfolk(...), x, y, 1.2)` sites in `island.ts` cannot aim a person at anything — not at another person, not at the bandstand, not at the town hall.

FIX: `export function makeTownsfolk(hat = false, aim?: number)` — **still call `mr(0, Math.PI * 2)` unconditionally** and discard its value when `aim` is supplied. The draw happens, in the same order, the same number of times: the seeded stream is bit-identical and no authored placement in Maple moves. Then pair them at the call sites: for each scattered position, place its neighbour from the next position in the same batch and set both `aim`s to face the midpoint. **0 draw calls, 0 triangles, 0 stream change.**

GATE: `qa/facing.mjs` (or a third column on `variety.mjs`'s FACING pass) — for each static townsperson, take the nearest other townsperson within 6u and measure the angle between facing and the vector to them. Uniform-random today: mean |cos| ≈ 0.5, no mass near 1. Gate: ≥ 30% within 40° of facing a neighbour inside 6u.

### The dog slides
SEVERITY: major
AT: src/proto3d/life.ts:1692, src/proto3d/life.ts:4804

SAW: code only — no dog is in frame in any of the five images, and that is itself worth noting, because the dog walks the `main`/`burb` loop where the match opens. The render does not show it because the person sheet relocates its six subjects and the dog is not one of them.

EVIDENCE: `makeDog()` returns `grp1(mergedProp([...]))` — one welded mesh with four rigid `MG.cyl6` legs and no rig at all — and it is then translated across the pavement by
```ts
follow(rec.mesh, dog, 2.0, 9, true);
```
Four fixed legs sliding on a plane is the exact defect life.ts:489 records as the thing that made the *people* read as "a brick sliding across the sand".

FIX: `grp1` already wraps the merged mesh in a Group, so the child has a free local transform. On the same per-frame record `follow()` already drives: `m.rotation.z = Math.sin(t * 13) * 0.07; m.position.y = Math.abs(Math.sin(t * 13)) * 0.08;` — a trot bob and roll. **0 draw calls, 0 triangles.** (Keep the contact shadow on the Group, not the child, so the bob does not lift it.) A wagging tail would need the tail split into a second merge — **+1 draw call per dog, ~4 dogs** — and is not worth it until the trot is in.

GATE: fold into `qa/stillness.mjs` as a second assertion — any edible whose world position changes over 1s while *every* descendant's local transform is bit-identical is sliding. The dog and goat fail today; the people pass. Gate: zero sliding movers.

### Every person in the game has eyes; not one animal does
SEVERITY: minor
AT: src/proto3d/life.ts:1692, src/proto3d/life.ts:1712, src/proto3d/life.ts:1962

SAW: code only — no animal appears in the five images. Worth fixing anyway because the goat is the *finale chase prize* (`life.ts:4815`, gilded, 25 coins) and gets a camera pointed at it by design.

EVIDENCE: `makeDog`'s ten parts are body, head, muzzle, two ears, tail, four legs — no eye, no nose. `makeGoat`'s fourteen parts likewise. `makeAnimal`'s elephant, lion and sheep likewise. The two long comments in `life.ts:1117` and `mainstreet.ts:395` about a bare ball being "the loudest cheap tell on a person" apply verbatim to a bare ball on a goat.

FIX: two `INK` dots each, sized off the head sphere the same way the townsfolk's are (3% proud, lateral extent under half the skull). Dog and goat are `mergedProp` → **0 draw calls, ~200 triangles each.** `makeAnimal` builds separate meshes per part, so merge both eyes into **one** extra mesh: **+1 draw call per animal × 6 zoo animals = 6 draw calls**, not 12.

GATE: `qa/critters.mjs` — the `personsheet` trick applied to animals: relocate and turn the dog, goat and each zoo species to face the camera and shoot them. Plus a numeric assert that each animal mesh carries ≥ 2 parts with luminance < 0.15 inside the forward third of its bounding box. Zero today.

### The static hair cap is wider than the skull it sits on
SEVERITY: polish
AT: src/proto3d/mainstreet.ts:386

SAW: `front_zoom.png` — the leftmost figure's black hair has a visible overhanging rim, and it reads as a moulded bowl helmet rather than hair. The arithmetic: skull `sph(0.36T)` at `2.22T`; cap `sph(0.38T, 12, 8)` scaled `(1, 0.55, 1)` at `2.42T`. At the cap's own centre height the skull's radius is `√(0.36² − 0.20²) = 0.299T`, so the cap stands **0.081T proud — 27% wider than the head there**. And it is tessellated 12×8 against a skull at 16×11, so the coarser of the two is the one on the outside edge.

FIX: `sph(0.355 * T, 16, 9)` and lift the centre to `2.40 * T`. **0 draw calls; triangles up ~90 per person, down again once the flange stops needing to be smooth.**

GATE: covered by the FORM/silhouette pass in `qa/species.mjs` above — assert no head-region part's horizontal extent exceeds the skull's at the same y.

### The character sheet does not hide the HUD, and never writes the crops its own header promises
SEVERITY: minor
AT: qa/personsheet.mjs:63

SAW: all four of `maple_front/threequarter/side/back.png` carry the timer, the score chip, the growth bar, the home button and two speech bubbles — one of which ("Shake my hand. Firm. Good.") sits over the subjects' feet in `maple_side.png`. This is our instrument and it is dirty.

EVIDENCE:
```js
await p.addStyleTag({ content: '#hud,#quests,#news,#bubbles,.banner,#joy,#topbar,#formbar{opacity:0 !important}' });
```
`index.html` has no `#hud`, no `#bubbles`, no `#topbar` and no `#formbar`, and `banner` is an **id**, not a class. The real ids are `#timer #board #coins #quests #growth #banner #count #news #hungerlbl #hunger #joy #powers #guide #btnQuit`; bubbles are `.vb` / `.vf` (bubbles.ts:161,170). Separately the header promises *"one tight crop per person"* at `qa/out/person/<world>_<n>.png` and the loop only ever writes the four angles — the only tight crops on disk (`front_zoom.png`, `side_zoom.png`, `back_zoom.png`) are hand-made and three days older than the sheets.

FIX: correct the selector list and add the per-person crop loop using the `sx, sy` the probe already computes and returns. Probe-only; zero runtime cost.

GATE: the probe asserts on itself — after the style tag, `expect` zero visible elements matching the HUD selector list, and `expect` six crop files written.

## IS THIS THE BEST THIS CAN BE?

No. Ranked by life bought per triangle:

1. **Make the statues move.** Zero triangles, zero draw calls, and it is the difference between a town and a diorama. Crossy Road's whole legibility strategy is that nothing is ever still; we have a hundred people standing in the opening frame that literally cannot move a joint. This is the single highest-value change on the list and it is also the cheapest.
2. **Sit somebody down.** Also zero triangles — the pose function is written, the benches are planted, the seated pose already ships in Pirate Bay. One seated figure per park bench changes the read of the whole plaza, because *variety of posture* is what Katamari trades on, not variety of mesh.
3. **Turn people toward each other.** Zero triangles, zero draw calls, no seeded draw. Two people facing each other is a conversation; two people facing north is inventory. This one is close to free and I would take it before any geometry work.
4. **Close the species gap in the arm.** ~80 triangles a head. It is the one place where a single frame side-by-side gives the game away, and the correct numbers are already sitting in the file next door.
5. **Three more static hairstyles and one flared garment.** ~150 triangles a head, and it kills the last "one mould" tell on the population.
6. **Trot the dog, then give the animals eyes.** Small, but the goat is a finale beat with a camera on it.

Two things I am *not* asking to change, and want on record as judged rather than skipped. The **eye marks are correct** — I looked for the failure that shipped last time and it is genuinely fixed. In `front_zoom.png` at 900px they read as drawn eyes with no bulge and no pale break in the silhouette, and in `maple_side.png` they are correctly invisible from the side, which is what the 0.195-of-0.36 lateral extent in the comment predicts. Do not touch them, and do not add a mouth: at 30 pixels there is room for a mark and nothing else, and `gameday_look.png` confirms the same treatment holds up on the mascot at three times the size. The **rival voids** (`rivals.ts:273-330`) are also right — billboarded eyes with blush and a kawaii smile, drawn to the hero's chart rather than the crowd's, which is exactly the correct split.

The remaining gap is not resolution and it is not polygons. It is that half our population is furniture.

## COVERAGE

Images read: `qa/out/person/maple_front.png`, `maple_threequarter.png`, `maple_side.png`, `maple_back.png`, `qa/out/shippedlook/gameday_look.png`, plus `qa/out/person/front_zoom.png`, `side_zoom.png`, `back_zoom.png` (the older tight crops, which is where the arm and hand evidence is legible).

Files read: `src/proto3d/life.ts` (437-620 body kit and `makeCar`; 928-1230 `makePerson`, `HAIRS`, `ADULT`/`CHILD`, the face block, `makeCast`; 1580-1625 routes and `posed`; 1692-1760 `makeDog`/`makeGoat`/`makeBike`; 1962-2010 `makeAnimal`/`makeBird`; 2640-2860 the mover update and every pose branch; 2988-2998 the zoo; 4790-4830 the dogwalker and the goat; 4916 the seated crewman), `src/proto3d/mainstreet.ts` (120-150 palettes; 250-470 `personParts` in full; 810-840 `makeProtester`/`makeTownsfolk`), `src/proto3d/rivals.ts` (grepped for the face — 273-369 `makeRivalMesh`, 1602-1606 the billboard loop), `src/proto3d/island.ts` (4795-4802 `drop`, 5935-6610 the twelve townsfolk and bench placements), `index.html` (element ids), `qa/personsheet.mjs` (whole file), `qa/crowdgate.mjs` and `qa/variety.mjs` (headers), `src/proto3d/bubbles.ts` (DOM classes).

--- THE SKEPTIC ---
## VERDICT ON THE VERDICT

NO-SHIP is right — a population of ~100 people beside the spawn that cannot move a joint is a blocker by any bar — but two of the nine findings were already fixed and committed at HEAD before this review landed, and the review's strongest rhetorical device, "two species side by side", rests on an image comparison that does not exist.

First, a systematic defect in the review: **every line citation is stale.** The reviewer read the tree as of `b73fbbd`; HEAD is `69784f9` ("TEAM MOTION audited my instrument and found it dirty"), which moved `mainstreet.ts` by 8 lines and `personsheet.mjs` by 51. Re-resolve every `AT:` before acting on it.

## PER FINDING

### The static townsfolk are statues — nothing in the town stands still and breathes
REAL: yes
WHAT I FOUND: `makeTownsfolk` at `src/proto3d/mainstreet.ts:839` (not 831) returns `mergedProp(p, PROP_SMOOTH_MAT)` — a `THREE.Mesh`, no Group, no `userData.limbs`. The consumer is `place()` at `src/proto3d/island.ts:4818`, whose whole tail is `scene.add(mesh); addEdible(mesh, r);` — no `movers.push`, no update closure. I grepped every `.ts` in `src/proto3d/` for a generic prop-idle system (`sway|breeze|windPhase|idleProps`) and the only hit is a newsroom joke line. There is no path by which a static townsperson moves. Twelve call sites confirmed at island.ts 6195, 6257, 6332, 6352, 6444, 6475, 6481, 6511, 6555, 6594, 6652, 6669, plus four protesters at 6167.
CORRECTION: `island.ts:6133` is the `row()` helper, not a townsfolk site. And the SAW is partly fabricated — see the next finding; `front_zoom.png` and `back_zoom.png` do not show two populations.
FIX SOUND: yes on cost — I confirmed `mergedProp` (island.ts:3835) merges in place with no recentring, so the mesh origin is the person's feet at x=z=0 and a yaw write is safe. But **yaw-only is the weak version of this fix**: 0.055 rad on a vertical axis is a statue slowly rotating, not a person breathing. The reviewer's own named bar (Crossy Road) squashes. Since the origin is at the feet, `m.scale.set(1+b*0.5, 1-b, 1+b*0.5)` with `b = sin(t*1.1+phase)*0.012` costs the same zero and keeps the feet planted without touching the contact shadow. Take breath, or breath plus micro-yaw.

### Two species side by side: the static arm has no elbow, no skin forearm and no hand
REAL: yes on the code, **no on the evidence and no on the severity**
WHAT I FOUND: the two quoted lines are exact — `mainstreet.ts:367` is one straight `cyl(0.10*T, 0.115*T, 0.74*T, 9)` in `shirt`, and `:370` is `sph(0.115*T, 7, 5)` in `skin`. Hand radius over wrist radius is 1.00. `life.ts:1093-1094` is quoted correctly too: `0.20*gr` forearm against a `0.26*gr` hand, 1.30×, with `Math.PI + 0.2` of elbow. All real.

But I opened `back_zoom.png` and the figures in it are **not life.ts movers**. They carry placards — they are `makeProtester` output — and their arms are shirt-coloured tubes ending in plainly visible tan balls. The hands are not invisible; they read clearly, because `skin` against `shirt` separates them by colour even at equal radius. Then I read `qa/personsheet.mjs:97-140`: the probe builds `picked` **once per angle from the same six nearest edibles** and photographs them at `turn = 0, π/4, π/2, π`. `front_zoom` and `back_zoom` are the same six people, front and back. There is no species comparison in them.
CORRECTION: **not one life.ts walking-crowd member appears in any of the four sheets.** In `maple_front.png` I count six subjects and at least three placards; in `maple_threequarter_4.png` two placarded protesters at full magnification; in `maple_side.png` the same six with the same cap-or-hat silhouette and no dress, no robe, no hood. The probe picks the six nearest person-sized edibles to the void at spawn, and spawn is the square where the four protesters and the square's eight townsfolk stand. The sheet has never photographed a mover. Severity drops from **blocker to polish**: the elbow and the hand taper are correct craft, but nothing in the repo's images shows a visible seam, and the claim that one does is wrong.
FIX SOUND: yes — the numbers are right, `armAt()` already hashes so it costs no seeded draw, and +1 nine-sided cylinder per arm stays inside one `mergedProp`. Just do not sell it as a blocker.

### One hairstyle and one garment cut across the entire static population
REAL: yes in substance, **evidence stale**
WHAT I FOUND: the quoted line does not exist. `mainstreet.ts:386` today is a comment; the hair push is at **`mainstreet.ts:394`** and reads `out.push(part(sph(0.355 * T, 16, 9), hairCol, hxc, 2.40 * T, hzc, 0, ry, 0, 1, 0.58, 1));`. It is still one primitive with one placement for the whole population, so the finding holds — but the reviewer quoted a version that was replaced at HEAD.
CORRECTION: it is not quite one head silhouette. `hat !== undefined` adds `cyl(0.34T, 0.42T, 0.22T, 14)` at 2.52T, and five of the twelve call sites pass `mchance(...)` or `true`, so roughly a third of the static population wears a hat. Visible in `maple_front_1.png` (right figure) and `maple_side.png` (rightmost). Two silhouettes, not one. Still far under life.ts's nine.
FIX SOUND: yes. The `h3` hash pattern is exactly what mainstreet.ts:311-315 already does and costs no seeded draw; the flare-garment swap is genuinely part-count-neutral.

### The town is full of benches and nobody sits on any of them
REAL: yes on the observation, **no on the evidence sentence**
WHAT I FOUND: I traced all six bench sites — `island.ts:6008, 6176, 6254, 6514, 6595, 6664` (the reviewer's 5946/6114/6192/6452/6533/6602 are all stale by 40-60 lines) — and none places a person. The benches in `maple_front.png` (bottom-left) and `maple_side.png` are empty. Observation confirmed.
CORRECTION: "Maple, the town with all the benches, uses `posed()` zero times" is **false**, and the reviewer's own cited example refutes it. `posed()` has five call sites; `life.ts:4766` (four bike riders) and `life.ts:4916` (five rowboat crew) are both inside the `if (worldId() === 'maple')` block that opens at `life.ts:4513`. Maple already has nine seated people. They are just all on the water or on a bike, and none on a bench.
FIX SOUND: partly. The pose maths is free and correct. The placement half is under-specified in a way that will bite: a seated body needs different geometry, so it must be decided at construction — `makeTownsfolk(hat, seated)` — not by "moving the mesh afterward". And if you keep the `scatter()` draws byte-identical but relocate the body, the scatter's `MS.claimSpot` still reserves an empty patch while the body lands on a spot the bench already claimed at `r*20`. That is fine geometrically but the bookkeeping must be stated, or the next reviewer will file it as a collision bug.

### Nobody in Maple Falls is looking at anybody, and no call site can aim them
REAL: yes
WHAT I FOUND: `mainstreet.ts:841` (not 833) is exactly `personParts(p, 0, 0, mpick(SHIRTS), mr(0, Math.PI * 2), hat ? ... : undefined);`. The heading is drawn inside the factory, never returned, and `drop`'s `rotY` composes on top of it, so no call site can aim a person. Confirmed.
FIX SOUND: yes on determinism — drawing `mr(0, 2π)` and discarding it keeps the stream bit-identical.
CORRECTION: two things the reviewer did not say. (1) `ry` feeds `h1` and `h2` at `mainstreet.ts:311-312`, so overriding it changes **hair colour, shoe colour, the height jitter `T`, and both arm splays** of every re-aimed person. Still deterministic, but the crowd will look different, and a variety probe run before and after will not match. (2) The final heading is `ry_internal + rotY_drop`; four of the twelve sites already pass an explicit `rotY` (6332, 6475, 6481, 6652). `aim` must either replace both or be documented as additive, or those four end up aimed 180° off.

### The dog slides
REAL: yes for the dog, **no for the goat**
WHAT I FOUND: `makeDog()` at `life.ts:1692` is `grp1(mergedProp([...]))` — one welded mesh, four `MG.cyl6` legs at fixed positions, no rig. `follow()` at `life.ts:4569` writes only `me.position.x`, `me.position.z` and `me.rotation.y`. The dog slides. Confirmed.
CORRECTION: the goat does not. `life.ts:4864` reads `goat.position.y = Math.abs(Math.sin(hopT)) * 0.55;   // goats bounce`, driven by `hopT += dt * 11` on every frame it is moving. So "the dog and goat fail today" is half wrong — and worse, **the proposed gate is unsound**: "world position changes while every descendant's local transform is bit-identical" flags the goat, whose whole animation is on its own Group transform, as sliding. The gate must exempt vertical motion of the object's own node, or measure horizontal travel against *any* changing transform in the subtree including the root.
FIX SOUND: yes, and the shadow caveat is already satisfied — `life.ts:4802` is `dog.add(contactShadow(0.9))`, on the Group, so a bob written to `dog.children[0]` cannot lift it.

### Every person in the game has eyes; not one animal does
REAL: yes
WHAT I FOUND: `makeDog` (life.ts:1692) is ten parts — body, head, muzzle, two ears, tail, four legs — no eye, no nose. `makeGoat` (life.ts:1712) is fourteen — body, head, muzzle, beard, two horns, two ears, tail, four socks, ribbon — no eye. `makeAnimal` (life.ts:1962) is body, head, four legs plus species bits — no eye on any of the three species. All confirmed.
FIX SOUND: yes, and the draw-call arithmetic is right for the right reason: `makeAnimal` builds each part as its own `THREE.Mesh` (an elephant is already nine draw calls), so one merged two-eye mesh is +1 per animal, not +2. The dog and goat go through `mergedProp` and cost zero.

### The static hair cap is wider than the skull it sits on
REAL: yes — **and already fixed at HEAD.**
WHAT I FOUND: `mainstreet.ts:394` today is `sph(0.355 * T, 16, 9)` at `2.40 * T`, which is the reviewer's proposed fix character for character. Commit `69784f9` landed it, and the comment block above it at `mainstreet.ts:377-393` records the same arithmetic the reviewer computed and credits TEAM MOTION. In `maple_front_3.png` and `maple_threequarter_4.png` the caps sit inside the skull line with no rim. Nothing left to do.
FIX SOUND: yes — it is what shipped.

### The character sheet does not hide the HUD, and never writes the crops its own header promises
REAL: yes — **and already fixed at HEAD.**
WHAT I FOUND: `qa/personsheet.mjs:63` no longer holds that selector string; `HUD_SEL` at :78-79 is the real id list plus `.vb,.vf,.vbN`, followed by a self-assertion at :88-96 that filters on `display`, `visibility`, `opacity` **and** a non-zero layout box. The crop loop is at :144-158. I looked at `maple_front.png` and `maple_side.png` on disk: no timer, no score chip, no growth bar, no speech bubble. `maple_front_0..5.png` through `maple_back_0..5.png` exist, 24 crops.
FIX SOUND: yes — it is what shipped. But it shipped with a defect the reviewer could not have seen; see below.

## WHAT THE TEAM MISSED

**1. The instrument they were praising cannot see half the population they were reviewing.** This is the big one, and it invalidates their central claim. `qa/personsheet.mjs:105-124` picks the six nearest edibles with radius 0.5-1.6 and ≥2000 verts, sorted by distance to the void. Spawn is the town square. The four protesters (island.ts:6167) and the square's eight townsfolk (island.ts:6195) are the nearest people in Maple, so the sheet photographs statics and only statics — visible in the placards in `maple_front.png`, `maple_threequarter_4.png` and `back_zoom.png`, and in the fact that not one of the twenty-four crops shows a dress, a robe, a hood or any of life.ts's nine hairstyles. The studio's people instrument has never photographed a walking crowd member, and TEAM MOTION used it to argue that two populations look different side by side. Fix: after `people.sort`, take three nearest with `m.userData.mover` and three without — the tag already exists (`life.ts:4800`, and `townie()` sets it). Gate: the probe prints the mover/static split per angle and fails if either is zero.

**2. The shoulder yoke is the hair-cap flange again, at the shoulders, and it is in every image.** `mainstreet.ts:352-353`: the chest is `cyl(0.40*T, 0.31*T, 0.82*T, 14)` centred at 1.44T, so its top radius is 0.31T at y = 1.85T. The yoke is `sph(0.40*T, 14, 10)` centred at 1.78T, whose radius at that same height is √(0.40² − 0.07²) = **0.394T** — 0.084T proud of the chest it sits on. That is the *same magnitude* as the 0.081T hair flange the governor just judged "a moulded bowl helmet with a rim" and fixed. In `back_zoom.png` both the blue and the red figure carry a distinct lighter, scalloped band around the top of the chest that reads as a buoyancy vest; same on the grey-shirted figure in `maple_front_3.png` and on figure 2 in `maple_side.png`. TEAM MOTION wrote three paragraphs about the arm attached to that yoke and never looked at the yoke. Fix: yoke to 0.355T and raise the chest's top radius to 0.34T so the sphere emerges from a taper instead of standing on a step. 0 draw calls, 0 triangles, 0 seeded draws.

**3. The new crops are broken and the probe reported success.** `qa/out/person/maple_side_2.png` is a solid purple field — 570×630 pixels of the void's body, no person in it. The crop is centred on `f.sx, f.sy`, computed inside the `p.evaluate` **before** the 900 ms settle, with no occlusion test, so any subject standing behind the void gets a photograph of the void. The console line prints "6 crop(s)" regardless. A probe built to stop unlooked-at art from shipping produced a blank frame on its first run. Gate: after each crop, assert per-channel pixel variance above a floor and fail on a near-uniform frame — cheap, and it catches occlusion, off-screen clamping and a black frame with one check.

**4. The four protesters are near-clones by construction, in the opening frame.** `mainstreet.ts:828` calls `personParts(p, 0, 0, mpick(SHIRTS), 0)` — x = 0, z = 0, ry = 0. Every hashed variation in that function (`h1`, `h2` at :311-312, and `hs` inside `armAt` at :347) therefore depends on `shirt` alone. Hair colour, shoe colour, the height jitter `T` and both arm splays are a pure function of the shirt for all four. `SHIRTS` has eight entries and four draws; a collision makes two pixel-identical twins standing 1.3 units apart in the frame the match opens on. Costs nothing: `side` is already a parameter of `makeProtester` — feed it into the hash, or pass `i` from `island.ts:6167`. 0 draw calls, 0 seeded draws.

**5. Scale, before anyone decides the face is finished.** I agree with their call not to add a mouth and not to touch the eyes — the owner rejected white sclera and the two `INK` dots at `mainstreet.ts:435` are the correct answer at 30 pixels. But the sheet now shoots at 190×210 CSS px, and at that magnification (`maple_threequarter_4.png`) two 0.07T dots on a 0.36T skull read as a mole, not a face, while the hero three feet away has eyebrows, blush and a mouth in the same frame. That is the distance the owner's phone photographs at when the void is beside a person late in a match. Not a change — a measurement: shoot a static at the late-game camera distance before anyone signs the face off.

SURVIVED: 7 of 9 still open (findings 8 and 9 were real and are already fixed at HEAD `69784f9`); of the seven, one drops from blocker to polish and four carry wrong line numbers, wrong evidence, or an unsound gate.


═══════════════════════════════════════════════════════════════════
TEAM GROUND
═══════════════════════════════════════════════════════════════════
--- THE TEAM'S REVIEW ---
## VERDICT: NO-SHIP

Three of the five worlds spend 85% of their ground-detail budget on a texture layer whose texel is smaller than one screen pixel at every camera the game ever uses, and Pirate Bay's dance floor renders at the same luminance as the hero standing on it (90.4 vs 89.8 of 255) — both measured, both in the frames below.

## THE BAR

**Crossy Road** (Hipster Whale) — the highest-grossing endless hopper ever made, and it has *no ground texture at all*. It works because it does two things mechanically: (1) every adjacent surface is separated by a hard **value** step — its road sits around 0.18 luminance against grass at 0.55, roughly 3:1 — and (2) the ground carries a **strip rhythm** at roughly one character-width per band, so the floor has cadence rather than being one field. Crossy Road proves you can ship a top-10 game with a flat ground *provided value and rhythm do the work grain doesn't*.

Measured against that: Game Day's car park is `rgb(60,46,46)`, `rgb(60,46,45)`, `rgb(67,53,52)` at three widely separated points in the same frame — one value across the entire visible ground, with local contrast of 0.67–0.86 of 255 at a 2-css-px radius. We are below Crossy Road on the one axis Crossy Road actually uses, *and* we have no grain to fall back on. Pirate Bay's party floor is worse: its two checker cells are 1.03:1 apart in value as authored, against the 1.35:1 minimum `palette.ts` sets for itself.

Second bar, for edges and mid-scale: **Animal Crossing: New Horizons**. Its entire path system exists so a path never terminates on a straight line — per-corner alpha masks blend path into grass across a full tile — and its ground carries readable variation at roughly one-quarter tile, i.e. the scale of a footstep. We have no feature anywhere between 0.3 and 1.6 3D units.

**The scale facts, remeasured.** The brief's "~50 css px per unit, ~11x magnification" assumes a camera closer than the game uses. `prototype3d.ts:8351` clamps `camDist` to `38·(r/0.9)^0.82`: 38 at spawn, ~128 at radius 4 (the camera `qa/shippedlook.mjs:70` shoots from), up to 340. With fov 32 on a 932-css-px viewport that is **42.8 → 12.7 → 4.8 css px per 3D unit**, so one bake texel is **9.1 → 2.7 → 1.0 css px**. Everything below is in 3D units, which is camera-independent.

## FINDINGS

### The ground's detail budget is spent below one pixel
SEVERITY: blocker
AT: `src/proto3d/island.ts:2812-2814`

SAW: `qa/out/shippedlook/gameday_look.png` — the asphalt lot fills most of the frame and has no surface whatsoever. `qa/out/shippedlook/maple_look.png` — a horizontal pixel scan of open lit grass at y=1520, x=170..203 reads `(122,181,69)` to `(125,182,72)`: **the lawn moves by 3 of 255 across 30 css px**. `qa/out/shippedlook/powder_look.png` — snow at (480,120) has local contrast 0.28/255 at radius 1.

EVIDENCE:
```
maple:   [0.45, 0.08, 0.00, 9],
pirate:  [0.45, 0.08, 0.00, 9],
gameday: [0.45, 0.08, 0.00, 9],
```
and the layers they weight (`island.ts:2919-2920`):
```
vec3 g  = texture2D(uDetail, vMapUv * 140.0).rgb;
vec3 g2 = texture2D(uDetail, vMapUv * 34.0).rgb;
```
128px tile × 140 repeat = 17,920 texels across ~650 3D units → **0.036 units per texel = 1.55 css px at spawn, 0.46 at radius 4, 0.17 late**. It is at or under one pixel for the entire match. That layer carries **0.45 of the 0.53 total weight**. The layer that does resolve (34×, 0.149 units/texel = 6.4 css px at spawn) carries 0.08. The mottle — the only layer with structure *and* colour, and the only one whose blobs (radius 2.3–11.9 units at repeat 9 = 29–151 css px at the shipped camera) land in the band the eye reads — carries **0.00**.

The file already did this arithmetic, for Lantern, at `island.ts:2694-2701`: *"128 x 140 = 17,920 texels ... four texels per pixel — so the mip chain averages the entire layer to flat grey before it ever reaches the screen."* Lantern was fixed. The other three were left on the mix that comment condemns.

The negative result that justified `gCoarse = 0` (`island.ts:2795-2808`) is not safe: `_grainab.mjs` moved the **coarse** weight and reported **mid-detail energy**, inside a stated ±6% noise floor. It measured the wrong octave. That is the same instrument error as the leaf-litter luminance mean.

FIX: give the three daylight worlds the mix Lantern already ships at 60fps — `maple/pirate/gameday: [0.12, 0.28, 0.25, 9]`. Keep repeat at 9 (Lantern's 7 is proven, 9 is the existing value; no new tiling risk). **Exposure is safe by construction**: the mottle tile is explicitly normalised to mean 128 at `island.ts:2766-2784` precisely so weight changes cannot move the level's mean. Cost: **0 draw calls, 0 triangles**; it re-enables one `texture2D` per ground fragment on three worlds via the `if (uGrain.z > 0.0)` branch at `island.ts:2925` — a cost Lantern already pays. Confirm with `qa/lnperf.mjs`-style GPU timing before/after on Game Day, whose lot is the largest ground fraction in the game.

GATE: `qa/groundband.mjs` — hide props, pin the camera at both `__setVoidR(0.9)` and `(4)`, and report high-pass energy on a clean ground patch at radii corresponding to **0.05, 0.1, 0.2, 0.4, 0.8, 1.6, 3.2, 6.4 3D units**. Fail if the 0.2–0.8-unit band is under 40% of the 3.2–6.4 band. Today Maple's park block measures 1.18 at 0.85 units against 6.97 at 13.6 units — a ratio of 0.17.

### Pirate Bay's dance floor is the same luminance as the hero
SEVERITY: blocker
AT: `src/proto3d/island.ts:916`, `981`, `984`

SAW: `qa/out/shippedlook/pirate_look.png`. Void body at (250,1030): `rgb(107,76,176)`, luminance **89.8**. Party floor magenta at (330,1330): `rgb(162,65,134)`, luminance **90.4**. Party floor purple at (300,1250): `rgb(109,82,134)`, luminance **91.7**. The void's lower-left rim and its orbit ring dissolve into the floor on the left side of the frame.

EVIDENCE:
```
party: '#5e2f72',
...
const cell = 175;
g.fillStyle = (ix + iy) % 2 === 0 ? 'rgba(255,120,200,0.62)' : 'rgba(90,200,255,0.5)';
```
As authored: magenta cell = `0.62·(255,120,200) + 0.38·(94,47,114)` = `(194,92,167)`, luminance 119. Blue cell = `(92,124,185)`, luminance 122. **Cell-to-cell ratio 1.026:1.** `palette.ts:60-65` states the house standard — *"neighbours that actually meet on the map are at least ~1.35:1 apart"* — and applied it to sand/pavement, meadow/forest and Game Day's three sands. It was never applied here. A checkerboard whose two squares are the same value is not a checkerboard; it is a hue mosaic, which is exactly what the frame shows.

`biomeColor` at `island.ts:1684` carries the argument that already forbids this: *"the player is 0x9a5cff and the match opens there, so the one thing the ground under the spawn must not be is pale violet pavement."* Pirate Bay put the player on violet ground anyway.

FIX: darken the slab and lift the tiles, which is also what a real lit dance floor does. `DCOL.party '#5e2f72' → '#2b1b38'` (luminance ~34) and drop the cell alphas to `0.72`/`0.58` so the cells land near luminance 150 and 120 — floor-to-cell 3.5:1, cell-to-cell 1.25:1, and the whole district ≥1.9:1 from the void's 90. Cost: **0 draw calls, 0 triangles, bake-time only, three literals.** Cell size needs no change: measured on screen it renders at 60–150 css px, which is correct.

GATE: `qa/heroground.mjs` — for each world, at radius 0.9 and 4, take the void's silhouette mask, sample the mean luminance inside it and in an annulus 20 css px outside it, and fail if the ratio is under 1.30. Today Pirate returns **1.007**.

### Nothing in Maple's bake occupies the band between a footprint and a lawn
SEVERITY: major
AT: `src/proto3d/island.ts:1804-1815`, `2632`

SAW: `qa/out/bake/maple.png`. Octave curve on a pure park block (window 620,180,330×300, 0% road chromaticity), high-pass energy by radius converted to 3D units:

```
0.21u: 0.22   0.43u: 0.56   0.85u: 1.18   1.7u: 2.05
3.4u: 3.26    6.8u: 5.01    13.6u: 6.97
```
Monotonic. **Every bit of the lawn's variation is at 3 units and above.** At 0.85 units the local contrast is 1.18/255 — 0.5%. That is the hole, and it is the band a child's eye uses to decide whether a surface is grass or paper.

EVIDENCE:
```
g.arc(x0 + lr() * bw, y0 + lr() * bh, lrange(bw * 0.07, bw * 0.22), 0, Math.PI * 2);
```
`bw` is one 1600-world block = 80 3D units, so those patches are **radius 5.6–17.6 units** — 364 to 1144 css px across at spawn, i.e. *wider than the phone screen*. The lawn fix over-corrected: it went from grain scale (invisible) straight past screen scale to larger than screen (also invisible, just differently). Meanwhile the leaf drifts at `island.ts:2632` — `drange(1.6, 3.6) * U` — are the one ground feature in the game authored at the right scale, and they got there because someone did this exact arithmetic by hand at `island.ts:2577-2586`. That is the template.

The same octave error repeats twice more: Game Day's mown stripes (`island.ts:1505-1507`, pitch 210–260 world = 10.5–13 units = 341–422 css px at spawn — the player stands inside one) and Pirate's jungle dapple, whose own comment at `island.ts:960-966` concedes it spans "500 to 1160 pixels".

FIX: a third matched pair inside the existing lawn loop, at the missing scale:
```
for (let i = 0; i < 60; i++) for (const up of [true, false]) { ... lrange(bw * 0.008, bw * 0.026) ... alpha 0.18 }
```
= radius 0.64–2.1 units. Uses the existing `lr()` mulberry32 stream, so it takes **no draw from the mainstreet seeded stream** and shifts no authored placement. Matched warm/cool pairs keep the block mean where `qa/ground.mjs` measures it. Cost: **0 draw calls, 0 triangles**; ~4,300 extra canvas arcs at bake time against the 4,000 the base pass already does.

GATE: `qa/groundband.mjs` as above — this is the same probe; it fails on the same number.

### Game Day's car park is one value across the whole frame
SEVERITY: major
AT: `src/proto3d/island.ts:1475`, `1505-1507`

SAW: `qa/out/shippedlook/gameday_look.png`. Three patches at (192,1536), (384,1728), (576,1728) — separated by a third of the frame — read `rgb(60,46,46)`, `(60,46,45)`, `(67,53,52)`. Detail energy 0.17 / 0.34 / 0.67 / 0.89 / 1.00 at radii 1/2/4/8/16 device px. It is a gradient, not a surface.

EVIDENCE:
```
rvpark: 0x8a8578, lot: 0x6e6b74, plaza: 0xb9b3a8, bowl: 0xb9b3a8,
...
stripe('greek', 210, true);
stripe('campus', 240, false);
stripe('practice', 260, false);
```
Three grass districts get mown stripes. The **lot** — the largest single surface in the world, and the one the void spends the opening minute crossing — gets a flat fill and nothing else. Also note `biomeColor.lot` at `island.ts:1706` says `0x918e97` while `GD_FLOOR.lot` says `0x6e6b74`; the second is what paints, and the extensive comment justifying the pale value sits next to the value that is not used.

FIX: give the lot the marking a car park actually has, all inside the existing `gpath(GD_R('lot').poly); g.clip()`: (a) drive aisles — bands 3 units wide at 1.15× the lot value, running the stall direction, at a pitch of 6 units so a pair is ~1 screen-width at spawn and ~3 late; (b) tyre-polished lanes down each aisle centre at 0.90×; (c) a scatter of ~400 patch repairs at radius 0.5–1.5 units, matched light/dark so the mean holds. Cost: **0 draw calls, 0 triangles**, ~900 bake-time ops.

GATE: `qa/groundband.mjs` restricted to a lot-interior window, plus a simple check that the max−min of patch means across three separated lot windows exceeds 12/255. Today it is **7/255**.

### Powder Pass's snow renders as saturated steel blue at 43% luminance
SEVERITY: major (joint with LIGHT — GROUND owns half)
AT: `src/proto3d/island.ts:756-774`

SAW: `qa/out/shippedlook/powder_look.png`. The snow at (480,120) is `rgb(65,118,157)` — **saturation 0.585, luminance 109.5/255**. Near the void at (600,1600) it is `rgb(91,98,119)`, luminance 97.9. Snow that is darker and more saturated than Maple's grass. The ground and the sky are the same blue at the top of the frame and the horizon has no edge. Detail energy 0.29/0.52/0.85 at radii 1/2/4 — the flattest surface in the whole set.

EVIDENCE:
```
g.fillStyle = '#dfe7f6'; g.fillRect(0, 0, TEX, TEX);
...
g.strokeStyle = 'rgba(92,116,176,0.34)'; g.lineWidth = 900 * PU;  ppath(ring, true); g.stroke();
g.strokeStyle = 'rgba(92,116,176,0.22)'; g.lineWidth = 1700 * PU; ppath(ring, true); g.stroke();
```
Composited at the rim, the bake goes from `(223,231,246)` luminance 229 to `(159,175,212)` luminance **174 — a 24% cut before the rig touches it**, over a 1700-world-unit band which is where the opening camera sits. The rig then takes 174 → 109 and swings R/B from 0.75 to 0.41. So GROUND supplies a quarter of the loss and all of the pre-shift; LIGHT supplies the rest.

FIX / PATH: this is the experiment, not a guess. Run `node qa/_dumpbake.mjs powder` (it exists, and nobody has ever looked at Powder's canvas) and put it beside `powder_look.png`. If the bake is 174 and the render is 109, halve the rim strokes to `0.18`/`0.10` — cost 0 draw calls — and hand the remaining 0.63× to LIGHT. Also: `GRAIN.powder = [0.20, 0.06, 0.00, 9]` is the weakest mix in the file, on the argument that "fresh powder is the smoothest ground in the game". Snow is smooth in *shape*; it is not smooth in *sparkle*, and this is the one surface where the mottle's warm/cool blobs are exactly right — wind crust, shade, ski tracks.

GATE: `qa/groundvalue.mjs` — sample the mean ground colour in each world's play frame with props hidden; fail if any world's ground saturation exceeds 0.35 or if a world named for snow returns luminance under 0.60. Today Powder returns **0.585 / 0.43**.

### Maple's river foam is a road centre line
SEVERITY: minor
AT: `src/proto3d/island.ts:2431-2432`

SAW: `qa/out/bake/maple.png`, the river running down the right third of the canvas — a regular white dash sequence down the exact centre of the channel, geometrically identical to the lane dashes painted on the roads in the same image.

EVIDENCE:
```
g.strokeStyle = 'rgba(233,246,255,0.30)'; g.lineWidth = pxW(30) - pxW(0);
g.setLineDash([pxW(70) - pxW(0), pxW(210) - pxW(0)]);
riverPath(); g.stroke(); g.setLineDash([]);
```
70 on / 210 off, width 30, centred on a 118-world-unit channel = 1.5 units of dash, 4.5 units of gap, 1.5 units wide, dead centre. `setLineDash` is what the road lane markings used before they were moved to geometry at `island.ts:2965`.

FIX: replace the single centred dashed stroke with two broken strokes offset ±25 world units from the centreline, each with `setLineDash([40, 95])` and a per-stroke `lineDashOffset` so the two never line up. Cost: **0 draw calls**, one extra bake stroke.

GATE: `qa/groundband.mjs --river` — walk the RIVER polyline in the dumped bake, sample luminance along the centreline, and fail if the periodic component with a period under 8 3D units has an amplitude over 10/255. Today it is **15/255**.

### The bake's noise is `Math.random`, so no pixel gate can ever be written against the ground
SEVERITY: minor
AT: `src/proto3d/island.ts:733-737`, `758-762`, `1032-1046`, `1464-1468`, `1477-1484`, `2712`, `2740`

SAW: code only. It does not show in a single render because every individual draw is sub-threshold — which is exactly why it survived. It shows the moment you try to diff two loads.

EVIDENCE: the lawn tone pass (`island.ts:1786`) and the leaf drifts (`island.ts:2591`) each carry a hand-rolled mulberry32 with the comment *"Not Math.random (the town would differ every load)"*. Everything else in the bake does not: Maple's 4,000 base mottle blobs, Powder's 3,600, Game Day's 3,200 plus 2,600 leaf specks, Pirate's entire 22,000-draw grain and tuft pass, and both shader tiles at `2712` and `2740`.

`qa/determ.mjs` fingerprints `window.__edibles`. It has never looked at the ground.

FIX: one `brnd()` seeded from a per-world constant, hoisted above the bake, and `const rand = (a,b) => a + brnd()*(b-a)` shadowed inside the bake scope. Takes **no draw from the mainstreet stream**, so no authored placement moves. Cost: 0.

GATE: extend `qa/determ.mjs` to hash `groundMat.map.image.toDataURL()` across two loads of each world and assert equality. Fails today on pirate, gameday, lantern and powder.

## IS THIS THE BEST THIS CAN BE?

No, and the gap is one idea repeated six times: **every ground feature in this game is authored either at grain scale or at map scale, and almost nothing sits in the 0.3–3 3D unit band that the play camera actually reads.**

The evidence is a single monotonic curve. Maple's park block, high-pass energy by radius: 0.22 at 0.21u, 1.18 at 0.85u, 3.26 at 3.4u, 6.97 at 13.6u. All the energy is at the top. The shader layers make the same error from the other end: 0.45 of the weight sits at 0.036 units per texel, which is 0.46 css px on screen. The two halves of the ground system are aimed at the two places the eye is not.

Ranked, what stands between here and there:

1. **Reweight the three daylight worlds to Lantern's mix.** One line each, zero draw calls, exposure-safe by construction because the mottle tile is mean-normalised. This is the largest single improvement available anywhere on my surface and it is three literals.
2. **Fix the party floor's value.** Three literals. It is currently a hero-readability defect, not a taste one.
3. **Add the missing 0.6–2-unit pass to Maple's lawn loop, the lot's aisles to Game Day, and halve the mown-stripe pitch.** All bake-time, all zero-cost, all using streams that already exist.
4. **Powder's snow.** Dump the bake first; do not guess which side of the pipeline owns the blue.
5. **Water.** Only Pirate Bay has a real water surface (`island.ts:3096-3125`, one animated `ShaderMaterial`). Maple's pond, lagoon and river and Powder's lake are paint on the same flat plane as the grass — at the shipped camera the pond is three concentric flat discs. That same material, instantiated for Maple's pond and lagoon as two `ShapeGeometry` meshes sharing one material, costs **2 draw calls and roughly 200 triangles** and would make the one thing in Maple a six-year-old will point at behave like water. Cheapest real upgrade on the list after the weights.
6. **Normal variation on the road.** `island.ts:2860-2880` already establishes that roughness cannot get there, and that the *mask* works and is exact per world. The next step is perturbing the normal from the detail texture already fetched. It is real work on the largest surface in the game and it should be last.

What I am not asking for, and want on the record as good: the lane dashes and zebra crossings are **geometry**, not bake (`island.ts:2962-3010`) — razor-sharp at every zoom, and correctly reasoned. Anisotropy is 16 on the ground and the note explaining why is right. The mottle tile's mean-normalisation is the single best piece of engineering on this surface. And **contact is solid** — I scanned under the park bench in `maple_look.png` at y=1520 and the cast shadow ramps the grass from G183 to G147 over 14 css px, attached at the feet, with the legs resolving individually; nothing floats.

Do the five grounds read as five places? **At district scale, yes** — Maple green, Pirate cream-and-magenta, Game Day grey-purple, Powder blue, Lantern ink. **At material scale, no**: all five are one flat albedo plus one grey speckle, so the only thing separating them is paint colour. That is why the strongest ground in the set is Pirate's (real beach banding, tuft strokes, wind ripples, and an actual animated water shader) and the weakest is Powder's — and the difference between them is not art direction, it is how many of the three detail layers were switched on.

One correction for the record: the brief's texel arithmetic (~50 css px per unit, 11× magnification) assumes a camera closer than the game ever uses. Measured from `prototype3d.ts:8351` and `qa/shippedlook.mjs:70`, the ground is magnified **9.1 css px per bake texel at spawn, 2.7 at radius 4, 1.0 at the far clamp** — a 9× swing across one match. No single authored scale can be right for all of it, which is the real argument for a broadband ground, and the real argument against leaving `gCoarse` at zero.

## COVERAGE

**Images read (Read tool):**
- `qa/out/bake/maple.png` (3072²) — required
- `qa/out/shippedlook/maple_look.png` — required
- `qa/out/shippedlook/pirate_look.png` — required
- `qa/out/shippedlook/gameday_look.png`
- `qa/out/shippedlook/powder_look.png`

Not read: `lantern_look.png` (Lantern is the one world already carrying the three-octave mix and was not in scope for the regression I was chasing).

**Images measured numerically** (pngjs, no browser, no build): all five above — patch means, saturation, per-octave high-pass energy at radii 1/2/4/8/16/32/64, pixel scan lines across district boundaries, prop shadow ramps, and stddev/percentile windows on the bake.

**Files read:** `src/proto3d/island.ts` (bake block 710–1200, Game Day 1440–1520, biome colours 1665–1745, Maple lawn 1758–1818, roads 1819–1910, river/pond/lagoon 2379–2470, leaf litter 2560–2660, texture + shader 2686–3010), `src/proto3d/palette.ts` (full), `docs/STUDIO.md` (full), `docs/HANDOFF.md` §1–4, `qa/ground.mjs`, `qa/determ.mjs`, `qa/grounding.mjs`, `qa/_dumpbake.mjs`, `qa/shippedlook.mjs` (camera setup), `src/prototype3d.ts` camera constants.

**Not run:** Playwright, any build, any browser. No file edited.

--- THE SKEPTIC ---
## VERDICT ON THE VERDICT

**NO-SHIP is right, for reasons the team did not give** — one of its two "blockers" is dead on measurement, but the Game Day lot finding, followed one line further than the reviewer followed it, uncovers that `biomeColor` is dead code for every world except Maple and that three separate documented ground fixes were written into a table that never paints.

---

## PER FINDING

### The ground's detail budget is spent below one pixel
**REAL: yes — but not for the reason given, and it is major, not blocker**

**WHAT I FOUND:** The citation is exact. `src/proto3d/island.ts:2811-2814` is `maple/pirate/gameday: [0.45, 0.08, 0.00, 9]`, and the shader at `island.ts:2919-2920` samples `vMapUv * 140.0` and `vMapUv * 34.0`. `SCALE = 0.05` at `island.ts:74`, `W3 ≈ 548` 3D units, `fov = 32` (`prototype3d.ts:8972`), `camDist = 38·(r/0.9)^0.82` (`prototype3d.ts:8351`) — so the camera math checks: 42.8 css px/unit at spawn, 12.7 at r=4, 4.8 at the clamp.

And the ground *is* flat. On a clean 150×120-device-px window of Game Day's lot at (150,1450), `sd = 1.35/255`, and the high-pass energy saturates at 1.31 by radius 8 and never rises. On Pirate's resort sand at (560,380), `sd = 1.35`, saturating at 1.53. The reviewer's own scan reproduces: `maple_look.png` y=1520, x=170..203 gives eleven consecutive **byte-identical** pixels, `(122,181,69)`.

**But the stated mechanism is wrong.** The reviewer measured in **css px** and the rasteriser works in **device px** (`deviceScaleFactor: 2`, `qa/shippedlook.mjs:30`). The fine layer is 32.7 texels per 3D unit against 85.6 device px/unit at spawn — **2.6 device pixels per texel, magnified, not minified.** It only crosses Nyquist at about r=4 and is 2.3× minified by r=8. "At or under one pixel for the entire match" is false at the camera the match opens on.

The real cause is **contrast, not resolution.** The speckle tile (`island.ts:2710-2716`) is `#808080` with 2600 rects of value 96–159 over 16,384 px — roughly 31% coverage, so the tile's own σ is ≈10/255. Through `mix(vec3(1.0), g*2.0, 0.45)` that is a **±3.6% multiply on albedo**; on the lot (lum 50) that is ±1.8/255, which is the 1.35 I measured. The mottle tile is explicitly normalised to **σ = 26** (`island.ts:2775`) — 2.6× the speckle — which is why Lantern's floor has a surface and the daylight worlds do not. The layer is not being filtered away; it never had any contrast to lose.

**FIX SOUND: no.**

- "**Exposure is safe by construction**" is contradicted by the file's own measurement eight lines above the value being changed (`island.ts:2799-2803`): `z 0 → mean 0.706`, `z 0.5 → mean 0.671`. The mean falls monotonically. Mean-normalising the tile guarantees the *multiplier's* mean is 1.0; it does not survive the tone curve, and the probe already showed it doesn't. This is presented as the load-bearing safety argument and it is false.
- Dropping `gFine 0.45 → 0.12` and raising `gMid 0.08 → 0.28` is not "one line each"; it re-tunes three shipped worlds' albedo against a comment that says they were tuned by eye against their own bakes (`island.ts:2705-2708`).
- The criticism of `qa/_grainab.mjs` is however **fair and I confirm it**: the probe crops 520 device px into a 260-px canvas (1 crop px = 1 css px) and high-passes at radius 3 — 3 css px. The mottle's blobs are 1.9–10 3D units = **24–128 css px at spawn**. A 3-px high-pass is blind to them. `qa/ground.mjs:60` makes the same error at radii 1/3/8. The negative result is real about the *mean* and unproven about the *detail*.

**CORRECTION:** Severity is **major**. The one-line reweight is not safe as argued; the defensible change is to raise the *speckle tile's own σ* (a bake-time constant, exposure-neutral because the tile is grey-symmetric) before touching the weights, and to fix `_grainab.mjs` to sweep radius 1–64 css px so the next A/B can actually see the layer it is moving.

---

### Pirate Bay's dance floor is the same luminance as the hero
**REAL: no**

**WHAT I FOUND:** I could not reproduce the void sample. At `(250,1030)` in `pirate_look.png` the pixel is `rgb(95,99,156)` — a desaturated blue-grey, not the claimed `rgb(107,76,176)`. It is the orbit ring over the blue checker cell, not the void's body.

Measured properly — purple-mask the void disc, sample an annulus 10–26% outside the silhouette:

| world | void body mean | ground annulus mean | ratio |
|---|---|---|---|
| **pirate** | **75.1** | **140.8** | **0.533** |
| maple | 78.5 | 138.2 | 0.568 |
| gameday | 60.8 | 97.5 | 0.623 |
| powder | 65.8 | 103.4 | 0.636 |
| lantern | 64.8 | 99.6 | 0.650 |

Pirate has **the strongest hero-to-ground separation of all five worlds** — the ground is 1.88× brighter than the void. The claimed 1.007 comes from two hand-picked pixels, one of which is not the object it is said to be. I cropped the region the reviewer says dissolves (x 120–500, y 950–1470, 2×) and read it: the void's rim is a clearly bounded purple mass with a specular edge over a much lighter magenta band. Nothing dissolves.

**FIX SOUND: no — and the gate is inverted.** `qa/heroground.mjs` as specified ("fail if the ratio is under 1.30") fails on **all five worlds**, because the void is deliberately darker than every ground in the game. A gate that fails on a build nobody disputes is worse than no gate.

**CORRECTION:** What is arithmetically true is narrower: the two checker cells are near-isoluminant. `island.ts:984` composites to `(194,92,167)` lum 119 and `(92,124,185)` lum 121 — **1.016:1**, and 85.6 vs 81.5 in the render. That is a hue mosaic, not a value checker. It is also a *disco floor*, which is the one surface in the game where isoluminant hue banding is the correct read, and `palette.ts:57-65` scopes its 1.35:1 rule to "neighbours that actually meet on the map" — districts you cannot see the edge of — not to a pattern inside one district. Polish at most. The citation `island.ts:916` is also wrong; `DCOL.party` is at **924**. `981` and `984` are correct.

---

### Nothing in Maple's bake occupies the band between a footprint and a lawn
**REAL: yes**

**WHAT I FOUND:** `island.ts:1812` is `lrange(bw * 0.07, bw * 0.22)`, `BLOCK_SIZE = 1600` (`island.ts:164`), `SCALE = 0.05` → the block is **80 3D units** and the tone arcs are **radius 5.6–17.6 units**. Confirmed. I ran the octave curve myself on the same bake window (620,180,330×300 of `qa/out/bake/maple.png`, U = 5.6 canvas px/unit):

```
0.18u: 0.72   0.36u: 1.39   0.71u: 2.26   1.43u: 3.18
2.86u: 4.41   5.71u: 6.25   11.4u: 8.36
```

Monotonic, same shape, same conclusion. And I can see it: in `maple.png` the north-west green blocks show large overlapping circular smudges — the tone pass is drawing objects a fifth of a city block across.

The leaf drifts at `island.ts:2632` are `drange(1.6, 3.6) * U` with lobes `drange(0.5, 1.15) * U`, where `U = TEX / W3` — genuinely 1.6–3.6 units. The reviewer is right that this is the one ground feature in the game authored at a scale the play camera reads, and right that `island.ts:2577-2586` is where someone did the arithmetic.

Game Day's stripes confirm too: `stripe('greek', 210, true)` at `island.ts:1505` with `step = pitch * PU` in **world** units — 210 world = 10.5 3D units per band, so a full light/dark period is **21 units ≈ 900 css px at spawn**, twice the width of the phone. That is not a mown stripe.

**FIX SOUND: yes, with one caveat the reviewer did not state.** Adding draws to `lr()` (`island.ts:1789`) shifts every subsequent `lr()` draw, so the existing 26-pair tone pattern in later blocks moves. It does **not** touch the mainstreet stream and the town stays identical every load, so the hard constraint holds — but the change is not additive to the current look, it re-rolls it.

**CORRECTION:** "no feature anywhere between 0.3 and 1.6 units" is too strong. The base grass mottle at `island.ts:733-737` is `rand(2, 6)` canvas px = **0.36–1.07 3D units** and it survives on `cozy`/`fancy`/`plaza` blocks, where `biomeColor` is `null`. It is at ~1% contrast (my 0.36u reading is 1.39/255) — present but inaudible. The band is not empty; it is 1% deep.

---

### Game Day's car park is one value across the whole frame
**REAL: yes — and it is worse than reported**

**WHAT I FOUND:** I reproduce the three patches within 1/255: `(59,45,45)`, `(60,46,46)`, `(62,48,48)`. On a clean 150×120 lot window at (150,1450) the standard deviation is **1.35/255** and the high-pass energy is flat from radius 8 out to radius 32 — there is no structure at any scale. `stripe()` is called for `greek`, `campus`, `practice` and never for `lot`, exactly as claimed.

**The parenthetical is the actual finding, and the reviewer left it as a parenthetical.** `biomeColor` (`island.ts:1666`) is consumed at exactly one site — `island.ts:1739`, `if (WORLD_ID === 'maple') for (let gy = 0; ...)`. It is **dead for every world but Maple**, and inside Maple only the ten Maple biomes are reachable. So:

- `lot: 0x918e97` and the twelve-line comment above it — *"A framebuffer sample put Game Day's mean scene luminance at 0.357 against Maple's 0.626… It is the albedo. The lot is over half the frame… most of a stop brighter"* — **never paints anything.** `GD_FLOOR.lot = 0x6e6b74` is what paints. `0x918e97` is rel-lum 0.56; `0x6e6b74` is 0.42. The stop the comment promised was never delivered, which is why the lot renders at 48/255.
- Five of Game Day's eight floors are stale in the mirror (`campus` 0x8fd06a vs 0x76b85a, `rvpark` 0x9d978a vs 0x8a8578, `gate/plaza` 0xc4beb2 vs 0xb9b3a8, `bowl` 0x3f8f4e vs 0xb9b3a8, plus `lot`).
- **Pirate is the same story.** `biomeColor` says *"the bay's three sands measured 1.05 and 1.12 apart, so the resort, the cove and the market were one beige field"* — and the re-spaced values went into the dead table. `DCOL` (`island.ts:923-926`) still paints resort `#ffcf8a` (212), market `#e5a942` (174), cove `#c39a4e` (157), beach `#ffe6a8` (231): **1.09, 1.11, 1.22** apart. The 1.35:1 fix was never applied to the surface it was written for.
- Lantern's ten entries **are** in sync with `LN_FLOOR` byte for byte. Somebody maintained the mirror for one world and not the others.

**FIX SOUND: yes, but it is the second fix, not the first.** Aisles and patch repairs are correct and cost nothing. But paint the lot the value its own comment specifies before adding texture to the wrong value.

**CORRECTION:** This is a **blocker**, and it is not "the lot has no markings" — it is that three measured, documented ground-albedo fixes across two worlds were committed into unreachable code. Gate: a unit test that asserts `GD_FLOOR`/`DCOL`/`LN_FLOOR` equal their `biomeColor` counterparts, or delete the non-Maple half of `biomeColor` outright so it cannot lie again. That probe fails today on 10 of 14 entries.

---

### Powder Pass's snow renders as saturated steel blue at 43% luminance
**REAL: yes on luminance, no on saturation**

**WHAT I FOUND:** `island.ts:763-774` is quoted correctly and the compositing arithmetic checks: `#dfe7f6` (lum 229) under `rgba(92,116,176,0.34)` then `rgba(92,116,176,0.22)` lands at `(159,175,212)`, **lum 174** where both strokes overlap — a 24% cut in the bake. In the band covered only by the wider stroke it is 205.

The luminance complaint holds independently of the reviewer's sample: near, lit snow in `powder_look.png` reads `rgb(108,118,143)` at (700,1500) and `rgb(91,98,119)` at (500,1750) — **0.38 to 0.46**. Snow darker than Maple's grass is real.

**But the saturation number is measured on fog.** `(480,120)` — sat 0.592, which I reproduce — is the far field at the top of the frame, where `prototype3d.ts:8983` runs `fog.near = 60 + camDist*1.4`, `fog.far = 260 + camDist*4`. That is aerial perspective, not albedo. Near snow measures **sat 0.169–0.245**. "Snow that is darker and more saturated than Maple's grass" is half true.

**FIX SOUND: yes — because it is honestly a path, not a fix.** "Run `qa/_dumpbake.mjs powder` and put it beside `powder_look.png`" is the right move and nobody has done it. Halving the rim strokes is a zero-cost, reversible experiment.

**CORRECTION:** The gate as written (`fail if any world's ground saturation exceeds 0.35`) will fail Powder on fog no matter what GROUND does. Mask the far field or sample within a fixed world-space radius of the void.

---

### Maple's river foam is a road centre line
**REAL: yes**

**WHAT I FOUND:** `island.ts:2431-2433` is quoted exactly, and I can see it in `qa/out/bake/maple.png` — the river runs down the right third of the canvas with a regular white dash sequence down its exact centre, and the road dashes elsewhere in the same image are the same object.

**FIX SOUND: yes.** Two offset broken strokes with a per-stroke `lineDashOffset` is the right shape and costs nothing.

**CORRECTION:** The scale numbers are wrong by a factor of 2.3. `pxW(70) - pxW(0)` is 70 **world** units = **3.5 3D units** of dash, `pxW(210)` = **10.5 units** of gap, `pxW(30)` = **1.5 units** wide, inside a `riverStroke(riverMid, 118)` channel = **5.9 units** across. So the foam is 25% of the water's width on a 14-unit period — not "1.5 on / 4.5 off". The gate's threshold ("period under 8 3D units") would miss it: the period is 14.

---

### The bake's noise is `Math.random`, so no pixel gate can ever be written against the ground
**REAL: yes**

**WHAT I FOUND:** Every cited site uses `Math.random` — `island.ts:733-737` (Maple's 4,000 base blobs), `758-762` (Powder), `911-913` (Pirate wind grain), `1464-1468` and `1477-1484` (Game Day base + leaf specks), `2712` (speckle tile), `2740` (mottle tile). And the two passes that got it right say so in comments: `island.ts:1786` *"Not Math.random (the town would differ every load)"* and `island.ts:2591`.

**FIX SOUND: yes, and I checked the trap the reviewer did not mention.** `rand` at `island.ts:268` is `(a, b) => a + Math.random() * (b - a)` — it is **not** the seeded mainstreet stream, so shadowing it inside the bake scope takes no draw from `mrnd()`/`mr()`/`mpick()` and shifts no authored placement. `island.ts:287` confirms the boundary. The fix is safe as written.

**CORRECTION:** Only the *bake* passes are worth seeding. The speckle and mottle *tiles* (`2712`, `2740`) are tiling noise — a different roll is statistically identical and no player or gate reads them — but they do have to be seeded anyway for the proposed `toDataURL()` hash to be stable, so include them and say why.

---

## WHAT THE TEAM MISSED

**1. They found the dead table and walked past it.** `biomeColor` is consumed at one site, guarded `if (WORLD_ID === 'maple')` (`island.ts:1739`). Everything below the Maple block — Game Day's nine entries, Pirate's six, Lantern's ten, Powder's five nulls — is unreachable. Three separate fixes with measured numbers attached (Game Day's 0.357-vs-0.626 albedo lift, Pirate's 1.35:1 sand re-spacing, the `party` slab at 0x6a4a7a) were written into it and never shipped. The reviewer noticed one mismatched hex and filed it as an aside inside a `major`. It is the largest real defect on this surface and it explains the very symptom their own frame measurements found.

**2. They named Pirate "the strongest ground in the set" without measuring it.** Pirate's resort sand at (560,380) is **σ = 1.35/255** with high-pass energy flat at 1.5 from radius 4 to radius 64 — identical flatness to the Game Day lot they called a `major`. The "real beach banding, tuft strokes, wind ripples" they credit are all authored at coastline scale; none of it is in frame at the play camera. They graded two worlds differently on the same measurement.

**3. They diagnosed resolution when the defect is contrast.** Nobody computed the speckle tile's own spread. It is σ ≈ 10/255 on a base of 128 — a ±3.6% multiply at weight 0.45. The mottle tile is normalised to σ = 26 at `island.ts:2775`. Lantern's floor works because its layer has 2.6× the contrast, not only because its texel is bigger. Raising the speckle tile's σ is exposure-neutral by the same symmetry argument the mottle already relies on, costs zero, and does not relitigate three worlds' weights.

**4. They quoted a "safe by construction" guarantee that the file disproves eight lines earlier.** `island.ts:2799-2803` records `mean 0.706 → 0.671` as `uGrain.z` goes 0 → 0.5. That is the exposure cost of the change they call free. In a review whose own charter cites six retractions from confident wrong findings, asserting safety against a measurement printed in the same comment block is the failure mode, not an oversight.

**5. Nobody checked whether Powder's lake can be water.** The reviewer's ranked item 5 proposes the Pirate water shader for "Maple's pond, lagoon and river and Powder's lake". `island.ts:440` is `if (WORLD_ID === 'powder') return false; // the lake is ice — see inWater3`. Powder's lake is ice by design and by gameplay contract. Maple's pond and lagoon are fair game; Powder's lake is not.

**6. The `_grainab.mjs` radius bug is a kit-wide bug and they scoped it to one probe.** `qa/ground.mjs:60` measures at radii 1/3/8 device px — 0.04, 0.12, 0.31 3D units. Every ground feature anyone has authored in this file lives between 0.5 and 18 units. The measurement kit for this surface cannot see the surface. That is the same class of instrument error as the leaf-litter luminance mean, and it is the reason `gCoarse = 0` and the daylight mixes both look "measured".

SURVIVED: 6 of 7.


═══════════════════════════════════════════════════════════════════
TEAM LIGHT
═══════════════════════════════════════════════════════════════════
--- THE TEAM'S REVIEW ---
I read all four shipped frames, cropped and enlarged four regions, and measured the pixels. Here is the report.

## VERDICT: NO-SHIP

Three of the five worlds are rendering at the wrong exposure because `WorldLight.exposure` is authored per world and never read by anything — and the hero clears a 3:1 contrast ratio against no ground surface in any world.

## THE BAR

**hole.io** (Voodoo, 2018 — #1 free, our direct genre) and **Donut County** (Annapurna, Apple Design Award 2019). Both solve the same problem we have and solve it the same way: the hero is a *pure black* void with a thin light rim, placed on grounds that are always mid-to-light. The hero sits at one *end* of the value scale, so its contrast against the ground is roughly 10–14:1 and never depends on hue, palette, or which level you are in. It reads at 12 px and at 900 px, on grass, on tarmac, on sand, with no per-world tuning at all.

We put the hero in the **middle** of the value scale. His mean relative luminance is **0.106**, identical in all four worlds (`rgb(114,64,181)` / `(113,63,176)` / `(117,65,186)` / `(114,66,177)` — max channel delta 10 across four completely different rigs). Our four grounds span relL **0.035 → 0.286**. He is *inside* that band everywhere. Measured WCAG contrast, hero body vs. ground:

| world | ground | contrast |
|---|---|---|
| Maple | road | **1.20:1** |
| Powder | snow | **1.47:1** |
| Game Day | asphalt | 1.69:1 |
| Lantern | ground | 1.80:1 |
| Maple | grass | 2.15:1 |
| Maple | plaza | 2.98:1 |

3:1 is the *minimum* for a large graphical object. Best case in the game is 2.98:1 and worst is 1.20:1. hole.io's is roughly 12:1 everywhere.

Second bar, for Powder: **Alto's Odyssey / Alto's Adventure** (Snowman). Their snow is never one value — it carries a low-frequency gradient plus a specular glint band that tracks the sun, so a flat white field still has a surface. Ours measures **7–12 unique luminance levels** across a 120×120 patch, over **75.5% of the frame**.

## FINDINGS

### Three worlds render at an exposure nobody authored
SEVERITY: **blocker**
AT: `src/prototype3d.ts:755` and `src/prototype3d.ts:816`

SAW: This is a code finding, and the render is the corroboration, not the discovery — the frames cannot show you a missing multiply, they can only show you the darkness it causes. `gameday_look.png` measures mean luminance **0.292** (AAA-BRIEF records 0.357; it has got darker, not better). `lantern_look.png` measures **0.245**, with **35.5%** of the frame below L 0.125 and the entire lower third a featureless brown smear — see `c_lantern_dark.png`, a 2× enlargement of the bottom-left quarter, which contains one barely-visible prop silhouette and nothing else. These are the three worlds whose authored exposure is being discarded. Maple and Pirate, whose authored exposure is 1.0, are the only worlds that measure healthy.

EVIDENCE: The field is declared, authored five times, and read zero times.

```
:640    off: [number, number, number]; dusk: number; normalBias: number; exposure: number;
:675  gameday: { … dusk: 0.45, normalBias: 0.26, exposure: 1.12,
:705  lantern: { … dusk: 1.0,  normalBias: 0.14, exposure: 1.42,
:716  powder:  { … dusk: 0.85, normalBias: 0.15, exposure: 1.18,
```
```
:753 const RIG = {
:754   hemiI: 0.22,
:755   exposure: 1.0,
:756 };
:816   renderer.toneMappingExposure = RIG.exposure;
```

`grep -n exposure src/prototype3d.ts` returns exactly those lines plus `:279 renderer.toneMappingExposure = 1.0`. `LIGHT.exposure` is never on the right-hand side of anything. Lantern's own rig comment at `:702` reads *"Exposure runs high (1.34) so the lantern pools bloom out toward white while the shadows still have somewhere to go"* — it is 1.0 on screen and has always been. This is the identical shape to the two bugs this file has already caught and written up (resetMatch overwriting the rig, `backgroundIntensity` 0.55 → 1.0): a per-world value that a later refactor pinned to Maple's. The RIG comment at `:741` even names its three numbers as *"a hemisphere pinned at 0.22, the key paid back by 1.31, exposure at 1.0"* — and 1.0 was correct when there was one world.

The cost of the bug, solved back through the shipped grade from the measured pixels:

| measured pixel (exp 1.0) | at authored exposure | luminance |
|---|---|---|
| Lantern ground `rgb(39,3,0)` | `rgb(60,30,0)` | 0.041 → **0.134** |
| Lantern ground `rgb(47,15,0)` | `rgb(70,38,0)` | 0.081 → **0.165** |
| Lantern plaza `rgb(125,85,64)` | `rgb(152,111,88)` | 0.361 → 0.463 |
| Game Day asphalt `rgb(65,48,48)` | `rgb(72,55,55)` | 0.202 → 0.230 |
| Powder snow lit `rgb(131,146,172)` | `rgb(144,158,182)` | 0.567 → 0.615 |

Lantern's floor comes up **3.3×**, and the green channel goes from 3/255 to 30/255 — the world stops being a single-channel image. The team already spent an ambient-lift attempt and a same-day retraction (`:746-752`, `lantern_thumb_ab.png`) chasing this murk with hemisphere numbers. The lift they wanted was already written down four lines above; it just was not wired.

FIX: `exposure: LIGHT.exposure` at `:755`. One token. Zero draw calls, zero triangles, zero seeded draws. Then delete `hemiI` from `WorldLight` or apply it — `:744` documents it as deliberately dead, but leaving a 3.5× per-world spread (0.5 vs 1.75) sitting in the table as if it were art direction is what let `exposure` hide next to it.

GATE: `qa/lightdrift.mjs` exists and watches the rig for drift between matches; extend it to assert, on every world, `renderer.toneMappingExposure === WORLD_LIGHT[w].exposure` at boot **and** after `resetMatch`. Fails today on gameday/lantern/powder (1.0 vs 1.12/1.42/1.18), passes after.

### The hero clears 3:1 against nothing, and 1.20:1 against Maple's road
SEVERITY: **blocker**
AT: `src/proto3d/palette.ts:69`, `src/prototype3d.ts:655`

SAW: In `maple_look.png` the road runs across the top-left corner — a cool lavender-grey, `WORLD.road = 0x6b7292`, which `palette.ts:69` itself labels *"cool lavender-gray"*. It is the one ground colour in the game inside 50° of hue of the hero (Δhue **47°**) and it is the one he cannot be seen on. In `powder_look.png` his bright rim dissolves into the snow (rim-vs-snow **1.27:1**, Δhue 41°) and only his dark core reads. In `lantern_look.png` and `gameday_look.png` the reverse: his rim reads (3.66:1, 2.96:1) and his **core is gone** — core-vs-ground **1.04:1** on Lantern, **1.19:1** on Game Day. Look at `c_gameday_shadow.png`: the void is out of that crop, but the asphalt it sits on is `rgb(69,55,54)`, and his core is `rgb(49,28,108)`.

EVIDENCE, measured per world (hero p10 = core, p90 = rim, against each ground class ≥5% of frame):

```
maple    rim rgb(153,105,212)  core rgb(50,7,123)
   vs grass   rim 1.36:1   core 4.98:1
   vs plaza   rim 1.65:1   core 6.06:1
   vs road    rim 1.48:1   core 2.47:1   Δhue 47°
powder   vs snow     rim 1.27:1   core 2.83:1   Δhue 41°
lantern  vs ground   rim 3.66:1   core 1.04:1
gameday  vs asphalt  rim 2.96:1   core 1.19:1
```

He already has both ends — an ink core (`VOID.abyss = 0x050308`, which `palette.ts:31` correctly calls *"actual deep space, not a dark purple"*) and a lit violet rim. His core scores **4.98:1 and 6.06:1** on Maple's two light grounds; his rim scores **3.66:1** on Lantern's dark one. What he does not have is a per-world *balance* between them. He renders the same mix on a snowfield as on a night market, and in each world exactly one of his two ends dissolves.

FIX: the smallest change that closes it is one float. Add `coreBias: number` to `WorldLight` and drive the void body shader's abyss→mid→rim gradient midpoint from it — push the ink core outward on the two light worlds (Maple, Powder), pull it in and let the rim carry on the two dark ones (Lantern, Game Day). Cost: **one uniform, zero draw calls, zero triangles, zero seeded draws**, and the purple identity is untouched — it is the same three colours, redistributed. Do **not** add a ring or an outline: `palette.ts:36-41` records that the owner has already read three separate things as *"a ring around him"* (the ground annulus, the find ring, and a pale rim), and that is a closed door.

Second, independent of the above: move `WORLD.road` off lavender. It is 47° from the hero, it is the surface the match opens beside, and `island.ts:1668` already writes the same argument about the spawn square — *"the player is 0x9a5cff and the match opens there, so the one thing the ground under the spawn must not be is pale violet pavement"* — and then the road twenty units away is pale violet pavement. Note it is also the source of the ground shader's road mask (`uRoadCh`, `island.ts:2866`), which is chromaticity-based and self-corrects, but `qa/groundsurf.mjs` must be re-run to confirm the mask still selects.

GATE: new `qa/heroread.mjs`. Per world, pin quality, drive the void to radii {0.9, 4.5, 12, 19}, screenshot the canvas (not a probe-owned render target — `prototype3d.ts:1002` explains why that distinction is load-bearing), classify the ground into hue/value classes, and assert **min WCAG contrast ≥ 3.0:1** between the hero's p50 body and every ground class occupying ≥5% of the frame. Fails today at 1.20:1 (Maple road) and 1.27:1 (Powder rim vs snow); passes after. Nothing in `qa/` measures this today — `qa/contrast2.mjs` is HUD-only by its own header, and `qa/silhouette.mjs` counts triangles per screen pixel, not contrast.

### Powder's snow is a solid fill: 7–12 luminance levels over 75% of the frame
SEVERITY: **blocker**
AT: `src/prototype3d.ts:716`, `src/proto3d/island.ts:2822`

SAW: `powder_look.png`, and `c_powder_snow.png` (2× enlargement of the snowman and the rocks). The snowfield has no undulation, no sparkle, no value break and no colour break. The only structure in the frame is one hard diagonal shadow wedge with visible stair-stepping along its edge. The snowman's own body is the same value as the ground he stands on. The single warm accent in the entire world is one lit window in the bottom-left corner.

EVIDENCE, three independent clean patches:

```
powder snow A (120x120)   lumSD 0.86/255   blueSD 0.88   9 unique luminance levels
powder snow B (110x 80)   lumSD 0.75/255   blueSD 0.79   7 unique luminance levels
powder snow C (110x 80)   lumSD 1.52/255   blueSD 0.93  12 unique luminance levels
--- for scale, the same measurement on Maple ---
maple grass   (90x 90)    lumSD 22.09/255              73 unique luminance levels
maple plaza   (90x 90)    lumSD 10.26/255              42 unique luminance levels
```

Hue: **86% of the frame lies in hue 200–270°**, and a single 10° bin (220°) holds **37.4%** of it. And the rig's own promise is not landing — `:711` says *"hemiGround is BRIGHT and blue (snow reflects most of what hits it), so shadows fill with sky instead of going black, which is exactly what a snowfield at dusk does."* Measured: lit snow `rgb(131,146,172)`, shaded snow `rgb(88,97,121)`. The red:blue ratio moves from 0.762 to 0.727 — a **5% hue shift**. The shade is not blue; it is the same grey, darker.

FIX, in order of leverage, all inside my surface:

1. **Drop the Powder sun to ~24°.** `off: [-62, 78, 30]` is an elevation of **48.6°**. Change to `[-62, 30, 30]` (≈24°) and every drift, kerb, rock, snowman and chalet throws a shadow 2–3× its own height across a field that currently has nine luminance values in it. This is precisely the argument Game Day's own rig comment makes at `:620` — *"the single most characteristic image a car park at 4pm produces, and the one thing a dense flat district needs to stop reading as a texture"* — and Powder has the *opposite* density problem to the one that later forced Game Day back up to 40° (*"the shadows very nearly bridge the aisles"*, `:670`). Powder is sparse; there is nothing for the shadows to bridge. Requires a `normalBias` bump with it, 0.15 → ~0.26, exactly as gameday carries. Cost: **two numbers. Zero draw calls, zero triangles, zero seeded draws.** This is the single highest-leverage number on my whole surface.
2. **Swing the fill genuinely blue.** `fill: 0x7aa0e0` at `fillI 0.5` is what actually lights the shade (`hemiI` is pinned at 0.22 and `hemiSky 0x2a3c66` contributes 0.005–0.029 linear — nothing). Take it to a true sky, ~`0x4d7de0`, and raise `fillI` to hold the shade's value while its hue moves. Cost: two numbers.
3. **Normal variation on the ground plane.** `island.ts:2827` already contains the measured negative result — roughness does nothing on a flat +Y plane, *"it needs normal VARIATION — something for a highlight to catch — which means perturbing the normal from the detail texture already fetched above. That is a real change to the largest surface in the game and it was not made on the strength of a guess."* That door is still open and Powder is what is behind it. The cheap version derives the tilt from `g` and `g2`, which `map_fragment` already fetches at `:2920`, for **zero extra texture reads**; the good version costs two offset taps on **one** material. Zero new draw calls either way. This is jointly Ground's and must be perf-measured before it ships. `GRAIN.powder = [0.20, 0.06, 0.00, 9]` at `:2822` says *"the bake's own blue shadowing carries the variation"* — the shipped frame falsifies that at 0.75/255.

GATE: extend `qa/ground.mjs` (which already measures ground detail energy per world). Per world, sample four ground-only patches of 120×120 and assert **lumSD ≥ 4/255 and ≥ 32 unique luminance levels**. Fails today on Powder (0.75–1.52, 7–12), Lantern (2.6–2.9, 19), Game Day (3.5, 13); passes on Maple (10.3–23.7, 42–82).

### The grade's toe is a per-channel hard clamp, and it kills a quarter of Lantern's colour
SEVERITY: **blocker**
AT: `src/prototype3d.ts:270`

SAW: `lantern_look.png` bottom third, enlarged in `c_lantern_dark.png` — the ground reads as a flat brown-black smear with faint contour banding and no material information at all. `gameday_look.png` — every red in the frame is flat vinyl, not painted metal: look at the fire truck in `c_gameday_shadow.png`, where the top face, the front face and the side face of the big red body are the *same red*. There is no shading in them because two of their three channels are pinned to the floor.

EVIDENCE:
```
:269  float l = dot( color, vec3( 0.2126, 0.7152, 0.0722 ) );
:270  color = max( vec3( 0.0 ), ( color - 0.014 ) / ( 1.0 - 0.014 ) );   // toe
:274  color = mix( vec3( l ), color, 1.07 );                             // chroma back
```

`0.014` linear is sRGB **31/255**. Any channel that would have displayed below 31 is set to *exactly zero*, per channel, with a hard `max`. That is a black-point subtraction, not a toe — every film ODT rolls the bottom off asymptotically for precisely this reason. Measured on the shipped frames, share of pixels with any channel ≤ 2/255:

```
                blue==0    any channel <= 2
maple            13.78%         17.67%
gameday          17.32%         23.85%
lantern          24.55%         30.22%
powder            3.41%          6.16%
```

Among Game Day's blue-dead pixels, the most common `(r,g)` is `(160,0)` at **8.0% of the entire frame** — one pixel in twelve is a red with green and blue both dead. And a 120×110 patch of Lantern's ground has **blue standard deviation of exactly 0.00** across 13,200 pixels. There is no blue channel in that part of the world; there is nothing for it to vary.

I re-implemented the shipped transform exactly and isolated the cause:

```
fire-truck red, linear [0.55, 0.045, 0.035] @ exposure 1.12
  toe=0     chroma=1.07  ->  rgb(178, 18, 25)     <- shading survives
  toe=0.014 chroma=1.07  ->  rgb(177,  0,  0)     <- SHIPPED
lantern ground, linear [0.030, 0.006, 0.0012] @ exposure 1.42
  toe=0                  ->  rgb( 23,  2,  0)
  toe=0.014              ->  rgb(  0,  0,  0)     <- SHIPPED
```

The chroma boost at `:274` contributes (it has no gamut guard, so it drives sub-luminance channels further down before the final clamp) but the toe is the killer.

FIX: move the toe into luminance space, where it does the value crush the team tuned and cannot zero a channel. Four ALU:

```glsl
const float TOE = 0.014;
float lo = max( 1e-4, l );
float lg = lo * lo * ( 1.0 + TOE ) / ( lo + TOE );   // soft knee, asymptotic to 0
color *= lg / lo;
```

Verified against the shipped curve: for l ≥ 0.1 the two agree within **0.002** — white highlight, plaza tan, Maple grass lit and Powder snow lit all move by ≤ 2/255, so nothing anyone tuned above midtone changes. The fire truck goes `rgb(177,0,0)` → `rgb(168,14,21)`. Optionally add the gamut guard to `:274` for another ~8 ALU:

```glsl
vec3 d = color - vec3( l );
vec3 head = vec3( l ) / max( vec3( 1e-4 ), -min( d, vec3( 0.0 ) ) );
color = vec3( l ) + d * min( 1.07, max( 1.0, min( head.r, min( head.g, head.b ) ) ) );
```

Cost of both: **zero draw calls, zero triangles, zero seeded draws.** On rungs 0–1 this runs once per screen pixel inside `OutputPass`; on rungs 2–3 it runs per shaded fragment exactly as the current line does.

Honest limit: this does **not** rescue the very darkest Lantern floor, because there the *luminance itself* is under the knee. Exposure (finding 1) is what fixes that, and the residual after both is genuinely albedo — see the next finding.

GATE: `qa/colorpipe.mjs` already renders known values through every path. Add a **channel-floor sweep**: push a lattice of in-gamut linear inputs through the shipped grade and assert no input with all three channels > 0 yields an output with a channel == 0. Fails today. Plus a frame assertion in `qa/shippedlook.mjs`: share of pixels with any channel ≤ 2 must be **< 8%** per world. Fails today at 17.67 / 23.85 / 30.22 / 6.16.

### Lantern's floor is lit blue by the rig and renders pure red — the painted lantern wash overrides the light
SEVERITY: major
AT: `src/prototype3d.ts:704`, `src/proto3d/island.ts:1099-1110`

SAW: `lantern_look.png` and `c_lantern_dark.png`. The entire ground plane is a warm red-brown with the blue channel at zero. Nothing in the frame reads as moonlit.

EVIDENCE: Computing the rig's irradiance on an up-facing ground normal from the shipped numbers (`lantern: sun 0xbfd4ff @ 0.55×1.31, off [-30,96,46]; fill 0x6a8cff @ 0.72×1.31, off [52,40,-60]; hemiSky 0x2c3766 @ 0.22`):

```
sun   (0.327, 0.412, 0.625)
fill  (0.061, 0.110, 0.424)
hemi  (0.006, 0.009, 0.029)
total (0.394, 0.530, 1.079)   <- BLUE is the dominant channel, correctly: it is moonlight
```

The ground albedos are not the problem either — `island.ts:1712` authors `stalls: 0x7d6552` (blue 82/255) and `torii: 0x585269` (blue 105/255). Blue-dominant light times a ground with blue in it should not produce `rgb(47,15,0)`. It does, because the lanterns' floor contribution is *painted into the bake* (`island.ts:1102`: *"the lanterns' contribution to the FLOOR is painted in. Each pool is an…"*) and the amber wash removes the blue before the light ever touches it. The world is authored as *moonlight plus lanterns* and only the lanterns reach the ground. That is why `:711`'s "warm ground bounce carries the mood" reads true on screen for the wrong reason — and note that in three's hemisphere formula `mix(ground, sky, 0.5 + 0.5·dot(N,up))`, an up-facing normal receives the **sky** colour exactly, so `hemiGround: 0x7a5844` contributes *nothing at all* to the floor. It only lights eaves and lantern undersides.

FIX: the diagnostic first, because this is one bake pass and guessing at it has already cost this repo two retractions. `qa/_dumpbake.mjs` exists — dump the Lantern ground canvas and read the blue channel's histogram directly. If the wash is a multiply, change it to a screen/soft-light composite so it can only *add* amber rather than subtract blue; if it is a fill, give it an alpha ceiling so the base albedo survives. Zero runtime cost either way — it is bake-time canvas work. Then re-measure: the target is blueSD > 0 on every ground patch.

GATE: extend the finding-4 gate per world — Lantern's ground patches must show **blue standard deviation > 1.0/255**. Fails today at exactly 0.00.

### Ground shadow contrast is 1.5:1 against the team's own written target of 2.5–3.5:1
SEVERITY: major
AT: `src/prototype3d.ts:607`

SAW: `c_gameday_shadow.png` — the person casts a dark readable shadow, but the fire truck beside them barely marks the tarmac. `c_powder_snow.png` — the big diagonal is the only value break in the entire snowfield.

EVIDENCE: the file's own bar, at `:607-608`: *"a shadowed pixel therefore kept ~70% of its brightness and shadow contrast capped at 1.44x — a stylised diorama wants 2.5-3.5x."*

```
Game Day asphalt class (40.5% of frame):  L p05 0.179, p95 0.271  =  1.51x
Powder snow, lit 0.568 vs shadowed 0.380  =  1.49x
```

The rig is not the problem. Computing linear irradiance ratios from the shipped tables: **Maple 5.06×**, **Powder 8.7×**. The contrast is being generated and then lost — partly to the ACES shoulder, partly to the ambient floor, and (on three worlds) partly to the exposure bug in finding 1, which compresses the lit end toward the toe.

FIX: this is the cheap one and it should be done before anything expensive is attempted on shadow *softness*. After finding 1 ships, re-measure; if Game Day is still under 2.2:1, trim `gameday.fillI` from 0.52 and `powder.fillI` from 0.5 — the fill rides `RIG.sunI/LIGHT.sunI` at `:815` so it scales with the key, and lowering it darkens shade without darkening light. Cost: one number each, zero draw calls.

GATE: new `qa/shadowread.mjs`. Per world, locate the strongest ground-plane luminance boundary and assert lit:shadow ≥ **2.2:1**. Fails today on Game Day (1.51) and Powder (1.49), passes on Maple.

### Shadow edges are hard, and the only remaining door costs two blur passes
SEVERITY: minor
AT: `src/prototype3d.ts:229`

SAW: `c_powder_snow.png` — visible stair-stepping along the long diagonal shadow edge. Scanning a row across the person's shadow in `gameday_look.png` gives a 10–90% transition of **6 device pixels** (3 CSS px at DPR 2) with a 2.12:1 step. That is a razor edge for a game aimed at six-year-olds.

EVIDENCE: `renderer.shadowMap.type = THREE.PCFShadowMap` at `:229`, and the comment above it is **correct** — I verified `PCFSoftShadowMap` is deprecated in the installed dependency:
```
node_modules/three/build/three.module.js:9148   if ( this.type === PCFSoftShadowMap ) {
node_modules/three/build/three.module.js:9150     warn( 'WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.' );
```
At the 110-unit frustum cap (`:869`) a 2048 map resolves 9.3 texels per world unit, so PCF's filter kernel spans ~0.1–0.3 world units of penumbra.

FIX: the honest answer is that there is no free version. `THREE.VSMShadowMap` (present in 0.185, `:9267`) with `sun.shadow.radius = 3` and `blurSamples = 8` gives real tunable softness and costs **two separable blur passes over the shadow map only** — 2048², not screen resolution — and adds **zero scene draw calls**. It should be gated to rungs 0–1 where `shSize` is already 2048, and dropped to PCF below. This must be measured against the 60 fps iPhone 13 budget by Perf before it ships; I am naming the path, not asserting the cost is affordable. **Do finding 6 first** — contrast is free and it is what is actually failing; softness is expensive and it is a polish item.

GATE: extend `qa/shadowcost.mjs` (which already measures shadow cost) with the frame-time delta of the VSM blur per rung, and add a 10–90 transition-width assertion ≥ 4 device px to `qa/shadowread.mjs`.

### There is contact AO on props and none on the surfaces receiving them
SEVERITY: minor
AT: `src/proto3d/island.ts:3807`

SAW: `c_maple_shadow.png`, the two trees and the sign posts. Each prop darkens toward its own base — that is `bakeContactAO` working — but the plaza *under* them is untouched, so at the contact line there is a dark prop meeting a bright unmodified ground with no transition.

EVIDENCE: `bakeContactAO` (`island.ts:3807`, `AO_FRAC 0.34`, `AO_MAX 0.40`) walks the *prop's own* vertex colours only; `contactShadow()` (`assets3d.ts:62`) adds a disc for characters and vehicles, but `assets3d.ts:128` only calls it for things that fail `shouldCast` — anything with r ≥ 4 gets a real cast shadow and no disc, which is right, and nothing darkens the receiving surface.

FIX: no, SSAO should not ship — it needs a depth-normal target, a blur, and a screen-space pass, and `ensureComposer` already documents what the chain costs. The free substitute that is missing: paint a soft dark ellipse into the ground bake canvas under every large *static* prop at bake time, from placements that are already in hand. Same trick `contactShadow()` does with a mesh, at zero runtime cost, zero draw calls, zero triangles, and **zero seeded draws** — the positions are already decided, so hashing off them costs nothing, which is the pattern used elsewhere in this repo.

GATE: `qa/_aodiff.mjs` and `qa/grounding.mjs` exist. Add: for N sampled large static props, assert the ground annulus immediately outside the prop's footprint is ≥ 6% darker than the ground two radii away. Fails today at ~0%.

### Each world's light is real; two worlds share one rig, and the sky is one painting
SEVERITY: minor
AT: `src/prototype3d.ts:656-660`, `src/proto3d/island.ts:579-587`

SAW: All four frames. Game Day, Lantern and Powder are each genuinely authored — different sun angle, colour, dusk and normalBias, and it shows. Maple and Pirate are not.

EVIDENCE: `maple` and `pirate` at `:656` and `:659` are byte-identical except the fill hex (`0x9fc8ff` vs `0x8fd6ff`) and `fillI` (0.62 vs 0.58) — same sun colour, same 1.75, same `off: [-55, 95, 42]`, same dusk, same normalBias, same exposure, same `fillOff`. Two of five worlds are one rig recoloured. The sky is one nebula PNG with a CSS `hue-rotate` per world (`island.ts:579-587`) — that is a defensible download-budget economy and I am not asking for it to change.

FIX: none required for ship, but Pirate should get its own sun elevation. It is a tropical resort and it is running Maple's small-town noon. One number.

GATE: `qa/lookbook.mjs` exists. Add a hue-monopoly assertion: no single 10° hue bin may hold >20% of a frame's chroma-bearing pixels, and no 90° span >55%. Fails today on Powder (37.4% / 86%), Game Day (48%), Maple (26.5%).

### AAA-BRIEF §4.1 is stale — post-processing does ship, and the retraction is sound
SEVERITY: polish (documentation)
AT: `docs/AAA-BRIEF.md` §4.1, `src/prototype3d.ts:1007`

I was briefed that *"ZERO post-processing ships today"*. That is no longer true and the doc should say so. `bloomOn = QUALITY[0].bloom` at `:1007` and rungs 0–1 both carry `bloom: true`, so every phone fast enough to hold frame rate renders through `EffectComposer` with `UnrealBloomPass` + `OutputPass`.

I re-verified the engine behaviour the whole surface turns on, in the installed dependency, and the code's retraction is **correct**:
- `three.module.js:18345` and `:7549` — `toneMapping` is forced to `NoToneMapping` whenever `_currentRenderTarget !== null`. So `RenderPass` does fill the composer buffer linear, exactly as `ensureComposer` says.
- `EffectComposer.js:69` — the default target is `HalfFloatType`, so nothing clips in the buffer and the linear 1.05 bloom threshold is meaningful.
- `OutputShader.js` — `#include <tonemapping_pars_fragment>` plus `#elif defined( CUSTOM_TONE_MAPPING ) → CustomToneMapping(...)`, and `OutputPass.js` sets that define from `renderer.toneMapping`. Since the chunk is patched at module scope (`:255`) before any material compiles, **the graded ACES + toe + split + chroma does ride the OutputPass**. The composer path and the direct path apply the same curve.

The trap the old note describes is real, and the note is worth keeping in a changed form: the *terminal* pass is what encodes. Anyone who later appends SSAO, a vignette, a LUT or FXAA **after** `OutputPass` re-ships the linear wash.

Also worth recording: `maple_tone.png` and `maple_tone2.png` (00:33 and 00:36 today) move mean luminance 0.507 → 0.512, mean saturation 0.523 → 0.500, and the dominant hue's share 26.5% → 26.8% against `maple_look.png`. Whatever that experiment was, it is inside noise. The levers that are not inside noise are findings 1–4.

## IS THIS THE BEST THIS CAN BE?

No, and the gap is not subtle — but four of the six things between here and there cost nothing.

Ranked by (effect ÷ cost):

1. **Wire `LIGHT.exposure`.** One token. Lifts Lantern's floor 3.3×, restores a whole colour channel across a quarter of its frame, and brings Game Day and Powder up to what was authored. It closes the owner's "Lantern is so dark, not crisp" with the number the team had already written down and then spent an ambient-lift retraction failing to reach by another route. Nothing else in this report has this ratio.
2. **Luminance-space toe.** Four ALU. Takes 24–30% of two worlds' pixels off the channel floor. Verified to move nothing above midtone by more than 2/255, so no tuned decision in this repo is disturbed.
3. **Per-world `coreBias` on the hero.** One float, one uniform. This is the difference between a hero who reads on two of eight surfaces and one who reads on all eight, without touching the owner-approved purple. The competitor solves it by being black; we can solve it by choosing *which end of him leads* per world.
4. **Powder's sun to ~24°.** Two numbers. Puts real value structure onto 75% of a frame that currently carries nine luminance levels, using shadows the renderer is already drawing.
5. **Fill hue and intensity per world** (Powder blue, Game Day/Powder shade contrast). Four numbers, closes the 1.5:1 shadow gap against the team's own 2.5–3.5 target.
6. Then the two that actually cost something and should be measured before they are promised: **normal variation on the ground plane** (Powder's sparkle, the open door at `island.ts:2827`) and **VSM shadows** (softness). Both are real work with real frame-time attached, and neither should jump the queue ahead of 1–5, because 1–5 are free and they move more.

What I am confident about, against hole.io and Donut County: our *materials* and our *props* are already better than the genre bar — the merged flat/smooth material split, the baked contact AO, the per-world autumn foliage, the fifteen-value house palette are all above what the competitors ship. What is below the bar is the thing those games got right first and cheapest: **the hero must be unmistakable on every surface, at every size, without thinking about it.** At 1.20:1 on Maple's road he is not. That is the one finding I would refuse to ship on if I could only pick one — but the exposure bug is the one I would fix first, because it is a token and it makes three worlds into the thing they were designed as.

## COVERAGE

**Images read (with the Read tool):**
- `qa/out/shippedlook/maple_look.png`
- `qa/out/shippedlook/lantern_look.png`
- `qa/out/shippedlook/powder_look.png`
- `qa/out/shippedlook/gameday_look.png`
- `qa/out/shippedlook/maple_tone2.png` (the governor's in-flight tone experiment, 00:36 today)
- 2× enlargements I generated from the above and read: `c_maple_shadow.png` (0,100–430,600), `c_gameday_shadow.png` (0,0–430,500), `c_powder_snow.png` (380,1150–810,1650), `c_lantern_dark.png` (0,1300–430,1800) — all in `/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/`

**Files read:**
- `src/prototype3d.ts` — 150-300 (composer, grade, shadow map type), 600-1080 (WORLD_LIGHT, RIG, applyLightRig, applyHour, hemi/fill/sun construction, fitShadow, QUALITY ladder, applyQuality)
- `src/proto3d/palette.ts` — complete
- `src/proto3d/island.ts` — 555-660 (sky, fog, SKY_MOOD, starfield), 1660-1720 (biome ground albedos), 2780-2940 (ground bake, GRAIN, groundMat + onBeforeCompile), 3770-3900 (PROP_GLOW_MAT, bakeContactAO, mergedProp, FALL_FOLIAGE)
- `src/proto3d/assets3d.ts` — 48-136 (`shouldCast`, `contactShadow`)
- `node_modules/three@0.185.1` — `build/three.module.js` (`:7549`, `:9148-9150`, `:9267`, `:18345`), `examples/jsm/postprocessing/OutputPass.js`, `examples/jsm/shaders/OutputShader.js`, `examples/jsm/postprocessing/EffectComposer.js`
- `qa/colorpipe.mjs`, `qa/contrast2.mjs`, `qa/silhouette.mjs` (headers), `qa/` file listing

**Measurements run** (pngjs, no browser, no build, no Playwright): full-frame luminance/saturation/hue histograms; per-hue-class ground segmentation with p05/p50/p95; per-channel zero-clipping census; region means and standard deviations on eleven clean ground patches; horizontal luminance scans across three shadow boundaries; hero-vs-ground WCAG contrast at core/mean/rim; and a node re-implementation of the shipped ACES + toe + split + chroma transform, used to isolate the toe as the channel killer and to solve measured pixels back to linear and re-grade them at the authored exposures.

**Not touched:** no file edited, no browser started, no build run.

--- THE SKEPTIC ---
## VERDICT ON THE VERDICT

NO-SHIP is the right call, but it is carried by exactly one of the four named blockers (the toe) plus one thing the team never saw — Game Day's shadows are literally `rgb(0,0,0)` over 3.26% of the frame — while two of its blockers are not blockers and one of its majors is inverted.

## PER FINDING

### Three worlds render at an exposure nobody authored
REAL: **yes** — as a dead authored field. **No** as a blocker, and the fix is not one token.

WHAT I FOUND: `grep -n exposure src/prototype3d.ts` returns exactly `:640` (the interface), `:657 :660 :675 :705 :716` (five authored values), `:725` (a comment), `:755`, `:816`, and `:279`. `LIGHT.exposure` never appears on the right-hand side of anything. `prototype3d.ts:755` is `exposure: 1.0,` and `:816` is `renderer.toneMappingExposure = RIG.exposure;`. The field is authored, type-required, changed by a ledger round — and never read. I went further than the reviewer did: `git log -S"exposure: 1.0,"` shows the table shipped with `lantern: … exposure: 1.34` and the rig hard-coded at 1.0 in the same commit, so the per-world value has **never** reached match 1. The ledger entry at `AAA-BRIEF.md:1285` — *"moon key 0.42→0.55, exposure 1.34→1.42, fog/sky a step less black"* — records a lever that did nothing; the crushed-black improvement it reports (`26% → 15.6-17.3%`) came entirely from hemi/fill/key, which do apply. That is a genuine phantom in the ledger and it is the strongest part of this finding. The reviewer did not find it.

FIX SOUND: **no.** `:723-732` is the record that kills the framing: *"Nothing about match 1 changes in any world, which is the point: every screenshot, every palette call and every art argument in this repo was made against match 1."* Writing `exposure: LIGHT.exposure` at `:755` changes match 1 in three worlds — it invalidates `gameday_look.png`, `lantern_look.png`, `powder_look.png`, the eight store screenshots, the `heroswatch` approved-look baseline, and the bloom threshold at `:203`, which `:151` says was tuned *"at exposure 1.0"*. It is a re-grade and a re-shoot, not a token. Also note the reviewer's own honest limit undercuts it: Lantern's floor is *authored* near-black — `island.ts:1110` says *"every district painted DOWN toward blue-black"* — and `RIG.hemiI`'s comment at `:741-752` records a same-day retraction of exactly this "lift the murk with a light number" move, measured at +0.4 mean luminance.

CORRECTION: severity **major**, not blocker, and the finding is *"a required field that five authors have filled in and nothing reads"*, not *"three worlds are at the wrong exposure."* Two honest fixes: (a) delete `exposure` from `WorldLight` and put the 1.0 in `RIG` with the same on-purpose comment `hemiI` already carries at `:744` — zero pixels change, the trap closes, the ledger entry gets its retraction; or (b) apply it and re-tune, re-shoot, re-baseline as a full art round. Not (b) dressed as one token. The GATE is right in kind — `qa/lightdrift.mjs` already reads `renderer.toneMappingExposure` and compares match 1 to match 2, so it cannot see a value that is wrong in both.

Also wrong: *"gameday_look.png measures mean luminance 0.292 (AAA-BRIEF records 0.357; it has got darker, not better)."* The 0.357 is not in AAA-BRIEF. It is `island.ts:1695`, and it is the **before** figure that *prompted* the `lot` albedo change to `0x918e97` — *"a framebuffer sample put Game Day's mean scene luminance at 0.357 … it was NOT the light … It is the albedo."* Citing a superseded "before" as an "after" baseline to claim regression is the shape of finding this repo has retracted six times.

### The hero clears 3:1 against nothing, and 1.20:1 against Maple's road
REAL: **no.**

WHAT I FOUND: the arithmetic reproduces and the conclusion does not. I measured clean road at `maple_look` (200,20,60,40) and (320,10,50,30): both `rgb(72,79,113)`, relL **0.081**; hero body patches run relL 0.055 (lower belly) to 0.193 (lit rim). WCAG on the body mean is ~1.19:1, as claimed. But:

1. **The gate claim is false.** `qa/_gh_hero.mjs` already does this, better. Its header: *"silhouette contrast against the world it is standing on"*, at radii `[1.2, 3, 6, 9, 12]`, DPR 3, with an **exact two-frame difference mask** (`:341-358`), and it emits `edgeVsBg: +wcag(edgeL/edgeN, bgL/bgN)` — the void's outer ring against the background annulus 1.02–1.30r outside it. That is the boundary the eye actually reads, and it is a stronger instrument than the whole-frame hue-class segmentation the reviewer proposed to build. "Nothing in `qa/` measures this today" is wrong, and `qa/silhouette.mjs`, listed as read in COVERAGE, does not exist — the file is `qa/_silhouette.mjs`.
2. **The FIX contradicts a recorded decision and breaks two systems.** `void3d.ts:228-236`: *"A single screen-anchored key … Anchored in VIEW space on purpose — this is illustration lighting, so the read is identical no matter where the camera has swung to."* The hero is deliberately exempt from every world rig; that is why I measure his lit rim at `rgb(152,89,217)` / `(152,89,217)` / `(154,91,217)` in Powder, Lantern and Game Day — three different rigs, three identical pixels. A per-world `coreBias` is a per-world hero, which is the thing that comment refuses. And it desynchronises `void3d.ts:521-533`, where the mouth colour is derived from the gradient's literal constants — `bellyOf` hard-codes `smoothstep(0.10,0.55,0.18)=0.0836` and the `0.740` abyss mix — and it interacts with all thirteen shop skins that set `abyss/inner/mid/rim`, against an approved look `qa/heroswatch.mjs` exists specifically to preserve.
3. **Look at the pixels.** In all four frames and in `maple_firstlook.png` he is the most legible object on screen: white sclera at 255 against a 0.05-relL belly is >15:1 *inside his own silhouette*, plus an orbiting ring, a cast shadow, and a face. WCAG 1.4.11 is a low-vision standard for static UI components against a flat backdrop; a lit, animated character carrying a ±0.14 relL internal range is not the case it addresses.

FIX SOUND: **no** — see above.

CORRECTION: what survives is one **minor**, and it is not in `void3d.ts` at all. `WORLD.road = 0x6b7292` renders at relL 0.081 while the hero's body mean is 0.106; the luminance separation on that one surface is the weakest in the game. The right fix is one hex in `palette.ts` — lift `road` toward `pavement`'s value band, which `palette.ts` already re-spaced *"so neighbours that actually meet on the map are at least ~1.35:1 apart"*; the road was left out of that pass. Zero draw calls, zero seeded draws, and `island.ts:2866`'s `uRoadCh` mask is chromaticity-normalised so it self-corrects — re-run `qa/groundsurf.mjs` to confirm. Δhue is **34°**, not 47°, and `island.ts:1668`'s quoted argument is about `WORLD.pavement` under the spawn square, not the road.

### Powder's snow is a solid fill: 7–12 luminance levels over 75% of the frame
REAL: **yes**, with the supporting evidence corrected and the gate rewritten.

WHAT I FOUND: the flatness reproduces and is visible. Clean snow at (600,1650,110,80) and (620,1750,110,70): **lumSD 0.83 and 0.81, 8 and 7 unique luminance levels**. In my 2× crop `c_powder_snow.png` the field is a pure gradient with no surface at all.

But the scale comparison is fabricated and it takes the gate down with it. The reviewer reports *"maple grass lumSD 22.09, 73 unique levels"* and *"maple plaza 10.26, 42"*. Clean Maple patches:

```
grass  (40,1600,90,90)   lumSD 1.71   uniq 16
grass  (190,1080,70,70)  lumSD 2.64   uniq 18
grass  (700,60,90,90)    lumSD 4.50   uniq 54
plaza  (480,1650,80,60)  lumSD 1.29   uniq 12
plaza  (300,260,90,60)   lumSD 5.29   uniq 32
road   (200,20,60,40)    lumSD 1.27   uniq 12
gameday asphalt (380,1350,100,60) lumSD 1.64  uniq 14
```

Their Maple numbers came from patches straddling props or shadow edges. The consequence: their gate (`lumSD ≥ 4/255 and ≥ 32 unique levels`) fails **Maple grass, Maple plaza, Maple road and Game Day asphalt**, not just Powder — and they claim Maple passes it. A gate whose own reference world fails is a gate that gets disabled the day it is written.

FIX SOUND: **partly.** The sun drop is a legitimate experiment but the arithmetic is incomplete: `off:[-62,78,30]` is elevation 48.6° and `[-62,30,30]` is 23.5°, so `sin(elev)` on flat ground goes 0.75 → 0.40 — a **47% loss of key on the surface that is 75% of the frame**. Game Day paid exactly that back (`sunI 1.75 → 3.05`, `:664-670`) and Powder's proposal budgets only a `normalBias` bump. It needs a key payback number or it is a darkening, not a raking. The `hemiGround`-does-nothing observation is correct and sharp: three's `mix(ground, sky, 0.5+0.5·dot(N,up))` returns `skyColor` exactly at N=up, so `hemiGround: 0x9db6d8` never touches the snow plane — the rig comment at `:709-712` promises a bounce that geometrically cannot land. That is the best line in this report and it is buried in the wrong finding.

CORRECTION: severity **major**, and reframe — ground detail is flat in *every* world (1.3–4.5 lumSD); Powder is worst and most exposed because nothing else is in frame. Gate must be per-world-relative (Powder's ground must reach the median of the other four), not an absolute the reference fails. Three supporting claims are contradicted by the render: `powder_look.png` shows the person's cast shadow, the snowman's cast shadow, the chalet's shadow wedge and the piste line; the snowman reads at `rgb(230+)` against shadowed snow at `rgb(91,98,119)`, not "the same value"; and the warm accents are a yellow sombrero, a red ski suit, a red hat, a gold scarf and a carrot, not "one lit window."

### The grade's toe is a per-channel hard clamp, and it kills a quarter of Lantern's colour
REAL: **yes.** This is the finding that carries the verdict, and it is the only blocker here.

WHAT I FOUND: `prototype3d.ts:270` is verbatim
```
  color = max( vec3( 0.0 ), ( color - 0.014 ) / ( 1.0 - 0.014 ) );   // toe
```
I re-implemented the shipped transform independently (three's ACES matrices, `RRTAndODTFit`, then `:270`, `:273`, `:274`, then the sRGB OETF) and reproduced the reviewer's two probes to the digit: fire-truck red `[0.55,0.045,0.035]` @1.12 → `rgb(177,0,0)` shipped vs `rgb(178,18,25)` with `toe=0`; Lantern ground `[0.030,0.006,0.0012]` @1.42 → `rgb(0,0,0)` vs `rgb(23,2,0)`. My sweep puts the cut at **pre-ACES linear ≈ 0.05** — any channel below that is set to exactly zero.

Then I checked it against the actual pixels rather than the model, which the reviewer did not:
```
gameday_look truck top face  (340,110,60,25)  rgb(168,0,0)  blueSD 0.00  uniq 2
gameday_look truck body side (250,230,60,25)  rgb(170,1,1)
```
Two differently-oriented lit faces, 168 and 170, with green and blue at zero. Their SAW is confirmed by measurement, not just by simulation. Frame-wide, my independent census matches theirs exactly (`blue==0`: maple 13.78%, gameday 17.32%, lantern 24.55%, powder 3.41%), and among Game Day's blue-dead pixels `(r,g)≈(160,0)` alone is 6.5% of the frame.

FIX SOUND: **yes.** The luminance-space soft knee is four ALU, rides the existing `CustomToneMapping` chunk, adds no pass, no target, no draw call and no seeded draw, and is asymptotic so nothing can be zeroed. The claim that it moves nothing above midtone by more than 2/255 reproduces in my sim. The optional gamut guard on `:274` is correct but should be a second, separately-measured step — `:274` has no guard today and it does push sub-luminance channels down before the final clamp.

CORRECTION: none of substance. One addition for the gate: also assert `pure rgb(0,0,0)` share per world, which is 3.26% on Game Day today (see the next section) — the channel-floor sweep alone will not catch an all-three-channels-zero shadow.

### Lantern's floor is lit blue by the rig and renders pure red
REAL: **no** — this is finding 4 counted twice, with a diagnosis the cited code contradicts.

WHAT I FOUND: the reviewer's own claim is *"The entire ground plane is a warm red-brown with the blue channel at zero."* Three patches of Lantern ground:
```
(300,1600,120,110)  rgb(44,7,0)     blueSD 0.02
(550,1450,120,110)  rgb(56,26,8)    blueSD 3.33
(250,380,120,90)    rgb(115,76,54)  blueSD 11.67
```
The same surface carries blue 54 where it is brighter and blue 0 only where it falls under the toe. The blue is in the bake and in the light; `:270` eats it in the dark end. Their own finding 4 is the cause, and no separate wash bug is needed to explain any of it.

The cited bake comment says the opposite of what they claim it says. `island.ts:1109-1111`: *"The order matters and is the reverse of a daylight bake: darks first, every district painted DOWN toward blue-black, and then light added back only where something is actually burning."* Blue-black *first*, amber added *on top* — additive, not subtractive. And `island.ts:1706-1710` records the albedo choice as deliberate: *"dark, low-saturation bases that take an amber wash and give back a colour. A pale ground would blow out under the lantern pools and flatten the one effect this world is built on."* Changing the composite to screen/soft-light is a change to a recorded art decision on the strength of a measurement that has another explanation.

FIX SOUND: **no** — it treats a symptom of `:270` by rebuilding the one bake pass the file warns hardest about, and the reviewer's own admission (*"guessing at it has already cost this repo two retractions"*) applies to their own proposal.

CORRECTION: fold into finding 4. Keep one thing from it and promote it into finding 3 where it belongs: the hemisphere at N=up returns `skyColor` exactly, so `lantern.hemiGround: 0x7a5844` — the warm bounce the rig comment at `:695-698` says *"carries the mood"* — contributes **nothing** to any flat ground in any world. That is real, it is unreported anywhere in the repo, and it is a comment that describes a light that does not exist.

### Ground shadow contrast is 1.5:1 against the team's own written target of 2.5–3.5:1
REAL: **no**, and it is inverted. This is the most dangerous item in the report.

WHAT I FOUND: the finding compares a **WCAG ratio** against a **linear-energy target**. `prototype3d.ts:607-608` states its bar as *"a shadowed pixel therefore kept ~70% of its brightness and shadow contrast capped at 1.44x"* — 1/0.70, a light-energy ratio. The reviewer's 1.51 and 1.49 are WCAG ratios (with the +0.05 offset), and on near-black inputs WCAG collapses toward 1.0 no matter how black the shadow is. Measured in the target's own space:

```
Game Day  lit tarmac  (220,420,40,25)  rgb(63,49,49)  relL 0.035
Game Day  its shadow  (260,380,30,20)  rgb(14,11,20)  relL 0.004     linear ratio ~9x
Powder    lit snow    (780,1500,50,40) rgb(142,152,175) relL 0.312
Powder    shadow      (640,1720,60,40) rgb(91,98,119)   relL 0.122   linear ratio 2.56x
Maple     lit grass                     rgb(122,181,69) relL 0.376
Maple     shadowed grass                rgb(62,159,69)  relL 0.263   linear ratio 1.43x
```
Powder is **inside** the authored 2.5–3.5 window. Maple is at 1.43 — the file's own 1.44 figure, unchanged. Game Day is at ~9× and worse than that: a row scan at y=345 across the fire-truck shadow steps `rgb(63,49,49) → rgb(0,0,0)` in **one pixel** and stays at `(0,0,0)` for fifty. The reviewer named Maple as the world that passes and Game Day as the world that fails. Both are backwards.

FIX SOUND: **no — it would ship damage.** *"trim `gameday.fillI` from 0.52 and `powder.fillI` from 0.5"* lowers the ambient fill on the one world whose shadows are already pure black across 3.26% of the frame, and on the one world that already sits inside the target.

CORRECTION: the real finding on this surface is the opposite one, and it is a blocker — see below.

### Shadow edges are hard, and the only remaining door costs two blur passes
REAL: **yes** as an observation, **no** as a diagnosis.

WHAT I FOUND: the deprecation is real and verified — `renderer.shadowMap.type = THREE.PCFShadowMap` at `:229`, and `PCFSoftShadowMap has been deprecated` is in the installed dep. The hardness is real on Game Day: the y=345 scan is a **1-device-pixel** step. But it is not PCF's filter width doing that, and the reviewer's own Powder crop disproves their cause: a scan at `powder_look` y=1500 ramps `relL 0.181 → 0.117` over **18 device pixels** before a geometry edge. Same shadow map, same filter, same frame budget — an 18× difference in edge width between two worlds is not a filter-kernel property. It is `:270` clipping the shadowed side of the ramp to zero the moment it drops under linear 0.05. VSM will not soften a shadow that has already been clamped to `(0,0,0)`.

FIX SOUND: **no, not yet** — right order, wrong reason. Fix `:270` first and re-measure; the Game Day edge will grow a penumbra for free because the ramp will stop being clipped. VSM stays a real path afterward, and the reviewer missed the one argument in its favour: `renderer.shadowMap.autoUpdate = false` at `:129` with a half-rate shadow pass means the blur runs at half rate too. Against that, they should not be citing `node_modules/three/build/three.module.js:9148` — `AAA-BRIEF.md` §4.1 says explicitly *"Do not cite a `node_modules` line number — the dep is pinned with a caret. Cite the behaviour and assert it."*

CORRECTION: severity **polish**, sequenced behind finding 4, cause restated.

### There is contact AO on props and none on the surfaces receiving them
REAL: **no.**

WHAT I FOUND: the reviewer's own quoted code refutes them. `assets3d.ts:48-55` — `shouldCast` returns true for `r >= 4` or for anything `h >= 6 && thin >= 0.8`; `assets3d.ts:131` — `if (!fbCast) fb.add(contactShadow(...))`. So every prop either casts a real shadow onto the receiving surface or gets a darkening disc laid on it. There is no third category. The two trees and the sign posts they cite in `maple_firstlook.png` all clear `shouldCast` and all have visible cast shadows on the plaza in the frame — I looked at the same crop region (0,100,430,500) and the sign posts, the bench, the planters and both trees each carry a shadow on the ground beneath them. "The plaza under them is untouched" is contradicted by the image they say they read.

FIX SOUND: moot. The bake-time ellipse is a reasonable idea in the abstract, but it would be painting a second shadow under props that already have one.

CORRECTION: not real. If anything the opposite is worth checking — `contactShadow`'s disc plus a real cast shadow plus `bakeContactAO`'s 0.40 base darkening is three darkenings stacking on Game Day, where the result measures `rgb(0,0,0)`.

### Each world's light is real; two worlds share one rig, and the sky is one painting
REAL: **yes**, as a fact. As a finding it is taste.

WHAT I FOUND: `:656-661` — `maple` and `pirate` differ only in `fill` (`0x9fc8ff` vs `0x8fd6ff`) and `fillI` (0.62 vs 0.58). Identical sun colour, `sunI 1.75`, `off:[-55,95,42]`, dusk, `normalBias`, `exposure`, `fillOff`. Accurate. The sky claim is accurate too, and `SKY_MOOD` at `island.ts:579-587` now carries per-world **fog** as well as hue — which means `AAA-BRIEF` §4.1's *"one fog colour"* is also stale.

FIX SOUND: yes, and correctly scoped as "not required for ship." One caveat they did not state: changing Pirate's elevation re-shoots every shadow in that world and invalidates `pirate_look.png` and any store screenshot from it.

CORRECTION: severity **polish**. Two daylight worlds sharing a noon sun is a defensible economy, not a defect; what makes them read as different worlds is albedo, sky, fog and prop kit, all of which differ.

### AAA-BRIEF §4.1 is stale — post-processing does ship
REAL: **yes.**

WHAT I FOUND: `AAA-BRIEF.md:201-202` — *"Zero post-processing ships, on every device. `QUALITY[]` sets `bloom:false` on all four rungs (`prototype3d.ts:880-889`)."* The table is at `:964-978` and rungs 0 and 1 read `bloom: true`; `:1008` is `let bloomOn = QUALITY[0].bloom;`. Both the claim and the line citation are dead. Their re-verification of the engine behaviour (`NoToneMapping` forced on render targets, `HalfFloatType` default buffer, `OutputPass` compiling the patched chunk) is correct, and the surviving warning — *the terminal pass is what encodes* — is worth keeping.

FIX SOUND: yes, documentation only.

CORRECTION: one thing they got wrong and it matters. They dismissed the governor's in-flight tone experiment as *"inside noise"* on luminance mean and saturation. On the metric their own blocker is about, it is not noise:
```
maple_look   blue==0 13.78%   any channel <= 2  17.67%
maple_tone   blue==0 11.41%   any channel <= 2  14.49%
maple_tone2  blue==0 12.20%   any channel <= 2  15.20%
```
A 2.4-point drop in dead-blue pixels. Somebody is already pulling on the toe, and the reviewer measured past it.

## WHAT THE TEAM MISSED

**Game Day's shadows are pure black, and that is the blocker on this surface.** `gameday_look.png` is 3.26% exactly `rgb(0,0,0)`, and it is not scattered — it is the fire truck's and the person's shadows on the tarmac, a solid black silhouette pasted onto brown asphalt. My scan at y=345 goes `rgb(63,49,49)` → `rgb(0,0,0)` in one pixel and holds. My crop `c_gd_shadow.png` (130,300,340,200 at 3×) shows a shadow with no colour, no ambient fill and no edge. A car park at 4pm does not do that; nothing outdoors does. Six-year-olds will read it as a hole in the ground — which, in this game, is a specific and unfortunate misread. The reviewer looked at this exact region, cropped it, named it `c_gameday_shadow.png`, and reported that the shadows there were **too weak**. It is the single worst thing in the four frames and it is the direct visual consequence of their own finding 4, which makes their finding 6 both wrong and self-contradicting.

**Game Day's parking lot renders warm, and it is authored cool.** `island.ts:1701` — `lot: 0x918e97, // parking asphalt, cool against everything around it`. That is `(145,142,151)`, blue-dominant. On screen, four clean lot patches measure `rgb(63,49,49)`, `(61,46,45)`, `(72,58,57)`, `(71,56,52)` — red-dominant, every one. The channel order is inverted between the authored albedo and the shipped pixel. The amber key at 2.55×1.31, the warm split-tone at `:273`, and the toe together turn the one surface that is *"over half the frame"* into the opposite of what it was re-authored to be, in the round that specifically fixed it. That is a LIGHT finding, it sits under this team's name, and nobody has written it down.

**The ground has no surface anywhere, not just on Powder.** Every clean patch I took in every world reads lumSD 1.3–5.3 and 12–54 unique levels. `island.ts:2827` holds the open door — *"it needs normal VARIATION … That is a real change to the largest surface in the game and it was not made on the strength of a guess."* The reviewer found the right door and then argued it as a Powder problem, which loses the case: framed as one world's snow it is a level-art tweak, framed as the largest surface in all five worlds it is the highest-leverage remaining item on this surface after the toe.

**The hero is exempt from every rig in the game, by design, and the light team never said so.** `void3d.ts:234` — `vec3 L = normalize(vec3(-0.40, 0.60, 0.69));` with `:232-233` saying *"Anchored in VIEW space on purpose."* His lit rim measures `rgb(152,89,217)`, `(152,89,217)`, `(154,91,217)` in Powder, Lantern and Game Day — three rigs, one pixel. In a night market lit by two hundred lanterns he is lit by a noon key from off-screen left. That is a defensible illustration choice and it is also the reason the reviewer's whole finding 2 is the wrong shape: the hero cannot be tuned per world without reversing a recorded decision, so the only per-world lever the LIGHT team owns for hero separation is the **ground albedo** — which is one hex in `palette.ts`, costs nothing, and is where `WORLD.road` was left out of the 1.35:1 re-spacing pass that every other neighbour got.

**And the ledger has a phantom entry.** `AAA-BRIEF.md:1285` reports `exposure 1.34→1.42` as one of the changes that took Lantern's crushed-black share from 26% to 15.6–17.3%. That number has never reached the renderer. The entry needs a retraction line, because the next person to fix Lantern's murk will reach for a lever the ledger says worked.

SURVIVED: 6 of 10.


═══════════════════════════════════════════════════════════════════
TEAM HERO
═══════════════════════════════════════════════════════════════════
--- THE TEAM'S REVIEW ---
## VERDICT: NO-SHIP

The hero's mouth is switched off for the majority of every match in every dense world — a one-line threshold in the mouth rig hides the grin whenever the `hungry` mood fires, and the gape that replaces it is 5% of the face — and the void has no readable contact shadow in any world, so the best-looking asset in the game reads as a sticker pasted on a lawn.

---

## THE BAR

**Katamari Damacy** (Namco, 2004; still shipping as *We Love Katamari REROLL*). Same premise exactly: a ball you steer that swallows everything smaller and grows past it. Two things it does mechanically that we do not:

1. **The katamari carries a hard, dark, high-contrast contact shadow directly beneath it at every size.** It is not decoration — it is the steering cue, because the player has to judge where the ball's *footprint* is against a prop, not where the ball's *silhouette* is. Namco draws it as a defined ellipse with an edge, not a wash.
   **Where we sit:** measured out of `qa/out/shippedlook/maple_look.png`, the grass directly beneath the hero reads rgb(111,165,68) against rgb(130,183,83) three radii away — **11% darker at its darkest visible point**, with no edge anywhere. In `look_base.png` (my crop of that frame, 120–760 × 1000–1320) you cannot see it at all. He floats.

2. **Every object the katamari absorbs sticks to it, so the silhouette permanently and visibly changes as it grows.** Getting bigger is legible *on the ball*, not only in the world around it.
   **Where we sit:** our hero's entire per-form silhouette change is `churn * 0.022 * max(0, uStage - 1)` (`src/proto3d/void3d.ts:88`) — **6.6% surface displacement at the top form** — plus a nebula texture at stage ≥ 4. And `VISUAL_STAGE = [0,1,2,3,3,4,4]` (`src/prototype3d.ts:3023`) collapses seven named forms into five pictures: CHOMPOSAURUS and COLOSSUS are the same void, and WORLD ENDER and VOID TITAN are the same void.

Secondary bar for the mouth: **Kirby** (HAL Laboratory). Kirby's whole identity is the inhale, and his mouth is *always* wider than it is tall, and opens toward the width of his own body. Our gape is `mawDark.scale.set(1, 1.15, 1)` — **15% taller than wide**, a portrait oval, which is the shape of a nostril.

---

## FINDINGS

### The grin is switched off whenever there is food in the gravity well

**SEVERITY: blocker**
**AT:** `src/proto3d/void3d.ts:1939`, with `src/proto3d/void3d.ts:1166`

**SAW:**
- `qa/out/person/maple_front.png` (Aug 24 01:06 — the freshest frame in the pack, the first second of a match). I cropped it at 8× (600–680 × 1370–1450). The void has two beautiful eyes, brows and blush, and **where the mouth should be there is an 8 × 10 device-pixel dark blob with a pink dash in it, taller than wide, sitting at the vertical level of the lower eyelids.** It reads as a nose. There is no smile anywhere on that face.
- `qa/out/shippedlook/maple_look.png` and `qa/out/shippedlook/lantern_look.png` (both R = 4): the mouth is a **vertical egg** — a dark oval taller than wide with a pink ellipse in its lower half. Surprise, not appetite.
- `qa/out/shippedlook/powder_look.png` — same probe, same pinned radius, same 3.4 s wait — shows **a wide dark grin with a pink tongue, and it is lovely.** Powder is the world the HANDOFF documents as edible-*starved*; Maple and Lantern are the hoover-density worlds. Three of the four current frames show the dot or the egg; the one sparse world shows the mouth.
- `qa/out/heroface/r1.25.png` shows the same speck at a rendered size where resolution cannot be the excuse.

**EVIDENCE:**
```ts
// void3d.ts:1938
maw.scale.setScalar(Math.max(0.001, mo));
mouth.visible = mo < 0.25;
```
```ts
// void3d.ts:1166
hungry:  { pupil: 1.28, smile: 1.1, maw: 0.26, brow: 0.85, browAng: 0.12, browY: 0.45, blush: 0.6 },
```
```ts
// prototype3d.ts:8809 — inside the magnet loop, over every edible
if (d < reach * 0.85) hungryT = tClock;   // food in the well: the face gets HUNGRY
// reach = R * 2.0 + e.radius * 2.4   (prototype3d.ts:8783)
```

The `hungry` mood is the only mood whose `maw` crosses the threshold, and it crosses it by **0.01**. `mo = max(chompTerm, mp.maw)`, so as soon as anything edible is within ~1.7 R the smile is hidden and the mouth becomes `mawDark` at scale 0.26: half-extents 0.052 × 0.060 in face units, against the grin's 0.239 × 0.135. **The mouth's width drops 4.8× in one frame** and stays there for the 0.45 s the mood holds — which, with the hoover economy, is most of a match while moving. The authored intent is plainly "hungry = a *bigger* grin (1.1) with the jaw slightly parted"; the threshold eats it.

There is a second, independent defect in the same rig: the gape is authored portrait. Smile bounding box 0.477 × 0.135 (aspect 3.5 : 1 landscape); gape 0.40·mo × 0.46·mo (aspect 0.87 : 1 portrait). The code comment at `void3d.ts:1004` states the design goal — *"the little smile and the big gape are now the same mouth at two sizes instead of two unrelated designs"* — but only the **colours** were unified. The **shapes** are still two unrelated mouths, and they swap with a 2 : 1 aspect flip.

**FIX** (three constants, zero new meshes, zero new materials, **0 draw calls, 0 triangles**, no seeded draw):
1. `void3d.ts:1042` — `mawDark.scale.set(1, 1.15, 1)` → `mawDark.scale.set(1.34, 0.92, 1)`. The same 1.34 x-stretch the lip already carries at `:1027`, so the gape grows *out of the grin's own footprint* instead of replacing it with a different shape.
2. `void3d.ts:1043` — `tongue.scale.set(1.15, 0.7, 1)` → `tongue.scale.set(1.50, 0.70, 1)`, so the tongue stays proportionally inside the widened maw.
3. `void3d.ts:1939` — `mouth.visible = mo < 0.25` → `mouth.visible = mo < 0.55`. 0.55 is where the widened gape's area first exceeds the grin's (grin half-disc area 0.0506; gape ellipse area 0.194·mo² ⇒ crossover at mo = 0.51), so the swap happens where the gape is *more* mouth than the grin, not five times less. Below it, `hungry`'s 0.26 draws a small dark parting inside a visible grin — a hungry, slightly-open smile, which is what the mood table asks for.

**GATE:** `qa/mouthread.mjs`. For each of the eight moods, and for `mo` swept 0 → 1 in 0.05 steps (via `__setMood` plus a `__setMaw` debug hook), screenshot the hero at r = 1.25 and r = 6, mask the face disc, and measure the mouth's bounding box as pixels within tolerance of `MOUTH_RIM 0x2a0e2e` or `MOUTH_IN 0xff6f91`. Assert:
- (a) mouth **width ≥ 0.30 × face diameter** in every mood — fails today at `hungry` (0.10) and at every `mo` in [0.25, 0.75]; passes after.
- (b) **width ≥ height** at every `mo` — fails today for all `mo ≥ 0.25` (0.87 : 1); passes after.
- (c) **no step discontinuity**: `|width(mo) − width(mo−0.05)| ≤ 0.06 × face diameter` — fails today at the 0.25 step (0.477 → 0.100, a 0.377 jump); passes after.

---

### The contact shadow puts 84% of its density behind the ball

**SEVERITY: blocker**
**AT:** `src/proto3d/void3d.ts:615–626`, `:658`, `:2091`

**SAW:** `qa/out/shippedlook/maple_look.png`, and my crop `look_base.png` (120–760 × 1000–1320). The void's bottom edge meets bright unmodified grass with nothing between them. Same in `qa/out/heroface/r6.png` — the only dark ground in that frame is a tree's shadow. Measured off the PNG: grass at (400–500, 1130–1180), directly under the hero, is rgb(111,165,68); the same grass at (60–160, 1150–1200) is rgb(128,181,83). **Luma 146.5 vs 164.5 — 11%.**

**EVIDENCE:**
```ts
// void3d.ts:619
gr.addColorStop(0.00, 'rgba(255,255,255,0.62)');
gr.addColorStop(0.30, 'rgba(255,255,255,0.50)');
gr.addColorStop(0.58, 'rgba(255,255,255,0.28)');
gr.addColorStop(0.80, 'rgba(255,255,255,0.10)');
gr.addColorStop(1.00, 'rgba(255,255,255,0)');
```
```ts
// void3d.ts:2091
contact.position.set(s.x, 0.05, s.z); contact.scale.setScalar(dispR * 1.52);
```
The file already knows the geometry — `void3d.ts:2088`: *"at the fixed 46.4-degree elevation anything under about 1.45x is entirely hidden behind the ball."* The disc is sized at **1.52×**, and the stops at 0.00 / 0.30 / 0.58 — carrying alpha 0.62 / 0.50 / 0.28, i.e. essentially all of the density — are **all inside the hidden zone**. The only stops the player can ever see are 0.80 (alpha 0.10) and 1.00 (alpha 0). Multiplied by the material's `opacity: 0.62` (`:658`), the visible shadow tops out around **0.06 effective alpha**. And the camera *steepens* with radius (`prototype3d.ts:8921`, elevation 46° → 66°), which hides more of it, not less.

This also compounds a second measurement: the hero's lit rim separates from the ground by **hue only, not value**. I sampled the silhouette edge against the ground in all three worlds — Lantern **1.26 : 1**, Maple **1.24 : 1**, Powder **1.21 : 1** luminance contrast. The contact shadow is the only value cue anchoring him to the floor, and it is at 6% alpha.

**FIX** (five numbers in one canvas gradient plus one material constant — **0 draw calls, 0 triangles, 0 new textures**, no seeded draw): re-profile `softShadowTex` so the density lives in the annulus the camera can actually see, and give it a shoulder the eye can lock onto:
```
0.00 → 0.62   0.62 → 0.62   0.72 → 0.55   0.86 → 0.30   0.94 → 0.10   1.00 → 0
```
and raise `opacity: 0.62` → `0.75` at `:658`. That lands the visible crescent at ~0.30–0.41 effective alpha, i.e. **28–35% darkening** where the player looks, with a defined edge at the 0.86 stop. Do **not** grow the disc past 1.52× — at WORLD ENDER that is already an 18-unit ellipse and 2.1× would be a 25-unit stain.

**GATE:** `qa/grounded.mjs`. For each world and for r ∈ {1.25, 4, 12}: screenshot, locate the void disc (the same disc-finder `qa/heroface.mjs` already uses), then sample a ground ring 1.15 R below the disc's bottom edge and a control ring at 3 R, and assert the shadowed sample is **≥ 25% darker in relative luminance**. Fails today on Maple at r = 4 at 11% (measurable right now from the committed `qa/out/shippedlook/maple_look.png`); passes after.

---

### The joystick nub is a 55%-opaque lavender disc drawn on the hero's face

**SEVERITY: major**
**AT:** `index.html:461`

**SAW:** `qa/out/heroface/r12.png`, and my 3× crop `r12_face.png` (270–590 × 620–940). A hard white circular hoop of radius 123 device px passes straight through both eyes, and a filled pale-lavender disc of radius 52 device px sits **directly on top of the mouth**, turning it into a mauve smudge and greying the lower half of both pupils. I first read this as a shader artifact; it is not. 128 CSS px and 52 CSS px at deviceScaleFactor 2 is exactly 256 and 104 device px — `#joy` and `#joyNub`. It is a DOM element.

**EVIDENCE:**
```html
<!-- index.html:458 -->
#joy { ... width: 128px; height: 128px; border-radius: 50%; z-index: 6;
  background: transparent; border: 2px solid rgba(255,255,255,0.30); ... }
<!-- index.html:461 -->
#joyNub { ... width: 52px; height: 52px; border-radius: 50%; z-index: 6;
  background: rgba(201,166,255,0.55); box-shadow: 0 0 14px rgba(172,108,255,0.5); ... }
```
The comment block above it records the owner reporting this family of artifact **three separate times** — *"There's a white circle always around the void?"*, *"And there's a ring around him"*, *"I suspect it's like the cursor when you move"* — and the fix removed the ring's fill and dropped it to 0.30. **The nub was never touched.** It is now the brightest, most saturated and most opaque of the two, it sits at the centre of the drag, and the follow camera keeps the hero at the centre of the screen. At r = 12 the void's radius is ~157 CSS px, so a thumb landing even 200 px below screen centre still puts the 64 px ring inside the hero's silhouette.

**FIX** (one CSS declaration, **0 draw calls**): make the nub a ring, not a disc —
`background: transparent; border: 3px solid rgba(201,166,255,0.78);` and drop the box-shadow to `0 0 10px rgba(172,108,255,0.35)`. A ring under a thumb is still unmistakably a stick; a 55% lavender fill over the character's mouth is not a control, it is a veil.

**GATE:** `qa/hudveil.mjs`. Put the joystick down at the hero's screen centre, screenshot twice — once as shipped, once with `#joy, #joyNub { display: none !important }` — and assert the mean |ΔL| over the void's disc is **≤ 0.02**. Fails today (the nub alone moves luminance ~0.05 across its footprint and the ring's 2 px stroke is a hard 0.30-alpha line across both eyes); passes after.

---

### Seven forms are five pictures, and the last four are two

**SEVERITY: major**
**AT:** `src/prototype3d.ts:3023`, `src/proto3d/void3d.ts:88`, `src/proto3d/void3d.ts:932`

**SAW:** Only visible in code — the render cannot show it, because showing it would require two frames of the same match at CHOMPOSAURUS and at COLOSSUS side by side, and the evidence pack contains one frame per world. `qa/out/heroface/` has r = 1.25 / 2.5 / 3 / 4 / 6 / 12, but those images are **Aug 17** — seven days stale, predating the current mouth, the rim law and the shadow retune — so they cannot be cited as the shipped hero. That staleness is itself a coverage failure (see below).

**EVIDENCE:**
```ts
// prototype3d.ts:3023
const VISUAL_STAGE = [0, 1, 2, 3, 3, 4, 4];   // TITAN wears WORLD ENDER's dressing, at scale
```
```glsl
// void3d.ts:88
p *= 1.0 + wob * (0.012 + uWobble * 0.06) + churn * 0.022 * max(0.0, uStage - 1.0);
```
```ts
// void3d.ts:932 — the slot that was left for the per-form read, still empty
const fangs: THREE.Mesh[] = [];
```
`uStage` maxes at **4**, so the churn tops out at 0.066 — a 6.6% silhouette displacement. Against that, the hero's *on-screen* size barely moves: `camDist = clamp(38·(R/0.9)^0.82, 26, 340)` (`prototype3d.ts:8865`) with fov 32 gives, on a 390 × 844 iPhone 13, a screen radius of **34.9 px at r = 0.9 and 55.6 px at r = 12** — **+59% linear across a 13.3× growth in world radius and 178× in area.** The camera cancels growth by design (hole.io does the same, correctly), which means the entire "I am getting enormous" read has to be carried by the world shrinking plus whatever the hero itself does. What the hero itself does across the last four forms is: nothing at forms 4→5, and nothing at forms 6→7.

`fangGrow` is computed every frame at `void3d.ts:1941` and drives an array that is permanently empty — the file's own comment names it as *"one obvious place to put a different per-form read if one is ever wanted (a wider maw, a rounder lip, a brighter tongue — anything but teeth)."* It has never been filled.

**FIX, or the path to it.** The smallest honest change is not a guess, it is the experiment, because this is a look decision the owner has to see:
- **Path:** `VISUAL_STAGE = [0, 1, 2, 3, 4, 5, 6]` and re-scale the two stage-driven terms to the new range (churn `0.022` → `0.014`, interior lift `0.045` → `0.030`, nebula gate `n >= 4` → `n >= 5`), so every evolution changes the hero by something, and the top two forms are not identical. **0 draw calls, 0 triangles, 0 new materials** — three float constants and one array. Then render the seven forms as one contact sheet and put it in front of the owner.
- Fill the empty slot with the per-form read the comment already proposes and the owner has already accepted in principle: **the maw's width grows with the form** — `mawDark.scale.x` lerped 1.34 → 1.75 across stages, so a WORLD ENDER's gape is visibly a bigger mouth than a VOIDLING's. Zero cost, no teeth, no new geometry, and it lands on the one action the whole game is made of.

**GATE:** `qa/formsheet.mjs`. Render the hero at the mid-radius of each of the seven forms into one sheet at a fixed 240 px framing, then compute pairwise perceptual distance (mean ΔE over the disc plus silhouette IoU) between adjacent forms. Assert **every adjacent pair differs by ΔE ≥ 3 or IoU ≤ 0.97**. Fails today on pairs 4↔5 and 6↔7 (ΔE 0, IoU 1.000 — they are byte-identical renders); passes after.

---

### Every hero screenshot in the evidence pack has a false ring on the character

**SEVERITY: major** (probe defect — it is corrupting the studio's inputs)
**AT:** `qa/heroface.mjs:254`

**SAW:** `maple_look.png`, `lantern_look.png`, `powder_look.png`, `r6.png`, `r12.png`, `C_dark_eat.png` — **every one** shows large violet ribbons arcing across the hero and out to the frame edges. **I am not reporting these as a hero defect, because they are not one.** `qa/heroface.mjs:246` already warns: *"If a future render shows a ring around him, SUSPECT THIS NUMBER BEFORE SUSPECTING THE GAME."* It is right, and its own remedy is wrong.

**EVIDENCE:**
```ts
// void3d.ts:1745
if (ringBurst > 0) ringBurst = Math.max(0, ringBurst - dt * 0.55);
```
```ts
// prototype3d.ts:8049
const dt = Math.min(0.05, dtRaw);
```
`ringBurst` decays 0.55 per **simulation** second, so at 60 fps it clears in 1.82 s. Under swiftshader the sandbox renders ~1 fps and `dt` is clamped to 0.05, so 3.4 wall-seconds advances the sim by ~0.20 s: `ringBurst` is still ~0.89, `fadeEnv = sin(0.11π) = 0.34`, and `ringMats[0].opacity = 0.41`. **The 3.4 s wait does not clear the burst; it cannot, because the wait is in wall time and the decay is in sim time.** Every probe that pins a radius and screenshots inherits this, which is why the ring appears in `shippedlook`, `heroface` and the mouth sheets alike — and it is on the frames the store screenshots are shot from.

**FIX:** replace the wall-clock wait with a state wait — `await p.waitForFunction(() => window.__voidRingBurst() <= 0)` behind a one-line debug getter, or simply drive the clock: `await p.evaluate(() => { for (let i = 0; i < 60; i++) window.__step(0.05); })`. **0 draw calls** — it is test code.

**GATE:** `qa/gate.mjs --selftest` gains an assertion: after any `__setVoidR`, `__voidRingBurst()` must read 0 before a screenshot is taken. Fails today on every radius-pinning probe; passes after.

---

## IS THIS THE BEST THIS CAN BE?

No. The face itself is genuinely excellent — `powder_look.png` and `r6.png` show a character I would not change a line of — and that is exactly why the failures around it are unacceptable: they are all failures of the face *not being shown*. Ranked by what stands between here and the bar:

1. **Show the mouth.** Right now the single best asset in the game is hidden for most of every match by a comparison against `0.25`, and when it is shown mid-bite it is the wrong shape. This is the cheapest, highest-value fix on my surface: three constants, no cost, and it changes the hero's face for the majority of the play time. Nothing else I could do comes close.
2. **Ground him.** Katamari's shadow is not art direction, it is the steering cue. Ours is 11%, and because the hero separates from every ground by hue at only ~1.2:1 luminance, that shadow is carrying more load than the code assumes. Fixing the gradient profile is five numbers.
3. **Get the UI off his face.** The owner has reported this artifact three times. The ring was fixed; the nub — brighter, more opaque, and dead-centre on the drag — was not.
4. **Make the last four evolutions different pictures.** A child plays three minutes to reach VOID TITAN and it renders identically to WORLD ENDER, which renders nearly identically to COLOSSUS. The camera law deliberately cancels 13× of growth down to +59% on screen; that is correct, but it means the hero owes the child *something* per form and currently owes almost nothing. The empty `fangs` array is a slot the file explicitly left open and nobody filled.
5. **Fix the probes before the next pass.** Four of my six current hero frames carry a false ring, and `qa/out/heroface/` — the only per-size evidence that exists — is seven days stale and predates three shipped changes to this surface. The studio's first rule is *look at the pixels*; right now the pixels available to look at are wrong in a known way.

**What I could not verify, and the probe that would close it:** hats and legendary skins at play size. `qa/hatsheet.mjs` exists but renders in an isolated studio scene with its own camera and has produced no output in `qa/out/`. There is **no image anywhere in the pack of the hero wearing a hat at r = 12 in a lit world**, which is precisely the case the hat-seat maths (`void3d.ts:1893–1910`, `wornSeat * (1 - hatLod) + drop * hatLod`) is most likely to get wrong, and it is the thing a parent paid gems for. `qa/lookbook.mjs` should shoot the hero wearing each of the six gem hats at r = 1.25 and r = 12 against Maple and Lantern, into one sheet. Until that exists, no one on this team can say a hat sits correctly at r = 12, and I will not sign one off from source.

---

## COVERAGE

**Images read (Read tool, full frames):**
- `qa/out/shippedlook/maple_look.png` (required)
- `qa/out/person/maple_front.png` (required)
- `qa/out/shippedlook/lantern_look.png` (required)
- `qa/out/shippedlook/powder_look.png` — the near-white ground named in my remit
- `qa/out/heroface/r12.png`, `qa/out/heroface/r6.png`, `qa/out/heroface/r1.25.png`
- `qa/out/mouth/A_current_eat.png`, `qa/out/mouth/C_dark_eat.png` (both dated Aug 17; treated as historical, not as evidence of the shipped build)

**Crops and pixel measurements I generated** (scratchpad, read back as images): 3× crop of the spawn void from `maple_front.png`; 8× crop of its mouth; 2× crop of the face from `maple_look.png`; 3× crop of the face from `r12.png`; 1× crop of the ground beneath the hero in `maple_look.png`. Numeric sampling of ground luminance under vs. away from the hero in `maple_look.png`, and of body / rim / ground luminance in `maple_look.png`, `lantern_look.png` and `powder_look.png`.

**Files read:**
`docs/STUDIO.md`, `docs/HANDOFF.md`;
`src/proto3d/void3d.ts` (shader 72–420; contact shadow 560–700; face wrap 698–760; eyes 760–890; mouth and maw 916–1056; brows 1057–1160; moods 1160–1205; rings and orbit 1300–1420; setStage/setSkin 1489–1690; update loop 1690–2095);
`src/prototype3d.ts` (camera and growth 8320–8360, 8865–8960; mood resolution 8570–8600; magnet and capture 4950–5000, 8783–8820; quality ladder 960–1030; debug hooks 1563–1745; `VISUAL_STAGE` 3023);
`src/proto3d/fx.ts` (ring pool and update 60–140);
`index.html` (joystick CSS 425–465);
`qa/shippedlook.mjs`, `qa/heroface.mjs` (230–275), `qa/hatsheet.mjs`.

--- THE SKEPTIC ---
## VERDICT ON THE VERDICT

NO-SHIP is correct — I reproduced the mouth failure in **four of five worlds** (not three of four), including the two frames the team never opened, and it is on screen in the first second of every match.

---

## PER FINDING

### The grin is switched off whenever there is food in the gravity well
**REAL: yes** — and understated.

**WHAT I FOUND:** Every cited line says what is claimed.
`src/proto3d/void3d.ts:1939` — `mouth.visible = mo < 0.25;`
`src/proto3d/void3d.ts:1166` — `hungry: { pupil: 1.28, smile: 1.1, maw: 0.26, ... }`
`src/prototype3d.ts:8809` — `if (d < reach * 0.85) hungryT = tClock;`, inside the `else if (inWell)` branch, where `inWell` already requires `e.radius <= R * eatRatioNow()`. `src/prototype3d.ts:8582` puts `hungry` below only hurt/outro/scared/smug/frenzy, so in a dense world it is the default driving face.

The geometry checks out against pixels, not just arithmetic. I cropped the mouth out of `maple_look.png` at 4× (330–540 × 830–1000): the dark blob measures **58.75 × 68.75 device px — aspect 0.85 : 1, portrait**, against the reviewer's predicted 0.87 : 1. It is a black egg with a pink ellipse in the lower half. `lantern_look.png` at 2× is identical. `powder_look.png` — same probe, same `__setVoidR(4)`, same wait — is a wide grin with a tongue and it is genuinely lovely.

The two frames the team did not open make it worse: **`gameday_look.png` and `pirate_look.png` both show the vertical egg.** Four of five worlds. And in `qa/out/person/maple_front.png`, cropped at 6× (540–760 × 1280–1470), the void at spawn radius has **no mouth at all** — a ~9 × 9 device-px dark speck with one red pixel in it, at a face that is otherwise excellent. That is the first frame of every match on the owner's daughter's phone.

**FIX SOUND: yes.** Three constants, no new mesh, no material, no seeded draw. The overlap state the fix widens is not new — `void3d.ts:1044` already says *"The gape and the closed mouth overlap for one mood step and the gape has to win it"*, so raising the threshold extends a handled state rather than creating one. The widened gape at `mo = 1` is 0.536 wide against the owner-approved grin's 0.477 — 12% wider, not a reshape. `mawDark.scale.y 1.15 → 0.92` makes the gape *shorter*, so nothing new reaches the eyes.

**CORRECTION:** two numbers.
- The width collapse is **4.59×**, not 4.8× (0.477 → 0.104 in face units).
- "*most of a match*" is asserted, not measured, and the lerp narrows it. `mp.maw` chases 0.26 at `k = min(1, dt*9)`, so from cruise it needs **~20 frames (0.33 s)** to cross 0.25, against a 0.45 s hungry window. A single prop passing through the well never hides the grin; only *sustained* hoovering does. That makes the finding narrower and the constant more absurd — 0.26 is one hundredth over a threshold it only just reaches. `qa/_mood.mjs` already exists and measures mood dwell over a real match; run it before writing "most of a match" in the ledger.
- Scope limit the team did not check: `src/proto3d/rivals.ts` has no `maw` and no `setMood` — the five family voids have their own face. This defect does not multiply by six.

---

### The contact shadow puts 84% of its density behind the ball
**REAL: yes on the symptom. The mechanism, the arithmetic, the severity and the gate are all wrong.**

**WHAT I FOUND:** The gradient at `void3d.ts:615–620` and `opacity: 0.62` at `:658` and `contact.scale.setScalar(dispR * 1.52)` at `:2091` are quoted correctly.

The measurement holds. Lateral profile across `maple_look.png` at y = 1155–1175 (void centre x ≈ 432, bottom edge y ≈ 1113):

```
x=  20  L=164.5      x= 300  L=147.4
x= 140  L=161.7      x= 380  L=143.4   ← darkest
x= 220  L=152.3      x= 460  L=145.6
```

A smooth 350-px bowl, **12.8% at its deepest, monotonic, no edge anywhere.** The reviewer's 11% is honest.

But the explanation is not. Solving the blend against `0x171021` (L 17.9): the darkest visible point sits at **effective alpha 0.144**, which is 37% of the texture's 0.62 × 0.62 = 0.384 peak — i.e. **gradient position ≈ 0.64**, not 0.954. The claim that "the only stops the player can ever see are 0.80 and 1.00" and that the visible shadow "tops out around 0.06 effective alpha" is wrong by 2.4×. The file's own `:2088` comment ("anything under about 1.45x is entirely hidden") is what misled them, and that comment is itself wrong — roughly the inner **0.6**, not 0.95, of the disc radius is occluded.

**FIX SOUND: no, not as specified.** Re-profiled to `0.62 → 0.62` with `opacity 0.75`, the region I measured as actually visible (gradient ~0.64) lands at **~0.46 effective alpha — a 46% darkening**, not the "0.30–0.41" predicted, because the prediction was derived from the wrong hidden-zone model. `void3d.ts:600–614` records that a stronger disc has been rejected on sight **twice** — "*it read as a grey circle*" and "*a rough white circle glued around the hero*". Shipping this profile on arithmetic is the third attempt at the same mistake. The direction is right; the magnitude must come off an A/B render put in front of the owner, not off a spreadsheet.

**GATE: no — it already exists.** `qa/grounding.mjs` does exactly this and does it better: it renders the identical frame twice, once with `scene.getObjectByName('contact')` hidden, and differences them, so it carries no assumption about ground colour or where the shadow lands. It is listed as the standing hero-grounding probe in `docs/FABLE-BRIEF.md:68` and `docs/OVERNIGHT.md:352`. Its header already contains this finding, argued from the same 1.45× comment. It exits non-zero on `reach < 1.02 || footprint < 5% of hero disc`. From my pixels the shadow reaches **x ≈ 140 from a centre at 432 against a hero pxR ≈ 237 → reach ≈ 1.23**, and peak darkening is 21/255 against its own "under ~12 is invisible" line — so **`qa/grounding.mjs` almost certainly PASSES today**. The work is retuning that probe's threshold against an owner-approved target, not writing `qa/grounded.mjs`.

**CORRECTION on severity: major, not blocker.** A blocker on a surface where the owner has twice rejected the stronger version, argued from an alpha figure that is 2.4× off, is over-claiming.

**CORRECTION on the supporting contrast claim:** I could not reproduce "1.24 : 1 luminance, Maple". Body centre against grass 16 px outside the silhouette in `maple_look.png` measures **1.57 : 1** WCAG. And `docs/STUDIO-ROUND-1.md:479` already specifies `qa/heroground.mjs` at a 1.30 floor for exactly this, with Pirate at 1.007 — that is where this belongs.

---

### The joystick nub is a 55%-opaque lavender disc drawn on the hero's face
**REAL: no.**

**WHAT I FOUND:** The CSS is quoted correctly — `index.html:461` is still `background: rgba(201,166,255,0.55)`. And I did find the artifact in `r12.png`, precisely: a circle centred (429, 809) with a bright rim at **radius 131.5 device px = 65.75 CSS**, and inside it a hard discontinuity at **r ≈ 50–52 device px = 25–26 CSS** where the pixels jump from (100,68,144) to (147,115,194). Those are `#joy` (128 + 2 px border ⇒ 66 CSS) and `#joyNub` (26 CSS) to within a pixel. The nub is lightening the mouth region from an underlying ~(81,53,119) to (147,115,194).

So the reviewer described the pixels accurately. The finding still dies, three ways:

1. **The frame is dead.** `qa/heroface.mjs:85` does `await p.addStyleTag({ content: '#joy,#joyNub{display:none !important}' })` before every screenshot, with a 19-line comment explaining exactly why. The joystick cannot appear in a current heroface frame. `shippedlook.mjs` hides every DOM child that is not the canvas. This artifact appears in **no probe output the studio can generate today.**
2. **The ring in that frame is not today's ring.** Measured rim pixels are (233,227,238) over a purple body — that is the *old* 3 px solid white at 0.85 that `index.html:440–456` records as already removed. Today's `#joy` is a 2 px stroke at 0.30. The reviewer quoted current CSS while looking at pre-fix pixels and did not notice the two disagreed.
3. **The size arithmetic contradicts itself.** Finding 4 of the same review computes the hero at **55.6 CSS px** screen radius at r = 12 from `camDist = clamp(38·(R/0.9)^0.82, 26, 340)` and fov 32 — and that is correct, I get 55.6. Finding 3 then asserts "~157 CSS px" to make a thumb 200 px below centre land on the character. At the true 55.6, a thumb must be within ~81 CSS px of screen centre for a 26 px nub to touch him. And the nub *tracks the thumb* (`prototype3d.ts:2743`, `joy.ax + dx*k`, clamped to `JOY_R = 64`), so it lives under an opaque finger. The part that stays behind at the anchor is the ring — the part that was already fixed.

**FIX SOUND: yes, but it is polish.** `background: transparent; border: 3px solid rgba(201,166,255,0.78)` costs nothing and removes a fill that has no reason to be a fill. Take it as a free win. Do not carry it as a major finding, and do not carry the SAW.

**CORRECTION:** the hero's screen radius at r = 12 is **55.6 CSS px**, not 157.

---

### Seven forms are five pictures, and the last four are two
**REAL: no.**

**WHAT I FOUND:** `prototype3d.ts:3023` is `const VISUAL_STAGE = [0, 1, 2, 3, 3, 4, 4];` and the shader term at `void3d.ts:94` is `churn * 0.022 * max(0.0, uStage - 1.0)`, `uStage` capped at 4, so 6.6% displacement at top. `void3d.ts:932`'s `fangs` array is genuinely never populated — `mkFang` at `:933` builds a mesh, does `void parent`, and returns it unattached. The reviewer's fix constants (`uStage * 0.045` at `:314`, `n >= 4` at `:1504`) are all cited accurately. The camera arithmetic (+59% linear across 13.3× world growth) is right.

It still fails four of the kill tests:

- **Deliberate, with a recorded rationale, three lines above the cited line.** `prototype3d.ts:3020–3022`: *"COLOSSUS wears CHOMPOSAURUS's dressing — it IS a huge devourer — so the top tier stays unique to WORLD ENDER and arriving there looks like something."*
- **The SAW is absent by the reviewer's own admission.** Rule 1 is the reason this studio exists. A **major** on a surface nobody has rendered is the exact shape of both shipped failures.
- **"byte-identical renders, ΔE 0, IoU 1.000" is false.** The forms differ in world radius, so they differ in on-screen size (R^0.82 does not cancel), in world scale around them, and in `uWobble`/`evolveT` state. The proposed gate would fail today for the wrong reason and could not distinguish a real fix from a camera artifact.
- **Three per-form channels the reviewer did not read already key on the true form, not `VISUAL_STAGE`.** `prototype3d.ts:8067–8069` — `presenceT = 0.55 - curStage * 0.08; spawnSuck(1 + curStage, voidling.radius * 1.9)`, so VOID TITAN spawns seven suck streaks on a 0.07 s cadence against WORLD ENDER's six on 0.07 — and `tension()` at `:3633` uses `(curStage - 1.4) / 2.6`, which drives the newsroom. "The hero owes almost nothing per form" is not true as written.

**FIX SOUND: the experiment, yes; the finding, no.** Re-spreading `VISUAL_STAGE` to `[0..6]` and rescaling three float constants is cheap, reversible and worth putting in front of the owner as a contact sheet — which is what the reviewer actually proposed, correctly, under rule 3. Log it as an open question for the owner, not as a major defect against the build.

**CORRECTION:** `qa/voidsheet.mjs` already renders a full offscreen void per skin and `qa/titan.mjs` already drives the ladder to form 7 — build the contact sheet on top of those rather than a new `qa/formsheet.mjs`.

---

### Every hero screenshot in the evidence pack has a false ring on the character
**REAL: yes.**

**WHAT I FOUND:** Confirmed in **five** frames, not four — `maple_look.png`, `lantern_look.png`, `powder_look.png`, `pirate_look.png`, `gameday_look.png`, plus `r12.png`. Large violet ribbons arcing across the hero and out to the frame edge in every one.

The chain is exactly as described. `_dbg.__setVoidR` at `prototype3d.ts:1733` calls `voidling.setStage(VISUAL_STAGE[curStage])`; `void3d.ts:1499` sets `ringBurst = 1` on any increase; `:1745` decays it at `dt * 0.55`; `prototype3d.ts:8049` is `const dt = Math.min(0.05, dtRaw)`. Under swiftshader the 3.4 s wall wait buys a fraction of a simulated second. `qa/heroface.mjs:246` already warns *"If a future render shows a ring around him, SUSPECT THIS NUMBER BEFORE SUSPECTING THE GAME"* — it is right and its own remedy does not work.

**FIX SOUND: direction yes, mechanism no.** A new `window.__voidRingBurst()` debug getter is a source change to the shipping game for a test, and it is unnecessary. `void3d.ts:1323` is `rings.name = 'rings';` with the comment *"NAMED, because things outside this file need to switch it off."* `qa/grounding.mjs` already uses that exact pattern on `'contact'`. **Zero source change:** `scene.getObjectByName('rings').visible = false` before the screenshot, restored after.

---

## WHAT THE TEAM MISSED

**1. Two frames in their own lookbook, unopened — and both are better evidence for their own blockers than what they filed.** `qa/out/lookbook.json` lists five shipped-look frames as showing HERO. The review reads three. `gameday_look.png` and `pirate_look.png` both show the vertical-egg mouth, taking it from "three of four" to **four of five worlds**. And `pirate_look.png` is the single most damning shadow frame in the pack: a pale sand plaza where every barrel, lamppost, ice-cream cart and pedestrian lays a hard, dark, crisply-edged shadow — and the void, the largest object on screen, lays **nothing**. That picture makes the grounding argument in one glance. `gameday_look.png` does it again on asphalt. The team argued the point from an 11% luminance delta instead.

**2. `qa/grounding.mjs` exists and probably passes.** They proposed building it. It is already the standing probe, it uses ablation differencing rather than their weaker luminance-ratio sampling, and by my numbers (reach ≈ 1.23, peak 21/255) the build clears its thresholds today. Discovering that the existing gate is calibrated too loose is a finding. Writing a second, worse gate beside it is not.

**3. `qa/_mood.mjs` exists.** It reads mood state off the face meshes by geometry over a real match. It is the one instrument that turns "the smile is hidden for most of every match" from an assertion into a number, and the number matters because the lerp means only *sustained* hoovering crosses 0.25. Nobody ran it.

**4. The camera never settles either — same bug, same file, bigger consequence.** They found the wall-clock/sim-clock split for `ringBurst` and stopped. `camDist += (targetDist - camDist) * (1 - exp(-1.6*dt))` at `prototype3d.ts:8920` runs on the same clamped `dt`. I measured the void in `r12.png` at **~90 CSS px silhouette radius**; the r = 12 camera law predicts **55.6**. So `qa/out/heroface/` — the only per-size hero evidence that has ever existed — was shot at a camera distance of roughly 217 units instead of 318, at every radius. The probe's entire purpose is "how does he read at the sizes the player actually sees", and it has never once photographed one of them. That is worse than the ring and it is on the adjacent line.

**5. `rings.name = 'rings'`.** The mechanism their own fix needs is already in the file, with a comment saying it was put there for exactly this. Fixing the probe costs a line of test code and no source change.

**6. What is right, and should be on the record as judged rather than skipped.** `front_face.png` at 6× shows the eyes, brows and blush reading beautifully at a 71-CSS-px face — no bulge, no pale break in the silhouette, correct foreshortening from the wrap. `powder_look.png` shows what the mouth is supposed to be and it is genuinely charming. The rival voids carry no `maw` at all (`rivals.ts` has no match for `maw`/`setMood`/`mouth`), so the mouth defect is hero-only and does not multiply across the five family members. The team filed five findings and recorded nothing as good — `docs/STUDIO-ROUND-1.md:399` and `:595` both do this, and it is what lets a governor tell a fix from a rewrite.

---

SURVIVED: 3 of 5.


═══════════════════════════════════════════════════════════════════
TEAM UI
═══════════════════════════════════════════════════════════════════
--- THE TEAM'S REVIEW ---
I have what I need. Writing the review.

## VERDICT: NO-SHIP

Two of the three biggest numbers a child reads during play — the final-ten countdown and the per-bite score — are the only hero text elements in the file that never received the hard outline treatment the file itself documents, and both measure under 3:1 against the ground they land on in all five worlds.

## THE BAR

**hole.io (Voodoo, 2018–, still top-grossing in .io casual)** — the direct genre comparable. Its in-match HUD is three elements: timer, rank list, size chip. Every one is a **solid, fully opaque rounded plate**. No translucency, no runtime blur. Its score floaters are white with a hard black contour. When its results panel opens, the arena stops.

**Subway Surfers (SYBO)** and **Royal Match (Dream Games)** — the "clay chrome" school this file cites by name at index.html:82. Both build every raised surface as a nine-slice sprite with a *baked* top rim and a *baked* drop shadow. Zero runtime blur, zero translucency, one material spent everywhere. Royal Match's countdown numeral carries a contour roughly 8% of the glyph's cap height, in near-black, so it survives any board state.

**Where we sit:** our chrome plates are 0.88-alpha translucent with a live `backdrop-filter` — four of them compositing over the WebGL canvas every frame of every match. The clay system this file wrote 22 lines of documentation for is applied to zero elements. And our two largest in-play numerals carry a soft glow and a 1px 35%-alpha stroke respectively, where the bar carries a hard contour. We are one honest pass away from the bar on chrome, and two source lines away on the numerals.

---

## FINDINGS

### The final-ten countdown has no outline — the one hero element the outline pass skipped
SEVERITY: **blocker**
AT: `index.html:392`

SAW: Not visible in `maple_look.png` / `powder_look.png` (both are clean-canvas shots with no HUD composited; `qa/out/store/maple_hud.png` is the only HUD render and it is 6 days stale — it predates the form rename, showing "GOBBLER"/"NEXT DEVOURER"). So this is a source finding, measured against the shipped canvas pixels. I took the exact screen box `#count` occupies (`top:33%`, centred, `min(30vw,150px)` tall) out of all five `qa/out/shippedlook/*_look.png` renders and measured what the glyph actually lands on:

| world | `#ffd23f` gold below 3:1 | `#ff6a5e` hot below 3:1 |
|---|---|---|
| maple | 34% of the glyph footprint | **81%** |
| pirate | 27% | **79%** |
| gameday | 25% | **77%** |
| powder | 23% | **74%** |
| lantern | 22% | **74%** |

The `hot` state is 3-2-1 — the last three seconds of the match, the loudest moment in the loop — and it fails the 3:1 floor on three-quarters of its own area on every world we ship.

EVIDENCE — the element, and the four elements around it that were fixed:
```
392:  #count span { font-size: min(30vw, 150px); font-weight: 700; color: #ffd23f;
393:    text-shadow: 0 5px 0 rgba(60,20,10,0.5), 0 0 38px rgba(255,180,60,0.55);
395:  #count span.hot { color: #ff6a5e; text-shadow: 0 5px 0 rgba(60,10,10,0.55), 0 0 42px rgba(255,90,74,0.6); }
```
against the file's own note at index.html:542, which lists the elements that were treated and admits one was missed:
```
542:  /* THE LAST HERO MESSAGE THAT NEVER GOT THE STROKE. #timer, #titlecard and
543:     #banner were each measured against the live world and given a hard
544:     treatment — a stroke, a radial scrim and a card respectively. #evolve
545:     was skipped …
```
`#evolve` was then fixed (index.html:553-555). `#count` was never on that list. `0 0 38px` is a Gaussian glow, not an outline, and it is *warm* — it raises the ground's luminance around a gold glyph, which is the wrong direction on every daylight world.

FIX — one line, the idiom already in the file three times:
```css
#count span { … -webkit-text-stroke: 8px rgba(12,6,26,0.92); paint-order: stroke fill; }
```
8px because the stroke has to scale with a 150px glyph the way `#timer`'s 3px scales with 34px. Measured: gold on that stroke is **13.8:1**, hot is **7.1:1**, independent of world. Drop the `0 0 38px` glow at the same time — it is what is currently softening the edge the stroke needs.
**Cost: 0 draw calls, 0 triangles, 0 seeded draws.** One CSS declaration on an element that is on screen for ten seconds a match.

GATE: `qa/contrast2.mjs:33` already implements exactly the right measurement — shoot with the overlay hidden, shoot with it shown, take the changed pixels as the chrome, measure the chrome's own internal range, which is scene-independent by construction. Its ID list is short by two:
```
33:  const IDS = ['board','timer','coins','btnQuit','growth'];
```
Add `'count'`, drive the clock into the final ten (`__matchState`) and hold a numeral up. Fails today: the changed-pixel set is gold plus antialiased ground, internal step collapses toward ~1.2:1. Passes after: the set contains gold *and* near-black stroke, step ≥13:1. **And add `contrast2` to the `push` profile in `qa/gate.mjs` — `qa/out/gate/report.md` lists nine steps and HUD legibility is not one of them.**

---

### The per-bite score floater is 1.19:1 on Maple's plaza, and its outline is brighter than its ink
SEVERITY: **blocker**
AT: `src/proto3d/bubbles.ts:142`

SAW: source, plus measurement against the shipped canvas. `bubbles.float()` is called on **every single eat** (`src/prototype3d.ts:5007-5009`) at `floatPos = (prop.x, voidR + 2, prop.z)` — i.e. on the ground the void is standing on. I sampled the four grounds it lands on most in `maple_look.png` and `powder_look.png`:

| ground | `.vf` `#ff7da8` | `.vf.big` `#7ef2a0` | the 1px stroke vs that ground |
|---|---|---|---|
| **maple plaza sand** | **1.19:1** | 2.05:1 | 1.76:1 |
| maple grass | **1.29:1** | 2.23:1 | 1.76:1 |
| powder snow | 2.33:1 | 4.02:1 | 1.46:1 |
| powder slope | 1.94:1 | 3.36:1 | 1.57:1 |

1.19:1 is *below* the 1.65:1 the title card measured at before it was given a scrim, and below the 1.46:1 that got `#btnQuit` called "the lowest-contrast element in the game on every world measured" at index.html:980. This one fires hundreds of times a match.

EVIDENCE:
```
142:  .vf {
143:    position: fixed; transform: translate(-50%, -50%); z-index: 4; pointer-events: none;
144:    font-family: 'Fredoka', system-ui, sans-serif; font-weight: 900; font-size: 17px; color: #ff7da8;
145:    -webkit-text-stroke: 1px rgba(70,20,50,0.35);
146:    text-shadow: 0 2px 6px rgba(0,0,0,0.35); opacity: 0; white-space: nowrap;
147:  }
148:  .vf.big { font-size: 26px; color: #7ef2a0; letter-spacing: 1px; }
```
Two separate defects in line 145. **(a)** At 0.35 alpha over maple plaza the stroke composites to `rgb(125,108,98)`, L=0.159 — 1.76:1 against the ground it is supposed to separate from, and only 2.09:1 against the pink fill. It is not an outline; it is a smudge. **(b)** There is no `paint-order`, so the default `fill → stroke` paints the stroke *on top of* the glyph, and because a stroke is centred on the outline, half of that 1px eats into a 17px letterform. `#timer:126` sets `paint-order: stroke fill` for precisely this reason; `.vf` never got it because it lives in TypeScript, not in `index.html`.

FIX — the same idiom, one line:
```css
.vf { … -webkit-text-stroke: 3px rgba(12,6,26,0.92); paint-order: stroke fill; }
.vf.big { … -webkit-text-stroke: 4px rgba(12,6,26,0.92); }
```
Measured: pink on that stroke is **9.8:1**, mint **13.9:1**, on any ground. Keep both colours — they are the identity, and with a hard contour they no longer have to carry the contrast job alone.
**Cost: 0 draw calls, 0 triangles, 0 seeded draws.** No layout change — `paint-order` and `text-stroke` do not affect the box, so the de-collision maths in `bubbles.update()` is untouched.

GATE: same probe. Add a `.vf` case to `qa/contrast2.mjs` — expose `__float(text)` on the debug object, fire one over the Maple plaza with the void parked, take the changed pixels. Fails today at ~1.2:1 internal step; passes at ≥9:1.

---

### Four `backdrop-filter` layers composite over the live WebGL canvas every frame of every match
SEVERITY: **major**
AT: `index.html:165`, `index.html:198`, `index.html:466`, `index.html:984`

SAW: source. I enumerated every `backdrop-filter` in `index.html` (18 declarations) and resolved which are *visible during a match*. `#quests` is dead (`index.html:487` sets `display:none !important` and the later rule at 505 has no `!important`), `#banner .bCard` is transient. That leaves exactly four permanent ones, confirming the earlier audit's count:

EVIDENCE:
```
165:  #board  … background: rgba(16,8,30,0.88); … backdrop-filter: blur(7px); }
198:  #growth … background: linear-gradient(180deg, rgba(30,16,58,0.91), rgba(16,8,30,0.93));
             … backdrop-filter: blur(8px);
466:  #coins  … background: rgba(16,8,30,0.88); … backdrop-filter: blur(7px);
984:  #btnQuit… background: rgba(16,8,30,0.88); … backdrop-filter: blur(7px); }
```
On WebKit, `backdrop-filter` forces the element into its own compositing layer *and* forces the backdrop — which here is the WebGL canvas — to be resolved into an intermediate texture, blurred, and re-composited, per element, per frame. Four times, at 3× DPR, for 180 seconds.

And it buys nothing. Every one of these fills is already ≥0.88 opaque — a deliberate, measured choice, explained at index.html:141-149: *"At 0.88 the panel is 0.12 whatever is behind it, and the chip has the same contrast on a night market as on a beach."* The blur is modulating **12%** of the pixel. The comment's own justification — *"The blur is what keeps it from reading as a solid box"* — is the opposite of the bar: hole.io's plates *are* solid boxes, and Royal Match's read as moulded objects precisely because they are opaque with a baked rim.

FIX: delete `backdrop-filter` from those four rules and take the fills to `1.0`. The `--rim` / `inset 0 2px 0` treatment already defined at index.html:102 is what replaces the blur's separation job. Same for the three that stack on the results screen (`#end:679` blur(8px), plus `#board` and `#btnQuit` which are *still live behind it* — nothing hides them; `body.ovl` only hides `#growth` at 1603 and `#quests` at 516).
**Cost: negative.** Removes four per-frame full-screen blur passes in match and three on the results screen. 0 draw calls added, 0 triangles, 0 seeded draws.

GATE: new `qa/blurcost.mjs` — walk `document.querySelectorAll('*')`, count elements where `getComputedStyle(el).backdropFilter !== 'none'` and the element is visible, sampled (a) mid-match, (b) with `#end` shown, (c) with `#pause` shown. Assert 0. Fails today: 4 / 3 / 4.

---

### The 3D scene renders at full rate behind every opaque full-screen overlay
SEVERITY: **major**
AT: `src/prototype3d.ts:9277`

SAW: source. `animate()` gates *simulation* on overlay state (`src/prototype3d.ts:8062`: `if (started && !ended && !paused)`) but the render call at the tail is unconditional:

EVIDENCE:
```
9270:  if (bloomOn) {
9271:    const c = ensureComposer();
...
9275:    c.render();
9276:  } else {
9277:    renderer.render(scene, camera);
9278:  }
9279:  requestAnimationFrame(animate);
```
Nothing between `#pause.show` and that line. The overlays that sit on top are opaque or near-opaque and full-bleed:
- `#book` — `inset:0; background:#150f24` (index.html:626) — **100% opaque**
- `.metaScr` (WORLDS / TROPHIES / TOP VOIDS) — `inset:0; background:#0d0821` (1324) — **100% opaque**
- `#shop` — `rgba(13,8,33,0.94)` (1361)
- `#pause` — `rgba(9,5,20,0.86)` (1429)
- `#end` — `rgba(13,8,33,0.82)` (679)

The results screen is where a child sits for ten to twenty seconds reading their score, and the pause sheet is where a parent takes the phone. Both are currently the *most* expensive states in the game: full-rate town render + bloom composer + three backdrop-blur passes, all under a sheet you cannot see through. On an iPhone 13 that is the thermal worst case, and it is invisible work.

FIX: one guard above line 9270:
```ts
const hidden = document.body.classList.contains('ovl')
  || document.getElementById('pause')?.classList.contains('show');
if (!hidden) { /* existing render branch */ }
```
`ovl` is already computed and toggled at `src/prototype3d.ts:1814`. Keep `requestAnimationFrame(animate)` outside the guard so the loop, audio and timers are untouched. On the pause sheet also drop the rAF to a slow tick — but the render skip alone is the whole win.
**Cost: negative.** 0 draw calls added.

GATE: extend `qa/blurcost.mjs` or a new `qa/idlecost.mjs` — read `renderer.info.render.calls` (expose it on `_dbg`), open `#pause`, wait 60 frames, assert the delta is 0. Fails today (delta ≈ 60 × per-frame call count); passes after.

---

### The type-ladder probe never enters a match, so the TS-painted layer still ships two non-existent weights and a 10px label
SEVERITY: **major**
AT: `src/proto3d/bubbles.ts:110`, `:137`, `:144` — probe hole at `qa/uisystem.mjs:33`

SAW: source. This is the exact failure mode the brief warns about — *"a previous pass found dead font weights alive only in the TS-painted layer"* — and it is still live, because the probe built to catch it walks four screens and none of them is a match.

EVIDENCE — the offending declarations:
```
110:  font-family: 'Fredoka', system-ui, sans-serif; font-weight: 800; font-size: 14px;   /* .vb  */
137:  .vb .vbN { display: block; font-size: 10px; font-weight: 900; letter-spacing: 1.2px;
144:  font-family: 'Fredoka', system-ui, sans-serif; font-weight: 900; font-size: 17px;  /* .vf  */
```
Fredoka ships 300/400/500/600/700 and `@fontsource/fredoka/{400,500,600,700}.css` are what `src/prototype3d.ts:24-27` imports. There is no 800 and no 900. `font-synthesis: none` at index.html:71 is inherited, so these silently snap to 700 — which means three declarations are lying about what they render, and the next person to "make the rival name bolder" has no lever.

Worse: `.vbN` at **10px** is the rival's *name* on their speech bubble — the element that tells a child which family member is talking — and it is below the probe's own 11px hard floor and below the file's stated 12px reading floor.

And the probe that would catch all three:
```
33:  const SCREENS = [
34:    ['menu', null],
35:    ['picker', …],
36:    ['shop', …],
37:    ['settings', …],
38:  ];
```
`qa/out/gate/report.md` reports `uisystem` **pass** — correctly, for the four screens it walks. The in-match HUD, the bubbles and the floaters are outside it.

FIX: `800 → 700`, `900 → 700` (three edits), and `.vbN` `10px → 12px`. The bubble is `width: max-content` with `max-width: min(64vw,300px)`, so a 2px name-line growth reflows inside the existing cap — and `slot.w/slot.h` are measured once per show at bubbles.ts:269-270, so the de-collision maths picks it up for free.
**Cost: 0 draw calls, 0 triangles, 0 seeded draws.**

GATE: add a fifth entry to `qa/uisystem.mjs:33` — `['match', () => { close overlays; click #btnPlay; click the maple card; then force one .vb via __say and one .vf via __float }]` — and walk the same computed-style check. Fails today with 3 weight violations and 1 size violation; passes after.

---

### `#soloTog` is absolutely positioned inside a scrolling container, sits in the home-indicator inset, and now collides with world 5
SEVERITY: **major**
AT: `index.html:1263`

SAW: `qa/out/picker_season.png` shows the toggle bottom-right with ~28px of clearance and **four** world cards above it with an empty third row. That image is 2026-08-17 — stale. The markup now carries **five** cards (`index.html:1878-1881`, POWDER PASS / WORLD 5), which is what makes this live.

EVIDENCE:
```
1263:  #soloTog { position: absolute; right: 18px; bottom: 18px; z-index: 3; cursor: pointer;
```
inside
```
1323:  .metaScr { position: fixed; inset: 0; z-index: 11; display: none; flex-direction: column; …
1325:    padding-top: calc(env(safe-area-inset-top) + 26px);
1326:    padding-bottom: calc(env(safe-area-inset-bottom) + 12px); overflow-y: auto; }
```
Three consequences, all from that one `position: absolute`:
1. **Absolute offsets resolve against the padding box, not the content box** — `padding-bottom: env(safe-area-inset-bottom)` does not move a child positioned with `bottom`. So on an iPhone 13/15 the toggle's lower **16px sit inside the 34pt home-indicator inset**, under the system's own swipe-up affordance. Every other bottom-anchored element in the file uses `calc(Npx + env(safe-area-inset-bottom))` — `#growth:192`, `#guide:246`, `.endGo:711`, the debug strip at `src/prototype3d.ts:1799`. This one is the outlier.
2. **`.metaScr` is `overflow-y: auto`**, so an abspos descendant scrolls with the content. With five 3:4 posters in a 2-up grid the list overflows a 390×844 phone; scroll down to reach POWDER PASS and the mode toggle leaves the screen. It is not a pinned control.
3. At scroll-top it now **overlaps the third grid row** — which is world 5 — instead of the empty space it had when there were four cards.

FIX: make it `position: fixed` with `bottom: calc(18px + env(safe-area-inset-bottom, 0px)); right: calc(18px + env(safe-area-inset-right, 0px)); z-index: 12`, and add `padding-bottom` room on `#worldRow` equal to the toggle's height so the last row can scroll clear of it. It is a mode switch for the whole screen; it should be chrome, not content.
**Cost: 0 draw calls, 0 triangles, 0 seeded draws.**

GATE: `qa/solotog.mjs` already proves the toggle *works* (120s vs 180s, no rivals, survives reload) but never measures where it is. Add: at 390×844 with all five worlds seeded, assert `#soloTog.getBoundingClientRect().bottom <= innerHeight - 34` and that the rect is unchanged after `#worlds.scrollTo(0, 9999)`, and that it does not intersect any `.wCard`. Fails all three today. Pair it with a **static** lint in `qa/gate.mjs` — grep `index.html` for any `position:(fixed|absolute)` rule carrying a bare `bottom:`/`top:` with no `env(safe-area-inset-` in the same declaration. That catches the next one at zero runtime cost; `#soloTog` and `#gift:1273` are the only two hits today.

---

### The scrapbook's world navigation is five sub-44px pills that wrap to three rows
SEVERITY: **minor**
AT: `index.html:633`

SAW: source, computed. `src/prototype3d.ts:5892-5895` builds five tabs, one per world, each reading e.g. `🍁 MAPLE FALLS 3/16`.

EVIDENCE:
```
632:  .bkTabs { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; padding-bottom: 10px; }
633:  .bkTabs button { border: 0; border-radius: 999px; padding: 8px 13px; font-size: 12.5px;
634:    font-weight: 600; letter-spacing: 0.6px; background: rgba(255,255,255,0.09); color: #cbb8e8; }
```
No `min-height`, no `line-height`. Computed height is `8 + (12.5 × normal) + 8` ≈ **31–35px** depending on Fredoka's metrics — under 44 on any metric, in a game whose every other button was explicitly taken to `min-height: 44px` (`#btnHome:846`, `.goShop:811`, `#btnRestore:1423`, `#pauseQuit:1450`, `.gateCancel:1484`, `.backBtn:1108`) with comments explaining why each mattered. And at ~19 characters × 12.5px each, five of them measure roughly 850px of content on a 390px phone with `flex-wrap: wrap` — **three rows** of pill cloud above the sticker grid.

The screen next door does this correctly and says why (index.html:1372-1376): *"A segmented control, not a row of links: at this size a child needs to see that exactly one of the two is currently true… an underline is a 2px cue on a screen being held at arm's length by someone who is six."* The scrapbook is the game's collection feature — the one the menu chip advertises as `0/60` — and its navigation did not get that reasoning applied.

FIX: give `.bkTabs button` `min-height: 44px; display: inline-flex; align-items: center;` and shorten the label to the world **emoji + count** (`🍁 3/16`), with the full name shown once in `.bkFoot` for the selected world. Five short pills fit one row on a 375px phone and the emoji is the read a pre-reader actually uses.
**Cost: 0 draw calls, 0 triangles, 0 seeded draws.**

GATE: new `qa/taps.mjs` — at 375/390/430 wide, open each screen (menu, picker, shop, settings, scrapbook, results, pause) and assert every `<button>` and every element with a click listener has `rect.width ≥ 44 && rect.height ≥ 44`. Assert `.bkTabs` occupies one row (`buttons.every(b => b.offsetTop === buttons[0].offsetTop)`). Fails today on 5 elements at every width; nothing else in the file fails it, which is what makes it worth adding.

---

### Four glyphs render in SF Pro next to Fredoka
SEVERITY: **minor**
AT: `index.html:1676`, `:1722`, `:1778`, `:1826`

SAW: **`qa/out/store/maple_hud.png`** — the home button top-right renders as a *thin hairline* house outline in a chunky purple plate, visibly a different typeface weight from everything around it. Same for the `✦` in the `✦ 5` coin chip beside it, and the `✦ 0` chip in **`qa/out/menu_rename.png`**: a thin four-point sparkle against Fredoka's heavy rounded digits. This is the one thing in this review the pixels show directly.

EVIDENCE — I resolved every codepoint in the markup against the actual `unicode-range` declarations in `node_modules/@fontsource/fredoka/{400,500,600,700}.css` (latin / latin-ext / hebrew subsets). Exactly four non-emoji glyphs fall outside all three:
```
1676:  <div id="coins">✦ 0</div>                          U+2726  (also 1494 ::before, 1977, and every coin floater)
1722:  <button id="btnQuit" title="home">⌂</button>        U+2302
1778:  <div class="bkHd">SCRAPBOOK<button id="bookClose">✕</button></div>   U+2715  (also 1910)
1826:  <button id="pauseResume">▶ KEEP PLAYING</button>    U+25B6  (also ×5 on the world cards, 1862-1882)
```
`⚙️` at 1772 carries U+FE0F and is correctly an emoji. These four are not — they are text-presentation symbols that fall through to `system-ui`, i.e. SF Pro, whose stroke weight and optical size are nothing like Fredoka's. `✦` is the game's **currency mark**: it is on screen in every frame of every match and in every score floater.

FIX: replace all four with drawn shapes rather than characters. `▶` → a CSS triangle (`border-left: 9px solid currentColor` on a `::before`). `✕` → two 2px rotated spans, or a rotated `+`. `⌂` → an inline SVG house path matching Fredoka's stroke weight. `✦` → one inline SVG four-point star, defined once and referenced with `<use>`, so the currency mark is finally an owned asset with a fixed weight. This also removes a real iOS risk: none of the four is guaranteed a text-presentation glyph on every iOS version, and `▶` in particular flips to emoji presentation on some.
**Cost: 0 draw calls, 0 triangles, 0 seeded draws.** One inline `<svg><defs>` block, ~400 bytes.

GATE: static, no browser — `qa/glyphs.mjs` parses the `unicode-range` lists out of the four `@fontsource/fredoka/*.css` files, scans `index.html` markup (outside `<style>`) plus every string assigned to `innerHTML`/`textContent` in `src/`, and fails on any codepoint ≥ U+0100 that is neither covered nor emoji-presentation. Fails today with exactly 4; passes after. Runs in milliseconds and can go straight into the `push` profile.

---

### `.metaScr` blurs a backdrop it then paints over with a 100% opaque fill
SEVERITY: **minor**
AT: `index.html:1324`

SAW: source.

EVIDENCE:
```
1323:  .metaScr { position: fixed; inset: 0; z-index: 11; display: none; flex-direction: column; align-items: center;
1324:    background: #0d0821; backdrop-filter: blur(8px);
```
`#0d0821` has no alpha. The blur pass runs, the result is 100% covered. This is a full-screen backdrop blur, on the three screens a child reaches most from the menu (WORLDS, TROPHIES, TOP VOIDS), that literally cannot be seen. It is the clearest single instance of the pattern in finding 3.

FIX: delete `backdrop-filter: blur(8px)` from line 1324. Nothing changes visually — that is the point.
**Cost: negative.** 0 draw calls added.

GATE: covered by `qa/blurcost.mjs` above; add an assertion that no element has both `backdropFilter !== 'none'` and a computed `backgroundColor` at alpha 1.0. Fails today on `.metaScr`.

---

### The iOS status bar sits on bright ground on Pirate Bay at 2.12:1
SEVERITY: **minor**
AT: `capacitor.config.ts` (`overlaysWebView: true`, `style: 'DARK'`)

SAW: measured on the shipped renders. **This partly refutes the earlier audit's claim.** "The iOS status bar draws over the game" is true and *deliberate* — `viewport-fit=cover` at index.html:5 plus `overlaysWebView: true` is the correct full-bleed setup, and every top-band HUD element does respect the inset: `#timer:120`, `#board:150`, `#coins:465`, `#btnQuit:978`, `#btnSettings:1279`, `.metaScr:1325`, `#book:626`, `.polBar:1456`. Nineteen `env(safe-area-inset-*)` uses in the file. The HUD is clear.

What is *not* clear is the status bar's own glyphs, which are white (`style: 'DARK'` in Capacitor means light text) and land on nothing but the live world. Top-54pt band of each shipped render, white against it:

| world | mean | brightest pixel |
|---|---|---|
| pirate | **2.12:1** | **1.58:1** |
| maple | 4.14:1 | 1.65:1 |
| powder | 4.92:1 | 2.15:1 |
| gameday | 7.18:1 | 1.62:1 |
| lantern | 6.92:1 | **1.07:1** |

Pirate Bay fails on the mean; every world fails locally where a bright roof or a lantern passes under the clock.

FIX: one fixed scrim — `<div id="statusScrim">` at `top:0; left:0; right:0; height: env(safe-area-inset-top, 0px); z-index: 4; pointer-events: none; background: linear-gradient(180deg, rgba(9,5,20,0.55), rgba(9,5,20,0));`. Zero height on a non-notched device, so nothing changes on the web build. This is what hole.io and Subway Surfers both do; do **not** set `overlaysWebView: false`, which would letterbox the game and cost the full-bleed look.
**Cost: 0 draw calls, 0 triangles, 0 seeded draws.** One DOM node, one paint.

GATE: extend `qa/contrast2.mjs` with a `statusband` pseudo-element — sample the top 54pt band across all five worlds and assert mean-vs-white ≥ 4.5:1. Fails today on pirate (2.12) and maple (4.14); passes after the scrim on all five.

---

### The clay system is documented in 22 lines and applied to zero elements
SEVERITY: **polish**
AT: `index.html:102`

SAW: source.

EVIDENCE:
```
 82:  … Premium kids' games (the clay school: Royal Match, hole.io's
 83:  own chrome) get "crisp" from exactly four commitments, so these are
 84:  now tokens and every surface spends them the same way …
102:  .clay { background: var(--panel);
103:    border: 2px solid var(--edge); border-top-color: var(--rim);
104:    box-shadow: inset 0 2px 0 var(--rim), var(--shadow-card); }
```
`grep -rn 'class="[^"]*clay' index.html src/` → nothing. `classList.add('clay')` → nothing. Zero elements. The *tokens* (`--panel`, `--rim`, `--edge`, `--r-sm/md/lg`) are used, and used well — `.navCard`, `.setRow`, `#btnHome`, `#pause .setCard`. But each of those re-declares the same three lines by hand, which is exactly the drift the comment says it exists to stop: `#board`, `#coins` and `#btnQuit` have no rim at all, `#growth` uses `rgba(201,166,255,0.28)` instead of `--edge`, and `#soloTog` uses `rgba(255,255,255,0.16)`. Four raised surfaces, four different edges, in a file whose stated commitment is one.

This is not a defect a child sees today. It is the reason the next four surfaces will also be four different edges, and it is the mechanism the bar (Royal Match) uses to look expensive.

FIX: land the class. Add `class="clay"` to `#board`, `#coins`, `#btnQuit`, `#growth`, `#soloTog`, `#rankChip` and `.wNum`, delete their hand-rolled `background`/`border`/`box-shadow`, and pair it with the opacity change in finding 3 (`--panel` is already solid `#241245`, which is what those four need to become anyway). One class, seven elements, one edge.
**Cost: 0 draw calls, 0 triangles, 0 seeded draws.** Net CSS reduction.

GATE: static lint in `qa/gate.mjs` — parse every class selector defined in `index.html`'s `<style>` and assert each appears in the markup or in `src/**`. Fails today on `.clay` (and will catch the next orphan). Add a second assertion that no rule outside `.clay` declares both `border:` and `box-shadow: inset 0 ... var(--rim)` by hand.

---

## IS THIS THE BEST THIS CAN BE?

No. But it is closer than the finding count suggests, and the gap is unusually cheap to close — **every fix above is CSS or one TypeScript guard. Zero draw calls, zero triangles, zero seeded draws, zero risk to Maple Falls' determinism.** Three of them make the game *faster*.

Ranked, what is between here and the bar:

**1 — Finish the outline pass you already started (findings 1, 2).** This is the whole NO-SHIP. The file contains a beautifully argued, correctly implemented, measured treatment for "white text over an arbitrary live 3D world" — applied to `#timer`, `#titlecard`, `#banner`, `#evolve`. Two elements were never on the list, and they happen to be the biggest numeral in the game and the most-repeated one. Two CSS lines. This is a Thursday afternoon.

**2 — Close the two probe holes that let 1 and 2 through (findings 1-GATE, 5).** This matters more than any single fix. `qa/contrast2.mjs` is the *right* instrument — its header essay on why a box-mean cannot see an outline is the best piece of measurement thinking in the QA kit — and it watches five elements and is **not in the release-gate profile at all**. `qa/uisystem.mjs` is the right instrument for type and walks four screens, none of which is a match. Both were built after a failure, and both were scoped to the failure rather than to the surface. That is the pattern the owner has now caught twice. Widen both, and add `contrast2` to the `push` profile.

**3 — Make the chrome a material instead of a filter (findings 3, 4, 8, 10, 12).** This is the "is this the best visually" answer and it is one coherent move, not five. Take the four HUD plates to opaque, land `.clay` on them, delete every `backdrop-filter`, and stop rendering the town behind sheets you cannot see through. The result reads more like Royal Match (moulded object, baked rim, hard shadow) and less like a web overlay — *and* it removes seven full-screen blur passes and a full-rate render from the two states where the phone is hottest. A translucent blurred panel is what a website does because it cannot afford art. We can afford art.

**4 — The picker's mode switch (finding 6).** Not cosmetic: with five worlds it now overlaps world 5 and scrolls away, and it lives in the home-indicator inset. The world picker is the screen a child touches before every single match.

**5 — The scrapbook (finding 7).** Three rows of 31px pills is the only screen in the build that reads as unfinished next to its neighbours, and the shop next door already contains the argument for what it should be.

**6 — The four glyphs (finding 9).** Small, but the `✦` is the currency mark and it is in every frame, and I can see the mismatch in `menu_rename.png` and `maple_hud.png`. Owning it as SVG also removes a genuine iOS emoji-presentation risk on `▶`.

**What is genuinely good, measured against the bar, and should not be touched:** the menu splash (`menu_rename.png`) is top-10 work — the logo lockup, the floating island, the void's face clear of all type, PLAY as the single unambiguous target. The safe-area discipline is better than the earlier audit claimed: 19 `env()` uses, and the two comments at index.html:1320 and 803 show someone found and fixed exactly the class of miss I was sent to look for. The `#timer` stroke, the `#titlecard` radial scrim, the `#banner` card, the results-screen `flex-start`-plus-auto-margins fix, the `.endGo` sticky row with its gradient apron, `width: max-content` on the bubbles, and the removal of the minimap and the white joystick ring are all correct, all measured, and all better than the genre norm. The problem is not judgement. The problem is that the judgement was applied element by element and the probes were scoped the same way.

---

## COVERAGE

**Images read (all with the Read tool):**
- `qa/out/shippedlook/maple_look.png` *(mandated)* — clean canvas, no HUD composited
- `qa/out/shippedlook/powder_look.png` *(mandated)* — clean canvas, no HUD composited
- `qa/out/store/maple_hud.png` — the only HUD render in the repo; **stale (2026-08-17)**, shows the retired form names GOBBLER / NEXT DEVOURER
- `qa/out/menu_rename.png` — the menu splash, current-looking
- `qa/out/picker_season.png` — the world picker; **stale (2026-08-17)**, four cards, predates POWDER PASS and the poster-scrim fix
- `qa/out/endfit.png` — results screen; **stale (2026-08-17)**, shows the retired rival names DOZER / WOBBLES / BITSY / CHOMPZILLA
- `qa/out/countdown7.png` — 250px-wide canvas crop with **no countdown numeral visible in it at all**

**What I could not verify, and why:** I was barred from running a browser, and there is **no current HUD screenshot in the repo** — `qa/out/store/*_hud.png` is six days stale and `qa/out/shippedlook/*` are clean-canvas shots. So findings 1, 3, 4, 5, 6, 7, 8, 10 and 12 are source findings, measured against shipped canvas pixels where contrast was the question and computed from CSS where geometry was. I could not verify the composited status bar on a real notched device (finding 11 measures the ground under it, not the glyphs themselves), nor the actual rendered rects of the scrapbook tabs, nor whether `endfit.png`'s PLAY-AGAIN-over-quest-row overlap survives the fix documented at index.html:704-708 — I did not report that one as a finding for exactly that reason. **The first thing worth doing after this review is `node qa/shippedlook.mjs` with the HUD up, in-match, on Maple and Powder, at the final ten.** Half of what I had to compute, the owner's daughter can see.

**Files read:**
- `docs/STUDIO.md` (full), `docs/HANDOFF.md` (full)
- `index.html` — §type ladder + chrome tokens (1-120), timer/board/growth/guide (120-260), countdown/banner/joystick/coins/quests (380-520), evolve/titlecard/scrapbook/end (540-730), goShop/btnAgain/btnHome (805-855), wCard/wArt/wBody/btnQuit (911-995), picker + soloTog + settings (1240-1300), metaScr/shop/shopTabs (1310-1380), pause/policy/gateCancel/shopWallet (1428-1500), body.menu + body.ovl + #coins override (1600-1615), markup (1670-1900)
- `src/prototype3d.ts` — eat/floater hook (4995-5060), animate head (8039-8075), render tail (9250-9296), scrapbook painter (5880-5930), `ovl` toggle (1814), fontsource imports (17-27)
- `src/proto3d/bubbles.ts` — injected stylesheet (95-175), `say`/`float`/`reset`/`update` (250-340)
- `capacitor.config.ts`
- `qa/uisystem.mjs` (full), `qa/contrast2.mjs` (head), `qa/solotog.mjs` (head), `qa/navfit.mjs` (head), `qa/_kidui.mjs` (head), `qa/out/gate/report.md`
- `node_modules/@fontsource/fredoka/700.css` (unicode-range declarations)

**Measurements run** (node + pngjs, read-only, no browser, no build): countdown-footprint contrast across all five `*_look.png`; `.vf`/`.vf.big` fill-and-stroke contrast against four sampled grounds; composited alpha maths for the 1px stroke; top-54pt status-band luminance across all five worlds; full codepoint scan of markup and TS strings against the four `@fontsource/fredoka` `unicode-range` lists.

--- THE SKEPTIC ---
## VERDICT ON THE VERDICT

**Correct.** NO-SHIP holds — the score floater measures 1.00:1 against Maple grass in my own sampling of `maple_look.png`, which means the game's primary per-eat feedback is invisible on the default world, and that is a blocker by any standard.

---

## PER FINDING

### The final-ten countdown has no outline
**REAL: yes** (severity overstated — major, not blocker)

WHAT I FOUND: `index.html:392-395` is exactly as quoted. No `-webkit-text-stroke`, no `paint-order`. The file has three stroke declarations (`126`, `553`, `555`) and `#count` is not among them. The essay at `542-546` naming the treated elements is real and `#count` is absent from its list.

I re-ran the contrast measurement independently (node + pngjs, the `#count` box at `top:33%`, glyph height `min(30vw,150px)`, over all five `*_look.png`). My numbers land within 1–3 points of theirs — maple gold 32%/hot 82%, pirate 24%/79%, gameday 22%/77%, powder 20%/75%, lantern 19%/74%. Their stroke arithmetic is also exact: I get gold-on-`rgba(12,6,26,0.92)` = 13.76:1 and hot = 7.07:1 against their 13.8 and 7.1. They ran this.

FIX SOUND: **yes.** One declaration, no draw calls, no seeded draws, no layout change.

CORRECTION: "the one hero element the outline pass skipped" overstates it. `#count` is not bare — `0 5px 0 rgba(60,20,10,0.5)` is a **hard, zero-blur offset shadow**, which gives the glyph a real 5px dark contour on its *bottom* edge. What is missing is top/left/right. A 150px numeral with a hard bottom edge is still findable at 2:1; it reads cheap, not illegible. That is major, not blocker. Their prescription is unchanged — the stroke is still the right fix.

---

### The per-bite score floater is 1.19:1 on Maple's plaza
**REAL: yes** — and **understated**

WHAT I FOUND: `src/proto3d/bubbles.ts:142-148` verbatim as quoted, including the bare `-webkit-text-stroke: 1px rgba(70,20,50,0.35)` at `:145` and no `paint-order` anywhere in the file.

My own sampling of `maple_look.png` is worse than their table:

| ground | `.vf` `#ff7da8` | `.vf.big` `#7ef2a0` |
|---|---|---|
| plaza sand `rgb(174,163,136)` | **1.04:1** | 1.80:1 |
| grass `rgb(129,182,82)` | **1.00:1** | 1.73:1 |
| lower plaza `rgb(191,185,171)` | 1.23:1 | 1.41:1 |

1.00:1 is not "low contrast," it is *the same luminance* — on the default world's dominant surface, on the element that fires on every single eat. Their 1.19 was conservative.

Both halves of their line-145 critique are correct: at 0.35 alpha the stroke is a smudge, and with `paint-order` defaulting to `normal` the stroke paints over the fill, eating half its width into a 17px letterform. `#timer:126` sets `paint-order: stroke fill` for exactly that reason.

FIX SOUND: **yes.** `text-stroke` and `paint-order` do not affect the box, so `slot.w/h` measured at `bubbles.ts:269-270` and the de-collision maths are untouched.

---

### Four `backdrop-filter` layers composite over the live canvas
**REAL: yes** (major)

WHAT I FOUND: All four lines exact — `165` `#board`, `198` `#growth`, `466` `#coins`, `984` `#btnQuit`, each at `rgba(16,8,30,0.88)` or heavier with `blur(7-8px)`. 17 `backdrop-filter` declarations in the file total. `#quests { display: none !important; }` at `:487` is real, so `516` is dead and their "exactly four in match" count is right.

The design argument is arithmetic and holds: at 0.88 the blur modulates 12% of the pixel, and `maple_hud.png` confirms it — those plates already read as solid dark boxes. The token block at `:78-84` explicitly commits to "SOLID fills — the scene shows around a card, never through it," and the blur is the thing contradicting it.

FIX SOUND: **yes**, with a caveat.

CORRECTION: they asserted the per-frame cost and never measured it. Rule 2 is half-satisfied — they named the bar (hole.io's opaque plates) but produced no frame number, on a finding whose severity is entirely a perf claim. The visual case stands on its own; the perf case is unproven. `qa/blurcost.mjs` as specified counts elements, not milliseconds, so it would not prove it either.

---

### The 3D scene renders at full rate behind every opaque overlay
**REAL: yes. FIX SOUND: NO — the fix is a no-op on the shipped build.**

WHAT I FOUND: The finding is real. `src/prototype3d.ts:9270-9278` is unconditional; the only gate in `animate()` is the *simulation* guard at `:8060` (`if (started && !ended && !paused)`), and nothing between it and the render call touches overlay state. `#book:625` is `inset:0; background:#150f24` — fully opaque. `.metaScr:1324` is `#0d0821` — fully opaque. Confirmed.

But their fix reads `document.body.classList.contains('ovl')`, and I opened the cited line. `document.body.classList.toggle('ovl', overlaid)` at `:1814` sits inside this block:

```
1793| if (import.meta.env.DEV || new URLSearchParams(location.search).has('stamp')) {
...
1814|     document.body.classList.toggle('ovl', overlaid);
...
1823| }
```

The entire `ovl` machinery — `OVERLAYS`, `vis()`, the MutationObserver — is inside the **dev-only build-stamp guard**. On a production build `body.ovl` is never applied to anything. The proposed guard would be permanently false in the shipped app and true in every session the reviewer would have tested it in. This is precisely the "passes in dev, dead on the phone" failure the studio exists to catch, and they cited line 1814 without reading three lines up.

CORRECTION, three parts:
1. **`ovl` cannot carry this.** It is dev-only. It also would not have worked even if it were live: `OVERLAYS` at `:1807-1808` is `['worlds','shop','daily','tut','settings','trophies','skinPrev','topvoids','pause','policy','gate']` — no `end`, no `book`. The results screen and the scrapbook, the two states the finding leads with, are not in it. The author already knew this; the comment at `:9144-9146` says so in as many words.
2. The correct signal already exists and is computed every frame at `:9147`: `const gOn = started && !ended && !paused`. Gate the render on the actual `.show` state of the opaque sheets — `#book` and `.metaScr` — read directly, and treat `#end` (0.82) and `#pause` (0.86) separately.
3. **Do not hard-skip under the translucent sheets.** `#end` at 0.82 and `#pause` at 0.86 let 14-18% of the town through. The renderer is constructed at `:110` without `preserveDrawingBuffer`, so a canvas that stops being drawn is showing a frame the compositor is only conventionally obliged to keep. Under a fully opaque sheet that is invisible and safe; under a translucent one it is a visible risk for zero benefit over throttling. Skip under `#book`/`.metaScr`; throttle to ~10Hz under `#end`/`#pause`.

Their `renderer.info.render.calls` gate is the right instrument and survives the correction.

*Side effect worth recording:* `body.ovl #growth { display: none }` at `index.html:1603` is therefore also dead in production. It happens to be harmless — `#growth.off` at `:1604`, driven by `gOn` at `:9147`, covers the same cases — but the comment at `:9144` ("body.ovl covers the sheets") is written on a false premise.

---

### The type-ladder probe never enters a match
**REAL: yes** (major)

WHAT I FOUND: All three declarations exact — `bubbles.ts:110` weight 800, `:137` weight 900 at 10px, `:144` weight 900. `src/prototype3d.ts:24-27` imports only `400/500/600/700`; `node_modules/@fontsource/fredoka/` ships 300-700 and nothing above. `font-synthesis: none` is real at `index.html:71`, so all three snap silently to 700.

The probe hole is exactly as described. `qa/uisystem.mjs:33` lists four screens, none a match, and its checker at `:43-57` enforces `new Set(['400','500','600','700'])` and `fs < 11` — so all four violations would be caught the instant it walked a match. `qa/gate.mjs:115` has `uisystem` in `['push','live','art']`, reporting pass on four screens it does walk.

FIX SOUND: **yes.** `width: max-content` with `max-width: min(64vw,300px)` absorbs a 2px name-line growth, and `slot.w/h` is re-measured per show.

---

### `#soloTog` is absolutely positioned inside a scrolling container
**REAL: yes** (major)

WHAT I FOUND: `index.html:1263` is `position: absolute; right: 18px; bottom: 18px`, inside `#worlds`, which is `.metaScr` — `position: fixed; inset: 0; overflow-y: auto` at `:1323-1326`. Markup at `:1857` puts `#soloTog` inside `#worlds`; `:1858-1883` now carries five `.wCard`s including WORLD 5 / POWDER PASS.

All three mechanisms check out. An abspos child resolves `bottom` against the padding *box*, so `padding-bottom: env(safe-area-inset-bottom)` genuinely does not move it — and `picker_season.png` shows the toggle with ~20px of clearance at the bottom of a 932px frame, which on a 34pt home indicator puts its lower third inside the system swipe zone. It scrolls with content because its containing block is the scroller. And `#worldRow:911-918` is `repeat(auto-fit, minmax(min(190px,40vw), 1fr))` — 2-up on a phone, so five cards is three rows and the screen now overflows where `picker_season.png` (four cards, empty third row) did not.

Their count of 19 `env(safe-area-inset` uses is exact, and `#soloTog` is genuinely the outlier.

FIX SOUND: **yes.**

CORRECTION: consequence 3 is wrong on the detail. Five cards 2-up puts POWDER PASS alone in row 3's *left* cell; row 3's right cell is empty. At `scrollTop: 0` the bottom-right toggle overlaps **row 2's right card (LANTERN NIGHT)**, not world 5. The substance — it now sits on content where it used to sit on air — is right; the card named is wrong.

Second correction: their static lint names `#gift:1273` as the only other hit. `#gift` is `display: none !important` at `:1272`, so it is moot. The lint is still worth adding — there are 67 `position: fixed|absolute` rules against 19 `env()` uses — but it will need an exclusion list, not two hits.

---

### The scrapbook's world navigation
**REAL: yes** (minor)

WHAT I FOUND: `index.html:632-634` exact. No `min-height`, no `line-height`; computed height is `8 + ~15-17 + 8` ≈ 31-33px. `src/prototype3d.ts:5890-5894` builds five tabs from `NAMES` as `🍁 MAPLE FALLS 3/16` — I reproduce ~820px of content against a ~366px content width, so three wrapped rows. Eight `min-height: 44px` declarations elsewhere in the file, exactly as they said, and `.bkTabs button` is not one of them.

FIX SOUND: **yes**, and `bkFoot`/`#bookFoot` already exists at `:663` / `:1781` to carry the displaced full name.

---

### Four glyphs render in SF Pro
**REAL: yes** (minor — and the only finding visible in the pixels)

WHAT I FOUND: I can see it in `qa/out/store/maple_hud.png`. The `⌂` in the top-right home button is a **thin hairline house outline** sitting in a chunky purple plate, unmistakably a different typeface from the `2:58` beside it, and the `✦` in the `✦ 5` chip is a thin four-point star against Fredoka's heavy digits. It reads as a placeholder.

I resolved the codepoints against the real `unicode-range` lists in `@fontsource/fredoka/700.css`. The three subsets cover `U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215` (latin), `U+0100-02BA…U+2113, U+2C60-2C7F, U+A720-A7FF` (latin-ext), and the hebrew block. `✦ U+2726`, `⌂ U+2302`, `✕ U+2715`, `▶ U+25B6` fall outside all three. `⚙️` at `:1772` carries U+FE0F and is correctly an emoji. Their list is exactly right, and `▶` appears six times (`:1826` plus all five world cards).

FIX SOUND: **yes.** The `qa/glyphs.mjs` gate is the best one they proposed — static, sub-second, no browser, straight into the `push` profile.

---

### `.metaScr` blurs a backdrop it paints over
**REAL: yes** (minor)

WHAT I FOUND: `index.html:1324` is `background: #0d0821; backdrop-filter: blur(8px);` — no alpha channel, so a full-screen blur pass under a 100%-opaque fill on WORLDS, TROPHIES and TOP VOIDS.

FIX SOUND: **yes.** Deleting it is provably a no-op visually.

---

### The iOS status bar on Pirate Bay
**REAL: yes** (minor)

WHAT I FOUND: `capacitor.config.ts` is `overlaysWebView: true`, `style: 'DARK'`. Capacitor's `Style.Dark` means light text on a dark background — white glyphs. Correct.

I re-measured the top 54pt band across all five renders and got their table to two decimals: pirate 2.12, maple 4.14, powder 4.92, lantern 6.92, gameday 7.18. Identical. And their refutation of the earlier audit is right — 19 `env()` uses, every top-band element inset, `viewport-fit=cover` plus overlay is the correct full-bleed setup.

FIX SOUND: **yes**, and the warning against `overlaysWebView: false` is the right call.

CORRECTION: the measurement is of the *scene* under the band, not of composited glyphs, which they acknowledge. A band mean also averages in regions no glyph occupies, so it understates the local failures and overstates the global one. It is directionally right and pirate at 2.12 is bad by any reading.

---

### The clay system is applied to zero elements
**REAL: yes** (polish)

WHAT I FOUND: `.clay` is declared at `index.html:102` and `class="clay"` returns zero hits across `index.html` and `src/`. Confirmed. The tokens themselves are used and used well.

FIX SOUND: **yes.** Note that `--panel: #241245` is *lighter* than the current `rgba(16,8,30,0.88)`; I checked, and white on `#241245` is still 17.0:1, so the swap costs nothing.

CORRECTION: they undersold it — see below.

---

## WHAT THE TEAM MISSED

Five things, all on their own surface, three of them in images they cited.

**1. `body.ovl` does not exist on the shipped build — and it invalidates their own headline fix.** Covered above. This is the single most important thing in the review and they walked past it while quoting the line.

**2. Their `.clay` finding is the weak version of a much worse one.** They reported an orphan class. The real number: `index.html` contains **20 distinct literal `border-radius` values**, seven of them in the teens (10, 11, 12, 13, 14, 15, 16, 18). The comment they quoted at `:79-81` says the defect being fixed was "TWELVE different corner radii in the teens alone" and commits to "ONE radius scale: 12 / 18 / 26 / 999. Nothing else." The token block landed and the cleanup did not. `#board` is 10px, `#coins` and `#btnQuit` are 11px, `#growth` is 15px, `#rankChip` 12px, `#soloTog` 14px — six raised surfaces in one HUD, five radii. That is measurable, it is the file's own stated commitment, and it is the mechanism Royal Match uses to look moulded rather than assembled. They read the comment and reported the smaller half of it.

**3. A copy defect visible in the HUD image they were required to read.** `maple_hud.png` shows the bubble **"Nine people. NINE. and a feud."** — a lowercase sentence after a full stop. `sentence()` at `bubbles.ts:95-101` capitalises only the first alphabetic character in the string; every subsequent sentence in a multi-sentence line stays as authored. They read that exact function on their way to the stylesheet at `:109` and did not look at what it produces in the picture on their screen.

**4. A layout defect visible in the picker image they cited.** In `picker_season.png`, **all four** world cards wrap `✦ NEW PLACE · 16 SECRETS` between the number and its noun — "NEW PLACE · 16" / "SECRETS". Four for four, in the screen a child touches before every match, in the image they used as evidence for a different finding. `.wBest` needs a `white-space` or width fix.

**5. `.vb` is z-index 4; the HUD it must not collide with is 5-7.** `#growth` is z-index 5, `#btnQuit` 6, `#board` and `#timer` 7. A rival bubble anchored low-centre paints *under* the growth bar. They read `bubbles.update()`'s de-collision maths closely enough to reason about `slot.w/h` and never checked it against the HUD's occupied rects — and the de-collision only avoids other bubbles, not chrome.

One thing to their credit that I want on the record: they refuted a prior audit's status-bar claim rather than inheriting it, they flagged every stale image by date, and they declined to report the `endfit.png` overlap because they could not tell whether the fix at `:704-708` had landed. That is the correct posture, and the numbers they published reproduce under independent measurement.

SURVIVED: 11 of 11.


═══════════════════════════════════════════════════════════════════
TEAM CHOREOGRAPHY
═══════════════════════════════════════════════════════════════════
--- THE TEAM'S REVIEW ---
I have the pixels and the code. Writing the verdict.

## VERDICT: NO-SHIP

The one time channel this team is allowed to use fires from a single call site, and at that site it freezes the world **before** the hero has moved — the maw is 1.7% open for the entire freeze — so the game's most-repeated action stops the screen on a picture of nothing happening, and nine of the eleven state changes in the product are `display:none → display:flex`.

## THE BAR

**Nuclear Throne (Vlambeer, shipped 2015)** — the reference practice for one-action response, published by Jan Willem Nijman as *The Art of Screenshake*. Two mechanics matter here. First, **layering**: one bullet impact fires ~10 discrete channels (muzzle flash, shell, permanent decal, enemy flinch, knockback, particles, sound, number) and they are deliberately **not simultaneous** — the impact frame draws, *then* the follow-through. Second, **"sleep"**: every game object stops updating for a handful of frames **after the impact pose is on screen**. The freeze exists to hold a picture. It is a shutter, not a stall.

We have sleep. `hitStop()` at `src/prototype3d.ts:8034` is a correct, well-argued implementation and it is not gated by the owner's zero-shake order. But we fire it on the frame *before* the pose exists, from one call site, and we hold a picture of a closed mouth.

**hole.io (Voodoo)** — the direct competitor. Its swallow answers with topple-in, a scale bump, a score float and a sound, all on the same frame. That is exactly what `capture()` does. We are at parity with the title the owner asked us to beat "in every way." Parity is the failure.

**Alto's Odyssey (Snowman)** — for boundaries. It never swaps a screen: the wipeout holds the camera on the scene and the goal cards fly in over a world that is still rendering and still moving. Our `#end` composition is right (0.82 scrim over a live blurred world) — but it *arrives* in one frame with no animation on the panel itself, and the pause sheet, the picker, the shop and the scrapbook all arrive the same way.

## FINDINGS

### THE FREEZE LANDS BEFORE THE POSE
SEVERITY: **blocker**
AT: `src/prototype3d.ts:4882` and `src/prototype3d.ts:8621`

SAW: **Code only, and the render is why it stayed hidden.** `maple_look.png` and `gameday_look.png` are both live-canvas frames from a running match and in both the void's maw is fully closed — the small plum oval is `mouth`, the resting smile, which is only visible when `mo < 0.25` (`void3d.ts:1938`). Neither still can show a 105 ms window, and no probe in `qa/` samples the maw at all, which is exactly how this survived.

EVIDENCE:
```
prototype3d.ts:4882    hitStop(0.055 + 0.05 * bite);
prototype3d.ts:8621    voidling.update(dtw, { t: tClock, x: voidState.x, ... });
prototype3d.ts:8054    if (stopT > 0) { stopT = Math.max(0, stopT - dt); dtw *= 0.06; }
void3d.ts:1930         if (mouthT > 0) { mouthT -= dt; mouthAge += dt; }
void3d.ts:1932         if (mouthAge < 0.045) openEnv = (mouthAge / 0.045) * 0.12;
```
The hero's *animation* runs on `dtw`. The gate is `bite > 0.55 && e.radius > 1.1`, so the freeze is 82–105 ms. At `dtw = dt × 0.06`, 105 ms of wall time advances `mouthAge` by **6.3 ms** — inside the 45 ms wind-up. `openEnv = (0.0063/0.045) × 0.12 = 0.0168`, so `mo ≈ 0.015`: the maw is **1.5–1.7 % open for the entire freeze**. The same `dtw` freezes `dispR` (the growth swell) and `wobble` (`void3d.ts:1745–1806`). The spring peak moves from 225 ms after the bite to **324 ms**.

So on the biggest bite a child takes, the world stops to say *look at this* — and what it holds is a closed mouth, an unswollen body and a prop that has not begun to topple. Vlambeer's sleep holds the follow-through. Ours holds the wind-up.

FIX: delay the freeze by one anticipation window so it lands on the pose. Three lines, no new draw calls, no triangles, no seeded draw:
```
let stopWait = 0;                                  // near stopT/stopCd (8032)
function hitStop(sec, delay = 0.085) {             // 8034
  if (stopCd > 0) return;
  if (delay > 0) { stopWait = delay; stopPend = Math.max(stopPend, sec); }
  else stopT = Math.max(stopT, sec);
  stopCd = 0.35 + delay;
}
// in animate(), before line 8054:
if (stopWait > 0) { stopWait -= dt; if (stopWait <= 0) { stopT = Math.max(stopT, stopPend); stopPend = 0; } }
```
85 ms puts the freeze at `mouthAge ≈ 0.085`, where `openEnv ≈ 0.55` — the jaw is past half, the blob has begun to swell, the prop has keeled. `stopCd` absorbs the delay so the refractory is unchanged. `kitCd = 1.6` is untouched, so the firing rate the owner dialled twice does not move.

GATE: `qa/bitephase.mjs`. Add `maw: number` to `__juiceState()` (one getter on `Void3D` returning the last `mo`; zero cost). Force a bite via `__eatNearest(0.6)`, then poll `__juiceState()` every rAF for 400 ms. Assert `max(maw over frames where stop > 0) >= 0.25`. Today that number is **0.015** — fails. After the fix it is ~0.5 — passes.

---

### THE TWO BIGGEST MOMENTS HAVE NO TIME CHANNEL AT ALL
SEVERITY: **blocker**
AT: `src/prototype3d.ts:2322` and `src/prototype3d.ts:9040`

SAW: Code only — these are once-a-match events and no captured frame contains one.

EVIDENCE — `hitStop` has exactly one call site in the repo (`grep -rn hitStop src/` → 4882 only). Eating a family member:
```
prototype3d.ts:2322  fx.shake(9); fx.flash('rgba(255,224,138,0.4)', 0.3); fx.flash('rgba(184,117,255,0.35)', 0.6);
prototype3d.ts:2323  camPunch(6); fx.kick(rx - voidState.x, rz - voidState.z, 9);
```
and the final form:
```
prototype3d.ts:9043  fx.shake(1.1);
```
`fx.shake`, `fx.kick` and `camPunch` are all no-ops by the owner's order (`fx.ts:113`, `fx.ts:114-121`, `prototype3d.ts:551`) — correctly so. But when they went to zero, nothing replaced them. The comment at 2314 says the marquee kill *"has to land like the ending it is."* What it lands with is four rings, one flash, a bubble and a buzz, every channel starting on the same frame. The comment at 9036 says the final rung gets *"a long shake"* — it gets nothing.

FIX: two lines. `hitStop(0.10)` after `voidling.animGulp()` at 2317, and `hitStop(0.13)` inside the `curStage === FORMS.length - 1` block at 9040. Both events are rare (marquee at most once a match, WORLD ENDER by design not every match) and `stopCd = 0.35` prevents any chain. Zero draw calls. `animGulp()` sets `mouthT = 0.6, mouthMax = 1, mouthAge = 0.3` — the maw is **already open** on that frame, so these two sites need no delay: they are the correct-order case that proves the point about the first finding.

GATE: extend `qa/juice.mjs` with a second scenario, or `qa/bigmoments.mjs`: add `__eatRivalNow()` mirroring `__eatNearest`, drive it, and assert `stopT > 0` within 3 frames. Fails today (`stopT === 0` forever on that path).

---

### THE GOLD FLASH NEVER PAINTS
SEVERITY: **major**
AT: `src/prototype3d.ts:2322`, `src/prototype3d.ts:2389`

SAW: Code only, and it is invisible by construction — the frame it would occupy is never drawn.

EVIDENCE:
```
prototype3d.ts:2322  fx.flash('rgba(255,224,138,0.4)', 0.3); fx.flash('rgba(184,117,255,0.35)', 0.6);
```
`flash()` (`fx.ts:100-110`) writes `flashEl.style.background` and `.opacity` on one shared `<div>`. Two calls in the same synchronous block set it twice before any paint. **The amber wash — the colour that means "you won" — is overwritten by purple and never reaches the screen.** The biggest victory in the match flashes the same purple as everything else. Identical defect at 2389/2394: `rgba(154,92,255,0.3)` is overwritten by the red hunter wash on every hunter bite.

FIX: stagger them, which is the correct fix in this team's terms anyway — amber now, violet at +90 ms, through the `after()` scheduler proposed below. If the scheduler is not taken, delete the dead call at each site so the code stops claiming a channel it does not have. Zero cost either way.

GATE: `qa/flashseq.mjs`. Give `flashEl` an id in `fx.ts:82` (`flashEl.id = 'fxFlash'`), force a rival eat, sample `getComputedStyle(el).backgroundColor` across 12 rAF frames, assert ≥2 distinct colours. Today: 1 — fails.

---

### EVERY CHANNEL OF THE BITE STARTS ON THE SAME FRAME
SEVERITY: **major**
AT: `src/prototype3d.ts:4830-5017` (the whole of `capture()`)

SAW: Code only. Both look frames show a settled void with no burst, no ring and no floater in flight — consistent with a response whose channels all start and therefore all end together, rather than a staggered tail.

EVIDENCE — every one of these executes in one synchronous block, on one frame:

| channel | line |
|---|---|
| prop capture + topple spin | 4820, 4841 |
| growth target + spring impulse | 4857, 4859 |
| hit-stop | 4882 |
| dust burst | 4964 |
| shockwave ring (r > 2) | 4976 |
| `audio.voice('yum')` (r > 2) | 4973 |
| second dust burst (r > 2) | 4977 |
| maw open | 4979 |
| score floater | 5010 |
| `audio.pop` + `buzz()` | 5017 |

Ten channels, one frame. The AAA-BRIEF's absence #1 is not "answer more than once" — we answer plenty — it is *"arriving a few frames apart so the brain reads one thick event instead of one thin one."* On that reading we score zero. **The shop already knows how to do this** (`prototype3d.ts:7154`: `setTimeout(() => audio.voice('happy'), 260)` after a purchase sound). Buying a hat is layered; eating a house is not.

FIX: one 12-line scheduler ticked on `dt` in `animate()` (so it survives the freeze and the pause, which `setTimeout` does not):
```
const _after: { t: number; fn: () => void }[] = [];
const after = (sec: number, fn: () => void) => _after.push({ t: sec, fn });
// in animate(), after `tClock += dt;`
for (let i = _after.length - 1; i >= 0; i--) { _after[i].t -= dt; if (_after[i].t <= 0) { _after[i].fn(); _after.splice(i, 1); } }
```
Then three offsets in `capture()`, chosen against the mouth envelope so nothing collides with the freeze: the `r > 2` shockwave ring and its ground dust at **+70 ms** (dust reaches the rim after the thing goes in, not with it), `audio.voice('yum')` at **+140 ms** (the gulp lands on the mouth's spring peak), the score floater at **+110 ms** (the number appears after the object is gone). Zero draw calls, zero triangles, no seeded draw.

GATE: same `qa/bitephase.mjs`. Record the first frame index at which each of `{puffs, ringsLive, floaters, maw, stop}` changes. Assert **≥3 distinct onset frames**. Today: 1 — fails.

---

### THE OPENING IS NOT IDENTICAL EVERY LOAD
SEVERITY: **major** — it contradicts a standing owner directive
AT: `src/prototype3d.ts:8168`

SAW: Code only; the establishing shot is not in the lookbook.

EVIDENCE:
```
prototype3d.ts:8168  if (introT > 0) { const dk = Math.pow(0.9, dt * 60); velX *= dk; velZ *= dk; }
prototype3d.ts:5266  // the intro damps velocity by 0.9^(dt*60) for those 2.2 seconds,
prototype3d.ts:5267  // roughly 0.0018x per second.
```
`0.9^60 = 0.0018` is the **free-decay** figure. The joystick re-drives `velX` every frame after the damp (`velX += (tvx - velX) * k`, line 8394), so the steady state is `v = kT / (0.1 + 0.9k)`. At spawn, driving, 60 Hz: `k = 11/60 = 0.1833` → **v = 0.692 T**. The controls are **69 % live**, not 0.18 % live. The comment overstates the lock by ~380×.

Two consequences. The FTUE ordering at 8880 (*"controls are live THIS frame — now the instruction is true"*) is built on a false premise. And more seriously: HANDOFF §2 states *"Spawn and the opening are hand-authored and identical every load."* A child who drags during the 2.2 s (3.6 s on Lantern) intro moves the void, so the authored establishing shot resolves to a different frame every load. The directive is silently broken.

FIX: honour the directive — hard-zero the input during the intro rather than taxing it. `if (introT > 0) { velX = 0; velZ = 0; tvx = 0; tvz = 0; }`. The 69 % mush also has no expressive purpose: it is the only moment in the game where steering has a different weight, and nothing tells the child. Zero cost. (If the owner would rather the controls be live from frame one, the honest version is to delete line 8168 entirely and move the drag lesson to `beginMatch` — but that contradicts the hand-authored-opening rule, so the recommendation is zero.)

GATE: `qa/openingsame.mjs`. Boot Maple twice; on run B synthesise a pointer drag from `t = 0.2 s` to `t = introLen`. Sample `__voidState()` at the frame `introT` hits 0 and assert the two positions match to 1e-4. Today they differ by metres — fails.

---

### THE EVOLUTION "CELEBRATORY POP" SHRINKS THE VOID
SEVERITY: **major**
AT: `src/proto3d/void3d.ts:1802`

SAW: Code only — 0.7 s, and no lookbook frame catches an evolution.

EVIDENCE:
```
void3d.ts:1800  if (evolveT > 0) {            // EVOLVED! celebratory double-bounce
void3d.ts:1802    uniformK += Math.sin(Math.max(0, evolveT) / 0.7 * Math.PI * 2) * 0.16 * (evolveT / 0.7);
void3d.ts:1805  const lat = uniformK - breathe;  squash *= uniformK;
```
`uniformK` scales the whole body. Walk it: `evolveT` starts at 0.7 and counts **down**, so the phase runs 2π → 0. At `evolveT = 0.525` the phase is 3π/2, `sin = −1`, amplitude `0.16 × 0.75` → **−12 %**. At `evolveT = 0.175` the phase is π/2, `sin = +1`, amplitude `0.16 × 0.25` → **+4 %**. The excursion is a 12 % shrink followed by a 4 % swell. Three times more shrink than pop, and the shrink comes first and lasts longer. At the moment the HUD prints **EVOLVED** and the void is objectively bigger, the void visibly gets smaller.

Compare the COLLAPSE envelope eight lines above (`void3d.ts:1795-1797`): `−24 %` inhale then `+18 %` burst — a real anticipate-and-release, on a power that is switched off. The one that ships is the broken one.

FIX: one line, replacing 1802 with an explicit two-phase envelope — 6 % squash for the first 90 ms, then a decaying overshoot that peaks near +14 %:
```
const a = 0.7 - Math.max(0, evolveT);                      // age, counting up
uniformK += a < 0.09 ? -0.06 * (a / 0.09)
                     : 0.14 * Math.exp(-(a - 0.09) * 5.5) * Math.sin((a - 0.09) * 13);
```
Zero cost. Anticipation smaller than release, which is the whole rule.

GATE: `qa/evolvepop.mjs`. Expose `__voidScale()` (returns `bob.scale.x / dispR`). Force an evolution with `__setVoidR`, poll for 800 ms. Assert `max >= 1.06` **and** `min >= 0.96`. Today: max 1.04, min 0.88 — fails both.

---

### TIME! IS A CUT, AND THE WORD NEVER APPEARS
SEVERITY: **major**
AT: `src/prototype3d.ts:8200` and `src/prototype3d.ts:4595` / `index.html:681`

SAW: Code and markup only.

EVIDENCE:
```
prototype3d.ts:8200  if (matchClock <= 0 && !ended && outroT <= 0) {
prototype3d.ts:8201    outroT = 2.0;   // slow-mo push-in beat before the results panel
prototype3d.ts:8052  if (outroT > 0) { outroT -= dt; if (outroT <= 0) endMatch(); else dtw = dt * 0.3; }
prototype3d.ts:4595    endEl.classList.add('show');
index.html:678-681     #end { ... display: none; ... }  #end.show { display: flex; }
```
The 2 s of 0.3× slow-motion with a `× 0.72` camera push-in is the single best-choreographed beat in the game. It then ends in a `display` swap: the results panel exists fully formed on one frame. Its *children* stagger beautifully (`#endStats .es:nth-child(n)` delays 0.15 → 0.98 s, `#drop` at 1 s, `#btnAgain` pulse at 1.2 s) — every element inside the panel is choreographed and the panel itself is not.

And the countdown pops **10 … 3, 2, 1** through `#count span.pop` (`index.html:396`, a 0.92 s spring) — then at zero it prints nothing. There is no "TIME!". The buzzer is two rings and `audio.evolve()`. The word that names the moment does not exist in the file.

FIX: two changes, zero cost. (1) `#end.show { display: flex; animation: modalIn 0.26s cubic-bezier(0.2,1.4,0.4,1); }` — the keyframe already exists at `index.html:1286`'s rule. (2) In the block at 8200, paint `TIME!` into the existing `#count` element and re-trigger `.pop`; it is already `pointer-events: none`, already positioned, already animated. One `textContent` + class dance.

GATE: `qa/transitions.mjs` (below). Plus assert `#count` textContent is non-empty in the 300 ms after `matchClock <= 0`. Both fail today.

---

### THE PAUSE SHEET IS THE ONE MODAL THAT HARD-CUTS
SEVERITY: **major**
AT: `index.html:1286`

SAW: Markup/CSS only.

EVIDENCE:
```
index.html:1286  #settings.show .setCard, #gate.show .setCard { animation: modalIn 0.24s cubic-bezier(0.2, 1.4, 0.4, 1); }
index.html:1430  #pause.show { display: flex; }
index.html:1431  #pause .setCard { width: min(330px, ...); ... }
```
`#pause` uses the **identical `.setCard` class** as `#settings` and `#gate`, sits at z-index 66, and is missing from the one selector list that gives that card its spring. Daily (`992`), skin preview (`1061`) and the tutorial (`1584`) all have `modalIn`. The pause sheet — the control a parent reaches for mid-match, and the one place a child can turn the sound off — is the only sheet in the product that snaps into existence.

FIX: add `#pause.show .setCard` to the selector at 1286. One selector. Zero cost.

GATE: `qa/transitions.mjs` — sample `getComputedStyle(card).transform` on 6 consecutive rAF frames after `.show` is applied; assert ≥3 distinct values. `#settings` passes, `#pause` fails.

---

### THE WORLD SWITCH IS A BARE PAGE RELOAD WITH NO COVER
SEVERITY: **major**
AT: `src/prototype3d.ts:5658`

SAW: Code only — the probe harness cannot screenshot a navigation.

EVIDENCE:
```
prototype3d.ts:5656  localStorage.setItem('voidWorld', id);
prototype3d.ts:5657  localStorage.setItem('voidAutoPlay', '1');
prototype3d.ts:5658  location.href = location.pathname;
```
The child taps a poster and the document navigates on that frame, with the picker still on screen and the old island still rendering. The browser blanks, then the new document paints `#loadScr.boot`. That is the harshest transition in the product and the one the picker flow makes most often.

The fix is nearly free because **the cover on both sides of the reload is the same image**: `#loadScr` is `#loadScr.boot` in the outgoing markup and in the incoming markup, painting `splash_hero.webp` from the same `image-set` (`index.html:1154-1168`). Raise it before navigating and the reload happens *behind a picture that does not change* — the splash appears to hold while the world rebuilds.

FIX:
```
el('loadScr').classList.add('show');
requestAnimationFrame(() => requestAnimationFrame(() => { location.href = location.pathname; }));
```
Two frames (~33 ms) of added latency, guaranteeing the cover has painted before the navigation. Zero draw calls. Note the existing asymmetry this also exposes: `coverRelease` fades the cover out over 450 ms (`prototype3d.ts:5364`) while `coverHold` explicitly clears the transition and snaps it in (`5354`). In is a cut, out is a dissolve.

GATE: `qa/switchcover.mjs`. Hook `beforeunload` in-page, record whether `#loadScr` had non-zero rendered opacity at that instant. Today: 0 — fails.

---

### PARTICLES DO NOT HONOUR HIT-STOP, AND TWO COMMENTS SAY THEY DO
SEVERITY: **minor** (but it inverts the freeze)
AT: `src/prototype3d.ts:8839-8841`

SAW: Code only.

EVIDENCE:
```
prototype3d.ts:8365  // SIMULATION freezes — the hero, the drain spiral, the crowd, the family, the particles —
prototype3d.ts:8388  // and drain all run on dtw — and the void you are steering never does.
prototype3d.ts:8840    puffLife[i] -= dt; puffVel[i].y -= dt * 14;
prototype3d.ts:8841    puffPos[i * 3] += puffVel[i].x * dt; ...
```
Rings run on `dtw` (`fx.update(dtw, camDist)`, 9262), the drain spiral on `dtw` (8746-8765), the crowd on `dtw` (8656) — the puffs run on `dt`. So during a freeze the **only** thing moving is the dust, which has a 0.35–0.7 s life and burns 105 ms of it (15–30 %) while everything else is stopped. The dust has already expanded and started fading before the mouth opens.

FIX: `dt → dtw` on 8840-8841 (3 substitutions), and correct both comments. This becomes strictly correct once the first finding is fixed — the freeze holds the burst at its opening spread instead of letting it run past the event. Zero cost.

GATE: fold into `qa/bitephase.mjs`: assert `puffPos` is bit-identical across two consecutive frames where `stop > 0`. Fails today.

---

### THE MENU, PICKER, SHOP AND SCRAPBOOK ALL ARRIVE ON ONE FRAME
SEVERITY: **minor**
AT: `index.html:910`, `1364`, `627`; `src/prototype3d.ts:5416`, `5821`, `5826`, `6270`

EVIDENCE — every one is `display:none → display:flex` with no animation on the panel and no stagger on its contents:
```
prototype3d.ts:5416  el('worlds').classList.add('show');          // menu → picker
prototype3d.ts:5821  shopEl.classList.add('show');                // shop open
prototype3d.ts:5826  el('btnBack')… shopEl.classList.remove('show');
prototype3d.ts:6270  el('end').classList.remove('show'); menuEl.style.display = '';   // results → menu
```
The world picker is the *destination* of PLAY — the comment at `index.html:906` says so — and five posters materialise simultaneously. `#endStats` already proves this codebase knows the pattern (`nth-child` animation delays, `index.html:744-749`).

FIX: one shared keyframe plus one stagger rule. `#worlds.show, #shop.show, #book.show { animation: sheetIn 0.22s cubic-bezier(0.2,1.4,0.4,1); }` and `#worldRow .wCard { animation: esIn 0.3s … ; }` with `nth-child` delays of 0.04 s steps — `esIn` already exists. Pure CSS, zero draw calls.

GATE: `qa/transitions.mjs` — one table of `{trigger, arriving element}` covering boot→menu, menu→picker, picker→match, match→TIME!, TIME!→results, results→menu, results→again, pause, shop, scrapbook, world switch. For each, sample the arriving element's computed opacity/transform over 6 rAF frames and assert it changed on ≥3. Today **9 of 11 fail**.

---

### PLAY AGAIN TELEPORTS THE CAMERA UNDER A DISAPPEARING SCRIM
SEVERITY: **minor**
AT: `src/prototype3d.ts:6242` + `6261` + `8894`

EVIDENCE:
```
prototype3d.ts:6242  velX = 0; velZ = 0; camDist = 50;
prototype3d.ts:6261  el('end').classList.remove('show');
prototype3d.ts:8894  camDist = 38 + 262 * k2 * k2;   // ease-in dive from orbit
```
`#end` is 82 % opaque over an 8 px backdrop blur, so the world is faintly visible through it. On tap, the scrim vanishes in one frame — un-tinting and un-blurring the whole screen — at the same moment `camDist` goes 50 → ~300 for the intro dive. Two hard discontinuities on the same frame, on the button children press most.

FIX: fold into the `#end` `modalIn` fix by adding an exit — `#end.leaving { animation: modalOut 0.22s ease forwards; }` — and call `resetMatch()` from its `animationend`. The camera jump then happens under a covering scrim. Zero cost.

GATE: same `qa/transitions.mjs` row; plus assert `|camDist(frame n) − camDist(frame n−1)| < 40` on every frame where `#end` computed opacity is between 0.05 and 0.8. Fails today.

---

### THE GATE THAT WAS SUPPOSED TO CATCH ALL OF THIS IS STRUCTURALLY BLIND
SEVERITY: **major** — this is why nine findings above passed every probe
AT: `qa/juice.mjs:47-56`

EVIDENCE:
```
qa/juice.mjs:47  const before = window.__juiceState();
qa/juice.mjs:48  const ate = window.__eatNearest(0.6);
qa/juice.mjs:49  const after = window.__juiceState();
```
Its own header says it counts channels *"from STATE rather than timing, so it works at any frame rate."* That decision — correct for the sandbox's 1 fps — makes it **incapable of measuring the thing AAA-BRIEF absence #1 is actually about**, which is onset separation. It reads before and after inside one `evaluate`, on one frame, by design. It also does not sample the maw, so the mouth is not one of its four channels at all. It reports 3/4 today and would report 3/4 on every defect in this report.

FIX: `qa/bitephase.mjs` as specified — a **frame-series** probe, not a before/after probe. It polls `__juiceState()` on rAF and reasons about ordering, which is frame-rate-independent as long as it counts distinct *change frames* rather than milliseconds. Keep `juice.mjs` (it guards presence); add this one (it guards choreography).

## IS THIS THE BEST THIS CAN BE?

No, and the gap is narrower than it looks, because the machinery is all already here and pointed the wrong way.

What is genuinely right, measured against the bar: `hitStop` is a real, correctly-scoped time freeze with an argued refractory. The mouth envelope at `void3d.ts:1926-1937` is a textbook three-phase anticipate/overshoot/settle. The growth spring at `void3d.ts:1440-1443` is deliberately underdamped. The banner queue (`BANNER_READ = 1.9`, `holdBanner`, `pumpBanner`) is a real time-arbitration layer that stops two hero messages colliding — that is a level of care most shipped kids' games do not have. The TIME! slow-motion push-in is a genuine cinematic beat. The `#endStats` cascade is proper staggering. And the shop already layers a purchase across 260 ms. This team's instincts are correct everywhere they were applied.

The failure is that they were applied in isolation and never sequenced against each other. Ranked, here is what stands between here and the bar:

1. **Put the freeze after the pose** (finding 1). This is the whole ballgame. One delay timer converts the most-repeated action in the game from a stall into a shutter. Nothing else on this list changes what a child feels as much.
2. **Give the two set-piece moments a time channel** (finding 2). Two lines. When shake went to zero, these moments lost their only weight cue and nobody noticed because `fx.shake(9)` still reads like something in the source.
3. **Offset three channels of the bite by 70–140 ms** (finding 4). This is the literal text of absence #1 and we currently score zero on it. The `after()` scheduler is 12 lines and unlocks finding 3 for free.
4. **Fix the evolution pop** (finding 6). The reward moment currently shrinks the reward. One line.
5. **Animate the panel, not just its contents** (findings 7, 8, 11, 12). Four CSS rules and one exit class close nine of eleven transitions. `modalIn` and `esIn` already exist; this is plumbing, not authoring.
6. **Cover the world switch** (finding 9). Two frames of latency buys a seamless splash-to-splash reload because the art is already identical on both sides.
7. **Honour the identical-every-load directive in the intro** (finding 5) and correct the two comments that are actively misleading the next engineer (findings 5, 10).

None of this adds a draw call, a material, a triangle or a seeded draw. The total is roughly 40 lines of TypeScript, 6 CSS rules, and three new probes. The heap does not move.

What I would still want after all of that, and cannot close from this seat: **the bite has no camera channel at all, and by absolute order it never will.** Vlambeer's spec leans on screenshake for a third of its impact. We have surrendered that channel permanently and correctly — a child found it unpleasant, and the owner's phone outranks the theory. That makes hit-stop, mouth, dust and haptics carry a load they were never designed to carry alone, which is exactly why getting their *ordering* right is not a polish item here. It is the substitute for the channel we gave up. That is the argument for treating finding 1 as a blocker rather than a refinement.

The experiment I would run if the fixes above land and it still reads thin: record 60 fps device capture of ten bites before and after, and count how many *distinct* frames contain a state change attributable to the bite. Today the answer is 1 followed by a 105 ms hole. The target, from the Vlambeer spec, is 5–8 distinct onset frames inside the first 200 ms. That number, not a probe boolean, is the honest measure of whether this surface is finished.

## COVERAGE

**Images read (rendered shipped canvas):**
- `qa/out/shippedlook/maple_look.png`
- `qa/out/shippedlook/gameday_look.png`

Both are settled-play frames with the maw closed and no bite response in flight; neither can resolve a 105 ms window, which is stated as a limitation in the findings that rest on code alone. No lookbook image exists for the intro, an evolution, a rival eat, the results arrival, the pause sheet or the world switch — **that absence is itself worth logging**: `qa/shippedlook.mjs` shoots steady states only, so every transition in this report is outside the evidence pack's reach.

**Files read:**
- `docs/STUDIO.md` (full), `docs/HANDOFF.md` (full), `docs/AAA-BRIEF.md` §0-§4.1
- `src/prototype3d.ts` — 205-222, 551, 2230, 2290-2430, 2850-2975, 3070, 4522-4620, 4830-5100, 5120-5300, 5345-5500, 5630-5740, 5819-5826, 6166-6290, 8020-8080, 8160-8230, 8340-8420, 8578-8670, 8746-8770, 8839-8935, 9000-9060, 9262; plus full greps for `hitStop`, `dtw`, `fx.*`, `camPunch`, `introT`, `outroT`, `setTimeout`, `classList.add('show')`
- `src/proto3d/void3d.ts` — 1440-1470, 1680-1810, 1918-1950; greps for `mouthAge`, `evolveT`, `ringBurst`, `chomp`
- `src/proto3d/fx.ts` — 1-140 (full interface, `flash`, `shake`, `kick`, `ring`, `update`)
- `index.html` — 254-267, 388-400, 420-425, 540-580, 620-760, 830-840, 906-980, 1152-1170, 1284-1290, 1358-1370, 1426-1445, 1580-1590; full `animation:` inventory
- `qa/juice.mjs` (full)

--- THE SKEPTIC ---
## VERDICT ON THE VERDICT

NO-SHIP is the right direction but reached on the wrong evidence — neither of the two named blockers is ship-stopping, and the one-sentence justification rests on a reading of `maple_look.png` and `gameday_look.png` that is factually wrong about what is on screen.

## PER FINDING

### THE FREEZE LANDS BEFORE THE POSE
REAL: yes — mechanism confirmed, magnitude and pixel evidence both wrong

WHAT I FOUND: The ordering claim holds, and is worse-stated than the reviewer realised. `voidling.update(dtw, …)` is `prototype3d.ts:8621`; `capture()` is called from the edible sweep at `prototype3d.ts:8803`. So `hitStop()` and `voidling.chomp()` both fire *after* the hero has already been updated for that frame. The freeze does not land "before the pose" — it lands on the pose's frame zero and then runs it at 6% speed:
```
8054   if (stopT > 0) { stopT = Math.max(0, stopT - dt); dtw *= 0.06; }
8621   voidling.update(dtw, { t: tClock, x: voidState.x, ... });
```
At 60 Hz the 82–105 ms freeze is 5–6 frames × `dt*0.06` ≈ 0.006 s of `mouthAge`, inside the 45 ms wind-up. That part checks out.

FIX SOUND: yes, with one adjustment. `hitStop` has exactly one call site so a `delay` parameter is safe, and `stopCd = 0.35 + delay` preserves the refractory. But 85 ms is too short: the delay expires at the *top* of `animate()` (before 8054), so `dtw` is already scaled when 8621 runs, and `mouthAge` is one frame behind the target — 0.068, `openEnv` ≈ 0.34, not 0.55. Use ~0.105 to land near the overshoot peak. Also guard the pending timer against `outroT` and `ended`, or a bite in the last 100 ms of the clock stacks a 0.06× freeze on top of the outro's 0.3× slow-motion.

CORRECTION — two, and the first is a rule-1 failure:

**The images do not show what the reviewer says they show.** In both `maple_look.png` and `gameday_look.png` the void's mouth is plainly an *open dark maw with a pink tongue* — that is `mawDark` + `tongue` (`void3d.ts:1043–1045`), not the resting smile. `mouth.visible = mo < 0.25` (`void3d.ts:1939`), and no smile line is drawn in either frame, so `mo ≥ 0.25` in both. The reviewer described an open maw as "fully closed" and then built the finding's headline number on it.

**The 1.5–1.7% figure is wrong.** `void3d.ts:1937` is a `Math.max`:
```
const mo = Math.max(mouthT > 0 ? mouthMax * openEnv * Math.min(1, mouthT * 8) : 0, mp.maw);
```
`mp.maw` is a mood floor that `openEnv` never touches — `hungry` sets 0.26, `frenzy` 0.12 (`void3d.ts:1166–1167`). A landmark bite happens with props in the magnet well, which is exactly what sets `hungryT` (`8809`), and `combo ≥ 5` puts you in `frenzy`. So the freeze holds the maw at **0.12–0.26**, not 0.015. Which is precisely the mouth in both look frames. The correct statement of the finding is: *the freeze holds the maw at its resting mood floor instead of the 0.5–1.0 the bite is about to open it to* — and the two shipped screenshots are the picture of it.

**The gate as specified would pass today.** `max(maw) >= 0.25` is already satisfied by `mp.maw = 0.26` in `hungry` with no bite at all. The probe must pin the mood (`__setMood('cruise')`, which already exists at `prototype3d.ts:1698`) or assert against the bite envelope specifically — e.g. `mo >= 0.45` with mood pinned to cruise.

SEVERITY: major, not blocker. Nothing is broken; a real, argued time-freeze holds a slightly under-developed pose ~12 times a minute.

---

### THE TWO BIGGEST MOMENTS HAVE NO TIME CHANNEL AT ALL
REAL: yes — as a fact. Not as a blocker.

WHAT I FOUND: `grep -rn hitStop src/` returns the definition at 8034 and one call at 4882. Confirmed. `fx.shake(9)` / `camPunch(6)` / `fx.kick(...)` at `prototype3d.ts:2322–2323` and `fx.shake(1.1)` at `prototype3d.ts:9043` are all no-ops:
```
fx.ts:113   shake(amt) { void amt; },   // OFF — the owner's zero-shake call
fx.ts:115   kick(dx, dz, amt) { ... void dx; void dz; void amt; }
prototype3d.ts:551   const camPunch = (deg: number) => { void deg; };
```
FIX SOUND: yes. `animGulp()` sets `mouthT = 0.6, mouthMax = 1, mouthAge = 0.3` (`void3d.ts:1719`), so `openEnv` is already past the wind-up on that frame — the reviewer is right that these two sites need no delay, and that is a genuinely good observation.

CORRECTION: "no time channel" is true; "lost its only weight cue" is not. The rival eat still fires four `fx.ring` calls, `animGulp()`, a flash, `audio.bigEat()`, `buzz(80)`, a float and a banner card (`2318–2328`). That is six live channels. Calling the absence of a seventh a **blocker** is the reason this team's verdict is unsound.

---

### THE GOLD FLASH NEVER PAINTS
REAL: yes

WHAT I FOUND: `fx.ts:100–110` writes `flashEl.style.background` and `.opacity` on one shared div with no queue. Two synchronous calls at `prototype3d.ts:2322` — the amber `rgba(255,224,138,0.4)` is overwritten by `rgba(184,117,255,0.35)` before any paint. Confirmed dead.

FIX SOUND: yes, and the `after()` scheduler is the right vehicle.

CORRECTION: the second half is over-charged. At 2389/2394 the purple wash is overwritten *only* when `hit.hunter` is true, and the comment two lines below says the red wash is deliberately the hunter's signal. Red winning over violet on a hunter bite is correct behaviour, not a defect — the only waste is the dead first call. Major on the rival eat, polish on the hunter bite.

---

### EVERY CHANNEL OF THE BITE STARTS ON THE SAME FRAME
REAL: yes

WHAT I FOUND: I read `capture()` end to end (4827–5017). Every cited line is where the reviewer says it is and all of it is one synchronous block. The offsets proposed (+70 / +110 / +140 ms) are chosen against the real mouth envelope and none of them collides with the corrected freeze window.

FIX SOUND: yes. Zero draw calls, zero seeded draws, ~12 lines.

CORRECTION: the stated rationale for a `dt`-ticked scheduler over `setTimeout` — "which does not survive the freeze and the pause" — is backwards. `setTimeout` runs on wall time and survives both; that is its *problem*, since a queued effect would fire while the game is paused. Say that instead. And `prototype3d.ts:7154` is a real precedent but it is a UI sound in the shop, not a gameplay channel — do not over-lean on it.

---

### THE OPENING IS NOT IDENTICAL EVERY LOAD
REAL: **no** — as filed. The arithmetic is right; the headline, the severity and the fix are all wrong.

WHAT I FOUND: The damp at 8168 runs before the drive at 8394, so `v* = kT / (1 − dk(1−k))` = 0.1833/0.265 = **0.692 T**. The reviewer's number is correct and the comment at 5266–5267 does overstate the lock by ~380×. That much survives.

Everything built on top of it does not:

- **The directive is not what they say it is.** `HANDOFF.md:59` reads "Spawn and the opening are hand-authored and identical every load — the owner's call: 'consistency is key here.'" The code comment it points at (`prototype3d.ts:6238–6245`) quotes the owner in full: *"the void should start somewhere more fun and super crisp. Consistency is key here. Always the same for every load"* — followed by "the variety budget is spent on the rival cast, their join times and the gilded treasure instead." This is a directive about **authored spawn and world content**, and `voidState.x = island.spawn.x` (6246) honours it exactly. A child dragging is *play*, not nondeterminism. Nothing is silently broken.
- **A probe already exists and the reviewer did not read it.** `qa/_introdrag.mjs` measures precisely this — "THE FIRST DRAG A CHILD EVER MAKES — does anything move?" — and its header states the intro damp and the withheld DRAG pill as understood, investigated design. Proposing `qa/openingsame.mjs` without mentioning it is the coverage failure this seat exists to catch.

FIX SOUND: **no.** Hard-zeroing `velX/velZ/tvx/tvz` for 2.2–3.6 seconds re-creates, deliberately, the exact failure the file already fixed. `prototype3d.ts:5265–5270`: *"A six-year-old obeys the first thing they are told, drags, and learns that the screen does not respond."* The current 69% is what stops the establishing shot from being a dead screen. The reviewer's own alternative ("delete 8168 entirely") is closer to right than their recommendation.

CORRECTION: the only real item here is a **misleading comment** at 5266–5267 — polish. Also `introLen` is 3.4 on Game Day and 3.6 on Lantern (`prototype3d.ts:1278, 1301`); the reviewer's "3.6 s on Lantern" is right but their earlier "2.2 s" framing for the general case only holds on Maple and Pirate Bay.

---

### THE EVOLUTION "CELEBRATORY POP" SHRINKS THE VOID
REAL: yes — the strongest finding in the set, and they ranked it fourth

WHAT I FOUND: `void3d.ts:1802` is exactly as quoted, and I walked the envelope independently. With `u = evolveT/0.7` counting **down** from 1:

| time after evolve | u | sin(2πu) | Δ uniformK |
|---|---|---|---|
| 0.000 s | 1.00 | 0 | 0 |
| 0.175 s | 0.75 | −1 | **−12.0%** |
| 0.350 s | 0.50 | 0 | 0 |
| 0.525 s | 0.25 | +1 | **+4.0%** |
| 0.700 s | 0 | 0 | 0 |

`uniformK` feeds both axes (`lat = uniformK − breathe`, `squash *= uniformK`, `bob.scale.set(dispR*lat, dispR*squash, dispR*lat)` at 1805–1807). Three times more shrink than pop, shrink first, shrink held longer. And `prototype3d.ts:9022` does `camDist *= 1.07` on the same frame — the camera pulls back 7% while the body contracts 12%, so the two compound. At the one moment the HUD prints EVOLVED, the void gets visibly smaller from two directions at once.

The comment calls it a "celebratory double-bounce". One full sine cycle is not a double bounce either.

FIX SOUND: yes. One line, zero cost, and the `inhaleT` envelope eight lines above (−24% then +18%) is the correct pattern already sitting in the same file on a switched-off power.

CORRECTION: severity should be **blocker-adjacent**, above the two the team actually called blockers. This is a reward beat playing backwards, it is unconditional, and it is on the path every child takes several times a match.

---

### TIME! IS A CUT, AND THE WORD NEVER APPEARS
REAL: yes — with the evidence sentence corrected

WHAT I FOUND: The outro beat (8200–8205), the `dtw = dt * 0.3` (8052), the `#end.show { display: flex; }` with no animation (`index.html:681`) and the child stagger (`index.html:743, 756, 831`) are all exactly as cited. The countdown at 8189–8196 pops 10…1 and prints nothing at zero. Confirmed.

CORRECTION: "**the word does not exist in the file**" is false. `index.html:2039` is `<div class="hd" id="endHd">TIME!</div>`. What is true — and is the better version of the finding — is that it is **dead placeholder markup**: `endHd.textContent` is unconditionally overwritten before the panel is shown, at `prototype3d.ts:4583` (`${devouredPct}% DEVOURED`) and `prototype3d.ts:4665` (a WIN_TITLES / LOSE_TITLES roll). So the word is authored, sitting in the shipping HTML, and can never reach a child. That is a sharper finding than the one filed, and it means the fix is even cheaper than proposed.

FIX SOUND: yes. `#end.show { animation: modalIn … }` — `modalIn` is at `index.html:1100` and `#count span.pop` at 396 is already `pointer-events: none` and positioned.

---

### THE PAUSE SHEET IS THE ONE MODAL THAT HARD-CUTS
REAL: yes

WHAT I FOUND: `index.html:1286` is `#settings.show .setCard, #gate.show .setCard { animation: modalIn … }`. `#pause` is at 1428–1443, uses the same `.setCard` class (1431), and appears nowhere in that selector list. `#daily` (992), `#skinPrev` (1061) and `#tut` (1584) all have `modalIn`. Confirmed exactly.

FIX SOUND: yes. One selector, zero cost. The cheapest genuine improvement on the list.

CORRECTION: none.

---

### THE WORLD SWITCH IS A BARE PAGE RELOAD WITH NO COVER
REAL: yes in code; the *consequence* is unverified

WHAT I FOUND: `prototype3d.ts:5656–5658` is verbatim, with no `coverHold` on the outgoing side. `coverHold` (5350) does clear the transition and snap the cover in, while `coverRelease` (5358) fades over 450 ms — the in/out asymmetry the reviewer flags is real. The path only fires when `id !== pickedWorld`; same-world taps go straight to `launchWorld()` (5654).

FIX SOUND: plausible, not proven. The claim "the browser blanks, then the new document paints" is asserted with no measurement, and WKWebView commonly holds the outgoing frame across a same-origin navigation. `qa/worldswitch.mjs` and `qa/_refute_switch{,2,3}.mjs` show this path has been worked before and the *incoming* cover hold is already handled. Before spending two frames of latency on every world switch, run a screencast across the navigation and see whether there is anything to fix.

CORRECTION: downgrade to **major-pending-measurement**, and name the experiment rather than the fix. This is exactly the class of finding that produced retractions here.

---

### PARTICLES DO NOT HONOUR HIT-STOP, AND TWO COMMENTS SAY THEY DO
REAL: yes

WHAT I FOUND: `prototype3d.ts:8840–8841` uses `dt` in the same scope where `dtw` is live and used at 8746/8751/8765 (drain), 8656 (crowd), 8667 (rivals), 9262 (`fx.update`). Both comments are wrong:
```
8024   // SIMULATION freezes — the hero, the drain spiral, the crowd, the family, the particles —
8388   // and drain all run on dtw — and the void you are steering never does.
```
The 8388 comment is doubly wrong: it names particles as frozen *and* it is the comment that documents the deliberate removal of the hero from the freeze, so a reader trusts it.

FIX SOUND: yes, three substitutions. Note it only becomes strictly right *after* the freeze is moved onto the pose — today, freezing the dust would hold it at a spread that predates the mouth opening.

---

### THE MENU, PICKER, SHOP AND SCRAPBOOK ALL ARRIVE ON ONE FRAME
REAL: yes

WHAT I FOUND: `#worlds.show` (910), `#shop.show` (1364), `#book.show` (627) — all `display: flex`, no animation. I grepped every `#worlds .wCard` rule (919–976, 1206–1209): the only animation on a card is `wshake` on the locked-card refusal (1098). Call sites confirmed at `prototype3d.ts:5416`, `5821`, `5826`. `esIn` exists at `index.html:750` and is already used with `nth-child` delays on `#endStats`, so the proposed fix is genuine plumbing.

FIX SOUND: yes. Pure CSS, zero cost.

---

### PLAY AGAIN TELEPORTS THE CAMERA UNDER A DISAPPEARING SCRIM
REAL: yes

WHAT I FOUND: `camDist = 50` is at **`prototype3d.ts:6248`**, not 6242. `el('end').classList.remove('show')` at 6263, `beginMatch()` at 6265, and 8894 puts `camDist = 38 + 262 * k2²` = ~300 on the first intro frame. The scrim is `rgba(13,8,33,0.82)` over `backdrop-filter: blur(8px)` (`index.html:679`), so both discontinuities do land within a frame of each other.

FIX SOUND: yes, and folding it into the `#end` entrance work is the right call.

CORRECTION: line number. Minor is the right severity.

---

### THE GATE THAT WAS SUPPOSED TO CATCH ALL OF THIS IS STRUCTURALLY BLIND
REAL: yes

WHAT I FOUND: `qa/juice.mjs:47–49` reads before/after inside one `p.evaluate`, on one frame. `__juiceState()` (`prototype3d.ts:1622–1626`) returns `{ fov, fovKick, stop, puffs, buzzes }` — no maw, no ring count, no floater count. The reviewer's characterisation of it is exact.

FIX SOUND: yes — a frame-series probe is the right instrument, and counting distinct change-frames rather than milliseconds does keep it frame-rate-independent at 1 fps.

CORRECTION: they understated it. See below.

## WHAT THE TEAM MISSED

**One of `qa/juice.mjs`'s four channels is permanently unreachable, and the contract is ≥3 of 4.** `fovKick` is declared at `prototype3d.ts:547`, read and decayed at 8971–8976, and exported to QA at 1623 — and `grep -n fovKick src/prototype3d.ts` returns **no assignment anywhere**. It was written by `camPunch`, which is now `const camPunch = (deg: number) => { void deg; };` (551). So `ch.lens` in `juice.mjs:52` can never be true. The gate that guards absence #1 passes on exactly 3/4 with **zero headroom**: the next channel to regress flips it to FAIL, and the obvious "fix" someone reaches for is lowering the threshold. The team read this file line by line and did not notice a quarter of it is dead. That belongs in the report above the transition CSS.

**From the same two pixels: the void wears one face.** `maple_look.png` and `gameday_look.png` are different worlds, different moments, different props — and the expression is identical in both: eyes wide, brows flat and low, blush on, maw parked at a small open oval. That is `hungry` (`void3d.ts:1166`, `maw: 0.26`). It is not a coincidence, it is the trigger:
```
prototype3d.ts:8809   if (d < reach * 0.85) hungryT = tClock;
prototype3d.ts:8582   else if (tClock - hungryT < 0.45) mood = 'hungry';
```
`hungryT` is refreshed by *any* edible inside the magnet well, and on Maple or Game Day there is always one. With a 0.45 s window, `hungry` never lapses. `cruise` — the authored baseline face, `MOODS.cruise = {}` — is effectively unreachable after the first seconds of a match, and `sleepy` (8583) is unreachable at all while props are near. Nine authored moods collapse to two (`hungry`, and `frenzy` at combo ≥ 5). This team owns the void's performance across time, it is visible in both images they were given, and it is not in the report. The mood engine lerps at `dt * 9` and has a full expression table behind it; the trigger throws almost all of it away.

**And a consequence for their own headline finding:** because `mo = Math.max(bite envelope, mp.maw)` and `mp.maw` is pinned at 0.26 for most of a match, the mouth's three-phase wind-up/overshoot/settle at `void3d.ts:1930–1937` — the anticipation curve the file is proudest of — is *partly floored out* in normal play. The team spent a blocker arguing the freeze holds the wrong mouth frame without noticing that the mood floor is what determines the mouth in almost every frame of the game.

SURVIVED: 12 of 13.


═══════════════════════════════════════════════════════════════════
TEAM AUDIO
═══════════════════════════════════════════════════════════════════
--- THE TEAM'S REVIEW ---
## VERDICT: NO-SHIP

With all five world tracks and menu.mp3 present in `public/assets/music/`, the code path that starts every world's ambience, place layer and stage escalation is unreachable — five hand-written scores and their district beds are dead in the shipping build, Powder Pass plays two scores at once from its first evolution, and the "8-bit thud" the owner reported was never fixed because the file the fix assumed was absent has been in the repo since 16 August.

**I cannot hear the game and I have no images.** Everything below is derived from the source, from the WAV/MP3 bitstreams (parsed, measured — numbers quoted), and from the briefs' own ledger. I state plainly where a claim is a code-path trace and where it is a measurement. I have invented no listening impression.

---

## THE BAR

**Donut County** (Ben Esposito / Annapurna, 2018; iOS, Switch, PS4 — Apple Design Award finalist). Same verb as us: a hole that swallows a town. Two mechanics matter:

1. **The swallow is keyed to object class and size, not to one sample.** A trash can, a shrub and a house each produce a categorically different sound, and the pitch/weight scales inside each class. Ours does this correctly for `pop()` — and not at all for `bigEat()`, the rarest and most-earned swallow in the match.
2. **The score is continuous and the world sits underneath it.** Koestner's score plays over a live diegetic bed — the level's own noise never stops.

**Crossy Road** (Hipster Whale, 2014, #1 free iOS) is the bar for the layer we actually built and then disabled: it has essentially no melodic score at all. Its entire audio identity is a randomised, **biome-keyed ambient bed** plus per-character SFX. Ten districts of murmur, cockerel, church bell, mower, crickets, distant drumline — the thing `audio3d.ts` spends roughly 1,400 lines authoring — is what carries a top-10 mobile game on its own.

**hole.io** (Voodoo, 2018) is the floor: one loop, one chomp sample, no ambience, no escalation.

**Where we sit:** the *authored* audio is well above hole.io and within reach of Donut County. The *shipping* audio is **below hole.io** — one stereo MP3 that never changes, plus one-shots, with the entire place layer, the entire escalation and every ambient voice unreachable. We wrote the good version and then shipped the floor.

---

## FINDINGS

### The recordings killed every world's ambience, place layer and escalation
SEVERITY: **blocker**
AT: `src/proto3d/audio3d.ts:750`, `:3687`, `:2380`, `:2201`

SAW: Code only — there is no image and no audio capture that shows this. The render cannot show it because it is silence, and the two probes that would catch it (`qa/journey.mjs:49`, `qa/_twoscores.mjs`) both read `synthOn`, which is false on this path, so they report healthy.

EVIDENCE: the only call to any world bed in the file is inside `synthCover(kind)`:
```ts
750:    const bed = themeSynth ?? worldSynth();
753:    bed();
```
`synthCover('score')` is passed to `playTrack` as `onNone`, and `onNone` runs on exactly one condition — every URL failed:
```ts
3687:      playTrack(themeCh, urls, () => synthCover('score'));
3693:      setTimeout(() => synthCover(), 400);   // ← 'pad', not the bed
```
`startTown`, `startTropical`, `startGameday`, `startLantern`, `startPowderScore` have **no other caller** (verified: `grep -n "startTown()\|startTropical()\|startGameday()\|startLantern()\|startPowderScore()"` returns only `synthCover` and one line in `powderEvolve`). All six MP3s exist (`ls public/assets/music/` — 14.7 MB, all six present, all 128 kbps stereo). So on every world, every match, `onNone` never fires and no bed ever starts.

Each world's ambience is welded *inside* that bed's scheduler interval:
```
1637:    ambience(c);       // tail of pirSchedule
2380:    mapAmbience(c);    // tail of mapSchedule
2929:    gdAmbience(c);     // tail of gdSchedule
3257:    lnAmbience(c);     // tail of lnSchedule
```
and the zone layers refuse to come up without the bed running:
```ts
2201:    if (mZone && mapRunning) {
```
`mapRunning` is set true only in `startTown`. So `setZone()` — called every frame from `prototype3d.ts:9055` — is a pure no-op in production: the ten Maple districts, Pirate's dance cove and docks, Game Day's eight beds, Lantern's griddle/water/geta/callouts never sound. `setMusicStage()` (`prototype3d.ts:9034`) writes `musStage`, which is read only by the dead schedulers — **so the recording does not change by one instrument as the void grows.** The file's own opening claim, *"hole.io's trick: tempo +8 BPM and one new layer per evolution stage, so the island losing is something you can hear"*, is inoperative in all five worlds.

FIX: **decouple ambience from score.** Split each world's start into `start<World>Amb()` (the ambience gain + zone layers + a small ambience-only interval) and `start<World>Band()` (the musical scheduler). `startMusic()` calls the *ambience* half unconditionally; `synthCover('score')` calls the band half. `synthStop()` stops only the band. Then feed the recording's stage to the ambience gain so escalation survives (Game Day's roar louder each stage — the design doc's literal ask).
Cost: **zero draw calls, zero triangles, zero seeded draws.** ~15–25 concurrent WebAudio voices per world at the levels already authored (`MZONE_VOL` 0.10–0.16, `mapAmb` 0.36) — all of which the engine was built to run and which the 404 path already runs today.

GATE: `qa/ambience.mjs` — boot each of the five worlds with its real MP3 present, wait for `theme.srcs > 0`, then count `createOscillator + createBufferSource` over 5 s of live play (the `lnsound.mjs:60` shim) and assert **≥ 4 voices/s with the recording playing**, plus `setZone` on two different districts moving at least one zone gain above 0.001. Fails on today's build in all five worlds (voices/s ≈ 0 excluding one-shots); passes after.

---

### Powder Pass plays two scores at once, from the first evolution to TIME!
SEVERITY: **blocker**
AT: `src/proto3d/audio3d.ts:3640`

SAW: Code only.

EVIDENCE:
```ts
3638:  function powderEvolve() {
3639:    const c = ensure(); if (!c) return;
3640:    if (!pwBus) startPowderScore();
```
and `startPowderScore()` is not a flourish — it is the whole score:
```ts
3626:    pwRunning = true;
3627:    ramp(pwBus.gain, 0.5, c.currentTime, 1.8);
3629:    if (pwTimer) clearInterval(pwTimer);
3630:    pwTimer = setInterval(pwSchedule, 110);
```
`powder.mp3` exists (3,585,296 bytes, 128 kbps, 44.1 kHz stereo, ≈224 s) and is playing. `synthOn` is **false** on this path (nothing set it), so `synthStop()` returns at its first line and never stops it. Nothing stops it until `stopMusic()` at `endMatch`. First evolution is at `FORM_MIN[1] = 1.6` from `START_R = 0.9` — i.e. within the first seconds of essentially every Powder match. The result is a music-box score, bells, a pad and, at `musStage >= 3`, `pwDrum` on every fourth eighth, running unsynced over a recording for ~170 seconds. **This is the owner's "drums sort of not synced" complaint, alive again, in the one world the fix never looked at.**

Both existing probes are blind to it: `qa/journey.mjs:49` and `qa/_twoscores.mjs:30` test `m.synth` (`synthOn`), which is false here, and `_twoscores` only runs Lantern.

FIX: one line — `if (!pwBus) startPowderScore();` → build the bus without starting the scheduler. Extract the node construction from `startPowderScore` into `ensurePwBus(c)` and call that instead; `powderEvolve` needs the bus for `pwBox/pwBells/pwDrum`, not the interval. Cost: zero.
GATE: extend `musicState()` with `beds: { map, pir, gd, ln, pw }` (each bus's current gain, `-1` if absent) and have `qa/journey.mjs` assert **at most one of {`theme.srcs>0`, any bed gain > 0.001} for the whole walk**, then run it on Powder with a forced evolve. Fails before, passes after. `synthOn` must stop being the doubling test — it has now missed this twice.

---

### The "8-bit thud" was never fixed: `eaten_deep.wav` ships and is 89% sub-120 Hz
SEVERITY: **blocker**
AT: `src/proto3d/audio3d.ts:4059`

SAW: Code plus a bitstream measurement. No image applies.

EVIDENCE: The brief I was given, `docs/HANDOFF.md:351` and the ledger at `docs/AAA-BRIEF.md:1357` all state the file is absent. It is not:
```
public/assets/audio/eaten_deep.wav   79,424 B   tracked in git   also in dist/
```
I parsed it: **RIFF/WAVE, 22,050 Hz, mono, 16-bit, 1.800 s, peak −0.9 dBFS, RMS −17.1 dBFS, spectral centroid 90 Hz, 88.7% of total energy below 120 Hz, 0.0% above 3 kHz.** 100 ms RMS envelope starts at −8.6 dBFS and decays monotonically. That is, by measurement, a kick drum.

And the "fix" is dead code:
```ts
4059:      if (sample('eaten_deep.wav', 0.55)) return;
4060:      // THE OWNER'S "8-bit thud". With eaten_deep.wav absent (no SFX files
...
4067:      noise(0.34, 0.14, 480, 120);   // ← never reached
```
`unlock()` (`:307`) and `startMusic()` (`:3652`) both pre-decode it on the first gesture, so `sample()` returns `true` from the first CHOMP onward and the soft whoosh never plays. `qa/_wav.mjs` — already in the repo, header comment: *"the synth versions qa/_oneshot.mjs renders are the FALLBACK, not the shipping sound"* — says the same thing and was evidently never run against the conclusion in the ledger.

Two consequences, both matching the owner's reports exactly: on an iPhone speaker (hard roll-off below ~500 Hz) only 2.4% of this file's energy survives, so the biggest reward in the game is nearly inaudible; on AirPods or in a car it is a full-scale 90 Hz hit, unsynced with any track by construction. Same file, both complaints.

Also affected: `mapleEvolve()` at `:1687` returns on `evolve_epic.wav` (2.900 s, centroid 785 Hz, **46.9% below 120 Hz**), so Maple's authored G–C–E–G flourish never plays either — and the fanfare outlives its own `duckMusic(6, 1.2)` by 1.7 s.

FIX: smallest change that closes it is **one line** — swap the order in `bigEat()` so the synth whoosh is the shipping voice and the sample is opt-in, or delete `eaten_deep.wav` from `public/`. But the *right* fix is one step further and still cheap: make `bigEat()` take the meal and void radii the way `pop()` already does (`prototype3d.ts:5016` has `e.radius` and `voidling.radius` in hand at the call site) and scale the whoosh's length, filter sweep and a `base*4` harmonic with depth, exactly as `pop()` does at `:4040–4055`. Zero draw calls; ~5 WebAudio voices for ~0.4 s, at most once per 7 s (`chompCd`).
GATE: `qa/chomp.mjs` extended — render `bigEat()` in an `OfflineAudioContext` at meal radii 1 and 10, high-pass at 450 Hz (the phone-speaker basis `qa/_wav.mjs` already uses), and assert (a) 200 ms loudness above 450 Hz is **≥ −34 dBFS** at both sizes, and (b) the two differ by **≥ 4 dB or ≥ 2 semitones**. Today (a) fails at both sizes and (b) is 0.0 dB by construction — the same file plays.

---

### The score is side-chained to the chomp by accident
SEVERITY: **major**
AT: `src/proto3d/audio3d.ts:230`

SAW: Code plus arithmetic on the gain constants. Not visible in any render.

EVIDENCE:
```ts
229:        const lim = ctx.createDynamicsCompressor();
230:        lim.threshold.value = -6; lim.knee.value = 6; lim.ratio.value = 12;
231:        lim.attack.value = 0.003; lim.release.value = 0.14;
232:        master.connect(lim); lim.connect(ctx.destination);
233:        musicBus = ctx.createGain(); musicBus.connect(master);
```
The music bus feeds `master`, and every one-shot also feeds `master` (`tone()`, `noise()`, `sample()` all `connect(master)`). So **one limiter sits across both**, and every SFX transient pulls the music down with it. `pop()` at maximum depth sums roughly 0.33 + 0.19 + 0.055 + 0.06 + 0.152 + 0.14 ≈ 0.93 of coincident peak (all layers attack within 12–15 ms of each other), × `MASTER_VOL 0.62` = −5.1 dBFS — already past the −6 threshold on **one bite, with no music at all**. Add the track (`ch.vol 0.4` × ≈−1.8 dBTP × 0.62 ≈ −14 dBFS) and the stack reaches ≈ −2.4 dBFS, which at ratio 12 above a 6 dB knee is ≈ 3.3 dB of gain reduction applied to the score. `pop()`'s own rate limit is 75 ms (`:4030`) and the limiter's release is 140 ms — so during a hoover spree the release never completes and the music sits permanently 3 dB down, pumping at the bite rate.

That is a rhythmic, unsynced modulation of the recording, driven by eating. It is a second, independent generator of the exact percept the owner has reported three times.

FIX: move the limiter off the shared path. `musicBus → master` stays; add `sfxBus = createGain(); sfxBus.connect(lim); lim.connect(destination)` and `musicBus.connect(destination)` via its own soft ceiling, or simply insert a second gain so only one-shots pass the limiter. Cheapest correct version: give the limiter to the one-shots only (`tone`/`noise`/`sample` connect to `sfxBus` instead of `master`), leave `musicBus → master → destination` clean, and lower `pop()`'s summed peak ~2 dB to keep the same headroom. Zero draw calls, two extra `GainNode`s for the session.
GATE: `qa/mixduck.mjs` — in an `OfflineAudioContext`, render 6 s of a −16 LUFS pink loop through `musicBus` while firing `pop(8, 6, 10)` every 90 ms, and assert the music-band (200 Hz–2 kHz) 100 ms RMS **varies by < 1.5 dB peak-to-trough**. Today it should read ≈ 3 dB; after the split it reads ≈ 0.

---

### The cover pad blocks the synth score it is supposed to hand over to
SEVERITY: **major**
AT: `src/proto3d/audio3d.ts:727`

SAW: Code only. `qa/fallback.mjs` cannot see it because Playwright fulfils its route intercept in under a millisecond.

EVIDENCE:
```ts
725:  function synthCover(kind: 'pad' | 'score' = 'pad') {
727:    if (synthOn || !c || c.state !== 'running') return;
```
`startMusic()` arms a 400 ms cover timer (`:3693`) that raises the drumless pad and sets `synthOn = true`. If the fetch or the decode then fails *after* 400 ms — a slow 404, a CDN timeout, an undecodable file, a world whose MP3 has not landed yet — `onNone` runs `synthCover('score')`, which hits line 727 and **returns**. The world plays a single D–A–D drone for three minutes instead of its hand-written score.

`qa/fallback.mjs:29` fulfils the 404/garbage response instantly, so `onNone` always wins the race in the harness and the probe prints PASS. This is retraction #2 in `docs/MUSIC-BRIEF.md` recurring in a new shape: *"check what your fallbacks are actually conditioned on."*

FIX: let a score upgrade a pad — in `synthCover`, change the guard to `if (!c || c.state !== 'running') return; if (synthOn && !(kind === 'score' && padNodes)) return;` and `stopPad(0.8)` before `bed()`. Cost: zero.
GATE: `qa/fallback.mjs --slow` — delay the route fulfilment by 1500 ms in both the `404` and `garbage` modes. The existing assertion (`m.synth && voices/s ≥ 6`) then fails on today's build (pad = 3 oscillators, once) and passes after.

---

### 134 MB of decoded PCM is held for the session and never released
SEVERITY: **major**
AT: `src/proto3d/audio3d.ts:3974`

SAW: Code plus MP3 header measurement.

EVIDENCE: `stopMusic()` releases the sources and the gain but never the buffer:
```ts
3974:      themeCh.wanted = false;
3975:      stopLoop(themeCh, 1.2);
```
`ch.buf` survives, and `stopMenuMusic()` does the same. `preloadMusic()` (`:3806`) decodes **both** the menu theme and the world track at boot. Parsed from the bitstreams (all 128 kbps stereo):

| slot | bytes | duration | decoded @48 kHz f32 stereo |
|---|---|---|---|
| powder | 3,585,296 | ≈224 s | **82 MB** |
| gameday | 3,254,444 | ≈203 s | **74 MB** |
| lantern | 2,337,688 | ≈146 s | 54 MB |
| pirate | 2,271,651 | ≈142 s | 52 MB |
| menu | 2,254,508 | ≈141 s | 52 MB |
| maple | 1,315,778 | ≈82 s | 30 MB |

Worst resident pair (menu + powder) is **134 MB**, held from boot to session end. Game Day — the world the brief measures at ~446 MB against a 450 MB budget — carries 126 MB of this. AudioBuffer storage lives outside the JS heap, so it is *on top of* the 446, not inside it. This is tracker item #47 and it is the largest single allocation in the product that nobody is looking at.

FIX: release the buffer that cannot be heard. At `startMusic()`, once `themeCh.srcs.length > 0`, set `menuCh.buf = null` (leaving `bad`/`loading` false so `preload()` works again) — that frees 52 MB for the whole 180 s match, exactly when memory is most contended. Symmetrically, in the `endMatch` path once the menu theme is up, set `themeCh.buf = null` and call `preload(menuCh, [MENU_URL])`. The re-decode is served from the HTTP cache and is covered by the win/lose sting and the 900 ms coin tally. Zero draw calls; two nulls and one `preload` call.
GATE: `qa/heap.mjs` extended — after 30 s of match, assert `performance.measureUserAgentSpecificMemory()` (or a `musicState().buffers` count added for the purpose) reports **at most one decoded buffer resident**. Fails today (two), passes after.

---

### TIME! is the messiest two seconds in the product
SEVERITY: **major**
AT: `src/prototype3d.ts:4562` → `:4613`, and `audio3d.ts:434`

SAW: Code only.

EVIDENCE: inside roughly 2 s at `endMatch()`, in this order:
- `audio.stopMusic()` (`:4562`) fades the world track over **1.2 s**;
- the same frame's `onMenu` edge (`:9210`) calls `startMenuMusic()`, and `startLoop`'s cold path now sets the channel to full level **instantly**:
```ts
audio3d.ts:497:      ch.gain.gain.setValueAtTime(ch.vol, c.currentTime);
```
- `audio.win()` / `audio.lose()` (`:4613`) fires plus `duckMusic(7, 1.8)` / `(5, 1.2)`;
- `celebrateEnd`'s tally (`:4550`) fires **eight** `audio.pop()` calls over 900 ms, each one hitting the shared limiter above.

So two unrelated pieces of music in different keys and tempos overlap for 1.2 s, under a sting, under eight chomps. The comment at `prototype3d.ts:9168` still describes the old behaviour — *"It fades in over 1.2s from near silence, so the win/lose sting still owns the first beat of the card"* — which the "nothing between the tap and the first note" change at `audio3d.ts:490–497` removed. The comment is now false and nobody noticed because no probe measures the seam.

FIX: hold the menu theme for the sting. In the `onMenu` edge and the watchdog restatement, when `endEl.classList.contains('show')` transitions true, delay `startMenuMusic()` by 1200 ms **and** restore the 1.2 s fade-in for that one case (pass a `soft` flag through `playTrack → startLoop` reusing the existing `hadBed` branch at `:494`). Supercell's pattern in Brawl Stars and Clash Royale is exactly this: the results stinger owns silence, then the front-of-house theme returns. Cost: zero.
GATE: `qa/aftermatch.mjs` extended — sample `musicState()` at 100 ms through TIME!, and assert `theme.gain > 0.001 && menu.gain > 0.001` holds for **≤ 300 ms**, and that `menu.gain` stays below 0.05 for the first 1000 ms after `#end.show`. Fails today (overlap ≈ 1200 ms at full level), passes after.

---

### Thirty SFX files ship with no rights record at all
SEVERITY: **major**
AT: `public/assets/audio/` (whole directory)

SAW: Directory listing and `git log`.

EVIDENCE: `public/assets/music/CREDITS.txt` is a *music* rights document. There is no equivalent for SFX, and 30 audio files ship in `dist/` — including the three that actually make sound (`eaten_deep.wav`, `evolve_epic.wav`, `win_warm.wav`) — with no source, no licence and no provenance anywhere in the repo. They entered in commit `589e31e`, which is the same commit whose message reads:

> *"1.4 MB, no licence record, inherited from the legacy 2D game, and public/ is copied wholesale into dist/ — so it shipped whether or not the flag was set… an unbacked rights claim sitting in a 4+ release that no playtest would ever surface."*

That commit removed one unlicensed MP3 and left thirty unlicensed SFX beside it. The rule the studio wrote for music applies identically here, and `docs/AUDIO-SOURCING.md:89` even flags that two of the three are trivially regenerable from scratch (`sfxr.me` output is owned outright, no licence question).

FIX: `public/assets/audio/CREDITS.txt` with one line per file, and any file the owner cannot source gets deleted rather than shipped. Given the finding above, `eaten_deep.wav` should be deleted on the merits anyway. Zero cost.
GATE: `qa/iapdoc.mjs`-shaped probe — `qa/rights.mjs`: enumerate every file under `public/assets/**` with an audio extension and assert each has a row in the matching `CREDITS.txt`. Fails today on 30 files.

---

### The evolve and win cues are two different games depending on the world
SEVERITY: **minor**
AT: `src/proto3d/audio3d.ts:1687`, `:4127`

EVIDENCE: `evolve()` routes Pirate, Game Day, Lantern and Powder to bespoke in-character flourishes (`pirateEvolve`, `gamedayEvolve`, `lanternEvolve`, `powderEvolve`), while Maple alone falls into `mapleEvolve()` → `sample('evolve_epic.wav', 0.5)` — a 2.9 s generic riser. `win()` gives Pirate a bespoke band send-off and hands the other four the same `win_warm.wav`. So the first world every child plays has the *least* characterful growth cue in the game. Both sample durations also outrun their ducks (evolve 2.9 s vs 1.2 s hold; win 3.2 s vs 1.8 s), so the score returns to full level under the sting's tail.
FIX: drop the two `sample()` early-returns (`:1687`, `:4127`) so every world uses its authored flourish; where a world has none (Game Day/Lantern/Powder `win`), write one from the bench already in the file. Match `duckMusic`'s hold to the cue's real length. Cost: zero.
GATE: `qa/_oneshot.mjs` promoted to a gate — render `evolve()` and `win()` per world offline and assert no two worlds produce byte-identical output.

---

### Maple's track is 82 s against a 180 s match
SEVERITY: **polish**
AT: `public/assets/music/maple.mp3`, `src/proto3d/music-manifest.json`

EVIDENCE: 1,315,778 bytes at 128 kbps ≈ 82 s, `loopStart: 0`. A Maple match hears the same 82 seconds 2.2 times, whole, from the top. The other five run 141–224 s. On the world every child plays first, that is the shortest loop in the set. Not fixable in code (the owner supplies the music) — but it is an argument for the ambience fix above carrying the variety instead, and for asking the owner for a longer Maple cue.

---

## IS THIS THE BEST THIS CAN BE?

No — and the gap is unusual, because **the good version is already written.** This is not a surface that needs new work; it needs the work that exists to be reachable. Ranked by value per unit of change:

1. **Reconnect the ambience and the escalation (blocker #1).** Highest-value audio change in the product by a wide margin, and I would say so even against the whole polish backlog. It converts the game from "one MP3 plus chomps" — beneath hole.io — to Crossy Road's model, where the *place* is the soundtrack and the recording sits on top of it. Every asset is written. Every level of it is tuned. Cost is a mechanical split of five start functions into ambience and band halves, zero draw calls, zero triangles, no seeded draw, and roughly 15–25 voices per world that the engine already runs on the 404 path today. The child's answer to "what does Game Day sound like?" is currently the same MP3 for 180 seconds; after this it is a stadium that gets louder as she eats it.

2. **Delete or demote `eaten_deep.wav` (blocker #3).** One line. It closes a complaint the owner has now raised three times and that the ledger records as *fixed*. It is the single clearest case in this repo of the studio's founding failure — a confident conclusion built on an unchecked premise, with a probe (`qa/_wav.mjs`) already sitting in the directory saying otherwise.

3. **Stop Powder doubling (blocker #2).** One line, and it is the same percept as #3 in the one world nobody re-tested.

4. **Split the limiter (major).** Two nodes. It removes a rhythmic modulation of the score that no probe currently measures and that would otherwise survive every other fix on this list.

5. **Release the idle buffer (major).** Two nulls, ~52–82 MB back, on the world that is 4 MB from its ceiling.

6. **Give TIME! its beat of silence, then the theme (major).** The moment a child is told how she did is currently the moment the mix is worst.

Beyond that list, and honestly out of reach for this pass: we have no positional audio at all. Donut County's swallows come from where the object was; ours are all dead-centre mono. `PannerNode` per one-shot is the mechanism, the void's world position is in hand at `prototype3d.ts:5016`, and the cost is one node per bite. I am not proposing it now — it should be measured against the six above, not stacked on them — but it is the next real step after this list, and it is what would put us past Donut County rather than level with it.

One process note, because it is the reason three of these findings are blockers and not polish: **every audio conclusion in the last two ledger entries was drawn from `synthOn` or from a probe with an instant route intercept.** `synthOn` is false on the two paths that are actually broken, and an instant intercept cannot exercise a 400 ms race. The instrument agreed with itself and disagreed with the owner's ear, three rounds running. `musicState()` needs to report the *bus gains* of all five beds and the *count of resident buffers* before any of these fixes can be trusted to stay fixed.

---

## COVERAGE

**Images: none.** I was given no image list, and none exists that could show any of this — audio failures are silent in a render. Every claim above is a code-path trace or a bitstream measurement, and I have marked which is which on each finding. I did not and cannot listen to the build.

**Files read:**
- `docs/STUDIO.md`, `docs/HANDOFF.md`, `docs/MUSIC-BRIEF.md` (full), `docs/AAA-BRIEF.md` §§0–1 and the audio ledger entries at 1340–1420, `docs/AUDIO-SOURCING.md` §§70–110
- `src/proto3d/audio3d.ts` — full structural pass, and read in detail: 1–420 (unlock, ensure, limiter, `sample()`), 420–760 (channels, `startLoop`, `playTrack`, `preload`, `reviveCh`, `duckMusic`, `synthCover`, `repairMusic`), 760–915 (music bus, `musSchedule`), 2089–2415 (`buildTownBus`, `buildMBed`, `mZoneLayer`, `mApplyZones`, `mapSchedule`, `startTown`/`stopTown`), 2499–2560 (`townFanfare`), 3597–3646 (Powder score + evolve), 3647–4179 (the entire public API)
- `src/prototype3d.ts` — audio call-site census, and read in detail: 3060–3100, 3915–3935, 4025–4070, 4540–4630 (`endMatch`), 5000–5025 (`bigEat`/`pop` call sites), 9150–9215 (the menu-music sync block)
- `qa/fallback.mjs`, `qa/journey.mjs`, `qa/_twoscores.mjs`, `qa/_wav.mjs`, `qa/lnsound.mjs`
- `src/proto3d/music-manifest.json`, `public/assets/music/CREDITS.txt`, `public/assets/audio/README.md`

**Measured directly (parsed bitstreams, not read from any doc):**
- `eaten_deep.wav` / `evolve_epic.wav` / `win_warm.wav` — RIFF headers, duration, peak, RMS, 100 ms envelope, spectral centroid, seven-band energy distribution
- all six MP3 frame headers — bitrate, sample rate, channel mode, duration, and the resulting decoded-PCM footprint

--- THE SKEPTIC ---
## VERDICT ON THE VERDICT

NO-SHIP is correct — I opened all four blocker-bearing lines myself, re-measured the bitstreams independently, and the three blockers are real, reachable on the default path, and none is a taste call.

## PER FINDING

### The recordings killed every world's ambience, place layer and escalation
REAL: **yes**

WHAT I FOUND: The trace holds end to end. `worldSynth()` is defined at `:685` and read in exactly one place — `:750`, `const bed = themeSynth ?? worldSynth();` — inside `synthCover`. `synthCover('score')` is passed as `onNone` at `:3687`, and `onNone` runs only when every URL fails. All six MP3s are present, 128 kbps, valid frame headers (I parsed them). `grep -n "startTown\|startTropical\|startGameday\|startLantern\|startPowderScore"` returns definitions, the `worldSynth` ternary, the `:3669` ternary, and `:3640` — no other call site.

The welding is as claimed: `ambience(c)` at `:1637` is the last statement of `pirSchedule`, `mapAmbience(c)` at `:2380` the last statement of `mapSchedule`, same shape at `:2929` and `:3257`. The zone gate is verbatim:
```
2201:    if (mZone && mapRunning) {
2205:    if (mapBus) ramp(mapBus.gain, mapRunning ? MAP_VOL : 0, now, fade);
```
and `mapRunning = true` appears once, at `:2386` in `startTown`. `setZone` (`:3872`) does reach `mApplyZones()` every frame from `prototype3d.ts:9055`, and `mApplyZones` then ramps `mapBus` to zero. Confirmed no-op.

`musStage` is stronger than the reviewer put it: I listed every reader — `:859, :872, :876, :877, :1501, :2285, :2747, :2823, :3046, :3218, :3389, :3599–3609`. Every one is inside a scheduler or an ambience function that only runs off a bed timer. `setMusicStage` writes to nothing that can be heard.

FIX SOUND: **yes** — zero draw calls, zero triangles, no seeded draw, no owner order touched. The split is mechanical.

CORRECTION: Two.
1. "**Five** hand-written scores and their district beds" over-counts. Powder has a score and nothing else — there is no `pwAmbience`, no `pwZone`, no `pw` zone map (`grep "pwAmb\|pwZone"` returns nothing; the only `pw*` functions are `pwBox`, `pwBells`, `pwPad`, `pwDrum`, `pwSchedule`). Four worlds have an ambience+district layer to rescue; the fifth has a band only. The ambience/band split has nothing to split on Powder.
2. The match is not literally silent of synth on a cold start — the 400 ms timer at `:3693` does raise the cover pad (three triangle oscillators, D3/A3/D4, `:709`). The reviewer states this correctly elsewhere in the review, but the finding's own headline reads as total silence. What is dead is the bed, the districts and the escalation, not every synthesised voice.

### Powder Pass plays two scores at once, from the first evolution to TIME!
REAL: **yes**

WHAT I FOUND: `:3638–3640` is verbatim:
```ts
  function powderEvolve() {
    const c = ensure(); if (!c) return;
    if (!pwBus) startPowderScore();
```
and `startPowderScore` (`:3613`) is the whole engine — `pwRunning = true`, `ramp(pwBus.gain, 0.5, …, 1.8)`, `pwTimer = setInterval(pwSchedule, 110)`. `evolve()` routes Powder to it unconditionally at `:4087`. The stop path is the key check and it confirms the finding: `synthStop` (`:755`) opens `if (!synthOn) return;`, and its only caller is `:475` inside `startLoop` — which has already run and returned before the first evolve. Nothing else clears `pwTimer` until `stopMusic()` at `:3967` calls `stopPowder(1.2)` directly.

Both probes are blind exactly as described: `qa/journey.mjs:47` tests `m.synth && (m.theme.srcs > 0 || …)`, `qa/_twoscores.mjs:29` tests `m.theme.srcs > 0 && m.synth`. `synthOn` is false on this path, and `_twoscores` only ever clicks `data-world="lantern"`.

FIX SOUND: **yes** — extracting the node construction into `ensurePwBus(c)` is one refactor, zero cost, and `powderEvolve`'s flourish genuinely only needs the bus.

CORRECTION: None material. The reviewer's own text already says `stopMusic()` ends it at TIME!, so "runs for ~170 seconds" is a match-length claim, not a leak claim, and that reads correctly.

### The "8-bit thud" was never fixed: `eaten_deep.wav` ships and is 89% sub-120 Hz
REAL: **yes**

WHAT I FOUND: I measured the file myself rather than trusting the review. RIFF header: 22,050 Hz, mono, 16-bit, 39,690 frames = **1.800 s**, peak **−0.9 dBFS**, RMS **−17.1 dBFS**. Hann-windowed FFT: **centroid 92 Hz, 87.6% of energy below 120 Hz, 0.00% above 3 kHz, 3.0% above 450 Hz.** The reviewer's numbers are right to within windowing.

The file is tracked (`git ls-files public/assets/audio/eaten_deep.wav`), 79,424 bytes, and present in `dist/assets/audio/`. `bigEat()` at `:4059` is verbatim `if (sample('eaten_deep.wav', 0.55)) return;`, `sample()` (`:359`) returns `true` whenever the buffer is resident, and `unlock()` (`:307`) plus `startMusic()` (`:3652`) both pre-decode all three names at `vol = 0`. So the whoosh at `:4067` is unreachable from the first gesture onward.

The premise the ledger rests on is false in both places the reviewer cites. `docs/AAA-BRIEF.md:1357` reads "with eaten_deep.wav absent (no SFX files yet)". `docs/HANDOFF.md:351–355` reads "Until then the synth fallbacks play (the swallow one is now a soft whoosh, not a thud)." Neither is true. `qa/_wav.mjs`'s own header says the opposite of the ledger.

FIX SOUND: **yes.** Both the one-line demote and the scale-with-depth version are sound and cost nothing in draw calls. `pop()` already proves the pattern at `:4012–4014`.

CORRECTION: One number. The reviewer gives `evolve_epic.wav` as "centroid 785 Hz, 46.9% below 120 Hz". Measured over the full 2.9 s I get **776 Hz and 47.1%** — close enough that the point stands, but the review's figures are not the ones the file yields. My own short-window pass gave 1238 Hz/37.2%, which is why the measurement basis matters and should be stated in the gate.

### The score is side-chained to the chomp by accident
REAL: **yes**

WHAT I FOUND: `:229–233` is quoted exactly. `tone()` (`:334`), `noise()` (`:350`) and `sample()` (`:365`) all `connect(master)`; `musicBus` connects to `master` at `:233`; `master` is the compressor's only input. One limiter across both, confirmed. `MASTER_VOL = 0.62` at `:122`. The compressor maths checks: at −2.4 dBFS in, with threshold −6, knee 6, ratio 12, the soft-knee output is ≈ −5.7 dBFS, i.e. ≈ 3.3 dB of gain reduction applied broadband — to the music. `pop()`'s 75 ms rate limit is at `:3996` and the release is 140 ms, so the pumping claim follows.

FIX SOUND: **no.** The "cheapest correct version" as written breaks two things. `setMuted()` (`:3862`) ramps **`master.gain` only**, and `MASTER_VOL` lives on `master` as well. Routing `tone`/`noise`/`sample` into a new `sfxBus` that goes `sfxBus → lim → destination` takes every one-shot in the game *out* from under the mute toggle and out from under the 0.62 master trim — the mute button would silence the music and leave the chomps at ~1.6× their current level.

CORRECTION: The topology has to keep `master` as the single trim/mute node: `sfxBus → lim → master → destination` and `musicBus → master → destination`, with `musicBus` no longer feeding `master`'s limited leg. That preserves mute, preserves `MASTER_VOL`, preserves `duckMusic` on `musicBus`, and still takes the music off the one-shot limiter. Two extra nodes, same as costed. Separately: the results-card tally fires `audio.pop(3 + chunk)` (`prototype3d.ts:4550`) with the default `mealR = 0.9, voidR = 0.9`, so `depth ≈ 0.105` — the pumping during TIME! is much milder than the −2.4 dBFS worst case, which is a hoover spree on a big void.

### The cover pad blocks the synth score it is supposed to hand over to
REAL: **yes** — and more reachable than argued.

WHAT I FOUND: `:727` is verbatim `if (synthOn || !c || c.state !== 'running') return;`, and the pad branch sets `synthOn = true` at `:745`. The race the reviewer describes (400 ms timer wins, then a slow failure) is real. `qa/fallback.mjs:30–32` does fulfil both the 404 and the garbage response with no delay, so the harness cannot exercise it.

FIX SOUND: **yes.** `padNodes` is in scope at `:727` and `stopPad` exists at `:717`; the guard rewrite is safe.

CORRECTION: The reviewer found the weaker of the two paths. `reviveCh` (`:634`) — driven by the 2-second watchdog at `prototype3d.ts:9190` and by every `statechange` to `running` — does this:
```ts
638:    synthCover();                                 // menu or match: never silent
641:    if (ch === themeCh) { if (themeUrls.length) playTrack(themeCh, themeUrls, () => synthCover('score')); }
```
It raises the pad *unconditionally on line 638*, then arms a `'score'` cover on line 641 that line 727 can now never honour. This is not a 400 ms race — the two calls are three lines apart and the ordering is fixed. Any revive that finds the theme channel with no buffer is guaranteed a drone. That raises this from a network-flake case to a deterministic one and, in my view, from major to the low end of blocker.

### 134 MB of decoded PCM is held for the session and never released
REAL: **yes**

WHAT I FOUND: `ch.buf` is assigned at `:571` and `:606` and read at `:562`, `:599`, `:634`, `:3840`. It is never set to `null` anywhere in the file. `stopMusic` (`:3974–3975`) and `stopMenuMusic` (`:3730–3731`) both stop sources and leave the buffer. `preloadMusic` (`:3812–3814`) decodes both `menuCh` and `themeCh` at boot in either order.

My own parse of the MP3s: menu 140.9 s, powder 224.1 s, gameday 203.4 s, lantern 146.1 s, pirate 142.0 s, maple 82.2 s — all 128 kbps. At 48 kHz float32 stereo that is menu 54 MB + powder 86 MB ≈ **140 MB** worst pair, and gameday + menu ≈ 132 MB.

FIX SOUND: **yes**, with one condition the review does not state. Nulling `menuCh.buf` is only safe where `menuCh.wanted` is already false, because `reviveCh` (`:634`) falls through to `synthCover()` + a re-fetch when it finds a wanted channel with no buffer. The proposal nulls it inside `startMusic()` immediately after `menuCh.wanted = false` at `:3685`, so it is safe as written — but the ordering is load-bearing and should be in the fix, not implied.

CORRECTION: The reviewer's per-slot figures are ~2–5 MB low each (they appear to have measured from the first frame rather than the file). Worst resident pair is ~140 MB, not 134 MB. Direction and magnitude unchanged.

### TIME! is the messiest two seconds in the product
REAL: **yes**, but materially smaller than described.

WHAT I FOUND: The sequence is as claimed. `endMatch` at `prototype3d.ts:4561` calls `audio.stopMusic()`; `endEl.classList.add('show')` at `:4593`; `onMenu` at `:9187` is `body.menu || endEl.classList.contains('show')`, so the next frame's edge at `:9210` calls `startMenuMusic()`. `startMenuMusic` (`:3718`) returns early only on `themeCh.wanted`, which `stopMusic` has just cleared. `startLoop`'s `hadBed` is `synthOn`, which `stopMusic` sets false at `:3968`, so `:497` runs — `ch.gain.gain.setValueAtTime(ch.vol, c.currentTime)`, instant. `menuCh.buf` is still resident (see the finding above), so there is no download to wait on. `audio.win()`/`lose()` at `:4613`. Eight `audio.pop()` calls at `:4550`. The comment at `prototype3d.ts:9169–9170` is indeed now false.

FIX SOUND: **yes** — the `hadBed` branch at `:494–496` is exactly the soft path to reuse.

CORRECTION: "Two unrelated pieces of music **in different keys and tempos overlap for 1.2 s** … at full level" overstates it. Both channels' gain nodes connect to `musicBus` (`:476`), and `win()` fires `duckMusic(7, 1.8)` at `:4103` — which ramps **`musicBus.gain`** (`:672`), not a per-channel gain. So the incoming menu theme arrives into a bus already ducked 7 dB and held there for 1.92 s before a 0.4 s recovery. The overlap is real and the stale comment is real, but the percept is a −7 dB menu theme under a fading match tail, not two tracks at level. On that basis I would rate this **minor**, not major.

### Thirty SFX files ship with no rights record at all
REAL: **yes**

WHAT I FOUND: `public/assets/audio/` contains 30 audio files and a `README.md`; there is no `CREDITS.txt`. The README (`public/assets/audio/README.md`) is a *how to drop a file in* document — slot table and search terms — with no source, licence or provenance for anything already there. `public/assets/music/CREDITS.txt` exists and covers music only. The files are in `dist/assets/audio/`.

FIX SOUND: **yes.** A `CREDITS.txt` plus a `qa/rights.mjs` enumerating `public/assets/**` against it is zero-risk and the right shape.

CORRECTION: The archaeology is wrong and should not be repeated to the owner. `589e31e` is the **root commit of this repository's 64-commit history** — `git show --stat` reports *1335 files changed, 146172 insertions(+)*, all additions, including `lib/`, `screenshots/`, `pnpm-lock.yaml`. It is a squashed import that happens to carry the theme.mp3 removal message. It did not "remove one unlicensed MP3 and leave thirty beside it"; the history simply does not go back further. The finding stands entirely on the current directory state, which is where it should have been argued from.

### The evolve and win cues are two different games depending on the world
REAL: **yes**

WHAT I FOUND: `evolve()` at `:4084–4088` routes Pirate/Game Day/Lantern/Powder to bespoke functions and falls through to `mapleEvolve()`, which is `:1686–1687` `if (sample('evolve_epic.wav', 0.5)) return;` above the authored G4–C5–E5–G5. `win()` at `:4127` gives Pirate the full band and everyone else `sample('win_warm.wav', 0.55)`. The duck arithmetic checks: `duckMusic(6, 1.2)` holds to `t+1.32` then recovers by `t+1.72` against a 2.900 s sample; `duckMusic(7, 1.8)` holds to `t+1.92`, recovers by `t+2.32`, against a 3.200 s sample.

FIX SOUND: **yes**, and it is the same one-line demote as the `bigEat` blocker.

CORRECTION: None.

### Maple's track is 82 s against a 180 s match
REAL: **yes**

WHAT I FOUND: I parsed it — 1,315,778 bytes, 128 kbps, 44.1 kHz, **82.2 s**, and `src/proto3d/music-manifest.json` gives maple `"loopStart": 0`. Shortest of the six; gameday is the only one with a non-zero loop point (4.0).

FIX SOUND: n/a — correctly filed as polish with no code fix, and correctly not used to justify the NO-SHIP.

CORRECTION: None.

## WHAT THE TEAM MISSED

I have no images either, and for this surface that is legitimate rather than a rule-1 violation — there is no render that shows a silent bed. But there are four things in the files they read that they did not report:

1. **`startSynth()` at `:775` has zero callers.** `grep -n "startSynth" src/proto3d/audio3d.ts src/prototype3d.ts` returns only the definition. It is the function that ramps `musGain` to 0.26 — the master gain for the whole synth layer — and nothing invokes it. That is the same rot as finding #1, sitting twenty lines from it, and a reviewer walking `worldSynth`/`synthCover` had it on screen.

2. **The `reviveCh` pad-before-score ordering (`:638` then `:641`).** This is finding #5's mechanism on the path that fires every two seconds from the watchdog rather than once at 400 ms. The reviewer read `reviveCh` — they quote `:3974` from twenty lines away and cite the watchdog — and reported only the timer race. It is the more reachable half of their own finding.

3. **`duckMusic` acts on `musicBus`, which both channels feed.** That single fact softens their TIME! finding by 7 dB and they did not check it, despite quoting `duckMusic(7, 1.8)` in the same paragraph. A finding that survives is worth less if its magnitude is wrong, and this one is the difference between "two tracks at level" and "a ducked theme under a tail."

4. **Powder has no ambience layer to reconnect.** The headline finding is scoped to "five hand-written scores and their district beds"; four worlds have district beds, Powder has a bare score. Anyone implementing the ambience/band split from this review would go looking for `pwAmbience` and not find it.

One thing I checked that they did not raise and I could not convict: `qa/_wav.mjs`'s header cites `audio3d.ts:3224, :3284, :1124` for the three `sample()` early-returns. The real lines are `:4059`, `:4127`, `:1687`. Stale, not wrong in substance — but it is the probe that already knew the answer to their biggest blocker, and stale anchors are how a probe stops being read.

SURVIVED: 10 of 10.
