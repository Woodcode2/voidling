# VERDICT: SOUND WITH FIVE RECORDED CORRECTIONS — the newsroom, 2026-09-04

Owner: *"the news is so bad. The style. The two sentences."* And later, plainly: **sloppy,
and not fun.**

Two instruments already existed and neither could answer him. `qa/newsstyle.mjs` reads the
POOLS — the shape of the corpus, the punctuation ladder, the token vocabulary, the 78-character
ticker. `qa/newsarc.mjs` reads the BEATS — that morning never mentions the void, that the four
phases escalate and never reverse, that a landmark gets named when it goes. Both are checks on
what the newsroom *could* say. A child reads a **sequence**: whatever the picker, the
anti-repeat memory and the tier weighting actually put on the ticker, one card after the next.

## The third instrument: `qa/newsfeed.mjs`

It plays a real match, walks the void up through the arc with `__setVoidR`, pulls cards with
`__news()`, and records what the ticker *says* — brand, headline, the rung it was pulled at —
in order, to `qa/out/newsfeed/<world>.txt`. It applies three bars a sequence can fail that a
pool cannot:

- **repeats** — the same headline twice inside one match (the anti-repeat memory is per-pool,
  so two pools can still collide)
- **openers** — how many cards in a row start with the same word
- **tokens** — an unresolved `{M}`/`{D}`/`{P}`/`{S}` reaching a six-year-old as braces

Everything else about whether it is FUNNY is for a reader, and the file it writes is what that
reader reads.

## What the instrument found

Recorded before anything was written, SEED=7, `--cards=20`, every world
(`newsroom-data/*.txt`, committed at 4e5ed44):

| world | cards | distinct | repeats | longest opener run | pools ever reached |
|---|---|---|---|---|---|
| maple | 20 | 20 | 0 | 2 | — |
| pirate | 20 | 20 | 0 | 2 | — |
| gameday | 20 | 20 | 0 | 3 | — |
| **lantern** | 20 | **19** | **1** | 2 | **3** |
| **powder** | 20 | 20 | 0 | 2 | **3** |

Lantern repeated itself inside one twenty-card match. And on both thin worlds only THREE pools
ever reached air — `MORNING`, `GENERAL` and `BY_DIST`, plus the guaranteed sign-on — because
only three existed.

The census says why (`newsroom-data/corpus-census-after.txt`, method stated there and run over
both snapshots by `qa/_newscensus.mjs`):

```
#  world     lines   with "?"     %    per-meal   LIVE
#  maple      558       32     5.7    yes        yes
#  pirate     487       26     5.3    yes        yes
#  gameday    492       13     2.6    yes        yes
#  lantern    237        6     2.5    NONE       NONE      <-- 
#  powder     229        4     1.7    NONE       NONE      <-- 
```

**Lantern Night and Powder Pass were the only two worlds in the game with no per-meal pool and
no LIVE pool at all.** Both files' headers described that absence as the design:

> This world has no LIVE pool and no per-meal pools, so the token lines at the foot of each
> `T*_GENERAL` are the ONLY route live state has to the ticker here — keep them.

It was not the design. It was the gap, and the child heard it as a paper that never mentions
what just went down the hole.

## The work

A crew wrote ten pools — `MEAL_HOUSE`, `MEAL_CAR`, `MEAL_BIG`, `MEAL_SMALL`, `LIVE`, three
tiers each, both worlds — metered against the real `newsstyle` rules as they were written
({F}=14, {M}=22, the ladder, the 78-character worst-case fill), then cut down: 208 of 480
submitted lines survived. A voice judge then read both corpora end to end against the shipped
files, with one question: **does this sound like that town, or like Maple Falls in a fox mask?**

> **LANTERN NIGHT — YES.** This is the market, not Maple Falls in a fox mask. The proof is that
> tier 0 never once concedes damage, across thirty-odd lines, and it doesn't have to strain to
> avoid it: every loss is re-filed as hospitality. […] Maple denies. Pirate covers. This neither
> denies nor covers; it thanks.

> **POWDER — YES, and tier 1 is the best writing in the batch.** *"The sled hut, the tourist
> office and a chalet are now one closure."* That is the entire world in eleven words: three
> institutions collapsing into a single line item, delivered by somebody who cares about the
> line item.

He also condemned seventeen lines by name — seven that belong to a different paper, five
weakest, and five more inside his read of the arc — and wrote the replacement for each.

**The pickers now read the new pools.** `pickLanternNews` and `pickPowderNews` never consulted
`ctx.lastMeal`; they weight ~34% district / ~22% what it just ate / ~28% live / ~16% general
when the district is known, which is the split `newsroom.ts:936` has always run on. Three
mechanical changes came with that:

1. **`usable()` now filters every pool, not just GENERAL.** The `{S}` gate was correct while
   GENERAL held the only templated lines. The moment these pools landed, a countdown headline
   could have aired with two and a half minutes on the clock. (Flagged by the skeptic before
   it was written, not after it shipped.)
2. **The picker takes the first pool in its weighted order with something UNSAID in it.** The
   old code chose a pool and *then* looked for a fresh line inside it, so one small exhausted
   pool went straight back to a repeat while three full pools sat beside it.
3. **`recent` goes from 6 to 14.** Six was shallower than a match is long — which is how the
   feed probe caught Lantern repeating itself inside one 26-card run. The pools were too small
   to hold a deeper memory before. They are not now.

## After, on the same instrument

Same probe, same seed, same `--cards=20`, so the two halves of this comparison are the same
measurement (`newsroom-data/after/`, and `node qa/_whichpool.mjs` for the attribution):

| world | | cards | distinct | repeats | opener run | pools reached | from the new pools |
|---|---|---|---|---|---|---|---|
| lantern | before | 20 | 19 | **1** | 2 | 3 | 0 |
| lantern | **after** | 20 | **20** | **0** | 2 | **6** | LIVE 4, MEAL 3 — **7 of 20** |
| powder | before | 20 | 20 | 0 | 2 | 3 | 0 |
| powder | **after** | 20 | **20** | 0 | 2 | **6** | LIVE 5, MEAL 3 — **8 of 20** |

More than a third of what a child now hears on either world comes from copy that did not exist
a day ago, and Lantern no longer repeats itself inside one match.

Corpus: lantern **237 → 355** lines (questions 2.5% → 5.1%), powder **229 → 337** (1.7% →
5.0%). `qa/newsstyle.mjs` clean across five worlds and the reactive pools: two-sentence share
under the 45% ceiling everywhere, single sentences over the 35% floor, every pool carrying real
questions, nothing over 78 characters at worst-case fill, `{S}` never outside the final beat.

## The step failed its own gate, on a world this stream never touched

The first authoritative push gate came back **FAIL, 1/20 — `newsfeed`**, and not on either
world the stream had rewritten. Game Day, SEED=7:

```
The rulebook is open at the tailgate and there is nothing in it.
The dog in the gold bandana has left for the tree line. Wise dog.
The band was moved off the tailgate and has not missed a beat.
The smoker got out on a trailer, still smoking, still being explained.
```

Four cards, one after another, all opening "The". Every line is good. The **sequence** is a
metronome — which is the owner's complaint about "the style" stated as a property of the feed
rather than of any line, and it is precisely what neither existing probe could see, because
both read pools. No picker in this game had ever looked at the previous card's first word.

The bar was pre-registered before Game Day was measured, so the bar stood and the game changed.
**Every picker now prefers a line that does not open on the word the last two cards opened
on** — Maple, Pirate and Game Day inside `stale()`, beside the checks for a repeated template
and a repeated finished line; Lantern and Powder as a filter on the chosen pool. It is a
preference, not a rule: the first three re-roll 24 times and then take what they have, and the
two thin worlds fall back to the unfiltered pool if every candidate drones. A small pool can
still repeat an opener. It cannot drone.

Wiring it into the tiered pick alone was not enough: Lantern still opened three cards running
on "The", and all three were MORNING lines. **Phase 0 is the pool a child meets first in every
single match**, so it is the last place a metronome belongs; `drawPlain()` and both thin worlds'
morning branches now apply the same preference.

| longest run of the same opening word, SEED=7, 26 cards | maple | pirate | gameday | lantern | powder |
|---|---|---|---|---|---|
| before | 2 | 1 | **4 — FAIL** | 3 | 3 |
| after | 2 | 2 | **2** | **2** | **2** |

Lantern and Powder also gained an `air()` funnel on the way out. Four separate exits each
clipped and returned on their own, which is exactly how a memory of what has just been said
ends up never seeing the sign-on or the morning pool.

## Corrections, all mine, all recorded

1. **My apply script dropped seven of the judge's seventeen rulings, and told me it hadn't.**
   It printed `kept 208, cut 8, fixed 6` and I read that as the verdict applied. Checking each
   ruling against the shipped source instead of trusting the summary: **five of the six "fixes"
   were implemented as plain deletions** — the condemned line went, the replacement written in
   the same paragraph was never inserted — and **two rulings were never transcribed at all**,
   because they sit in the prose of *THE ARC READ END TO END* rather than in the two list
   sections I read off. A fix that only deletes still increments a fix counter, which is exactly
   why that summary line was worthless as evidence. All seventeen are now verified one by one,
   present or absent, against the source.
2. **`qa/newsstyle.mjs` had never heard of Powder Pass.** The file shipped with four worlds
   while the game shipped five, so the newest newsroom was the one nobody metered — including
   its pool in `newsroom_react.ts`. Adding it found **seven shipped Powder lines running 79–95
   characters** at worst-case token fill against a 78-character ticker. They do not print
   wrong; they print SHORT, because `reactLine()` clips the finished string — so the word each
   joke ends on is the word that goes. All seven rewritten inside the budget. One of them is
   the line the judge called *"the best Powder line in the codebase"*: it could never have
   printed in full.
3. **`qa/newsarc.mjs` could not launch a browser in this container.** It called
   `chromium.launch()` with no `executablePath` and no `--no-sandbox`, so it threw *"please run
   npx playwright install"* instead of running. Every other probe in `qa/` launches at
   `/opt/pw-browsers/chromium`; this one is a live-profile step and had not been asked to launch
   here since. Fixed, and both changed worlds now PASS it on a real match.
4. **The first census undercounted the two biggest worlds.** It walked a list of pool NAMES,
   and Maple Falls and Game Day keep their district pools in separate consts that `BY_DIST` only
   references. `qa/_newscensus.mjs` replaces it with one method that does not care how a pool is
   assembled, and it is run over both snapshots so the before and after numbers are the same
   measurement. The gap it was opened on holds under either count.
5. **I nearly published a paired comparison whose two halves used different card counts.** The
   before feeds were recorded at `--cards=20`; my first after run took the probe's default of
   26 and I read the difference — 20 cards against 26 — as the ticker STALLING on six draws
   before the change. It was not. It was two different runs of two different lengths, which is
   the same defect as the purpose stream's "compared the same code to itself", caught this time
   before it reached a document rather than after. The after feeds in the table above are
   re-run at `--cards=20`, matching the before exactly.
6. **The first gate run of this stream was abandoned deliberately, not lost.** It was started
   against a build that predated corrections 1 and 2; a green result on it would have described
   a state that no longer existed. Stopped at `smoke:maple`, and one authoritative run made
   after every piece of copy was final.

## Gate

Two runs, and the first one earned its keep:

- **run 1 — FAIL, 1/20 on `newsfeed`**, Game Day's four-card drone (above). Nineteen steps
  green, including `purpose` at 1633s and `splash` at 722s.
- **run 2 — PASS, 20/20**, after the drone guard landed in all five newsrooms. 3,639s on a
  quiet box: purpose 1639s, splash 702s, faceparity 440s, smoke:maple 279s, **newsfeed 284s**,
  econ 201s, uisystem 25s, and eleven steps at or under a second.

Two new steps in the words tier: `newsfeed` (the aired sequence, SEED pinned so a failure is reproducible rather than a
story about a seed), and `newsstyle` **promoted from the live profile to push** — it is a
one-second static read of five source files with no browser and no port, and the run that added
Powder to it immediately found seven real defects. A check that cheap, catching that, has no
business waiting for the live profile.

## What the judge says is still missing, and is now in

**Lantern Night: the crowd.** *"Two hundred lines and the market is staffed but not attended.
[…] A night market is a place full of people having a nice evening, and that is where a
six-year-old puts themselves."* Eight lines across the three tiers: the family finishing their
skewers on the stone stair, the queue at Eleven Bowls holding at four, the child in the new fox
mask asking to see the purple one again, and at the end a crowd that is singing.

**Powder Pass: the clock.** *"This desk measures the world in bulletins […] Not one of the new
lines compares this bulletin to the last one."* Seven lines running the hourly list as it
shrinks — four items at nine, shorter at eleven, one item at noon read out twice — and the
caller comes back with them, because a phone-in is how this world gets a child's voice on the
radio.

## Still owed

- `newsroom_react.ts` carries a Powder pool of 22 lines against 27 for every other world, and
  its `pool.length < 20` floor is the only bar it has to clear. Powder should carry 27.
- The per-district pools (767 lines) are still outside `newsstyle`'s scope. They measured
  healthiest of the bunch when sampled, which is a reason to defer them, not a reason to leave
  them unmetered forever.
- `qa/newsfeed.mjs` drives the arc with `__setVoidR` rather than by playing, so the MORNING
  share of an aired feed (8 of 26 here) is higher than a real match's. The three bars it
  applies do not depend on that; a pool-mix claim would.
