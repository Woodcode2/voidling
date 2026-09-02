# VERDICT: SOUND WITH CORRECTIONS — refute-drum, commit 702a3e4

**Refuter:** the skeptic for lane `drum` (round 5, `refute-six`). Filed 2026-09-02. No tracked file edited; this is the only file written. HEAD `301a8be`; `src/proto3d/audio3d.ts` is unchanged since `702a3e4` (`git log 702a3e4..HEAD -- src/proto3d/audio3d.ts` is empty); `dist/` (Sep 2 00:13) is newer than every file under `src/`, and :4177 serves `assets/main-BlHCCMf5.js`, the file in `dist/` — so every "after" number below is this commit's build.

**The one-paragraph ruling.** The landing removes exactly what it says it removes, and I proved it with the probe it shipped without: on the parent build a big swallow constructs one 1.8 s recorded buffer at **-20.4 dBFS, +14.1 dB over the Lantern recording's mean**, and `alert()` constructs **12 taiko strokes to master** over that recording; on this build the swallow is one 0.34 s filtered-noise buffer at ≈-27 dBFS (alone) / within the music's own window range (over the track), and every taiko and bass-drum voice to master is **0** while a recording plays and **unchanged (12 / 9 / 3 / 1) on the 404 path** where the gate must not fire. `recordingLive()` is true on the real path from the first frame (`theme.srcs = 1` in four recording runs), false on the fallback path (`srcs = 0`, `bad = true`). Two sentences the commit asserts are false and measured false, and they are what the corrections fix: (1) "a new sting cannot route around it and still be a drum" — two EXISTING drum voices already do: `shime` (5 strokes per notice sting, measured on Lantern under the recording) and `mSnare` (6- and 10-stroke rolls on Game Day under `gameday.mp3`); (2) "pwBus … runs solely on the 404 fallback path where there is no recording to clash with" — the first Powder evolution starts the whole Powder scheduler (and its drum) under `powder.mp3`, 32 bus voices in 8 s of free play with the recording live, and the governor's stated objection to the crew's pwDrum guard (that it would silence the fallback score) is impossible, because the predicate is false whenever the fallback score is what is playing. Not a kill: the code that landed is right and provably better; its comment at `:3143-3145` and two of its message's claims are wrong, and the fix is incomplete by the rule it adopted. Corrections are verbatim below. `tsc --noEmit` exit 0 (run by me).

## What I ran

All on this box, one browser at a time, GPU lock (`mkdir /tmp/gpu.lock`) held for each run and released after, load < 4 at each launch (3.62 / 3.73 / 3.76 / 3.85 / 3.91 / 3.86). Swiftshader, 430×932. Nothing sampled on wall time is reported as a match number; the free-play windows are labelled "wall" and used only to show that nothing spontaneous fired. Logs: `scratchpad/{live,LIVE2,PARENT,NOMP3,POWDER,GAMEDAY}.log`, chain output `scratchpad/chain.out`.

1. **`git show 702a3e4`** — one file, +27/−3. Read in full; then every function it touches or names read on disk at HEAD (below).
2. **Parent build for A/B.** `git worktree add --detach .claude/worktrees/refute-drum-parent 702a3e4^` (gitignored path, `node_modules` symlinked), `npm run build` in its `artifacts/3d-game` → exit 0, `✓ built in 5.75s`; its bundle names `eaten_deep.wav` 3×, the live bundle 0×. Served to the SAME page URL by a playwright `route()` from that dist — no second server.
3. **`scratchpad/drumprobe.mjs`** (scratch, not landed) — hooks `AudioNode.prototype.connect` (records the graph; splices an `AnalyserNode` fftSize 32768 = 0.74 s in front of `destination`), `createOscillator` / `createBufferSource`, `AudioParam.{setValueAtTime,exponentialRampToValueAtTime,linearRampToValueAtTime}` (records every voice's frequency schedule as the engine wrote it), and `start` on BOTH `AudioScheduledSourceNode` and `AudioBufferSourceNode` (the second is its own override — run 1 missed every buffer voice because of it; declared and re-run). Route: master = the GainNode feeding the DynamicsCompressor that feeds destination; musicBus = the lowest-id GainNode feeding master; `@master` = reaches master without passing musicBus. Fingerprints from the engine's own schedules: taiko sine 128→52 / 190→88, bDrum sine 92→48, shime sine 640→380, snare body triangle 195→160, pwDrum sine 120→48, pop-sub sine 52→30, sample = 1.7–1.9 s buffer, whoosh = 0.34 s non-loop buffer.
   Boot: `?w=<world>`, wait `__voidState`, dismiss daily/gift, `#btnPlay`, the world card, wait `__matchState().t > 0.2`, then wait until `__music()` shows the recording (or, with `--nomp3`, the synth bed). Then: 45-window music-only baseline; 6 s wall free play; fire `bigEat` ×3, `alert`, `evolve` (+ 8 s wall after), `matchBeat` for each authored banner; count voices per fingerprint and route, max 0.74 s-window RMS per fire, `__music()` before/after every fire; finally `stopMusic()` → read `theme.srcs` at once, RMS over the next 0.7 s, `alert()` inside that tail.
   Runs: **LIVE** (:4177, hook bug → buffer counts void, oscillator counts kept) · **LIVE2** (:4177, hooks fixed) · **PARENT** (worktree dist) · **NOMP3** (:4177 with `lantern.mp3` → 404) · **POWDER** (:4177, `?w=powder`) · **GAMEDAY** (:4177, `?w=gameday`).
4. **`scratchpad/wavstat.mjs`** — RIFF parse + radix-2 FFT energy share below 120 Hz on the shipped `.wav`s (whole file and first 0.5 s).
5. **`nice -n 19 npx tsc --noEmit`** → exit 0.
6. `git log --all --diff-filter=A -- '*eaten_deep.wav'`, `git cat-file -s` at a3b3ba2 / 7bad24c / 702a3e4^ / HEAD → 79424 each; `curl :4177/assets/audio/eaten_deep.wav` → `200 79424`.

### The numbers (every one from the logs named above)
| | PARENT (before) | LIVE2 (after) | NOMP3 (after, 404) | POWDER (after) | GAMEDAY (after) |
|---|---|---|---|---|---|
| `__music()` at match start | theme.srcs 1, synth false | srcs 1, synth false | srcs 0, bad true, **synth true** | srcs 1 | srcs 1 |
| music-only mean / max, dBFS | -34.5 / -30.0 | -34.8 / -30.1 | -32.4 / -29.5 | -30.6 / -29.4 | -42.1 / -40.6 |
| `bigEat()` voices | **1 × 1.8 s sample @master** | 1 × 0.34 s whoosh @master | 1 × whoosh | 1 × whoosh | 1 × whoosh |
| `bigEat()` max window, dBFS | **-20.4 / -20.1 / -19.9** | -31.2 / -31.4 / (-25.3 contaminated) | -30.0 / -31.9 | -28.7 / -28.7 | -28.1 (pop in window) / **-26.6** |
| `alert()` TAIKO@master | **12** | **0** | 12 | — (Powder: squares) | — (squares) |
| `evolve()` TAIKO / BDRUM @master | 1 / — | 0 / — | 1 / — | 0 / 0 (+ **PWDRUM@bus 1**, score starts) | 0 / **0** (+ snare 1) |
| gate sting ×2 TAIKO | 3, 3 | 0, 0 | 3, 3 | | |
| notice sting TAIKO / **SHIME** @master | 1 / **5** | 0 / **5** | 1 / 5 | | |
| bathhouse sting TAIKO | 9 | 0 | 9 | | |
| Game Day band-on / fourth-quarter BDRUM, snare | | | | | 0, **6** / 0, **10** |
| 8 s wall after `evolve()`, spontaneous voices | 0 | 0 | 240 (@bus, the synth score) | **32 @bus (Powder score under the recording)** | 0 |
| `stopMusic()`: theme.srcs at once / tail RMS / taikos from `alert()` in the tail | 0 / -31.6…-41.1 / 12 | 0 / -30.8…-37.3 / 12 | 0 / — / 12 | 0 / — / 0 | 0 / — / 0 |

## What I checked on disk

Everything below is HEAD, read by me, line numbers from `src/proto3d/audio3d.ts` unless stated.

- **The diff vs. the message.** The diff is: two prewarm lists lose `'eaten_deep.wav'` (`:307`, `:3692`); `recordingLive` declared at `:1935` above `bDrum` (`:1937`); one early return in `bDrum` (`:1938`) and one in `taiko` (`:3146`); the `sample()` line at the swallow site replaced by a 12-line comment (`:4115-4126`), the old "absent" comment kept beneath it (`:4127-4132`); the whoosh `noise(0.34, 0.14, 480, 120)` at `:4133` unchanged. No probe, no doc, no README, no ledger entry. The message's "the file's size and history … present in dist/ today … pre-decoded on the child's first gesture": all true on disk and (the pre-decode) measured in PARENT's boot voices (`SAMPLE1.8@master ×4` at gain 0 before the match — the prewarm `sample(n, 0)` STARTS the buffer silently when it is already decoded; harmless, noted).
- **`recordingLive` ≡ `__music().theme.srcs > 0 || menu.srcs > 0`** (`musicState()` `:3893` reports `ch.srcs.length` verbatim), so the probe reads the predicate itself. `srcs` is written in exactly three places: `startLoop` pushes pass 1 synchronously and each armed pass, cap 3, ended sources never removed (`:528-529`); `stopLoop` empties it (`:547`, `:551`); nothing else. `releaseBuf` (`:561`) touches `buf`/`era` only; `playTrack`/`preload` only reach `srcs` through `startLoop`, and the era guard (`:592`, `:632`) drops a stale decode before that call. `startLoop` REFUSES on a stopped clock (`:458-460`) and pushes nothing — so `srcs = 0` while cold, which is also silent. The 404 path sets `bad = true` and never calls `startLoop` (`:604-606`) → `srcs = 0` → the gate is open for the synth score, whose own taikos go to `lnAmb`/`lnBus` (`:3451`, `:3484`, `:3508` via `dest = lnAmb`; `:3270-3271` `lnBus`) and are never `dest === master` anyway. Consistent with the commit, and measured consistent (NOMP3).
- **The one window the predicate misses:** `stopLoop(ch, fade > 0)` empties `srcs` IMMEDIATELY and stops the old sources `fade` seconds later (`:543-548`). For 1.2 s after `stopMusic()` (`:4023`) and 0.6 s after the menu stands down at match start (`:3725`) the recording is audible and `recordingLive()` is false — measured: tail RMS at music level, 12 taikos constructible. Nothing the game schedules today lands a drum there on Lantern (`win()` `:4170` and `lose()` `:4198` carry no drum voice; rivals do not `alert()` after TIME). A limit, recorded; not a kill.
- **Every drum voice and where it routes** (`grep -n -E "bDrum\(|taiko\(|pwDrum\(|shime\(|mSnare\(|nHit\(|clack\("`): the table in the record below. Gated: `taiko`, `bDrum`. Not gated and written to master: `shime` (lnNoticeSting ×5, `:3538`), `mSnare` (bandLand `:2450`, recallSting ×7 `:2487`, landslideFanfare `:2501`/`:2514`, gamedayEvolve `:2998`, bandOnSting ×6 `:3015`, fourthQuarterSting ×10 `:3033`), `nHit` (concessionSting ×5 `:3026`), `clack`/`geta`, `pop()`'s 52→30 sub (`:4109`, flagged by the crew, not proposed). `pwDrum` → `pwBus` only (`:3622-3634`) — true; "pwBus runs solely on the 404 path" — false: `powderEvolve()` `:3678-3685` → `if (!pwBus) startPowderScore();` `:3680` builds the bus, sets `pwRunning`, ramps the bus to 0.5 and starts `setInterval(pwSchedule, 110)` (`:3653-3670`) on the first evolution of any Powder match, recording or not; `synthOn` is never set on that path so `synthStop()` (`:790`) cannot stop it. This is the crew's F3 / `docs/STUDIO-ROUND-3.md:7267`, which the commit did not land and whose absence the commit's pwDrum reasoning silently assumes.
- **Readers of `eaten_deep.wav` other than the two prewarm lists.** `src/game/audio.ts:71,:483` — the OLD 2D engine; importers `src/ui/UILayer.tsx`, `src/ui/DebugPanel.tsx`, `src/game/{world,events,engine}.ts`; `index.html:2086` has one entry, `/src/prototype3d.ts`, whose `./game/*` imports are `stickers, seasons, unlocks, matchdeck` only; `grep -o eaten_deep dist/assets/*.js` → nothing. Dead in the bundle. `public/assets/audio/README.md:9` (shipped verbatim as `dist/assets/audio/README.md:9`) still lists the slot as live — false since this commit. `qa/_wav.mjs:5-7,:19` — scratch probe, header now false. `dist-gw/` — Aug 17 scratch build, gitignored, unserved. No service worker / manifest / preload list (`find . -name 'sw.js' -o -name '*.webmanifest' -o -name 'manifest*.json'`, outside `node_modules` → nothing). `docs/HANDOFF.md:351-355` and `docs/AAA-BRIEF.md:1357` still carry the false statements the crew's §7 listed as owed.
- **The asset** — `wavstat.mjs`: `eaten_deep.wav` 22050 Hz mono 1.800 s, peak -0.9 dBFS, RMS -17.1 dBFS, **73.2 % of energy below 120 Hz** (72.3 % in the first 0.5 s), centroid 127 Hz, half its energy under 55 Hz; `win_warm` 0.0 %, `evolve_epic` 39.4 %, `gulp_1` 0.0 %. A kick/thud by any reading — the crew's characterisation holds; their **93.8 %** does not (a naive DFT at 30 log-spaced bins is not an energy integral; it over-weights the dense low bins), and neither does round 3's 88.7 %. This changes the crew's LEG A bar (80 %): under a correct integral the file passes it. Corrected in the probe below.
- **The gate today** (`qa/gate.mjs:245`): the `audio` tier is one step, `trackprofile`, which measures MP3 files on disk; `aftermatch.mjs:58-59` and `_twoscores.mjs:29` test `synthOn`, which a sample on master or a taiko on master cannot move. The crew's "no probe has ever counted a voice at the output of a live match" is true on disk; `qa/lnsound.mjs` renders the SYNTH bed in an OfflineAudioContext (its header), not the live output.

## Kill shots

Each is a shot I took; the ones that missed are recorded with what I tried.

1. **LANDED — "the gate lives where a drum is MADE … a new sting cannot route around it and still be a drum."** Two existing drum voices route around it today. `shime()` (`:3152`, "the small rope-tuned drum that keeps the actual time"): `matchBeat("the drum tower starts")` on Lantern with `theme.srcs = 1` constructed **5 × sine 640→380 + noise @master** on this build (LIVE2, also PARENT and NOMP3: 5/5/5) — and `lnNoticeSting` is also the fall-through for every banner string the regexes at `:3980-3984` do not match. `mSnare()` (`:1925`): Game Day under `gameday.mp3`, "the band takes the field" → **6 snare strokes @master**, "fourth quarter" → **10**, `evolve()` → 1, with the bass drum that sat under them removed (BDRUM 0 in all three). The commit's own rule ("nothing percussive may join a recording", `:1929-1934`) is what these fail. Fix: correction 1.
2. **LANDED — the governor's pwDrum correction, both halves.** Premise: "pwBus … runs solely on the 404 fallback path where there is no recording to clash with." Measured on Powder with `powder.mp3` playing (`theme.srcs = 1`, `synth = false`): `evolve()` → `PWDRUM@bus` 1 and the Powder score STARTS — **32 bus voices in the next 8 s wall** of free play with the recording live (music-box triangles, pads), and from `musStage ≥ 3` the scheduler's `pwDrum(t, 0.16)` every fourth 8th (`:3649`) joins them. Consequence: "gating it would have silenced Powder's fallback score" — impossible: on the fallback path `theme.bad = true, srcs = 0` (NOMP3: `srcs 0, synth true`) so `recordingLive()` is false and the guard passes; the crew's `if (recordingLive()) return;` in `pwDrum` could never have touched the fallback score. The in-code comment at `:3143-3145` states the false premise. Fix: corrections 2 and 3.
3. **MISSED — "recordingLive() is never true on the real path / fires when it should not."** Four recording runs (Lantern ×2, Powder, Game Day): `theme.srcs = 1` at the first sample and 1/1 before and after every fire, `starts = 1`, `cold = false`; taiko/bDrum to master 12 → 0, 9 → 0, 3 → 0, 1 → 0. 404 run: `srcs = 0`, `bad = true`, `synth = true`, every sting keeps its drums (12 / 9 / 3 / 1) and the score's own drums keep constructing (`TAIKO@bus` 6 + 8 + 11, `SHIME@bus` 15 + 21 + 27). The tail window (1.2 s after `stopMusic`, 0.6 s after the menu stands down) is the only gap and nothing lands a drum in it.
4. **MISSED — "with the sample gone the swallow is silent."** One voice per `bigEat()`, a 0.34 s buffer through `BiquadFilter → Gain → master`, in every after-run (1/1/1 on Lantern, Powder, Game Day; 1/1/1 on the 404 path). Level alone ≈ **-26.6 dBFS** max window (Game Day, music at -42.1): ~7 dB under the old sample and about at Lantern's music level (mean -34.8 / max -30.1), so over Lantern's track it measures inside the music's own window range (-31.2 / -31.4). It plays; it is not a separate event a child would notice. Whether the swallow should be audible over the recording is a design question this commit did not claim to answer; recorded, not a kill.
5. **MISSED — "a third reader still plays the file."** None live (above). Two documents and one scratch header are now false; corrections 4-6.
6. **PARTIAL — "which of the three sources did the owner hear?"** Measured on the parent build with the recording playing: the sample at **-20.4 dBFS, +14.1 dB over the music mean** on every big swallow, and the taiko at **-23.7 dBFS, +10.8 dB**, twelve strokes per family arrival or bully charge. Both were audible and both were "the drum"; the commit is right to remove both. The 404 fallback score was NOT in play: in every run against the shipped bundle the mp3 resolved and `synth = false`; it plays only when the file 404s (NOMP3), which is not the app the owner runs. The crew's measurement stands in direction and magnitude (+12.4 dB / 36 taikos in 20 s vs my +14.1 dB / 12 per `alert()`); their spectral number does not (93.8 % → 73.2 %).
7. **MISSED — "tsc is not clean."** Exit 0.

## Corrections (verbatim)

Each is mechanically applicable; line numbers are HEAD `301a8be`.

**1. Gate the two remaining drum voices, and move `recordingLive` above the first of them (the governor's own TDZ rule).** In `src/proto3d/audio3d.ts`, delete the block at `:1929-1935` (the six-line doc comment beginning `/** A RECORDING IS PLAYING` through `const recordingLive = () => themeCh.srcs.length > 0 || menuCh.srcs.length > 0;`) and re-insert it verbatim immediately ABOVE `function mSnare` at `:1925`. Then:
```diff
   function mSnare(dest: AudioNode, t: number, vol: number, body = true) {
+    if (dest === master && recordingLive()) return;   // a drum — see recordingLive
     nEnv(fxFor(dest, 'snare'), t, 0.07, vol, 0.0015);
     if (body) dTone(dest, t, 0.05, 'triangle', vol * 0.3, 195, 160, 0, 0.002);
   }
```
```diff
   function shime(dest: AudioNode, t: number, vol: number) {
+    if (dest === master && recordingLive()) return;   // a drum — see recordingLive
     dTone(dest, t, 0.09, 'sine', vol * 0.7, 640, 380, 0, 0.001);
     nEnv(fxFor(dest, 'shime'), t, 0.05, vol, 0.001);
   }
```
Probe that fails before it: `drumprobe.mjs` LIVE2 `matchBeat("the drum tower starts")` → SHIME@master 5; GAMEDAY "fourth quarter" → snare 10. Expected after: 0 and 0; NOMP3 unchanged (5, and Game Day's fallback score untouched because its snares go to `gdBus`, `:2877` region). What the child loses: the five-stroke pattern under the market's gong, and the snare line under the brass — the same trade the commit already made for the taiko.

**2. Correct the false comment in `taiko()` in place** (`:3143-3145`):
```diff
-    // Stings only. The world SCORES play into lnBus/pwBus/gdBus and only ever
-    // run on the 404 fallback path, where there is no recording to clash with;
-    // gating those would silence the fallback score for no reason.
+    // Stings only. The world SCORES play into their own buses (lnBus/gdBus/
+    // mapBus/pwBus → musicBus), never `master`, so this test cannot reach
+    // them. It would not matter if it could: on the 404 fallback path
+    // theme.bad is set and srcs stays empty, so recordingLive() is FALSE
+    // whenever a fallback score is what is playing (measured: refute-drum,
+    // NOMP3 run). NOTE pwBus does NOT run only on the fallback path —
+    // powderEvolve() starts the Powder scheduler under a recording; see
+    // ensurePwBus.
```

**3. Land the crew's F3 and its pwDrum guard, which the commit's reasoning presumed.** Replace `:3653-3663` (the `if (!pwBus) { … }` block inside `startPowderScore`) and `:3678-3685` (`powderEvolve`) as follows; `ramp` is `:953`.
```diff
+  /** The Powder bus, built on demand and parked at silence (0.0001): the score
+   *  ramps it up when it starts; a one-shot that needs it lifts it itself.
+   *  Extracted from startPowderScore so an evolution can reach the bus without
+   *  starting the whole scheduler under a recording (STUDIO-ROUND-3.md:7267,
+   *  refute-drum POWDER run: 32 score voices in 8 s with the recording live). */
+  function ensurePwBus(c: AudioContext): GainNode {
+    if (pwBus) return pwBus;
+    pwBus = c.createGain(); pwBus.gain.value = 0.0001;
+    // a touch of air: one short feedback delay, wet and quiet — snowfields
+    // are the quietest place a child has ever stood, and the reverb says so
+    const dly = c.createDelay(0.5); dly.delayTime.value = 0.22;
+    const fb = c.createGain(); fb.gain.value = 0.28;
+    const wet = c.createGain(); wet.gain.value = 0.18;
+    pwBus.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet);
+    wet.connect(musicBus!); pwBus.connect(musicBus!);
+    return pwBus;
+  }
   function startPowderScore() {
     const c = ensure(); if (!c || !master) return;
-    if (!pwBus) {
-      pwBus = c.createGain(); pwBus.gain.value = 0.0001;
-      // a touch of air: one short feedback delay, wet and quiet — snowfields
-      // are the quietest place a child has ever stood, and the reverb says so
-      const dly = c.createDelay(0.5); dly.delayTime.value = 0.22;
-      const fb = c.createGain(); fb.gain.value = 0.28;
-      const wet = c.createGain(); wet.gain.value = 0.18;
-      pwBus.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet);
-      wet.connect(musicBus!); pwBus.connect(musicBus!);
-    }
+    ensurePwBus(c);
     pwRunning = true;
-    ramp(pwBus.gain, 0.5, c.currentTime, 1.8);
+    ramp(pwBus!.gain, 0.5, c.currentTime, 1.8);
```
```diff
   function pwDrum(t: number, vol = 0.20) {
     const c = ctx; if (!c || !pwBus) return;
+    if (recordingLive()) return;   // a drum — see recordingLive. Cannot touch the
+                                   // fallback score: recordingLive() is false there.
```
```diff
   function powderEvolve() {
     const c = ensure(); if (!c) return;
-    if (!pwBus) startPowderScore();
+    const bus = ensurePwBus(c);
     const t = c.currentTime + 0.02;
+    // under a recording the bus is parked at silence: lift it for the
+    // flourish and put it back, WITHOUT starting the scheduler
+    if (!pwRunning) { ramp(bus.gain, 0.5, t, 0.05); ramp(bus.gain, 0.0001, t + 1.0, 0.8); }
     [0, 2, 4, 5, 7].forEach((d, i) => pwBox(pwDeg(d), t + i * 0.07, 0.17));
```
Probe that fails before it: POWDER run, "AFTER evolve, 8 s wall: voices = 32 @bus, theme.srcs = 1". Expected after: the evolve flourish's own voices only (the 5 pwBox + 2 pwBells, no pwDrum), then 0 in the following 8 s. NOMP3-style run on Powder (`--world=powder --nomp3`): the score and its pwDrum unchanged.

**4. The shipped SFX manifest, `public/assets/audio/README.md:9`** (copied into `dist/`):
```diff
-| `eaten_deep.wav` | swallowing something big | deep whoosh, swallow, gulp, soft impact, sub drop |
+| `eaten_deep.wav` | UNWIRED since 702a3e4 — the file in this slot is a kick drum (73 % of its energy under 120 Hz, peak −0.9 dBFS) and played at +14 dB over the Lantern recording on every big swallow. The swallow is the synth whoosh until the owner approves a replacement; re-wiring is one `sample()` line in `bigEat()`. | deep whoosh, swallow, gulp — no sub drop, nothing under 120 Hz |
```

**5. Ledger retractions, appended (not rewritten) — the crew's §7, still owed after the landing.** Append to `docs/HANDOFF.md` after line 355:
```
  RETRACTED 2026-09-02 (refute-drum): "the swallow one is now a soft whoosh" was
  false from the day it was written — eaten_deep.wav was present, decoded on the
  first gesture, and `sample()` returned before the whoosh line; measured on the
  pre-702a3e4 build: one 1.8 s buffer at −20.4 dBFS, +14.1 dB over the Lantern
  recording. The whoosh plays for the first time as of 702a3e4.
```
and to `docs/AAA-BRIEF.md` after line 1379 (the end of that entry):
```
RETRACTED  2026-09-02 (refute-drum). "with eaten_deep.wav absent" — the file was
           present and tracked (79,424 bytes, since 589e31e, 2026-08-16) when this
           was written, and the fallback described under CHANGED never executed.
           NOW should have read: every big swallow plays a recorded kick drum at
           +14 dB over the recording. Corrected by 702a3e4; probe: qa/drumover.mjs.
```
And for `docs/GOVERNOR.md`'s retractions list, the governor's own entry (his file; text supplied): *"702a3e4's message says pwBus 'runs solely on the 404 fallback path' and that the crew's pwDrum guard 'would have silenced Powder's fallback score'. Both false: powderEvolve() starts the Powder score under a recording (measured, refute-drum), and recordingLive() is false whenever a fallback score plays, so the guard could not have touched it. The correction I made to the proposal was wrong; the proposal was right."*

**6. `qa/_wav.mjs:5-7`** header: replace "bigEat(), win() and MAPLE's evolve() all try sample() FIRST and return if the buffer is resident (audio3d.ts:3224, :3284, :1124)" with "win() and MAPLE's evolve() try sample() FIRST and return if the buffer is resident; bigEat() no longer does (702a3e4 — eaten_deep.wav is a kick drum and is unwired)". Scratch file; a false header is still a false statement in the repo.

**7. The probe the crew specified, written as a proposal — `qa/drumover.mjs`.** Registration for `qa/gate.mjs` beside `:245`:
```js
  { id: 'drumover', tier: 'audio', profiles: ['push', 'live'], timeout: 1500,
    cmd: ['node', 'qa/drumover.mjs', PORT, 'lantern'], verdict: pf,
    why: 'nothing percussive plays on top of a recording the owner supplied' },
```
Bars, each with a measured before/after and a stated reason:
- **LEG A — the sample.** Parse every `sample('<name>.wav'` call site out of `src/proto3d/audio3d.ts`; throw if zero. Decode each in-page; energy share below 120 Hz by FFT integral on the decoded `AudioBuffer`. **BAR: no sample with > 60 % below 120 Hz may be triggered while a recording plays.** Reason: 60 sits between the kick (73.2 %) and the riser (`evolve_epic` 39.4 %); the crew's 80 % passes the kick under a correct measurement. Before: `bigEat` → `eaten_deep` 73.2 % → FAIL. After: no sample at the swallow → PASS.
- **LEG B — the sting.** Fingerprints parsed from the source, throw if the parse fails: `taiko`'s `dTone` literals (128/190/52/88), `bDrum`'s (92/48), `shime`'s (640/380), `mSnare`'s body (195/160), `pwDrum`'s (120/48). With `__music().theme.srcs > 0` asserted at every fire, fire `bigEat`, `alert`, `evolve`, and `matchBeat` for each authored banner (the four Lantern strings above; Game Day's four; the world's own), count drum-fingerprint voices whose gain connects DIRECTLY to master (not via musicBus). **BAR: 0.** Before: 12 / 1 / 3 / 3 / 1+5 / 9. After this commit: 0 / 0 / 0 / 0 / 0+**5** / 0 → still FAIL until correction 1.
- **LEG C — the rate, on the match clock.** ≥ 20 MATCH seconds (`__matchState().t`) of free play; every 500 ms wall assert `theme.srcs > 0` (FAIL, not zero, if it is not) and count spontaneous leg-A samples and leg-B voices to master. **BAR: 0.** Before: 36 taikos / 20 s (crew), 12 per family arrival.
- **LEG C′ — the 404 path, the guard against the gate firing wrongly.** Boot once more with the world's mp3 routed to 404; assert `synth === true` and `theme.srcs === 0`; fire `alert()` and assert taiko-to-master == the count parsed from `lnLastSting` (12); assert the score's own drums keep constructing (`@bus` count > 0 over 6 s wall). A drum gate that silences the fallback score is a FAIL.
- **LEG D — the level, reported not gated.** Analyser fftSize 32768 before destination; max window RMS per fire against the music-only baseline. `evolve()` ducks the music by design, so no bar.
- **Wrong-reason guards, each an explicit FAIL:** recording never started; match clock did not advance; fingerprint parse found nothing; analyser baseline below -60 dBFS (the probe cannot claim silence it cannot hear); `pgrep -c chromium` is 0 on this box while chrome is running — use the GPU lock and `pgrep -c chrome`.
The scratch implementation that produced every number in this file is `scratchpad/drumprobe.mjs`; its instrumentation block (connect / createOscillator / createBufferSource / AudioParam / both `start` overrides / analyser splice / route classification) is the reference for the landed probe. Its two bugs, found and fixed during this refutation — `AudioBufferSourceNode.prototype.start` must be hooked separately, and `page.evaluate(fn, arg)` must forward the banner string — are the kind the landed file must not repeat: both produced plausible zeros.

---

## Incremental record (appended as measured; the DRAFT header was replaced by the verdict above when the last run finished)

<!-- appended 1: on-disk reads, before any probe -->
### On-disk, read at HEAD 301a8be (audio3d.ts unchanged since 702a3e4: `git log 702a3e4..HEAD -- src/proto3d/audio3d.ts` is empty)

- `git show 702a3e4 --stat`: ONE file, `src/proto3d/audio3d.ts`, +27/-3. No probe, no doc, no README change.
- `dist/` is dated Sep 2 00:13; `find src -newer dist/index.html` is empty; the preview on :4177 serves `assets/main-BlHCCMf5.js` which is the file in `dist/`. So :4177 IS this commit's build.
- `grep -o "eaten_deep" dist/assets/*.js` → nothing. The shipped bundle no longer names the file. `grep -c "srcs.length>0||" dist/assets/main-BlHCCMf5.js` → 1 (the predicate is in the bundle).
- `curl :4177/assets/audio/eaten_deep.wav` → `200 79424`. The asset still ships (as the commit says).
- `sample()` (`audio3d.ts:359-377`) is the ONLY loader of `/assets/audio/*`; every call site: `grep -n "sample('" src/proto3d/audio3d.ts` — see below.
- READERS OF eaten_deep OUTSIDE the commit's two prewarm lists:
  1. `src/game/audio.ts:71` (`eaten_deep: '/assets/audio/eaten_deep.wav'`) and `:483` (`if (this._playSample('eaten_deep', 1, 0.65)) return;`). This is the OLD 2D engine; its importers are `src/ui/UILayer.tsx`, `src/ui/DebugPanel.tsx`, `src/game/{world,events,engine}.ts` — none reachable from `index.html`'s single entry `/src/prototype3d.ts` (its imports: `./game/{stickers,seasons,unlocks,matchdeck}` only, never `./game/audio`). Confirmed dead in the bundle by the dist grep above. NOT a live reader.
  2. `public/assets/audio/README.md:9` (copied into `dist/assets/audio/README.md:9`): a shipped manifest that still says `eaten_deep.wav` "fires when swallowing something big" and "Drop a file here under the exact name and it plays" — FALSE since 702a3e4; nothing reads that slot any more. Doc-only, but it is the file a future asset-dropper will read first.
  3. `qa/_wav.mjs:19` decodes `eaten_deep.wav` at 0.55 and its header (`:5-6`) says "bigEat() ... tr[ies] sample() FIRST and return[s] if the buffer is resident (audio3d.ts:3224...)". Scratch probe (`_`-prefixed), not on the gate; its header is now a false statement about `bigEat()`.
  4. `dist-gw/assets/main-CJg517oQ.js` — an Aug 17 scratch build (gitignored by `dist-*/`), not served. Ignore.
  No service worker, no PWA manifest, no preload manifest (`find . -name 'sw.js' -o -name '*.webmanifest' -o -name 'manifest*.json'` outside node_modules → nothing).
- `docs/HANDOFF.md:351-355` still says the swallow "is now a soft whoosh, not a thud"; `docs/AAA-BRIEF.md:1357` still says "with eaten_deep.wav absent". The proposal's §7 listed these as corrections OWED; the commit did not touch them.
- THE PREDICATE. `recordingLive = () => themeCh.srcs.length > 0 || menuCh.srcs.length > 0` (`:1935`). Where `srcs` is written:
  - `startLoop` `:528-529` pushes each pass's `AudioBufferSourceNode`, capped at 3; ENDED sources are never removed — only `stopLoop` clears. A running loop therefore always has srcs.length in 1..3 (pass 1 pushed synchronously at `:532`).
  - `startLoop` REFUSES on a non-running clock (`:458-460`), sets `cold=true` and pushes nothing → srcs stays 0 → gate open, but nothing is audible either. Consistent.
  - `stopLoop(ch, fade>0)` (`:543-548`) sets `ch.srcs = []` IMMEDIATELY and stops the old sources `fade` s later. So for the 1.2 s after `stopMusic()` (`:4022-4023`) and the 0.6 s after `menuCh` stands down at match start (`:3724-3725`) the recording is STILL AUDIBLE while `recordingLive()` is FALSE. `win()` fires "right after stopMusic()" by design (`:2444-2445`, `prototype3d.ts:4824→4836/4875`), but Lantern's `win()` is `sample('win_warm.wav')`/triangle notes — no drum voice — so nothing percussive rides that window today. Noted as a limit of the predicate, not a kill.
  - `releaseBuf` (`:561`) touches `buf`/`era` only, never `srcs`. `playTrack`/`preload` never touch `srcs` directly; they call `startLoop`. The era guard drops a stale decode before `startLoop` runs, so a released channel cannot resurrect srcs. Consistent.
  - The 404 path: `playTrack` sets `ch.bad=true`, never calls `startLoop` → srcs stays 0 → `recordingLive()` false → stings play over the synth score, and the score's own taikos go to `lnBus` (`:3270-3271`, dest !== master) so they are never gated. Consistent with the commit's claim.
- DRUM VOICES AND WHERE THEY ROUTE (every call, `grep -n -E "bDrum\(|taiko\(|pwDrum\("`):
  - `taiko(master, …)`: `:3518` lanternEvolve, `:3528` lnGateSting ×3, `:3539` lnNoticeSting, `:3547,:3552` lnBathhouseSting ×9, `:3557` lnLastSting ×12 (= `alert()` on Lantern, `:4227`), `:3451,:3484,:3508` via `dest` (need to check what dest those receive — they are inside the Lantern SCORE scheduler, dest = lnBus).
  - `taiko(lnBus, …)`: `:3270-3271` the score. Not gated. Correct.
  - `bDrum(master, …)`: `:2449` bandLand (Maple), `:2997,:3007,:3016,:3036` Game Day stings, `:3971` Game Day generic beat. `bDrum(mapBus|gdBus|gzones.greek.g|dest, …)`: scores, not gated.
  - `pwDrum`: `:3649` (score) and `:3684` (`powderEvolve`, which starts the Powder score under a recording — proposal F3, NOT in this commit). Both to `pwBus`. The governor's "pwDrum routes only to pwBus" is true on disk.
- `pop()` still fires `tone(52, 30, 0.2, 'sine', depth*0.14, 0.03)` to master for depth > 0.35 (`:4109`) — ungated, flagged by the proposal, not proposed. Every big swallow calls `bigEat()` ONLY (`prototype3d.ts:5294`: CHOMP → `audio.bigEat()`; else → `audio.pop(...)`), so bigEat and pop are exclusive per eat.

<!-- appended 2: harness -->
### Harness (all runs on this box, serial, load < 4 checked before each launch)
- Probe: `/tmp/claude-0/.../scratchpad/drumprobe.mjs` (scratch, not landed). Wraps `AudioNode.prototype.connect` (records the graph and splices an `AnalyserNode` fftSize 32768 in front of `destination`), `createOscillator`/`createBufferSource`/`AudioParam.{set,exp,lin}*` (records each voice's frequency schedule) and `AudioScheduledSourceNode.start`. Route classification: master = the GainNode feeding the DynamicsCompressor that feeds destination; musicBus = the lowest-id GainNode feeding master; a voice is `@master` iff its chain reaches master without passing musicBus. Taiko fingerprint = sine 128→52 or 190→88 (`dTone` at `:3147`); bDrum = sine 92→48; sample = buffer 1.7–1.9 s; whoosh = non-loop buffer of 0.34 s.
- A/B "before": the parent `702a3e4^` (= e0f7e13) built in a gitignored worktree `/home/user/voidling/.claude/worktrees/refute-drum-parent` (`npm run build` inside its `artifacts/3d-game`, exit 0, `✓ built in 5.75s`; its bundle `main-BhftODn3.js` names `eaten_deep.wav` 3 times, the live one 0). Served to the SAME page URL by a playwright `route()` from that dist — no second server started.

<!-- appended 3: the asset, measured by me -->
### The sample itself, re-measured (scratch `wavstat.mjs`: RIFF parse, radix-2 FFT over the file, energy share = sum |X|² below cutoff / total; centroid energy-weighted)
```
eaten_deep.wav: 16-bit 1ch 22050 Hz, 1.800 s, peak -0.9 dBFS, RMS -17.1 dBFS
  energy below 120 Hz: 73.2%   spectral centroid 127 Hz   50% of energy below 55 Hz, 90% below 246 Hz
  (first 0.5 s only: RMS -11.7 dBFS, below-120 72.3%, centroid 130 Hz)
win_warm.wav:    3.200 s  below-120 0.0%   centroid 417 Hz
evolve_epic.wav: 2.900 s  below-120 39.4%  centroid 1012 Hz   (first 0.5 s: 0.0%)
gulp_1.wav:      1.280 s  below-120 0.0%   centroid 720 Hz
```
- Peak -0.9 dBFS, half its energy under 55 Hz, a 1.8 s monotonic decay: it is a thud/kick by any reading, so the proposal's CHARACTERISATION stands. Its NUMBER does not: the crew's "93.8% below 120 Hz" came from a naive DFT sampled at 30 log-spaced bins, which is not an energy integral (log-spaced bins pile up at the low end and over-weight it). Round 3's 88.7% is a third grid. A proper FFT energy share is **73.2%** whole-file / **72.3%** first 0.5 s. This matters because the crew's proposed LEG A bar is "no sample above 80% sub-120 Hz": under a correct measurement `eaten_deep.wav` is BELOW that bar and LEG A as specified would PASS the very file it was written to catch. Carried into the probe proposal below.
- Blob history (`git log --all --diff-filter=A -- '*eaten_deep.wav'` → `589e31e`; `git cat-file -s` at a3b3ba2 / 7bad24c / 702a3e4^ / HEAD → 79424 each). The commit's "one unchanged 79,424-byte blob, present on the day the fix declaring it absent was written" is TRUE on disk.

<!-- appended 4: pwDrum premise, on disk (measurement pending) -->
### The governor's pwDrum correction — its premise, read on disk
The commit: "pwDrum takes no dest and routes only to pwBus, a world-score bus that runs solely on the 404 fallback path where there is no recording to clash with."
- `pwDrum` → `pwBus` → `musicBus` → master (`:3622-3634`, `:3656-3663`). True.
- "runs solely on the 404 fallback path": FALSE on disk. `evolve()` `:4154` → `powderEvolve()` `:3678`, whose first line is `if (!pwBus) startPowderScore();` `:3680`. On a Powder match with `powder.mp3` playing, `pwBus` is null (nothing on the recording path builds it), so the FIRST evolution builds the bus, sets `pwRunning = true`, ramps `pwBus.gain` to 0.5 over 1.8 s and starts `setInterval(pwSchedule, 110)` (`:3653-3670`) — the entire Powder score, under the recording — and `powderEvolve()` then plays `pwDrum(t + 0.5, 0.2)` `:3684`; from `musStage >= 3` the scheduler adds `pwDrum(t, 0.16)` every fourth 8th (`:3649`). Nothing on this path sets `synthOn`, so `synthStop()` (`:790`) returns at its first line and never stops it. This is the proposal's F3 (and `docs/STUDIO-ROUND-3.md:7267`), which the commit did NOT land — yet the commit's reason for leaving `pwDrum` ungated assumes F3 is already true. Measured below (Powder run) before it is called a kill.

<!-- appended 5: LIVE run 1 (oscillator data valid; buffer-source data INVALID, see note) -->
### Run 1 — live build on :4177, Lantern, recording playing (`node drumprobe.mjs --tag=LIVE`, log `scratchpad/live.log`)
Harness: swiftshader, 430x932, GPU lock held, load 3.62 at launch. Match clock moving 4.8 s wall after the card tap; `__music()` at the first sample: `theme:{srcs:1, starts:1, dur:146, gain:0.4, cold:false}`, `menu.srcs:0`, `synth:false`, `ctx:running`. So on the real path **`recordingLive()` ≡ `theme.srcs>0 || menu.srcs>0` is TRUE** from the first frame of the match — srcs held exactly one source for the whole run (1/1 before and after every fire).
- Music-only baseline at the output (45 analyser windows of 0.74 s): mean **-33.0 dBFS**, max -29.1.
- `alert()`: 5 voices, **TAIKO@master = 0** (kane's four sine partials 1180/2844/4519/6962 and the clack square 1900→1200 still play). Pre-fix this is 12.
- `evolve()`: 17 voices, TAIKO@master = 0. Koto/shaku/kane all present.
- `matchBeat()` ×4 banners: 11 voices each, TAIKO@master = 0 — but **5 × sine 640→380 @master each**, which is `shime()` (`:3153`, "the small rope-tuned drum that keeps the actual time"). A drum, to master, over the recording, UNGATED. See kill shot 2.
- All four banner strings produced the identical voice set (kane + 5 shime + shaku), i.e. all four routed to `lnNoticeSting` — checked below.
- THE TAIL: `stopMusic()` → `theme.srcs` 1 → **0 immediately**; the output over the next 0.7 s wall still measured -40.7 … -48.8 dBFS (the 1.2 s fade tail; music-only mean is -33); `alert()` fired inside that tail constructed **12 TAIKO@master**. The predicate reads "not live" while the recording is still audible. Small window, real, noted as a limit (nothing percussive is scheduled there by the game today: Lantern's `win()` has no drum).
- **INVALID in this run: every buffer-source count** (bigEat voices=0, boot voices=0 while a 146 s track was audibly playing). Cause: `AudioBufferSourceNode` overrides `start()` on its own prototype; the probe had hooked `AudioScheduledSourceNode.prototype.start` only. Caught because "boot voices = 0" contradicted `theme.srcs = 1`. Hook fixed (both prototypes) and the run repeated — run 2 below is the record for the whoosh; run 1's oscillator counts stand.
- CORRECTION to the line above about the four banners: that was MY bug, not the game's — `fire()` called `p.evaluate(js)` without forwarding the banner string, so `matchBeat(undefined)` fell to the `else lnNoticeSting(lt)` branch (`:3984`) four times. Fixed (argument forwarded) before run 2. The 5 × shime per notice sting stands; the gate/bathhouse stings are measured in run 2.

<!-- appended 6: the other drums, on disk -->
### "The gate now lives where a drum is MADE" — every percussive voice in the file that is written to `master`, read on disk
`grep -n "shime(\|clack(\|geta(\|nHit(\|mSnare(" src/proto3d/audio3d.ts | grep master`:
| voice | what it is (the file's own words) | body | master call sites | gated by 702a3e4? |
|---|---|---|---|---|
| `taiko` `:3142` | "The big drum" | sine 128→52 / 190→88 + skin noise | lnGateSting ×3, lnNoticeSting ×1, lnBathhouseSting ×9, lnLastSting ×12, lanternEvolve ×1 | YES |
| `bDrum` `:1937` | bass drum | sine 92→48 | bandLand, gamedayEvolve, kickoffSting, bandOnSting, fourthQuarterSting, Game Day generic beat `:3971` | YES |
| `shime` `:3152` | "The small rope-tuned drum that keeps the actual time" | sine 640→380 (0.09 s) + noise 0.05 s | lnNoticeSting **×5** (`:3538`) | **NO** |
| `mSnare` `:1925` | marching snare | noise 0.07 s + triangle 195→160 | bandLand `:2450`, Maple roll **×7** `:2487`, `:2501`, `:2514`, gamedayEvolve `:2998`, bandOnSting **×6** `:3015`, fourthQuarterSting **×10** `:3033` | **NO** |
| `nHit` `:962` | filtered noise hit | noise | concessionSting **×5** `:3026`, `:1699` | **NO** |
| `clack` `:3175` / `geta` `:3189` | wood clappers / sandals | noise + square 1900→1200 | lnGateSting ×2, lnLastSting ×1 | NO (arguably not "a drum") |
| `pwDrum` `:3622` | "a soft low drum" | sine 120→48 | via pwBus (see the Powder section) | NO, by the governor's decision |
| `pop()` sub `:4109` | 52→30 sine on every bite > depth 0.35 | sine | master | NO (flagged by the crew, not proposed) |
Every world with a recording (`public/assets/music/`: maple, pirate, gameday, lantern, powder, menu — all present) therefore still has ungated percussion on master: on Lantern the five-stroke shime pattern inside `lnNoticeSting` (fired by `matchBeat` for "drum/tower/start" banners AND as the fall-through for any unmatched banner, `:3982-3984`); on Game Day a six-stroke and a ten-stroke snare roll with the bass drum removed from under them. The commit's sentence "a new sting cannot route around it and still be a drum" is true only for the two voices it gated; two existing drum voices already route around it. Measured for Lantern in run 2 (shime count per banner) — Game Day queued as run 5.

<!-- appended 7: LIVE run 2 (hook fixed; this is the record for the whoosh) -->
### Run 2 — live build on :4177, Lantern, recording playing (`--tag=LIVE2`, log `scratchpad/LIVE2.log`)
Boot: match clock moving 5.9 s wall after the tap; `theme.srcs:1 starts:1 dur:146`, `synth:false`. Boot voices now include the two 146 s TRACK buffers (`TRACK@bus` ×2 = pass 1 and the pre-armed pass 2) — the hook sees buffers now. Baseline music-only (45 windows): **mean -34.8 dBFS, max -30.1**.
- **`bigEat()` → exactly ONE voice: a 0.34 s non-loop buffer, chain `BiquadFilter → Gain → master → DynamicsCompressor → destination`.** That is `noise(0.34, 0.14, 480, 120)` (`:4133`) — the whoosh — reaching the output. No 1.8 s buffer, no oscillator. Three fires: 1/1/1 voices.
- **How loud the whoosh is over the music**: max output window during bigEat = **-31.2 / -31.4 dBFS** (third fire -25.3, contaminated: fired while the bathhouse sting's koto was still ringing) against a music-only mean of -34.8 and a music-only MAX of -30.1. So the swallow adds ≤ 3.6 dB over the music's mean and does not exceed the music's own loudest window. Not silent; not audible as a separate event either, at this harness's MASTER_VOL 0.62. The commit and the crew both said the whoosh "plays for the first time" — it does; neither said it would be heard. Its level ALONE is measured in run 3 (silence after stopMusic).
- `alert()`: 7 voices, TAIKO@master **0** (kane 4 partials, clack square + its 2 noise bursts). `evolve()`: 24 voices, TAIKO **0**. Recording live 1/1 before/after every fire.
- `matchBeat("the lanterns are lit")` → lnGateSting: 12 voices, TAIKO 0, 2 clack squares. `("free tonight, they insist")` → same. `("the bathhouse doors open")` → lnBathhouseSting: 26 voices, TAIKO 0 (its 9 taikos gone; koto/kane/suzu/shaku stay).
- **`matchBeat("the drum tower starts")` → lnNoticeSting: 24 voices, TAIKO 0, `SHIME@master` = 5.** Five drum strokes (sine 640→380 + a noise burst each, `:3153-3154`) on top of the recording, ungated — measured, not read.
- TAIL again: `theme.srcs` 1→0 the instant `stopMusic()` is called; the output over the next 0.7 s measured -30.8…-37.3 dBFS, i.e. AT music level (the 1.2 s fade has barely begun) — and `alert()` inside it constructed **12 TAIKO@master**. The predicate says "no recording" while the recording is at full level for up to 1.2 s after every match end and 0.6 s after the menu stands down at match start. Nothing the game schedules today lands a drum in those windows on Lantern (`win()`/`lose()` carry no drum, rivals do not `alert()` after TIME), so it is a limit of the predicate, not an audible defect.
- Free play: 6 s wall before the fires and 8 s wall after evolve → 0 spontaneous voices (nothing was eaten, nobody arrived) — consistent with the crew's `bites: 0` windows; the rate leg needs MATCH seconds, which is the probe proposal's job.
- Harness note for the brief: `pgrep -c chromium` returned 0 on this box while two `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` GPU processes were running (`ps aux`, 04:04 UTC). The process name is `chrome`; `pgrep -c chrome` is the check that works. The GPU lock (`mkdir /tmp/gpu.lock`) and the load check did the real work here. Two other agents' browsers were observed running concurrently (04:01 and 04:03 GPU processes) with the lock held by one of them.

<!-- appended 8: runs 3-6 -->
### Run 3 — the PARENT build (702a3e4^ = e0f7e13), Lantern, recording playing (`--tag=PARENT --dist=<worktree>/dist`, log `scratchpad/PARENT.log`)
Same page URL, same harness; the worktree's dist served by `route()`. `theme.srcs:1`, `synth:false`. Boot voices: `SAMPLE1.8@master ×4` — the four prewarm `sample('eaten_deep.wav', 0)` calls found the buffer ALREADY DECODED and started it at gain 0 before the match began. "Pre-decoded on the child's first gesture": measured true.
- **`bigEat()` → ONE voice: a 1.8 s buffer, `Gain → master → limiter → destination`. Max output window -20.4 / -20.1 / -19.9 dBFS against a music-only mean of -34.5 (max -30.0): +14.1 dB over the music, +9.6 dB over the music's loudest window.** The crew's +12.4 dB is the same finding on a different night. No 0.34 s buffer — the whoosh never constructed. The commit's central claim is measured true on the build it replaced.
- `alert()` → **TAIKO@master = 12**, max window -23.7 dBFS (+10.8 dB over the music). `evolve()` → 1. `matchBeat` lanterns-lit → 3, free/insist → 3, drum tower → 1 (+ 5 shime), bathhouse → **9**.
- Free play (6 s + 8 s wall): 0 spontaneous voices in both builds — nothing joined and nothing was eaten in those windows; the rate leg is the probe's job.

### A/B, same harness, same night
| entry point | PARENT (before) | LIVE2 (after) | NOMP3 (after, mp3 → 404) |
|---|---|---|---|
| `bigEat()` voices | 1 × 1.8 s sample @master, -20.4 dBFS | 1 × 0.34 s whoosh @master, -31.2 dBFS | 1 × 0.34 s whoosh |
| `alert()` TAIKO@master | 12 | **0** | 12 (correct: no recording) |
| `evolve()` TAIKO@master | 1 | 0 | 1 |
| gate sting ("the lanterns are lit") | 3 | 0 | 3 |
| gate sting ("free tonight, they insist") | 3 | 0 | 3 |
| notice sting ("the drum tower starts") TAIKO / SHIME | 1 / **5** | 0 / **5** | 1 / 5 |
| bathhouse sting TAIKO | 9 | 0 | 9 |
| music-only mean, dBFS | -34.5 | -34.8 | -32.4 (synth score) |
The probe FAILS on the parent and PASSES on the commit for every voice the commit gated (rule 2 satisfied by this refutation, not by the landing — the landing shipped without one). It FAILS on both for shime.

### Run 4 — the 404 path (`--tag=NOMP3 --nomp3`: `lantern.mp3` routed to 404 on the live build)
`theme:{bad:true, srcs:0, starts:0}`, `synth:true` — the hand-written Lantern score is up (its own voices all `@bus`: 6 TAIKO@bus and 15 SHIME@bus at boot, 8 and 21 more in 6 s of free play — the score's drums are untouched by the gate, as the commit says). Every sting keeps its drums: `alert()` → 12 TAIKO@master, bathhouse → 9. **The gate does not fire where there is no recording.** The "fires when it should not" kill fails.

### Run 5 — Powder, `powder.mp3` playing (`--tag=POWDER --world=powder`)
`theme:{srcs:1, dur:224}`, `synth:false`, music-only mean -30.6 dBFS. `evolve()` → 31 voices including **`PWDRUM@bus` ×1** and 14 music-box triangles/pads `@bus`; **the following 8 s wall of free play constructed 32 more `@bus` voices (pwBox/pwPad triangles and sines) with `theme.srcs=1 synth=false`** — the Powder scheduler is running under the recording, exactly as `:3680` reads. The commit's "pwBus … runs solely on the 404 fallback path where there is no recording to clash with" is measured false. (`matchBeat` on Powder fell through to Maple's stings — `SNAREBODY@master` ×1 each — an ungated snare over `powder.mp3`.)

### Run 6 — Game Day, `gameday.mp3` playing (`--tag=GAMEDAY --world=gameday`)
`theme:{srcs:1, dur:203}`, music-only mean -42.1 dBFS (a quiet stretch of the track). `evolve()` → BDRUM@master **0** (gated; `:2997` has one) but `SNAREBODY@master` 1 + 3 noise bursts; "the band takes the field" → BDRUM 0, **6 snare strokes** (2 bodies + noise) @master; "fourth quarter" → BDRUM 0, **10 snare strokes** @master, max window -20.6 dBFS (+21 dB over this stretch of the music — the whole sting: brass, sousa, roar, snares); "kickoff" → BDRUM 0, whistle + brass + roar. So bDrum's gate works on Game Day, and the marching-snare rolls it was written to sit under play on, over the recording, ungated.
- The whoosh with the music quiet: bigEat → 1 voice, max window **-26.6 dBFS** (second fire, no pop in the window) against -42.1 music: the whoosh ALONE sits near -27 dBFS in a 0.74 s window — about 7 dB under the old sample's -20 and at Lantern's music level (-34.8 mean / -30.1 max). Not silent; not a separate event over Lantern's track at this MASTER_VOL.


---

## Third run — VERDICT: SOUND WITH CORRECTIONS (independent re-measurement, 2026-09-02 09:49–10:45 UTC)

**Refuter:** the skeptic for lane `drum`, third run (the workflow resume re-ran this lane; the governor restored the second run's verdict above at `582d993` and kept this run's draft beneath it — this section is that draft, finished). Read, before measuring: `git show 702a3e4`, the real `src/proto3d/audio3d.ts` at HEAD, `docs/GOVERNOR.md`, `docs/OWNER-2026-08-29.md`, `docs/crews/round-4/lantern-drum.proposal.md`, and the second run's verdict above — **which I treated as a claim to test, not a record to inherit**: every number below is from my own probe (`scratchpad/drumprobe3.mjs`, written fresh, hooks and route classification designed from the source at HEAD) and my own FFT (`scratchpad/wavstat3.mjs`). HEAD moved from `bb89582` to `215fb8e` during the run (record ticks only); `git log 702a3e4..HEAD -- src/proto3d/audio3d.ts` is empty at both. No tracked file edited; this file is the only one written.

**Ruling.** I tried to kill the landing on all five briefs and it survived four; where it fell it fell on its own words, not its code. Measured, parent vs. this commit, same harness, same night: a big swallow on the parent build constructs **one 1.8 s buffer to master at -20.4 / -20.1 / -21.7 dBFS against a music-only mean of -34.3 (+13.9 dB)**, and on this build **one 0.34 s filtered-noise buffer at -30.9 / -29.5 / -31.4 dBFS against -34.1 (inside the recording's own window range, max -29.4)**; `alert()` on Lantern constructs **12 taikos to master (-24.0 dBFS, +10.3 dB) on the parent and 0 here**; every other taiko site 3/3/1/9 → 0/0/0/0; `recordingLive()` is true from the first frame on the real path (`theme.srcs = 1`, Lantern ×2 and Powder) and false on the 404 path (`srcs 0, bad true, synth true`), where every sting keeps its drums (12 / 1 / 3 / 3 / 1 / 9) and the fallback score's own drums keep constructing (`TAIKO@bus`, `SHIME@bus`). The second run's numbers reproduce within 0.3 dB and to the voice. Its two kill shots also reproduce: **`shime` ×5 to master under the recording** on this build (the commit's "a new sting cannot route around it and still be a drum" is false for two existing drum voices), and **the Powder score starts under `powder.mp3` on the first `evolve()`** (`PWDRUM@bus` 1, then bus voices in every later window) — so the commit's reason for not gating `pwDrum` ("pwBus … runs solely on the 404 fallback path") is false and its consequence ("would have silenced the fallback score") impossible, since the predicate is false whenever a fallback score plays. One thing the second run got wrong and I correct: **a service worker exists** (`public/sw.js`, shipped as `dist/sw.js`) — it is simply not registered by the live entry and caches no audio, so the finding (no third reader) stands. `tsc --noEmit` exit 0, run by me.

### What I ran

All on this box, one browser at a time, `/tmp/gpu.lock` held for each run (the chain waited ~40 min behind another agent's browser; a first chain attempt with a 20 s lock poll never won the lock and was restarted with a 2 s poll), swiftshader, 430×932. Nothing sampled on wall time is reported as a match number. Logs: `scratchpad/{LIVE,PARENT2,NOMP3,POWDER}.log`, chain output `scratchpad/chain3.out`.

1. `git show 702a3e4` (one file, +27/-3) read in full; then every function it touches or names, at HEAD (below).
2. **Parent build for A/B.** `git worktree add --detach <scratchpad>/parent 702a3e4^` (= `e0f7e13`; my first worktree under `.claude/worktrees/` was pruned by another agent mid-run — `PARENT` in `chain3.out` timed out on a directory that no longer existed and is void), `node_modules` symlinked, `npm run build` → `✓ built in 6.99s`; its bundle `main-vbMniFGf.js` names `eaten_deep` 3×, the live `main-BlHCCMf5.js` 0×. Served on **:4209** by its own `vite preview` (stopped after the run). :4177 serves `dist/` dated Sep 2 00:13 = this commit's build (`find src -newer dist/index.html` empty).
3. **`scratchpad/drumprobe3.mjs`** — `AudioNode.prototype.connect` hooked (graph recorded; `AnalyserNode` fftSize 32768 spliced before `destination`, smoothing 0), the `create*` factories tagged, `AudioParam.{setValueAtTime, exponentialRampToValueAtTime, linearRampToValueAtTime}` on `frequency` recorded per oscillator, `start` hooked on `AudioScheduledSourceNode.prototype` AND `AudioBufferSourceNode.prototype` (measured: `OscillatorNode` has no own `start`, `AudioBufferSourceNode` does — the second hook is not optional). Route: master = the GainNode feeding the DynamicsCompressor feeding destination (`ensure()` `:226-232`); musicBus = lowest-id GainNode feeding master (`:233`); `@master` = reaches master without passing musicBus, `@bus` = passes it. Fingerprints from the engine's own schedules: TAIKO sine 128→52 / 190→88 (`:3147`), BDRUM 92→48 (`:1939`), SHIME 640→380 (`:3153`), SNAREBODY triangle 195→160 (`:1927`), PWDRUM 120→48 (`:3626-3627`), POPSUB 52→30 (`:4107`), SAMPLE1.8 = 1.7-1.9 s buffer, WHOOSH0.34 = 0.34 s non-loop buffer. Boot: `?w=<world>`, wait `__voidState`, dismiss daily/gift, `#btnPlay`, the world card, wait `__matchState().t > 0.2`, wait until `__music()` shows the recording (or, `--nomp3`, `synth`). Then a 12 s-wall music-only baseline (100 windows), `bigEat` ×3, `alert`, `evolve`, `matchBeat` per authored banner, `pop(0.8)`; optional free play measured on `__matchState().t`; then `stopMusic()` → read `theme.srcs` at once, `alert()` 0.25 s later, output over the next ~1.8 s. Runs: **LIVE** (:4177, Lantern, 12 match s free play), **PARENT2** (:4209, Lantern, 6 match s), **NOMP3** (:4177, `lantern.mp3` → 404), **POWDER** (:4177, `?w=powder`).
4. **`scratchpad/wavstat3.mjs`** — RIFF parse + radix-2 FFT, energy share below 120 Hz as Σ|X|² (Parseval), whole file and first 0.5 s.
5. `nice -n 19 npx tsc --noEmit` → exit 0.
6. `grep -rn eaten_deep` (minus node_modules / dist-gw), `grep -o eaten_deep dist/assets/*.js`, `grep -o serviceWorker dist/assets/*.js dist/index.html`, `curl :4177/assets/audio/eaten_deep.wav`, `find` for sw/manifest files.

#### The numbers (every one from the logs named above)
| | PARENT2 (702a3e4^, :4209) | LIVE (this commit, :4177) | NOMP3 (this commit, mp3 → 404) | POWDER (this commit) |
|---|---|---|---|---|
| `__music()` when the match clock moves | `srcs 1, starts 1, dur 146, synth false` | `srcs 1, starts 1, dur 146, synth false` | `srcs 0, bad true, starts 0, synth true` | `srcs 1, dur 224, synth false` |
| boot voices | `SAMPLE1.8@master ×4` (prewarm, gain 0) + 2.9 s / 3.2 s ×4 | 2.9 s / 3.2 s ×4, **no 1.8 s** | + `TAIKO@bus 6, SHIME@bus 13` (the score) | 2.9 s / 3.2 s ×4 |
| music-only mean / max / min, dBFS (100 windows) | -34.3 / -29.5 / -40.9 | -34.1 / -29.4 / -41.1 | -32.1 / -28.6 / -36.3 | -30.3 / -28.7 / -31.9 |
| `bigEat()` ×3 voices | **1 × SAMPLE1.8@master** each | **1 × WHOOSH0.34@master** each | 1 × WHOOSH0.34@master each | 1 × WHOOSH0.34@master each |
| `bigEat()` max window, dBFS | **-20.4 / -20.1 / -21.7** | -30.9 / -29.5 / -31.4 | -28.9 / -30.0 / -30.1 | -28.1 / -28.5 / -27.1 |
| `alert()` TAIKO@master (max window) | **12** (-24.0) | **0** (-31.2) | 12 (-23.1) | — (Powder's alert is two squares) |
| `evolve()` TAIKO@master | 1 | 0 | 1 | 0, + **`PWDRUM@bus` 1, 23 score voices @bus** |
| gate sting ×2 TAIKO | 3, 3 | 0, 0 | 3, 3 | |
| notice sting TAIKO / **SHIME** @master | 1 / **5** | 0 / **5** | 1 / 5 | (Maple fallback sting: `SNAREBODY@master` 1) |
| bathhouse sting TAIKO | 9 | 0 | 9 | |
| spontaneous score voices @bus in the fire windows after `evolve()` | 0 | 0 | 20-38 per window (the synth score) | **8 / 11 / 8** (Powder score under the recording) |
| free play on the match clock | 6.04 match s / 70 s wall (11.6×), srcs 137/137, 0 drum voices, `ev` all 0 | 12.0 match s / 155 s wall (12.9×), srcs 294/294, 0 drum voices, `ev` all 0 | — | — |
| `stopMusic()`: srcs at once / taikos from `alert()` 0.25 s later / first windows | 0 / 12 / -29.1 -29.6 -30.4 … | 0 / 12 / -30.2 -30.8 -30.3 … | 0 / 12 / -34.8 … | 0 / 0 / -27.9 … |

### What I checked on disk

HEAD, read by me; line numbers from `src/proto3d/audio3d.ts` unless stated. (The on-disk block appended earlier in this run is folded in here.)

- **The diff is what the message says**: `:307` and `:3692` prewarm lists lose `'eaten_deep.wav'`; `recordingLive` at `:1935` above `bDrum` (`:1938` early return) and `taiko` (`:3143-3146` comment + early return); the `sample()` line at the swallow replaced by a comment (`:4115-4126`), the old "absent" comment kept (`:4127-4132`), `noise(0.34, 0.14, 480, 120)` at `:4133` unchanged. No probe, no doc, no README, no ledger entry.
- **`srcs` is written in exactly three places**: `startLoop` `:528-529` (push each pass, cap 3, ended sources never removed), `stopLoop` `:547` (fade path: `ch.srcs = []` IMMEDIATELY, old sources stopped `fade*1000+60` ms later) and `:551`. `releaseBuf` `:561-566` touches `era`/`buf` only. `playTrack` `:570-611` / `preload` `:619-645` reach `srcs` only through `startLoop`; the era guards `:592`/`:632` drop a stale decode BEFORE `startLoop`. `startLoop` REFUSES (`:458-460`) on a non-running clock with no gesture in 1.5 s: `cold = true`, nothing pushed — `srcs 0` and nothing audible. The 404 path (`:606-608`) sets `bad = true`, never calls `startLoop`. `musicState()` `:3890` reports `ch.srcs.length` verbatim, so `__music().theme.srcs` IS the predicate's input. **Measured consistent in all four runs.**
- **The predicate's one gap**: 1.2 s after `stopMusic()` (`:4023`) and 0.6 s after the menu stands down at match start (`:3725`) the recording still sounds while `recordingLive()` is false. Measured (TAIL rows): `srcs` 0 at once, output at music level for ~10 windows, 12 taikos constructible. Nothing the game schedules today lands a drum there on Lantern (`win()`/`lose()` carry no drum voice). A limit, not a kill. Related and pre-existing: the comment at `:755-757` ("stopLoop's 0.6s ramp holds its srcs alive past the 400ms cover grace") describes the opposite of what `:547` does — not this commit's.
- **Every percussive voice to `master`**: gated — `taiko` (`:3518`, `:3528` ×3, `:3539`, `:3547/:3552` ×9, `:3557` ×12 = `alert()` on Lantern `:4210-4217`), `bDrum` (`:2449`, `:2997`, `:3007`, `:3016`, `:3036`, `:3971`). NOT gated, to master — `shime` ×5 `:3538`; `mSnare` `:2450, :2487 ×7, :2501, :2514, :2998, :3015 ×6, :3033 ×10`; `nHit` ×5 `:3026`; `clack`/`geta`; `pop()`'s sub `:4107` (its `depth` comes from `mealR`/`voidR` at `:4067-4069`, so a console `pop(0.8)` cannot reach it — measured 0; fires by construction on a real big bite).
- **pwDrum** → `pwBus` only (`:3622-3634`): true. "pwBus runs solely on the 404 fallback path": false on disk — `powderEvolve()` `:3680` `if (!pwBus) startPowderScore();` builds the bus, sets `pwRunning`, ramps it to 0.5 and starts `setInterval(pwSchedule, 110)` (`:3653-3670`) on the first evolution of ANY Powder match; `synthOn` is not set on that path so `synthStop()` `:782-783` cannot stop it. **Measured** (POWDER): `evolve()` → `PWDRUM@bus` 1 + 23 `@bus` voices with `srcs 1, synth false`, then 8 / 11 / 8 bus voices in the next three fire windows.
- **Readers of `eaten_deep.wav`**: `src/game/audio.ts:71,:483` — the old 2D engine; `index.html:2086`'s only entry is `/src/prototype3d.ts`, whose `./game/*` imports are `seasons, unlocks, matchdeck` (+`stickers`); `grep -o eaten_deep dist/assets/*.js` → 0. Dead. `public/assets/audio/README.md:9` (shipped as `dist/assets/audio/README.md`) still says the slot fires on a big swallow — false since this commit. `qa/_wav.mjs:5-7,:19` — scratch, header false about `bigEat()`. **`public/sw.js` exists** (also `dist/sw.js`, `public/manifest.json`); its precache list is `['/', '/index.html', '/manifest.json']` (`sw.js:22`), its fetch handler caches nothing ahead of a request, and it is registered only from `src/main.tsx:26`, which is not in the live entry graph (`grep -o serviceWorker dist/assets/*.js dist/index.html` → nothing). Not a reader; the second run's "no service worker" is wrong as a statement and right in effect.
- **The asset** (`wavstat3.mjs`): 16-bit mono 22050 Hz 1.800 s, peak -0.9 dBFS, RMS -17.1, **73.2 % of energy below 120 Hz** (72.3 % first 0.5 s), centroid 127 Hz, half the energy under 55 Hz; `win_warm` 0.0 %, `evolve_epic` 39.4 %, `gulp_1` 0.0 %. Reproduces the second run's 73.2 % independently; the crew's 93.8 % (30 log-spaced DFT bins) is not an energy share and does not reproduce. The crew's LEG A bar of 80 % would PASS the kick; 60 % (below the kick, above `evolve_epic`) is the bar in the probe below.
- `curl :4177/assets/audio/eaten_deep.wav` → 200, 79424. `public/assets/music/lantern.mp3` ships (2,337,688 bytes), so on the owner's build the recording resolves and the 404 score is not in play.
- Docs the commit left false: `docs/HANDOFF.md:354-355`, `docs/AAA-BRIEF.md:1357`.

### Kill shots

1. **LANDED — "a new sting cannot route around it and still be a drum."** `matchBeat("the drum tower starts")` on this build, `srcs 1`: **`SHIME@master` ×5** (sine 640→380 at t = 71.573 / .693 / .813 / .933 / 72.053) — the rope-tuned drum the file itself calls a drum (`:3150`), ungated, on the recording. On Powder the Maple fallback sting put **`SNAREBODY@master` 1** on `powder.mp3`. The rule the commit adopts (`:1929-1934`, "nothing percussive may join it") is what these fail. Fix: correction 1.
2. **LANDED — the governor's pwDrum reasoning, both halves.** Premise measured false (POWDER: score starts under the recording on `evolve()`); consequence impossible (NOMP3: `srcs 0, bad true` → `recordingLive()` false whenever a fallback score plays; every fallback-path drum kept constructing). The crew's guard could not have touched Powder's fallback score. The in-code comment at `:3143-3145` states the false premise. Fix: corrections 2 and 3.
3. **MISSED — "recordingLive() is never true on the real path / fires when it should not."** True from the first frame in three recording runs (`srcs 1`, 1/1 around every fire, 294/294 and 137/137 samples in free play); false on the 404 path with every sting's drums intact (12 / 1 / 3 / 3 / 1 / 9) and the score's own `TAIKO@bus` / `SHIME@bus` untouched. The only gap is the stop/stand-down tail (measured above); nothing schedules a drum there today.
4. **MISSED — "the swallow is now silent."** One `WHOOSH0.34@master` per `bigEat()` in every after-run (3/3/3/3), chain `BiquadFilter → Gain → master → limiter → destination`. Level over Lantern's recording -29.5…-31.4 dBFS against a music max of -29.4: it plays, and it is not a separate event a child would pick out at this MASTER_VOL. Over Powder's louder track -27.1…-28.5 against -28.7. Whether the swallow SHOULD be audible over the recording is a design question this commit did not claim to answer.
5. **MISSED — "a third reader still plays the file."** None live; the service worker is the one thing the second run missed and it changes nothing. Two docs and one scratch header are false — corrections 4-6.
6. **ANSWERED — which of the three sources the owner heard.** On the parent build with the recording playing: the sample at **-20.4 dBFS, +13.9 dB over the music mean, on every big swallow**, and the taiko at **-24.0 dBFS, +10.3 dB, twelve strokes per `alert()`** (every family arrival and bully charge, `prototype3d.ts:2411`, `:2599`). Both audible, both "the drum". The 404 fallback score was not in play: `lantern.mp3` ships and resolved (`synth false`) in every run against the shipped bundle; it played only when I forced the 404. The crew's direction and magnitude stand (+12.4 dB / +8.7 dB vs my +13.9 / +10.3); their spectral number does not.
7. **MISSED — "tsc is not clean."** Exit 0.
8. **VOID, recorded so nobody reuses it:** `chain3.out` `PARENT exit 1` at 10:37 — the worktree it served from had been pruned by another agent; `PARENT2` on :4209 is the parent record.

### Corrections (verbatim)

The second run's seven corrections were re-verified line by line at HEAD (`mSnare` `:1925-1928`, `recordingLive` `:1929-1935`, `shime` `:3152-3155`, the taiko comment `:3143-3145`, `startPowderScore` `:3653-3670`, `powderEvolve` `:3678-3685`, `pwDrum` `:3622`, `ramp` `:953`) and every hunk still applies; the code they add is what this run's measurements call for. **Apply corrections 1-6 above (second run) verbatim.** This run adds two and amends the probe:

**8. `src/proto3d/audio3d.ts:755-757` — a comment that states the opposite of the code beneath the predicate this commit relies on.** In `synthCover`:
```diff
-    // A record is playing — but only a channel that WANTS to play counts. At
-    // match start the menu theme is still FADING (stopLoop's 0.6s ramp holds
-    // its srcs alive past the 400ms cover grace), and counting that corpse
+    // A record is playing — but only a channel that WANTS to play counts.
+    // stopLoop(ch, fade) EMPTIES srcs at once and lets the old sources ring
+    // for `fade` seconds (:547) — so for 0.6 s after the menu stands down and
+    // 1.2 s after stopMusic() the recording is audible while every srcs-based
+    // test, recordingLive() included, reads "nothing playing". Counting the
+    // menu's srcs here used to mean
```
(The rest of that sentence — "the bed never covered the menu→PLAY path at all" — is unchanged and still reads correctly after the splice.) Reason: measured TAIL rows, all runs.

**9. `docs/crews/round-5/refute-drum.verdict.md` (this file), second run, "What I checked on disk", the readers bullet** — replace "No service worker / manifest / preload list (`find . -name 'sw.js' -o -name '*.webmanifest' -o -name 'manifest*.json'`, outside `node_modules` → nothing)" with "A service worker and manifest exist (`public/sw.js`, `public/manifest.json`, both copied to `dist/`); the worker precaches only `/`, `/index.html`, `/manifest.json` (`sw.js:22`), and is registered only from `src/main.tsx:26`, which is not in the live entry's import graph (`grep -o serviceWorker dist/assets/*.js dist/index.html` → nothing). Not a reader." Reason: that exact `find` (with `-path ./node_modules -prune -o` in front, run by me at HEAD) prints `./public/sw.js ./public/manifest.json ./dist/sw.js ./dist/manifest.json` (+ `dist-gw/`); the second run's "nothing" does not reproduce and I cannot say why.

**7 (amended). The probe the crew specified, `qa/drumover.mjs` — written here as a proposal, not landed.** Registration for `qa/gate.mjs` beside `:245`:
```js
  { id: 'drumover', tier: 'audio', profiles: ['push', 'live'], timeout: 1500,
    cmd: ['node', 'qa/drumover.mjs', PORT, 'lantern'], verdict: pf,
    why: 'nothing percussive plays on top of a recording the owner supplied' },
```
Structure (the instrumentation block of `scratchpad/drumprobe3.mjs` is the reference — `connect` hook + analyser splice, `create*` tagging, `frequency` schedule capture, BOTH `start` hooks, master/musicBus discovery from the graph rather than from names):
- **Boot guard.** `?w=lantern`, `__voidState`, dismiss daily/gift, `#btnPlay`, the card; `__matchState().t > 0.2` within 400 s or **FAIL "match never began"**; `__music().theme.srcs > 0 && !synth` within 180 s or **FAIL "recording never started"** — a probe that cannot hear the recording cannot claim a drum is absent from it. Baseline: 100 analyser windows; if the mean is below -60 dBFS **FAIL "output silent"**.
- **LEG A — the sample.** Parse every `sample('<name>.wav'` call site out of `src/proto3d/audio3d.ts` at probe time (throw if the regex finds zero, since `win()` and Maple's `evolve()` still use it); decode each in-page; energy share below 120 Hz by FFT integral over the decoded `AudioBuffer`. **BAR: no sample with > 60 % below 120 Hz may be reachable from a big-swallow call site while a recording plays.** Before (parent): `bigEat` → `eaten_deep` 73.2 % → FAIL. After: no sample at the swallow → PASS. (60, not the crew's 80: the kick is 73.2 % under a correct integral.)
- **LEG B — the sting.** Fingerprints parsed from the source (`taiko`'s `dTone` literals 128/190/52/88, `bDrum` 92/48, `shime` 640/380, `mSnare` body 195/160, `pwDrum` 120/48; throw if any parse fails). With `theme.srcs > 0` asserted BEFORE AND AFTER every fire, fire `bigEat`, `alert`, `evolve`, `matchBeat` for each authored banner (the four Lantern strings: "the lanterns are lit", "free tonight, they insist", "the drum tower starts", "the bathhouse doors open"); count fingerprint voices whose path reaches master without musicBus. **BAR: 0.** Parent: 12 / 1 / 3 / 3 / 1+5 / 9. This commit: 0 / 0 / 0 / 0 / 0+**5** / 0 → FAIL until correction 1 lands; then 0.
- **LEG C — the rate, on the match clock.** ≥ 20 MATCH seconds (`__matchState().t`), sampling every 500 ms wall: assert `theme.srcs > 0` at every sample (FAIL, not zero, if not); count spontaneous LEG-A samples and LEG-B voices to master. **BAR: 0.** (This run: 12 match s, 0, but `ev` all zero — the leg needs a window with an arrival or a charge; 20 s is the crew's floor and the run should print `ev` so a zero with no events is visibly weaker than a zero with three.)
- **LEG C′ — the 404 path (the gate must not fire where there is no recording).** Route `**/assets/music/lantern.mp3` → 404, assert `synth === true && theme.srcs === 0`, fire `alert()` and assert TAIKO-to-master == 12 (parsed from `lnLastSting`'s loop bound), and assert the score's own `@bus` drum voices > 0 over 6 s wall. A gate that silences the fallback score is a FAIL. This commit: 12, and `TAIKO@bus`/`SHIME@bus` constructing — PASS.
- **LEG D — the level, reported not gated.** Max 0.74 s-window RMS per fire against the baseline mean and max; print, no bar (`evolve()` ducks the music by design). This run: swallow -30.9 vs baseline max -29.4 (after) / -20.4 (before).
- **Optional `--world=powder` leg** (recommend adding to the registration once correction 3 lands): after `evolve()`, 8 s wall of free play with `theme.srcs > 0` must construct 0 `@bus` voices; today it constructs 8-11 per 2.6 s window.
- **Harness rules baked in:** hold `/tmp/gpu.lock` (`mkdir`, atomic; release in the same command); `pgrep -c chrome`, not `chromium`; a lock poll of 2 s, because a 20 s poll never wins the lock against a busy neighbour; serve any A/B build from its own `vite preview` port — do not `page.route()` a dist directory another agent can prune.

### Housekeeping
The scratch worktree `<scratchpad>/parent` (detached at `e0f7e13`) is removed at the end of this run (`git worktree remove --force`), and the `:4209` preview stopped. `scratchpad/PARENT.log` is void (see kill shot 8).
