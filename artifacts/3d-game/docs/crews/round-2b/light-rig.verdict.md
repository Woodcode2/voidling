# VERDICT: SOUND WITH CORRECTIONS

Skeptic ruling on `docs/crews/round-2b/light-rig.proposal.md` (RUNG 1 only —
the RUNG 2/3 bodies did not survive and re-derive after RUNG 1's photographs;
nothing here rules on them). I tried to kill this proposal on every axis I
could find, including the one that would have been fatal by construction —
`LIGHT` scoping at the `RIG` declaration site — and the mechanism survived
every attempt. What did not survive is one of the proposal's stated
verification claims, its landed comment text, and the truncated half of its
evidence chain. Those are corrections, written verbatim below. None of them
changes the shipped behavior of the three hunks.

## What I checked on disk

All paths relative to `artifacts/3d-game/`. Every cited anchor re-read from
disk 2026-08-27; git history consulted where the claim was historical.

**1. The kill-grade scoping question — SURVIVED.**
`src/prototype3d.ts:772` is `const LIGHT = WORLD_LIGHT[pickedWorld];`.
`pickedWorld` is a module-level `const` resolved once from `?w=` /
`localStorage.voidWorld` at `:353-355`. Every world-switch path in the game
writes `localStorage` and then reloads the page — the picker card
(`:5844-5846`), the season ribbon (`:5869-5871`), and the end-screen unlock
button (`:4915-4917`) all end in `location.href = location.pathname`; there is
no code path that changes world within one module lifetime (`setWorld` at
`island.ts:147` is called exactly once, at `:356`). So `RIG` being a
module-level const built once is per-world-correct: one page load = one world,
and `RIG.exposure = LIGHT.exposure` evaluates to that world's table value on
every load. `LIGHT` (`:772`) is declared before `RIG` (`:794-809`) in module
order — no TDZ, and `WorldLight.exposure: number` (`:693`) types the
initializer. The patch does exactly what it claims.

**2. Before-text at all three anchors — EXACT.**
Patch 1's before matches `:750-751` character-for-character (two-space indent
included). Patch 2's before matches `:775-778` exactly, including the
back-tick `` `scene `` line-break artifact. Patch 3's before matches
`:807-809` exactly (`hemiI: 0.22,` / `exposure: 1.0,` / `};`), and that
three-line block is unique in the file.

**3. Per-world table values — ALL FIVE CORRECT.**
maple `1.0` (`:710`), pirate `1.0` (`:713`), gameday `1.12` (`:728`), powder
`1.18` (`:769`), lantern `1.42` (`:758`). The drifted comment "(1.34)" is at
`:750` as claimed. The `WORLD_LIGHT` block runs `:708-771`; `const
WORLD_LIGHT` occurs exactly once in `src/`.

**4. "Never once reached the renderer" — TRUE, verified in git.**
Commit `589e31e` (2026-08-16) introduced the `exposure` column, the lantern
value `1.34`, the "(1.34)" comment, AND the `ONE RIG` block with the literal
`exposure: 1.0` — all in the same commit. The raw-table-write era of
resetMatch ended in that same commit. `db428a3` (2026-08-22) retuned `1.34 →
1.42` without touching the comment (that is the drift) — and note `db428a3`'s
own text folds "exposure 1.42" into a measured crushed-black improvement,
which the inert column cannot have contributed to. So neither 1.34 nor 1.42
ever reached a frame, exactly as the proposal claims, and the wildness flag on
1.42 (tuned blind, no photographic evidence behind it) is even better
supported than the proposal states. The "+42% is 4.7x the largest accepted
exposure move" arithmetic checks against the ledger's toe-change ≤9%
(GOVERNOR.md).

**5. The single-writer claim — FALSE AS STATED; the behavior claim survives.**
`renderer.toneMappingExposure` has TWO write sites in `src/`:
`src/prototype3d.ts:326` (`renderer.toneMappingExposure = 1.0;`, the
construction default at renderer setup) and `:869` (inside `applyLightRig()`,
`:863-870`). The proposal's "(grepped: no other write site)" is therefore a
grep result that a grep does not produce. Functionally the rung still holds:
every entry path ends in `beginMatch` (`resetMatch:6459`; comment `:871-873`),
`beginMatch` deals the hour and calls `applyHour` (`:5392-5394`) which calls
`applyLightRig` (`:880`), so `:326`'s 1.0 is overwritten before the first play
frame; `#menu` is opaque over the interim (index.html:2044) and the only other
readers of `toneMappingExposure` in `src/` are the tone-mapping shader uniform
(`:283`) and nothing else — `grep '\.exposure' src/` returns exactly one line,
`:869`. Match-1/match-2 parity: `resetMatch` calls `applyLightRig` directly
(`:6455-6456`), `RIG` is const, hours vary `sunK`/dusk per match by design but
never exposure. Parity survives. This finding is correction-grade, not
kill-grade — but the false sentence may not land in a source comment in a repo
whose GOVERNOR.md rule 3 exists because a fabricated measurement shipped once
already, and the hard-coded ":869" would itself go stale the moment the three
hunks land (they add ~14 lines above it; STUDIO-ROUND-3.md already cites this
same statement at ":816", which is what hard line numbers in prose do).

**6. The probe — INCOMPLETE ON ARRIVAL, fragment verified.**
`qa/rigexposure.mjs` does not exist on disk; the surviving fragment cuts off
mid-loop, so as transcribed it cannot run, and no record of its claimed
pre-rung FAIL survived restart #11. I dry-checked the fragment's parsing
against the real file: the `const WORLD_LIGHT` anchor is unique; for each of
the five worlds the regex `w + ':\\s*\\{[\\s\\S]*?exposure:\\s*([0-9.]+)'`
lands on that world's own `exposure:` (the "(1.34)" comment cannot be matched
— it has no `exposure:` token and sits before the `lantern:` key), and it
still parses correctly after patch 1's replacement comment is inserted. The
completed probe is supplied verbatim as Correction 4, in the house style of
`qa/lightdrift.mjs` (which I read in full: it does read exposure live across
match 1 and 2, as the patch 3 comment claims — but its drift verdict at line
49 compares only `sun.i` and `hemi.i`, so it prints exposure and would not
flag exposure drift; Correction 5).

**7. Ground rules, owner, governor.**
CREWS-ROUND-2.md rule 1 requires seeded-draw accounting, triangle cost, and
the probe; all three fields are inside the truncation. Verified directly: the
three hunks are two comment edits plus one initializer change, zero calls to
`mrnd/mr/mpick/mchance/Math.random`, zero geometry — but the fields must be
restored to the record (Correction 6). RUNG 1 is character-for-character the
brief's RUNG 1 (`:808`, literal → `LIGHT.exposure`), which is the owner's
decision 1 as recorded verbatim in OWNER-2026-08-25.md, with the unlock banner
present in GOVERNOR.md's HANDS OFF list. Nothing refuted is repeated: the
refuted roughness-0.55 remedy is RUNG 2's territory and this proposal routes
around it exactly as the refutation directs (env term, not microfacets); the
retracted lantern-only ambient lift was a murk fix, and this proposal claims
no murk fix — it flags lantern's value as wild and gates it on the photograph
with a stated corrective (the table value, not the rig), which is the correct
direction per the ladder. Zero draws satisfies the environment facts.
GLOSS_ENV 5.0 confirmed at `island.ts:3894` for the ladder's later rung.

**Why not SOUND, and why not KILLED.** Not SOUND: a proposal whose probe
cannot run, whose record is missing three required fields, and which asserts a
grep result the grep contradicts cannot land as-is. Not KILLED: I went looking
for the fact that kills it — LIGHT resolved once against worlds changing
per match — and the fact is not there: worlds change only by full reload, so
the patch delivers per-world exposure with zero new state, zero draws, and
parity intact, and every number it puts in a comment is true on disk.

## Corrections (verbatim)

**Correction 1 — the proposal's patch 3 anchor paragraph.** Replace:

```
**anchor:** lines 807-809, the tail of const RIG (RIG opens at :794; hemiI:
0.22 at :807, exposure: 1.0 at :808). renderer.toneMappingExposure =
RIG.exposure at :869 is the ONLY writer (grepped: no other write site).
Verified on disk 2026-08-27
```

with:

```
**anchor:** lines 807-809, the tail of const RIG (RIG opens at :794; hemiI:
0.22 at :807, exposure: 1.0 at :808). renderer.toneMappingExposure has TWO
write sites on disk: the construction default `renderer.toneMappingExposure
= 1.0` at :326, and `renderer.toneMappingExposure = RIG.exposure` at :869
inside applyLightRig(). :869 is the only writer a player can ever see —
every entry path ends in beginMatch, whose applyHour calls applyLightRig
before the first play frame, and #menu is opaque over the interim — so the
rung holds, but ":869 is the ONLY writer" was wrong as stated. Verified on
disk 2026-08-27
```

**Correction 2 — patch 3's "after" block.** Replace the proposal's after
block with:

```ts
  hemiI: 0.22,
  /** UNLOCKED 2026-08-26 (owner decision 1, RUNG 1 of the ladder): the
   *  per-world exposure column in WORLD_LIGHT finally reaches the renderer.
   *  Table values on the day of the unlock: maple 1.0 and pirate 1.0 (both
   *  bit-identical by construction — the literal this replaced was 1.0),
   *  gameday 1.12, powder 1.18, lantern 1.42 (see the DRIFT note on the
   *  lantern entry). applyLightRig() is the only writer a player can see:
   *  the renderer-construction default (toneMappingExposure = 1.0, set where
   *  the renderer is built) is overwritten by beginMatch's applyHour before
   *  the first play frame, and the menu covering the interim is opaque. RIG
   *  is const and a world change is always a full reload, so match 1 and
   *  match 2 stay identical — qa/lightdrift.mjs reads it live, and
   *  qa/rigexposure.mjs asserts table == renderer, per world. */
  exposure: LIGHT.exposure,
};
```

This drops the stale-by-construction ":869", drops the false "only writer"
grep claim, and drops "FAILED on the pre-rung build" — a run whose record did
not survive and whose probe does not yet exist may not be cited as a past fact
in a source comment (GOVERNOR.md rules 2 and 3). The FAIL becomes a recorded
fact at land time via Correction 3 and lives in the landing commit message.

**Correction 3 — landing order.** Land `qa/rigexposure.mjs` (Correction 4)
first, run it against the pre-rung build, and record the observed FAIL
(expected: gameday, powder, lantern read 1.0 against 1.12 / 1.18 / 1.42) in
the landing commit message. Then land the three hunks and re-run to green.
This restores the "probe that FAILS before the fix" evidence chain that
restart #11 destroyed, and only after that run may the sentence "FAILED on the
pre-rung build in gameday, powder and lantern" ever be written anywhere.

**Correction 4 — the completed `qa/rigexposure.mjs`.** The surviving fragment
is preserved byte-for-byte; everything from the closing brace of the
expectation loop onward is the completion (measurement half in the house
style of `qa/lightdrift.mjs`; run from `artifacts/3d-game/`; note the
comma-joined `voidUnlocked` seed — the JSON form cost three screenshot runs,
per GOVERNOR.md):

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
}
console.log('table says:', WORLDS.map((w) => `${w} ${expected[w]}`).join('  '));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
let bad = 0;
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    // comma-joined, NOT JSON.stringify — the seed shape that hid four worlds
    // from seven probes in a row (GOVERNOR.md, the voidUnlocked retraction)
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  // MATCH seconds, not wall — swiftshader runs this clock 14-40x slow
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });
  const got = await p.evaluate(() => +window.__renderer.toneMappingExposure);
  const want = expected[wid];
  const ok = Math.abs(got - want) < 1e-9;
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${wid.padEnd(8)} table ${want}   renderer ${got}`);
  await p.close();
}
await b.close();
// silence is a FAIL — always print a verdict line (GOVERNOR.md, the gate rule)
console.log(bad === 0
  ? `RIGEXPOSURE: PASS — renderer matches WORLD_LIGHT in ${WORLDS.length}/${WORLDS.length} worlds`
  : `RIGEXPOSURE: FAIL — ${bad} of ${WORLDS.length} worlds render an exposure their table does not hold`);
process.exit(bad === 0 ? 0 : 1);
```

**Correction 5 — `qa/lightdrift.mjs` line 49.** The patch 3 comment leans on
lightdrift for cross-match parity, but its drift verdict compares only sun and
hemi — exposure is printed and never flagged. Replace:

```js
  const drift = first.sun.i !== second.sun.i || first.hemi.i !== second.hemi.i;
```

with:

```js
  const drift = first.sun.i !== second.sun.i || first.hemi.i !== second.hemi.i || first.exposure !== second.exposure;
```

**Correction 6 — the truncated ground-rule-1 fields, restored to the record.**
Append to the proposal:

```
## draws

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
```

— the skeptic, 2026-08-27
