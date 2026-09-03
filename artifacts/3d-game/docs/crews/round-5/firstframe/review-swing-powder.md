# POWDER PASS — the establishing shot, u100 → settled

Cinematographer's review, Stream D (brief §2D). Seed 7, 430x932@2, six moments
in match seconds. Everything below is either "I saw" (a named PNG), "the code
says" (a quoted line), or a number I ran against the PNGs with pngjs
(scratchpad `px.mjs` / `grid.mjs`; no browser, no build).

## VERDICT: NO-SHIP

The first frame itself is the best opening in the game and I would put its
canvas in the store — but the title card has never been photographed over it
(the pack's page frames carry no card at all, and the code says the card's
scrim lands dead on the lodge), every shadow in the frame snaps on in one frame
at the exact moment the controls go live, and a speech bubble with no visible
speaker sits over the composition for the back half of the swing.

## THE BAR

**Mario Kart Tour (Nintendo, 2019)** — a top-grossing mobile title whose every
race opens with a level establishing shot. Mechanically, frame by frame:

1. **Fly-over, ~4 s.** The camera travels across the course's landmark (Tokyo
   Blur: over the tower and the city). The HUD is not on screen.
2. **The name, off the subject.** The course name rides a ribbon in the lower
   third, over the fly-over, never centred on the landmark the shot exists to
   show.
3. **A cut, not a dolly.** The fly-over ends on a hard cut to the gameplay
   camera behind the kart. There is no travelling frame of "nothing in
   particular" between landmark and player.
4. **Then the HUD, then the count.** The HUD fades in on the gameplay camera,
   3-2-1, controls live on GO with the camera already still. Lighting and
   shadows are identical on both sides of the cut — nothing pops.

Genre baseline, **hole.io**: opens straight on the gameplay camera, no intro,
HUD live from frame one. Our u0/settled frame is at parity with hole.io's frame
one; our u100 is beyond it.

Where POWDER sits: we have the fly-over (u100 is a fair match for the landmark
hold); we lack the cut (a continuous 300→38 dolly through an empty middle
frame, u50); the card sits on the landmark; the HUD is live from frame one; the
shadows snap on at the handoff; and a speaker-less bubble occupies the left
of frame from u50 to settled.

## THE SHOT, MOMENT BY MOMENT

- **u100** (`powder_u100_canvas.png`, tCanvas 0.67). Subject: THE LODGE
  (`hero: [(6100 - 6000) * 0.05, (2350 - 6000) * 0.05]`, prototype3d.ts:1453).
  I saw a lit gabled lodge dead centre — roof x 200-620, body y 650-1100 of
  860x1864, two rows of warm windows on the long wall — on a curved snow disc
  under a starry navy sky. Measured: **23% of rows are sky** (430 of 1864).
  The lift pylons at (185,1130) and (25,1380) draw a leading line from
  bottom-left up to the lodge; the crowd is scattered dots at scale. This is
  the frame an ad opens on. The void is **not in it**: my purple-pixel count
  finds 11 px at (59%,32%) — a pink-hat pedestrian, not the void.
- **u75** (`powder_u75.png`, tPage 1.21). Lodge now fills the right two-thirds
  (roof x 200-860, y 500-1100), windows readable as windows; the sky is gone to
  a sliver top-right. Purple px: **0**. Still a good frame; the camera reads as
  approaching the lodge, not falling.
- **u50** (`powder_u50.png`, tPage 2.07). The lodge has left the top of frame.
  I saw a saturated blue field (the lake ice) with white crack lines, snowballs,
  eight pedestrians, three sleds — and nothing to look at. Purple px: 91 at
  (71%,86%) — the yellow-hat pedestrian's purple shirt, not the void. This is
  the "camera falling" frame; on device the card covers it (see finding 1).
- **u25** (`powder_u25.png`, tPage 2.94). The void enters: **7,379 purple px,
  centred (50%,49%)**. Two snowmen with poles left, a red sled with poles above,
  the log pile bottom-right, the grit road's brown-grey edge (`#9a938c`,
  island.ts:1196) cut by the right frame edge. The first frame a child sees
  themself in, at ~2.6 match-s.
- **u0** (`powder_u0_canvas.png`, tCanvas 4.08). Void 11,081 px at (50%,49%),
  slightly larger (camDist 38). Two pedestrians cut by the top edge. The
  green-shirt figure at (640,100) now casts a long hard shadow to the right,
  (700-860, 180-240) — it did not at u25. This is the settle frame and it is a
  clean hole.io frame one: purple on blue-white, snowmen, log pile, ice boulder.
- **settled** (`powder_settled.png`). Identical composition, 11,171 px. Timer
  reads 2:56: the intro consumed four of the child's 180 seconds.

**The world's promise.** Yes — frame one is unmistakably POWDER: night sky,
snow disc, a lit lodge, lift line, dark pines, sleds. It could not be Maple or
Game Day. The palette (navy / blue-white / one warm lodge) is the poster's.

## FINDINGS

### 1. The title card has never been in the picture — and the code says it sits on the lodge
SEVERITY: major
AT: qa/firstframe.mjs:138-149 (the page shots); index.html:543-548; index.html:551
SAW: no title card in any of the six PAGE frames (`powder_u100.png` …
`powder_settled.png`). At u100 the page shows only the timer, coin chip, home
button and rank bar over the lodge.
EVIDENCE: `#titlecard.show { animation: cardFade 4.2s ease forwards; }`
(index.html:548) is a CSS animation, which runs on the WALL clock; the pack's
moments are MATCH seconds (`tPage: 0.4` for u100, powder.json) and the brief
says the match clock runs 14-40x slow under SwiftShader. 0.4 match-s is 5.6-16
wall-s: the 4.2-s card had finished before the first page shot. So the shot the
brief says has never been art-directed still has not been — with its card.
What the code says the card does on device: `#titlecard { … display: flex;
flex-direction: column; align-items: center; justify-content: center; …
background: radial-gradient(ellipse 78% 34% at 50% 50%, rgba(9,5,20,0.72) 0%,
rgba(9,5,20,0.55) 45%, rgba(9,5,20,0) 78%); }` (543-547) — three lines
vertically centred, the name at `clamp(34px, 12vw, 62px)` = 51.6px on this
phone, a ~100 CSS-px stack at viewport y 45-55%. I saw the lodge's lit long
wall at y 830-1000 of 1864 = 45-54%. The name lands on the windows, and the
scrim's 0.72 centre puts a window pixel of luminance 200 at
0.28×200 + 0.72×7 ≈ 61 — the landmark loses two-thirds of its light for the
2.4 s the card is at full opacity (cardFade 14%-72% = 0.59-3.02 s of a 3.5-s
hold). Mario Kart Tour puts the name in the lower third for exactly this reason.
FIX (two parts):
(a) the instrument — before every page shot, pin the card to match time so the
pack shows what the child sees: `await p.evaluate((t) => { const tc =
document.getElementById('titlecard'); tc.style.animation = 'cardFade 4.2s ease
forwards'; tc.style.animationPlayState = 'paused'; tc.style.animationDelay =
`${-t}s`; }, tNow)` where tNow is `__matchState().t` read just before the
screenshot; record `cardOpacity: getComputedStyle(tc).opacity` per shot.
(b) the composition — move the card off the subject: in index.html:543 change
`justify-content: center` to `justify-content: flex-end` and add
`padding-bottom: 28vh`; move the scrim to `ellipse 78% 26% at 50% 74%`. On
Powder that puts POWDER PASS over the pylons/crowd at u100 (scrim handles it)
and over the log pile at u25-u0, never over the lodge or the void (the void
settles at 49%). On Maple (hero null, void at centre) it clears the void too.
The experiment worth one reshoot: the upper third instead (y 12-22%, over the
23% of starry sky at u100), which needs no scrim at u100 but collides with the
timer and the top-edge crowd at u25-u0 — shoot both, pick by eye.
GATE: qa/firstframe.mjs — with (a) in place, assert per world:
`cardOpacity ≥ 0.95` at u75 and u50 (0.88 s and 1.75 s are inside 0.59-3.02 s)
and `≤ 0.05` at settled (4.5 s > 4.2 s). Fails today (opacity 0 at every page
shot). For (b): assert `#titlecard .name`.getBoundingClientRect().top /
innerHeight ≥ 0.60 — today ≈ 0.45, fails; passes after. Then run the pack's
existing `contrast()` on `#titlecard .name` and `.sub` at u100 against the
real pixels (bar 3:1 / 4.5:1), the way it already does for the splash.

### 2. Every shadow in the frame snaps on in one frame, on the still camera, as the controls go live
SEVERITY: major
AT: src/prototype3d.ts:9469-9471
SAW: `powder_u25.png` — the green-shirt pedestrian at (650,270) casts no
shadow; `powder_u0.png` / `powder_u0_canvas.png` — the same figure at
(640,100) casts a long hard shadow to the right, (700-860, 180-240), and a
second dark shadow sits in the top-right corner (770-860, 130-200). Nothing
else in the frame changed but the shadows. (The dark-pixel share of the band
x600-860,y150-400 goes 5.4% → 9.1% between u25 and u0; I report it as
consistent with, not proof of — the figures also moved.)
EVIDENCE: `if (introShadow === null) { introShadow = renderer.shadowMap.enabled;
renderer.shadowMap.enabled = false; sun.castShadow = false; }` … `if (introT <=
0 && introShadow !== null) { renderer.shadowMap.enabled = introShadow;
sun.castShadow = introShadow; introShadow = null; }` (9469-9471). The restore
is on the same frame as `if (introT <= 0) controlsLive = true;` (9473): the
child's first frame of control is the frame the world grows shadows. The bar
(Mario Kart Tour) has identical lighting on both sides of its cut.
FIX: ramp instead of snap, on the last 0.6 s of the dive where the camera is
already at camDist ≤ 45.7 (k² ≤ 0.03) and the draw-call bill is the settled
one, not the orbit one. Replace 9470-9471 with:
```
if (introT <= 0.6 && introShadow !== null && !renderer.shadowMap.enabled) {
  renderer.shadowMap.enabled = introShadow; sun.castShadow = introShadow; sun.shadow.intensity = 0;
}
if (introShadow !== null && renderer.shadowMap.enabled) sun.shadow.intensity = Math.min(1, (0.6 - introT) / 0.6);
if (introT <= 0 && introShadow !== null) { sun.shadow.intensity = 1; introShadow = null; }
```
`LightShadow.intensity` has been in three since r163; package.json:93 pins
`^0.185.1`. The governor should grep `intensity` in
node_modules/three/src/lights/LightShadow.js before landing — if it is absent,
the fallback is to move the restore to `introT <= 0.6` unchanged (the pop then
happens under camera motion, which masks it, rather than on the still frame).
No seeded draws; the town is untouched.
GATE: expose `shadowOn: renderer.shadowMap.enabled, shadowI:
sun.shadow.intensity` in `_dbg.__matchState` (prototype3d.ts:1941). In
qa/firstframe.mjs, sample at t = L-0.4 and t = L+0.7: assert `shadowOn ===
true && shadowI < 0.6` at the first, `shadowI ≥ 0.99` at the second. Today
`shadowOn` is false at L-0.4 — fails.

### 3. A speech bubble with no speaker sits over the composition from u50 to settled
SEVERITY: major
AT: src/proto3d/life.ts:5552-5558 (the chatter cadence); src/proto3d/bubbles.ts:430-431 (the clamp); src/prototype3d.ts:5518
SAW: "The cracks sing when it gets cold" in `powder_u50.png` at (18-430,
460-520), then in `powder_u25.png`, `powder_u0.png`, `powder_settled.png` at
(18-430, 425-485) — the same screen spot for 2.75 match-s while the camera
dives from camDist 103 to 38. No pedestrian is under its tail in u25, u0 or
settled; the nearest figures are the two cut by the top edge.
EVIDENCE: the line is `PW_AMBIENT.lake` (life.ts:2211). Chatter fires on
`chatCd = rand(1.8 - 1.0 * tense, 3.0 - 1.6 * tense)` from any ped within 68
units of the void (5555-5557); `calmT` (set to 4 by `life.calm(4)`,
prototype3d.ts:5518) gates only `scream` (5562), not ambient lines. The bubble
holds one spot because bubbles.ts clamps it into the HUD band: `const top =
HUD_TOP + halfH; let y = Math.min(h - 26, Math.max(top, …))` (430-431) with
`HUD_TOP = 206` — 206 CSS px = 412 device px; the bubble's top at 425 is that
clamp. Its speaker is off the top of the frame, because at u50 the camera's
subject is still halfway to the lodge. A child reads a caption pointing at
nobody, on the left third of the picture, during the reveal.
FIX: hold crowd chatter until the controls are live. prototype3d.ts:5518
`life.calm(4)` → `life.calm(4 + COPY.introLen)`; life.ts:5553 `if (chatCd <=
0)` → `if (chatCd <= 0 && calmT <= 4)` (name the 4 as `CALM_TALK`). The scream
gate then also counts from the settle rather than from the card, which is the
intent of the calm anyway. `rand`/`pick` here are runtime draws paced by dt —
the bake is untouched; the governor should confirm they are not the `mrnd`
stream (if they are, the deferral changes only the order of draws that already
depend on frame timing).
GATE: qa/firstframe.mjs, at every page shot with `__matchState().t <
introLen`, assert zero visible non-rival bubbles:
`[...document.querySelectorAll('.bubble:not(.rival)')].filter(e =>
+getComputedStyle(e).opacity > 0.05).length === 0` (selector per bubbles.ts's
class names). Fails today at u50 and u25 on Powder; passes after.

### 4. The HUD is live on frame one
SEVERITY: minor
AT: index.html:1688-1689 (#timer, #coins); the ⌂ button and the rank bar (`growthEl`, prototype3d.ts:9615)
SAW: `powder_u100.png` — "3:00" at top centre (y 40-95), "✦ 0" top-right, the
⌂ button under it, "VOIDLING 1m · NEXT MUNCHKIN" bar at y 1735-1835, all at
full opacity over the establishing shot. The clock is ticking (2:59 by u75)
while the child cannot move: `if (introT > 0) { … velX *= dk; velZ *= dk; }`
(prototype3d.ts:8652).
EVIDENCE: nothing in beginMatch (5560-5600) or the intro tick (9459-9494)
touches the HUD's visibility. The bar hides its HUD for the fly-over and fades
it in on the gameplay camera.
FIX: `document.body.classList.add('intro')` at prototype3d.ts:5585 (next to
`introT = COPY.introLen`) and `.remove('intro')` at 9473 (next to `controlsLive
= true`); CSS `body.intro #timer, body.intro #coins, body.intro <home>,
body.intro <rankbar> { opacity: 0 } #timer, #coins, <home>, <rankbar> {
transition: opacity 0.4s }` — the governor to resolve the two ids I could not
pin from index.html (the ⌂ glyph is not `#btnHome` at 2064, which is the
results button). Whether the match clock should also wait for the settle is a
balance question (it changes match length by introLen); log it as the
experiment, not the fix.
GATE: qa/firstframe.mjs at u100: `getComputedStyle(#timer).opacity < 0.1`
(today 1 — fails); at settled: `≥ 0.95`.

### 5. At orbit the bake's region fills read as hard-edged tonal discs
SEVERITY: minor
AT: src/proto3d/island.ts:1233-1242 (the lodge apron); 1229-1231 (the village fill)
SAW: `powder_u100_canvas.png` — the snow is not one field but plateaus with
curved edges: a brighter zone around the lodge, darker ground to its right at
the same distance, and a bright near band with a curved boundary at
y≈1400-1490.
EVIDENCE (measured, median snow luminance per 86x93 cell, L in 100-215):
around the lodge (cols 3-6, rows y652-1305) 129-146; right of it at the same
rows (cols 7-9) 109-128; the near band (rows y1491+) 151-169 against 130-147
in the row above — a 20-25 step across one cell height. The apron is a flat
fill with no feather: `g.arc(0, 0, 1, 0, Math.PI * 2); g.fillStyle =
'rgba(150,150,164,0.42)'; g.fill();` (1239-1240); the village floor likewise
`g.fillStyle = 'rgba(226,214,206,0.28)'; g.fill();` (1231). At gameplay
distance a 46-unit disc edge is off-screen; at camDist 300 the whole disc is in
frame. I cannot say from the PNGs which paint owns which arc.
FIX / THE EXPERIMENT: reshoot u100 with the apron alpha at 0, then the village
fill at 0. Whichever arc goes, feather that fill: for the apron
`const gr = g.createRadialGradient(0, 0, 0.8, 0, 0, 1);
gr.addColorStop(0, 'rgba(150,150,164,0.42)'); gr.addColorStop(1,
'rgba(150,150,164,0)'); g.fillStyle = gr;` — pure canvas, no seeded draws.
GATE: a bake-level probe (no camera): sample the Powder bake along the ray
from `PW.LODGE` centre at 0.70-0.95 of `rx * 0.8`, 1% steps; assert the max
luminance step between neighbours ≤ 3. Today the edge is one step of the whole
0.42 blend — fails; passes after the feather.

### 6. The tagline is three clauses; every other world's is two
SEVERITY: polish
AT: src/prototype3d.ts:1448
SAW: not in the pack (finding 1). The code says the card's third line is
`sub: 'school is shut · the valley slides · eat it all'` at 16px
(index.html:556), 45 characters; Maple is `'the little void is hungry · eat the
town'` (1323), Pirate, Game Day, Lantern all two clauses.
FIX: `sub: 'school is shut · eat the whole valley'` — keeps the hook a
six-year-old gets, keeps the verb, drops the clause they will not read.
GATE: none needed beyond finding 1's contrast measurement of `.sub`.

## IS THIS THE BEST THIS CAN BE?

No — but the distance is short, and the first frame is already there. Ranked:

1. **See the card over the shot** (finding 1a) and **move it off the subject**
   (1b). Until the card is photographed, nobody has seen Powder's opening.
2. **Ramp the shadows** (2). The settle is the first frame the child owns; it
   must not be the frame the world changes under them.
3. **Hold the chatter** (3). The reveal should be silent except for the card.
4. **Hide the HUD for the fly-over** (4). Parity with the bar.
5. **The empty middle.** u50 is a frame of ice and snowballs. The bar cuts; we
   dolly. The honest answer is that the card is what makes u50 acceptable on
   device — which is one more reason 1a matters. If after 1-4 the middle still
   reads as falling, the experiment is a hold-hand-settle at 0.35/0.30/0.35
   instead of 0.25/0.50/0.25 (prototype3d.ts:9512 `(u - 0.25) / 0.5`), which
   shortens the travelling stretch by 40%.
6. **The store frame.** `powder_u100_canvas.png` is the ad frame; `powder_u25`
   / `u0` is the "that's me" frame. The pack should ship both to the store
   shooter (task #7).

Against the bar, after 1-4 Powder's opening does everything Mario Kart Tour's
does except cut, and its u100 frame — a lit lodge on a snow planet under stars,
a lift line leading the eye — is a better first picture than most of that
title's course intros.

## COVERAGE

Images (all read): `sheets/powder_swing.png`, `sheets/powder_swing_canvas.png`,
`powder_u100.png`, `powder_u75.png`, `powder_u50.png`, `powder_u25.png`,
`powder_u0.png`, `powder_settled.png`, `powder_u100_canvas.png`,
`powder_u0_canvas.png`. Pixel measurements were run on all six `_canvas`
frames (purple-pixel census, sky rows, snow-luminance grid, top-right dark
band).

Numbers: `docs/crews/round-5/firstframe-data/powder.json` (introLen 3.5, the
six tPage/tCanvas stamps, the splash contrast rows — all splash lines clear
their bars on this viewport: boot THE CUTE p10 7.04, menu THE CUTE p10 6.74,
under-3:1 0%).

Code: `src/prototype3d.ts` 1236-1275 (WorldCopy), 1447-1470 (Powder copy),
1941-1960 (`__matchState`), 5558-5600 (beginMatch), 8652, 9450-9520 (the intro
tick and the subject slide), 9612-9620 (`titleUntil`); `index.html` 515-558
(#titlecard CSS), 1688-1689, 1736-1742, 1953, 2064; `src/proto3d/powder.ts`
77-88 (LODGE), 229-245 (PW_SPAWN); `src/proto3d/island.ts` 1076-1100,
1185-1242 (the Powder bake); `src/proto3d/life.ts` 2120-2140 (the calm),
2195-2215 (PW_AMBIENT), 5548-5570 (chatter); `src/proto3d/bubbles.ts` 52, 64,
200-232, 418-440; `qa/firstframe.mjs` (whole); `docs/STUDIO.md`,
`docs/GOVERNOR.md` (the rules); `package.json:93`.

Not in the pack, stated as such: the title card at any moment (finding 1);
the DRAG hint and welcome banner — the probe sets `voidPlayed`, and on a real
device Powder is level 5 so `firstEver` (prototype3d.ts:5558) is never true on
it; nothing first-run lands at u0 on Powder.
