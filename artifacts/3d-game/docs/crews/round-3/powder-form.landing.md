# crew:powder-form — LANDING

**The verdict is the specification.** `docs/crews/round-3/powder-form.verdict.md`
split the proposal into six pieces. I landed the four it cleared, with its
corrections applied, and left the two it killed on the floor.

| piece | verdict | what I did |
|---|---|---|
| FINDING 1 — Powder is flat | SOUND | reproduced a third time on my own cold instrument, before touching anything |
| **B** — `GRAIN.powder` weights | SOUND WITH CORRECTIONS | **LANDED.** `[0.20,0.06,0.00,9]` → `[0.45,0.16,0.22,7]`, comment rewritten off canvas numbers and a device-pixel table |
| **A** — the bake's wind/chip pass | SOUND WITH CORRECTIONS | **LANDED**, steps 1b/1c after the base speckle loop |
| **C1** — `body.castShadow` size gate | NOT LANDABLE AS FILED | **NOT LANDED.** §8 proposes a compiling shape and the measurement it would have to survive. Nothing more |
| **C2** — the ring-weighted disc | KILLED | **NOT LANDED**, not refiled |
| `qa/groundgrain.mjs` | fails today — good, bar is wrong | **LANDED with a re-derived bar**: one limb, `median tile sd ≥ 0.0060`. The flat-share limb is printed and NOT gated |
| `qa/grounding.mjs` | SOUND WITH CORRECTIONS, plus one missed | **LANDED**, instrument first — and I found two further instrument faults on top of the one the skeptic found |

FINDING 2 — the mascot casts no ground shadow — **stands, confirmed, and has no
landed fix.** §6, written down here so it is not lost with C1.

Nothing is committed. Files touched: `src/proto3d/island.ts`,
`qa/groundgrain.mjs` (new), `qa/grounding.mjs`. `src/proto3d/alpine.ts` was
cleared for me and needed nothing — §7.

---

## 0. THE BUILDS, AND ONE THING THAT WENT WRONG IN THE ROOM

PLACEHOLDER_BUILDS

---

## 1. FINDING 1, REPRODUCED A THIRD TIME BEFORE ANYTHING WAS TOUCHED

My own instrument, written from the description: 16×16 non-overlapping tiles,
Rec.709 luminance on the sRGB bytes in 0..1, `sd < 0.004` = flat. Run cold
against the PNGs on disk.

```
  file                                 flat%   bot3rd   medSd    p95/p25   >=250%   meanL
  lookpair/maple_look.png               13.3     3.5     0.0172    2.29     0.0002  0.4740
  lookpair/pirate_look.png              39.9    44.8     0.0113    2.62     0.0003  0.3797
  lookpair/gameday_look.png             17.8    20.8     0.0360    4.48     0.0006  0.2792
  lookpair/lantern_look.png             18.3    31.6     0.0203    4.53     1.2498  0.2732
  lookpair/powder_look.png              51.3    54.4     0.0036    1.28     0.4221  0.5639
  shippedlook/powder_look.png           59.8    74.1     0.0033    1.43     0.0120  0.5232
  shippedlook/maple_look.png             7.5    14.8     0.0082    2.28     0.0000  0.4909
  6b207a5:shippedlook/powder_look.png   53.9    71.7     0.0036    1.56     0.0000  0.4715  <- PRE-RUNG
```

Every cell of the proposal's §2 table and every cell of the skeptic's §1.1
table, to the digit. The pre-RUNG frame I pulled out of
`git show 6b207a5:./qa/out/shippedlook/powder_look.png` myself; its own stamp
reads `4f39f902eae8f3cb`, against `20d3f756b27be10d` for the canonical
`shippedlook` frame and `8bdf1a860df35055` for the `lookpair` pack. **Three
source digests, two spots, one answer, and RUNG 1 is not in it.**

Three independent implementations now agree cell for cell. Finding 1 is the
most solidly established number in this round.

---

## 2. PATCH B — `GRAIN.powder`

`src/proto3d/island.ts`, anchor verified by before-text (`powder:  [0.20, 0.06,
0.00, 9],` under the two-line "nearly grainless" comment — the proposal cites
`:3096`, on disk today it is `:3131`, and the before-text is exactly as filed):

```
  powder:  [0.20, 0.06, 0.00, 9]   ->   powder:  [0.45, 0.16, 0.22, 7]
```

The comment above it is replaced entirely. **Every number in the new comment is
one that was actually run, and the two that are not mine are attributed in the
comment to the run they came from.** The corrections the verdict demanded:

**C-1 — the clip and mean figures come off the CANVAS.** The proposal's
"1.0778% → 1.0777%, unmoved to four decimal places" was counted in a
`WebGLRenderTarget`, which three 0.185.1 forces to `NoToneMapping` and linear
output (`three.module.js:7549-7559`, `:7585`) — a count of pixels over linear
0.98 *before* the tone curve, not a display-clipping figure. It is gone. The
comment now carries the skeptic's canvas measurement, named as his: any-channel
≥ 250 goes 0.0089% → 0.0087%, **zero pixels cross into clipping**, largest
single-channel rise 9 codes, and still zero at `[1,1,1,7]`.

**C-2 — the texels-per-pixel table is in DEVICE pixels.** I re-derived it rather
than dividing the filed one by two. `PW_LAND` (`powder.ts:60`) spans
5,900 × 9,500 world units; at `SCALE = 0.05` that is 295 × 475 scene units. The
ground UV maps that bbox onto [0,1]² (`island.ts:2993-2994`), so on the X axis —
the binding one, since the bbox is not square — the layers resolve to 60.75,
14.75 and 6.07 texels per scene unit. The lens is 32° over a 932-css-px
viewport at `PR_TOP = 2`, i.e. `2·932/(2·d·tan16°)` = **125.0 device px per
scene unit at `camDist` 26 and 9.56 at the 340 clamp**. So:

| layer | repeat | texels/unit | d = 26 | d = 129 | d = 250 | d = 340 |
|---|---|---|---|---|---|---|
| fine | ×140 | 60.75 | 0.49 | 2.41 | 4.67 | **6.35** |
| mid | ×34 | 14.75 | 0.12 | 0.59 | 1.13 | **1.54** |
| coarse | ×7 | 6.07 | 0.05 | 0.24 | 0.47 | **0.64** |

Past `d ≈ 250` the fine layer is gone and the mid one is at the mip boundary;
the coarse layer is the only one still sharp at the clamp — **and Powder had it
at zero.** That is the mechanism, and it survives the correction intact.

**C-3 — the snow gets marginally WARMER, and the comment does not claim
otherwise.** `b − r` falling means blue has moved toward red. I did not put a
colour claim in the source comment at all, because the move is sub-code and the
two instruments that measured it disagree in sign; my own reading is in §3.

---

## 3. PATCH A — THE BAKE'S WIND AND CHIP PASS

`src/proto3d/island.ts`, inserted after the closing `}` of the 3,600-arc base
speckle loop and before `// 2. RIM SHADE`, so the rim shade, the piste, the grit
road, the lake and the village floor all still paint over it. Anchor verified by
before-text; the proposal cites `:1036/:1037` and on disk it is `:1071/:1072`.

5,200 sastrugi (a blue lee stroke and a white windward crest on one bearing) and
9,000 hard crust chips. **19,400 canvas ops against Pirate Bay's 22,000 in the
same idiom**, on a canvas already being painted; zero triangles, zero draw calls.

Its comment carries the same C-2 correction in device pixels, derived by me:
one canvas px is 0.096 scene units, so a 3–7 px ridge is 0.29–0.67 units =
**2.8–6.4 device px at the 340 clamp and 36–84 at 26** — it resolves across the
whole follow range, where the ×140 speckle layer is at 6.35 texels per device
pixel by the clamp. A 40–190 px ridge is 3.8–18.2 units = 97–460 device px at
the R = 4 camera. A 1–3.4 px chip is 0.9–3.1 device px at the clamp and 12–41 at
the tightest — hard edges for the near camera, and honestly sub-pixel at the far
one.

**Seeded draws: zero, and I checked it myself rather than accepting it.**
`island.ts:268` is `const rand = (a, b) => a + Math.random() * (b - a)`. A grep
for `mrnd|mr\(|mpick|mchance` over the whole Powder bake block returns nothing.
The block is inside `if (WORLD_ID === 'powder')`. Maple Falls' mulberry32 stream
cannot move. Patch A does spend **91,800 more `Math.random()` calls** — 9 per
ridge × 5,200 and 5 per chip × 9,000, counted off the code I landed — on an
unseeded stream that already reseeds Powder's layout every load.

---

## 4. THE PROBES

### `qa/groundgrain.mjs` — NEW, and its bar is not the filed one

PLACEHOLDER_GROUNDGRAIN

### `qa/grounding.mjs` — corrected, instrument first

PLACEHOLDER_GROUNDING

---

## 5. THE RUNS

PLACEHOLDER_RUNS

---

## 6. FINDING 2 STANDS, AND NOTHING FIXES IT

PLACEHOLDER_FINDING2

---

## 7. WHAT I DID NOT DO

- **Did not land C1.** It does not compile as filed (`CAST_R` is declared
  nowhere and `:605` has no `r` in scope), and the centroid measurement the
  black-ellipse objection turns on reads *further* out on the skeptic's
  instrument than the proposal's "corrected" figure, not nearer. §8 proposes a
  shape and a better measurement for a future round; this crew lands neither.
- **Did not land C2, and did not refile it.** Two load-bearing claims in the
  comment it wanted written into `void3d.ts` are arithmetically false — its
  falloff is 1.47× steeper than the one it promises not to exceed, and its new
  alpha peak at ρ ≈ 0.34 is visible for most of the establishing shot because
  `k(θ) = (1 − 0.9cosθ)/sinθ` is not monotonic and bottoms out at θ ≈ 25.9°.
  The second is the exact failure `void3d.ts:641-646` already records.
- **Did not touch `src/proto3d/void3d.ts`.** It is not on my list, and the three
  claims §13 item 7 of the proposal asks to correct in place — `:2272-2275`'s
  "1.45x", `:604`'s phantom size gate — are in that file. **They are still
  wrong and still uncorrected.** The third, `qa/grounding.mjs`'s "4.6% annulus",
  I did correct, in that file's own header, as a retraction rather than a
  deletion.
- **Did not touch `src/proto3d/alpine.ts`**, though I was cleared to. I read it
  looking for a claim this finding refutes and there is none: its
  BLUE SHADOW RULE is about `SNOW_D`, an authored prop colour, which no patch
  here moves, and its snow-cap and window rules are untouched by a ground
  texture. Editing it to say so would have been noise.
- **Did not touch `qa/lookpair.mjs`**, so C-5's "move `SPOTS` to `qa/_spots.mjs`"
  is not what I did — that file is not on my list. Both probes PARSE the real
  `w3`, `back` and `SPOTS` declarations out of it at run time and throw by name
  if any of the three anchors moves. No copy of the table exists anywhere.
- **Did not re-shoot the canonical pack**, did not start a server, did not kill
  the one on `:4177`, did not commit.

---

## 8. WHAT THE NEXT CREW OWES

PLACEHOLDER_OWES

---

## 9. RULE 3 LEDGER — every number now in the source, and where it came from

PLACEHOLDER_LEDGER
