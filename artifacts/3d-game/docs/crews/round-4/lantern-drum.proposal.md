# crew:lantern-drum — the drum that was never fixed

**Filed 2026-08-29. Nothing here is landed. No tracked file was edited.**
HEAD `f4fda7d`, working tree clean (`git status --porcelain` empty), `dist/`
newer than every file under `src/` (`find src -newer dist/index.html` → empty),
so the preview on `:4177` is serving this source. Every number below was run by
me on that build; the commands and the raw output are quoted in §3.

---

## 0. THE OWNER'S SENTENCE, AND THE ONE WORD IN IT THAT IS WRONG

> "Lantern - remember that drum sound that was fixed that was overlapping with
> the music - it's back."

He is right that there is a drum over his Lantern recording, and he is right
that it is not in time with it. **The word that is wrong is "back".** It never
left. Two fixes were written and recorded as landed. One of them is intact,
and on a warm launch it never comes up at all. The other has never executed a
single time on any build, on any device, since the day it was written — because its
premise was false on the day it was written, and nothing in this repo could
tell anyone that.

That is worse than a regression, and it is also more useful: a revert can be
re-reverted, but a fix that was never live means the defect has been shipping
continuously for seven days while the ledger said it was closed.

**The four sentences, for the owner.** (1) There are two drums, not one. (2)
The loud one is a sound file we ship called `eaten_deep.wav` — it plays every
time you swallow something big, it is 1.8 seconds long, 94% of it is bass
under 120 Hz, and it lands **12.4 dB — about four times — louder than your
music**; the fix written for it on 22 August has never once run, because it only
ever applied when that file was missing and the file has never been missing.
(3) The frequent one is the Lantern taiko: every time a cousin walks in or the
bully charges, the game plays **twelve drum strokes** on top of your recording
— we measured **36 of them in twenty seconds of play, 108 a minute**, twice.
(4) Neither of them goes through the music system, so nothing we have ever
built to check the music could see either one.

---

## 1. THE ORIGINAL FIX — there were TWO, and they fixed two different things

### Fix 1 — `a3b3ba2`, 2026-08-22, "Zero shake, and the download bridge loses its drum kit"

> THE DRUMS. "We have the music I provided then I'm hearing drums sort of not
> synced." Measured first: qa/_twoscores.mjs sampled 25s of a lantern start and
> found 0/50 double-score samples — no handover leak. The drums were the COVER
> working as designed: the bridge that plays while a recording decodes was the
> world's full synth score, taiko and all, out of sync with the incoming track
> by construction. A bridge should not have a drum kit. The cover is now one
> soft root-and-fifth pad — no tempo, no percussion, cannot clash with any
> recording […]

What it did: split `synthCover()` into `synthCover('pad' | 'score')`, added
`startPad`/`stopPad` (three triangle oscillators, D3·A3·D4, through a 900 Hz
lowpass) and left the full world score as the 404-only fallback.
Today at `src/proto3d/audio3d.ts:727-781`.

**STATUS: INTACT — and it did not run.** The engine's own log, read out of a
live Lantern match (§3.4), never prints `cover pad up (drumless)` at all:

```
    29.1s preloaded menu.mp3 141s loop@0
    35.8s preloaded lantern.mp3 146s loop@0
    82.2s startLoop menu 141s vol=0.34
   114.3s released menu buffer (141s PCM)
   114.3s startLoop theme 146s vol=0.4
```

`lantern.mp3` was preloaded and decoded *before* the child pressed PLAY — 78 s
earlier on this harness, a gap the swiftshader boot inflates and which I quote
only for the ordering, not for its size — so the recording starts straight from
the buffer with no bridge at all. On a cold first launch over a slow connection
the pad *would* come up and do its job — that is a real fix and it should stay
— but on every launch after the first, which is every launch the owner is
describing, **the one thing that was genuinely fixed is not in the signal path
of the complaint.**

### Fix 2 — `7bad24c`, 2026-08-22, "The 8-bit thud was the swallow, the half-full meter was arithmetic"

> THE DRUMS, finally: not music at all. With eaten_deep.wav absent (the owner
> has not picked SFX yet), every big swallow played the synth fallback — a
> punchy 160Hz sine drop plus noise burst, a drum hit in all but name, unsynced
> with any track by nature and exposed by Lantern's sparse score. The fallback
> is a soft dark whoosh now: filtered noise only, no oscillator, nothing to
> mistake for percussion.

The diff, in full:

```diff
       if (sample('eaten_deep.wav', 0.55)) return;
-      noise(0.22, 0.3, 900, 180);
-      tone(160, 70, 0.24, 'sine', 0.24);
+      // THE OWNER'S "8-bit thud". […]
+      noise(0.34, 0.14, 480, 120);
```

**STATUS: NEVER EXECUTED.** This is the whole of §2.

---

## 2. WHAT UNDID IT

### 2a. Fix 2's premise — "with eaten_deep.wav absent" — was false when it was written

`public/assets/audio/eaten_deep.wav` has been in the repository, unchanged,
since before either fix:

```
  $ git log --oneline --all --diff-filter=A -- '*eaten_deep.wav'
    589e31e Take the unlicensed theme.mp3 out of the shipping bundle   # 2026-08-16

  $ for c in a3b3ba2 7bad24c HEAD; do
  >   git cat-file -s $(git rev-parse $c:artifacts/3d-game/public/assets/audio/eaten_deep.wav)
  > done
    79424      # a3b3ba2 — fix 1
    79424      # 7bad24c — fix 2, the commit that says the file is absent
    79424      # HEAD
```

One blob, one size, three commits, six days apart. The file was present on the
day the fix declaring it absent was written, it is in `dist/` today
(`curl -o /dev/null -w '%{http_code} %{size_download}' :4177/assets/audio/eaten_deep.wav`
→ `200 79424`), and `audio3d.ts` pre-decodes it on the child's **first gesture**
at `:307` and again in `startMusic()` at `:3679`:

```ts
307:  for (const n of ['eaten_deep.wav', 'evolve_epic.wav', 'win_warm.wav']) sample(n, 0);
```

So by the time any child eats anything, `sample('eaten_deep.wav', 0.55)` at
`:4102` returns `true` and returns. The line the fix wrote —
`noise(0.34, 0.14, 480, 120)` at `:4109` — is unreachable code. I did not infer
that from reading; I fired the entry point on the live build and counted the
voices it constructed (§3.2): **one voice, and it is the sample.**

The one condition under which the whoosh *would* play is a build where
`/assets/audio/eaten_deep.wav` does not resolve — `sample()` fetches an
absolute path (`:370`) — or the sliver before the first decode returns. Neither
describes the app the owner is playing: the file resolves `200` off the
shipping bundle and both prewarm sites decode it on the very first touch.

### 2b. And the file the guard prefers IS a drum, by measurement

`node wavstat.mjs public/assets/audio/eaten_deep.wav` (my own RIFF parser +
direct DFT on 30 log-spaced bins from 20 Hz to 8 kHz over the first 0.5 s):

```
  eaten_deep.wav
    16-bit mono 22050 Hz  1.800 s
    peak -0.9 dBFS   RMS -17.1 dBFS
    spectral centroid 64 Hz
    energy below 120 Hz: 93.8%
```

A 1.8-second, near-full-scale, monotonically decaying transient with 94% of its
energy under 120 Hz and nothing above 3 kHz is a kick drum. It plays at gain
0.55 into `master` (`sample()`, `:359-375`) — outside `musicBus`, so
`duckMusic()` cannot duck it — on every CHOMP, unsynced with any recording by
construction, which is exactly the sentence `7bad24c` wrote about the thing it
was replacing.

*(`docs/STUDIO-ROUND-3.md:7286` measured the same file at centroid 90 Hz /
88.7% sub-120. My window and frequency grid differ from theirs; I am recording
both rather than picking one. Nothing in either reading changes the verdict.)*

### 2c. The door NO fix has ever looked at: Lantern's stings

Both fixes were made inside the music engine. The drums that are left are not
in the music engine, and by design they cannot be:

```ts
88:  // ── ONE BUS FOR EVERYTHING THAT IS SCORE ─────────────────────────────
91:  // […] One-shots (chomps, fanfares, voices) stay on master — a
92:  // duck that ducked the thing it was making room FOR would be a volume bug
93:  // with extra steps.
```

`synthOn`, `musicBus`, `duckMusic` and `synthStop` therefore have no visibility
of, and no authority over, a single percussive one-shot. And Lantern's
one-shots are a drum kit:

| entry point | Lantern branch | taiko strokes |
|---|---|---|
| `alert()` `:4198` | `lnLastSting()` `:3542` — *"the drum, alone, speeding up"* | **12**, accelerating over 2.4 s |
| `matchBeat()` `:3961` | `lnGateSting` / `lnNoticeSting` / `lnBathhouseSting` | 1–8 |
| `evolve()` `:4129` | `lanternEvolve()` `:3502` | 1 |

```ts
3544:  for (let i = 0; i < 12; i++) taiko(master!, t + i * (0.30 - i * 0.017), 0.10 + i * 0.011, true);
```

`master`, not `lnBus`. Twelve strokes straight to the output, on top of
whatever the recording happens to be doing.

And `alert()` is not rare. Its call sites in `prototype3d.ts`:

- `:2409` `rivals.onJoin` — **every family arrival**. `prototype3d.ts:2381` casts
  3–5 rivals; `rivals.ts:526` schedules their seats at
  `rand(2,5) · rand(9,15) · rand(19,27) · rand(30,40) · rand(42,54)` seconds
  (× `matchLen/180`). So 3–5 drum rolls, all inside the first 54 match seconds
  — the exact stretch in which a child is listening to the music start.
- `:2597` `rivals.onCharge` — every bully wind-up, one per `rand(21,34)` s
  (`rivals.ts:1405`).
- `:4304` the lead-taken brag (6 s cooldown), `:9120` the first-run danger
  lesson.

(Source-derived counts, not measured; the measured rate is §3.3.)

### 2d. WHY it could revert silently — the instrument was blind, and it was never on the gate

`qa/_twoscores.mjs`, the probe `a3b3ba2` was verified with, decides on this:

```js
29:  if (m.theme.srcs > 0 && m.synth) both++;
```

`m.synth` is `synthOn` — a music-engine boolean. A sample played through
`sample()`, a taiko played into `master`, and a `pwDrum` played into `pwBus`
are all invisible to it. It reported `0/50` and it was telling the truth about
the only thing it could see.

It is also `_`-prefixed, which in this repo means scratch: it is not in
`qa/gate.mjs`. And the probe that IS on the gate asks the identical blind
question — `qa/aftermatch.mjs:58-59`, `feel` tier, `live` profile:

```js
58:  const double = (m.theme.srcs > 0 && m.menu.srcs > 0)
59:    || (m.synth && (m.theme.srcs > 0 || m.menu.srcs > 0));
```

Same `synthOn`. Same blindness. Meanwhile the gate's entire `audio` tier is one
step —

```js
245:  { id: 'trackprofile', tier: 'audio', profiles: ['live'], timeout: 300, optional: 'FFMPEG_BIN',
```

— and `trackprofile` measures the loudness of the MP3 FILES ON DISK; it never
opens the game. The only place the gate claims the game "makes sound" is
`qa/smoke.mjs:161`, and the assertion behind that sentence is `!!window.__audio`
— *the audio object exists.*

**No probe in this repository has ever counted a voice, or measured a level, at
the output of a live match.** That is the mechanism. A fix nothing holds down is
a fix that can be written against a false premise, recorded as landed, and stay
wrong for a week without anybody lying.

### 2e. The studio already found both halves, twice, and neither was ruled

- `docs/STUDIO-ROUND-2-BOARD.md:2989` and `docs/STUDIO-ROUND-3.md:7286`:
  *"The '8-bit thud' was never fixed: `eaten_deep.wav` ships and is 89%
  sub-120 Hz"*, severity **blocker**, with the dead-code line quoted.
- `docs/STUDIO-ROUND-3.md:7267`: *"Powder Pass plays two scores at once […]
  This is the owner's 'drums sort of not synced' complaint, alive again, in the
  one world the fix never looked at"* — `powderEvolve()` (today `:3665`, the
  round-3 citation `:3638` has since drifted) starts the
  whole Powder scheduler under a playing recording, and because nothing sets
  `synthOn` on that path `synthStop()` returns at its first line and never
  stops it. Severity **blocker**. Also unruled.
- The same page: *"`synthOn` must stop being the doubling test — it has now
  missed this twice."*

`docs/crews/round-3/` contains verdicts for gameday-red, gamutzero, opening-beat
and powder-form. There is no audio verdict. Both blockers are still sitting in
the round-3 record, unruled, which is why the owner is reporting them himself.

---

## 3. REPRODUCED TODAY

Instrument: `AudioContext.prototype.createOscillator` and `createBufferSource`
are wrapped in an `addInitScript`, so every voice the engine constructs is
logged with the frequency schedule it wrote on its own `AudioParam` — the
fingerprint comes from the running engine, not from a table I typed. `taiko()`
is uniquely identifiable because `:3134` writes
`setValueAtTime(128)` → `exponentialRampToValueAtTime(52)` on a sine and
nothing else in the file does — `128` appears exactly once outside a comment
in the whole 4,200-line file, on that line. `window.__audio` (`prototype3d.ts:2650`) is the
module's own object, so wrapping its methods intercepts the game's own calls.

All of §3.2–§3.4 was taken with `__music()` reporting
`{"srcs":1,"synth":false,"ctx":"running","starts":1}` — **the owner's
recording playing, the synth bed off.**

### 3.1 The harness clock

20.0 match seconds cost **386 s of wall time in one run and 1124 s in another —
19.3× and 56.1× slower**, on the same build an hour apart, consistent with
`qa/_clockrate.mjs`'s ~14× and wider under load. Everything timed below is
sampled on `__matchState().t`, never on wall time. Three separate browser
sessions produced §3.2/§3.3 (voice trace, twice) and §3.4 (output tap); each is
labelled where it is quoted.

### 3.2 Fired by hand, with the recording playing

```
  __audio.bigEat()   the CHOMP swallow
    voices=1  TAIKO=0  1.8s-sample=1
    [{"k":"buf","dur":1.8,"ch":1,"who":"bigEat"}]

  __audio.alert()    rival join / bully charge
    voices=31  TAIKO=12  1.8s-sample=0

  __audio.matchBeat("the drum has started")
    voices=21  TAIKO=1

  __audio.evolve()   an evolution
    voices=26  TAIKO=1
```

Line 1 is the finding. **`bigEat()` constructs exactly one voice, and it is a
1.800-second buffer** — `eaten_deep.wav`. Zero oscillators, because
`noise(0.34, …)` at `:4109` did not run. The fix of `7bad24c` is dead code,
proven at runtime and not by reading.

### 3.3 Left alone, on the match clock — run twice, same number

Run 1, no attribution:

```
  ── OBSERVED over 20.0 MATCH seconds (386s wall) ──
    recording playing in 372/372 samples
    taiko strokes (128->52 / 190->88 Hz sine): 36
    pop sub thumps (52->30 Hz sine)          : 0
    eaten_deep.wav swallows (1.8s buffer)    : 0
    total voices constructed                 : 113
    buffer-source durations seen: {"2":42,"146.031":3,"0.042":2}
    match ev: {"bites":0,"charges":1,"eaten":0, …}
```

Run 2, the same twenty match seconds with every voice tagged by the API call it
came from (`window.__audio`'s methods wrapped, so the game's own calls are the
ones counted):

```
  observed 20.0 MATCH seconds (1124s wall, 56.1x slower)
  recording playing in 685/685 samples; theme.starts=1 synth=false
  TAIKO strokes over the recording: 36  (108 per match minute)
  attributed to: {"alert":36}
  api calls    : {"ready":2,"pop":1,"alert":3}
  taiko times  : [608.68 x12, 729.06 x12, 1006.92 x12]
  1.8s samples : 0
  total voices : 112
  match ev     : {"bites":0,"charges":1,"eaten":0, …}
```

**36 taiko strokes in 20 seconds of match — 108 a minute — every one of them on
top of the owner's recording**, which was playing in 372/372 and then 685/685
samples. Two independent runs, the same 36. **All 36 are `alert()`**: three
calls, three bursts of twelve on the audio clock at 608.68 s, 729.06 s and
1006.92 s. `charges: 1` accounts for one of the three; the family walking in
accounts for the rest. The inference in run 1 is now measured.

The `146.031`-second buffers in run 1 are `lantern.mp3` itself. Zero swallows in
both runs because the void ate nothing in that window (`bites: 0`, `eaten: 0`),
so the sample half of the defect — the loudest half, §3.4 — is *absent* from
this number. 36 is the floor, not the ceiling.

Note the two runs' clock ratios: **19.3× and 56.1×** slower than wall, on the
same harness and the same build, an hour apart. Anything sampled on wall time
here would have measured two different games.

### 3.4 How loud, at the real output

An `AnalyserNode` (fftSize 32768 = 0.74 s @ 44.1 kHz) is spliced in front of
`ctx.destination` by patching `AudioNode.prototype.connect`, so this is what
leaves the engine, not what the code asked for.

| window | peak | max RMS | RMS over music |
|---|---|---|---|
| music alone (8 windows) | −12.6 dBFS | −32.7 dBFS (mean) | — |
| `+ alert()` | −11.0 | −24.0 | **+8.7 dB** |
| `+ bigEat()` | −7.8 | −20.3 | **+12.4 dB** |
| `+ evolve()` | −10.1 | −26.1 | +6.6 dB |

Read precisely: a 0.74 s window containing the swallow measures **12.4 dB
louder in RMS than a music-only window** of the same length. The window is a
sum, so a hair of that delta is the music underneath — at +12 dB the hair is
negligible, and the direction is not in doubt. About four times the amplitude.

In the owner's language: the drum is roughly four times as loud as his music,
and it is not in time with it because it cannot be — it is triggered by what a
child eats and by when a cousin walks in, and neither of those has ever heard
`lantern.mp3`.

(Harness caveat: `MASTER_VOL` with `muted=false`, one swiftshader run,
44.1 kHz. Absolute dBFS will differ on a phone; the *deltas* are what the bar
would be written against, and they are measured against a baseline taken 20 s
earlier in the same session.)

---

## 4. THE FIX PROPOSED

Rule 6: the smallest change that removes the CAUSE. Three, ordered by how much
of the complaint each removes.

### F1 — the swallow. One deleted line and two array entries.

`audio3d.ts:4102` — delete `if (sample('eaten_deep.wav', 0.55)) return;`, and
drop `'eaten_deep.wav'` from the prewarm lists at `:307` and `:3679`. The
whoosh at `:4109` — the sound `AAA-BRIEF.md`, `HANDOFF.md` and the owner have
all been told ships — then plays for the first time. The file stays on disk,
unreferenced, so an approved swallow can be dropped straight back in.

Correct the comment at `:4103` **in place**, not by deletion: it says "with
eaten_deep.wav absent", and the file was never absent.

*The alternative is the owner's call, not ours:* keep the sample path and
replace the ASSET. `HANDOFF.md:351` records that he "tried and disliked the
first batch — let's figure this out later". Either way the current file must
stop playing, because it is measurably a kick drum.

### F2 — the stings. One predicate, consulted by the drum voices themselves.

The cause is that percussion deliberately bypasses `musicBus`, so no state the
music engine owns can gate it. Put the gate where a drum is MADE, not where it
is called from — a new sting cannot route around `taiko()` and still be a taiko:

```ts
/** A RECORDING IS PLAYING, so nothing percussive may join it. A drum written
 *  for our own score cannot be in time with a recording it has never heard;
 *  that is the owner's "not synced", and it is a property of the arrangement,
 *  not a bug in the scheduler. Consulted by the VOICES, so a new caller cannot
 *  reintroduce the defect by finding a new route to master. */
const recordingLive = () => themeCh.srcs.length > 0 || menuCh.srcs.length > 0;
```

and one early return in `taiko()` (`:3133`) — and the same in `pwDrum` and
`bDrum`, the other two functions in this file that make a drum:

```ts
function taiko(dest: AudioNode, t: number, vol: number, big = true) {
  if (dest === master && recordingLive()) return;   // stings only — see below
  …
}
```

`dest === master` is load-bearing and deliberate. The world SCORES play into
`lnBus` / `pwBus` / `gdBus` and only ever run on the 404 path, where there is
no recording to clash with; gating those would silence the fallback score for
no reason. Only the one-shot stings pass `master`. Cost: zero nodes, zero draw
calls, one comparison per drum hit.

What the child loses: `lnLastSting`'s twelve strokes become the `kane` gong at
`+2.0 s` and the `clack` at `+2.1 s` (`:3545-3546`) — still an alert, still in
character, minus the drum the owner has now asked us to remove twice.

### F3 — Powder, one line, already diagnosed and never landed.

`powderEvolve()` `:3665`: `if (!pwBus) startPowderScore();` (`:3667`) starts the whole
scheduler, not just the bus. Extract the node construction into
`ensurePwBus(c)` and call that. `docs/STUDIO-ROUND-3.md:7267` has the full
derivation. Not measured by me — I ran Lantern, because Lantern is what the
owner named — and it should not ship on my say-so, but it is the same defect
and it will be the next thing he hears.

### FLAGGED, NOT PROPOSED — `pop()`'s sub thump

`:4093`, `tone(52, 30, 0.2, 'sine', depth * 0.14, 0.03)` — a 52→30 Hz sine drop
on every bite above depth 0.35, straight to `master`. Same class of sound as
the `tone(160, 70, …)` that `7bad24c` deleted. It did not fire in my free-play
window (0 of 113 voices — nothing big was eaten), but it fires by construction.
Removing it is a game-feel decision about the weight of a big meal, not a bug
fix, and it is not mine to make. The probe below counts it; the bar does not
gate on it.

---

## 5. THE PROBE — `qa/drumover.mjs`

The point of this filing. It must be able to see a drum **by any route**,
because every fix so far was verified by an instrument that could only see one
route. Three legs, each with its own bar and its own stated reason.

**LEG A — THE SAMPLE.** Harvest every recorded sample name the engine can play
by parsing `sample('…')` call sites out of `src/proto3d/audio3d.ts` — and
**throw** if the parse finds zero, rather than passing on nothing. Fetch and
decode each in-page, measure the share of energy below 120 Hz from the actual
`AudioBuffer`. BAR: **no sample above 80% sub-120 Hz may be triggered while a
recording is playing.**
*Reason for the bar:* below 120 Hz is where a kick drum lives and where a
melodic instrument does not; 80% leaves room for a legitimately weighty
whoosh. TODAY: `eaten_deep.wav` 93.8%, played by `bigEat()` → **FAIL**.
It survives an asset swap, because it measures the asset, not its name.

**LEG B — THE STING.** Derive the taiko fingerprint by parsing the `dTone(…)`
call inside `function taiko` in the source (the `128 / 190 / 52 / 88` literals)
and **throw if that call cannot be found** — a retune moves the probe with the
code, a rename fails loudly. Then, with `__music().theme.srcs > 0` confirmed,
fire every entry point the world can reach — `bigEat`, `alert`, `evolve`, and
`matchBeat` for each of the four authored Lantern banners — and count taiko
voices whose destination is `master`. BAR: **0.**
TODAY: 12 / 1 / 1 → **FAIL**.

**LEG C — THE RATE, on the match's own clock.** Play at least 20 MATCH seconds
(`__matchState().t`, never wall time — rule 4's second failure mode; this is a
~7-minute leg on the harness and that is the price) with the recording up, and
count spontaneous events. BAR: **0 taiko-fingerprint voices and 0 leg-A samples
reach `master` while a recording plays.** TODAY: **36** → **FAIL**. This is the
leg that would have caught the join-slot compression, and the leg that must be
on the gate.

**AND THE GUARD THE OTHER PROBES DIDN'T HAVE.** Ask "what else would move this
number?" before the bar is set, not after. Three things would make every leg
pass for the wrong reason, and each must be an explicit FAIL, not a quiet zero:

- **the recording never started** — `theme.srcs` must be `> 0` at the moment of
  every count, asserted per sample, not once at the top. `qa/bubbleclear.mjs`
  reported 0% in three worlds on no data and `qa/faceparity.mjs` repeated it;
  this is the same trap.
- **the match never began** — `__matchState().t` must actually have advanced by
  the required MATCH seconds; a timed-out boot must throw, not report 0 drums.
- **the fingerprint moved** — if the parse of `function taiko`'s `dTone(…)`
  call finds nothing, throw. A probe that silently skips what it cannot find is
  the same bug wearing a hat (rule 4).

**LEG D — THE LEVEL, reported and NOT gated.** Splice an analyser before
`destination` and print each fired event's max 0.74 s window RMS against the
music-only baseline (§3.4). Not a bar: `evolve()` measured +6.6 dB and it is an
authored ceremony that ducks the music on purpose, so a level bar needs a
design decision this crew is not authorised to make. It is here so the next
reader has the number without rebuilding the tap.

Registration — the gate's `audio` tier currently contains one step, and that
step never plays the game:

```js
{ id: 'drumover', tier: 'audio', profiles: ['push', 'live'], timeout: 1200,
  cmd: ['node', 'qa/drumover.mjs', PORT, 'lantern', 'powder', 'gameday'], verdict: pf,
  why: 'nothing percussive plays on top of a recording the owner supplied' },
```

`push` and not just `live`, deliberately. This defect has now survived two
fixes and two studio rounds; it should cost every push a fail, not a nightly.

---

## 6. WHAT I DID NOT MEASURE, AND WHAT I AM NOT CLAIMING

- **The 36 is two runs, not one, and the second one attributes it.** An
  intermediate attempt lost its browser to this host's GPU process under load
  (`load average 22.77`, 56 chromium processes from other agents' work); it is
  not counted, and its partial output is not quoted anywhere above. The two
  runs quoted in §3.3 both completed.
- **I did not measure Powder or Game Day.** F3 is quoted from the round-3
  record with its citation, not re-derived.
- **I did not measure a whole match.** Twenty match seconds is what the
  harness's 19–56× slowdown allows in a session; a full 180 s Lantern match is
  two to three hours of wall time. The join and charge cadences in §2c are read
  from `rivals.ts`, not observed across a match, and I have not extrapolated
  108/min out to a match total.
- **I did not touch a tracked file.** No build was run; `dist/` was already
  newer than `src/` at HEAD and I verified that before measuring.
- **I cannot tell you why the owner believes it stopped.** Fix 1 was real and
  removed a real drum — the full synth score bridging a slow decode — and on a
  cold first launch he would have heard that change. Nothing I measured
  explains a period in which the swallow was quiet, and I am not going to
  invent one.

---

## 7. LEDGER CORRECTIONS OWED (rule 3b — in writing, not quietly)

1. `docs/AAA-BRIEF.md:1356-1379`, the `7bad24c` entry. `MEASURED` says "with
   eaten_deep.wav absent (no SFX files yet)" — the file was present, tracked,
   79,424 bytes, six days earlier. `NOW` says "the swallow no longer registers
   as percussion by construction (no oscillator in the voice)" — true of the
   branch that was edited, false of the build that shipped, which plays a
   1.8 s sample with 93.8% of its energy under 120 Hz. Both stand as evidence
   to every later reader and neither is true.
2. `docs/HANDOFF.md:351-355` — "Until then the synth fallbacks play (the
   swallow one is now a soft whoosh, not a thud)". Same retraction.
3. `docs/HANDOFF.md:238-240` — "While a track decodes, a **drumless cover pad**
   bridges" is correct, but it is offered as the answer to the owner's drum
   complaint and it is not: on a warm launch the pad never comes up (§1).
4. `src/proto3d/audio3d.ts:4103-4108` — the comment block is a false statement
   about the running build sitting directly above the line it describes.
   Correct in place; do not delete it. It is the clearest surviving record of
   how this happened.
