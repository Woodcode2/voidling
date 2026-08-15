# THE NEWSROOM BRIEF — the town has a voice, and it is not the void's

**Status:** BUILT. Owner-set 2026-08-15 after a phone playtest; delivered the
same day. All five deliverables shipped — see **WHAT SHIPPED** at the foot.
**Read this before touching any newsroom, bubble or banner code.**

---

## THE COMPLAINT, VERBATIM

> "Is the news still the void talking? That's confusing. It should be dialed in
> where it's world chat like it always starts with a good morning etc and
> progressively panics. First morning, then like doubting the voids then panics
> etc for every level. When the void absorbs key buildings or events like a band
> it should say something funny to that."

> "We've had a ton of trouble figuring out how to do this news and family chat."

The second sentence is the important one. This has been rebuilt more than once
and it still reads as soup. This brief exists so the next attempt is the last.

---

## THE ROOT BUG, FOUND

`rivals.onSpeak` (prototype3d.ts ~1835) routes a family member's line into the
NEWSPAPER when that member is too far away to carry a speech bubble:

```ts
if (d < 55) bubbles.say(..., line, 'rival', rivalChip(name));
else breakingNews(`💬 ${name}: ${line}`);
```

The same fallback exists for brags (~3309). So THE BUGLE — a town newspaper —
prints `💬 CHOMPZILLA: ACT TWO: I CHARGE!!`, and the owner, reading his own
game on a phone, could not tell whether the news was the town or the void.
It is the void. That is the confusion, and it is one line of routing.

**Rule from here: a void's voice NEVER appears in the news card. Ever.** If a
family member is too far to show a bubble, the correct behaviour is silence —
or a compact family chip in the family lane. Not the newspaper.

---

## THE THREE VOICES, FINAL

One system, three lanes, and a child must be able to tell them apart in half a
second without reading a word.

| Lane | Who | Where | Looks like |
|---|---|---|---|
| **THE TOWN** | the world's newsroom / townspeople | the news card, top band | newspaper brand chip, one headline |
| **THE FAMILY** | named rival voids | speech bubbles pinned in 3D, with a coloured speaker chip | a character talking |
| **THE CROWD** | anonymous pedestrians | small fast bubbles | background texture |

Already built and NOT to be redone: the crowd/family split (`BubbleKind`
`'rival'` with speaker chips, eviction rights, banner suppression). That pass
was verified — 0 crowd bubbles during family moments over 180 samples. Keep it.

---

## WHAT THE TOWN MUST DO NOW: AN ARC, NOT A MOOD

Today the newsroom has three tiers (calm / worried / panic) chosen by a
continuous "how bad is it" number. That is a MOOD. The owner asked for a
STORY, and a story has an order that never varies:

1. **MORNING.** The town is fine. It is a normal day and the paper is full of
   normal nonsense — bake sales, parking meters, a lost cat. The void is not
   mentioned. This is the baseline the child learns so that every later beat
   lands against it.
2. **DOUBT.** Something is happening and nobody believes it. This is the comedy
   engine: officials deny it, an expert explains it away, a witness is
   dismissed. The void is referred to obliquely — "a hole", "the thing on Elm
   Street", "an unusually large drain".
3. **ALARM.** The town believes it now. Reports get short. Officials stop
   explaining and start advising.
4. **PANIC.** Full chaos, and it should be FUNNY chaos, not frightening — this
   is 4+. The newsroom keeps broadcasting because that is what newsrooms do.
   Nobody is hurt. Nobody is ever hurt. The jokes are about dignity, not danger.

**The arc is driven by how much of the town is gone (devouredPct) and by the
match clock — whichever is further along.** A child who eats fast should see
the town panic early; a child who dawdles should still reach panic before the
whistle. The arc NEVER runs backwards.

Every world gets its own four-phase arc in its own established voice. The
newsroom modules already exist and their voices are already good:
`newsroom_maple.ts` (THE BUGLE), `newsroom.ts` (Pirate Bay radio),
`newsroom_gameday.ts` (the commentary box), `newsroom_lantern.ts` (the
festival). Extend them; do not replace them.

---

## AND IT MUST REACT

The owner's second ask, and the one that will make it feel alive:

> "When the void absorbs key buildings or events like a band it should say
> something funny to that."

When something NAMED happens, the town reports THAT, immediately, ahead of any
scheduled line:

- **A landmark goes** — the water tower, the town hall, the clock tower, the
  great gate, the bathhouse. Each world already has a `heroGone` line; that is
  one line where there should be a small set.
- **A match beat fires** — the parade, the marching band, the goat, the drum,
  the treasure hunt, the fourth quarter. The band walking onto the field while
  a hole eats the stadium is free comedy and it is currently unremarked.
- **A form change** — the void evolving is a visible event in the sky. The town
  noticing it is funnier than a HUD banner saying EVOLVED.
- **A family member is eaten** — the town does not know their names, but a
  second hole vanishing is news.

A reactive line PREEMPTS the arc and then the arc resumes where it was.

---

## HARD RULES

1. **No void ever speaks in the news card.** The bug above, permanently.
2. **4+, always.** Nobody is hurt, nothing is frightening, no jeopardy language
   about people. Property is comic; people are never victims.
3. **One line, one screen.** A headline a 7-year-old reads in one pass. The
   existing two-sentence tic was measured and beaten down once already — do not
   reintroduce it. Target under 45% two-sentence lines.
4. **The arc never reverses.** Once a town is alarmed it does not go back to
   bake sales.
5. **No repeats within a match.** Pools must be big enough that a three-minute
   match never says the same thing twice.
6. **Names.** The town never uses a rival's name. It has no way to know it.
7. **Voice per world is sacred.** Maple's Bugle is dry and small-town. Pirate
   Bay is a resort PA that refuses to admit anything is wrong. Game Day is two
   commentators. Lantern Night is a festival that treats the void as an honoured
   guest. Read the existing files before writing a word.

---

## DELIVERABLES

1. `rivals.onSpeak` and the brag path never call `breakingNews`. Family speech
   that cannot be shown is dropped or shown in the family lane.
2. A four-phase arc per world, wired to `max(devouredPct-progress,
   clock-progress)`, monotonic, with the brand chip escalating with it.
3. Reactive lines for: each world's landmarks, each world's four beats, form
   changes, and a rival being eaten — each preempting the arc.
4. The loading screen stops naming a world before the player has chosen one
   (`#loadScr .lName`, prototype3d.ts ~1031). On a returning player it announces
   MAPLE FALLS before the splash, which reads as "you are going here" when the
   menu is about to offer four choices.
5. A probe — `qa/newsarc.mjs` — that plays a real match and asserts: phases
   appear in order and never reverse; zero news lines contain a rival name or a
   `💬` chip; a landmark eaten produces a landmark line within N seconds; no
   line repeats in a match.

## WHAT DONE LOOKS LIKE

A child plays Maple Falls. The paper opens with a bake sale. A few bites later
the council is denying there is a hole. Then the water tower goes and the paper
loses its composure about the water tower specifically. By the end the Bugle is
publishing in all caps and the town is still, somehow, filing copy. At no point
does a purple ball appear to be writing the newspaper.

---

# WHAT SHIPPED

## The five deliverables

1. **The routing bug is dead.** `rivals.onSpeak` and the rank-up brag path both
   lost their `else breakingNews(...)` fallback. A family member too far away to
   carry a bubble is now SILENT. Nothing else changed about family speech — they
   talk constantly when near, so nothing was lost, and the rank-change hero
   banner already carried the brag.
2. **A four-phase arc, in `src/proto3d/newsroom_arc.ts`.** Driven by
   `max(devouredPct-progress, clock-progress)` exactly as specified, with three
   independent guarantees that it never reverses: a HIGH-WATER MARK on the
   driver (the inputs themselves can fall), the form ladder demoted from a term
   to a FLOOR, and ONE STEP PER CARD so a fast eater climbs a rung per headline
   instead of teleporting to PANIC. Phases 1-3 reuse the existing tier pools —
   those are written, voice-checked and style-metered, and re-authoring them to
   fit a new shape would have thrown away good work. Only MORNING is new.
3. **MORNING pools, ~28 lines per world**, inside each newsroom module so they
   inherit the anti-repeat memory and the ticker clip. No `{tokens}` — morning
   must not depend on match state — and no greeting, because the sign-on already
   said it. The void is not mentioned, hinted at, or obliquely referenced.
4. **Reactive lines, in `src/proto3d/newsroom_react.ts`.** 108 templates across
   four triggers × four worlds: a named landmark eaten, each of the four match
   beats, a form change, and a rival eaten. All four fire through ONE funnel
   (`townReacts`) with ONE shared 11-second cooldown, because the reason this
   feature had been rebuilt more than once is that every call site had invented
   its own rules.
5. **`qa/newsarc.mjs`**, six sections, 25 assertions, PASS on all four worlds.
   And `qa/newsstyle.mjs` extended to meter MORNING and the reactive pools.

## Three decisions worth knowing about

**The beat reaction is deliberately late.** The brief asked for the town to
react to the band; the obvious implementation — hand the newsroom `bt.news` when
the beat fires — is the exact bug that was removed earlier this year, when five
of eight headlines in a measured Maple match were the beat card the player had
just read. So the banner still owns the beat, and eight seconds later the paper
reports the beat WALKING INTO THE VOID. Different event, different joke.

**Maple's morning has no bake sale.** The brief's example line for MORNING is
"bake sales", and `newsroom_maple.ts` bans pies and bake sales permanently under
its rule 5 — a house rule that exists because that one gag had eaten the feed
once already. The house rule wins. The pool draws from the approved list in that
same rule instead: a very large zucchini, the library's one computer, a raccoon
in the vending machine, a trampoline up a tree.

**A reactive line preempts the arc but still advances it.** The card printed is
the reaction; the phase still steps and still supplies the brand chip. So the
water tower going is reported under whatever badge the town has earned, and the
next scheduled card picks up exactly where the story was.

## What the probe measured — all four worlds

`node qa/newsarc.mjs` (and `ARC_WORLD=pirate|gameday|lantern`).

**Every world produced the identical phase ladder**, which is the owner's ask
stated as a measurement rather than an intention:

```
maple    0 0 0 1 1 1 2 2 2 3 3 3 3 3   PASS 26/26
pirate   0 0 0 1 1 1 2 2 2 3 3 3 3 3   PASS 26/26  (25/26 first pass — see below)
gameday  0 0 0 1 1 1 2 2 2 3 3 3 3 3   PASS 26/26
lantern  0 0 0 1 1 1 2 2 2 3 3 3 3 3   PASS 26/26
```

In order, never skipping a rung, never reversing, morning owning the first two
cards, and the brand chip escalating alongside in each world's own livery:

| world | calm | worried | panic |
|---|---|---|---|
| Maple Falls | 📰 THE BUGLE | ⚠️ BUGLE ALERT | 🚨 BUGLE EXTRA |
| Pirate Bay | 🏴‍☠️ BAY RADIO | ⚠️ RESORT UPDATE | 🚨 ALL HANDS |
| Game Day | 🏈 GAME DAY LIVE | ⚠️ BOOTH ALERT | 🚨 STILL ON AIR |
| Lantern Night | 🏮 MARKET COURTESY | 📜 MANAGEMENT NOTICE | 🥁 THE DRUM TOWER |

Per world, every run: 14 distinct lines from 14 cards; zero `💬` chips; zero
family names; 14/14 cards measured **on screen** — a real bounding box, inside
the viewport, opaque, on a 430×932 phone; and PLAY AGAIN returning the arc to
phase 0, 0 cards, high-water 0.00.

And a real landmark eaten through the real eat path, named in full, in each
world's own voice — which is the owner's second ask, working:

- Maple — *"Gus watched The Second-Biggest Ball of Twine go. Gus has notes."*
- Game Day — *"Bill has the rulebook out on The Good Mustard."*
- Lantern — *"The One Upside-Down Lantern has been accepted, with thanks."*
- Pirate — *"Five clear stars for the gap where Lounger Nine was."*

### The one failure — and a retracted explanation

Pirate Bay failed section E on the first pass: the void ate Lounger Nine and the
paper never mentioned it. It passes now. **The reason it passes is not the reason
I first gave, and the correction is the useful part.**

**RETRACTED.** I diagnosed the probe as shrinking the void — fitting it to a
small prop, knocking `curStage` down several rungs with `__setVoidR`'s direct
assignment, and re-firing evolutions that ate the cooldown. I changed the probe
to take `max(current, fitted)` and wrote that mechanism into two commit messages
and this file.

Then I made the probe PRINT the radii, and the log refuted it:

```
radius 0.90 -> 2.38 (prop fits at 2.38)
```

The void was at 0.90, not the 5-plus the story required. Old formula
`min(5.4, max(1.4, 2.38))` = 2.38; new formula `max(0.90, 2.38)` = 2.38.
**Identical.** The probe change was a no-op for this run, so it cannot be what
fixed Pirate, and the shrink cannot have caused the original failure — the first
run had the same target and the same starting radius. The lesson is the one this
session kept re-teaching: a plausible mechanism adopted without an instrument is
just a story, and it survives exactly until you measure it.

**What DID fix it is not proven.** The only other change is the two-floor
priority below, and the most plausible mechanism is that the warp put a second
sticker prop in reach a moment before Lounger Nine, so the first landmark took
the single shared cooldown and the second was refused — which is precisely what
two floors fix. But one run cannot separate "the priority change fixed it" from
"the original failure was intermittent". The discriminating test is to revert the
priority change and re-run Pirate; it has not been run. If it ever recurs, the
probe now dumps both floors, the pending queue and every card printed since the
eat, so the next occurrence names its own cause.

**The design error stands on its own merits regardless.** A single 11-second
cooldown, shared first-come-first-served, let a form change silence a landmark —
and that is backwards. The void evolving already gets a full-screen card, three
rings and a sound; the water tower going is the one thing only the newspaper can
report, and the owner's ask named landmarks first. There are now two floors: 4s
hard on everything so nothing machine-guns the ticker, 11s soft on `evolve` and
`beat` only. `landmark` and `rivalGone` clear the hard floor alone and can never
be starved. See the note above `townReacts` for why the two start at different
moments.

Never-shrinking also stays, not as the fix it was billed as, but as a correct
guard for the runs where the void HAS grown past its target — which is most of
them once a match is under way. It just was not this one.

Probe faults found and fixed rather than worked around, all written up in the
file: the card's CSS animation clock stalls while the game holds the main thread
under swiftshader (so the probe waits on the animation's own timeline, not on
wall clock); the first draft of the landmark assertion passed on the hero-cue
headline the probe had triggered itself; and the world-switch chain below.

### The `?len=` trap, and a limitation this run still carries

`DEBUG_HARNESS` (prototype3d.ts:2612) is set by `?len=` and does SIX things, not
one. Two of them broke the probe outright — it suppresses the daily reward card
(:5603) and auto-starts the match (:5811) — which meant the first version was
watching a match the query string had started, with a modal removed from under
it that a real player would have seen. Then a picker world switch reloads via
`location.href = location.pathname` (:4869), dropping `?len=`, so on the far
side the daily card reappears and the autoplay path correctly parks on
`pendingLaunch` waiting for a tap no robot makes. That looked exactly like a
dead game and was reported as one; it was not. See the retraction in `2e06f0c`.

**And two more that the current runs still sit inside.** With `DEBUG_HARNESS`
true the void SELF-DRIVES when input pauses (:7331) and AUTO-FIRES powers every
2.5-4.2s (:7544). Neither can affect the arc's order properties — morning first,
never reversing, never skipping — because those are invariant to how fast the
driver climbs. But auto-fired powers change WHAT gets eaten, which changes
`lastMeal`, which changes which meal pool the newsroom draws from. So "no
repeats in a match" and the landmark reaction are verified under a slightly
hungrier run than a child's.

The fix is to drop `?len=` and pass only `?w=<world>`: that makes the world under
test the BUILT world, so tapping its card in the picker takes the no-reload
branch (`if (id === pickedWorld) { launchWorld(); return; }`, :4871) — a genuine
child gesture, no reload, no DEBUG_HARNESS, daily card claimed the way a child
claims it. Match length comes back as the default 180, which is fine because the
probe now asks the game (`__newsArc().len`) instead of assuming.

One COPY fault was found by the probe on a live card and fixed in the source:
the subject clip was truncating *"The Second-Biggest Ball of Twine"* to *"The
Second-Biggest Ball of"*. A landmark line whose whole job is to name the
landmark must never be the thing that cuts it in half, so the budget now runs
the other way — the subject is never clipped and the TEMPLATES are held short
enough to fit one, checked at worst-case fill by `qa/newsstyle.mjs`.
