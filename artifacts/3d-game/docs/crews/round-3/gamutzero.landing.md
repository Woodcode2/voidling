# LANDED — `qa/gamutzero.mjs`, the repair, with C1–C9

**2026-08-28.** One file changed: `qa/gamutzero.mjs`. Nothing committed by me.
(The governor twice committed the working tree mid-flight while I was still
applying corrections — `0b1994b`, `b880667` — and both messages say so. The file
has moved on since; this note describes what is on disk now.)

`npx tsc --noEmit` exit 0. The probe runs in **3.2s** against the gate's 30s
timeout.

---

## 1. THE RETRACTION, AND WHERE IT LIVES

Rule 3b: the retraction is at the top of `qa/gamutzero.mjs`, above everything,
and it says the two things plainly.

**What the old test measured:** a channel being *exactly zero* — which is the
gamut guard's EXISTENCE. `gamutGuard` was installed to take a channel ACES drove
negative and put a small POSITIVE number in it; its value is `l·0.15m/(l+1.15m)`
for `m = −mn > 0`, strictly positive for every negative input. The day the guard
landed the exactly-zero census went to nothing by construction, in every frame,
whether or not one surface got its colour back.

**What the defect is:** a channel carrying *no information about the surface*. A
constant is a constant at code 0, at code 1, at code 4. The channel cannot
describe a cool shadow or a warm highlight, and the surface photographs as a
fill.

The predicate and the remedy's mechanism are the same operation. A probe whose
test is `== 0` cannot police a fix whose mechanism is `make it non-zero`.

---

## 2. THE CORRECTIONS, ONE BY ONE

| # | how it landed |
|---|---|
| **C1** information floor | **APPLIED VERBATIM.** All four anchors matched once. The proof it is the skeptic's implementation and not my own re-derivation: run on the frames their numbers came from, it reproduces them exactly — `_gz3` **10.57 / 6.06 / 28.35 / 0.00 / 0.31**, floors **8 / 9 / 6 / 6 / 34**, and `_look` **10.31 / 3.38 / 39.87 / 0.63 / 0.50**. Every rho and dominant median matches their A4 table digit for digit. |
| **C2** §5's toe row | **REFUSED — see §3.** |
| **C3** §4's push row | **REFUSED — see §3.** The *lesson* landed, on my own variance measurement. |
| **C4** palette-floor justification | **APPLIED**, with the arithmetic re-run rather than copied: Game Day's key `0xffd9a8` (`prototype3d.ts:727`) has linear b/r **0.3916**, so `GOLD` under the key alone lands at **0.00996**, under QMIN 0.01533, before the grade touches it. At a rendered R of 208 the key alone puts blue at **19** (the verdict said 18 — mine is 19) and it renders **4**. I strengthened the other half: Pirate's key runs the *other* way (`0xfff2d8`, linear r/g **1.1262**) and would put its teal's red at **40** where a neutral illuminant puts it at 37 — it renders **5**. |
| **C5** do not sell the floors as co-equal | **APPLIED, AND THEN INVERTED BY C1 — see §5.1.** |
| **C6** the ledger's Lantern number | **APPLIED.** `docs/GOVERNOR.md:94` verified today as the Lantern (market) row, 65.6% → 1.8%, which is the ledger's "red pixels with G=B=0" — the monochannel condition, measured two days before this probe existed. `c775928` verified: it creates `qa/gamutzero.mjs` (+55 lines) and edits `prototype3d.ts` in one commit. Cited as the same MISTAKE, not the same instrument. The "barely alive" reading is withdrawn with a number I ran: at today's Lantern rho (0.0875 on a dominant median of 91) a channel at code 12 is moved **1.97 codes**. |
| **C7** name the frame for "two distinct green values" | **APPLIED BY REMOVAL — see §5.2.** |
| **C8** `PAL_FILES` is silent about an ADDED module | **APPLIED, WITH A NECESSARY CHANGE — see §5.3.** |
| **C9** anchor off by one | **APPLIED.** The quote is on `prototype3d.ts:263`, verified today. The landed header does not carry that quote at all, so the anchor cannot rot; the two anchors it does carry (`:276` gamutGuard, `:727` the Game Day key) were both verified against the file today. |

One thing the verdict did not ask for, added on a standing lesson: a world with
**no frame** used to be counted as a world over the bar, so a missing pack
failed with `N world(s) above 1.5%…` — a failure message naming the wrong cause,
which GOVERNOR retraction 9 says is worse than a bare failure. Missing frames now
fail on their own line.

---

## 3. WHAT I REFUSED TO CARRY

Both killed rows are absent from the landed file and from its comments. I
grepped for the figures: `2.53`, `1.22`, `36.74`, `27.36`, `33.99` — none
present.

- **§4's "chroma push 1.00 → 2.53% FAIL".** Not carried in any form. The reason
  it was killed is worth more than the row, and that survived: the BAR section
  says a reading near the bar is not a verdict, and it says it on a variance
  measurement of my own — **two shoots of the same build ten minutes apart read
  17.33% and 22.43% on Game Day.**
- **§5's "the toe was a real fix and the repaired probe says so — 36.74 →
  27.36".** Not carried. In its place the header says: *"The toe was a real fix;
  this probe is not the instrument that can resolve how much of one, and does
  not claim to be."*

The retraction does not need either. It rests on a comparison I ran today, on
one bundle, in §4.

---

## 4. THE REAL OUTPUT, ON TODAY'S BUILD

`node qa/gamutzero.mjs land`, five frames shot into the real page today — **exit
1**:

```
  palette floor QMIN 0.01533 — set by alpine.ts ORANGE_D rgb(180,92,20), of 136 constants
  source 161bef70db4c7405

  maple     rho 0.0552 on dom 176  floors info  9 / palette 20@180   lit-chromatic  867636   DEAD   9.91%  FAIL
            by channel R/G/B 384/43649/85608   at LIT 96 (unbarred) 11.66%   stamp cbb8d413a0650471
            crushed most: rgb(164,129,2)x1350 rgb(134,0,5)x856 rgb(191,9,4)x807
  pirate    rho 0.0513 on dom 195  floors info  9 / palette 20@180   lit-chromatic  486979   DEAD   3.32%  FAIL
            by channel R/G/B 819/2312/13029   at LIT 96 (unbarred) 5.21%   stamp cbb8d413a0650471
            crushed most: rgb(170,136,1)x3086 rgb(158,126,2)x2123 rgb(161,123,8)x760
  gameday   rho 0.0685 on dom 139  floors info  7 / palette 20@180   lit-chromatic  649792   DEAD  17.33%  FAIL
            by channel R/G/B 82799/2250/29357   at LIT 96 (unbarred) 16.98%   stamp alt-crimnew-752e50e7
            crushed most: rgb(5,139,120)x70210 rgb(208,153,4)x17552 rgb(4,140,114)x5770
  lantern   rho 0.0875 on dom  91  floors info  6 / palette 20@180   lit-chromatic  530266   DEAD   0.00%  ok
            by channel R/G/B 0/0/0   at LIT 96 (unbarred) 0.00%   stamp a3d19e5b697d7b9c
  powder    rho 0.0226 on dom 184  floors info 34 / palette 20@180   lit-chromatic  615319   DEAD   0.76%  ok
            by channel R/G/B 598/1719/2905   at LIT 96 (unbarred) 1.29%   stamp a3d19e5b697d7b9c
            crushed most: rgb(131,0,11)x589 rgb(3,91,128)x65 rgb(3,92,129)x54

FAIL — 3 world(s) above 1.5% of lit chromatic pixels carrying a channel
       the light cannot move by one code. Those channels are constants,
       and a constant channel cannot carry a cool shadow or a warm highlight.
```

**These are not the numbers in either document, and I am not reconciling them.**
Game Day's crimson moved at `7e3c80a`, and every Game Day figure in the proposal
and the verdict describes a build that no longer exists. The other four worlds
moved too, by ordinary shoot-to-shoot framing variance. Same three worlds fail;
none of the five numbers is the same.

The same probe on the canonical `_look` pack — what the gate reads today —
gives **10.31 / 3.38 / 39.87 / 0.63 / 0.50**, exit 1. That pack is stale
(`qa/packfresh.mjs` FAILs all five), so those are numbers about an 08:36 build.

### The retracted predicate, on the same frames

Re-implemented as `scratchpad/old.mjs` — verbatim the old `zeros >= 2` census,
every other pixel, `mx>=38`, chroma 0.3, bar 1.0%. It reproduces the proposal's
§0 transcript of the original file exactly on the canonical pack
(530422 / 4.9% / 0.08, 306547 / 2.3 / 0.00, 368024 / 7.8 / 0.23, 663217 / 0.1 /
0.00, 420629 / 0.2 / 0.00), which is why I trust it on today's frames:

| | retracted predicate | this probe |
|---|---|---|
| maple | 0.09% ok | 9.91% FAIL |
| pirate | 0.00% ok | 3.32% FAIL |
| gameday | 0.02% ok | 17.33% FAIL |
| lantern | 0.00% ok | 0.00% ok |
| powder | 0.00% ok | 0.76% ok |

**The retracted probe passes every world of today's build.**

### Rule 2, both ends, today

Two Game Day builds off ONE compiled bundle (raw `752e50e7`), served into the
same preview by route interception, same shot procedure, `toneMappingExposure`
read back as 1.12 both times:

| Game Day build | retracted predicate | this probe |
|---|---|---|
| shipped | 0.02% ok | **17.33% FAIL** |
| the two per-channel crushers off (`TOE 0.014→0.0002`, push `1.07→1.00`) | 0.00% ok | **0.10% ok** |

The retracted predicate separates a build carrying the defect from one without
it by **two hundredths of a point**. This probe separates them by **173×**, and
the clean build sits 15× under the bar. The negative control is a control, not a
proposal — removing the toe would undo the 2026-08-24 change.

On the frame the retracted predicate passed: **70,210 pixels of exactly
`rgb(5,139,120)`** — one triple over a ninth of the lit chromatic frame — a teal
whose red is pinned at 5 where its own albedo (`0x2aa9a0`) puts it at **33**,
beside a green of 139. And 17,552 of `rgb(208,153,4)`: GOLD's blue at 4 where the
albedo puts it at **34**.

---

## 5. WHAT THE VERDICT DID NOT ANTICIPATE

### 5.1 C1 and C5 contradict each other, and C1 wins

A6 measured the conjunction against the palette clause alone, found ≤0.37 points
of difference on any world, and concluded the information floor was doing
nothing. **That was true of the power-law floor** — about 2× too high, and
therefore almost never the smaller of the two. With `sens()` the information
floor lands at 6–9 codes in four of the five worlds, below the palette floor
across most of the mid-tones, and it starts binding. Measured today, each clause
alone against the conjunction:

| world | conjunction | palette only | info only |
|---|---|---|---|
| maple | 9.91 | 10.32 | 9.91 |
| pirate | 3.32 | 3.55 | 3.32 |
| **gameday** | **17.33** | **31.31** | 17.33 |
| lantern | 0.00 | 0.00 | 0.00 |
| **powder** | **0.76** | 0.76 | **3.24 FAIL** |

So the information floor removes 14 points from Game Day, and the palette clause
is the only thing between Powder's pastels and a false FAIL. Neither is
decoration. C5's text as filed would have gone into the header as a claim I had
not run and that today's build contradicts; the header now carries this table
instead.

### 5.2 The "empty band" died with the correction that the verdict itself ordered

§3 said every bar between 0.8% and 3.9% returns the same five verdicts, and B
called that arithmetically true. Under C1's floor Pirate reads **3.38%** on the
canonical pack and **3.32%** on today's — *inside* that band. A bar of 3.5% would
pass Pirate on both packs. The correction moved Pirate from 4.00 to 3.38 and
neither document noticed the band it had just closed. Today's true empty band is
**0.76% – 3.32%**, which still contains 1.5% with margin, and the header states
it that way and says the band is a property of the packs.

### 5.3 C8 as written throws on twenty modules and the probe never runs

Its loop throws for any `src/proto3d/*.ts` outside `PAL_FILES` and the four-name
exclusion list. There are **32 modules**; the ones neither scanned nor excluded
are `assets3d, audio3d, bubbles, defense, fx, gameday, gloss, hats, lantern,
newsroom{,_arc,_gameday,_lantern,_maple,_powder,_react}, powder, rivals, store3d,
telemetry` — twenty files, none of which declares a single colour constant. As
filed, the probe dies on its first run.

Landed with the condition narrowed to what C8 was actually after: throw for an
unlisted module **that declares at least one eligible constant**. Today that set
is exactly the four the verdict names, and I verified each — `hatgeo.ts` 30
constants with `GOLD_D rgb(216,148,0)` at ratio 0.00000, `luxe.ts` 24 at 0.04971
(3.2× above QMIN), `curio.ts` 2 at 0.41268, `void3d.ts` 2 at 0.15896. The
narrowed form is also *stronger*: it fires the day an existing module gains its
first constant, which C8's version could not see.

Both rule-4 throws were run rather than reasoned about. Dropping `luxe.ts` from
the exclusion list throws by name; pointing `PAL_FILES` at a renamed module
throws in `readFileSync`. Under the gate each is silence, and silence is a FAIL.

### 5.4 C7's number could not be reproduced, so I removed the claim instead

The corrected form of "the reddest 300×300 window holds two distinct green
values" is composition-bound by the verdict's own account — 1, 2, 7 and 13 across
four shoots. My own reddest-window search on the same canonical frame returned
**129** distinct green levels, because "reddest window" is not a defined
criterion and mine is not theirs. A statistic that changes by two orders of
magnitude with the window rule does not belong in a retraction. It is replaced by
a window-free number the probe prints on every run: one triple, 70,210 pixels.

### 5.5 Game Day's crimson moved; the crowd's did not

`tailgate.ts:53` is `0xc4453f` at HEAD. **`life.ts:853 GD_HOME_A` is still
`0xc4342f`** — the retired crimson — and it dresses every Game Day crowd shirt.
Both `docs/GOVERNOR.md` and `gameday-red.verdict.md` §E say `life.ts:853` moves
with `tailgate.ts:27`. It did not. Visible in the compiled bundle, where the
literal `12858415` survives twice: once in life.ts's palette block
(`ea=12858415,zr=15774761,…` beside the crowd fits) and once as a newsroom beat
flash colour, while tailgate's pair now reads `vt=12862783,el=9580845`. Not mine
to change — recorded because the ledger says it already happened.

Related, and offered only as an observation: with HEAD's crimson the probe's
condemned-GREEN column on Game Day reads **2,250** (and 1,085 on a second HEAD
shoot) where a pinned pre-HEAD-crimson shoot reads **62,825**, and the crushed
triple `rgb(177,1,7)` — 23,458 px there — is gone from the top three. What is
left is TEAL's red and GOLD's blue. Composition varies between shoots (the RED
column moved 2.6× between two shoots of the *same* crimson), so this is not a
controlled A/B and I am not offering it as one. The crimson decision belongs to
the owner and to `gameday-red.verdict.md`.

### 5.6 The shoot environment ate two of five frames

Three agents were editing `src/` while I shot. `dist/` was rebuilt under me twice
mid-sweep, and the Game Day and Powder shots died when the hashed bundle they
were loading was deleted out from under the page. The source digest changed three
times in one session (`a3d19e5b` → `cbb8d413` → `a3d19e5b` → `161bef70`), and one
of those changes was another crew reverting Game Day's crimson in the working
tree for its own A/B. That is why Game Day's row comes off a bundle **pinned by
route interception** rather than off disk, and why the header names the mechanism
instead of asserting one source digest for five frames. In this regime
`qa/packfresh.mjs` cannot be green for long, and **no reading from this probe is
a ratchet candidate.**

---

## 6. THE GATE

`qa/gate.mjs:173` puts `gamutzero` in `profiles: ['art']` only, so nothing on the
`push` or `live` path changes. Its `pf` logic re-run against the probe verbatim:

```
  tag (default: look)  exit 1   3.2s  gate verdict FAIL  FAIL — 3 world(s) above 1.5% …
  tag gz3              exit 1   3.1s  gate verdict FAIL  FAIL — 3 world(s) above 1.5% …
  tag land2            exit 1   0.6s  gate verdict FAIL  FAIL — 4 world(s) have no frame at tag 'land2' …
  tag nosuchtag        exit 1   0.1s  gate verdict FAIL  FAIL — 5 world(s) have no frame at tag 'nosuchtag' …
```

A `PASS —` line and a `FAIL —` line both sit at start-of-line where the gate's
regex expects them; no per-world line can be mistaken for a verdict; exit code
and printed verdict agree in every case; a throw prints nothing and the gate
reports "no verdict printed", which is the correct reading of a probe that could
not conclude. 3.2s against a 30s timeout.

**The art profile goes red on three worlds and stays red** until Maple's,
Pirate's and Game Day's albedos are decided. It was already red: `packfresh`
FAILs all five frames.

Two follow-ups I could not make, because I may edit only this one file:

1. **`qa/gate.mjs:175`'s `why` string is stale twice over.** It reads *"no
   chromatic surface loses colour channels to the grade — Game Day rendered
   rgb(168,0,0) out of 0xc4342f"*. The probe no longer tests losing a channel to
   zero, and `0xc4342f` is not Game Day's crimson any more. A gate step whose
   stated purpose describes the retracted predicate is the next reader's trap.
2. **The canonical pack is stale.** Verdict §D asks for a reshoot before this
   lands; overwriting `*_look.png` is outside my remit and three agents were
   shooting into that directory. It is still stale.

---

## 7. WHAT IS ON DISK

Changed: `qa/gamutzero.mjs` (383 lines). Nothing else. Not committed by me.

Untracked frames left in `qa/out/shippedlook/`, all build artefacts, none of them
the canonical pack:

| frame | what it is |
|---|---|
| `{maple,pirate,lantern,powder}_land.png` | today's five-world sweep, plain `qa/shippedlook.mjs` |
| `gameday_land.png` | a copy of `gameday_gzhead.png`, so the five-world table has a Game Day row; its stamp says `alt-crimnew-752e50e7` and the probe prints that |
| `gameday_gzhead.png` | Game Day at HEAD's crimson, bundle pinned by route interception — **17.33%** |
| `gameday_gzclean.png` | the same bundle with the two per-channel crushers off — **0.10%**, the negative control |
| `gameday_gzold.png` | the same bundle with the pre-HEAD crimson — **25.69%** |
| `gameday_land2.png` | a second plain shoot at HEAD — **22.43%**, the variance measurement |

Scripts, in the session scratchpad: `old.mjs` (the retracted predicate),
`altshoot.mjs` (the route-interception shooter, assert-then-serve),
`gatecheck.mjs` (gate `pf` logic), `pal2.mjs` (palette census and the illuminant
arithmetic), `condemned.mjs`, `levels.mjs`, `redwin.mjs`, and the three probe
variants `gz_palonly.mjs`, `gz_infoonly.mjs`, `gz_noluxe.mjs`.

Refused, and worth saying out loud: I did not edit `src/`, `qa/gate.mjs`, the
proposal or the verdict. **The proposal on disk still carries both killed rows.**
Somebody with that remit should strike them there too, or the next reader will
find 2.53% and 36.74 → 27.36 sitting in a document with no retraction on top.
