# crew:gamutzero-repair — the instrument that measured its own remedy

**Filed 2026-08-28. Nothing here is landed. No tracked file was edited.**
Source at `23edb49627155522`, HEAD `6a424e6`, five frames reshot at that source
(`qa/out/shippedlook/*_gz3.png`, stamps verified below).

---

## 0. THE CLAIM, AND WHAT I FOUND WHEN I MEASURED IT MYSELF

The inherited claim: `qa/gamutzero.mjs` passes green while ~65% of Game Day's
red pixels carry a green channel of exactly 1/255, so the probe is measuring
the gamut guard's EXISTENCE rather than the defect.

**Confirmed, with one correction to the headline number.**

```
  $ node qa/gamutzero.mjs                       # unmodified, canonical pack
    maple     chromatic  530422   dead-channel   4.9%   MONOCHANNEL   0.08%  ok
    pirate    chromatic  306547   dead-channel   2.3%   MONOCHANNEL   0.00%  ok
    gameday   chromatic  368024   dead-channel   7.8%   MONOCHANNEL   0.23%  ok
    lantern   chromatic  663217   dead-channel   0.1%   MONOCHANNEL   0.00%  ok
    powder    chromatic  420629   dead-channel   0.2%   MONOCHANNEL   0.00%  ok
    PASS — no world renders a chromatic surface down to one live channel (bar 1.0%)
    exit 0
```

On the same Game Day frame, red-dominant chromatic pixels (`r` strictly the
max, the probe's own `mx>=38` / `(mx-mn)/mx>=0.3` filter):

| frame | red-dominant px | G === 0 | **G === 1** | G <= 1 |
|---|---|---|---|---|
| `gameday_look.png` (canonical, stale) | 331,587 | 15.7% | **51.0%** | 66.7% |
| `gameday_gz3.png` (reshot at this source) | 319,056 | 8.7% | **22.5%** | 31.2% |

**The "65%" is real but it is a property of the FRAME, not of the build.** It is
66.7% on the canonical pack, 31.2% on my reshoot of the identical source, and
65.02% in the frame `docs/crews/round-3/gameday-red.verdict.md` measured. The
composition decides how much truck is on screen. I am recording the range rather
than a headline, because a single number here would be the third different
"65%" in the round and rule 3 does not allow me to pick one.

What does not vary is the shape of the distribution. Green on red-dominant
pixels does not decay smoothly toward zero — it **piles up on a single code**:

```
  gameday_look   G value  0: 15.7%  1: 51.0%  2: 1.1%  3: 0.3%  4: 0.2%  5: 0.3%
  gameday_gz3    G value  0:  8.7%  1: 22.5%  2: 1.4%  3: 0.6%  4: 0.6%  5: 0.6%
```

A spike at exactly 1 with a cliff at 2 is not a shading ramp running out of
range. It is a constant.

### The mechanism, in the probe's own terms

`gamutGuard` (`src/prototype3d.ts:276`) maps a negative minimum channel `mn` to

    mn' = 0.15 · l · m / ( l + 1.15 · m )      where m = −mn

which is strictly positive for every `m > 0`. The probe's predicate is
`(r===0)+(g===0)+(b===0) >= 2`. **The remedy's mechanism and the probe's
predicate are the same operation.** The guard cannot run without turning the
probe green, and it turns the probe green whether or not the surface got its
colour back.

This is `docs/GOVERNOR.md` retraction 10 — *"no pure black is not no holes"* —
happening a second time, inside the instrument written for this exact class of
finding. `blackprops` tested `rgb(0,0,0)`; the toe lifted the bathhouse roof off
zero and the probe went green over a building that still reads as a silhouette.
`gamutzero` tests `channel === 0`; the guard lifted the truck off zero and the
probe went green over a surface that still reads as a fill.

### And it is provable, not inferred

I rendered Game Day four ways on the real page, patching the **compiled bundle**
through Playwright route interception (nothing on disk changed), same world,
same shot procedure, same rung, same pinned face:

| Game Day build | what it is | `qa/gamutzero.mjs` as written | the repaired metric |
|---|---|---|---|
| old per-channel toe clip, no guard | the **2026-08-24 "before"** | MONOCHANNEL **15.88% FAIL** | **36.74% FAIL** |
| soft toe, no guard | the **2026-08-24 "after"** | MONOCHANNEL **6.47% FAIL** | **27.36% FAIL** |
| soft toe **and** guard | **shipped today** | MONOCHANNEL **0.00% ok** | **33.99% FAIL** |
| + chroma push 1.07 → 1.00 | partial | MONOCHANNEL 0.01% ok | 2.53% FAIL |
| + push 1.00 **and** toe 0.014 → 0.0002 | defect absent | MONOCHANNEL 0.00% ok | **0.12% ok** |

Read the two right-hand columns down. The retracted metric falls 15.88 → 6.47 →
**0.00** and reads as two successive fixes converging on done. The repaired one
reads 36.74 → 27.36 → 33.99: the toe recovered about a quarter of the defect and
**the guard recovered none of it.**

I am not claiming the guard made it worse. 27.36 and 33.99 are separate shoots
and sit inside the Game-Day shoot-to-shoot band I measured (29.3–41.0%). The
claim is the one the arithmetic already forces: without the guard a negative
green is clamped to code 0, with the guard it arrives at code 1, and **both are
constants.** The guard moved the retracted metric by 6.47 points, to zero, and
moved the defect by nothing this measurement can resolve. That is the
retraction, run rather than argued.

### What the frame actually looks like

The densest crushed window in `gameday_gz3.png` (300×300 device px at (0,1550)):
flat crimson slabs, a flat gold panel, a teal frame — three fills, no gradient
on any of them. The reddest 300×300 window, over the red pixels in it:

| Game Day build | red px in window | green: min / median / max | **distinct green levels** |
|---|---|---|---|
| 08-24 before (clip, no guard) | 37,814 | 0 / 0 / 0 | **1** |
| shipped (`_ctrl`) | 44,019 | 0 / 1 / 1 | **2** |
| shipped (`_gz3` pack) | 39,953 | 0 / 1 / 6 | **7** |
| guard removed | 59,105 | 0 / 0 / 25 | 26 |
| push 1.00 | 46,086 | 2 / 16 / 67 | 33 |
| push 1.00 + toe off | 60,216 | 13 / 31 / 47 | **30** |

**Two distinct green values across forty-four thousand pixels of red surface.**
That is the number the probe was supposed to be able to say and cannot.

---

## 1. THE RETRACTION TEXT — goes in the probe's own header, above everything

Verbatim, as it stands at the top of the file in §7:

> ── RETRACTION, 2026-08-28: THIS PROBE MEASURED THE GUARD, NOT THE DEFECT ──
>
> Everything below the line was written against `zeros >= 2`, where
>
>     const zeros = (r === 0) + (g === 0) + (b === 0);
>
> counts channels at EXACTLY zero. That predicate is the same shape as the
> remedy it was written to police. `gamutGuard` (prototype3d.ts:276) exists to
> take a channel the ACES output matrix drove negative and put a small POSITIVE
> number in it. Its asymptote is 0.15·l·m/(l+1.15·m), which for a saturated red
> at play exposure arrives at the display as 1/255 — the toe squares it and the
> chroma push drives it negative a second time. So the guard's success and the
> defect's survival look identical to `=== 0`, and the probe went green the day
> the guard landed while the defect it was written for was untouched.
>
> MEASURED, 2026-08-28, source 23edb49627155522:
>
>     this probe, as written        PASS, exit 0, every world
>                                   gameday MONOCHANNEL 0.23% against a 1.0% bar
>     the same frame                22.5% of red-dominant chromatic pixels carry
>                                   green at EXACTLY 1 and 8.7% at 0 (51.0% and
>                                   15.7% on the canonical pack — the SHARE is
>                                   frame-dependent, the pile-up on one code is
>                                   not), with red at 158-202
>     the reddest 300x300 window    44,019 red pixels; green takes TWO distinct
>                                   values out of 256
>
> And on three Game Day builds rendered through the real compiled shader — the
> old per-channel toe clip with no guard (the 2026-08-24 "before"), the soft toe
> with no guard (the "after"), and today:
>
>     this probe          15.88%  ->   6.47%  ->  0.00%   reads as "fixed"
>     the census below    36.74%  ->  27.36%  ->  33.99%  reads as "unfixed"
>
> The toe was a real fix. The guard moved this probe 6.47 points to zero and
> moved the defect by nothing the measurement can resolve — without the guard a
> negative channel is clamped to code 0, with it the channel arrives at code 1,
> and both are constants.
>
> This is the tenth retraction in docs/GOVERNOR.md happening a second time
> ("no pure black is not no holes"), inside the instrument written for that
> exact class of finding. The lesson generalises and belongs in the standing
> rules: **a probe whose predicate is `== 0` cannot measure a remedy whose
> mechanism is `make it non-zero`.** Ask what the fix DOES before you write the
> test for it.
>
> The dead-channel column below (`zeros >= 1`) was reported unbarred and is
> retracted with the bar it sat beside: it is the same quantity one step earlier
> and it moves for the same wrong reason — Lantern went 65.6% -> 1.8% on the toe
> change and was recorded in the ledger as fixed, when what had happened is that
> its TIMBER moved from (33,0,0) to (39,12,0), a green the world's own light
> moves by 1.06 codes.
>


---

## 2. THE RIGHT TEST

**A channel carries information about a surface only if the light falling on
that surface can move it by at least one 8-bit code. Below that level it is a
CONSTANT — dead — whatever number is in it, zero or one or four.**

That sentence is the whole repair. It subsumes `=== 0` (zero is a constant), it
subsumes the brief's harder case (a channel pinned at a fixed multiple of
luminance is a constant once the multiple is small enough that the ramp falls
under the quantisation step — which is exactly what the guard's `0.130·l`
asymptote does after the toe squares it), and it cannot be satisfied by moving a
number off zero.

Two floors are derived, by independent routes, and a channel must be under
**both** to be condemned.

### THE INFORMATION FLOOR — from quantisation

Let ρ be the world's own relative shading depth: the median of
`span(dominant) / median(dominant)` over edge-free, single-material patches of
8 css px, measured on the **dominant** channel, which is alive by construction.
sRGB is close enough to a power law that a Lambertian surface's channels move
by the same RELATIVE amount under a change of irradiance, so the same light
moves a channel at level `v` by about `ρ·v` codes. If `ρ·v < 1` the 8-bit grid
cannot represent the ramp and the channel is flat by arithmetic.

    infoFloor = ceil( 1 / ρ )

Measured on the reshot pack: ρ = 0.0229 (powder) … 0.0886 (lantern), so the
floor runs **12 to 44 codes**. It is measured from the frame, per world, per
run — there is no constant to go stale.

### THE PALETTE FLOOR — from the art

Let QMIN be the smallest linear min/max channel ratio among the colour constants
the world modules author:

    QMIN = 0.01533   set by alpine.ts ORANGE_D rgb(180,92,20), of 136 constants

`enc( lin(D) · QMIN )` is where the most saturated colour this game contains
would land under a hue-preserving pipeline, at a pixel whose dominant channel is
`D`. **At D = 180 that is code 20.** Nothing in the art asks for less; anything
below it was put there by the grade, not by a colour someone chose.

The scan is `NAME = 0xrrggbb` over the eight world-surface modules, and it is
deliberately narrow. Per file, with the constant that would set the floor:

```
  mainstreet   36 constants   0.02044  PUMPKIN  rgb(239,122,36)
  tailgate     26             0.02545  GOLD     rgb(240,180,41)
  nightmarket  25             0.02315  G_GRIDDLE rgb(255,106,42)
  alpine       27             0.01533  ORANGE_D rgb(180,92,20)     <- sets QMIN
  island        6             0.05930  TEAL     rgb(47,184,168)
  life         16             0.02545  GD_GOLD  rgb(240,180,41)
  bay           0                                                  <- see limit 7
  palette       0                                                  <- see limit 7
```

Broadening the pattern to object-property form (`emissive: 0x...`) and to
`hatgeo.ts` takes the census from 136 to 620 and drops QMIN to zero, because an
`emissive` is a LIGHT and `GOLD_D` on a shop hat is `rgb(216,148,0)`. Neither is
a world surface's albedo, and letting either set the floor would gut the bar.

The two floors agree to within a few codes across the mid-tones — 20 from the
palette at D=180, 12–20 from quantisation on four of the five worlds (Powder's
snow is the exception at 44, and there the palette clause is the binding one) — by
completely independent arguments. That agreement is the reason to trust either.

The probe condemns a channel only when it is under `min(infoFloor, paletteFloor)`,
which is the conservative reading: quantisation must say the channel is flat
**and** no authored colour explains its level.

### The gates, and why each is where it is

| gate | value | why |
|---|---|---|
| LIT (dominant channel) | ≥ 128 | half the display's code range. At or above it the surface is taking key light and "it is dark" is not an available explanation for a channel that cannot carry anything. |
| CHROMA `(mx−mn)/mx` | ≥ 0.30 | inherited **unchanged** from the retracted version, so the two probes judge the same pixels and the comparison above is like for like. |
| patch | 8 **css** px | against the 430-wide reference viewport, scaled from the PNG's own width. `blackprops`' area bar was in DEVICE px and went half-blind at 2× (GOVERNOR retraction 9); this one derives the scale from the frame. |
| edge step | ≤ 8 codes | patch must be one surface. Only used to select the patches that estimate ρ; the census itself is per-pixel and does not depend on it. |
| illumination sampled | **all of it, above LIT** | `CRIM`'s green is non-monotonic in light — it recovers above R≈205 — so a probe that samples one `k` lands on one side of the V and reports the other side's answer. That is the fault `gameday-red.verdict.md` §A5 found in `qa/formsep.mjs`. This probe reads the frame, which contains every illumination level the world produces. |

---

## 3. THE BAR: 1.5% of lit chromatic pixels

Every point below is one I ran.

| point | Game Day | Maple | Pirate | Lantern | Powder |
|---|---|---|---|---|---|
| reshot pack `_gz3` | **29.32** | **11.27** | **6.53** | 0.00 | 0.31 |
| canonical pack `_look` (stale source) | **40.94** | **12.24** | **4.00** | 0.70 | 0.50 |
| defect provably absent (Game Day) | **0.12** | — | — | — | — |

- The **defect-absent build measures 0.12%**. That is the residual an honest
  8-bit pipeline leaves.
- The two worlds whose palettes do not push ACES out of gamut measure
  **0.00–0.70%** across two shoots.
- The lowest failing world measures **4.00%**.
- **Every bar between 0.8% and 3.9% returns the same five verdicts on this
  pack.** The number sits inside an empty band, so it is not load-bearing: it is
  above every clean reading with margin for the shoot-to-shoot variance I
  measured (Game Day 29.3–41.0%, Lantern 0.00–0.70%), and more than 2.5×
  below the lowest failing world.

I am *not* claiming 1.5% is the level at which a child sees the defect. It is
the level at which the pipeline stops being the explanation.

---

## 4. FALSIFICATION — the build it fails and the build it passes

The rule is rule 2: a probe that cannot be made to fail is not measuring
anything, and one that cannot be made to pass is not a bar.

### It fails today

The probe in §7, pointed at the pack reshot at this source
(`node qa/gamutzero.mjs gz3`): **exit 1**, three worlds over the bar — Game Day
29.32%, Maple 11.27%, Pirate 6.53%. The version it replaces, run on the same
build, is **exit 0** on all five. Full output in §6.

### It passes on a build where the defect is genuinely absent

**Named build: the two per-channel crushers neutralised in the tone-map chunk.**

    src/prototype3d.ts:316   const float TOE = 0.014;              ->  0.0002
    src/prototype3d.ts:321   mix( vec3( l ), color, 1.07 )         ->  1.00

Those are the two stages that take the guard's small positive value and destroy
it: the toe squares a channel already near zero (`c²/(c+T)` halves 0.013 to
0.0064), and the chroma push then drives it negative a second time
(`l + (0.06l − l)·1.07 < 0`), where the second guard call reduces it to sRGB
code 0–1. With both neutralised, Game Day measures **0.12%** and the reddest
window's green runs 13–47 across **30 distinct levels**.

**How to produce it, exactly as I did**, without touching a tracked file: read
the built bundle (`dist/assets/main-*.js` — the shader is a template literal and
survives minification verbatim), apply the two string replacements, assert each
matched exactly once, and serve it back with
`page.route('**/assets/main-*.js', r => r.fulfill({ body: patched }))` against
the preview already running on :4177. Then run the shippedlook procedure
unchanged. Script: `scratchpad/altbuild.mjs`, listed in §10.

**This is a NEGATIVE CONTROL, not a proposed fix.** Removing the toe would undo
the 2026-08-24 change and is not on the table. Its only job is to prove the
probe can reach green, so that a green reading means something.

### The shippable defect-absent build is the albedo, and it is already queued

`gameday-red.verdict.md` §E has it: a choice between `0xc4342f` / `0xc4453f` /
`0xc44c2f` at `tailgate.ts:27`, with `life.ts:853` moving with it, decided by
the owner on three photographs. That verdict also established, on the real
compiled shader, that **the rig cannot be the lever** (you would need an
illuminant 29% greener than it is red) and that **the guard knee must not
move** (1.15 → 2.0 makes the green/albedo inversion eighteen times louder).
I re-propose neither.

What the repaired probe adds to that decision, and what nothing currently in the
repo can answer: **the candidate hexes lift green over the knee but they do not
all lift blue.** `0xc44c2f` has a linear b/r of 0.0515, below the ~0.08 knee that
verdict measured; `0xc4453f` has 0.0900, above it. The repaired probe measures
both weak channels on the actual pack, so it can say which candidate restores
the surface rather than half of it. That is a question for the photographs, not
a claim — I have not rendered either hex.

### A control that proves the metric tracks the defect and not the world

Same frozen Game Day frame, same camera, same scene, only
`renderer.toneMappingExposure` moving (read back off the renderer each time):

| k | 1.12 (shipped) | 1.5 | 1.8 | 2.2 | 2.8 |
|---|---|---|---|---|---|
| repaired metric | **29.30%** | 7.28% | **2.35%** | 3.14% | 4.31% |
| `qa/gamutzero.mjs` | 0.01% | 0.01% | 0.00% | 0.00% | 0.00% |

The repaired metric swings 12× and bottoms out in the middle — the V that
verdict §A1 measured, seen from the frame side. The retracted one is flat to
within one hundredth of a point across the whole sweep. **Exposure is not a
lever and I am not proposing it as one** (`gameday-red.verdict.md` §B: `CRIM`
recovers only above R≈205, which needs a key past the mascot ceiling). This is
here because a metric that does not move when the defect moves is not a metric.

---

## 5. WHAT IT WOULD HAVE CAUGHT

**2026-08-24, the toe — measured, not reasoned.** I rendered the "before" build
by putting the old per-channel clip back into the compiled bundle
(`color = max(vec3(0.0), (color - TOE) / (1.0 - TOE))`) with the guard removed,
which is the state of the tone map on 2026-08-24. Game Day, both probes, three
builds on one line:

| | 08-24 before | 08-24 after | today |
|---|---|---|---|
| `gamutzero` MONOCHANNEL | 15.88% | 6.47% | **0.00%** |
| repaired metric | 36.74% | 27.36% | 33.99% |
| green on red, reddest window | **1 distinct level** / 37,814 px | 26 / 59,105 px | **2 distinct levels** / 44,019 px |

The toe was a real fix and the repaired probe says so — 36.74 → 27.36, and the
crimson goes from `rgb(178,0,0)` to a surface with a ramp on it. Then the ledger
recorded the same event as 65.6% → 1.8% on Lantern and wrote the world down as
fixed, because a per-channel **compressor** (`c²/(c+T)` never reaches zero from a
non-zero input) empties the zero census whether or not the colour regained the
ability to shade. Lantern's TIMBER went (33,0,0) → (39,12,0) — the tone-map
chunk's own modelled figure, `prototype3d.ts:311`, not a rendered one — and a
green at code 12, at Lantern's measured ρ = 0.0886, is moved by **1.06 codes**.
It clears the information floor by six hundredths of a code. Barely alive,
recorded as fixed.

(The distinct-level row is a different window in each frame, since these are
separate shoots and the composition moves; it is there to show what the surfaces
look like, not as a controlled A/B. The controlled comparison is the metric.)

**2026-08-26, "Game Day's red has two luminance levels".** The ledger has this
as CONFIRMED and PENDING — *"1,325 pure-red interior patches, median 2 distinct
luminance levels out of 256"* — with the cause recorded as "NOT yet explained".
It sat unexplained for two days beside a `gamutzero` that has been green since
the guard landed. The repaired probe
reports it as a first-class number on every art run: Game Day 29.32%, named to
the pixel (`rgb(177,1,7) ×43,023`, `rgb(208,153,4) ×16,213`).

**Today, two worlds nobody has filed anything about.** The repaired probe fails
Maple at 11.27% and Pirate at 6.53%, and names what is crushed:

```
  maple    rgb(136,0,5)x1255   rgb(164,129,2)x1243   rgb(183,21,17)x1109
  pirate   rgb(5,153,138)x16731  rgb(161,123,8)x2522  rgb(5,154,139)x1973
  gameday  rgb(177,1,7)x43023  rgb(208,153,4)x16213  rgb(5,139,120)x13213
```

Those are exactly the three families `src/prototype3d.ts:264` says the guard was
installed for — *"GOLD ships with a dead blue, the greens and teals with a dead
red"* — still there, in three worlds, with the guard running.

And they are crushed against **their own albedo**, not merely against QMIN,
which is the stronger statement. Hue-preserving arithmetic, from the authored
hex through linear and back:

| surface | authored | weak/dom, linear | rendered | that channel: hue-preserving → actual | QMIN floor there |
|---|---|---|---|---|---|
| `tailgate.ts:31 TEAL` `0x2aa9a0` (= `life.ts:855 GD_AWAY`) | rgb(42,169,160) | r/g **0.0584** | rgb(5,139,120) | **33 → 5** | 13 |
| the Pirate teal, nearest constant `island.ts:4234 TEAL` | rgb(47,184,168) | r/g **0.0593** | rgb(5,153,138) | **37 → 5** | 15 |
| `tailgate.ts:29 GOLD` `0xf0b429` (= `mainstreet.ts:115 FAIR_C`) | rgb(240,180,41) | b/r **0.0254** | rgb(208,153,4) | **34 → 4** | 25 |

Every one of them is far under its own albedo's ratio, and under the QMIN floor
as well — so the finding does not depend on which colour happens to set QMIN.

`0xf0b429` is one hex shared by Game Day's `GOLD` and Maple's `FAIR_C`
(`mainstreet.ts:213` says so in as many words), so the same dead blue ships in
two worlds from one constant. **This is not a Game Day colour problem. It is a
palette-wide one that has only ever been looked at on Game Day.**
Filed as a lead, not a claim: I have not proposed a colour for any of them.

---

## 6. WHAT IT PRINTS

`node qa/gamutzero.mjs gz3`, on the pack reshot at this source — **exit 1**:

```

  palette floor QMIN 0.01533 — set by alpine.ts ORANGE_D rgb(180,92,20), of 136 constants
  source 23edb49627155522

  maple     rho 0.0575  floors info 18 / palette 20@180   lit-chromatic  863583   DEAD  11.27%  FAIL
            by channel R/G/B 382/46534/96678   at LIT 96 (unbarred) 12.65%   stamp 23edb49627155522
            crushed most: rgb(136,0,5)x1255 rgb(164,129,2)x1243 rgb(183,21,17)x1109
  pirate    rho 0.0513  floors info 20 / palette 20@180   lit-chromatic  509834   DEAD   6.53%  FAIL
            by channel R/G/B 23355/1509/8447   at LIT 96 (unbarred) 8.08%   stamp 23edb49627155522
            crushed most: rgb(5,153,138)x16731 rgb(161,123,8)x2522 rgb(5,154,139)x1973
  gameday   rho 0.0805  floors info 13 / palette 20@180   lit-chromatic  617508   DEAD  29.32%  FAIL
            by channel R/G/B 15074/110657/164879   at LIT 96 (unbarred) 30.22%   stamp 23edb49627155522
            crushed most: rgb(177,1,7)x43023 rgb(208,153,4)x16213 rgb(5,139,120)x13213
  lantern   rho 0.0886  floors info 12 / palette 20@180   lit-chromatic  475214   DEAD   0.00%  ok
            by channel R/G/B 0/0/0   at LIT 96 (unbarred) 6.67%   stamp 23edb49627155522
  powder    rho 0.0229  floors info 44 / palette 20@180   lit-chromatic  826546   DEAD   0.31%  ok
            by channel R/G/B 1566/967/254   at LIT 96 (unbarred) 0.57%   stamp 23edb49627155522
            crushed most: rgb(133,5,16)x620 rgb(135,1,9)x146 rgb(4,105,140)x72

FAIL — 3 world(s) above 1.5% of lit chromatic pixels carrying a channel
       the light cannot move by one code. Those channels are constants,
       and a constant channel cannot carry a cool shadow or a warm highlight.
```

Every line is a number a reader can act on: which world, how hard the light
works there, where both floors landed, the share, which channel, the same census
at the dimmer gate, the frame's own stamp, and the exact RGB of the surfaces
that are worst. The retracted version printed one percentage and the word `ok`.

---

## 7. THE PROBE IN FULL

Replaces `qa/gamutzero.mjs`. Reads the canonical pack; takes an optional tag so
a reshoot can be measured without overwriting the pack the studio is reading.

```js
// NO SURFACE MAY LOSE A COLOUR CHANNEL TO THE GRADE — the gamut census.
//
//   node qa/gamutzero.mjs [tag]         tag defaults to `look`
//
// ── RETRACTION, 2026-08-28: THIS PROBE MEASURED THE GUARD, NOT THE DEFECT ──
//
// Everything below the line was written against `zeros >= 2`, where
//
//     const zeros = (r === 0) + (g === 0) + (b === 0);
//
// counts channels at EXACTLY zero. That predicate is the same shape as the
// remedy it was written to police. `gamutGuard` (prototype3d.ts:276) exists to
// take a channel the ACES output matrix drove negative and put a small POSITIVE
// number in it. Its asymptote is 0.15·l·m/(l+1.15·m), which for a saturated red
// at play exposure arrives at the display as 1/255 — the toe squares it and the
// chroma push drives it negative a second time. So the guard's success and the
// defect's survival look identical to `=== 0`, and the probe went green the day
// the guard landed while the defect it was written for was untouched.
//
// MEASURED, 2026-08-28, source 23edb49627155522:
//
//     this probe, as written        PASS, exit 0, every world
//                                   gameday MONOCHANNEL 0.23% against a 1.0% bar
//     the same frame                22.5% of red-dominant chromatic pixels carry
//                                   green at EXACTLY 1 and 8.7% at 0 (51.0% and
//                                   15.7% on the canonical pack — the SHARE is
//                                   frame-dependent, the pile-up on one code is
//                                   not), with red at 158-202
//     the reddest 300x300 window    44,019 red pixels; green takes TWO distinct
//                                   values out of 256
//
// And on three Game Day builds rendered through the real compiled shader — the
// old per-channel toe clip with no guard (the 2026-08-24 "before"), the soft toe
// with no guard (the "after"), and today:
//
//     this probe          15.88%  ->   6.47%  ->  0.00%   reads as "fixed"
//     the census below    36.74%  ->  27.36%  ->  33.99%  reads as "unfixed"
//
// The toe was a real fix. The guard moved this probe 6.47 points to zero and
// moved the defect by nothing the measurement can resolve — without the guard a
// negative channel is clamped to code 0, with it the channel arrives at code 1,
// and both are constants.
//
// This is the tenth retraction in docs/GOVERNOR.md happening a second time
// ("no pure black is not no holes"), inside the instrument written for that
// exact class of finding. The lesson generalises and belongs in the standing
// rules: **a probe whose predicate is `== 0` cannot measure a remedy whose
// mechanism is `make it non-zero`.** Ask what the fix DOES before you write the
// test for it.
//
// The dead-channel column below (`zeros >= 1`) was reported unbarred and is
// retracted with the bar it sat beside: it is the same quantity one step earlier
// and it moves for the same wrong reason — Lantern went 65.6% -> 1.8% on the toe
// change and was recorded in the ledger as fixed, when what had happened is that
// its TIMBER moved from (33,0,0) to (39,12,0), a green the world's own light
// moves by 1.06 codes.
//
// ── WHAT REPLACES IT ──────────────────────────────────────────────────────
//
// A channel carries information about a surface only if the light falling on
// that surface can move it by at least one 8-bit code. Below that level it is a
// CONSTANT — dead — whatever number is in it, zero or one or four. That is the
// whole test, and it is why "is it zero" was the wrong question.
//
// Two floors are derived, and a channel must be under BOTH to be condemned:
//
//   THE INFORMATION FLOOR   1 / rho, where rho is this world's own median
//     relative shading depth, measured from the frame itself on the DOMINANT
//     channel (which is alive by construction) over edge-free single-material
//     patches of 8 css px. A channel at level v is moved by rho·v codes by the
//     same light; if rho·v < 1 the 8-bit grid cannot represent the ramp and the
//     channel is flat by arithmetic. Measured on today's pack: rho 0.023
//     (powder) to 0.089 (lantern), so the floor runs 12 to 44 codes.
//
//   THE PALETTE FLOOR       enc( lin(D) · QMIN ), where D is the pixel's
//     dominant channel and QMIN is the smallest linear min/max channel ratio
//     among the colour constants the world modules author. Today QMIN = 0.01533
//     (alpine.ts ORANGE_D, rgb(180,92,20)). This is where the most saturated
//     colour this game contains would land under a hue-preserving pipeline.
//     Nothing in the art asks for less; anything below it was put there by the
//     grade. It is parsed from source every run, so it moves with the palette
//     and cannot rot into a snapshot.
//
// The two agree to within a few codes over the mid-tones, by two independent
// routes — one from quantisation, one from the art — which is the reason to
// trust either.
//
// LIT is 128/255 on the dominant channel: at or above half the display's code
// range the surface is taking key light and "it is dark" is not an available
// explanation. The frame is sampled at EVERY illumination level above that,
// because CRIM's green is non-monotonic in light (it recovers above R≈205) and
// an instrument that samples one k lands on one side of the V and reports the
// other side's answer — the fault that blinded qa/formsep.mjs.
//
// THE BAR is 1.5% of lit chromatic pixels carrying a dead channel. Derivation:
// a build with the defect provably absent (the two per-channel crushers
// neutralised — chroma push 1.07 -> 1.00 and toe 0.014 -> 0.0002, patched into
// the real bundle and rendered) measures 0.12% on Game Day; the two worlds
// whose palettes do not push ACES out of gamut measure 0.00-0.70% across two
// shoots; the lowest failing world measures 4.00%. Every bar between 0.8% and
// 3.9% returns the same five verdicts on today's pack, so the number is not
// load-bearing — it is placed in an empty band, with margin for the shoot-to-
// shoot variance measured at 29.3-41.0% on Game Day and 0.00-0.70% on Lantern.
//
// KNOWN LIMITS, written here rather than tuned around:
//   * The Lantern verdict is sensitive to LIT. At 128 it reads 0.00%; at 96 it
//     reads 6.67%. Lantern's crushed surfaces sit in a narrow 96-128 band. The
//     probe prints the LIT-96 figure unbarred so the number is not lost, and
//     Lantern's mid-band is an open lead, not a claim.
//   * QMIN is set by the SINGLE most saturated constant in the world modules,
//     so authoring one colour more saturated than ORANGE_D lowers the floor for
//     every surface in the game. The probe names the constant that set it on
//     every run; if that name changes, the bar changed with it.
//   * It reads the canonical pack. qa/packfresh.mjs owns the staleness gate;
//     this probe prints the stamp for the record and does not duplicate it.
import { readFileSync, readdirSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';
import { PNG } from 'pngjs';

const WORLDS = ['maple', 'pirate', 'gameday', 'lantern', 'powder'];
const TAG    = process.argv[2] || 'look';
const BAR    = 1.5;    // % of lit chromatic pixels with a channel that cannot carry the light
const LIT    = 128;    // dominant channel: half the display's code range
const SHADOW = 96;     // the second, unbarred sample — see KNOWN LIMITS
const CHROMA = 0.30;   // (max-min)/max — inherited unchanged from the retracted version
const CSS    = 8;      // patch edge in CSS px, against the 430-wide reference viewport
const STEP   = 8;      // max adjacent step in the dominant channel: an edge, not a ramp

const lin = (s) => { const v = s / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const enc = (v) => Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));

// ── QMIN, PARSED FROM THE REAL PALETTE ────────────────────────────────────
// Rule 4: read the thing itself, and THROW if the call site has moved. A probe
// that silently finds nothing and reports a floor of zero is the snapshot bug
// wearing a hat.
// the five world modules, plus the shared prop/people/island colour sources
const PAL_FILES = ['mainstreet', 'bay', 'tailgate', 'nightmarket', 'alpine',
  'island', 'life', 'palette'].map((b) => `src/proto3d/${b}.ts`);
let QMIN = 1, QWHO = '', NCOL = 0;
for (const f of PAL_FILES) {
  const t = readFileSync(f, 'utf8');           // throws if a module was renamed
  for (const m of t.matchAll(/\b([A-Z][A-Z0-9_]{1,20})\s*=\s*0x([0-9a-fA-F]{6})\b/g)) {
    const v = parseInt(m[2], 16), r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 24) continue;                     // a near-black constant carries no hue by intent
    NCOL++;
    const q = lin(mn) / lin(mx);
    if (q < QMIN) { QMIN = q; QWHO = `${f.split('/').pop()} ${m[1]} rgb(${r},${g},${b})`; }
  }
}
if (NCOL < 100) throw new Error(`gamutzero: found only ${NCOL} palette constants — the world modules moved; fix the probe, do not skip`);

const srcDigest = () => {
  const h = createHash('sha256');
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      const q = join(d, e.name);
      if (e.isDirectory()) { walk(q); continue; }
      if (!/\.(ts|tsx)$/.test(e.name)) continue;
      h.update(e.name); h.update(readFileSync(q));
    }
  };
  walk('src');
  return h.digest('hex').slice(0, 16);
};

// this world's own shading depth, from the dominant channel of edge-free,
// single-material patches. The dominant channel is alive by construction, so it
// is the honest witness for how hard the light works on a surface here.
function shadingDepth(png) {
  const { width: W, height: H, data: d } = png;
  const S = Math.max(1, Math.round(W / 430)), P = CSS * S;
  const rho = [];
  for (let py = 0; py + P <= H; py += P) for (let px = 0; px + P <= W; px += P) {
    let ok = true, dom = -1; const a = [];
    for (let y = 0; y < P && ok; y++) for (let x = 0; x < P; x++) {
      const i = ((py + y) * W + (px + x)) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, g, b), c = r === mx ? 0 : (g === mx ? 1 : 2);
      if (dom < 0) dom = c; else if (c !== dom) { ok = false; break; }
      a.push([r, g, b][dom]);
    }
    if (!ok) continue;
    const s = a.slice().sort((x, y) => x - y), med = s[s.length >> 1];
    if (med < 24) continue;
    let step = 0;
    for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
      const k = y * P + x;
      if (x + 1 < P) step = Math.max(step, Math.abs(a[k] - a[k + 1]));
      if (y + 1 < P) step = Math.max(step, Math.abs(a[k] - a[k + P]));
    }
    if (step > STEP) continue;
    rho.push((s[s.length - 1] - s[0]) / med);
  }
  if (rho.length < 200) throw new Error(`gamutzero: only ${rho.length} usable patches — this is not a game frame`);
  rho.sort((a, b) => a - b);
  return rho[rho.length >> 1];
}

function census(png, infoFloor, litGate) {
  const d = png.data;
  let n = 0, dead = 0; const byChan = [0, 0, 0]; const cols = new Map();
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < litGate || (mx - mn) / mx < CHROMA) continue;
    n++;
    const floor = Math.min(infoFloor, enc(lin(mx) * QMIN));
    let bad = false;
    for (let c = 0; c < 3; c++) {
      const v = [r, g, b][c];
      if (v !== mx && v < floor) { bad = true; byChan[c]++; }
    }
    if (bad) { dead++; const k = `${r},${g},${b}`; cols.set(k, (cols.get(k) || 0) + 1); }
  }
  return { n, dead, byChan, cols };
}

console.log('');
console.log(`  palette floor QMIN ${QMIN.toFixed(5)} — set by ${QWHO}, of ${NCOL} constants`);
console.log(`  source ${srcDigest()}`);
console.log('');
let fail = 0;
for (const w of WORLDS) {
  const path = `qa/out/shippedlook/${w}_${TAG}.png`;
  let png;
  try { png = PNG.sync.read(readFileSync(path)); }
  catch { console.log(`  ${w.padEnd(9)} NO FRAME — run qa/shippedlook.mjs first`); fail++; continue; }
  let stamp = '(unstamped)';
  try { stamp = readFileSync(path.replace(/\.png$/, '.src'), 'utf8').trim().split(' ')[0]; } catch { }
  const rho = shadingDepth(png);
  const infoFloor = Math.ceil(1 / rho);
  const hot = census(png, infoFloor, LIT);
  const dim = census(png, infoFloor, SHADOW);
  const pct = 100 * hot.dead / Math.max(1, hot.n);
  const bad = pct > BAR;
  if (bad) fail++;
  const top = [...hot.cols.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, v]) => `rgb(${k})x${v}`).join(' ');
  console.log(`  ${w.padEnd(9)} rho ${rho.toFixed(4)}  floors info ${String(infoFloor).padStart(2)} / palette ${String(enc(lin(180) * QMIN)).padStart(2)}@180   `
    + `lit-chromatic ${String(hot.n).padStart(7)}   DEAD ${pct.toFixed(2).padStart(6)}%  ${bad ? 'FAIL' : 'ok'}`);
  console.log(`            by channel R/G/B ${hot.byChan.join('/')}   at LIT ${SHADOW} (unbarred) ${(100 * dim.dead / Math.max(1, dim.n)).toFixed(2)}%   stamp ${stamp}`);
  if (top) console.log(`            crushed most: ${top}`);
}
console.log('');
if (fail) {
  console.log(`FAIL — ${fail} world(s) above ${BAR}% of lit chromatic pixels carrying a channel`);
  console.log(`       the light cannot move by one code. Those channels are constants,`);
  console.log(`       and a constant channel cannot carry a cool shadow or a warm highlight.`);
  process.exit(1);
}
console.log(`PASS — every world's colour channels can carry the light that falls on them (bar ${BAR}%).`);
```

---

## 8. LIMITS, WRITTEN HERE RATHER THAN TUNED AROUND

1. **The Lantern verdict is sensitive to the LIT gate.** At 128 Lantern reads
   0.00% with zero dead pixels; at 96 it reads 6.67%. Its crushed surfaces sit
   in a narrow 96–128 band. The probe prints the LIT-96 figure unbarred on every
   run so the number is not lost. **Lantern's mid-band is an open lead and this
   proposal makes no claim about it.** I chose 128 before measuring Lantern, and
   I am recording that the choice is load-bearing there and nowhere else
   (Game Day 29.32 → 30.22, Maple 11.27 → 12.65, Pirate 6.53 → 8.08, Powder
   0.31 → 0.57 between the two gates).
2. **QMIN is set by a single constant.** Authoring one colour more saturated
   than `ORANGE_D` lowers the floor for every surface in the game. The probe
   prints the constant that set it on every run; if that name changes, the bar
   changed with it, and the change is visible in the output rather than hidden.
   Using a low percentile instead of the minimum would be far more aggressive
   (the 5th percentile of the same ratio is 0.171, eleven times higher) and I
   took the conservative end deliberately.
3. **The floor is a statement about the ART, not about the pipeline**, which is
   the property that makes it un-gameable from the shader side: no change to the
   tone map can move QMIN. It is also why a build that "fixes" the metric by
   desaturating the palette raises the bar on itself.
4. **It measures a photograph, so it inherits the shoot's variance.** Game Day
   ranged 29.3–41.0% and Lantern 0.00–0.70% across two shoots of the same
   source. The bar has margin for that; a ratchet on this number would not be
   safe without pinning the composition.
5. **It does not gate on frame staleness.** `qa/packfresh.mjs` owns that and is
   already in the `art` profile; this probe prints the stamp for the record.
   **Note for whoever runs the gate next: the canonical pack is stale right
   now** — stamped `20d3f756b27be10d`, source is `23edb49627155522` — so every
   `_look` number in this file describes a build from 08:36 today, and the
   `_gz3` numbers are the current one.
6. **`bay.ts` and `palette.ts` contribute nothing to QMIN.** Pirate Bay declares
   no `NAME = 0xrrggbb` constants at all — its surfaces borrow from `island.ts`,
   `life.ts` and `luxe.ts` — and `palette.ts` uses object-property form. So the
   floor Pirate is judged against is set by Powder's `ORANGE_D`. If Pirate
   authors a colour more saturated than that somewhere the scan cannot see, the
   floor is too high for it and its 6.53% is overstated. The per-albedo table in
   §5 is the check that matters: Pirate's dominant crushed surface renders its
   red at 5 where its own albedo puts it at 37, so the finding does not rest on
   QMIN. **Widening that scan correctly is the first thing to do to this probe
   if it lands.**
7. **A channel pinned high.** The test condemns a channel the light cannot move
   by one code. A hypothetical build that pinned a weak channel at a *fixed*
   multiple of luminance large enough to ramp would pass, even though its hue
   would be a luminance echo. That case does not exist on this build — the
   guard's multiple lands at codes 0–2 after the toe — and catching it would
   need a cross-surface hue test rather than a per-surface one. Stated so the
   next reader does not assume coverage the probe does not have.

---

## 9. WHAT I DID NOT DO

- Did not edit a tracked file. `docs/crews/round-3/gamutzero-repair.proposal.md`
  is the only file this crew wrote; the five `_gz3` frames and their stamps are
  untracked build artefacts under `qa/out/`.
- Did not touch the preview on :4177, did not start another server. Every
  alternate build was served by route interception into the same preview.
- Did not re-propose the guard knee, a rig change, an exposure change, or a hex.
  All four are refuted or owner-owned and `gameday-red.verdict.md` holds them.
- Did not change `CHROMA` or the frame source, so the retracted probe and the
  repaired one judge the same pixel population.

## 10. THE RECORD

Everything under
`/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/`.

| script | what it did |
|---|---|
| `gamutzero.repaired.mjs` | the probe in §7, verbatim |
| `old.mjs` | the retracted predicate, re-implemented so it can be pointed at any frame |
| `hist.mjs` | the red-dominant green histograms in §0 |
| `patch.mjs` … `patch4.mjs`, `rho.mjs` | four rejected designs and the ρ measurement that killed three of them (see below) |
| `v5.mjs` | the per-pixel census, `MODE=info\|palette\|both`, used for the floor comparison |
| `where.mjs`, `crop.mjs`, `cropred.mjs` | spatial maps, the crushed-window crops, the distinct-level table |
| `altbuild.mjs` | route-interception shooter: patches the compiled bundle, asserts each site matches exactly once, runs the shippedlook procedure |
| `expsweep.mjs` | the frozen-frame exposure sweep |
| `palette.mjs` | the first, wider palette census (189 constants incl. `hatgeo`) that led to QMIN and to the decision to exclude emissives and hats |

Frames: `exp/gameday_{ctrl,noguard,oldtoe_noguard,push100,push100_notoe,k1p12,
k1p5,k1p8,k2p2,k2p8}.png` and `qa/out/shippedlook/*_gz3.png` (committed nowhere;
`_gz3` are untracked build artefacts beside the canonical pack, which they do
not overwrite).

**Three designs I tried and abandoned, recorded so nobody re-derives them:**

1. *Per-patch variation* — count patches where a non-dominant channel takes one
   8-bit level while the dominant takes several. Fails for a structural reason
   worth remembering: **the defect makes the surface flat in every channel**, so
   any gate that requires the surface to demonstrably shade excludes exactly the
   patches that carry the defect. Measured: Game Day 2.1% against Maple 3.3% —
   the wrong way round.
2. *Palette-derived admissibility* (judge a patch only if the most saturated
   authored colour would resolve on it) — same failure, harder: Game Day dropped
   from 13.95% to 0.65% because the crimson faces do not shade enough in red to
   be admitted.
3. *Information floor alone*, without the palette clause — flags Powder at 4.22%
   on honest pastels, because Powder's snow gives ρ = 0.023 and a floor of 44
   codes. The conjunction fixes it (0.31%) and that is why the probe uses both.
