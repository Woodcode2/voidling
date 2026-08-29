# VERIFIER'S CHECK — `qa/gamutzero.mjs` as landed

Ruling on the landing of `docs/crews/round-3/gamutzero-repair.verdict.md` into
`qa/gamutzero.mjs`, against the landing note `gamutzero.landing.md`, the real
working-tree diff and the file on disk.

**VERDICT: DIVERGENT.** The instrument is sound and I could not break it. It
fails the build it must fail, and — the duty that mattered — **it passes a
defect-absent build that I rendered myself, all five worlds, exit 0.** Both
killed rows are absent from everything that landed. Six divergences from
"verbatim", five of them improvements the landing note discloses; one
substantive gap outside the probe (C2/C3 were never applied anywhere) and two
sentences in the header that my own measurements contradict.

I edited no source. I wrote this file, six PNG frames under
`qa/out/shippedlook/` at tags `vclean` and `vasis` (untracked, overwriting
nothing), and scripts in the session scratchpad. I did **not** run
`npm run build`: `vite build` empties `dist/` and three crews are shooting
through the preview on :4177 right now. `npx tsc --noEmit` exits 0.

---

## A. THE DUTY — DOES THE GATE FAIL A HEALTHY BUILD?

**No. I rendered one and it passes with room.**

I did not take the crew's negative control on trust and I did not reuse their
frames. I wrote my own shooter (`vfyshoot.mjs`, the `shippedlook.mjs` procedure
with the compiled bundle snapshotted, string-patched and served back through
`page.route` into the preview already on :4177 — nothing on disk changed) and
shot **all five worlds twice off one bundle**, raw `c90d8bb8`, same procedure,
same session, exposure read back off the renderer each time:

| world | as-is (`vasis`) | the two per-channel crushers off (`vclean`) | separation |
|---|---|---|---|
| maple | **10.64% FAIL** | **0.08% ok** | 133× |
| pirate | **4.14% FAIL** | **0.42% ok** | 10× |
| gameday | **17.24% FAIL** | **0.01% ok** | 1724× |
| lantern | (not shot as-is) | **0.00% ok** | — |
| powder | (not shot as-is) | **0.00% ok** | — |

`node qa/gamutzero.mjs vclean` → **`PASS — every world's colour channels can
carry the light that falls on them (bar 1.5%)`, exit 0.** Fed through
`gate.mjs`'s own `pf` rule the same output reads **PASS**.

This is strictly stronger evidence than either the proposal or the verdict
produced. Both controlled **only Game Day**; nobody had ever shot the
defect-absent build in Maple or Pirate, the two other worlds this gate reds.
The FAILs on those worlds are attributable to the two crushers, not to the
probe over-condemning: Maple 10.64 → 0.08, Pirate 4.14 → 0.42.

**Where the margin is thin, and it is not Game Day.** The worst healthy world
is Pirate at 0.42% — 3.6× under the bar, not the 15× the header quotes off Game
Day. Pirate as-is is 3.32–4.14% across four shoots. Pirate is the world that
will straddle 1.5% on a partial repair. The header already says to read
anything between the clean band and ~4% as "unresolved, reshoot"; that sentence
is load-bearing and should not be trimmed.

**It still fails what it must.** Exit 1 with three worlds over the bar on the
canonical `_look` pack, on `_gz3`, on the crew's `land` pack and on my own
`vasis` shoot. `qa/gate.mjs --profile=art --only=gamutzero` → `FAIL 3s`, with
the verdict line surfaced. Missing frames fail on their own line and the gate
picks it up (`node qa/gamutzero.mjs nosuchtag` → `FAIL — 5 world(s) have no
frame at tag 'nosuchtag'`, `pf` FAIL). Both rule-4 throws fire when provoked: I
dropped `luxe.ts` from the exclusion list (throws by name) and pointed
`PAL_FILES` at a renamed module (throws in `readFileSync`).

---

## B. THE TWO KILLED ROWS — ABSENT FROM WHAT LANDED, PRESENT IN THE PROPOSAL

`grep` over `qa/gamutzero.mjs` for `2.53`, `1.22`, `36.74`, `27.36`, `33.99` —
and for the skeptic's own `2.54`, `0.87`, `37.20`, `42.61` — returns **zero
hits on all nine**. Neither killed row survives in any form, in code or in
comment. Confirmed.

**But nobody applied C2 or C3, and the proposal on disk still asserts both.**
`docs/crews/round-3/gamutzero-repair.proposal.md` still carries
`| + chroma push 1.07 → 1.00 | partial | MONOCHANNEL 0.01% ok | 2.53% FAIL |`
at :84 and *"The toe was a real fix and the repaired probe says so — 36.74 →
27.36"* at :380, with `36.74 / 27.36 / 33.99` also live at :81–83, :89, :92,
:156, :377 and :515 — the last of those inside the proposal's copy of the probe
header. No retraction sits on top of any of them. The crew disclosed this and
called it outside its remit, which is fair; it is nevertheless the one
substantive thing the verdict ordered that no one has done. **Fix:** whoever
owns the proposal applies C2 and C3 there verbatim, or stamps the document with
a header pointing at this verdict.

---

## C. IS THE RETRACTION TRUE ABOUT WHAT THE OLD TEST MEASURED?

**Yes on the mechanism, and I confirmed it on my own frames. One sentence
overstates and needs a clause.**

`git show c775928:…/qa/gamutzero.mjs` confirms the header's quotation exactly:
the old file computed `const zeros = (r === 0) + (g === 0) + (b === 0)`, barred
`zeros >= 2` at 1.0%, printed `zeros >= 1` unbarred, sampled every other pixel
at `mx < 38` and chroma 0.3, and counted a world with no frame as a world over
the bar. Every one of those descriptions in the landed header is accurate.

I re-implemented that predicate from the c775928 source and ran it. It
reproduces the proposal's §0 transcript on `_look` to the digit
(530422 / 4.9% / 0.08, 306547 / 2.3 / 0.00, 368024 / 7.8 / 0.23,
663217 / 0.1 / 0.00, 420629 / 0.2 / 0.00), it reads
**0.09 / 0.00 / 0.02 / 0.00 / 0.00 — a PASS everywhere — on the `land` pack**,
and on **my own** shoots it reads 0.08 / 0.00 / 0.00 on the as-is build the new
probe fails at 10.64 / 4.14 / 17.24, and 0.00 across all five on the clean
build. The retracted predicate cannot separate a defective build from a clean
one. That is the retraction, and it is now confirmed by two independent hands.

The guard's algebra checks out from source (`prototype3d.ts:276-281`): with
`k = l/(l - mn·1.15)` the minimum channel comes back as `0.15·l·m/(l + 1.15m)`,
strictly positive, and every other negative channel exceeds it. Confirmed.

**The overstatement.** Header lines 16–18 say *"the day the guard landed, the
count of exactly-zero channels went to nothing, by construction, in every
frame."* That is true in float and true of the **barred** quantity (two zero
channels: 0.00–0.23% everywhere post-guard). It is **false of the count of
exactly-zero channels**, because 8-bit quantisation rounds anything under
0.5/255 back to zero. Measured on guarded frames: the `zeros >= 1` share is
**4.9 / 2.3 / 7.8 / 0.1 / 0.2 %** on `_look`, **3.8 / 4.0 / 3.7 / 0.0 / 0.3 %**
on `land`, and **5.8 / 3.1 / 1.8 %** on my own as-is shoot. Exactly-zero
channels are still all over the shipped build. **Fix, one clause:** "the count
of pixels with TWO exactly-zero channels — the quantity the bar was on — went
to nothing", and say that single zero channels survive quantisation at 3.7–7.8%
so the next reader is not surprised by the retracted column.

---

## D. THE CORRECTIONS, ONE BY ONE — WHAT LANDED AND WHERE IT DIVERGED

| # | verdict asked | what is on disk | mine |
|---|---|---|---|
| **C1** | six fenced blocks, verbatim | **all executable code byte-identical**; the `sens()` explanatory comment rewritten | **DIVERGENT (low)** |
| **C2** | replace §5's toe row in the proposal | not applied anywhere; proposal still carries it | **NOT DONE** |
| **C3** | replace §4's push row in the proposal | not applied anywhere; proposal still carries it | **NOT DONE** |
| **C4** | replace the palette-floor justification | rewritten, arithmetic re-run, blue 18→19, Pirate added | **DIVERGENT (improvement)** |
| **C5** | "the conjunction IS the palette floor" | **not landed — inverted**, replaced with a measured table | **DIVERGENT (correct)** |
| **C6** | the ledger's Lantern number | landed, prose adapted to a code comment | **APPLIED** |
| **C7** | name the frame for "two distinct greens" | applied by removal | **DIVERGENT (defensible)** |
| **C8** | throw on an unlisted module | narrowed to "unlisted **and declares a constant**" | **DIVERGENT (necessary)** |
| **C9** | anchor `:264` → `:263` | the quote and the anchor are not carried at all | **APPLIED by removal** |

**C1.** I extracted the six fenced blocks from the verdict by script. Blocks 0,
3 and 5 (the `lin` anchor and both replacements) are present byte-for-byte;
blocks 2 and 4 (the "replace this" text) are correctly absent. Block 1 diverges
from its fifth line: the verdict's

> `// Modelling it as a pure power law puts the floor 2x too high, which condemns`
> `// a channel the light moves by 1.7 codes — measured on a Game Day with its`
> `// three albedos lifted over the knee: 2.54% FAIL as a power law, 0.87% ok here.`

became four lines carrying no numbers. `const sens = …` itself is identical.
Dropping the skeptic's 2.54/0.87 is rule-3 correct — the crew did not run them
— but the landing note's "**C1 APPLIED VERBATIM**" is true of the code and not
of the comment, and the note should say so. **Fix:** amend the landing note's
C1 row to "code verbatim; the explanatory comment rewritten to drop two numbers
I did not run", or restore the sentence with the skeptic named as its source.

The proof the crew offered is real: run on the frames the skeptic's numbers came
from, the landed file reproduces them exactly — `_gz3`
**10.57 / 6.06 / 28.35 / 0.00 / 0.31** with floors **8 / 9 / 6 / 6 / 34**, and
`_look` **10.31 / 3.38 / 39.87 / 0.63 / 0.50**. I ran both. Digit for digit.

**C4.** Every figure re-derived here: Game Day's key is at
`prototype3d.ts:727` (**the verdict's `:729` is the one that was wrong**),
`0xffd9a8` linear b/r **0.391594**, GOLD (`0xf0b429`, authored b/r 0.025463)
under the key alone lands at **0.009966** against QMIN 0.01533, and at a
rendered R of 208 the key alone puts blue at **18.52 → 19**. The crew's 19
beats the verdict's 18. Pirate's `0xfff2d8` gives linear r/g **1.12624**, which
moves its teal's red from **37.5** to **40.1**. All confirmed.

**C5.** Landing C5 verbatim would have put a claim in the header that today's
build refutes. A6 measured the conjunction against the **power-law** floor,
which is ~2× too high and therefore almost never the smaller of the two; under
C1's floor both clauses bind. I built the two single-clause variants myself and
ran them on `land`:

| world | conjunction | palette only | info only |
|---|---|---|---|
| maple | 9.91 | 10.32 | 9.91 |
| pirate | 3.32 | 3.55 | 3.32 |
| gameday | **17.33** | **31.31** | 17.33 |
| lantern | 0.00 | 0.00 | 0.00 |
| powder | **0.76** | 0.76 | **3.24 FAIL** |

The header's table is exactly this. The information floor takes 14 points off
Game Day; the palette clause is the only thing keeping Powder's pastels off a
false FAIL. Refusing C5 was the right call and the substitution is measured.

**C8.** The crew's claim that C8 as written bricks the probe is **true**:
`src/proto3d` holds 32 `.ts` modules, and 20 of them are in neither `PAL_FILES`
nor the four-name exclusion list — `assets3d, audio3d, bubbles, defense, fx,
gameday, gloss, hats, lantern, newsroom{,_arc,_gameday,_lantern,_maple,_powder,
_react}, powder, rivals, store3d, telemetry` — none declaring a single eligible
constant. C8's loop would have thrown on the first of them. The narrowed
condition is the right shape and I verified the four exclusions to the digit:
`hatgeo.ts` 30 constants min **0.00000** (`GOLD_D` rgb(216,148,0)), `luxe.ts`
24 min **0.04971**, `curio.ts` 2 min **0.41268**, `void3d.ts` 2 min **0.15896**.
The census behind QMIN also reproduces exactly — 136 constants, QMIN
**0.01533** from `alpine.ts ORANGE_D rgb(180,92,20)`, with mainstreet 36 /
0.02044, tailgate 26 / 0.02545, nightmarket 25 / 0.02315, alpine 27 / 0.01533,
island 6 / 0.05930, life 16 / 0.02545, bay 0, palette 0.

**C6/C9.** `docs/GOVERNOR.md:94` is the Lantern (market) row, `65.6% → 1.8%`,
under a column headed "red pixels with G=B=0" at :89 — the monochannel
condition, exactly as the header says. `c775928` creates `qa/gamutzero.mjs`
(+55) and edits `prototype3d.ts` in one commit (it also touches `qa/gate.mjs`,
which the note does not mention and which changes nothing). The C9 quote *"GOLD
ships with a dead blue, the greens and teals with a dead red"* is on
`prototype3d.ts:263`; the landed header does not cite it, so there is no anchor
left to rot. The two anchors it does carry, `:276` `vec3 gamutGuard(` and
`:727` the Game Day key, are both correct against the file today.

---

## E. RULE 3 — EVERY NUMBER I COULD RE-RUN, RE-RAN

I re-ran every figure in the landed header and in §§1–5 of the landing note
that a frame or a source file can settle. **All of them reproduce.** The
five-world `land` table (9.91 / 3.32 / 17.33 / 0.00 / 0.76 with floors
9/9/7/6/34 and rho 0.0552/0.0513/0.0685/0.0875/0.0226); the crushed triples
`rgb(5,139,120)×70210` and `rgb(208,153,4)×17552`; the control at 0.10% and the
173× separation; `gzold` 25.69% with its green column 62,825 and
`rgb(177,1,7)×23458` against `land`'s 2,250 and `land2`'s 1,085; Lantern
0.63%/2.58% on `_look` against 0.00%/0.00% today; the condemned codes 0–8 in
Maple, Pirate and Game Day and 0–13 in Powder; 3.2s against a 30s timeout
(I measure 2.8–3.1s). The albedo arithmetic too: GD_AWAY `0x2aa9a0` puts its
red at **32.8 → 33** beside a green of 139, GOLD puts its blue at **34.07 → 34**
at R=208, and Lantern's rho 0.0875 on a dominant median of 91 moves a channel at
code 12 by **1.973 → 1.97 codes**. Surprise 5 verifies from source:
`tailgate.ts:53` is `0xc4453f` while `life.ts:853 GD_HOME_A` is still
`0xc4342f`, and the literal `12858415` survives twice in the served bundle.

**One figure does not survive the check, and it is a description, not a
measurement.** The header says *"two shoots of the SAME build ten minutes apart
measured 17.33% and 22.43% on Game Day."* Both readings are real — I reproduced
17.33% and 22.43%. The framing is not checkable as written: the two frames are
`gameday_gzhead.png` (22:06) and `gameday_land2.png` (21:37) — **29 minutes
apart**, not ten — and they carry different provenance, one a route-intercepted
patched bundle stamped `alt-crimnew-752e50e7`, the other a plain disk shoot
stamped `a3d19e5b697d7b9c`. The variance lesson stands independently: my own
third shoot of a third bundle reads 17.24%, and Pirate moved 3.32 → 4.14 and
Maple 9.91 → 10.64 between the crew's shoot and mine. **Fix:** name the two
frames and state the interval as it is, or drop the interval and cite the
spread across the four Game Day readings now on disk (17.24 / 17.33 / 22.43).

---

## F. BUGS

**None introduced.** I read the whole file and probed the edges. The `min` of
the two floors is the correct encoding of "under BOTH"; `v·sens(v)` is monotone
increasing on both sides of the sRGB knee, so the `while` loop finds the true
minimum floor rather than a local one; the `dom` tie handling, the patch
edge-step scan and the `S = round(W/430)` device-pixel derivation are all
sound; missing frames, a renamed module and an unlisted module with a constant
all throw or fail loudly rather than passing.

Two behaviours worth a later reader knowing, neither a defect in this landing:

1. **The C8 throw's blast radius is wide.** It fires the moment any module in
   `src/proto3d` declares its first `NAME = 0xrrggbb`. Six unlisted modules
   already hold bare `0xrrggbb` literals — `rivals.ts` 21, `defense.ts` 14,
   `hats.ts` 13, `assets3d.ts` 5, `fx.ts` 1, `gloss.ts` 1 — so an ordinary
   hoist-a-colour-into-a-constant refactor reds the art profile until someone
   edits this probe. That is exactly what C8 asked for and the throw names
   itself; `gate.mjs` captures stderr into the report, so the cause is visible
   even though `why_not` reads "no verdict printed".
2. **A frame with no lit chromatic pixels reads 0.00% ok.** `hot.n` of zero
   gives `Math.max(1, 0)` and a clean pass. The `< 200` patch throw catches a
   black or noisy frame but not a bright achromatic one. Pre-existing in shape,
   not introduced here, and `packfresh` is the probe that owns "is this a real
   frame of this build".

---

## G. THE GATE, AND WHAT IS STILL OPEN

`qa/gate.mjs:173` puts `gamutzero` in `profiles: ['art']` only — nothing on
`push` or `live` moves. The art profile goes red on three worlds and stays red;
it was already red because `packfresh` fails all five frames. Both are correct
states, not regressions.

Open, and none of it this crew's to close:

1. **`qa/gate.mjs:175`'s `why` string is stale twice over** — *"no chromatic
   surface loses colour channels to the grade — Game Day rendered rgb(168,0,0)
   out of 0xc4342f"*. The probe no longer tests losing a channel to zero, and
   that is no longer Game Day's crimson. A gate step whose stated purpose
   describes the retracted predicate is the next reader's trap.
2. **C2 and C3 are unapplied and the proposal still carries both killed rows.**
   §B above.
3. **The canonical `_look` pack is stale** (`20d3f756b27be10d` against a source
   that read `161bef70db4c7405` while I worked). Verdict §D asked for a reshoot
   before landing; it has not happened, and with several crews editing `src/`
   it cannot stay green for long.
4. **`life.ts:853 GD_HOME_A` did not move with `tailgate.ts:53`**, though both
   `docs/GOVERNOR.md` and `gameday-red.verdict.md` §E record that it did.
   Verified at source and in the compiled bundle. Owner's call, but the ledger
   is wrong today.

---

## H. WHAT I RAN

`npx tsc --noEmit` (exit 0) · `node qa/gamutzero.mjs` at tags `look`, `gz3`,
`land`, `land2`, `gzold`, `gzclean`, `nosuchtag`, and my own `vasis`/`vclean` ·
`node qa/gate.mjs --profile=art --only=gamutzero` · the two rule-4 throws, each
provoked · the two single-clause probe variants · the retracted predicate,
re-implemented from `c775928` · a palette/module census and the illuminant
arithmetic · six of my own frames through `vfyshoot.mjs`, route-interception
shooting into the preview already on :4177 (no second server started, nothing
on disk changed but `qa/out/shippedlook/*_v{asis,clean}.{png,src}`).

Scratchpad: `vfyshoot.mjs`, `v_old.mjs`, `v_palonly.mjs`, `v_infoonly.mjs`,
`v_noluxe.mjs`, `v_renamed.mjs`, `v_codes.mjs`, `c1verb.mjs`, `c8check.mjs`.
