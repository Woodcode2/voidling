# crew:powder-form — LANDING

**The verdict is the specification.** `docs/crews/round-3/powder-form.verdict.md`
split the proposal into six pieces. I landed the four it cleared, with its
corrections applied, and left the two it killed on the floor.

| piece | verdict | what I did |
|---|---|---|
| FINDING 1 — Powder is flat | SOUND | reproduced a third time on my own cold instrument, then a fourth time live, before touching anything |
| **B** — `GRAIN.powder` weights | SOUND WITH CORRECTIONS | **LANDED.** `[0.20,0.06,0.00,9]` → `[0.45,0.16,0.22,7]`, comment rewritten off canvas numbers and a device-pixel table |
| **A** — the bake's wind/chip pass | SOUND WITH CORRECTIONS | **LANDED**, steps 1b/1c after the base speckle loop |
| **C1** — `body.castShadow` size gate | NOT LANDABLE AS FILED | **NOT LANDED.** §8 proposes a compiling shape and the measurement it would have to survive. Nothing more |
| **C2** — the ring-weighted disc | KILLED | **NOT LANDED**, not refiled |
| `qa/groundgrain.mjs` | fails today — good, bar is wrong | **LANDED with a re-derived bar**: one limb, `median tile sd ≥ 0.0060`. The flat-share limb is printed and NOT gated |
| `qa/grounding.mjs` | SOUND WITH CORRECTIONS, plus one missed | **LANDED**, instrument first — and I found two further instrument faults on top of the one the skeptic found |

FINDING 2 — the mascot casts no ground shadow — **stands, confirmed on the
player's pipeline, and has no landed fix.** §6, written down here so it is not
lost with C1.

**The headline: Powder's median 16×16 tile goes 0.0037 → 0.0096, a factor of
2.6, on two builds photographed at the same settled spot through the same
lens — and the frame gets very slightly DARKER while doing it (mean luminance
0.5622 → 0.5617, any-channel ≥ 250 0.577% → 0.470%).**

**I committed nothing** — though another session committed some of my
in-progress files while I worked, which is worth knowing before anyone reads a
`git show` of them; §0. The source change is still uncommitted:
`git diff HEAD -- src/proto3d/island.ts` is 117 insertions and 3 deletions and
`src/` carries no other change since `7e3c80a`. Files touched:
`src/proto3d/island.ts`, `qa/groundgrain.mjs` (new), `qa/grounding.mjs`.
`src/proto3d/alpine.ts` was cleared for me and needed nothing — §7.

---

## 0. THE BUILDS, AND ONE THING THAT WENT WRONG IN THE ROOM

| arm | src digest | dist bundle | what it is |
|---|---|---|---|
| **before** | `a3d19e5b697d7b9c` | `main-MCZRgwBN.js` | HEAD `3da6daf`, clean tree |
| **after** | `161bef70db4c7405` | `main-BOt85OrA.js` | + patch A + patch B, and nothing else |

The two digests differ, so every before/after below is an A/B and not one build
photographed twice. (The bundle NAME is not evidence of anything: two builds of
the identical source produced `main-i0LwFaVT.js` and `main-MCZRgwBN.js` in this
same session, so vite's content hash is not stable here. The src digest is what
to read.)

**What went wrong, recorded because it cost two runs.** Another session was
running `qa/gate.mjs --profile=push` and three shoots on this container while I
started. Two of my probe runs died with `GPU process isn't usable. Goodbye.` —
four cores, five chromium instances. Both times the probe printed
`VERDICT FAIL … exited (1) without reaching a conclusion` instead of a number,
which is the silence-is-a-FAIL rule doing exactly its job. Every measurement
below was taken with the machine otherwise idle.

**And a live hazard for whoever reads this next: I did not commit, but these
patches are in the shared working tree, so any build anyone runs on this
container from now on contains them.** `dist/` as I leave it is the patched
build — `rgba(126,152,198` appears once in `main-Nc7Gdm7D.js` and the grain
table reads `powder:[.45,.16,.22,7]`, both checked in the served bundle. If
that is not wanted, `git checkout -- src/proto3d/island.ts && npm run build`
puts it back.

**Someone else committed my working files while I was working.** `470a454`
("Powder's probes and a second stray, in flight and still unruled") and
`b880667` are not mine — another session is committing in-flight state so a
restart cannot eat it, which is `docs/GOVERNOR.md` rule 7 being applied to
somebody else's crew and mine at the same time. Two consequences worth knowing:
the version of this note and of both probes inside those commits is a
half-finished draft, not this; and **two throwaway scripts of mine got swept
into the repo root with them** — `_pf3apply.mjs` (the patch applier, which
asserts each anchor matches exactly once before it writes anything, in the
`altbake.mjs` idiom) and `_pf3snow.mjs` (the snow-colour instrument behind the
`b − r` numbers in §2). I deleted them, found they were tracked, and put them
back rather than delete a tracked file outside my remit. **They do not belong at
the repo root; delete them or move them under `qa/`.**

---

## 1. FINDING 1, REPRODUCED TWICE MORE BEFORE ANYTHING WAS TOUCHED

My own instrument, written from the description: 16×16 non-overlapping tiles,
Rec.709 luminance on the sRGB bytes in 0..1, `sd < 0.004` = flat. Run cold
against the PNGs on disk.

```
  file                                 flat%   bot3rd   medSd    p95/p25   >=250%   meanL
  lookpair/maple_look.png               13.3     3.5     0.0172    2.29     0.0002  0.4740
  lookpair/pirate_look.png              39.9    44.8     0.0113    2.62     0.0003  0.3797
  lookpair/gameday_look.png             17.8    20.8     0.0360    4.48     0.0006  0.2792
  lookpair/lantern_look.png             18.3    31.6     0.0203    4.53     1.2498  0.2732
  lookpair/powder_look.png              51.3    54.4     0.0036    1.28     0.4221  0.5639
  shippedlook/powder_look.png           59.8    74.1     0.0033    1.43     0.0120  0.5232
  shippedlook/maple_look.png             7.5    14.8     0.0082    2.28     0.0000  0.4909
  6b207a5:shippedlook/powder_look.png   53.9    71.7     0.0036    1.56     0.0000  0.4715  <- PRE-RUNG
```

Every cell of the proposal's §2 table and of the skeptic's §1.1 table, to the
digit. The pre-RUNG frame I pulled out of
`git show 6b207a5:./qa/out/shippedlook/powder_look.png` myself; its stamp reads
`4f39f902eae8f3cb`, against `20d3f756b27be10d` for the canonical `shippedlook`
frame and `8bdf1a860df35055` for the `lookpair` pack. **Three source digests,
two spots, one answer, and RUNG 1 is not in it.**

Then a fourth time, live on today's build, through the probe I was about to
land: **medSd 0.0037, flat 52.1%**, at `camDist 129.1` — the follow law gives
129.1 for R = 4, so this is the lens the game uses and not a lens a probe
invented.

Three independent implementations now agree cell for cell.

---

## 2. PATCH B — `GRAIN.powder`

`src/proto3d/island.ts`, anchor verified by before-text — `powder:  [0.20, 0.06,
0.00, 9],` under the two-line "nearly grainless" comment. The proposal cites
`:3096`; on disk today it is `:3131`, and the before-text is exactly as filed.

```
  powder:  [0.20, 0.06, 0.00, 9]   ->   powder:  [0.45, 0.16, 0.22, 7]
```

The comment above it is replaced entirely. **Every number in the new comment was
actually run, and the one set that is not mine is attributed in the comment to
the run it came from.** The verdict's corrections:

**C-1 — the clip and mean figures come off the CANVAS.** The proposal's
"1.0778% → 1.0777%, unmoved to four decimal places" was counted in a
`WebGLRenderTarget`, which three 0.185.1 forces to `NoToneMapping` and linear
output (`three.module.js:7549-7559`, `:7585`) — a count of pixels over linear
0.98 *before* the tone curve, not a display-clipping figure. It is gone. The
comment carries the skeptic's canvas measurement, named as his: any-channel
≥ 250 goes 0.0089% → 0.0087%, **zero pixels cross into clipping**, largest
single-channel rise 9 codes, still zero at `[1,1,1,7]`. My own photograph pair
agrees in direction and magnitude: **≥ 250 goes 0.5767% → 0.4699% and mean
luminance 0.5622 → 0.5617.** Both instruments say the same thing — the patch
spends nothing, and if anything the frame gets darker.

**C-2 — the texels-per-pixel table is in DEVICE pixels.** Re-derived rather than
divided by two. `PW_LAND` (`powder.ts:60`) spans 5,900 × 9,500 world units; at
`SCALE = 0.05` that is 295 × 475 scene units. The ground UV maps that bbox onto
[0,1]² (`island.ts:2993-2994`), so on the X axis — the binding one, the bbox is
not square — the layers are 60.75, 14.75 and 6.07 texels per scene unit. The
lens is 32° over a 932-css-px viewport at `PR_TOP = 2`, i.e.
`2·932/(2·d·tan16°)` = **125.0 device px per scene unit at `camDist` 26 and 9.56
at the 340 clamp**:

| layer | repeat | texels/unit | d = 26 | d = 129 | d = 250 | d = 340 |
|---|---|---|---|---|---|---|
| fine | ×140 | 60.75 | 0.49 | 2.41 | 4.67 | **6.35** |
| mid | ×34 | 14.75 | 0.12 | 0.59 | 1.13 | **1.54** |
| coarse | ×7 | 6.07 | 0.05 | 0.24 | 0.47 | **0.64** |

Past `d ≈ 250` the fine layer is gone and the mid one is at the mip boundary;
the coarse layer is the only one still sharp at the clamp — **and Powder had it
at zero.** The mechanism survives the correction intact; only the numbers move.

**C-3 — the snow gets marginally warmer, and I put no colour claim in the
source at all.** `b − r` falling means blue has moved toward red, i.e. warmer;
the skeptic's controlled one-frame A/B reads 36.14 → 35.40 that way. **My own
photograph pair reads the other way: 34.41 → 35.12, marginally cooler**, over
pixels classified as snow by `b − r > 8` with a max channel in 120..245. The
two do not agree in sign and I am not going to pretend they do — his is the
controlled instrument (one frame, only the uniform moving) and mine is a pair
of photographs with a different crowd in each. Both moves are under one code
out of 255. `alpine.ts`'s BLUE SHADOW RULE is about `SNOW_D`, an authored prop
colour that no patch here touches, and neither reading threatens it. Nothing
about colour is asserted in the comment.

---

## 3. PATCH A — THE BAKE'S WIND AND CHIP PASS

`src/proto3d/island.ts`, inserted after the closing `}` of the 3,600-arc base
speckle loop and before `// 2. RIM SHADE`, so the rim shade, the piste, the grit
road, the lake and the village floor all still paint over it. Anchor verified by
before-text; the proposal cites `:1036/:1037`, on disk it is `:1071/:1072`.

5,200 sastrugi — a blue lee stroke with a white windward crest, all on one
bearing — and 9,000 hard crust chips. **19,400 canvas ops against Pirate Bay's
22,000 in the same idiom**, on a canvas already being painted; zero triangles,
zero draw calls, no clip path (for the reason step 4b of the Pirate bake gives).

Its comment carries the same C-2 correction, derived by me: one canvas px is
0.096 scene units, so a 3–7 px ridge is 0.29–0.67 units = **2.8–6.4 device px at
the 340 clamp and 36–84 at 26** — it resolves across the whole follow range,
where the ×140 speckle layer is at 6.35 texels per device pixel by the clamp. A
40–190 px ridge is 3.8–18.2 units = 97–460 device px at the R = 4 camera. A
1–3.4 px chip is 0.9–3.1 device px at the clamp and 12–41 at the tightest —
hard edges for the near camera, and honestly sub-pixel at the far one, which the
comment says rather than hides.

**Seeded draws: zero, checked rather than accepted.** `island.ts:268` is
`const rand = (a, b) => a + Math.random() * (b - a)`. A grep for
`mrnd|mr\(|mpick|mchance` over the whole Powder bake block returns nothing. The
block is inside `if (WORLD_ID === 'powder')`. Maple Falls' mulberry32 stream
cannot move. Patch A does spend **91,800 more `Math.random()` calls** — 9 per
ridge × 5,200 and 5 per chip × 9,000, counted off the code I landed.

**And I ran both arms of `qa/determ.mjs powder`, three loads each, rather than
only the one the landing order asks for:**

```
  AFTER  (patch A + B)   4526 / 4531 / 4525 props   hashes b3deae4, f727b018, 8b60ff37
                         POWDER: counts differ, layout DIFFERS — reseeds
  BEFORE (HEAD)          4527 / 4527 / 4527 props   hashes 28377459, b8239829, 36a516c5
                         POWDER: counts IDENTICAL, layout DIFFERS — reseeds
```

**DIFFERS on both arms**, which is what the accounting predicts: Powder's layout
was never stable, so patch A cannot have destabilised it. Worth noting the one
column that did move — the prop COUNT is identical across three loads before and
varies by six after. That is not the seeded stream (there isn't one here); it is
the async model-load race `qa/determ.mjs`'s own header describes, and 91,800
extra `Math.random()` calls in the bake shift the wall-clock at which those
`.then()`s land relative to the settle. **The layout verdict — the one the probe
is for — is identical on both arms.**

---

## 4. THE PROBES

### `qa/groundgrain.mjs` — NEW, and its bar is not the filed one

Nothing in `qa/` asked whether a world's ground carries information.
`qa/ground.mjs` drives the void and samples wherever it lands (its own successor
records that that variance is bigger than the effect); `qa/groundsurf.mjs`
measures roughness, proven inert on this surface; `qa/normals.mjs` classifies
form, not tone.

It shoots one frame per world at that world's own named fixed landmark spot,
rung 0, r = 4, camera settled on the MATCH clock until `camDist` stops moving,
and reports the median 16×16 tile sd. **The frame is a `p.screenshot`** — the
composited canvas, with ACES, the toe, the split tone, the chroma push,
`toneMappingExposure` and the sRGB encode all applied. The bar and the
measurement are therefore the same instrument as the `lookpair` pack the bar was
derived from.

**C-4 — the flat-share limb is printed and NOT gated, and here is why.** The
proposal set `flat share ≤ 30%` and asserted maple, pirate, gameday and lantern
all pass. **Pirate Bay measures 39.9% on the very pack the bar is derived
from** — its own §2 table says so, the skeptic re-measured 39.9%, and so did I.
As filed the limb reds a world nobody has claimed is broken. I did not move it
to 45%: flat share is `P(tile sd < 0.004)` and the median is the 50th percentile
of the same distribution, so two limbs off one distribution buy one fact and two
chances to be wrong. One limb, `median tile sd ≥ 0.0060`, and flat share printed
on every run because it is the statistic that describes what the defect looks
like.

**Where 0.0060 comes from.** The four other worlds measure 0.0113–0.0360 on my
instrument, one build, five spots. The obvious bar is the lowest of them,
0.0113, and it is the wrong bar: no grain weight anyone has measured reaches it
(the strongest, Lantern's own `[0.30,0.30,0.34,7]`, lands Powder at 0.0095 on
the skeptic's canvas run), because the other four frames get most of their tile
variance from CONTENT — a boardwalk, a canal, eleven truck rows, a town square.
Grain cannot manufacture a boardwalk. So the bar is **half the lowest shipped
world**, a value the defect fails by 1.6× and the ground itself can actually
reach.

**C-5 — the spots are PARSED out of `qa/lookpair.mjs`, not copied.** That file
declares `SPOTS` privately and boots a browser on import, so it cannot be
imported; and `qa/lookpair.mjs` is not on my edit list, so the verdict's
"move it to `qa/_spots.mjs`" was not available to me. Both probes read the real
`const w3 = …`, `const back = …` and `const SPOTS = { … };` declarations out of
that file at run time and **throw by name if any of the three anchors moves**.
No copy of the table exists anywhere — `_zgrade`, `_headcover` and `_distinct`
are in the retractions for exactly that.

**Two limits stated rather than tuned around**, both in the file's own header:
it measures the whole frame, so prop density inflates it (Powder is measured at
its own densest district and still fails by 1.6×, so the confound cannot explain
the result); and it measures ONE radius, r = 4, so it is not the evidence that
the flatness holds across the 26–340 follow range — the crew's sweep is.

### `qa/grounding.mjs` — corrected, instrument first

**C-6, the one the proposal missed: every code this probe ever printed was an
un-graded code.** It built a `WebGLRenderTarget` and read that, so the frame it
differenced had no ACES, no toe, no split tone, no chroma push, no
`toneMappingExposure` and no sRGB encode — while its own bar ("under ~12 is
below what phone screens resolve outdoors") was stated in display codes. It
renders to `null` and reads the default framebuffer with `gl.readPixels` inside
the same evaluate now, so the two renders are still the same frame and the codes
are the codes a phone shows. A retraction to that effect is in the file's own
header, per rule 3b.

Then the proposal's four:

1. **A world argument.** It was hard-coded to Maple and this whole finding is a
   Powder finding.
2. **A contrast bar, not only an extent bar.** Its verdict was
   `reach < 1.02 || footprint < 5%`, both of which Powder passes comfortably
   while the shadow is a haze.
3. **A retraction of the "4.6% annulus".** The geometry it reasoned from —
   `void3d.ts:2272-2275`'s "anything under about 1.45x is entirely hidden behind
   the ball" — is wrong by 2.8×. A ground point at radius `k` clears the
   silhouette when `k·sinθ > 1 − 0.9·cosθ`: **k > 0.524 at 46.4° and 0.689 at
   65.6°.** The visible annulus is most of the disc, not a hairline. The
   retraction is in the header; the same wrong number is still in `void3d.ts`,
   which is not mine to edit.
4. **Three more columns** — the world's own cast-shadow depth in the same frame,
   the hero's own cast shadow, and the centroid offset in hero-radii — plus
   `shadowMap.needsUpdate = true` before every render, because `autoUpdate` is
   false and a probe outside the frame loop otherwise differences a stale map.

**And two faults nobody had listed, both of which would have produced a passing
number for the wrong reason:**

- **The shadow toggle had to be a UNIFORM, not a define.**
  `renderer.shadowMap.enabled` is part of three's program cache key, and nothing
  in its `needsProgramChange` test watches it — I read
  `three.module.js:18382-18490` to check. Flipping it mid-frame would have left
  every compiled material rendering its shadows exactly as before, the world's
  own cast shadows would have measured **zero**, and a bar that is a fraction of
  zero passes anything. The probe uses `light.shadow.intensity` (a plain
  uniform; the shader ends `mix(1.0, shadow, shadowIntensity)`), and it now
  **refuses to report** if the toggle moved less than 0.1% of the frame.
- **It never pinned a rung, and it never let the camera arrive.** The old
  version set the radius and waited **3.4 wall seconds** — under a renderer
  where the match clock runs 14–40× slower than wall, and where `camDist` eases
  per FRAME. That is why the proposal's own §6.1 table reads `camDist` 51/63/97
  where the settled values are 129/251/340: it was measuring a lens the game
  never uses, the same fault that put the whole `shippedlook` pack three times
  too close. Worse, it pinned no quality rung, and `QUALITY[3]` is
  `shadows: false` — a software renderer walks down to it within seconds, and a
  shadow probe on a rung with no shadow map measures zero and reports it as an
  answer. It pins rung 0, warps to the world's fixed spot, settles on the match
  clock, prints the `camDist` and pitch it shot at, and FAILS if the rung it
  ends on has shadows off.

**The bar.** Not the "~12 codes" line — that is a number in a comment with
nothing behind it and rule 3 forbids building on it. The bar is **the shadow
this world already draws, in the same frame, under the same light**: the hero's
grounding shadow must reach at least one third of the median depth of every
other cast shadow in the picture. One third is a floor and a judgement, and the
file says so: a soft radial disc cannot reach a cast shadow's median without
becoming the near-solid core `void3d.ts:641-646` already removed once as "a grey
circle glued around the hero", so demanding parity would demand the known
failure. It is a RATIO of a quantity measured in the same frame, so it moves
with the world's own light instead of describing the world it was written
against.

**The proposal's second limb is not gated, and that is the skeptic's risk 9
made concrete:** "peak ≥ two thirds of the world's p90" **already passes** on
the corrected instrument (42.0 against 35.8 at r = 4 in my run). It was only
failing in the un-graded buffer. It is printed as a descriptive column with the
words "already clear" beside it, so nobody reads the first honest run as a
regression in the argument.

---

## 5. THE RUNS, VERBATIM

### `qa/groundgrain.mjs` — the failing run first (rule 2)

```
  build  src digest a3d19e5b697d7b9c  ·  bar: median 16x16 tile sd >= 0.0060
  settle powder t=4.24 off=0.000 camDist=39.3 r=4.000 still=0/6 warps=1
  settle powder t=5.74 off=0.000 camDist=121.4 r=4.017 still=0/6 warps=1
  settle powder t=7.24 off=0.000 camDist=128.5 r=4.005 still=0/6 warps=1
  settle powder t=8.74 off=0.000 camDist=129.1 r=4.000 still=5/6 warps=1
  shot   powder — THE VILLAGE — chalets on the south-east shore
         landed (40.00, 140.00) Δ0.000u  biome=village  t=10.44  r=4.000  camDist=129.1  pitch=51.78°  rung=0  props=179
         860x1864  6148 tiles  medSd 0.0037  p25 0.0020  p90 0.1613  flat 52.1%  bottom-third flat 56.3%  meanL 0.5622  >=250 0.5767%
  VERDICT FAIL powder 0.0037 — below the 0.0060 bar (1.6x short). This ground
                              resolves to a gradient at the play camera.
```

### the same probe on the patched build

```
  build  src digest 161bef70db4c7405  ·  bar: median 16x16 tile sd >= 0.0060
  shot   powder — THE VILLAGE — chalets on the south-east shore
         landed (40.00, 140.00) Δ0.000u  biome=village  t=10.44  r=4.000  camDist=129.4  pitch=51.82°  rung=0  props=143
         860x1864  6148 tiles  medSd 0.0096  p25 0.0055  p90 0.1494  flat 8.1%  bottom-third flat 6.7%  meanL 0.5617  >=250 0.4699%
  VERDICT PASS powder 0.0096 — every world's median tile clears 0.0060.
```

**0.0037 → 0.0096, ×2.6, and 1.60× the bar.** Flat share 52.1% → 8.1%. Mean
luminance −0.09%, clip share DOWN by a fifth. The two frames are
`qa/out/groundgrain/powder.png` before and after — a canvas pair at one settled
spot on two builds, which is the pair the skeptic's risk 8 says nobody had.
(Read them as a PAIR, not as an A/B of one frame: `props` is 179 against 143 and
the crowd has moved, because the two runs are minutes apart in a living village.
The controlled one-frame evidence is the skeptic's uniform sweep.)

### the same probe on two worlds this patch does not touch

```
  maple    medSd 0.0131   2.19x bar   flat 14.8%   bot3 3.4%    camDist 129.1   props  86   PASS
  pirate   medSd 0.0133   2.21x bar   flat 38.5%   bot3 46.8%   camDist 129.1   props 113   PASS
```

Both at 2.2× the bar against Powder's 0.61× before the patch — the separation is
not marginal. And **Pirate Bay reads 38.5% flat LIVE**, against 39.9% on the
pack: the flat-share limb the proposal wanted gated at 30% would have redded a
healthy world on the live instrument too, not only on the pack. C-4 holds.

### `qa/grounding.mjs`, Powder, THE VILLAGE, patched build

```
     r   camDist  pitch  heroPxR |     the disc: px    mean   peak    p50  centroid  reach |  the world's own: px    mean    p50    p90 |  the hero, if he cast: px   mean    p50  centroid
   1.5     57.8   45.9      86   |          15920      16.6   43.9   14.0     1.08   1.73 |          142896      40.7   52.8   53.7 |             8097      45.2   53.5     1.52
     4    129.6   51.9     103   |          25272      15.7   42.0   12.9     1.01   1.74 |           81429      37.6   46.9   53.7 |            22176      49.7   53.6     1.46

  r=1.5   the world draws p50 52.8 in this frame; the hero needs 17.6 and has 14.0 (27%) — FAIL
  r=4     the world draws p50 46.9 in this frame; the hero needs 15.6 and has 12.9 (28%) — FAIL
  VERDICT FAIL NOT DARK ENOUGH at r = 1.5, 4
```

`camDist` 57.8 at r = 1.5 and 129.6 at r = 4 against the follow law's 57.8 and
129.1. The camera arrived.

---

## 6. FINDING 2 STANDS, AND NOTHING FIXES IT

**The game draws a 46.9-code shadow under a snowman and a 12.9-code haze under
its mascot, in the same frame, from the same light, at the lens the game uses.**
That is a factor of **3.6** — not the proposal's 4.9 (measured in the un-graded
buffer) and not exactly the skeptic's 4.0 (his frame, his build, before these
patches). The differences between 3.6, 4.0 and 4.9 are instrument and build; the
finding is the same finding on all three.

**Both of its proposed fixes died.** C1 does not compile as filed and its
centroid argument runs backwards; C2's comment is arithmetically false in two
load-bearing places. So this is the state of it, written here so that it is not
lost with the patches:

- the disc's own darkening is **27–28% of what this world's other shadows
  reach**, against a floor of 33%;
- turning `body.castShadow` on in the page for one render — a measurement, not a
  change — puts the hero's own shadow at **p50 53.5 at r = 1.5 and 53.6 at
  r = 4, i.e. 101% and 114% of the world's own**. C1's premise is exactly right:
  it is the same shadow map and the same light, so of course it lands at the
  same depth;
- and the reason it still cannot be landed is the next line. **The centroid of
  that cast shadow sits 1.52 hero-radii out at r = 1.5 and 1.46 at r = 4.** I
  reproduced the skeptic's 1.46 to the digit, and the small end is WORSE, not
  better. The proposal's argument was that a spawn-size hero's shadow reads as
  attached and only a WORLD ENDER's detaches; on this instrument the spawn-size
  hero's shadow is the one furthest outside his own silhouette. **That argument
  is dead as stated, and §8 says what would replace it.**

`qa/grounding.mjs` prints all of it on every run, so the finding now has a
standing instrument instead of a paragraph in a proposal.

---

## 7. WHAT I DID NOT DO

- **Did not land C1.** It does not compile as filed (`CAST_R` is declared
  nowhere; `:605` has no `r` in scope), and the centroid measurement the
  black-ellipse question turns on reads further out on both the skeptic's
  instrument and mine, not nearer.
- **Did not land C2, and did not refile it.** Its falloff is 1.47× steeper than
  the one it promises not to exceed, and its new alpha peak at ρ ≈ 0.34 is
  visible for most of the establishing shot, because `k(θ) = (1 − 0.9cosθ)/sinθ`
  is not monotonic and bottoms out at θ ≈ 25.9° — inside the intro's own 45°
  swing. The second is the exact failure `void3d.ts:641-646` already records.
- **Did not touch `src/proto3d/void3d.ts`.** Not on my list. So two of the three
  claims the proposal's §13 item 7 asks to correct in place — `:2272-2275`'s
  "1.45x" and `:604`'s comment describing a size gate that is not there — **are
  still wrong and still uncorrected in the source.** The third,
  `qa/grounding.mjs`'s "4.6% annulus", is corrected in that file's own header as
  a retraction rather than a deletion.
- **Did not touch `src/proto3d/alpine.ts`**, though I was cleared to. I read it
  looking for a claim this finding refutes and found none: its BLUE SHADOW RULE
  is about `SNOW_D`, an authored prop colour no patch here moves, and its
  snow-cap and window rules are untouched by a ground texture. Editing it to say
  so would have been noise.
- **Did not touch `qa/lookpair.mjs`**, so C-5 is answered by parsing rather than
  by moving the table. **Did not re-shoot the canonical pack**, did not start a
  server, did not kill the one on `:4177`, did not commit.
- **Did not measure the frame cost of the coarse layer.** §8 of the proposal
  could not resolve it (the unchanged setting moved 865 → 380 ms across three
  passes) and neither can this container. **It is unmeasured, it is not written
  down as a number anywhere, and it is the one claim in this landing that is
  open.** Lantern has paid the same fetch since the rig landed.

---

## 8. WHAT THE NEXT CREW OWES

1. **Game Day and Lantern, live, to finish the baseline.** The bar came off the
   `lookpair` PNG pack; I ran the probe live on three of the five. Live and pack
   do not read identically in either direction — Maple is 0.0131 live against
   0.0172 on the pack, Pirate 0.0133 against 0.0113 — so a live number is not a
   pack number and the remaining two are unverified live. Both worlds I did run
   land at 2.2× the bar and Game Day and Lantern are the two HIGHEST on the pack
   (0.0360 and 0.0203), so I expect them clear; expecting is not measuring. If
   either comes in under 0.0060, **retract the bar in the header and re-derive
   it from live numbers — do not move it to make a build pass.**
2. **The prop-blind version of the same probe.** Hide everything with
   `o.userData.fade !== undefined` and measure the ground alone. The whole-frame
   version can be passed on props, and the header says so.
3. **A `CAST_R` sweep that is not about the centroid.** The centroid is the
   wrong statistic for the black-ellipse question and this round has now
   measured it three times without settling anything. The objection at
   `void3d.ts:1570-1580` is about a shadow that reads as a SECOND DARK MASS —
   which is a question about the GAP, not the centre of mass. Measure: the
   shortest distance, in hero-radii, from the hero's projected silhouette to the
   nearest pixel of his own cast shadow, and the share of that shadow that
   touches him. A shadow at gap 0 reads as attached at any centroid. Sweep
   r = 4 → 24 in **Powder and Game Day** (the world the objection came from, and
   the lowest sun at 40°) and find where the gap first opens.
4. **Then, and only then, a compiling C1.** The shape that typechecks — the
   skeptic verified `tsc` exit 0 on it and so the filing was incomplete rather
   than wrong-headed — is: `body.castShadow = true;` at `:605` (which is what
   the comment above it has always described), `const CAST_R = <the swept
   value>;` beside `RADIUS_SINK`, and `body.castShadow = r <= CAST_R;` in
   `setRadius`. **I am not proposing a value for `CAST_R` and I did not land the
   shape.** It also needs `qa/shadowcost.mjs` before and after, because
   `void3d.ts:1578` counts not being "the largest single caster in the frustum
   during the heaviest third of every match" as a saving, and a gate must not
   quietly give that back.
5. **C2 refiled, or dropped.** If refiled: the falloff either flattened to the
   shipped ceiling or the claim about it withdrawn, the intro visibility range
   stated (ρ 0.34 is visible from about θ 15.5° to 46°), and the whole candidate
   table re-run on the canvas — candidate D, the 1.25× disc, was dismissed on
   numbers from the wrong buffer.
6. **The two wrong claims still in `void3d.ts`**, corrected in place as the
   ledger does with the horizon: the "1.45x" at `:2272-2275` and the phantom
   size gate at `:604`.
7. **The frame cost of `uGrain.z` on real hardware**, or an explicit acceptance
   that it is unmeasured. It is not written down as a number anywhere in what I
   landed.
8. **An art-director look at the two frames** in `qa/out/groundgrain/`, and in
   particular at TILING: repeat 7 puts one mottle tile every 42 scene units in x
   and 68 in z, and the visible ground at `camDist` 129 is about 74 units tall —
   one to two tiles per frame, on the most uniform surface in the game. The tile
   is wrap-safe and Lantern has shipped at repeat 7 without a complaint, but
   nobody has looked for one on snow.

---

## 9. RULE 3 LEDGER — every number now in the source, and where it came from

| number, as it appears in `island.ts` | who ran it |
|---|---|
| `powder 0.0036 · pirate 0.0113 · maple 0.0172 · lantern 0.0203 · gameday 0.0360` | **me**, cold, off `qa/out/lookpair/*.png` (§1) |
| `flat share 51.3% against maple's 13.3%` | **me**, same run |
| `3.1x flatter than the next flattest` | **me**, 0.0113 / 0.0036 |
| `295 x 475-unit bowl`, `0.096 scene units per canvas px` | **me**, from `PW_LAND` in `powder.ts:60` at `SCALE = 0.05` |
| `125 down to 9.6 device px per scene unit` | **me**, `2·932/(2·d·tan16°)` at `PR_TOP = 2`, `fov 32` |
| `fine 0.49 → 6.35 · mid 0.12 → 1.54 · coarse 0.05 → 0.64` | **me**, from the two rows above |
| ridge and chip sizes in device px (2.8–6.4, 36–84, 97–460, 0.9–3.1, 12–41) | **me**, same arithmetic |
| `19,400 canvas ops`, `91,800 Math.random calls`, `9 per ridge, 5 per chip` | **me**, counted off the code as landed |
| `Pirate Bay's 22,000` | **me**, counted off `island.ts` step 4b (13,000 + 9,000) |
| `any-channel >= 250 goes 0.0089% → 0.0087%`, `zero pixels cross`, `9 codes`, `[1,1,1,7]` | **the skeptic**, verdict §1.2 — and the comment says so in the comment |

Nothing else numeric was added to the source. The one figure the proposal most
wanted in there — the frame cost of the extra `texture2D` — is absent, because
nobody has measured it.
