# CREW PROPOSAL — ROUND 2B, DECISION 5: SPHERE TESSELLATION PAYDOWN

The owner: "absolutely." Brief: docs/CREWS-ROUND-2.md (binding), decision 5 —
take ground under the roundlod baseline, worst triangle offenders first,
silhouettes at the gameplay camera untouched, and the census arbiter is
`qa/roundlod.mjs`'s own counting regex, not a shell one-liner.

Status: PROPOSAL. Nothing lands without a skeptic verdict. Patches 1–2 are
the core; patches 3–4 are a severable rider (each can be KILLED without
touching the others); patch 5 (the probe) is written so its constant is
arithmetic on whichever geometry patches survive.

---

## 0. THE CENSUS — run, not reasoned

Method: the probe's own regex, verbatim —
`/SphereGeometry\(\s*([^,()]+),\s*(\d+)\s*,\s*(\d+)\s*\)/g` over
non-comment lines of `src/proto3d/*.ts`, exactly as `qa/roundlod.mjs:62-70`
does it. The 166-vs-154 lesson is why: a shell regex that accepted an
unterminated fragment once counted 12 spheres that were never there. Every
number below was produced by running that regex (and `node qa/roundlod.mjs`
itself, which agrees).

| measured on this tree | value |
|---|---|
| counted single-line SphereGeometry calls | **220** |
| under-bar hits (BOTH axes single-digit) | **154** = BASELINE, probe PASSes |
| site triangle spend, Σ 2·W·(H−1) per counted call | **39,242** |

Top of the census by per-instance triangles (2·W·(H−1)):

| tris | W×H | site | what it is | disposition |
|---|---|---|---|---|
| 13,632 | 96×72 | void3d.ts:603 | the void's body | **HANDS OFF** — the void itself |
| 2,320 | 40×30 | rivals.ts:301 | rival void body | **HANDS OFF** — rival voids |
| 600 | 20×16 | void3d.ts:2395 | the void's belly | **HANDS OFF** — the void itself |
| 468 | 18×14 | assets3d.ts:165 | hot-air balloon envelope, Maple | **PATCH 3** |
| 468 | 18×14 | tailgate.ts:558 | helmet-tunnel outer shell | declined — see §6 |
| 352 | 16×12 | tailgate.ts:559 | helmet-tunnel inner shell | declined — see §6 |
| 352 | 16×12 | void3d.ts:1303 | the void's jaw | **HANDS OFF** — fear-face/hero face geometry |
| 320 | 16×11 | life.ts:544 | every person's head, "the silhouette that matters most" | **HANDS OFF** — characters' faces |
| 252 | 14×10 | tailgate.ts:869 | football on the grass | **PATCH 2** |
| 252 | 14×10 | tailgate.ts:883 | helmet left on the grass | **PATCH 1** |

Also censused, though the probe cannot see them (4+ argument calls do not
match the regex — stated per patch below): the balloon's four gore stripes
(assets3d.ts:173, 10×14 partial, 260 tris each = 1,040), the hatgeo.ts hat
caps (up to 30×14 partial — worn on the hero's head at hero distance and
shot close in the store: treated hero-close, untouched), and the satellite
dish (tailgate.ts:1178 — declined with math in §6).

**Per-instance is the wrong sort order.** The worst offenders per SCENE are
small spheres with big spawn counts. Instance counts below are read from the
Game Day spawn table in island.ts (verified lines), where `plant(id, n, …)`
attempts n placements via `GD.scatterInRegion(REG(id), n, Math.random, …)`
(island.ts:5639-5643) — n is an upper bound; scatter can reject sites.

| maker | sphere site | tris | spawn-table instances | per-scene tris |
|---|---|---|---|---|
| makeHelmetProp | tailgate.ts:883 (14×10) | 252 | 40+60+34 = **134** (island.ts:5728, 5797, 5822) | **33,768** |
| makeFootball | tailgate.ts:869 (14×10) | 252 | 70+50 = **120** (island.ts:5719, 5799) | **30,240** |
| balloon envelope+gores | assets3d.ts:165/173 | 1,508 | **1** (island.ts:7225, Maple only) | 1,508 |

`TAILGATE_KIT` (tailgate.ts:1235) also lists these makers but has **zero
consumers** — a repo-wide grep finds only its definition — so the plant()
lines above are the whole instance count.

---

## 1. THE SILHOUETTE RULE, taken from the repo's own bar

island.ts:4201-4203, on the tree canopy (R0 = 2.2–2.9): "14x10 is the point
where the profile stops reading as a polygon at the closest the camera ever
gets." That is an accepted equatorial chord sag of

    2.9 × (1 − cos(π/14)) = 2.9 × 0.02507 = 0.0727 units

at the closest the camera ever gets. Sag scales with radius, so the honest
rule is: a reduction is silhouette-safe if the resulting sag is at or below
0.0727 units at the same viewing distances. Every patch below is priced
against that number. (Camera: fixed azimuth 225°, pitch 46.4–65.6°, FOV 32,
void 10–40 units from camera, props further — so trees, footballs and
dropped helmets all share the same "closest the camera ever gets".)

Both tailgate targets are `finishSoft` props on `PROP_SMOOTH_MAT`
(tailgate.ts:79-81) — smooth normals, so facets cannot show in shading;
segment count is visible **only** in the silhouette. The sag number is the
whole story for them.

---

## 2. PATCH 1 — the dropped helmet: 134 × (252 → 140)

**File:** `src/proto3d/tailgate.ts`
**Anchor:** line 883, inside `makeHelmetProp()` (line 880), verified verbatim.

Before (line 883):

```ts
    part(new THREE.SphereGeometry(0.5, 14, 10), shell, 0, 0.5, 0, 0, 0, 0, 1.12, 1.0, 1.04),
```

After:

```ts
    part(new THREE.SphereGeometry(0.5, 10, 8), shell, 0, 0.5, 0, 0, 0, 0, 1.12, 1.0, 1.04),
```

**Why.** A helmet "left on the grass, ~1 across" was carrying the tree bar's
14×10 — a tessellation the bar derived for canopies 5–6× its radius. Worst
effective radius 0.5 × 1.12 = 0.56; at W=10 the chord sag is
0.56 × (1 − cos 18°) = 0.56 × 0.04894 = **0.0274 units — 2.7× LESS
silhouette error than the accepted 14×10 tree at any shared distance.**
10×8 is also the game's established grammar for small round things — 33
counted calls already use it (lamp bulbs r 0.32, haystack pumpkins r 0.34,
bounce-house domes r 0.44, this very prop's boss stripe at line 884).

**Triangle math.** 2·14·9 = 252 → 2·10·7 = 140. **−112 per instance.**
Spawn table: 134 instances (lot 40, practice 60, bowl 34) →
**−15,008 triangles per Game Day scene** (upper bound; scatter can reject).
Merged non-indexed geometry at 111 bytes/triangle (qa/roundlod.mjs header,
from qa/heap.mjs): **≈1.67 MB back in the world that sits near its memory
ceiling.**

**Draw accounting.** Zero seeded draws before, zero after, delta 0.
tailgate.ts contains no `mrnd`/`mr`/`mpick`/`mchance` at all (grep: 0 hits;
its local `rnd`/`pick` at lines 74-75 are `Math.random`), and Game Day's
`plant()` scatters with `Math.random` (island.ts:5641). A segment-count
literal makes no random call of any kind, so the Maple mulberry32 stream is
untouched by construction — and so is even the unseeded stream.

**Census effect (probe regex).** The call is still a complete single-line
3-arg call → still counted (total stays 220). W=10 fails `w < 10`, so it is
NOT a new under-bar hit: hits stay **154**. This is not regex-gaming: §1's
sag math justifies 10×8 on quality, independent of what the regex counts.

## 3. PATCH 2 — the football: 120 × (252 → 140)

**File:** `src/proto3d/tailgate.ts`
**Anchor:** line 869, inside `makeFootball()` (line 867), verified verbatim.

Before (line 869):

```ts
    part(new THREE.SphereGeometry(0.2, 14, 10), 0x8a4a2a, 0, 0.2, 0, 0, 0, 0, 1.6, 1.0, 1.0),
```

After:

```ts
    part(new THREE.SphereGeometry(0.2, 10, 8), 0x8a4a2a, 0, 0.2, 0, 0, 0, 0, 1.6, 1.0, 1.0),
```

**Why.** A ball 0.64 long (r 0.2, stretched 1.6× along X) at the bar meant
for r 2.9 canopies. Circular cross-section sag at W=10:
0.2 × 0.04894 = **0.0098 units — 7.4× less error than the accepted tree
bar.** Even the stretched long-axis profile (meridian, governed by H=8,
22.5° per row on r 0.2) stays several times under it. Sub-pixel at every
distance the gameplay camera can reach a ground prop.

**Triangle math.** 252 → 140, **−112 per instance**; 120 instances (lot 70,
practice 50) → **−13,440 triangles per Game Day scene** (upper bound), ≈1.49
MB at 111 B/tri.

**Draw accounting.** Identical to Patch 1: zero seeded draws before and
after, delta 0; no random calls of any kind in the changed expression.

**Census effect.** Still counted; W=10 → not a hit. Total 220, hits 154.

Patches 1+2 together: **−28,448 triangles, ≈3.16 MB, per Game Day scene**
at spawn-table counts.

## 4. PATCH 3 (severable rider) — the Maple balloon envelope: 468 → 252

**File:** `src/proto3d/assets3d.ts`
**Anchor:** line 165, inside `spawnBalloon()`'s fallback (lines 159-193;
the fallback IS the prop — the GLB pack is gone, assets3d.ts:96-101, and
`opts.h` is inert). Verified verbatim, 8-space indent.

Before (line 165):

```ts
        new THREE.SphereGeometry(3.1, 18, 14),
```

After:

```ts
        new THREE.SphereGeometry(3.1, 14, 10),
```

**Why.** The file's own words: "drifting scenery seen from a long way off"
(assets3d.ts:157). Run the arithmetic and "a long way off" is generous —
at the gameplay camera it is out of frame entirely: the animation puts the
group at altitude 42 ± 2.2 on a 125-unit orbit (island.ts:3491-3494), the
envelope sits at local y 9.6 (assets3d.ts:168), so its underside is never
below ~45.6 units; the camera tops out near void-center + 40·sin 65.6° ≈ 46,
and the frame's upper edge is at least pitch − FOV/2 = 46.4° − 16° = 30.4°
BELOW horizontal. An object level with or above the camera cannot enter a
frustum whose highest ray points 30° down — the same geometry that kept
1500 stars off screen (GOVERNOR.md). Its triangles buy gameplay pixels
never. At 14×10 the sag is 3.1 × 0.02507 = 0.0777 units, 7% over the tree
bar's 0.0727 — and the nearest any non-gameplay shot plausibly frames it
from is several times any tree's closest distance.

**Honest disclosure, because the skeptic will find it:** this material is
`flatShading: true` (line 166), so unlike patches 1–2 the reduction also
coarsens the facet pattern under shading (equatorial facet width 1.08 →
1.39 units), not just the silhouette. Invisible at gameplay camera (out of
frame, above); visible in principle to free-camera QA shots. That is why
this pair is severable and photograph-gated (§8).

**Triangle math.** 2·18·13 = 468 → 2·14·9 = 252. **−216**, one instance,
Maple only. This geometry is unmerged and indexed (a standalone Mesh, not
mergedProp), so the 111 B/tri figure does NOT apply; memory saving is
roughly 5 KB and is not the claim — retiring the single largest over-bar
non-hero sphere in the census is.

**Draw accounting.** `spawnBalloon()` and its fallback make zero random
calls of any kind (verified lines 159-193; assets3d.ts has no
mrnd/mr/mpick/mchance — grep: 0 hits). Delta 0 on the Maple stream.

**Census effect.** Still counted (3-arg single-line); 14×10 → not a hit.
Total 220, hits 154.

## 5. PATCH 4 (severable rider, lands only WITH Patch 3) — the gores: 1,040 → 288

**File:** `src/proto3d/assets3d.ts`
**Anchor:** line 173, in the same fallback, the 4-gore loop (lines 171-177).
Verified verbatim, 10-space indent.

Before (line 173):

```ts
          new THREE.SphereGeometry(3.13, 10, 14, (i / 4) * Math.PI * 2, Math.PI / 5.5),
```

After:

```ts
          new THREE.SphereGeometry(3.13, 4, 10, (i / 4) * Math.PI * 2, Math.PI / 5.5),
```

**Why.** Each gore is a 32.7° stripe (φ length π/5.5) draped 0.03 proud of
the envelope, yet carries 10 width segments — 3.3° each, denser than the
hero. At W=4 (8.18° per segment) the gore's surface never dips below
3.13 × cos 4.09° = 3.122, and the envelope's never rises above 3.1, so the
stripe stays ≥ 0.022 units proud everywhere — no z-fighting, no sink-in.

**The load-bearing constraint:** the gore's HEIGHT segments must equal the
envelope's, because the poke-through proof cancels the between-latitude
chord dip only when their θ rings align. Patch 3 takes the envelope to
H=10, so the gores go to H=10 in the same commit. **If Patch 3 is KILLED,
this patch's H must stay 14 (i.e. `3.13, 4, 14` — −520 instead of −752);
landing `4, 10` against an 18×14 envelope lets the envelope's θ=ring
vertices poke through the gore mid-chords.**

**Triangle math.** Partial-φ spheres still cost 2·W·(H−1):
2·10·13 = 260 each → 2·4·9 = 72 each; four gores: 1,040 → 288, **−752**,
one instance, Maple only.

**Draw accounting.** Same as Patch 3: zero draws before and after.

**Census effect: NONE, and stated explicitly** — this is a 5-argument call,
which the probe's regex (requiring `)` immediately after the third argument)
does not and will not count, before or after. Total stays 220, hits stay
154, and the TRI ratchet below cannot see this one either. It is real
triangles saved that no instrument records; the record is this document.

---

## 6. GROUND DECLINED, with the math that declined it

- **Helmet tunnel shells (tailgate.ts:558-559, 18×14 + 16×12, 2 instances,
  island.ts:5748).** The per-instance chart's #4 — and the wrong target.
  At r 4.0×1.06 = 4.24, even 14×10 sags 0.106 units, 46% OVER the tree bar,
  on an 8.5-unit landmark the player runs at; its own comment says "a
  faceted balloon is a rock." Harvest at bar-respecting segments would be
  ≤ ~230 triangles per scene — noise beside patches 1–2. Worst-per-instance
  is not worst-per-scene.
- **Satellite dish (tailgate.ts:1178, 14×10 partial cap, 34 rigs —
  −3,944 available at 10×8).** The dish's silhouette is its RIM — a hard
  open edge, not a smooth-shaded limb. A 10-gon hard rim at ~12 units is a
  different perceptual case from everything §1's sag rule was derived on,
  and the site is invisible to the census (5-arg call), so no ratchet locks
  it. Future ground, photograph-first.
- **Hat caps (hatgeo.ts:171, 325, 862, 1558 — up to 30×14 partial).** Worn
  on the hero's head at hero distance (10–40 units) and shot close-up in
  the store. Hero-close by the same rule that protects the hero.
- **The 10×8/8×6 fleet.** Reducing e.g. lamp bulbs 10×8 → 10×6 saves 40 a
  site while skirting the hits regex on a technicality. Pure regex-gaming,
  tiny yield. No.
- **Everything HANDS OFF:** void body/belly/jaw/lip/chrome (void3d.ts),
  rival bodies (rivals.ts:301), fear-face geometry, person heads
  (life.ts:544) and the person part-kit generally.

---

## 7. PATCH 5 — qa/roundlod.mjs: the census/baseline change that locks the gain in

The hits ratchet cannot hold this ground: all four geometry patches leave
hits at 154 and total at 220 (the probe will print "PASS — the debt is
unchanged at 154"), so BASELINE **stays 154 — no change**, and nothing
stops a later commit from quietly restoring 14×10 footballs. The lock is a
second ratchet on the same counted calls: the summed site spend
Σ 2·W·(H−1), which the harvest lowers 39,242 → 38,802 (−440 at site level:
−112, −112, −216 from patches 1–3; patch 4 is invisible to the regex).

Ratchet direction is DOWN, like BASELINE — with the one legitimate raise
written into it: paying under-bar debt (8×6 → 14×10) costs triangles by
design, so a commit that lowers BASELINE may raise TRI_BASELINE with the
arithmetic in its message. Same escape the existing ratchet has ("never
raise it without a reason in the commit message"), so the two ratchets
cannot deadlock decision 5's other half.

**File:** `qa/roundlod.mjs` — four edits, anchors verified on this tree.

**5a — after line 49 (`const BASELINE = 154;`).** Before:

```js
const BASELINE = 154;
```

After:

```js
const BASELINE = 154;

// THE SPEND — the same counted calls, priced instead of judged:
// 2*W*(H-1) summed per call SITE (not per instance; the probe cannot see
// spawn loops). It ratchets DOWN like BASELINE and for the same reason:
// triangles harvested from over-tessellated spheres can otherwise be
// quietly given back. RAISING it has exactly one legitimate case — paying
// under-bar debt down (8x6 -> 14x10) costs triangles by design — and it
// happens in the same commit that lowers BASELINE, with the arithmetic in
// the commit message. 38802 = 39242 measured on the pre-harvest tree,
// minus 440: two 14x10 -> 10x8 (tailgate.ts:869,883) and one
// 18x14 -> 14x10 (assets3d.ts:165).
const TRI_BASELINE = 38802;
```

(If the skeptic kills the balloon rider, the constant is 39,242 − 224 =
**39,018** and the comment's arithmetic changes with it.)

**5b — lines 58-59.** Before:

```js
const hits = [];
let total = 0;
```

After:

```js
const hits = [];
let total = 0;
let spend = 0;
```

**5c — lines 65-66.** Before:

```js
      total++;
      const w = Number(m[2]), h = Number(m[3]);
```

After:

```js
      total++;
      const w = Number(m[2]), h = Number(m[3]);
      spend += 2 * w * (h - 1);
```

**5d — lines 85-88** (the SECOND `console.log('');`; `}` +
`console.log('');` also occurs at lines 81-82, so the trailing blank line
and `if (hits.length > BASELINE) {` are what make this anchor unique).
Before:

```js
}
console.log('');

if (hits.length > BASELINE) {
```

After:

```js
}
console.log('');
console.log(`  site spend: ${spend} triangles at 2*W*(H-1) per counted call (sites, not instances).`);

if (spend > TRI_BASELINE) {
  console.log(`FAIL — the sphere spend grew: ${spend} against a recorded ${TRI_BASELINE}.`);
  console.log('  Either a harvested sphere was quietly restored, or new/raised tessellation');
  console.log('  shipped unpriced. Paying under-bar debt down IS the legitimate raise — do it');
  console.log('  in the commit that lowers BASELINE, arithmetic in the message.');
  process.exit(1);
}
if (spend < TRI_BASELINE) {
  console.log(`  the spend FELL, ${TRI_BASELINE} -> ${spend}. Lower TRI_BASELINE to ${spend}.`);
}

if (hits.length > BASELINE) {
```

Exit-code semantics are unchanged in form (0 pass, 1 fail, 2 abort), so the
`roundlod` step in qa/gate.mjs:181-182 (profiles push/live/art, verdict by
pass/fail) needs no edit. The 10-file abort guard is untouched.

---

## 8. THE PROBE, and the failing run that proves it

Per GOVERNOR.md rule 2, the probe must fail on the unfixed build. Landing
order delivers that in one step:

1. Apply Patch 5 alone; run `node qa/roundlod.mjs` on the un-harvested
   geometry. **Expected: `site spend: 39242 …` then
   `FAIL — the sphere spend grew: 39242 against a recorded 38802.`, exit 1.**
   That run is the evidence and gets recorded in the landing commit.
2. Apply Patches 1–4 in the same commit; run again. **Expected: total 220,
   hits 154, all six worst-of rows and the by-file table byte-identical
   (they tabulate only under-bar hits, which no patch touches),
   `site spend: 38802 …`, `PASS — the debt is unchanged at 154. It is
   frozen, not forgiven.`, exit 0.**
3. `node qa/gate.mjs --profile=push` green, READ the output (standing rule).
4. Studio rule — nothing visual lands unreviewed: reshoot the lookbook
   (`qa/lookbook.mjs`) for Game Day and Maple. Predicted deltas: none
   discernible (patches 1–2 are 2.7–7.4× under the accepted silhouette bar
   on smooth-shaded props; patches 3–4 are out of the gameplay frustum).
   Any legible before/after difference in a Game Day clutter shot or any
   Maple shot that frames the balloon is a KILL on the patch that caused it.

No MATCH-time sampling is needed — every claim here is static geometry read
from source; the one runtime claim (balloon out of frustum) is arithmetic
over constants cited by line.

---

## 9. TOTALS

| patch | site | change | per-instance | instances | per-scene |
|---|---|---|---|---|---|
| 1 | tailgate.ts:883 | 14×10 → 10×8 | −112 | 134 (Game Day) | −15,008 |
| 2 | tailgate.ts:869 | 14×10 → 10×8 | −112 | 120 (Game Day) | −13,440 |
| 3 | assets3d.ts:165 | 18×14 → 14×10 | −216 | 1 (Maple) | −216 |
| 4 | assets3d.ts:173 | (10,14) → (4,10) ×4 gores | −752 | 1 (Maple) | −752 |

- **Game Day: −28,448 triangles/scene** (spawn-table upper bound; merged
  non-indexed, ≈**3.16 MB** at 111 B/tri) — in the world the roundlod
  header names as sitting near its memory ceiling. This is the war chest
  for the actual debt paydown: at 3.15× per 8×6 → 14×10 conversion, it
  funds roughly 165 under-bar spheres' worth of upgrades in Game Day alone.
- **Maple: −968 triangles/scene** (unmerged/indexed; memory minor, the
  point is retiring the census's largest over-bar non-hero sphere).
- **Census: total 220 → 220, hits 154 → 154, BASELINE 154 → 154 (no
  change, stated explicitly). Site spend 39,242 → 38,802, and TRI_BASELINE
  = 38,802 is the new number that locks it.**
- **Seeded draws: 0 added, 0 removed, on every patch.** Neither touched
  file contains a single mrnd/mr/mpick/mchance call (grep: 0 hits in
  tailgate.ts and assets3d.ts); segment-count literals make no random calls,
  so the Maple mulberry32 stream cannot shift — and Game Day's scatter is
  `Math.random` besides (island.ts:5641).

## 10. RISKS

1. **Spawn counts are attempts, not placements.** `plant()` n is an upper
   bound (scatter rejects crowded sites). Savings scale with actual
   placements; even at half occupancy patches 1–2 clear 14k triangles.
2. **The balloon rider leans on frustum arithmetic.** If a future change
   lowers the flight path (island.ts:3493) or raises the camera, the
   balloon re-enters frame at range — silhouette still ≤2 chord-px beyond
   60 units, but the flat-shaded facet coarsening (disclosed in §4) becomes
   photographable. The lookbook gate in §8 is the tripwire; severability is
   the remedy.
3. **TRI_BASELINE's escape can be abused** — a lazy raise "with a reason"
   is the same exposure BASELINE has always accepted. The comment makes the
   one legitimate case explicit; the skeptic and the commit log hold it.
4. **Patch 4 without Patch 3 is a geometry bug** (θ-ring misalignment,
   §5). The conditional after-text (`3.13, 4, 14`) is written into §5; the
   skeptic should treat landing them out of step as a KILL condition.
5. **Line anchors drift.** All anchors were verified byte-exact on this
   tree (869/883 at 4-space indent, 165 at 8, 173 at 10; roundlod 49,
   58-59, 65-66, 85-88). Whoever lands re-verifies before/after text, not
   just numbers — the probe's own header says what happens to instruments
   that trust a moved call site.
6. **Concurrent round-2b crews.** Decision 2 edits rivals.ts (not these
   lines), decision 3 edits alpine.ts, decision 1 edits prototype3d.ts /
   island.ts:3894 — no overlapping hunks. Decision 5's only shared file is
   island.ts, which this proposal does not edit.
