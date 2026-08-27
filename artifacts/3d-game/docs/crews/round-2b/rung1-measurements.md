# RUNG 1 — measured. Exposure `1.0` → `LIGHT.exposure`.

Measurement pass on the five shipped-look frames against the three pre-rung
frames. Full-frame statistics, no cropping, no segmentation.

Frames measured, all 860×1864 (1,603,040 px):

| frame | path | build |
|---|---|---|
| lantern before | `scratchpad/lantern_before.png` (from git, pre-rung) | — |
| lantern after | `qa/out/shippedlook/lantern_look.png` | `20d3f756b27be10d` |
| gameday before | `scratchpad/gameday_before.png` (from git, pre-rung) | — |
| gameday after | `qa/out/shippedlook/gameday_look.png` | `20d3f756b27be10d` |
| powder before | `scratchpad/powder_before.png` (from git, pre-rung) | — |
| powder after | `qa/out/shippedlook/powder_look.png` | `20d3f756b27be10d` |
| maple control | `qa/out/shippedlook/maple_look.png` | `20d3f756b27be10d` |
| pirate control | `qa/out/shippedlook/pirate_look.png` | `20d3f756b27be10d` |

All five after-frames carry the same source hash, so the after-set is
internally consistent — one build, five worlds.

Rig values confirmed read from `src/prototype3d.ts`: maple 1.0 (:710),
pirate 1.0 (:713), gameday 1.12 (:728), lantern 1.42 (:763), powder 1.18
(:774); `RIG.exposure = LIGHT.exposure` (:826) reaching
`renderer.toneMappingExposure` (:887).

Luminance is `0.2126R + 0.7152G + 0.0722B` on **sRGB-encoded** values 0-255 as
specified — display luma, not linearized. Saturation is HSV S = `(max-min)/max`.

---

## THE CONFOUND, and exactly how far it reaches

Before and after were shot in **separate matches at different void positions
with different props in frame**. Every difference below is exposure PLUS
location. I mark each observation:

- **[CP] confound-proof** — a whole-frame tonal statistic, or a ratio whose
  denominator moves with the composition, so composition largely divides out.
- **[CL] confound-limited** — depends on which props are in frame; the number
  is real but I cannot attribute it to exposure.

I could not eliminate the confound. I looked for a same-build second sample of
one world (which would have given a direct location-noise measurement):
`powder_snowyaw.png` is powder shot at a different position, but its `.src`
hash is `8a47536de02f2cf4`, a **different build** from the `_look` set, so it
is confounded by code changes as well as location and I did not use it. No
clean same-build, same-world, different-location pair exists on disk.

---

## 1-6. Full-frame statistics

### Luminance, percentiles

| frame | mean | median | p05 | p25 | p75 | p95 |
|---|---|---|---|---|---|---|
| lantern before | 67.56 | 57 | 22 | 37 | 96 | 134 |
| **lantern after** | **87.78** | **77** | **38** | **55** | **119** | **157** |
| gameday before | 72.52 | 62 | 11 | 49 | 92 | 166 |
| **gameday after** | **81.28** | **71** | **14** | **51** | **103** | **197** |
| powder before | 120.22 | 121 | 41 | 107 | 151 | 168 |
| **powder after** | **133.41** | **137** | **60** | **120** | **163** | **172** |
| maple control | 125.18 | 145 | 27 | 81 | 164 | 185 |
| pirate control | 134.42 | 151 | 21 | 88 | 185 | 195 |

Deltas:

| | lantern (×1.42) | gameday (×1.12) | powder (×1.18) |
|---|---|---|---|
| mean | 67.56 → 87.78 (**+29.9%**) | 72.52 → 81.28 (**+12.1%**) | 120.22 → 133.41 (**+11.0%**) |
| median | 57 → 77 (+35.1%) | 62 → 71 (+14.5%) | 121 → 137 (+13.2%) |
| p05 | 22 → 38 (+72.7%) | 11 → 14 (+27.3%) | 41 → 60 (+46.3%) |
| p25 | 37 → 55 (+48.6%) | 49 → 51 (+4.1%) | 107 → 120 (+12.1%) |
| p75 | 96 → 119 (+24.0%) | 92 → 103 (+12.0%) | 151 → 163 (+7.9%) |
| p95 | 134 → 157 (+17.2%) | 166 → 197 (+18.7%) | 168 → 172 (**+2.4%**) |

Mean luminance moved **+29.9% / +12.1% / +11.0%** against pre-tonemap light
increases of **+42% / +12% / +18%**. Gameday and powder land close to or below
their linear light increase; lantern converts +42% of light into +29.9% of
frame luminance. That is ACES compressing, as predicted, and it is the first
confirmation the tone curve is actually doing work rather than the rig running
open.

### 2. Black crush

| frame | lum < 8 | lum < 2 |
|---|---|---|
| lantern before | 1.738% | 0.654% |
| lantern after | 0.590% | 0.162% |
| gameday before | 1.902% | 0.946% |
| gameday after | 1.270% | 0.695% |
| powder before | 0.567% | 0.132% |
| powder after | 0.338% | 0.036% |
| maple control | 1.080% | 0.180% |
| pirate control | 2.882% | 1.128% |

### 3. White clip — the specified test is unreachable in this renderer

**All eight frames read 0.0000% on "all three channels > 250". That is not a
pass, it is a broken instrument.** The maximum blue channel across all eight
frames is 243; the highest any channel reaches anywhere is R=255 in lantern
after, and no pixel in any frame has all three channels above 245.

| frame | ch maxima R/G/B | any ch >250 | all >250 | all >245 | all >240 | all >230 |
|---|---|---|---|---|---|---|
| lantern before | 254 / 247 / 240 | 0.0922% | 0.0000% | 0.0000% | 0.0000% | 0.3692% |
| lantern after | 255 / 250 / 243 | 0.3969% | 0.0000% | 0.0000% | 0.0199% | 0.5296% |
| gameday before | 248 / 243 / 239 | 0.0000% | 0.0000% | 0.0000% | 0.0000% | 0.3137% |
| gameday after | 253 / 244 / 241 | 0.0231% | 0.0000% | 0.0000% | 0.0000% | 0.3591% |
| powder before | 248 / 242 / 240 | 0.0000% | 0.0000% | 0.0000% | 0.0000% | 0.2883% |
| powder after | 250 / 244 / 242 | 0.0000% | 0.0000% | 0.0000% | 0.0000% | 0.2854% |
| maple control | 249 / 239 / 239 | 0.0000% | 0.0000% | 0.0000% | 0.0000% | 0.0398% |
| pirate control | 250 / 242 / 239 | 0.0000% | 0.0000% | 0.0000% | 0.0000% | 0.0978% |

Nothing in this game ever reaches neutral white. The ACES shoulder plus the
warm/cool grade keeps blue off the ceiling in every world. **Any future gate
that tests `all channels > 250` will pass forever and detect nothing.** Use
`all > 230` (which discriminates: 0.04% on maple, 0.53% on lantern after) or a
luminance threshold.

### 4. Dead-channel reds (R > 120, G < 12, B < 12)

| frame | dead px | % of frame | reddish px (R>120, R>2G) | % of frame | **dead / reddish** |
|---|---|---|---|---|---|
| lantern before | 0 | 0.000% | 25,338 | 1.581% | 0.00% |
| lantern after | 0 | 0.000% | 33,064 | 2.063% | 0.00% |
| gameday before | 130,805 | 8.160% | 163,360 | 10.191% | **80.07%** |
| gameday after | 201,306 | 12.558% | 252,981 | 15.781% | **79.57%** |
| powder before | 77 | 0.005% | 28,170 | 1.757% | 0.27% |
| powder after | 726 | 0.045% | 43,014 | 2.683% | 1.69% |
| maple control | 48,815 | 3.045% | 160,645 | 10.021% | 30.39% |
| pirate control | 0 | 0.000% | 91,026 | 5.678% | 0.00% |

### 5. Saturation (HSV S)

| frame | mean | median |
|---|---|---|
| lantern before | 0.5469 | 0.59 |
| lantern after | 0.4771 | 0.51 |
| gameday before | 0.4617 | 0.27 |
| gameday after | 0.4669 | 0.30 |
| powder before | 0.4279 | 0.44 |
| powder after | 0.3839 | 0.34 |
| maple control | 0.5198 | 0.58 |
| pirate control | 0.3645 | 0.19 |

### 6. 16-bin luminance histogram (shares; bin k covers lum [16k, 16k+16))

| bin | 0 | 16 | 32 | 48 | 64 | 80 | 96 | 112 | 128 | 144 | 160 | 176 | 192 | 208 | 224 | 240 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lantern before | 3.28 | 11.40 | **27.12** | 13.17 | 12.21 | 7.53 | 11.76 | 7.27 | 2.24 | 1.28 | 0.82 | 0.32 | 0.59 | 0.39 | 0.30 | 0.32 |
| lantern after | 0.98 | 2.84 | 11.13 | **25.09** | 10.97 | 9.37 | 10.18 | 9.17 | 12.13 | 3.35 | 1.39 | 0.81 | 0.89 | 0.79 | 0.43 | 0.48 |
| gameday before | 6.93 | 3.37 | 13.31 | **28.12** | 19.63 | 4.58 | 8.13 | 4.80 | 2.03 | 2.79 | 1.93 | 2.12 | 1.16 | 0.51 | 0.37 | 0.24 |
| gameday after | 5.47 | 2.88 | 15.40 | 14.71 | **29.64** | 4.82 | 5.59 | 5.90 | 3.09 | 3.53 | 1.44 | 1.43 | 3.89 | 1.50 | 0.38 | 0.33 |
| powder before | 1.45 | 2.27 | 2.20 | 2.48 | 4.67 | 4.35 | **22.46** | 15.29 | 12.17 | **26.43** | 2.47 | 1.33 | 1.53 | 0.41 | 0.29 | 0.22 |
| powder after | 1.00 | 1.52 | 1.26 | 1.56 | 2.63 | 3.62 | 3.58 | **28.04** | 13.22 | 13.96 | **25.52** | 2.76 | 0.34 | 0.50 | 0.25 | 0.24 |
| maple control | 2.48 | 3.97 | 5.68 | 5.64 | 5.33 | 6.51 | 5.02 | 4.59 | 9.50 | 11.35 | **26.59** | 12.08 | 0.89 | 0.17 | 0.18 | 0.01 |
| pirate control | 4.25 | 1.86 | 3.89 | 1.70 | 4.31 | 12.21 | 8.06 | 7.06 | 5.88 | 2.29 | 8.66 | **31.58** | 7.65 | 0.24 | 0.32 | 0.04 |

Powder is the clean read: it is bimodal (sky mode, snow mode) in both frames,
and **both modes translate up exactly one 16-unit bin** — sky 96-112 → 112-128,
snow 144-160 → 160-176. The sky-to-snow separation is **unchanged at ~48
luminance units**. Powder's exposure lift is a clean translation, not a
squeeze of the two subjects together. **[CP]**

---

## The controls, used honestly

**What the controls cannot do.** There are no before-frames for maple or
pirate, and no same-build second sample of any world. **I cannot compute a
location-noise figure, and I am not going to invent one.** Anyone who wants
that bound needs one specific shot: N frames of a single world, one build, N
void positions. It does not exist yet. That is the gap.

**What the controls can do.** Maple and pirate are two frames whose exposure
did not move. The gap between them is pure world-and-composition. That gives a
**screening threshold**: any before→after delta smaller than the maple↔pirate
gap on the same statistic cannot be claimed as an exposure effect, because
composition alone demonstrably moves that statistic further.

This is a **loose** bound in one direction and I want that stated plainly:
maple↔pirate is a *cross-world* gap (different palettes, different art), which
is almost certainly larger than same-world *cross-location* noise. So failing
the screen means **"not established"**, never "disproved" — and passing it
means "larger than the loosest noise proxy available", which is suggestive, not
proof.

| statistic | maple↔pirate gap | lantern Δ | gameday Δ | powder Δ |
|---|---|---|---|---|
| mean lum | 9.24 | +20.22 ✅ | +8.76 ❌ | +13.19 ✅ |
| median | 6 | +20 ✅ | +9 ✅ | +16 ✅ |
| p05 | 6 | +16 ✅ | +3 ❌ | +19 ✅ |
| p25 | 7 | +18 ✅ | +2 ❌ | +13 ✅ |
| p75 | 21 | +23 ✅ | +11 ❌ | +12 ❌ |
| p95 | 10 | +23 ✅ | +31 ✅ | +4 ❌ |
| crush <8 | 1.80 pp | −1.15 ❌ | −0.63 ❌ | −0.23 ❌ |
| crush <2 | 0.95 pp | −0.49 ❌ | −0.25 ❌ | −0.10 ❌ |
| dead red %frame | 3.05 pp | 0.00 ❌ | +4.40 ✅ | +0.04 ❌ |
| sat mean | 0.155 | −0.070 ❌ | +0.005 ❌ | −0.044 ❌ |

Two conclusions from that table, and they matter more than any single number
above:

1. **Every black-crush delta fails the screen.** Pirate (unchanged exposure)
   crushes 2.882% of its frame below luminance 8; maple crushes 1.080%. That
   1.80 pp cross-frame gap is *larger than any crush improvement rung 1
   produced* (lantern −1.15, gameday −0.63, powder −0.23). **Black-crush share
   is a composition metric, not an exposure metric, at these magnitudes.** Do
   not put it in a gate and do not quote the crush improvements as the win.
   The percentile shifts are the defensible evidence; the crush shares are not.
2. **Every saturation delta fails the screen**, by a wide margin (0.155 gap vs
   ≤0.070 deltas). I note that the two worlds that lost saturation (lantern
   −12.8%, powder −10.3%) are the two with the largest exposure bumps, and the
   smallest bump gained slightly (gameday +1.1%) — a monotone ordering
   consistent with ACES desaturating as you push into the shoulder. With n=3
   that is a **hypothesis worth a controlled shot, not a finding.** **[CL]**

---

## (a) Did Game Day's dead-channel reds fall?

**No. They did not fall, and exposure structurally cannot make them fall.**

- As a share of frame they **rose**: 8.160% → 12.558% (**+4.40 pp, +54%**).
- But reddish pixels rose almost exactly in step: 10.191% → 15.781% (**+55%**).
  The after-frame simply has more fire truck in it — visually confirmed, two
  trucks and a red serving cart replace open asphalt.
- **The confound-proof number is the ratio: 80.07% → 79.57%, a fall of 0.50
  pp.** Four fifths of Game Day's red pixels have no form in them, before and
  after. Rung 1 did essentially nothing to this. **[CP]**

The 0.50 pp is not noise-free but it is the right sign and the right order: a
+12% linear multiply on a channel already encoding near zero moves sRGB 11 → 12
at best, which nudges a thin band of pixels over the G<12 line and no more.
**A channel at linear zero multiplied by 1.12 is still zero.** Exposure is the
wrong tool for this defect. What adds form to a dead red is non-red light
reaching the surface — hemisphere/fill with green and blue content — or a less
saturated red albedo. Note maple, at exposure 1.0, sits at 30.39% dead-of-
reddish with a comparable reddish share (10.02% vs gameday's 10.19%): **the
same amount of red, less than half as dead.** Game Day's red materials and
fill are the problem, not its exposure. That comparison is cross-world so it
is **[CL]**, but a 2.6× gap at matched reddish share is a strong pointer.

## (b) Did Powder blow out?

**No. The highlight tail did not move at all.** This is the cleanest result in
the set.

| | before | after | Δ |
|---|---|---|---|
| all ch > 230 | 0.2883% | 0.2854% | **−0.003 pp** |
| lum > 200 | 1.2037% | 1.1814% | −0.02 pp |
| lum > 220 | 0.5671% | 0.5720% | +0.005 pp |
| lum > 240 | 0.1681% | 0.2116% | +0.04 pp |
| p95 | 168 | 172 | +4 |
| p99 | 205 | 207 | +2 |
| max lum | 243 | 245 | +2 |

+18% of light produced **+2 luminance units at p99** and a highlight
population flat to three decimal places. ACES absorbed the entire lift in the
shoulder. Powder is not blown out. **[CP]** — these are tail statistics on a
world whose bright subject (snow) occupies a similar frame share in both shots.

**But there is a real cost, and it is the thing to watch.** The lift went
almost entirely into the midtones while the ceiling stayed put, so Powder's
headroom above its own median collapsed:

| frame | median | p95 | **p95 − median** |
|---|---|---|---|
| powder before | 121 | 168 | **47** |
| powder after | 137 | 172 | **35** (−26%) |
| lantern before → after | 57 → 77 | 134 → 157 | 77 → **80** (widened) |
| gameday before → after | 62 → 71 | 166 → 197 | 104 → **126** (widened) |
| maple control | 145 | 185 | 40 |
| pirate control | 151 | 195 | 44 |

**Powder after has less room above its median than any other frame measured,
including both controls.** It is the only world of the three that narrowed.
Within-snow separation `p95 − p75` halved, 17 → 9 — 20% of the frame now sits
inside a 9-unit band. **[CL]** on the p95−p75 figure specifically: the
after-frame's snow field is a cleaner sheet with fewer scattered snow lumps
and less cast shadow, and that composition change pushes the same direction.
But the median-to-p95 collapse is corroborated by the tail data above, which
is confound-resistant, so I read the direction as real even if the magnitude
is inflated.

**Powder is at its ceiling. 1.18 is the last exposure value that buys anything
in this world.** Do not raise it on a later rung; it will only flatten snow.

## (c) Did Lantern's shadows survive?

**They held. This is not a grey wash.** The single fact that settles it:

| | before | after |
|---|---|---|
| p05 | 22 | 38 |
| p95 | 134 | 157 |
| **p95 − p05 (tonal range)** | **112** | **119** |

**The darks lifted 16 units and the range got WIDER, not narrower.** A grey
wash is the bottom rising into a compressed middle — range shrinks. Lantern's
range expanded by 7 units while p05 rose 73%. The bottom of the frame moved up
and the top moved up further. **[CP]** — whole-frame percentile spread is
exactly the statistic the confound treats most kindly.

Supporting: the histogram translated cleanly rather than piling up. The mode
moved one bin (32-48 → 48-64) and the near-black floor thinned (bin 0-16:
3.28% → 0.98%) without the distribution collapsing — bin 128-144 went 2.24% →
12.13%, so pixels reached the upper midtones rather than bunching. Lantern
after still holds 0.162% below luminance 2, so there is still true black in
the frame (the void's face, the dark props). **[CP]**

**It is still night.** Lantern after sits at median 77 against maple 145 and
pirate 151 — **roughly half the brightness of the daylight worlds.** The night
identity is not lost. On the phone-in-daylight test that actually matters for
a store screenshot, p05 = 22 was below what a child sees outdoors at moderate
screen brightness; p05 = 38 is a readable shadow.

**The caveat I will not skip:** p25 moved 37 → 55, and 55/255 is a fairly open
shadow for a night scene. Combined with the −12.8% saturation reading (which
fails the control screen and so is unproven), the risk at 1.42 is not crushed
blacks — it is *night reading as dusk*. The measurements say the tone is
healthy; whether it still reads as night is an art-direction call on the
photographs, which is exactly where the crew said it belongs.

---

## The finding I did not go looking for: Lantern's +42% was justified by a stale measurement

`src/prototype3d.ts:757-759` records the evidence for the lantern lift:

> MEASURED (qa/out/shippedlook + the luminance histogram): the owner's "so
> dark, not crisp" was 26% of the frame under 25/255 — a quarter of the
> screen crushed to black, villagers as silhouettes — vs 3-6% on Powder.

I reproduced that statistic. **It does not describe the frame rung 1 moved.**

| frame | share under lum 25 |
|---|---|
| **lantern_before (pre-rung, the actual before)** | **5.73%** |
| lantern_aaa1 (Aug 23) | 28.21% |
| lantern_dark1 (Aug 23) | 31.23% |
| lantern_dark2 (Aug 23) | 27.30% |
| lantern_dark3 (Aug 23) | 23.01% |
| powder_pw1 / pw2 / pw4-dense / ref1 (Aug 23) | 5.48 / 3.63 / 7.29 / 3.39% |
| lantern after | 2.13% |
| maple control | 4.36% |
| pirate control | 5.50% |

Both halves of the comment reconcile against the **Aug 23** frame set —
Lantern 23-31% ("26%") and Powder 3.4-7.3% ("3-6%"). The comment is an accurate
measurement of a build that no longer exists.

By the time rung 1 landed, **Lantern's pre-rung frame was at 5.73% under
25/255 — in line with maple (4.36%), pirate (5.50%) and Powder's own Aug-23
numbers.** Something between Aug 23 and the pre-rung shot already removed ~80%
of Lantern's black crush (mean luminance 59.8 → 67.6). The "quarter of the
screen crushed to black" had already been fixed by other work.

This does not prove 1.42 is wrong. It removes its stated evidentiary basis.
The +42% — the largest exposure move in the repo's history, authored blind,
never photographed, with its own comment disagreeing with its value (1.34 vs
1.42) — was carried by a number describing a problem that was already solved.
Given the crew's stated corrective is **the table value, not the rig**, this
is the fact that should sit in front of that decision.

---

## What I would change

1. **Fix the white-clip gate before it ships.** `all channels > 250` returns
   0.0000% on all eight frames and cannot ever fire — max blue anywhere is
   243. Move it to `all > 230` or a luminance threshold. A gate that always
   passes is worse than no gate.
2. **Do not quote the black-crush improvements as the rung-1 win.** All three
   are smaller than the gap between two unchanged-exposure control frames.
   Quote the percentile shifts instead; those clear the screen.
3. **Lantern: re-derive 1.42 against the pre-rung frame, not the Aug-23 one.**
   The crush it was sized to fix was 5.73%, not 26%. A value in the
   1.20-1.30 band is what the *current* frame's numbers argue for, and 1.34 —
   the figure its own comment carries — is inside that band. The photographs
   decide; but the arithmetic no longer supports 1.42.
4. **Powder: freeze at 1.18.** Median-to-p95 headroom is 35, the lowest of any
   frame measured including both controls. Further exposure buys midtone and
   spends snow form.
5. **Game Day's reds need a lighting fix, not an exposure fix.** 79.6% of red
   pixels are dead-channel at 1.12, essentially unchanged from 80.1% at 1.0.
   Maple carries the same reddish share (10.0%) at 30.4% dead. Raise green and
   blue content in Game Day's hemisphere/fill, or desaturate the red albedos.
   Exposure will never reach this.
6. **Shoot the location-noise control.** One world, one build, 5-8 void
   positions. Every "is this exposure or is this where the void stood" question
   in this report — and every future one — stays unanswerable until that
   exists. It is the cheapest high-value shot on the list.

---

## Appendix A — script

Throwaway, run from `/home/user/voidling/artifacts/3d-game`, written to
scratchpad only (not the repo, not `qa/`):
`/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/measure_rung1.mjs`

```js
// THROWAWAY measurement script — round-2b rung 1 (exposure: 1.0 -> LIGHT.exposure)
// Reads PNG frames, reports full-frame tonal statistics. Read-only.
import { readFileSync } from 'node:fs';
// ESM resolves relative to this file; pngjs is installed under scratchpad/pwdeps.
import { PNG } from '/tmp/.../scratchpad/pwdeps/node_modules/pngjs/lib/png.js';

const BEFORE = '/tmp/.../scratchpad';
const AFTER = '/home/user/voidling/artifacts/3d-game/qa/out/shippedlook';

const FRAMES = [
  ['lantern before', `${BEFORE}/lantern_before.png`],
  ['lantern after ', `${AFTER}/lantern_look.png`],
  ['gameday before', `${BEFORE}/gameday_before.png`],
  ['gameday after ', `${AFTER}/gameday_look.png`],
  ['powder  before', `${BEFORE}/powder_before.png`],
  ['powder  after ', `${AFTER}/powder_look.png`],
  ['maple   ctrl  ', `${AFTER}/maple_look.png`],
  ['pirate  ctrl  ', `${AFTER}/pirate_look.png`],
];

function pct(sortedCounts, total, p) {
  // sortedCounts is a 0..255 histogram of integer-rounded luminance
  const target = p * total;
  let acc = 0;
  for (let v = 0; v < sortedCounts.length; v++) {
    acc += sortedCounts[v];
    if (acc >= target) return v;
  }
  return 255;
}

function measure(path) {
  const png = PNG.sync.read(readFileSync(path));
  const { width, height, data } = png;
  const n = width * height;

  const lumHist = new Float64Array(256);   // rounded luminance histogram
  const satHist = new Float64Array(101);   // HSV S in percent, for median
  let lumSum = 0, satSum = 0;
  let crush8 = 0, crush2 = 0, clip250 = 0;
  let deadRed = 0, reddish = 0;

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const R = data[o], G = data[o + 1], B = data[o + 2];
    const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    lumSum += L;
    lumHist[Math.min(255, Math.round(L))]++;
    if (L < 8) crush8++;
    if (L < 2) crush2++;
    if (R > 250 && G > 250 && B > 250) clip250++;
    if (R > 120 && G < 12 && B < 12) deadRed++;
    if (R > 120 && R > 2 * G) reddish++;
    const mx = R > G ? (R > B ? R : B) : (G > B ? G : B);
    const mn = R < G ? (R < B ? R : B) : (G < B ? G : B);
    const S = mx === 0 ? 0 : (mx - mn) / mx;
    satSum += S;
    satHist[Math.round(S * 100)]++;
  }

  // 16-bin luminance histogram (bins of 16 luminance units)
  const bins16 = new Array(16).fill(0);
  for (let v = 0; v < 256; v++) bins16[Math.min(15, v >> 4)] += lumHist[v];

  return {
    width, height, n,
    lumMean: lumSum / n,
    lumMedian: pct(lumHist, n, 0.50),
    p05: pct(lumHist, n, 0.05), p25: pct(lumHist, n, 0.25),
    p75: pct(lumHist, n, 0.75), p95: pct(lumHist, n, 0.95),
    crush8: crush8 / n, crush2: crush2 / n, clip250: clip250 / n,
    deadRedAll: deadRed / n, deadRedCount: deadRed,
    reddishCount: reddish, reddishShare: reddish / n,
    deadRedOfReddish: reddish ? deadRed / reddish : 0,
    satMean: satSum / n, satMedian: pct(satHist, n, 0.50) / 100,
    bins16: bins16.map(c => c / n),
  };
}
// ... printing + delta() reporting omitted for length; raw output below.
```

Pass 2 (`measure_rung1b.mjs`) recomputes channel maxima and the near-clip
ladder (`any >250`, `all >250/245/240/230`, `lum >180/200/220/240`, p90/p99/
p99.9/max). Pass 3 (`measure_rung1c.mjs` / `1d`) computes share under
luminance 25 across the pre-rung, post-rung and Aug-23 frame sets to reconcile
the source comment.

## Appendix B — raw output, pass 1

```
=== lantern before  (860x1864, 1603040 px)
  luminance   mean 67.56   median 57
  percentiles p05 22   p25 37   p75 96   p95 134
  black crush <8 1.738%   <2 0.654%
  white clip  all ch >250 0.000%
  dead reds   R>120,G<12,B<12: 0 px = 0.000% of frame
  reddish     R>120 & R>2G  : 25338 px = 1.581% of frame
  dead/reddish              : 0.000%
  saturation  mean 0.5469   median 0.59
  16-bin lum histogram (shares, bin k = lum [k*16, k*16+16)):
    0:3.28%   16:11.40%  32:27.12%  48:13.17%  64:12.21%  80:7.53%  96:11.76%  112:7.27%  128:2.24%  144:1.28%  160:0.82%  176:0.32%  192:0.59%  208:0.39%  224:0.30%  240:0.32%

=== lantern after  (860x1864, 1603040 px)
  luminance   mean 87.78   median 77
  percentiles p05 38   p25 55   p75 119   p95 157
  black crush <8 0.590%   <2 0.162%
  white clip  all ch >250 0.000%
  dead reds   R>120,G<12,B<12: 0 px = 0.000% of frame
  reddish     R>120 & R>2G  : 33064 px = 2.063% of frame
  dead/reddish              : 0.000%
  saturation  mean 0.4771   median 0.51
  16-bin lum histogram (shares, bin k = lum [k*16, k*16+16)):
    0:0.98%   16:2.84%   32:11.13%  48:25.09%  64:10.97%  80:9.37%  96:10.18%  112:9.17%  128:12.13%  144:3.35%  160:1.39%  176:0.81%  192:0.89%  208:0.79%  224:0.43%  240:0.48%

=== gameday before  (860x1864, 1603040 px)
  luminance   mean 72.52   median 62
  percentiles p05 11   p25 49   p75 92   p95 166
  black crush <8 1.902%   <2 0.946%
  white clip  all ch >250 0.000%
  dead reds   R>120,G<12,B<12: 130805 px = 8.160% of frame
  reddish     R>120 & R>2G  : 163360 px = 10.191% of frame
  dead/reddish              : 80.072%
  saturation  mean 0.4617   median 0.27
  16-bin lum histogram (shares, bin k = lum [k*16, k*16+16)):
    0:6.93%   16:3.37%   32:13.31%  48:28.12%  64:19.63%  80:4.58%  96:8.13%  112:4.80%  128:2.03%  144:2.79%  160:1.93%  176:2.12%  192:1.16%  208:0.51%  224:0.37%  240:0.24%

=== gameday after  (860x1864, 1603040 px)
  luminance   mean 81.28   median 71
  percentiles p05 14   p25 51   p75 103   p95 197
  black crush <8 1.270%   <2 0.695%
  white clip  all ch >250 0.000%
  dead reds   R>120,G<12,B<12: 201306 px = 12.558% of frame
  reddish     R>120 & R>2G  : 252981 px = 15.781% of frame
  dead/reddish              : 79.574%
  saturation  mean 0.4669   median 0.30
  16-bin lum histogram (shares, bin k = lum [k*16, k*16+16)):
    0:5.47%   16:2.88%   32:15.40%  48:14.71%  64:29.64%  80:4.82%  96:5.59%  112:5.90%  128:3.09%  144:3.53%  160:1.44%  176:1.43%  192:3.89%  208:1.50%  224:0.38%  240:0.33%

=== powder  before  (860x1864, 1603040 px)
  luminance   mean 120.22   median 121
  percentiles p05 41   p25 107   p75 151   p95 168
  black crush <8 0.567%   <2 0.132%
  white clip  all ch >250 0.000%
  dead reds   R>120,G<12,B<12: 77 px = 0.005% of frame
  reddish     R>120 & R>2G  : 28170 px = 1.757% of frame
  dead/reddish              : 0.273%
  saturation  mean 0.4279   median 0.44
  16-bin lum histogram (shares, bin k = lum [k*16, k*16+16)):
    0:1.45%   16:2.27%   32:2.20%   48:2.48%   64:4.67%   80:4.35%   96:22.46%  112:15.29%  128:12.17%  144:26.43%  160:2.47%  176:1.33%  192:1.53%  208:0.41%  224:0.29%  240:0.22%

=== powder  after  (860x1864, 1603040 px)
  luminance   mean 133.41   median 137
  percentiles p05 60   p25 120   p75 163   p95 172
  black crush <8 0.338%   <2 0.036%
  white clip  all ch >250 0.000%
  dead reds   R>120,G<12,B<12: 726 px = 0.045% of frame
  reddish     R>120 & R>2G  : 43014 px = 2.683% of frame
  dead/reddish              : 1.688%
  saturation  mean 0.3839   median 0.34
  16-bin lum histogram (shares, bin k = lum [k*16, k*16+16)):
    0:1.00%   16:1.52%   32:1.26%   48:1.56%   64:2.63%   80:3.62%   96:3.58%  112:28.04%  128:13.22%  144:13.96%  160:25.52%  176:2.76%  192:0.34%  208:0.50%  224:0.25%  240:0.24%

=== maple   ctrl  (860x1864, 1603040 px)
  luminance   mean 125.18   median 145
  percentiles p05 27   p25 81   p75 164   p95 185
  black crush <8 1.080%   <2 0.180%
  white clip  all ch >250 0.000%
  dead reds   R>120,G<12,B<12: 48815 px = 3.045% of frame
  reddish     R>120 & R>2G  : 160645 px = 10.021% of frame
  dead/reddish              : 30.387%
  saturation  mean 0.5198   median 0.58
  16-bin lum histogram (shares, bin k = lum [k*16, k*16+16)):
    0:2.48%   16:3.97%   32:5.68%   48:5.64%   64:5.33%   80:6.51%   96:5.02%  112:4.59%  128:9.50%  144:11.35%  160:26.59%  176:12.08%  192:0.89%  208:0.17%  224:0.18%  240:0.01%

=== pirate  ctrl  (860x1864, 1603040 px)
  luminance   mean 134.42   median 151
  percentiles p05 21   p25 88   p75 185   p95 195
  black crush <8 2.882%   <2 1.128%
  white clip  all ch >250 0.000%
  dead reds   R>120,G<12,B<12: 0 px = 0.000% of frame
  reddish     R>120 & R>2G  : 91026 px = 5.678% of frame
  dead/reddish              : 0.000%
  saturation  mean 0.3645   median 0.19
  16-bin lum histogram (shares, bin k = lum [k*16, k*16+16)):
    0:4.25%   16:1.86%   32:3.89%   48:1.70%   64:4.31%   80:12.21%  96:8.06%  112:7.06%  128:5.88%  144:2.29%  160:8.66%  176:31.58%  192:7.65%  208:0.24%  224:0.32%  240:0.04%

--- DELTA LANTERN (exposure 1.00 -> 1.42): lantern before -> lantern after
  lum mean                   67.56 ->     87.78   d=+20.22   +29.9%
  lum median                 57.00 ->     77.00   d=+20.00   +35.1%
  p05                        22.00 ->     38.00   d=+16.00   +72.7%
  p25                        37.00 ->     55.00   d=+18.00   +48.6%
  p75                        96.00 ->    119.00   d=+23.00   +24.0%
  p95                       134.00 ->    157.00   d=+23.00   +17.2%
  crush<8 %                  1.738 ->     0.590   d=-1.148   -66.1%
  crush<2 %                  0.654 ->     0.162   d=-0.492   -75.3%
  whiteclip %                0.000 ->     0.000   d=+0.000   n/a
  deadred %frame             0.000 ->     0.000   d=+0.000   n/a
  reddish %frame             1.581 ->     2.063   d=+0.482   +30.5%
  deadred/reddish %           0.00 ->      0.00   d=+0.00   n/a
  sat mean                  0.5469 ->    0.4771   d=-0.0698   -12.8%
  sat median                 0.590 ->     0.510   d=-0.080   -13.6%
  hist shift (after - before), pp per 16-bin:
    0:-2.31   16:-8.56   32:-16.00  48:+11.92  64:-1.24   80:+1.84   96:-1.58   112:+1.90  128:+9.89  144:+2.07  160:+0.57  176:+0.49  192:+0.30  208:+0.40  224:+0.14  240:+0.16

--- DELTA GAMEDAY (exposure 1.00 -> 1.12): gameday before -> gameday after
  lum mean                   72.52 ->     81.28   d=+8.76   +12.1%
  lum median                 62.00 ->     71.00   d=+9.00   +14.5%
  p05                        11.00 ->     14.00   d=+3.00   +27.3%
  p25                        49.00 ->     51.00   d=+2.00   +4.1%
  p75                        92.00 ->    103.00   d=+11.00   +12.0%
  p95                       166.00 ->    197.00   d=+31.00   +18.7%
  crush<8 %                  1.902 ->     1.270   d=-0.633   -33.3%
  crush<2 %                  0.946 ->     0.695   d=-0.251   -26.5%
  whiteclip %                0.000 ->     0.000   d=+0.000   n/a
  deadred %frame             8.160 ->    12.558   d=+4.398   +53.9%
  reddish %frame            10.191 ->    15.781   d=+5.591   +54.9%
  deadred/reddish %          80.07 ->     79.57   d=-0.50   -0.6%
  sat mean                  0.4617 ->    0.4669   d=+0.0052   +1.1%
  sat median                 0.270 ->     0.300   d=+0.030   +11.1%
  hist shift (after - before), pp per 16-bin:
    0:-1.46   16:-0.49   32:+2.10   48:-13.41  64:+10.01  80:+0.24   96:-2.54   112:+1.10  128:+1.07  144:+0.74  160:-0.49  176:-0.69  192:+2.73  208:+0.99  224:+0.00  240:+0.09

--- DELTA POWDER (exposure 1.00 -> 1.18): powder  before -> powder  after
  lum mean                  120.22 ->    133.41   d=+13.19   +11.0%
  lum median                121.00 ->    137.00   d=+16.00   +13.2%
  p05                        41.00 ->     60.00   d=+19.00   +46.3%
  p25                       107.00 ->    120.00   d=+13.00   +12.1%
  p75                       151.00 ->    163.00   d=+12.00   +7.9%
  p95                       168.00 ->    172.00   d=+4.00   +2.4%
  crush<8 %                  0.567 ->     0.338   d=-0.228   -40.3%
  crush<2 %                  0.132 ->     0.036   d=-0.096   -72.6%
  whiteclip %                0.000 ->     0.000   d=+0.000   n/a
  deadred %frame             0.005 ->     0.045   d=+0.040   +842.9%
  reddish %frame             1.757 ->     2.683   d=+0.926   +52.7%
  deadred/reddish %           0.27 ->      1.69   d=+1.41   +517.5%
  sat mean                  0.4279 ->    0.3839   d=-0.0441   -10.3%
  sat median                 0.440 ->     0.340   d=-0.100   -22.7%
  hist shift (after - before), pp per 16-bin:
    0:-0.45   16:-0.75   32:-0.94   48:-0.92   64:-2.04   80:-0.73   96:-18.88  112:+12.75  128:+1.05  144:-12.48  160:+23.05  176:+1.43  192:-1.19  208:+0.09  224:-0.03  240:+0.02

--- CONTROLS (exposure unchanged by construction; absolute values only)
  maple   ctrl: mean 125.18 median 145 p05 27 p25 81 p75 164 p95 185 crush<8 1.080% clip 0.000% deadred 3.045% sat 0.5198
  pirate  ctrl: mean 134.42 median 151 p05 21 p25 88 p75 185 p95 195 crush<8 2.882% clip 0.000% deadred 0.000% sat 0.3645
```

Powder's dead-red line reads "+842.9%" and "+517.5%" — that is 77 pixels
becoming 726 out of 1.6 million. It is 0.045% of the frame, it is the red
sleds, and it is noise. Ignore it.

## Appendix C — raw output, pass 2 (highlight headroom)

```
=== lantern before
  channel maxima     R=254 G=247 B=240
  any channel >250   0.0922%     all >250 0.0000%  all >245 0.0000%  all >240 0.0000%  all >230 0.3692%
  lum >180 1.8371%  >200 1.2910%  >220 0.6744%  >240 0.2657%
  p50 57  p75 96  p90 118  p95 134  p99 208  p99.9 243  max 248
=== lantern after
  channel maxima     R=255 G=250 B=243
  any channel >250   0.3969%     all >250 0.0000%  all >245 0.0000%  all >240 0.0199%  all >230 0.5296%
  lum >180 3.1482%  >200 1.9318%  >220 1.0943%  >240 0.4574%
  p50 77  p75 119  p90 142  p95 157  p99 222  p99.9 248  max 250
=== gameday before
  channel maxima     R=248 G=243 B=239
  any channel >250   0.0000%     all >250 0.0000%  all >245 0.0000%  all >240 0.0000%  all >230 0.3137%
  lum >180 4.1484%  >200 1.5504%  >220 0.6896%  >240 0.1896%
  p50 62  p75 92  p90 135  p95 166  p99 210  p99.9 242  max 244
=== gameday after
  channel maxima     R=253 G=244 B=241
  any channel >250   0.0231%     all >250 0.0000%  all >245 0.0000%  all >240 0.0000%  all >230 0.3591%
  lum >180 7.2062%  >200 3.4430%  >220 0.8244%  >240 0.3016%
  p50 71  p75 103  p90 154  p95 197  p99 216  p99.9 244  max 245
=== powder before
  channel maxima     R=248 G=242 B=240
  any channel >250   0.0000%     all >250 0.0000%  all >245 0.0000%  all >240 0.0000%  all >230 0.2883%
  lum >180 3.4859%  >200 1.2037%  >220 0.5671%  >240 0.1681%
  p50 121  p75 151  p90 153  p95 168  p99 205  p99.9 241  max 243
=== powder after
  channel maxima     R=250 G=244 B=242
  any channel >250   0.0000%     all >250 0.0000%  all >245 0.0000%  all >240 0.0000%  all >230 0.2854%
  lum >180 2.9831%  >200 1.1814%  >220 0.5720%  >240 0.2116%
  p50 137  p75 163  p90 165  p95 172  p99 207  p99.9 243  max 245
=== maple ctrl
  channel maxima     R=249 G=239 B=239
  any channel >250   0.0000%     all >250 0.0000%  all >245 0.0000%  all >240 0.0000%  all >230 0.0398%
  lum >180 12.2610%  >200 0.6707%  >220 0.2221%  >240 0.0000%
  p50 145  p75 164  p90 182  p95 185  p99 194  p99.9 234  max 240
=== pirate ctrl
  channel maxima     R=250 G=242 B=239
  any channel >250   0.0000%     all >250 0.0000%  all >245 0.0000%  all >240 0.0000%  all >230 0.0978%
  lum >180 37.1531%  >200 2.4034%  >220 0.4041%  >240 0.0288%
  p50 151  p75 185  p90 189  p95 195  p99 202  p99.9 238  max 242
```

## Appendix D — raw output, pass 3 (share under luminance 25)

```
lantern before         under25(luma) 5.73%    under25(maxch) 1.91%   mean 67.6
lantern after          under25(luma) 2.13%    under25(maxch) 0.69%   mean 87.8
powder before          under25(luma) 2.96%    under25(maxch) 0.65%   mean 120.2
powder after           under25(luma) 1.84%    under25(maxch) 0.24%   mean 133.4
gameday before         under25(luma) 9.15%    under25(maxch) 4.68%   mean 72.5
gameday after          under25(luma) 7.10%    under25(maxch) 3.46%   mean 81.3
maple ctrl             under25(luma) 4.36%    under25(maxch) 1.55%   mean 125.2
pirate ctrl            under25(luma) 5.50%    under25(maxch) 3.11%   mean 134.4
lantern_aaa1 (Aug23)   under25(luma) 28.21%   under25(maxch) 2.99%   mean 59.8
lantern_dark1 (Aug23)  under25(luma) 31.23%   under25(maxch) 4.38%   mean 61.2
lantern_dark2 (Aug23)  under25(luma) 27.30%   under25(maxch) 5.36%   mean 58.9
lantern_dark3 (Aug23)  under25(luma) 23.01%   under25(maxch) 2.17%   mean 62.9
powder_pw1             under25 5.48%   mean 115.3
powder_pw2             under25 3.63%   mean 119.3
powder_pw4-dense       under25 7.29%   mean 110.4
powder_ref1            under25 3.39%   mean 124.5
maple_aaa1             under25 6.03%   mean 123.9
```
