# RUNG 1 — the Lantern art director's judgment

**Provenance:** the rung1-judgment workflow completed five of seven agents; the
synthesis ruling and the fixed-position probe author died on the session limit,
and restart #13 then took the journal. This judgment survived only in the
completion notice relayed to the governor and is transcribed from it. The
Game Day judge, the Powder judge and the set judge returned inside the
truncated portion of that notice and are LOST — they re-run.

**Verdict: ACCEPT WITH A RETUNE — lantern exposure 1.42 → 1.34.**

## The retune, in the judge's own words

> **1.34 — adopt the number the source comment already states, and discard 1.42.**
>
> (1) THE NIGHT DOES NOT BREAK, SO A DEEP CUT WOULD BE SOLVING A PROBLEM THE
> PHOTOGRAPHS DON'T SHOW. Measured on the frame minus the mascot: lantern-after
> mean linear luminance 0.103 against the daylight control maple's 0.268. The
> ground band is 0.043 against maple's 0.319 — 7.4x darker. This is not a night
> market lifted to daylight; it is not close. Anyone arguing for a revert to 1.0
> or a cut to ~1.15 is arguing from the impression of "brighter," not from the
> frame.
>
> (2) BUT THIS SCREENSHOT FLATTERS THE RUNG, WHICH CAPS HOW FAR DOWN I'LL GO.
> The non-mascot median moved 0.0301 → 0.0552, a 1.83x lift, while the rung only
> supplies 1.42x. The remaining ~1.29x is the void standing nearer the lamp
> cluster in the after match. A match in a dark corner sits at ~0.043 at 1.42 and
> ~0.038 at 1.25 — back toward the silhouettes this rung exists to fix. The value
> has to serve the dark corners too, so the correction must be small.
>
> (3) THE LAST 6% BUYS NOTHING AND COSTS FULL PRICE. Every measured benefit of
> the lift saturates; every measured cost is monotonic. The register where faces
> and dark clothing died is linear 0.010-0.020 (sRGB 30-40); 1.30 clears it about
> as well as 1.42, a difference of roughly 3 sRGB levels across that band.
> Meanwhile warm-ground chroma (bottom band HSV sat 0.616 → 0.533), internal
> contrast (p95/p25 11.1 → 7.2), and hero figure-ground (14.2x → 10.8x) all
> degrade straight-line with exposure. Trim the part that pays nothing.
>
> And 1.34 is the author's own written intent. Shipping 1.42 means shipping a
> value that contradicts the comment sitting beside it, chosen by nobody, from no
> photograph. At "AAA quality only" that is disqualifying on its face regardless
> of which number is prettier. 1.34 makes the rig self-consistent: one number
> where there were two.
>
> THE RETUNE ALONE DOES NOT EARN "CRISP" — it is a reconciliation, not a rescue,
> and 6% is near-invisible. The frame's actual defect needs a different lever.

## Better — each marked for confound-resistance

- **[kind confound-proof, degree not]** Background characters stopped being
  silhouettes. The top band's near-black population (<0.10 linear) fell
  74.8% → 36.7%. Skin tone, hair and clothing colour resolve where the before
  frame had dark shapes with no readable interior. "For a 6-11 audience
  scrolling a store listing on a phone, this is the difference between 'murky'
  and 'a busy, populated night market,' and it is the largest single
  improvement in the frame."
- **[CONFOUND-PROOF]** The night ambient got BLUER, not greyer. Cool population
  (b > r+8): 61,57,81 at HSV sat 0.288 before; 50,63,83 at sat 0.373 after. "At
  exposure 1.0 the night-blue paving was sitting so low on the tone curve that
  its hue collapsed toward neutral mud; the lift put it where blue actually
  resolves. This is the one place the rung made the scene MORE night-like." Held
  confound-proof because it is measured within a material-selected population
  and moves OPPOSITE to the frame's overall saturation trend.
- **[CONFOUND-PROOF]** It still reads unambiguously as night, with enormous
  margin — 0.103 against the daylight control's 0.268, ground band 7.4x darker.
- **[not confound-proof]** Saturated prop colour on lit surfaces reads correctly
  now: the stall canopy is crisp red and clean white where it was muddy maroon
  and dirty grey.

## Worse — and this is the part that matters

- **[mechanism confound-proof, magnitude not]** THE LANTERN POOLS GOT BIGGER AND
  SOFTER, NOT HOTTER. Hot population (>0.5 linear) grew 0.3% → 1.0% of frame,
  but its median luminance FELL 0.760 → 0.583, and near-white (>0.85) barely
  moved: 0.4% → 0.5%. The authored intent is "the lantern pools bloom out toward
  white while the shadows still have somewhere to go." **Exposure delivers the
  opposite: under ACES the highlights sit on the compressive shoulder and gain
  nothing, while the shadows sit on the linear toe and take the full
  multiplier.** Near-white +0.1pp against sub-0.02 population −19.6pp. What
  arrived is a diffuse warm haze, not incandescence.
- **[confound-resistant]** Internal contrast compressed hard: non-mascot
  p95/p25 fell 11.1 → 7.2, a 35% collapse. "Night's beauty is a RATIO between
  lit and unlit, not a level, and the ratio shrank."
- **[partly confound-proof]** The warm ground desaturated toward dusty peach
  (bottom band sat 0.616 → 0.533). The bottom third is now ~500px of flat,
  evenly-toned ground with no black anchor anywhere in the composition — "before
  it was dark enough to read as intentional vignette; now it is a lit, empty
  plate."
- **[constant confound-proof, attribution NOT]** THE MASCOT'S BRAND PURPLE
  SHIFTED TOWARD LAVENDER: 119,68,190 at sat 0.655 before, 144,90,208 at sat
  0.582 after. The control proves the constant: maple at exposure 1.0 renders
  the mascot at 121,67,193, sat 0.665 — within two levels of lantern-before,
  despite a completely different world and light rig. **So the mascot IS one
  colour everywhere, and lantern is now the one world where he isn't.** But the
  after-frame channels lifted unevenly (R +21%, G +32%, B +9%), which is the
  signature of warm lamp light falling on him, not of a uniform exposure change.
  **The judge names this "the single most important unresolved measurement in
  the set."**
- **[not confound-proof]** Hero figure-ground fell 14.2x → 10.8x, a 24% loss.
  Still healthy, but the wrong direction for the element that must read first.

## What the governor takes from this, pending the synthesis ruling

Two items outrank the retune itself and neither is an exposure question:

1. **The tone curve is spending the lift in the wrong place.** The authored
   intent for Lantern is incandescence; ACES gives the shoulder nothing and the
   toe everything, so exposure can only ever deliver haze. If the pools are to
   bloom, the lever is the curve or the lamp emissives, not the exposure column.
2. **The mascot must be one colour in all five worlds**, and Lantern is now the
   exception. Whether the lamp light or the rung caused it is UNRESOLVED and is
   the first thing the fixed-position probe should settle, because a
   fixed-position A/B removes exactly the confound that blocks the attribution.
