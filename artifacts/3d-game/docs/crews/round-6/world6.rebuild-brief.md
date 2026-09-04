# SKYLARK FIELD — THE REBUILD BRIEF

*Fable, directing. This is the brief I am building against and the standard the
rebuild is held to. Every number in it was measured in this tree; where a number
is a target rather than a measurement it says so. Numbers do the work here, not
adjectives.*

---

## 0. THE VERDICT AND THE DIAGNOSIS

The owner played it and said:

> "Nowhere near full or eventful. It feels so dull. The idea is good. We want air
> balloons. Think like that Turkish festival of balloons."

The diagnosis, in one line:

> **The level shipped its noun without its verb.** It has balloons. Not one of
> them ever goes up.

The world's own tagline, on its picker card and in `WORLD_COPY`, is *"get them
before they go up."* Six balloon factories exist — bagged, spilled, cold,
standing, whale lying, whale standing — and all six are ground states. The 148-
second beat puts a title card on screen reading **"THE WHALE IS GOING UP!!"**,
the newsroom reads *"G-WAIL has been cleared to launch. The whole field is going
up with her,"* and nothing happens. The whale lies there. `skWhaleStanding` is
never called.

MAPLE FALLS — a sleepy autumn town — has one hot-air balloon drifting in its sky,
animated every frame. SKYLARK FIELD, the balloon festival, has zero.

The shipped play frame (`qa/out/shippedlook/skylark_look.png`, 430×932): the
void on a flat saturated lawn, one person, four grass tufts, a flower clump,
the corner of a blue box. No balloon, no runway, no tower, no sky. **43.7% of
the pixels are one green.** Two soft shadows in the lower half are cast by
something out of frame — the closest the frame comes to showing a balloon.

The design document (`world6.design.md`) said, before a line was written, *"That
one rule is the whole level, a six-year-old works it out in ten seconds."* The
judge on that design said *"write the probe before the mechanic."* The mechanic
was never built. The rest of this brief is the consequence of that, plus the
three other instructions from the same page that were not carried out.

---

## 1. WHAT IS ACTUALLY THERE — MEASURED

| Fact | Number | Where |
|---|---|---|
| Balloons ever airborne | **0** | `skyfield.ts:134–252`, all six factories are ground states |
| Balloons airborne on MAPLE FALLS | **1**, circling at altitude 42 | `island.ts:3737–3741`, `spawnBalloon` at `:8037` |
| Island unplaceable to props | **59.0%** — runways 35.8%, perimeter 15.3%, circle 7.9% | `skylark.ts:226–232`, grid-sampled |
| Next-worst world's unplaceable fraction | 15.9% (Pirate). Skylark rejects **3.7×** more | same sweep across all five polygon worlds |
| Placeable ground, absolute | **19.60M** world² — half of Lantern's 38.28M, the next smallest | same |
| Placeable ground, in one piece? | **17 disconnected pieces**, largest 35.6%. Lantern 1, Powder 1 | 4-connected components on a 20u grid |
| Median distance, usable point → concrete | **160** world units (8 in 3D — under half a maxed void's radius). Others 360–840 | distance transform |
| Share of usable ground that is THE ROUGH (density 0.35, lowest in the game) | **52.6%** | region shares |
| District density figures | **dead code** — `.density` is read nowhere; every count is a hand-typed literal | `grep -rn '\.density' src/ qa/` → 0 |
| The spawn's district | **THE ROUGH**, 408 units outside the ARRIVALS polygon three comments say it is in | `skylark.ts:199` vs `:151–152` |
| First playable frame | **71.3% grass and tarmac** (rough 44.0, runway 27.3), launch field 28.7, arrivals 0.0, **sky 0.0** | camera raster, fov 32, pitch 46.4° |
| The whale at t = 3.4s (controls live) | **66.6° off the optical centreline**; half-FOV is 29.8°. Out of frame | `prototype3d.ts:677`, `:9885` |
| The poster frame (intro shot) | 35.7% empty space, **8.6% district** | same raster at camDist 300 |
| Edibles | 3,504 total — 2,733 small, 679 mid, 92 big (Maple: 5,790) | `qa/_edcount.mjs` |
| People | 358, six districts, **0 cast in a Role, 0 carrying a hand prop** | `life.ts:4236–4243` |
| Roles that exist in the engine | ~30, with uniform silhouettes; Maple, Pirate and Game Day cast by role | `life.ts:1234–1262` |
| Hand-prop kinds that exist | 16: ball, bat, board, clipboard, coffeepot, detector, horn, juice, leaflets, leash, pie, placard, pompom, rod, tape, tray | `life.ts:780–900` |
| Beats | 4 (design demanded 6); beat 1 is the only opener in the game that changes nothing on screen | `prototype3d.ts:3958` |
| Beat cues that reach the world | `parade`, `goat`, `bandfield` only — a hand-typed whitelist. `sheep`, `whale` never fire | `prototype3d.ts:8914` |
| …and Powder's `avalanche` | **never fires either.** "The mountain is coming to you" — it has never come. 22 snowballs never created | same line; `life.ts:4179` handler unreachable |
| `qa/beattruth.mjs` (new, gate) | **FAILED** on `avalanche` before the dispatch fix; **PASSES** after, with `sheep`, `whale`, `contest` frozen as named debt | commit `c17dc56` |
| Renderer | shadow maps ON (PCF, half-rate); EffectComposer + UnrealBloom; per-world Fog(420–1500); sprites/points in use; contact-shadow discs | `prototype3d.ts:143–230`, `:158`, `island.ts:656` |
| Look-up pose | `limbs.head.rotation.x` already animated (0.3, −0.12) — looking up is a number, not a new pose | `life.ts:2855`, `:2901` |
| Sensitivity of the one land change | runway half 500→260 and perimeter 200→170: placeable **41.0% → 55.9%** (+36% usable). Two runways + a 900 circle: **63.4%** (+55%) | sweep on the real coast |

Four instructions from the design's *"what must change before a line is
written"* list, and what shipped:

| Instruction | Shipped |
|---|---|
| Two of three runways become disused broken slab, recovering ~10 Mu² | All three at half-width 500. 59% paved — *worse* than the "half" it warned of |
| The ascension, as a third prop state, denominator decremented, probe first | Not built. `devouredPct = consumed / initialMass`; `initialMass` only ratchets up |
| Six beats; beat 1 becomes "the first balloon of the morning going up" | Four; beat 1 names what is already happening |
| The whale lies, stands, then leaves | Lies |

### The kit, measured

The prop-kit survey instantiated all 50 factories and compared them to the
other three kits in the game.

| Fact | Number | Where |
|---|---|---|
| Factories / parts per factory | **50 factories, 9.4 parts each** — the most names and the least matter (luxe 35.3, tailgate 23.8, alpine 20.6) | `skyfield.ts`, instrumented `part()` |
| **The balloon envelope** | **36 tapered boxes, zero round parts** — so `mergedProp` puts it on the FLAT-shaded material | `goreDome()`, `skyfield.ts:109–131` |
| Balloons standing, in the whole world | **29** of 150 envelopes; 121 lie flat | census at SEED=7 |
| Tallest object on the field | **9.48 u** (`skBalloonStanding`); nothing over 10 | height census |
| Gloss | **never registered** — 0.43% of vertices glossy, 0.00% strong (Powder 58.5%, Game Day 29.5%). Every steel frame, bottle, van and tower is dead matte | `registerGloss`: 0 calls |
| Glow | **1 placed glow prop**, 0.26 u across. `skPilotFlame` — the kit's only fire — is never placed. Breakfast Row, "the warmest-lit thing on the field" per its own header, is unlit | `PROP_GLOW_MAT` uses |
| Colours graded by `formsep` | **19%** — 64 of 79 hexes are inline literals the probe cannot see. Every envelope colour and the whale's cobalt are ungraded | `qa/formsep.mjs:132` |
| The control tower — the only landmark silhouette | **6 facet directions**, 100% axis-aligned: a stack of boxes. Median distinct facets: skyfield 22, alpine 78, luxe 152 | face-normal census |
| Props with r < 1 | **91%** — 2,782 of 3,051, from three grass factories totalling 20 parts. Game Day: 28% | census |
| Colour buckets in the shipped frame | **522**, 5th of 6 worlds; one green is 43.7% | 4-bit histogram |
| Triangles | **1.57M** vs Game Day's 4.06M — **2.5M of headroom** | scene traversal |
| Dead factories | `skWhaleStanding` (52 parts, the kit's biggest), `skBurnerFrame`, `skPilotFlame` — never placed | `grep -rn` |
| Special shapes the design promised | **1 of 5** (whale; no bee, teapot, tortoise, cottage). Also absent: the retrieve Land Rover, the met balloon, the lattice windsock | `world6.design.md:396` |
| Festival infrastructure | **none** — 0 tents, marquees, banners, bunting, barriers, gantries, stages, toilets. Tailgate has canopy, pennant string, banner, ticket gate, portaloo | `grep` |
| The wardrobe | **no skylark entry** in `OUTFIT` — all 461 people fall to `OUTFIT.cozy` (Maple's suburb): no hat, no wear list, no prop | `life.ts:893–1001` |
| Stage ratio | stated three different ways — 5:4:3:2, 4:4:3:3, and computed 2:4:3:5 | `skyfield.ts:47`, `island.ts:5766–5770` |

---

## 2. THE TARGET IMAGE

Cappadocia, Göreme valley, Turkey, an hour before sunrise to an hour after.

**Dark.** A hundred envelopes lie spilled across a plateau of pale rock, dozens
of trailers backed up to them, inflator fans roaring. Then the burners start —
and this is the first image — each envelope **lights from the inside**, a
lantern the size of a house, in red and blue and yellow, and for ten minutes the
valley is a field of glowing lanterns under a navy sky. Ground crew are
silhouettes against their own balloon.

**First light.** The first balloon lifts. It goes slowly, straight up, and
everyone near it stops and watches. Then a second. Then ten. Within twenty
minutes there are **a hundred and fifty balloons in the air** — not scattered,
**layered**: a low tier drifting at rooftop height with passengers waving down,
a middle tier at a few hundred metres, and a high tier that has become small
coloured dots against the dawn. The layering is the whole picture. It is why one
photograph reads as *hundreds*.

**Sunrise.** The sun comes over the ridge and hits the high balloons first, then
the middle, then the ground, so the sky is lit gold while the valley is still
blue. Each balloon throws a **long soft shadow that slides across the ground**.
Tourists on the ridges photograph everything. Chase vehicles set off along the
tracks below, following their balloon. Where one lands there is a small ceremony
— crew, a folded envelope, a toast.

**The night glow**, at the other end of the day: balloons tethered, dark, and on
a count every burner on the field fires together and a hundred lanterns light
at once.

The signatures a level has to hit, in order of how much a child notices them:

1. **Balloons in the sky**, many, in **altitude layers**.
2. **The lift** — a balloon leaving the ground is an *event*, and people turn to
   watch it.
3. **Burner glow** — a balloon lit from inside, and a pulse of flame.
4. **Shadows sliding across the ground.**
5. **People with jobs**, all of them busy, all of them different at a glance.
6. **Special shapes** — the whale is ours, and she must fly.
7. A dawn palette: pale gold sky, blue valley, saturated envelopes.

Albuquerque does the same at five hundred balloons, launching in waves, with a
special-shape rodeo. Bristol does it at a hundred with a nightglow. We are
building the Cappadocia one, because it is the one with the layered sky and the
sunrise, and because the owner named it.

---

## 3. THE REBUILD

Seven sections. They are in build order, and the order matters: the land first,
because everything else is placed on it; the ascension second, because it is
the level; the dressing after, because dressing an empty mechanic is what
happened last time.

### 3A. THE LAND — reclaim the concrete, move the child, aim the camera

**Reclaim the concrete.** Measured sensitivity says this one change does more
for the emptiness than any amount of scatter.

- Keep **ONE hero runway at full width** — 03/21, the one that points from
  arrivals at the whale. Half-width stays 500. Being wider than a maxed void was
  the right call and it stays.
- **09/27 and 15/33 become disused broken slab**: half-width **260** (Powder's
  piste figure), drawn as cracked concrete with grass through it, and — the
  point — **placeable**. `skPlaceable` stops excluding them. They keep their
  threshold numerals and edge lights as paint, because a derelict runway with
  its numbers still on it is better dressing than a clean one.
- **Perimeter track half-width 200 → 170**, the figure bay.ts and gameday.ts
  both settled on after 300 read as a plaza.
- Target: **placeable ≥ 56%** (measured: 55.9% at exactly these numbers), and
  the largest connected piece **≥ 60%** of it. `qa/airfield.mjs` gains a
  section G that measures both and fails under the target.

**Move the spawn into ARRIVALS.** `SK_SPAWN` resolves to THE ROUGH today. It
goes inside the arrivals polygon, on the wet grass among the trailers, and
`qa/airfield.mjs` section D gains the check it should always have had:
`skRegionAt(spawn) === 'arrivals'`.

**Aim the camera at the whale.** The camera bearing is fixed at 315°; the launch
circle is at 21.6° from spawn. Either the spawn moves so the whale sits within
±20° of the centreline down 03/21, or the arrivals row is re-laid on the far
side of the circle so the runway recedes toward her. The acceptance is a
measurement: **the whale inside the frame at the instant controls go live**.

**Give THE ROUGH a job.** Half the usable ground is a district at density 0.35.
It stops being a catch-all. It becomes three things: the **spectator bank**
along the perimeter fence (the crowd that watches — see 3D), the **landing
field** beyond 09/27 where balloons from the high tier come down late in the
match (see 3B), and the **rock stacks** on the north coast — four to six tall
eroded pinnacles, the fairy-chimney silhouette, each an edible landmark, giving
the poster frame something vertical on its horizon.

**Make the density figures real.** `.density` is read nowhere. Either the nine
figures drive the scatter counts (count = density × usable area × k) or they are
deleted. A number nobody reads is a lie waiting to be believed.

### 3B. THE SKY — the ascension, which is the level

This is the mechanic the design was built around and the build left out. It is
specified here at the level of code shapes, because it touches the score.

**The third prop state.** An edible today is `eaten` or not.
`devouredPct = consumed / initialMass` at `prototype3d.ts:4675`, and
`initialMass` only ratchets up (`:4674`). A departed balloon is a THIRD state:
`departed`. It is removed from the numerator AND the denominator — it decrements
`initialMass` — so the end card never credits the child with the sky, and 100%
stays reachable. Departed props leave the rivals' target list. **Write the probe
first**: `qa/ascension.mjs` drives a match, forces N departures, and asserts
`devouredPct` is unchanged by a departure and reaches 100 when everything left
is eaten.

**The telegraph, and the rule.** A balloon that is going to leave *says so for
long enough that a child can act*:

1. it inflates to STANDING (if it is not already),
2. its burner fires twice — two visible pulses, envelope lit from inside, ~1.5s
   apart,
3. its crew step back from the basket (four people, one leg each, outward),
4. **then** it lifts, straight up, slowly (~4 units/s for the first 10 units).

From the first burner pulse to leaving the ground is **8 seconds**. During those
8 seconds it is edible and worth **1.5×** — the rule *"get them before they go
up"* is the whole level and it has to pay. **One at a time, never a wave**
(minimum 6s between departures until the whale beat). **The last handful never
leave** — the eight lowest-numbered balloons are tethered for the match; there
is always something to eat.

**The flight, in three tiers.** This is what makes the sky read as *hundreds*.

| Tier | Altitude (3D units) | What it is | How it is drawn |
|---|---|---|---|
| **Lift** | 0 → 15 | just left the ground, still edible until 6 units, crew below looking up | the real standing-envelope mesh, translated; contact-shadow disc **decoupled and left on the ground** under it |
| **Low drift** | 15 → 45 | the Cappadocia rooftop tier; drifts downwind at ~1.5 u/s along the 030 heading, bobbing ±2 (Maple's loop, `island.ts:3739`) | the same mesh, LOD-swapped to a 3-part envelope at 25+; shadow disc slides with it, scaled by 1/altitude |
| **High** | 45 → 90 | the small coloured dots against the dawn | one merged mesh of low-poly envelopes per 8 balloons, or **billboard sprites** past 60 — the sprite path exists (`new THREE.Sprite`, 8 sites) |
| **Distant** | beyond the island | balloons that left before the match started — the valley's *other* launch sites | a static sprite sheet on the sky dome, 40–60 dots in three sizes, placed at build; costs nothing per frame |

Counts are targets to hold, measured by `qa/ascension.mjs` at fixed match times
(SEED=7):

| Match time | Airborne (lift+low+high) | Distant sprites |
|---|---|---|
| 0:00 | 0 — but **the whale is on-axis and 12 balloons are STANDING** in frame | 40 |
| 0:30 | 1 (FIRST UP — beat 1) | 40 |
| 1:00 | 12 | 40 |
| 1:30 | 30 | 40 |
| 2:28 | 55, and the whale STANDS | 40 |
| 2:40 | the whale lifts; 70+ | 40 |
| 3:00 | 90+, field nearly empty, sky full | 40 |

**Shadows.** Shadow maps are on. Airborne balloons in the Lift and Low tiers
cast; their contact-shadow discs are re-parented to the scene at y = 0.045,
track x/z, and scale by `max(0.4, 1 - alt/60)`. The shadow sliding over a
tourist group is the signature; it is a disc following a balloon, and it is
cheap.

**Burner glow.** The standing envelope's interior colour is an emissive term the
bloom pass already lifts (`UnrealBloomPass`, `prototype3d.ts:162`). A burner
pulse is: emissive 0 → 1.4 over 0.15s, hold 0.4s, decay 0.6s, with the
`skBurner()` one-shot from the score (already written, `audio3d.ts`) fired in
sync. Every balloon in Lift tier pulses every 5–9s. Beat 2 (below) fires every
burner on the field in sequence, 90 pulses over 12 seconds, tower-to-coast.

**The whale.** `skWhaleStanding` exists and is never called. She lies across the
launch circle to 2:28, **stands** on the beat (a 4-second swap with a burner
pulse and a crowd look-up), and **lifts at 2:40 on a visible 12-second
countdown the child can beat** — the newsroom counts it, the tower flashes it.
If the child reaches her she is the biggest meal in the game; if not, she goes,
everybody waves, and the field is still worth finishing because of the eight
that never leave.

**Wire the cues, and stop the whitelist.** `prototype3d.ts:8914` dispatches
`life.cue` for three named cues. It becomes: *any* beat with a `cue` fires
`life.cue(bt.cue, x, z)`, and a **new gate probe `qa/beattruth.mjs`** reads
every world's BEATS, and for each `cue` asserts a handler in `life.ts` tests
that name. It fails today on `sheep`, `whale`, `contest` and `avalanche`. This
fixes Powder's finale in the same commit, and Powder's finale gets re-measured
by `qa/finale.mjs` as part of acceptance.

### 3C. THE GROUND — density, and the launch field as a workplace

Targets, measured by `qa/_edcount.mjs` and `qa/placement.mjs` (which must stay
at zero offences — the bar a new world gets, and this world now passes it):

| | Today | Target |
|---|---|---|
| Edibles, total | 3,504 | **≥ 5,200** (Maple 5,790) |
| Big (r ≥ 6) | 92 | **≥ 130** |
| Big share | 2.63% | ≥ 2.5% (the Powder starvation bar) |
| Props per 100 usable u² | *(density survey pending)* | parity with Powder |
| Tussocks/grass as share of small | *(pending)* | **≤ 35%** — the rest has to be things a child notices |

Where it comes from, in order of yield:

1. **The reclaimed slab** — two disused runways are ~10 Mu² of new ground. They
   are dressed as a derelict apron: stacked pallets, tarps, coiled rope, parked
   chase vehicles in rows, hangar overspill, a broken-down light aircraft under
   a cover, oil drums, cones, a fuel bowser. Vehicles are `car`-tagged (the
   quest chip wants 6; supply is 72 and grows).
2. **Every balloon gets its kit.** Today a standing balloon has a basket and,
   sometimes, a fan. At Cappadocia each one has a trailer backed to it, a
   cylinder rack, a fan, a spread tarp, a rope bag, two crates and four people.
   The grid pitch stays at 250×238 (measured clean); the kit fills the pitch.
   That is ~90 × 6 mid-size props.
3. **The spectator bank** — a fence line along the perimeter with a crowd
   behind it, deck chairs, flasks, a hot-drinks trailer, a toilet block, bins,
   a line of parked cars two deep on the rough beyond.
4. **Breakfast Row doubles**: the bacon van, the tea urn, the doughnut trailer,
   a coffee horsebox, a crêpe stand, trestle tables with benches — and a queue
   (3D).
5. **The rock stacks** on the north coast — four to six, 9–14 units tall,
   `big`, the vertical landmark the poster frame is missing.
6. **The kit gets its matter back.** 9.4 parts per factory becomes **≥ 20**
   (alpine's figure) on every prop the camera reaches; the tower stops being a
   box stack (balcony, railings, glazing bars, a mast, an anemometer); the
   whale keeps her 52 parts and *is placed standing*. The 140-part house
   budget exists to be used.
7. **The five special shapes**, as promised: the whale, a bee, a teapot, a
   tortoise, a cottage with a chimney — each its own factory, each in a
   different stage, because from overhead they are the only non-circular
   discs on the field and they stop the launch field reading as a pattern.
8. **Festival infrastructure**: a marquee, four gazebos, bunting strung
   between every pair of flagpoles, a banner over the arrivals gate, crowd
   barriers along the perimeter fence, a PA on a gantry by the tower, a
   toilet block, the retrieve Land Rover (the sticker book already names
   her), the met balloon on its string, two lattice windsock masts that
   disagree.

### 3D. THE CAST — five hundred people, every one with a job

The engine already has what this needs: `Role` with uniform silhouettes
(`life.ts:1234`), `makeCast(role, dress)`, 16 hand-prop kinds, and an errand
loop (`leg`, dwell 2.5–6s, leash 3×). World 6 cast 358 people with none of it.
The rebuild casts **~500** and every one is in a role. New roles and new hand
kinds are listed; everything else is data.

The rule for a job: **readable at a glance from 46° up on a phone**. That means
a silhouette (hat, hi-vis, apron), a colour, a carried thing, and a loop that
goes somewhere. Standing still is not a job.

| Role | Count | District | Carries (kind) | Loop | Reads as |
|---|---|---|---|---|---|
| **Ground crew** | 180 (2 per balloon) | launchfield | **rope** (new: a coil over the shoulder) | basket ↔ peg ↔ fan; when their balloon telegraphs, both step back; one holds the rope taut as it lifts, then lets go and **looks up** | overalls, one of three crew colours matching their envelope |
| **Pilot** | 90 (1 per balloon) | launchfield | clipboard (exists) | stands in the basket; on the first burner pulse, raises an arm | leather jacket, cap |
| **Marshal** | 24 | perimeter, runway edges | **paddle** (new: an orange bat) | walks post to post along the track; at a departure, holds the paddle up | hi-vis vest, white cap |
| **Cleaner** | 14 | breakfast, arrivals, perimeter | **bubblewand** (new) + bucket | bin → bin → bin; at each bin, dwells and the wand **emits 6–10 sprite bubbles** that drift up and pop; children in the cast walk toward them | blue overalls, yellow gloves |
| **Tea lady** | 8 | breakfast → launchfield | coffeepot / tray (exist) | urn → a random basket → urn; the crew at that basket dwell while she is there | apron, headscarf |
| **Bacon van crew** | 6 | breakfast | tray (exists) | serve the queue, run a tray to the tower | white coat, paper hat |
| **Tourist guide** | 10 | arrivals → circle → breakfast | placard (exists) | leads a **conga of 5 tourists** on a fixed route past the whale; stops at the circle and points up | red jacket, raised placard |
| **Tourist** | 60 | everywhere public | **camera** (new: a small box at eye level) | follows a guide or wanders; at every departure within 40u, stops, **looks up**, and a white **flash sprite** fires | bright coats, sunhats, three body types |
| **Photographer** | 6 | perimeter bank, tower | **camera** + tripod | walks to a vantage, plants tripod, dwells, moves on | vest with pockets, long lens |
| **Ticket seller** | 4 | arrivals gate, ticket caravan | leaflets (exists) | caravan ↔ gate; hands leaflets to arriving tourists | booth cap |
| **Chase driver** | 20 | arrivals, slab | tape (exists — a measuring tape, the retrieve crew's real prop) | trailer ↔ vehicle; when their balloon lifts, walks to the vehicle and the vehicle pulls away toward the landing field | boiler suit, cap |
| **Shepherd** | 2 | runway 09 | **crook** (new) | walks at the sheep; the sheep move 6 units and stop; walks at them again. Never wins | tweed, flat cap, one dog on a leash (exists) |
| **Spectator** | 50 | perimeter bank | none, or juice (exists) | sits or stands at the fence; **looks up at every departure**; claps (arm swing) on FIRST UP and on the whale | anoraks, blankets |
| **Kid** | 20 | breakfast, bank | **balloon** (new: a party balloon on a string, one of the envelope colours) | runs between parents and cleaners' bubbles | existing kid body |
| **Mr Pym** | 1 | tower balcony | horn (exists — a megaphone) | stands, turns to face the newest departure | white shirt, tie, the only person who never moves |
| **Dog walker** | 6 | rough, bank | leash (exists) | the long way round | as today |

Four engine additions, all small:

- **Five new hand kinds** — `rope`, `paddle`, `bubblewand`, `camera`, `crook`,
  `balloon` — in the arm-pivot space `life.ts:785` already defines.
- **A look-up trigger**: `life.cue('lift', x, z)` on every departure; movers
  within 40u set `head.rotation.x` to the look-up angle for 2.5s and stop
  walking. Spectators also swing arms (the clap). Tourists fire a flash sprite.
- **Bubbles**: 6–10 sprites per cleaner dwell, rising 3 u/s with a sine wobble,
  popping at 4–6s. Sprites exist; this is a particle behaviour of ~30 lines.
- **A wardrobe**: `OUTFIT` gains an entry per skylark district — hats, hi-vis,
  aprons, anoraks, the wear list and the shoe list — so nobody on this field
  falls through to Maple's suburb.

Acceptance is measured: **≥ 90% of people cast in a role with a hand prop or a
uniform silhouette**, `qa/purpose.mjs` still passing (journeys ≥ 1/3, drift
≥ 0.30 — the errands *are* the journeys), and a new **`qa/jobs.mjs`** that
counts roles per district against this table.

### 3E. THE EVENT SCHEDULE — six beats and a live field

The design demanded six beats and the matchdeck deals two middles from a pool
of four. The schedule below is what a child watches. Every beat **changes the
screen** — the audit's standing rule.

| Time | Beat | On screen | Cue |
|---|---|---|---|
| 0:00 | *(spawn)* | dawn, still blue at ground level, gold at the top of the frame; burners pulsing in the standing balloons; the whale lying on-axis | — |
| **0:30** | **FIRST UP!** — *"one balloon, and everybody claps"* | the nearest standing balloon telegraphs, lifts; every person within 40u looks up; spectators clap; a shadow slides | `lift` |
| **1:06** | **BURNER TEST!** — *"everybody's eyebrows are fine"* | 90 burner pulses in sequence tower-to-coast over 12s, each with its one-shot; the field glows in a wave | `burners` |
| **1:50** | **THE SHEEP ARE ON THE RUNWAY!** | the shepherd and dog chase; the sheep move six units; a marshal holds a paddle up at nothing | `sheep` |
| **2:28** | **THE WHALE STANDS!** | 4-second stand with two burner pulses; the whole field looks up; departures accelerate to one every 3s | `whale.stand` |
| **2:40** | **THE WHALE IS GOING UP!!** — 12-second countdown | tower flashes; newsroom counts down; the child either reaches her or watches her go and everybody waves | `whale.lift` |
| pool (2 dealt) | **THE RETRIEVE** — chase vehicles leave in convoy · **TEA ROUND** — every crew stops for the tea lady · **THE PHOTO** — a guide lines a conga up under a departing balloon · **LANDING FIELD** — the first high-tier balloon comes down beyond 09 and becomes edible again | | `retrieve` `tea` `photo` `landing` |

Between beats, the field runs itself: a departure every 6s from 1:00, a burner
pulse somewhere every second, a cleaner's bubbles every dwell, a flash sprite at
every lift, a chase vehicle pulling away for every balloon that leaves. **Nothing
on this field waits for the child.**

### 3F. ART DIRECTION — the most beautiful level in the game

The rig is already keyed from the east — the only dawn in the game, and a real
whole-frame difference. It has to be *used*.

- **The sky is the frame.** Today the poster frame has zero sky in the playable
  view. The camera pitch stays at 46.4° (it is the game), so sky enters the
  frame as **the far edge of the island plus everything above it**: the high
  tier, the distant sprites, and a sky dome gradient that goes navy at the
  zenith → gold at the eastern horizon. `SKY_MOOD.skylark` gets a two-stop
  gradient instead of a tint.
- **Colour.** Envelopes stay at ≤ 3 colours each (the crown rule) but the field
  palette is Cappadocia's: saturated red, cobalt, canary, orange, violet against
  pale gold and blue-grey. Every red keeps its second channel ≥ 0.105 linear
  (`qa/albedo.mjs`, learned this round). Ground: dew-grey green with **mown
  stripes** painted down the launch field (`paint()`, cheap, huge), pale slab
  with cracks.
- **Light.** Sun 0xffc78e at 1.50 stays; **fog 420–1500 tightened to
  360–1200** and warmed two stops so the far island and the low tier sit in a
  gold haze while the near field is crisp — distance is what sells scale.
  Bloom threshold tuned so a burner reads as a flash and nothing else blooms.
- **Shadows.** Long. The sun elevation sits low (off `[78, 30, -46]`); a
  standing envelope throws a shadow twice its width across the grass and the
  airborne discs slide. Half-rate shadow update stays; it is enough.
- **Silhouette.** The rock stacks give the horizon verticals; the tower and the
  standing envelopes give the middle ground; the whale gives the centre. Form
  separation ΔE ≥ 6 on every colour (`qa/formsep.mjs`, skylark passes at 68/68).
- **Motion.** Nothing on a AAA field is still: fans spin (rotation.y), envelopes
  in Cold stage **breathe** (scale.y ±2% at 0.3 Hz), flags and the windsock
  stream, bubbles rise, shadows slide, balloons bob.
- **The envelope is round.** `goreDome()` builds a balloon out of 36 boxes and
  the engine shades it flat. It becomes a lathed gore surface — a real curved
  envelope with the gores as a colour band, not as geometry — so it lands on
  the smooth material, catches the dawn as a sphere does, and reads as fabric.
  This is the one object the owner asked for, and it has to be the best thing
  in the kit.
- **Gloss.** The kit registers a gloss palette like every other kit does:
  steel (burner frames, bottles, the tower's glazing bars) strong; painted
  metal (vans, the tractor, the caravans) medium; wicker, canvas and grass
  none. Target **≥ 40% of vertices glossy** (Game Day 29.5%, Powder 58.5%).
- **Glow.** A `lit()` helper as alpine declares one. Every burner is a
  `PROP_GLOW_MAT` mesh; the bacon van's hatch, the tea urn, the tower's
  windows and the doughnut trailer's sign glow warm; `skPilotFlame` is placed
  under every standing envelope. Target **≥ 120 placed glow meshes** (today:
  1).
- **Name every colour.** 64 of 79 hexes are inline literals `qa/formsep.mjs`
  cannot grade. Every hex in the kit becomes a named constant — the envelope
  liveries first — so "skylark passes at 68/68" means 79/79.
- **The renderer's rules stay**: merged props, vertex colours, no textures in
  the kit, 14×10 spheres for anything the camera gets close to (the whale's
  eye, `qa/roundlod.mjs`), one edible one radius.

### 3G. AUDIO

The burner score exists (`audio3d.ts`, `startSkylarkScore`). It gains:
`skBurner()` one-shots synced to every visible pulse; a crowd *"ooh"* (three
layered sine swells, 0.8s) on FIRST UP and the whale; a soft pop on every bubble
(existing bubble sound, `bubbles.say`'s pop reused); a rising whoosh on lift.
The lark stops singing once the field is loud, as written.

### 3H. WHAT IT LOOKS LIKE AS IT IS EATEN

This is the game, and the design's best idea: **the field empties and the sky
fills, and Mr Pym's instruments report improving conditions the whole way.** By
2:40 the ground is bare grass and paint with eight tethered balloons and a
crowd, and the sky above is ninety balloons in three tiers, and he is reading
*"the finest flying conditions in the history of the meet"* — and by his own
criteria he is right. The end card credits the child with what they ate, never
with the sky (3B). The sign-off stays: *"All crews accounted for. Ninety-one
balloons airborne. That is a record and the committee wishes to note it."*

---

## 4. HARD CONSTRAINTS

These are not preferences.

- **4+ rating.** Dry, never cruel. The shepherd never catches the sheep; nobody
  is hurt; the retired-vocabulary scanner (`scripts/safety-scan.mjs`) runs on
  every new line.
- **3:00 match, phone camera at 46.4°, `camOffset (0.62, 0.92, 0.62)`.** No
  camera changes.
- **The occlusion rule**: no envelope, standing or lifting, may hide the child's
  void. Measured at 430×932 before any height is final.
- **Engine policy**: merged props, vertex colours, no textures in kits, the
  sphere ratchet (`qa/roundlod.mjs`), albedo 0.08, form ΔE 6, one edible one
  radius, `drop()` enforces placeability.
- **Budget**: airborne balloons past 25 units are LOD-swapped; past 60, sprites.
  Frame time on the reference device stays inside the existing budget
  (`qa/trackprofile.mjs --gate`); draw calls for the sky ≤ 12.
- **The placement audit stays at zero offences** in every category — the bar a
  new world gets, and this world passes it today.
- **All 29 push-gate steps stay green**, plus the three new probes below, and
  main moves only on a green gate.

---

## 5. ACCEPTANCE — what must be measurably true

| # | Measure | Bar | Probe |
|---|---|---|---|
| 1 | Airborne balloons at 1:30 / 2:40 / 3:00 (SEED=7) | ≥ 30 / ≥ 70 / ≥ 90 | `qa/ascension.mjs` (new, gate) |
| 2 | `devouredPct` unchanged by any departure; 100% reachable | exact | `qa/ascension.mjs` |
| 3 | Every beat cue in every world reaches a handler | 0 orphans (today: 4) | `qa/beattruth.mjs` (new, gate) |
| 4 | Powder's avalanche fires on its beat | 22 snowballs by 2:40 | `qa/finale.mjs` |
| 5 | Placeable ground / largest piece | ≥ 56% / ≥ 60% of it | `qa/airfield.mjs` §G |
| 6 | Spawn district | `arrivals` | `qa/airfield.mjs` §D |
| 7 | Whale bearing off centreline at controls-live | ≤ 20° | `qa/firstframe.mjs` |
| 8 | First playable frame: rough + runway share | ≤ 35% (today 71.3%) | `qa/firstframe.mjs` |
| 9 | Edibles / big | ≥ 5,200 / ≥ 130 | `qa/_edcount.mjs` |
| 10 | People / in a role / with a prop or uniform | ≥ 500 / ≥ 90% / ≥ 90% | `qa/jobs.mjs` (new) |
| 11 | Journeys / drift | ≥ 1/3 / ≥ 0.30 | `qa/purpose.mjs` |
| 12 | Placement offences | 0, every category | `qa/placement.mjs` |
| 13 | Palette | albedo 0.08, ΔE 6, sphere spend unchanged | `albedo`, `formsep`, `roundlod` |
| 14 | Newsroom | 0 repeats, opener run ≤ 2 | `qa/newsfeed.mjs` |
| 15 | Par | re-measured, 5 matches, worst place ≤ 3rd | `qa/ab.mjs` |
| 16 | Frame budget | inside today's | `qa/trackprofile.mjs --gate` |
| 17 | Kit: parts per placed factory / gloss share / placed glow meshes | ≥ 20 / ≥ 40% / ≥ 120 | `qa/kitfit.mjs` extended |
| 18 | Kit: named colours / envelope on the smooth material | 100% / yes | `qa/formsep.mjs` |
| 19 | Shipped frame: modal colour share / colour buckets | ≤ 20% / ≥ 800 (Maple 1,005) | `qa/shippedlook.mjs` |
| 20 | Props with r < 1, as a share | ≤ 50% (today 91%) | `qa/_edcount.mjs` |
| 21 | Every person has an `OUTFIT` entry for their district | 100% | `qa/jobs.mjs` |
| 22 | The gate | 30 + 3 green | `qa/gate.mjs --profile=push` |

---

## 6. ORDER OF WORK

1. **`qa/beattruth.mjs`** and the generic cue dispatch — one commit, fixes
   Powder's finale, fails first on four orphans.
2. **`qa/ascension.mjs`** — the probe before the mechanic, as the design said.
3. **The land** (3A) — reclaim, respawn, re-aim. Measure §G, §D, first frame.
4. **The third state and the ascension** (3B) — lift tier only, with the
   telegraph, the eight that never leave, the shadow discs. Measure 1 and 2.
5. **The whale stands and lifts** — beats 5 and 6 wired.
6. **The low and high tiers, the distant sprites** — the sky fills. Measure 1.
7. **The ground** (3C) — slab, kit, bank, row, stacks. Measure 9, 12.
8. **The cast** (3D) — roles, six new hand kinds, look-up, bubbles. Measure 10,
   11.
9. **The remaining beats and the pool** (3E).
10. **Art** (3F) — sky gradient, fog, stripes, breathing, motion. Screenshot
    the poster frame and the first playable frame against the today's.
11. **Audio** (3G).
12. **Par**, then **the gate**, then main.

*Sections 3C's pending numbers and the reference citations for §2 fill in from
the survey panel as it lands; nothing above waits on them.*
