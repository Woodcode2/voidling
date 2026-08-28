# crew:powder-form — snow with no information in it

**Filed 2026-08-28. Nothing here is landed. This crew edited no tracked file;
`docs/crews/round-3/powder-form.proposal.md` is the only file it wrote.**
HEAD `6a424e6`. `dist/` built at 14:22 from that source
(`dist/assets/main-CQnJG8bD.js`). The preview already running on `:4177` was
used and never restarted. Every alternate build in here was served into that
same preview by route interception, the technique
`docs/crews/round-3/gamutzero-repair.proposal.md` §0 established.

---

## 0. THE SHORT VERSION

Two findings came down from `docs/crews/round-2b/rung1-ruling.md`. I re-measured
both.

1. **Powder is 5–8× flatter than any other world — CONFIRMED**, and it now
   reproduces on **three** Powder frames from **two** spots and **two** builds,
   including a five-world one-build pack the ruling did not use. It is a
   property of the world, not of the shot.
2. **"The hero casts no readable ground shadow" — NOT confirmed as stated, and
   the true cause is one boolean.**
   The contact disc renders, tracks the hero, and reaches 1.7–2.1 hero-radii
   past his silhouette. What is true is narrower and worse: **it has no
   contrast and no edge.** Peak darkening 17.9–22.7 codes out of 255, mean
   8.5–10.9 over the pixels it touches, spread across 34–45% of the hero's own
   on-screen area, with its rim off the bottom of the crescent in a ramp of
   about 0.08 codes per pixel. It is a vignette, not a contact.

   And it is not the disc's fault. **In the same frame, the shadow this game
   already draws under a snowman measures 44.7 luminance codes at its median
   and the one under its mascot measures 9.1 — a factor of 4.9.** The reason is
   `void3d.ts:605`: a comment that says "Starts true; setRadius() gates it once
   the hero is big" sitting on top of a line that sets `castShadow` to an
   unconditional `false`. Turn it back on at a spawn-size hero and his shadow
   measures **p50 45.4**, which is the world's own number.

Two findings, one sentence: **Powder's ground carries no grain at any frequency
its own camera resolves, and its mascot was given a painted vignette in place of
the shadow the renderer was already drawing for everything else in the frame.**

Four patches, all of them zero triangles and zero seeded draws:

| # | file | anchor | what |
|---|---|---|---|
| **A** | `src/proto3d/island.ts` | `:1036`, a new step 1b/1c after the base pass | wind structure in the Powder bake — sastrugi and crust chips |
| **B** | `src/proto3d/island.ts` | `:3096` `GRAIN.powder` | `[0.20, 0.06, 0.00, 9]` → `[0.45, 0.16, 0.22, 7]` |
| **C1** | `src/proto3d/void3d.ts` | `:605` and `:1582`, `body.castShadow` | give the hero back the REAL shadow the file's own comment says he has — size-gated, as it was designed |
| **C2** | `src/proto3d/void3d.ts` | `:646–656` `softShadowTex`, `:690` `opacity` | and for the sizes where C1 stays off, move the disc's alpha into the annulus the camera can actually see |

And two things I killed by measuring them, so nobody re-proposes them: §1.

---

## 1. THREE HYPOTHESES I KILLED BEFORE PROPOSING ANYTHING

### 1.1 "The ACES shoulder is eating the contrast at exposure 1.18" — REFUTED

This is the attractive explanation and it is wrong. I transcribed the shipped
grade — ACES, the gamut guard, the `TOE = 0.014` compressor, the split tone and
the 1.07 chroma push, `src/prototype3d.ts:255–322` — into JS and differentiated
it. A **×0.70 linear darkening**, which is roughly what the contact disc's peak
visible alpha does, buys:

```
  base display code   80   100   120   140   150   160   170   180   200
  codes bought        23    25    27    28    28    28    27    26    22
```

Flat across the whole range, at Powder's own exposure. And at the ground's own
level, exposure 1.00 vs 1.18 buys **27 vs 26 codes** for the same darkening.
The tone curve is not eating anything. Whatever is missing was never put in.

The same model gives the headroom figure this proposal has to spend against:
Powder's ground displays at code ~163, which is linear **0.4308** at exposure
1.18; the first linear value that displays ≥250 is **5.2537**. **There is
×12.2 of linear headroom over the ground.** Measured on the shipped frame
rather than modelled: `qa/out/shippedlook/powder_look.png` has max RGB
(250, 244, 242), the 99th percentile of its max-channel is 228, and
any-channel ≥ 250 is 0.0120% of frame.

### 1.2 "Unlock `RIG.hemiI` for Powder" — RUN, and it buys nothing

`rung1-ruling.md` lists this as unmeasured and worth a run: Powder's own rig
comment (`src/prototype3d.ts:791–797`) calls the ground bounce "the work no
other world gets", `WORLD_LIGHT.powder.hemiI` is **0.9** and `RIG.hemiI`
(`:838`) pins every world to **0.22**. The standing refutation is Lantern-only
("a brighter floor times dark paint is still dark"); Powder's floor is snow, so
it deserved its own run.

I ran it on the live scene at THE VILLAGE, rung 0, camera settled,
`hemi.intensity` 0.22 → 0.9 and back:

| | flat-patch share | median patch sd | snow mean rgb |
|---|---|---|---|
| `hemiI` 0.22 (shipped) | 48.9% | 0.0046 | (154.9, 161.9, 181.3) |
| `hemiI` 0.90 | 49.8% | **0.0041** | (158.2, 165.3, 185.6) |

**+3.3 codes of snow brightness and no form at all** — the median patch sd goes
*down*. A hemisphere light has no direction, so it cannot make a flat plane
less flat; it can only raise it. Do not re-propose this for Powder.

### 1.3 "The contact disc is frozen at the spawn" — my own artifact, twice

My first two live reads found exactly one object named `contact` in the scene,
sitting at **(14.93, 95.04)** with scale 1.495 while the hero stood at
**(40, 140)**. (14.93, 95.04) is `PW_SPAWN` (`powder.ts:241` → `w3` = 15, 95)
and scale 1.495 is the spawn radius. It looked like a hero who had left his
shadow behind at the start line.

It was the probe. A settle loop built out of `p.evaluate` round-trips **does
not advance a single frame** under swiftshader — two hundred round-trips fit
between two rAF callbacks, so the loop "converges" on state nothing has
simulated. `void3d.ts:2276` writes `contact.position` at the end of every
`update()` with the same `s.x`/`s.z` that positions the hero's group, and
`__warpVoid` (`prototype3d.ts:1904`) moves that group **directly**, so a warp
with no frame in between separates them and nothing has gone wrong.

Every measurement below settles **in page, on `requestAnimationFrame`**, and
holds until `camDist` stops moving — because `camDist` eases toward
`clamp(38·(R/0.9)^0.82, 26, 340)` by `(1 − e^(−1.6·dt))` **per frame**
(`prototype3d.ts:9252`, `:9305`), and convergence is counted in frames, not in
match seconds. This is `qa/lookpair.mjs`'s rule and it exists for this reason.

---

## 2. FINDING 1, RE-MEASURED — AND ON A BETTER PACK THAN THE RULING HAD

The ruling worked from `qa/out/shippedlook/`. There is a five-world pack in the
tree it did not use: **`qa/out/lookpair/`** — one build (`8bdf1a860df35055`,
stamped beside every frame), five worlds, each warped to its own named fixed
landmark spot, each with the camera settled. It is the pack this question wants,
because it removes the composition confound the ruling had to write around.

16×16 luminance patches, sd < 0.004 = "flat", one build, five spots:

| world | flat share | bottom third | **median patch sd** | p95/p25 | p95 − median (codes) |
|---|---|---|---|---|---|
| maple | 13.3% | 3.5% | 0.0172 | 2.29 | 59.0 |
| pirate | 39.9% | 44.8% | 0.0113 | 2.62 | 88.6 |
| gameday | 17.8% | 20.8% | 0.0360 | 4.48 | 119.2 |
| lantern | 18.3% | 31.6% | 0.0203 | 4.53 | 117.5 |
| **powder** | **51.3%** | **54.4%** | **0.0036** | **1.28** | **26.6** |

**Powder's median patch carries 3.1× less local tonal variation than the next
flattest world and 10× less than Game Day.** Its p95/p25 of 1.28 means the
brightest twentieth of the frame is 28% brighter than the darkest quarter; in
Game Day it is 348% brighter.

And the spot is not the excuse. `qa/lookpair.mjs:215` puts Powder at **THE
VILLAGE**, which `powder.ts:196` authors at **density 1.5 — the highest in the
level**. Powder measures three times flatter than any other world *at its own
densest district*.

The ruling's own frames, re-derived by me on the same instrument, and two more.
The digests are the `.src` stamps beside each frame, so these really are
different builds and not the same one photographed twice:

| frame | source digest | flat | bottom third | median patch sd |
|---|---|---|---|---|
| `shippedlook/powder_look.png` (canonical) | `20d3f756b27be10d` | 59.8% | 74.1% | 0.0033 |
| `6b207a5:…/powder_look.png` (**pre-rung**) | — | 53.9% | 71.7% | 0.0036 |
| `lookpair/powder_look.png` (THE VILLAGE) | `8bdf1a860df35055` | 51.3% | 54.4% | 0.0036 |
| my own settled shoot, THE VILLAGE, today | `main-CQnJG8bD.js` | 54.9% | — | 0.0030 |

**Four frames, four builds spanning five days, two spots — 0.0030 to 0.0036
every time. The pre-rung frame is just as flat.** RUNG 1 did not cause this and
undoing RUNG 1 would not fix it. (My p95/p25 for Powder is 1.28–1.43 where the ruling
reports 1.93; we are computing it differently — mine is over every pixel's
luminance. The ordering and the ratios are the same, and I quote only my own.)

---

## 3. WHY `[0.20, 0.06, 0.00, 9]` CANNOT WORK IN THIS WORLD AT ANY RADIUS

This is arithmetic on Powder's own numbers, not on Maple's.

`PW_LAND` (`powder.ts:60`) spans 5,900 × 9,500 world units; `SCALE = 0.05`
(`island.ts:75`) makes that **W3 ≈ 295 × H3 ≈ 475 scene units**. The ground UV
maps that bbox onto [0,1]² (`island.ts:2955–2960`), so the grain layers' repeat
counts resolve to a **texels-per-scene-unit** figure — and, because the bbox is
not square, an anisotropic one. The camera shows `932/(2·d·tan16°) = 1625/d`
css px per scene unit at follow distance `d`, and `d` runs **26 → 340**
(`prototype3d.ts:9252`).

Texels per screen pixel (X axis; > ~1.5 means the mip chain has averaged the
layer to flat grey before it reaches the phone):

| layer | repeat | texels/unit | d = 26 | d = 129 (R=4) | d = 340 (VOID TITAN) |
|---|---|---|---|---|---|
| fine (speckle 128px) | ×140 | 60.7 | 0.97 | 4.8 | **12.6** |
| mid (speckle 128px) | ×34 | 14.8 | 0.24 | 1.17 | **3.07** |
| coarse (mottle 256px) | ×7 | 6.1 | 0.10 | 0.48 | 1.26 |

**At the late-match camera the coarse layer is the only one that survives, and
Powder has it at zero.** The fine layer — the one Powder does spend weight on,
at 0.20 — is gone by `d = 129`, which is where the camera sits from about the
third form onward. So Powder's ground grain is loudest exactly where the camera
is closest and absent for the whole second half of every match.

That is half the mechanism behind the comment at `island.ts:3094`. The other
half is the claim it makes — "the bake's own blue shadowing carries the
variation" — and §5 reads the bake and shows that its blue is all REGION-scale:
a 900-unit rim stroke and four district fills. It separates districts. It cannot
put information inside one.

---

## 4. PATCH B — THE GRAIN WEIGHTS

**`src/proto3d/island.ts:3094–3096`**, verified on disk:

```ts
    // snow: nearly grainless — fresh powder is the smoothest ground in the
    // game, and the bake's own blue shadowing carries the variation
    powder:  [0.20, 0.06, 0.00, 9],
```

after:

```ts
    // SNOW IS NOT SMOOTH, IT IS SMOOTH-LOOKING — and the difference is the
    // whole world. Measured (docs/crews/round-3/powder-form.proposal.md):
    // at these weights Powder's median 16x16 patch sd is 0.0036 against
    // 0.0113-0.0360 for the other four worlds on the same build and the same
    // instrument, 3.1x flatter than the next flattest. The claim above about
    // the bake was checked and does not hold: the bake's blue is REGION-scale
    // (a 900-unit rim stroke, a district fill), so it separates districts and
    // carries nothing at grain frequency.
    // The layer that matters here is the COARSE one, and it was the one at
    // zero. Bake 3072px over a 295x475-unit bowl; the camera runs 26-340 units
    // out, i.e. 62.5 down to 4.8 css px per unit. Texels per pixel: fine
    // (x140) 0.97 -> 12.6, mid (x34) 0.24 -> 3.07, coarse (x7) 0.10 -> 1.26.
    // Past d ~ 200 the coarse layer is the only one the mip chain has not
    // averaged away, which is most of every match.
    powder:  [0.45, 0.16, 0.22, 7],
```

### The measurement

Live on the real page, Powder, THE VILLAGE, rung 0, camera settled, **one
frame, only `uGrain` moving between renders** (the uniform is reachable at
`groundMat.userData.grainU`, `island.ts:3152`, put there for exactly this):

```
world=powder R=4  frames=66  matchT=8.2  camDist=128.8  pitch=51.79
contact=[{"d":0.00,"s":6.09}]          <- tracking; 6.09 = dispR 4.006 x 1.52

  [fine,mid,coarse,rep]      flat%  snowFlat%  medSd    mean    >=250    >=240   snow rgb
  [0.20,0.06,0.00,9]          54.9      62.3  0.0030  0.6037   1.0778   1.363  [157.8,167.5,191.8]
  [0.45,0.08,0.00,9] pack      36.3      39.0  0.0046  0.6037   1.0778   1.362  [157.8,167.6,191.8]
  [0.45,0.16,0.00,9]          25.2      26.6  0.0050  0.6037   1.0778   1.362  [157.8,167.6,191.8]
  [0.45,0.16,0.22,7] PROPOSED 13.6      14.1  0.0068  0.6013   1.0777   1.362  [157.5,166.9,190.8]
  [0.55,0.24,0.30,6]           5.9       5.2  0.0082  0.6021   1.0771   1.361  [157.8,167.1,190.7]
  [0.30,0.30,0.34,7] lantern    9.7       9.8  0.0089  0.5998   1.0777   1.362  [157.6,166.8,190.3]
```

`camDist 128.8` against the 129.1 the follow law gives for R = 4 — this is the
lens the game actually uses, reached in 66 rendered frames of in-page settling.

**Median patch sd 0.0030 → 0.0068, a factor of 2.3, and the flat share
54.9% → 13.6%** — which lands Powder on Maple's 13.3% (§2), the flagship world,
rather than past it.

**The clip figure is 1.0778% → 1.0777%.** Unmoved to four decimal places. So is
≥ 240 (1.363 → 1.362). Mean luminance falls 0.6037 → 0.6013, **−0.4%**. Snow
colour moves (157.8, 167.5, 191.8) → (157.5, 166.9, 190.8): 0.3, 0.6 and 1.0
codes down, i.e. very slightly cooler and darker, not warmer. **This patch
spends nothing measurable out of a ×12.2 linear headroom.**

**And a limit I am stating rather than hiding: it does not close the gap to the
pack.** After the patch Powder's median patch sd is 0.0068 against 0.0113 for
the next-flattest world. Grain cannot close that, and it should not be asked to:
the rest of the gap is CONTENT — the other four frames have a boardwalk, a
canal, eleven truck rows, a town square in them. `rung1-ruling.md`'s own item 4
says "and something with an edge in the upper 60% of its frame", and that is a
different piece of work. The bar in §9.1 is set where this patch can actually
land, and says so.


The same sweep as **screenshot pairs**, taken minutes apart at the same spot and
the same settled camera, so the crowd has walked between them. Quoted because
the frames are what the art director will look at, and because the two
instruments agreeing on the ordering and roughly on the magnitudes is worth
something — but the one-frame table above is the evidence:

| `[fine, mid, coarse, rep]` | flat | bottom third | median patch sd | any-ch ≥ 250 |
|---|---|---|---|---|
| `[0.20, 0.06, 0.00, 9]` shipped | 48.9% | 62.5% | 0.0046 | 0.5521% |
| `[0.45, 0.16, 0.00, 9]` | 22.1% | 3.5% | 0.0058 | 0.5605% |
| **`[0.45, 0.16, 0.22, 7]` proposed** | **10.8%** | **0.9%** | **0.0088** | **0.5555%** |
| `[0.55, 0.24, 0.30, 6]` | 3.7% | 0.1% | 0.0101 | 0.5614% |
| `[0.30, 0.30, 0.34, 7]` lantern's | 5.9% | 3.1% | 0.0115 | 0.5608% |

### And it is worse in the frame a child judges the game on

No warp, no radius pin, the authored spawn, the real establishing shot. At each
beat the grain uniform was toggled and the pair rendered **back to back into one
render target**, so the two rows of every beat are the same frame:

| match t | camera y | pitch | `uGrain` | flat | snow-flat | median patch sd | mean lum | any-ch ≥ 250 |
|---|---|---|---|---|---|---|---|---|
| 0.12 | 115.6 | 25.5° | shipped | 64.2% | 47.2% | **0.0019** | 0.4432 | 0.3171% |
| 0.12 | 115.6 | 25.5° | proposed | 43.2% | 12.9% | 0.0047 | 0.4423 | 0.3171% |
| 0.66 | 161.4 | 44.9° | shipped | 57.6% | 55.9% | 0.0028 | 0.4787 | 0.3146% |
| 0.66 | 161.4 | 44.9° | proposed | 32.2% | 19.7% | 0.0053 | 0.4783 | 0.3146% |
| 1.52 | 99.9 | 52.7° | shipped | 65.3% | 62.7% | 0.0022 | 0.6566 | 0.0381% |
| 1.52 | 99.9 | 52.7° | proposed | 11.7% | 12.7% | 0.0058 | 0.6554 | 0.0381% |
| 3.04 | 34.4 | 47.2° | shipped | 73.7% | 69.0% | 0.0030 | 0.6094 | 0.2138% |
| 3.04 | 34.4 | 47.2° | proposed | 5.9% | 2.9% | 0.0064 | 0.6020 | 0.2138% |
| 6.10 | 29.0 | 45.9° | shipped | **76.0%** | **71.4%** | 0.0029 | 0.6111 | 0.3067% |
| 6.10 | 29.0 | 45.9° | proposed | 5.8% | 1.6% | 0.0063 | 0.6025 | 0.3067% |

**The opening beat is the flattest frame in the game**: median patch sd 0.0019,
against 0.0036 in settled play and 0.0113–0.0360 for the other four worlds. The
establishing shot is a lit lodge on a sheet of paper, with the coastline and the
night sky above it — the camera is 115.6 units up at 25.5° and the horizon band
is on screen, exactly as `GOVERNOR.md`'s 2026-08-28 entry says it is.

**And the clip figure is bit-identical at every beat** — 0.3171 vs 0.3171,
0.0381 vs 0.0381 — because the pixels near 250 in this world are lit windows and
sky, which the ground shader never touches. Mean luminance moves at most
**−1.4%** (0.6111 → 0.6025).

So, in the form the brief demands: **the flatness holds across the follow
distance from 26 to 340 units AND through the intro, and the patch answers it at
both ends.** It is not a claim about one radius.

### What it spends

**Nothing measurable, and this is the number the brief asked for.** On the
one-frame A/B, any-channel ≥ 250 goes **1.0778% → 1.0777%** and ≥ 240 goes
1.363% → 1.362%. Mean luminance falls 0.6037 → 0.6013, **−0.4%**. Through the
whole intro the clip figure is bit-identical at every beat, because the pixels
near 250 in this world are lit chalet windows and sky and the ground shader
never touches them.

The mechanism, so the skeptic does not have to take the measurement on trust:
the grain multiplies albedo by `mix(1, g·2, w)` around tiles whose mean is
normalised to neutral — `island.ts:3026–3058` rescales the mottle so its mean is
exactly 128 and its sd a known number, and its own comment says the point of
that is that "the layer can only ever add variation, never brightness". So it
darkens as often as it brightens. And against **×12.2 of linear headroom**
(§1.1), even a full-weight stack of all three layers — ×2 · ×2 · ×2 = ×8 —
would not reach the clip.

The other thing it could spend is the snow's colour, because the mottle carries
warm and cool blobs (`island.ts:3012–3019`) and a warm cast on snow reads as
dirt. Measured over snow-classified pixels only, on the same one frame:

| | snow mean rgb | b − r |
|---|---|---|
| shipped `[0.20,0.06,0.00,9]` | (157.8, 167.5, 191.8) | 34.0 |
| proposed `[0.45,0.16,0.22,7]` | (157.5, 166.9, 190.8) | **33.3** |

Three tenths, six tenths and one code down — the snow gets very slightly darker
and cooler, not warmer. (The route-interception pair in §5, at a different
composition, reads the same direction more strongly: b − r 27.98 → 30.61.) **The
blue-shadow rule in `alpine.ts:26–34` survives the patch.**

### Why `[0.45, 0.16, 0.22, 7]` and not `[0.55, 0.24, 0.30, 6]`

Not because 0.30/6 overshoots the pack — it does not. On the clean one-frame
A/B it measures a median patch sd of **0.0082**, still below every other world
(0.0113–0.0360), and its clip figure is 1.0771%, also unmoved. It is a
legitimate value and it is recorded as the measured ceiling.

The reason is **flat share**, which is the statistic that describes what this
defect looks like rather than how much texture there is.
`[0.45,0.16,0.22,7]` lands Powder at **13.6%**, which is Maple's 13.3% — the
flagship world, and a defensible target for "Powder is a world in this game".
`[0.55,0.24,0.30,6]` lands 5.9%, which is less flat than anything shipped.
Neither is wrong; the first is calibrated to something and the second is
calibrated to nothing. **If the art director prefers 0.30/6 from the photographs,
the measurements support it and only the §9.1 bar moves.**

Repeat 7 rather than 9 for the same reason as Lantern: 256 × 7 = 1,792 texels
over 295 units is 6.1 per unit, which still resolves at `d = 340`; at repeat 9
it is 7.8 per unit and 1.63 texels/px, which is where the mip chain starts
taking it. **Watch item for the skeptic:** repeat 7 puts one mottle tile every
42 scene units in X and 68 in Z, and the visible ground at `d = 129` is about
74 units tall — one to two tiles per frame. The tile is wrap-safe (every blob
drawn nine times, `island.ts:3005–3011`) and Lantern has shipped at repeat 7
without a tiling complaint, but nobody has looked for one on a surface this
uniform. **Look at `scratchpad/pf/alt/powder_both.png` for a repeat before
landing it.**

---

## 5. PATCH A — THE BAKE, AND WHAT IS ACTUALLY IN IT

The comment at `island.ts:3094` says the bake carries the variation. Here is the
whole Powder bake, read off disk at `island.ts:1015–1113`:

| step | what it paints | scale |
|---|---|---|
| 1 | `#dfe7f6` fill, then 3,600 soft arcs of radius 3–10 canvas px at alpha 0.10/0.16 | 0.6–2 scene units, ~5% coverage |
| 2 | rim shade: two strokes of the land ring at width 900 and 1,700 **world** units | region |
| 3 | pinewood floor fill | region |
| 4 | the piste, 5 sled lines | one line |
| 5 | the grit road, 2 strokes | one line |
| 6 | the lake gradient + 9 cracks | one object |
| 7 | village floor fill | region |
| 8 | lodge apron ellipse | one object |

**Steps 2, 3, 7 and 8 are region fills.** They separate districts; they cannot
put information inside one. Step 1 is the only grain in the bake, at 5% coverage
and alpha 0.10–0.16, and it is the reason the shipped frame reads as an airbrush
gradient. Compare Pirate Bay's step 4b (`island.ts:1286–1323`), which lays
**13,000 hard 1–2px chips and 9,000 directional strokes** over its island and is
titled "FINE GRAIN … a flat district fill reads as painted card at street zoom".
Powder has no equivalent. That is the finding: **not that the bake is wrong, but
that the bake has no grain pass at all.**

### The patch

**`src/proto3d/island.ts`, inserted after `:1036`** (the closing brace of the
base-speckle loop, before `// 2. RIM SHADE`), so the rim shade, the piste, the
road and the village still paint over it:

```ts
    // 1b. WIND. Snow's texture is not speckle, it is DIRECTION: the wind that
    // dropped it leaves long shallow ridges — sastrugi — all lying on one
    // bearing, each with a blue lee shadow and a bright windward crest. That
    // pairing is what makes a snowfield read as a surface rather than as paper,
    // and it is the one thing a radial blob cannot do.
    // The sizes are derived, not chosen. This bake is 3072px across a
    // 295x475-unit bowl, so a canvas pixel is 0.096 scene units in x; the play
    // camera runs 62.5 down to 4.8 css px per unit (camDist 26-340). A ridge
    // 3-7 canvas px wide is 0.29-0.67 units, which is 1.4-3.2 px at the widest
    // follow distance and 18-42 at the tightest: it resolves across the whole
    // range instead of mipping away like the 140x speckle layer does. A ridge
    // 40-190 px long is 3.8-18.2 units, 48-230 css px at the R=4 camera.
    const WIND = -0.55;                      // one bearing for the whole valley
    // SAVE/RESTORE, because lineCap leaks: step 2's rim stroke and step 4's
    // piste both run off whatever this pass leaves set.
    g.save();
    g.lineCap = 'round';
    for (let i = 0; i < 5200; i++) {
      const x = Math.random() * TEX, y = Math.random() * TEX;
      const L = rand(40, 190), a = WIND + rand(-0.22, 0.22);
      const dx = Math.cos(a), dy = Math.sin(a);
      g.strokeStyle = `rgba(126,152,198,${(0.05 + Math.random() * 0.09).toFixed(3)})`;
      g.lineWidth = rand(3, 7);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * L, y + dy * L); g.stroke();
      const o = rand(3, 7), ox = -dy * o, oy = dx * o;     // the crest, across the ridge
      g.strokeStyle = `rgba(255,255,255,${(0.06 + Math.random() * 0.10).toFixed(3)})`;
      g.lineWidth = rand(2, 4);
      g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + dx * L + ox, y + dy * L + oy); g.stroke();
    }
    // 1c. CRUST CHIPS. Hard edges, the only high-frequency thing on this
    // ground: at the tightest follow distance a soft blob is a smudge and the
    // eye has nothing to catch on. Same idiom as Pirate Bay's step 4b, and no
    // clip path for the same reason — texels outside the coastline are never
    // sampled, and clipping thousands of ops against the ring costs more than
    // the whole rest of the bake.
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * TEX, y = Math.random() * TEX;
      g.fillStyle = Math.random() < 0.5 ? 'rgba(122,148,196,0.13)' : 'rgba(255,255,255,0.15)';
      g.fillRect(x, y, 1 + Math.random() * 2.4, 1 + Math.random() * 2.4);
    }
    g.restore();
```

**19,400 canvas ops** (5,200 × 2 strokes + 9,000 `fillRect`s) against Pirate
Bay's 22,000 in the same idiom, and **91,800 `Math.random()` calls** — the
accounting in §7. **No clip path**, for the reason `island.ts:1292–1296` gives:
clipping 25k tiny ops against a 186-vertex coastline took Pirate's bake
"from milliseconds to minutes in software rasterisers", and texels outside the
coastline are never sampled because the ground mesh IS the silhouette.

### The photograph, on a real build

`altbake.mjs` reads `dist/assets/main-CQnJG8bD.js`, asserts each anchor matches
**exactly once**, applies patch A and patch B as string replacements that mirror
the source above, and serves the result into the running preview by
`page.route('**/assets/main-*.js', …)`. Nothing on disk changed. Same world,
same spot, same shoot procedure, same rung:

| build | flat | bottom third | median patch sd | any-ch ≥ 250 | snow rgb | b − r |
|---|---|---|---|---|---|---|
| `ctrl` — unpatched, served the same way | 51.1% | 49.0% | 0.0036 | 0.6229% | (153.1, 160.6, 181.1) | 27.98 |
| `bake` — **patch A only** | 38.5% | 45.4% | **0.0058** | 0.1305% | — | — |
| `both` — patch A + patch B | **5.4%** | **6.1%** | **0.0089** | 0.2346% | (152.9, 161.6, 183.5) | **30.61** |

`scratchpad/pf/alt/powder_{ctrl,bakeonly,both}.png`. **Read these as
photographs, not as an A/B**: the void drifts between runs, so the three frames
are different corners of THE VILLAGE and the composition is not controlled. The
controlled numbers are the one-frame uniform sweeps above.

What the bake-only arm does establish is that **patch A is not redundant with
patch B**. On its own it moves the median patch sd 0.0036 → 0.0058, +61%, and
the flat share 51.1% → 38.5% — about half of what the grain weights buy, from a
completely different mechanism (structure baked into the albedo, at a frequency
the mip chain cannot average because it is painted at 3072 px across the bowl
rather than tiled at 140×). The two stack: 0.0089 together.

**They are still separable and they should be landed separately**, patch B
first, because patch B is four numbers and patch A is thirty lines and a
world-build cost.

---

## 6. FINDING 2, RE-MEASURED — AND PATCHES C1 AND C2

### 6.1 What the disc actually does

`void3d.ts:680–705` builds one `CircleGeometry(1)` with a radial-alpha map,
`color 0x171021`, `opacity 0.62`, normal blending, and `void3d.ts:2276` scales
it to `dispR * 1.52` and parks it under the hero every frame. The hero's body
does **not** cast into the shadow map (`void3d.ts:605` and `:1582`). So this
disc is the entire grounding of the character in all five worlds — and §6.4
shows that that is a regression against this file's own written design, not a
decision anybody made about a hero this size.

Measured the only way it can be: **one frame rendered twice, disc visible and
disc hidden, inside a single `evaluate` with nothing stepped in between**, into
an sRGB render target so "codes" mean what they mean on the screen. (Two
Playwright screenshots cannot do this. I tried: the pair came back with 424k
changed pixels and a peak of 199, because forty wall-seconds of a living village
had happened between them. `qa/grounding.mjs` gets this right and says so in its
header.)

```
world=powder, THE VILLAGE, rung 0, mood pinned, mouth pinned
     r   camDist  pitch  ballPxR   shadowPx   %hero   peak   mean   reach   below
   1.5     39.6   45.9      76           0    0.0%    0.0    0.0    0.00    —      <- see note
     4     51.0   48.0     311      137274   45.2%   17.9    8.5    1.71    1.00
     9     63.0   48.9     541      369964   40.2%   22.7   10.9    2.05    1.00
    16     97.1   56.1     501      270023   34.2%   20.7   10.1    1.89    1.00
```

`peak` and `mean` are luminance codes out of 255 that the disc removes from the
ground; `%hero` is the shadow's visible footprint as a share of the hero's own
on-screen disc; `reach` is the furthest darkened pixel in hero-radii; `below` is
the share of darkened pixels that fall below him on screen.

**The r = 1.5 row is the §1.3 artifact and I am leaving it in.** That row was the
first measurement after the warp, the settle had not advanced a frame, and the
disc was still at the spawn 51.5 units away and off-frame — hence zero. It is
what a bad settle looks like in a table, and the next three rows are what the
same code produces once frames actually run.

**The camera in these three rows had not fully converged either** —
`camDist` reads 51/63/97 where the settled follow distances for R = 4/9/16 are
129/251/340. The ratios (`%hero`, `reach`) and the code depths (`peak`, `mean`)
are the transferable quantities: the disc's alpha does not depend on the follow
distance, only on the pitch, which these rows span from 48° to 56°. The absolute
pixel counts do scale, and are quoted only for shape.

**So: 100% of the shadow is below him, it reaches about two hero-radii, it
covers a third to a half of his own area — and its deepest pixel is 18–23 codes
out of 255 while most of its area sits at 9–11.**


### 6.2 The geometry claim in the source is wrong by 2.8×

`void3d.ts:2272–2275`:

> at the fixed 46.4-degree elevation anything under about 1.45x is entirely
> hidden behind the ball

`qa/grounding.mjs:8–13` repeats it and derives from it that "the disc shows a
ring 4.6% of his radius wide … a near-black at 15% over a 4.6% annulus is close
to nothing."

Take `dispR = 1`. The hero's group sits at `y = dispR · RADIUS_SINK` with
`RADIUS_SINK = 0.9` (`void3d.ts:76`, `:1904`), and the body is a unit sphere
scaled by `dispR`, so the ball's centre is 0.9 up and its bottom is 0.1 *below*
the ground. On screen, world-up projects with `cos θ` and a ground step toward
the camera projects `sin θ` downward. The disc's nearest-to-camera point at
ground radius `k` escapes the ball's silhouette when

    k · sin θ  >  1 − 0.9 · cos θ

At θ = 46.4° (`camOffset` at `steep = 0`, `prototype3d.ts:9309`) that is
**k > 0.524**, and at θ = 65.6° (`steep = 1`, R ≥ 8) **k > 0.689**.

**Not 1.45 — 0.52.** At the shipped 1.52 the disc is *not* a thin annulus: it
shows from ρ = 0.52 to ρ = 1.52, which is 65% of its own radius, a crescent
about 0.72 × the ball's radius deep. The measured `reach` of 1.7–2.1 hero-radii
confirms it, and so does the shipped frame: in
`qa/out/shippedlook/powder_look.png` the ball's centre is at y = 848 with radius
334, which puts the hero's ground point at y ≈ 1063 and predicts the disc's rim
at y ≈ 1417 — and the luminance ramp under him runs from 136 at y = 1200 up to
164 and flattens at **y ≈ 1400–1420**.

So the disc is large, it is present, it tracks, and its rim lands where the
model says. **The defect is that 28 codes of darkening are spread over 354
pixels of screen — 0.079 codes per pixel — with the deepest part hidden behind
the ball and the shallowest part filling the frame.** There is no edge anywhere
for the eye to read as contact. On snow, which has no other shading in it at
all (§2), that is indistinguishable from a vignette.

The ruling measured "rows 1200–1380 span 8.5–18.1 codes" and called it no
shadow. Both readings are of the same ramp: a window inside a 354-pixel gradient
sees a small range no matter how deep the gradient is. The ruling's number is
right and its conclusion — "the hero lost his shadow at RUNG 1" — is not: the
**pre-rung** frame is the same picture (§2), and I could find no contact edge in
Maple's canonical frame either.

### 6.3 PATCH C2 — the disc, for the sizes that must keep it

The lever is not opacity and it is not colour. It is **where in the radius the
alpha sits**, because everything inside ρ = 0.52 is painted for nobody.

`src/proto3d/void3d.ts:646–656`:

```ts
  const softShadowTex = (size: number) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const x = cv.getContext('2d')!;
    const gr = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0.00, 'rgba(255,255,255,0.62)');
    gr.addColorStop(0.30, 'rgba(255,255,255,0.50)');
    gr.addColorStop(0.58, 'rgba(255,255,255,0.28)');
    gr.addColorStop(0.80, 'rgba(255,255,255,0.10)');
    gr.addColorStop(1.00, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(cv);
  };
```

**The one thing this patch must not do** is bring back the failure this file's
own comment records (`void3d.ts:641–646`): the original disc "held 0.72–0.95
alpha out to half its radius … and that near-solid core ended in a step, which
is the edge the eye locked onto." So the profile below keeps the falloff
**continuous everywhere** — it moves the maximum outward to ρ ≈ 0.34, which is
under the ball at every pitch the game reaches, and lets it decay smoothly to
zero at the rim. There is no plateau and no step, and no segment of it is
steeper than the 0.28 → 0.10 it replaces.

after — and every number below is measured, not chosen:

```ts
  /** …and the ALPHA IS RING-WEIGHTED, because the centre of this disc is
   *  painted for nobody.
   *
   *  THE GEOMETRY, and it is not the 1.45x this file used to claim. The body
   *  sits at y = dispR * RADIUS_SINK (0.9) and is a unit sphere scaled by
   *  dispR, so on screen the ball's lowest pixel is (1 - 0.9 cos t) * dispR
   *  below the hero's ground point while a disc point at ground radius k
   *  reaches k sin(t) below it. The disc emerges from behind the ball at
   *      k > (1 - 0.9 cos t) / sin t
   *  = 0.524 at the 46.4-degree spawn pitch, 0.689 at the 65.6-degree WORLD
   *  ENDER pitch. At 1.52x that is the first 34-45% of THIS gradient: the 0.62
   *  peak and most of the 0.50 shoulder are painted where no camera in this
   *  game can see them.
   *
   *  MEASURED, one frame, disc visible against disc hidden, sRGB render
   *  target, camDist 128.8 (the settled R=4 lens):
   *      shipped profile   peak 23.0   mean  9.8   31.9% of its area >= 12 codes
   *      this profile      peak 40.7   mean 15.8   50.2%
   *  The old one is a vignette: 28 codes spread over 354 screen pixels, about
   *  0.08 codes per pixel, with no edge anywhere for the eye to read as
   *  contact.
   *
   *  The falloff stays CONTINUOUS. No plateau, no step — a step is the failure
   *  this profile was rebuilt to remove (see above), and no segment here is
   *  steeper than the 0.28 -> 0.10 it replaces. */
    gr.addColorStop(0.00, 'rgba(255,255,255,0.46)');
    gr.addColorStop(0.34, 'rgba(255,255,255,0.58)');
    gr.addColorStop(0.55, 'rgba(255,255,255,0.44)');
    gr.addColorStop(0.75, 'rgba(255,255,255,0.20)');
    gr.addColorStop(1.00, 'rgba(255,255,255,0)');
```

and `void3d.ts:690`, `opacity: 0.62` → `opacity: 0.80`.

### The candidates, measured

One frame, Powder, THE VILLAGE, `camDist 128.8`, `pitch 51.79°`, R = 4, disc
hidden once and every candidate differenced against that same hidden render:

| variant | peak | mean | share of its area ≥ 12 codes | footprint vs hero | reach |
|---|---|---|---|---|---|
| **shipped** — map 0.62/0.50/0.28/0.10/0, opacity 0.62 | 23.0 | 9.8 | **31.9%** | 61.7% | 1.65 |
| A — ring-weighted map, opacity 0.62 | 29.8 | 12.6 | 42.3% | 73.5% | 1.72 |
| **B — ring-weighted map, opacity 0.80 — PROPOSED** | **40.7** | **15.8** | **50.2%** | 78.4% | 1.75 |
| C — shipped map, opacity 1.00 | 39.9 | 14.2 | 47.2% | 74.0% | 1.72 |
| D — ring-weighted, opacity 0.80, disc 1.52 → 1.25× | 35.9 | 14.3 | 48.3% | 41.8% | 1.51 |
| E — ring-weighted, opacity 0.92 | 47.7 | 18.0 | 55.6% | 80.6% | 1.75 |

(The probe's in-frame hero radius was inflated by a rival void's purple pixels —
240.3 against the 101.75 a largest-connected-component measurement gives on the
same frame — so `footprint` and `reach` are corrected by that factor here and
`peak`, `mean` and `% ≥ 12` are untouched by it. The corrected reach of 1.65
agrees with the independent radius sweep above.)

**B rather than C**, even though C is a one-token change that gets most of the
way, because C does not remove the cause: it scales the whole profile including
the third of it that is under the ball at every size, so it buys the same
contrast by painting more where nobody looks. `docs/GOVERNOR.md` rule 6.
**B rather than E**, because E is 18 mean codes and the risk this profile family
carries is the grey-saucer read, and nobody has looked at E on a phone.
**D is recorded and not proposed**: shrinking the disc buys a crisper edge and
gives back a third of the footprint, which is a real trade, but it changes the
hero's silhouette-to-shadow ratio in all five worlds and that is an art
direction call, not a defect fix.

**This patch is world-agnostic and I am not proposing a Powder-only version.**
The disc is the same object in all five worlds and it measures the same way in
Maple's canonical frame (no contact edge findable by eye). A per-world profile
would be five numbers where one will do. **The skeptic should require the
before/after pair in at least Maple and Lantern as well as Powder** — Lantern
because a disc at 0.80 opacity over a near-black floor is where "a grey circle"
comes back, and it is the one world whose ground is darker than the disc.


---

### 6.4 PATCH C1 — AND THIS IS THE ONE THAT REMOVES THE CAUSE

`void3d.ts:604–605`, verbatim:

```ts
  // Starts true; setRadius() gates it once the hero is big — see the note there.
  body.castShadow = false;   // grounded by the contact disc, never by the shadow map
```

**The comment describes a size gate. The line under it is an unconditional
false, and so is `setRadius` at `:1582`.** The recorded reasoning
(`void3d.ts:1570–1580`) is specific and it is about ONE size: *"Under GAME DAY's
40-degree sun a WORLD ENDER is a 24-unit sphere, and casting from it laid a hard
black ellipse on the ground beside the hero… Small, a real shadow is what
grounds him; big, the contact disc below already does that job."* The evidence
is about a 24-unit sphere. It says nothing about a spawn-size hero, and the
comment two lines above says so.

**Measured**, Powder, THE VILLAGE, settled camera, one frame each, the disc
differenced out separately from the cast shadow so the two are disjoint:

```
   r  camDist pitch |  disc only: px  mean  peak   p50 | + body cast: px  mean  peak   p50 | the cast shadow alone
 1.5    57.4  45.9  |        6267   9.2  22.7   8.1 |       14549  32.6  71.5  37.7 | 10612 px  mean 39.1  p50 45.4  centroid 1.37 heroR out
   4   129.3  51.9  |       20656   9.7  24.0   8.9 |       32287  37.1  67.7  48.5 | 22725 px  mean 43.6  p50 46.8  centroid 1.22 heroR out
```

**The hero's own cast shadow measures p50 45.4 and 46.8 — the same depth as
every other shadow in the frame (44.7, §9.2), because it IS the same shadow
map and the same light.** Against the disc's 8.1 and 8.9. It costs no new
material, no new geometry and no art: it is one boolean that the file already
documents as being conditional.

Its centroid sits **1.22–1.37 hero-radii** from his centre, i.e. essentially at
the edge of his own silhouette (and that is an over-estimate: the probe's
purple segmentation reads the ball at about 76% of its projected radius, so
corrected it is nearer **0.9–1.0**). At these sizes it reads as a shadow
attached to him, not as a second dark mass beside him.

```ts
  // THE SIZE GATE THIS COMMENT ALWAYS DESCRIBED. The recorded objection is
  // about a WORLD ENDER — a 24-unit sphere under Game Day's 40-degree sun,
  // throwing a hard ellipse further than its own diameter. It is not about a
  // hero the size of a bin. Measured in Powder at a settled camera, one frame,
  // the cast shadow differenced on its own: p50 45.4 at r=1.5 and 46.8 at r=4,
  // against the contact disc's 8.1 and 8.9, and against 44.7 for every other
  // cast shadow in the same frame. Its centroid sits ~1 hero-radius out, i.e.
  // at the edge of his silhouette.
  body.castShadow = r <= CAST_R;    // and the same line in setRadius()
```

**The gate value is NOT measured above 4 and I am not going to invent it.**
`CAST_R` is written here as a named constant precisely so the crew that lands it
has to put a swept number in it. Sweep 4 → 24 in Powder AND in Game Day (the
world the original objection came from, and the one with the lowest sun at 40°),
find the radius where the shadow's centroid passes the silhouette and the
ellipse detaches, and set `CAST_R` one step below it. `qa/grounding.mjs`
extended per §9.2 already prints the centroid offset; this is a two-hour sweep,
not a judgement call.

**And the cost is a real one that must be measured with it.** The hero becomes a
caster again: a 7,081-vertex sphere in a half-rate shadow pass
(`prototype3d.ts:9669`) whose box `fitShadow` caps at 110 units up close. At
r ≤ 4 he is small and the box is tight, which is the cheap end — but
`void3d.ts:1578` explicitly counts handing back "the largest single caster in
the frustum during the heaviest third of every match" as a benefit of the
current setting, and a gate must not give that back. Landing this needs
`qa/shadowcost.mjs` before and after.

**One gotcha, recorded because it cost me a whole run.**
`renderer.shadowMap.autoUpdate` is **false** (`prototype3d.ts:142`) and the frame
loop sets `needsUpdate` every other frame (`:9669`). A probe that renders into
its own render target inside one `evaluate` never runs that loop, so flipping
`castShadow` changes **exactly zero pixels** — which is what the first run of
this measurement reported, and it looks identical to "the flag does nothing".
Set `renderer.shadowMap.needsUpdate = true` before each render or the answer is
always no.

### 6.5 So which of C1 and C2?

**Both, and in that order.** C1 is the fix — it removes the cause, it costs one
boolean, and it lands the hero's shadow at the depth the world already draws.
C2 is for the forms where C1 must stay off, and on its own it takes the disc
from p50 8.9 to a mean of 15.8 and a peak of 40.7 — better, and still not a
cast shadow.

With C1 on at r = 4 the disc and the cast shadow together measure p50 48.5
against the cast shadow's own 46.8 — the disc adds almost nothing where the real
shadow lands, and about 9 codes where it does not. **So C1 does not require any
change to the disc at small sizes**, and C2 can be judged on the large forms
alone, which is where it matters and where nobody has photographed it.

---

## 7. SEEDED-DRAW ACCOUNTING

**Powder Pass is on `Math.random`. Explicitly, and here is the proof rather than
the assertion.**

- The seeded stream is `MS.mr / MS.mpick / MS.mrnd / MS.mchance`
  (`island.ts:288`), one mulberry32, documented as Maple Falls' at
  `mainstreet.ts:252` and in `docs/GOVERNOR.md` under HANDS OFF.
- `island.ts:268` — `const rand = (a, b) => a + Math.random() * (b - a)`. Not
  seeded.
- `grep` over the whole Powder bake block, `island.ts:1015–1113`: **zero**
  occurrences of `mrnd`, `mr(`, `mpick`, `mchance`.
- `alpine.ts:137–138` — `rnd` and `pick` are `Math.random`.

| patch | seeded draws added | seeded draws removed | net effect on Maple's stream |
|---|---|---|---|
| A (bake) | 0 | 0 | **none — the code is inside `if (WORLD_ID === 'powder')` and calls `Math.random` only** |
| B (grain weights) | 0 | 0 | **none — a constant-table edit, no draw of any kind** |
| C1 (`body.castShadow` size gate) | 0 | 0 | **none — one boolean, no draw** |
| C2 (contact disc profile) | 0 | 0 | **none — a canvas gradient built once at boot, in every world** |

Patch A does consume **91,800 additional `Math.random()` calls** during
Powder's bake — 5,200 × 9 in the sastrugi loop and 9,000 × 5 in the chips loop,
counted off the code in §5 — which advances the *global* `Math.random` sequence before
`populate()` runs. That sequence is unseeded, so Powder's prop layout already
differs on every load — `qa/determ.mjs powder` should be run before landing and
is expected to report "DIFFERS — reseeds" both before and after. Nothing that
was ever stable moves.

---

## 8. TRIANGLE AND FRAME COST

**Triangles: zero, for all four patches.** No geometry is created, destroyed or
re-tessellated. `qa/roundlod.mjs`'s `TRI_BASELINE = 39018` ratchet is untouched
by construction — none of these patches goes near a sphere, and the ratchet only
moves down.

**Draw calls: zero, and one shadow-map caster for C1.** Patch A paints 19,400
extra 2D ops (5,200 × 2 strokes + 9,000 `fillRect`s) into the 3072² bake canvas
that is already being painted — against Pirate Bay's existing 22,000-op grain
pass at `island.ts:1286–1323`, which is the precedent and the sizing. Patch B
changes four numbers in a uniform. Patch C2 changes a 256² canvas that already
exists. **C1 adds the hero to the shadow-caster set** at r ≤ `CAST_R`; that is
the one real per-frame cost in this document and §6.4 says what must be measured
for it.

**Fragment cost: one extra `texture2D` per ground fragment, and it is the whole
reason `uGrain.z` is a branch.** `island.ts:3199–3204` skips the mottle fetch
when the weight is zero, deliberately — "turning a layer off should give the
cost back, not just the effect" — so patch B turns that fetch back on for the
largest surface in the frame. Lantern already pays it.

Measured on the real page, Powder, rung 0, 24 rAF intervals per setting,
**alternated three times** so a scheduler or thermal drift cannot masquerade as
the effect:

```
  pass0  [0.20,0.06,0.00,9]   median  865.1 ms   p90   948.4
  pass0  [0.45,0.16,0.22,7]   median  584.3 ms   p90  1236.9
  pass1  [0.20,0.06,0.00,9]   median  564.1 ms   p90  1120.8
  pass1  [0.45,0.16,0.22,7]   median  553.9 ms   p90  1082.1
  pass2  [0.20,0.06,0.00,9]   median  380.4 ms   p90   708.1
  pass2  [0.45,0.16,0.22,7]   median  388.4 ms   p90   715.3
```

**This measurement cannot resolve the cost and I am not going to pretend it
can.** The unchanged setting moves 865 → 564 → 380 ms across the three passes —
a 2.3× spread — while the largest difference between settings inside a pass is
smaller than that spread. The best-settled pass reads **+2.1%** (380.4 → 388.4).
Under swiftshader every fragment is a CPU instruction, so a texture fetch is
also the most over-weighted thing here; on a GPU an extra `texture2D` on an
already-bound, already-mipped 256² texture is close to free, and Lantern has
been paying it since the rig landed.

**Required before landing: one `qa/qualcost.mjs`-style run on real hardware, or
an explicit acceptance that the number is unmeasured.** The frame-cost claim is
the only one in this document I could not close.

The bake cost, from the three route-interception runs (§5): world-build
**6.9 s (ctrl) → 7.7 s (bake only) → 7.7 s (bake + grain)** under the software
rasteriser, i.e. **+0.8 s** on the step that paints the 3072² canvas, all of it
patch A, none of it patch B. n = 1 per arm and the boot numbers in the same runs
varied 11.2 → 13.4 s on code that did not change, so treat **+11.6%** as
indicative and re-run it three times if patch A is taken. It is one-off load
cost, not per-frame, and it lands on a screen that is already covered by the
loading copy.

---

## 9. THE PROBES

### 9.1 `qa/groundgrain.mjs` — NEW, and it fails today

The gap it fills: nothing in `qa/` measures whether a world's ground carries
information. `qa/ground.mjs` drives the void and samples wherever it lands, and
its own successor `qa/_grainab.mjs` records that this variance is bigger than the
effect. `qa/groundsurf.mjs` measures roughness, which was proved inert on this
surface. `qa/normals.mjs` classifies form, not tone.

Design, and every line of it is a rule from `docs/GOVERNOR.md` paid for:

- **Reads the real page** at a named fixed world spot per world, reusing
  `qa/lookpair.mjs`'s `SPOTS` table by import rather than a copy — no snapshot
  (retraction: `_zgrade`, `_headcover`, `_distinct`).
- **Settles in page on `requestAnimationFrame` until `camDist` stops moving**,
  and prints the frame count it took. A settle made of `p.evaluate` round-trips
  advances no frames (§1.3) and reports numbers from a camera that is still
  travelling.
- Pins rung 0 and the radius, and **states the radius and the resulting
  `camDist` in its own output**, because the follow distance runs 26–340 and a
  bar at one radius is the mistake `GOVERNOR.md` has recorded three times.
- Measures **median 16×16 luminance patch sd** and the share of patches under
  0.004, over the whole frame.
- **Bar: median patch sd ≥ 0.0060, flat-patch share ≤ 30%.**

**Where 0.0060 comes from, and why it is not 0.0113.** The four other worlds
measure 0.0113–0.0360 on the same instrument, one build, five spots (§2), so the
obvious bar is "the lowest of them". **Patch B cannot reach it and neither can
any grain weight I measured** — the strongest, Lantern's own `[0.30,0.30,0.34,7]`,
lands Powder at 0.0089. The reason is that the other four frames get most of
their patch variation from CONTENT — a boardwalk, a canal, eleven truck rows, a
town square — and Powder's hero district is chalets on open snow. Grain cannot
manufacture a boardwalk and should not be asked to. So the bar is set at **half
the lowest shipped world**, which is a number this defect fails by 2× and this
patch passes:

| | median patch sd | vs bar 0.0060 |
|---|---|---|
| Powder today | 0.0030 | **FAIL, by 2.0×** |
| Powder + patch B | 0.0068 | pass, +13% |
| Powder + patch A + patch B | 0.0089 | pass, +48% |
| maple / pirate / gameday / lantern | 0.0113–0.0360 | pass, +88% to +500% |

**+13% is thin and I am saying so.** If the skeptic wants margin, the answer is
to take patch A as well — not to push the grain weight past the pack. And the
rest of the gap to 0.0113 is `rung1-ruling.md`'s own item 4, *"and something
with an edge in the upper 60% of its frame"*, which is content and is not this
crew's patch.

Today, on `qa/out/lookpair/`'s build: **powder 0.0036 and 51.3% — FAILS both
gates.** maple, pirate, gameday and lantern pass both.

**A limit stated rather than tuned around:** this measures the whole frame, so
prop density inflates it. Powder is measured at its own densest district
(density 1.5) and still fails by 3.1×, so the confound cannot explain the
result — but a world could pass this bar on props alone. The stronger version
hides every prop (`o.userData.fade !== undefined`, the selector
`qa/_grainab.mjs` already uses) and measures the ground by itself; it needs a
five-world baseline run that this crew did not have the wall-clock for, and it
is the version to build if this bar is ever argued with.

### 9.2 `qa/grounding.mjs` — CORRECT IT, do not replace it

It already renders the frame twice and differences the disc, which is the right
instrument and better than anything I would have written. Three changes:

1. **A world argument.** It is hard-coded to Maple at `:53` and `:60`. This
   whole finding is about Powder and the probe has never been pointed at it.
2. **A contrast bar, not only an extent bar.** Its verdict is
   `reach < 1.02 || footprint < 5%` — both of which Powder **passes**
   comfortably while the shadow is a haze. It already computes `peak` and
   `mean` and prints them; they need to be gated. This is
   `docs/GOVERNOR.md` retraction 10 again — *"no pure black is not no holes"* —
   in a third instrument: the probe measures whether a shadow EXISTS, and the
   defect is that it is not LEGIBLE.
3. **A retraction in its own header**, because its stated geometry is wrong:
   "a ring 4.6% of his radius wide" and "the alpha profile at that distance is
   about 0.24" both come from the 1.45× figure refuted in §6.2. The visible
   annulus is 65% of the disc's radius, not 4.6%.
4. **Three more columns, and they are what patch C1 is judged on**: the
   world's own cast-shadow depth in the same frame (`shadowMap.enabled` on
   against off, disc hidden in both); the hero's cast shadow on its own; and
   the **centroid offset** of that cast shadow from his silhouette, in
   hero-radii, which is the quantity the `CAST_R` sweep in §6.4 needs and the
   quantity the original black-ellipse objection was actually about.
   And `renderer.shadowMap.needsUpdate = true` before every render in it —
   see the gotcha in §6.4.

**Where the bar comes from.** Not from the "under ~12 is below the threshold
most phone screens resolve outdoors" line already in that file — that is a
number in a comment with nothing behind it, and rule 3 says I may not build on
it. The bar should be **the shadow this world already draws**: in the same
frame, at the same camera, difference `renderer.shadowMap.enabled` on against
off, and take the depth distribution of every cast shadow in the picture. The
hero's contact shadow should be at least as dark as the shadow the game puts
under a snowman.

**I ran it.** Powder, THE VILLAGE, R = 4, camera settled at `camDist 129`,
`pitch 51.82°`, in one frame: the disc differenced against a hidden disc, and
`renderer.shadowMap.enabled` differenced on against off with the disc hidden in
both, so the two populations are disjoint.

```
  what                            px     %frame   mean   peak    p50    p75    p90    p99
  the hero's contact disc      14773      0.92%    9.7   23.0    9.1   13.1   15.9   21.7
  the world's own cast shadows 111641      6.96%   35.8   71.7   44.7   47.9   48.5   52.7
```

**The shadow this game already draws under a snowman is 44.7 codes at its
median. The one it draws under its mascot is 9.1.** Same frame, same light, same
ground, same camera — a factor of **4.9**. That is the finding in one line, and
it is the bar: nothing about "12 codes" or "what a phone resolves outdoors" is
needed.

**Patch C1 reaches this bar exactly; patch C2 cannot, and that is the argument
for doing C1.** With the size gate restored the hero's own cast shadow measures
**p50 45.4 at r = 1.5 and 46.8 at r = 4** against the world's 44.7 — it is the
same shadow map, so of course it does. The best disc profile I measured
(candidate B) reaches a mean of 15.8 and a peak of 40.7; to put a soft radial
disc's *median* at 44.7 you would need roughly five times today's alpha across
its whole visible annulus, which is the near-opaque core this file already
removed once as "a grey circle glued around the hero".

So the gate has two limbs:

- **Where the hero casts** (r ≤ `CAST_R`): his shadow's p50 must be within
  20% of the world's own cast-shadow p50 in the same frame. Today: **no cast
  shadow at all — 0 pixels — FAIL.** With C1: 45.4 against 44.7, and 46.8
  against 46.8.
- **Where he does not** (r > `CAST_R`): the contact disc's p50 must reach at
  least one third of the world's cast-shadow p50 and its peak two thirds of
  that p90. Today at r = 4: **9.1 against a required 14.9, and 23.0 against a
  required 32.3 — FAILS both.** Candidate C2 lands 15.8 mean and 40.7 peak.

Both limbs fail on today's build, which satisfies rule 2 before a line of either
fix is written.

---

## 10. WHAT I DID NOT DO

- **Did not edit a tracked file.** Every alternate build was served into the
  running preview by route interception; every uniform, light and material
  change was made live in the page and put back.
- **Did not touch exposure.** `WORLD_LIGHT.powder.exposure` stays 1.18. (Note
  for the ledger: `rung1-ruling.md` cites it at `prototype3d.ts:774`; on disk
  today it is **`:798–800`**.)
- **Did not re-propose `RIG.hemiI`** — §1.2 killed it with a measurement.
- **Did not delete the contact disc**, and did not propose deleting it. Patch
  C1 restores a size-gated cast shadow; the disc stays and keeps doing the job
  it was built for at the sizes where a cast shadow is the wrong answer.
- **Did not choose `CAST_R`.** I measured r = 1.5 and r = 4 and stopped. The
  upper boundary is a sweep, in Powder AND in Game Day, and the crew that lands
  C1 owes it (§6.4).
- **Did not touch `qa/grounding.mjs`, `qa/shippedlook.mjs` or `qa/lookpair.mjs`**,
  though §9.2 and §11 say what is wrong with two of them.
- **Did not change the mottle or speckle tiles.** Both are shared with four
  other worlds; only Powder's weights move.
- **Did not start a server, did not kill the one on :4177.**
- **Did not re-shoot the canonical pack.** Every frame this crew made is under
  the scratchpad, not in `qa/out/`.

---

## 11. AN INSTRUMENT FINDING I WENT LOOKING FOR SOMETHING ELSE AND FOUND

**Every frame in `qa/out/shippedlook/` — the canonical five-world pack the whole
studio has been judging RUNG 1 on — was shot before the camera converged.**

The hero's on-screen radius, largest connected purple component, device px:

| frame | ball radius | what R = 4 predicts at the settled `camDist` |
|---|---|---|
| `shippedlook/powder_look.png` | **334** | 101 |
| `shippedlook/maple_look.png` | **259** | 101 |
| `shippedlook/pirate_look.png` | **277** | 101 |
| `shippedlook/gameday_look.png` | **362** | 101 |
| `lookpair/powder_look.png` | 102.5 | 101 |
| `lookpair/maple_look.png` | 104.5 | 101 |

`camDist` for R = 4 is `38 · (4/0.9)^0.82 = 129.1`; the apparent ball radius is
`1864 / (2 tan 16°) · R / camDist = 3250 · R / camDist`, which is **101 device
px** at R = 4 and never exceeds **153 px** anywhere in the match (it is
77 px at spawn, 117 at R = 9, 153 at the 340-unit clamp — the follow law holds
the hero's screen size nearly constant on purpose). A 334-px ball is a follow
distance of about **39 units**, three times too close.

`qa/shippedlook.mjs` calls `__setVoidR(4)` and then waits; `camDist` closes its
gap by `(1 − e^(−1.6·dt))` per **frame**, and under swiftshader the shot is
taken long before enough frames have gone by. `qa/lookpair.mjs` waits on
`camDist` itself (its `CAM_TOL`) and lands at 102–104 px, dead on the model.

This does not change either finding — Powder's flatness reproduces on both packs
and the pre-rung frame — but **every tonal, framing and composition argument
made on the `shippedlook` pack is an argument about a lens the game never uses**,
and the store screenshots come out of that shooter. It belongs in the ledger and
it is not this crew's to fix.

---

## 12. THE RECORD

Everything under
`/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/pf/`.

| script | what it did |
|---|---|
| `flat.mjs`, `head.mjs`, `hue.mjs`, `ball.mjs` | the frame statistics in §2, §4, §11 |
| `tone.mjs`, `shoulder.mjs` | the shipped grade transcribed and differentiated — §1.1 |
| `live.mjs`, `exp2.mjs` | live scene introspection and the screenshot grain/contact/hemi sweep |
| `exp5.mjs` | the disc on/off difference across radii, sRGB render target |
| `exp6.mjs` | the intro beats, and the frame-cost A/B |
| `exp8.mjs` | the definitive run: in-page rAF settle, contact profiles and grain, one frame |
| `exp9.mjs` | the world's own cast-shadow depth, as the bar for §9.2 |
| `exp10.mjs` | the size gate: the hero's own cast shadow, per radius, against the disc |
| `altbake.mjs` | route-interception shooter: patches the compiled bundle, asserts each anchor matches exactly once, shoots Powder |
| `crop.mjs`, `prof.mjs`, `diff.mjs`, `hero.mjs` | crops, profiles and the difference images |

Frames: `shots/`, `alt/`, `exp8/`, `intro/`. None of them is in `qa/out/`, and
nothing this crew shot overwrites the canonical pack.

---

## 13. WHAT THE CREW THAT LANDS THIS OWES

In order, and none of it is optional:

1. **Patch B alone, first.** Four numbers. Shoot `qa/lookpair.mjs 4177 powder
   before`, land, shoot `after`, and check the two `.src` digests differ.
   Ship `qa/groundgrain.mjs` failing at 0.0036 **before** the change (rule 2).
2. **`qa/determ.mjs powder`, three runs, before and after patch A.** Expected
   "DIFFERS — reseeds" both times; if it ever said IDENTICAL, patch A is not
   safe as written and the accounting in §7 is wrong.
3. **The frame cost of `uGrain.z`, on hardware.** §8 could not resolve it. If
   nobody can measure it, land patch B with the coarse layer and say in the
   commit that the cost is unmeasured — do not write a number.
4. **The `CAST_R` sweep, in Powder AND Game Day**, 4 → 24, on the centroid
   offset (§6.4). C1 does not land without it.
5. **`qa/shadowcost.mjs` before and after C1.** The hero becomes a caster
   again; `void3d.ts:1578` counts not being one as a saving.
6. **Photographs of C2 in Lantern.** A 0.80-opacity disc over a near-black
   floor is where "a grey circle glued around the hero" comes back, and that is
   an owner-flagged read (`GOVERNOR.md`, the ground lip).
7. **Correct the three wrong claims in place**, do not delete them:
   `void3d.ts:2272–2275`'s "1.45x", `qa/grounding.mjs:8–13`'s "4.6% annulus",
   and `void3d.ts:604`'s comment about a size gate that is not there.
8. **Do not re-shoot the store pack out of `qa/shippedlook.mjs`** until §11 is
   settled.
