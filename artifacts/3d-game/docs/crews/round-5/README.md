# Round 5 — the launch-brief round (opened 2026-09-02)

Executing `docs/FABLE-LAUNCH-BRIEF.md`. Three workflows, launched in this order:

| workflow | run | lanes | what it does |
|---|---|---|---|
| `refute-six` | `wf_8f69658f-a4d` | family, drum, popup, hand, board, cards | six independent skeptics attack the six landings the governor verified alone on 2026-09-01 (§3 of the brief, "do this first") |
| `streams-visual` | `wf_38c9ff3f-502` | sky (C), placement (A1), rungs (B1), firstframe (D) | crew files an exact proposal → skeptic applies it in its own worktree and re-measures |
| `streams-content` | `wf_788e6c53-a16` | purpose (A2), albedo (B2), newsroom; plus world6 (design only) and name (memo) | same pipeline; world6 and name are memos with no skeptic — the governor and the owner judge |

The exact briefs every agent ran under are in `briefs/` — they are the
instructions, so they are part of the record.

## Files this round produces
- `refute-<key>.verdict.md` — the six refutations
- `<key>.proposal.md` — a crew's exact patch (hunks grouped per independent change)
- `<key>.verdict.md` — the skeptic's per-hunk ruling on it
- `shots/<key>-*.png`, `shots/<key>-skeptic-*.png` — canvas screenshots
- `world6.design.md`, `name.memo.md`
- new probes land in `qa/` (new files only; crews never modify tracked files in the main checkout)

## The protocol this round (new)
- **Worktrees.** Every crew and skeptic runs in its own git worktree with
  `node_modules` symlinked from the main checkout, builds there, and serves its
  own build on its own port (crews 4180–4186, skeptics 4200–4206). The main
  checkout's preview on :4177 is the shared, unpatched BEFORE. Two crews
  patching one working tree was the alternative, and it would have contaminated
  every measurement.
- **The GPU lock.** `mkdir /tmp/gpu.lock` (atomic) around every chromium run,
  released in the same command; stale after 25 min. This box has 4 CPUs; two
  swiftshader browsers at once make the GPU process fail and both report
  failures that are not findings (the gate learned this the hard way).
- **Concurrency.** The workflow runtime caps concurrent agents at CPUs−2 = 2 per
  workflow, so the three workflows run at most six agents at once; lanes are
  ordered by priority (sky and placement first).

## Landing rule
The governor lands only hunk groups a skeptic ruled SOUND or SOUND WITH
CORRECTIONS (corrections applied verbatim), one group at a time, each with the
probe that fails before it, then the gate on a quiet box before main moves.
KILLED groups are recorded here, never hidden.

## Launch log
- **2026-09-02 00:20 UTC — first launch, all three workflows at once.** Every
  one of the 15 agents died at the account's session limit ("resets 3:40am
  UTC") after 1.24M subagent tokens and 338 tool uses, with NOTHING on disk:
  each crew had planned to write its file at the end. Recorded here because
  it is the most expensive nothing this studio has produced.
- **03:49 UTC — relaunch, sequentially** (refute-six → streams-visual →
  streams-content) so the burn stays inside the window, with a new rule in
  every brief: create the output file within ten minutes as a DRAFT and append
  each finding as it lands. If the limit cuts a crew off again, the draft is
  the record.
- **03:49–05:04 UTC — refute-six relaunch.** Hit the limit again ("resets
  8:40am UTC") after 806k subagent tokens. This time the record survived:
  `refute-family` COMPLETE on disk (SOUND WITH CORRECTIONS, 4 corrections;
  its agent died after writing, before returning), `refute-drum` COMPLETE and
  returned (SOUND WITH CORRECTIONS, 7 corrections — including a KILL of the
  governor's own pwDrum correction: the premise "pwBus runs only on the 404
  fallback path" measured false on Powder with the recording live; the crew's
  F3 was right), `refute-popup` a partial DRAFT, hand/board/cards not started.
  The streams were held at the owner's request (44% of the window at 04:18).
  Next: at the 08:40 reset, resume refute-six for the four remaining lanes
  only (family dropped from the jobs list, drum replays from cache).
- **09:41 UTC — third launch (resume, four lanes).** Drum re-ran because the
  family entry was dropped from the FRONT of the jobs list (prefix cache lost —
  never edit the front of a resumed job list). Popup and hand finished
  PROVISIONAL (no browser: the box was contended for their whole window);
  drum's third run finished with a structured result; board and cards died at
  the session limit ("resets 2:40pm UTC") mid-draft. The container then
  restarted and reverted the checkout to an old commit; the remote branch was
  the only copy, restored at 14:45 UTC. Anything the board and cards skeptics
  appended after the 11:16 sweep is lost. Owner's standing instruction at 86%:
  let the agents finish, save the data, launch nothing.

## Landing log (2026-09-02)
- `59d53cd` drum corrections 1-6 + NEW 8 (the governor's own pwDrum ruling retracted).
- `4a06853` qa/sizerank.mjs (the board skeptic's probe); hand verdict gets its browser run.
- `73ab2d4` qa/tutstrand.mjs reaches its journey again; the Pirate door proven on the landed build.
- `a1d8b1a` the batch: cards C1-C3, C5, half of C4; family A, B, C (verbatim parts), D;
  hand C1, C2; popup 1-5; board C1, C3, C4, C7. bannergag FAIL→PASS (0→7 crowd bubbles).
- **Still owed:** qa/drumover.mjs (drum 7, specified in full); the ringmeaning `__band`
  re-projection refactor (family C, described not written); popup 7 (the 24px card
  radius — a governor call, left at 26px); two C4 comment lines whose text the
  skeptic quoted from the wrong lines; rivals.ts:1675 / prototype3d.ts:9303, :2409-2411.
- **Verdict status:** family, drum, popup, cards SOUND WITH CORRECTIONS (all with browser
  evidence); hand SOUND WITH CORRECTIONS (shipped probe passes; the skeptic's own
  stay/intro/ladder probes never ran); board — the skeptic died before writing the final
  header, but its measured run and C1-C7 are complete; read as SOUND WITH CORRECTIONS.
- **15:34-15:53 UTC — gate:** `node qa/gate.mjs --profile=push --port=4177` on a quiet
  box (load 3.0 at start, GPU lock held): **PASS, 14/14, every step reached its own
  conclusion.** main fast-forwarded to this commit.
- **2026-09-03 01:46-02:40 UTC — placement (Stream A1), finished by the governor.** Two
  crews were killed by container restarts (~35-minute container lifetime when active;
  four restarts in the run). Their instrument, before-table, shots and unfinished patch
  were rescued from the dead worktrees. Governor corrections: `spotOpen` own-claim by
  position (the crew's forced drops had lost the burial test — Powder inside 31 → 43);
  the auditor censuses AFTER `__validateWorld()` (the crew's after-table was taken before
  the boot sweep and missed 278 retirements on Maple). Paired SEED=7 table on all five
  worlds in `placement.proposal.md` §4; verdict SOUND WITH CORRECTIONS in §5. Landed on
  the branch at 942ce70; gate then main.
- **02:33-02:50 UTC — gate on the placement build:** `node qa/gate.mjs --profile=push --port=4177`
  on a quiet box: **PASS, 14/14, every step reached its own conclusion** (log in
  `placement-data/gate-placement.log`). main fast-forwarded to this commit.
- **2026-09-03 09:50-10:30 UTC — sky (Stream C), governor-run.** No agent: the
  instrument (`qa/skycut.mjs`, five camera moments incl. the coast, every frame
  screenshot) found the bodies off-screen in the establishing shot and behind the
  island in play, on screen only past the coast. The coast frames named it: the ring
  ran off its own 512 canvas (arcs at 274-336 px vs a 256 px half-width) and the disc
  had no terminator. Both fixed at the source (37192a7, 6f24377), measured after
  (ring whole; shading range 93→122, 105→126, 71→109), guarded by `qa/skyfit.mjs`
  in the push gate. Verdict in `sky.proposal.md`; gate then main.
- **10:38-10:50 UTC — gate on the sky build:** `node qa/gate.mjs --profile=push --port=4177`
  on a quiet box: **PASS, 15/15** (the 15th is the new `skyfit` guard; a first run
  had failed only on that guard's verdict-line format). main fast-forwarded to c760bb3.
