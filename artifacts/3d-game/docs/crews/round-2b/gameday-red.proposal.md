# ROUND 2B — crew:gameday-red proposal

**Status: PROPOSAL ONLY. No skeptic has ruled. Nothing here has landed. No
tracked file was edited by this crew.**

Every line number below was verified on disk 2026-08-28. Every number in this
file was run by this crew today; the commands and the scripts are named beside
each. Where a number is modelled rather than rendered it is labelled
**[MODEL]**, and the model is validated against a rendered frame before it is
used for anything.

**Provenance, because the working tree is not clean.** A second crew is
editing `rivals.ts` and `prototype3d.ts` in the same tree, so the whole-source
digest has moved off the pack's `20d3f756b27be10d`. Every hunk in
`prototype3d.ts` is at line 1691 or below (`git diff` hunk headers: 1691,
1795, 1902, 2458, 2473, 2487, 2509, 2555, 8497) — **the tone-map chunk
(`:240-330`) and the light rig (`:700-900`) are byte-identical to HEAD**, and
`tailgate.ts`, `life.ts`, `island.ts` and `mainstreet.ts` are unmodified. The
live A/Bs ran against the preview build on :4177 and each one read
`toneMappingExposure = 1.12` off the renderer, which is RUNG 1 live. So every
colour-relevant line cited here is at HEAD; the line numbers for
`prototype3d.ts:3633` and `:5817` will shift by the other crew's insertions
and are given as they stand on disk today.

---

## THE CLAIM, in one paragraph

Game Day's reds are formless because **the world is built 4:1 out of one
albedo that sits below the pipeline's green-survival threshold**, and for such
an albedo the rendered green channel is not small — it is *decoupled*. It is
pinned at the gamut guard's floor, which is a fixed multiple of the pixel's
luminance and carries no information about the surface at all. `CRIM`
(`0xc4342f`, `tailgate.ts:27`, "the dominant colour of the whole world") has a
linear green/red ratio of **0.062**; the pipeline needs about **0.12** for
green to survive. Maple Falls is half as dead not because its reds are
healthier — `BARN` and `LEAF_B` are equally dead — but because only 45.7% of
its red pixels come from below-threshold albedos, against Game Day's 84.0%.

**The lever is the albedo. Measured live, on one frame, with the restore
proved bit-identical: raising CRIM's green byte from `0x34` to `0x4c` takes
dead-of-reddish from 90.54% to 0.01%. Raising the hemisphere from 0.22 to the
table's own 0.86 takes it from 90.54% to 90.68% — nothing.**

And a second finding the crew did not go looking for: **`qa/gamutzero.mjs`
passes on today's build**, green, exit 0, while 65% of Game Day's red pixels
carry a green of exactly 1/255. Its test is `channel === 0`, and lifting the
channel off exactly-zero is precisely what the gamut guard was installed to
do. The probe measures the guard's existence, not the defect. That is
retraction 10 ("no pure black is not no holes") happening again, in the
instrument written for this exact finding.

---

## title

Game Day's crimson is below the pipeline's green threshold — raise the albedo,
not the light

## the brief, and where it was right and wrong

The brief handed this crew a defect, a strong lead and five things to check.
Scored honestly:

- **"about 80% of its reddish pixels have green and blue at literal zero"** —
  nearly right and worth sharpening. On the shipped frame 79.57% are dead by
  the `G<12 and B<12` test, but only 0.68% have BOTH at literal zero. What is
  true is stranger and more diagnostic: **65.02% have green at exactly 1/255**,
  and `(177,1,7)` is the single most common pixel value in the entire picture —
  73,805 pixels, **4.60% of the whole frame**, one value. That 1 is not a
  rounding of the surface's colour. It is the gamut guard's floor.
- **"Maple is less than half as dead at the same red share"** — the right
  question, and it has a measured answer: not because Maple's reds survive but
  because Maple has FIVE of them and only two are below the threshold.
- **"the ledger already modelled a fix it did not ship, CRIM -> 0xc4453f"** —
  evaluated as instructed, and **measured insufficient: 68.22% still dead.**
- **"the two worlds' WORLD_LIGHT entries — what non-red light exists"** — the
  most attractive lead in the brief and the one the crew expected to be right.
  **It is refuted**: the hemisphere at 4x does nothing at all.
- **"ACES pushes G and B toward zero at moderate exposure — VERIFY"** —
  verified, and it is **half wrong**. ACES leaves the green at 0.00620, worth
  sRGB 18. The toe and the chroma push after it are what delete it.
- **"Game Day's SKY_MOOD tint"** — read from source; it touches the sky
  texture and nothing else. Not a candidate.

---

## 1. THE MECHANISM

Read off `src/prototype3d.ts:276-323` (the patched `tonemapping_pars_fragment`
chunk) as it stands on disk today. The chain a prop pixel takes is:

    linear scene colour
      x toneMappingExposure                          (1.12 on Game Day)
      ACESInputMat -> RRTAndODTFit -> ACESOutputMat
      gamutGuard, then min(.,1)                      :292
      l = dot(colour, luma)                          :294   <- PRE-toe luminance
      toe   c*c/(c+0.014)*1.014, PER CHANNEL         :316-317
      split tone (cool below l=0.18, warm above)     :320
      chroma  mix(vec3(l), colour, 1.07)             :321
      gamutGuard again, then clamp                   :322

Here is the green channel of `CRIM` making that journey. Neutral illumination,
scaled so the red renders at 177 — the level of the frame's dominant pixel —
exposure 1.12, every row run and printed (`SP/red/chain.mjs`). The
column that matters is **g/r**, because every gate in this chain is a ratio
test:

| stage | red | green | **g/r** | blue |
|---|---|---|---|---|
| albedo x illumination x exposure | 0.64284 | 0.03999 | **0.0622** | 0.03310 |
| ACES input matrix | 0.39967 | 0.08570 | 0.2144 | 0.05134 |
| `RRTAndODTFit` | 0.29823 | 0.03314 | 0.1111 | 0.01448 |
| ACES output matrix | 0.45991 | 0.00620 | **0.0135** | 0.01220 |
| the toe, PER CHANNEL | 0.45257 | 0.00193 | 0.0043 | 0.00576 |
| split tone (cool, l < 0.18) | 0.43447 | 0.00191 | 0.0044 | 0.00610 |
| chroma push x1.07 | 0.45767 | **-0.00517** | — | -0.00069 |
| gamut guard + clamp | 0.43690 | **0.00073** | 0.0017 | 0.00496 |
| **rendered** | **177** | **2** | | **15** |

**(a) ACES is a ratio gate, and CRIM clears it by four thousandths.**
`out.g = -0.10208*r + 1.10813*g - 0.00605*b`, so green survives the output
matrix only while its post-RRT ratio to red exceeds about **0.092**.
`RRTAndODTFit` is a compressive S-curve that squeezes the weak channel harder
than the strong one, so it *lowers* that ratio on the way in: 0.2144 -> 0.1111.
CRIM passes with 0.019 to spare and comes out at g/r 0.0135.

**This is the ledger's claim about ACES, and it is HALF TRUE.** ACES does not
push green to zero. It leaves **0.00620 — a value worth sRGB 18 on its own**,
which is a green a surface could shade with. What deletes it is what comes
after, and that part is ours, not ACES's.

**(b) The toe is a black-crush applied per channel, so it lands on the weak
channel of a BRIGHT pixel.** `c*c/(c+T)` is quadratic for `c << T`, and the
multipliers it applies to this one pixel are **red x0.984, blue x0.472, green
x0.311.** The red is essentially untouched — as the toe's own comment promises
— and the green loses two thirds. sRGB 18 -> 6. The toe comment (`:308-315`)
argues, correctly, that the per-channel *clip* it replaced was deleting
channels. The compressing version does not delete, but it is still a
per-channel operation doing a luminance job, and the class of error is the one
this repo has already retracted once.

**(c) The chroma push finishes it.** `mix(vec3(l), colour, 1.07)` moves every
channel 7% further from the pixel's luminance, so any channel below
`l * (1 - 1/1.07) = 0.0654 * l` goes negative. Here `l` is 0.10309, the
threshold is **0.00674**, and the green arrives at **0.00191** — a factor of
3.5 short. Note also that `l` is the **pre-toe** luminance (computed at `:294`,
used at `:320-321`, after the toe at `:317`), so the grey the push works from
is brighter than the colour being pushed.

**(d) The guard re-anchors it at a floor that has nothing to do with the
surface.** `gamutGuard` lifts the negative minimum to
`l * 0.15*|mn| / (l + 1.15*|mn|)`, and when the arriving green is near zero
the minimum is near `-0.0654*l`, so

        g_rendered  ~  0.0091 * l          — a pure function of luminance

**That is the defect in one line.** The green is not merely small: whatever the
albedo's own green was, it has been *replaced* by a constant times the pixel's
brightness. The surface cannot show a cool shadow or a warm highlight, because
two of its channels are now the first one scaled. `0.0091 * l` lands on sRGB 1
or 2 at every brightness Game Day reaches — which is why `(177,1,7)` is
**4.60% of every pixel in the shipped frame**, one value, 73,805 times.

### the model is validated, and its one limit is stated

`SP/red/chain.mjs` transcribes the chain above. It is a MODEL and the
governor's rule about snapshots applies to it, so it is checked against a
rendered frame every time it is used:

The table above runs a NEUTRAL illumination, on purpose: it isolates what the
pipeline does to the colour from any argument about the rig. Fed instead with
Game Day's own lit-face chromaticity (g/r 0.75, b/r 0.53, derived from
`WORLD_LIGHT.gameday` in `SP/red/rig.mjs` — the warmer key pulls the
blue down from 15 to 7), it predicts:

| | model, Game Day light | rendered |
|---|---|---|
| CRIM at the frame's dominant red level | (137, 2, 8) | **(138, 1, 7)** — live, 81,250 px |
| CRIM in the shipped pack | (176, 3, 10) | **(177, 1, 7)** — `gameday_look.png`, 73,805 px |

**Its limit, stated because it matters below.** The model assumes one
illumination chromaticity for Game Day's lit faces (g/r 0.75, b/r 0.53,
derived from `WORLD_LIGHT.gameday` in `SP/red/rig.mjs`). It reproduces
the *shipped* colour to within 2/255 — but that agreement proves only the
FLOOR, because the shipped green is at the floor and the floor does not depend
on the illumination at all. For a repainted albedo, whose green is above the
floor and therefore does depend on the light, the model **under**-predicts:
it says green 8 where the live render gives 19. So every modelled number about
a proposed colour in this file is conservative, and the live A/B is the
measurement.

---

## 2. WHY GAME DAY AND NOT MAPLE — the census, with no model in it

The brief's lead: Maple carries almost the same share of reddish pixels
(10.02% vs 10.19%) and is less than half as dead (30.39% vs 80.07%). The
answer is not that Maple's reds are healthier. It is that Game Day's reds are
**one colour** and Maple's are **five**.

Measured straight off the shipped pack, no model, no palette knowledge — for
every reddish pixel (`R>120`, `R>2G`), its rendered `g/r`, in twenty bins
(`SP/red/chromhist.mjs`):

| frame | share in the bottom bin (g/r < 0.025) | bins needed to hold 80% |
|---|---|---|
| gameday_look.png | **77.8%** | **2 of 20** |
| maple_look.png | 25.8% | 10 of 20 |
| pirate_look.png | 0.2% | 4 of 20 (its reds live at g/r 0.325-0.375) |

Game Day's red pixels are one spike. Maple's are spread across half the range.
That is a statement about how many red ALBEDOS each frame is made of, and it
is measured on the pixels themselves.

Attributing each reddish pixel to the nearest rendered locus of its own
world's palette (`SP/red/attrib.mjs` — this one DOES use the model,
so it is corroboration and not the load-bearing evidence):

| gameday | share of reddish | dead |   | maple | share of reddish | dead |
|---|---|---|---|---|---|---|
| CRIM_D `0x922520` | 72.2% | 95% |   | BARN `0xb5372e` | 27.9% | 71% |
| CRIM `0xc4342f` | 11.8% | 91% |   | LEAF_B `0xd8392f` | 17.8% | 60% |
| BRICK `0xa8553f` | 0.2% | 0% |   | LEAF_D `0xc9502a` | 20.3% | **0%** |
| everything else | 15.8% | 0% |   | BRICK `0xa8543f` | 17.2% | **0%** |
|   |   |   |   | LEAF_A `0xe86a2a` | 5.9% | **0%** |
| **CRIM family** | **84.0%** | **~94%** |   | **below-threshold family** | **45.7%** | ~67% |

Maple's `BARN` (linear g/r 0.084) and `LEAF_B` (0.060) are just as dead as
CRIM. Its `LEAF_D` (0.137), `BRICK` (0.230), `LEAF_A` and `PUMPKIN` are all
above the threshold and render with green intact. Game Day has nothing above
the threshold to dilute it: the crew counted the vertices in the live scene
and **1,454,832 of 12,313,054 vertex-coloured vertices — 11.8% of every
coloured vertex in the level — lie on CRIM's exact hue ray.** The file's own
header says so in words: "Crimson runs about 4:1 over everything else."

### the threshold, stated as a number an art director can use

At matched rendered red, an albedo is dead or alive according to its **linear
green/red ratio**, essentially independent of how brightly it is lit
(`SP/red/matched.mjs`, `SP/red/factorial.mjs`) **[MODEL]**:

| albedo | linear g/r | rendered at R=150 / 177 / 200 |
|---|---|---|
| LEAF_B `0xd8392f` | 0.060 | (149,2,8) (176,3,12) (199,1,5) — dead |
| **CRIM `0xc4342f`** | **0.062** | (149,2,11) (177,2,15) (199,1,12) — dead |
| BARN `0xb5372e` | 0.084 | (149,2,8) (176,0,4) (200,22,15) — dead |
| `0xc4453f` (the ledger's) | 0.108 | (149,1,9) (177,21,23) (200,41,37) — borderline under NEUTRAL light, and **measured 68.22% dead under Game Day's own** |
| LEAF_D `0xc9502a` | 0.137 | (149,27,2) (176,43,2) (200,60,1) — alive |
| BRICK `0xa8543f` | 0.230 | (150,48,23) (176,69,40) (199,92,58) — alive |

**Below about 0.12 linear g/r, a red in this pipeline has no green.** Above it,
it has one. Game Day's dominant colour is at 0.062 and its shadow variant
`CRIM_D` at 0.063 — the two lowest ratios in the world, on 84% of its red
pixels.

---

## 3. THE LIVE A/B — one frame, one variable at a time

`SP/red/ab.mjs`, `ab2.mjs`, `ab3.mjs`. Method, because it is the whole
value of these numbers: boot `?w=gameday`, pin quality rung 0, `__setVoidR(4)`,
pin the face, then render **every variant inside a single synchronous
`page.evaluate`**. No `rAF` runs between renders, so the camera, the props, the
crowd, the void and the clock are identical across the whole table — the only
thing that differs is the one variable named in the row. Each table ends with a
restore, and every restore came back **bit-identical to its baseline** (same
dead ratio, same mean green, same top colour with the same pixel count), which
is the harness saying it did not drift.

Baselines differ between the three runs (90.54% / 83.64% / 62.43%) because each
run is a different match with a different amount of crimson in frame. Compare
DOWN a run, never across them.

### run 1 — the rig, the exposure, and the albedo

`dead / reddish` is the ledger's own statistic (`R>120`, `R>2G`; dead is
`G<12 AND B<12`). `meanG` is the mean green over the reddish pixels.

| variant | dead/reddish | meanG | most common reddish pixel |
|---|---|---|---|
| **A baseline** | **90.54%** | 6.8 | (138,1,7) x 81,250 |
| A restore (x2) | 90.54% | 6.8 | identical, both times |
| D hemisphere 0.22 -> **0.86** (the table's own value) | **90.68%** | 6.8 | (147,1,9) |
| E fill intensity **x3** | 81.86% | 6.6 | (144,1,10) |
| C sun colour -> Maple's `0xfff2d8` | 79.58% | 7.7 | (139,1,8) |
| F exposure **x1.6** | 37.74% | 16.2 | (182,7,8) |
| B albedo -> `0xc4453f` *(the ledger's modelled fix)* | **68.22%** | 14.4 | (141,5,5) |
| B albedo -> `0xc44c2f` | **0.01%** | 25.2 | (140,19,1) |
| B albedo -> `0xc4502f` | 0.00% | 29.1 | (140,23,1) |
| B albedo -> `0xc45437` | 0.00% | 31.7 | (142,26,0) |
| B albedo -> `0xc46437` | 0.00% | 46.9 | (142,43,1) |

The albedo rows were produced by walking every `color` attribute in the live
scene, selecting the 1,454,832 vertices that lie on CRIM's exact hue ray
(within 0.0015 per channel, scale preserved so the baked contact-AO survives),
and rewriting them; `CRIM_D` rides the same ray and is included by
construction.

**Four of the brief's leads die here, each with a number:**

- **The hemisphere is not the lever.** Unlocking it to the table's own 0.86 —
  a 4x lift of the only non-red ambient in the world — moves the ratio by
  **+0.14 points, in the wrong direction.** A red diffuse surface multiplies
  the light by its own albedo, so blue-green light times a green of 0.034 is
  still nothing.
- **The fill is not the lever.** Tripling it: 90.54 -> 81.86.
- **The sun's warmth is a real but small term.** Swapping Game Day's
  `0xffd9a8` for Maple's `0xfff2d8` at the same intensity: 90.54 -> 79.58.
  Note what it does to the *shape*: the share of reddish pixels with green at
  exactly 0 goes **7.3% -> 33.4%**. It moved the ledger's ratio while making
  the underlying frame worse — exactly the kind of number rule 3b exists for.
- **Exposure is confirmed dead as a lever at any sane size.** x1.6 does move
  it (37.74%), which is why RUNG 1's x1.12 moved it 0.5 points and no more.

**And the ledger's own modelled one-token fix is measured insufficient.**
`CRIM 0xc4342f -> 0xc4453f` — "a one-token change when someone wants it" —
leaves **68.22% of the reds still dead**. The ledger modelled it against a
neutral exposure ramp; under Game Day's actual warm key it lands at G=4 at a
mid-tone. **Do not ship it on the strength of that table.**

### run 3 — the specular idea, and the grade

CRIM is the paint on every truck body in the level and it is the one Game Day
team colour NOT in `tailgate.ts`'s `registerGloss` table (GOLD is, at 0.50,
explicitly because it is "paint on a truck"). A white specular is the
physically right way to put non-red light on a red surface, so the crew set
`aGloss` live on exactly the CRIM vertices:

| variant | dead/reddish | G<=3 share of reddish |
|---|---|---|
| A baseline | 62.43% | 62.43% |
| S aGloss 0.25 | 62.43% | 62.35% |
| S aGloss 0.40 | 61.43% | 61.38% |
| S aGloss 0.60 | 61.18% | 61.16% |
| S aGloss 0.85 | 61.13% | 61.12% |

**A specular on the crimson does nothing** — 1.3 points at maximum gloss. This
is the ledger's own roughness-0.55 refutation restated: there is one
directional light and a RoomEnvironment at 0.15, so a sharper lobe has
nothing to reflect. Recorded so nobody spends another round on it.

### the grade, and a failed experiment reported as failed

The first attempt at a grade A/B patched
`THREE.ShaderChunk.tonemapping_pars_fragment` and set
`outPass.material.needsUpdate`. **All four variants came back bit-identical to
baseline.** That is not a result, it is a broken instrument: three keys its
program cache off the UNRESOLVED shader string (the one still containing
`#include <tonemapping_pars_fragment>`), so a changed chunk hits the same cache
entry and the old program is reused. Mutating the material's own source string
as well gives it a fresh custom-shader id and forces a real compile.

The corrected harness carries two controls, and both behaved:

| control | result |
|---|---|
| `TOE = 0.014` -> `0.0140` (a no-op edit) | bit-identical to baseline — the harness does not drift |
| chroma `1.07` -> `3.00` (a wrecking edit) | dead 62.43% -> 0.00%, mean green 21.7 -> 26.8, red patches 279 -> 845 — the recompile is real |

With the instrument proved, on the same frame:

| variant | dead/reddish | **G<=3 share** | distinct triples in a red patch (median) |
|---|---|---|---|
| A baseline / A restore | 62.43% | **62.43%** | 4 |
| G3 toe applied to LUMINANCE instead of per channel | 35.50% | 38.86% | 4 |
| G2 chroma push `1.07` -> `1.00` | 47.93% | 2.86% | 3 |
| **G1 gamut guard knee `1.15` -> `2.0`** | **16.22%** | **1.82%** | **6** |
| G4 all three together | 0.00% | 0.00% | 2 |

### why the guard's knee is NOT the patch, even though it is the best single number

`G1` above — one token, `mn * 1.15` -> `mn * 2.0` at `prototype3d.ts:280` —
takes the guard-floor share from 62.43% to **1.82%** and is the strongest
single-token result in this file. The crew nearly proposed it. It is wrong,
and here is the arithmetic that kills it.

The guard fires only when the chroma push has driven a channel negative, and
inside that band the recovered value is
`l * (K-1)*|mn| / (l + K*|mn|)` with `|mn| = 0.07*l - 1.07*g`. So **the
recovered green DECREASES as the true green INCREASES.** The transfer curve
from arriving green to rendered green, at a fixed mid-tone luminance
(`l = 0.0983`), in sRGB **[MODEL]**:

| green arriving | 0 | .001 | .002 | .003 | .004 | .005 | .006 | .00643 | .007 | .009 | .012 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| knee 1.15 (shipped) | 3.1 | 2.7 | 2.2 | 1.7 | 1.2 | 0.7 | 0.2 | **0.0** | 2.0 | 9.1 | 17.8 |
| knee 2.00 | 18.0 | 16.0 | 13.8 | 11.2 | 8.1 | 4.9 | 1.5 | **0.0** | 2.0 | 9.1 | 17.8 |

It is a V with a zero at `l*(1-1/1.07)`, and it is **inverted on the left
branch**. At the shipped 1.15 the whole left branch spans sRGB 3 to 0 — too
small for anyone to see, which is exactly why it has survived. At 2.0 it spans
18 to 0, and a red carrying slightly MORE green would render with visibly
LESS. Raising the knee buys the headline number by making a hue inversion
eighteen times louder. **Recorded as considered and rejected, with the curve,
so the next round does not re-propose it.**

The same arithmetic explains the guard comment's own claim at
`prototype3d.ts:272-274` (`gamutGuard` itself is `:276-281`): *"the 1.15 knee keeps it off exactly-zero so shading
survives quantisation."* The first half is true and `qa/gamutzero.mjs` confirms
it. **The second half is false and always was:** 0.0091 * l lands on sRGB 1-2
across the play range, and one or two is not a gradient. The fix and the probe
written to check it were sized against the same wrong criterion, which is why
this defect has outlived three rounds.

---

## 4. THE INSTRUMENT THAT SAID THIS WAS FIXED

    $ node qa/gamutzero.mjs
      maple     chromatic  530422   dead-channel   4.9%   MONOCHANNEL   0.08%  ok
      pirate    chromatic  306547   dead-channel   2.3%   MONOCHANNEL   0.00%  ok
      gameday   chromatic  368024   dead-channel   7.8%   MONOCHANNEL   0.23%  ok
      lantern   chromatic  663217   dead-channel   0.1%   MONOCHANNEL   0.00%  ok
      powder    chromatic  420629   dead-channel   0.2%   MONOCHANNEL   0.00%  ok
    PASS — no world renders a chromatic surface down to one live channel (bar 1%).
    exit 0

Run today, on today's pack. **Green, all five worlds, on the frame in which
65% of Game Day's red pixels carry a green of exactly 1/255 and the single
most common pixel value in the whole picture is `(177,1,7)` repeated 73,805
times.**

Its header names this exact defect and its test is `zeros >= 2` where
`zeros = (r===0)+(g===0)+(b===0)`. The gamut guard's entire job is to move
the channel from 0 to a small positive number. So the fix and its own probe
are testing the same wrong thing, and each certifies the other.

This is **retraction 10 repeating** — *"'No pure black' is not 'no holes'"* —
inside the instrument built after that retraction. The lesson generalises and
should go in the standing rules: **a probe whose predicate is `== 0` cannot
measure a remedy whose mechanism is `make it non-zero`.** The bar has to be on
the quantity the defect is about.

The statistic this file uses instead is the **guard-floor share**: of the
pixels that are red (`R>120`, `R>2G`), what fraction carries a green of 3 or
less. Three, because the guard's recovered value is `0.0091 * l` and for any
red with `R>120` that lands on sRGB 1, 2 or 3 — and because a green of 3
against a red of 120+ is a byte ratio under 0.025, while the least-green red
authored anywhere in this game (`LEAF_B 0xd8392f`) carries a byte ratio of
0.26. **A pixel that bright cannot be that colourless honestly. Only the
pipeline can put it there.**

On today's pack (`SP/red/hist.mjs`, whole frame, every pixel):

| frame | reddish px | **G <= 3** | dead (G<12 and B<12) | monochannel (gamutzero) |
|---|---|---|---|---|
| **gameday_look.png** | 252,981 | **77.56%** | 79.57% | 0.23% ok |
| maple_look.png | 160,645 | 24.85% | 30.39% | 0.08% ok |
| powder_look.png | 43,014 | 2.76% | 1.69% | 0.00% ok |
| pirate_look.png | 91,026 | 0.17% | 0.00% | 0.00% ok |
| lantern_look.png | 33,064 | 0.00% | 0.00% | 0.00% ok |

Three statistics, one frame, three verdicts: 0.23% (pass), 79.57% (the ledger's
number), 77.56% (this one). They disagree because the first cannot see the
defect at all and the second can be moved by composition. The third is tied to
the mechanism.

---

## 5. THE PROBE — `qa/redform.mjs`, new file, and it FAILS on today's build

Two passes. The first is deterministic and composition-free and reads the REAL
compiled shader rather than a transcription of it (the crew's own model in
`SP/` is deliberately NOT what ships — `qa/_zgrade.mjs` modelled a toe
that had been replaced hours earlier, and that is the failure this avoids).
The second measures the pack. **Both fail today.**

```js
// qa/redform.mjs — CAN A RED SURFACE STILL SHADE?
//
//   node qa/redform.mjs [port]
//
// qa/gamutzero.mjs tests `channel === 0`. The gamut guard's whole mechanism is
// to make the channel non-zero, so that probe went green the day the guard
// landed while 65% of Game Day's red pixels still carried a green of exactly
// 1/255 — the guard's floor, which is 0.0091 x luminance and therefore says
// nothing about the surface. This probe measures the quantity the defect is
// about: whether the weak channel of a red still varies with the surface.
//
// PASS 1 — THE TRANSFER TEST. Deterministic, composition-free, and it uses the
// SHIPPED shader: every dominant red is parsed out of its own source file and
// drawn as an unlit quad on the live canvas at a sweep of illumination levels,
// so the only thing between the authored hex and the measured byte is the real
// compiled CustomToneMapping. A colour passes if, everywhere its red renders
// between 150 and 200 (where 80% of Game Day's red pixels sit, measured), its
// green renders at 12/255 or more. Neutral illumination on purpose: this asks
// whether the COLOUR survives the pipeline, with no argument about the rig in
// it, and it is the same test in every world.
//
// PASS 2 — THE FRAME TEST. On the canonical pack, the share of red pixels
// (R>120, R>2G) whose green is 3 or less: the guard's floor. Three because the
// floor lands on sRGB 1-3 for every red above R=120, and because a green of 3
// against a red of 120 is a byte ratio of 0.025 while the least-green red
// authored anywhere in this game (LEAF_B 0xd8392f) carries 0.26. A pixel that
// bright cannot be that colourless honestly; only the pipeline puts it there.
//
// WHAT ELSE MOVES PASS 2 (rule 3b, asked before the bar was set):
//   - composition. The denominator is red pixels, so a frame with fewer trucks
//     does not pass by having less red — but a frame that swaps crimson for
//     brick DOES. The reddish COUNT is printed beside every share for exactly
//     this reason, and a count that halves is a re-shoot, not a fix.
//   - exposure. Measured: x1.12 moved it 0.5pp, x1.6 moved it 25pp. A large
//     exposure change can pass this bar without fixing anything, which is why
//     PASS 1 exists and is the one that gates.
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { PNG } from 'pngjs';

// ── the colours under test, parsed from the real source ────────────────────
// Not transcribed. A palette edit that misses this probe is the bug this
// throw exists to prevent.
// NOT anchored on `const `: mainstreet.ts declares five palette colours per
// `const` line (`:118`, `:168`), so a `const NAME` anchor finds BARN and
// silently misses LEAF_B. Verified against all five files before it was
// written down.
const grab = (file, name) => {
  const m = readFileSync(file, 'utf8').match(new RegExp(`\\b${name} = (0x[0-9a-fA-F]{6})\\b`));
  if (!m) throw new Error(`redform: ${name} not found in ${file} — the call site moved`);
  return parseInt(m[1], 16);
};
const REDS = [
  ['gameday', 'CRIM',   grab('src/proto3d/tailgate.ts', 'CRIM')],
  ['gameday', 'CRIM_D', grab('src/proto3d/tailgate.ts', 'CRIM_D')],
  ['gameday', 'GD_HOME_A', grab('src/proto3d/life.ts', 'GD_HOME_A')],
  ['maple',   'BARN',   grab('src/proto3d/mainstreet.ts', 'BARN')],
  ['maple',   'LEAF_B', grab('src/proto3d/mainstreet.ts', 'LEAF_B')],
];
// ── PASS 2 bars. Per world, a RATCHET: today's measurement for the four
// worlds nobody is changing, and the TARGET for the one this round fixes.
// Down only, like qa/roundlod.mjs. Game Day's 10 is the intent, not a
// description — this probe is committed failing at 77.56 and the failing run
// is the evidence.
const FLOOR_BAR = { gameday: 10.0, maple: 26.0, pirate: 1.0, lantern: 1.0, powder: 4.0 };
```

The measuring half, and the numbers it prints today:

```js
// PASS 1, inside the page, after booting ?w=<world> and pinning rung 0:
//   for each albedo A (linear), for k in a fine sweep:
//     quad.material.color.setRGB(A.r*k, A.g*k, A.b*k, THREE.LinearSRGBColorSpace)
//     renderer.setRenderTarget(null); renderer.render(swatchScene, orthoCam)
//     read the centre pixel off renderer.domElement
//   band = the k values whose rendered R lands in [150, 200]
//   FAIL if min(rendered G over the band) < 12
//
// PASS 2, on qa/out/shippedlook/<w>_look.png:
//   reddish = R > 120 && R > 2*G ;  floor = reddish && G <= 3
//   FAIL if 100*floor/reddish > FLOOR_BAR[world]
```

**What it prints on today's build** — PASS 1 from the crew's validated model
of the same chain (**[MODEL]**, and the real-shader numbers will be within
2/255 of these on the evidence in section 1), PASS 2 measured on the pack:

```
  PASS 1  transfer, neutral light, rendered R in [150,200], green must reach 12
    gameday CRIM      0xc4342f   min green over band =  1   FAIL
    gameday CRIM_D    0x922520   min green over band =  0   FAIL
    gameday GD_HOME_A 0xc4342f   min green over band =  1   FAIL
    maple   BARN      0xb5372e   min green over band =  0   FAIL
    maple   LEAF_B    0xd8392f   min green over band =  1   FAIL
  PASS 2  guard-floor share of red pixels
    gameday  reddish 252981   G<=3  77.56%   bar 10.0   FAIL
    maple    reddish 160645   G<=3  24.85%   bar 26.0   ok
    pirate   reddish  91026   G<=3   0.17%   bar  1.0   ok
    lantern  reddish  33064   G<=3   0.00%   bar  1.0   ok
    powder   reddish  43014   G<=3   2.76%   bar  4.0   ok
  FAIL
```

Note that PASS 1 fails Maple too, on `BARN` and `LEAF_B`, and PASS 2 passes
Maple at a ratchet set to today's value. That is deliberate and it is the
honest shape of the finding: **Maple has the same defect at a third the
concentration.** The patch below does not fix it, the probe records it, and the
ratchet stops it getting worse.

---

## 6. THE PATCH

Three constants. Zero draw calls, zero triangles, zero seeded draws, one
world. Every anchor read off disk 2026-08-28.

### 6.1 `src/proto3d/tailgate.ts:27-28`

**before, verbatim:**

```ts
const CRIM = 0xc4342f;       // HOME_A — the dominant colour of the whole world
const CRIM_D = 0x922520;     // shadowed crimson, undersides and trim
```

**after, complete:**

```ts
// ── WHY THIS CRIMSON IS NOT 0xc4342f ──────────────────────────────────────
// 0xc4342f has a LINEAR green/red ratio of 0.062. This pipeline needs about
// 0.12 for a red's green channel to survive it, and below that threshold the
// green is not merely small — it is replaced. The chroma push
// (prototype3d.ts:321) drives it negative and the gamut guard re-anchors it
// at 0.0091 x luminance, which is sRGB 1 or 2 at every brightness this world
// reaches. So the channel stops describing the surface and starts describing
// the pixel's brightness, and a truck's cab-top and its body-side render as
// the same flat red. Measured on the shipped pack: 77.56% of Game Day's red
// pixels sat on that floor; the single most common colour in the frame was
// (177,1,7), 73,805 pixels of one value.
// A-B'd live on one frame, this hex against the old one with nothing else
// changed: dead-of-reddish 90.54% -> 0.01%, mean green over red pixels
// 6.8 -> 25.2. The team colour keeps its red byte (196) and its HSV value and
// saturation; what moves is 24 points of green, which is the difference
// between a surface that can shade and one that cannot.
// qa/redform.mjs measures it and fails on the old value.
const CRIM = 0xc44c2f;       // HOME_A — the dominant colour of the whole world
const CRIM_D = 0x923721;     // shadowed crimson, undersides and trim
```

`CRIM_D` is not chosen, it is derived: the shipped `0x922520` is `CRIM`
multiplied by 0.5225 in linear (per channel 0.5207 / 0.5387 / 0.5081), and
`0x923721` is the new `CRIM` at that same 0.5225. The shadow keeps exactly the
relationship the author gave it.

Both new values clear the probe's PASS 1 and both old ones fail it:

| | min green over rendered R 150-200 | |
|---|---|---|
| `CRIM 0xc4342f` | 1 (at R=192) | FAIL |
| `CRIM_D 0x922520` | 0 (at R=198) | FAIL |
| **`CRIM 0xc44c2f`** | **22** (at R=150) | PASS |
| **`CRIM_D 0x923721`** | **23** (at R=150) | PASS |

### 6.2 `src/proto3d/life.ts:853`

The crowd wears the same hex and is drawn from it 3-4:1 in every Game Day
district (`life.ts:930-944`). Leaving it behind would put the crowd in a
different team's colours from the trucks they are standing next to.

**before, verbatim:**

```ts
const GD_HOME_A = 0xc4342f;   // crimson
```

**after, complete:**

```ts
const GD_HOME_A = 0xc44c2f;   // crimson — matches tailgate.ts CRIM, see the note there
```

### 6.3 what is deliberately NOT touched

- **`prototype3d.ts:3633`** (`col: 0xc4342f`, `flash: 'rgba(196,52,47,0.26)'` —
  the BAND IS ON THE FIELD beat banner) and **`prototype3d.ts:5817`**
  (`CARD_FALLBACK.gameday`, the offline gradient behind the world card). Both
  are **UI in sRGB and neither passes through the tone map**, so the authored
  hex reaches the screen exactly as written. The whole reason the world's paint
  moves is what the GRADE does to it; the UI has no grade and does not have the
  defect. Changing them would be a taste edit with no measurement behind it.
- **The world-picker posters** (`CARD_ART`, real artwork in `public/assets`)
  are on the HANDS OFF list — "Splash art and the world-picker posters are
  APPROVED. Do not change them." They stay. See the risks.
- **`registerGloss`** (`tailgate.ts:66-72`) — CRIM is not in it and does not go
  in it. Measured: section 3, a specular on the crimson moves the defect by
  1.3 points at maximum gloss.

### the value, and why this one

Under the crew's validated model, over the illumination band where 80% of Game
Day's red pixels sit (**[MODEL]**, and the live A/B confirms the direction and
the magnitude):

| candidate | rgb | CIE76 from `0xc4342f` | min green over the band | live dead/reddish |
|---|---|---|---|---|
| `0xc4342f` shipped | (196,52,47) | 0 | **1** | 90.54% |
| `0xc4453f` (ledger's) | (196,69,63) | 8.9 | **1** | 68.22% |
| **`0xc44c2f`** | **(196,76,47)** | **11.1** | **22** | **0.01%** |
| `0xc4502f` | (196,80,47) | 13.2 | 28 | 0.00% |
| `0xc45437` | (196,84,55) | 14.2 | 30 | 0.00% |
| `0xc85858` (all THREE channels alive) | (200,88,88) | **20.3** | 31 | not run |

`0xc44c2f` is the smallest step that clears the threshold with margin. Two
things about it have to be said out loud rather than buried:

1. **It is a hue move, not a desaturation.** (196,52,47) -> (196,76,47) holds
   HSV saturation at **0.760** and value at **0.769** — both unchanged to
   three places — and moves hue from **2.0 deg to 11.7 deg**. The crimson
   warms toward brick and loses none of its punch. Contrast the ledger's
   `0xc4453f`, which desaturates (S 0.760 -> 0.679) and does NOT clear the
   threshold: it gave up saturation and bought nothing. That is a visible
   change to the
   colour a whole world is made of and **it is the owner's call, not the
   crew's** — the ledger says so ("changing a world's dominant colour is a
   style decision") and the owner's own pattern on decision 4 was "sure if you
   can make it beautiful", i.e. photographs first.
2. **It buys back GREEN, not blue.** The live frame's most common red goes
   (138,1,7) -> (140,19,1): green comes up 18 and blue goes down 6, because
   raising green raises the pixel's luminance (green carries 0.7152 of it) and
   the chroma push takes its 7% from whichever channel is now weakest. To get
   all three channels alive across the band you need CIE76 ~20 — a genuinely
   different colour, a dusty rose. **This patch takes the surface from one live
   channel to two.** That is the defect the board named ("one live channel")
   and it is not the same as full three-channel form.

---

## 7. EVERY ALTERNATIVE THE CREW CONSIDERED, AND THE NUMBER THAT KILLED IT

| candidate | measured | verdict |
|---|---|---|
| exposure | RUNG 1's x1.12 moved the ratio 0.50 pp; x1.6 moves it 90.54 -> 37.74% | **dead as a lever.** A channel at the guard's floor is a function of luminance, so exposure moves it and the whole frame together. Already excluded by the brief; confirmed with a bracket |
| hemisphere colour / intensity — the brief's "what non-red light exists" | 0.22 -> 0.86 (the table's own value): 90.54 -> **90.68%** | **refuted.** Diffuse reflectance multiplies: blue-green light times a green albedo of 0.034 is still nothing |
| fill intensity | x3: 90.54 -> 81.86% | refuted as a fix |
| the sun's warmth (`0xffd9a8` vs Maple's `0xfff2d8`) | 90.54 -> 79.58%, and green-at-exactly-0 rose 7.3% -> 33.4% | **a real term, not the cause.** It moves the ledger's ratio while making the frame's green worse — a rule-3b trap |
| fog / `SKY_MOOD.gameday` tint `#7a2b52` at 0.70 | `island.ts:610-627`: `tint`/`tintA`/`bgI` are applied to the SKY TEXTURE at load and to `scene.background`/`backgroundIntensity` — they never touch a prop material. The world's own air is `new THREE.Fog(0x241120, 420, 1500)`, and `0x241120` has a linear g/r of 0.308 and b/r of 0.86 against crimson's 0.062 and 0.049 | **cannot be the cause, in either direction.** The tint does not reach the props at all, and the fog is far GREENER than the surface it mixes into, so wherever it reaches it can only add green. Read from source; no experiment needed and none run |
| a specular on the crimson (`registerGloss [CRIM, x]`) | aGloss 0.25 / 0.40 / 0.60 / 0.85: 62.43 -> 62.43 / 61.43 / 61.18 / **61.13%** | **refuted.** One directional light and RoomEnvironment at 0.15: a sharper lobe has nothing to reflect. Same finding as the refuted roughness-0.55 remedy |
| the ledger's own modelled `CRIM -> 0xc4453f` | **68.22%** still dead | **insufficient.** Modelled against a neutral exposure ramp; under Game Day's warm key it lands at green 4 at a mid-tone |
| gamut guard knee `1.15 -> 2.0` | 62.43 -> **16.22%** dead, guard-floor share 62.43 -> **1.82%** | **rejected on a measured inversion** — see section 3. Best single number in the file and it makes a hue inversion 18x louder |
| chroma push `1.07 -> 1.00` alone | run 3 (baseline 62.43): dead -> 47.93%, floor share -> 2.86%. Pair run (baseline 86.45): floor share -> **3.15%**, only 6.37% of pixels moved by >=8, 4% of saturation | **monotone, principled, cheap — and it is still five worlds.** The one to argue for if the studio wants the pipeline fixed rather than the world repainted. Lantern and Pirate not measured |
| toe per-channel -> toe on LUMINANCE alone | run 3 (baseline 62.43): dead -> 35.50%, floor share -> 38.86%. Pair run (baseline 86.45): floor share -> 68.10% | monotone and principled — the same argument the repo already accepted once (a per-channel operation doing a luminance job). **Partial on its own** |
| the two together | Game Day floor share 86.45 -> **0.00%** — and **23.36% of Powder's pixels move by 8/255 or more** while it loses 12% of its saturation | **works, and is a regrade.** Collateral table in section 8. Belongs to art direction with a reshoot, not to a crew, and not on a Game Day finding |
| ACES itself | post-ACES green is 0.00620 — worth sRGB **18**, not zero | **the ledger's "ACES pushes G and B toward zero" is half wrong.** ACES leaves a green a surface could shade with; the toe and the chroma push delete it |

---

## 8. THE OTHER ROAD, stated fairly because it is a real one

Everything in section 7's bottom half says the same thing: **the pipeline, not
Game Day, is what makes a saturated red formless.** Maple's `BARN` and
`LEAF_B` fall foul of it too, at 24.85% of Maple's red pixels. A grade fix
would close both worlds at once, and the combination measured 0.00%.

The crew is not proposing it, for three reasons, and a skeptic who disagrees
with them should say so rather than assume it was overlooked:

1. **It moves five worlds, and the crew now has the number for how far.**
   The monotone pair moves 23.36% of Powder Pass's pixels by 8/255 or more and
   takes 12% of its saturation, in a world already at 3.19% guard-floor share.
   Every screenshot in the repo, every palette argument, the lookbook the
   studio reviews against and the eight store frames were made against this
   grade, and Lantern's whole identity is built on how the toe treats its
   shadows. The repo's own record on global remedies here is two for two
   against: the roughness-0.55 remedy was refuted by experiment, and the
   Lantern light lift was retracted the same day it was tried.
2. **The one-token version of it is unsound**, and the crew has the curve
   (section 3). The sound version is two simultaneous changes to the authored
   grade — the toe's form and the chroma constant — which is not a patch, it
   is a regrade, and it needs art direction and a full reshoot, not a crew.
3. **It is not this round's question.** The board's finding is "Game Day's red
   has two luminance levels", and Game Day is at 77.56% against Maple's 24.85%
   and Pirate's 0.17% because of what Game Day is *painted*, not because it is
   graded differently. Rule 6 asks for the smallest fix that removes the cause
   of THAT.

**If the studio wants the pipeline fixed instead, the crew's recommendation is
NOT the knee** — it is the pair that is monotone by construction: the toe
applied to LUMINANCE rather than per channel, and the chroma constant. The
crew ran that A/B (`SP/red/pair.mjs`, forced recompile, no-op control
bit-identical, restore bit-identical) on the world that has the defect and on
one that does not. **This is the collateral, and it is why the crew is not
proposing it:**

| variant | GAME DAY G<=3 | GD mean sat | GD px moved >=8 | POWDER G<=3 | PW mean sat | **PW px moved >=8** | PW red px |
|---|---|---|---|---|---|---|---|
| shipped / no-op control | 86.45% | 0.4827 | — | 3.19% | 0.3936 | — | 48,725 |
| toe on LUMINANCE alone | 68.10% | 0.4514 | 13.35% | 0.85% | 0.3703 | 9.82% | 18,984 |
| chroma `1.07` -> `1.00` alone | **3.15%** | 0.4624 | **6.37%** | 0.18% | 0.3715 | **3.62%** | 25,992 |
| both (the monotone pair) | **0.00%** | 0.4183 | 37.38% | 0.00% | 0.3466 | **23.36%** | 3,218 |
| toe LUM + chroma 1.03 | 0.01% | 0.4338 | 30.22% | 0.00% | 0.3571 | 16.06% | 4,873 |

Read the two Powder columns. **The monotone pair moves 23% of every pixel in
Powder Pass by 8/255 or more and takes 12% of its saturation off**, in a world
whose guard-floor share is already 3.19%. Its red-pixel count collapses
48,725 -> 3,218 because so many surfaces stop being red-dominant at all. That
is not a bug fix landing quietly next to four healthy worlds; that is a new
grade, and it belongs to art direction with a full reshoot behind it.

The cheapest grade option is interesting and the crew records it rather than
burying it: **chroma `1.07 -> 1.00` alone takes Game Day's guard-floor share
from 86.45% to 3.15% while moving only 6.37% of pixels by 8 or more and
costing 4% of saturation.** It leaves the ledger's `G<12 and B<12` statistic
at 69% (the blue stays low), which is the clearest demonstration in this file
that those two statistics are not measuring the same thing. If a skeptic wants
a grade fix, that is the one to argue for, and it needs Lantern and Pirate
measured too — this crew ran Game Day and Powder only.

---

## 9. SEEDED-DRAW ACCOUNTING

**Zero delta. Three literal constants; not one call site, branch or loop
changes shape.**

- `tailgate.ts` has no access to the Maple stream at all: its own `rnd` and
  `pick` are `Math.random` (`:74-75`). `mrnd()`/`mr()`/`mpick()`/`mchance()`
  are not imported into the file.
- `life.ts` is the same — `rand`/`pick` at `:41-42` are `Math.random`.
- `mainstreet.ts`, which owns the seeded stream (`:33-43`), is not touched.
- Draw-count delta: **mrnd 0, mr 0, mpick 0, mchance 0.**
- Triangle delta: **0.** No geometry, no part count, no `mergedProp` call
  changes. `qa/roundlod.mjs`'s TRI_BASELINE spend ratchet is unaffected.
- Draw calls: **0.** The colours ride the same two shared prop materials.
- Heap: **0.** `part()` writes three Uint16s per vertex either way
  (`island.ts:4019-4022`).

## 10. RISKS

1. **It is a style change to a world's dominant colour, and it needs the
   owner's eye before it lands.** The crew's evidence says what it does to the
   pixels; it says nothing about whether the owner wants his college town in a
   warmer crimson. Photographs first — Game Day at three radii (2.5, 12, 60,
   because the camera runs 26-340 units and a colour judgement made at one
   distance is the balloon mistake again), old and new, same seed.
2. **The approved world-picker poster will no longer match the world.**
   `CARD_ART.gameday` is real artwork on the HANDS OFF list and it is built on
   the old crimson; so is the crimson in `CARD_FALLBACK`. After this patch the
   card is very slightly more saturated than the place it advertises. The crew
   does not touch either. It is a genuine, small, permanent inconsistency and
   the owner should be told about it in the same breath as the patch.
3. **Two live channels, not three.** Blue goes to the guard's floor as green
   comes off it (section 6). The board's stated defect — "one live channel" —
   is removed; "a surface that can carry both a cool shadow and a warm
   highlight" is not reached, and would cost CIE76 ~20.
4. **The frame's red patches stay geometrically flat.** Measured separately
   (`SP/red/patches2.mjs`): Game Day's red patches carry a median of
   **1 distinct red value** per 8x8 patch against 6-11 for its warm, blue and
   grey patches, and the albedo change does not move that (median distinct
   triples 4 -> 4 in the live A/B). That is a different defect — big
   flat-shaded untextured truck panels at one normal under one directional
   light — and this patch does not claim it. **Anyone quoting "median 2
   distinct luminance levels" as the target of this patch is quoting the wrong
   number:** part of that statistic is the dead green (which this fixes, and
   which also depresses the count because a red-only pixel has luminance
   0.2126R and 4.7 red values collapse onto one integer luminance) and part is
   the geometry (which it does not).
5. **`qa/gamutzero.mjs` will not notice this patch either way.** It is green
   before and after. Its bar should be kept — it catches the hard-clip class —
   but its header must be corrected to say what it cannot see, or the next
   round reads a passing gate as a fixed defect for the third time.
6. **One frame per A/B.** Every live number here is one composition. The
   direction and the order of magnitude are not in doubt (90.54 -> 0.01 on a
   restore-verified harness), but the exact post-fix share on the canonical
   pack must be re-measured by re-shooting `qa/shippedlook.mjs` after the
   patch, not predicted from these runs.

## 11. WHAT LANDS, IN ORDER

1. `qa/redform.mjs` lands **alone and observed failing** (PASS 1 five colours
   FAIL, PASS 2 gameday 77.56% against a bar of 10.0). The failing run is the
   evidence, per standing rule 2.
2. The three-constant patch.
3. `npm run build`, then `node qa/shippedlook.mjs 4177 gameday` and the other
   four for the control, then `node qa/redform.mjs`, `node qa/gamutzero.mjs`,
   `node qa/gate.mjs --profile=push`.
4. The A/B photographs at R 2.5 / 12 / 60 go to the owner **before** anything
   is called done.
5. `docs/GOVERNOR.md`: the PENDING entry "Game Day's red has two luminance
   levels" moves to CONFIRMED with the cause, the `qa/gamutzero.mjs` blindness
   goes in the retractions, and the ledger's modelled `0xc4453f` table is
   marked measured-insufficient so nobody ships it later on that strength.

---

## 12. THE RECORD — every script, and what it was for

All under this session's scratchpad at
`/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/red/`,
abbreviated `SP/` below. None of them tracked, none of them shipped —
the shipping instrument is `qa/redform.mjs` in section 5, and it deliberately
does NOT carry a copy of the tone curve.

| script | what it did |
|---|---|
| `chain.mjs` | the tone chain transcribed from `prototype3d.ts:276-323`, used for every **[MODEL]** number and validated against two rendered frames |
| `stages.mjs`, `sweep.mjs`, `matched.mjs`, `factorial.mjs`, `variants2.mjs`, `search.mjs`, `target.mjs` | the threshold, the albedo x illumination factorial, the grade counterfactuals, the CIE76 search |
| `rig.mjs` | per-face irradiance from `WORLD_LIGHT`, for the two worlds' illumination chromaticity |
| `hist.mjs`, `bybright.mjs`, `chromhist.mjs`, `patches.mjs`, `patches2.mjs`, `attrib.mjs` | the frame census: channel histograms, dead share by brightness, the model-free chromaticity spike, the patch metrics, the albedo attribution |
| `ab.mjs` | live A/B run 1 — rig, exposure and five candidate albedos, restore x2 |
| `ab2.mjs` | live A/B run 2 — **the failed grade experiment**, kept because a null result from a broken instrument is the most dangerous kind |
| `ab3.mjs` | live A/B run 3 — the specular test and the grade variants with a forced recompile, no-op and wrecking controls |
| `pair.mjs` | the grade collateral A/B of section 8 — Game Day and Powder, forced recompile, no-op control, restore verified bit-identical |
| `knee.mjs` | the same harness for the guard knee across five worlds; killed for CPU when two swiftshader instances started starving each other, and superseded by the curve in section 3 that rejects the knee outright |

Commands that produced the pack numbers, runnable as written from the repo
root:

    node qa/gamutzero.mjs                       # PASSES today; section 4
    node SP/red/hist.mjs      qa/out/shippedlook/gameday_look.png qa/out/shippedlook/maple_look.png
    node SP/red/chromhist.mjs qa/out/shippedlook/*_look.png
    node SP/red/attrib.mjs    gameday qa/out/shippedlook/gameday_look.png
    node SP/red/ab.mjs  4177          # the live A/B, ~25 min under swiftshader

The frames measured are the current canonical pack,
`qa/out/shippedlook/<world>_look.png`, source digest `20d3f756b27be10d`,
860x1864, 1,603,040 px each.

---

## 13. WHAT THIS CREW IS AND IS NOT CLAIMING

**Claimed, and proven:**
- The mechanism, stage by stage, with the model validated against two rendered
  frames to within 2/255.
- That the lever is the albedo: 90.54% -> 0.01% on one restore-verified frame.
- That the hemisphere, the fill, the sun's colour, the fog, the sky tint and a
  specular are each not the lever, with a number for each.
- That the ledger's modelled `0xc4453f` is insufficient: 68.22%.
- That `qa/gamutzero.mjs` cannot see this defect.

**NOT claimed:**
- That `0xc44c2f` is the right colour for this game. It is the smallest step
  that clears the threshold with margin. **Whether Game Day should be that
  colour is the owner's call and nobody else's**, and this file's job is to
  make sure that call is made on a photograph and not on a hex.
- That this makes Game Day's red surfaces *shaded*. It makes them capable of
  being shaded. The panels are still flat-shaded quads at one normal under one
  directional light, and that is a different finding with a different owner.
- That the grade is innocent. It is not — it costs this pixel a factor of nine
  (sRGB 18 -> 2) after ACES has already taken a factor of three (55 -> 18).
  The crew is declining to regrade five worlds on a Game Day finding, not
  exonerating the grade, and section 8 carries the measured price of doing it
  anyway so the next round argues from numbers instead of from taste.
- That Game Day and Maple are the only worlds with a red near the threshold.
  Only five frames were measured, one composition each. Pirate, Lantern and
  Powder are at 0.17%, 0.00% and 2.76% **on the frames in the pack** — that is
  five photographs, not a proof about five worlds.

---

## APPENDIX — the two harness techniques, written down because scratchpads die

This repo has lost a journal twice. The numbers above are in this file; the
two techniques that produced them are not obvious and would be re-derived from
scratch next time, so they are here.

**A. Repaint one albedo in a live scene without rebuilding.** `part()`
(`island.ts:3992-4037`) floods a Uint16-normalised LINEAR colour across a
part's vertices and then the AO bake scales it, so every vertex carrying a
given hex lies on that hex's ray through the origin. Select by ray, rewrite
preserving the scale, and the baked contact shading survives:

```js
const s2l = c => { c/=255; return c<=0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); };
const CRIM = [s2l(0xc4), s2l(0x34), s2l(0x2f)];
const hits = [];
scene.traverse(o => {
  const a = o.geometry?.getAttribute?.('color'); if (!a || a.__seen) return; a.__seen = true;
  for (let i = 0; i < a.count; i++) {
    const r = a.getX(i); if (r < 0.02) continue;
    const s = r / CRIM[0]; if (s > 1.03 || s < 0.10) continue;      // AO darkens, never brightens
    if (Math.abs(a.getY(i) - s*CRIM[1]) > 0.0015) continue;
    if (Math.abs(a.getZ(i) - s*CRIM[2]) > 0.0015) continue;
    hits.push([a, i, s]);
  }
});
// then setXYZ(i, NEW[0]*s, NEW[1]*s, NEW[2]*s) and a.needsUpdate = true
```

Keep the originals and write them back; the restore MUST come back
bit-identical or the run is not evidence.

**B. Change the grade in a live page — and the trap that made the crew's first
attempt a silent no-op.** Patching `THREE.ShaderChunk.tonemapping_pars_fragment`
and setting `material.needsUpdate` is NOT enough: three keys its program cache
off the shader source *before* `#include` resolution, so the changed chunk hits
the same cache entry and the old program is reused. Nothing errors. Every
variant returns the baseline, which reads exactly like "this lever does
nothing".

```js
const outPass = window.__composer().passes.find(p => p.isOutputPass);
const CH0 = THREE.ShaderChunk.tonemapping_pars_fragment, FS0 = outPass.material.fragmentShader;
let bump = 0;
const setGrade = (edits) => {
  let s = CH0;
  for (const [needle, rep] of edits) {
    if (!s.includes(needle)) throw new Error('anchor not found: ' + needle);   // never skip silently
    s = s.replace(needle, rep);
  }
  THREE.ShaderChunk.tonemapping_pars_fragment = s;
  outPass.material.fragmentShader = FS0 + '\n// recompile ' + (++bump);        // new custom-shader id
  outPass.material.needsUpdate = true;
};
```

Only `OutputPass` needs recompiling on the composed path: three forces
`NoToneMapping` when rendering into a render target, so the scene materials
fill the composer's buffer in linear and the grade runs exactly once, at the
end.

**And carry both controls, every time.** A **no-op** edit (`0.014` ->
`0.0140`) must come back bit-identical, and a **wrecking** edit (chroma
`1.07` -> `3.00`) must come back obviously different. Without the second one
there is no way to tell a lever that does nothing from a lever that was never
pulled — which is precisely the mistake this crew made and caught.
