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
- **2026-09-03 11:40-14:50 UTC — materials and light (Stream B), governor-run.** No
  agent. Three builds shot at SEED=7 on one fixed spot per world (`qa/lookpair.mjs`),
  K = median Rec.709 luminance (`qa/kmetric.mjs`), the mascot's mean colour at r=3
  (`qa/heroswatch.mjs`), rulings pre-registered before the numbers existed
  (`materials.proposal.md` §Pre-registration). **RUNG 2** (`GLOSS_ENV` 6.5) stays: K
  within 1.6% of before on all five worlds, mascot dE ≤ 1.5, a subtle sheen at play
  distance. **RUNG 3** (neutral gradient environment, gain 1.0) killed by its own 4% gate:
  Maple K 128 → 115 (−10.2%), Pirate 111 → 88 (−20.7%); `ENV_MODE` back to `'room'`.
  **13 saturated reds** lifted to a 0.10 second/dominant ratio (24 sites, six files),
  measured as `after`: K parity on every world, mascot dE ≤ 2.1; `qa/albedo.mjs` in the
  push gate with 11 unlit/meaning colours allowed by name and site. Two measurement traps
  found and recorded, confounded frames kept beside the clean ones: a rival's body and
  ring in one half of a pair (Lantern "−6%" → 47 → 47 once `HIDE_RIVALS=1` hid the family
  at the shutter) and a rival's appetite (Maple "+3.9%" was one canopy eaten before the
  shutter; noise floor on one build K ±0, re-shot 128 → 128). Verdict SOUND WITH
  CORRECTIONS.
- **14:46-15:00 UTC — gate on the materials build:** `node qa/gate.mjs --profile=push --port=4177`
  on a quiet box: **PASS, 16/16** (the 16th is the new `albedo` guard; log in
  `materials-data/gate-materials.log`). main fast-forwarded to this commit.
- **2026-09-03 15:33-20:40 UTC — the first frame (Stream D), instrument then studio.**
  `qa/firstframe.mjs` shoots the establishing shot across its swing (six moments per
  world, page and canvas, match-time stamped) and the two screens before it at seven
  viewports, measuring the "THE CUTE" line against the real pixels behind its glyphs.
  The owner's complaint reproduced two ways before any review: on his own frame
  (THE CUTE 3.46:1 median, 1.72:1 against the face's highlights; 12px text, bar 4.5:1)
  and on our build at Safari-sized viewports (3.51:1 at 440x814, 1.82:1 at 393x700); the
  doubled title is prototype3d.ts:1464 filling the loader's name line with the app's name.
  The studio workflow (`briefs/firstframe.workflow.js`, 17 agents) reached 7 of 8 reviews
  and then **hit the account session limit** (reset 19:50 UTC): the seven skeptics, the
  hero review, art direction and the order of work never ran. The seven reviews survived
  because each author pushed its own file the moment it was written (`qa/_record.sh`) —
  the rule from the round-5 launch, now proven. The container restarted during the wait
  and the workflow journal went with it; a continuation script
  (`briefs/firstframe-continue.workflow.js`) refutes the recorded seven from disk and runs
  the rest (20:37 UTC).
- **2026-09-03 20:30-23:5x UTC — the first frame (Stream D), governor-finished.** The studio's
  continuation refuted five of the eight reviews and then ran out of usage credits; the
  governor refuted the other three himself (every cited line opened) and implemented. What the
  pixels found first: **Pirate Bay's establishing shot held its opening quarter on a hotel that
  no longer existed.** `qa/_bigprops.mjs` says six of Pirate's thirteen r≥7 props were retired
  the instant a match started — the Royal Mariner, the fort, the lighthouse and four more —
  because this round's own settle pass retires whichever of a clashing pair was dropped later
  and Pirate scatters its palms before it drops its landmarks. Authored landmarks are now
  spared (f6c210b): 13 of 13 survive, at a cost of four footprint overlaps (paired SEED=7).
  Then the owner's two splash complaints, both measured before and after against the real
  pixels behind the glyphs: **"THE CUTE" 3.51:1 → 10.50:1 at 440×814, 1.09:1 → 8.16:1 at
  375×667** (his own frame measured 1.72:1), and the loader no longer prints the game's name
  twice. And the opening: the HUD is dark for the length of the move on all five worlds
  (census, hud 0 → 1 at u0), the title card rides the upper third and its length is now each
  world's own `introLen + 0.45` (2.65 / 2.65 / 3.85 / 4.05 / 3.95 s), the ghost hand waits a
  beat, nobody speaks over the shot, and the loading bar shows five values instead of one.
  Verdict and the six things deliberately not done: `firstframe.proposal.md`.
- **2026-09-04 00:23-00:52 UTC — gate on the first-frame build:** `node qa/gate.mjs
  --profile=push --port=4177` on a quiet box: **PASS, 17/17** (the 17th is the new `splash`
  step, six phone viewports; its first run failed on its own sampler and was fixed, not
  loosened). main fast-forwarded to this commit.
- **2026-09-04 01:30-06:00 UTC — purpose (Stream A2), the harder half of placement.** The
  owner: "every chat bubble, every person moving, there's got to be a purpose behind that."
  `qa/purpose.mjs` measured what a townsperson actually does: **7-23% of moving people ever
  completed a journey in thirty seconds, the median walked eleven units for one unit of
  progress, and everyone turned a full circle every three and a half seconds.** The pictures
  are 300-970 scribbles, each tied to the spot that person was born on. A five-design panel
  (three judges each: a child's eye, the engine at 966 movers, an author) chose the smallest
  design — a destination is a POINT, not a prop — because the code settled it: Maple's 70
  "destinations" are all houses in one three-block corner and nothing in `src/` tags a stall,
  a bench or a table at all. **Its own skeptic then found three fatal defects in the chosen
  patch** (arrival never scheduled the next leg, so the crowd would have frozen; a stored
  pose mode of 0 falls into the dance branch; a pose set on arrival is never cleared when the
  void interrupts, freezing the legs of somebody fleeing) — all three verified against the
  source and fixed before anything was typed. After, paired on the same instrument with the
  before build verified errand-free: **travellers 51/50/53/64/94%, drift 0.50/0.62/0.95/0.99/0.98,
  turning down from ~100°/s to 1-10°/s**, and Maple's placement row bit-identical, so no
  seeded draw was added. Verdict and four recorded corrections to my own work — including a
  paired run that compared the same code to itself — in `purpose.proposal.md`.
- **06:40 UTC — gate on the purpose build:** `node qa/gate.mjs --profile=push --port=4177`
  on a quiet box: **PASS, 18/18** (the 18th is the new `purpose` step, all five worlds,
  1614s). main fast-forwarded to this commit.
- **2026-09-04 08:00-11:48 UTC — the newsroom (round 5), the writing itself.** The owner: *"the
  news is so bad. The style. The two sentences."* Two probes already read this corpus and both
  called it clean, because both read POOLS. `qa/newsfeed.mjs` records the SEQUENCE a child
  actually meets — brand, headline, in order, on a real match — and applies three bars a
  sequence can fail that a pool cannot: **a repeat inside one match, a run of the same opening
  word, a token reaching the child as braces.** It found Lantern Night repeating itself inside
  twenty cards, and **both thin worlds airing from only three pools, because only three
  existed**: `qa/_newscensus.mjs` put Lantern at 237 lines and Powder at 229 against Maple's
  558, with NO per-meal pool and NO LIVE pool on either — an absence both files' headers
  described as the design. **208 new lines** were written to each paper's own voice (the
  market's courtesy announcement; the closures desk's list), cut down by a voice judge who
  condemned seventeen by name and wrote the replacement for each, then wired in: the pickers
  weight ~34% district / 22% what-it-just-ate / 28% live / 16% general, `usable()` finally
  gates `{S}` on every pool rather than GENERAL alone, and the anti-repeat memory goes 6 → 14.
  **The gate then failed on the step this stream added, on a world it never touched** — Game
  Day aired *"The rulebook…", "The dog…", "The band…", "The smoker…"* back to back — so a drone
  guard went into all five newsrooms and every world came back at a run of 2. Paired at
  `--cards=20`: lantern 19 distinct with 1 repeat and 3 pools → **20 distinct, 0 repeats, 6
  pools**; powder 3 pools → **6**, with more than a third of every feed now coming from copy
  that did not exist that morning. Corpus 237 → 355 and 229 → 337. **Five corrections, four to
  my own work**, in `newsroom.proposal.md` — chief among them an apply script that reported six
  fixes while five of them had deleted the bad line and inserted nothing.
- **11:48 UTC — gate on the newsroom build:** `node qa/gate.mjs --profile=push --port=4177` on a
  quiet box: **PASS, 20/20**, 3,639s (the 19th and 20th are `newsfeed` at 284s and `newsstyle`
  promoted from the live profile). The run before it was **FAIL, 1/20 — on `newsfeed`**, the
  step this stream added, on Game Day, a world the stream never touched. main fast-forwarded to
  this commit.
