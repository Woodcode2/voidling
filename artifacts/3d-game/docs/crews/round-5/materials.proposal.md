# DRAFT — in progress (materials, Stream B) — governor-run, 2026-09-03

Owner: "The items need to be better, to be blunt. Better shading. More realistic."
Brief §2B: RUNG 2 (`GLOSS_ENV` 5.0 → 6.5, island.ts), RUNG 3 (a neutral vertical-gradient
environment map through PMREMGenerator replacing RoomEnvironment, intensity 0.15, with a
K-parity kill gate), the mascot's colour constancy re-measured after each rung (bar dE 6),
and the saturated-albedo audit (linear secondary/dominant ratio < ~0.08 cannot shade).
Method: governor-run with commit loops; paired A/B at SEED=7 on two builds; canvas
screenshots only (the render-target trap); every number below is from a run named here.

## Pre-registration (written before the rung numbers existed)

Three builds, one fixed shot per world (`qa/lookpair.mjs`, SEED=7, the lookpair mark,
t≈10 match seconds), five worlds (maple, pirate, gameday, lantern, powder):

| tag     | source                                             | build served on |
|---------|----------------------------------------------------|-----------------|
| before  | main (a4456c3, GLOSS_ENV 5.0, RoomEnvironment)      | :4177 then :4181 (hero retake) |
| rung2   | 10e88ee source, `ENV_MODE = 'room'` (GLOSS_ENV 6.5) | :4177 |
| rung3   | same + `ENV_MODE = 'gradient'` (the chain flips and commits it) | :4177 |

Per frame `qa/kmetric.mjs` prints K (median Rec.709 luminance, 0-255), Y05/Y95 (5th and
95th percentile luminance — the tonal range), and C (mean chroma). Per world
`qa/heroswatch.mjs 4177 3 <world>` prints the mascot's mean RGB at radius 3.

Rulings fixed in advance:
- **RUNG 3 kill gate (from prototype3d.ts:589):** if any world's K under rung3 differs from
  its before K by more than 4% of the before value, rung 3 dies and ENV_MODE returns to
  'room'. `qa/_matverdict.mjs rung3` prints the table and the bare PASS/FAIL line.
- **Mascot constancy:** dE(before, rung) of the radius-3 swatch ≤ 6 on every world, or the
  rung dies regardless of K. (The brief's ceiling: 9.6 dE at exposure >1.26 was already a fail.)
- **RUNG 2 has no kill gate** — it scales the IBL specular term by vGloss only, so it is
  expected to move Y95 (highlights) and leave K nearly still. It is judged on the crops:
  if the glossy props (Maple's benches and lamp posts, Game Day's truck, Lantern's lamps,
  Powder's snow tops) show a highlight that reads as a surface and not as a white smear,
  it stays. If nothing visibly changes, it stays anyway (it is the specified value) and
  the record says so.
- **Albedo lifts** are applied AFTER the rung numbers are taken, so the A/B is clean.
  Rule: second linear channel / dominant < 0.08 cannot shade; lift to 0.10 by scaling both
  secondaries alike (hue kept — the Game Day CRIM method). The census
  (`materials-data/albedo-census.txt`) found 22 colours under the bar at 1753 sites
  scanned. 13 hex values across six files are lifted (`scratchpad/albedo-apply.mjs`);
  excluded on purpose, each with a reason: the DANGER ring and halo (meaning colours —
  "a RED ring means run"), flashes and overlays (prototype3d.ts:2628, :3120; rivals.ts:2029),
  emissive lamps and tail-lights, the hero's fear face (life.ts:434), rival skins
  (products, not scenery), palette.ts UI reds, and defense.ts:34's UI bar.

## What I measured

**RUNG 3 (gradient environment, ENV_GAIN 1.0, intensity 0.15) — KILLED by the pre-registered
gate, 13:23 UTC.** Build bafc316 on :4177, SEED=7, rivals hidden at the shutter
(`HIDE_RIVALS=1`, lookpair.mjs), `node qa/_matverdict.mjs rung3`:

| world  | K before → rung3 | dK     | Y05/Y95 before → rung3 | mascot dE |
|--------|------------------|--------|------------------------|-----------|
| maple  | 128 → 115        | −10.2% | 33/185 → 19/174        | 0.7 |
| pirate | 111 → 88         | −20.7% | 16/189 → 16/178        | 1.5 |

The gate was 4% of the before K. Two worlds were enough to decide it; gameday, lantern and
powder were not shot for rung 3 (the loop was stopped mid-gameday to free the GPU for the
before/rung2 re-takes) — recorded as not measured, not as passing. The shadows fell hardest
(Maple Y05 33 → 19): the RoomEnvironment box was carrying a large share of the diffuse fill
at intensity 0.15, and a neutral gradient at gain 1.0 carries far less. `ENV_MODE` is back to
`'room'` in this commit. Owed, not done: calibrate ENV_GAIN to the room box's mean
irradiance (analytically, from the two PMREMs) before any rung-3b attempt; that attempt
needs its own pre-registration and its own five-world run.

(rung 2 and the albedo lifts: appended as measurements land)

## What is wrong

## The patch

## What I could not verify
