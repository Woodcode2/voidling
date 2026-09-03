# REFUTATION — POWDER PASS establishing shot (skeptic on the cinematographer)

Stream D, brief §2D. I opened every cited line and every named PNG myself. "I
saw" is a picture, "the code says" is a quoted line, numbers are from
`docs/crews/round-5/firstframe-data/powder.json`. No browser, no build, no
source edits.

## VERDICT ON THE VERDICT

NO-SHIP was the right call, but for a narrower reason than the review gives:
the brief's own complaint — that nobody has looked at this frame as the child
sees it — is still true after this pack, because the instrument photographed
the shot without its title card (finding 1a, confirmed against qa/firstframe.mjs
and the CSS clock), and a speaker-less speech bubble sits in the reveal
(finding 3, confirmed in four PNGs). The shadow pop (2) is real but I would
grade it minor, not major; it would not by itself hold the ship.

## PER FINDING

### 1. The title card has never been in the picture — and the code says it sits on the lodge
REAL: yes (1a fully; 1b as a code-derived geometry claim, not a picture)
WHAT I FOUND: I saw no card in any of the six page frames
(`powder_u100.png` … `powder_settled.png`); the sheet `powder_swing.png` shows
timer, coin chip, ⌂ and the rank bar over every frame and nothing else. The
code says the card is a wall-clock CSS animation: `#titlecard.show { animation:
cardFade 4.2s ease forwards; }` (index.html:548), started once per match by
`tcEl.classList.remove('show'); void tcEl.offsetWidth; tcEl.classList.add('show');`
(prototype3d.ts:5581). The probe waits on MATCH time — `waitT` resolves the
first rAF with `__matchState().t >= tt` (qa/firstframe.mjs:151) — and powder.json
stamps the first page shot at `tPage: 0.4`. At the brief's 14-40x slow match
clock that is 5.6-16 wall-s, past a 4.2-s animation. The instrument cannot show
the card at any moment; the review's claim stands.
Composition: `#titlecard { … justify-content: center; … background:
radial-gradient(ellipse 78% 34% at 50% 50%, rgba(9,5,20,0.72) 0%, …) }`
(index.html:543-547), `.name { font-size: clamp(34px, 12vw, 62px) }` (551) =
51.6 px on a 430-px phone. I saw the lodge's lit long wall in `powder_u100.png`
at y ≈ 830-1000 of 1864 (45-54%). A centred three-line stack lands on the
windows. Not photographed, but the geometry is not in doubt.
FIX SOUND: yes, both parts. (a) pinning the animation with a negative
`animationDelay` and `animationPlayState: paused` is the right way to put a
wall-clock CSS animation on the match clock without touching source. (b)
`justify-content: flex-end; padding-bottom: 28vh` puts the stack's bottom at
72vh; I checked the neighbours it could collide with: `#guide { position:
fixed; … bottom: calc(150px + env(safe-area-inset-bottom, 0px)) }`
(index.html:213) sits at ≈84% and is shown only when controls go live; `#banner
{ position: fixed; top: 27% }` (348) is above; the rank bar I saw at y
1735-1835 (93-98%). No collision. The void settles at 49% (I saw it in
`powder_u0_canvas.png`), so the lower-third card also clears the subject on the
settle frames.
CORRECTION: the review says the card is at "full opacity 0.59-3.02 s". The
keyframes are `14%{opacity:1} 72%{opacity:1}` (index.html:558) of 4.2 s =
0.59-3.02 s. Correct. Gate selector should be `#titlecard .name` — the markup
is `<div id="titlecard"><div class="lvl"><div class="name"><div class="sub">`
(index.html:1736-1742). Correct as written.

### 2. Every shadow in the frame snaps on in one frame, on the still camera, as the controls go live
REAL: yes, as a fact; severity overstated
WHAT I FOUND: I saw it. `powder_u25.png`: the green-shirt figure at ≈(650,270)
has no cast shadow. `powder_u0.png` and `powder_u0_canvas.png`: the same figure
at ≈(650,100) casts a hard shadow to the lower-right, ≈(700-860, 180-240); the
yellow-shirt figure top-left also gains one. The code says exactly what the
review quotes: `if (introT <= 0 && introShadow !== null) {
renderer.shadowMap.enabled = introShadow; sun.castShadow = introShadow;
introShadow = null; }` (prototype3d.ts:9470-9472), and `if (introT <= 0)
controlsLive = true;` is the next statement (9473). Same frame.
FIX SOUND: yes, with two notes the governor must carry. (i)
`LightShadow.intensity` exists: node_modules/three/src/lights/LightShadow.js:41
`this.intensity = 1;` (package.json:93 `"three": "^0.185.1"`). (ii) The shadow
pass is manual: `renderer.shadowMap.autoUpdate = false;` (prototype3d.ts:142)
with `if ((shadowFrame++ & 1) === 0) renderer.shadowMap.needsUpdate = true;`
(9881) running every frame unconditionally, so re-enabling at `introT <= 0.6`
gets a shadow map within two frames — the ramp works. The ground material
patches its shader (`groundMat.onBeforeCompile` island.ts:3275) but does not
touch the shadow chunk, so `shadowIntensity` reaches it. No seeded draws.
One defect in the proposed snippet: when `introShadow` is `false` (a low rung
with shadows off), `!renderer.shadowMap.enabled` stays true and the first
branch re-runs every frame, resetting `sun.shadow.intensity = 0` until
`introT <= 0` sets it to 1. Harmless with shadows off, but write it as
`if (introT <= 0.6 && introShadow !== null && !rampOn) { rampOn = true; … }`.
CORRECTION: severity minor. It is one frame of pop under a child's first drag,
on a world whose contact shadows (`bakeContactShadows()`, prototype3d.ts:5522)
were already under every prop; the review's own bar (Mario Kart Tour) hides
this class of thing with a cut we do not have. Worth fixing; not a ship-holder.
The "dark-pixel share 5.4% → 9.1%" number is not in powder.json — the review
labels it its own pngjs run and hedges it; treat it as unverified.

### 3. A speech bubble with no speaker sits over the composition from u50 to settled
REAL: yes
WHAT I FOUND: I saw "The cracks sing when it gets cold" in `powder_u50.png` at
≈(18-430, 460-520) and in `powder_u25.png`, `powder_u0.png`,
`powder_settled.png` at ≈(18-430, 425-485), same spot, no figure under it in
the last three. The line is `'the cracks sing when it gets cold'` in
`PW_AMBIENT.lake` (life.ts:2211), capitalised by `sentence()` (bubbles.ts:119).
One bubble, not four: ambient life is `slot.until = clock + (kind === 'panic'
? 2.6 : kind === 'ambient' ? 3.4 : 4.2)` (bubbles.ts:268) and u50 → settled is
2.07 → 4.82 = 2.75 match-s. The clamp is exactly as claimed: `const top =
HUD_TOP + halfH; let y = Math.min(h - 26, Math.max(top, …))` (430-431), `HUD_TOP
= 206` (64), `halfH = s.h + 6` (419) — for a 30-CSS-px bubble that is y = 242
CSS = 484 device, and I measured the bubble's bottom at ≈485. Only behind-camera
anchors are hidden (`if (v.z > 1) … visibility = 'hidden'`, 397-400); an
anchor off the TOP is clamped into view. `calmT` gates `scream` only
(`const scream = calmT <= 0 && …`, life.ts:5562); chatter fires regardless
(5553-5557). `rand`/`pick` are `Math.random` (life.ts:41-42), not the seeded
stream — determinism is untouched. The review's chain holds link by link.
FIX SOUND: yes, but it contradicts a documented intent, which the governor
should weigh. The comment on `life.calm(4)` says the four seconds exist so the
player can "hear two or three people talking about the pie/the rub/the tide"
ON the title card (prototype3d.ts:5512-5517) — ambient chatter during the card
was the design. The review's `calm(4 + introLen)` + `chatCd <= 0 && calmT <= 4`
silences it for the whole dive and then grants the same four seconds after the
settle, which honours that intent better than the current code does (the
speakers are on screen then). Alternative, one line and consistent with the
existing "hero card owns the centre" rule: bubbles.ts:213-215 already refuses
crowd lines while `#banner` is showing; add `#titlecard` to that test. Either
closes what I saw at u50/u25; the review's version also closes a bubble born at
4.2-4.8 s from an off-screen ped, the banner version does not.
CORRECTION: the gate selector `.bubble:not(.rival)` matches nothing — bubbles
are `slot.el.className = \`vb ${cls}\`` (bubbles.ts:286) with `.show` added
(294). Assert on `.vb.show:not(.rival)` with visibility !== 'hidden'.

### 4. The HUD is live on frame one
REAL: yes, minor as graded
WHAT I FOUND: I saw "3:00" top-centre, "✦ 0" top-right, the ⌂ button and the
"VOIDLING 1m · NEXT MUNCHKIN" bar in `powder_u100.png`, and the clock reading
2:59 / 2:59 / 2:58 / 2:57 / 2:56 across the sheet. The code says the clock runs
whenever `started && !ended && !paused` — `matchClock -= dtw * clockSpeed;`
(prototype3d.ts:8540) — with no `introT` test, and velocity is damped for the
intro: `if (introT > 0) { const dk = Math.pow(0.9, dt * 60); velX *= dk; velZ
*= dk; }` (8652). Nothing in GOVERNOR.md HANDS OFF or the briefs orders the HUD
on during the intro (I grepped `hud`, `intro`, `title card`, `titlecard`).
FIX SOUND: yes; CSS-only, no draws, no bake.
CORRECTION: the two ids the review could not pin: the ⌂ is `<button
id="btnQuit" title="home">⌂</button>` (index.html:1735); the rank bar is
`<div id="growth">` (1692). `#timer` 1688, `#coins` 1689. No `body.intro` class
exists today (grep), so the name is free. The match clock consuming
introLen seconds is real (settled tPage 4.82 → 2:56) and correctly logged as a
balance experiment, not a fix.

### 5. At orbit the bake's region fills read as hard-edged tonal discs
REAL: yes, as an observation; the attribution is unproven and the review says so
WHAT I FOUND: I saw it in `powder_u100_canvas.png`: a lighter oval around the
lodge with a visible curved edge against darker ground to its right at the same
rows, and a second lighter zone with a curved boundary across the lower third.
The code says the two flat, un-feathered fills are the village floor `ppath(
vil.poly, true); g.fillStyle = 'rgba(226,214,206,0.28)'; g.fill();`
(island.ts:1231) and the apron `g.arc(0, 0, 1, 0, Math.PI * 2); g.fillStyle =
'rgba(150,150,164,0.42)'; g.fill();` (1239-1240) at `L.rx * PU * 0.8` (1238)
— LODGE rx 1150 (powder.ts:81) → 46 units, as stated. The lake is a radial
gradient (1198-1205) and the piste a soft stroke (1187-1188), so the hard arcs
must be the village polygon, the apron, or the shoulder paints above 1185. Note
the apron paint is grey and DARKENS snow, while the review measured the zone
around the lodge BRIGHTER than its neighbours (129-146 vs 109-128) — so the
bright oval is probably not the apron. The review's own hedge ("I cannot say
which paint owns which arc") is correct and the experiment is the right next
step.
FIX SOUND: yes — the feather is pure canvas, no seeded draws (`rand` in this
file is whatever the bake already uses; a gradient adds no draw). The gate must
run in a page (the bake is a 2D canvas built in-browser), which is fine — it
needs no camera.
CORRECTION: the luminance numbers (129-146 / 109-128 / 151-169) are the
review's own pngjs grid, not in powder.json. Consistent with what I saw;
unverified as numbers.

### 6. The tagline is three clauses; every other world's is two
REAL: no — taste
WHAT I FOUND: the code says `sub: 'school is shut · the valley slides · eat it
all'` (prototype3d.ts:1448) and Maple `sub: 'the little void is hungry · eat
the town'` (1323). True. Not in any picture (the card was never shot). The one
consequence that would make it a defect — 45 characters of 16-px bold Fredoka
with 1-px tracking wrapping to two lines on a 430-px phone — is unmeasured, and
finding 1a's reshoot answers it for free. Keep the suggested line in the
governor's pocket; do not count it.

## WHAT THE TEAM MISSED

- **The clamp behaviour is not an intro bug; it is a bubble bug the intro
  exposes.** Chatter fires from any ped within 68 units (life.ts:5556); at
  camDist 38 with fov 32 (prototype3d.ts:9571) the visible field is on the
  order of 25 units tall, so most eligible speakers are off-screen in normal
  play too, and every one of their bubbles is clamped to the top band the same
  way. The intro fix closes the reveal; the general case (a caption at the
  screen edge pointing at nobody) survives it and belongs on the comms board.
- **The card sits on the lodge in u100 AND on the void in u0 for Maple.** The
  review notes Maple's void is centred; with `introLen: 2.2` (1324) the card
  (full to 3.02 s) is over the settled void for ~0.8 s of live control on the
  one world every child sees first. Finding 1b's lower-third move fixes both;
  say so — it is the stronger argument for it than Powder's lodge.
- **u75 is the better ad frame.** In `powder_u75.png` the lodge fills the right
  two-thirds with readable windows and the sky is a sliver; u100 has 23% empty
  sky under the timer. If the store shooter gets one Powder frame it should be
  u75's canvas, not u100's.
- **The snow at u100 is lit as day; the sky is night.** I saw a navy starry
  sky over blue-white ground with no darkening toward the horizon. The lodge's
  windows are the only warm light. That is the poster's palette and probably
  approved, but nobody has said so in writing; one line in the report would
  have closed it.
- **The grit road at u25** (`powder_u25.png`, the brown-grey wedge bottom-right)
  is the one desaturated shape in an otherwise white-blue-purple frame; the
  review mentions it as scenery. It reads as a rendering error at first glance
  — a child's "that's me" frame should not contain a grey rectangle.

SURVIVED: 5 of 6.
