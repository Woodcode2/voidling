# WORLD 3 — GAME DAY

**Fall Saturday in a college town. The whole place has turned out for the game.**

The player is a void that starts in the parking lot, eats its way through a
tailgate party, and finishes by swallowing the stadium.

This document is the contract. Everything below is decided; the modules just
implement it.

---

## 1. The feeling

Maple Falls is a sleepy town. Pirate Bay is a resort where nothing matters.
**Game Day is a town with one thing on its mind**, and it is happening right now.

Concretely, that means:

- **Density over spread.** The parking lot should be nose-to-tail. Where Maple
  has lawns, this has trucks, tents and people. The single most common
  complaint a level like this can attract is "it feels empty" — it must not.
- **Everyone is facing the same way.** Toward the stadium. The crowd has a
  direction, which no other world has.
- **Noise.** The band is playing somewhere you cannot see. There is a distant
  roar every so often, and it gets louder as the match goes on.
- **Autumn.** Low warm sun, long shadows, amber and crimson trees at the edges.
  Warmer than Maple's midday green, and completely unlike Pirate Bay's white sand.

## 2. The shape of the place

A broad flat plateau — **not an island in the sea**. The edge is where the
tarmac and grass stop and drop into woodland, which is the "water" as far as
containment is concerned: off the edge is out of bounds, same as before.

Districts, roughly north to south:

| id | name | what it is | density |
|---|---|---|---|
| `bowl` | THE STADIUM | the bowl itself, north end. The biggest meal in the game. | 0.7 |
| `plaza` | GATE PLAZA | ticket gates, merch stands, queues, inflatable helmet tunnel | 1.3 |
| `lot` | THE TAILGATE | the parking lot. Pickup trucks, canopies, grills, cornhole. **The hero district.** | 1.4 |
| `rvpark` | RV ROW | motorhomes with awnings, satellite dishes, deck chairs, one hot tub | 1.1 |
| `greek` | FRAT ROW | big porched houses, sofas on lawns, banners between columns | 1.0 |
| `campus` | OLD CAMPUS | brick halls, a clock tower, a quad, statues | 0.9 |
| `practice`| PRACTICE FIELD | goalposts, blocking sleds, water carts, a bleacher stack | 0.8 |
| `woods` | THE TREE LINE | autumn woodland at the rim, thinning out | 0.5 |

The player spawns in **THE TAILGATE**, facing the stadium, so the first thing
they see is the thing they are working toward.

## 3. Team colours

Two teams, and this is decoration only — **it must never read as a contest with
sides the way the old campaign signage did.** (See the county-fair note in
`mainstreet.ts`.) Home is crimson and gold; the visitors are teal. Crimson
dominates roughly 4:1 so the place reads as one town, not two factions.

```
HOME_A   0xc4342f   crimson
HOME_B   0xf0b429   gold
AWAY     0x2aa9a0   visitor teal
```

## 4. Voice

The newsroom is **live commentary**, two announcers in a booth, and they never
stop calling the game even as the ground disappears. This is the funniest
possible frame for the news system and it maps onto the existing tiers exactly:

- **tier 0** — pre-game. Cheerful, discursive, they talk about the weather and
  someone's casserole.
- **tier 1** — something is wrong. They start describing it as if it were a play.
- **tier 2** — total collapse. They are professionals. They keep calling it.

House style, non-negotiable (this is why the newsfeed was rejected twice):
sentence case, a capital at the start, terminal punctuation, under ~88
characters, no rival names, no politics, nothing about death or injury.

Good: `"Nothing in the rulebook covers this. Bill is checking. Bill has stopped checking."`
Bad: `"the hole ate the fifty yard line lol"`

## 5. The four beats

| at | name | what fires |
|---|---|---|
| ~30s | 🏈 KICKOFF! | everything is DOUBLE |
| ~66s | 🥁 THE BAND TAKES THE FIELD! | DOUBLE |
| ~110s | 🌭 CONCESSION RUSH! | DOUBLE |
| ~148s | 📣 FOURTH QUARTER! | everything is TRIPLE — the finale |

## 6. Module split

- `src/proto3d/gameday.ts` — geometry only. Land polygon, district polygons,
  the road/path network. Pure data + point-in-polygon helpers. No THREE.
- `src/proto3d/tailgate.ts` — the prop kit. Every prop is one merged mesh.
- `src/proto3d/newsroom_gameday.ts` — headlines and crowd voices.

Wiring into `island.ts`, `life.ts`, `audio3d.ts` and `prototype3d.ts` is done
separately and by hand.
