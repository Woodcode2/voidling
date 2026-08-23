# THE CUTE WORLD ENDER — engineering handoff

Written to survive a context reset. If you are picking this up cold: read this
file top to bottom, then `docs/FABLE-BRIEF.md` (instruments + traps), then
`docs/AAA-BRIEF.md` §7 (the ledger — every change with its measurement).
**Measure before you change anything.**

Last updated: 2026-08-23, at commit `0dd4fb6` on `main`.

---

## 1. What this is

A hole.io-style 3D game for children aged roughly 6–11. You are a small purple
void with a face. You roll around a world swallowing things; everything you
swallow makes you bigger; in three minutes you eat a whole town while an
in-world newsroom reports your progress and four family members race you.

The owner's stated goal: **a top-10 game in the Apple App Store.** He playtests
on a real iPhone with his young daughter — her reactions are the highest-value
signal in the project.

### The name (settled 2026-08-23, do not relitigate)

| where | value | why |
|---|---|---|
| App Store listing | **The Cute World Ender** | 20 chars (limit 30); "cute"/"world" earn free search weight |
| Home-screen label | **World Ender** | 11 chars — fits untruncated. Set via `capacitor.config.ts` `appName` |
| The creature | **voidling** | species, first form, family lore — unchanged everywhere in-game |
| Bundle id | `com.voidling.game` | invisible to users, painful to move. Stays. |

**Why the rename happened:** "Voidling" is a *live App Store arcade game*
(Douglas Johnson, updated 2026-03) about a hatching, evolving void creature —
same store, adjacent theme, and Apple app names are unique. Rejected alternates
with collisions: "Nomling" (live virtual-pet product), "Voidy" (Google Play
developer). "The Cute World Ender" had zero collisions anywhere.

---

## 2. Standing directives

These persist across sessions. They are not suggestions.

- **Ship via git push only. NEVER deploy manually to Vercel.** Push to `main` =
  production deploy. The owner has given standing permission to push `main`
  ("Yes always"). This session worked directly on `main`; if a session
  directive names a feature branch, mirror to `main` regardless and say so in
  your first reply rather than silently picking one.
- **Never bypass CDN egress blocks.** Asset requests 403 in the sandbox. That
  is expected and correct. Never disable TLS verification, never unset
  `HTTPS_PROXY`.
- **Keep the model identifier out of anything pushed** — code comments, PR
  bodies, docs. Chat replies only. (The commit trailer is mandated by the
  session harness; use whatever it specifies verbatim, plus the
  `Claude-Session:` line.)
- **Do not open a pull request** unless explicitly asked.
- **`node qa/smoke.mjs` before every push.** READ the output for PASS.
- **Powers stay OFF** (`POWERS_ON = false`).
- **Spawn and the opening are hand-authored and identical every load** — the
  owner's call: "consistency is key here."
- Flow is **PLAY → world picker → match**.
- **Verify with screenshots or measurements before claiming anything is done.**
- Music/SFX licence rule: CC0 / Public Domain / Pixabay / Kenney / Mixkit /
  Sonniss only. Never invent a source URL. The owner supplies tracks.

### Owner communication style (learned the hard way)

- **Plain language, no jargon.** He is not an engineer. "The camera was kicking
  141 times a minute" lands; "the bite-ratio gate lacked a refractory" does not.
- **Baby steps with numbered ownership** when he asks about process — he asked
  explicitly for "Step 1, Step 2" with who does what.
- **When he reports a feel problem, he is right about the symptom even when the
  instruments disagree.** Three times this session the instruments said "fine"
  and the cause was real (shake amplitude, the fading-menu music block, the
  synth swallow reading as drums). Suspect your instrument, then widen it.
- Lead replies with what changed and the measured before→after. He reads
  numbers happily; he does not read code.

---

## 3. Tech stack

- **Three.js 0.185.1**, TypeScript, Vite. No game engine, no React in the game
  (`index.html` holds all HUD markup + CSS; a retired React shell exists in
  `src/App.tsx` etc. and is not the game).
- **Capacitor 8** for the iOS shell (`ios/`, `capacitor.config.ts`).
- **Supabase** edge function for telemetry; every harness stubs
  `**/functions/v1/ingest-events`.
- **Playwright + Chromium** at `/opt/pw-browsers/chromium` for all QA.
  Flags: `--no-sandbox --use-gl=angle --use-angle=swiftshader`.
- **Vercel** deploy, project `voidling-3d-game`
  (`prj_ze1DPbXacEkmrZfk3x5ZckmzMwr0`, team `team_ByRJQ00dRUtDHwQcg6YSELTz`),
  production alias `voidling-3d-game-ruby.vercel.app`. Push to `main` → build →
  READY in ~2 min. Verify with the Vercel MCP `list_deployments`; the sandbox
  cannot curl the production domain (egress).
- Repo `woodcode2/voidling`; **the game is `artifacts/3d-game/`** — every
  command below runs from there.

### Commands

```bash
npx vite build                     # RUN FROM artifacts/3d-game
npx tsc --noEmit -p tsconfig.json
node qa/smoke.mjs                  # the pre-push gate
node qa/<probe>.mjs 4177 [args]
pnpm build:ios                     # vendor-assets && build && cap sync (needs network)
npm run shoot:store                # App Store screenshots
```

**The preview server dies constantly.** Keep it alive as a background task:

```bash
while true; do npx vite preview --port 4177 --strictPort >/tmp/claude-0/preview.log 2>&1; sleep 2; done
```

Run it with `run_in_background: true` from the Bash tool. A plain `&` gets
reaped with the tool call. Probes fail with `ERR_CONNECTION_REFUSED` when it is
down — check `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4177/`
before diagnosing anything else.

---

## 4. Code map

| file | what |
|---|---|
| `src/prototype3d.ts` (~8.9k lines) | Match loop, HUD, camera, growth law, beats, forms, trophies, economy, shop, daily, rivals wiring, debug hooks |
| `src/proto3d/island.ts` (~6.6k) | Ground bake, sky, coastline, and the populate block per world. **Each world's block ends in an explicit `return`** — the Maple grid pass at the foot is unguarded and leaks otherwise |
| `src/proto3d/life.ts` (~5.5k) | Crowds: people, movers, flee/greet behaviour, all spoken lines, per-world set pieces |
| `src/proto3d/audio3d.ts` (~4.2k) | Five synth scores + the recorded-track player, channels, crossfades, the cover pad |
| `src/proto3d/void3d.ts` | The hero: body, face rig, moods, rings, skins |
| `src/proto3d/rivals.ts` | The family: archetypes, lanes, join times |
| `mainstreet.ts` `bay.ts` `gameday.ts` `lantern.ts` `powder.ts` | Per-world land + region polygons |
| `luxe.ts` `nightmarket.ts` `alpine.ts` | Per-world prop kits |
| `newsroom_*.ts` | Per-world headline pools; `newsroom_react.ts` = reactions |
| `src/game/matchdeck.ts` | Per-match variation deal (middle beats + hour) |
| `src/game/{unlocks,seasons,stickers}.ts` | World unlock ladder, seasonal events, sticker book |
| `src/proto3d/store3d.ts` | StoreKit bridge (17 products) |
| `index.html` | All CSS + HUD markup |

### The coordinate system

`SCALE = 0.05`, world centre `(6000, 6000)`, so `w(v) = (v - 6000) * 0.05`.
Level files author in world units; the renderer works in 3D units.

**Screen-up is not north.** `camOffset = (0.62, 0.92, 0.62)`, so the ground
direction away from camera is `(-1,-1)/√2` — x and y decrease *equally*. To put
something *d* units straight up-screen, offset by `d/√2` in **both** axes.

### Growth

`growRadius(R, eR) = min(12, sqrt(R² + 0.5·eR²·rookie·diminish))` — area-based,
so **R² is the correct progress axis**. `R_CAP = 12`, `START_R = 0.9`.
Edible when radius `< voidR * 0.92`.

`FORM_MIN = [0, 1.6, 2.5, 3.6, 5.5, 8.0, 13.5]` — and `formProgress()` measures
each rung from `max(FORM_MIN[st], START_R)`, not from 0. (It measured from 0
until 2026-08-23 and showed 39% full at spawn.)

### Containment

`solid(x,z)` = `biomeAt()` truthy AND `!inDeepWater3()` AND eight
`insideIsland3()` probes at margin `m = min(R*0.75, 4+R*0.15) + 1.2`.
`qa/traverse.mjs` proves every size can still cross every island (≥97% reach).

---

## 5. The five worlds

| # | world | theme | par | hero landmark |
|---|---|---|---|---|
| 1 | **MAPLE FALLS** 🍁 | sleepy autumn town | 80,000 | town hall |
| 2 | **PIRATE BAY** 🏴‍☠️ | pirate island turned resort | 105,000 | The Royal Mariner |
| 3 | **GAME DAY** 🏈 | college football Saturday | 175,000 | the stadium |
| 4 | **LANTERN NIGHT** 🏮 | spirit night market | 150,000 | the bathhouse |
| 5 | **POWDER PASS** ❄️ | mountain village on a snow day | 45,000 | The Lodge |

Worlds unlock by *finishing* the one before. Maple is the first-ever launch
(no menu on run one — deliberate).

**Lantern's one idea:** the spirits think the void is a guest — act one they
walk *toward* it, act two they freeze and stare, act three they flee. The owner
reported this as "a weird pull"; it was explained as designed and **he has not
yet said whether to keep it. Open question.**

**Powder's three verbs:** ICE (momentum on the lake, `iceK 0.26`), SNOW SHELL
(6s ×1.45 eat-ratio from drift props), AVALANCHE (22 snowballs down the piste
at beat four). It shipped scenic at 843 edibles and starved the child driver
(403–3,253 vs ~100k); the "hoover economy" density pass took it to 4,536.

---

## 6. Systems that exist (and their rules)

**Match variation** (`matchdeck.ts`): every match deals two MIDDLE beats from a
pool of four per world, plus an HOUR (3 lighting variants per world; Lantern
has exactly one — the night *is* that world). **Match 1 of a fresh profile
always deals the shipped baseline** — the tuned first impression, and what
every probe measures. The deal is a *cycle*, not a roll: consecutive matches
change both middle slots. Gate: `qa/vary.mjs`.

**The economy** (owner-designed, 2026-08-22):
- **No bundle SKU.** One shipped for a single commit and the owner vetoed it
  ("I don't like the idea of everything free forever"). `APPSTORE.md` carries a
  do-not-create line for the id.
- **Coins (✦)** = everyday. Ladder paced against a modelled ~990✦/day regular
  kid: first skin day 1, then ~weekly, top rung ~day 240.
- **Gems (💎)** = rare, earned only in play: deep trophies (10 total across the
  catalogue), the day-7 chest (+1), the day's first win (+1) ≈ 8/week. Spend on
  3 premium colourways (25/25/40) and **6 earnable hats** (25–50) whose
  StoreKit registrations are *parked, not deleted*.
- **Gem spends never touch the parental gate, and a shortfall never routes
  toward a payment sheet.** `qa/econ.mjs` asserts this.
- The daily streak **cliff is dead**: a missed day steps the week ladder down
  one rung, never to the bottom; day numbers are monotone (`voidDailyLife`).
- Trophies pay bounties exactly once (`voidTrophyPaid`, keyed by name — renaming
  a trophy re-awards it once, which is acceptable and reads as a gift).

**Forms ladder** (renamed 2026-08-23):
`VOIDLING → MUNCHKIN → GOBBLIN → CHOMPOSAURUS → COLOSSUS → WORLD ENDER → VOID TITAN`
— a ladder of *pictures* (baby → munchkin → monster → dinosaur → giant →
planet-eater → cosmos), not thesaurus entries for "eater".

**The family** (renamed 2026-08-23) — every name says its game, all ≤7 chars so
the leaderboard doesn't truncate:
NIBBLES (Auntie, BULLY — hunts you; sweetest name on the scariest void),
BIGSHOT (Uncle, SHOWOFF), JELLY (Cousin, COWARD), ECHO (Baby, COPYCAT),
GRUMPS (Grandpa, HOARDER).

**Camera motion is ZERO by owner order** (2026-08-23, absolute: "I don't want
any shake. 0."). `fx.kick`, `fx.shake` and `camPunch` are all no-ops at the
source; call sites remain, so one line each restores them. `hitStop` stays (a
time-freeze moves nothing). `qa/juice.mjs` therefore reads 3/4 by design.

**Audio**: six recorded tracks ship (menu + 5 worlds), all mastered to the house
spec (−16 LUFS ±1, ≤−1 dBTP, 128kbps/44.1k) — `qa/trackprofile.mjs --gate`.
Presence of `public/assets/music/<world>.mp3` is the entire switch; absent = the
world's synth score. While a track decodes, a **drumless cover pad** bridges
(one root-and-fifth swell). The full synth score is now *only* the 404 fallback
— it used to be the cover, which is what the owner heard as unsynced drums.

**FTUE**: on the very first match, Auntie NIBBLES greets the child ("ooooh…
this planet looks DELICIOUS!") then "eat everything SMALLER than you", then the
existing drag lesson. Banner cards on the existing queue; never blocks play.

---

## 7. The QA kit

`artifacts/3d-game/qa/` — 107 named probes plus ~340 `_`-prefixed
investigation scripts (throwaways, kept as evidence). The ones that matter now:

| probe | answers |
|---|---|
| `smoke.mjs` | boots, loads, grows, eats, makes sound. **Pre-push gate.** |
| `ab.mjs [n] [world] [driver] [port]` | N matches, mean + sd — the only trustworthy difficulty read |
| `traverse.mjs [port] [worlds…]` | can every size cross every island (≥97% reach) |
| `postpipe.mjs <world> --gate` | colour pipeline: composed ≡ direct, hero survives glow, sky is a dome. **World is argv[2]** — `--gate` alone boots a world literally named "--gate" |
| `uisystem.mjs` | computed font weights/sizes (catches TS-painted markup) |
| `juice.mjs` | feel channels answering a forced bite (≥3 of 4; lens is dead by order) |
| `vary.mjs [port] [worlds…]` | match 2 ≠ match 1, and match 0 is the baseline |
| `econ.mjs` | cliff dead, bounties pay once, gem shelf, gem hat, no gate on soft spend |
| `iapdoc.mjs` | APPSTORE.md and the client agree on every product id/price |
| `trackprofile.mjs --gate` | every track in spec (needs `FFMPEG_BIN=…`) |
| `moverbands.mjs` | who sits in the choppy half-rate band per world |
| `aftermatch.mjs` | the menu theme comes home after TIME!, both exits |
| `switch.mjs <world> <port>` | world-switch reload → gate → scored match |
| `shippedlook.mjs <port> <world> <tag>` | what the CANVAS shows (screenshot) |
| `_kickrate.mjs <world> <secs>` | camera-kit firings per minute |
| `_startlag.mjs` | tap → score latency across repeated starts |
| `_twoscores.mjs` | two scores playing at once? |
| `_edcount.mjs` | edibles per size class per world (the hoover economy) |
| `_pwtrack.mjs` | browser-side track ruler for sandboxes without ffmpeg |

**ffmpeg is not installed.** Install it into the scratchpad when needed:
`npm i ffmpeg-static` there, then
`FFMPEG_BIN=<scratchpad>/node_modules/ffmpeg-static/ffmpeg node qa/trackprofile.mjs --gate`.

### Traps — every one of these has cost a session

1. **The cwd trap.** Background Bash resets to `/home/user/voidling`. Every
   backgrounded probe needs an explicit
   `cd /home/user/voidling/artifacts/3d-game && …`. Symptom: `Cannot find
   module '/home/user/voidling/qa/smoke.mjs'`.
2. **Self-matching pgrep.** `until ! pgrep -f 'qa/econ'; do …` never exits — the
   pattern matches the wait loop's own command line. Bracket a character
   (`qa/[e]con`) and read the probe's verdict from its **log file**, never from
   process existence.
3. **Probes must seed `voidUnlocked`** with all five worlds, or a locked card
   refuses the tap BY DESIGN and the probe hangs forever. Four probes have hit
   this.
4. **Python `replace()` edits that print "done" unconditionally are not
   edits.** `assert s.count(OLD) == 1` before every replace, then grep after.
5. **Zombie Chromium** at 189% CPU starves later probes into 400s timeouts.
   `pgrep -f 'chrome-linux/chrome'` and kill before diagnosing a hang.
6. **The sandbox renders ~1 fps under swiftshader.** NEVER quote harness frame
   timing as the game's. Sample against `__matchState().t`.
7. `preserveDrawingBuffer` is off — reading the live canvas returns black.
   Screenshot, then decode the PNG in-page.
8. `glb()` registers props asynchronously — anything fingerprinting the world
   early counts a different one each run.
9. Do not rebuild while a determinism or replay probe is running.
10. **Suspect the instrument when it disagrees with the owner.** Two instrument
    bugs were found *this session alone* (postpipe's val denominator; the
    kick-rate census measuring firings but not amplitude).

---

## 8. Where the launch stands

**Consensus reached with the owner: go live now, keep building after.** Nothing
structural is missing.

| step | owner | status |
|---|---|---|
| 1 | Apple Developer enrollment ($99/yr, **as an individual**, 1–3 days) | **owner — not started** |
| 2 | Borrow a Mac (2–3 hrs first time) | owner — not started |
| 3 | Finish the iOS shell so the Mac session is open-Xcode-and-build | **next agent** |
| 4 | First build to his iPhone via cable | owner + Mac |
| 5 | App Store Connect listing (agent writes every word; owner pastes + banking) | agent then owner |
| 6 | Refresh `store/*.png` screenshots under the new name | **next agent** |
| 7 | Archive, upload, age rating, submit | owner + Mac |

**Enrollment decision, reasoned through with him:** individual now (fast, no
D-U-N-S), *not* his federal Canadian corp SolarLead Inc. (D-U-N-S adds ~2
weeks; the seller line would publicly read "SolarLead Inc." on a kids' game;
provincial registration still open). Apps transfer between accounts later if
revenue justifies a corporate wrapper.

**Still owed by the agent before submission:**
- **Kids-privacy telemetry audit** — make the store build collect nothing
  identifying by default. Promised to the owner; the one exposure worth
  respecting.
- Trademark sanity check on "The Cute World Ender" (searches found nothing;
  a registry check would firm it up).
- Store copy: description, subtitle, keywords, privacy-policy page.

**Owner's open decision:** Kids Category vs regular 4+ listing. Kids Category
= curated shelf but permanently bars nearly all ad networks; regular 4+ keeps
the ad door open (his stated long-term plan) — the recommendation given was
**regular 4+**, and he has not confirmed.

---

## 9. Open items

**Owed by the owner:**
- **Pixabay page URLs for all six music tracks.** `CREDITS.txt` says "owner
  states Pixabay" six times with no links. Blocks submission paperwork only,
  not the build.
- **SFX picks** — the three files `eaten_deep.wav` / `evolve_epic.wav` /
  `win_warm.wav` (Kenney packs: Music Jingles, Impact Sounds, Digital Audio; or
  Pixabay "gulp"/"power up"/"win jingle"). He tried and disliked the first
  batch — "let's figure this out later". Until then the synth fallbacks play
  (the swallow one is now a soft whoosh, not a thud).
- Whether Lantern's greeting act stays.
- Kids Category vs 4+.

**Tracker items still open** (see the task list): #9 store submission, #26
palette sweep at real screen sizes, #37/#38 shader stalls, #39 frame-rate
dependent constants at 120Hz ProMotion, #45 rival-eats-landmark news, #46 music
provenance, #47 decoded-PCM memory (~50–80 MB per loaded track).

**AAA-BRIEF work not done:** the second endless coin sink (recolours — deferred
because it touches the owner-approved purple identity), earn-rate rebalance
pending real telemetry, economy-as-JSON extraction, and the Capacitor-shell
items (notifications, Game Center, ratings prompt, cloud save) which wire up
when the shell assembles. Phase 2 remainder: clay-system landing, destinations
animate in/out, HUD layout owner, kill backdrop-filter blurs over canvas, stop
rendering behind opaque overlays, menu→match choreography.

---

## 10. How to work on this

**Measure, change, re-measure, and believe the number over the intuition** —
with the one amendment this session added: **when the owner's phone disagrees
with the instrument, widen the instrument.** The shake round is the case study:
the census counted *firings* and said 19/min was fine; the owner still felt it,
because amplitude and the lens channel were never in the count. Two rounds of
honest measurement still landed on the wrong answer until he said "zero", which
was the right answer all along.

Write the ledger entry (`docs/AAA-BRIEF.md` §7) as you go: MEASURED / CHANGED /
NOW / GATE, plus retractions, loudly. Six retractions live in these briefs
because the wrong version is always persuasive.

Every fix this project has shipped went: build the instrument first, fail it on
the old build, then fix. If a change cannot be measured, the probe is the first
deliverable.
