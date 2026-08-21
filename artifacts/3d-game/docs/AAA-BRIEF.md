# VOIDLING — THE AAA BRIEF
### Two jobs. Close the gap to top-ten. Then build world five.

You are taking the wheel on a 3D mobile game for children roughly 6–11 that is
**further along than it feels**. Four worlds ship. Seventeen IAP products are
registered. Haptics route through Capacitor. There are 432 files in `qa/`. The
App Store icon is drawn and the screenshots have a capture tool.

And the owner — a father who playtests this with his daughter on a real
iPhone, and the only user opinion that counts — has just said:

> *"I still feel like this sort of feels cheap like bubble gum put it
> together."*

He is right. That sentence matters more than any bug report in this repo
because **he cannot point at what is wrong.** Everything he can point at has
been fixed. What is left is the part players feel and never articulate, which
is exactly the part that separates a game that gets downloaded from a game
that gets kept.

His instruction, verbatim:

> *"I want a review of top games for many categories that use 3d and compare
> to ours then polish. Visually, fluidity, UI, micro transactions, getting
> repetitive playtime? Increasing players, bearing hole.io. I want fable to
> take the wheel and polish this so it's better than hole.io in every way.*
>
> *Critically. I want fable to take the wheel and create a new level. One we
> haven't mentioned before. From its research a new level that will be a
> massive hit.*
>
> *AAA level, everything tied correctly, if this then that."*

**Take the wheel means take the wheel.** Do not come back with options for him
to choose between. Research, decide, defend the decision in the ledger, build
it. He is the playtester, not the art director.

---

## 0. THE TWO DELIVERABLES

**A. THE POLISH PASS.** Six fronts, named by him, in §4. Each carries a bar
drawn from shipped titles, a measured starting position, the work, and a gate
that fails on today's build.

**B. WORLD FIVE.** A brand-new world **you choose from your own research**,
that has never been discussed here. §5 gives you the rubric, the veto list,
the engine's real expressive limits, and the complete integration contract —
every system a world touches and what breaks when you skip one. That contract
is the *"everything tied correctly, if this then that"* he asked for. It is
44 touchpoints across 17 files, and missing one is how a tanuki ends up
shouting **"MY LOUNGER!!"** at a Japanese festival — a bug this codebase has
actually shipped.

Both. The polish pass alone is a tidier version of a game he is bored of.
World five alone is a fifth cheap level.

### On the evidence in this brief

Every `file:line` below came from a thirteen-agent audit of HEAD. **I
re-verified the load-bearing ones myself against HEAD** and marked them ✅ —
including one the audit got wrong, corrected in §4.1. Everything
unmarked is the audit's word — *check it before you act on it.* This project
has a documented history of confident wrong conclusions, and a brief would
rather be checked than believed.

---

## 1. BEFORE YOU TOUCH ANYTHING

Read, in this order:

| file | what it is |
|---|---|
| `docs/FABLE-BRIEF.md` | the standing engineering brief — rules, instruments, and the probe traps that have cost this project weeks |
| `docs/HANDOFF.md` | standing directives that survive context resets |
| `docs/MUSIC-BRIEF.md` | the audio system's history, including six standing retractions |
| `docs/PLAYTEST-BRIEF.md` | the last playtest round, and the section titled *"THE RETRACTIONS THAT KEEP COSTING THIS PROJECT"* |
| `qa/README.md` | which of the 432 probe files are actual gates (330 are `_`-prefixed one-off investigations — do not mistake them for the suite) |
| `APPSTORE.md` | submission state. **Its audio section is stale** — it describes three `track_1..3.mp3`; the game ships five world tracks plus a menu theme |

### Rules that do not bend

1. **Measure, then change.** If a change cannot be measured, build the probe
   first. Probes live in `qa/`.
2. **A single run proves nothing.** Means and spreads, or it did not happen.
3. **`node qa/smoke.mjs` before every push.** Port 4177. **READ the output for
   the word PASS** — `| tail -2` in an `&&` chain prints a connection-refused
   stack and still lets the push through, because `tail` exits 0.
4. **Never bypass the CDN egress block.** Asset requests 403 in the sandbox.
   That is expected and correct. Never disable TLS verification, never unset
   `HTTPS_PROXY`.
5. **Assets: CC0 / Public Domain / Kenney / Mixkit / Sonniss / Pixabay only.**
   Music and SFX are the owner's to supply. **Never invent a source URL** —
   five shipped tracks already have none, and that is his to close, not yours.
6. **Ship via `git push` to `main`.** Push is deploy. Never deploy by hand.
7. **No pull request unless asked.**
8. **No model identifier in anything pushed** — commits, comments, PR bodies.
9. Working directory resets between shell calls. `cd artifacts/3d-game` every
   time.
10. **The splash art and world-picker posters are approved.** The chrome around
    them is yours; the art is not.

### The instrument warning that has cost the most

`qa/music.mjs` cannot tell you whether anything made a sound — for four rounds
it printed `RECORDING` while the owner heard silence. Generalised:

> **No probe that renders its own frame can catch a whole-pipeline swap.**

For weeks every colour probe reported healthy saturation while the owner
reported a purple wash. Both were right about different frames: the composer
path shipped only on devices fast enough to hold 60 fps, so **the better the
phone, the worse the game looked.** When a claim is about what *ships* rather
than about a shader, **screenshot the canvas** (`qa/shippedlook.mjs`).

And: **this sandbox renders at ~1 fps under swiftshader.** Never report
harness frame timing as the game's. Reason from counts, allocations, draw
calls and code structure instead.

---

## 2. WHAT "CHEAP" ACTUALLY IS

You will be tempted to read *"feels cheap"* as *"needs better art."* It does
not. **Cheap is the absence of follow-through**, and it shows up as six
specific absences. Use these as the lens on everything you touch, and **tag
every ledger entry with which one it closes.** If an entry closes none of
them, it is probably not why the game feels cheap.

1. **One response per action.** A cheap game answers an input once — a sound
   *or* a particle. A polished game answers in layers on different curves:
   visual, audio, haptic, camera, UI, arriving a few frames apart so the brain
   reads one thick event instead of one thin one.
2. **No anticipation and no settle.** Cheap things start and stop instantly.
   Polish lives in the wind-up before and the overshoot-and-settle after.
3. **Transitions are cuts.** Screens *appear*. In a polished game the camera
   never cuts and state changes are choreographed.
4. **The world does not know you are there.** Reaction only on contact reads
   as a collision test, because that is what it is.
5. **Uniformity.** One lighting rig, one material response, one motion curve,
   one type family, one panel treatment. Variety is expensive, so amateur
   games have none — and the eye reads sameness as flatness long before the
   mind names it.
6. **The seams are at the boundaries.** Nobody polishes the first ninety
   seconds, the pause, the empty state, the loss, the walk back to the menu.
   Those are exactly where a player forms a verdict.

**The single most useful sentence from the competitive read**, and the reason
this game can win its category at all:

> hole.io's ceiling is that it has **no reason to be reopened tomorrow.** The
> genre never built a calendar or a collection. VOIDLING has a sticker book
> and a newsroom. *That* is the thesis — and §4.5 says neither is currently
> doing the job.

---

## 3. THE METHOD

For each front, and for world five, run the same loop:

1. **BENCHMARK.** Name a shipped title and what it does, mechanically.
   *"Subway Surfers feels good"* is worthless. *"Death → tap → running again,
   with no interstitial"* is a specification.
2. **MEASURE OURS.** Get the number from this build. If it does not exist,
   build the instrument first.
3. **CLOSE THE GAP.** Smallest change that moves the number.
4. **GATE IT.** A probe in `qa/` that **FAILS on the pre-fix build** and
   passes on yours. A fix without a gate is a fix that comes back.
5. **RECORD IT.** One paragraph in the ledger at the end of this file.

**When you are wrong, retract loudly.** These briefs carry standing
retractions because the wrong version is always persuasive and the next
engineer re-derives it otherwise.

**And state a budget before you add anything.** The audit proposes bloom, a
second render target, particles, and baked AO. There is currently **no
frame-rate target and no memory envelope anywhere in the repo**, while Game
Day already sits at ~376 MB of vertex buffers inside a ~446 MB heap. Write the
budget in §7 before you spend it.

---

## 4. THE SIX FRONTS

### 4.1 VISUAL

**THE BAR.** Monument Valley's operating rule was *"every screen is a piece of
art worth hanging on a wall"* — and operationally, every screen had to work
three ways at once: as a puzzle, as architecture, and as a graphic
composition. They cut from 30 levels to 10 and said it was *"all about polish,
not size."* Alto's Odyssey tripled its asset count and described the whole
job as *"taming that chaos."* The clone games in our own genre are legible as
cheap for a short, specific list: flat unlit materials, objects that vanish at
the swallow point instead of being drawn in, no camera reaction to a big eat,
and white default-font text on translucent black rectangles.

**WHERE WE ARE.**

- ✅ **Zero post-processing ships, on every device.** `QUALITY[]` sets
  `bloom:false` on all four rungs (`prototype3d.ts:880-889`). No SSAO, GTAO,
  vignette, DoF, chromatic aberration or grain pass exists anywhere.
- **And the reason is a three.js behaviour nobody had identified.** The team
  measured that routing through `EffectComposer` cost the hero 0.20 saturation
  and — correctly — refused to ship the washed pipeline, removing the composer
  instead. That workaround is what ships today, and the code comment says so:
  *"until the encode is repaired, every rung renders straight to the canvas."*
  **The root cause is that three.js forces `toneMapping = NoToneMapping`
  whenever `currentRenderTarget !== null`**, which is exactly what `RenderPass`
  does — so the hand-authored ACES + toe + split-tone grade at
  `prototype3d.ts:236-278` is silently deleted by the composer. Plain
  linear→sRGB is lifted, flat and desaturated, which is precisely what was
  measured. **This one line of engine behaviour is the gate holding back every
  screen-space effect in the game.**
  *Do not cite a `node_modules` line number — the dep is pinned with a caret.
  Cite the behaviour and assert it: with bloom strength 0, direct and composed
  frames must match within 2/255.*
- ✅ **The sky is a screen-locked wallpaper, not a skybox.** `island.ts:531-536`
  sets `colorSpace` and `backgroundIntensity` but never `.mapping`, so three
  renders the texture as a viewport quad. The camera swings and pulls from
  ~50 to 340 units across a match and **the sky never moves.** Zero parallax,
  zero horizon shift. (The canvas fallback *does* set
  `EquirectangularReflectionMapping`, so the sky is a correct dome for a few
  hundred milliseconds and then becomes a sticker when the PNG lands.)
- **CORRECTION TO THE AUDIT, made before this brief shipped.** The audit
  reported *"no per-world palette — one lighting rig recoloured."* That is
  wrong and I checked it: ✅ `WORLD_LIGHT` at `prototype3d.ts:636` is an
  **exhaustive `Record<WorldId, WorldLight>`** carrying genuinely distinct,
  well-argued rigs — Game Day runs an amber 40° key at 2.55 with a documented
  reason about shadows bridging the car-park aisles; Lantern Night has **no
  sun at all**, a 0.42 moon, and a hemisphere that is *warmer on the ground
  than the sky* because the light comes from the lanterns. That is real art
  direction and it should not be touched. **What is actually shared is
  narrower, and still worth fixing:** one nebula sky PNG and one fog colour
  (`palette.ts:51` `space: 0x0d0821`) across all four worlds, `maple` and
  `pirate` running an *identical* rig apart from the fill tint, and 1,662
  hardcoded hex literals (815+ unique) with no art-direction document. **Fix
  the sky, the fog and the prop palette. Leave `WORLD_LIGHT` alone** — extend
  it with a fifth row, which the compiler will demand anyway.
- **Zero normal, roughness, AO or light maps in the entire game.**

**THE WORK, in dependency order.**

1. **Add `OutputPass` as the terminal pass, and re-tune the bloom threshold in
   the same commit.** The previous OutputPass attempt measured *worse*
   (−0.232) — almost certainly because the threshold was never moved: with the
   grade at the end of the chain, bloom now samples a **linear HDR** buffer
   where an `emissiveIntensity:2.0` surface reads 2.0, not the ~0.98 it read
   post-tonemap. A 0.94 threshold tuned against tone-mapped sRGB selects most
   of the frame in linear and blows the hero out. Start ~1.0–1.2, strength
   ~0.5, then re-run the frozen-frame A/B.
2. **Ship selective bloom, not full-screen.** Emitters on `layers` channel 1,
   rendered separately into a half-res target and composited additively. This
   also kills the *"he blooms HIMSELF"* problem outright — the void's sclera
   simply is not on the glow layer. Re-enable bloom on rungs 0–1 only.
3. **One line for the sky:** `skyTex.mapping =
   THREE.EquirectangularReflectionMapping` before `scene.background = skyTex`.
   Re-crop the source to exactly 2:1 while you are there.
4. **Extend `WORLD_LIGHT` into a full per-world palette table** — it already
   owns lighting; give it sky, fog colour, fog range and grade bias too, and
   write the one-page art-direction doc that does not exist. Keep it an
   exhaustive `Record<WorldId, …>` so the compiler demands world five's row.
   **This blocks world five**, which cannot have a visual identity until sky
   and fog are things a world can own.

**THE GATE.** Extend `qa/shippedlook.mjs` to screenshot the **canvas** on all
five worlds at three void sizes, and assert (a) `scene.background.mapping !==
UVMapping`, (b) mean saturation per world differs from every other world by a
stated margin, (c) composed and direct frames match within 2/255 at bloom
strength 0.

---

### 4.2 FLUIDITY

**THE BAR.** Vlambeer's *"The Art of Screenshake"* and *"Juice It or Lose It"*
are the canonical texts and both make the same point: the same game, with
squash, particles, trails, shake and layered sound, becomes a different
product. Sago Mini's *Jinja's Garden* won the **2026 Apple Design Award for
Interaction**, and Apple's citation names exactly two things: *"interactions
that require no reading"* and *"effortless swipe-to-move controls."* Stumble
Guys' decisive quality decision was that it **runs on a five-year-old iPad** —
for a children's game, device inclusivity is a social feature, because the kid
with the hand-me-down determines whether the friend group adopts you.

**WHERE WE ARE.**

- ✅ **`camera.fov` is a literal 32, set once, and never assigned again
  anywhere in the codebase.** It is *read* twice (`rivals.ts:722`,
  `void3d.ts:1810`) and written zero times. There is no FOV punch on any
  event.
- **The only camera-distance event in a three-minute match is the 2-second
  outro.** Eating a house, eating a rival, and reaching final form all produce
  the same camera: none.
- **The void's mouth pops from 0.001 to fully open in a single frame** on
  every bite. That is absence #2, on the single most-repeated action in the
  game.
- **Camera look-ahead collapses from 11% to 2.7% of half-screen as the void
  grows** — the lead vanishes exactly when the world scrolls fastest.
- **Absorb particles never fade** — every spark blinks out at full brightness.
- **Camera shake is undirected white noise**, and the final-form shake is
  ~8× weaker than the rival-eat shake — about five pixels.
- **Hit-stop fires from exactly one call site and the camera ignores it.**
- **The hero has no landing squash and its bob ignores speed** — *the AI
  rivals are more physical than the player.*
- **Menu → match is a `display:none` hard cut** from an opaque 2D key-art
  screen, while a full 3D scene renders invisibly behind it all session.
- **Frame-rate-dependent damping constants** make the game measurably
  different on a 120 Hz iPhone (open task #39), and the quality ladder's
  thresholds are **absolute fps** (`<46` demote / `>57` promote) — so a
  ProMotion phone delivering a juddery 70 fps reads as healthy and gets
  **promoted into a heavier rung.**

**THE WORK.** This front is where "cheap" is most cheaply bought back. In
order of felt impact per hour:

1. **Give the camera a voice.** FOV punch + directed shake + a distance kick
   on the three events that deserve them: a size-class-up eat, eating a rival,
   and evolution. Directed, not noise — shake along the impact vector.
2. **Anticipation on the mouth** (2–3 frames of wind-up) and **a settle on the
   hero** (landing squash, bob frequency tied to speed).
3. **Fade the particles.** One line each, and it removes a hard "amateur"
   read.
4. **Fix look-ahead to scale with camera distance** so the lead survives
   growth.
5. **Wire hit-stop to the camera** and give it a second call site (the big
   eat).
6. **Make the ladder relative to the display's refresh rate**, not absolute
   fps, and use a percentile rather than the mean — the mean is the one
   statistic that hides stutter. (Closes #39.)
7. **Choreograph menu → match.** No `display:none` cut. The 3D scene is
   already rendering behind the menu; use it.

**THE GATE.** A new `qa/juice.mjs` that drives a match headlessly and asserts,
per event class, that **at least three channels responded within 150 ms**
(camera transform delta, particle spawn, audio cue, haptic call, HUD change).
Absence #1, made mechanical. It will fail loudly on today's build.

---

### 4.3 UI

**THE BAR.** Icon-first, reading-optional: nothing gates a 6-year-old behind
text they must parse. Subway Surfers ships you into a run with no menu
decision; death → tap → running, no interstitial. Every tap between launch and
play must justify itself.

**WHERE WE ARE.** The clay-chrome pass tokenised colour and radius **but never
landed.**

- ✅ **The app renders two font weights, not the four the CSS asks for.**
  `@fontsource/fredoka` 400/600/700 are imported; **Fredoka does not ship an
  800 or a 900 at all** (the package has 300/400/500/600/700). 109
  declarations demand 800 or 900. Four intended emphasis levels collapse into
  one, and the browser synthesises the difference. This is absence #5 doing
  more visible damage than any other single item in the game.
- **`.clay` is defined and applied to zero elements.** 14 of 97 border-radius
  declarations use a token. 74 box-shadows, 66 distinct, **47% of them glows**
  — the exact treatment the clay pass said it was removing.
- **No type scale:** 39 distinct font sizes, 132 distinct (size, weight,
  letter-spacing) triples across 160 declarations.
- **40 text declarations render under 12px**, including all four primary
  navigation labels at 10px and the shop's only call-to-action at 9px.
- **33 distinct spacing values; 16% on an 8pt grid.**
- **Seven full-screen destinations hard-cut in with `display:flex`, and
  nothing in the app animates out.** Absence #3, itemised.
- **The icon system is 102 distinct system emoji in 299 places** — including
  all 15 trophies and all four main-menu buttons. The currency mark ✦ falls
  out of Fredoka's subset and renders in SF Pro.
- **The results screen is taller than the phone on every iPhone, in every
  configuration** — including a run with zero stickers.
- **The match HUD is twelve hand-placed fixed elements with no layout owner**;
  the coin chip measures 100% inside the timer's box on all four worlds.
- **The leaderboard shows points, not size** — so the one number a child must
  read to survive is not on screen, and a loading tip tells them to watch it.
- **Zero localisation infrastructure**; every string is hardcoded English and
  number formatting is pinned to `en-US`.
- **Accessibility is one `aria-label` in the whole app**, no focus states, and
  three of five rival colours converge under red-green colour blindness.

**THE WORK.**

1. **Pick a type scale and a weight ladder that exists.** Either import a
   family that ships 800/900, or restate the hierarchy in 400/600/700 and
   delete all 109 lying declarations. Do this first — it is the change that
   makes everything else look designed.
2. **Land the clay system for real:** apply `.clay`, collapse 97 radii to the
   four tokens, kill the glow shadows, put spacing on an 8pt grid.
3. **Floor body text at 12px and CTAs at 15px.** A 9px call-to-action in a
   game for six-year-olds is not a style choice.
4. **Animate every destination in and out.** Nothing hard-cuts.
5. **Give the HUD a layout owner** — one grid, one safe-area contract, and put
   **size** on the leaderboard.
6. **Replace the emoji trophy and nav icons with drawn glyphs.** 102 system
   emoji is the single loudest "assembled, not designed" signal in the UI, and
   emoji render differently on every OS version.
7. **Extract strings to one table.** Not to localise today — to make world five
   and every future world cheap. It blocks all future copy.

**THE GATE.** Extend `qa/endlayout.mjs` (which already exists and already
catches overflow) into a `qa/uisystem.mjs` that asserts: no rendered
`font-weight` the loaded faces cannot serve; ≤ N distinct radii, shadows and
type triples; no text under 12px; no destination that appears without a
transition; and the results card fits at 360×780 with the drop opened.

---

### 4.4 MICROTRANSACTIONS

**THE BAR.** This is the front where copying the category leader is the wrong
move, and the research is unambiguous about it.

- **Toca Boca / Sago Mini**: no ads, no IAP inside the play surface,
  COPPA- and kidSAFE-certified; commerce lives *outside* the toy, as a
  subscription or a price. Their stated pitch is *"zero ads, zero
  manipulation."* Their own negative reviews cluster at the paywall boundary —
  **even the best kids' studio in the world takes damage there**, so where you
  put that boundary is the highest-stakes decision in this section.
- **Crossy Road** is the reference implementation of ethical F2P for a young
  audience: cosmetic-only, **a free character gift every 6 hours**, coins
  earned purely by playing, and rewarded video introduced *only after* the
  player has learned the loop — where the ad buys **a spin on a prize machine,
  not a boost.** Three parallel paths to the same reward: play, watch, pay.
  1M+ downloads and $1M from video ads in 20 days.
- **hole.io itself is not in the Kids section** and is guided 9+/12+; ~119M
  installs in 2025 against ~$3.7M player spend — **ads carry it.** That model
  is closed to us and we should be glad.

**WHERE WE ARE.**

- **17 one-off non-consumables** — 5 voids at $2.99, 12 hats at $1.99–$6.99
  (`store3d.ts:35-54`). Catalogue value $54.83. **No bundle, no consumable, no
  repeat purchase.** A parent must clear **twelve separate parental gates** to
  buy the hats.
- **On the build his daughter actually plays, 17 of 31 shop cards are
  unbuyable** and two are affordable.
- **The soft currency has exactly one sink.** The top rung costs 70,000✦ =
  **127 matches** at the measured ~550✦/match; the shop's own progress bar
  moves 0.79% per match.
- **Nothing in the game mentions a paid item except the HATS tab itself.**
- **Missing one day cuts the daily reward by 11.7×** — a loss-aversion cliff
  pointed at a six-year-old. Delete it.
- **The parental gate is beatable by the older half of the target audience**
  and has no attempt limit.
- **Twelve of thirteen hats are money-only**, so the slot reads to a child as
  *"the paid slot."*

**THE WORK.** State the compliance envelope **before** the plan — Apple's Kids
Category bars behavioural advertising, mandates the parental gate, and
constrains IAP presentation. Then:

1. **One bundle SKU: everything, forever, one price.** One gate, one decision,
   the sentence a parent wants to hear. Keep a small à-la-carte tail.
2. **Give coins a second, endless sink** so the free player has a loop that
   never terminates (recolours are the obvious one — they cost geometry
   nothing).
3. **Rebalance to a real earn rate.** 127 matches to the top rung is not a
   ladder, it is a wall.
4. **Kill the streak cliff.** Reward returning; never punish missing.
5. **Harden the parental gate** and give it an attempt limit.
6. **Make at least half the hats earnable** so the slot is not "the paid slot."
7. **Move the economy into one JSON file.** Every number here is currently
   baked behind an App Review cycle.

**THE GATE.** `qa/econ.mjs`: simulate 1/5/20/50 matches and assert
time-to-first-unlock, coins-per-match, and that no purchasable path requires
more than N matches. Plus `qa/iapdoc.mjs` — which already exists and already
catches `APPSTORE.md` drifting from the registered product list — extended to
the bundle.

---

### 4.5 REPEAT PLAYTIME

**THE BAR.** Subway Surfers ships a **World Tour every three weeks** — the
game does not change, the *dressing* does, on a rhythm children can
anticipate. Crossy Road's **6-hour free gift** asks nothing and gives
something. Alto's mixed **procedural generation with hand-authored set pieces
to punctuate the randomness** — pure procedural reads as noise; the hand-placed
moment is what a child describes to a friend. Alto also wrote its main theme
in a non-standard time signature specifically so it survives repeat listening.

**WHERE WE ARE. This is the weakest front, and it is not close.**

- **The entire world roster is exhausted in 3 finished matches — about ten
  minutes.** Worlds unlock on *finishing*, not winning (`unlocks.ts:83`,
  `MATCH_LEN=180`).
- **Match 2 of a world is identical to match 1**: same island, same
  hand-authored spawn, same four beats in the same order, same lighting. Only
  the 3–5 rival cast and 20 gilded props re-roll.
- **Levelling up grants nothing** — the XP ladder is a label.
- **Eleven of fifteen trophies clear inside the first two matches**, and none
  pays anything. The top-form trophy is off by one: it awards COLOSSUS and
  calls it the final form; **WORLD ENDER and VOID TITAN have no trophy at
  all.**
- **The hunt empties permanently** — 48 stickers, fixed hiding places, never
  re-placed, nothing behind them.
- **Replaying a world costs one frame; changing world costs a full page
  reload** — so the cheapest action is always repetition.
- **The results screen's only stated goal is the cheapest unowned skin**, and
  from match ~5 to match ~300 that sentence never changes.
- **A match eats single digits of the island and nothing persists between
  matches.** The world is never actually ended. *In a game called "the cute
  world ender."*
- **Skill barely changes the shape of a match** — a level-30 player faces the
  same field as a level-1 player.
- **A local push reminder (`src/game/notifications.ts`) and a Game Center
  leaderboard (`src/game/gameCenter.ts`) are fully written and child-safety
  reviewed — and imported by nothing in the shipping bundle.** ✅ `index.html`
  loads `/src/prototype3d.ts` and nothing else; `initGameCenter`,
  `serviceWorker.register`, `LocalNotifications` and any ratings prompt return
  **zero hits** across the entire shipped entry tree. The 2D entry was removed
  deliberately (it carried a second StoreKit bridge) — but the good systems
  went with it and nobody noticed. *The dead progression system is the more
  designed of the two.*

**THE WORK.** Pick the changes that manufacture a fourth session:

1. **Make match 2 different from match 1.** This is the single highest-value
   change in the entire brief. Alto's answer is the right one for us:
   procedural variation *plus* hand-authored punctuation. Rotate spawn,
   re-roll district density, vary time of day, and draw the four beats from a
   pool rather than a fixed order.
2. **Make the world persist.** If a match eats single digits and nothing
   carries, the fantasy is unfulfilled. Even a per-world "% devoured, all
   time" that visibly scars the island across sessions turns a repeated match
   into a campaign.
3. **Reconnect the two dead systems** — a leaderboard and a return hook are
   written, reviewed, and one import away. Then a ratings prompt, which is a
   direct input to store ranking and does not exist.
4. **Pay the ladder.** Levels and trophies must grant something. Add the two
   missing top-form trophies.
5. **Give the hunt a second layer** so it does not terminate.
6. **Make the return visit different.** Something must be new on Tuesday, and
   the child who taps PLAY AGAIN must be able to see it.
7. **Cloud save.** 131 `localStorage` calls, zero iCloud/Preferences. **New
   phone = start over**, and on a device with storage blocked the shim falls
   back to *memory*, so progress silently evaporates every session.

**THE GATE.** `qa/replay.mjs` (exists) extended: run the same world twice from
a clean profile and **assert the two matches differ** on a stated list of
observable dimensions. It will fail on today's build, which is the point.

---

### 4.6 INCREASING PLAYERS

**THE BAR.** For a Kids-category title with no UA budget, **Apple editorial
featuring is realistically the only path to top-10** — and it needs a launch
date and a hook. Monument Valley built virality into the art direction by
adding an in-game camera so players would screenshot and share. Stumble Guys
grew because it runs on the oldest device in the friend group.

**WHERE WE ARE.**

- **`store/preview.mp4` is footage of the retired 2D game and there is no tool
  to reshoot it.** Submitting it is Guideline 2.3.3 — **the exact finding that
  rejected a previous attempt.** The eight screenshots *are* automated
  (`pnpm shoot:store`) and do purge the stale set. **Ship the screenshots
  alone until a real capture exists.**
- **No ratings prompt, no crash reporting, no cloud save, no re-engagement
  channel, no remote config.**
- **Analytics is real and well-wired** (~30 event types via Supabase) but is
  **off by default, behind a parental gate, with no persistent identifier** —
  so, as `APPSTORE.md` states plainly, **D1/D7 retention cannot be computed.**
  You are about to recommend retention changes into a product structurally
  incapable of measuring whether they worked. Name the compliance envelope,
  then name the minimum legal instrumentation, and for each new event name the
  **one decision it unblocks**.
- **No title/subtitle/keyword strategy, no icon test, no editorial pitch.**

**THE WORK.** The honest ranking:

1. **The hook for an editorial pitch is world five.** Those two halves of this
   brief are the same project. Plan the launch around it.
2. **A shareable frame.** The sticker book is the same instinct as Monument
   Valley's camera and is one step from a share card.
3. **Ratings prompt, crash reporting, cloud save** — three small pieces of
   plumbing with outsized effect on ranking and retention.
4. **A real preview video**, or none at all.
5. **Device inclusivity is growth**, not just performance. §4.2's ladder fix
   and a genuine LOD pass are how the hand-me-down iPad joins in.

**THE GATE.** A pre-submission checklist probe: assert no store asset
references the retired game, that `APPSTORE.md` matches the registered product
list (`qa/iapdoc.mjs` already does this), and that a cold boot transmits
nothing before consent.

---

## 5. WORLD FIVE — YOU CHOOSE IT

> *"From its research a new level that will be a massive hit."*

**Research it, decide it, defend it in the ledger, build it.** A brief that
came back asking which world to build would have failed the instruction. This
section deliberately does **not** name a candidate.

### 5.1 What already exists — do not propose these or a close variant

| # | world | setting | what it owns |
|---|---|---|---|
| 1 | MAPLE FALLS | autumn small town | main street, school, farm, pond + ducks, a train, a parade, covered bridge |
| 2 | PIRATE BAY | tropical resort bay | beach, jungle, marina, superyacht, galleons, jet skis, promenade |
| 3 | GAME DAY | stadium + tailgate | parking lot, food trucks, marching band, packed stands |
| 4 | LANTERN NIGHT | Japanese night festival | torii gates, market stalls, lanterns, bathhouse, spirit-market cast |

Read them as a set first. **All four are outdoor, human-scale, and "a place
with people and props in it."** The strongest world five breaks a pattern the
four share rather than adding a fifth variation to it.

### 5.2 Competitive white space — verified enough to act on

hole.io's own map set is **City, Medieval, Japan, Sci-Fi, Pirates,
Post-Apocalyptic, Farm, Cartoon Town, Western, Vikings** *(high confidence,
aggregator sources — not first-party; sanity-check it)*. We already overlap
three of them. **hole.io has never shipped winter, indoors, a theme park, or a
scale inversion.** Those are open ground against the category leader — which
is a fact about the market, not a decision about our game. The decision is
yours.

### 5.3 What this engine can and cannot express — read before you design

This is the most valuable page in this section, because it decides which hooks
are a weekend and which are a rewrite.

**A world costs almost nothing in assets, and this is verified:**

- **`find . -name "*.glb"` returns 0.** There is no mesh pipeline left to
  feed. `glb()` calls `opts.fallback()` and places the result; `vehicleGlb()`
  and `buildGallery()` are empty bodies; `requestedReady()` resolves
  immediately. The GLB pack was deleted (17 of 33 URLs permanently 403, dist
  149 MB → 41 MB).
- **Every prop in all four worlds is code**: 259 `make*()` factories, 2,145
  `part()` calls, 89 `mergedProp()` calls, 1,845 `new THREE.*Geometry`, 27
  `CanvasTexture` sites, and a 3072² runtime ground bake.
- **So the "no new downloaded assets" rule is not a constraint on this
  project — it is already how every world is made.** Per-world prop kits run
  **1,000–1,500 lines** (`mainstreet` 1,447 · `luxe` 1,346 · `tailgate` 1,283
  · `nightmarket` 1,062). **That is the honest cost of a world: about 1,200
  lines of geometry, plus a synthesised score.**

**What the engine cannot currently do — treat as veto conditions:**

- **There is no terrain height.** The ground is a flat `PlaneGeometry` with a
  baked top-down texture. Any hook needing real slopes, stairs or altitude is
  **engine work, not level work.**
- **Water is a wall, not a surface.** Containment is a land polygon plus a
  hard swim-back that overwrites velocity. Off-land is out of bounds.
- **There is no LOD and no instancing.** The crowd is ~6 draw calls per person.
  A world that wants more density than Lantern's ~970 movers is asking for
  engine work first.
- **`disposeWorld()` does not exist**, and the picker changes world by
  `location.href = location.pathname` — a full page reload.

**What is free, because it already exists:**

- **`railPointAt(t)`** drives Maple's four-car train along a Catmull path. Any
  looped carrier — a lift, a monorail, a conveyor — reuses it unchanged.
- **`userData.mover`** is a first-class concept with ~15 mover types already
  shipping; self-steering props the eat-magnet must not grab.
- **`EAT_RATIO` (1.11) is the cheap lever for a new eating verb.** Modulating
  it on a timer changes what the void can swallow without touching
  `growRadius` or the R² progress axis. Reach for this before you touch the
  growth law.
- The newsroom arc is fixed and authored: MORNING → DOUBT → ALARM → PANIC. The
  void's voice never appears in the news card. **Nobody is ever hurt; the
  jokes are about dignity, not danger.**

### 5.4 The rubric — score every candidate, publish the table

Generate **at least eight** candidates, score each, and put the scored table
in the ledger. The winner is the highest score, not the first idea.

| weight | criterion | full marks |
|---|---|---|
| **×3** | **MECHANICAL HOOK** | changes the void↔world *relationship* — control feel, containment, what eating means, how food arrives. **A reskin scores 1**, however pretty. |
| **×2** | **APPEAL** | pull on a 6–11 year old, and durability in three years |
| **×2** | **THUMB-STOP** | stops a thumb at 120px in a store listing. The real test is **contrast against a purple hero** |
| **×2** | **BUILDABILITY** | level code only = 5; needs a new engine system = 1 (see §5.3) |
| **×1** | **RISK** *(inverted)* | adjacency to an existing world, 4+ concerns, cost blowout |

**Hard vetoes.** A candidate scoring full marks is still rejected if it needs
terrain height, real water, networked multiplayer or destructible terrain;
cannot be contained by the existing land-polygon maths (**read the Pirate Bay
containment history first — a world with tight geometry cost a full round**);
needs downloaded assets; or puts a child in a real place where real people
were harmed.

**And be honest about evidence.** Theme-performance data for this age group is
largely unreachable from this sandbox. If your argument rests on taste and
arithmetic rather than data, **say so in the ledger** — a defensible pick with
a stated confidence beats a confident pick with invented support.

### 5.5 The integration contract — "if this, then that"

**A world in this codebase is not a mesh. It is 44 touchpoints across 17
files.** Measured, using Lantern Night — the most recently added world — as
the reference implementation:

```
$ grep -rn 'lantern' src/ index.html qa/*.mjs | grep -v '^qa/_' | wc -l
260          # across 55 files
```

**Run that grep and read every hit before you write a line of world five.** It
is more complete than any hand-written table, and it is your proof of
completeness at the end.

**The shape of the danger.** There is **no world registry.** There is a
`WorldId` union in `island.ts:56` and then ~40 independent dispatch sites, in
three different styles:

- exhaustive `Record<WorldId, T>` tables — **the compiler catches a missing
  row**;
- ternary chains ending in a silent `: maple` fallback — **the compiler
  catches nothing and your world ships wearing Maple Falls' clothes**;
- `if (WORLD_ID === 'x')` guards where the default is Maple's behaviour.

The repo documents this as a shipped bug three separate times, including the
day **GAME DAY announced that MAPLE FALLS had been eaten.** When you add
world five, **convert every two-way dispatch you touch into an exhaustive
table** so the compiler works for world six.

Where the work actually is:

| hits | file | what lives there |
|---:|---|---|
| 43 | `src/proto3d/island.ts` | terrain, biome, prop kit, `WorldId`, merged geometry |
| 37 | `src/proto3d/nightmarket.ts` | the world's own art module |
| 31 | `src/prototype3d.ts` | registration, par, quests, beats, districts, per-world branches |
| 22 | `src/proto3d/newsroom_lantern.ts` | the world's newsroom voice |
| 20 | `src/proto3d/life.ts` | crowd populations, cast lists, chatter, movers |
| 20 | `src/game/stickers.ts` | the collectible taxonomy |
| 8 | `src/proto3d/lantern.ts` | sky, palette, fog, lighting mood |
| 7 | `src/proto3d/audio3d.ts` | music slot, synth score, ambient bed |

#### The contract

| # | system | where | what world five adds | what breaks if skipped |
|---|---|---|---|---|
| 1 | world id | `island.ts:56` `WorldId` | the union member | TypeScript stops you — **the only one that fails loudly** |
| 2 | world list | `prototype3d.ts:305` `WORLDS[]` | the id | `?w=` falls back to maple; the picker card is dead |
| 3 | unlock chain | `src/game/unlocks.ts` | `WorldKey`, `WORLD_ORDER`, `WORLD_LABEL` | always locked or never reachable; the unlock line reads `undefined` |
| 4 | picker card | `index.html` + poster art | `.wCard[data-world=…]`, art, copy | no way in from the menu |
| 5 | terrain + biome | `island.ts` `setWorld()` PLAN | landmass, `biomeAt` regions, district names | crowd spawns in the sea; district names fall through to Maple's |
| 6 | containment | `prototype3d.ts` `coastMargin`/`coastSolid` | any world-specific margin | **the void cannot fit through its own streets at scale** — a shipped bug on Pirate Bay |
| 7 | art module | new `src/proto3d/<world>.ts` + a dressing module | ~1,200 lines of prop kit | an empty island |
| 8 | palette + light | `prototype3d.ts:636` `WORLD_LIGHT` (exhaustive — the compiler will demand your row) + the world's art module | key/fill/hemi/exposure/dusk, **and** the sky + fog colour once §4.1 extends the table | the compiler catches a missing light row; it does **not** catch sky and fog, which are shared today — skip those and it looks like Maple wearing a hat |
| 9 | ground bake | `island.ts:635` | the 3072² top-down bake | untextured ground |
| 10 | crowd | `life.ts` | per-zone cast lists, densities, movers | a ghost town, or 970 walkers and a frame cliff |
| 11 | chatter | `life.ts` ambient/panic pools | the world's own voices | **a tanuki says "MY LOUNGER!!"** |
| 12 | newsroom | new `src/proto3d/newsroom_<world>.ts` | MORNING→DOUBT→ALARM→PANIC pools, in a voice no other world uses | the broadcast describes a different world |
| 13 | newsroom reactions | `newsroom_react.ts` | landmark + meal reactions | landmarks are eaten in silence |
| 14 | stickers | `src/game/stickers.ts` | taxonomy entries, tiers, art ids | nothing collectible; the book has a hole |
| 15 | music slot | `audio3d.ts` `startMusic()` | `is<World>()`, slot name, url | falls through to Maple's town band |
| 16 | music manifest | `music-manifest.json` | `loopStart` row | the intro re-fires every loop pass |
| 17 | synth score | `audio3d.ts` | a hand-written bed + `<world>Evolve()` | silence whenever the recording is slow or 404s (`qa/fallback.mjs` gates this). **This is the largest fixed cost of any new world** |
| 18 | ambient bed | `audio3d.ts` `*Amb` | the world's ambience | the world sounds like a menu |
| 19 | par | `prototype3d.ts:501` `WORLD_PAR` | **a measured number** | the world is a coin flip or a walkover |
| 20 | quests | `prototype3d.ts:3007` `MED_Q`/`HARD_Q` | world-appropriate objectives | quests ask for cars in a world with no cars |
| 21 | beats | `prototype3d.ts:3206` `BEATS` | the match spine's authored moments | a flat three minutes |
| 22 | finale | art module + `life.cue()` | the last-30-seconds set piece | the match ends by the clock running out — the definition of anticlimax |
| 23 | landmark | art module | the centrepiece "dessert" | nothing to build toward |
| 24 | loading tips | `prototype3d.ts` `LOAD_TIPS` | world-flavoured tips | generic tips on a branded screen |
| 25 | seasons | `src/game/seasons.ts` | the world's seasonal hooks | invisible to the seasonal cadence |
| 26 | analytics | `telemetry.ts` | world id in payloads | invisible in the funnel |
| 27–44 | **the probes** | 40+ files in `qa/` name a world | extend every one that enumerates worlds | **a fifth world with no gates regresses silently** |

**The probes are not optional and not last.** At minimum extend and run:
`smoke`, `journey`, `switch`, `aftermatch`, `traverse`, `moverbands`,
`crowdgate`, `unlocks`, `finale`, `finds`, `newsarc`, `newsstyle`, `music`,
`autoplay`, `fallback`, `dens`, `propcount`, `glosscov`, `shading`,
`shadowcost`, `heap`, `sizes`, `difficulty`, `pace`, `worldswitch`.

### 5.6 Definition of done

World five is done when **all** of these are true:

1. Every contract row is done, or **waived in writing in the ledger** with a
   reason.
2. `grep -rn "<newworld>" src/ index.html qa/*.mjs | grep -v '^qa/_' | wc -l`
   is **within ~15% of lantern's 260.** A materially smaller number means a
   row was missed. Go find which.
3. **Every dispatch site you touched is an exhaustive table**, not a ternary
   with a silent maple fallback.
4. Every existing gate passes with the new world selected.
5. `qa/ab.mjs 5 <world> child` has been run and `WORLD_PAR` set from the
   **measured post-change distribution**, targeting a child winning ~70–75% of
   matches. Read the note above `WORLD_PAR` — the loop where a hungrier rival
   family lowers the player's score is real and converges in two passes. **Do
   not guess par.**
6. `qa/traverse.mjs` passes at r=1/4/8/16/27 — reach-of-walkable ≥97%. This is
   the probe that catches *"the void cannot fit through the gap."* Validate
   the layout at **both** r=0.9 and r=12 **before** authoring art.
7. The world has been **screenshotted on the canvas** at three void sizes and
   looked at, at phone size.
8. The newsroom has been read end to end out loud. **If any line could have
   been written for a different world, it is not finished.**
9. Memory has been measured. Game Day already sits at ~376 MB of buffers, and
   there is no `disposeWorld()`.

---

## 6. ORDER OF WORK

The fronts are not independent, and the audit's 58 findings are not a queue.
This is the dependency spine:

**Phase 1 — unblock (nothing else is worth doing first)**
1. `OutputPass` + bloom threshold (§4.1). Unlocks every screen-space effect in
   the game.
2. The type scale and weight ladder (§4.3). Makes every subsequent UI change
   read as designed.
3. The per-world palette table (§4.1). **Blocks world five.**
4. The string table (§4.3). Blocks all future copy, including world five's.

**Phase 2 — the felt polish, cheapest first**
5. Camera voice, anticipation, particle fade, look-ahead (§4.2). Highest
   felt-quality per hour in the brief.
6. Clay system landed for real; destinations animate; HUD gets a layout owner
   (§4.3).
7. Ladder relative to refresh rate; kill the backdrop blurs over the canvas;
   stop rendering behind opaque overlays (§4.2, §4.6).

**Phase 3 — the reasons to come back**
8. Match 2 ≠ match 1 (§4.5). **The single highest-value change in the brief.**
9. Reconnect the leaderboard and the return hook; add a ratings prompt and
   cloud save (§4.5, §4.6).
10. The bundle SKU and the second coin sink (§4.4).

**Phase 4 — world five**
11. Research, score, decide, publish the table.
12. Build it against §5.5, on top of the palette table and the string table.

**Then the launch pitch, with world five as the hook (§4.6).**

If you have to cut, cut from Phase 2 — not from 1, 3 or 4.

---

## 7. THE LEDGER

Append one entry per change, here, in this file. Format:

```
### <what> — <front> — closes absence #<n>
MEASURED   what the number was, and with what instrument
CHANGED    the smallest change that moved it
NOW        the new number, same instrument
GATE       qa/<probe>.mjs — fails on <commit> before, passes after
```

**Before you spend a frame, write the budget here:** target fps per device
tier, memory ceiling, cold-boot wall time, and dist size. The audit proposes
bloom, a second render target, particles and baked AO into a build that has
never stated one, and that is how a polish pass becomes a performance
regression.

**Retractions go here too, loudly.** Six already exist across these briefs
because the wrong version is always persuasive.

---

## 8. THE HONEST LIMITS OF THIS BRIEF

Stated so you do not over-trust it:

- **The findings marked ✅ were re-verified against HEAD by hand. The rest are
  the audit's word.** Check before you act. One audit claim was wrong on
  inspection and is corrected in §4.1 — assume there are others.
- **The competitive numbers came from search snippets, not primary pages** —
  WebFetch is egress-blocked here for nearly every domain. Treat every
  competitor claim as directional. Never repeat a grossing figure as fact.
- **No child was observed.** Every finding here is static analysis. The owner's
  own playtest notes in `docs/PLAYTEST-BRIEF.md` are worth more per line than
  anything in this document, and a timed observation of one six-year-old
  playing would be worth more than the whole audit. **Ask for it.**
- **The tracker marks several of these areas complete.** They are not
  re-litigations: the colour pipeline "fix" was a deliberate *workaround* —
  the composer was removed to get the grade back — and the root cause was
  never identified until now. Say that plainly rather than reopening a ticket
  silently.
- **This brief deliberately does not name a world five.** The owner asked for
  your research to make that call, and a candidate list here would have made
  you an executor of someone else's idea.

---

### LEDGER ENTRIES

### The performance budget (written before the first frame was spent)

| tier | device class | target | ceiling |
|---|---|---|---|
| A | iPhone 13+ / ProMotion | 60 fps held (never sync to 120 — §4.2's constants are 60-tuned) | rungs 0–1, bloom ON |
| B | iPhone 11 / SE2 | 60 fps, dips to 45 under the finale | rungs 1–2, bloom rung-1 only |
| C | hand-me-down iPad / A10 | 30 fps stable | rungs 2–3, no bloom, no shadows at 3 |
| memory | all | ≤ 450 MB JS heap worst world (Game Day today: ~446) — nothing in this brief may raise a world's peak | |
| boot | all | cold start to interactive ≤ 6 s on tier B | |
| dist | all | ≤ 45 MB (today ~41) | |

Bloom's cost is one full-screen pass + mip chain on rungs 0–1 only; the ladder
already drops it before it drops resolution, and qa/ladder.mjs proves the walk
still works. Anything that later violates these numbers reverts first and
argues after.

### OutputPass + linear threshold + HDR emitters — VISUAL — closes absence #5 (and re-opens nothing)
MEASURED   qa/postpipe.mjs (new): composed-at-zero vs direct on the hero disc,
           per world. Pre-fix: the chain had no OutputPass; equivalence held
           only by ACCIDENT (UnrealBloom's internal copy applies the tone map
           when it is the last pass). qa/_hdrprobe.mjs: frame peak 1.381
           linear, 64 px over threshold on LANTERN — the world designed
           around light sources had almost none in HDR, because every glow
           surface rides PROP_GLOW_MAT (MeshBasicMaterial, output ≤ 1.0 by
           construction) and the art was authored SDR.
CHANGED    OutputPass terminal (tone map + grade + encode exactly once, in
           the pass that honours CustomToneMapping); bloom threshold 0.94
           sRGB → 1.05 LINEAR, strength 0.5; PROP_GLOW_MAT colour boost 1.75
           (one line lifts every glow prop in four worlds into HDR); dusk
           ramps raised (lamps 2.4 peak, windows 1.45); flames/festival lamps
           1.6–1.8; bloom ON at rungs 0–1.
NOW        all four worlds: equivalence Δsat ≤ 0.009, frame mean|ΔRGB| ≤
           1.22/255 (historical wash ~30); hero survives glow (worst 0.025,
           pirate, real light spill); lantern 562 px over threshold and glow
           budget 0.012 with p99 0.648→0.791 — the lanterns HALO now
           (screenshot qa/out/shippedlook/lantern_aaa1.png); maple daylight
           budget 0.0004 — restrained, as authored.
GATE       qa/postpipe.mjs --gate, all four worlds. Fails pre-fix (no
           OutputPass → any non-bloom terminal pass ships linear; SDR
           emitters → glow budget 0 on lantern).

RETRACTION, recorded where the wrong version lived: the two measurements that
switched post off ("composer costs 0.20 sat at bloom zero", "OutputPass made
it worse, -0.232") were both REAL and both misattributed. The wash was the
void's own chunk-less shader diverging between paths — repaired since by the
face rebuild — and both old numbers are stale. The full story is in
ensureComposer()'s comment.

### The sky is a dome, and every world owns its own sky and air — VISUAL — closes absences #3/#5
MEASURED   scene.background.mapping was UVMapping (screen-locked viewport
           quad): the camera pulls 50→340 units and the sky never moved.
           One nebula PNG + one fog colour (palette space 0x0d0821) served
           all four worlds.
CHANGED    equirect mapping on the loaded painting; 2:1 centre-crop done in
           canvas at load (repo bytes untouched); SKY_MOOD — an exhaustive
           Record<WorldId, {hue, sat, fog, bgI}> so the compiler demands a
           row from world five — tints the one painting per world
           (maple violet / pirate sea-teal / gameday magenta dusk / lantern
           deep indigo) and gives each world its own fog colour.
NOW        postpipe: dome=true ×4, sky means [130,152,100] / [153,161,146] /
           [79,37,32] / [32,29,32] — four skies from one asset.
GATE       qa/postpipe.mjs asserts background mapping is equirect (fails on
           UVMapping regression) on every world.

PROBE REPAIR: qa/shippedlook.mjs never seeded voidUnlocked, so any world but
Maple hung forever on a locked card (the qa/music.mjs trap, again). Seeded.
postpipe's disc-saturation metric now excludes near-black pixels — the pit
divides (mx−mn)/mx by readback noise — and a whole-frame mean|ΔRGB| check
(≤4/255) carries the anti-wash contract instead.
