# VERDICT: SOUND WITH CORRECTIONS — PROVISIONAL, ON-DISK ONLY (refute-hand; browser probes NOT run — box contended for the whole window)

Commit under refutation: a4f5bf6 (Maple teaches every time — ghost hand on teachDrag/dragDone/controlsLive).

## What I ran

## What I checked on disk

## Kill shots

## Corrections (verbatim)

<!-- appended 1: on-disk reads at HEAD bb89582, before any probe -->
### On disk (HEAD bb89582; `git log a4f5bf6..HEAD -- src/prototype3d.ts` checked below)
- `git show a4f5bf6 --stat`: ONE file, `src/prototype3d.ts` +25/-2, three hunks. The probe is a separate commit `d0ec95d` ("committed before its first run"), clean in `git status`. The diff is what the message says — nothing else rode along.
- **The toggle** `:9120` `handEl.classList.toggle('show', teachDrag && started && !ended && controlsLive && !dragDone)` is at animate's top level, NOT inside the `if (started && !ended && !paused)` block at `:8363` nor the `if (!ended && !paused)` at `:9073` — so it re-evaluates every frame including paused frames. `#hand` is `z-index: 8` (`index.html:246`); `#pause` is `z-index: 66` (`index.html:1476`) and covers it while the sheet is up.
- **`dragDone` is written in exactly ONE place**: `:2960` inside `joySet()`, gated `joy.mag > 0.25` (= 16 px of thumb travel at `JOY_R = 64`, `:2878`). `joySet` is reached only from the canvas `pointerdown` (`:2971`), window `pointermove` while `joy.active` (`:2985`), and `joyEdgeTick` (`:3005`). **The keyboard path never touches it**: `keydown` at `:3039` adds to `keys`, and the steer at `:8611-8616` reads `keys` directly. So a desktop child steering with WASD/arrows drives the void and `dragDone` stays false. (Pre-existing shape — `nomArmed` had the same hole — but the old hand only ever ran on the first match; this commit runs it on every Maple match.)
- **Reset**: `dragDone = false; controlsLive = false` at `:5563-5564` in `beginMatch`; `teachDrag = firstEver || pickedWorld === 'maple'` at `:5562` — evaluated PER MATCH inside `beginMatch`, not at module scope (the brief's item 5 is off by one function: the module-scope reads are `LIGHT :802`, `COPY :1444`, `BEATS :3705`, `MED_Q/HARD_Q :3470`).
- **`controlsLive` is written in exactly ONE place**: `:9297`, inside `if (introT > 0) { introT -= dt; … }` at `:9284`. That block is in the camera section, which is NOT gated on `paused` — `dt` is `Math.min(0.05, clock.getDelta())` and is not zeroed while paused, so the intro runs out behind a pause sheet and `controlsLive` flips there; harmless. `introT` is assigned only at `:5410` (init 0) and `:5553` (`COPY.introLen`); every world's `introLen` is 2.2–3.6 (`:1298,1354,1385,1408,1430`) so the block always runs. If a world ever shipped `introLen: 0`, `if (introT > 0)` would never enter, `controlsLive` would never flip and the hand would never show on that world — a latent trap, not a live one.
- **Exit paths**: `endMatch :4822 ended = true`; `doQuit :6648 started = false; ended = true` + `body.menu` (CSS `:248` hides `#hand`). Both kill the toggle the next frame.
- **The ladder still keys on `firstRun`** (= `firstEver`, `:5560`): DRAG pill + `announce('🍽️ eat everything…')` at `:9298-9314` (`introT <= 0 && firstRun && !dragTaught`), the nag at `:9102` (`firstRun && … && !nomArmed`), danger/turned-tables beats at `:9127` (`firstRun && … && nomArmed`). FIRST NOM at `:5268` keys on `nomArmed && !localStorage.voidFirstNom` — `nomArmed = !firstEver` (`:5567`) so a returning child has it armed, but `voidFirstNom` is already banked. None of the four reads `teachDrag`.
- **Two symmetric edges of `teachDrag`**: a first-ever child on Pirate gets the hand (`firstEver ||`) — same as before; a returning child on any non-Maple world does not.
- **World switch is a full navigation everywhere**: `:5013`, `:5942`, `:5967` all `location.href = location.pathname`; only `id === pickedWorld` calls `launchWorld()` in-page (`:5938`). `pickedWorld` is a `const` at `:355`.
- **Probe geometry**: `qa/mapleteach.mjs` drags (215,500)→(300,560): 104 px = `joy.mag` 1.0 (clamped) ≫ 0.25. Its `t > 5` is `matchLen - matchClock`; `matchClock` ticks only when `started && !ended && !paused` (`:8363`) with the same capped `dt` the intro uses, so match-t ≥ 5 implies intro elapsed ≥ 5 > 2.2 (Maple) and > 3.6 (max). The wait is honest.
- Build: `find src -newer dist/index.html` empty; :4177 serves `assets/main-BlHCCMf5.js`, the file in `dist/` (built 00:13 UTC after a4f5bf6 at 22:58). :4177 IS this commit.

<!-- appended 2: probe plan, written before any run; box busy (another agent holds /tmp/gpu.lock since 09:51, load 4.06, 11 chromium) so runs are queued behind it -->
### Probe plan (scratchpad `hand_refute.mjs`, three modes, run one at a time under the GPU lock)
- `stay` — Maple + history, six pages: idle / tap-without-drag / 12 px drag (mag 0.19) / KeyD held / pause+resume / quit-to-menu+return. Hand sampled at match-t 5, 8, 15, 30, 60; void displacement recorded to prove the keys really drive; then a real 104 px drag as the control, which must clear it.
- `intro` — Maple + history, per-rAF recorder of hand.show against `__matchState().t`; the first t at which the hand shows is compared to `introLen` 2.2. One run with real renders + canvas screenshots at t 0.8 and 3.2, one with the renderer stubbed (finer dt).
- `ladder` — Maple FRESH, Maple HISTORY, Pirate HISTORY, Pirate FRESH: guide pill texts, `#banner` texts, `.vf` floats matching NOM, hand transitions, `voidPlayed`/`voidFirstNom` before and after, driving continuously from t>6 to t>45.
- plus the shipped `node qa/mapleteach.mjs 4177` verbatim.

<!-- appended 3 (final, 09:57 UTC): cut off by the orchestrator before the box went quiet -->
## What I ran — the honest list
- `git show a4f5bf6` (full diff), `git show a4f5bf6 --stat`, `git log a4f5bf6..HEAD -- src/prototype3d.ts` (two later commits, 592e9a3 and 0efda23, both 23:0x UTC, both before the 00:13 dist build; neither touches the hand lines — read at HEAD).
- `find src -newer dist/index.html` → empty; `curl :4177/` → `assets/main-BlHCCMf5.js` = the file in `dist/`; `grep` of that bundle finds `VT=t||hn==="maple",P5=!1,mw=!1,pw=!1` next to `ni=Mo.introLen` — the three-flag reset IS in the served build.
- `cat /proc/loadavg; pgrep -c chrom; ls -ld /tmp/gpu.lock` at 09:51, 09:55, 09:56: load 3.0 → 4.3 → 3.9, 11 chromium processes throughout, `/tmp/gpu.lock` held by another agent since 09:51:22. The brief says never run a probe under contention, so NO browser probe of mine ran. `qa/mapleteach.mjs` was NOT re-run by me. The scratchpad probe `hand_refute.mjs` (three modes, described above) is written and untested.
- **Every number in this file is a file:line or a git/curl/grep result. There are no measured match-clock numbers here because none were measured.**

## Kill shots (attempted)
1. **The hand that never leaves — FOUND ON DISK, not measured.** `dragDone` has one writer, `:2960` inside `joySet()`; `joySet` is reached only from the canvas pointer path (`:2971`, `:2985`, `:3005`). The keyboard steer (`keydown :3039` → `keys`, consumed at `:8611-8616`) never sets it. A child steering with WASD/arrows on Maple drives the void for the whole match with the figure-8 hand on screen, every Maple match, until `ended`. The old build had the same hole in `nomArmed`, but only on the first match ever; this commit makes it every Maple match on a keyboard. A tap-without-drag or a sub-16 px wiggle also leaves it up — that is the design (the lesson is unlearned) and I do not count it. Pause: the toggle at `:9120` is outside every `!paused` gate, `#hand` z-index 8 sits under `#pause` z-index 66, so it is covered while paused and returns on resume — not a strand. Quit: `doQuit :6648` sets `started=false; ended=true` and `body.menu` (CSS `index.html:248` hides `#hand`) — not a strand. Intro running out cannot strand it: the intro is what ENABLES it.
2. **The hand during the intro.** `controlsLive` has one writer, `:9297`, inside `if (introT > 0) { introT -= dt; … }`; it flips on the frame `introT` crosses 0. Before that frame the toggle's `controlsLive` term is false. On disk the hand cannot show during the establishing shot. NOT confirmed by a frame — the `intro` probe did not run.
3. **The first-run ladder.** All four once-in-a-lifetime beats still key on `firstRun` (= `firstEver`): DRAG pill + banner `:9298-9314`, nag `:9102`, danger/turned-tables `:9127`; FIRST NOM `:5268` on `nomArmed && !voidFirstNom`. None reads `teachDrag`. On disk: a fresh profile gets all of them on any world; a returning child on Maple gets only the hand. NOT confirmed by a run — the `ladder` probe did not run.
4. **The probe's honesty.** `t > 5` is `matchLen - matchClock`, ticked only under `started && !ended && !paused` (`:8363`) with the same `dt` the intro consumes (`introT -= dt`, `:9285`), so match-t 5 implies ≥ 5 s of intro elapsed against 2.2 (Maple) / 3.6 (max) — always past `introLen`. Its drag is 104 px = `joy.mag` 1.0 vs the 0.25 bar (16 px). The second half is not decoration for the pointer path: a build where the hand shows but ignores a real pointer drag fails it. It is blind to the keyboard path (kill shot 1) — that is a gap in coverage, not a false pass.
5. **`pickedWorld`.** `const` at `:355`; every world switch is `location.href = location.pathname` (`:5013`, `:5942`, `:5967`) — a full navigation — and same-world taps call `launchWorld()` in-page. Stable. The brief's premise is slightly off: `teachDrag` is evaluated per match inside `beginMatch` (`:5562`), not at module scope; the module-scope reads are `LIGHT :802`, `COPY :1444` (whose `introLen` feeds `introT`), `BEATS :3705`, `MED_Q/HARD_Q :3470`. The day a world switch is not a reload, those four go stale before `teachDrag` does.

## Corrections (verbatim)
C1 — `src/prototype3d.ts:3039`, so a keyboard steer counts as the drag the hand is waiting for:
```
- window.addEventListener('keydown', (e) => { if (started && MOVE_KEYS.includes(e.code)) { keys.add(e.code); lastInput = tClock; } });
+ window.addEventListener('keydown', (e) => { if (started && MOVE_KEYS.includes(e.code)) { keys.add(e.code); lastInput = tClock; dragDone = true; } });
```
(`dragDone` is declared at `:5431`, below this line, as a `let` — same hoisting situation as `nomArmed :5435`, which this handler's neighbour `joySet` already writes; the listener runs after module init so the TDZ is not crossed.)

C2 — `qa/mapleteach.mjs`: add a third leg after the Maple pointer run, same seed, Maple, `page.keyboard.down('KeyD')` at t > 5 and `hand` must be gone by t > 7; without it C1 has no probe that fails before it (Rule 2).

## What stays owed
The three browser probes in `hand_refute.mjs` (stay / intro / ladder) and a verbatim re-run of `qa/mapleteach.mjs`, on a quiet box. Until they run, kill shots 2 and 3 are source claims, and this verdict is provisional under Rule 1.

## Governor's browser run (2026-09-02 14:52-14:56 UTC, quiet box, GPU lock held, :4177 = HEAD 59d53cd build)
`node qa/mapleteach.mjs` (the shipped probe, verbatim), exit 0:
```
  MAPLE  with history: hand SHOWN, after a drag: gone
  PIRATE with history: hand absent
MAPLETEACH: PASS — Maple teaches every time, the drag ends it, and no other world nags
```
This is the verbatim re-run the skeptic listed as owed. Kill shots 2 and 3 (the
hand during the intro; the first-run ladder) remain source-level claims — the
skeptic's stay/intro/ladder probes were never run. C1 (keyboard steer counts as
the drag) and C2 (its probe leg) land with the round-5 batch.
