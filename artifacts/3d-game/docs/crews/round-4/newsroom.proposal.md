# THE NEWSROOM — ROUND 4

*A crew proposal. Nothing here is landed. The skeptic rules; the governor lands.*

> "The news is so brutal. It's often two sentences that make no sense. It feels
> sloppy. It's not fun. It shouldn't always start with something solid. Then
> progressively gets more panicky. Some items triggers those news events. Get a
> serious writer that would [work] on triple A games."
> — the owner, 2026-08-29

---

## 0. WHAT I READ, AND WHAT I RAN

Read in full: `docs/NEWSROOM-BRIEF.md`, `newsroom_maple.ts` (1,279 lines),
`newsroom_react.ts`, `newsroom_arc.ts`, `newsroom_powder.ts`, the headers of
`newsroom_gameday.ts` and `newsroom.ts`, `qa/newsstyle.mjs`, the `showNews` /
`breakingNews` / `townReacts` block in `prototype3d.ts` (:3789–4165, :5180–5340,
:9520–9545), `WORLD_COPY` (:1201–1440), `src/game/stickers.ts`, and the
placement paths in `island.ts`.

Everything below with a number attached was run this session and is re-runnable.
Node 22 imports the newsroom modules directly with `--experimental-strip-types`,
so the pools, the picker, the weights, the anti-repeat memory and the arc under
test are **the shipped code**, not a transcription. Where I modelled anything —
the play trajectory feeding a simulated match — I say so on the line.

Scratch instruments (not for commit; the shippable probe is section 6):
`sim.mjs`, `adj.mjs`, `cont.mjs`, `census.mjs`, `mfill.mjs`, `rep.mjs`,
`meter.mjs`, `desk.mjs` in this session's scratchpad.

**The first thing I ran was the existing gate.**

```
$ node qa/newsstyle.mjs
maple    ── 241 lines: 1-sentence 57%, 2-sentence 36%, questions 5%
gameday  ── 245 lines: 1-sentence 53%, 2-sentence 39%, questions 4%
lantern  ── 166 lines: 1-sentence 52%, 2-sentence 39%, questions 3%
react    ── 108 lines: 1-sentence 78%, 2-sentence 20%
clean
```

**The corpus passes its own meter, and the owner rejected it anyway.** That is
the most useful fact in this document. The meter is not broken; it is measuring
a property that turned out not to be the defect. Everything in section 1 is
about what it does not look at.

---

## 1. THE DIAGNOSIS

Six mechanisms. Each is named, quoted from shipped copy, and measured. One
hypothesis I formed early is refuted at the end, in writing, because it was
wrong and the retraction is worth more than the guess.

### 1.1 THE REACTIVITY SWITCHES ITSELF OFF AS A CHILD PLAYS — the big one

The owner's "some items triggers those news events" is not a feature request.
It is a **regression report from a player with a full save file.**

`townReacts` has five call sites (`prototype3d.ts` :2469, :5213, :8399, :9443,
:9520). Exactly one of them is "the child ate a thing": **:5213, and it lives
inside `if (got)` where `got = collectInRun(sid)` — the sticker branch.**

```ts
const sid = e.mesh.userData.sticker as string | undefined;
if (sid) {
  const got = collectInRun(sid);
  if (got) {
    …
    townReacts({ kind: 'landmark', subject: got.name });
```

`collect()` (`stickers.ts:388`) returns `null` when `set.has(id)`. And
`prototype3d.ts:1505` reads `if (hasSticker(st.id)) continue;` — **a found
sticker is not placed in the world at all.**

So the landmark reaction is a **consumable**. A brand-new player gets up to
twelve of them across their first several Maple matches. Once the twelve are
found they never fire again, ever, on that save.

What is left for a completed save, per match, that the child's own eating
causes:

| trigger | fires |
|---|---|
| `COPY.houseNews` (first building) | once |
| `townReacts landmark` from `COPY.heroName` (the Town Hall) | once, and only if the void reaches r ≥ 5.86 — the file's own note puts that at **t ≈ 132 s of 180** |
| everything else the child eats | **nothing** |

Against ~14.8 scheduled cards a match (measured, §1.3). **The owner is playing a
build in which one or two of fifteen cards can possibly be about what he just
did, and he is the player most likely to have completed the scrapbook.** He is
not describing a taste problem. He is describing a feature that decayed to zero
underneath him.

### 1.2 THE NEWSROOM'S WHOLE VOCABULARY FOR "WHAT YOU JUST ATE" IS TWELVE STRINGS AND FOUR BUCKETS

`lastMeal` (:5227) is `MEAL_NAME[qk] ?? mealOf(e)`. `mealOf` classifies **by
radius**. The complete set of values `{M}` can ever hold, and where each lands
in `mapleMealKind`:

```
a snack              -> small        a parked car         -> car
a mailbox            -> small        a moving truck       -> car
somebody's lunch     -> small        a whole HOUSE        -> house
somebody's hat       -> small        a big building       -> big
somebody's boat      -> small        an entire LANDMARK   -> big
a whole SHIP         -> small
the PRIZE GOAT       -> small
```

Twelve strings. Seven collapse to `small`. On an island the source calls
~3,297 props.

**The most common value of `{M}` is the literal word "a snack."** Rendered
through the shipped templates:

```
It ate a snack. Town hall has scheduled a meeting.
The Bugle put a snack on the front page, under the goat.
It ate a snack outside the diner. Gus calls that parking.
Gone since noon: a snack, the cabbage tent and the cabbages.
First a snack, and then the hedge next to it.
```

Every one of those jokes is *a specific object treated with disproportionate
gravity* — and the pipeline deletes the specific object before the template
sees it. A newspaper does not print "a snack". That is a size bucket leaking
onto a child's screen, and it is a large share of what the owner read.

It gets worse when the bucket sends a **named** thing into a template written
for a generic one. Both of these came out of a simulated match against the real
picker:

```
The goat is on the school roof. Nobody has established how.
That was the PRIZE GOAT, which had been there since 1988.

What is left? A meter, a mailbox and one very calm goat.
Down to the PRIZE GOAT now, and it is still hoovering.
```

"Down to the PRIZE GOAT now" means *the goat is all that is left*. It printed
because the goat was just **eaten**. The substitution inverts the template's
meaning, and there is no mechanism anywhere that could notice.

**And the world already knows better.** A census of every `qk` literal handed to
a placer:

```
15 house   1 trough      1 fountain   1 chalet     1 lift
 7 big     1 snowman     1 farmhouse  1 billboard  1 island
 4 car     1 snowballs   1 diner      1 barn       1 hut
 2 rv      1 sign        1 concession 1 bandstand  1 motel
 2 drift   1 scoreboard  1 church     1 lodge      1 pine
```

Twenty-five semantic kinds. **The newsroom sees `house`, `car`, `big` and `rv`
and nothing else.**

And on Maple Falls it sees almost nothing at all. Maple's placer signature is
`landmark(mesh, wx, wy, r, rotY, tag)` (`island.ts:6570`) — and `tag` is used
**only** in the rejection log:

```ts
if (!maplePlaceable(wx, wy, r) || !MS.spotFree(wx, wy, r * 20)) {
  lmFail++; lmRejects.push(`${tag}@${wx | 0},${wy | 0}`);
```

`drop()` for Maple (`:6541`) takes no `qk` at all. So `diner`, `church`, `barn`,
`farmhouse`, `bandstand`, `fountain`, `motel`, `billboard`, `scoreboard`,
`concession` and `trough` are **written down at spawn and thrown away**. The
flagship world tags exactly two kinds that reach `userData`: `car` and `goat`.

`MEAL_NAME`'s `house` and `big` keys are dead on Maple and Pirate — the source
comment at :3799 already says so, and the census confirms it.

### 1.3 "TWO SENTENCES THAT MAKE NO SENSE" HAS THREE SEPARATE CAUSES

**(a) Three sentences, unbounded.** `qa/newsstyle.mjs` sets a ceiling on the
two-sentence share and a floor on the one-sentence share. It never counts
three. Measured across the whole Maple corpus (`mapleAudit()`, 555 lines):
**69 lines, 12%, run to three or more sentences.** On a one-line phone ticker
they read as fragments:

```
Sport. The Otters lost. Everything else has gone as well.
The stoplight is the last thing standing. It is green. Go.
Where did Main Street go? Nobody will say. Everybody knows.
The corn maze is solved. Not by anybody. By removal.
Pike Hollow has the only twine ball now. No. Ours is on a truck.
Mayor Tuggle is debating an empty chair. The chair was a rival. It got eaten.
```

That last one is the owner's complaint in a single line: three sentences, a
concept the paper is forbidden to know (`rival`), and it does not parse.

**(b) Lines that are literally cut in half.** `reactLine()` clips at 78
characters at the last space, with no ellipsis. Run through the **real
function**:

```
$ node -e "reactLine({world:'powder',kind:'beat',beatId:'powder.contest'})"
written : Judging is delayed. Several entries have been, in the official term, unentered.
printed : Judging is delayed. Several entries have been, in the official term,

written : Norm says the void takes its cocoa with nothing in it. Everything, technically.
printed : Norm says the void takes its cocoa with nothing in it. Everything,

written : Every snowball on the green is being thrown at the same target. None have landed.
printed : Every snowball on the green is being thrown at the same target. None have
```

Three shipped cards end mid-clause. **They are invisible to the gate because
`reactAudit()` cannot reach them:** it walks the four `WorldReact` tuples, and
`MID_REACT` has 60 lines of which **only 30 are in those tuples. Thirty shipped
reactive lines have never been metered by anything.**

And `newsroom_powder.ts` — 226 lines, a live world — is **not in
`qa/newsstyle.mjs`'s world table at all.** (I metered it by hand: 0 over-length,
10% three-sentence. It is the cleanest voice in the game and nothing is
watching it.)

**(c) The paper contradicts itself inside one match.** 400 simulated Maple
matches against the shipped picker: **6% of matches print a thing as gone and
then print it alive again.**

```
GONE:  It ate the PRIZE GOAT. The mayor blames the other void.
ALIVE: The goat is riding up front in the last car out. Goodnight, everybody.

GONE:  It ate a mailbox, burped, then took the other one as well.
ALIVE: What is left? A meter, a mailbox and one very calm goat.
```

There is no ledger. Nothing in the system records what the paper has already
said happened, so nothing can stop it un-saying it.

### 1.4 THE STALE ELECTION — nine lines the file's own header forbids

`newsroom_maple.ts:60`:

> *RATED 4+. NO real politics of any kind — no election, no voting, no polls,
> no candidates, no recounts.*

`prototype3d.ts:4148`, at the call site:

> *NO ELECTION — the newsroom file is rated 4+ and bars real politics outright
> … **Do not put the election back.***

Nine shipped lines run one anyway, under a mayor who is not this town's mayor
(the cast list, the react file, the ambient voice pool and the loading copy all
say **Dinkle**; these say **Tuggle**):

```
Mayor Tuggle reminds you the election is Tuesday. Tuggle for Maple Falls.
Mayor Tuggle asks what {F}. Paid for by Friends of Tuggle.
Tuggle yard signs are free at the diner. Please take two, one may be eaten.
The mayor has not lost {D}. He has MISPLACED it. Vote Tuggle.
Polls close at eight. So does everything else, permanently.
Tuggle concedes nothing. Tuggle has, however, started running.
Mayor Tuggle is campaigning from the roof of the roofless town hall.
The mayor has moved the polling station twice. It keeps not being there.
The mayor has conceded {D} and kept the ribbon scissors.
```

Two full pools survived a rewrite that the header, the comment and the cast list
all describe as complete. This is not a taste question. It is a stale layer, and
a child hitting `LIVE[0]` meets a campaign ad.

### 1.5 CONTENT RULES BROKEN IN THE POOLS NOBODY METERS

`newsroom_maple.ts` house rule 5: *"THE PIE JOKES ARE RETIRED — no pies, no pie
contest, no bake sale, ever again."* `NEWSROOM-BRIEF.md`, under what shipped:
*"Maple's morning has no bake sale … The house rule wins."*

`MID_REACT['maple.bake']` — in the half of that map the gate cannot see:

```
The bake sale table went in with all nine pies still on it.
Marge sold a pie to the void. Marge says a sale is a sale.
The prize sponge is gone and Pearl is taking it extremely well.
```

And six lines put a **person** into the void, against a rule every newsroom file
carries and which `mealOf()` was rewritten to enforce at the substitution point:

```
The conga line went round it and came back four guests shorter.
The limbo champion went under the bar and did not come back up.
A mascot has run straight in. The head came off on the way down.
Somebody offered it a mask. It is now wearing the whole seller.
Sledding continues despite the void. Some sledding continues INTO the void.
Chairman Frost has retained his title by remaining in one piece.
```

"The head came off on the way down" and "wearing the whole seller" are not 4+
lines. They are in the build.

### 1.6 THE ARC IS A CONVEYOR, AND ITS SHAPE IS THE SAME EVERY TIME

`newsroom_arc.ts` is well built and does exactly what it was asked to. That is
the problem. `NEWSROOM-BRIEF.md` records the proof:

```
maple    0 0 0 1 1 1 2 2 2 3 3 3 3 3   PASS 26/26
pirate   0 0 0 1 1 1 2 2 2 3 3 3 3 3   PASS 26/26
gameday  0 0 0 1 1 1 2 2 2 3 3 3 3 3   PASS 26/26
lantern  0 0 0 1 1 1 2 2 2 3 3 3 3 3   PASS 26/26
```

**Every world, every run, the identical ladder.** It was shipped as the
achievement, and read as an achievement it is — but it is also a complete
description of why the owner says it is predictable. Once you have played four
matches you know card three is denial and card twelve is chaos, and the paper
has no capacity to surprise you again.

Two consequences worth naming:

- **A one-way phase gate strands good lines.** Once the arc is at 3, tier 0 and
  tier 1 are unreachable for the rest of the match. Everything dry and small
  becomes unavailable exactly when the contrast would be funniest.
- **`known` and `heat` are the same variable.** The paper's *facts* and the
  paper's *volume* are one number, so a town that has established the void
  exists can never again print a calm sentence about a parking meter.

### 1.7 WHY IT IS NOT FUN — and this is our own work

The bar is set inside this repo, by writing that is already very good. The
sticker hints (`stickers.ts`) and `WORLD_COPY` are the house at its best:

```
Still overdue. We all know who has it.
Norm went into the corn maze in October. Norm liked it so much he stayed.
It is on the diner wall. It is bigger than the man holding it.
A chalet has left. The booking stands. The chalet does not.
school is shut · the valley slides · eat it all
MAPLE FALLS has GONE!! The clock is still nine minutes fast.
```

Every one of those is **one idea with a turn**: sentence two reverses,
undercuts, or refuses to be impressed by sentence one. Now the ticker at its
worst, all shipped:

```
Sport. The Otters lost. Everything else has gone as well.
The hoop dispute is unresolved. It will stay unresolved.
Missing from the high school: the high school.
Town hall says Main Street is a concept. A very sturdy concept.
It ate {M}. Town hall has scheduled a meeting.
The stoplight is still ours. For now it is still ours.
Quiet hours are permanent now. Very quiet. Almost too quiet.
```

These are **two facts, not one joke.** Sentence two adds information instead of
turning. "The hoop dispute is unresolved. It will stay unresolved." has no
setup anywhere in the corpus — a child meets the phrase "the hoop dispute" once,
for two seconds, and never again. "Quiet. Almost too quiet." is a stock phrase
with no Maple in it at all.

**So the failing property is SHAPE, not COUNT.** The meter counts sentences and
the corpus obediently hits 36% two-sentence. It has never once asked whether
sentence two *does* anything. That is why a green gate and a rejected feed can
both be true.

### RETRACTED, in writing

**I thought the Maple corpus was being truncated, and it is not.** Reading
`clip(raw, TICKER_MAX)` with no ellipsis, I formed the story that the owner's
"two sentences that make no sense" was a second sentence being amputated.
Measured at worst-case token fill across all 555 Maple lines: **0 exceed 78
characters.** The story was wrong for the corpus and I nearly wrote it up as
the headline. It turned out to be true for exactly three lines in the one pool
the gate cannot reach (§1.3b), which I only found because the refutation sent
me looking for where it *would* be true.

**And my first idea for a coherence probe was worthless.** I built a lexical
test — a two-sentence line is a non-sequitur if sentence two shares no noun with
sentence one and opens with no back-reference — and it flagged 53% of the
corpus, including this:

```
Coach benched his own nephew. Dinner that night was quiet.
```

That is one of the best lines in the file. The metric was measuring
*cohesion*, and comedy runs on the opposite. It is not in section 6 and it
should not be built.

---

## 2. THE STRUCTURE — THE DESK REPLACES THE ARC

The owner rejected calm → panic. The brief's rule 4 says the arc must never
reverse. Both are right, and they are about different things.

> **What must not reverse is the FACTS. What is free to move is the ATTENTION.**

A town cannot go back to believing there is no void once it has printed that
there is one. But a newspaper can absolutely go back to being interested in the
parking meter — and that is not a reversal, that is a newspaper. The current
system conflates the two into one number, which is why the shape is identical
every match.

So: **one monotone ledger, one free front page.**

### 2.1 THE LEDGER — `known: 0 | 1 | 2 | 3`, monotone, earned by evidence

Not a clock, not a percentage curve. It rises only when the void does something
the paper cannot un-print.

| rung | the town has printed | what raises it |
|---|---|---|
| 0 | nothing | — |
| 1 | there is a thing on Elm Street | first `GREW`, or first `ATE.*`, or 3% devoured |
| 2 | the thing is eating the town | a NAMED landmark goes, or a building-class meal, or 16% devoured |
| 3 | the town is mostly gone | 34% devoured, or WORLD ENDER form |

Eating a parked car is rung-1 evidence. Eating the church is rung-2 evidence.
The existing high-water guard, the form floor and the two-card minimum in
`newsroom_arc.ts` all survive, unchanged, applied to `known` instead of `phase`.

### 2.2 THE FRONT PAGE — who leads is rolled per card, and the town has a floor

| `known` | town leads | void leads |
|---|---|---|
| 0 | 100% | 0% |
| 1 | 55% | 45% |
| 2 | 35% | 65% |
| 3 | **30%** | 70% |

**The 30% floor is the design.** The town never stops having its own news. Four
or five of a match's fifteen cards are the paper completely ignoring the void,
at any point, *including the last thirty seconds* — which is where the deadpan
finally pays:

```
Gus has changed the special. The special is what it was.
The 1978 trophy has been polished again. It is the only one we have.
```

printed under 🚨 BUGLE EXTRA, with the town 60% eaten. That is the funniest
version of this game's newspaper and the current system cannot produce it.

### 2.3 THE SPINE — one running story, drawn per match

One thread from six, three instalments, spaced across the match, in order,
**the same length whatever the void does**. Marge and the meter. The trampoline
in the elm. Norm in the maze. The unclaimed casserole. Gus's sandwich. Dale's
fence.

This is what makes two matches feel different, and it costs eighteen lines. It
also gives the paper a payoff that is *earned* rather than orphaned — the
current corpus prints "Somebody found Gus's sandwich in the school fridge" in
matches where the sandwich was never mentioned.

### 2.4 THE INTERRUPTION — once a match, at a card nothing predicts

A correction. Lost property. The weather. Something with no relationship to
anything, at a randomly chosen card in the middle half of the match. This is
the single cheapest defeat of predictability in the design, and it is the most
newspaper-shaped thing in it.

### 2.5 THE GONE LEDGER — the fix for §1.3c

Alongside `known`, a `Set<string>` of every subject the paper has reported
eaten. Every line carries the subjects it names. **A line naming anything in
that set is never drawn.** "It ate the diner" makes every diner line
unreachable for the rest of the match, mechanically. This is what kills
`It ate the PRIZE GOAT` → `The goat is riding up front` for good.

### 2.6 HEAT IS SEPARATE FROM KNOWN

`heat` drives the brand chip and the punctuation ceiling only, and it *cools*
during a quiet stretch even at `known: 3`. So the chip still escalates — the
owner's escalation is preserved and visible — while the writing underneath it
is free.

### 2.7 A SKETCH, RUN

`desk.mjs` implements the above against the copy in section 4 and a modelled
play trajectory. One real output, unedited:

```
  6s k0 📰 THE BUGLE    OPEN       Good morning, Maple Falls! The Otters play Friday and we are hopeful anyway.
 27s k1 📰 THE BUGLE    FIRST      Residents on Elm Street report a hole. The council reports no hole.
 43s k2 ⚠️ BUGLE ALERT  NAMED      Marge did not look up when The Water Tower went.
 56s k2 ⚠️ BUGLE ALERT  GREW       Tater says Steve has had a growth spurt and Tater is not wrong.
 68s k2 ⚠️ BUGLE ALERT  ATE.diner  It ate the diner. Marge notes that her booth was inside it.
 79s k2 ⚠️ BUGLE ALERT  ATE.house  A whole house has gone and town hall will discuss it for four hours.
 91s k2 ⚠️ BUGLE ALERT  DESK.2     Carla Webb asked it for a comment and got nothing. Front page anyway.
101s k3 🚨 BUGLE EXTRA  ATE.barn   The red barn is gone. The other barn is now simply the barn.
113s k3 🚨 BUGLE EXTRA  INTERRUPT  Wanted: somebody to fix the town clock, not urgently, it has been years.
129s k3 🚨 BUGLE EXTRA  DESK.3     Nobody is hurt and everybody has a casserole. That is Maple Falls.
143s k3 🚨 BUGLE EXTRA  NOTICE     Mayor Dinkle has called it a drainage matter, in writing, twice.
159s k3 🚨 BUGLE EXTRA  NOTICE     Somebody has put a cone next to it. Somebody always puts a cone.
171s k3 🚨 BUGLE EXTRA  ATE.band…  It ate the bandstand mid-song and the band has still not stopped.
```

**The sketch found three faults in its own design and all three are now rules
above, not prose.** (1) The casserole payoff lived in both `INTERRUPT` and
`SPINE.casserole` and printed *before* its own setup — a spine payoff may not
exist in any other pool. (2) "A hole has opened on Elm Street" fired at 124 s
with the town 40% gone — the line that announces the void's existence is its own
trigger, `FIRST`, and fires at rung 1 only. (3) "On the last truck out" fired at
91 s — `DESK` is split by rung so endgame lines cannot fire early.

---

## 3. THE REACTIVE HOOKUP — "some items triggers those news events"

Three changes, smallest first. All three are for the governor to land; none is
mine to make.

### 3.1 ONE LINE AT THE PLACER

`island.ts:6570`. `landmark()` already receives `tag`. Keep it:

```ts
const landmark = (mesh, wx, wy, r, rotY = 0, tag = '?'): boolean => {
  …
  const ok = drop(mesh, wx, wy, r, rotY);
  if (ok && tag !== '?') mesh.userData.qk = tag;   // ← the whole change
  return ok;
};
```

That alone gives Maple eleven named prop kinds where it has two: `diner`,
`church`, `barn`, `farmhouse`, `bandstand`, `fountain`, `motel`, `billboard`,
`scoreboard`, `concession`, `trough`. The information is already being written
down; today it is written into a rejection log and discarded.

*Caveat, stated rather than assumed: `landmark()` is used for Maple's authored
props only, so this covers the town's landmarks and not its scattered houses.
Whether `drop()` should carry a kind too is a bigger change and a separate ask.*

### 3.2 A MEAL DESK KEYED ON KIND, NOT ON RADIUS

`MEAL_NAME` stops being a three-key map and becomes the paper's dictionary:
`qk → { noun, pool }`. Eating the diner files an `ATE.diner` line six to eight
seconds later, once per kind per match, through the existing `townReacts`
funnel and its existing floors.

**`{M}` is then deleted from the corpus entirely.** No template in section 4
carries it. A line about what was eaten either names the thing (`ATE.*`,
`NAMED`) or does not exist. That removes §1.2's whole failure class at the
source rather than papering over it — Governor rule 6.

### 3.3 THE LANDMARK REACTION STOPS BEING A CONSUMABLE

Split the two jobs currently fused at `:5213`:

- **The sticker** keeps `if (got)` — the banner, the points, the scrapbook.
  Found once is correct for a collectible.
- **The reaction** moves out to `if (sid)`, or better, fires on the prop's kind
  being in a NAMED set. The paper reports the water tower going **every time the
  water tower goes**, because that is what a paper does.

That requires the sticker prop to be placed for a returning player, which today
it is not (`:1505`). Two options, and this is an owner call, not mine: place
found stickers as ordinary named props with no star and no banner; or hang the
NAMED reaction off the world's authored landmarks instead of off the scrapbook.
**The second is cleaner and needs 3.1 anyway.**

---

## 4. THE COPY — MAPLE FALLS, IN FULL

205 lines across 37 triggers. Metered by `meter.mjs`, which enforces the
existing house style plus the three rules this proposal adds:

```
37 triggers, 205 lines
1-sentence 61% (floor 35%), 2-sentence 39% (ceiling 45%), 3+ 0% (proposed ceiling 0%)
questions 5, longest line 76 chars (cap 78)
clean
```

**My own probe failed my own first draft on nineteen counts** — five
three-sentence sign-ons, seven `NAMED` templates over 78 once a 34-character
landmark fills, a council *vote* tripping the politics rule, three shouted words
in a billboard line, a duplicate between `TOWN` and `SPINE.casserole`, and the
corpus ratios. Every one is fixed above. That is Governor rule 2 applied to
writing: the probe failed before the fix.

**Standing rules this set holds itself to**, beyond the file's existing house
style:

1. **Never more than two sentences.** The 12% that run to three are the ticker
   reading as fragments.
2. **Sentence two must TURN, not add.** It reverses, undercuts, or refuses to be
   impressed. If it is a second fact, it is one sentence with a comma or it is
   cut.
3. **No `{M}`, no `{D}`, no `{F}`, no `{P}`, no `{S}`.** `{X}` — a real name —
   is the only token in the set.
4. **Nobody is a victim and nothing is frightening.** Property is comic. Animals
   walk away. Nobody's head comes off.
5. **Dinkle. No election.**
6. **Every line stands alone.** No line depends on a setup that may not have
   fired — except the six `SPINE` threads, which are ordered by construction.

**194 of the 205 are new. Eleven are shipped lines kept verbatim** because they
are already right and throwing away good work to look busy is its own failure:
Tater's map, the Otters at nought and nine, Deb Hollis's mailbox, Gus's new
stool, the rooster at twenty to five, the flat lake, the brave scarecrow,
`{X} is not where it was this morning`, the goat at the edge, the redirected
tractor pull, and day 3,281. The rest of `newsroom_maple.ts` — the nine district
pools, LIVE, the four meal pools, GENERAL — is what this set replaces.

#### OPEN — the sign-on

Card one, always. The greeting plus ONE more sentence, never two. Nothing about the void: nobody has seen it yet.

```
Good morning, Maple Falls! The goat is out and the gate is still shut.
Good morning, Maple Falls! Pearl has grown a marrow with its own trailer.
Good morning, Maple Falls! Lost overnight and found by nine: one trombone.
Good morning, Maple Falls! Biscuit has opened the diner and Gus has not.
Good morning, Maple Falls! The trampoline is still up the elm on Pine Road.
Good morning, Maple Falls! Day 3,281 of Marge versus the parking meter.
Good morning, Maple Falls! Norm has been in the corn maze since October.
Good morning, Maple Falls! Wendell opens at nine, or whenever he opens.
Good morning, Maple Falls! The Otters play Friday and we are hopeful anyway.
Good morning, Maple Falls! There is a raccoon in row C and row C is his.
Good morning, Maple Falls! A library book from 1974 has come back to us.
Good morning, Maple Falls! The ball of twine has been dusted for the season.
Good morning, Maple Falls! Dale has been mowing since six on a Sunday.
Good morning, Maple Falls! The clock is nine minutes fast, on purpose.
```

#### TOWN — the paper doing its job

The engine. Available at EVERY rung, including the last thirty seconds, and that is the whole joke.

```
Pearl has grown a marrow that will not fit through Pearl's own door.
The library has one computer and a waiting list of eleven.
Dale has measured his lawn and found it two inches out of true.
Biscuit opened the library door and has renewed nothing.
Pike Hollow has a roundabout now. We are pleased for Pike Hollow.
Marge has been at the meter nine years and the meter has not moved either.
Ferris wheel car nine has been at the top since Tuesday, empty as always.
A raccoon has taken row C of the vending machine and will not negotiate.
Gus has changed the special. The special is what it was.
Wendell has given the same haircut since 1988 and it still suits everybody.
The town clock is nine minutes fast and the council intends to keep it.
The marching band knows one song and will play it twice on Saturday.
A library book from 1974 came back overnight with no note attached.
Tater, aged nine, has drawn a map of the town. It is better than ours.
Norm is still in the corn maze and has sent word that he is fine.
Four families are claiming the swim dock and the dock is claiming nothing.
The Otters are nought and nine and the town could not be prouder.
A trailer of hay went over on the county road and the horses are delighted.
Deb Hollis reports that her mailbox has moved four feet to the east.
The diner has a new stool and Gus will not say which one it is.
Every dog on Elm Street barked at nine and stopped at the same second.
The fair opens at ten and the gate has said nine since 1994.
The scarecrow has a jacket now and is doing better than most of us.
Mayor Dinkle opened a bench today with a ribbon and a short speech.
The rooster crows at twenty to five and will not be reasoned with.
Somebody parked a trampoline up an elm and nobody on Pine Road saw a thing.
The silo is the tallest thing in the county and we mention it daily.
Carla Webb has edited this paper nineteen years for a readership of forty.
The lake is flat, the boats are out, and nobody has caught anything.
The 1978 trophy has been polished again. It is the only one we have.
A cow got out and four trucks turned up to help. A lovely hour.
How deep is the lake? Twelve feet, whatever anybody at the diner tells you.
The corn maze map has been upside down since the day it was printed.
Somebody has been feeding the raccoon and the raccoon has told the others.
The stoplight held yellow for nine seconds on Tuesday and that is a record.
The bandstand has a new coat of paint and one very old bench.
```

#### FIRST — the void enters the paper

Fires once, at rung 1 only. The one card that announces there is a thing. It can never fire late.

```
A hole has opened on Elm Street and town hall has scheduled a meeting.
There is something in the square that was not in the square yesterday.
Residents on Elm Street report a hole. The council reports no hole.
Something purple has arrived and nobody has decided what to call it.
```

#### NOTICE — the town's own news with the void in the corner of it

Rung 1 and up. Somebody in Maple Falls reacting exactly as much as they feel like.

```
Dale mowed right up to the edge of it and stopped. A crisp line.
The raccoon walked past the thing on Elm Street without changing speed.
Marge has moved the protest closer to it. The meter is still the real issue.
Pearl looked at it for a while and then went back to the marrow.
Biscuit will not go near it and Biscuit is the only one being sensible.
The goat walked to the edge, looked in, and walked away unimpressed.
Gus says he saw it coming. Gus says that about everything.
Mayor Dinkle says it is a puddle. He is looking right at it.
Wendell cuts hair on the pavement now. Same haircut, better view.
The corn maze got easier overnight and Norm has mixed feelings.
Tater has named it Steve and nobody has come up with anything better.
Two hundred people watched it for an hour because nothing else was on.
The scarecrow is facing it now. Useless, but very brave.
The stoplight is still working. There is less and less to stop.
Somebody has put a cone next to it. Somebody always puts a cone.
Mayor Dinkle has called it a drainage matter, in writing, twice.
The Bugle has gone to four pages and Carla Webb waited nineteen years.
Pike Hollow has offered to look after our twine ball. The answer was no.
It went past the school at lunchtime and nobody finished their lunch.
The council has agreed to look into it, at length, on a date to be fixed.
Is it getting closer? The barber says yes and the barber is usually right.
```

#### DESK, rung 2 — the void has the front page

It is happening, the paper is on it, the town is not finished.

```
It is bigger than the barn now, and the barn is the usual measure here.
It is on Main Street. Main Street is taking it fairly well.
Everybody to the car park, please. Bring a chair and something to share.
Evacuation route: past the diner, left at the goat, and keep going.
It has been going since breakfast and has not slowed down once.
Carla Webb asked it for a comment and got nothing. Front page anyway.
It went through the fairgrounds without stopping at a single stall.
The Bugle is a one-page paper about one story and it is a good story.
The fire department has been out to look at it and has no notes.
Biggest thing here since the flood of 51, and larger, to be fair to it.
It has eaten the argument about the bench, along with the bench.
Maple Falls is smaller than it was this morning by a fair margin.
```

#### DESK, rung 3 — the endgame

Only when the town is genuinely mostly gone. These are the lines that fired early under the old picker.

```
Half the town is gone and the other half is arguing about the meter.
Nobody is hurt and everybody has a casserole. That is Maple Falls.
Town hall says the town is more compact now. Town hall has gone.
On the last truck out: the twine ball, the goat and Tater.
Everything is on the county road and the county road is a queue.
Where is Main Street? Nobody in this town will say it out loud.
Dale has mowed his lawn one last time and it looked superb.
Marge is at the meter and the meter is the last thing on that street.
Gus has the coffee pot, the photo of the catfish, and nothing else.
The Otters have no field, no ball and no scoreboard, and still no wins.
```

#### INTERRUPT — once a match, at a moment nothing predicts

Corrections, lost property, the weather. Nothing to do with anything. This is the anti-metronome.

```
Correction: the diner has eleven stools, not twelve. We regret the error.
Lost: one left glove, brown, on or near the bandstand. No reward.
Weather: fine, then less fine, then fine again. Same as yesterday.
Found: one boot, and Tater has already claimed it.
The hardware shop is shut and Wendell has not explained and will not.
This week in Maple Falls: nothing. Last week: also nothing.
Correction: it is a marrow, not a zucchini. Pearl has been in touch.
The Otters lost. We were not going to mention it, but here we are.
For sale: one trampoline, up a tree, buyer collects.
Sport, weather and lost property are all on page two of two.
Notice: the library closes at four, as it does every day, for ever.
Wanted: somebody to fix the town clock, not urgently, it has been years.
Has anybody seen a brown dog with a plan? He answers to Biscuit.
Correction: the Otters are nought and nine, not nought and eight.
```

#### CLOSE — the sign-off

Once, late, and then the station is shut for the match.

```
That is the Bugle for today and there will be another one tomorrow.
Goodnight from the Bugle. We will print whatever there is to print.
Carla Webb, for the Maple Falls Bugle, from a field. Goodnight.
The Bugle goes to press at six and always has gone to press at six.
Tomorrow: the meter, the goat, and whatever else is still here.
That is all from Maple Falls. It has been a day and a half.
```

#### ATE.&lt;qk&gt; — the meal desk

One pool per prop kind. Fires 6–8 s after the bite, at most once per kind per match.
These are the lines the owner asked for: a bulletin about the bakery ten seconds after they ate the bakery.

**`ATE.diner`**

```
The diner has gone. Gus took the coffee pot and his opinions with him.
Gus is running the diner off the back of a truck. Refills still free.
It ate the diner. Marge notes that her booth was inside it.
```

**`ATE.church`**

```
The church has gone. The bell went last and got a full note out.
The church noticeboard went with the church, still advertising Tuesday.
```

**`ATE.barn`**

```
The barn has gone. It was the barn that needed painting, so that is settled.
The red barn is gone. The other barn is now simply the barn.
```

**`ATE.farmhouse`**

```
The farmhouse has gone and the washing line is still standing, still full.
Four generations in that farmhouse, and the rooster is entirely unbothered.
```

**`ATE.bandstand`**

```
The bandstand has gone. The band has taken this as a challenge.
It ate the bandstand mid-song and the band has still not stopped.
```

**`ATE.fountain`**

```
The fountain is gone. It had not worked since 1998, so no great loss.
The fountain has gone and taken every coin anybody ever wished on.
```

**`ATE.motel`**

```
The motel is gone. The sign is still lit and still reads VACANC.
It ate the motel, and room six had the good television.
```

**`ATE.billboard`**

```
The billboard has gone. It said visit Maple Falls and it did its best.
A billboard has gone. It advertised the twine ball, which is still here.
```

**`ATE.scoreboard`**

```
The scoreboard has gone. It read nought to nine, which was accurate.
The scoreboard is gone and the Otters are officially not losing.
Is that the scoreboard gone? Then nobody can prove anything.
The Otters have lost the scoreboard, which is a new way to lose.
```

**`ATE.concession`**

```
The snack stand has gone and the teen behind it did not look up once.
It ate the concession stand and the queue simply re-formed behind it.
```

**`ATE.trough`**

```
The water trough has gone. The horses have been told and do not care.
```

**`ATE.car`**

```
A parked car has gone. Dale says it was parked wrong anyway.
It ate a car outside the diner and Gus is calling that a parking space.
Somebody's car has gone. It was blue and it had a bumper sticker.
```

**`ATE.house`**

```
A whole house has gone and town hall will discuss it for four hours.
A house went in one go. The mailbox at the end of the path did not.
That was somebody's house. They are at the diner and they are cross.
```

**`ATE.goat`**

```
The goat walked in. The goat has walked into worse.
It ate the prize goat, which had been trying to get eaten all year.
The goat has gone and eleven gates in this county are now unguarded.
```

#### NAMED — a named landmark goes

{X} is the sticker name or the hero landmark. {X} runs to 34 characters, so a template gets 44.

```
{X} has gone. Dinkle says we are fine.
Gus watched {X} go and Gus has notes.
Where {X} stood there is a tidy nothing.
Tater says {X} going was the best bit.
{X} is not where it was this morning.
Pike Hollow still has theirs. Ours went.
Marge did not look up when {X} went.
{X}, gone, and on a Tuesday of all days.
Front page cleared. {X} has gone.
Nineteen years, and now {X} is the story.
```

#### BEAT.&lt;id&gt; — a match beat meets the void

Filed eight seconds after the banner, never with it. `BEAT.casserole` REPLACES `maple.bake`, whose three
shipped lines break this world's permanent ban on pies and bake sales (see the diagnosis).

**`BEAT.band`**

```
The band marched into it and kept playing. They know the one song.
The band is down to eleven players and up to full volume.
The trombones have gone. The song has not.
```

**`BEAT.dog`**

```
Biscuit ran round it twice, thought about it, and took a sandwich instead.
Six people are chasing one dog and all six have stopped at the same spot.
Biscuit will not go near it. Biscuit has been right before.
```

**`BEAT.parade`**

```
The parade has reached Main Street. Main Street has not.
The float went in and Mayor Dinkle is calling it a scheduling matter.
The parade is going round something that nobody will name out loud.
```

**`BEAT.goat`**

```
The goat walked to the edge, looked in, and walked away.
The goat has stopped running for the first time in nine years.
Everybody is watching the goat. Nobody is watching the void.
```

**`BEAT.casserole`**

```
The casserole table went in with all nine casseroles still on it.
Somebody has offered it a casserole and it took the dish as well.
The casserole nobody claimed has finally been claimed, by that.
```

**`BEAT.tractor`**

```
Old Hutchins has driven round it four times, waving on every lap.
The tractor pull has been redirected. The tractor had other ideas.
Dale flagged the tractor down at the edge and the trailer kept going.
```

#### GREW — the void changes form

```
It is bigger. Mayor Dinkle says it is exactly the size it was.
Dale has measured it and reports four more feet since lunch.
It has grown again and Pearl remains the calmest woman in this town.
Carla Webb has run out of words that mean large.
It is bigger than the silo now, and the silo was the measure.
Tater says Steve has had a growth spurt and Tater is not wrong.
```

#### SECOND — one void has eaten another

The town has no way of knowing they have names. It never uses one.

```
There is one void now, and it has had a very good morning.
One of them has gone into the other one and nobody can explain it.
We are down to one and it is noticeably larger than it was.
```

#### SPINE.&lt;thread&gt; — the running story

ONE thread is drawn at match start and printed in three instalments, spaced across the match, in order.
It is the same length whatever the void does. It is why two matches do not feel like the same match, and
it costs eighteen lines.

**`SPINE.marge`**

```
Day 3,281 of Marge and the parking meter. Twenty five cents an hour.
Marge has moved the protest and taken the folding chairs with her.
Marge and the meter left on the last truck together after nine years.
```

**`SPINE.trampoline`**

```
A trampoline is up an elm on Pine Road and nobody saw how.
The trampoline is still up the elm and the elm is taking it well.
The trampoline came down today, and not the way anybody expected.
```

**`SPINE.norm`**

```
Norm went into the corn maze in October and sends word that he is fine.
The corn maze got easier overnight and Norm is not sure how he feels.
Norm is out of the maze, on account of there being no maze.
```

**`SPINE.casserole`**

```
There is a casserole on the bandstand and no name on the dish.
The bandstand casserole is still unclaimed and still on the bandstand.
The casserole has been claimed at last, and so has the bandstand.
```

**`SPINE.sandwich`**

```
Gus has put a sandwich down somewhere and would like it back.
The sandwich has not turned up and Gus is down to two suspects.
The sandwich was in the fridge all along and Gus has apologised to Biscuit.
```

**`SPINE.fence`**

```
Year four of Dale's fence and the two inches it is over the line.
The fence case is adjourned. Both parties have gone to look at the hole.
The fence case is settled. There is no fence and there is no line.
```

---

## 5. THE OTHER FOUR WORLDS

**I have written Maple Falls and only Maple Falls, deliberately.** It is world
1, it is the world the owner plays and named, and a full replacement corpus for
five worlds written in one pass would be five corpora of the quality he is
already rejecting. The structure in section 2 is world-agnostic; the copy is
not, and should not be.

What transfers unchanged: the ledger, the front-page roll and its 30% town
floor, the spine, the interruption, the gone-set, the shape rule, and the
`ATE.<qk>` desk. What each world needs written for it: `OPEN` / `TOWN` /
`FIRST` / `NOTICE` / `DESK.2` / `DESK.3` / `INTERRUPT` / `CLOSE`, one spine set
of six threads, and an `ATE.*` pool per kind its placer tags. Those worlds
already tag more than Maple does: Lantern Night passes `big` at five call sites
and `house` at thirteen (several of them `plant()` runs placing many props
each), and Game Day passes `big`, `house` and `rv` — so 3.1 is a smaller job
there, and on those two worlds an `ATE.*` desk can be built today.

Four things that should be fixed in the other worlds **now**, independently of
any rewrite, because they are shipped defects rather than taste:

1. The three amputated Powder lines (§1.3b).
2. The six person-in-the-void lines (§1.5).
3. `maple.bake` — three lines against a permanent ban. `BEAT.casserole` in
   section 4 is a drop-in replacement in the same slot.
4. `newsroom_powder.ts` into `qa/newsstyle.mjs`'s world table, and
   `reactAudit()` extended to walk all of `MID_REACT`.

One line I want on the record because it is the best thing in any of the five
files and it should be the model for the rewrite when it comes:

```
Item: the sled hill. Item: the sled hut. Item: the sleds.
```

Powder Pass. A closures desk reading its list. It is three sentences, it breaks
my own rule 1, and it is perfect — which is the honest limit of any rule, and
why a skeptic and not a meter should have the last word on a line.

---

## 6. THE PROBE — `qa/newsdesk.mjs`

The existing `qa/newsstyle.mjs` is a **pool** meter and it stays. This is a
**sequence** meter: it plays a real match and asserts on the cards that actually
reached the screen, in order, because every defect in section 1.3 is a property
of a sequence and is invisible to a pool.

It must FAIL on today's build. Sections A, C, D and E below do, and the failing
run is the evidence.

**A · NOTHING PRINTS IN FRAGMENTS.** Every card that reaches `#news`, after
brand and clip, ends in `.`, `!` or `?` and contains at most two sentences.
*Fails today:* three `MID_REACT` lines print mid-clause (§1.3b), and 12% of the
Maple corpus is three sentences (§1.3a). Bar: 0 amputated, 0 three-sentence.

**B · EVERY POOL IS REACHABLE BY THE METER.** Walk `newsroom_react.ts` source,
collect every string literal in every exported pool, and assert that
`reactAudit()` returns all of them. *Fails today:* 30 of 60 `MID_REACT` lines
are unreachable. This is Governor rule 4's "throw if the call site has moved" —
a gate blind to half its corpus is the same bug wearing a hat.

**C · THE PAPER NEVER UN-SAYS ITSELF.** Maintain a gone-set from the cards
themselves: any card matching a burial pattern buries every subject it names,
and no later card in the match may name a buried subject alive. *Fails today:*
6% of 400 simulated matches. Bar: 0 in 200 runs.

**D · NO CARD NAMES A THING THE GAME DID NOT PROVIDE.** Assert no card contains
a size-bucket string — `a snack`, `a big building`, `somebody's hat`, `a whole
SHIP` — and no card contains a form name (`GOBBLIN`, `CHOMPER`, …) outside a
`GREW` card. *Fails today:* the size buckets are the most common `{M}` value
(§1.2), and `A GOBBLIN was seen in Pine Woods` is a live `LIVE[0]` line. Bar: 0.

**E · THE SHAPE IS NOT A METRONOME.** Over a match, classify each card's shape
(one-sentence / two-with-a-turn / question / list-colon) and assert no shape
exceeds 55% and at least three of the four appear. This replaces the sentence
**count** ratios, which the corpus satisfies while being a metronome (§1.7).
*Fails today* on the Maple corpus's shape distribution. **This is the assertion
I am least sure of and the one the skeptic should attack hardest** — a shape
classifier is a heuristic, and my first attempt at one (the lexical
non-sequitur test, retracted in §1) was worthless. If it cannot be made to hold
without hand-tuning against this corpus, it should not ship, and A/C/D carry the
gate alone.

**F · THE ARC IS NO LONGER THE SAME EVERY TIME.** Twenty matches on one world.
Assert the sequence of `known` rungs is monotone in every run (the old guarantee,
kept) **and** that the sequence of trigger kinds differs between runs — at least
eight distinct spines/orderings across twenty. *Fails today by construction:*
`0 0 0 1 1 1 2 2 2 3 3 3 3 3` in every run of every world, which
`NEWSROOM-BRIEF.md` records as a PASS.

**G · THE TOWN NEVER GOES QUIET ABOUT ITSELF.** At `known: 3`, at least 25% of
cards are `TOWN` / `INTERRUPT` / `SPINE`. *Fails today:* the one-way phase gate
makes tier 0 and tier 1 unreachable after the arc reaches 3.

**H · THE REACTION IS NOT A CONSUMABLE.** Run two matches back to back on a save
with every sticker already found, and assert each match produces at least three
cards caused by something the player ate. *Fails today:* the ceiling is two, and
one of them needs r ≥ 5.86 at t ≈ 132 s (§1.1). **This is the assertion that
maps onto the owner's actual words and it is the one I would build first.**

**Three traps this probe must not walk into**, all of them already paid for by
this repo:

- **The clock.** Sample on `__matchState().t`, never wall time — the match clock
  runs 14–40× slower under swiftshader. §1.3's 400-match numbers are from an
  offline simulator precisely because a live 180-second match is 40 minutes.
- **The snapshot.** Parse `newsroom_react.ts`'s real source for section B and
  **throw** if the pool shape has moved. Do not carry a copy of the pool names.
- **The green suite.** All four worlds passed `qa/newsarc.mjs` while the
  landmark-dropped-by-an-evolve bug was live. A green run is evidence, not proof.

---

## 7. WHAT I DID NOT DO, AND WHAT NEEDS AN OWNER

- **I did not touch tracked source.** Nothing here is landed. Sections 3.1–3.3
  are one-line and small-refactor changes for the governor.
- **I did not rewrite the other four worlds.** Section 5 says why, and lists
  the four things in them that should be fixed regardless.
- **The sticker/landmark split (3.3) is an owner call.** Making found stickers
  place again changes what a completed world looks like. My recommendation is
  the other branch: hang the NAMED reaction on the world's authored landmarks,
  which needs 3.1 and touches the scrapbook not at all.
- **`newsGap` has a stale comment.** `prototype3d.ts:9533` reads *"Now 30-42s"*;
  `COPY.newsGap` is `[16, 8]` → 16–24 s, × `(1 - 0.5·tension)` → 8–12 s at full
  tension. Measured card count per 180 s match: **14.8**. The number in the
  comment is from before the halving and every later reader will believe it.
  Governor rule 3.
- **I have not seen these lines on a phone.** Every length figure here is a
  character count at worst-case token fill against the shipped 78-character cap.
  That cap is the file's own and it is well established, but the last word on a
  ticker belongs to a rendered card, and nobody has shot one of these.

---

## 8. THE ONE-PARAGRAPH VERSION, FOR THE OWNER

The news is not reacting to what you eat because the part that reacts is a
collectible: it fires the first time you find each of Maple's twelve hidden
things and then never again, and your save has found them all. What is left is a
timeline, and the timeline runs the same shape every single match by design —
morning, doubt, alarm, panic, in that order, in all five worlds, every time. The
paper also only knows twelve words for what you ate, and most of them are sizes
rather than things, so it prints "It ate a snack" when you have just eaten the
diner — and the game
knew it was the diner and threw the word away at the moment it built the town.
The proposal keeps one thing that must never move — the town cannot un-print
what it has printed — and lets everything else go: which story leads is rolled
per card, a running local story is dealt at the start of every match and never
repeats between them, one card a match is a correction or a lost glove for no
reason at all, and the town keeps having its own news right through to the last
thirty seconds, which is when a paper still arguing about a parking meter is
finally funny.
