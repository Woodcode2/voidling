# HOLE.IO — RECON REPORT

**Opus 5 to the governor.** Brief: `holeio-recon-brief.md`. Branch: `claude/holeio-recon`.
Evidence: `recon/holeio/` (log, swatches, measurements, 18 crops) and
`reference/holeio/` (10 owner frames). 2026-09-05.

---

## 0 · The verdict in ten lines

1. **The gap is not colour. It is the saturation *gap*.** In the city, 55.6% of the
   playfield is near-neutral (chroma <0.12, mean `#87818c`, saturation 5%) and the
   props on it run 57–100% saturation. The ground is a stage; the objects are the actors.
2. **Every object is lit twice.** A bench's lit face is `#f3be76` and its shaded face
   `#be8247` — a 2.09:1 luminance step on one material. A tree canopy steps 2.54:1.
3. **Shade is hue-shifted, not multiplied.** The tree's shadow side moves 160°→173°;
   the pavement's cast shadow moves 330°→251° (violet). Nothing is darkened in place.
4. **The hole is a lit torus in the player's colour**, 13.4% of its own diameter, with
   three tones (`#7cd0ff` → `#64b5ff` → `#0c4580`) and a 9.12:1 contrast against its
   interior. It is the most legible object on the screen at every size.
5. **Type is three layers: gradient fill, thick contrasting stroke, drop shadow.**
   "Well Done!" is 17.9:1 against its ground, but the *stroke* carries it — the stroke
   covers 67% as much area as the fill, and sits at 3.42:1 from the fill and 5.24:1 from
   the background, so the letter never touches the ground directly.
6. **Their menu is violet too.** The background is `#4c3cbe` hsl(247,52,49) across
   44.8% of the frame — the same family as ours. The difference is that a 3D diorama
   of the actual level occupies 49% of the frame height, and the hero controls sit at
   4.21:1 (PLAY) and 6.50:1 (HUD bar) against it.
7. **The ladder is five colour-coded pips, not a list**: completed grey, magenta for
   100%-cleared (the owner's reading), a 29%-wider green pip for "now", padlocked blue
   ahead. One tap from that row to playing.
8. **Objectives vary on one map.** One level is a points bar (767/1000); another is
   three flower counters (108 / 93 / 118) counting *down* per colour. Same city, different goal.
9. **The reward is shown as a jewel before you can have it** — a locked island
   illustration (galleon, volcano, palms) sits on the end card behind a padlock.
10. **Nothing is textured and nothing is fogged.** Flat colour per face. The depth is
    made entirely of value steps, bevels and coloured shadows.

---

## 1 · What was played

**Nothing. The game could not be run in this environment, in any build.** This is the
single most important caveat in the report and it is not hedged anywhere below.

| path in the brief | outcome |
|---|---|
| **A — current mobile build in an emulator** | **Impossible.** No `adb`, no emulator, no Android tooling present. |
| **B — the older web build (Poki / CrazyGames)** | **Impossible.** The egress proxy denies `poki.com`, `www.crazygames.com` and `hole-io.com`: `403` to CONNECT via curl, `ERR_TUNNEL_CONNECTION_FAILED` in Chromium. Verified twice, once through each client. |
| **C — store listings** | **Partly.** `WebFetch` to `play.google.com` returns `EGRESS_BLOCKED`. `WebSearch` works and returned version history and App Store description text. |
| **D — video** | **Not reached.** No video host was fetchable; no frames were captured. |
| **E — the owner's screenshots** | **The whole visual record.** Ten frames of the current iOS build at 1320×2868 (iPhone 16 Pro Max native). |

So every observation below is from **ten still frames plus web search**. Consequences,
stated once: there is **no observation of motion, easing, timing, sound, haptics, frame
rate, input latency, ad duration, or any flow between screens.** Where the brief asks
for those, the lens says "not observed" and stops. What the frames *do* support is the
static craft — palette, value structure, layout, geometry, typography and information
design — measured rather than described.

**Build identity.** The frames are the current build: they carry the level ladder, the
Skip'it currency and the premium offer, none of which exist in the old free-for-all web
build. Web search puts the current line at 2.5x (2.51.6 seen on mirrors, 2.50.9 widely
listed); a June 2026 developer reply quoted in search results says the game has "only 4
maps". The App Store description now leads with a collection layer: *"The hole is hungry
— and now, so is your inner collector… dive into levels, hunt for hidden spheres, and
crack them open to discover unique figurines. Build your themed Album… If you have
duplicates, you can turn them into coins"*, and states *"Banner ads have been completely
removed from the game."* I did not see the Album in any frame.

---

## 2 · The ten lenses

### L1 · Splash and load — `05-splash.png`

- The frame is a **painted 2D illustration**, not the 3D engine: brushwork on the
  masonry, cast shadows that do not match the game's light, and a hand-drawn hole with
  green lips and teeth. The game's own art (L5) has none of that.
- Composition: the wordmark occupies the top ~25%; the hero — one skyscraper tipping
  into a green-lipped hole — occupies the middle; a city ring fills the lower third.
  Sky is roughly the top fifth.
- Palette (whole-frame clusters): warm orange masonry `#ebb67b` 9.1%, sky blue
  `#3782c6` 7.9%, cream horizon glow `#faf6cf` 5.8%, brick `#8a2c18` 3.9%, deep navy
  `#2a1475` 4.9%. Median chroma 0.314, with 44.2% of pixels above 0.35.
- The palette is split warm-against-cool: a cream-to-orange sunrise mass in the centre
  against a blue sky, with the navy reserved for the wordmark's stroke and shadow.
- Loading ring: bottom centre. **Whether anything animates: not observed.**

**Mechanism.** The splash sells the *fantasy* (a city being eaten), not the product. It
is illustrated, warm, and centred on one readable event. Our splash already works, per
the owner, so this lens is confirmation rather than instruction.

### L2 · The main menu — `08-main-menu-ladder.png`

Layout, measured (percentages of 2868 px height):

```
 0–7%    violet background #4c29be
 7–12%   ┃ top bar (#e9eaf7, near-white): [avatar] [🪙 3.55k +] [🧩 0 +] ........ [⚙]
13–22%   ┃ LEFT: locked reward badge "LEVEL 8" (padlock over grey coins)
         ┃ RIGHT: "ADS" crossed-out button (red disc)
21–70%   ┃ THE DIORAMA — an isometric floating slab of THIS level:
         ┃   towers, roads with crosswalks, a park with a fountain, trees,
         ┃   two orange cars, a helicopter on a helipad, three clouds.
         ┃   Green grass top, orange-brown earth cut on the sides.
~66%     ┃ THE LADDER — five pips: ④ grey · ⑤ magenta · ⑥ GREEN (current) · ⑦🔒 · ⑧🔒
75–82%   ┃ PLAY — full-width green button, white text
85–100%  ┃ tab bar: [STORE] [🏠 selected] [HOLES]
```

- Background is a **violet-blue vertical gradient**, `#4c29be` → `#4759c8` → `#584ec5`,
  covering **44.8% of the frame**, with a darker tiled motif behind it.
- Hero separation is by **value, not hue**: PLAY sits at **4.21:1** against the mean
  background, the top bar at **6.50:1**.
- Buttons are three-tone capsules: light top edge `#c4f8b5`, saturated face `#63d723`,
  dark lower bevel `#3ea50f` — a lit plastic solid, not a flat rectangle.
- Colour budget: violet ground, one green call-to-action, one red ADS badge, one gold
  coin, and the diorama's greens/teals. **Two saturated accents on a violet field.**
- Taps from menu to playing: **one.**
- The menu also carries: a locked level-8 reward, an ads offer, a currency row with two
  `+` buttons, and two other tabs.
- **Idle animation: not observed.** A helicopter and clouds are present and are the
  obvious candidates; I cannot say whether they move.

**Mechanism, and the answer to "ours is purple everywhere".** Theirs is purple too —
the same hue family at the same lightness. What theirs does that ours does not: (a) it
gives half the screen to a **3D diorama of the level you are about to play**, so the
menu's subject is the game rather than a set of cards; (b) it puts exactly **two
saturated accents** on that violet ground and lets everything else stay in-family;
(c) every interactive thing is a **lit solid with a top highlight and a bottom bevel**,
so the screen reads as objects on a surface rather than panels on a colour.

### L3 · First run — `04-tutorial-garden.png`

- Tutorial text, verbatim: **"Tap and drag on the screen to move"**, in a cream capsule
  with a blue border at the bottom of the frame, with a white glove-hand resting on the
  joystick knob.
- The garden is the inverse of the city: **87.7% of its pixels are above chroma 0.35**
  (median chroma 0.580) — grass `#8cc83c` at 56% saturation, hedges `#1a8533`, and red
  flower beds `#fc565c` at 96%.
- The first target is a dense bed of red-and-yellow flowers directly ahead of the hole;
  the hole is small, blue-rimmed and centred.
- **Sequence, timings and the first reward: not observed** (one frame).

**Mechanism.** The first level is deliberately the most saturated in the game and
contains one obvious cluster of small food directly in the path. The city's neutral
restraint is a later, different choice — they are not applying one palette everywhere.

### L4 · Match start and the arena — `02`, `09`, `10`

- **Do all holes start together? Not observed.** No frame shows a match start. `02`
  shows a rival hole (green rim, name label) at mid-match, so rivals exist in that mode.
- HUD occupies a band from **5.2% to 18.1% of screen height, 95.6% of the width**, laid
  over the 3D scene with no dimming plate.
- Counters in `02`: a ring timer **13:25**; a progress bar **767/1000**; a **skull
  counter 5**; a **Size 14** label under the hole. Purple ground triangles appear near
  the top of frame — consistent with off-screen rival markers, unconfirmed.
- Counters in `09`/`10`: ring timer **3:17** / **3:47**, and instead of a bar, **three
  flower counters** (blue 108, red 93, yellow 118 / 140).
- **The flower counters count down.** Between `10` and `09` the clock falls 30 s, yellow
  falls 140→118, and blue and red do not move. They are per-colour *remaining*, so that
  level's goal is clearing a set.
- Camera pitch, from the hole's ellipse ratio (466 px tall / 637 px wide = 0.73):
  **≈47° above the ground plane.**
- Hole on screen: **22.6% of screen width at Size 1, 31.7% at Size 2, 48.3% at Size 14**
  — 14× nominal growth becomes 2.1× on screen, so the camera pulls back ≈6.6× over a match.

**Mechanism.** The player's own object stays between a fifth and a half of the screen
width for the entire match. It is never small enough to lose and never large enough to
fill the frame, so the difficulty of *seeing* never changes while the difficulty of
*playing* does.

### L5 · The item kit and the world art — `02`, `09`, `10`

- **The saturation gap** (the headline): in the city playfield, **55.6%** of pixels are
  below chroma 0.12 — road `#89798f` (9% saturation), pavement `#cbbfc9` (10%) — while
  the cars are `#d6323a` (66%), `#3661c6` (57%), `#deaf2c` (73%). The ground is a
  neutral stage occupying most of the frame.
- **Construction.** A car is three or four boxes: body, cabin, a window band, a darker
  base. No outlines. No textures anywhere in any frame. Edges are slightly rounded.
- **Two-tone lighting on every material**: bench wood 0.573 lit / 0.274 shaded
  (2.09:1); bench legs 0.179 / 0.083; tree canopy 0.142 / 0.056 (2.54:1).
- **Coloured shade.** Tree shade shifts 160°→173°; pavement shadow shifts 330°→251° and
  sits at 1.79:1 under lit pavement. Shadows are violet, not grey, and soft-edged.
- **The "deep 3d" the owner names** is visible in `09`: window frames with real
  thickness and a sill, glass with a diagonal specular streak, awnings with a curved
  profile and stripes, steps with individual treads and a side wall, a door with a
  frame. These are modelled, not painted on.
- Ground is a flat pale field with a faint tile grid; roads are a flat mid-tone with
  white dashes and thick zebra bars. No gradient, no texture.
- **What is deliberately absent:** no fog, no bloom, no outlines, no textures, no
  ground particles, no visible ambient occlusion beyond the cast shadows.

**Mechanism, in one sentence a team can build to.** Keep the ground neutral and let
saturation mark what matters; give every material exactly two tones about 2:1 apart and
shift the hue on the dark one; put the modelling budget into silhouette details you can
read at 47° — a sill, a tread, an awning lip — and spend nothing on texture.

### L6 · The hole — `02`, `09`, `10`

- Rim thickness is **13.4% of the outer diameter** (112 px of 836 px at Size 14).
- The rim is a **shaded torus in three tones**: highlight `#7cd0ff`, body `#64b5ff`,
  dark outer line `#0c4580`. It reads as a tube with a light on it.
- Interior is near-black with a **teal cast and a gradient**: `#02080a` at the far edge,
  `#07171c` at the centre, `#081c21` at the near edge. Not flat black.
- Contrast interior vs rim highlight: **9.12:1**.
- Objects at the lip are **rotated into the hole** and clipped by its edge — a taxi and
  a truck in `02` are tilted mid-fall, a small building is tipping in at the top-right.
- A **size bar** (gold fill on a dark capsule) with a "Size N" label sits directly under
  the hole in every match frame, tying growth to the object rather than to the HUD.
- **Swallow duration, particles, shake, growth easing and joystick behaviour: not
  observed.**

**Mechanism.** The player's avatar is a hole — an absence — so they gave it a lit rim
thick enough to be an object, in the player's own colour, and put the size read directly
under it. The rim is what you actually track, not the void.

### L7 · Feedback and accomplishment — `02`, `03`

- In-match floaters in `02`: **"+1 +1 +3"** in white with a dark outline, stacked near
  the hole, at three sizes — the value of the bite is encoded in the type size.
- The progress bar fills green `#25dd02` with a **hot yellow-green leading edge**
  `#9aef0a` (0.688 luminance against the fill's 0.523) — a glow that marks the growing
  end. Green against the unfilled track is **7.96:1**.
- The end card (`03`) is **not a new screen**: it is the dimmed world (background at
  0.001 luminance) with the hole and the "Size 6" bar still faintly visible behind the
  reward. The card lands where the play happened.
- Its elements, top to bottom: **"Well Done!"** at 22–30% of screen height; a **coin
  +200** with a radiating flare at ~40%; a **level bar "1/14"** at 56–65%; a **locked
  island reward** (galleon, volcano, palms on a disc, padlock in front) at the right;
  **Continue** at 74–83%.
- Typography of "Well Done!": arc baseline, heavy rounded sans, a **vertical gradient
  fill** running `#feee29` at the top to `#fef79e` at the bottom, a thick `#e54b00`
  stroke, a deeper `#a52402` shadow. Fill-to-stroke 3.42:1, fill-to-ground 17.9:1. By area the fill tones total 23.1% of
  the title's region and the stroke tones 15.4% — **the stroke covers 67% as much area
  as the fill**, which is why the letterform never touches the ground.
- Continue is a green face `#38db03` with a **cream** rim `#f6efda` (17.9:1 against the
  ground) and a dark green drop shadow — the rim, not the fill, is what lifts it.
- The reward island is a **pre-rendered illustration**, not the 3D level.
- **Count-up timing, animation, sound and what a match pays besides coins: not observed.**

**Mechanism.** Reward is delivered in the place it was earned, at four escalating
scales (title → coin → progress → the thing you cannot have yet), and every element is
separated from the ground by a stroke rather than by its own colour.

### L8 · The level ladder — `08`, `03`, `09`, `10`

- Presented as a **row of five circular pips** under the diorama, not a list or a map.
- Colour-coded, measured at y=1900: completed `#596793` grey-blue; **magenta `#8f2599`**;
  current `#69e420`→`#adf440` gradient, ringed in white and **29% wider** than its
  neighbours; locked `#98affd` with a padlock.
- **The magenta step is the 100%-clear tier** — this is the owner's reading from play,
  not something I could verify from a still; I record it as their observation. What I
  can confirm is that the palette distinguishes at least four states.
- The end card's bar reads **"1/14"** — a 14-step ladder, separate from the pip numbers
  (4–8), so there are at least two nested progressions (steps within a map, and maps).
- **The same map carries different objectives**: `02` is a points bar (767/1000) with
  rivals and a skull counter; `09`/`10` are a set-clear (three flower colours counting
  down) with no rival visible and a shorter clock (≈4 min vs 13+ min).
- The menu carries a **locked "LEVEL 8" reward badge**, so rewards are pinned to
  specific future steps.
- Web search reports the game has **"only 4 maps"** (developer reply, June 2026), which
  is consistent with a small number of maps multiplied by many objective variants.
- **Taps from end card to next match, and the full goal list: not observed.**

**Mechanism, and it is the one the owner wants.** A small number of maps is multiplied
by a ladder of differently-scored runs over the same ground, each step given a
distinct colour state so a player can see, in one row, what they finished, what they
mastered, where they are, and what is locked. The content cost is the objective and the
tuning, not the world.

### L9 · Monetization — `01`, `06`

- **HOLE.IO PREMIUM, $12.99**: "Remove all forced ads and get extra perks!" with three
  perks — **No Break Time, Play Offline, 1500 Coins**. Dismissal is a plain text link,
  **"NO, THANKS."**, below the panel and much lower in contrast than the price button.
- The store (`06`) is organised by **notched section ribbons**: **DEALS** green
  `#2de074`, **SKIP'ITS** cyan `#19d1fb`, **COIN PACKS** orange. Every price button is
  the same green `#0cd413`.
- **Skip'its** are an ad-skip token: *"WITH SKIP'ITS YOU CAN GET THE REWARDS WITHOUT
  WATCHING THE VIDEO ADS!"* — 10 / $3.99, 50 / $14.99, 200 / $49.99 ("BEST VALUE!").
- **Coin packs**: 1000 / $2.99, 5000 / $11.99, 10000 / $24.99 ("BEST VALUE!").
- The same $12.99 offer appears as a **deal card** in the store and as a **full-screen
  modal** elsewhere, and an "ADS" badge sits on the main menu — three surfaces for one product.
- Rewarded video appears in the skins tab as a gold **"▶ FREE"** button over the grid.
- **"Break Time"** is named twice as something premium removes; the frames do not say
  what it is. A forced wait between matches is the obvious reading, **unverified**.
- App Store description states banner ads have been removed.
- **Ad length, frequency, the post-match flow and any timeline: not observed.** The
  brief asked for a ten-minute session timeline; I cannot supply one and will not invent it.
- **For a 4+ audience**: the dismissal affordance is a low-contrast text link under a
  high-contrast price; prices reach $49.99; a currency named for skipping ads is sold in
  packs. Worth naming before we copy any of it.

### L10 · Feel

*Superseded in part by §11 (motion, timing and the match start, from the owner's recording).*

**Not observed.** Frame rate, input latency, camera follow behaviour, sound and haptics
all require running the game. The only feel-adjacent measurements available from stills
are the camera pitch (≈47°) and the hole's constant screen share (22.6%→48.3% across
Size 1→14), both in L4.

---

## 3 · The level ladder, mapped

| element | evidence | value |
|---|---|---|
| presentation | `08` | five circular pips in a row under the level diorama |
| states seen | `08` | completed (grey `#596793`), magenta `#8f2599`, current (green gradient, white ring, 29% wider), locked (blue `#98affd` + padlock) |
| magenta = 100% clear | owner, from play | not verifiable from a still; recorded as their reading |
| steps in the bar | `03` | "1/14" |
| pip numbers seen | `08` | 4, 5, 6, 7, 8 |
| maps | web search, Jun 2026 dev reply | "only 4 maps" |
| objective type A | `02` | points bar 767/1000, rivals present, skull counter 5, clock 13:25 |
| objective type B | `09`,`10` | clear three flower colours (108 / 93 / 140→118, counting down), clock ≈3:47 |
| reward pinned to a step | `08` | locked badge "LEVEL 8" |
| reward shown on completion | `03` | locked island illustration (galleon, volcano, palms) + 200 coins |
| unlock rule, goal list, taps between matches | — | **not observed** |

## 4 · The main menu, mapped

The labelled layout and the colour measurements are in §2 L2. Idle motion could not be
observed; the helicopter and three clouds in the diorama are the candidates.

Three tabs, each with **its own background hue** — this is a real and cheap device:

| tab | background | hue |
|---|---|---|
| STORE | `#2f578f` | 215° blue |
| PLAY | `#4c29be` | 254° violet |
| HOLES | `#d38023` | 32° orange |

The HOLES tab is a **43-item collection**: "CLASSIC HOLES 1/27" and "SPECIAL HOLES
0/16", in a 3×3 grid of cards. Owned/selected is a light card with a green border and a
green tick; unowned are dark grey cards. Named skins visible: CLASSIC HOLE, SPINNER,
RIPLEY (a shark's mouth), BLACK HOLE, RACCOON, SPIRAL, THUNDER, TORNADO, HEART. A gold
"▶ FREE" rewarded-video button floats over the grid.

## 5 · The monetization timeline

**Cannot be supplied.** A ten-minute session timeline requires playing. What the frames
establish is the *surface inventory*: one $12.99 premium (as modal, as store deal, and
as a menu badge), three Skip'it packs ($3.99–$49.99), three coin packs ($2.99–$24.99),
a rewarded-video skin unlock, and a "Break Time" mechanic that premium removes.

---

## 6 · The twenty things that most explain the gap

Ranked by what I judge to be effect-per-unit-of-work for us. Every line is a mechanism
with its evidence.

1. **The neutral stage.** Ground at 5–10% saturation over ~56% of the playfield, props
   at 57–100%. Pop is a *gap*, not an amount. (`02`, measure.md)
2. **Two tones per material, ~2:1 apart.** Bench 2.09:1, tree 2.54:1. Nothing is
   single-tone. (`10`)
3. **Hue-shifted shade.** 160°→173° on foliage; ground shadows violet at 251°, never
   grey. (`10`)
4. **The avatar has a lit rim.** 13.4% of its diameter, three tones, 9.12:1 against its
   interior, in the player's colour. (`02`)
5. **Three-layer display type**: gradient fill + thick stroke + shadow; the stroke covers
   67% as much area as the fill and does the separating. (`03`)
6. **Cream, not white, as the lifting stroke** on buttons — 17.9:1 against a dark
   ground while staying warm. (`03`)
7. **Three-tone capsule buttons**: light top edge, saturated face, dark bottom bevel.
   Objects, not rectangles. (`08`, `03`)
8. **A 3D diorama of the level as the menu's hero**, at 49% of frame height, on the same
   violet we already use. The fix for our menu is not the background. (`08`)
9. **Two saturated accents maximum** on the menu ground; everything else stays
   in-family. (`08`)
10. **Colour-coded progress pips** with four distinct states and the current one 29%
    wider. Progress is a picture, not a list. (`08`)
11. **One objective, one map, many runs** — a points bar on one pass, a three-colour
    set-clear on the next. Content multiplied without new worlds. (`02` vs `09`/`10`)
12. **The end card overlays the dimmed world**, so the reward lands on the ground where
    it was earned. (`03`)
13. **The next reward shown as a locked jewel** — an illustrated island behind a
    padlock, not a screenshot of the level. (`03`)
14. **The progress bar has a hot leading edge** (0.688 vs 0.523) so the growing end is
    the brightest thing in the bar. (`02`)
15. **Bite value encoded in floater size** — "+1 +1 +3" at three sizes. (`02`)
16. **Size read attached to the avatar**, not to the HUD: a gold bar and "Size N"
    directly under the hole. (`02`, `09`, `10`)
17. **Constant screen share for the player object** — 22.6%→48.3% while nominal size
    goes 1→14; the camera does the work. (`10`,`09`,`02`)
18. **A tab is a colour world** — blue store, violet play, orange skins. Cheap, and it
    tells you where you are before you read anything. (`06`,`07`,`08`)
19. **A 43-slot skin collection with a free-via-ad slot** and two fraction counters
    (1/27, 0/16) visible at all times. (`07`)
20. **Modelled silhouette details, zero texture** — sills, treads, awning lips, window
    thickness; no maps, no fog, no bloom. Budget spent where 47° can see it. (`09`)

---

## 7 · What Hole.io does not have that we do

Honest, from the same frames — this is where our identity lives.

1. **Named rivals with personality.** Their rival is a coloured rim with a label; ours
   are characters with archetypes and hunt behaviour.
2. **A newsroom that commentates the match by name.** Nothing in any frame does this.
3. **Authored beats on a match clock** — our parade, avalanche, whale. Their match is a
   timer and a counter.
4. **A crowd with jobs.** Their cities have cars and a few tiny figures; ours has 542
   people in roles carrying props (measured this week by `qa/jobs.mjs`).
5. **Six hand-built worlds with distinct fiction**, against their four maps.
6. **World-specific voice** — our people say things belonging to their world.
7. **A cute character rather than an absence.** Their hole is a hole; ours is a
   creature, which is why our shop sells hats.
8. **Portrait-native 3D with a real light rig** — shadow maps, bloom, a per-world sun.
   Theirs is flatter by choice; we can be richer without being noisier.
9. **A machine quality gate.** 31 push-gate steps with frozen-debt baselines. There is
   no evidence they hold anything like it, and it is why our regressions get caught.
10. **No forced ads, no $49.99 pack, no ad-skip currency.** We are 4+ and can stay that
    way; their dismissal affordance is a low-contrast link under a high-contrast price.

---

## 8 · Open questions and what could not be observed

*Bullets 1, 3 and 4 are answered in §11 from the owner's recording; the rest stand.*

- Everything in motion: idle animations, swallow duration, growth easing, camera follow,
  transitions, the ad flow, count-up timing.
- All sound and haptics.
- Frame rate and input latency.
- Match start: whether all holes start co-located (the owner's belief) — **no frame shows it.**
- The full ladder: goals per step, unlock rules, difficulty curve, taps between matches.
- What "Break Time" is and how long it lasts.
- The Album / figurine collection named in the App Store description — absent from all ten frames.
- Whether the magenta pip means 100%-cleared (owner's reading) or a difficulty tier.
- Why `01` shows a padlock in the left tab slot where `06`/`08` show STORE — most likely
  the store unlocks with progression (coins differ, 2.95k vs 3.55k, so `01` is earlier),
  but this is inference from two frames.

## 9 · Corrections

1. **HSL saturation is unusable on dark frames, and my first pass used it.** Near-black
   `#000213` reports S=100%, which made the *dimmed end card* read as the most saturated
   image in the set (median S 100%). Re-measured with chroma = (max−min)/255, the end
   card is the *least* colourful frame (median 0.078, 12.4% above 0.35). Every
   colourfulness number in this report is chroma; the HSL figures are discarded.
2. **My first swatch pass guessed ~15 coordinates and missed.** It reported the timer
   ring as `#211646` (dark violet — it had landed on background), inverted the tower's
   lit and shaded faces, and read the Continue button's rim as its face. All were
   re-taken with `find.py`, which clusters a region by colour and reports centroids, so
   no colour in this report depends on a guessed pixel.
3. **My first hole-geometry pass was contaminated.** A naive "dark pixel" threshold
   picked up building shadows and returned a hole spanning the entire search box, and a
   rim-walk on row y=1510 returned a 1 px left rim because a taxi sits in the rim there.
   The reported geometry comes from row y=1450, chosen because it crosses clean rim on
   both sides, and is stated with that method.
4. **I mis-stated the stroke-to-fill ratio.** A draft said the "Well Done!" stroke was
   46% of the fill's area. Recomputed from the same clusters: fill tones (hue 55) total
   23.1% of the title's region, stroke tones (hue 12–20) total 15.4%, so the stroke is
   **67%**, not 46%. Corrected in §0, §2 L7 and §6.
5. **I over-read the ladder once.** An earlier draft said the pips were "levels 4–8 of
   14". The "1/14" bar is on the end card and the pips are numbered 4–8; I have no
   evidence they are the same scale, so the report now treats them as two progressions.

## 10 · Evidence index

**`reference/holeio/`** — owner-supplied frames, all 1320×2868:

| file | contents |
|---|---|
| `01-premium-offer.png` | premium modal, $12.99, "NO, THANKS.", tab bar with a locked left tab |
| `02-match-city.png` | city match, Size 14, 767/1000, timer 13:25, skull 5, rival hole |
| `03-well-done.png` | end card: "Well Done!", +200, 1/14, locked island, Continue |
| `04-tutorial-garden.png` | first-run garden, "Tap and drag on the screen to move" |
| `05-splash.png` | splash illustration, Voodoo / HOLE wordmark |
| `06-store-tab.png` | store: DEALS / SKIP'ITS / COIN PACKS, all prices |
| `07-holes-tab.png` | skins: CLASSIC 1/27, SPECIAL 0/16, nine named skins, ▶FREE |
| `08-main-menu-ladder.png` | main menu: diorama, five ladder pips, PLAY, tab bar |
| `09-match-flowers-size2.png` | flower-clear objective, Size 2, 108/93/118, 3:17 |
| `10-match-flowers-size1.png` | flower-clear objective, Size 1, 108/93/140, 3:47 |

**`recon/holeio/`** — my evidence: `session.md` (log and environment), `swatches.md`
(every colour with its method), `measure.md` (every number with unit, source, method),
and 18 verified crops: `10`–`15` match detail, `20`–`22` splash, `30`–`32` end card,
`40`–`42` tutorial, `50`–`52` premium/tab bar.

**Tooling** (scratchpad, not committed): `probe.py` (dims/px/region/top/sat/scan),
`find.py` (colour-cluster feature location), `chroma.py` (corrected colourfulness),
`crop.py`, `tryweb.mjs` (the browser reachability test).

## 11 · Motion, from the recording (governor's addendum)

Written by the governor from the owner's 25.8 s screen recording
(`recon/holeio/vid-owner-recording-25s.mp4`, iPhone 16 Pro Max, 1320×2868), measured
frame by frame by the M1 timeline measurer. **This section supersedes every "not
observed" line above that concerns motion, timing and the match start** (L1 loading,
L2 idle animation, L3 sequence, L4 match start, L10 feel, §8 bullets 1, 3 and 4). Sound,
swallow timing, floater lifetime, the size-up curve, growth over the match, camera follow
and joystick behaviour are being measured by M2–M4 and are appended below as they land.
Evidence: `recon/holeio/vid-M1-findings.md` (every number with its method),
`vid-M1-timeline.csv`, `vid-M1-descent_scale.csv`, and four montages `vid-M1-mont_*.png`.

**Frame convention.** The recording decodes to 1,547 frames at a constant 60 fps; frame N
is at t = (N−1)/60 s. Durations are in ms at 60 fps. Frame numbers are the half-scale
`f60` set. The recorder dropped frames at 4.30 s, 4.42 s, 7.73 s and 17.74 s (50–83 ms
each); those gaps are filled with duplicated frames and are excluded from every timing.

### 11.1 · Timeline of the clip

| t (s) | frames | ms | screen / event |
|---|---|---|---|
| 0.00 | 1–49 | 817 | Store tab, idle |
| 0.82 | 50–54 | 83 | Store→Holes tap: coin pill pops 25%→100%, nav hole icon grows |
| 0.90 | 55 | 17 | Holes tab, **empty blue panel** (grid not yet drawn) |
| 0.92 | 56–101 | 767 | CLASSIC HOLES grid; tab header bounces 300 ms |
| 1.68 | 102 | 17 | Special-holes tab, empty panel |
| 1.70 | 103–127 | 417 | SPECIAL HOLES grid |
| 2.12 | 128–153 | 433 | CLASSIC HOLES grid again (drawn immediately, no empty frame) |
| 2.55 | 154–205 | 867 | Main menu: city diorama, level pills 5–9, SOLO RUN card, PLAY |
| 3.42 | 206–220 | 250 | LEVEL 7 booster card pops in |
| 3.67 | 221–253 | 550 | Card static; PLAY pressed f249–253 |
| 4.22 | 254–270 | 283 | Loading… (static) |
| 4.50 | 271–313 | 717 | Gameplay, high idle camera, no input |
| 5.22 | 314 | — | **Touch-down**: joystick jumps to the finger, timer starts |
| 5.25 | 316–385 | 1,167 | Camera descent to the play height |
| 6.42 | 386–1514 | 18,817 | Settled camera, play |
| 25.23 | 1515–1547 | 550 | iOS Control Centre, recording stopped |

The clip starts on the Store tab; the main menu is on screen for 52 frames only. Every
tab change is a hard cut (whole-frame difference 75–87 out of 255), with the content
drawn one frame after the panel.

### 11.2 · Menu and store at rest

- **Store (f1–49): one idle animation.** The four-point white sparkle on the ADS banner
  twinkles with a scale pulse whose half-period is ≥ 25 frames (full period not
  measurable in 49 frames). Nothing else moves: the sunburst rays do not rotate
  (< 0.25° over 49 frames), the nav icon is static to the pixel, no shine sweeps cross
  the coin packs, and the FREE button does not pulse.
- **Holes tab entrance (f55–72):** the active tab header bounces (top edge 194→203→199
  half-px, settled in 18 frames = 300 ms); the nav hole icon grows 90→177 half-px with
  an ease-out over 25 frames (417 ms); the green "+" on the coin and ticket pills pops
  f67–80 with a 2× overshoot (11→33→17 px). After it settles, nothing on the tab is
  periodic.
- **Main menu entrance (f154–177):** the nav hole icon shrinks 177→90 in 6 frames
  (100 ms); the coin pill pops **with overshoot** (yellow area 61→674→~510 px, 15 frames
  = 250 ms); the PLAY button's colour settles over 23 frames (383 ms) at constant size,
  so a sheen fade, not a scale.
- **Main menu at rest (f162–199): the city drifts.** Sub-pixel template tracking shows
  the tallest tower's helipad moving +6.0 px x / −1.0 px y over 37 frames (0.16 px/frame
  half-res, 0.32 full-res) while the island base, the SOLO RUN card, PLAY and the HUD do
  not move at all. The fit is not a 2D rotation, translation or scale of the frame; it is
  consistent with a **slow 3D camera orbit of the diorama**, accelerating across the
  window (period and reversal not measurable in 46 frames). The helicopter's rotor shows
  no resolvable rotation beyond the drift. **The UI is static; only the world moves.**
- **PLAY tap → card (f200–218):** the backdrop dims linearly, luminance 43.7→20.6
  (−53%) over 19 frames (317 ms), ~1.6 lum/frame; the HUD dims with it.

### 11.3 · The LEVEL 7 booster card

- **Pop-in:** scale from the screen centre with **~10% overshoot**: interior width
  125→…→641 (peak, f214) →583 (final, f220). 9 frames to peak, 6 to settle, **15 frames
  = 250 ms**. The card's PLAY pill then pops separately (f215–230, 16 frames, ~16% area
  overshoot) and the orange X after it (f224–238, 15 frames, large overshoot). Three
  staggered pops, ~150 ms apart.
- **Geometry (full-res f240):** outer card 1,230×1,698 px = 93.2% of width, **59.2% of
  height** (top at 24.5%, bottom at 83.7%). Cream header, orange body with two white
  slot tiles (345×447 each), cream lower panel with a torn-paper edge at the join, blue
  footer with a darker lip. PLAY pill 670×223 px = 50.8% of screen width. X close ~105 px
  = 8% of width. Colours: frame `#6c7ff2`, cream (250,241,224), orange (252,170,95),
  PLAY green (95,208,18)→(130,226,42), lip (74,91,227).
- **Strings, verbatim:** "LEVEL 7" · "Lv. 9" · "Lv. 13" · "Select Boosters to start with
  an advantage!" (two centred lines) · "PLAY". Two slots, both locked, unlock labels
  Lv. 9 and Lv. 13. No booster names, no third slot, no price. The badge behind reads
  LEVEL 8 while the card and the selected pill say 7.
- **Press state:** PLAY darkens (green area 19,583→16,383) over f249–253, then a hard
  cut to Loading.

### 11.4 · The loading screen is static

283 ms (17 frames). Royal-blue ground (19,87,205), a stack of objects falling into a hole
with vertical light streaks (tree, hydrant, taxi), small stars, "Loading…" text. No
progress bar. Object centroids move < 0.03 px/frame, region luminance 109.00→109.02:
**nothing moves, fades or loops.** The recorder dropped six frames here, consistent with
the app stalling while it loads. This corrects the L1 assumption that the ring animates:
there is no ring in this build's loading screen, and the screen is a still.

### 11.5 · The match opening

- **Idle phase (f271–313, 717 ms).** The camera starts high and does not move (cone
  scale 1.0000 ± 0.0002 over 43 frames); the hole is 22×14 half-px, static; a joystick
  ring (77×77 half-px, ~154 px full-res) is already drawn, knob concentric. **The match
  does not start until the player touches.**
- **The goal scroll is timer-driven, not input-driven.** Rolled scroll visible by f301
  (0.5 s after gameplay begins), **unrolls f308–314 (7 frames, 117 ms)**, open
  f315–337 (383 ms), rolls up f338–343 (100 ms), gone f344. It unrolls before any input
  and rolls up during the descent.
- **Touch-down f314.** The joystick jumps from its default spot (326.6,1072.0) to the
  finger (476.2,1013.8): **floating joystick** that re-anchors on touch. Knob deflection
  begins f319; **the hole first moves f321** (7 frames after touch-down, ~117 ms).
- **The descent (f316–385, 70 frames = 1,167 ms).** Ground scale ×4.755 (cone-pair
  tracking; hole interior width 22→108 half-px agrees within 3%). Camera-height progress
  fits **ease-in-out** (RMS 0.063 vs linear 0.113, ease-out 0.155); 50% at t = 0.45,
  10%/90% at f330/f366. Thresholds on the same series: 1–99% = 1,050 ms, 5–95% = 800 ms.
  Ground-scale progress fits ease-in-quad. The camera also tilts toward top-down: hole
  aspect 0.64→0.80, view angle from vertical ≈50°→≈37° (rough). The camera ends at
  ~21% of its starting distance.
- **The first reward lands during the descent.** The hole eats its first cone f340–356
  and the first "+1" floater pops **f356**, while the camera is still at 45% of the way
  down. The "Size 1" bar pops in one frame at f369; the timer ring scales in f372–383
  (12 frames, 200 ms). The HUD is off screen f271–371.
- **The timer starts on the touch, not on the load.** Digit changes every 62.33 frames
  (linear fit, residuals ≤ 0.6 frame): **1.039 s per displayed second** at 60 fps
  (1.048 s if the recorder was 59.49). Extrapolated back, 4:00→3:59 lands at f376 and
  the 4:00 start at f313.7 = the touch-down frame. So the idle phase is free, the descent
  is on the clock.
- **Joystick:** first drawn on the first gameplay frame at a default position; on touch it
  re-anchors to the touch point; deflection follows the finger. Whether a finger was
  already down at f271 cannot be distinguished.

### 11.6 · What this changes in the build plan

1. **Match start is gated on input; the clock starts with the finger.** We currently
   start the match on load. Hole.io gives 0.7 s of free high-camera idle, then a 1.17 s
   ease-in-out descent that is *on the clock* and already paying out (+1 at 45%).
2. **Every UI entrance is a scale pop with 10–16% overshoot in 250 ms**, staggered
   ~150 ms per element (card → PLAY → X). Coin pills pop with overshoot on every tab
   change. Tab changes are hard cuts, content one frame late.
3. **The menu world moves; the menu UI does not.** A slow diorama orbit of ~0.3 px/frame
   at full-res is the only motion, and it is enough.
4. **The loading screen is a still** and lasts 283 ms. We do not need a loading
   animation; we need a loading illustration and a fast load.
5. **The goal scroll is a timer:** 117 ms unroll, 383 ms open, 100 ms roll-up, before
   any input. It never waits for the player.
6. **Floating joystick** that re-anchors on touch-down; ~117 ms from touch to first
   movement.

### 11.7 · Corrections to this addendum

1. **Frame rate.** My first pass assumed the container's 59.49 fps. M1 decoded the source
   at both rates and matched the extracted frames: mean absolute difference 2.3–4.5 at
   60 fps against 7.2–22.4 at 59.49 fps. The set is 60 fps; frame N is at (N−1)/60 s. All
   timings in this section use 60 fps.
2. **Match start.** §8 said no frame shows a match start. The recording does: the match
   starts on touch, not on load, and the timer starts with the touch.
3. **Loading animation.** L1 assumed a loading ring that might animate. The build's
   loading screen has no ring and nothing animates.
4. **The descent length.** M1's summary table lists the descent window as f314–385
   (1,200 ms) measured from touch-down; the scale series shows motion from f316. The
   report uses **f316–385 = 1,167 ms** as the descent and f314 as the touch.

*M2 (swallow, floaters, size-up), M3 (growth, camera follow, joystick), M4 (audio) and
the skeptic's verdict are appended below when they land.*

---

*Opus 5, for the governor. The one mechanism I would show first is §6.1 — the neutral
stage. It is measured, it is cheap, and it changes every frame of our game at once.*
