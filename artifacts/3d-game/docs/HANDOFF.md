# THE CUTE WORLD ENDER — engineering handoff

Written to survive a context reset. If you are picking this up cold: read this
file top to bottom, then **`docs/MENU-BRIEF.md`** (the stream you are most likely
here to build), then `docs/GOVERNOR.md` rules 1–7, then `docs/FABLE-BRIEF.md`
(instruments + traps). **Measure before you change anything.**

Last updated: **2026-09-10**, at day 1 of the menu stream on `claude/menu-ladder-0wt288`;
`main` (production) is at `3cf26dc`, deployed and READY.

---

## 0. START HERE — the menu and the ladder

The owner's current ask (2026-09-10): *"the menu is still the same looking … plan
an exceptional menu … each level had different goals … making our splash image
alive … 3 choices."* The plan exists and is grounded: **`docs/MENU-BRIEF.md`**,
with the round's verbatim evidence in `docs/crews/round-8/` (readers, concepts,
judges, and the four skeptic verdicts). It is one stream, seventeen crew-days,
each day ending with the push gate green. **Read the brief's §9 before §3–§5:**
draft 1 was killed by the child's lens (it gated a dot on a WIN) and draft 2 is
built on **finish advances, win decorates** — every bar in the brief is already
corrected, and §9 keeps the old bar beside the new one.

**How the work is done here (the operating model that produced the last nine
commits):** the governor writes the brief with numbered bars and file:line
pointers; the crew (Opus, high effort) builds and runs the probes; the governor
gives the skeptic verdict; nothing merges to `main` without
`node qa/gate.mjs --profile=push` green. Every fix is preceded by a probe that
**fails on the old build** — the failing run is the evidence.

**The first message to give a fresh session is at the end of this file (§11).**

---

## 1. What this is

A hole.io-style 3D game for children aged roughly 6–11. You are a small purple
void with a face. You roll around a world swallowing things; everything you
swallow makes you bigger; in three minutes you eat a whole town while an
in-world newsroom reports your progress and five family members race you.

The owner's stated goal: **a top-10 game in the Apple App Store.** He playtests
on a real iPhone with his young daughter — her reactions are the highest-value
signal in the project. He reads numbers and plain language, not code.

### The name (settled 2026-08-23, do not relitigate)

| where | value | why |
|---|---|---|
| App Store listing | **The Cute World Ender** | 20 chars (limit 30); "cute"/"world" earn free search weight |
| Home-screen label | **World Ender** | 11 chars — fits untruncated. Set via `capacitor.config.ts` `appName` |
| The creature | **voidling** | species, first form, family lore — unchanged everywhere in-game |
| Bundle id | `com.voidling.game` | invisible to users, painful to move. Stays. |

"Voidling" alone collides with a live App Store game; the alternates were
checked and rejected. Do not reopen.

---

## 2. Standing directives

These persist across sessions. They are not suggestions.

- **Ship via git push only. NEVER deploy manually to Vercel.** Push to `main`
  = production deploy. The owner has given standing permission to push `main`.
- **Nothing reaches `main` without `node qa/gate.mjs --profile=push` green** (35
  steps, ~40 minutes; run it from `artifacts/3d-game` with the preview server
  up). Read the last lines for `GATE PASS`. Docs-only commits are the one
  exception. *One of 34 steps was once run and called "the push check"; it let a
  world-picker card a child could not read reach production. Run the profile.*
- **Work on the branch the session names**, then fast-forward `main` after the
  gate: `git checkout main && git merge --ff-only <branch> && git push`. Never
  rewrite history on `main`.
- **Never bypass CDN egress blocks.** Asset requests 403 in the sandbox; the
  production domain cannot be curled from here. That is expected and correct.
  Never disable TLS verification, never unset `HTTPS_PROXY`.
- **Keep every model identifier out of anything pushed** — code comments,
  commit bodies, docs, PR bodies. Chat replies only. Use the attribution trailer
  the session harness specifies, verbatim, plus its `Claude-Session:` line.
- **Do not open a pull request** unless explicitly asked.
- **The void is a creature and is refined, never replaced by a hole.** Owner:
  "You're not replacing our void with a hole correct. If anything he should be
  further refined into higher quality as well."
- **No ads, no ad-skip currency, no timers that pressure, 4+ stays 4+**, a
  parental gate on any spend.
- **Camera shake is ZERO by owner order** (`fx.kick`/`fx.shake`/`camPunch` are
  no-ops at the source). `hitStop` stays.
- **Spawn and the opening are hand-authored and identical every load**
  ("consistency is key here"). Match 1 of a fresh profile is always the shipped
  baseline (`src/game/matchdeck.ts`).
- **Powers stay OFF** (`POWERS_ON = false`).
- Music/SFX licence rule: CC0 / Public Domain / Pixabay / Kenney / Mixkit /
  Sonniss only. Never invent a source URL. The owner supplies tracks.
- **Verify with screenshots or measurements before claiming anything is done.**
  A number in a commit message is evidence to every later reader; every number
  you write down must be one you actually ran (`GOVERNOR.md` rule 3).
- **Corrections are recorded, never hidden.** When a claim turns out wrong, say
  so in the next reply and in the file that carried it.

### Owner communication style (learned the hard way)

- **Plain language, no jargon.** "The camera was kicking 141 times a minute"
  lands; "the bite-ratio gate lacked a refractory" does not.
- **Numbered steps with who does what** when he asks about process.
- **When he reports a feel problem, he is right about the symptom even when the
  instruments disagree.** Suspect the instrument, then widen it.
- Lead replies with what changed and the measured before → after. He asks for
  TLDRs; give them.

---

## 3. Tech stack

- **Three.js 0.185.1**, TypeScript, Vite. No game engine, no React in the game
  (`index.html` holds all HUD + menu markup and CSS; the retired React shell in
  `src/App.tsx` etc. is not the game).
- **Capacitor 8** for the iOS shell (`ios/`, `capacitor.config.ts`).
- **Supabase** edge function for telemetry; every harness stubs
  `**/functions/v1/ingest-events`. Store build collects nothing identifying by
  default (kids-privacy audit done).
- **Playwright + Chromium** at `/opt/pw-browsers/chromium` for all QA.
  Flags: `--no-sandbox --use-gl=angle --use-angle=swiftshader`. The sandbox
  renders at ~1 fps; **never quote harness frame timing as the game's** — sample
  against `__matchState().t` (match seconds).
- **Vercel** deploy, project `voidling-3d-game`
  (`prj_ze1DPbXacEkmrZfk3x5ZckmzMwr0`, team `team_ByRJQ00dRUtDHwQcg6YSELTz`),
  production alias `voidling-3d-game-ruby.vercel.app`. Push to `main` → build →
  READY in ~40 s. Verify with the Vercel MCP `get_deployment`; the sandbox
  cannot curl the production domain.
- Repo `woodcode2/voidling`; **the game is `artifacts/3d-game/`** — every
  command below runs from there.

### Commands

```bash
cd /home/user/voidling/artifacts/3d-game
npx tsc --noEmit -p tsconfig.json          # typecheck (3 s)
npm run build                              # vite build (~4 s) — the preview serves dist/
node qa/gate.mjs --list                    # what the push profile runs
node qa/gate.mjs --profile=push            # THE pre-merge gate, 35 steps, ~40 min
node qa/<probe>.mjs [world|all] 4177       # most probes take world then port
SEED=7 node qa/placement.mjs all 4177 --ceiling=qa/placement.baseline.json
```

**The preview server dies constantly.** Keep it alive as a background task:

```bash
cd /home/user/voidling/artifacts/3d-game && while true; do npx vite preview --port 4177 --strictPort >/tmp/claude-0/preview.log 2>&1; sleep 2; done
```

Run it with `run_in_background: true`. Check
`curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4177/` before
diagnosing anything else. **Rebuild `dist/` after every source change** — the
gate's preflight refuses a `dist/` older than `src/`.

**Never run a second Chromium while the gate runs.** It contends for the
software GPU and either probe can die with "GPU process isn't usable"; a
reproduction attempted alongside a gate run is not evidence of anything.

---

## 4. Code map

| file | what |
|---|---|
| `src/prototype3d.ts` (~11k lines) | Boot (`createIsland` is a top-level await at `:1733`), render loop `animate()` (`:9467`–`:10957`, renders every frame, **also behind the menu**), match loop, HUD, camera (`:10488`), growth law, beats, forms, trophies, economy, shop, daily, `validateWorld()` + `settleFootprints()` (`:7042`), debug hooks (`_dbg.__*`, `:1969`–`:2100`) |
| `src/proto3d/island.ts` (~8.8k) | Ground bake, sky, coastline, water shaders, and the populate block per world (`WORLD_ID === '<id>'`). Placement gates `drop()`/`dropGlb()` per world |
| `src/proto3d/bay.ts` | **The shared placement hash** for all worlds: `spotFree` (scatter), `spotOpen` (burial), `claimSpot`, `scatterInRegion`, `pointInRegion` (ear-clip + area sampling) |
| `src/proto3d/footprint.ts` | `groundFootprint(root)` — the ground slice below `GROUND_H`, measured the way `qa/placement.mjs` measures it. **One definition of "the ground a prop covers"**, shared by the placement gate, the settle pass, and the auditor |
| `src/proto3d/rng.ts` | `mulberry32`, per-scatter streams, `STALL`/`CAP`, the ask ledger (`window.__scatterAsks`) |
| `src/proto3d/life.ts` (~6.9k) | Crowds: people, movers, flee/greet, all spoken lines, per-world set pieces |
| `src/proto3d/audio3d.ts` (~4.4k) | Six recorded tracks + synth fallback, channels, crossfades, the cover pad, the first-gesture unlock |
| `src/proto3d/void3d.ts` | The hero: body, face rig, moods, rings, skins (`setMood`, `chomp`, `setRadius`) |
| `src/proto3d/rivals.ts` | The family: archetypes, lanes, join times |
| `mainstreet.ts` `bay.ts` `gameday.ts` `lantern.ts` `powder.ts` `skyfield.ts` | Per-world land + region polygons |
| `luxe.ts` `nightmarket.ts` `alpine.ts` `tailgate.ts` `skylark.ts` | Per-world prop kits |
| `newsroom_*.ts` | Per-world headline pools; `newsroom_react.ts` = reactions |
| `src/game/matchdeck.ts` | Per-match variation deal (middle beats + hour); match 0 = baseline |
| `src/game/{unlocks,seasons,stickers}.ts` | World unlock ladder (finish-to-open, never a wall, grandfathering), seasonal events + the menu ribbon, sticker book |
| `src/proto3d/store3d.ts` | StoreKit bridge |
| `index.html` | All CSS + HUD + menu markup (`#menu` at `:1942`, its CSS at `:846`) |

### The coordinate system

`SCALE = 0.05`, world centre `(6000, 6000)`, so `w(v) = (v - 6000) * 0.05`.
Level files author in **world units** (0..12000); the renderer works in 3D
units (world = 3D × 20). **Screen-up is not north**: `camOffset = (0.62, 0.92,
0.62)`, so to put something *d* units straight up-screen, offset by `d/√2` in
**both** axes.

### Growth

`growRadius(R, eR) = min(12, sqrt(R² + 0.5·eR²·rookie·diminish))` — area-based,
so **R² is the correct progress axis**. `R_CAP = 12`, `START_R = 0.9`, growth is
clock-bound (`lawCap`). Edible when radius `< voidR * 0.92`.
`FORM_MIN = [0, 1.6, 2.5, 3.6, 5.5, 8.0, 13.5]`.

---

## 5. The six worlds

| # | world | theme | par | hero landmark |
|---|---|---|---|---|
| 1 | **MAPLE FALLS** 🍁 | sleepy autumn town | 80,000 | town hall |
| 2 | **PIRATE BAY** 🏴‍☠️ | pirate island turned resort | 105,000 | The Royal Mariner |
| 3 | **GAME DAY** 🏈 | college football Saturday | 175,000 | the stadium |
| 4 | **LANTERN NIGHT** 🏮 | spirit night market | 150,000 | the bathhouse |
| 5 | **POWDER PASS** ❄️ | mountain village on a snow day | 45,000 | The Lodge |
| 6 | **SKYLARK FIELD** 🎈 | a balloon meet before they all go up | 35,000 | the hangar (the whale is tethered; see MENU-BRIEF §8.2) |

Worlds unlock by *finishing* the one before (`src/game/unlocks.ts`). Maple is
the first-ever launch (no menu on run one — deliberate). **Lantern has one
authored hour** (the night is that world); every other world has three.

**Every per-world table must have six rows keyed by `WorldId`.** A five-world
table is how world 6 shipped unreachable, un-timed in a probe, and without a
baseline in another. `qa/worldlists.mjs` (push) now catches arrays, unlock
strings **and objects** keyed by world; `qa/worldreg.mjs` reads the picker
markup. Read authored values off the page (`_dbg.__introLen()`,
`_dbg.__authored()`) — never keep a second copy in a probe.

---

## 6. Systems that exist (and their rules)

**Placement** (stream A1, closed 2026-09-10): every prop claims the **ground it
covers** (an oriented rectangle from `footprint.ts`), not its eat radius; the
settle pass at boot asks "buried?" with **both** the bounding box and the
ground slice; the off-island cull tests the ground centre, not the origin; the
spawn-corridor clearing runs **before** the burial sweep. `qa/placement.mjs`
(frozen ceilings in `qa/placement.baseline.json` — lower a number when you fix
something, never raise one without the owner), `qa/rng.mjs` (every scatter
places what it asked, seeded), `qa/settle.mjs` (a second sweep retires nothing)
are all in the push profile and all green on six worlds.

**Match variation** (`matchdeck.ts`): match n deals two middle beats + an hour;
match 0 is the shipped baseline every probe measures. Gate: `qa/vary.mjs`.

**The economy** (owner-designed): coins (✦) everyday, gems (💎) rare and earned
only in play; no bundle SKU; gem spends never touch the parental gate. Daily
streak has no cliff. Trophies pay once. `qa/econ.mjs` asserts all of it.

**Forms ladder:** `VOIDLING → MUNCHKIN → GOBBLIN → CHOMPOSAURUS → COLOSSUS →
WORLD ENDER → VOID TITAN`. **The family:** NIBBLES (bully), BIGSHOT (showoff),
JELLY (coward), ECHO (copycat), GRUMPS (hoarder).

**Audio:** six recorded tracks (menu + 5 worlds) mastered to house spec; a
drumless cover pad bridges decoding; the synth score is only the 404 fallback.
No sound before the first trusted gesture (browser rule).

**The daily quest board is RETIRED by owner decision** (2026-09-06); its kinds
become the SET level's counters. `QUEST_POOL` and `#quests` are removed on day 6
of the menu stream, not hidden.

---

## 7. The QA kit

`artifacts/3d-game/qa/` — ~110 named probes plus ~340 `_`-prefixed
investigation scripts (kept as evidence; not run by any profile). The gate:

| profile | when | what |
|---|---|---|
| `push` | before every merge to `main` | 35 steps: typecheck, smoke:maple, econ, placement, rng, settle, pickerfit, splash, worldlists, worldreg, deadpaint, opening, faceparity, newsfeed, … |
| `live` | before anything reaches production after a big change | everything, six worlds |

**Silence is failure.** A probe that prints no `PASS —`/`FAIL —` line is a FAIL
("the probe did not reach its own conclusion"). Two probes were red for this
reason and nobody knew, because nobody ran the whole profile.

The ones that matter most now:

| probe | answers |
|---|---|
| `gate.mjs --profile=push` | **the pre-merge gate** |
| `placement.mjs <world|all> <port> --ceiling=…` | no prop on a road, in the sea, inside a wall; frozen ceilings |
| `rng.mjs all <port>` (SEED=7) | every scatter placed what it asked; no pass placed zero |
| `settle.mjs all <port>` | the burial sweep is idempotent |
| `pickerfit.mjs <port>` | every line on the world cards clears 4.5:1 |
| `firstframe.mjs <port> [worlds]` | the boot, splash, menu and establishing shot as evidence; `--splash` is the gate step |
| `smoke.mjs <world> <port>` | boots, loads, grows, eats, makes sound |
| `vary.mjs <port> [worlds]` | match 2 ≠ match 1; reads the authored truth off the page |
| `worldlists.mjs` | no probe believes in fewer worlds than exist (three shapes) |
| `shippedlook.mjs <port> <world> <tag>` | what the CANVAS shows — the only probe that can see a pipeline swap |
| `lookbook.mjs` | the studio's evidence pack — teams may not review a surface they have not seen rendered |

### Traps — every one of these has cost a session

1. **The cwd trap.** Background Bash resets to `/home/user/voidling`. Every
   backgrounded command needs `cd /home/user/voidling/artifacts/3d-game && …`.
2. **Background sleeps return immediately.** A `sleep 900` launched in the
   background and then read is *not* fifteen minutes of waiting. Use a
   `Monitor` on the output file, or `until` loops, and read the verdict from
   the log.
3. **Self-matching pgrep.** Bracket a character (`qa/[e]con`).
4. **Probes must seed `voidUnlocked`** with all six worlds, or a locked card
   refuses the tap by design and the probe hangs.
5. **Python `replace()` edits that print "done" unconditionally are not
   edits.** `assert s.count(OLD) == 1` before every replace, then grep after.
6. **Zombie Chromium** starves later probes into timeouts. `pgrep -f
   'chrome-[l]inux/chrome'` and kill before diagnosing a hang. **Bracket a
   character in the pattern.** `pkill -f` matches the FULL COMMAND LINE of
   every process, so an unbracketed pattern matches the shell that carries it —
   and the terminal invoking it, and this file's own reader. The gate's
   between-step cleanup was written unbracketed and therefore killed itself
   before its second line ran, so from the day it was written until 2026-09-11
   it never once killed a browser (`qa/_day4_straytest.sh` is the failing run).
   Four tool calls died to the same trap while diagnosing it.
7. **A probe's own waits are sized; Playwright's defaults are not.** Every wait
   in `qa/firstframe.mjs` is 300-400 s because a world takes 10-40 s to build
   here — but `page.screenshot()` carries Playwright's 30 s default, and a
   full-page capture of a live canvas at DPR 3 measured **26.2 s on an idle
   box**. It passed alone and went red inside the gate, twice, on builds that
   were fine. `gate.mjs`'s step timeout had already been raised once for the
   same symptom one level up. When a probe goes red on a timeout, ask what the
   INNER default is before believing the build.
8. **The sandbox renders ~1 fps.** Sample against `__matchState().t`.
9. `preserveDrawingBuffer` is off — screenshot, then decode the PNG in-page.
10. **A single-world probe run and that world inside an `all` run can differ
   even at SEED=7.** Compare like with like. The placement baseline's own header
   records which categories drift and by how much.
11. **Suspect the instrument when it disagrees with the owner.** Then widen it.
12. **A monitor that only emits on success is silent on failure**, and silence
    looks like "still running". Cover the failure signatures too.
13. **Guessing the cause three times is slower than tracing once.** The last
    placement bug was solved only when the loop was made to say what it did
    (`window.__settleTrace`). When two readings of the code disagree, instrument.

---

## 8. Where things stand (2026-09-10)

**Live on `main` (`3cf26dc`)**, all measured, gate 35/35:

| | |
|---|---|
| placement audit | green on all six worlds for the first time; Pirate `inside` 4 → 0 |
| props in the sea | four retired across six worlds (the cull tested origins, not footprints) |
| Pirate's beach | six lifeguard towers sometimes placed **zero**; now first; 98.5 → 99.3% placed |
| the world picker | Skylark's tagline was 4.24:1 (a card a child cannot read); now 5.6:1, every card up |
| the gate itself | `deadpaint` could not say PASS; `rng` had no seed; `worldlists` missed object tables; `fresh` mislabelled its FAIL |
| probes reading the game | `firstframe` and `vary` kept five-world copies of authored data; both read it off the page now |

**In progress: the menu and the ladder** — `docs/MENU-BRIEF.md` draft 2,
seventeen crew-days, §6 is the order.

**Day 1 is DONE (2026-09-10): the baseline exists, in `MENU-BRIEF.md` §2.9.**
`qa/menuframe.mjs` is the instrument; the verbatim runs are in
`docs/crews/round-8/menuframe-day1-{menu,match}.log`. What it found, in plain
language:

- **72–92% of today's menu frame is the half-rate shadow pass**, on every
  world. The diorama's own scene costs about **+120 draw calls**. The change
  already written into the brief at §2.7 — shadow pass every 4th frame on the
  menu — is worth five to twelve times what the diorama costs, so it is the
  first thing day 9 lands and the diorama is affordable on its back.
- **Where the camera LOOKS is the biggest authored decision in the stream.**
  At one point, azimuth alone swings the bill 2.7x on Pirate and 11.5x on
  Lantern at rung 3. `a0` must be authored per world off the day-1 series.
- **The costly place is the SPAWN point, not the low camera.** At the framing
  §2.3 asks for, the menu gets CHEAPER than today's on four of five worlds
  (Game Day 0.38–0.50x, Skylark 0.47–0.68x, Powder 0.71–0.94x).
- **A number in the source was wrong and is now annotated.**
  `prototype3d.ts:10613` says the opening frame is 4,694 draw calls / 1.40M
  triangles. Re-taken: Game Day's opening is **337 / 221k** — the shadows-off
  line beneath that comment is the fix the comment describes. The frame that
  costs ~4,694 today is late play at r 12 (Game Day 4,978, Lantern 6,436).
  **This matters downstream:** §2.8.3's bar was to be set against "the
  in-match r=12 pair" believing that to be ~1,241; it is 2,280–6,436, so the
  bar as written does not bite and day 9 must re-set it.

Day 1's two guards also landed, each failed first on a build without them:
`pickerfit` now FAILS on a picker short of `ALL_WORLDS.length` cards (the old
probe prints "PASS — ... all 5 world cards" on a build with Skylark's card
deleted), and `firstframe` FAILS on a missing `#menu` selector instead of
silently skipping it.

**Day 2 is DONE (2026-09-11): the thirty goals are set from measurement,**
`MENU-BRIEF.md` §3.4a. Thirty matches, six worlds, five seeded runs each on a
virtualised clock, plus twelve hunting runs. Evidence in
`docs/crews/round-8/goalcurve-day2-*.log` and the raw per-second series in
`qa/out/goalcurve/*.json`. In plain language:

- **Dot 3 (LANDMARK) was unwinnable on every world and is now fixable.** Growth
  is back-loaded — radius ~2.8 at a quarter of the clock, ~4 at half, ~5.1 at
  three quarters, 10-14 at the buzzer — so a hero landmark at r 6.5-11 is edible
  only in the last 13-18 seconds, and Skylark's resolves to the tethered whale
  needing R 16.22 against a law that tops at 12. Fix: dot 3 names a mid-tier
  building at r 5.5-6.0, which every world already carries untagged. ~45 s of
  slack instead of 13.
- **CLEAR at 100% was wrong AND its evidence was wrong.** A competent run
  devours 49-84% of the world. CLEAR set at 30% lands at ~70% of the clock.
- **The autopilot cannot set a SET goal.** It eats nearest-first: 484 snacks and
  ZERO houses by 70% of the clock. `DRIVE_KIND` hunts a kind and eats 40. The
  binding constraint is when a kind first becomes edible, not the count — on
  Maple the first house is 75 s and the fifth is 76 s.
- **The boss the owner asked for already exists and fires.** NIBBLES peaks at
  1.56-1.74x the player, charges 3x a match, and is edible ~120 s of 181. But
  the marquee meal is p50 1 / **p10 0** — one run in three misses her even with
  a perfect driver, so the 0.3%/s sag needs tuning before it can gate a dot.

**Day 3 is DONE (2026-09-11): the ladder exists and it is the owner's gate.**
`src/game/levels.ts` — thirty dots, five states (`locked / open / fin / done /
clear`), states that only ever rise, `current(world)` a pure function of that
world's row rather than a stored frontier, and `recordLevelResult` in which
**only a goal MET opens the next dot** (§8.1, the owner's decision). Migration
derives from `isUnlocked()`, so the ~40 QA seeds read as "goal 1 open in every
listed world" and no seed had to be touched. `level_*` telemetry, `?g=` and the
`voidPlayGoal` cross-reload channel. `qa/levels.mjs` (a)(e)(f)(g)(i), written
first and failing. Bar (e) — "is every one of the thirty goals winnable on the
island that actually exists" — caught three of the numbers in this crew's own
table before they shipped: gold at 8-10 is arithmetically impossible (20 gilds a
match against the 3N rule caps it at 6), Skylark's 40 vans needed 240 props on an
island carrying 98, and the gild supply had been read on the menu, where it is
always zero because `gildTreasure()` runs inside `beginMatch`.

**Day 4 is DONE (2026-09-11): the goal is on screen, and the ending stopped
nagging.** `LEVEL_SPEC` per world, the goal object set in `beginMatch` before
`armed`, the goal card carrying the LEVEL's line, the `#goal` HUD chip on the
5 Hz cadence, the `questEvent` `'big'` dedupe, the five §3.1 goal hooks, and
`qa/levels.mjs` (b) and (c). Before → after on the same probe: **66 findings →
0**. What it found on the shipped build, in plain language:

- **The goal card and the drag lesson were talking over each other.** On the one
  frame the card unrolled, the ghost hand was already up — 1 of 1 sampled
  states. `beginMatch` turns the controls live at arm and never sets the hold
  that the hand's own comment says exists for this. The brief asked for the card
  to be suppressed under the hand; that would have meant no Maple player ever
  sees it, because Maple teaches the drag on every match. Fixed on the hand's
  side: card, settle, lesson, the order the code always claimed.
- **The last thirty-five seconds were a countdown to losing.** Red clock, "⏰ 35
  SECONDS — EAT FASTER!!", a hot red 3-2-1 with the pitch climbing — written for
  a match where finishing IS the progress, and measured firing on **every** level
  run with the goal unmet (309-369 frames hot per fifteen-second match). It now
  keys on goal state, and it took TWO flags: the nag (clock colour + banner) goes
  whenever a level's goal is unmet; the celebration (hot numerals + rising tick)
  keeps its one exemption, RIVALS at #1, where the countdown is the bell to a
  win. With one flag the nag rode in on the exemption and fired at t ≈ 0.
- **A cranked match with the renderer live is not affordable.** The first run of
  (c) was still cranking a fifteen-second match after nine minutes and was
  killed — upwards of 25 s of wall per cranked match-second under swiftshader.
  With `renderer.render` and the composer stubbed for the crank (nothing in (c)
  reads a pixel) the same match takes **34 s**. Whole part: 236 s.
- **The goal card never fires on an AUTO_START match**, because its timer only
  runs in the armed idle and `AUTO_START` starts the match from a microtask. Right
  for the game, load-bearing for any probe of the card — and a code comment
  claiming the opposite has been retracted in place.

Day 4's gate: **PASS 36/36** (`3d8b414`), 5,779 s. The `levels` step went
394 s → 661 s carrying the two new parts, inside its re-sized 1,800 s timeout.

One more thing day 4 measured, after that gate: **the goal chip was overlapping
the clock on tablets.** `#timer`'s type is `clamp(26px, 8vw, 40px)`, so its
bottom edge moves with the viewport — 47 / 54 / 60 / 60 px at 360 / 430 / 834 /
1024 — and the chip had been parked at a flat 58 px picked off a 430 px phone.
It cleared by 11 px and 4 px on phones and **overlapped by 2 px on both
tablets**. The clock's top and type are now declared once on `:root` and the
chip sits at `--timer-bottom + 6px`, so it tracks the clock instead of a
transcribed number: **7-8 px of air at every width**. `qa/chipfit.mjs` (promoted to a registered bar on day 12) is the
measurement (a scratch diagnostic, not gate-registered — the multi-viewport
geometry bar belongs to day 12, where the brief already plans the viewport
pass). **The branch tip carrying this CSS is NOT yet gate-green**; the last
green build is `3d8b414` and the next full run covers days 4 and 5 together.

**Day 5 is DONE (2026-09-12): a level can now be won, and lost without
punishment.** `goalMet()` beside the buzzer with the `outroT <= 0` first-writer
guard, `endMatch(result)`, `recordLevelResult` above the solo return,
`completeWorld` on the solo path, the quit path, and the landmark exclusion.
`qa/levels.mjs` (h) and (b)'s goal-met half. Measured, before → after:

- **A met goal ends the match on the spot.** Before: the goal was met and the
  match ran on to the buzzer, ending at clock **-0.61**; the dot read `fin` and
  the next one stayed `locked`. After: the match ends with **59.24 s still on the
  clock**, maple dot 1 rises `open → done`, dot 2 opens, one match counts as one
  attempt, and `level_win` fires exactly once.
- **The nag is gone from inside a level entirely.** Day 4 let `goal.met` turn the
  ritual back on; day 5 is what made that wrong, because a met goal now ends the
  match and `started` stays true through the two-second outro — so the one frame
  a child won on would have turned the clock red and fired EAT FASTER at her.
- **The family may no longer take the prop dot 3 asks for.** `reserved` joins
  `departed` and `tethered` in the rivals' own off-the-menu predicate
  (`rivals.ts:460`), which covers all four of their scan and swallow sites in one
  clause instead of three of four.
- **MY FIRST VERSION OF THAT BAR PASSED FOR THE WRONG REASON, and the probe said
  so.** The hook plants an oversized rival on the landmark; the family's size law
  (`softCap = max(min(START_R + 0.02t, 1.6), pr*0.80)`) runs every frame before
  the swallow loop and clawed it from **r 5.63 back to r 1.30**, so the barn
  survived dot 3 because the rival was never capable — not because of the
  exclusion. This is the exact trap MENU-BRIEF §5.2 (h) records against draft 1's
  version of the bar, and the first build of it walked straight in. The bar now
  reports the rival's REAL radius and fails when it is under the line, and the
  run uses `?r=8` so the cap lifts through the game's own law rather than by
  exempting anyone from it. Verified by deleting the exclusion and rebuilding:
  the family ate the barn on dot 3 in 20.1 s (`levels-day5-h-before.log`).

**Day 6a is DONE (2026-09-12): the ladder is on the end card, and a live bug
was found underneath it.**

- **`src/proto3d/pips.ts`** is the single renderer for the whole ladder — five
  states, inline SVG symbols, one definition that is crisp at 28 px in a row and
  96 px as a headline. MENU-BRIEF §4.4 asked for a bitmap sprite sheet from a
  `qa/icons.mjs` that does not exist; SVG needs no art delivery, no request, and
  takes its colours from the stylesheet where every other colour in this game is
  decided. The menu's six rows (day 7) use the same module.
- **The headline is the picture.** A 96 px pip with the word under it at 13 px:
  the tick on a win, the come-back arrow on a miss, never a cross and never a
  word first.
- **THE RESULTS CARD NEVER OPENED ON THE MATCH THAT UNLOCKS A WORLD.** A bare
  `return` inside the unlock branch — comment: "the skin nudge waits for a match
  that did not just open a world" — leaves `endMatch()`, and
  `endEl.classList.add('show')` is **sixty lines below it**. Measured
  (`qa/_unlockcard.mjs`): seeded with Maple only, one match to the buzzer —
  `#end` `.show` **false**, `voidUnlocked` "maple,pirate", the unlock panel and
  its confetti fully rendered *inside a hidden card*; control with every world
  open, **true**. That is five matches in every child's life, and they are the
  five biggest. Fixed by not entering the branch instead of returning from the
  function.
- **The card was twelve things and is now seven.** The owner, on seeing it:
  "keep it simple right. We're working with kids." Looked at rather than
  reasoned about (`qa/_endshot.mjs`): it had grown standings, a riddle about a
  sticker she did NOT find, four stat tiles, a drop orb, a shop nudge and the
  daily board. On a level it now answers four questions — did I do it, where am
  I, what did I get, what is next — with the grown-up's numbers behind one
  toggle in the lowest slot, the standings only on a RIVALS dot, and the shop
  door never winning the "what next" slot from the ladder. `levels.mjs` (d)
  counts the blocks, so the twelfth addition has to argue with a number.
- **One button, one meaning.** CONTINUE after a win, TRY AGAIN after a miss.
  Draft 1 had both, and under the win gate `current(world)` after a miss IS this
  dot — so they launched the identical match.

**Deferred, deliberately:** the daily quest board's full retirement (§6 day 6's
"one commit"). It is a ~300-line deletion across the pool, the encore logic,
four storage keys and the coin bonuses, and on the level card it costs exactly
one block — which is now hidden. It gets its own day, where a mistake in the
economy is visible rather than buried in a menu commit. `questEvent()` survives
either way: the SET goal counts through it.

**Day 7 is DONE (2026-09-12): all thirty dots are visible, and PLAY plays.**
The owner's first ask, in his words — "like hole.io we see them right but
they're locked and as we progress they unlock like angry birds as well."

- **The menu carries her ladder.** The five dots of the world she is on, the
  green ring on hers, and one line saying what this dot wants. Tapping a dot
  plays it; tapping a locked one shakes and says "FINISH LEVEL 3 FIRST" rather
  than doing nothing.
- **The picker carries all thirty.** Six world cards, five dots each, read off
  the same `allLevels()` — so a child can see the whole shape of the game from
  one screen: `★★✓✓✓` on a finished Maple, `★✓↻🔒🔒` where she is, four padlocks
  on the worlds ahead.
- **PLAY plays.** It used to open the world picker, so the first thing a child
  who wanted to play got was another screen asking her to choose. It now
  launches the dot the ring is on — same world, no reload, no picker. The world
  NAME above the dots is the door to the picker, and picking a world lands on
  HER dot there, not on its first one.
- **`qa/levels.mjs` (j)**, 16 bars, including the two a screenshot cannot check:
  the dots must AGREE with `allLevels()` on both surfaces, and PLAY and the ring
  may never point at different dots (both read `levelCurrent`).
- **A pip is a circle wherever it is put.** `#worlds .wCard span { min-height:
  2.5em }` — a rule written for the world tagline — reached the pips, which
  render as spans, and made every one of the thirty **18 x 30** and visibly
  elliptical. Measured with `qa/_pipbox.mjs`. The rule is scoped to the direct
  child it was always about, and the pip now refuses an inherited floor and
  takes its height from `aspect-ratio`, because it will be dropped into surfaces
  that do not exist yet. (j) checks squareness on every pip on both surfaces.

`levels` now runs (a)(b)(c)(d)(e)(f)(g)(h)(i)(j) in the push gate — about
1,050 s of measured legs, timeout re-sized to 2,400 s.

**Day 8 is DONE (2026-09-12): the menu IS the world she is on.** The owner's
second ask — "I want the background menu picture to sort of match the level
we're at right… like maple we see maple. Once we're at pirate bay that level
etc."

The splash stops being a painting of a generic floating island and becomes a
WINDOW: two bands of house violet holding the name at the top and her ladder at
the bottom, with the middle left open onto the live world — the same island the
next match runs in, the town alive, the void sitting in it on a slow drifting
camera. Nothing is loaded for it. The menu is a camera, not an asset.

- **The stage is DERIVED, never typed.** The first version was a hand-written
  table of six coordinates and it put Pirate Bay's camera behind a building. The
  island already knows: `COPY.hero` is what the establishing shot flies to,
  `island.spawn` is where the void lands, and `qa/_stages.mjs` measured that
  every hero point has exactly one large body standing on it (r 10, 11, 11, 10.5,
  and Skylark's tethered whale at 18) — the landmark, which is the SUBJECT. So
  the stage is computed: aim at the authored point, stand off at 8x the subject,
  32° up, at the azimuth with the most town behind the subject and **nothing in
  the sight line**. It cannot be wrong about a world it has never seen, which
  means world seven gets a stage for free.
- **The sight-line test is three-dimensional, and it had to learn that twice.**
  Version one tested only edible props and let an autumn tree fill Maple's frame
  — a tree is scenery, not a meal. Version two tested the ground plan and
  reported Game Day blocked at all 24 azimuths, because a stadium is a ring and
  on paper there is always a wall between the camera and the pitch. In the air
  there is not: the camera is 55 units up looking over it. The line now descends
  from camera height to aim height and a body counts only where its top is above
  it.
- **The void is the star of his own menu.** In play he starts at r 0.9 with the
  camera 26 units away; on an 80-unit stage that is four pixels of purple. He is
  scaled to the stage (`menuVoidR`, dist/18), grounded, and the aim sits 22% in
  front of him so he lands in the clear band of the window rather than behind the
  ladder panel.
- **The menu's size leaked into the match.** `qa/levels.mjs` (k) caught PLAY
  starting a match at **r 3.22** against a start of 0.9 — a void the size of a
  house eating the town on the first frame. `leaveMenu()` restores `START_R`.
- **`levels.mjs` (k)**, 32 bars over all six worlds: the right world, the aim on
  the world's own authored point, a clear sight line, the void on stage and on
  the ground and readable, the drift alive and inside its authored swing, and
  the camera handed back on PLAY.

**Day 9 is DONE (2026-09-12): the menu costs half what it did.** Day 8 made the
menu a live 3D world; this measured what that costs a phone and cut it in half.
`qa/menucost.mjs` is the instrument, `docs/crews/round-8/menucost-day9.log` the
run.

**Why it mattered:** the menu is where a phone sits for the longest unbroken
stretch — a child opens the app, looks at it, wanders off, comes back — while a
match is three minutes and stops. Measured first on Maple: **519 draw calls a
frame against the match's 243**, so the app's battery and heat were being set by
the screen where nothing happens. That is the worst trade available and it is
invisible to anyone who only profiles gameplay.

**Three savings, all on `menuMode` only:**
- the shadow pass at a quarter rate instead of a half (nothing on a menu is
  moving fast enough for a shadow to be late for)
- the DRAW on alternate frames — **never the rAF**, so the sim steps, the town
  walks, the drift advances and input is answered every frame; only the picture
  is redrawn at 30fps, on a camera moving 0.008° per frame
- the far plane pulled in to cull the half of the island nobody will walk
  across, with the fog fading the last stretch so the cut is never seen

| world | menu/match before | after | cut |
|---|---|---|---|
| powder | 0.97x | **0.51x** | 48% |
| gameday | 1.56x | **0.78x** | 50% |
| lantern | 1.81x | **0.97x** | 47% |
| pirate | 2.48x | 1.20x | 52% |
| skylark | 2.38x | 1.21x | 49% |
| maple | 2.54x | 1.28x | 50% |

**Two measurement corrections, both mine, both recorded because both produced a
confident wrong number first:**
1. **The instrument could not measure a half-rate renderer.** It read the
   counters once per frame, which is exact while every frame draws and nonsense
   the moment one does not — half the reads landed on a frame with no render in
   it, and the "mean" went UP when the real cost halved. It now resets once and
   divides an accumulated window by the frames in it, which is what a battery
   pays and is immune to any cadence trick. The per-frame numbers (519, 410) are
   sound against each other and against nothing measured after the skip landed.
2. **Fog does not cull.** A pass pulled the menu's fog in hard on the theory
   that it would cut the frustum; three.js fog is a fragment-shader term and
   culling is `camera.far` alone. It bought nothing (233 → 269, inside the
   noise) and, LOOKED AT, had put the fog's near plane at 36 units with the void
   standing at 58 — the star of the menu rendered as a ghost in his own shot.

**And a third, about method:** single runs of the same build came back 233, 269
and 274 calls a frame while the match moved 160 → 218 underneath them, because
the prop scatter is re-rolled every load and the stage azimuth with it. No claim
smaller than that spread is a claim about the code. `__menuOptim(on)` flips the
three savings on one already-loaded page, so A and B are the same island, the
same azimuth and the same town — which is what turned a noisy 1.46x into a
measured 49%.

**Two things day 8 leaves open, both for day 9:**

1. **The chosen azimuth varies between sessions**, e.g. Maple 315° on one load
   and 270° on the next. This is the island, not the scoring: the prop scatter
   uses `Math.random()` per load, so "which side has the most town behind the
   subject" genuinely has a different answer each time, and the stage adapting
   to the island actually built is correct. Recorded because it is surprising,
   and because it means a framing approved from one screenshot is not the
   framing every child gets — only the INVARIANTS are guaranteed.
2. **…and one of those invariants is currently a hope.** If every one of the 24
   azimuths were blocked, `deriveStage` picks the least-bad and `blocked > 0`.
   (k) would catch it on that run — but stochastically, which makes the bar
   flaky rather than strong. The fix is an escalation: when the best azimuth is
   still blocked, raise the camera (a high enough camera always clears) and
   re-score, so `blocked === 0` becomes something the function GUARANTEES. Worth
   doing together with day 9's azimuth re-scoring, since both change the same
   loop.

**Day 10 is DONE (2026-09-12): the ladder moves exactly twice, and is otherwise
perfectly still.** Day 7 put the thirty dots on the menu; day 8 put the world
behind them. This is the two moments the row is allowed to move — and, the part
that mattered more, the fact that it must not move the rest of the time.
`qa/reveal.mjs` is the probe, seven bars, registered in push at 441 s;
`docs/crews/round-8/reveal-before.log` and `reveal-after.log` are the runs.

**What a child gets:**
- **The hop (§3.3).** She comes HOME after a win and the row does not simply
  appear rearranged: the dot she just played flips to its tick (180 ms), and THEN
  the green ring hops to the dot the win opened (220 ms) with a chime and a
  nudge. Flip first, because her eye is already on the dot she spent ninety
  seconds on; the ring second, because that is the news. A MISS flips and keeps
  the ring — under the owner's win gate a missed dot is still where she is, so
  nothing moves away from her. Measured end to end from a real 8-second match
  (bar 7): `fin,locked,locked,locked,locked`, ring still on dot 1, dot 2 still
  locked.
- **The first reveal (§4.6).** The first session shows no menu at all, so her
  first sight of the ladder is after her first match. The five dots arrive left
  to right 80 ms apart with dot 1 already wearing what she earned; the void looks
  DOWN at the row for 1.4 s; the ring breathes three times; PLAY glows once. No
  words, and never again — `voidLevels.seen` is one bit, and bar 1 holds both
  halves (it ran; it does not run on the second load).
- **Calm is a hard cut.** Every state is carried by colour and glyph, so a child
  who cannot have motion still gets the whole ladder — she just gets it at once.

**The hop is DIFFED, not announced.** `endMatch()` could have handed the menu a
message saying "dot 1 became done and dot 2 opened"; then there would be two
descriptions of the ladder's motion, free to disagree the first time anything
else changed a state. `paintMenuLadder()` instead compares what the row IS with
what it last SHOWED, so the animation cannot describe a move the ladder did not
make — and `__recordLevel` + `__paintLadder` is then enough for a probe to drive
it, because that pair of calls is exactly what coming HOME does.

**Two live bugs, both older than this day, both found by measuring:**

1. **The menu's "you are here" ring never stopped pulsing.** Day 7 shipped it
   `infinite`. MEASURED with the same method on both builds, canvas
   `display:none` so only CSS could move: **865 of 18,480 px of the ladder
   (4.7%) changing every 150 ms, forever → 0 after**. The probe's animation
   census names it outright: `pipHere@pip s-open here::after`. MENU-BRIEF §5.1
   bar 4 asks for zero changed pixels there and an infinite animation can never
   satisfy it, so the bar went unwritten for three days while the code it would
   have failed was already shipped. The same class of motion had ALREADY cost a
   gate step once — the end card's copy of that ring kept Playwright from
   finding two stable frames to click PLAY AGAIN on (`econ`, 30 s timeout). §3.3
   asked for three pulses on the reveal all along.
2. **BIG MOTION off did nothing until a parent opened Settings.**
   `reduceMotion()` sets `body.calm` on its FIRST call, and nothing called it at
   boot — the only callers were the settings panel's paint, the pause sheet's,
   and the flash cap. So a parent who had turned motion off got a menu and a HUD
   carrying every animation the switch exists to stop, and `body.calm` governs
   about fifteen rules in `index.html`. Found by bar 5, which seeds
   `voidMotion=0` and then checks that what it is about to measure is actually
   calm. One idempotent call at the top of `createFx`. (Checked for fallout:
   `prefers-reduced-motion: reduce` is **false** in this Chromium, so the ~380
   probe files that do not seed the key see no change.)

**Three errors of mine, all caught before the commit, two of them only by
looking at the thing rather than at the number:**
- **PLAY glowed green, and wiped its own plinth doing it.** `box-shadow`
  animates the whole stack, so a keyframe listing only a halo deletes the
  button's shape — and PLAY is pink (`#ff5d7e`), not the ladder's green. The
  plinth is now a named custom property the halo is added to.
- **The stillness bar cropped the ring it was testing.** The clip was the row's
  own bounding box; the ring is an `::after` at `inset: -16%`, 6.4 px outside its
  dot. Padded by 12 px.
- **`visibility: hidden` does not remove a canvas from a `backdrop-filter`'s
  backdrop.** `#menuLadder` blurs what is behind it, so with the 3D scene at
  0.4–2.9 fps the same build measured **0 of 18,480 px on one run and 3,107
  (16.8%) on the next**, depending on whether four shots 150 ms apart landed
  inside one slow frame or straddled two. `display: none` now. The earlier
  "before" figure of 308/10,752 px was taken through both faults and is
  superseded by the 865/18,480 above; both were measuring the right defect and
  only the second was measuring it soundly.

**And a qualifier §5.1 bar 4 did not have.** With the world live behind a
72%-opaque panel the settled ladder changes 18.9%, 26.4%, 35.5% and 51.2% of its
pixels across four runs of the SAME build. The spread is the finding: that
number reads the town, not the ladder, and no animation fix will ever bring it
to zero. It is printed as a report beside the bar rather than dropped, because it
is the honest answer to "is this box still on a real phone" — and the answer is
no, by design.

**Still open after day 9** (both were day 8's, and day 9 did not reach them):
day 9's own headline was the menu's frame cost and that is done; the azimuth
re-scoring against day 1's cost series — day 1 measured that 72–92% of
today's menu frame is the half-rate shadow pass and that azimuth alone swings
the bill up to 11.5x, so the derived azimuth should be re-scored against that
cost series rather than on framing alone.


**The calendar is OFF the PLAY path (2026-09-12).** `qa/taps.mjs` is the probe,
`docs/crews/round-8/taps-before.log` the run that justified it.

**What the before-reading found, on the shipped build:**

| bar | result |
|---|---|
| one tap plays, `voidDailyLast` = today | **ok** — the case all 383 probe files already cover |
| one tap plays, the date ONE DAY STALE | **PLAY could not be clicked AT ALL** — `page.click` timed out after 60 s; `#daily` was covering it |
| the day rolls after a finished match | **no** — after a FULL match on a stale profile, `voidDailyLast` was still yesterday's date |

The second row is worse than the "two taps instead of one" the bar was written
to catch: the button is unreachable. On her second morning — the single most
important morning in the retention loop — the first thing this game asked a
five-year-old to press was a full-screen modal reading CLAIM.

The third row is why this was never only a UI move. **The calendar's bookkeeping
was welded to that button.** The day does not roll unless it is pressed, so she
is asked again tomorrow, and the day after, forever, until somebody who can read
presses it. Taking the modal off the screen without taking the claim off the
button would have left a child permanently owed a day she can never collect.

**And no probe had ever seen any of it:** 383 files in `qa/` seed
`voidDailyLast` to today — every one, because anyone who did not had their first
click eaten and added the seed rather than asking why. In QA terms the card was
a screen this game did not have.

**What shipped:** `dailyDue()` (the week's arithmetic, pure — it used to exist
only inside the branch that built the modal, so the only way to learn what a day
was worth was to put a card in front of a child); `claimDaily()` called in
`endMatch` immediately **before** `bumpStreak()`, which is exactly where it
happened before, so the streak bookkeeping is untouched; the end card naming it
on its own line (`🎁 DAY 8 · +130✦`) because silent must not mean invisible; and
the card itself surviving behind a 🎁 in the scrapbook header. Same table, same
+30%/week capped at 3.5×, same day-7 gem.

**A latent hang removed on the way past.** The tap gate deferred `launchWorld()`
by setting `pendingLaunch` when `#daily` was up, and `closeDaily()` was the only
thing that ever un-parked it — and `closeDaily` lived inside the deleted block. A
deferral with nothing left to resume it is a hang.

**Two corrections of mine, both recorded in the files that carried them.** (1)
Bar 3b asserted "the wallet grew by ≥ 90" and went green on the shipped build:
500 → 909, "+409" — every coin of it MATCH money, while the calendar paid
nothing, which the line above it said. The daily reward and the match reward land
in the same wallet, so any check on "did she get paid" that does not isolate them
passes on the wrong money; it now asks `__dailyDue()` what today owes before the
match. (2) A blocked click used to be reported and then followed by 300 s of
waiting against a page that had gone, so the run ended on a sentence about
Playwright rather than about the game.

**The after-reading** (`docs/crews/round-8/taps-after.log`, taken with nothing
else rendering — three probe runs in this session died on "Target page, context
or browser has been closed", every one while a full gate was on the other cores,
so `qa/taps.mjs` now names a dead browser as a machine result rather than a
verdict on the build):

| bar | before | after |
|---|---|---|
| one tap, date = today | ok | ok |
| one tap, date ONE DAY STALE | **PLAY unclickable**, 60 s timeout, `#daily` covering it | **ok** — armed, menu gone, no overlay, no navigation |
| the day rolls after a finished match | **no** — still yesterday's date | **ok** — `voidDailyLast` is today, `life=2` |
| the day's own coins paid | not isolable (the old bar passed on match money) | **ok** — owed 110✦ for day 2, wallet 500 → 1022 |
| the end card names them | — | **ok** — `🏆 COMBO KING EARNED!+352✦ · +2💎 · +51 XP` **`🎁 DAY 2 · +110✦`** |
| `#daily` never takes the screen | — | **ok** |

`PASS — 6 bars, one tap plays on both sides of midnight and the day is still
paid [177s]`. Registered in the push profile at a 900 s timeout.

**Next: day 11's `qa/idiomguard.mjs`** — the last unbuilt piece of day 10's
row, and §1.2 already decided it: `#daily` rises full-screen at module init
whenever `voidDailyLast !== today`, with a text button reading "CLAIM 90✦", so on
her second day the first thing a non-reader is asked to press is a word. It moves
to the end card — the day's coins claimed silently on the first finish of the day
and counted up in `#endSub`, where the ceremony already lives; the calendar page
itself becomes a chapter in `#book`. Then day 11's `qa/idiomguard.mjs` and day
12's viewports + `qa/lookbook.mjs` (`qa/chipfit.mjs` is already folded in as a registered
bar).

**Day 5's re-baseline is recorded** (`docs/crews/round-8/rebaseline-day5.log`,
run on `1682897`). These three pair their runs, so a level that can end early was
the thing most likely to un-pair them silently. All three green, and these are
the numbers a later drift is measured against:

| probe | on the day-5 build |
|---|---|
| `econ` | missed-2-days week 4 claim **145✦** (the dead cliff paid 90) · trophies **17/17** paid once · wallet 1000 → **1860** · gems 0 → **10** · rematch re-pays nothing (+35✦, +0💎) · gem hat 100 → **65💎**, parental gate not raised |
| `faceparity` | pirate resting-grin **100%** (133/973 idle), mood-hidden **0%** · powder **100%** (210/952), **0%** · spread **0 pts** against a bar of 35, worst mood-hidden **0%** against a bar of 20% |
| `newsfeed` | all six worlds **26 cards, 26 distinct, 0 repeats**, longest run of the same opening word **2**, **0** unresolved tokens · two-sentence share 27–35%, question share 0–12% |

The gate's `report.json` keeps step timings only, not the probes' own figures, so
this had to be a separate run — worth knowing before the next re-baseline day.

Push gate on `1682897`: **PASS 36/36**, 5,105 s. It also covers `aac6a8e`, which
the day-4 run did not.



**HARNESS, read this before running anything:** the repo declares neither
`playwright` nor `pngjs`, and `qa/` imports both — so on a fresh container the
gate aborts with `ERR_MODULE_NOT_FOUND` and 4 of 35 steps read as red for the
wrong reason. Link them into `artifacts/3d-game/node_modules` (playwright lives
at `/opt/node22/lib/node_modules/playwright`; `npm pack pngjs` and unpack).
**Declaring both as devDependencies of `artifacts/3d-game` is a one-line fix
nobody has made and it costs every fresh session an hour.**

**Open small items** (task list): `firstframe`'s title-card check asserts a
contract the game deliberately dropped (fails on all six; needs a design
decision, not a patch); 13 stale world-keyed tables in probes the gate does
not run (reported every run, blocking the day anything runs them); the visual
first-glance review of all six worlds' establishing shots; the art pass.

---

## 9. Open decisions — the owner's

- **§8.1 IS ANSWERED (2026-09-10): the owner chose WINNING.** *"They should be
  hitting the goals to move on. Maple starts easy. As you tick up maple and
  other levels it gets harder … we want to focus on retention."* He was given
  the governor's recommendation (finish advances) and the child skeptic's kill,
  read both, and decided the other way for a long-term progression argument.
  `MENU-BRIEF.md` §3.2 is rewritten to it, §9.1 #1 records the overrule, and the
  cost is paid on day 2: **every one of the thirty goals is set from a measured
  run**, and bar 3.5.4 now asserts an AVERAGE run wins every dot. The world
  ladder stays finish-gated so a stalled child can always travel on. Three goals
  are unwinnable as first drafted (LANDMARK `:1529`, RIVALS `rivals.ts:256`,
  CLEAR `:5462`) and must be re-specified from the curve or not gate.
- **ADS ARE NOT APPROVED.** The owner mentioned "ad revenue" alongside the
  ladder decision; asked directly whether that changes the standing directive,
  he answered *"Could we skip this one until we're ready. It's food for
  thought."* So §2's **no ads, no ad-skip currency, 4+ stays 4+ stands
  unchanged.** Recorded here so the phrase is not later read as a decision. If
  it is reopened, it needs its own brief: App Store Kids Category rules, the
  regular 4+ listing, the privacy manifest and the kids-privacy audit already
  cleared all move with it.
- The remaining twelve in `docs/MENU-BRIEF.md` §8: Skylark's landmark, what the star means,
  BY MYSELF on the RIVALS level, the SHOP shield (decided as a bar, open to
  overrule), menu sound, chrome-first boot, ground brightness, the child's four
  numbers, EAT numbers, water on Maple, the two-phone fallback, and the daily
  calendar moving off the path to PLAY.
- Kids Category vs regular 4+ listing (recommendation given: regular 4+; not
  confirmed).
- Whether Lantern's greeting act stays.
- Pixabay page URLs for the six tracks (blocks submission paperwork only).

---

## 10. How to work on this

**Measure, change, re-measure, and believe the number over the intuition** —
with the amendment every session re-learns: **when the owner's phone disagrees
with the instrument, widen the instrument.**

Every fix this project has shipped went: build the instrument first, fail it on
the old build, then fix. If a change cannot be measured, the probe is the first
deliverable. Write the ledger entry as you go: MEASURED / CHANGED / NOW / GATE,
plus retractions, loudly. The wrong version is always persuasive.

---

## 11. The first message for a fresh session

Paste this, verbatim, as the first message of the build session:

> You are the crew for THE CUTE WORLD ENDER (repo `woodcode2/voidling`, the game
> is `artifacts/3d-game/`). Read `docs/HANDOFF.md` top to bottom, then
> `docs/MENU-BRIEF.md` in full, then `docs/GOVERNOR.md` rules 1–7. Create the
> branch `claude/menu-ladder` from `origin/main`, start the preview server as a
> background task, and run `node qa/gate.mjs --profile=push` once on the
> untouched build so you have seen it green. Then start **MENU-BRIEF §6, day 1**:
> build `qa/menuframe.mjs` and print the baseline table. Do not author a single
> menu pixel before that table exists. For every step after: the probe fails on
> the old build first → fix → probe passes → push gate green → commit with the
> attribution trailer the harness gives you (no model identifiers anywhere in
> the repo) → report the numbers, before → after, in plain language. When you
> reach any of the thirteen §8 decisions, stop and put it to the owner with the
> governor's recommendation; do not choose for him — §8.1 (finish advances) is
> the one to confirm before day 3, since `levels.ts` is built on it. Never merge to `main`
> without the push profile green. If a number you wrote turns out wrong, say so
> in your next reply and in the file that carried it.
