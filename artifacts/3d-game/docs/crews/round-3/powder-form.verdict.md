# SKEPTIC — crew:powder-form

**Verdict: SOUND WITH CORRECTIONS, split by patch group.**

| group | verdict |
|---|---|
| FINDING 1 — Powder is flat | **SOUND.** Reproduced to the digit on four frames and three packs with my own instrument. |
| **B** — `GRAIN.powder` weights | **SOUND WITH CORRECTIONS.** The change works and costs nothing. Every number quoted for it was measured in the wrong buffer and must be replaced; the texels/px table it wants written into the source is 2× wrong. |
| **A** — the bake's wind/chip pass | **SOUND WITH CORRECTIONS.** Compiles, builds, runs, works on its own (medSd 0.0032 → 0.0081), costs no clipping. Same two corrections. |
| FINDING 2 — the mascot's shadow | **SOUND.** Confirmed on the player's pipeline with different numbers: 4.0×, not 4.9×. |
| **C1** — `body.castShadow` size gate | **NOT LANDABLE AS FILED.** It does not compile — three `tsc` errors — and the centroid measurement the whole black-ellipse question turns on reads *further out* on my instrument than the proposal's "corrected" figure, not nearer. |
| **C2** — the ring-weighted disc | **KILLED AS FILED.** Two load-bearing claims in the comment it wants written into `void3d.ts` are arithmetically false, and one of them is the exact failure the file already records. |
| `qa/groundgrain.mjs` (§9.1) | **FAILS TODAY — GOOD. Bar is wrong.** Its flat-share limb fails PIRATE BAY on the proposal's own baseline pack, and its `SPOTS` import cannot be written. |
| `qa/grounding.mjs` (§9.2) | **SOUND WITH CORRECTIONS, plus one the proposal missed** — the probe's own instrument is the un-graded buffer. |

`HEAD 6a424e6`. No tracked file edited by me; `git status` on `src/` and `qa/`
is clean and the `:4177` preview was used and never restarted. Every alternate
build was served into it by route interception. Type-checking and building were
done in a throwaway `git worktree` under the scratchpad, since removed.

---

## 0. THE ONE THING THAT MATTERS MOST

**Every "one frame, rendered twice, sRGB render target" measurement in this
document was taken in a buffer with no ACES, no toe, no split tone, no chroma
push, NO EXPOSURE and no sRGB encode.** `three@0.185.1`,
`node_modules/three/build/three.module.js:7549-7559`:

```js
let toneMapping = NoToneMapping;
if ( material.toneMapped ) {
  if ( currentRenderTarget === null || currentRenderTarget.isXRRenderTarget === true ) {
    toneMapping = renderer.toneMapping;
  }
}
```

and `:7585`, `outputColorSpace: ( currentRenderTarget === null ) ? renderer.outputColorSpace : ( … ) : ColorManagement.workingColorSpace`.
A plain `WebGLRenderTarget` is neither `null` nor `isXRRenderTarget`, so it gets
`NoToneMapping` and linear output. Setting `rt.texture.colorSpace` does not
change this in this version — only `isXRRenderTarget` reads that field.
`toneMappingExposure` is applied *inside* `CustomToneMapping`
(`prototype3d.ts:284`), so the render-target frame is not even at Powder's 1.18.

This is not a subtlety I dug out of a changelog. It is written down in this
repo, in the file the proposal cites for the grade, `prototype3d.ts:1099-1112`:

> *"three forces NoToneMapping when the destination is a render target and the
> graded CustomToneMapping is simply skipped… It also explains why every colour
> probe in `qa/` disagreed with the owner: they all measure by calling
> `renderer.render()` into their own render target, which is the DIRECT path.
> **No probe that renders its own frame can see this.**"*

Measured, not argued. Same frame, same instant, same settled camera
(`camDist 128.8`, Powder, THE VILLAGE, rung 0, R=4), read two ways:

```
  buffer                                flat%   medSd    meanL    >=250%   >=240%  maxCh  p99  p99.9
  CANVAS (gl.readPixels, default FBO)   54.2    0.0032   0.5458   0.0089   0.3967   255   219   241
  the SAME frame into a WebGLRenderTarget 54.0  0.0034   0.3524   0.9145   1.0524   255   244   255
```

Mean luminance 0.5458 against 0.3524. Any-channel ≥ 250 at **0.0089% against
0.9145%** — a factor of 103. The proposal's headline defence of my brief,
*"the clip figure is 1.0778% → 1.0777%, unmoved to four decimal places"*, is a
count of pixels exceeding **linear 0.98 before the tone curve**, most of which
ACES then pulls back down. It is not a display-clipping figure and must not be
written into a commit as one. Rule 3.

The affected tables are §4's one-frame sweep, §6.1, §6.3, §6.4 and §9.2. All of
them. **None of their conclusions dies. All of their numbers do.**

There is a second, sharper edge on the same trap, recorded because it cost me a
run and will cost the landing crew one: **rendering into a render target
re-compiles the ground material under the new tone-mapping cache key, which
re-runs `onBeforeCompile` (`island.ts:3100`) and re-points
`groundMat.userData.grainU` at a uniforms object the canvas program never
reads.** My first run did the render-target shoot first, and after that every
grain weight I set — including `[1,1,1,7]` — changed **exactly zero pixels** on
the canvas. It looks identical to "the uniform is inert". Do the canvas work
before you touch a render target, or re-find the handle after.

---

## 1. MY BRIEF, ANSWERED

### 1.1 Does the flatness claim hold? YES — reproduced to the digit

My own instrument (16×16 non-overlapping tiles, Rec.709 luminance on sRGB
bytes, sd < 0.004 = flat), run cold against the PNGs on disk. I wrote it from
the description and it landed on the proposal's numbers exactly, which is worth
more than agreement — it means we are computing the same thing.

```
  file                              flat%   bot3rd   medSd    p95/p25   >=250%    meanL
  lookpair/gameday_look.png         17.8    20.8     0.0360   4.48      0.0006    0.2792
  lookpair/lantern_look.png         18.3    31.6     0.0203   4.53      1.2498    0.2732
  lookpair/maple_look.png           13.3     3.5     0.0172   2.29      0.0002    0.4740
  lookpair/pirate_look.png          39.9    44.8     0.0113   2.62      0.0003    0.3797
  lookpair/powder_look.png          51.3    54.4     0.0036   1.28      0.4221    0.5639
  shippedlook/maple_look.png         7.5    14.8     0.0082   2.28      0.0000    0.4909
  shippedlook/powder_look.png       59.8    74.1     0.0033   1.43      0.0120    0.5232
  shippedlook/pirate_look.png        8.7    12.2     0.0103   2.23      0.0987    0.5271
  shippedlook/gameday_look.png      21.4    32.3     0.0102   3.87      0.0362    0.3188
  shippedlook/lantern_look.png      15.1    35.8     0.0079   2.87      0.4672    0.3442
  6b207a5:shippedlook/powder_look   53.9    71.7     0.0036   1.56      0.0000    0.4715   <- PRE-RUNG
```

- **My brief's two numbers: 59.8% against maple's 7.5%. Both exact.**
- **The proposal's whole §2 table: every cell exact** — 13.3/3.5/0.0172/2.29,
  39.9/44.8/0.0113/2.62, 17.8/20.8/0.0360/4.48, 18.3/31.6/0.0203/4.53,
  51.3/54.4/0.0036/1.28.
- **The pre-RUNG frame: 53.9 / 71.7 / 0.0036. Exact.** I pulled it out of
  `git show 6b207a5:…` myself. RUNG 1 did not create this.
- Ratios: 0.0113/0.0036 = **3.14×** the next flattest; 0.0360/0.0036 = **10×**
  Game Day. Both as stated.
- And live on today's build at THE VILLAGE, settled, canvas pipeline:
  **flat 54.2%, medSd 0.0032.** Five frames, four builds, two spots, one answer.

**Finding 1 is not solving nothing. It is the most solidly established number in
the document.**

### 1.2 Does the added grain blow the snow out? NO — and here is the run that says so

Powder, THE VILLAGE, rung 0, R = 4, camera settled **in page on rAF** (71 frames,
`camDist 128.78`, `pitch 51.78°` — the follow law gives 129.1 for R = 4, so this
is the lens the game uses). One frame. **`gl.readPixels` off the default
framebuffer**, so the pixels are the graded, exposed, sRGB-encoded pixels a
child sees. Only `uGrain` moves between renders; nothing is stepped in between.

```
  setting                     flat%   medSd    meanL    >=250%   >=240%   >=230%   maxCh  p99  p99.9
  shipped [0.20,0.06,0.00,9]  54.2    0.0032   0.5458   0.0089   0.3967   0.4352    255   219   241
  PROPOSED [0.45,0.16,0.22,7] 15.6    0.0072   0.5461   0.0087   0.3967   0.4350    255   219   241
  strong  [0.55,0.24,0.30,6]   5.5    0.0087   0.5448   0.0083   0.3964   0.4342    255   219   241
  lantern [0.30,0.30,0.34,7]   8.1    0.0095   0.5459   0.0087   0.3967   0.4349    255   219   241
  ABSURD  [1.00,1.00,1.00,7]   4.7    0.0240   0.5431   0.0084   0.3966   0.4345    255   219   241
  restored[0.20,0.06,0.00,9]  54.2    0.0032   0.5458   0.0089   0.3967   0.4352    255   219   241

  pixel crossings vs shipped, same frame:
    [0.45,0.16,0.22,7]  newly >=250: 0   no longer >=250: 2   brighter: 529,608   darker: 488,375   max rise: 9
    [1.00,1.00,1.00,7]  newly >=250: 0   no longer >=250: 7   brighter: 590,944   darker: 546,536   max rise: 37
```

**Zero pixels cross into clipping. Not "0.0001%" — zero.** Any-channel ≥ 250
goes **0.0089% → 0.0087%**, i.e. down. ≥ 240 and ≥ 230 are unmoved in the fourth
decimal. The largest single-channel rise anywhere in the frame is **9 codes**.
Even at `[1,1,1,7]` — a setting no one is proposing, four times the proposed
weight on every layer — nothing new clips.

And the same on the **real patched build**, patch A + patch B compiled and served
into the running preview by route interception, settled at `camDist 128.89`:

```
  setting (patch A bake in the albedo)   flat%   medSd    meanL    >=250%   >=240%   maxCh   snow rgb (b-r)
  A only  [0.20,0.06,0.00,9]             34.2    0.0081   0.5333   0.0001   0.5104    250    145.1,156.0,181.2 (36.14)
  A + B   [0.45,0.16,0.22,7]              8.0    0.0101   0.5329   0.0001   0.5104    250    145.1,155.7,180.5 (35.40)
```

Max channel in the whole frame **250**, against 255 unpatched. ≥ 250 at
**0.0001%**. The two rows are the same frame, so B on top of A is bit-identical
on both clip columns.

**Answer to my brief: no. Neither patch A nor patch B moves Powder toward
clipping, on the pipeline that renders the game.** The mechanism is not the ×8
bound the proposal quotes either — the speckle tile is authored at values
96–159 around a 128 base (`island.ts:2986-2989`) and the mottle is normalised to
mean 128, sd 26 (`island.ts:3040-3057`), so the realistic worst-case product of
the three layers at the proposed weights is **×1.33**, not ×2.05 and certainly
not ×8. Against ×12.37 of linear headroom, that is nothing, and the frames agree.

The headroom itself I re-derived rather than accepted. I transcribed
`prototype3d.ts:283-322` — gamut guard, ACES, `RRTAndODTFit`, `TOE = 0.014`,
split tone, 1.07 chroma, both guard calls — and solved it:

```
  exposure 1.18: linear at display 163 = 0.4249   at 250 = 5.2537   ratio 12.37
  the x0.70 table:  base  80  100  120  140  150  160  170  180  200
                  bought  23   25   27   28   28   28   27   26   22
```

**5.2537 to four decimal places, and every cell of the codes-bought row.** §1.1
is sound and its arithmetic is real. (Two nits: at the ground's own level I get
27 codes at exposure 1.00 *and* 27 at 1.18, not "27 vs 26"; and the disc blends
in the framebuffer **after** the grade, so a "×0.70 linear darkening" is not
what it does. Neither changes the conclusion — if anything the second makes the
refutation stronger, because a post-grade blend cannot be eaten by a shoulder at
all.)

---

## 2. WHAT I TRIED TO KILL AND COULD NOT

- **Every anchor, by before-text on disk.** `island.ts:3096`
  `powder:  [0.20, 0.06, 0.00, 9],` ✓. `island.ts:1036` is the closing `}` of
  the 3,600-arc base loop and `:1037` is `// 2. RIM SHADE` ✓ — the insertion
  point is exactly where the document says. `void3d.ts:604` comment / `:605`
  unconditional `false` ✓. `void3d.ts:1582` ✓, with the WORLD ENDER reasoning at
  `:1570-1580` ✓ and the caster-saving claim at `:1578` ✓. `void3d.ts:646-656`
  `softShadowTex` ✓, `:689` `opacity: 0.62` ✓ (the document says `:690`; it is
  689). `void3d.ts:2272-2275` "about 1.45x" ✓. `void3d.ts:76` `RADIUS_SINK = 0.9` ✓.
  `qa/grounding.mjs:9-13` "4.6% annulus" ✓, hard-coded to maple at `:53` and
  `:60` ✓, verdict `reach < 1.02 || footprint < 5%` ✓.
  `prototype3d.ts:142` `shadowMap.autoUpdate = false` ✓, `:9669` half-rate
  `needsUpdate` ✓, `:9252` follow law ✓, `:9305` the per-frame ease ✓,
  `:9309` `camOffset` — which I re-normalised: **46.37° at steep 0 and 65.55° at
  steep 1** ✓.
- **The geometry correction.** With the group at `y = dispR·0.9` and a unit
  sphere scaled by `dispR`, a ground point at radius `k` escapes below the
  silhouette when `k·sinθ > 1 − 0.9·cosθ`. **0.5238 at 46.4°, 0.6898 at 65.6°.**
  The source's 1.45× is wrong and the visible annulus really is ~65% of the
  disc's radius, not 4.6%. I also checked the lateral direction (`k > 0.784` at
  46.4°), so 0.524 is genuinely the binding constraint. Correction upheld.
- **The bbox arithmetic.** I parsed `PW_LAND` out of `powder.ts:60` and measured
  its extent: **5,900 × 9,500 world units → 295 × 475 scene units** at
  `SCALE = 0.05`. Exact. Texels per scene unit: fine 140×128/295 = **60.7**,
  mid 34×128/295 = **14.75**, coarse 7×256/295 = **6.07**. Exact.
- **The seeded-draw accounting.** `island.ts:268` `rand` is `Math.random` ✓.
  `grep` over `island.ts:1015-1113` for `mrnd|mr(|mpick|mchance`: **zero hits**,
  run by me ✓. The block is inside `if (WORLD_ID === 'powder')` at `:1014` ✓.
  I counted patch A's draws off the code myself: 9 per sastrugi iteration
  (x, y, L, a, two `strokeStyle` alphas, three line widths) × 5,200 = 46,800, and
  5 per chip (x, y, the coin flip, two side lengths) × 9,000 = 45,000.
  **91,800. Exact.** Zero seeded draws added or removed by any of the four
  patches. Maple's mulberry32 stream cannot move.
- **Triangles.** Zero for all four. `TRI_BASELINE = 39018` at
  `qa/roundlod.mjs:60` ✓, untouched by construction.
- **The compile.** `npx tsc --noEmit` on a clean worktree: exit 0. With patch A
  + patch B applied: **exit 0**. `npm run build` with A + B: **built in 3.73s**,
  and the resulting bundle boots, bakes and renders (§1.2). Patch C2 alone: exit 0.
- **§11, the instrument finding.** Not my brief, but it is a live claim, so I
  checked the direction independently — largest connected "r and b above g,
  not bright" component: `shippedlook/powder_look.png` half-width **299.5 px**
  against `lookpair/powder_look.png` **90 px**; maple **258.5** against **103.5**.
  My thresholds are tighter than theirs so the absolutes differ, but the ratio is
  **2.5–3.3×** and `lookpair/maple` lands at 103.5 against the 101 the follow
  law predicts. **The `shippedlook` pack really is shot at a lens the game never
  uses.** The advice not to reshoot the store pack out of it stands.
- **GOVERNOR check.** Nothing here re-proposes a refuted claim. §1.2 tests
  `RIG.hemiI` for Powder and kills it with a measurement rather than by citing
  the Lantern refutation — correct handling. `island.ts:3096` is
  `rung1-ruling.md`'s own item 4, so patch B is ruling-directed work. HANDS OFF
  is respected on seeded draws, the fear face, camera shake, powers and the
  approved art. No retraction is re-entered.

---

## 3. THE CORRECTIONS — verbatim and mechanically applicable

### C-1 (patch B and patch A). Replace the clip and mean figures with canvas numbers.

Delete from §4 ("What it spends") the sentences beginning *"On the one-frame
A/B, any-channel ≥ 250 goes 1.0778% → 1.0777%"* through *"Mean luminance falls
0.6037 → 0.6013, −0.4%."* and replace with, verbatim:

> Measured on the CANVAS pipeline — `renderer.render(scene, camera)` to the
> default framebuffer, then `gl.readPixels` — because a `WebGLRenderTarget`
> render is forced to `NoToneMapping` and linear output by three 0.185.1
> (`three.module.js:7549-7559`, `:7585`), which is the trap
> `prototype3d.ts:1099-1112` already records. Powder, THE VILLAGE, rung 0, R = 4,
> settled at `camDist 128.78`, one frame, only `uGrain` moving:
> any-channel ≥ 250 goes **0.0089% → 0.0087%**, ≥ 240 **0.3967% → 0.3967%**,
> ≥ 230 **0.4352% → 0.4350%**, and **zero pixels cross into ≥ 250** (two cross
> out of it). The largest single-channel rise anywhere in the frame is 9 codes.
> Mean luminance goes **0.5458 → 0.5461, +0.05%** — it does not fall.
> At `[1,1,1,7]`, four times the proposed weight on every layer, still zero
> pixels newly clip.

And in §0/§4 replace `medSd 0.0030 → 0.0068, flat 54.9% → 13.6%` with
`medSd 0.0032 → 0.0072, flat 54.2% → 15.6%`, marked "canvas pipeline". The
patch is *better* than filed, not worse.

### C-2 (patch B's comment). The texels-per-pixel table is 2× too high.

`932/(2·d·tan16°)` is CSS pixels. Mip selection happens in **device** pixels and
the game runs at `pixelRatio 2` (`prototype3d.ts:141`, `PR_TOP = 2`; the shipped
frames are 860×1864 for a 430×932 viewport). Divide every figure by two. In the
proposed comment at `island.ts:3094`, replace:

> `// (x140) 0.97 -> 12.6, mid (x34) 0.24 -> 3.07, coarse (x7) 0.10 -> 1.26.`
> `// Past d ~ 200 the coarse layer is the only one the mip chain has not`
> `// averaged away, which is most of every match.`

with, verbatim:

> `// per DEVICE pixel at pixelRatio 2, which is the space mip selection`
> `// happens in: fine (x140) 0.49 -> 6.3, mid (x34) 0.12 -> 1.54, coarse`
> `// (x7) 0.05 -> 0.63. Past d ~ 250 the fine layer is gone and the mid one`
> `// is at the mip boundary; the coarse layer is the only one that is still`
> `// sharp at the 340-unit clamp, and Powder had it at zero.`

The same substitution applies to §3's table and to the sentence *"The fine layer
… is gone by `d = 129`"* — at `d = 129` the fine layer is at 2.41 texels/device
px, mipping but not gone. The conclusion (spend on the coarse layer) survives;
the measured sweep is what carries it, and the sweep is right.

### C-3 (patch B, §4). The snow gets marginally WARMER, and the two instruments disagree.

`b − r` **falling** means blue has moved closer to red — less blue separation,
i.e. warmer. Replace *"Three tenths, six tenths and one code down — the snow
gets very slightly darker and cooler, not warmer. (The route-interception pair
in §5 … reads the same direction more strongly: b − r 27.98 → 30.61.)"* with,
verbatim:

> Three tenths, six tenths and one code down. Blue falls furthest, so `b − r`
> narrows by 0.7 codes and the snow gets **marginally warmer**, not cooler — a
> sub-code move, but stated in the right direction. My own patched-build run
> agrees: `b − r` 36.14 → 35.40 with the grain on, same frame. The
> route-interception pair in §5 moves the other way (27.98 → 30.61); those are
> two different compositions and they do not agree, and I am not going to claim
> they do.

### C-4 (probe §9.1). The flat-share limb fails Pirate Bay on your own baseline pack.

§2 records `pirate 39.9%`. §9.1 sets the bar at `flat share ≤ 30%` and then says
*"maple, pirate, gameday and lantern pass both."* **Pirate is at 39.9% against a
30% bar on the very pack the document uses as its five-world baseline, and I
re-measured it myself: 39.9%.** As specified, `qa/groundgrain.mjs` reds the gate
for a world nobody has claimed is broken. Either drop the flat-share limb and
gate on `median patch sd ≥ 0.0060` alone (which Powder fails at 0.0032 and every
other world passes), or move the limb to `≤ 45%` and say in the header that
Pirate Bay at its own spot reads 39.9% and is the second-flattest world in the
game. Do not ship a bar with a known false positive in it.

### C-5 (probe §9.1). `SPOTS` cannot be imported.

`qa/lookpair.mjs:143` declares `const SPOTS = {…}` — **not exported** — and the
module is a top-level-`await` script that launches chromium, shoots a frame and
`process.exit`s on import. §9.1's "reusing `qa/lookpair.mjs`'s `SPOTS` table by
import rather than a copy" cannot be written as described, and §10 lists
`qa/lookpair.mjs` among the files this crew did not touch. Add to §13, verbatim:

> 0. **Before `qa/groundgrain.mjs` can import the spots, they have to be
>    importable.** `qa/lookpair.mjs:143` declares `SPOTS` privately and the
>    module boots a browser on import. Move the table to `qa/_spots.mjs` and
>    have `lookpair.mjs` import it, or export it and guard `lookpair.mjs`'s body
>    behind an entry check. Copying the table is not an option — `_zgrade`,
>    `_headcover` and `_distinct` are all in the retractions for exactly that.

### C-6 (probe §9.2). Correct the instrument, not only the bar.

The proposal calls `qa/grounding.mjs` *"the right instrument and better than
anything I would have written"*. It renders into a `WebGLRenderTarget`
(`grounding.mjs:95-101`), so **every code it has ever printed is an un-graded,
un-exposed, linear code**, and its own bar — *"under ~12 is below the threshold
most phone screens resolve outdoors"* — is stated in display codes. Add as
change 0 to §9.2, verbatim:

> 0. **Take it off the render target.** `grounding.mjs:95` builds a
>    `WebGLRenderTarget` and every number the probe prints comes out of it.
>    three 0.185.1 forces `NoToneMapping` and `workingColorSpace` output for any
>    non-XR render target (`three.module.js:7549-7559`, `:7585`), so the frame
>    it differences has no ACES, no toe, no split tone, no chroma push, no
>    `toneMappingExposure` and no sRGB encode — `prototype3d.ts:1099-1112` says
>    so in as many words. Render to `null` and read the default framebuffer with
>    `gl.readPixels` inside the same evaluate; the two renders stay the same
>    frame, and the codes become the codes a phone shows. Measured on the same
>    settled Powder frame, the two buffers disagree by a factor of 103 on
>    any-channel ≥ 250 and by 0.19 on mean luminance.

And replace the §9.2 bar table with the canvas measurement. Mine, Powder, THE
VILLAGE, R = 4, `camDist 128.97`, `pitch 51.81°`, hero projected radius 103.6 device px,
one frame, three disjoint differences:

```
  what                          px       %frame   mean   peak   p50    p75    p90    centroid (heroR)
  the hero's contact disc     25623      1.60     16.1   43.0   13.1   23.1   31.9   1.02
  the world's own cast shadows 115922    7.23     39.7   79.4   51.9   53.5   53.6   1.49
  the hero's cast shadow (C1)  22208     1.39     49.6   53.9   53.6   53.6   53.7   1.46
```

**The finding survives and reads 4.0×, not 4.9×: p50 51.9 under a snowman
against 13.1 under the mascot.** The two-limbed gate's numbers become: where he
casts, within 20% of **51.9** (C1 delivers 53.6, +3.3%, pass); where he does not,
the disc's p50 must reach **17.3** (today 13.1, FAIL) and its peak **35.7**
(today 43.0, **PASS**). Note that second limb: on the correct pipeline **today's
disc already passes the peak limb**, so the gate as filed would have been half
green for the wrong reason. State both limbs in canvas codes or the gate is
measuring a buffer nobody sees.

---

## 4. C1 — NOT LANDABLE AS FILED

**It does not compile.** Applied verbatim to a clean worktree at HEAD:

```
src/proto3d/void3d.ts(605,21): error TS2304: Cannot find name 'r'.
src/proto3d/void3d.ts(605,26): error TS2304: Cannot find name 'CAST_R'.
src/proto3d/void3d.ts(1582,30): error TS2304: Cannot find name 'CAST_R'.
```

Two distinct faults. `CAST_R` is named in §6.4 as "a named constant" and is
declared nowhere in the document — not a value, not a declaration site. And
`void3d.ts:605` sits in the factory body where there is no `r`; the snippet's
*"and the same line in setRadius()"* cannot be the same line, because only
`setRadius` has a radius. The only reading of `:604`'s own comment that compiles
is `body.castShadow = true;` at `:605` with the gate living in `setRadius`.
With `body.castShadow = true` at `:605`, a `const CAST_R = 4;` beside
`RADIUS_SINK`, and `body.castShadow = r <= CAST_R;` at `:1582`, `tsc` exits 0 —
so the shape is right and the filing is incomplete.

**And the centroid goes the wrong way for the argument.** §6.4 measures
1.22–1.37 hero-radii and then argues it down to *"nearer 0.9–1.0"* on the
grounds that the probe's purple segmentation over-read the ball by 1/0.76. My
probe does not segment — it uses the analytic projected radius
(`innerHeight / (2·camDist·tan(fov/2)) · r · dpr` = 103.6 px, which the follow
law confirms) — and reads the hero's own cast-shadow centroid at **1.46
hero-radii** at r = 4 in Powder, on the canvas. That is *further outside his
silhouette* than the proposal's raw number, not nearer. The whole recorded
objection at `void3d.ts:1570-1580` is about a shadow that detaches and reads as
a second dark mass; the document's downward correction makes that risk look
smaller than it measures. **Strike the "corrected it is nearer 0.9–1.0"
parenthetical** and let the `CAST_R` sweep carry the question, which is what
risk 2 already says. C1 stays open on that sweep, plus `qa/shadowcost.mjs`.

The finding under C1 is confirmed and is the strongest thing in §6: the game
draws a 51.9-code shadow under a snowman and a 13.1-code haze under its mascot,
in the same frame, from the same light, because of one boolean that its own
comment says is conditional.

---

## 5. C2 — KILLED AS FILED

Two claims in the comment C2 wants written into `void3d.ts` are false, and both
are load-bearing. Rule 3.

**(a) "no segment here is steeper than the 0.28 -> 0.10 it replaces."** It is.
Alpha per unit of texture radius:

```
  shipped  0.58 -> 0.80   -0.818/unit   x opacity 0.62  =  0.507   <- the claimed ceiling
  PROPOSED 0.55 -> 0.75   -1.200/unit   x opacity 0.80  =  0.960   <- 1.47x steeper, 1.89x in absolute alpha
```

The proposal's own §6.3 preamble names *"that near-solid core ended in a step,
which is the edge the eye locked onto"* as the failure this profile family was
rebuilt to remove, and then hands back a falloff nearly twice as steep as the
one it replaces, on a world whose ground has nothing else in it. This is not a
nit; it is the single thing the patch promised not to do.

**(b) "moves the maximum outward to ρ ≈ 0.34, which is under the ball at every
pitch the game reaches."** Not during the intro, and the standing rule says an
invisibility claim that does not state the intro is not a claim. The hidden
threshold `k(θ) = (1 − 0.9cosθ)/sinθ` is **not monotonic** — it bottoms out at
**k = 0.436 at θ ≈ 25.9°**, which is inside the establishing shot's 45-degree
swing (`GOVERNOR.md` 2026-08-28: Powder opens at 15.3° and reaches 46.4° at
`introT 1.00`; the proposal's own §4 intro table has a beat at 25.5°):

```
  theta   11.8   15.3   20.0   25.5   25.9   30.0   40.0   46.4   56.4   65.6
  k       0.582  0.500  0.451  0.436  0.436  0.441  0.483  0.524  0.603  0.690
  rho     0.383  0.329  0.297  0.287  0.287  0.290  0.318  0.345  0.396  0.454
```

ρ = 0.34 is ground radius k = 0.517. It is hidden at 46.4° and above. It is
**visible from roughly θ = 15.5° to θ = 46°** — most of the establishing shot,
the frame the ledger says a child judges the game on and a store video opens
with. So the new 0.58 alpha peak, at opacity 0.80, lands on screen during the
intro, at the radius where the disc is widest relative to the hero. That is
where "a grey circle glued around the hero" comes back, and nobody has
photographed it.

The comment's own range statement must also change: `"At 1.52x that is the first
34-45% of THIS gradient"` is derived from 46.4–65.6 only. Across every pitch the
camera reaches it is **the first 28.7–45.4%**.

**And its baseline is understated.** §6.3 argues from `shipped: peak 23.0, mean
9.8`. On the canvas the shipped disc measures **peak 43.0, mean 16.1, p50 13.1**
— 1.7× deeper than the number the patch is being justified against, and its peak
already clears the two-thirds limb of the proposal's own §9.2 gate. Re-run the
whole §6.3 candidate table on the canvas pipeline before anyone chooses a
profile; the ranking may not survive, and D (the 1.25× disc) in particular was
dismissed on numbers from the wrong buffer.

C2 can be refiled. It cannot be landed on this comment.

---

## 6. WHAT I RE-RAN VERSUS WHAT I ACCEPTED

**Re-ran and reproduced exactly:** the whole §2 five-world table; the
`shippedlook` powder and maple figures my brief named (59.8% / 7.5% / 0.0120%);
the pre-RUNG frame pulled from `6b207a5` myself; §1.1's `×0.70` codes-bought row
and the 5.2537 clip-linear figure, from my own transcription of the grade; the
`PW_LAND` bbox from the polygon; the three texels-per-scene-unit figures; the
0.524/0.689 geometry; the 91,800 `Math.random` calls; the camera's 46.37°/65.55°;
every anchor's before-text; `tsc` and `npm run build` on the patched source.

**Re-ran and got a different answer:** every render-target measurement (§4, §6.1,
§6.3, §6.4, §9.2) — see §0 and §3. The texels/px table (device vs CSS pixels).
The `b − r` direction. §9.1's "pirate passes". The C2 falloff slope and the
intro visibility. The C1 centroid.

**Accepted without re-running, and flagged as such:** §8's frame-cost timings —
the document itself says they cannot resolve, and it is right; §8's bake-cost
`n = 1` timings; §5's route-interception photograph table (I ran my own
equivalent instead); §4's intro-beat table (I did not re-shoot the intro; the
pitches in it agree with `GOVERNOR.md`'s 2026-08-28 entry, which was measured);
§6.2's pixel-ramp corroboration at `y ≈ 1400–1420`; §11's exact pixel radii (I
reproduced the ratio and the direction, not the absolute numbers).

**Risks I am adding to the document's own list:**

8. **The frames this crew shot for the art director were shot into a render
   target or off a drifting composition.** The one thing nobody has yet is a
   before/after **canvas** pair of Powder at the same settled spot on two builds
   — which is exactly what `qa/lookpair.mjs` is for and what §13 item 1 asks
   for. Get that pair before the tiling question (risk 4) is judged; my patched
   frame is at `scratchpad/sk/A_bake.png` and is a single photograph, not a pair.
9. **`qa/grounding.mjs`'s peak limb is already green.** Anyone reading the §9.2
   gate as "both limbs fail today" will find, on the corrected instrument, that
   the disc's peak (43.0) already clears two thirds of the world's p90 (35.7).
   Only the p50 limb fails. Say so, or the probe's first honest run will look
   like a regression in the argument.

---

## 7. THE ORDER I WOULD LAND IT IN

1. **Patch B alone**, with C-1, C-2 and C-3 applied to its comment, and
   `qa/groundgrain.mjs` (C-4, C-5) committed failing at **0.0032 / 54.2%** first.
   Four numbers, a measured effect of +125% on median patch sd, and a measured
   cost of zero pixels.
2. **Patch A**, separately, after three `qa/determ.mjs powder` runs. It builds,
   it works, and on its own it is worth more than the grain weights are
   (0.0032 → 0.0081).
3. **`qa/grounding.mjs`, corrected — instrument first (C-6), then the world
   argument, then the bar.** It is the prerequisite for both C patches and it is
   the cheapest thing on this list.
4. **C1**, only behind the `CAST_R` sweep, `qa/shadowcost.mjs`, a declaration for
   `CAST_R`, and `true` rather than `r <= CAST_R` at `:605`.
5. **C2, refiled**, with the falloff either flattened to the shipped ceiling or
   the claim about it withdrawn, the intro range stated, and the candidate table
   re-run on the canvas.

The three source claims §13 item 7 asks to correct in place — `void3d.ts:2274`'s
1.45×, `qa/grounding.mjs:9-13`'s 4.6% annulus, and `void3d.ts:604`'s phantom
size gate — are all real and all correctly diagnosed. Correct them in place, as
the ledger does with the horizon.

**I tried to kill Finding 1 with a cold instrument and it came back identical to
the digit. I tried to kill the no-blowout claim with the pipeline the proposal
did not use and it came back stronger than filed. What I did kill is the
instrument, one comment, and two patches' worth of arithmetic.**
