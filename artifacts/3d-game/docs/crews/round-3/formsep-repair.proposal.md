# qa/formsep.mjs — the repair

**Crew, round 3. 2026-08-28.** Verifying the gameday-red skeptic's three-way
blindness finding against `qa/formsep.mjs`, and proposing what replaces it.

Everything below was run. Standing rule 3.

---

## 0. THE SHORT VERSION

| the skeptic's claim | my verdict |
|---|---|
| (1) `_zgrade` has a hard per-channel clamp and no `gamutGuard`, so it models a pre-guard tone map | **CONFIRMED as a fact about the code — REFUTED as the cause.** The guard moves the five failing colours by **0.00, −0.40, 0.00, 0.00, 0.00** ΔE. It is not what makes the verdicts wrong |
| (2) no per-world exposure term, so RUNG 1 is invisible | **CONFIRMED, and it is the whole of the claimed effect.** +3.85 / +2.00 / +2.78 ΔE on the three colours named |
| (3) LIT/SHADED put the crimson at R 251 / R 201, where the world almost never renders it | **CONFIRMED, and much larger than claimed.** The modelled illumination is **2.8× too hot on the lit face and 6.3× too hot on the shaded face**, and the lit/shaded ratio is 2.2× wrong |
| CONSEQUENCE: three FAILs clear the bar on the real chain | **TWO of three.** lantern/BLACK_L and powder/CHAR are false FAILs. **powder/PLINTH is a true FAIL** — the skeptic's corrected *model* clears it at 8.77, the real render puts it at **5.94** |
| "gate `--profile=art` is RED on three colours that are fine" | **REFUTED.** `formsep` is **not wired into `qa/gate.mjs` at all** (34 step ids, none of them formsep). It reddens nothing. Its damage was done by hand — see §9 |

And the answer to the deep question: **formsep should stop modelling and start
rendering — but render a FIXTURE, not a photograph.** §6.

The honest part the finding does not contain: **no repair of the model would
ever have caught Game Day's crimson.** Measured on the real render, the retired
`0xc4342f` scores **ΔE 58.8** against a bar of 6. The blindness that mattered is
the *metric*, not the grade. §7.

---

## 1. METHOD AND PROVENANCE

Two independent instruments, both built for this crew.

**(a) A parsed reference chain.** `chain.mjs` reads `src/prototype3d.ts`,
asserts the thirteen statements of `CustomToneMapping` in order, and **throws**
if any one has moved (standing rule 4). It pulls `TOE`, `cool`, `warm`, the
chroma factor, the guard knee, `RRTAndODTFit` and both ACES matrices out of
`node_modules/three/build/three.module.js`, and the exposure column out of
`WORLD_LIGHT`. Nothing is transcribed. It threw twice while I was writing it,
which is the point of it.

**(b) A rendered fixture.** Playwright, the real page on the preview at :4177,
match 1 of a fresh profile (so `HOURS[world][0]` — the shipped rig), quality
pinned to rung 0. Boxes and spheres coloured exactly the way `island.ts:4168`
colours a prop (Uint16-normalised `color` attribute from `THREE.Color.setHex`,
i.e. linear), carrying the prop material **found by traversal in the live
scene** — not constructed — placed at y=900 where nothing occludes them, the
shadow camera does not reach and `scene.fog` (near 224.6) cannot touch them.
Rendered with an orthographic camera aligned to `__cam.getWorldDirection()`,
`setRenderTarget(null)`, and read back with `gl.readPixels` off the **canvas**.

Bundle: `dist/assets/main-Nc7Gdm7D.js`, sha256 `ec4de8af078b09a6`, built
22:28, all five worlds and the control shot off that one bundle. `gamutGuard`
present ×3, `const float TOE = 0.014`, `mn * 1.15`, crimson `12862783`
(`0xc4453f`). Caveat, stated because it is true: `src/proto3d/island.ts` is
dirty in the tree from a concurrent agent, so a shared *ground* colour could
differ between the bundle and my source scan. No palette constant I name is
affected — every one I quote is rendered by the fixture, not modelled from src.

**Exposure read live off `renderer.toneMappingExposure`, per world:**

    maple 1.0   pirate 1.0   gameday 1.12   lantern 1.24   powder 1.18

That is RUNG 1 in the frame, and `lantern` is **1.24** — the post-ruling value,
not the 1.42 the older documents carry.

**Two self-checks, both green.**

* *Determinism.* Two consecutive shoots of the same fixture, compared byte for
  byte: `drift 0` in all five worlds and in the control. There is no framing
  variance because there is no framing.
* *Fidelity.* The parsed chain against the real compiled shader on the canvas,
  63 calibration cells (7 albedos × 9 illuminations, `MeshBasicMaterial`
  scaled in linear per GOVERNOR retraction 3):

        max |Δ| 0 codes, mean 0.00

  Bit-exact. Where I use the chain below it is standing in for a measurement I
  have already taken, not for one I have not.

And the strongest external check available: the fixture renders Game Day's
`GOLD 0xf0b429` at **rgb(208,153,4)** and `TEAL 0x2aa9a0` at **rgb(5,139,120)**.
`qa/gamutzero.mjs`'s header counts **17,552** and **70,210** pixels of exactly
those two triples in a photographed gameplay frame. A fixture that reproduces
the photograph's own bytes is measuring the shipped picture.

---

## 2. BLINDNESS 1 — the guard. Real, and not the cause.

`qa/_zgrade.mjs:15` is `c = mul(OUT, c).map(v => Math.min(1, Math.max(0, v)))`
and `l2s` clamps again at :3. The shipped shader (`prototype3d.ts:292, :322`)
is `min( gamutGuard( color ), vec3( 1.0 ) )` and
`clamp( gamutGuard( color ), 0.0, 1.0 )`. So `_zgrade` implements the
per-channel clip the shader's own comment calls "the exact class this file
already outlaws", at both sites. The file's header says in capitals that it
**MUST TRACK** `prototype3d.ts`. It does not, and has not since `c775928`.

`docs/GOVERNOR.md`'s "snapshot" retraction names `_zgrade` once already, for
modelling a toe that had been replaced hours earlier. **This is the second
time the same file has rotted, and nobody noticed for four days across two
shader changes and an exposure unlock.**

But it is not what breaks the verdicts. Isolated — real chain, guard off vs
guard on, exposure held at 1 in both arms so only the guard moves:

| colour | guard OFF | guard ON | Δ |
|---|---|---|---|
| lantern/PLINTH `0x2a2336` | 0.81 | 0.81 | +0.00 |
| lantern/CASE `0x2a2038` | 1.21 | 0.81 | **−0.40** |
| lantern/BLACK_L `0x39344a` | 3.83 | 3.83 | +0.00 |
| powder/CHAR `0x2a2e38` | 5.67 | 5.67 | +0.00 |
| powder/PLINTH `0x2a2336` | 5.99 | 5.99 | +0.00 |
| gameday/CRIM `0xc4342f` (retired) | 16.24 | 16.45 | +0.22 |
| gameday/TEAL `0x2aa9a0` | 18.65 | 18.84 | +0.19 |

Nothing crosses the bar, and on `CASE` the guard makes the number **worse**.
The guard only fires when the ACES output matrix drives a channel negative,
which needs saturation these near-blacks do not have.

**So the finding is right about the code and wrong about the consequence, and
a crew that inherited it would have written down a cause it never measured.**
That is worth saying plainly, because it is the same shape as ledger #6 and
#15 — a real defect with a wrong mechanism attached.

---

## 3. BLINDNESS 2 — the exposure. Confirmed; it is the entire effect.

`formsep.mjs:57` carries `KEY` (the `sunI` column) and `RIG = 1.31` (the key
payback) and **no exposure term at all**. `RIG.exposure = LIGHT.exposure`
(`prototype3d.ts:851`) and `applyLightRig` writes it to the renderer at :912.
I read it back off the live renderer: 1.12 / 1.24 / 1.18 for the three worlds
that are not 1.0.

Adding only that term, on the real chain with the guard on:

| colour | model as shipped | + exposure | Δ | crosses ΔE 6? |
|---|---|---|---|---|
| lantern/BLACK_L | 3.83 | **7.68** | +3.85 | **yes** |
| powder/CHAR | 5.67 | **7.67** | +2.00 | **yes** |
| powder/PLINTH | 5.99 | **8.77** | +2.78 | **yes** |
| lantern/PLINTH | 0.81 | 2.05 | +1.24 | no |
| lantern/CASE | 0.81 | 1.65 | +0.84 | no |
| maple/CAR_TYRE `0x2a2e38` | 11.15 | 11.15 | +0.00 | — (control: maple exposure is 1.0) |

The skeptic's three numbers reproduce exactly: **7.7, 7.7, 8.8**. Maple, whose
table value is 1.0, moves by nothing — the ladder's control group works here
too.

---

## 4. BLINDNESS 3 — the sample points. Confirmed, and worse than claimed.

`formsep.mjs:54` is `LIT = 0.85, SHADED = 0.40` against `key = KEY[w] * 1.31`.
For Game Day that is k = 2.839 and k = 1.336.

**Where those land.** Real chain, gameday exposure, retired crimson:

    LIT     k 2.839  ->  rgb(251, 79, 57)
    SHADED  k 1.336  ->  rgb(201,  0, 11)

R 251 and R 201, exactly as the finding says.

**Where the world actually renders it.** Six shipped Game Day frames, reddish
pixels (R dominant, R > G+30, R > B+30, R ≥ 40):

| frame | reddish px | median R | R<150 | R 150–200 | R>200 | **R ≥ 251** |
|---|---|---|---|---|---|---|
| `gameday_gzhead.png` (HEAD crimson) | 243,286 | 179 | 14.3% | 67.4% | 18.3% | **0.00%** |
| `gameday_gzold.png` (retired crimson) | 153,123 | 182 | 10.7% | 57.7% | 31.6% | **0.00%** |
| `gameday_look.png` | 308,680 | 177 | 12.5% | 72.2% | 15.3% | **0.00%** |
| `gameday_land.png` | 243,286 | 179 | 14.3% | 67.4% | 18.3% | **0.00%** |
| `redab/gameday_after_ledger.png` | 116,688 | 145 | 61.6% | 38.1% | 0.3% | **0.00%** |
| `redab/gameday_before_shipped.png` | 115,396 | 145 | 61.1% | 38.6% | 0.3% | **0.00%** |

**Not one pixel of Game Day's red, in any of six frames, reaches the level
formsep calls "lit".**

**And the scale is wrong, not just the two points.** From the fixture — a real
prop, real rig, real exposure — inverted through the bit-exact chain:

| colour | lit up-face | k | shaded near-side | k | ratio |
|---|---|---|---|---|---|
| CRIM `0xc4453f` | rgb(179,25,16) | 1.012 | rgb(56,0,2) | 0.220 | 4.61× |
| GOLD `0xf0b429` | rgb(208,153,4) | 1.000 | rgb(90,63,2) | 0.214 | 4.67× |
| WHITE `0xf6f2e8` | rgb(210,195,176) | 0.986 | rgb(98,106,119) | 0.210 | 4.69× |
| CONC `0xb9b4a8` | rgb(168,151,128) | 1.002 | rgb(57,62,69) | 0.213 | 4.71× |
| **formsep models** | — | **2.839** | — | **1.336** | **2.13×** |

The real lit face sits at k ≈ 1.00 against a modelled 2.839 — **2.8× too hot**.
The real shaded face sits at k ≈ 0.21 against a modelled 1.336 — **6.3× too
hot**. The lit/shaded ratio is 2.13× where the rig delivers 4.7×.

The lit face lands at R 179 — the median of the shipped frames is **177–179**.

**Non-monotonicity, confirmed on the retired crimson.** Sweeping k at 0.05
steps: green rises to 3, turns down at k≈1.00 (rendered R 173), bottoms at 0
through k 1.1–1.4, and recovers above k≈1.40 (R≈205). Two sign changes. The
"above R~205" in `tailgate.ts:33` is where I land too. The shipped crimson has
its own turn but far lower (k≈0.65–0.75, R 138–152) and is monotone across the
mid-tones. **formsep's SHADED point sits inside the retired crimson's dead
zone and its LIT point sits well above the recovery — one sample on each side
of the V and nothing in between.**

**And this is why fixing the grade is not enough.** The skeptic's corrected
model clears powder/PLINTH at 8.77. The fixture renders its two faces at
rgb(3,3,17) and rgb(0,0,1): **ΔE 5.94 — still a FAIL.** A bit-exact grade fed
an invented illumination is still an invented answer.

---

## 5. WHAT THE FIXTURE SAYS, AGAINST WHAT THE SHIPPED PROBE SAYS

Measured lit up-face vs shaded near-side, same ΔE 6 bar, same exemptions:

| world | shipped probe | fixture |
|---|---|---|
| maple | 0 of 89 | **3** — INK `0x241f2e` 1.56, PLINTH 2.45, CASE 2.71 |
| pirate | 0 of 76 | **2** — CHAR `0x2a2430` 3.85, PLINTH 5.98 |
| gameday | 0 of 78 | **3** — CHAR `0x2c2a33` 4.00, PLINTH 4.13, CASE 5.05 |
| lantern | 3 (CASE, PLINTH, BLACK_L) | **4** — PLINTH 3.70, CEDAR_D 4.52, CASE 4.65, TIMBER_D 4.93 |
| powder | 2 (CHAR, PLINTH) | **2** — PLINTH 5.94, BARK 5.97 |

Both columns use the **shipped** exemption map, so maple's second `INK`
(`0x241f2e`) is counted as a FAIL there. The repaired probe adds it to
`INK_BY_DESIGN` as the line-work it is, which takes maple to 2 and the
five-world total to **13**.

Three things fall out of that table that nobody has recorded:

1. **`CASE` (`island.ts:4583`) and `PLINTH` (`curio.ts:31`) fail in ALL FIVE
   WORLDS.** `docs/GOVERNOR.md` #16 says of them: *"they measure fine under
   four brighter keys"*. They do not. That sentence was written from the blind
   model and is wrong in every world.
2. **Two of the five Lantern constants ledger #16 lifted "to ΔE 7" still
   fail.** The lift was sized by the broken model, so it under-delivered on two
   and overshot on three:

   | constant | model said | fixture says |
   |---|---|---|
   | CEDAR_D `0x5a4430` | 7.11 | **4.52 — still fails** |
   | TIMBER_D `0x5a3e2c` | 7.16 | **4.93 — still fails** |
   | TILE `0x3e4656` | 7.45 | 12.96 |
   | TILE_D `0x384255` | 7.63 | 13.98 |
   | CHAR `0x434355` | 7.29 | 13.52 |

   **A blind instrument did not merely fail to catch things — it steered a real
   edit to five shipped colours to the wrong magnitude.** That is the cost, and
   it is larger than a red gate.
3. **The `INK` exemption does not cover the `INK` it thinks it does.**
   `INK_BY_DESIGN` keys `INK|0x241f2c`, which is `life.ts:597`.
   `mainstreet.ts:126` declares a *second* `INK = 0x241f2e`, two codes apart in
   blue, and it is not exempt. The hex-keying is working exactly as its comment
   intends — it refused to widen silently — and the result is an unexempted
   line-work colour that the shipped model happened to score high enough to
   hide.

---

## 6. THE DEEP QUESTION: model, or render?

**Render. And render a fixture, not a photograph.**

The case against keeping a model is not that models are impure. It is that
this one has now failed in four independent ways and only one of them is
fixable by parsing the shader:

* the grade — fixable by parsing (§2, and I built the parser to prove it);
* the exposure — fixable by parsing (§3);
* **the illumination scale — not fixable by parsing.** k = 1.00 / 0.21, not
  2.839 / 1.336. To model that you must model `sunI × 1.31 × hourSunK`, N·L on
  a flat-shaded box normal, the hemisphere, the cool counter-light, and
  `environmentIntensity` 0.15 through a GGX lobe at roughness 0.85;
* **the illuminant's colour — not fixable by parsing.** Game Day's key is
  `0xffd9a8`. A scalar-k model of CRIM at the measured lit level returns
  rgb(178,22,24); the render gives rgb(179,25,16). Eight codes of blue, on the
  channel the whole Game Day finding is about.

Model those last two and you have written a renderer. There is one in the page
already, and it is the one the child looks at.

The standing objection to reading frames is real and `qa/gamutzero.mjs` states
it in its own header: *"two shoots of the SAME build ten minutes apart measured
17.33% and 22.43%… do not ratchet this number"*. That objection is about
**photographs**. It does not apply to a fixture:

| | model | photograph | **fixture** |
|---|---|---|---|
| runs the shipped shader | no | yes | **yes** |
| runs the shipped rig and exposure | no | yes | **yes** |
| repeatable | yes | **no** (drift 5.1 pts) | **yes** (drift 0, five worlds) |
| covers colours not on screen | yes | **no** | **yes** (all 74–85 per world) |
| names the constant to change | yes | **no** | **yes** |
| can rot into a snapshot | **yes, twice** | no | no |

A fixture is a render that is also a controlled experiment. It costs a browser
and a built `dist/`, which is what most of this repo's surviving probes already
pay, and it buys back the one property a photograph cannot give: the same
answer twice.

**The model does not survive anywhere in the repaired probe.** The parsed chain
I built stays in the crew's scratch as the thing that *proved* the fixture and
the shader agree to zero codes; it is not shipped, because a bit-exact model
that nobody re-verifies is exactly how `_zgrade` got here.

---

## 7. WHAT IT WOULD HAVE TAKEN TO CATCH THE GAME DAY CRIMSON

This is the case `formsep.mjs:15` claims — *"it is the Game Day truck whose
cab-top and body-side are the same flat red"* — and it is the case it missed.

**No version of formsep that measures ΔE between a lit face and a shaded face
would ever have caught it.** Rendered, on the fixture, retired crimson
`0xc4342f`:

    lit up-face   rgb(177, 1, 7)
    shaded side   rgb( 54, 0, 1)
    ΔE 58.8   against a bar of 6

Ten times the bar. The two faces are *not* the same colour — one is nearly
three and a half times the brightness of the other. CIE76 ΔE is dominated by
ΔL*, and the truck had plenty of ΔL*. What it had none of was **chroma
information**: green moved **1 code** across the entire lit-to-shaded range
while red moved **123**.

So line 15 is describing a defect the probe's metric cannot express, and it has
been describing it since the file was written. The grade model, the exposure
and the sample points were all wrong as well — but had all three been perfect,
Game Day would still have shown 0 of 78.

**What would catch it** is a second question asked of the same fixture: not
*"do two faces differ"* but *"does every channel carry the shading"*. Render a
smooth sphere — the game's own rounded prop — and count the distinct 8-bit
codes each channel takes across its lit-pole-to-terminator ramp. That is the
ledger's own quantity (*"median 2 distinct luminance levels out of 256"*),
made per-constant and deterministic:

| Game Day, 280–300 px of one prop's ramp | R | G | B |
|---|---|---|---|
| `CRIM@retired 0xc4342f` | 106 | **9** | 12 |
| `CRIM_D@retired 0x922520` | 94 | **2** | 5 |
| `CRIM 0xc4453f` (shipped) | 103 | **42** | 21 |
| `CRIM_D 0x92312d` (shipped) | 96 | **11** | 5 |
| `GOLD 0xf0b429` | 91 | 80 | **7** |
| `TEAL 0x2aa9a0` | **8** | 82 | 51 |
| `WHITE 0xf6f2e8` | 87 | 69 | 43 |

Nine levels of green over a whole prop, against a hundred and six of red. That
is a surface whose hue is a constant and whose shading is a single-channel
ramp — the ledger's finding, measured off one deterministic object rather than
1,325 patches of a photograph. The owner's fix takes green 9 → 42.

`qa/gamutzero.mjs` already polices this defect on frames and does it well. The
sphere column is not a replacement for it: gamutzero says *how much of the
frame* is affected, this says *which authored hex to change*. They should agree,
and they do — independently, on `GOLD`'s blue and `TEAL`'s red (§8).

---

## 8. THE BAR, AND ITS DERIVATION

**Column 1 — FORM. `ΔE ≥ 6` between the lit up-face and the shaded near-side
of a flat-shaded box. Barred.**

The 6 is inherited, and its original justification was a judgement, not a
derivation — I am not going to dress that up. What is new is that the *measured*
population is bimodal, and the bar can now be placed against the gap rather
than against an opinion. Per world, the highest FAIL and the lowest PASS:

| world | n | highest under 6 | lowest at or over 6 | gap |
|---|---|---|---|---|
| maple | 85 | 2.71 CASE | 6.95 BLACK_L | 4.24 |
| pirate | 72 | 5.98 PLINTH | 7.21 CASE | 1.23 |
| gameday | 74 | 5.05 CASE | 10.58 BLACK_L | 5.53 |
| lantern | 74 | 4.93 TIMBER_D | 9.41 TIMBER | 4.48 |
| **powder** | 76 | 5.97 BARK | 6.13 CHAR | **0.16** |

In four worlds of five the bar sits in a gap of 1.2 to 5.5 ΔE and the verdict
is robust. **In Powder it does not.** PLINTH 5.94, BARK 5.97 and CHAR 6.13 are
three colours inside 0.2 ΔE of the bar, and Powder's two FAILs and one PASS
there are *one instrument's resolution*, not a finding. The probe prints that
cluster and says so on every run; nobody should act on a Powder verdict inside
5.8–6.4 without a photograph.

Written into the header rather than tuned around.

**Column 2 — CHANNEL LIFE. Printed, sorted, NOT barred.**

Distinct 8-bit codes per channel across the sphere's ramp. I tried to derive a
bar for it and I could not, so it does not get one.

I built the derivation the honest way — `qa/gamutzero.mjs`'s negative control,
applied to this fixture: the two per-channel crushers neutralised in the served
bundle by route interception (`TOE 0.014 → 0.0002`, chroma `1.07 → 1.00`), which
proves the weak channel is *reachable* without claiming the patch is a fix. Same
bundle, same rig, `drift 0`. Per colour, `shipped ÷ control` on the worst
channel the control proves reachable (≥ 8 levels):

    0.091 B  TAN_DARK   0xa96c30      0.167 R  TEAL       0x2aa9a0
    0.103 B  ORANGE     0xe8752a      0.241 B  GOLD_D     0xd89400
    0.105 G  RED        0xd8302f      0.263 B  CRIM_D     0x92312d   (shipped)
    0.125 G  CRIM_D@retired           0.273 G  GD_HOME_A  0xc4342f
    0.152 R  GD_AWAY    0x2aa9a0      0.273 G  CRIM@retired
    0.167 B  GOLD       0xf0b429      0.977 —  CRIM       0xc4453f   (shipped)

It separates the case beautifully — the retired crimson keeps 27% of the green
the pipeline can deliver, the owner's replacement keeps 98% — and it
independently confirms `gamutzero`'s two other condemned surfaces, `GOLD`'s
blue and `TEAL`'s red, by a completely different mechanism.

**But the population is continuous.** p10 0.167, p25 0.471, p50 0.806, largest
gap anywhere in the sorted list 0.073. A bar at 0.35 condemns 17 of 80 Game Day
colours; at 0.6, 28 of 80. There is no empty band, so any threshold I picked
would be a number I chose to make the answer come out — which is retraction 10
with better manners.

So the column ships **unbarred and loud**, exactly as `gamutzero` ships its
LIT-96 census. What it needs to become a bar is an owner or art-direction call
on how much of the reachable range a surface must keep — a taste question the
data can inform and cannot settle. The three surfaces it names today
(`GD_HOME_A`, `GOLD`, `TEAL`) are actionable now without one.

**One finding from that column that should not wait.** `life.ts:853` still
declares `GD_HOME_A = 0xc4342f` — **the retired crimson, still in the tree**,
on the Game Day crowd. It measures green 9 levels of 33 reachable, ratio 0.273,
which is the retired value's number because it *is* the retired value. The
owner changed `tailgate.ts`; `life.ts` was not changed with it.

---

## 9. THE RETRACTION, FOR THE PROBE'S OWN HEADER

Standing rule 3b. This goes at the top of `qa/formsep.mjs`, above everything.

> ── RETRACTION, 2026-08-28: THIS PROBE MODELLED A PIPELINE THAT DOES NOT
> EXIST, AND ASKED A QUESTION THAT CANNOT CATCH ITS OWN HEADLINE CASE ──
>
> The version this replaces graded each palette colour offline through
> `qa/_zgrade.mjs` at two invented illumination levels. Four things were wrong
> with that, and they are worth separating because only one of them is the
> obvious one.
>
> **1. `_zgrade` modelled a pre-guard tone map.** It clamps per channel at both
> sites where the shipped shader calls `gamutGuard` (`prototype3d.ts:292,
> :322`). Its own header says in capitals that it MUST TRACK `prototype3d.ts`.
> `docs/GOVERNOR.md`'s "snapshot" retraction already names this file once, for
> modelling a toe replaced hours earlier. This is the second rot of the same
> file. **Measured, it is also the least of the four**: on the five colours this
> probe was failing, the guard moves ΔE by 0.00, −0.40, 0.00, 0.00, 0.00.
>
> **2. There was no exposure term at all.** `RIG.exposure = LIGHT.exposure`
> landed at RUNG 1 (2026-08-26) and reaches the renderer at
> `prototype3d.ts:912`. Read live: gameday 1.12, lantern 1.24, powder 1.18.
> This alone was the whole of the visible error — lantern/BLACK_L 3.83 → 7.68,
> powder/CHAR 5.67 → 7.67, powder/PLINTH 5.99 → 8.77. **Two of those three were
> false FAILs.** The third was not: powder/PLINTH renders at ΔE 5.94 and fails
> for real, so the corrected model is still wrong about it.
>
> **3. `LIT = 0.85, SHADED = 0.40` against `sunI × 1.31` was invented and is
> 2.8× and 6.3× too hot.** Measured on a real prop under the real rig, the lit
> up-face sits at k ≈ 1.00 and the shaded near-side at k ≈ 0.21, a ratio of
> 4.7× against the modelled 2.13×. For Game Day that put the "lit" sample at a
> rendered R of 251 — a level that occurs in **0.00% of reddish pixels across
> six shipped frames**, where 67–72% of them land in R 150–200. And the retired
> crimson's green is non-monotonic in light (down through k 1.0–1.4, back above
> k≈1.40), so the two samples straddled the dead zone without either falling
> in it.
>
> **4. AND FIXING ALL THREE WOULD NOT HAVE CAUGHT GAME DAY'S CRIMSON.** Line 15
> of the old header named the truck whose cab-top and body-side "are the same
> flat red". Rendered, the retired `0xc4342f` gives a lit face rgb(177,1,7)
> against a shaded rgb(54,0,1): **ΔE 58.8 against a bar of 6.** They are not the
> same colour; one is 3.3× brighter. CIE76 ΔE is dominated by ΔL*, and the
> defect was in chroma — green moved **1 code** across the whole range while red
> moved 123. **A probe whose metric cannot express the case in its own header is
> not a strict instrument, it is a differently-aimed one.** The consequence was
> not a red gate — this probe was never wired into `qa/gate.mjs` — it was ledger
> #16: five Lantern constants edited to "ΔE 7" on this model, of which two
> (CEDAR_D 4.52, TIMBER_D 4.93) still fail on the real render and three
> overshoot to 13–14. **A blind instrument does not only miss things. It aims
> the fixes.**
>
> What replaces it renders a fixture in the live page and asks two questions.
> The ΔE question is the same one, measured. The channel question is new and
> unbarred, because its population is continuous and a threshold would be
> invented (see THE BAR).

---

## 10. THE REPAIRED PROBE, IN FULL

```js
// CAN THIS COLOUR SHOW A SHAPE? — the form-separation probe.
//
//   node qa/formsep.mjs [--port=4177] [--control] [world...]
//
// ── RETRACTION, 2026-08-28 ────────────────────────────────────────────────
//   (the four-part retraction from §9 goes here verbatim)
//
// ── WHY NOT A FLATNESS TEST ───────────────────────────────────────────────
// The obvious probe after "the finale building reads as a flat silhouette" is
// to hunt for large uniform regions in a render. That probe would be wrong
// here, and confidently so: this game is primitive-assembled, untextured, and
// silhouette-first by design — a box face has constant N·L and is SUPPOSED to
// render as one flat colour. Flagging flatness would flag the house style.
//
// ── WHY A FIXTURE AND NOT A MODEL, AND NOT A PHOTOGRAPH EITHER ────────────
// The old version graded colours offline. It rotted twice (see the retraction)
// and two of its four errors were UNFIXABLE by parsing the shader, because the
// illumination it fed the grade was invented: the real lit face sits at k≈1.00
// and the real shaded face at k≈0.21, against a modelled 2.839 / 1.336, and the
// key is 0xffd9a8, not white. Modelling those means modelling the rig, the
// normals, the fill and the environment — at which point you have written a
// renderer, and there is one in the page.
//
// A PHOTOGRAPH is not the answer either. qa/gamutzero.mjs measured 17.33% and
// 22.43% on two shoots of the same build ten minutes apart and says in its own
// header not to ratchet the number. A photograph also cannot judge a colour the
// level did not happen to put on screen, and cannot name the hex to change.
//
// So: a FIXTURE. Test props of every palette colour, injected into the LIVE
// scene under the LIVE rig at the LIVE exposure, photographed off the CANVAS —
// because three@0.185.1 forces NoToneMapping when the destination is a
// WebGLRenderTarget (three.module.js:7549-7559), so a render-target read
// measures a pipeline with no ACES, no toe, no split tone and no exposure.
// Deterministic (two consecutive shoots: drift 0 in all five worlds), complete
// (every authored constant, on screen or not), and it cannot rot, because there
// is nothing in it to fall out of date.
//
// It is not a free lunch: it needs a browser and a current dist/. That is what
// most of the probes that survived in this repo already pay.
//
// ── THE TWO QUESTIONS ─────────────────────────────────────────────────────
// FORM     a flat-shaded BOX. CIE76 ΔE between the lit up-face and the shaded
//          near-side — the two surfaces the player sees on one object at once.
//          Barred at 6. See THE BAR.
// CHANNEL  a smooth SPHERE, the game's own rounded prop. Distinct 8-bit codes
//          each channel takes across the lit-pole-to-terminator ramp. UNBARRED
//          and printed. This is the question the old probe's own line 15
//          described and its metric could not ask: the Game Day truck scored
//          ΔE 58.8 (bar 6) while its green moved ONE code and its red moved 123.
//
// ── THE BAR ──────────────────────────────────────────────────────────────
// FORM: ΔE >= 6. The 6 is inherited and was originally a judgement, not a
// derivation — "a child can see that this face is not that face". What now
// stands behind it is that the MEASURED population is bimodal and the bar sits
// in the gap. Per world, highest FAIL -> lowest PASS:
//     maple    2.71 -> 6.95     gameday  5.05 -> 10.58
//     pirate   5.98 -> 7.21     lantern  4.93 ->  9.41
//     powder   5.97 -> 6.13   <-- NOT A GAP
// KNOWN LIMIT, written here rather than tuned around: in Powder, PLINTH 5.94,
// BARK 5.97 and CHAR 6.13 sit inside 0.2 ΔE of the bar. A Powder verdict in
// 5.8-6.4 is this instrument's resolution, not a finding, and the probe says so
// on every run. Do not act on one without a photograph.
//
// CHANNEL: deliberately UNBARRED. --control re-serves the bundle with the two
// per-channel crushers neutralised (TOE 0.014 -> 0.0002, chroma 1.07 -> 1.00) to
// prove the weak channel is REACHABLE — qa/gamutzero.mjs's negative control,
// which is NOT a proposed fix. Shipped/control on the worst reachable channel
// separates the case cleanly (retired crimson 0.273, the owner's replacement
// 0.977) and independently confirms gamutzero on GOLD's blue and TEAL's red.
// But the population is CONTINUOUS — p10 0.167, p25 0.471, p50 0.806, largest
// gap anywhere 0.073 — so every threshold is a number chosen to make the answer
// come out. That is retraction 10 with better manners. It gets a bar when the
// owner says how much of the reachable range a surface must keep.
import { chromium } from 'playwright';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const arg = (n, d) => { const m = process.argv.find((a) => a.startsWith(`--${n}=`)); return m ? m.split('=')[1] : d; };
const PORT = arg('port', '4177');
const CONTROL = process.argv.includes('--control');
const MIN_DE = 6;
const NEAR_BAR = [5.8, 6.4];          // the Powder cluster; see THE BAR

// ── BLACK BY DESIGN IS NOT BLACK BY ACCIDENT ─────────────────────────────
// Line-work: an eye, a nostril, a pupil, an ink mark. Meant to read as a
// featureless silhouette, drawn a few px across. Each named WITH ITS HEX so the
// exemption cannot silently widen to a different colour reusing the name.
//
// It can silently NARROW, and it did: this map keyed INK|0x241f2c (life.ts:597)
// while mainstreet.ts:126 declares a SECOND INK = 0x241f2e, two codes apart in
// blue and not exempt. The hex-keying worked exactly as intended; the old
// model's inflated ΔE is what hid the consequence. Both are listed now, and a
// third INK would show up as a FAIL rather than as silence.
const INK_BY_DESIGN = new Map([
  ['PET|0x000000',    'the pet silhouette — a few px of solid shape, never a lit surface'],
  ['INK|0x241f2c',    'life.ts face and sign line-work'],
  ['INK|0x241f2e',    'mainstreet.ts line-work — a second INK, two codes of blue apart'],
  ['LN_INK|0x241c2e', 'Lantern Night line-work'],
  ['BLACK|0x252231',  'named accent black, used as line-work'],
]);

// ── the palette scan: unchanged, and its guards are unchanged ────────────
const OWN = {
  maple: ['mainstreet.ts'], pirate: ['luxe.ts'], gameday: ['tailgate.ts'],
  lantern: ['nightmarket.ts'], powder: ['alpine.ts'],
};
const SHARED = ['island.ts', 'life.ts', 'curio.ts', 'defense.ts', 'store3d.ts', 'hatgeo.ts'];
const NO_PALETTE = new Set(['bay.ts', 'palette.ts', 'void3d.ts', 'audio3d.ts', 'fx.ts', 'rivals.ts',
  'bubbles.ts', 'gloss.ts', 'telemetry.ts', 'assets3d.ts', 'hats.ts', 'gameday.ts', 'powder.ts',
  'lantern.ts', 'newsroom.ts', 'newsroom_arc.ts', 'newsroom_react.ts', 'newsroom_gameday.ts',
  'newsroom_lantern.ts', 'newsroom_maple.ts', 'newsroom_powder.ts']);
// A world whose module yields almost nothing has not been EXAMINED. The first
// run of the original file found three colours in Maple and none in Pirate Bay
// and called Maple nearly clean.
const MIN_SAMPLE = 8;
// Indentation allowed on purpose: the bathhouse ROOF — the colour that started
// this finding — is declared INSIDE its factory at nightmarket.ts:419, and an
// anchored ^const missed exactly it. Comma-separated too: mainstreet.ts opens
// `const CREAM = 0x…, WHITE = 0x…, BONE = 0x…;`.
const HEX = /\b([A-Z][A-Z0-9_]{2,})\s*=\s*(0x[0-9a-fA-F]{6})\b/g;

function palette(world) {
  const out = [], seen = new Set();
  for (const mod of [...(OWN[world] || []), ...SHARED]) {
    let src; try { src = readFileSync(`src/proto3d/${mod}`, 'utf8'); } catch { continue; }
    for (const m of src.matchAll(HEX)) {
      const key = `${m[1]}|${m[2].toLowerCase()}`;
      if (seen.has(key)) continue; seen.add(key);
      out.push({ name: m[1], hex: parseInt(m[2], 16), mod, key });
    }
  }
  return out;
}

// ── STANDING RULE 4: read the thing itself, and THROW if it moved ────────
// Two source facts this probe depends on. Neither is transcribed; both are
// parsed, and a miss is a hard failure, not a silent skip.
const PROTO = readFileSync('src/prototype3d.ts', 'utf8');
const need = (re, what) => { const m = PROTO.match(re);
  if (!m) { console.log(`FAIL — CALL SITE MOVED: ${what}. This probe will not guess.`); process.exit(1); } return m; };
need(/exposure:\s*LIGHT\.exposure,/, 'RIG.exposure = LIGHT.exposure (RUNG 1)');
need(/renderer\.toneMappingExposure\s*=\s*RIG\.exposure;/, 'applyLightRig writing toneMappingExposure');
const WL = need(/const WORLD_LIGHT: Record<WorldId, WorldLight> = \{([\s\S]*?)\n\};/, 'WORLD_LIGHT')[1];
const EXPOSURE = {};
for (const m of WL.matchAll(/^\s{2}(\w+):\s*\{([\s\S]*?)\},$/gm)) {
  const e = m[2].match(/exposure:\s*([\d.]+)/);
  if (!e) { console.log(`FAIL — CALL SITE MOVED: WORLD_LIGHT.${m[1]} has no exposure`); process.exit(1); }
  EXPOSURE[m[1]] = +e[1];
}
const WORLDS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const RUN = WORLDS.length ? WORLDS : Object.keys(EXPOSURE);

// ── A STALE dist/ IS A STALE ANSWER ──────────────────────────────────────
// This probe photographs the BUILT bundle. If src is newer than dist, it is
// measuring a build that no longer exists — the same class of error as the
// snapshot, arriving from the other direction.
const newest = (d) => readdirSync(d, { withFileTypes: true })
  .reduce((t, e) => Math.max(t, e.isDirectory() ? newest(join(d, e.name)) : statSync(join(d, e.name)).mtimeMs), 0);
if (newest('src') > newest('dist/assets')) {
  console.log('FAIL — src/ is newer than dist/. Run `npm run build` from artifacts/3d-game '
    + '(NEVER the repo root) before this probe: it photographs the bundle, not the source.');
  process.exit(1);
}

// ── unclassified modules: a clean run means nothing until every module is placed
const claimed = new Set([...Object.values(OWN).flat(), ...SHARED, ...NO_PALETTE]);
const unclassified = [];
for (const f of readdirSync('src/proto3d')) {
  if (!f.endsWith('.ts') || claimed.has(f)) continue;
  const n = [...readFileSync(`src/proto3d/${f}`, 'utf8').matchAll(HEX)].length;
  if (n >= MIN_SAMPLE) unclassified.push(`${f} (${n} colours)`);
}
if (unclassified.length) {
  for (const u of unclassified) console.log(`  · src/proto3d/${u} carries a palette and is in neither OWN, `
    + 'SHARED nor NO_PALETTE. Nothing has looked at it, and a clean run means nothing until it is placed');
  console.log(`\nFAIL — ${unclassified.length} module(s) with palettes are unclassified`);
  process.exit(1);
}

// ── CIE76, on sRGB bytes read off the canvas ─────────────────────────────
const s2l = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const fl = (t) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + 16 / 116;
const lab = ([r, g, b]) => { const R = s2l(r), G = s2l(g), B = s2l(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = (R * 0.2126 + G * 0.7152 + B * 0.0722);
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  return [116 * fl(Y) - 16, 500 * (fl(X) - fl(Y)), 200 * (fl(Y) - fl(Z))]; };
const dE = (a, b) => { const p = lab(a), q = lab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };

// ── the fixture, run inside the page ─────────────────────────────────────
async function shootWorld(browser, world, cols) {
  const p = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  if (CONTROL) await p.route('**/assets/main-*.js', async (r) => {
    const res = await r.fetch(); const before = await res.text();
    const patched = before.replace('const float TOE = 0.014;', 'const float TOE = 0.0002;')
                          .replace('mix( vec3( l ), color, 1.07 )', 'mix( vec3( l ), color, 1.0 )');
    if (patched === before) throw new Error('CONTROL: neither crusher found in the served bundle — the shader moved');
    await r.fulfill({ status: 200, headers: { 'content-type': 'application/javascript' }, body: patched });
  });
  await p.addInitScript(() => { try {
    localStorage.clear();                       // a FRESH profile, so the match is HOURS[w][0] — the shipped rig
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    // the key is a COMMA-JOINED string (unlocks.ts:39), not JSON — see the
    // voidUnlocked note at the end of docs/GOVERNOR.md's retractions
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
  } catch { } });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${world}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.evaluate(() => document.getElementById('btnPlay')?.click());
  await p.waitForTimeout(1400);
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`)?.click(), world);
  // MATCH seconds, never wall seconds: under swiftshader the clock runs 14-40x
  // slow (qa/_clockrate.mjs). applyHour runs in beginMatch, and the exposure
  // assertion below is only meaningful once it has.
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => window.__pinQuality(0));
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 1.5, null, { timeout: 400000 });

  const out = await p.evaluate(({ cols, S }) => {
    const THREE = window.__THREE, R = window.__renderer, scene = window.__scene;
    const gl = R.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    // the shader running in THIS page, not the one in src
    if (!THREE.ShaderChunk.tonemapping_pars_fragment.includes('gamutGuard'))
      return { err: 'the running bundle carries no gamutGuard — this is not the shipped tone map' };
    // the prop materials, FOUND, not constructed
    let flat = null, smooth = null;
    scene.traverse((o) => { const m = o.material;
      if (!m || Array.isArray(m) || !m.isMeshStandardMaterial || !m.vertexColors) return;
      if (m.flatShading) flat ||= m; else smooth ||= m; });
    if (!flat || !smooth) return { err: 'no vertexColors MeshStandardMaterial pair in the live scene — '
      + 'PROP_SHARED_MAT / PROP_SMOOTH_MAT moved or nothing is built yet' };

    const dir = new THREE.Vector3(); window.__cam.getWorldDirection(dir);
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir).normalize();
    // y=900: above every occluder, outside the shadow camera, and the ortho eye
    // sits 45 units off so scene.fog (near 224+) cannot reach the fixture
    const P = new THREE.Vector3(0, 900, 0);
    const COLS = 6, ROWS = Math.ceil(cols.length / COLS), GAP = 14;   // 6 keeps the sphere disc >= 300 px; see KNOWN LIMITS
    const _c = new THREE.Color(), group = new THREE.Group(), boxes = [], balls = [];
    const paint = (g, hex) => {                    // exactly island.ts:4168 — Uint16 normalised, LINEAR
      const n = g.getAttribute('position').count; _c.setHex(hex);
      const buf = new Uint16Array(n * 3);
      const r = Math.round(_c.r * 65535), gg = Math.round(_c.g * 65535), b = Math.round(_c.b * 65535);
      for (let i = 0; i < n; i++) { buf[i * 3] = r; buf[i * 3 + 1] = gg; buf[i * 3 + 2] = b; }
      g.setAttribute('color', new THREE.BufferAttribute(buf, 3, true));
      g.setAttribute('aGloss', new THREE.BufferAttribute(new Float32Array(n), 1));
      return g;
    };
    // uFade is a uniform on a SHARED program: a mesh with no hook inherits the
    // previous occluder's value and can vanish (island.ts:4077).
    const hook = function () { const sh = this.material?.userData?.shader; if (sh) sh.uniforms.uFade.value = 1; };
    for (let i = 0; i < cols.length; i++) {
      const cx = (i % COLS) - (COLS - 1) / 2, cy = (ROWS - 1) / 2 - Math.floor(i / COLS);
      const at = P.clone().addScaledVector(right, cx * (S * 2 + GAP)).addScaledVector(up, cy * (S + GAP));
      const bx = new THREE.Mesh(paint(new THREE.BoxGeometry(S, S, S), cols[i].hex), flat);
      const bl = new THREE.Mesh(paint(new THREE.SphereGeometry(S * 0.48, 32, 24), cols[i].hex), smooth);
      bx.position.copy(at).addScaledVector(right, -S * 0.6);
      bl.position.copy(at).addScaledVector(right, S * 0.6);
      for (const m of [bx, bl]) { m.userData.fade = 1; m.onBeforeRender = hook; group.add(m); }
      boxes.push(bx); balls.push(bl);
    }
    scene.add(group);

    const hw = COLS * (S * 2 + GAP) / 2, hh = ROWS * (S + GAP) / 2, asp = W / H;
    const fw = Math.max(hw, hh * asp), fh = fw / asp;
    const cam = new THREE.OrthographicCamera(-fw, fw, fh, -fh, 0.1, 200);
    cam.position.copy(P).addScaledVector(dir, -45); cam.up.copy(up); cam.lookAt(P);
    cam.updateMatrixWorld(); cam.updateProjectionMatrix();

    const shoot = () => { R.setRenderTarget(null); R.render(scene, cam);      // the CANVAS, never a render target
      const b = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, b); return b; };
    const A = shoot(), A2 = shoot();
    let drift = 0; for (let i = 0; i < A.length; i++) drift = Math.max(drift, Math.abs(A[i] - A2[i]));

    const at = (buf, v) => { const q = v.clone().project(cam);
      const o = (Math.round((q.y * 0.5 + 0.5) * H) * W + Math.round((q.x * 0.5 + 0.5) * W)) * 4;
      return [buf[o], buf[o + 1], buf[o + 2]]; };
    // the visible near-side: whichever cardinal face most faces the camera
    let side = null, best = -2;
    for (const v of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]].map((a) => new THREE.Vector3(...a))) {
      const d = v.dot(dir.clone().negate()); if (d > best) { best = d; side = v; } }

    const rows = cols.map((c, i) => {
      const bx = boxes[i], bl = balls[i];
      const lit = at(A, bx.position.clone().add(new THREE.Vector3(0, S / 2 + 0.001, 0)).addScaledVector(side, S * 0.28));
      const shd = at(A, bx.position.clone().addScaledVector(side, S / 2 + 0.001).add(new THREE.Vector3(0, -S * 0.28, 0)));
      // the sphere's disc: one prop's whole ramp, lit pole to terminator
      const q = bl.position.clone().project(cam);
      const cx = Math.round((q.x * 0.5 + 0.5) * W), cy = Math.round((q.y * 0.5 + 0.5) * H);
      const q2 = bl.position.clone().add(new THREE.Vector3(0, S * 0.48, 0)).project(cam);
      const rad = Math.abs((q2.y * 0.5 + 0.5) * H - cy) - 2;
      const seen = [new Set(), new Set(), new Set()]; let n = 0;
      for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > rad * rad) continue;
        const o = (Math.round(y) * W + Math.round(x)) * 4; n++;
        for (let ch = 0; ch < 3; ch++) seen[ch].add(A[o + ch]);
      }
      return { ...c, lit, shd, px: n, levels: seen.map((s) => s.size) };
    });
    scene.remove(group);
    for (const m of [...boxes, ...balls]) m.geometry.dispose();
    return { exposure: R.toneMappingExposure, drift, rows, discPx: rows[0]?.px ?? 0 };
  }, { cols, S: 10 });
  await p.close();
  return out;
}

// ── run ──────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const report = [];
for (const w of RUN) {
  const cols = palette(w);
  const r = await shootWorld(browser, w, cols);
  if (r.err) { console.log(`\nFAIL — ${w}: ${r.err}`); await browser.close(); process.exit(1); }
  // SILENCE IS A FAIL, and so is a fixture nobody can reproduce
  if (r.drift !== 0) { console.log(`\nFAIL — ${w}: two consecutive shoots of a static fixture differ by `
    + `${r.drift} codes. This probe's whole claim is that it is deterministic; it is not, and nothing `
    + 'it printed is evidence'); await browser.close(); process.exit(1); }
  if (!CONTROL && Math.abs(r.exposure - EXPOSURE[w]) > 1e-6) {
    console.log(`\nFAIL — ${w}: renderer.toneMappingExposure is ${r.exposure}, WORLD_LIGHT says `
      + `${EXPOSURE[w]}. Either the rig regressed or dist/ is stale — see qa/rigexposure.mjs`);
    await browser.close(); process.exit(1);
  }
  if (r.rows.length < MIN_SAMPLE) { console.log(`\nFAIL — ${w}: only ${r.rows.length} palette colours found in `
    + `${[...(OWN[w] || []), ...SHARED].join(', ')}. That world is not being examined, and a clean result `
    + 'for it means nothing'); await browser.close(); process.exit(1); }
  report.push({ w, ...r, rows: r.rows.map((x) => ({ ...x, de: dE(x.lit, x.shd) })) });
}
await browser.close();

const exempt = (r) => INK_BY_DESIGN.has(`${r.name}|0x${r.hex.toString(16).padStart(6, '0')}`);
let bad = 0, near = 0;
console.log('');
for (const { w, exposure, rows, discPx } of report) {
  const under = rows.filter((r) => r.de < MIN_DE && !exempt(r)).sort((a, b) => a.de - b.de);
  bad += under.length;
  console.log(`  ${w.padEnd(9)} ${String(rows.length).padStart(3)} palette colours @ exposure ${exposure}, `
    + `${discPx} px/ramp — ${String(under.length).padStart(2)} cannot show form (ΔE < ${MIN_DE})`
    + (under.length ? `  — ${under.slice(0, 6).map((r) => r.name).join(', ')}` : ''));
}
console.log('');
for (const { w, rows } of report) for (const r of rows.filter((x) => x.de < MIN_DE && !exempt(x)).sort((a, b) => a.de - b.de))
  console.log(`  · ${w}/${r.name} 0x${r.hex.toString(16).padStart(6, '0')} (${r.mod}): a lit face renders `
    + `rgb(${r.lit.join(',')}) and a shaded face rgb(${r.shd.join(',')}) — ΔE ${r.de.toFixed(1)} against a bar `
    + `of ${MIN_DE}. Any prop painted this colour has no form: its top and its side are the same colour`);

// THE POWDER CLUSTER — see THE BAR. Printed on every run, in either direction.
for (const { w, rows } of report) for (const r of rows.filter((x) => x.de >= NEAR_BAR[0] && x.de <= NEAR_BAR[1] && !exempt(x))) {
  near++;
  console.log(`  ~ ${w}/${r.name} 0x${r.hex.toString(16).padStart(6, '0')}: ΔE ${r.de.toFixed(2)} — inside `
    + `${NEAR_BAR[0]}-${NEAR_BAR[1]}, this instrument's resolution. Not a verdict either way; photograph it`);
}

// ── the CHANNEL column: printed, never barred ────────────────────────────
console.log('\n  CHANNEL LIFE — distinct 8-bit codes per channel across one prop\'s shading ramp.'
  + '\n  UNBARRED on purpose (see THE BAR). A channel far below its siblings is a surface whose'
  + '\n  hue is a constant: its shading is a single-channel ramp and it photographs as a fill.');
for (const { w, rows } of report) {
  const worst = rows.filter((r) => !exempt(r))
    .map((r) => ({ ...r, lo: Math.min(...r.levels), hi: Math.max(...r.levels) }))
    .filter((r) => r.hi >= 20).sort((a, b) => (a.lo / a.hi) - (b.lo / b.hi)).slice(0, 8);
  console.log(`  ${w}:`);
  for (const r of worst) console.log(`      ${String((r.lo / r.hi).toFixed(3)).padStart(6)}  ${r.name.padEnd(14)}`
    + `0x${r.hex.toString(16).padStart(6, '0')} ${r.mod.padEnd(15)} R/G/B ${r.levels.join('/')}`);
}
if (CONTROL) console.log('\n  (--control: the two per-channel crushers were neutralised in the served bundle. '
  + 'These are REACHABILITY numbers, not a shipped build.)');

if (bad) { console.log(`\nFAIL — ${bad} palette colour(s) cannot show a shape under their own world's rig`); process.exit(1); }
console.log(`\nPASS — every palette colour outside the ${INK_BY_DESIGN.size} exempted as line-work separates a lit `
  + `face from a shaded one by at least ΔE ${MIN_DE}, measured on the canvas`
  + (near ? `. ${near} colour(s) sit inside the near-bar band and are NOT settled by this run` : ''));
```

---

## 11. WHAT THE REPAIR CHANGES, IN ONE TABLE

| | shipped probe | repaired probe |
|---|---|---|
| where the grade comes from | `qa/_zgrade.mjs`, hand-written, rotted twice | the compiled shader in the page |
| exposure | absent | live off `renderer.toneMappingExposure`, asserted against `WORLD_LIGHT` |
| illumination | `0.85` / `0.40` × `sunI × 1.31`, invented | the rig itself, on a real prop |
| illuminant colour | white | `0xffd9a8`, `0xbfd4ff`, whatever is in the table |
| destination | none (arithmetic) | the **canvas** — never a `WebGLRenderTarget` |
| repeatable | yes | yes — `drift 0`, five worlds, asserted every run |
| covers off-screen colours | yes | yes |
| can catch the Game Day crimson | **no, at any setting** | yes, on the CHANNEL column (9 levels vs 42) |
| cost | instant, no browser | ~90 s per world, needs a current `dist/` |
| current verdict | 5 FAILs, 3 of them false | 13 FAILs, none of them false as far as I can measure |

---

## 12. WHAT I DID NOT DO, AND WHAT COMES NEXT

* **I did not touch a tracked file.** This document is the only thing written.
* **I did not bar the CHANNEL column.** §8 says why, and what would settle it.
* **I did not fix the colours it now condemns.** `CASE`, `PLINTH`, `CEDAR_D`,
  `TIMBER_D`, `BARK`, the two `CHAR`s and `GD_HOME_A` are findings, not patches.
  `CASE` and `PLINTH` are shared-module colours and changing them moves all
  five worlds — the reason ledger #16 left them alone, still valid, now for a
  measured reason rather than a modelled one.
* **The one change I would put in front of the owner today** is
  `life.ts:853 GD_HOME_A = 0xc4342f`. That is the crimson he retired on
  2026-08-28, still in the tree, on the Game Day crowd, measuring exactly the
  number the retired value measures. It is a one-token change and it is the
  same decision he already made.
* **Known limits, written here rather than tuned around.** The fixture lights
  an unshadowed prop; a colour that only ever appears inside a cast shadow is
  judged brighter than it ships. It uses hour 0 in every world, so Game Day
  "under the floodlights" (`sunK 0.62`) is not covered — the probe should grow
  a `--hour` and does not have one. And it reads `src/` for the palette while
  photographing `dist/`; the mtime guard catches a stale build but not a build
  from a *different* dirty tree.

---

## 13. THE PROBE IN §10 HAS BEEN RUN

Standing rule 3, applied to my own proposal: the code above is not a sketch. It
was extracted verbatim from this document, syntax-checked, and run against the
live preview on the same bundle. Two worlds, real output:

```
  gameday    78 palette colours @ exposure 1.12, 325 px/ramp —  3 cannot show form (ΔE < 6)  — CHAR, PLINTH, CASE
  lantern    78 palette colours @ exposure 1.24, 300 px/ramp —  4 cannot show form (ΔE < 6)  — PLINTH, CEDAR_D, CASE, TIMBER_D

  · gameday/CHAR 0x2c2a33 (tailgate.ts): a lit face renders rgb(17,10,10) and a shaded face rgb(0,0,1) — ΔE 4.0 …
  · gameday/PLINTH 0x2a2336 (curio.ts): … rgb(15,6,12) / rgb(0,0,1) — ΔE 4.1 …
  · gameday/CASE 0x2a2038 (island.ts): … rgb(15,5,14) / rgb(0,0,1) — ΔE 5.0 …
  · lantern/PLINTH 0x2a2336 (curio.ts): … rgb(1,1,12) / rgb(0,0,2) — ΔE 3.7 …
  · lantern/CEDAR_D 0x5a4430 (nightmarket.ts): … rgb(21,11,9) / rgb(4,1,1) — ΔE 4.5 …
  · lantern/CASE 0x2a2038 (island.ts): … rgb(1,1,14) / rgb(0,0,2) — ΔE 4.7 …
  · lantern/TIMBER_D 0x5a3e2c (nightmarket.ts): … rgb(21,8,7) / rgb(3,1,1) — ΔE 4.9 …

  CHANNEL LIFE
  gameday:  0.020 TAN_DARK 0xa96c30 R/G/B 102/64/2      0.045 RED    0xd8302f R/G/B 112/5/16
            0.034 ORANGE   0xe8752a R/G/B  88/69/3      0.053 CRIM_D 0x92312d R/G/B  95/11/5
            0.038 DARK     0xc7962f R/G/B 105/82/4      0.072 GOLD   0xf0b429 R/G/B  97/82/7
  lantern:  0.030 GD_HOME_A 0xc4342f life.ts  R/G/B 33/1/8   …

FAIL — 7 palette colour(s) cannot show a shape under their own world's rig      exit 1
```

Every number in §5 reproduces exactly. It fails before any fix, which is
standing rule 2.

**And the negative control, run through the same probe** (`--control`, the two
per-channel crushers neutralised in the served bundle):

```
  gameday    78 palette colours @ exposure 1.12, 325 px/ramp —  0 cannot show form (ΔE < 6)
  CHANNEL LIFE  gameday:  0.211 CRIM_D  R/G/B 90/25/19     0.219 GD_HOME_A R/G/B 105/35/23
PASS — … measured on the canvas                                                  exit 0
```

Three FORM FAILs → **zero**, and the worst channel ratio 0.020 → 0.211. That
tells us something the shipped probe could never have said: **Game Day's three
near-black FORM failures are the toe, not the albedo.** The remedy ledger #16
chose — lift the albedo — is still the right lever, because the toe is a
five-world decision and an albedo is one constant. But the probe should not be
read as saying those hexes are badly chosen. It says those hexes cannot survive
this grade, which is a different sentence and the one that belongs to the owner.

The control is a control. Removing the toe would undo the 2026-08-24 change and
is not proposed.

---

## 14. KNOWN LIMITS — added after running it

* **The CHANNEL column's raw level counts scale with the sphere's disc area.**
  At 9 columns the disc is 107 px and Game Day's `GD_HOME_A` reads R/G/B
  85/6/12; at 6 columns it is 325 px and reads 105/35/23 on the control build.
  Counts are comparable **within one run and against a control run of the same
  geometry**, and not across fixtures of different size. That is a second reason
  the column must never be barred or ratcheted on a raw count.
* **The CHANNEL ranking is descriptive, not a verdict.** Sorting by
  min/max channel ratio puts every deeply saturated colour near the top —
  `PINK 0xff3d93` has little green *by design*. The column's job is to put the
  hex, the module and the three numbers in front of a person, not to condemn.
  Read it beside `--control`: a colour whose ratio barely moves between the two
  runs is saturated; one that jumps (retired crimson 0.030 → 0.219) is crushed.
* **Hour 0 only.** Every world is photographed on its shipped rig, which is
  right for comparability and blind to Game Day "under the floodlights"
  (`sunK 0.62`) and Powder's "last light". A `--hour` flag is the obvious next
  thing and this version does not have one.
