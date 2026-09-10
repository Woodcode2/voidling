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
   'chrome-linux/chrome'` and kill before diagnosing a hang.
7. **The sandbox renders ~1 fps.** Sample against `__matchState().t`.
8. `preserveDrawingBuffer` is off — screenshot, then decode the PNG in-page.
9. **A single-world probe run and that world inside an `all` run can differ
   even at SEED=7.** Compare like with like. The placement baseline's own header
   records which categories drift and by how much.
10. **Suspect the instrument when it disagrees with the owner.** Then widen it.
11. **A monitor that only emits on success is silent on failure**, and silence
    looks like "still running". Cover the failure signatures too.
12. **Guessing the cause three times is slower than tracing once.** The last
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

**Next: day 2** — `qa/pace.mjs` on six worlds, the CLEAR numbers, the first
shadowless frame's ms, and Maple's stage (its `hero` is null, so day 1 could
not frame it; §2.9.7).

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
