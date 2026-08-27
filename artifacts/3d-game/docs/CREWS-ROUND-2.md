# CREWS — ROUND 2 (the record that survived)

**Status: RECONSTRUCTED, NOT VERBATIM. Nothing below has landed.**

Round 2 was launched against the owner's five decisions (verbatim in
OWNER-2026-08-25.md). Four crews finished proposals; all five skeptics and
the spawn-sky crew were killed by the session limit before ruling. Before
the limit lifted, the container restarted (the 10th recorded restart) and
took the workflow journal, the run cache, and the workflow script with it.
The verbatim proposals are gone. This file records what the governor
retained from reading the journal before the wipe, and it is labeled as
exactly that — a reconstruction. The round re-runs as ROUND 2B with this
file as the binding brief, the same way round 1B re-ran from the retained
skeptic corrections after the first journal loss.

The rule stands and is now twice-paid: **the record gets committed the
moment a workflow returns.** Round 2's journal was alive for hours while
the workflow sat blocked on the session limit. The record should have been
committed from the partial journal at the moment the limit hit, not after
resume. That is the correction, and it is why this file exists before any
round-2b agent starts.

---

## What was retained, per decision

### Decision 1 — light rig ("Yes make this crisp and the best possible game visually.")

Retained in full: a three-rung experiment ladder, each rung photographed
against the current five-world pack before the next is attempted, full
pack re-baseline per accepted rung.

- **RUNG 1** — prototype3d.ts:808: replace the literal `exposure: 1.0`
  with `exposure: LIGHT.exposure`, unlocking the per-world exposure values
  the rig has carried, unread, since the rig landed. Zero new draws, zero
  triangles, pure unlock.
- **RUNG 2** — island.ts:3894: `GLOSS_ENV = 5.0` → `6.5`. The refuted
  roughness-0.55 remedy (GOVERNOR.md) established the env term is the only
  specular signal under one directional light; this raises it where it
  already exists instead of pretending microfacets will save us.
- **RUNG 3** — a purpose-built 64×32 DataTexture vertical-gradient
  environment map through PMREMGenerator, replacing RoomEnvironment,
  intensity 0.15, with a K-parity kill gate: if any world's median tonal K
  moves more than the gate allows, the rung dies.

### Decision 2 — rival back-and-forth ("…if they're larger you go and consume
and come back right… If a void eats you it should be more punishing than 10
percent loss. Like a level loss")

Retained in outline only: the proposal targeted the softCap (~rivals.ts:840)
and hunter-only hardCap escapes (~:882–911); a bite from a strictly larger
void costs the player a FORM (level), not a percentage; kid-mercy stays
explicit (no spiral: post-bite grace, comeback edge); a lead-changes probe
measures that matches actually swing back and forth. Exact patch lost —
crew re-derives under this brief.

### Decision 3 — snowman yaw ("sure")

Retained in outline: alpine.ts snowmen share a fixed facing; give each a
seeded-safe yaw so no two stare down the same axis. Powder is on
Math.random (stream-safe), but the crew must still state the draw
accounting explicitly. Exact patch lost — crew re-derives.

### Decision 4 — spawn sky ("sure if you can make it beautiful")

No proposal ever existed (crew died on the session limit). Conditional by
the owner's own words: photographs first, owner sees them, nothing lands
without that. Crew produces patch + photograph plan.

### Decision 5 — sphere tessellation paydown ("absolutely")

Retained in outline: take ground under the 154-sphere roundlod baseline
(qa/roundlod.mjs ratchets DOWN only), targeting the worst offenders by
triangle cost without changing silhouettes at gameplay camera distance.
Exact patch lost — crew re-derives.

---

## Round 2B ground rules (binding on every crew and skeptic)

1. Proposals are exact patches: file, anchor lines, before/after code,
   seeded-draw accounting (mrnd/mr/mpick/mchance count deltas, Maple
   stream only), triangle cost, and the probe that will measure the claim.
2. Skeptics read the real files at the cited lines before ruling.
   Verdicts: SOUND / SOUND WITH CORRECTIONS / KILLED. A correction is
   written verbatim or it does not exist.
3. Nothing lands without a skeptic verdict. KILLED patches are recorded,
   not argued with.
4. Measurements are in MATCH time (the swiftshader clock runs 14–40×
   slower than wall). Probes pin quality rung 0 and measure the canvas,
   not a render target, when color is the claim.
5. The record commits the moment the workflow returns — and if the
   workflow blocks, the partial record commits at the moment it blocks.
