# ROUND 3 — SKEPTIC'S VERDICT on `crew:gamutzero-repair`

Ruling on `docs/crews/round-3/gamutzero-repair.proposal.md`, read in full from
disk. Working tree at `6a424e6`, source `23edb49627155522` (unchanged — the
probe recomputes it and prints it). No tracked file edited; this verdict file
is the only thing I wrote. `npm run build` green, `npx tsc --noEmit` exit 0.
Six alternate builds were rendered through Playwright route interception into
the preview already running on :4177 — nothing on disk changed but `dist/`,
from an ordinary `npm run build`. No second server was started.

---

## THE RULING — SPLIT

| section | ruling |
|---|---|
| §0 the finding, §1 the retraction | **SOUND.** I reproduced it on my own shoots and it is stronger than filed. Two text corrections, C6 and C7. |
| §2 §3 §6 §7 the repaired probe and its bar | **SOUND WITH CORRECTIONS.** It fails today, it passes on a defect-absent build I rendered twice myself, and every number I re-ran reproduced. C1 is binding and is a false-positive mechanism at exactly the level a repaired build lands on. Also C4, C5, C8. |
| §4's "chroma push 1.00 → 2.53% FAIL" row | **KILLED.** Does not replicate. I measure **1.22% — a PASS** on the same patch. Same build, opposite verdict, from framing alone. |
| §5's "the toe was a real fix and the repaired probe says so — 36.74 → 27.36" | **KILLED.** Does not replicate. My shoots of the identical two builds go **37.20 → 42.61**, the wrong way. The repaired metric cannot resolve the toe change on single shoots either. |

Net: **land it, with C1–C9 applied.** The instrument is right, the retraction
is true, and the two killed rows are decoration on top of a conclusion that
survives without them.

---

## A. WHAT I TRIED TO KILL, AND WHAT HAPPENED

### A1. THE RETRACTION IS TRUE, AND MY OWN SHOOTS MAKE IT WORSE THAN FILED

I did not take the crew's word for the three-build A/B. I rebuilt all three
tone maps myself by string-patching the compiled bundle and shooting each
through the shippedlook procedure (`sk_alt.mjs`, a one-line relaxation of the
crew's `altbuild.mjs` so a constant may match more than once).

| Game Day build | `qa/gamutzero.mjs` MONOCHANNEL | the repaired metric |
|---|---|---|
| old per-channel clip, guard off (**08-24 "before"**) | 27.22% FAIL | 37.20% FAIL |
| soft toe, guard off (**08-24 "after"**) | 23.53% FAIL | 42.61% FAIL |
| **shipped, my own control shoot** | **0.00% ok** | 38.43% FAIL |
| chroma push 1.07 → 1.00 | 0.01% ok | 1.22% **ok** |
| three albedos lifted over the knee | 0.00% ok | 4.77% FAIL |
| **push 1.00 + toe 0.014 → 0.0002 (defect absent)** | **0.00% ok** | **0.22% ok** |
| the same, reshot | 0.00% ok | **0.16% ok** |

The load-bearing comparison replicates and is not close: **the retracted metric
collapses 27.22 → 23.53 → 0.00 the moment the guard lands, while the repaired
one sits at 37–43 the whole way.** And the sharper form of it, which the
proposal does not state: **`qa/gamutzero.mjs` reads MONOCHANNEL 0.00% on the
shipped build and 0.00% on the defect-absent build.** It cannot tell the two
apart at all. That is the retraction, and it is not arguable.

On the reddest 300×300 window of my own shipped control shoot, run through the
crew's own `cropred.mjs` criterion: **45,227 crimson pixels, green min 1,
median 1, max 1 — ONE distinct value out of 256.** The crew reported two. The
same window on the defect-absent build: 44,395 pixels, green 24–49, 26 levels.

The mechanism checks out from source. `gamutGuard` (`src/prototype3d.ts:276`)
returns `l + (color - l)·(l/(l - mn·1.15))`; substituting `m = -mn > 0` for the
minimum channel gives `l·0.15m/(l + 1.15m)` exactly, strictly positive for
every `m > 0`. The probe's predicate is `(r===0)+(g===0)+(b===0) >= 2`. The
remedy's mechanism and the test's predicate are the same operation. Confirmed.

**And the probe was born on the guarded build.** `qa/gamutzero.mjs` was created
in `c775928` (2026-08-26), the same commit as the guard. Its message records
22.65% monochannel on the pre-guard frame, so rule 2 was met in the letter —
which is the point: a probe can fail before the fix and still be measuring the
fix's mechanism instead of the defect.

### A2. IT FAILS TODAY AND IT PASSES ON A CLEAN BUILD — BOTH VERIFIED

I extracted the §7 probe from the proposal by script. It is **byte-identical**
(md5 `dec6ce32669c18d78ffb635ba5757a0a`) to
`scratchpad/gamutzero.repaired.mjs`, the file the crew says it ran. That claim
is true.

Run verbatim on `_gz3`: **exit 1**, and the output reproduces §6 digit for
digit — 11.27 / 6.53 / 29.32 / 0.00 / 0.31, every ρ, every floor, every
lit-chromatic count, every LIT-96 figure, every named surface. On `_look`:
**exit 1**, 12.24 / 4.00 / 40.94 / 0.70 / 0.50 — §3's second row, exact.
`node qa/gamutzero.mjs` as it stands: **exit 0**, and §0's transcript of it is
verbatim correct.

Defect-absent: I patched `TOE 0.014 → 0.0002` and `push 1.07 → 1.00` into the
bundle and shot Game Day **twice**. **0.22% and 0.16%** against a 1.5% bar. The
crew reported 0.12%. Three independent shoots of the clean build, all under
0.25%, all ~7× under the bar. **The probe can be made to fail and can be made
to pass. Rule 2 is satisfied on both ends.**

### A3. EVERY NUMBER I RE-RAN, AND WHAT IT CAME OUT AS

Re-derived and **exact**: the §2 palette census (136 constants; mainstreet 36 /
0.02044 PUMPKIN, tailgate 26 / 0.02545 GOLD, nightmarket 25 / 0.02315
G_GRIDDLE, alpine 27 / 0.01533 ORANGE_D, island 6 / 0.05930 TEAL, life 16 /
0.02545 GD_GOLD, bay 0, palette 0); QMIN 0.01533 and the palette floor code 20
at D=180; the §0 green histograms (`_look` 15.7 / 51.0 / 66.7, `_gz3` 8.6 /
22.5 / 31.2 — their 8.7 is a rounding difference, their pixel counts are exactly
2× mine because they sample every pixel and the retracted probe samples every
other); the §0 reddest-window row for `_gz3` (39,953 px, green 0/1/6, **7**
distinct); the whole §5 hue-preservation table (TEAL 33→5 floor 13, island TEAL
37→5 floor 15, GOLD 34→4 floor 25) to the code; §10 design 3 (info floor alone
flags Powder — I get 3.57% on `_gz3` and 4.02% on `_look` against their 4.22%,
same conclusion).

Anchors verified by before-text on disk: `prototype3d.ts:276` `vec3
gamutGuard(`, `:316` `const float TOE = 0.014;`, `:321` `color = mix( vec3( l ),
color, 1.07 );`, `tailgate.ts:27/29/31` CRIM/GOLD/TEAL, `life.ts:853/855`
GD_HOME_A/GD_AWAY, `island.ts:4234` `TEAL = 0x2fb8a8`, `mainstreet.ts:115`
FAIR_C and `:213` the hex-collision comment, `qa/gate.mjs:173` `gamutzero` in
`profiles: ['art']`. All correct. One is off by one — see C9.

**Accepted without re-running:** the §4 exposure sweep (29.30 / 7.28 / 2.35 /
3.14 / 4.31), the crew's absolute 15.88 / 6.47 / 36.74 / 27.36 / 33.99 (I ran
the same builds and got different absolutes — see C2/C3), the 08-24 distinct-
level row, and §10 designs 1 and 2.

### A4. THE ATTACK THAT LANDED — the information floor is ~2× too high

This is the one thing in the proposal that is wrong rather than imprecise, and
it is wrong in the direction the brief warns about.

§2 derives `infoFloor = ceil(1/ρ)` from "sRGB is close enough to a power law
that a Lambertian surface's channels move by the same RELATIVE amount". Under a
*pure* power law that is exact. sRGB is not one: it has a linear segment below
code 10.3 and a `−0.055` offset above it. The exact relative sensitivity is

    s(c) = (1/2.4)·(c/255 + 0.055)/(c/255)     above the knee,   1.0 below it

so a channel at code 13 is `s(13)/s(180) = 0.866/0.450 = 1.92×` **more**
responsive to the same relative change in irradiance than the dominant channel
ρ was measured on. The honest floor is `min{v : v·s(v)/s(D)·ρ ≥ 1}`:

| world | ρ | dominant median | probe's floor | honest floor |
|---|---|---|---|---|
| maple | 0.0575 | 177 | 18 | **8** |
| pirate | 0.0513 | 194 | 20 | **9** |
| gameday | 0.0805 | 112 | 13 | **6** |
| lantern | 0.0886 | 86 | 12 | **6** |
| powder | 0.0229 | 179 | 44 | **34** |

**On today's build this is inert**, which is why it does not kill the proposal:
28.35 / 6.06 / 10.57 / 0.00 / 0.31 against the filed 29.32 / 6.53 / 11.27 /
0.00 / 0.31. Same three FAILs. A crude fixed floor of 6 gives the same three
FAILs too (10.50 / 4.83 / 28.35 / 0.00 / 0.30). The verdict on the shipped
build does not depend on the floor at all.

**On a repaired build it decides the verdict.** I lifted Game Day's three named
albedos over the knee `gameday-red.verdict.md` §A1 measured — CRIM
`0xc4342f → 0xc4453f` (the ledger's own recorded candidate), GOLD's blue and
TEAL's red raised to a linear ratio of 0.08 — and shot it:

| build | probe as written | with the honest floor |
|---|---|---|
| three albedos over the knee (teal via green) | **2.54% FAIL** | 0.87% ok |
| three albedos over the knee (teal via red) | **4.77% FAIL** | 2.20% FAIL |
| chroma push 1.00 only | 1.22% ok | 0.23% ok |
| defect absent | 0.22% ok | 0.15% ok |

The crimson in the repaired build renders `rgb(182,25,13)`. Blue at 13, against
a printed floor of 15 — condemned. Under the honest floor the same light moves
that channel **1.69 codes**, comfortably alive. **A gate that condemns a
channel the light moves by 1.7 codes is the gate that fails on a healthy build
and then gets switched off.** It is three lines to fix and it must be fixed
before this lands.

The same error makes §5's Lantern rhetoric wrong in the other direction:
TIMBER's green at code 12, at ρ = 0.0886, moves **1.98** codes, not 1.06. It is
not "barely alive, recorded as fixed" — it is alive. The toe finding stands
without that sentence.

### A5. THE ATTACK THAT DID NOT LAND — the palette floor and the illuminant

I expected to kill the palette floor here. §2 says *"Nothing in the art asks for
less; anything below it was put there by the grade, not by a colour someone
chose."* That is false as written: **a tinted key IS a colour someone chose.**
Game Day's sun is `0xffd9a8` (`prototype3d.ts:729`), linear b/r **0.392**, so a
perfectly hue-preserving render of `GOLD` (authored b/r 0.0254) under the key
alone lands at b/r 0.00996 — **below QMIN 0.01533**, before the grade touches
it. The justifying sentence does not survive.

**The finding survives it anyway, and I checked each one.** Under the key
alone, hue-preserving, `GOLD` at R=208 puts blue at **18**; it renders **4**.
Pirate's rig is near-neutral (sun `0xfff2d8`, warm key against a cool hemi and
fill), so its teal's red at **5** against an albedo that puts **37** is not the
light either. The three named families are crushed by something that is not the
illuminant. C4 fixes the sentence, not the conclusion.

### A6. THE TWO FLOORS ARE NOT CO-EQUAL — the ρ machinery is doing nothing

§2 sells the two floors as independent routes whose agreement is "the reason to
trust either". Measured, the conjunction **is** the palette floor:

| world | `_gz3` BOTH | palette floor alone | difference |
|---|---|---|---|
| maple | 11.27 | 11.28 | 0.01 |
| pirate | 6.53 | 6.54 | 0.01 |
| gameday | 29.32 | 29.69 | 0.37 |
| lantern | 0.00 | 0.00 | 0.00 |
| powder | 0.31 | 0.31 | 0.00 |

Same on `_look`, worst case 0.97 points. The information floor never binds on
Powder at all (44 vs a palette floor of 11–33, so `min` is always the palette
one), which means §10's design-3 rejection — "the conjunction fixes it (0.31%)
and that is why the probe uses both" — is describing the palette clause doing
the whole job on its own. Sixty lines, a `throw`, an 8-css-px patch scan and a
whole derivation move no verdict and at most 0.37 points. Keep it if you like
the second opinion; do not tell the next reader the numbers rest on it.

And the floors do not "agree to within a few codes": on Powder they are 44
against 20, 2.2× apart.

### A7. THINGS I CHECKED THAT WERE FINE

- The probe hard-fails rather than silently passing when a module is renamed
  (`readFileSync` throws) and when a frame is missing. `NCOL < 100` throws.
- ρ patch counts run 3,590–5,062 on all ten frames I shot; the `< 200` throw is
  nowhere near tripping.
- The census's tie handling (`v !== mx`) is correct for two channels at max.
- The 8-css-px patch is derived from the frame width (S = round(W/430)), so it
  does not repeat GOVERNOR retraction 9's device-pixel blindness.
- `CHROMA 0.30` really is inherited unchanged, so the two probes judge the same
  pixel population and the A/B is like for like.
- `altbuild.mjs` reproduces the `shippedlook.mjs` shot procedure step for step
  — same clicks, same `__matchState().t` waits, same `__pinQuality(0)`,
  `__setVoidR(4)`, `__setMood('cruise')`, `__pinMouth(true)`, `__calm()`. It
  reads exposure back off the renderer: **1.12** on every shot, so RUNG 1 is
  live in every build I measured.
- The stale-pack note is true and already gated: `qa/packfresh.mjs` FAILs all
  five frames, `20d3f756b27be10d != 23edb49627155522`.
- Nothing here re-proposes the guard knee, the rig, exposure or a hex; nothing
  collides with GOVERNOR's HANDS OFF list; no seeded draw is touched (the probe
  is a PNG reader and shoots nothing of its own).

---

## B. THE BAR — the specific duty

**Against a build I believe healthy, the 1.5% bar holds.** Three independent
shoots of the defect-absent build measure 0.12% (theirs), 0.22% and 0.16%
(mine). The two worlds whose palettes do not push ACES out of gamut measure
0.00–0.70% across two shoots. The margin is ~7×. §3's claim that every bar in
0.8–3.9% returns the same five verdicts on this pack is arithmetically true of
the ten readings on the table.

**But the empty band is a property of the pack, not of builds near the bar, and
the proposal presents it as the latter.** Two of my six shoots land inside it,
and one of them flips a filed verdict:

- push 1.00 only: crew **2.54% FAIL**, me **1.22% ok**.
- albedos over the knee: **2.54%** and **4.77%** on two variants of the same
  idea.

A build sitting between 1 and 5% is the *normal* state of a partially repaired
Game Day, and in that region a reshoot moves the answer by 2×. Combined with A4
— where the floor error alone is the difference between 2.54 FAIL and 0.87 ok —
the practical risk is real: **the first build somebody repairs will land near
this bar, and as filed the probe will red it.** Fix the floor (C1) and say what
the bar covers (C3), and it is a gate I would run.

I would also not ratchet this number, and the proposal already says so.

---

## C. THE CORRECTIONS — binding, verbatim, mechanically applicable

### C1 — the information floor (binding; this is the one that matters)

In §7, replace

```js
const lin = (s) => { const v = s / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
```

with

```js
const lin = (s) => { const v = s / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
// d(code)/code per d(L)/L. sRGB is NOT a power law: it is linear below code
// 10.3 and carries a -0.055 offset above it, so a weak channel is ~1.9x MORE
// responsive to the same light than the dominant channel rho was measured on.
// Modelling it as a pure power law puts the floor 2x too high, which condemns
// a channel the light moves by 1.7 codes — measured on a Game Day with its
// three albedos lifted over the knee: 2.54% FAIL as a power law, 0.87% ok here.
const sens = (c) => { const x = c / 255; return x <= 0.04045 ? 1 : (1 / 2.4) * (x + 0.055) / x; };
```

In `shadingDepth`, replace

```js
    rho.push((s[s.length - 1] - s[0]) / med);
  }
  if (rho.length < 200) throw new Error(`gamutzero: only ${rho.length} usable patches — this is not a game frame`);
  rho.sort((a, b) => a - b);
  return rho[rho.length >> 1];
}
```

with

```js
    rho.push((s[s.length - 1] - s[0]) / med); meds.push(med);
  }
  if (rho.length < 200) throw new Error(`gamutzero: only ${rho.length} usable patches — this is not a game frame`);
  rho.sort((a, b) => a - b); meds.sort((a, b) => a - b);
  return { rho: rho[rho.length >> 1], med: meds[meds.length >> 1] };
}
```

and add `const rho = [], meds = [];` in place of `const rho = [];` at the top of
that function.

Replace

```js
  const rho = shadingDepth(png);
  const infoFloor = Math.ceil(1 / rho);
```

with

```js
  const { rho, med: domMed } = shadingDepth(png);
  // the light moves a channel at level v by v * sens(v)/sens(domMed) * rho
  // codes. The floor is the lowest v that clears one code.
  const relLin = rho / sens(domMed);
  let infoFloor = 1; while (infoFloor < 255 && infoFloor * sens(infoFloor) * relLin < 1) infoFloor++;
```

Both surviving uses of `rho` in the print line are unaffected.

**Re-derived readings after this change** (I ran them): `_gz3` maple 10.57 /
pirate 6.06 / gameday 28.35 / lantern 0.00 / powder 0.31 — the same three FAILs,
same verdict, exit 1. `_look` 10.31 / 3.38 / 39.87 / 0.63 / 0.50 — same three
FAILs. Defect absent 0.15%. **No verdict in the proposal changes.** Every
number printed in §3 and §6 must be reprinted from the corrected run.

I applied this correction to the §7 text mechanically — all four anchors match
exactly once — and ran the result. It executes, and the readings above are its
output verbatim; the printed floor line becomes `floors info  8 / palette 20@180`
on maple, `9` pirate, `6` gameday, `6` lantern, `34` powder.

### C2 — §5's toe row does not replicate

Replace

> The toe was a real fix and the repaired probe says so — 36.74 → 27.36, and the
> crimson goes from `rgb(178,0,0)` to a surface with a ramp on it.

with

> The toe was a real fix — the crimson goes from `rgb(178,0,0)`, two channels on
> the floor, to a surface with a ramp on it. **The repaired metric cannot
> resolve that change on single shoots and I am not claiming it can**: I read
> 36.74 → 27.36 and the skeptic's independent shoots of the identical two builds
> read 37.20 → 42.61, both inside the Game-Day shoot-to-shoot band. What both
> shoots agree on, and what the retraction rests on, is the other column: the
> retracted metric collapses to 0.00% the moment the guard lands while the
> repaired one stays in the high thirties.

### C3 — §4's push-only row does not replicate

In the §0 and §4 tables, the row `+ chroma push 1.07→1.00 | 0.01% ok | 2.53% FAIL`
becomes

    + chroma push 1.07 -> 1.00 | 0.01% ok | 2.53% / 1.22% — STRADDLES THE BAR

and add, under §3's "not load-bearing" paragraph:

> **The empty band is a property of this pack, not of builds near the bar.** The
> push-1.00 build measures 2.53% on my shoot and 1.22% on the skeptic's — the
> same build, opposite verdicts, from framing alone. A partially repaired Game
> Day is exactly the build that lands in 1–5%, and in that region one reshoot
> moves the answer by 2×. Read a single reading between 0.8% and 4% as
> "unresolved, reshoot", not as a verdict.

### C4 — the palette floor's justification

In §2 and in the §7 header, replace

> Nothing in the art asks for less; anything below it was put there by the
> grade, not by a colour someone chose.

with

> Nothing in the art asks for less **under a neutral illuminant** — and the
> illuminant is not neutral, which is the honest limit of this floor. Game Day's
> key is `0xffd9a8`, linear b/r 0.392, so a hue-preserving render of `GOLD`
> under the key ALONE lands at b/r 0.00996, under QMIN, before the grade touches
> it. The floor is therefore a lower bound on what the ART asks for and not a
> statement about any one pixel; the per-albedo check in §5 is what carries the
> finding. Under the key alone `GOLD` puts blue at **18** at R=208 and it
> renders **4**, and Pirate's near-neutral rig puts its teal's red at 37 against
> a rendered 5.

### C5 — do not sell the two floors as co-equal

In §2, replace

> The two floors agree to within a few codes across the mid-tones … by
> completely independent arguments. That agreement is the reason to trust
> either.

with

> **The conjunction is, numerically, the palette floor.** Measured on both
> packs, `min(info, palette)` differs from the palette clause alone by at most
> 0.37 points on any world (gameday 29.32 vs 29.69; every other world ≤0.01) and
> changes no verdict; on Powder the information floor never binds at all, so
> §10's design-3 rejection is the palette clause doing the whole job. The
> information floor is kept as an independent second opinion and as a cap where
> the palette floor rises with the dominant channel — not because the census
> rests on it. The two are also not "within a few codes": on Powder they are 34
> against 20.

### C6 — the retraction misattributes the ledger's Lantern number

In §1 and the §7 header, replace

> it is the same quantity one step earlier and it moves for the same wrong
> reason — Lantern went 65.6% -> 1.8% on the toe change and was recorded in the
> ledger as fixed

with

> it is the same quantity one step earlier and it moves for the same wrong
> reason. `docs/GOVERNOR.md:94` records Lantern going 65.6% -> 1.8% on the toe
> change and writes the world down as fixed. **That number is not this probe's
> dead-channel column** — the ledger's column is "red pixels with G=B=0", which
> is the monochannel condition, and it was measured on 2026-08-24 by the toe
> commit, two days before `qa/gamutzero.mjs` existed (created in `c775928` with
> the guard). It is cited as the same MISTAKE, not as the same instrument.

### C7 — name the frame the "two distinct green values" came from

In §1 and the §7 header, replace

>     the reddest 300x300 window    44,019 red pixels; green takes TWO distinct
>                                   values out of 256

with

>     the reddest 300x300 window    on a fresh control shoot of the shipped
>     (exp/gameday_ctrl.png, NOT     build: 44,019 red pixels, green takes TWO
>      a frame in either pack)       distinct values out of 256. The skeptic's
>                                    independent control shoot reads ONE value
>                                    across 45,227. On the _gz3 pack the same
>                                    window reads 7 and on _look 13 — the count
>                                    is composition-bound; the pile-up is not.

### C8 — `PAL_FILES` is silent about a module that is ADDED

In §7, after the `NCOL < 100` throw, add

```js
// The list above is hand-written, which is half a snapshot: readFileSync throws
// if a listed module is RENAMED, but a NEW world module is simply never
// scanned and NCOL stays over 100, so its palette never reaches the floor.
// Unscanned today: luxe.ts (24 constants, min ratio 0.04971 — above QMIN, so
// nothing is wrong now), curio.ts, void3d.ts. hatgeo.ts is excluded on purpose:
// GOLD_D rgb(216,148,0) has a zero blue and would drop QMIN to zero.
const SEEN = new Set(PAL_FILES.map((f) => f.split('/').pop()));
for (const e of readdirSync('src/proto3d')) {
  if (!/\.ts$/.test(e) || SEEN.has(e) || ['hatgeo.ts', 'luxe.ts', 'curio.ts', 'void3d.ts'].includes(e)) continue;
  throw new Error(`gamutzero: src/proto3d/${e} is a module this probe has never seen — add it to PAL_FILES or to the exclusion list, do not skip`);
}
```

### C9 — one anchor off by one

`prototype3d.ts:264` → `prototype3d.ts:263`. The quoted sentence *"GOLD ships
with a dead blue, the greens and teals with a dead red"* is on 263.

---

## D. WHAT LANDING THIS DOES TO THE GATE — take it deliberately

`qa/gate.mjs:173` puts `gamutzero` in `profiles: ['art']` only, so nothing on
the `push` or `live` path changes. Risk 6 is accurate and worth restating: the
art profile goes red on three worlds the moment this lands, and it will stay red
until Game Day's, Maple's and Pirate's albedos are decided by the owner. That
is the correct state — but note the art profile is **already** red today,
because `qa/packfresh.mjs` fails all five frames on a stale pack
(`20d3f756b27be10d != 23edb49627155522`). **Reshoot the pack before landing
this**, or the first thing anyone sees is a probe failing on an 08:36 build.

---

## E. WHAT I RAN

Everything under
`/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/`.

| script | what it did |
|---|---|
| `gz_verbatim.mjs` | §7 extracted from the proposal by script; md5-identical to the crew's copy |
| `sk_any.mjs` | the §7 metric and the retracted metric side by side, on an arbitrary PNG |
| `sk_floor.mjs`, `sk_corr.mjs` | the corrected information floor, and the census under both |
| `sk_var.mjs` | verdict sensitivity: BOTH vs info-only vs palette-only vs a fixed floor of 6 vs `<=2` vs `==0` |
| `sk_pal.mjs` | QMIN re-derived, plus every `src/proto3d` module the probe does not scan |
| `sk_hist.mjs` | the red-dominant green histograms and an independent reddest-window search |
| `sk_empirical.mjs` | measured weak-channel spans against both floor models |
| `sk_alt.mjs` | `altbuild.mjs` with the exactly-once assertion relaxed to at-least-once |

Frames shot: `exp/gameday_{skctrl,skclean,skclean2,skpush,skalbedo,skalbedo2,skoldtoe,sksofttoe}.png`.
Untracked, in the scratchpad, overwriting nothing in `qa/out/shippedlook/`.

I could not kill the finding, could not kill the retraction, and could not kill
the probe. I killed two of its supporting rows and one of its two derivations.
