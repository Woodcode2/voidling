# THE LAUNCH BRIEF — for Fable 5.1

You are the GOVERNOR of a game studio. The game ships to the App Store this
week: the developer account is paid and approved. This is the last big pass
before a real audience sees it.

Read `docs/GOVERNOR.md` first — the standing rules, the ledger, the retractions
and the HANDS OFF list. Then `docs/STUDIO.md` (the nine teams and the CREWS
pipeline), then `docs/OWNER-2026-08-29.md`. Those three files are how this
studio works and they were paid for in mistakes.

---

## 1. THE OWNER'S BRIEF, IN HIS OWN WORDS

Recorded verbatim because his phrasing carries the design, and the studio has
twice built the wrong thing by paraphrasing him first.

> Our goal with whatever we call this — the voidlings, the void, cuboid, we need
> to figure out a name — is to create the best app that's unique and fun. Right
> now I think we've created a really solid baseline, but I envision this to be
> scalable, to have more levels. If we have more levels then we can get more ad
> revenue because people are in the game longer. We need to think how to make
> people want to play more. Maple Isle level one should be a straightforward
> tutorial, but then it progressively gets a little harder, more challenging,
> more fun. There can be world events eventually that make the game a little
> more random.
>
> Critically, we need agents to go across the entire game. Sometimes in certain
> levels the items may be misplaced — you have trees on roads, the road may not
> be finished, item placement isn't dialled in. Every item needs a purpose in
> terms of where it's at. Every chat bubble, every person moving, there's got to
> be a purpose behind that. Make the world feel more alive.
>
> The items need to be better, to be blunt. Better shading. More realistic.
>
> The space behind the island — it's a vast improvement but there's still a lot
> of work. In some levels the planet in the back is cut off, like an image was
> half cut and put on there. It doesn't look crisp, it doesn't look real, it's
> all faded.
>
> I want ideas for a new level so we go live with six.
>
> I want one really good pass on everything, so people see this game and they
> want to play it, and we can create really awesome videos for ads. I think
> we're almost there. We've got a really good baseline, but it's sort of
> vanilla. You just move the void, you consume, and that's it. It's missing a
> spice. It's missing something that'll make people play over and over.
> Something that makes you feel powerful, something fun, something that gets
> progressively harder so you want to keep playing — like the virus game, where
> it progressively gets harder the more mutations. It's just missing that spice.

**His last paragraph is the brief. Everything else is polish around it.**

---

## 2. THE CENTRAL QUESTION, AND A HYPOTHESIS TO ATTACK

He cannot name what is missing. That is normal and it is your job, not his.

**Here is the outgoing governor's hypothesis. Treat it as a lead, not a
conclusion, and try to kill it before you build on it.**

`src/prototype3d.ts:5365` reads:

```ts
const POWERS_ON = false;   // carved out for launch — pure drag+eat (hole.io purity)
```

There is a powers system in this game, built, and deliberately switched off in
the name of purity. The owner is now telling you the result is vanilla. Those
two facts belong in the same sentence.

The hypothesis: **the player has no decisions.** For 180 seconds they hold and
drag. Every other verb in the game belongs to somebody else — the rivals hunt,
the town reacts, the clock runs. A child cannot be powerful in a game where
they cannot choose anything. "Feeling powerful" is not a bigger number; it is
the moment a player does something *they* decided to do and the world answers.

Attack that. It may be wrong. Competing readings worth testing:
- **No escalation.** Every match is the same 180 seconds with the same arc.
  His virus-game reference is about a system that ADAPTS to the player. Nothing
  in this game gets harder because you are good at it.
- **No stakes between matches.** Meta-progression exists (coins, gems, skins,
  hats, quests) but nothing carries a consequence into the next match.
- **No mastery ceiling.** If a child cannot get visibly better at it, there is
  nothing to come back for.
- **It is fine and the polish is the whole gap.** Possible. Say so if the
  evidence says so — an honest "the loop is sound, ship the polish" is worth
  more than an invented mechanic.

Whatever you conclude: **this is a 6-11 kids' game.** The owner has ruled
repeatedly against anything frightening, cruel or punishing. Difficulty in a
kids' game is a promise that trying again will work, not a wall.

---

## 3. THE WORK

Five streams. They are not equal — stream A decides whether the others matter.

### A. THE HOOK — why a child opens it a second time
Answer §2. If the answer is a mechanic, prototype it, photograph it, measure it
and prove it does not break the kid-mercy rails. If the answer is that powers
should come back, say what they are, what they cost, and what carving them out
was protecting — the comment says "hole.io purity", and purity is a real design
value, so overturning it needs an argument, not a shrug.

**Also answer: does the game get harder?** He wants Maple as a straightforward
tutorial and a curve after it. Today every world is a 180-second match with the
same rules; the only progression is which poster is unlocked. Design the curve.
World events, if you propose them, must be legible to a six-year-old and must
never feel like the game cheated.

### B. THE PLACEMENT AUDIT — every object earns its spot
"Trees on roads. The road may not be finished. Every item needs a purpose in
terms of where it's at."

This is measurable and nobody has ever measured it. Props sit on generated
ground with a placement validator that already exists; find what it does not
catch. Trees intersecting roads, props inside buildings, floating props,
half-built roads, doors opening onto nothing, benches facing walls. Photograph
the offenders — a claim about placement that never opened an image is worthless.

Then the harder half: **purpose.** "Every chat bubble, every person moving,
there's got to be a purpose behind that." Today the crowd wanders and speaks
from a pool. Ask what a townsperson is DOING — going somewhere, doing a job,
reacting to the hole. A town where forty people each have an errand reads alive;
one where forty people drift reads like a screensaver, and it is the same
number of people either way.

### C. THE OBJECTS — "better shading, more realistic"
Be careful and be honest here. This game's look is deliberately a soft toy
world; "realistic" from the owner almost certainly means *better made*, not
*photoreal*, and shipping photoreal props into a toy world would be a
catastrophe you could defend line by line. Establish what he means by
photographing options rather than arguing.

What is already known and measured, so you do not rediscover it:
- One directional light plus a weak environment gives GGX almost nothing to
  reflect. A roughness change was proposed, tested and REFUTED (GOVERNOR.md).
- The light rig's exposure column now reaches the renderer, and the mascot
  imposes a hard ceiling of about 1.26 on any world's exposure — above that he
  stops being one colour across the game. Do not exceed it without measuring him.
- RUNG 2 and RUNG 3 of the light ladder (GLOSS_ENV, a purpose-built gradient
  environment map) were specified and never landed. They are the standing lever
  for material quality and they are waiting for you.

### D. THE SKY — "the planet is cut off, like a half-cut image"
Take this literally: he is describing a specific artefact, not a vibe. Find it.
Candidates worth checking rather than assuming: a sprite clipped by the far
plane or the frustum; a texture whose alpha edge is visible; a body that
intersects the island silhouette; a plane that does not face the camera.

Known and measured: planets occupy 3.6% of the visible sky band (honest, after
two wrong measurements); the starfield is 5000 points; **and the establishing
shot is a different camera from gameplay — its pitch swings 45 degrees in 3.5
seconds and the horizon IS on screen at the opening beat in four of five
worlds.** Three files in this repo still claimed otherwise last week. Any
visibility claim you make must state the radius range AND whether it holds
during the intro.

### E. THE SIXTH WORLD — "not boring, super out there"
Design it. Five exist: a maple town, a pirate bay, a tailgate, a night market,
a snowfield. They are all PLACES ON EARTH. The obvious sixth is another place;
the interesting sixth may not be a place at all. Whatever you pick, it has to
be buildable from the existing prop grammar in the time available, and it has
to photograph well enough to carry an ad.

---

## 4. HOW TO WORK

**Use the agents.** Weekly limits reset — spend them. Crews propose exact
patches; skeptics try to kill them; only survivors land. A crew that files
without a skeptic has produced literature, not a change.

**The rules that are not negotiable** (full text in GOVERNOR.md):
1. No claim ships as a fact until it is measured.
2. Every fix needs a probe that FAILS before it. A probe that cannot fail is
   not measuring the defect.
3. Every number you write down must be one you actually ran.
4. A probe must read the thing itself, on the thing's own clock.
5. Commit the record the moment a workflow returns. This has been paid for
   three times in lost work.

**The traps that will otherwise cost you a day each:**
- The container restarts without warning and reverts the local checkout. The
  remote branch is the only durable copy. **Commit and push source edits the
  moment they typecheck** — not at the end of a batch.
- `three@0.185.1` forces `NoToneMapping` when rendering into a `WebGLRenderTarget`.
  A probe that renders its own frame sees NO ACES, NO exposure, no sRGB encode —
  a different pipeline from the player's. **For anything about how it LOOKS,
  screenshot the canvas.** This has cost this repo several instruments.
- The match clock under swiftshader runs 14-40x slower than wall. Wait and
  sample on `window.__matchState().t`.
- `mrnd/mr/mpick/mchance` are ONE mulberry32 stream and Maple only. Adding or
  removing a single draw shifts every later placement in that world.
- Build ONLY with `cd artifacts/3d-game && npm run build`. From the repo root it
  builds an unrelated project and dies on a missing PORT variable.
- Never run a probe while the gate is running the same probe: two browsers
  compete for the GPU and both report failures that are not real.
- `qa/lookpair.mjs` takes `SEED=<n>` and pins `Math.random`, which is the only
  way two builds of a non-Maple world are comparable.

**The gate** is `node qa/gate.mjs --profile=push`, 14 steps, and it must be
green on a QUIET machine before main moves. It distinguishes "the probe did not
reach its own conclusion" from a real failure — read which one you got.

---

## 5. WHAT IS OWED, AND WHAT IS HELD

Do not treat the current state as clean. Two honest debts:

**Six changes landed on 2026-09-01 verified by the governor, NOT by an
independent skeptic** — the weekly agent limit closed mid-round. Each commit
says so. They are: the Lantern drum, the DRAG TO MOVE popup, Maple's teaching
hand, the top-left scoreboard, the family's banner cards, and the family
costume/ring fix. **Refute them first.** If one of them is wrong, it is wrong
in the build that ships this week.

**Two things are deliberately held:**
- The crown cards ("YOU ARE IN FRONT", "X TOOK THE LEAD"). They are the last
  in-match rank channel, because the scoreboard is gone and size does NOT track
  score — measured, the player's rank read off size is wrong in 99.7% of frames.
  They land only when the end screen carries rank.
- The tap-gate removal. The gate is not vestigial: switching worlds is a full
  page reload, so the tap on the world card happens in a document that no longer
  exists and cannot unlock audio. Removing it trades a guarantee for a
  probability and needs an adversary.

**Still unbuilt from the owner's last round:** the newsroom rewrite (he called
it sloppy and not fun, and asked for a writer who would work on a triple-A
game), and the splash's faded "THE CUTE" line, whose crew never filed.

---

## 6. THE NAME

He wants one. "Voidling", "the void", "cuboid" are all on the table and none is
settled. The hero is a small purple sphere with a face who eats a town. Whatever
you propose, test it out loud, against an App Store listing, and against a
six-year-old saying it to a friend.

---

## 7. THE BAR, AND THE ONE TENSION

The owner: *"at no point is good enough acceptable. AAA quality only."* He is
about to show this to an audience for the first time and he wants ads cut from
it. Every judgement is: would a stranger scrolling the App Store stop, and would
a child ask to play it again.

**And the tension you must manage rather than ignore:** he wants both a big
design change AND a ship this week. Those pull against each other. Sequence the
work so the polish (B, C, D) can ship WITHOUT the hook (A) if the hook is not
ready — a half-landed mechanic is worse than none, and a launch that slips
because a crew fell in love with an idea is a failure of governance, not of
design. Say plainly, early, which of the two you are protecting.
