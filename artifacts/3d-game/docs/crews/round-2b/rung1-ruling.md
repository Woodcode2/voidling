# RUNG 1 RULING

**Synthesis skeptic, 2026-08-28. Ruling on `exposure: 1.0` → `exposure: LIGHT.exposure`
(`721b3e8`), judged on the five-world pack `c0dec56` against the pre-rung pack `6b207a5`.**

Verdict in one line: **the rung is real, the rung is over-driven in exactly one
world, and the ceiling that binds it is not a tonal one — it is the mascot.**

---

## The evidence base I ruled on, and why it is different from the judges'

Every judge worked from an incomplete before-set. `scratchpad/` held only
gameday, powder and maple. I pulled the whole pre-rung pack out of git and
verified it blob-for-blob:

```
6b207a5:qa/out/shippedlook/{maple,pirate,gameday,lantern,powder}_look.png
```

`maple/gameday/powder` hash-match the scratchpad copies exactly. **`pirate_pre`
and `lantern_pre` were in git the whole time and nobody used either.** That is
the difference between this ruling and the three it is ruling on:

- **TWO control pairs, not one.** Maple *and* Pirate are exposure-unchanged.
  Their before→after deltas are a direct, in-interval, same-world,
  different-position noise measurement — the exact figure the measurement pass
  said "does not exist yet" and "I am not going to invent".
- **A true Lantern baseline.** Every Lantern derivation in the set anchors on
  the 08-23 frames. Those carry build drift, measured below at **3.5–7.0 dE on
  the hero with no exposure change** — larger than the bar being applied.

Confounds in the interval, stated once. Between `6b207a5` and `c0dec56` the
tree also took `1e7aa68` (the sphere harvest: Game Day helmets and footballs
14×10 → 10×8 — helmets are CRIM, so no red measurement here uses sphere
geometry), `48ea5d1` (the wall cue, +5 lines in `void3d.ts`), and `0a334cf`
(dead CSS). It did **not** take the snowman yaw fix; see the judge errors.

### The control-noise floor, measured

Both exposure-unchanged worlds, before→after, different void positions:

| statistic | maple Δ | pirate Δ | noise bound |
|---|---|---|---|
| hero annulus dE (CIE76) | 0.59 | 0.61 | **0.61** |
| whole-frame mean luma | −1.45 | +0.97 | 1.45 |
| median luma | −1.4 | +7.7 | 7.7 |
| p05 luma | −0.9 | +6.9 | 6.9 |
| near-black share, Ylin < 0.02 | +0.53 pp | −0.68 pp | **0.68 pp** |
| flat 16×16 patches (sd < 0.004) | 0.0 pp | −2.4 pp | 2.4 pp |
| world p95/p25 | +0.02 | −0.49 | 0.49 |
| mid-band median patch sd | −0.0013 | −0.0008 | 0.0013 |
| dead-of-reddish ratio | +1.12 pp | n/a (no red) | 1.12 pp |

That table is the instrument. Everything below is judged against it.

---

## Per world

### GAME DAY — **ACCEPT AT 1.12. The retune to 1.30 is REFUSED.**

`WORLD_LIGHT.gameday.exposure` stays **1.12** (`src/prototype3d.ts:728`).

**What the +12% actually bought, confirmed against the controls:**

- The ground came up. Broad ground mask (24.3% → 19.1% of frame): L\* median
  **23.09 → 28.09**, p05 19.36 → 22.64. Direct pixel sampling on open tarmac at
  matched screen windows is tighter and cleaner: the asphalt's dominant rendered
  values moved `rgb(72–74,58–60,58–60)` (L\* 26–27) → `rgb(78–82,64–67,64–67)`
  (L\* 29–30). Real, and the largest visible gain in the frame.
- The shadow floor unclogged. Near-black `Ylin < 0.02` **11.32% → 8.32%**
  (−3.00 pp against a 0.68 pp control bound — 4.4× noise). Pure black 0.068% →
  0.015%.
- Nothing clipped. Any-channel ≥ 250: **0.000% → 0.036%**. All-channels > 230:
  0.314% → 0.359%. There is headroom left.
- The hero held its read and stayed inside the bar: dE 2.88 from its own before,
  3.39 from the maple control.

**Why 1.30 is refused, and this is the part the Game Day judge could not see
without the pack-wide hero curve:** at 1.30 the mascot lands **6.6–7.2 dE from
the maple control**, over the repo's own `MIN_DE = 6` (`qa/formsep.mjs:37`).
Game Day would break the brand for exactly the reason Lantern already has. The
judge's *sequencing* is right — do not take another stop until CRIM is fixed —
but the number is above the ceiling and would still be above it after CRIM is
fixed. Any later Game Day lift stops at **~1.26**.

**The judge's red finding is CONFIRMED, to the value, on the matched prop.**
Same top-left 470×380 window, both frames:

| | before | after |
|---|---|---|
| two dominant body-plane colours | `rgb(171,2,6)` / `rgb(166,1,8)` | `rgb(182,1,3)` / `rgb(177,1,6)` |
| lit-to-shaded plane separation | dE **2.59** | dE **2.84** |
| flat-red L\* / C\* | 34.51 / 74.18 | 36.94 / 78.56 |
| mean G of reddish px (window) | 1.56 | 0.84 |

Against `qa/formsep.mjs`'s own ΔE 7 bar for "this face is not that face", a
truck at a tailgate moved from 2.59 to 2.84. **The red got brighter, purer and
no more formed, and its green channel went DOWN.** Whole-frame:
dead-of-reddish 80.07% → 79.57% — which is *inside* the 1.12 pp control noise,
so the honest statement is not "it improved by half a point", it is **"it did
not move at all."**

**And the world is albedo-bound, which I verify rather than assert.** `ASPHALT`
is `0x4a4a52` (`tailgate.ts:39`) = L\* **31.72**. The *sunlit* tarmac in the
after frame measures L\* **30–31** — the lot renders at its own diffuse colour
while carrying the pack's brightest key (sunI 2.55, `prototype3d.ts:727`, ×1.31
in `RIG`). No exposure value reaches mid-afternoon from there. The second half
of the Game Day judge's retune — `ASPHALT` → roughly `0x6f6c74` — is the right
lever and is the one I endorse, with the open-ground pixel-mode A/B above as
its probe.

**Two black shards are in the shipped frame and I magnified both.** At
**(801, 25)** a sphere finial on a pole: a near-black disc on mid-grey asphalt,
no highlight, no contact shadow. At **(~530, 1345)** a black triangular sliver
lying on open tarmac with nothing under it. Both read as holes punched in the
picture. Not the rung — but they are on the photograph the rung is being judged
on, and Game Day should not be reshot for the store until they are gone.

### POWDER PASS — **ACCEPT AT 1.18, with a finding neither Powder-facing judge weighted.**

`WORLD_LIGHT.powder.exposure` stays **1.18** (`src/prototype3d.ts:774`).

**The rung did what it claimed, and I reproduce the judge's headline exactly.**
Rows 1440–1864, per-row median luminance: **151.6 → 163.7, +8.0%**. No
clipping: any-channel ≥ 250 goes 0.000% → 0.012%; all-channels > 230 is flat
(0.2883% → 0.2854%). Hero dE 3.52 from its own before, 4.22 from maple — inside
the bar.

**But the instrument that proved it is the defect.** Across those 424
consecutive rows the per-row median spans **151.5–151.6** before and
**163.7–163.7** after. The band is confound-proof *because* the bottom quarter
of Powder's store screenshot is one colour. The same statistic run on the
controls: maple 164.0 → 162.1, and **pirate 100.7 → 139.8 — a 38.8% move with
no exposure change at all.** A band median is only confound-proof in a world
flat enough to have nothing in the band.

**And the rung made it flatter.** 16×16 patches with luminance sd < 0.004:

| world | whole frame | bottom third | mid-band median patch sd |
|---|---|---|---|
| **powder** | 53.9% → **59.8%** | 71.4% → 74.6% | 0.0160 → **0.0117** |
| maple (control) | 7.5% → 7.5% | 15.3% → 14.4% | 0.0173 → 0.0160 |
| pirate (control) | 11.1% → 8.7% | 17.5% → 12.6% | 0.0174 → 0.0166 |
| gameday | 20.4% → 21.4% | 30.1% → 32.2% | 0.0167 → 0.0187 |

+5.9 pp against a 2.4 pp control bound. Powder is **5–8× flatter than any other
world in the pack**, its world p95/p25 is **1.93** (next lowest maple 3.87), and
the mid-band — the band the hero sits in — lost 27% of its local tonal variation
(3× the control bound; prop mix differs, so mark that one confounded and lean
on the whole-frame figure).

**And the hero casts no readable ground shadow in the shipped frame.** Rows
1200–1380, full 660-px-wide strip beneath him: **total luminance range 8.5–18.1
codes out of 255, for 180 consecutive rows.** The pre-rung frame has a 35–50
code shadow crescent in the same relation to the hero. A standing figure in the
*same* after frame casts a clear dark shadow, so shadows are working. Not
confound-proof for cause; confound-proof as a description of the frame that
ships.

I am not retuning Powder. Brightness was never its deficiency, and 1.18 is
already at the value where further exposure buys midtone and spends snow form —
p95 − median is 34.5, the lowest of any frame in the pack including both
controls. **What Powder needs is content and grain, not light**, and
`island.ts:3096`'s ground grain `[0.20, 0.06, 0.00]` — 44% of the pack default
with the coarse layer at zero, under a comment claiming "the bake's own blue
shadowing carries the variation" — is the cheapest place to start. It does not
carry it. 59.8% of the frame proves it.

### LANTERN NIGHT — **ACCEPT WITH A RETUNE. 1.42 → 1.24 (band 1.20–1.27).**

`WORLD_LIGHT.lantern.exposure` **1.42 → 1.24**, `src/prototype3d.ts:763`.

**Neither 1.42 nor the recorded retune to 1.34 survives, and 1.06 is derived
from a contaminated baseline.** All three numbers on the table are wrong for
three different reasons.

**What 1.42 genuinely bought** — and the Lantern judgment's measurements
reproduce, which is more than can be said for the other two:

| | pre-rung | shipped (1.42) | my read |
|---|---|---|---|
| top band, Ylin < 0.10 | 65.0% | 35.6% | real — silhouettes resolved |
| world p95/p25 | 10.99 | **7.19** | −35%, 8× control noise |
| hot px > 0.5 linear | 0.28% | 1.08% | more of them… |
| median luminance of those hot px | 0.759 | **0.579** | …and each one dimmer |
| near-white > 0.85 | 0.13% | 0.14% | unmoved |
| bottom-band saturation | 0.627 | 0.534 | desaturated |
| flat-patch share (whole frame) | 25.8% | **15.1%** | got *less* flat |

The Lantern judge's central mechanism is confirmed to three decimal places:
**ACES gives the shoulder nothing and the toe everything**, so a lift on this
world delivers a diffuse warm haze where the authored intent is incandescence.
Its "the pools got bigger and softer, not hotter" is the truest sentence in the
whole set.

**Why 1.42 must come down, on a number nobody produced.** Deep black,
`Ylin < 0.02`, as a share of frame:

| | maple | pirate | gameday | powder | **lantern** |
|---|---|---|---|---|---|
| pre-rung | 4.85% | 7.85% | 11.32% | 3.06% | **23.41%** |
| shipped | 5.38% | 7.17% | 8.32% | 2.23% | **3.78%** |

**At 1.42 the night world holds less true black than either daylight world.**
That is −19.6 pp against a 0.68 pp control bound — 29× noise, and it is what
"it stopped reading as night" means in a number. The Lantern judgment's own
defence of 1.42 — "mean linear luminance 0.103 against maple's 0.268, it is not
close" — is true (I measure 0.104) and tests the wrong quantity. Night is not a
mean. Night is a floor, and the floor is gone.

I looked at both frames before writing that. Neither reads as night to me; the
pre-rung frame is a dim warm evening and the shipped one is a dusty afternoon
market with the lamps blown out. The lamps are clipped at **both** exposures
(any-channel ≥ 250: 0.101% → 0.467%). That defect is older than the rung and
the rung does not cause it — but the rung removes the last of the dark that was
disguising it.

**The retune, derived twice and independently, converging.**

*Constraint 1 — the mascot.* Measured (exposure, hero dE from the maple
control): (1.12, 3.39), (1.18, 4.22), (1.42, 9.61). Slope ≈ 23 dE per unit of
exposure over the two long spans; a three-point per-channel power-law fit
(kR 0.607, kG 0.871, kB 0.278; residuals 0.19 / 1.49 / 0.78 dE) puts the same
crossing at 1.27. **`MIN_DE = 6` is crossed at exposure ≈ 1.26.** One
control-noise unit (0.61 dE) of margin puts the working value at ≈ **1.24**.

*Constraint 2 — the night floor.* Log-linear between the two measured ends
(23.41% at 1.00, 3.78% at 1.42), Lantern's deep-black share reads 9.0% at 1.22,
**8.3% at 1.24**, 7.3% at 1.27, 6.4% at 1.30, 5.4% at 1.34. To hold more true
black than *any* daylight world in the pack (Game Day 8.32% is the highest),
exposure must be **≤ ~1.24**.

Two constraints with nothing in common land within 0.02 of each other. That is
the number.

*Cross-check:* the measurement pass independently re-derived a **1.20–1.30**
band after discovering that the "26% of the frame under 25/255" in the source
comment describes an 08-23 build and that the real pre-rung figure was 5.73%.
1.24 is inside it. **1.34 is outside all three** — it leaves the hero at ~7.5 dE
from maple, still over the bar, so it does not fix the thing the Lantern
judgment itself calls "the single most important unresolved measurement in the
set." And **1.06 gives back a control-checked win** (top-band silhouettes
65.0% → 35.6%) to solve a problem measured against an 08-23 anchor that carries
up to 7 dE of build drift.

**The retune is a reconciliation, not a rescue, and I will say so as plainly as
the Lantern judge did.** Lantern's real defect is that its lamps clip and its
ground has no dark in it. That is emissives and albedo — `ROOF 0x4a5468` on the
finale building, the three remaining formsep colours — not a number in the
exposure column.

### MAPLE and PIRATE — **controls, and they behaved.**

Unchanged by construction and measured unchanged: hero dE 0.59 and 0.61, mean
luma −1.45 and +0.97. They are the reason anything above can be claimed. Keep
shooting them in every pack.

---

## The set

### Does it still read as one game?

**On construction, yes — and the rung did not touch it.** One camera at 225°,
one portrait crop, one untextured flat-shaded primitive vocabulary, one set of
human proportions, one soft contact-anchored shadow language, and one face on
the hero that is charming and identical in all five. Scrolled fast, that is what
says "one game", and it survives the rung intact.

**On the hero's colour, no. This is the finding of the rung, and it is
measurable to the code.**

Annulus 0.55–0.88 R median of the purple body (face excluded, size-independent),
largest connected purple blob, matched pack:

| world | exposure | pre-rung | shipped | move |
|---|---|---|---|---|
| maple | 1.00 | `rgb(120,62,199)` | `rgb(120,61,199)` | dE 0.59 |
| pirate | 1.00 | `rgb(122,66,200)` | `rgb(122,65,200)` | dE 0.61 |
| gameday | 1.12 | `rgb(120,63,200)` | `rgb(129,70,207)` | dE 2.88 |
| powder | 1.18 | `rgb(121,64,200)` | `rgb(132,72,210)` | dE 3.52 |
| lantern | 1.42 | `rgb(119,62,200)` | `rgb(148,85,220)` | **dE 9.56** |

| | max pairwise dE | pairs over `MIN_DE 6` |
|---|---|---|
| **pre-rung pack** | **2.49** (pirate/lantern) | **0 of 10** |
| **shipped pack** | **9.61** (maple/lantern) | **3 of 10** |

**Settled: he was one colour, and he is not now.** Before the unlock all ten
world-pairs sat inside 2.49 dE, four times inside the repo's own bar. After it,
maple/lantern 9.61, pirate/lantern 8.28, gameday/lantern 6.26 all breach
`MIN_DE = 6`, with powder/lantern marginal at 5.53. Against a control noise of
0.61 dE, the maple→lantern gap is **16× noise**.

Corroborated independently on the fixed-position pack that already exists at
`qa/out/lookpair/` (build `8bdf1a86…`, one build, five named spots, radius
pinned): maple `rgb(124,69,201)` → gameday `(133,77,208)` → powder
`(142,85,211)` → lantern `(152,94,221)`, maple→lantern **dE 10.24**. Same
monotone ordering, same magnitude, different build, different framing, pinned
radius. (Pirate's lookpair number is void — my purple segmentation grabbed the
space band on the right of that frame, not the hero. Noted so nobody quotes it.)

### And the mechanism is not what the set judge said it was

The hero's response to exposure is **world-independent**: 0.240, 0.196 and
0.228 dE per exposure point for gameday, powder and lantern respectively. There
is no "Lantern's hero is least sensitive, the shoulder is compressing". Every
world's hero moves at essentially the same rate; Lantern simply took 3.5× the
dose.

Which yields the ruling that actually matters, and it is a ceiling on the whole
column rather than a verdict on one world:

> **The mascot imposes a single exposure ceiling of ≈ 1.26 on every world in
> `WORLD_LIGHT`.** Above it the hero crosses the only bar this repo has
> published for "a child can see that this is not that". Powder at 1.18 and
> Game Day at 1.12 are inside it. Lantern at 1.42 breaches it, and Game Day at
> the proposed 1.30 would breach it too.

That ceiling holds until the hero is taken off world exposure. **The durable fix
is decoupling** — give the hero material a per-world compensation that cancels
`LIGHT.exposure` so his rendered body lands on one target — and then the
exposure column is free and 1.42 can be reopened on its own merits. Do that
before rungs 2 and 3: `GLOSS_ENV` and an environment map both move specular,
and the mascot has five specular lobes and a fresnel term (`void3d.ts:378–387`).
He is the surface in the game most exposed to both, and nothing currently holds
him to one colour.

One caveat on my own number, stated because it is the largest hole in it: the
maple lookpair frame and the maple shippedlook frame — **same world, same
exposure 1.0** — sit **4.06 dE** apart, and the two differ in build, position
and hero radius (95 px vs 236 px). That is as large as Game Day's entire move.
So the parity bar has to be defined **at a stated radius** or measured across
the range, or it will fail for reasons that have nothing to do with light. See
the last section.

### The other two things a parent sees, neither of them the rung's fault

**Powder does not read as a place.** I looked at it before I measured it and
wrote down "a purple ball floating in sky with clouds". It is snow, with people
standing on it casting shadows, and nothing in the frame says so: 59.8% of it
sits in 16×16 patches with under 0.4% luminance variation, its world p95/p25 is
1.93, and its near-field band is constant to a tenth of a code across 424 rows.
It is the weakest store screenshot in the pack and no exposure value changes
that.

**Pirate says nothing about pirates.** A pale cream plaza over a magenta-and-
blue carnival floor mat, with a speaker stack. Not a rung-1 question, but it is
in the same store listing and it is the one frame where the *world* fails to
identify itself.

---

## Where the judges were wrong

Named, with the check that settles each.

1. **POWDER — "the snowman yaw fix lands" in the shipped frame. It is not in
   that build.** The fix is `59b8edb`, which comes **after** `c0dec56`. Verified
   from git: `git show c0dec56:./src/proto3d/island.ts` drops every snowman at
   `rnd2() * Math.PI * 2`; `snowmanYaw()` does not exist in that source. Two
   camera-facing snowmen out of a uniform spin is roughly an 11% coincidence,
   not a fix. This is the exact failure mode `GOVERNOR.md` rule 3b exists for —
   an observation credited to the wrong cause — committed inside a ruling about
   a rung whose whole lesson is "prove the consumer reads it".

2. **SET — the ambient-dominance mechanism reads a column the renderer does not
   read.** "Lantern is the only world where fill exceeds key (hemiI 1.75 against
   sunI 0.55, ratio 0.31)" comes from `WORLD_LIGHT`. `RIG` pins
   **`hemiI: 0.22`** (`prototype3d.ts:813`) and `hemi.intensity = RIG.hemiI`
   (`:883`) is the only write. **The hemisphere column is still inert.**
   Lantern's actual key:hemi is 0.55 × 1.31 / 0.22 = **3.28 — the pack's
   highest, not its lowest.** The whole "exposure is predominantly a lift of the
   directionless light on Lantern alone" argument is built on a number no frame
   has ever contained. RUNG 1 exists because someone did this with `exposure`.
   The ruling on RUNG 1 did it again with `hemiI`.

3. **SET — the noise floor, and with it the 1.06 retune.** "Three Maple frames
   across three builds and five days span dE 1.29." Measured: `maple_aaa1` and
   `maple_tone2` are identical on the hero (**dE 0.00**) and both sit **6.5–7.0
   dE** from the in-interval maple frames, with no exposure change anywhere.
   `lantern_aaa1` is **3.52 dE** from the true `lantern_pre`. The 1.06 value is
   derived from those 08-23 frames as "lantern at exposure 1.00" — an anchor
   carrying more build drift than the bar it is being compared against. The
   correct in-interval baseline (`rgb(119,62,200)`) was in git.

4. **SET — "Lantern bought brightness and paid in form" is backwards on the
   matched pair.** Claimed: flat-patch share 23% → 34.8%, patch sd 0.0052 →
   0.0045. Measured, matched frames: flat share **25.8% → 15.1%** (bottom third
   61.0% → 36.3%) and median patch sd **0.0071 → 0.0079 — it rose.** Lantern
   gained local tonal variation. The world that lost it is Powder (0.0160 →
   0.0117 in the mid-band), which no judge reported.

5. **SET — the "fused cluster" does not reproduce.** "pirate and gameday are
   bit-identical, dE 0.0" and "the cluster is within dE 1.1 of itself." I
   measure pirate/gameday **2.35**, pirate/powder **3.36**, gameday/powder 1.01.
   The three-tier picture is right in shape; the tightness is overstated. This
   does not change the verdict — it changes how much precision anyone should
   read into it.

6. **GAME DAY — the two-mode ground separation did not widen.** "The gap between
   the ground's two lighting modes widened from ~6 L\* to ~8 L\*." On my ground
   mask the two-mode gap is **8 L\* in both frames**. Direct sampling of open
   tarmac gives a sun/shade separation of ~4 L\* before and ~5 L\* after — a real
   but small move, not a 33% widening. The rest of that judge's Game Day work is
   the most reproducible in the set: the matched-truck colours, the L\*/C\*
   deltas and the 2.59 → 2.84 all land on my numbers.

7. **GAME DAY — the CRIM mechanism is not established, though the measurement
   is.** "The gamut guard's lift is tied to luminance while ACES drives G more
   negative, so raising exposure pushes CRIM further out of gamut."
   `gamutGuard` (`prototype3d.ts:276`) is `l + (color − l) · (l / (l − mn·1.15))`
   — under a uniform scale both `l` and `mn` scale together and the correction
   factor is **scale-invariant**. The guard is not the luminance-tied part. That
   G falls as exposure rises is confirmed (whole-frame reddish mean G 13.58 →
   11.74; the truck body's own G 2 → 1); the attribution to the guard is not.
   The conclusion — exposure cannot fix this red — stands on the measurement
   alone.

8. **GAME DAY — "93.6% under the ledger's G<12, B<12 test"** does not reproduce
   at any denominator I can find; the reddish-pixel figure is **79.57%**, which
   is also what the measurement pass gets. The strict G=B=0 census (0.58% vs my
   0.68%) does reproduce.

9. **LANTERN — every number reproduces, and the argument still fails.** hot-pixel
   share 0.28% → 1.08% with its median falling 0.759 → 0.579, world p95/p25
   10.99 → 7.19, bottom-band saturation 0.627 → 0.534, top-band near-black
   35.6% after — all mine to two or three figures. But argument (1), "the night
   does not break", tests mean level when the thing that broke is the floor
   (23.41% → 3.78% deep black, below both daylight controls). And the retune it
   reaches, 1.34, leaves the hero at ~7.5 dE from maple — **still over the bar**,
   so it does not fix the finding the same document calls the most important
   unresolved measurement in the set. Right diagnosis, wrong number.

10. **MEASUREMENTS — under-claimed the rung by using the wrong noise proxy, and
    said the right data did not exist.** "No clean same-build, same-world,
    different-location pair exists on disk." Two did, in git. Conclusion 1 —
    "black-crush share is a composition metric, not an exposure metric" — rests
    on a **cross-world** maple↔pirate gap of 1.80 pp. The real in-interval
    control noise on `Ylin < 0.02` is **0.53–0.68 pp**, and against that Game
    Day's −3.00 pp and Lantern's −19.6 pp are 4× and 29× noise. The crush
    improvements are real and the document told everyone not to quote them.

11. **MEASUREMENTS — otherwise the most reliable instrument in the set.** I
    re-derived its headlines and they land: gameday mean 72.52 → 81.28, powder
    120.22 → 133.41, lantern 67.56 → 87.78, maple 125.18, pirate 134.42, the
    dead-of-reddish ratio 80.07% → 79.57%, powder's p95 − median 47 → 35,
    lantern p05 22 → 38. Its white-clip warning is correct and should be acted
    on: max blue anywhere in eight frames is 243, so `all channels > 250` is a
    gate that can never fire.

---

## What is still unmeasured

**The one that decides the retune: the hero at more than one radius.** Every
hero number in this ruling comes from a single follow distance per frame —
R ≈ 236–338 px in the shippedlook pack, R ≈ 95 px in lookpair. Maple at
exposure 1.0 measures **4.06 dE** between those two conditions, as large as Game
Day's entire exposure move. The camera runs **26–340 units** across a match. A
parity bar defined at one radius is the same mistake as the balloon frustum
claim, the 1500 stars and the planet sizing — three times recorded in
`GOVERNOR.md` already. **Nobody has swept it.**

**The location-noise bound per statistic, per world.** I produced the first one
in this repo from the two control pairs, and it is a bound from *two samples* in
*two* worlds. Lantern is lit by street-level lamps rather than a key, so its
hero colour is far more position-dependent than Maple's or Pirate's, and my 0.61
dE floor almost certainly understates it there. Every Lantern number in this
document inherits that.

**A Lantern dark corner.** The Lantern judgment asserts the shipped frame is
~1.29× flattered by lamp proximity, reasoned from a whole-frame ratio. Never
photographed.

**Whether the black shards are two instances or a class.** Two found by eye in
one Game Day frame. No census exists — `qa/blackprops.mjs` tests for
`rgb(0,0,0)` and its own retraction says that is not the same as "no holes".

**Whether the hero casts a ground shadow in Powder at any radius.** Absent in
the shipped frame, present in the pre-rung one, cause unknown.

**The two patches this ruling points at, unmeasured:** `ASPHALT` off `0x4a4a52`,
and unlocking `RIG.hemiI` — which Powder's own rig comment names as that world's
defining light ("the ground bounce does the work no other world gets") and which
has never reached a frame above a quarter strength. Note against the standing
refutation: the retracted lantern-only hemi lift failed because "a brighter
floor times dark paint is still dark". Powder's floor is snow. That is a
different experiment and it deserves to be run as one.

### Does `qa/lookpair.mjs` supply it?

**Mostly yes, and it is the single highest-value thing on this list.** Read from
disk: it warps the void to a **named fixed world position** per world
(`SPOTS`, `:143`), re-asserts the radius whenever eating drifts it — it
documents a real case where a drifting "pinned" radius moved camDist 129.1 →
149.9, 16% of lens — and stamps a source digest beside every frame so that a
pair whose two `.src` values are equal is self-identified as not an A/B. It
deliberately does **not** pin the camera, and the header records that a skeptic
killed that patch for the right reason.

So it removes the exact confound that limits every claim in this ruling: same
spot, same props, same framing, build-to-build. It has already been run once —
five worlds, one build `8bdf1a86…`, in `qa/out/lookpair/` — and **there is no
second half.** It is currently one photograph, not a pair.

What it supplies, in the order it should be used:

1. **The Lantern retune's acceptance test.** Shoot `lantern before` at HEAD,
   land 1.24, shoot `lantern after`. The tonal claims in this ruling stop being
   confound-limited and become measurements.
2. **Cross-world hero parity in one run.** Five named spots, one build, already
   the shape the question needs. Add `qa/heroparity.mjs` on top of it:
   segment the purple blob, annulus median, assert **max pairwise CIE76 dE < 4**
   — half `formsep`'s bar, because that bar is for telling two faces *apart* and
   this is one object that must be one colour. **It fails on today's build at
   9.61–10.24, which satisfies rule 2 before any fix is written.**
3. **The location-noise figure, properly.** Two named spots per world instead of
   one, same build, same radius. Every "is this exposure or is this where he
   stood" question in this round dies with that shot.

What it does **not** supply, and must be added to it: **the radius sweep.** It
pins one radius per run. The bar in item 2 above is meaningless until it is
stated at a radius, or asserted across R 2.5–12 with the frames to show for it.
Until then, hold that probe at a fixed R and say so in its header.

---

## The retunes, in one place

| file | anchor | from | to | why |
|---|---|---|---|---|
| `src/prototype3d.ts` | `:728` `WORLD_LIGHT.gameday.exposure` | 1.12 | **1.12 — no change** | earned it; 1.30 breaches the mascot ceiling |
| `src/prototype3d.ts` | `:774` `WORLD_LIGHT.powder.exposure` | 1.18 | **1.18 — no change** | landed correctly; further exposure buys flat |
| `src/prototype3d.ts` | `:763` `WORLD_LIGHT.lantern.exposure` | 1.42 | **1.24** (band 1.20–1.27) | mascot bar crossed at ≈1.26; night floor below every daylight world above ≈1.24 |

Then, in order, and none of them are exposure:

1. **Decouple the hero from world exposure**, and ship `qa/heroparity.mjs`
   (built on `lookpair`, at a stated radius) failing at 9.61 first.
2. **`tailgate.ts:39` `ASPHALT` `0x4a4a52` → ~`0x6f6c74`**, with the
   open-ground pixel-mode A/B as its probe.
3. **CRIM's chroma**, before any further Game Day stop. `0xc4342f` is doing
   nothing but getting louder.
4. **Powder's ground grain** at `island.ts:3096`, and something with an edge in
   the upper 60% of its frame.
5. **Lantern's lamps and albedo** — the clipping is at both exposures and the
   remaining formsep colours plus `ROOF 0x4a5468` are where "crisp" lives in
   that world.
6. **Kill the two black shards** before Game Day is reshot for the store.
7. **Rungs 2 and 3 wait** on item 1.

*Every number in this document was run by me on the frames named, with throwaway
scripts under `scratchpad/skeptic/`. Nothing here is quoted from another
document without being re-derived, and where a re-derivation disagreed with the
source I have said so by name.*
