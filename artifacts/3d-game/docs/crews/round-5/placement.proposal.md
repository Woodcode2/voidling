# DRAFT — in progress (placement)

Crew: placement (Stream A, first half). Worktree wf_4583cfd9-6a7-1. Started 2026-09-02 20:51 UTC.

## The owner's words

> Sometimes in certain levels the items may be misplaced — you have trees on
> roads, the road may not be finished, item placement isn't dialled in. That
> needs to get fixed. Every item needs a purpose in terms of where it's at.

## What I measured

(appended as measurements land)

## What is wrong

## The patch

## What I could not verify


### 20:51-21:40 UTC — the instrument, first cut (bbox-based), Maple only, unpatched :4177
Command: `cd <worktree>/artifacts/3d-game && node qa/placement.mjs maple 4177 --json=/tmp/crew-placement/before-maple.json`
(probe v1: footprint = Box3.setFromObject of the whole prop). Result on 5441 static props:
road 46 · offisland 1 · float 0 · sunk 857 · inside 1072 · overlap 3393 · door 34 · bench 13.
Read against the data, three of those numbers were the INSTRUMENT, not the town:
- `sunk 857` is 555 props of height 2 sunk exactly 1.0 (makeBush is a half-buried sphere by design) — on a flat plane a buried base is invisible. Retired as a FAIL category; kept as info with the bar "top under 0.6 = nobody can see it".
- `overlap 3393` and `inside 1072` were dominated by CANOPIES: a maple's bounding box is its crown, so every tree touching a neighbour's crown counted. Also the contact-shadow disc (assets3d.ts contactShadow, y=0.045, r*1.1) was inside every small prop's box, which both inflated footprints and MASKED floating props (a base at y=1 with its disc at 0.045 measures minY=0.045).
- the 46 `road` hits included the 4 authored roadworks clusters (island.ts:7181 — cones + notice board across the lane, by design) and the 8 river-bridge railings (island.ts:7250, placed at ±4.6 from a road centre, by design).
So v2 measures the GROUND FOOTPRINT: the oriented box of every vertex under y=1.0 in the prop's own yaw frame, shadow discs excluded; overlap by SAT on the two oriented rects; "inside" confirmed by ray parity through the container's geometry at knee and chest height with both faces on. The v1 numbers above are superseded and are NOT claims.

### 21:12-21:14 UTC — BEFORE, all five worlds, unpatched :4177 (probe v2, ground footprints)
Command: `cd <worktree>/artifacts/3d-game && node qa/placement.mjs all 4177 --json=/tmp/crew-placement/before-all.json` (log: /tmp/crew-placement/before-all.log)

| world | props | road | water | offisland | float | inside | under(info) | overlap | roadend | door | bench | sunk(info) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| maple | 5441 | 14 | 0 | 1 | 0 | 189 | 86 | 451 | 0 | 4 | 3 | 171 |
| pirate | 3526 | 109 | 0 | 2 | 0 | 72 | 59 | 276 | 4 | 0 | 0 | 486 |
| gameday | 6055 | 1 | 0 | 1 | 0 | 38 | 165 | 536 | 0 | 0 | 0 | 222 |
| lantern | 4516 | 25 | 355 | 6 | 0 | 34 | 114 | 192 | 0 | 0 | 0 | 454 |
| powder | 4147 | 11 | 612 | 3 | 0 | 45 | 3 | 951 | 0 | 0 | 0 | 2498 |

Verdict line: `PLACEMENT FAIL — maple,pirate,gameday,lantern,powder (bars: road lip 0.25, float 0.3, buried top 0.6, overlap 0.35, door 1.6, ground 1)`.
Audit time per world 12-35 s once the page is up; the page load under swiftshader is 1-3 min per world.

Grouped by prop class (python over the JSON, /tmp/crew-placement/before-all.json), the numbers are a handful of CAUSES, not thousands of accidents:
- MAPLE overlap 451: 27 pairs of pickup trucks (foot 5.8x3.6) overlapping each other; outbuildings (barn 16x12, silo 11x10, elevator 16x9, water tower 10x6 — island.ts:7336 country fill) dropped over unclaimed trees and lot houses: `inside 189` is dominated by trees (foot 1x1, h 8.4-8.7) standing INSIDE barns (ray parity confirms solid). Cause: `spotFree(wx, wy, r3 * 20)` claims by EAT radius (barn 5.2) while the mesh is 8.3 half-wide; trees placed by `place()` never claim at all.
- MAPLE road 14: 12 are the 4 authored roadworks clusters (island.ts:7181, cones + notice board, by design — photo before-maple-road-0.png shows cones on asphalt reading as roadworks) + 2 buildings 0.36 into the x=4290 asphalt (the sweep's 0.25 building tolerance, prototype3d.ts:6245).
- PIRATE road 109: promenade furniture (45 torches, 24 benches, 13 planters, 4 signposts — island.ts:6465-6480) placed 5.75-6.25 units off the boardwalk centreline ON the 17.5-unit deck by design. The bar for a pedestrian deck is therefore the CORE (half − 3.5), not the edge; re-measured below.
- PIRATE roadend 4: the jungle TRAIL starts at (6200,3500) in open sand 45 units from anything (photo before-pirate-roadend-2.png: the tan strip ends in a rounded cap with nothing at it) and ends at (3400,8600) likewise; the PROMENADE's two ends stop in sand short of the coast.
- GAMEDAY overlap 536: vehicles in the lot rows (gameday.ts LOT_ROWS pitch 158-175 world = 7.9-8.75 units) are yawed ALONG the row (`face = s.ang`, island.ts:5864-5868; the truck body is 5.9+ long on local x, the RV 12.2) so an 8-long truck at 8.25 pitch is bumper-to-bumper and every 12.2-long RV clips its neighbours by ~4 units (28 truck-truck, 10 truck-RV, 9 RV-RV pairs; `inside 38` is aisle props inside RVs).
- LANTERN overlap 192: stalls (9.2-12.2 wide) on a 230-world (11.5-unit) pitch (island.ts:5556 `stallSlots(Math.random, 230, 30)`) overlap by up to 3.5; water 355 is 16 canal boats + 150 float lanterns placed ON the canal by design (island.ts:5608-5618) and untagged — plus 9 stalls whose footprint reaches into the channel at bends.
- POWDER overlap 951: 24 chalets scattered in the village with NO separation option (island.ts:5343 `scatterInRegion(REG('village'), 24, rnd2, 150)` — `drop`'s burial test lets chalets 3.2 units apart through, and a chalet is 6.2-8.6 wide); the rest is snow-day clutter (drifts, snowballs) against each other and pines. water 612 is the 'lake' region's authored clutter on the ice (by design) plus pines rooted in the ice.
- The `offisland` prop at (-248.3,131.8) in maple/gameday/powder is the ferris wheel (prototype3d.ts:3495) — placed after the boot sweep, culled by the 8 s sweep with a puff; the player never reaches it.

### 21:40 UTC — CONTINUATION (second crew, worktree wf_92bcb5f4-e68-1)
The first crew was killed by a container restart at ~21:35 while running the SEED=7 BEFORE/AFTER pair
(`/tmp/crew-placement/pair.sh`; maple BEFORE at :4177 completed → `/tmp/crew-placement/s7-before-maple.json`,
the AFTER died with the browser). Its WIP patch (`placement.wip.patch`, island.ts +93/-28, prototype3d.ts +116)
applied cleanly to HEAD 4c8a743 in this worktree (`git apply --check` then `git apply`, exit 0). Judging it before
building; measurements below are appended as they land.

### 21:43 UTC — instrument fix (qa/placement.mjs) and the SEED=7 BEFORE row for Maple
- The v2 probe threw `ReferenceError: DECK_BAND is not defined` on every world with a deck road (pirate) or any
  polyline road (gameday/lantern/powder): the constant was declared in Node scope (line 96) but read inside the
  in-page `auditFn` (line 272). Maple has no polyline roads so the first crew's Maple runs never hit it.
  Fixed by passing it through `D` like the other bars (lines 167 and 400). `node --check` clean. MAIN copy updated.
- Maple BEFORE at SEED=7 (first crew's run, the final v2 probe, unpatched :4177), command
  `SEED=7 node qa/placement.mjs maple 4177 --json=/tmp/crew-placement/s7-before-maple.json --shots=... --pick=inside:2,overlap:2,road:1,door:1`:

| world | props | road | water | offisland | float | inside | under(info) | overlap | roadend | door | bench | sunk(info) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| maple (SEED=7, before) | 5443 | 14 | 0 | 1 | 0 | 184 | 93 | 192 | 0 | 5 | 3 | 171 |

  (overlap 192 here vs 451 in the 21:12 table: between those runs the first crew split solid-through-anything
  `overlap` (FAIL) from clutter-touching-clutter `clutter` (info) — see probe line ~309. The 21:12 table is superseded
  by the SEED=7 rows as they land below.)
