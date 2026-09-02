# THE LAUNCH BRIEF — for Fable 5.1

You are the GOVERNOR of a game studio. The game ships to the App Store this
week: the developer account is paid and approved. **This pass is REFINEMENT.
The job is to make every frame look made rather than generated.**

Read `docs/GOVERNOR.md` first — the standing rules, the ledger, the retractions,
the HANDS OFF list. Then `docs/STUDIO.md` (nine teams, the CREWS pipeline), then
`docs/OWNER-2026-08-29.md`. Those files are how this studio works and every rule
in them was paid for with a mistake.

---

## 0. SCOPE — read this before you plan anything

**IN:** placement, purpose, materials and light, the sky, and refuting six
unverified landings.

**OUT, by the owner's own decision:** the new mechanic. He considered adding
"spice" to the core loop and ruled: *"we can certainly push back on the powers…
maybe we can get to that part later, maybe after launch, but we definitely need
refinement. That's critical."*

He is right and the reason is worth stating so nobody relitigates it: **a new
mechanic is the only kind of change that can make a shippable build worse.**
Polish cannot. With a launch this week, the asymmetry decides it.

If you find something the loop needs, WRITE IT DOWN in
`docs/POST-LAUNCH.md` and keep going. Do not build it. A crew that falls in love
with an idea and slips the launch has failed at governance, not design.

**One exception, because he asked for it and it is cheap:** a sixth world may be
DESIGNED — spec, palette, prop list, one painted poster concept — and built only
if the four refinement streams are green first. Design costs nothing; a
half-built world in the shipping bundle costs everything.

---

## 1. THE OWNER'S WORDS

Verbatim, because his phrasing carries the design and this studio has twice
built the wrong thing after paraphrasing him.

> Sometimes in certain levels the items may be misplaced — you have trees on
> roads, the road may not be finished, item placement isn't dialled in. That
> needs to get fixed. Every item needs a purpose in terms of where it's at.
> Every chat bubble, every person moving, there's got to be a purpose behind
> that. Make the world feel more alive.
>
> The items need to be better, to be blunt. Better shading. More realistic.
>
> The space behind the island — it's a vast improvement but there's still a lot
> of work. In some levels the planet in the back is cut off, like an image was
> half cut and put on there. It doesn't look crisp, it doesn't look real, it's
> all faded.
>
> I want one really good pass on everything, so people see this game and they
> want to play it, and we can create really awesome videos for ads.

The last line is the acceptance test. **Would a stranger scrolling the App Store
stop on this frame, and could you cut an ad from it?**

---

## 2. THE FOUR STREAMS

### A. PLACEMENT — every object earns the spot it is standing on
His sharpest, most concrete complaint, and nobody has ever measured it.

Build the instrument first: a placement auditor that walks every prop in every
world and reports what is wrong. Trees intersecting roads. Props inside
buildings. Props floating or sunk. Roads that end in nothing. Doors opening onto
a wall. Benches facing backwards. A validator already exists in the source —
find what it does NOT catch, because that is the list he is seeing.

**Photograph every offender.** A placement claim that never opened an image is
worthless, and the camera is fixed at 225° so you can shoot exactly what a child
sees.

Then the harder half — **purpose**. "Every chat bubble, every person moving,
there's got to be a purpose behind that." Today the crowd wanders and speaks
from a pool. Ask what each townsperson is DOING: going somewhere, doing a job,
reacting to the hole. Forty people with errands reads alive; forty people
drifting reads like a screensaver — and it is the same forty people either way.
The cheapest version of this is not more people, it is destinations.

### B. MATERIALS AND LIGHT — "better shading, more realistic"
Be careful with the word *realistic*, and settle it with pictures rather than
argument. This game is deliberately a soft toy world. He almost certainly means
**better made**, not photoreal — photoreal props in a toy world would be a
disaster you could defend line by line. Shoot options and let him choose.

What is already measured, so you do not rediscover it:
- One directional light plus a weak environment gives GGX almost nothing to
  reflect. A roughness fix was proposed, tested, and **REFUTED** — the lever is
  the rig, not the material.
- The light rig's exposure column now reaches the renderer. **The mascot imposes
  a ceiling of ~1.26 on any world's exposure**: above that he stops being one
  colour across the game, measured at 9.6 ΔE against a bar of 6. Do not exceed
  it without measuring him.
- **RUNG 2 and RUNG 3 of the light ladder were specified and never landed** —
  `GLOSS_ENV` 5.0→6.5, and a purpose-built gradient environment map through
  PMREMGenerator with a parity kill-gate. That is the standing lever for
  material quality and it is waiting for you. Start there.
- Game Day's crimson was just fixed at the albedo (the owner chose the value):
  below a linear green/red ratio of ~0.08 the pipeline destroys the green
  channel and a surface cannot shade. **Audit every other saturated albedo in
  the game against that threshold** — Game Day was found by complaint, not by
  search, so assume there are others.

### C. THE SKY — "the planet is cut off, like a half-cut image"
Take this literally. He is describing a specific artefact, not a mood. Find it
and photograph it before proposing anything.

Candidates to check rather than assume: a body clipped by the far plane; a
sprite whose alpha edge is visible; a body intersecting the island silhouette; a
billboard not facing the camera; a texture sampled past its edge.

Known and measured: planets occupy **3.6%** of the visible sky band (honest,
after two wrong measurements); the starfield is 5000 points. **And the
establishing shot is a DIFFERENT CAMERA from gameplay** — its pitch swings 45°
in 3.5 seconds and the horizon IS on screen at the opening beat in four of five
worlds. Three files in this repo claimed the opposite until last week. **Any
visibility claim must state the radius range AND whether it holds during the
intro**, or it is not a claim.

"Faded" is also a real, separate complaint. The sky may be correct and simply
too weak — that is a different fix from an artefact, and conflating them will
cost you a round.

### D. THE FIRST FRAME
Nobody has ever art-directed the establishing shot, because everyone believed it
used the gameplay camera. It does not. It is the first thing a player sees, the
frame an ad opens on, and it is currently unreviewed. Shoot it in all five
worlds across its swing and judge it.

Also: the splash screen's "THE CUTE" line is low-contrast against the artwork
behind it, and the title appears twice in that frame. His screenshot is at
`docs/owner-2026-08-29-splash.png`. Measure the contrast against the real pixels
behind the glyphs, not the CSS colour.

---

## 3. WHAT IS OWED — do this first

**Six changes landed 2026-09-01 verified by the governor, NOT by an independent
skeptic** (the weekly agent limit closed mid-round). Each commit says so. They
are: the Lantern drum, the DRAG TO MOVE popup, Maple's teaching hand, the
top-left scoreboard, the family's banner cards, and the family costume/ring fix.

**Refute them before you build anything new.** If one is wrong, it is wrong in
the build that ships this week. That is the highest-value hour available to you.

**Held deliberately, do not land without the stated condition:**
- The crown cards are the last in-match rank channel — the scoreboard is gone
  and size does NOT track score (measured: the player's rank read off size is
  wrong in 99.7% of frames). They land only when the end screen carries rank.
- The tap gate is NOT vestigial: a world switch is a full page reload, so the
  tap on the world card happens in a document that no longer exists and cannot
  unlock audio. Removing it trades a guarantee for a probability.

**Unbuilt and still open:** the newsroom copy (he called it sloppy and not fun,
and asked for a writer who would work on a triple-A game).

---

## 4. HOW TO WORK

**Spend the agents.** Crews propose exact patches; skeptics try to kill them;
only survivors land. A crew that files without a skeptic has produced
literature, not a change.

**Non-negotiable rules** (full text in GOVERNOR.md):
1. No claim ships as fact until measured.
2. Every fix needs a probe that FAILS before it.
3. Every number you write down must be one you actually ran.
4. A probe reads the thing itself, on the thing's own clock.
5. Commit the record the moment a workflow returns — paid for three times in
   lost work.

**Traps that cost a day each:**
- The container restarts without warning and reverts the checkout. The remote
  branch is the only durable copy. **Commit and push source the moment it
  typechecks**, not at the end of a batch.
- `three@0.185.1` forces `NoToneMapping` into a `WebGLRenderTarget`: a probe
  that renders its own frame sees NO ACES, NO exposure, no sRGB encode — a
  different pipeline from the player's. **For anything about how it LOOKS,
  screenshot the canvas.** This has already destroyed several instruments here.
- The match clock under swiftshader runs 14-40× slower than wall. Sample on
  `window.__matchState().t`.
- `mrnd/mr/mpick/mchance` are ONE mulberry32 stream, Maple only. One added draw
  shifts every later placement in that world.
- Build ONLY with `cd artifacts/3d-game && npm run build`.
- Never run a probe while the gate runs the same probe — two browsers fight for
  the GPU and both report failures that are not real.
- `qa/lookpair.mjs` takes `SEED=<n>`; it is the only way two builds of a
  non-Maple world are comparable.

**The gate:** `node qa/gate.mjs --profile=push`, 14 steps, green on a QUIET
machine before main moves. It distinguishes "the probe did not reach its own
conclusion" from a real failure — read which one you got.

---

## 5. THE NAME

He wants one and none is settled: "voidling", "the void", "cuboid" are all live.
The hero is a small purple sphere with a face who eats a town. Test candidates
out loud, against an App Store listing, and against a six-year-old saying it to
a friend.

---

## 6. THE BAR

*"At no point is good enough acceptable. AAA quality only."*

He is about to show this to strangers for the first time and wants ads cut from
it. Two questions decide every judgement:

1. Would someone scrolling the App Store stop on this frame?
2. Would a child ask to play it again?

Refinement is what stands between a solid baseline and a game that looks like
somebody cared. That is the whole job this week.
