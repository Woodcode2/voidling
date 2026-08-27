# ROUND 2B — crew:light-rig proposal (salvaged)

**Provenance:** the round-2b workflow (run wf_1b9f5d43-458) completed its four
crews at ~10:30 UTC 2026-08-27; all four skeptics and the sphere-paydown crew
died on the session limit. Before the limit lifted, restart #11 destroyed the
journal, the run cache, the workflow script, and the task output file. The ONLY
surviving copy of any round-2b output is the completion notification relayed
into the governor's conversation, which carried this proposal near-verbatim and
truncated the rest. Transcribed from that notification. `&lt;` relay-encoding
has been decoded back to `<`; nothing else touched. The truncation point is
marked. The other three proposals (rival-loop, snowman-yaw, spawn-sky) are lost
in full — their crews re-run.

**Status: PROPOSAL ONLY. No skeptic has ruled. Nothing here has landed.**

---

## decision (crew's own framing, verbatim)

Decision 1 — "Yes make this crisp and the best possible game visually." The
light rig is UNLOCKED (GOVERNOR.md banner, 2026-08-26). Proposing the retained
three-rung ladder as three separate patches, each with its own probe, each
photographed (qa/shippedlook.mjs pack, all five worlds) before the next is
attempted. A rung the photographs reject dies and the later rungs still stand
on their own anchors. RUNG 1 answers the brief's question directly:
LIGHT.exposure holds, per world, verified on disk — maple 1.0 (:710), pirate
1.0 (:713), gameday 1.12 (:728), powder 1.18 (:769), lantern 1.42 (:758).
Expected renderer exposure delta: maple 0%, pirate 0% (bit-identical by
construction — the literal being replaced equals their table value), gameday
+12%, powder +18%, lantern +42%. LANTERN'S VALUE IS FLAGGED AS WILD: its own
comment at :750 says 1.34 while the value at :758 is 1.42 — comment/value
drift on a number that has never once reached the renderer — and +42% is 4.7x
the largest exposure movement ever photographed and accepted in this repo (the
toe change's <=9%). It ships to the photograph as authored (the rung is the
unlock, not a retune), Lantern is judged first, and if the pack rejects it the
corrective is the TABLE VALUE, not re-locking the rig. Note ACES compresses:
+42% pre-tonemap light is well under +42% frame luminance, and the lantern
comment says blooming pools toward white is the intent. Side expectation worth
checking, not claiming: the ledger's toe table shows gameday's dead-channel
reds RECOVER G/B at higher exposure ((202,0,8) at k=1.5 vs (230,43,32) at
k=2.2), so +12% should move the flat-red finding in the right direction — the
art-profile gates read it after the reshoot.

## title

The light-rig ladder: exposure unlock, GLOSS_ENV 6.5, gradient environment

## patch 1 — src/prototype3d.ts

**anchor:** lines 750-751, the lantern entry's exposure comment inside
WORLD_LIGHT (entry itself at :757-759, exposure: 1.42 at :758) — verified on
disk 2026-08-27

**before:**
```ts
  // Exposure runs high (1.34) so the lantern pools bloom out toward white
  // while the shadows still have somewhere to go.
```

**after:**
```ts
  // Exposure runs high so the lantern pools bloom out toward white while the
  // shadows still have somewhere to go. DRIFT, recorded at RUNG 1 (2026-08-26):
  // this comment said 1.34 while the value below holds 1.42 — and NEITHER had
  // ever reached the renderer, because RIG pinned exposure to a literal 1.0
  // from the day the rig landed. 1.42 is what the unlock ships to the
  // photograph; +42% is the largest exposure move in this repo's history, so
  // if the pack rejects Lantern the corrective is THIS VALUE, not the rig.
```

**why:** RUNG 1, hunk 1 of 3. The brief demands: if a world's rig value is
wild, say so — Lantern's is, and in two ways (magnitude, and a comment that
disagrees with its own value by 0.08). Numbers in comments are load-bearing in
this repo (GOVERNOR.md rule 3); leaving '(1.34)' beside a 1.42 that is about
to go live for the first time plants a false measurement. The drift is
recorded rather than silently corrected.

## patch 2 — src/prototype3d.ts

**anchor:** lines 775-778, the 'ONE RIG, APPLIED IN ONE PLACE' narrative above
const RIG — verified on disk 2026-08-27

**before:**
```ts
// THE GAME WAS LIT DIFFERENTLY ON EVERY MATCH AFTER THE FIRST, in all four
// worlds, and had been for as long as resetMatch has existed. The rig is built
// here from three numbers that are not in WORLD_LIGHT — a hemisphere pinned at
// 0.22, the key paid back by 1.31, exposure at 1.0 — and `scene
```

**after:**
```ts
// THE GAME WAS LIT DIFFERENTLY ON EVERY MATCH AFTER THE FIRST, in all four
// worlds, and had been for as long as resetMatch has existed. The rig WAS built
// here from three numbers that are not in WORLD_LIGHT — a hemisphere pinned at
// 0.22, the key paid back by 1.31, exposure at 1.0 (exposure has since been
// handed to the table — owner decision 1, 2026-08-26; see RIG.exposure) — and `scene
```

**why:** RUNG 1, hunk 2 of 3. After hunk 3, 'The rig is built here from three
numbers that are not in WORLD_LIGHT' is flatly false — exposure IS from
WORLD_LIGHT. The history stays (it is a paid-for measurement narrative); one
tense change and a parenthetical keep it true.

## patch 3 — src/prototype3d.ts (THE RUNG)

**anchor:** lines 807-809, the tail of const RIG (RIG opens at :794; hemiI:
0.22 at :807, exposure: 1.0 at :808). renderer.toneMappingExposure =
RIG.exposure at :869 is the ONLY writer (grepped: no other write site).
Verified on disk 2026-08-27

**before:**
```ts
  hemiI: 0.22,
  exposure: 1.0,
};
```

**after:**
```ts
  hemiI: 0.22,
  /** UNLOCKED 2026-08-26 (owner decision 1, RUNG 1 of the ladder): the
   *  per-world exposure column in WORLD_LIGHT finally reaches the renderer.
   *  Table values on the day of the unlock: maple 1.0 and pirate 1.0 (both
   *  bit-identical by construction — the literal this replaced was 1.0),
   *  gameday 1.12, powder 1.18, lantern 1.42 (see the DRIFT note on the
   *  lantern entry). applyLightRig() at :869 is still the only writer, so
   *  match 1 and match 2 stay identical — qa/lightdrift.mjs reads it live.
   *  qa/rigexposure.mjs asserts table == renderer, per world, and FAILED on
   *  the pre-rung build in gameday, powder and lantern. */
  exposure: LIGHT.exposure,
};
```

**why:** RUNG 1, hunk 3 of 3 — the rung itself. The rig has carried per-world
exposure values since it landed and RIG pinned the renderer to a literal 1.0,
so the column was inert (prototype3d.ts:720 area records the measurement;
GOVERNOR.md HANDS OFF entry, now unlocked). Replacing the literal with
LIGHT.exposure is the smallest change that makes the authored values real:
zero new state, the single write site at :869 unchanged, match-1/match-2
parity preserved because RIG is const and applyLightRig is the only writer on
both paths. Maple and pirate render bit-identically (1.0 == 1.0), so the two
baseline daylight worlds double as the rung's own control group in the
photograph pass.

## patch 4 — qa/rigexposure.mjs (new file) — TRUNCATED IN THE ONLY SURVIVING COPY

The crew's probe: parses the per-world exposure expectations OUT OF THE REAL
SOURCE (never a snapshot table; throws if the `const WORLD_LIGHT` anchor
moves), then measures `renderer.toneMappingExposure` live in each world with
the match clock running, and passes only when table == renderer per world. It
FAILS on the pre-rung build in gameday, powder and lantern (1.0 vs 1.12 /
1.18 / 1.42) — a probe that fails before, as required. The surviving verbatim
text cuts off inside the file's expectation-parsing loop:

```js
// RUNG 1's NUMBER: does the renderer's tone-mapping exposure equal the
// per-world column in WORLD_LIGHT?
//
// The rig carried a per-world `exposure` column since it landed, and RIG
// pinned the renderer to a literal 1.0, so the column never reached a frame.
// Owner decision 1 (docs/OWNER-2026-08-25.md) unlocked the rig; RUNG 1
// replaces the literal with LIGHT.exposure. This probe FAILS on the pre-rung
// build — gameday, powder and lantern read 1.0 against a table that says
// 1.12 / 1.18 / 1.42 — and passes only when the table value is what the
// renderer actually applies, measured live in each world with the match
// clock running (waits are on __matchState().t — MATCH seconds, not wall).
//
// The expectations are PARSED FROM THE REAL SOURCE, never copied here: a
// snapshot table describes the build it was written against forever
// (GOVERNOR.md rule 4), and this THROWS if the anchor has moved.
//
//   node qa/rigexposure.mjs [port] [worlds]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const PORT = process.argv[2] || '4177';
const WORLDS = (process.argv[3] || 'maple,pirate,gameday,lantern,powder').split(',');

const src = readFileSync('src/prototype3d.ts', 'utf8');
const at = src.indexOf('const WORLD_LIGHT');
if (at < 0) throw new Error('anchor moved: `const WORLD_LIGHT` not found in src/prototype3d.ts');
const block = src.slice(at, src.indexOf('\n};', at));
const expected = {};
for (const w of WORLDS) {
  const m = block.match(new RegExp(w + ':\\s*\\{[\\s\\S]*?exposure:\\s*([0-9.]+)'));
  if (!m) throw new Error(`anchor moved: no exposure for "${w}" inside WORLD_LIGHT`);
  expected[w] = parseFloat(m[1]);
// ── TRUNCATION POINT — remainder of the file, and the proposal's draws/
//    triangles/probe/risks fields, did not survive the restart ──
```

The measurement half of the probe is reconstructed by the governor (not the
crew) at land time and is subject to the skeptic like everything else. RUNGs 2
and 3 (GLOSS_ENV 6.5; gradient PMREM environment with K-parity kill gate) were
in the proposal's title and the committed brief but their patch bodies did not
survive; they re-derive after RUNG 1's photographs.

---

## draws (restored per the skeptic's Correction 6)

Zero. The three hunks are two comment edits and one property-initializer
change (`1.0` → `LIGHT.exposure`); none calls mrnd/mr/mpick/mchance or
Math.random, so the Maple mulberry32 stream position is untouched.

## triangles

Zero. No geometry, no materials, no draw calls.

## probe

qa/rigexposure.mjs (completed text in the skeptic's verdict, Correction 4):
parses per-world expectations from the real source, throws if the
`const WORLD_LIGHT` anchor moves, measures renderer.toneMappingExposure live
per world with the match clock running, exits non-zero on any mismatch. Must
be landed and observed to FAIL on the pre-rung build (gameday/powder/lantern)
before the hunks land. qa/lightdrift.mjs (with Correction 5) covers
match-1/match-2 exposure parity; qa/shippedlook.mjs photographs all five
worlds for the ladder's accept/reject, Lantern judged first.
