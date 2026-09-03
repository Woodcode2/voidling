# PROPOSAL: placement — SOUND WITH CORRECTIONS (governor as skeptic, 2026-09-03 02:40 UTC)

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

---

## Governor's continuation (2026-09-03 01:46-02:10 UTC) — measured, not inherited

Two crews ran this lane and both were killed by container restarts (21:33 and
~22:05 UTC); their instrument, before-table, four before-shots and unfinished
patch were rescued from the dead worktrees and are in git. The governor
finished the measurement himself, token-cautious, and acted as the skeptic.
Everything below was run on this box; commands and files are named.

### 1. The crew's after-table was taken at the wrong moment
`qa/placement.mjs` censused the world right after `__voidState` appeared — before
any match starts, i.e. BEFORE `validateWorld()` (the boot sweep that nudges props
off roads, culls off-island strays and, with this patch, retires footprints).
`qa/_settlestat.mjs maple 4177` (SEED=7, match started) printed what the sweep
actually did on the patched build:

```
maple   settle {inside:170, through:94, doorstep:13, feet:5453, ms:253}  edibles 5516
        [world] placement sweep: 56 nudged off roads, 278 retired (170 inside a solid, 94 through another, 13 on a doorstep; settle 253ms over 5453 footprints)
gameday settle {inside:24,  through:28, doorstep:0,  feet:5971, ms:87}   edibles 6417
        [world] placement sweep: 0 nudged off roads, 53 retired (24 inside a solid, 28 through another; settle 87ms over 5971 footprints)
```
So the crew's "Maple: inside 184 → 186" was true of the raw scatter and false of
the world a child plays: 278 props are gone by the time the intro ends. The
auditor now calls `__validateWorld()` before its census (commit 942ce70) and the
paired table below is taken that way on BOTH builds.

Cost of the settle pass: 253 ms on Maple, 87 ms on Game Day, at match start
(inside `beginMatch` → `validateWorld`). That is a one-off hitch before the first
match frame; it does not recur (`_validated`). Recorded, not yet moved to the
loading screen — see "owed".

### 2. Forcing the drops lost the burial test (KILLED that part; corrected)
The crew forced every `sep != r` drop past `spotOpen()` because the own-claim
exemption matched on radius (`c.r === rWorld`) and a scatter claim at `sep`
never equals a drop at the eat radius. Forcing also skips drop()'s burial test:
Powder measured inside 31 → 43 at SEED=7 (12 more small props under chalets).
Correction landed in 942ce70: `spotOpen` in bay.ts and mainstreet.ts treats an
exact-position claim as your own whatever its radius; the `force` flags on the
chalets, the Lantern/Game Day `plant()` sheds, and the Pirate huts are removed.

### 3. What the raw-scatter table (crew's method, SEED=7) still established
Lantern water 378 → 3 (the canal exclusion), inside 36 → 3, overlap 107 → 14;
Game Day inside 44 → 24, overlap 279 → 196 (the RV mass is gone: shots
`placement-s7/before-gameday-overlap-0.png` vs `wip-gameday-overlap-0.png`);
Powder water 20 → 0 (no pine on the ice), road 12 → 1; Pirate roadend 4 → 1,
offisland 9 → 4, overlap 194 → 171. These are scatter-time changes and survive
the timing correction.

### 4. The paired table after validateWorld (SEED=7; before = main 4c8a743 on :4181, after = 942ce70 on :4177)
(appended per world by the audit loop — `placement-data/s7v-before-*.json`, `s7v-after-*.json`, logs beside them)

| world | props | road | water | offisland | inside | under | overlap | roadend | door | bench |
|---|---|---|---|---|---|---|---|---|---|---|
| maple before | 5441 | 0 | 0 | 0 | 186 | 87 | 193 | 0 | 5 | 3 |
| maple after | 5265 | 0 | 1 | 0 | **3** | 72 | **116** | 0 | **0** | 4 |
| gameday before | 6069 | 0 | 0 | 0 | 44 | 151 | 279 | 0 | 0 | 0 |
| gameday after | 5902 | 0 | 0 | 2 | **1** | 57 | **163** | 0 | 0 | 0 |
| lantern before | 4506 | 0 | 378 | 2 | 36 | 126 | 107 | 0 | 0 | 0 |
| lantern after | 4344 | 0 | **5** | 2 | **0** | 9 | **19** | 0 | 0 | 0 |
| powder before | 4142 | 12 | 20 | 1 | 31 | 11 | 32 | 0 | 0 | 0 |
| powder after | 4047 | **1** | **0** | 1 | **0** | 6 | 29 | 0 | 0 | 0 |
| pirate before | 3519 | 59 | 0 | 10 | 75 | 47 | 193 | 1 | 0 | 0 |
| pirate after | 3361 | **15** | 0 | 5 | **1** | 29 | **49** | 1 | 0 | 0 |

Commands: `SEED=7 node qa/placement.mjs <world> 4181|4177 --json=… --shots=… --pick=… [--spots=…]`,
logs and JSON in `placement-data/s7v-*`, shots in `shots/placement-s7v/` (each after-shot is
taken at the before run's offender coordinates). Every number above is from those runs.

### 5. Verdict — SOUND WITH CORRECTIONS (the two corrections are landed in 942ce70)
Per hunk group, ruled on the paired table:
- **Pirate trail and promenade ends (bay.ts + the bake order)** — SOUND. Trail joins the
  promenade and the tideline; roadend 4 → 1 on the raw scatter. The one remaining open
  end is the promenade's south end, stopped 16 units short of the hand-authored spawn
  by the crew's recorded decision (HANDS OFF: the spawn). Left as is.
- **Powder: no pine on the ice, chalet sep 5.4, snow lumps clear of the road** — SOUND
  after correction (un-forced): water 20 → 0, road 12 → 1, inside 31 → 0.
- **Lantern: sep for sheds/kura/teahouses, canal exclusion, afloat tags** — SOUND after
  correction: water 378 → 5, inside 36 → 0, overlap 107 → 19.
- **Game Day: lot vehicles nose-in with real claims, sep for frat houses / halls** — SOUND
  after correction: inside 44 → 1, overlap 279 → 163; the RV mass photographed as one
  roof is gone. Residue: two 1.7×1.2 props off-island at census time — GLB props whose
  model had not streamed when the sweep ran (validateWorld skips an un-streamed
  wrapper and re-checks it on its next call, at match start). Unverified for these two.
- **Pirate huts sep 5** — SOUND after correction: inside 75 → 1, overlap 193 → 49.
- **Maple roadworks/bridge tags** — SOUND; instrument exemptions only, no placement change.
- **settleFootprints() (prototype3d.ts, +116)** — SOUND, with two facts the crew did not
  have: it is the whole Maple result (inside 186 → 3, doorsteps 5 → 0, overlap 193 → 116
  come from it, nothing else in the patch touches Maple's placement), and it costs
  253 ms on Maple / 87 ms on Game Day at match start, once. That hitch is OWED to the
  loading screen (below), not a reason to hold the pass: a child sees a town hall with
  no tree in it (shots/placement-s7v/before-maple-inside-0.png vs after-maple-inside-0.png).
- **The auditor, qa/placement.mjs** — SOUND with the governor's correction (census after
  `__validateWorld()`); registered nowhere yet — gate registration is owed, see below.

### 6. Residue (recorded, not hidden)
Maple: 3 inside (a 3.5×2.9 prop in a 21×10 building the parity ray missed; a 1.0×0.1
sign in a 1.3×1.3 post), 4 benches facing a planter 1.2 u ahead, 1 small prop nudged onto
the pond. Game Day: the two off-island GLB props above; 163 overlaps left in the lot rows
(trucks 3.2 wide on a 7.9 pitch still touch at the bumpers by the 0.35 bar). Lantern: 5
on water, 19 overlaps. Powder: 29 overlaps, mostly chalet-vs-yard-clutter (11×10 flat
props under chalets — footprint by design, h 0.8). Pirate: 15 road (promenade furniture
inside the deck band the auditor now allows at 3.5; the rest are old-town props), 5
off-island buildings (the fort/lighthouse landmarks the coast smoothing left over the
water, pre-existing: 10 before), 49 overlaps.

### 7. Owed after this lands
- Move settleFootprints() to the island-ready hook (the loading screen) and keep the
  match-start call for un-streamed GLBs only: removes the 253 ms hitch.
- Register `qa/placement.mjs` in `qa/gate.mjs` (quality tier, per-world bars at the
  after-numbers above so a regression fails).
- The two Game Day off-island GLB props: confirm the match-start re-check culls them.
- Powder's remaining 29 and Game Day's 163 overlaps are pitch questions (lot rows, chalet
  yards), not bugs — a design pass, not a sweep.
