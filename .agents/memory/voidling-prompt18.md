---
name: VOIDLING Prompt 18 Street Level
description: Road narrowing, universal clay mapping, plaza rebuild, street furniture, early camera widening.
---

## Changes

### Stage 1 — Universal clay mapping (structureSpriteKey)
- All 55 legacy sticker kinds now mapped in a `switch (kind)` block before `return kind`.
- Clay park sheet keys (clay_park_0..15): bench→3, fountain→15, cafetable→4, foodcart/icecream/icecream_cart→14, birdbath/sandbox/mower/bike/scooter/zoo_wall→12, shed/gazebo/watertower/zoo_gate→2, slide→0, swingset/trampoline/pg_swing/pg_trampoline→1, hoop/pg_hoop/pg_soccergoal→5, seesaw/pg_seesaw→13, picnic_table/bbq→4/8, drone/streetlamp→7, bus_stop→11, pg_merrygoround→11, pg_sandbox→12
- Clay beach sheet keys (clay_beach_0..11): umbrella→0, towel→1, lifeguard→2, palm→3, rowboat/kayak→4, crab/seashell/kite_prop→5, sandcastle→6, surfboard→8, cooler→11
- Vehicles (car_parked_a/b, jeep) → clayVehicleKeys pool (fallback: clay_park_12)
- Critters (dog, cat, duck, squirrel, bird) → null (procedural draw, still eatable)
- Vignettes → clayPeopleKeys (fallback: clay_park_4)
- zookeeper/soldier → clayPeopleKeys (fallback: clay_park_3)

### Stage 2 — fillPlaza rebuild
- BENCH_R = 0.09×B = 144px (was RING_R = 0.25×B = 400px)
- LAMP_R = 0.12×B = 192px (new streetlamp ring)
- CAFE_R = 0.14×B = 224px (5 cafe tables)
- 8 flowerpots (random scatter in core zone)
- 2 food carts at 0.18×B
- 12 flowers + 6 apples (scatter)
- 4 corner trees at 0.38×B = 608px (was 0.40×B = 640px)
- 14 visitors (10 park + 4 any)

### Stage 3 — Road narrowing
- ROAD_WIDTH: 200 → 110 (45% narrower)
- MARGIN auto-recomputes: (12000 - (6×1600 + 5×110)) / 2 = 925 (was 700)
- No hardcoded road-width assumptions found elsewhere

### Stage 4 — Street furniture
- New kinds: `streetlamp` (tier 2, r14–18) and `bus_stop` (tier 3, r32–40)
- Both added to ObjectKind union, KIND_INFO, and INFRA_KINDS
- structureSpriteKey: streetlamp→clay_park_7 (lamp), bus_stop→clay_park_11 (lamp-2)
- New infra pass: lamps every 380px on N/S/E/W edges of all blocks except forest/beach/military
- Bus stops (60% chance) on N face of downtown blocks

### Stage 5 — Early camera widening
- `zoomMult = player.radius < 50 ? 35.0 : 28.57`
- Stage 1 (r=18): zoom ≈ 1.14× (was 1.40×, 22% wider view)
- Stage 2 (r=38): zoom ≈ 0.54× (was 0.66×, 22% wider)
- Stage 3+ unchanged; CAM_ZOOM_LERP smooths the r=50 crossover

## Rules
- All new legacy-kind mappings MUST be deterministic (no `break` fallthrough to `return kind`).
- Pool-dependent cases use `pool.length ? pool[id % pool.length] : 'clay_park_*'` pattern.
- INFRA_KINDS must include any new kind placed with `{ infra: true }`.
