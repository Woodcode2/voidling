# VERDICT: SOUND WITH CORRECTIONS — materials and light (Stream B), governor-run, 2026-09-03

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

**A confound found and removed before any ruling: the family.** Lantern's first before/rung2
pair read K 50 → 47 ("−6%") with NIBBLES and his red ring beside the hero in the before frame
only — and rung 2 cannot darken anything by construction (`radiance *= 1 + 6.5·vGloss`).
`qa/lookpair.mjs` gained `HIDE_RIVALS=1` (the family's body groups and halos hidden at the
shutter, count printed). Every pair below is rival-free on both sides; where a half had been
shot with a rival in it, it was re-taken on the same build (`qa/_matretake.sh`, worktrees
`before-main` at a4456c3 on :4181 and `rung2` at 8233067 on :4182) and the original kept beside
it as `*.withrivals.*`. Lantern re-read 47 → 47.

**RUNG 2 (`GLOSS_ENV` 5.0 → 6.5) — STAYS.** `node qa/_matverdict.mjs rung2`, SEED=7, rivals hidden:

| world   | K before → rung2 | dK    | Y05/Y95 before → rung2 | C before → rung2 | mascot dE |
|---------|------------------|-------|------------------------|------------------|-----------|
| maple   | 128 → 130        | +1.6% | 34/185 → 35/185        | 60.6 → 60.2      | 0.6 |
| pirate  | 110 → 111        | +0.9% | 16/189 → 16/189        | 73.6 → 72.5      | 1.5 (re-take) |
| gameday | 63 → 63          | 0.0%  | 12/172 → 12/171        | 48.7 → 48.7      | 1.4 |
| lantern | 47 → 47          | 0.0%  | 16/129 → 15/129        | 22.5 → 22.7      | 1.0 |
| powder  | 152 → 152        | 0.0%  | 45/177 → 47/177        | 38.9 → 38.9      | 0.6 (re-take) |

Tone, range and chroma are still within a frame of the before build; that is what a
specular-only term should do. The picture (Maple's car, `qa/_redcrop.mjs … 520 1480 300 200`,
before vs rung2): a slightly fuller sheen along the roof and bonnet, no white smear. It is a
subtle change at play distance — the record says so rather than claiming more. It stays because
it is the specified value and it costs nothing measurable. The first pirate and powder rung-2
hero swatches read 68,66,107 and 83,63,131 — desaturated, not the mascot (kept as
`*.hero.firstrun.log`); re-taken on the rung-2 worktree they read 92,49,148 and 105,61,164 — dE 1.5 and 0.6 from before. The mascot is one colour across rung 2.

**Albedo lifts (13 reds, 24 sites, six files; commit b6040cc) — measured as tag `after`
(rung 2 + lifts, :4177), SEED=7, rivals hidden:**

| world   | K before → after | dK    | Y05/Y95 before → after | mascot dE |
|---------|------------------|-------|------------------------|-----------|
| maple   | 128 → 133        | +3.9% | 34/185 → 42/185        | 0.4 |
| pirate  | 110 → 111        | +0.9% | 16/189 → 16/189        | 0.0 |
| gameday | 63 → 63          | 0.0%  | 12/172 → 12/171        | 1.4 |
| lantern | 47 → 47          | 0.0%  | 16/129 → 16/129        | 1.2 |
| powder  | 152 → 152        | 0.0%  | 45/177 → 47/177        | 2.1 |

The mascot holds on every world (bar 6). Maple's +3.9% with Y05 34 → 42 is the whole plaza
reading brighter, not the lifted reds — the environment code path is byte-identical to main's
for `ENV_MODE = 'room'` (checked by diff). A noise-floor control (Maple before shot twice more
on main's build, rivals hidden) settles it:

| Maple frame | build | K   | Y05 | props in frame |
|-------------|-------|-----|-----|----------------|
| before      | main  | 128 | 34  | 78 |
| before2     | main  | 128 | 34  | 79 |
| before3     | main  | 128 | 35  | 80 |
| rung2       | 8233067 | 130 | 35 | 78 |
| after       | b6040cc | 133 | 42 | 76 |
| after2      | b6040cc | 128 | 34  | 78 |

The noise floor of the shot on one build is K ±0 and Y05 ±1 — a 4% gate is meaningful.
`qa/_pxdiff.mjs maple_rung2 maple_after` then says where the after frame differs: 6.6% of
pixels moved by more than 6 (4.9% up, mean +39), and only 4% of them had been red or orange —
the lifted colours are not what moved. The moved pixels are one region: the frame's top-left
corner, where a dark-green canopy covers 51% of a 260×280 crop in every other Maple frame
(before ×3, both rung2 frames, both with-rivals originals) and 0% in the after frame — the tree
is gone, and the frame counts 76 edibles against 78-80. A rival ate it before the shutter.
`HIDE_RIVALS` hides the family at the shutter; it does not take away their appetite in the
ten match-seconds before it. Maple's "+3.9%" is one missing tree, not the lifts.
Shot again on the same build with the tree in place (after2, 78 props, canopy 51% of the
corner), Maple reads K 128, Y05 34 — exactly the before build. The after table's Maple row is
therefore 128 → 128 (0.0%), and the first after frame is kept as the record of the confound.

**Did the lifted reds gain shading?** Whole-frame red-pixel luminance spread barely moves
(`qa/_redcrop.mjs`, P95−P5: maple 75 → 75, pirate 64 → 61, gameday 34 → 34, lantern 128 → 125,
powder 67 → 63) because most red pixels in a frame are autumn canopy, hull planks and Game Day's
crimson, none of which were touched. On the lifted surfaces themselves — Lantern's stall
awnings (`#c1382e`, crop 560 360 200 140): red-pixel P5/P50 28/28 → 35/36, P95 155 → 155. The
shaded side of the stripes now sits above black-red instead of on it; the lit side is unchanged.
That is the CRIM effect, small by design (ratio 0.10, hue kept). The census probe
(`qa/albedo.mjs`) passes with 11 unlit or meaning colours allowed by name and site, and is in
the gate (push, live, quality).

## What is wrong

- The brief's standing lever for material quality was two rungs; one of them (RUNG 3, the
  gradient environment) does not survive its own gate at the specified gain — the room box was
  quietly carrying much of the diffuse fill. The record now says so with numbers instead of
  leaving the rung "specified and never landed".
- Thirteen authored reds sat under the CRIM bar and could not shade; Game Day's was the one
  found by complaint. Now found by search, with a probe in the gate so the next one is found
  before a child sees it.
- The measurement itself had two traps this stream walked into and out of: the family
  (a rival's body and ring in one half of a pair moved K by 6% on Lantern; a rival's appetite
  removed a canopy and moved K by 4% on Maple) and a hero swatch that twice read something
  that was not the mascot. Both are recorded with the confounded frames kept beside the clean
  ones.

## The patch (all on the branch; main after the gate)

- `src/proto3d/island.ts` `GLOSS_ENV = 6.5` (RUNG 2) — stays.
- `src/prototype3d.ts` RUNG 3 behind `ENV_MODE`, left at `'room'` after the kill; the gradient
  code stays for a pre-registered rung-3b with a calibrated gain, or is removed when that is
  declined.
- 24 colour literals in `nightmarket.ts`, `life.ts`, `alpine.ts`, `mainstreet.ts`, `island.ts`,
  `hatgeo.ts` — second channel to 0.10 of the dominant, hue kept.
- `qa/albedo.mjs` (census, allowlist by name and site, in the gate); `qa/lookpair.mjs`
  `HIDE_RIVALS=1`; `qa/kmetric.mjs`, `qa/heroswatch.mjs`, `qa/_matverdict.mjs`,
  `qa/_matbefore.sh`, `qa/_matretake.sh`, `qa/_sbs.mjs`, `qa/_redcrop.mjs`, `qa/_pxdiff.mjs`.

## What I could not verify

- **"More realistic" as the owner sees it.** Rung 2 is a subtle sheen at play distance and the
  lifts are a shaded side that is no longer black-red. Neither is a transformation, and I have
  not shot the option set the brief asked for ("shoot options and let him choose") — that is
  the honest next step if he wants more than better-made: a rung-3b at a calibrated gain
  (analytic, from the two PMREMs), a second directional fill, or a per-world exposure nudge
  under the mascot's 1.26 ceiling, each measured the same way.
- **Rung 3 on gameday, lantern and powder** — not shot; the kill was decided on two worlds.
- **Which props carry `aGloss`** — I judged rung 2 on the car because it is the largest glossy
  surface in Maple's frame, not from a census of glossy vertices.
- **Rival appetite before the shutter.** `HIDE_RIVALS` hides bodies, not eating. A lookpair
  mode that keeps the family unjoined for the whole shot is owed; until then a pair's prop
  counts must match (they are printed) or the pair is re-shot.
- **The gate** — its line is appended below when it finishes.

## Owed
- rung-3b pre-registration with a calibrated ENV_GAIN, or removal of the gradient code.
- lookpair: a no-family mode (unjoined for the shot), and the family count in the PASS line
  already exists — make a mismatch a WARN.
- heroswatch: why two rung-2 runs read a desaturated non-mascot colour (the swatch's own
  pinning), so it cannot happen silently in a gate step.
- an `aGloss` census so rung judgements name the glossy props.
