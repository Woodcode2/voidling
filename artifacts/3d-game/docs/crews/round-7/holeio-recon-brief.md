# HOLE.IO RECON — the governor's brief for Opus 5

*You are Opus 5, working for the studio that ships THE CUTE WORLD ENDER (repo
`voidling`, game at `artifacts/3d-game`). I am Fable, the governor. This brief
is the whole task. Read it once, then work it top to bottom. Everything you
bring back gets read by me and turned into the polish plan, so the only thing
that matters is that what you write down is TRUE, SOURCED and MEASURED.*

---

## 0. Why

The owner played Voodoo's **Hole.io** after its 2026 update and played our
game the same day. Verdict, verbatim: *"The game looks beautiful. We are so
far behind. It doesn't even compare. I don't even want to launch until we can
do this polish."*

Our game is not Hole.io and is not going to become it: ours is portrait,
Three.js, a three-minute match on one of six hand-built islands (Maple Falls,
Pirate Bay, Game Day, Lantern Night, Powder Pass, Skylark Field), with named
rivals, a newsroom that commentates, authored beats, a hat and sticker shop,
and a cute void instead of a hole. The owner likes our splash page. The owner
does **not** like our main menu ("purple everywhere, doesn't pop"), and says
Hole.io's **items have colour and pop with simplicity behind it**, its
**sense of accomplishment** is far ahead of ours, and its new
**Angry-Birds-style level ladder** — the same level replayed with different
challenges, from "consume X" up to "100% clear" — is an idea we should take,
because it turns six worlds into eighteen or twenty-four levels without
building new content.

Your job is **reconnaissance, not design.** Go and play Hole.io, record what
you see, measure it, and bring it back structured so I can decide what we
build. You do not touch `src/`. You do not propose our redesign. You observe,
you measure, you explain the *mechanism* behind what works, and you cite
evidence for every sentence.

---

## 1. Ground rules

1. **Truth over coverage.** A blank cell with "could not observe" beats a
   guess. Never describe a screen you did not see. If you infer, say
   "inferred from …" and name the source.
2. **Version discipline.** Hole.io has an old web build (Poki, CrazyGames and
   clones) and a new mobile build with the level ladder, premium offer and
   "Well Done!" screens (the owner's screenshots, §3). Every observation
   names which build it came from. Never blend them.
3. **Official sources only.** The App Store, Google Play, Voodoo's own pages,
   Poki/CrazyGames for the web build, YouTube for video of the mobile build.
   No APK mirrors, no decompiling, no reverse engineering of binaries. No
   purchases. No real accounts: if an emulator path needs a store sign-in and
   the environment has no test account, skip that path and say so.
4. **Evidence for every claim.** A screenshot file, a video frame with source
   and timestamp, or a store-listing URL. Measurements with units. Colours as
   hex sampled from the image, with the pixel region named.
5. **Record your own corrections.** If you wrote something and later found it
   wrong, leave the correction in the report under "Corrections". Never
   silently rewrite.
6. **Checkpoint.** Commit the evidence folder and the report to branch
   `claude/holeio-recon` every 30 minutes of work and push. A session that
   dies mid-way must leave a readable partial report.
7. **Budget.** One session. Plan for two to three hours of agent time. Stop
   at the point where another hour would add adjectives, not measurements.

---

## 2. How to get at the game — in this order, fall through when blocked

**A. The current mobile build (preferred).** If the environment has an
Android emulator with Google Play and a *test* account already provisioned,
install Hole.io from Google Play and play it. Record the version string from
the store page and from the in-game settings. Play for at least 40 minutes:
the first-run flow, at least 8 matches across at least 2 levels of the
ladder, one full post-match ad flow, the main menu, every tab, the shop.

**B. The web build (fallback, and useful anyway).** `poki.com/en/g/hole-io`
or `crazygames.com/game/hole-io`. This is the OLDER build (two-minute
free-for-all, no ladder). It is still the same feel for the hole, the
swallow, the growth, the camera, the item kit and the palette, so play it for
at least 20 minutes and measure lenses L4–L7 and L10 there. Label everything
"web build".

**C. The store listings.** App Store (iOS) and Google Play pages: every
screenshot, the "What's New" history as far back as it goes, the current
version and date, the rating, and the twenty most recent reviews that
mention the update, levels, ads, or the shop. Save the screenshots.

**D. Video.** YouTube, searched for the mobile build after its levels
update (queries like `hole.io new update levels`, `hole.io 2026`,
`hole.io premium`). Prefer unedited phone captures over commentary. Capture
frames at the moments listed in §4 and name them `vid-<channel>-<mm-ss>.png`.
Note the upload date; a video older than the update is the old build.

**E. The owner's screenshots** — already in the repo at
`docs/crews/round-7/reference/holeio/`. They are your calibration of what
"current build" means:

| file | what it shows |
|---|---|
| `01-premium-offer.png` | HOLE.IO PREMIUM: "Remove all forced ads and get extra perks" — No Break Time, Play Offline, 1500 Coins — **$12.99**, "NO, THANKS." below; the bottom tab bar (locked / home / HOLES); HUD with a coin balance (2.95k) and a ticket counter (0) |
| `02-match-city.png` | a match in a city: timer **13:25** in a ring, progress bar **767/1000** in green, a skull counter **5**, a settings cog, floaters "+1 +1 +3", the hole with a thick pale-blue rim and a black interior swallowing a taxi and a truck, a size pip and label **Size 14**, a floating joystick, a rival hole (green rim) with its name over it |
| `03-well-done.png` | "Well Done!" in chunky yellow-orange type, a coin **200** with a flare, a level bar **1/14**, a locked island reward (volcano, galleon, palm) with a padlock, a green **Continue** button |
| `04-tutorial-garden.png` | first-run garden: flower beds, topiary with flowers, the hole small with a blue rim, a hand on the joystick, "Tap and drag on the screen to move" |
| `05-splash.png` | the splash: Voodoo, the HOLE wordmark with an orange ring, a skyscraper being eaten by a green-lipped hole with teeth, helicopter, hot-dog cart, police car, a loading ring |

Look at each one for five minutes before you play anything, and write down
what you notice. Those notes are the first section of your evidence log.

---

## 3. The recording protocol

Create `docs/crews/round-7/recon/holeio/` and keep:

- `session.md` — a timestamped log, one line per event: what you did, what
  happened, what file you saved. Start it with the environment (what you
  could and could not run) and end it with total time.
- `NN-<moment>.png` — screenshots, numbered in the order taken, named for
  the moment (`07-menu-idle.png`, `12-match-start.png`, `19-end-card.png`).
- `vid-<channel>-<mm-ss>.png` — video frames.
- `swatches.md` — every colour you sampled: hex, where from (file + region),
  what it is (rim, grass, road, sky, HUD bar, button).
- `measure.md` — every number: a table per lens (§4) with value, unit,
  source, method.
- A screen recording of one full match and one full post-match flow if the
  tools allow it (`.webm` or `.mp4`, under 50 MB, or a link). If they do not,
  say so in `session.md` and take a screenshot every ten seconds instead.

Nothing in this folder is opinion. Opinion goes in the report (§5).

---

## 4. What to observe — ten lenses

For every lens: answer the questions, take the measurements, save the
evidence, and then write **the mechanism** — *why* it works, as a pattern
another team could reproduce, not as praise.

### L1 · Splash and load
- What is on screen from tap to menu, in order, with seconds.
- The splash composition: focal object, where the title sits, how much of
  the frame is sky, the palette (sample five hexes), the light direction.
- Is the loading ring the only motion, or does the splash move?

### L2 · The main menu — the owner's sore point
- A labelled layout of the whole screen (an ASCII box diagram is fine):
  every element, its size as a % of screen height, its colour.
- **What moves when you do nothing.** List every idle animation with its
  period (the hole preview, coins, particles, bobbing, light sweeps).
- The colour budget: how many distinct hues, what the background is (sample
  it in three places), how the buttons separate from it (value contrast,
  saturation contrast, drop shadow, bevel, outline — which of these).
- Typography: the display face's weight, outline, shadow, the colours of
  the fill and the stroke; how many type sizes are on screen.
- The tab bar: what the three tabs are, which is default, what a locked tab
  says when tapped.
- What the menu is *for*: how many taps from menu to playing, and what
  else it tries to get you to do (offers, daily reward, missions, shop).
- Then say plainly what makes it pop, in mechanisms: e.g. "one saturated
  hero on a desaturated ground", "every panel has a two-tone bevel", "the
  hole preview rotates at 0.2 Hz". Compare against ours only in one line:
  ours is one purple field with flat cards.

### L3 · First run
- Every screen from first launch to the first swallow, with seconds and
  taps. The tutorial text verbatim. When the first "reward" happens.
- The garden level: what is in it, how many props, how fast the hole grows,
  when the first size-up lands, whether rivals exist.

### L4 · Match start and the arena
- **Do all holes start at the same spot?** (The owner believes so.) Where,
  how they spread, whether rivals are visible in the first frame, how long
  until the first rival contact.
- The arena: size relative to the hole, how much is visible at start, how
  the camera zooms out as the hole grows (measure the visible ground width
  at three sizes).
- The timer, the goal (e.g. 767/1000 — of what?), the skull counter (kills
  of rivals?), the size label — what each one is counting.

### L5 · The item kit and the world art — "colour and pop with simplicity"
- Count the distinct prop types visible in one frame of the city and one of
  the garden. Group by size class (tiny: cones, flowers; small: people,
  benches; medium: cars, trees; large: houses; huge: towers).
- The shading model: flat-shaded, toon-banded, gradient-lit, or textured?
  Are there outlines? Ambient occlusion at the ground? Contact shadows? A
  directional shadow, and in which direction? Sample the top and side of
  one house, one car, one tree (hex) and state the value ratio.
- The palette: per world, the ground hex, the road hex, the sky/void hex,
  and the five most common prop hues. Saturation level in words and numbers
  (HSL S%).
- Silhouette rules: are props built from few big shapes? Are edges rounded?
  Do things sit on plinths/bases? Is anything textured, or is it all colour?
- Size hierarchy: how much bigger is the biggest thing than the smallest,
  and how many steps between.
- Ground: is it one flat colour, a gradient, a grid, a texture? Roads:
  markings, kerbs?
- What is NOT there: no fog? no bloom? no particles on the ground? Say what
  they leave out, because simplicity is a choice.

### L6 · The hole
- The rim: thickness relative to the hole diameter, its colour, whether it
  has a bevel or a gradient, whether it is the player's colour.
- The interior: pure black, or gradient; is there a visible depth?
- The swallow: do objects tilt, fall, shrink, spin? How long does one take
  (frames or ms)? Is there a particle, a ring, a screen shake, a sound?
  Does a bigger object do anything different?
- Growth: how the size label changes, whether growth is continuous or in
  steps, how the camera responds to each step, and the easing (snap, ease
  out, spring).
- The joystick: floating or fixed, dead zone, whether the hole speed
  changes with size.

### L7 · Feedback and accomplishment — the owner's second sore point
- Every floater and pop in a match: "+1", "+3", combos, size-ups, level-up
  cards — with their colour, type, size, duration and motion (rise, scale,
  fade).
- The progress bar: what fills it, how it animates, what happens when it
  fills (does the match end? a fanfare?).
- The end card: the sequence and timing of "Well Done!" → coin count-up →
  level bar advancing → reward tease → Continue. Measure the count-up
  duration and the bar's animation. What sound plays. What the reward
  tease shows and what it takes to unlock it.
- What you get for a match (coins, tickets, XP), and what those buy.
- Streaks, dailies, missions, chests — list what exists and how it is
  surfaced.

### L8 · The level ladder — the idea the owner wants
- Map the ladder as far as you can see it: levels per island, the goal type
  of each level (consume N, reach size N, eat N rivals, survive T, clear
  100%), the timer per level, the arena per level (same map re-used? how
  many maps?), the reward per level, the unlock rule.
- How it is presented: a path, a grid, a bar (`1/14`), a map with islands?
  What the player sees between matches.
- How many taps from end card to the next match.
- The difficulty curve in numbers where you can get them (goal N vs level).
- Where the free-for-all mode went: still there? behind what?

### L9 · Monetization and the session
- The post-match ad: how long, skippable when, how often (every match?
  every second?), and the exact "watch or pay" prompt with its price.
- HOLE.IO PREMIUM: the perks, the price, when it is shown, how often, how
  it is dismissed. Any other offers (starter packs, coin bundles, skins) with
  prices.
- Rewarded ads: what they give (x2 coins? a skin? continue?).
- "No Break Time": what a break is — a forced pause between matches? Time
  it.
- Write a ten-minute session as a timeline: match, card, ad, prompt, menu,
  match … with seconds.
- Note anything a 4+ rating would care about (we ship to children).

### L10 · Feel
- Frame rate as best you can judge it, and whether it drops when the hole is
  huge.
- Input latency: does the hole move the frame you touch, or lag?
- Camera: height and tilt (estimate the angle from the vanishing of
  buildings), how it follows (locked, lerped, leading), how it zooms with
  size, whether it ever tilts up.
- Sound: the eat sound (pitch, whether it rises with combos), the size-up
  sting, the music (tempo, when it changes), the end-card fanfare.
- Haptics, if the platform exposes them.

---

## 5. The report — `docs/crews/round-7/holeio.recon.md`

Write it for a director who did not watch you work. Structure, in order:

0. **The verdict in ten lines.** What Hole.io does that explains the
   owner's "it doesn't compare", named as mechanisms with evidence.
1. **What was played.** Build(s), version, platform, duration, what could
   not be reached and why.
2. **The ten lenses**, each: observations (a bullet per fact, each with its
   evidence file and its number), then *the mechanism* in a short paragraph.
3. **The level ladder, mapped** — a table.
4. **The main menu, mapped** — the labelled layout and the idle-motion list.
5. **The monetization timeline** — the ten-minute session.
6. **The twenty things that most explain the gap**, ranked, one line each
   with evidence — mechanisms, not adjectives. This list is what I will
   build from.
7. **What Hole.io does not have that we do** — ten lines, honest; this is
   where our game's identity lives and I will not throw it away.
8. **Open questions and what could not be observed.**
9. **Corrections** — anything you wrote and later found wrong.
10. **Evidence index** — every file in the recon folder, one line each.

Bars for the report: under 5,000 words plus tables; every observation has a
source; every measurement has a unit and a method; no adjective without a
number beside it; the words "beautiful", "polished" and "feels" appear only
inside quotations.

---

## 6. What not to do

- Do not redesign our game, sketch our menu, or write code. Observation
  only. The decisions are mine and the owner's.
- Do not touch `artifacts/3d-game/src`, `qa`, or any branch other than
  `claude/holeio-recon`.
- Do not buy anything, create accounts with the owner's identity, sideload,
  decompile, or breach a terms-of-service.
- Do not pad. A lens you could not observe is a one-line "not observed:
  <why>" and nothing else.
- Do not run our game for comparison beyond what §0 already told you; the
  comparison is my job, and your session budget is for theirs.

---

## 7. Start here

1. Read this brief. Open the five screenshots and write your five-minute
   notes on each into `session.md`.
2. Try path A. If blocked within fifteen minutes, say so and move to B.
3. Play. Record. Measure. Commit every thirty minutes.
4. Store listings (C) and video (D) fill whatever A and B could not reach.
5. Write the report. Commit. Push. Stop.

Your final message to the owner is five lines: what you played, how long,
the branch, the path to the report, and the one mechanism you would show
me first.
