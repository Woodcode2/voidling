# VERIFIER — crew:powder-form

**Verdict: DIVERGENT.** Nothing is broken. Everything the verdict cleared is on
disk and compiles, both patches the verdict killed are genuinely absent, every
number I could re-derive re-derived exactly, and no render-target figure
survives as a live claim anywhere in `src/`. The no-clipping claim reproduces on
my own controlled run, on the composited canvas, at four times the landed weight.
Seven divergences, each with its fix, and one measurement trap nobody has
listed — the same family as the one that has already cost this repo eight
instruments, one rung deeper.

`HEAD b880667`, working tree as the implementer left it. I edited no source and
no probe; this file is the only thing I wrote in the repo. The `:4177` preview
was used and never restarted — `npm run build` refreshed what it serves.

---

## 0. WHAT I RAN

| | |
|---|---|
| `npx tsc --noEmit` | **exit 0** |
| `npm run build` (in `artifacts/3d-game`) | **built in 3.90s**, `main-Dc_WsdUi.js`, served on `:4177` |
| served bundle | `rgba(126,152,198` appears **once**; grain table reads `powder:[.45,.16,.22,7]` |
| working-tree `src` digest | **`161bef70db4c7405`** — the implementer's "after" |
| `HEAD` src with `island.ts` reverted | **`a3d19e5b697d7b9c`** — their "before", exactly |
| my own 16×16-tile instrument | written cold from the header description, run over 12 PNGs |
| my own live A/B | Powder, THE VILLAGE, rung 0, r = 4, settled, props hidden, four `uGrain` arms + a composited-vs-direct read, all `p.screenshot` — §1.1 and §4 |

Both digests reproduce, so patch A + patch B really are the whole `src` delta:
`git diff HEAD -- src/` is `island.ts` only, 117 insertions / 3 deletions, and
`git log 7e3c80a..HEAD --name-only -- src/` is empty.

---

## 1. THE SPECIFIC DUTY

### 1.1 Clipping — measured on rendered frames, never a render target

Every figure below is off a PNG: either `p.screenshot()` (the composited canvas)
or a committed evidence frame. No render target was read for any of it.

My own instrument, cold, over the frames on disk:

```
  file                                 medSd    flat%   meanL    >=250%   >=240%   >=230%  maxCh
  lookpair/powder_look.png            0.0036    51.3   0.5639   0.4221   0.4831   0.6456   255
  shippedlook/powder_look.png         0.0033    59.8   0.5232   0.0120   0.3190   0.7610   250   <- the pack figure
  6b207a5:shippedlook/powder_look     0.0036    53.9   0.4715   0.0000   0.3353   0.5856   248   <- PRE-RUNG
  groundgrain BEFORE (a3d19e5b...)    0.0037    52.1   0.5622   0.5767   0.6544   0.7997   255
  groundgrain AFTER  (161bef70...)    0.0096     8.1   0.5617   0.4699   0.5428   0.6840   255
  lookpair/maple_look.png             0.0172    13.3   0.4740   0.0002
  lookpair/pirate_look.png            0.0113    39.9   0.3797   0.0003
  lookpair/gameday_look.png           0.0360    17.8   0.2792   0.0006
  lookpair/lantern_look.png           0.0203    18.3   0.2732   1.2498
```

**Every cell of the five-world table now written into `island.ts:3213-3214`
reproduces on my instrument to the digit**, and all five `_look` frames carry
`src` digest `8bdf1a860df35055`, so the comment's "one build, five worlds" is
true. The PRE-RUNG frame I pulled myself out of
`git show 6b207a5:./qa/out/shippedlook/powder_look.png`; its stamp is
`4f39f902eae8f3cb` and it lands on 53.9 / 71.7 / 0.0036 exactly. Finding 1 is now
four independent implementations deep and it has not moved.

**The chain of custody holds.** Each frame's `.src` sidecar carries
`<src digest> <png sha256 prefix>` and all four bind:
`powder.png` → `161bef70db4c7405 e00c68f2a134c129` (actual `e00c68f2a134c129`),
the before frame → `a3d19e5b697d7b9c 909d102d0240d86b` (actual `909d102d0240d86b`).
Two builds, one spot, one lens. This is a real A/B and not one build
photographed twice.

**The clip direction is right and the aggregate number is not evidence.** The
pair reads `>=250` 0.5767% → 0.4699%, i.e. down. But split into eighths of the
frame it moves in *both* directions and by more than the aggregate:

```
  band(y)        >=250 BEFORE   >=250 AFTER    maxCh B/A
     0-  233        0.0000%       0.0000%       248 / 200
   233-  466        1.2117%       0.2775%       255 / 255
   466-  699        0.6453%       0.8783%       255 / 255
   699-  932        0.5160%       0.0000%       255 / 241
   932- 1165        0.3618%       0.7456%       253 / 255
  1165- 1398        0.3743%       0.8564%       255 / 255
  1398- 1631        0.4531%       1.0011%       255 / 255
  1631- 1864        1.0515%       0.0000%       255 / 200
```

Bands with no ground in them at all move their peak channel 248 → 200 and
255 → 200. That is a different crowd in the picture (`props` 179 against 143),
not a grain weight. The −0.107 pp is **content**. See divergence D3.

**What actually bounds the cost, and it is arithmetic I ran.** Two stages, both
bounded from the source rather than from anyone's frame.

*The bake.* Base `#dfe7f6` = (223, 231, 246); the crest stroke is white at
α ∈ [0.06, 0.16] (mean 0.11), the chip is white at α 0.15. Blue is the tight
channel — it starts 9 codes from 255. After n stacked crests a channel goes to
`255 − (255−c)·(1−α)^n`, so blue reads 247 at n = 1, 248.7 at n = 3 and 249.4 at
n = 4. Crest coverage is 5,200 strokes × mean 115 px × mean 3 px = 1.79 Mpx²
over 3072² = **λ 0.19**, so P(n ≥ 4) = 4.5e-5 → about **420 texels in 9.4 million
can reach 249**, and P(n ≥ 6), which is what 250 needs, is 5e-8 → **under one
texel in the whole bake**. The chips add λ 0.005 and change nothing.

*The shader.* `diffuseColor *= mix(1, g·2, uGrain.x) · mix(1, g2·2, uGrain.y)`
with the speckle authored 96–159 (`island.ts:3095`), so `g·2 ∈ [0.753, 1.247]`
and the fine/mid multipliers top out at 1 + 0.45·0.247 = **1.111** and
1 + 0.16·0.247 = **1.040**. The mottle is rescaled to mean 128, sd 26 by
`island.ts:3148-3163`, so at +3σ its multiplier is 1 + 0.22·0.616 = **1.136**.
Worst case product **≈ 1.31** — the skeptic's ×1.33, re-derived from the source
that sets those numbers. Against the ×12.37 of linear headroom at exposure 1.18,
that is nothing, and it is an ALBEDO lift, not a frame lift — the snow itself
renders far below the shoulder (the verdict's §1.2 patched-build row reads snow
at (145.1, 156.0, 181.2); his number, not mine).

**AND HERE IS THE CONTROLLED RUN, WHICH IS THE ONE THAT SETTLES IT.** My own
probe, on the patched build served at `:4177`: Powder, THE VILLAGE, rung 0,
r = 4, settled on the match clock (`camDist 129.4`, `pitch 51.83°`, `rung 0`,
`shadows true`, `pr 2`), the 12-ring eat pool hidden and **all 4,183 props hidden**
(`o.userData.fade !== undefined`) so the frame is ground + terrain + sky + hero
and the prop-crowd confound is gone. Only `uGrain` moves between arms; each arm
is a `p.screenshot()` of the composited canvas, 14 rAF apart. `LANDED2` is the
landed setting shot a second time — it is the **noise floor**, not a result.

```
  arm                        medSd    flat%   meanL    >=250%   >=240%   >=230%  maxCh
  LANDED   [.45,.16,.22,7]  0.0073     6.5   0.5838   0.0001   0.0406   0.2016   252
  SHIPPED  [.20,.06,.00,9]  0.0047    43.8   0.5908   0.0001   0.0264   0.1463   250
  LANDED2  [.45,.16,.22,7]  0.0072     6.0   0.5908   0.0001   0.0017   0.0755   254   <- noise floor
  ABSURD   [1,1,1,7]        0.0210     0.0   0.5868   0.0000   0.0077   0.0929   241
```

Three things fall out of it.

1. **The grain does not touch clipping at any weight.** `>= 250` is 0.0001% on
   all three real settings and **0.0000% at `[1,1,1,7]`** — 2.2× the landed
   weight on the fine layer, 6.3× on the mid and 4.5× on the coarse — and the
   clip share goes *down*, with the brightest pixel in the whole frame falling
   252 → 241. The
   verdict's "zero pixels newly clip" reproduces on the composited canvas, on a
   different build, with a different instrument.
2. **Almost none of Powder's clipping is ground.** The crew's props-VISIBLE
   frame at this spot on this build reads 0.4699%; my props-hidden frame reads
   **0.0001%**. Different page loads, so treat it as an order of magnitude, not
   a fourth decimal: **something like 99.9% of Powder's clipped pixels are
   props**, and no grain weight moves them. That also disposes of the
   before/after pair's −0.107 pp (D3): it was a crowd, counted twice.
3. **What the patch actually buys, cleanly.** `medSd` 0.0047 → 0.0073 and flat
   43.8% → 6.5%, against a noise floor of ±0.0001 and ±0.5 pp measured on the
   repeat arm — the effect is **26× the noise on medSd and 75× on flat share**.
   `meanL` (0.5838 / 0.5908 / 0.5908) and `maxCh` (252 / 250 / 254) move *within*
   that noise, so neither "darker" nor "brighter" is a claim this run supports.
   (The per-pixel crossing columns are noise too — `LANDED2 vs SHIPPED`, a
   repeat of the same setting, shows the same "1 newly ≥ 250" and a max rise of
   215 codes, because the arms are 14 frames apart and the hero moves. Aggregate
   shares are the only trustworthy column in a screenshot pair.)

**Answer to the duty: no, the added grain does not push Powder's highlights into
clipping.** The pack figure the brief names (0.0120%) is from `shippedlook`,
which this round established was shot at a lens the game never uses; the
comparable figure at the game's own lens on that same build is 0.4221%, and the
patched build at the same settled spot is 0.4699% — a difference the band table
shows is composition — and which the props-hidden run puts almost entirely on
the props.
Nothing in the mechanism, the authored albedo, or any frame I shot puts a pixel
into clipping that was not already there, at the landed weights or at four times
them.

### 1.2 C1 did not land

`git diff HEAD -- src/proto3d/void3d.ts` is **empty**.
`void3d.ts:605` is still `body.castShadow = false;` and `:1582` still
`body.castShadow = false;`. `grep -rn 'CAST_R' src/` returns **nothing**.
Confirmed not landed, and not landed by halves either.

### 1.3 C2 did not land

`softShadowTex` (`void3d.ts:646-657`) still reads
`0.00→0.62, 0.30→0.50, 0.58→0.28, 0.80→0.10, 1.00→0`, and the contact material at `:689`
is still `opacity: 0.62`. The killed profile is nowhere. Confirmed not landed,
and correctly not refiled.

### 1.4 No wrong-buffer figure survived into a source comment

`grep -rn '1\.0778\|1\.0777\|0\.6037\|4\.6%' src/` returns exactly one hit in
`island.ts` — `island.ts:3239`, *inside the sentence that retracts it*:

> `// patch quoted "1.0778% -> 1.0777%" out of exactly that buffer.`

That is the right way to carry a dead number. The live clip figures in the
comment (`0.0089% → 0.0087%`, "not one pixel crosses", "9 codes", `[1,1,1,7]`)
are the skeptic's canvas run and the comment names it as his, with the section
reference. Rule 3 is satisfied. (One caveat on which *canvas* — see F1.)

### 1.5 The shadow finding is standing-with-no-fix, in three places

Not dropped. It is recorded in the landing note §6, in `qa/grounding.mjs`'s own
header as retraction R1–R3 plus a "first honest run" baseline table, and — the
part that matters — the probe **prints it on every run**: `hero-cast` px, p50,
% of the world's own, and the centroid, beside the words "void3d.ts:605 is still
an unconditional false and no crew has landed a size gate."

Its arithmetic is internally consistent and I checked it: 46.9 / 12.9 = 3.64
("3.6"); 12.9 / (46.9/3) = 82% of the floor, i.e. 27.5% of the world's ("28%");
53.6 / 46.9 = 114%; 53.7 × 2/3 = 35.8. The centroid running *worse* at the small
end (1.52 at r=1.5 against 1.46 at r=4) is stated plainly as what kills C1's
argument, and §8 replaces the centroid with a gap measurement rather than
re-proposing the same sweep.

The instrument rewrite is real, not just a header claim. Against the pre-round
version (`589e31e`), `new THREE.WebGLRenderTarget(W, H)` is **deleted** and
replaced by `ren.setRenderTarget(null); ren.render(...); gl.readPixels(...)`;
the shadow toggle is `light.shadow.intensity` (a uniform), not
`renderer.shadowMap.enabled` (a program-cache key); the rung is pinned; the
settle is on the match clock; and there is a self-check that **FAILs** if the
toggle moved less than 0.1% of the frame. Both faults the implementer claims to
have found are in the code, not only in the prose.

---

## 2. WHAT I RE-DERIVED AND WHAT CAME BACK EXACT

Every number the crew put into `src/` is a number I recomputed from the source
of truth, not from their working:

| claim now in `island.ts` | my re-derivation |
|---|---|
| `PW_LAND` 5,900 × 9,500 world units | parsed the 28-vertex polygon: x 3050–8950, y 1120–10620. **Exact** |
| `295 × 475`-unit bowl at `SCALE 0.05` | `SCALE = 0.05` is `island.ts:75`. **Exact** |
| one canvas px = `0.096` scene units | 295 / 3072 = 0.09603. **Exact** |
| `125` device px/unit at `camDist 26`, `9.6` at 340 | `2·932/(2d·tan16°)` = 125.01 and 9.56; fov 32 at `prototype3d.ts:585`, `PR_TOP = 2` at `:140`, clamp `min(340, max(26, …))` at `:9268`. **Exact** |
| fine `0.49 → 6.35` · mid `0.12 → 1.54` · coarse `0.05 → 0.64` | 140×128/295, 34×128/295, 7×256/295 over the row above → 0.486/2.411/4.672/**6.354**, 0.118/0.586/1.135/**1.543**, 0.049/0.241/0.467/**0.635**. **Exact**, and better than the verdict's halved 6.3/0.63 |
| ridge 2.8–6.4 device px at the clamp, 36–84 at 26; length 97–460 at `camDist 129`; chip 0.9–3.1 / 12–41 | recomputed off the two rows above. **Exact** |
| 9 `Math.random` per ridge, 5 per chip, **91,800** | counted off the landed code: 9 × 5,200 + 5 × 9,000 = 91,800. **Exact** |
| 19,400 canvas ops | 5,200 × 2 strokes + 9,000 fillRects. **Exact** (see nit N2) |
| "3,600 soft arcs … about 5% coverage" | 3,600 · π·E[r²] with r∈[3,10] = 5.55% of a 3072². **Right** |
| Pirate's 13,000 + 9,000 | `island.ts:1407` and `:1416`. **Exact** |
| `powder 0.0036 · pirate 0.0113 · maple 0.0172 · lantern 0.0203 · gameday 0.0360`, flat 51.3% vs 13.3%, 3.1× | measured cold off the pack myself. **Every cell exact** |

Seeded draws: `island.ts:268` is `const rand = (a, b) => a + Math.random() * (b - a)`;
a grep for `mrnd|mr(|mpick|mchance` over the Powder bake returns only the
comment that says there are none; the block sits inside
`if (WORLD_ID === 'powder')`; and the shared mulberry32 (`MS.*`, `:288`) is used
for Maple's authored placement. Maple's stream cannot move. Confirmed
structurally, not taken on trust.

Two things I checked because they would have been silent bugs and were not:
the new paint is fully overpainted by steps 2–8 (rim shade, pinewood, piste,
grit road, lake, village floor, lodge apron all come after it), and **no mesh
other than `topGeo` samples `groundTex`** — the cliff wall and the underside cap
are plain-colour materials (`island.ts:3377`, `:3380`) — so the "no clip path,
texels outside the coastline are never sampled" argument is sound.

`qa/groundgrain.mjs` fails on the build it must fail on and passes on the build
it must pass on, measured by me on the two stamped frames:
**0.0037 < 0.0060 < 0.0096.** Pirate lives at 0.0133 and Maple at 0.0131 on the
one gated limb, so dropping the flat-share limb (C-4) really does stop a healthy
world reading red — Pirate is 38.5% flat live and 39.9% on the pack, both over
the 30% the proposal wanted gated.

---

## 3. DIVERGENCES

### D1. The verdict said *verbatim*, five times, into a document that was never touched

`docs/crews/round-3/powder-form.proposal.md` is **byte-for-byte unmodified**
(`git status` clean, `git diff` empty). The verdict's C-1 ("Delete from §4 … and
replace with, verbatim"), C-2 ("In the proposed comment at `island.ts:3094`,
replace … The same substitution applies to §3's table and to the sentence …"),
C-3, C-5 ("Add to §13, verbatim") and C-6 ("Add as change 0 to §9.2, verbatim"),
plus §4's "**Strike** the 'corrected it is nearer 0.9–1.0' parenthetical", were
all written as edits to that file. None were made. It still reads today:

- `:266` and `:333` — "**The clip figure is 1.0778% → 1.0777%.** Unmoved to four
  decimal places." The retracted render-target count, stated as a
  display-clipping fact, twice.
- `:192` and `:234` — the 2×-wrong texels/px table (`0.97 → 12.6`, `0.24 → 3.07`,
  `0.10 → 1.26`) in CSS pixels.
- `:749` — "corrected it is nearer **0.9–1.0**", the parenthetical the verdict
  ordered struck because the measurement runs the other way.

The corrections landed where they matter most — the source comment and the probe
headers — and the landing note is a fuller record than the proposal. But the
proposal is the document the ledger will link, its own header says only "Nothing
here is landed", and nothing in it warns a later reader off three retracted
figures. The landing note's §7 ("What I did not do") does not mention it either.

**Fix:** apply the five verbatim substitutions to
`docs/crews/round-3/powder-form.proposal.md`, or — cheaper and sufficient — put a
four-line banner under its title naming the verdict and the landing note as
superseding, and listing the three retracted figures by section and line.

### D2. The failing-run evidence exists only in ephemeral `/tmp`

`qa/out/groundgrain/powder.png` is byte-identical (`cmp`) to the implementer's
`powder_AFTER.png`. **There is no before frame in the repo.** The only copy of
it is `…/scratchpad/pf3/powder_BEFORE.png`, which dies with the container.

The landing note points readers at a pair that does not exist, twice: §5 —
"The two frames are `qa/out/groundgrain/powder.png` before and after" — and §8
item 8 — "An art-director look at the two frames in `qa/out/groundgrain/`". Both
names resolve to the same file. GOVERNOR rule 7 is explicit that ephemeral
output must be extracted before it is acted on, rule 2 makes the failing run
*the* evidence, and the skeptic's risk 8 asked for precisely this pair. `qa/out`
is not ignored and already tracks 237 evidence files, so there is no reason for
it to be outside.

**Fix:** copy `powder_BEFORE.png` and `powder_BEFORE.src` to
`qa/out/groundgrain/powder_before.png` / `.src` (the stamp
`a3d19e5b697d7b9c 909d102d0240d86b` verifies against the file), and correct the
two sentences to name the two paths.

### D3. The landing headline sells a photograph pair as a measured cost

The note's headline reads: "the frame gets very slightly DARKER while doing it
(mean luminance 0.5622 → 0.5617, any-channel ≥ 250 0.577% → 0.470%)". §5 does
add "Read them as a PAIR … the crowd has moved", and — to the crew's credit —
**none of this reached the source comment**, which carries only the controlled
one-frame figures. But the headline is what gets quoted. My band table in §1.1
shows the clip share moving both ways by up to +0.55 pp inside single bands, and
the peak channel moving 255 → 200 in bands with no ground in them. A −0.107 pp
aggregate across that is not a measurement of anything — and §1.1's props-hidden
run now says why: with the crowd gone the same spot clips at **0.0001%** at the
landed weights and **0.0001%** at the shipped ones. Essentially all of that
0.47 pp is props. The clip column in the headline is a census of the crowd.

**Fix:** in the headline, quote the controlled figure (`0.0089% → 0.0087%`, zero
crossings, +9 codes max) for the cost and keep the pair for `medSd` and flat
share, where the effect is 2.6× and swamps the confound.

### D4. C-5 was answered a third way, and the third way is better — record it

The verdict named two routes to an importable `SPOTS` (move to `qa/_spots.mjs`,
or export and entry-guard `lookpair.mjs`). Neither was taken; both probes parse
the real `const w3`, `const back` and `const SPOTS = { … };` declarations out of
`qa/lookpair.mjs` at run time and throw by name if an anchor moves. I ran that
parse standalone: it resolves all five worlds and Powder to `(40.00, 140.00)`,
which is the spot both logs report. It honours the binding constraint (no copy
of the table exists) without editing a file that was not on the edit list.

**Fix:** none to the code. Say so in the ledger, or the next crew re-derives the
same question — the landing note discloses it but the verdict's two options are
what a reader will look for.

### D5. The new block in `qa/grounding.mjs` splits a bulleted pair

The header's "TWO THINGS THE FILING OF THIS BAR GOT WRONG" list has item 1 at
`:103-109`; the inserted "THIS FILE'S OWN FIRST HONEST RUN" section then runs
`:111-127`; and item 2 — "The proposal's first limb … THE HERO NEVER CASTS" —
lands at `:128-131`, orphaned beneath a table it has nothing to do with.

**Fix:** move the inserted block to after `:131`.

### D6. Neither probe is in the gate

`qa/gate.mjs` carries an explicit step list (`:60-266`) and neither
`groundgrain` nor `grounding` is in it. The bar that was just derived, and the
standing FAIL that keeps Finding 2 alive, both run only if a human types the
command. The landing note's §7 and §8 do not name this.

**Fix:** add `groundgrain` to the `art` profile (it is a one-world, one-frame
run), and either add `grounding` with `expect: false` as a known-red — the
pattern `selftest:says-fail` already uses — or leave it out **deliberately** and
write that down in §8, so nobody assumes it is watched.

---

### D7. One number in the source was not run: "across five days"

`island.ts:3217-3218` says Finding 1 "reproduces on four frames from four builds
across **five days**". Four frames from four builds is right and I verified all
four. The span is not: the PRE-RUNG frame entered at `6b207a5`,
**Wed Aug 26 21:08** (earliest ancestor `7a9b162`, Aug 26 20:15);
`shippedlook/powder_look.png` at `c0dec56`, **Aug 27 22:09**; the `lookpair`
pack at `199d712`, **Aug 28 13:21**; the live run **Aug 28**. Three calendar
days, not five.

Nothing rests on it and it is the only one I found — but the crew's own §9 is a
rule-3 ledger of every number in the source, and this one is not in it. Rule 3
has no size threshold; that is the whole point of retraction 10.

**Fix:** write "three days", or drop the span and keep "four frames from four
builds, including a PRE-RUNG one", which is the load-bearing half and is true.

---

## 4. F1 — A TRAP NOBODY HAS LISTED, ONE RUNG DEEPER

This is not a divergence from the verdict; the verdict has it too. It is the
next layer of the same fault and it is worth a retraction line before anyone
builds on the number.

`QUALITY[0]` is `{ pr: 2.0, …, bloom: true }` (`prototype3d.ts:1077`), and
`__pinQuality(0)` calls `applyQuality()`, which sets `bloomOn = q.bloom`
(`:1128`). So **at the rung both new probes pin, the shipped frame is
`RenderPass → UnrealBloomPass → OutputPass`** (`:9688`), and — as
`ensureComposer()`'s own comment records — the grade is applied by that
`OutputPass`, at the end of the chain, on purpose.

A probe that calls `renderer.render(scene, camera)` itself writes the same
canvas and gets the grade from the material chunk, but it **skips the bloom
add**. Two live claims stand on that path:

1. `island.ts:3240-3243` — "any-channel >= 250 goes 0.0089% -> 0.0087% and NOT
   ONE PIXEL crosses into clipping" — is the verdict's §1.2 one-frame A/B, which
   is `renderer.render()` + `gl.readPixels`. A no-bloom frame.
2. `qa/grounding.mjs` — its R1 retraction ends "so the codes are the codes a
   phone shows" (`:31`), and the same claim is repeated at `:74`. At rung 0 they
   are the codes a phone would show *if the game did not compose*. The probe
   pins rung 0 and asserts `q.shadows`; it cannot see `bloomOn` at all, because
   `__quality()` does not report it.

**And this repo has already been bitten by exactly this, at exactly this rung.**
`prototype3d.ts:1087-1112` — the passage the landed comment cites as its
authority — is the *"READ THE RUNG, DO NOT ASSUME IT"* retraction: every rung in
the table said `bloom:false`, thirty lines of comment said the composer path was
not shipped, and the composer path was what shipped on every phone fast enough
to stay off the bottom rung, costing the hero 0.20 saturation because
`RenderPass` fills a render target and the grade was skipped. That was fixed by
adding the `OutputPass`. The same passage then says, in as many words:

> *"they all measure by calling `renderer.render()` into their own render
> target, which is the **DIRECT path**. No probe that renders its own frame can
> see this. `qa/shippedlook.mjs` screenshots the canvas instead, and is the only
> instrument here that can catch a whole-pipeline swap."*

The crew read the first half of that warning — do not use a render target — and
landed it well. The second half, that the probe's own `renderer.render()` is
still the direct path and the game at rung 0 is not on it, is the half nobody
has answered.

`qa/groundgrain.mjs` is clean here — it reads `p.screenshot()`, which captures
the composed canvas, and its header says so as its central design point.

**I ran the comparison, and the honest result is "no gap I can resolve."** Same
page, same settled frame, props hidden, landed weights: a `p.screenshot()` (the
composed path) and then, one frame later, `renderer.render(scene, camera)` +
`gl.readPixels` off the default framebuffer (the direct path):

```
  path                                        >=250%   >=240%   meanL    maxCh
  COMPOSITED  p.screenshot, bloom+OutputPass  0.0000   0.0081   0.5954    247
  DIRECT      renderer.render + readPixels    0.0000   0.0004   0.5915    245
```

**Both read `>= 250` at 0.0000%, so on this frame the verdict's clipping
conclusion is the same on either path.** The `>= 240` share differs by 20× and
`meanL` by +0.66% — but my own repeat arm puts the frame-to-frame noise on
`>= 240` at 0.0017%–0.0406% (a factor of 24) and on `meanL` at ±0.007, both
larger than the gap. **So I measured no difference I can attribute to the bloom
add, and I am not going to report one.** Rule 3.

What that does and does not settle: it removes the worry for *this* frame, which
was deliberately chosen to have almost no bright sources in it — the props are
hidden, and the props are where essentially all of Powder's clipping lives
(§1.1). Bloom feeds on bright sources. The measurement that would settle it is a **same-frame**
one: `gl.readPixels` from inside the page's own rAF *after* the composer has
rendered, differenced against a direct render of the identical frame, on a frame
with the props IN it. `p.screenshot` cannot give you that, because it triggers
its own capture.

**Owed:** that same-frame comparison, on a props-visible frame, in Powder and in
Game Day (the world whose clipping actually matters). Until then
`qa/grounding.mjs:31` and `:74` should say "the codes are the codes a phone shows
*on the direct path; at rung 0 the game composes*", and `__quality()` should
return `bloom` so a probe can assert which pipeline it is on — right now it
cannot see it at all.

---

## 5. NITS — recorded, not charged

- **N1.** Both new comments cite `prototype3d.ts:140` for
  `renderer.setPixelRatio`. `:140` is `const PR_TOP = 2;`, `:141` is the call.
  The patch B comment's "`pixelRatio 2 (PR_TOP, prototype3d.ts:140)`" is right;
  the patch A comment's "`renderer.setPixelRatio caps at PR_TOP = 2,
  prototype3d.ts:140`" is one line off.
- **N2.** "19,400 canvas ops against Pirate Bay's 22,000" is not like for like:
  Powder's 19,400 all execute; Pirate's 22,000 is a loop count from which the
  bay and part of the beach band are rejected (`island.ts:1409`, `:1418`, `:1421`).
  The comparison still favours Powder, so nothing turns on it.
- **N3.** "at `[1,1,1,7]` — four times these weights" (inherited verbatim from
  the verdict) is 2.2× on fine, 6.25× on mid and 4.5× on coarse. "At least four
  times on every layer" would be true and is what the run supports.
- **N4.** `qa/groundgrain.mjs`'s drift guard
  (`Math.abs(fin.drift - R) > R * 0.03`) reads the radius *after* the settle
  loop's last reassertion, so it can essentially never fire. Harmless, but it is
  not the check its message describes.


---

## 6. WHAT I ACCEPTED WITHOUT RE-RUNNING, AND SAID SO

- **`qa/determ.mjs`, both arms.** Re-running the BEFORE arm means reverting
  `island.ts` and rebuilding in a shared tree, which I was told not to do. I
  verified the *accounting* instead — Powder's bake and props are
  `Math.random`, the seeded stream is Maple-only — which makes "DIFFERS on both
  arms" structurally necessary rather than merely reported. Their
  `determ.sh`/`determ.log` are internally consistent and the script restores the
  patched file and rebuilds, which the current digest confirms it did.
- **The `b − r` colour pair (34.41 → 35.12).** Their instrument, their frames.
  It disagrees in sign with the skeptic's controlled run; the crew says so and
  puts no colour claim in the source at all, which is the right call and closes
  C-3 properly.
- **The frame cost of the coarse layer's extra `texture2D`.** Unmeasured, stated
  as unmeasured, and — I checked — absent as a number from everything that
  landed. `if (uGrain.z > 0.0)` at `island.ts:3350` is a dynamic branch that
  Powder now takes for the first time; that is a real cost and it is honestly
  open.
- **Game Day and Lantern, live through `groundgrain`.** Not run by anyone. The
  header says so and forbids moving the bar to make a build pass, which is the
  correct standing instruction.

---

## 7. THE ONE-LINE ANSWER TO EACH QUESTION I WAS ASKED

| question | answer |
|---|---|
| Does the added grain clip Powder's highlights, on rendered frames? | **No.** My own props-hidden A/B on the composited canvas reads any-channel ≥ 250 at **0.0001% at the landed weights, 0.0001% at the shipped ones, 0.0000% at `[1,1,1,7]`**. Essentially all of Powder's clipping is props, not ground. Mechanism independently bounded at ×1.31 against ×12.37 of headroom |
| Did C1 land? | **No.** `void3d.ts` untouched, `castShadow = false` at both sites, no `CAST_R` in `src/` |
| Did C2 land? | **No.** Gradient stops and `opacity: 0.62` unchanged; not refiled either |
| Did a wrong-buffer figure survive into a source comment? | **No.** The one occurrence is inside its own retraction |
| Is the shadow finding standing-with-no-fix or quietly dropped? | **Standing**, in the landing note, the probe header, and every run's output |
| Did every correction land verbatim where the verdict said verbatim? | **No — D1.** Five verbatim edits to the proposal, and one strike, were not made |
| Any number they did not run (rule 3)? | **One** — "across five days" at `island.ts:3218`, which is three (D7). Every other number in `src/` re-derived exactly. A second, in the landing headline, is a pair statistic reported as a cost (D3) |
| Did they land anything the verdict killed? | **No** |
| Does every probe still fail on the build it must fail on? | **Yes.** 0.0037 < 0.0060 < 0.0096 on the two stamped frames; `grounding` still FAILs at both radii |

---

## 8. THE STATE I LEAVE THE ROOM IN

- **I edited no source and no probe.** `git status` on `src/` and `qa/` is what
  the implementer left, plus this file.
- **`dist/` is a fresh build of the patched tree** — I ran `npm run build` once
  (`main-Dc_WsdUi.js`, 1,296,784 bytes, byte-for-byte the same size as the
  `main-Nc7Gdm7D.js` it replaced) to confirm the served bundle matches the
  working tree. Vite's content hash is not stable here; the `src` digest is.
  `:4177` was never restarted.
- **`qa/gamutzero.mjs` is modified in the tree and is NOT this crew's.** It
  belongs to `docs/crews/round-3/gamutzero.landing.md`. The powder crew's edit
  list is exactly `src/proto3d/island.ts`, `qa/groundgrain.mjs`,
  `qa/grounding.mjs` and its own landing note — `git diff --stat` confirms it.
- **`_pf3apply.mjs` and `_pf3snow.mjs` are still tracked at the repo root.**
  Swept in by another session's in-flight commit (`470a454`), flagged by the
  crew, not theirs to delete. `_pf3apply.mjs` asserts each anchor matches
  exactly once before it writes, which is the right shape; both belong under
  `qa/`.
- **`qa/out/groundgrain/` and `qa/out/grounding/` are untracked.** See D2 — the
  before frame is not in either of them.
