# VERDICT: SOUND WITH CORRECTIONS — purpose (Stream A2), 2026-09-04

Owner, brief §2A: "Every chat bubble, every person moving, there's got to be a purpose behind
that." And the brief's own steer: "Forty people with errands reads alive; forty people
drifting reads like a screensaver — and it is the same forty people either way. The cheapest
version of this is not more people, it is destinations."

Method: instrument first, then a design panel, then the governor. `qa/purpose.mjs` samples
every mover's position on the page's own frames for 30 match-seconds at SEED=7 and reports
how far each person travels against how far they walk, how much they turn, and how many of
them complete a **journey** — leave a place by 15 units, settle within 3, hold for 1.5
seconds. It draws every trail on a top-down plan, so "screensaver" is a picture rather than
an adjective.

## Pre-registration (written before the design existed)

Bars, in a 30-second SEED=7 sample, on every world:
- **at least a third of moving people complete a journey** (before: 7–23%)
- **median drift ≥ 0.30** (before: 0.085–0.238)
- flee, the panic contagion, Lantern's three acts and `calm()` unchanged
- no new draw calls, no new per-person materials, no build-time seeded draw
  (Maple's placement must come out bit-identical)

## What the instrument found

| world | people | moving | drift median | 6u of home | turning | journeys | travellers |
|---|---|---|---|---|---|---|---|
| maple | 312 | 305 | **0.094** | 16% | 104.7°/s | 63 | 50 (**16%**) |
| pirate | 297 | 296 | **0.085** | 19% | 103.9°/s | 90 | 68 (**23%**) |
| gameday | 501 | 497 | **0.233** | 53% | 92.8°/s | 62 | 47 (**10%**) |
| lantern | 971 | 971 | **0.238** | 84% | 91.9°/s | 66 | 66 (**7%**) |
| powder | 386 | 386 | **0.173** | 55% | 95.1°/s | 35 | 32 (**8%**) |

A drift of 0.09 means a person walks 11 units for every 1 unit of progress. The turning
figure is a person changing heading a full circle every 3.5 seconds, forever. The pictures
(`shots/purpose/*_paths_before.png`) are 300–970 small scribbles, each tied to the white
cross where that person was born.

## The design, and how it was chosen

Five independent designs — authored destinations, props-as-destinations, roles-with-a-day,
a street network, and the smallest change that moves the number — each judged by three
different lenses (a child's eye at the play camera, the engine at 966 movers, and an author
asked what happens on the world nobody hand-tuned). Then a synthesis, then a skeptic.

**The spine is the smallest design: a destination is a POINT, not a prop.** The code settled
it: `island.ts:6820` gates every Maple house on `PLAN[gy][gx] !== 'cozy'`, and there are
exactly five such blocks — so the "70 destinations" the first instrument counted are all
houses in one three-block corner, and nothing anywhere in `src/` ever tags a prop as a stall,
a bench or a table (`qa/_qkcensus.mjs`: Maple carries `house 70, car 67, roadworks 20,
bridge 8, goat 1` and 5,729 props with no tag at all; Pirate Bay tags nothing but 7 cars).
Every prop-based design would have paid a tagging bill it costed at zero, or routed two
hundred people to one corner of town.

**The skeptic then killed three fatal defects in the synthesis's own patch**, each verified
against the source before it was fixed:
1. **Arrival never scheduled the next leg.** The spawn goal is the spawn point, so the first
   frame arrives, dwells, and arrives again — a town of statues, worse than shipping.
   Now arrival dwells *and* aims.
2. **A stored pose mode of 0 falls into the dance branch** (`life.ts:2807`, `} else if (dnc
   && hop <= 0)`), which two existing call sites rely on by omitting a mode. Every
   errand-runner on five worlds would have become a dancer.
3. **A pose set on arrival is never cleared when the void interrupts the dwell**, and mode 3
   pins both legs at rotation 0 — a person sprinting from the void with frozen legs, the
   exact "sliding brick" the code's own comment was written to kill. The dwelling pose is now
   applied by state inside the walk branch, so it ends on the frame the void starts to matter.

Also corrected from the skeptic: the opt-in was placed on `townie`, which has 24 other
callers (route followers at tether 400, the marching band, the gossip pairs) — moved to the
grid call so nothing is opted in by accident; the errand no longer discards an authored
tether; Pirate's district fill was never opted in at all; and the staggered first stop reuses
`greetCd`, already drawn, so **no new build-time draw exists** and the seeded town is
untouched.

## The patch

`src/proto3d/life.ts` only, ~140 lines. `addWanderer` takes an optional `leg` and `paceMul`;
omit them and a call site keeps today's random walk byte for byte. A person with a leg picks
a goal with heading persistence, walks it, dwells 2.5–6 seconds with their hands busy, and
picks the next. The leg search fans five candidates, shortening as it goes, and **walks the
leg at thirds before committing** — an endpoint test alone accepts a leg from one headland to
the next and then walks it through the bay. A failed search stands still and tries again; it
never falls back to "walk home", because a home-and-back ping-pong scores a drift of zero by
construction (measured: it did, 0.174 on Pirate). The slide fallback flags the leg unwalkable
and the next retarget turns 90°. The heading self-heals every 12 frames from whatever wrote
it — flee, contagion, the guest branch, the slide — rather than trusting five call sites to
set a flag. And a person standing still no longer buys three point-in-polygon tests a frame
to displace itself by zero.

Per world: Maple's grid 32 units, Pirate 22–24, Powder 24 at 1.15× pace, Game Day 22 at
1.25×, Lantern 20 at 1.3× (a market is a line, not a field). Every pace stays below the
contagion's 2.4× and the flee's 3.4×, so the void outranks the errand by speed as well as by
branch order.

## What it did

Paired runs, same instrument, same seed, same 30-second window; the before pass on bec3758
(verified to contain neither the constant block nor `retarget`):

| world | travellers | drift median | turning | journeys |
|---|---|---|---|---|
| maple | 16% → **51%** | 0.094 → **0.504** | 104.7 → **8.2°/s** | 63 → **349** |
| pirate | 23% → **50%** | 0.085 → **0.617** | 103.9 → **9.8°/s** | 90 → **389** |
| gameday | 10% → **53%** | 0.233 → **0.954** | 92.8 → **2.2°/s** | 62 → **316** |
| lantern | 7% → **64%** | 0.238 → **0.995** | 91.9 → **1.1°/s** | 66 → **629** |
| powder | 8% → **94%** | 0.173 → **0.984** | 95.1 → **1.7°/s** | 35 → **450** |

Every world clears both pre-registered bars. The pictures
(`shots/purpose/sheets/*_before_after.png`) show what the numbers mean: Maple's scribbles
become long strokes that cross the town and chain at the corners; Lantern's market becomes
short strokes running in every direction down the stall rows; Powder's valley fills with
lines between the lodge, the lift and the hill.

**Determinism, checked rather than asserted:** `SEED=7 node qa/placement.mjs maple` after the
change reads inside 3, overlap 116 — identical to the row Stream A recorded for this build
(`placement.proposal.md`, maple after). No draw was added; the town is the same town.

## Corrections to my own work, recorded

- **The first metric was wrong and is retracted.** It counted "arrivals" as proximity plus
  dwell near a tagged prop, and read 254 on Lantern Night — where 84% of people never left
  their birthplace and the market is simply dense with stalls. Journeys replaced it: leave,
  settle, hold, no tagging required.
- **The first paired run compared the same code to itself.** I checked out b0e75a6 as the
  "before" build; it already contained the errand. The table above is a re-run against
  bec3758, verified errand-free before it was built.
- **The drift and turn medians are read off the people the void never came near** (more than
  45 units, past the flee radius, the contagion ring and the panic wave). A hunted person's
  path is a panic curve and is not evidence about their errand — on Pirate Bay, where 22% of
  the crowd is hunted inside 30 seconds, the whole-crowd median read 0.21 while the same
  build read 0.617 among the people left alone. Journeys and the traveller share still count
  the entire crowd: being chased does not stop you having somewhere to be.
- **A design claim I could not confirm.** Three of the five designs reported that Lantern's
  stallholders stand behind stalls that do not exist, because `island.ts:1757`,
  `island.ts:5616` and `life.ts:3897` all re-derive `LN.stallSlots` from a stream that has
  moved on. The pitch mismatch is real (1757 uses the default 210/26; the other two use
  230/30), but the consequence is not: `qa/_stallfit.mjs` says **63 of Lantern's 66 stalls
  have a person within 3 units, median 2.11 units.** It is a ~2-unit jitter offset between
  the stallholders and their counters, and the ground's warm light pools are on a different
  grid again. Worth fixing; not the thing that was claimed.

## What is deliberately not in this

- **Destinations snapped to Maple's 70 doorsteps.** `settleFootprints()` already computes a
  validated stand point with a facing for every house and throws it away. It covers five of
  Maple's thirty-six blocks, so it is a garnish, not a spine — and it is the obvious next
  commit.
- **Game Day's gate current and Powder's uphill file.** One optional bias per retarget would
  drain the car park toward the stadium as the tension rises and put sledders in a file
  against the lift. Cheap, and it is world identity rather than motion.
- **Chat bubbles indexed by the errand.** Half the owner's sentence is still untouched: the
  crowd says pool lines about nothing while walking somewhere specific. With a *point* as the
  destination there is nothing for a line to be about; this earns its place behind the
  doorstep snap, when a person can stop at something with a name.
- **Obstacle avoidance.** A walker who passes under a roof and comes out the other side reads
  as "went in and came out" to a six-year-old at a top-down camera. A real version needs ~12
  samples per leg; three would buy the appearance of a fix.

## The gate

`node qa/gate.mjs --profile=push --port=4177` on a quiet box, 05:33-06:40 UTC:
**PASS, 18/18, every step reached its own conclusion** (log in
`purpose-data/gate-purpose.log`). The 18th is the new `purpose` step — all five worlds, 1614
seconds, the same bars this proposal pre-registered. main fast-forwarded to this commit.

## What I could not verify

- **Frame cost on a real device.** The design removes work (a standing person's three
  point-in-polygon tests, and a straight leg's per-frame heading write) and adds a retarget
  roughly every ten seconds per person — about 1.6 per frame across Lantern's 966 movers. I
  have arithmetic and a software renderer, not an iPhone.
- **How it reads in motion.** Every picture here is a path plot or a still. The owner's phone
  is the judge of whether a town of people walking somewhere feels alive.
