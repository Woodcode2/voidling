# ROUND 3 — SKEPTIC'S VERDICT on `crew:gameday-red`

Ruling on `docs/crews/round-2b/gameday-red.proposal.md`, read in full.
Every number below was run by this skeptic on 2026-08-28 against the working
tree at `6a424e6` (clean — the only untracked files in the repo are another
crew's `*_gz3.png` shoot). No tracked file was edited. Scripts named at the end.

---

## THE RULING

**Section 1 (the mechanism) — SOUND. Reproduced independently, and the crew's
arithmetic is exact to five decimal places.**

**Sections 2 and 4 (the census, and `qa/gamutzero.mjs` is blind) — SOUND, and
UNDERSTATED. There is a second blind instrument the crew did not find, and its
own header names this exact defect.**

**Section 3 (the live A/B) — SOUND. I re-ran it. The restore is not merely
statistic-identical as claimed; it is bit-identical by md5 on the PNG. The
denominator the proposal never printed does not move. The method is clean.**

**Section 6 (THE PATCH) — KILLED as filed.** Not because the diagnosis is
wrong — it is right — but because the one measurement that chooses `0xc44c2f`
over the ledger's already-recorded `0xc4453f` does not replicate, and on the
metric the board's own finding is about, `0xc44c2f` measures **worse than the
colour it replaces**.

Net: **SOUND WITH CORRECTIONS on the diagnosis and the probe. The three
constants in 6.1 and 6.2 do not land.** The corrections are in section C and
they are binding.

---

## A. WHAT I TRIED TO KILL, AND WHAT HAPPENED

### A1. THE THRESHOLD — the "0.12" is FITTED, not derived. The diagnosis survives it.

I transcribed the tone-map chunk myself from `src/prototype3d.ts:255-322` and
then, separately, rendered swatches through the **real compiled
`CustomToneMapping`** on the live build — an unlit quad, `renderer.render()`
to the canvas (never a render target, because three forces `NoToneMapping`
there), `toneMappingExposure` read off the renderer at **1.12**.

My transcription and the real shader agree to **≤2/255 on all nine albedos
tested**, and my transcription reproduces the crew's stage table in section 1
digit for digit (0.64284 / 0.03999 / 0.0622 → 0.39967 / 0.08570 / 0.2144 →
0.29823 / 0.03314 / 0.1111 → 0.45991 / 0.00620 / 0.0135 → toe 0.00193 → chroma
−0.00517 → guard 0.00073, l = 0.10309, chroma-negative threshold 0.00674).
Their toe multipliers check out exactly (red ×0.9840, blue ×0.4722, green
×0.3112), and so does sRGB 18 → 6. **Section 1 is the most accurate piece of
arithmetic in this repo's crew record and I could not dent it.**

But the headline number is not what section 1 derives. Here is the **real
shader**, albedo linear g/r swept with the rendered red pinned at 177:

| albedo g/r | 0.02 | 0.04 | 0.06 | 0.07 | **0.08** | 0.09 | 0.10 | 0.11 | 0.12 | 0.13 |
|---|---|---|---|---|---|---|---|---|---|---|
| rendered G | 3 | 3 | 3 | 2 | **1** | 10 | 19 | 26 | 31 | 36 |
| rendered B | 32 | 23 | 17 | 10 | **1** | 1 | 1 | 1 | 1 | 1 |

The knee — where the chroma push stops driving green negative and the guard
stops replacing it — is at **g/r ≈ 0.08 at R=177**, and it **moves with
brightness**: 0.09 at R=150, 0.08 at R=177, 0.06 at R=200. The crew's 0.12 is
none of these. It is the g/r at which rendered green first reaches **12/255 at
the dim end of the crew's own chosen band** — i.e. it is their own PASS-1 bar
solved for g/r. **A bar is not a threshold, and the file presents it as a
physical constant an art director can use.** Their own section 1(a) derives a
third, different number (post-RRT ratio 0.092, i.e. albedo g/r ≈ 0.045, where
green survives the ACES output matrix). Three numbers, one word.

The claim *"essentially independent of how brightly it is lit"* is **false**:
the knee moves 50% across the band, and above R≈205 `CRIM` recovers its green
entirely (R=215 → G=19, R=230 → G=42, R=245 → G=67, neutral). The defect is a
**mid-tone** defect.

**Why this does not kill the diagnosis.** I enumerated every red-dominant
albedo in both worlds and graded each through the validated chain:

    GAME DAY   CRIM 0.062 · CRIM_D 0.064 · | gap | · BRICK_D 0.202 · MEAT 0.217
               · ORANGE 0.220 · BRICK 0.232 · TIMBER_D 0.499 · TIMBER 0.523
               · GOLD 0.524 · BUN 0.582 · GOLD_L 0.658
    MAPLE      LEAF_B 0.060 · BARN 0.083 · LEAF_D 0.137 · LEAF_A 0.179
               · PUMPKIN 0.225 · BRICK 0.226 · LEAF_HERO 0.346 · …

Game Day's next red after `CRIM_D` is **3.2× further up**. Any threshold
between 0.07 and 0.20 sorts that palette identically, so the fitted 0.12 is not
load-bearing for Game Day. It **is** load-bearing for Maple, where `BARN` at
0.083 sits exactly ON the knee — which is why the crew's "45.7%" is inflated
and why their sentence *"Maple's BARN and LEAF_B are just as dead as CRIM"* is
contradicted by their own table (71% and 60% dead against CRIM's 91–95%).

**And I confirm the crew's conclusion by a route they did not take, which is
stronger than theirs.** A Lambertian surface multiplies illumination by albedo,
so the effective ratio is `albedo_g/r × illum_g/r`. To lift `CRIM` (0.0622)
over the knee (0.08 at R=177) you need an illuminant with **g/r ≥ 1.29** — a
light 29% greener than it is red. Under a *perfectly neutral white* light,
`CRIM` at R=177 still renders **(177, 2, 15)** — measured on the real shader.
**No physically sane rig can fix this.** The hemisphere refutation is not just
empirically right, it is right by construction: I reconstructed the rig
arithmetic and Game Day's lit-face illumination goes g/r 0.750 → 0.795 when
`hemiI` is taken 0.22 → 0.86, a 6% move against a requirement of 108%.

### A2. THE A/B's HONESTY — I could not break it. It is better than they claimed.

I read `SP/red/ab.mjs` line by line looking for a leaked variable, then wrote
my own harness and re-ran it. Findings:

- **The one-frame-lag trap (retraction 8) is not present.** If `__renderBloom()`
  followed by a canvas read returned the previous composited frame, every row
  would be shifted by one and the restore would return the last variant. It
  does not.
- **The selector is tight and its collateral is checked.** `CRIM_D` really is on
  `CRIM`'s ray (per-channel residual 0.00062 / 0.00035 against a tolerance of
  0.0015) and is repainted by construction, exactly as claimed. No other Game
  Day albedo comes within 40× the tolerance. Where the selector errs it errs
  *narrow* — a `tint()`-derived crimson would be missed by the A/B but changed
  by the real patch — so the A/B **understates** the patch, never the reverse.
- **The denominator does not collapse.** This is the trap I most expected and
  the proposal never printed the number. Measured: reddish 273,927 (baseline) →
  273,978 (`0xc44c2f`) → 274,068 (`0xc4453f`). A 0.02% move. The
  "dead → 0.01%" is not survivorship.
- **The restore is bit-identical.** Not "same dead ratio, same mean green" —
  I rendered baseline and restore to PNG inside one synchronous evaluate and
  they share an md5 (`70b3cbd4…`). The harness does not drift.

**Kill attempt 2 fails outright. The A/B method is sound and the crew's
appendix technique is worth keeping.**

### A3. THE CENSUS — reproduces exactly. One number in it was never run.

Recounted from `qa/out/shippedlook/*_look.png` (digest `20d3f756b27be10d`),
my own script, no shared code with the crew:

| frame | reddish | G≤3 | dead (G<12 ∧ B<12) | G==1 | G==0 | G=B=0 |
|---|---|---|---|---|---|---|
| gameday | 252,981 | **77.56%** | 79.57% | **65.02%** | 10.67% | 0.68% |
| maple | 160,645 | 24.85% | 30.39% | 14.53% | 5.39% | 0.30% |
| pirate | 91,026 | 0.17% | 0.00% | — | — | 0.00% |
| lantern | 33,064 | 0.00% | 0.00% | — | — | 0.00% |
| powder | 43,014 | 2.76% | 1.69% | — | — | 0.00% |

`(177,1,7)` × **73,805** = **4.60%** of the whole frame. Every figure in the
crew's sections 2 and 4 is confirmed to the digit.

**One number was not run.** Section 2 opens *"Maple carries almost the same
share of reddish pixels (10.02% vs 10.19%)"*. Maple is 10.02% of frame;
**Game Day is 15.78%**, not 10.19%. Game Day carries **57% more** red pixels
than Maple. The crew inherited that figure from the brief and passed it through
a file whose preamble says *"every number in this file was run by this crew
today"*. It is small, it does not touch the conclusion, and under rule 3 it is
still a number in a record that nobody will re-derive.

**The 84.0% / 45.7% attribution is model-based and its internal split is
noise.** `SP/red/attrib.mjs` classifies by nearest rendered locus. `CRIM`
(g/r 0.062) and `CRIM_D` (0.064) lie on curves that are the *same curve* to
within the classifier's resolution — that is the defect itself — so the
72.2/11.8 split between them means nothing. The **family total** is
defensible and I can restate it without a model: Game Day's palette contains
exactly two below-knee reds, so any Game Day pixel at G≤3 is CRIM-family, and
that is 77.56% of its red pixels against Maple's 24.85%.

### A4. THE COLOUR DECISION — this is where the patch dies.

The proposal's case for `0xc44c2f` over the ledger's `0xc4453f` rests on one
sentence, repeated in sections 3, 6 and 7: *"the ledger's own modelled one-token
fix is measured insufficient — 68.22% still dead — do not ship it on the
strength of that table."*

**It does not replicate.** I ran the same A/B on a frame that matches the
canonical pack (my baseline: dead 79.36%, G≤3 77.60%, crimson mode
`(177,1,7)`; the pack: 79.57%, 77.56%, `(177,1,7)`):

| variant | reddish | dead | **G≤3 (the crew's own metric)** | mean G | distinct red triples |
|---|---|---|---|---|---|
| A baseline | 273,927 | 79.36% | **77.60%** | 11.14 | 7,371 |
| A baseline, repeated | 273,927 | 79.36% | 77.60% | 11.14 | 7,371 |
| **B `0xc4453f`** (the ledger's) | 274,068 | **1.13%** | **0.31%** | 32.05 | **8,455** |
| B `0xc44c2f` (proposed) | 273,978 | 0.03% | **0.00%** | 41.42 | **7,154** |
| A restore | 273,927 | 79.36% | 77.60% | 11.14 | 7,371 |

The crew's run-1 baseline was **90.54% dead with a crimson mode of `(138,1,7)`**
— 39 levels darker than the pack's `(177,1,7)` and 11 points deader. Their own
rule says *"compare DOWN a run, never across them"*, and then sections 3, 6 and
7 carry run 1's 68.22% out of the run and into a standing instruction to the
governor. **That is the crew breaking its own rule on the one number that
decides the patch.**

Worse, 68.22% is the **dead** statistic — the one their own section 4 argues is
unfit because *"it can be moved by composition"*. On the statistic they say is
tied to the mechanism, measured live on two independent frames, the ledger's
colour clears their own PASS-2 bar of 10.0:

- bright frame (pack-matched): **0.31%**
- dim frame (composition-pinned, 88% of its crimson at R 120–150, i.e. dimmer
  than the crew's own run 1): **7.17%**

**And on the quantity the board's finding is actually about, the proposed
colour is the worst of the three.** The ledger entry reads *"Game Day's red has
two luminance levels … median 2 distinct luminance levels out of 256. Not low
contrast, a fill."* Distinct red values, measured on two frames:

| | whole bright frame | 430×300 crop of a stall panel, dim frame |
|---|---|---|
| shipped `0xc4342f` | 7,371 | 867 |
| ledger `0xc4453f` | **8,455** | **1,204** |
| proposed `0xc44c2f` | **7,154** | **829** |

The proposed colour **reduces** the distinct-value count below the shipped
build, on both frames. The mechanism is visible in the real shader's own
transfer table:

| across R 150→200 | red | green | blue |
|---|---|---|---|
| shipped `0xc4342f` | 149→199 | **2, 2, 1 — pinned** | 11, 15, 12 |
| ledger `0xc4453f` | 149→199 | 1, **21**, **41** | **9, 23, 37** |
| proposed `0xc44c2f` | 150→199 | **22, 37, 54** | **1, 1, 4 — pinned** |

**`0xc44c2f` does not add a channel. It swaps which channel is dead.** Section 6
says *"to get all three channels alive across the band you need CIE76 ≈ 20 — a
genuinely different colour, a dusty rose."* At R=177 — where **84.4%** of Game
Day's red pixels sit, measured on the pack — the ledger's colour at **CIE76 8.9**
renders **(177, 21, 23)**: all three channels live, on the real shader. The
proposed colour at CIE76 11.1 renders **(176, 37, 1)**: two. The "CIE76 ≈ 20"
claim is only true with "across the band" doing all the work, and it is
misleading about the pixels the world actually has.

**The photographs, which the proposal does not contain.** I shot the three
states inside one synchronous render so nothing but the albedo differs (restore
bit-identical). Measured against the crew's own collateral yardstick from
section 8:

| | pixels moved ≥8/255 | ≥16 | ≥32 | mean \|Δ\| | frame saturation |
|---|---|---|---|---|---|
| ledger `0xc4453f` | **1.69%** | 1.16% | 0.00% | 0.89 | 0.4983 → 0.4944 |
| proposed `0xc44c2f` | **13.52%** | 10.96% | 0.77% | 2.58 | 0.4983 → 0.4985 |

In section 8 the crew rejected the monotone grade pair partly because it moved
**23.36%** of Powder's pixels by ≥8, and called chroma-alone **6.37%** "cheap".
This patch moves **13.52%** of Game Day's — between the two, and nearer the
number they used to disqualify.

Looking at the frames: the change is real but not disfiguring. The world still
reads as a crimson-and-gold football lot at every radius I shot (2.5, 3, 12,
60). The new red is a warmer vermilion; on the big stall panels the sunlit and
shadowed bands separate in hue as well as value, which the shipped build does
not do. **That gain is real and I am not disputing it.** What I dispute is the
claim that it is the *smallest* step and that the alternative bought nothing.

Two art costs the proposal never measures:

- Hue 2.0° → 11.7° puts the team crimson **0.9° from `BRICK`** and **3.4° from
  `MEAT`**; CIE76 CRIM↔MEAT falls **20.8 → 11.4**. That is the closest any two
  Game Day colours get after the patch.
- CIE76 CRIM↔GOLD falls **66.0 → 55.5**. The two team colours — the thing
  "crimson and gold" *is* — lose **16%** of their separation.

And **`0xc44c2f` is not the smallest step that clears the crew's own bar.** Their
ladder walked the green byte alone with red pinned at `0xc4`. A three-dimensional
search finds colours at **CIE76 7.8** clearing `minG ≥ 12` over R∈[150,200] under
the probe's own neutral light (e.g. `0xc44630`, H 8.9°). Under Game Day's actual
key the smallest is 10.2 against the proposal's 11.1. Also worth stating plainly:
**PASS 1 gives `0xc44c2f` a margin of 22 under neutral light and 13 under the
world's own key** — the shipped margin is roughly half the probe's.

### A5. `qa/gamutzero.mjs` — CONFIRMED, and there is a SECOND blind instrument.

Run today, unmodified: **PASS, exit 0**, gameday MONOCHANNEL 0.23%, on a frame
where **65.02%** of red pixels carry a green of exactly 1/255. Its predicate is
`zeros >= 2` with `zeros = (r===0)+(g===0)+(b===0)`, and lifting the channel off
exactly zero is the gamut guard's entire mechanism. **The crew is right, and the
generalised lesson belongs in the standing rules.**

One correction to the framing: `qa/gate.mjs:173` puts `gamutzero` in the **`art`**
profile, not `push`. That is worse, not better — it is the gate art direction
reads.

**And the crew found the smaller half.** `qa/formsep.mjs` is the probe whose own
header, at line 15, says: *"it is the Game Day truck whose cab-top and body-side
are the same flat red."* Run today it reports **`gameday 78 palette colours, 0
cannot show form`**. It is blind three ways:

1. **Its simulator is stale — again, and in the file the governor already named
   for it.** `qa/_zgrade.mjs` implements ACES → `Math.min(1, Math.max(0, v))` →
   toe → split → chroma, **with no `gamutGuard` at either clamp site**. The
   shipped shader has had the guard at both sites since before this pack; the
   hard per-channel clamp `_zgrade` still uses is precisely what the guard
   replaced. Retraction "the snapshot" cites `_zgrade.mjs` for modelling a toe
   that had been replaced hours earlier. It is now modelling a **pre-guard tone
   map**, and `formsep` is built on it.
2. **It carries no exposure term at all.** `formsep.mjs:57` builds its key from
   `WORLD_LIGHT.sunI × RIG 1.31` and stops. RUNG 1 made the per-world exposure
   column live (gameday 1.12, powder 1.18, lantern 1.24). `formsep` cannot see it.
3. **It samples where the defect is not.** `LIT = 0.85`, `SHADED = 0.40` of the
   key put Game Day's `CRIM` at rendered **R = 251** and **R = 201**. On the pack,
   **84.4%** of Game Day's red pixels are at R 150–200 and only **2.8%** above 200.
   `CRIM`'s green is non-monotonic in illumination (the V), so a single-k probe
   can land on either side of it — and both of formsep's sample points are on the
   *safe* side.

The staleness has a second consequence the governor needs now: **three of
`formsep`'s five current FAILs clear the bar on the shipped chain.**

| | `_zgrade` (what formsep uses) | shipped chain |
|---|---|---|
| lantern/BLACK_L | ΔE **3.8** — FAIL | ΔE **7.7** — ok |
| powder/CHAR | ΔE **5.7** — FAIL | ΔE **7.7** — ok |
| powder/PLINTH | ΔE **6.0** — FAIL | ΔE **8.8** — ok |
| lantern/PLINTH | ΔE 0.8 — FAIL | ΔE 2.0 — FAIL |
| lantern/CASE | ΔE 1.2 — FAIL | ΔE 1.6 — FAIL |

`node qa/gate.mjs --profile=art` is currently red on three colours that are
fine, on a simulator that does not match the shipped shader.

---

## B. WHAT I COULD NOT KILL, RECORDED SO NOBODY RE-LITIGATES IT

- The mechanism, stage by stage. Verified twice — my own transcription and the
  real compiled shader.
- That the lever is the albedo and **cannot** be the rig, at any sane value.
  Confirmed by the crew's experiment and, independently, by the arithmetic:
  the required illuminant is g/r ≥ 1.29.
- That exposure is dead as a lever. `CRIM` recovers only above R≈205, which
  needs a key past the mascot ceiling (+26%, `OWNER-2026-08-25.md`).
- That the guard-knee `1.15 → 2.0` must not ship. Their inverted-left-branch
  curve is confirmed on the **real shader**: at R=177 the rendered green runs
  3, 3, 3, 3, 3, 2, 1 as the albedo's g/r rises 0.02 → 0.08. Raising the knee
  makes that inversion eighteen times louder. **The crew killed their own best
  number with a correct argument, and that is the strongest thing in the file.**
- That a specular on the crimson does nothing, and that `SKY_MOOD.gameday`'s
  tint touches only the sky texture (`island.ts:610-627`, read from source;
  fog `0x241120` has linear g/r 0.317 against crimson's 0.062, so wherever fog
  reaches it can only add green).
- The seeded-draw accounting. `tailgate.ts:74-75` and `life.ts:41-42` are both
  `Math.random`; `mainstreet.ts` is untouched. **Zero delta**, confirmed.
- `CRIM_D`'s derivation. `0x923721` is `0xc44c2f × 0.5225` in linear to within
  1/255 on green (I get `0x923621`). Honest.
- Section 6.1's PASS-1 table, verified against the real shader: `CRIM` minG 1,
  `CRIM_D` 0, `BARN` 0, `LEAF_B` 1, `0xc44c2f` 22, `0x923721` 23. The crew's
  "within 2/255" claim about their model is **true**.
- The live vertex census: I count **1,433,946 of 12,263,686** coloured vertices
  on CRIM's ray (11.69%) against their 1,454,832 of 12,313,054 (11.8%). Same
  fact; note it varies ~1.4% per match, so it should not be quoted as an exact
  count.

---

## C. CORRECTIONS — BINDING, VERBATIM

**C1.** Delete the sentence *"the pipeline needs about 0.12"* and every
restatement of 0.12 as a threshold. Replace with: **"The chroma push drives
green negative, and the gamut guard replaces it, below an albedo linear g/r of
about 0.08 at a rendered red of 177 — 0.09 at R=150, 0.06 at R=200. Measured on
the real compiled shader. `CRIM` at 0.062 and `CRIM_D` at 0.064 are below it
everywhere in the band where 84.4% of Game Day's red pixels render. 0.12 is not
that knee; it is the ratio at which rendered green reaches this probe's chosen
bar of 12/255 at the dim end of the band, and it is stated here as a bar."**

**C2.** Delete *"essentially independent of how brightly it is lit"*. The knee
moves 50% across R 150–200 and `CRIM` recovers its green entirely above R≈205.
This is a mid-tone defect and must be described as one.

**C3.** Delete *"the green … is DECOUPLED — pinned at the gamut guard's floor,
a fixed multiple of the pixel's luminance carrying no information about the
surface."* It contradicts the crew's own section-3 V-curve and the real shader.
Replace with: **"Below the knee the rendered green runs 3 → 1 as the albedo's
own green RISES — the guard's left branch is inverted — and it is the BLUE that
still carries the surface (32 → 1 over the same sweep). The green is not
decoupled; it is destroyed and its residue is inverted, inside a range of
1–3/255 that no one can see."**

**C4.** The number `0.0091 × l` is the zero-arriving-green asymptote, not this
pixel. For `CRIM` at R=177 the guard returns **0.00073 against a pre-toe
luminance of 0.10309 — 0.0071 × l**. This number is proposed for a **committed
source comment in `tailgate.ts`**, where rule 3 and retraction 10 make it
load-bearing forever. Fix it or drop it.

**C5.** Strike *"measured insufficient: 68.22%"* and *"Do not ship it on the
strength of that table"* wherever `0xc4453f` appears. Replace with: **"On a
frame matching the canonical pack, `0xc4453f` takes the guard-floor share from
77.60% to 0.31% and dead-of-reddish from 79.36% to 1.13%, clearing this file's
own PASS-2 bar of 10.0 by a factor of thirty; on a deliberately dim frame it
measures 7.17%, still inside the bar. The 68.22% figure is the DEAD statistic —
the one section 4 of this file argues is unfit — taken on a frame whose crimson
mode was (138,1,7) against the pack's (177,1,7). It does not generalise and it
must not be carried into the ledger."**

**C6.** Strike *"it gave up saturation and bought nothing"*. Replace with the
measured trade, which is the owner's actual decision: **"`0xc4453f`: hue held at
2.7°, saturation 0.760 → 0.679, 1.69% of pixels moved ≥8/255, guard-floor share
77.60% → 0.31%, and it is the only one of the three candidates with all three
channels live at R=177 (177,21,23). `0xc44c2f`: hue 2.0° → 11.7°, saturation
held, 13.52% of pixels moved ≥8/255, guard-floor share → 0.00%, blue pinned at
1 across the band (176,37,1)."**

**C7.** Add to section 6: `0xc44c2f` puts the team crimson **0.9° from `BRICK`**
and **3.4° from `MEAT`** (CIE76 CRIM↔MEAT 20.8 → 11.4), and narrows CIE76
CRIM↔GOLD from **66.0 to 55.5**. Add to section 10 as a risk: **the two team
colours lose 16% of their Lab separation.**

**C8.** Strike *"the smallest step that clears the threshold with margin"*.
A three-dimensional search finds candidates at **CIE76 7.8** clearing this
probe's own bar under its own neutral light (`0xc44630`, H 8.9°), and 10.2 under
Game Day's key. Also state that PASS 1's margin for `0xc44c2f` is **22 under
neutral light and 13 under the world's own key**.

**C9.** Add, in section 6 and section 10: **on both frames measured, `0xc44c2f`
produces FEWER distinct red values than the shipped colour (7,371 → 7,154 whole
frame; 867 → 829 on a stall-panel crop), while `0xc4453f` produces more
(8,455; 1,204). The board's confirmed finding is "median 2 distinct luminance
levels". This patch does not improve that count and by this measure slightly
worsens it.** Risk 4 gestures at this; it must be stated as a measurement, not
a caveat.

**C10.** `qa/redform.mjs`'s `FLOOR_BAR` is described as *"today's measurement for
the four worlds nobody is changing … Down only, like qa/roundlod.mjs"*. It is
not. Measured today: maple **24.85** (bar 26.0), powder **2.76** (bar 4.0),
pirate **0.17** (bar 1.0), lantern **0.00** (bar 1.0). As written it grants
Maple a 1.15pp regression and Powder a 1.24pp regression silently.
`qa/roundlod.mjs:60` sets its ratchet to the exact measured value and prints an
instruction to lower it. Do the same.

**C11.** Section 5's fenced block is presented as *"what it prints on today's
build"* and is a **[MODEL]** transcript with `FAIL` lines in it, for a file that
does not exist on disk. Standing rule 2 wants the failing **run**. Land
`qa/redform.mjs`, run it, paste the real output. (Its PASS-1 predictions are
correct — I verified them against the real shader — which is exactly why the
distinction matters: nobody will re-derive a transcript that turned out right.)

**C12.** Correct the reddish-share line: Game Day is **15.78%** of frame,
Maple 10.02%. Game Day carries 57% more red pixels, not "almost the same share".

**C13.** Soften *"Maple's BARN and LEAF_B are just as dead as CRIM"* — the
crew's own table gives 71% and 60% against 91–95%, and `BARN` at g/r 0.083 sits
**on** the knee, not below it. Maple's "45.7% below-threshold family" is
**17.8% below the knee plus 27.9% straddling it.**

**C14.** Anchors have moved and must be re-read at land time: the beat banner is
`prototype3d.ts:3662` (was cited :3633) and `CARD_FALLBACK.gameday` is
`prototype3d.ts:5846` (was :5817). `tailgate.ts:27-28` and `life.ts:853` are
correct as cited.

---

## D. THE SECOND FINDING, WHICH IS NOW THE BIGGER ONE

The crew's section 4 should be widened before it goes in the ledger. **Three
instruments say Game Day's red is fine and none of them can see it:**

1. `qa/gamutzero.mjs` — predicate `zeros >= 2` where `zeros` counts channels at
   **exactly** 0. The guard's mechanism is to make them non-zero. Green, always.
   In the **art** profile.
2. `qa/formsep.mjs` — header names this exact truck. Built on a simulator with
   **no gamut guard and no per-world exposure**, sampling at R=251 and R=201
   where the frame lives at 150–200. Reports gameday 0/78.
3. `qa/_zgrade.mjs` itself — the file the governor's own "snapshot" retraction
   already names once, now stale a second time, in a way that makes three of
   `formsep`'s five live FAILs (lantern/BLACK_L, powder/CHAR, powder/PLINTH)
   artefacts of the simulator rather than defects in the build.

The standing rule the crew proposes — *"a probe whose predicate is `== 0` cannot
measure a remedy whose mechanism is `make it non-zero`"* — is right and should
land. I would add a second, which is what `formsep` actually demonstrates:
**a probe that samples one illumination level cannot measure a defect that is
non-monotonic in illumination.** `CRIM`'s green is a V. Any single-k instrument
lands on one side of it and reports the other side's answer.

---

## E. WHAT MUST HAPPEN BEFORE ANYTHING LANDS

1. `qa/_zgrade.mjs` is repaired first — `gamutGuard` at both clamp sites and a
   per-world exposure argument — and `qa/formsep.mjs` re-run and re-bar'd
   against it. Nothing about Game Day's red should be argued on a build whose
   art gate is red on three colours that are fine.
2. `qa/redform.mjs` lands alone, **actually run**, with the ratchet at today's
   measured values (C10) and PASS 1's bar labelled as an assertion.
3. The colour choice goes to the owner as **`0xc4342f` / `0xc4453f` / `0xc44c2f`,
   three photographs, one composition, one synchronous render**, at R 2.5, 12 and
   60 — with the table from C6 under them. Not as a single "before/after". The
   ledger recorded `0xc4453f` on 2026-08-24 and declined it *only* because
   changing a world's dominant colour is a style decision; nothing measured since
   has changed that, and this crew's attempt to retire it does not hold.
   Decision 4's standard is the governing one: *"photographs first, nothing lands
   without the before/after reading clearly better."*
4. Whichever hex the owner picks, `life.ts:853` moves with `tailgate.ts:27-28`.
   The crew is right that leaving the crowd behind would put the fans in a
   different team's colours; that part of the patch is sound as written.
5. `qa/shippedlook.mjs` re-shoots all five worlds, then `redform`, `gamutzero`,
   `formsep`, `gate --profile=art` and `--profile=push`.
6. The ledger entry moves to **CONFIRMED** with the cause **and** with the
   correction that the fix is a choice between two colours, not one, and that
   neither of them addresses the flat-panel half of the finding.

---

## F. THE RECORD

Everything I ran, under
`/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/skeptic/r3/`.
Untracked, and reproducible from the descriptions above.

| script | what it did |
|---|---|
| `chain.mjs` | my own transcription of `prototype3d.ts:255-322`, written before reading the crew's |
| `derive.mjs` | the knee, stage by stage, and the g/r sweep at three rendered reds |
| `pal.mjs` | every red-dominant albedo in both worlds graded at R 150/177/200 |
| `band.mjs` | rendered green vs rendered red, R 40–245, neutral and Game Day key |
| `census.mjs`, `bandshare.mjs` | the pack recount and the R-band distribution |
| `lab.mjs`, `teamsep.mjs` | CIE76 / HSV, the team-colour separations, the 3-D colour search |
| `zcmp.mjs` | `qa/_zgrade.mjs` against the shipped chain — finding D |
| `swatch.mjs`, `verify.mjs` | the live probe: the A/B with denominators, and PASS 1 against the **real compiled shader** |
| `photo2.mjs` | the composition-pinned three-up photographs, bit-identical restore, per-R-band census |
| `delta.mjs`, `form.mjs` | pixels-moved, saturation, distinct-value and face-to-face measurements |
| `predict.mjs` | pack-level floor-share prediction for both candidates, bracketed by illuminant |

Frames: `p3_old.png` / `p3_led.png` / `p3_nue.png` / `p3_old2.png` (identical
md5 to `p3_old.png`), `crop3.png` (old / ledger / proposed, top to bottom),
and the R 2.5 / 12 / 60 pairs from the first pass — **the first-pass pairs are
NOT composition-pinned** (the camera was still easing) and must not be used as
an A/B; only the `p3_*` set is.

---

## G. ONE LINE FOR THE GOVERNOR

The crew found the right defect, derived the right mechanism, refuted the right
leads, killed its own best number for the right reason, and then chose the
colour on a frame that was not the pack — using the statistic its own file
declares unfit — and never took a photograph of the thing it wanted to change.
**The diagnosis is the best work in this round. The hex is not established, and
the second-best instrument in the repo is measuring a tone map that has not
shipped for days.**
