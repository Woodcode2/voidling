# crew:flow-fixes — the tap gate, and Maple's tutorial

**Filed 2026-08-29. Nothing here is landed. No tracked file was edited.**
HEAD `0d9138f`. `git status --porcelain` shows four entries, all of them other
crews' round-4 proposal documents; **no tracked source file is modified**.
`find src index.html -newer dist/index.html` → empty, so the preview on `:4177`
is serving this exact source and every number below came off that build. The
three probes are quoted in full in §5 and §6 — they are not landed either, because
this crew writes one file; the governor lands them as `qa/tapgate.mjs`,
`qa/gatecarry.mjs` and `qa/mapleintro.mjs`.

---

## 0. THE TWO SENTENCES, AND THE FOUR ANSWERS

> "Sometimes I'm still seeing the Tao [Tap] to start. Game loads then I see Tap
> to start. I believe that was created to start the music long ago? Can we not
> automate this when u select the level and play once it's loaded it starts?"

> "Maple isle should always be sort of that intro level. When you start it
> should be showing that figure 8 with a finger etc. on a fresh start it shows
> it but once you have history it gets rid of it. I also see the old version pop
> up at the next level where it was like a popup to tell you to move. That must
> be old code."

**Four answers, for the owner, before any of the working.**

1. **The "sometimes" is not flaky — it is one branch, and I can name it.** The
   gate appears when, and only when, you pick a world that is **not the one
   already built**. Picking the world you are already on launches in place with
   no gate at all. Same button, same row of cards, two different outcomes. It is
   also reachable from the season ribbon and from the "TAKE ME THERE →" button on
   the end screen, for the same reason: all three write a flag and **reload the
   page**.

2. **His guess about the music is right, and it is still true today.** I measured
   it: on the page that comes back after a world switch, the game holds **zero**
   user gestures, and the browser's audio clock is stopped. With the gate removed,
   the match starts, the world's 82-second score is decoded and sitting in memory
   wanting to play, and **not one note is scheduled**. The match runs in total
   silence until the child touches the screen. So the gate is not vestigial. It
   is load-bearing — on that one path.

3. **But it is load-bearing for a reason that is our fault, not the browser's.**
   The gesture is lost because we *navigate*. The real defect is the page reload,
   and the gate is a bandage on it. §3 proposes deleting the gate anyway and
   paying for it in a way that never blocks the child, plus what the actual cure
   costs.

4. **On Maple he is describing two different objects, and only one of them is
   the figure-8.** The ghost hand over the live game is `#hand`, gated on "has
   this child ever played" — measured appearing at match `t = 2.27s` on a fresh
   profile and **never** on the same world with history. The "popup to tell you
   to move" is `#tut`, a full-screen modal *titled* **DRAG TO MOVE**, carrying a
   **second copy of the same figure-8 SVG**, gated on a different flag. It is not
   dead code: I photographed it firing on the first menu launch of a profile
   that had already played and already dragged. §4, §6.

---

## 1. WHERE THE GATE IS, AND WHY IT IS "SOMETIMES"

### 1.1 The parts

| what | where |
| --- | --- |
| markup | `index.html:1972-1975` — `#tapGate`, `.gPill` ("TAP TO BEGIN"), `.gHint` |
| styling | `index.html:1159-1191` (and `index.html:1703`, `body.calm .gPill`) |
| chrome stand-down | `index.html:1177` — `body.gated #btnPlay, .navRow, #btnSettings { opacity: .22 }` |
| arming | `src/prototype3d.ts:5984-6000` — `tapGateEl`, `armGate()` |
| the only caller | `src/prototype3d.ts:6004-6076` — the `voidAutoPlay` block |
| fresh path, gate deleted 2026-08-20 | `src/prototype3d.ts:6079-6090` (the comment that records it) |

### 1.2 The branch that makes it "sometimes"

`src/prototype3d.ts:5929-5934`, in the world picker's card handler:

```ts
if (id === pickedWorld) { launchWorld(); return; }   // already built: just go
// a different world needs the island rebuilt, so come back playing
localStorage.setItem('voidWorld', id);
localStorage.setItem('voidAutoPlay', '1');
location.href = location.pathname;
```

`voidAutoPlay` is written in exactly three places, and every one of them is
followed by `location.href = location.pathname`:

* `:5932-5934` — the world card, when the world differs;
* `:5957-5959` — the season ribbon, when its world differs;
* `:5003-5005` — the end screen's "TAKE ME THERE →" after a world unlocks.

`armGate()` has exactly one call site (`:6062`), inside `if
(localStorage.getItem('voidAutoPlay') === '1')`. **There is no other way to see
the gate.** So the rule is: *the gate appears if and only if the page has just
reloaded to change world.* His "sometimes" is that condition, and it is not a
race — it is deterministic and it is measured in §5.

**And this is the "state bug" in it, stated as a sentence he can check.** The
gate's presence is not a function of anything the child does on screen. It is a
function of `localStorage.voidWorld` — *which world the page happened to build
at boot* — so the identical tap on the identical card behaves differently
depending on where the last session left off. Two consequences fall out, and
both match his report:

* **A brand-new player can never see it.** On a fresh profile only MAPLE FALLS
  is unlocked (`src/game/unlocks.ts:40-46`: `read()` adds `'maple'` unconditionally
  and nothing else is in storage), so the only card that can be tapped is the
  world already built, which takes the no-reload branch. The gate becomes
  reachable *only after a second world is earned* — which is why it appears to
  arrive out of nowhere, some way into playing.
* **Playing the same world twice in a row hides it again.** Finish Pirate Bay,
  tap Pirate Bay: no gate. Finish Pirate Bay, tap Game Day: gate. Nothing on
  either card says which one you are about to get.

### 1.3 Two dead things around it, which date the gate

Both of these are leftovers from the **fresh-load** gate that was deleted on
2026-08-20 (`2445739`, "TWO TAPS (a regression, mine, owner caught it same-day)")
— the first time the owner reported this exact class of complaint.

* **`body.gated` is inert on the only surviving path.** Its three targets —
  `#btnPlay`, `.navRow`, `#btnSettings` — all live inside `#menu`
  (`index.html:1790-1831`; I resolved the block by counting tags, see §7.6),
  and the `voidAutoPlay` block sets `el('menu').style.display = 'none'` at
  `:6033` *before* it shows the gate. The rule dims elements that are already
  `display:none`.
* **`.gHint` is never written.** `index.html:1974` ships `&nbsp;` and no code
  anywhere assigns to it (`grep -rn "gHint" src/ index.html` → the CSS rule at `:1188`, the
  markup at `:1974`, nothing else).

Neither is a bug. Both are evidence that the gate as it stands is the residue of
a design that was already half-retracted once, on the owner's word.

### 1.4 And a third thing: `GETTING READY…` now waits for nothing

The gate comes up unarmed reading "GETTING READY…" and arms when the asset
preload settles (`:6053-6060`), racing a 12-second bail-out. But
`requestedReady()` (`src/proto3d/assets3d.ts:36-46`) is now:

```ts
onProgress(1, 1);
return Promise.resolve();
```

The pack was deleted; there is no network work to wait for. So `preloadP`
resolves in a microtask and the 12-second race is decorative. The gate's own
justification — "the wait moves to the only honest place for it: BEFORE the
invitation" (`:6044-6052`) — describes a wait that no longer exists.

**A latent hazard, filed as a lead, not a claim:** `Promise.race([preloadP,
timeout]).then(…)` at `:6059` has no `.catch`. If `preloadP` ever rejected, the
race would reject, `armGate` would never run, and the gate would sit unarmed and
untappable forever with `body.gated` set — an unexitable app. Today
`requestedReady` cannot reject, so **this has never fired and I have not made it
fire.** It is worth a `.catch` whenever that function grows a real body again.
The same shape is at `:5668` inside `withWorldReady`.

---

## 2. THE MEASUREMENT, AND THE TRAP THAT ALMOST ATE IT

### 2.1 The trap

**Headless Chromium in this sandbox grants user activation unconditionally, at
every autoplay setting.** Measured today, `chromium-1194`, on a page with no
input of any kind:

```
┌─────────┬─────────────────────────────────────┬───────────┬───────────────┬──────────┐
│ (index) │ label                               │ state     │ hasBeenActive │ isActive │
├─────────┼─────────────────────────────────────┼───────────┼───────────────┼──────────┤
│ 0       │ 'default'                           │ 'running' │ true          │ true     │
│ 1       │ 'user-gesture-required'             │ 'running' │ true          │ true     │
│ 2       │ 'document-user-activation-required' │ 'running' │ true          │ true     │
└─────────┴─────────────────────────────────────┴───────────┴───────────────┴──────────┘
```

and the same with `--enable-automation` and `--allow-pre-commit-input` both
removed, and with the `headless_shell` binary instead of full chromium. Playwright
does not pass an autoplay switch at all (`playwright-core/lib/server/chromium/
chromiumSwitches.js` contains no `autoplay` string); this is Chromium's own
headless behaviour and it cannot be switched off from the command line.

This is the audio twin of the tone-mapping trap. A probe that reads
`AudioContext.state` or `navigator.userActivation` straight from this browser is
reading a **different platform from the player's**, and any green it produces is
compatible with total silence on a phone.

`qa/autoplay.mjs` already found this and already solved it — its header records
the same four rows — by **enforcing the policy inside the page**: a subclassed
`AudioContext` that really suspends at construction, really refuses `resume()`
before a gesture, and reports `'suspended'` until one arrives. This crew reuses
that shim with **one strictness added**: it counts only `event.isTrusted`, so a
synthetic dispatch from the probe cannot unlock it. That is what makes the
counterfactual in §2.3 honest.

### 2.2 The gesture does not survive the world switch

`node qa/gatecarry.mjs` — the source is in §5.3, this is its run:

```
  splash, untouched            ctx=suspended   trusted gestures=0   navigator.userActivation.hasBeenActive=true
  after PLAY                   ctx=suspended   trusted gestures=3

  --- the page has reloaded on pirate ---
  on arrival                   ctx=suspended   trusted gestures ON THIS PAGE=0   navigator.userActivation.hasBeenActive=true  <-- headless lies here; the shim does not
  gate armed after             18.1s of wall from the card tap
  gate trace: 3.2s hidden TAP TO BEGIN  |  21.2s TAP TO PLAY [armed]
```

(3 "gestures" for one tap is the shim counting `pointerdown`, `mousedown` and
`click` off the same press; it is an event count, not a tap count. The tap count
is measured separately in §5.2.)

**Zero trusted gestures on the page that comes back.** The tap on the world card
happened in a document that no longer exists. This is the answer to the question
the brief told me to prove rather than assume: *no*, the earlier tap does not
carry, and *no*, the gate is not redundant while the reload exists.

`18.1s` is a swiftshader number and belongs to this renderer, not to a phone —
it is quoted for the **ordering** only: cover down at 3.2s with an unarmed pill
behind it, armed at 21.2s of page time.

### 2.3 What deleting the gate actually costs — measured on the shipped bundle

The probe then dismisses the gate with an **untrusted** `pointerdown`. `armGate`'s
own handler runs, so the game launches exactly as a gateless build would, but no
activation is granted — which is precisely the state a gateless reload would be
in.

```
  --- gate DELETED (dismissed without a trusted gesture) ---
  match live: true   t=0.4s   ctx=suspended
  theme channel: wanted=true srcs=0 cold=true buf=82s
  long-buffer start() calls: 0  (nothing scheduled at all)
  scheduled against a STOPPED clock: 0 of 0

  --- after ONE real, trusted tap ---
  ctx=running   trusted gestures=3   long-buffer starts now: 1
```

Read that middle block carefully, because it is the whole case:

* the match **does** start — the owner's "once it's loaded it starts" is
  mechanically available today;
* the world's score is **already decoded and resident** — `buf=82s` — because
  `index.html:35-51` puts this world's track first on the wire on exactly this
  path;
* the channel **wants** to play — `wanted=true`;
* and **nothing is scheduled**. `srcs=0`. The engine is behaving correctly
  (`repairMusic`, `audio3d.ts:789-802`, declines to schedule on a stopped clock —
  which is the right call, since anything scheduled there would be silent
  *forever*, not just now).

So a gateless world switch today = **a silent match** until the child's first
touch, at which point (last block) the score comes up in the same frame from the
resident buffer. The gate buys one thing and it is a real thing.

### 2.4 iOS may not have this constraint at all — and that is NOT enough to land on

Capacitor 8.4.1 sets, in
`node_modules/@capacitor/ios/Capacitor/Capacitor/CAPBridgeViewController.swift:125`:

```swift
webViewConfiguration.mediaTypesRequiringUserActionForPlayback = []
```

Nothing in `ios/` or `capacitor.config.ts` overrides it, and
`ios/App/App/AppDelegate.swift:27` already takes an `.playback` audio session. If
WebKit honours that setting for `AudioContext` as well as for media elements, the
shipping iOS app has **no autoplay gate**, and the whole of §2.2-2.3 is a
web-only problem.

**I did not verify that and this sandbox cannot.** It is a source read plus a
belief about WebKit, which under standing rule 3 is not a number. Two reasons it
must not be leaned on anyway: the game also ships on the web (`vercel.json`, a
`manifest.json`, and that is where the owner is playing today), and a fix whose
correctness depends on a webview flag we do not own is a fix that breaks on a
Capacitor upgrade. **Recommended action: a five-minute device check** — open the
app, switch worlds, and read `__music().ctx` from Safari's inspector before
touching anything. If it says `running`, that is a real measurement and it
changes the calculus for the native build only.

---

## 3. ITEM A — WHAT TO DO

### 3.1 The options, with what each actually costs

**Option 0 — leave it.** Rejected. The owner has now objected to this class of
screen twice: once on the fresh path (`2445739`, "TWO TAPS … owner caught it
same-day") and once here. A gate that survives two owner complaints on the
strength of an engineering constraint is a gate that has stopped being a design
decision.

**Option 1 — delete the gate, accept the silence.** Honest, meets his words
exactly, and costs the opening of every world switch its music. The floor on that
silence is not zero: movement is damped for the whole establishing shot
(`COPY.introLen` — maple 2.2s, pirate 2.2s, gameday 3.4s, powder 3.5s, lantern 3.6s,
`prototype3d.ts:1298/1354/1385/1408/1430`), so a child who waits for the camera before
touching is 2-4 seconds into a scored, timed match before the score exists.
**Not recommended alone.**

**Option 2 — RECOMMENDED. Delete the gate; harvest the gesture on the loading
screen; never block.**

The reload path already puts a full-screen loading cover up (`#loadScr`, z-60)
for the whole island build, and the audio engine already treats *any* touch
anywhere as the unlock — capture-phase, on `window`, five event types
(`audio3d.ts:315-322`), running `repairMusic()` synchronously inside the gesture
so the track starts in the same frame. **Nothing needs to be built to harvest a
touch. It is already harvested.** What changes is what we do about it:

1. delete `#tapGate`, `armGate()`, `body.gated` and `.gHint` outright;
2. in the `voidAutoPlay` block, replace the gate with the launch it was gating,
   behind `withWorldReady` — the world comes up when it is ready, with no
   invitation and no wall;
3. add **one quiet line** to `#loadScr` on this path only — a small `tap anywhere
   ✨` under the tip — plus a small visual acknowledgement when the cover is
   touched, which is good feedback regardless. It is *not* a gate: nothing waits
   on it, nothing dims, the match starts whether or not it is obeyed. Its job is
   to raise the odds that the gesture lands early; it does not change what
   happens if it does not.

The child's experience becomes exactly the owner's sentence: pick the level, the
loading screen, the match. The score starts at the whistle for anyone who touched
the screen while their world was building, and on the first touch for anyone who
did not.

**How many children touch during the load is a guess and I am marking it as
one.** I believe it is most of them, because loading is dead time and children
poke at dead time — but that is a belief, not a measurement, this sandbox cannot
produce it, and under standing rule 3 it does not get to be stated as a fact. It
is on the list in §7.3 as the one number a playtest has to supply, and the
instrumentation in the next paragraph is what makes it supplyable at all.

**What this trades away, stated plainly for the skeptic:** the *guarantee*. Today
the score is promised at a known instant on this path. After this it is promised
only for a child who touched during the load. That is a real reduction and the
skeptic should weigh it against the owner having asked for it twice.

**So make the reduction measurable instead of arguable.** The engine already
logs `gesture, ctx=…` on every unlock (`audio3d.ts:304`) and already keeps
`lastGestureAt` (`:279`, set at `:294`). One more field on `musicState()` — the milliseconds
between `startMusic()` and the first trusted gesture of the page, `-1` if the
gesture came first — turns the residual risk into a number `qa/tapgate.mjs` can
print on every future run: **"silent opening: N ms"**. Nobody then has to
re-litigate this from memory; a regression that lengthens the silence shows up
as a number going up. This is the part of Option 2 I would refuse to land
without.

**Option 3 — the conditional gate.** Arm the gate only if no trusted gesture has
been seen by the time the world is ready. Strictly safer than Option 2 and still
invisible to most children. **I do not recommend it**, and the reason is the
owner's own word: his complaint is that the gate appears *sometimes*. Option 3
makes "sometimes" depend on whether the child happened to fidget, which is worse
than a branch you can explain. Offered because the skeptic may value the
guarantee more than I do.

**Option 4 — the actual cure: stop navigating.** The gesture is lost because
`location.href = location.pathname` throws the document away. Nothing else in this
report would exist if the world switch were same-document.

Sizing it honestly, because "too big" is not a measurement:
`grep -c pickedWorld src/prototype3d.ts` → **50** references, of which the
module-level `const`s that would have to become re-bindable are eight —
`:355` `pickedWorld`, `:802` `LIGHT`, `:1444` `COPY`, `:3472/3473` `MED_Q`/`HARD_Q`,
`:3707` `BEATS`, `:3785` `seasonNow`, `:3789` `MEAL_NAME` — plus a teardown and
rebuild of the island group. **`src/proto3d/island.ts` already exposes
`setWorld(id)` (`:147-161`) and reads its world through `worldId()` at
`:162`, and `audio3d.ts`, `life.ts` and `defense.ts` all key off that
function rather than off a baked constant.** The engine half is already
world-mutable. It is `prototype3d.ts` that is not. That is a real, bounded
refactor — a round of its own, with `qa/worldswitch.mjs` and `qa/tapgate.mjs` as
its gate — and it is the only thing that makes the second tap *impossible*
rather than *unlikely*.

### 3.2 The recommendation, in one paragraph

Land **Option 2**, gated on `qa/tapgate.mjs` going green, and file **Option 4**
as the follow-up that retires the problem. Do the iOS device check in §2.4 while
Option 2 is in review; if the native build turns out to have no autoplay gate at
all, Option 2's only residual risk is web-only and shrinks further.

### 3.3 The diff sketch

```
index.html
  -1159..1191   the whole #tapGate block, including body.gated and .gHint
  -1703         body.calm .gPill
  -1972..1975   <div id="tapGate">…</div>
  +             one <div class="lWake">tap anywhere ✨</div> inside #loadScr,
                shown only when the page came in on voidAutoPlay

src/prototype3d.ts
  -5971..6000   the gate's header comment, tapGateEl, armGate()
   6004..6076   the voidAutoPlay block keeps everything EXCEPT the gate:
                  - keep: menu hidden, the daily-card deferral, the
                    "no cover may follow the tap" contract
                  - replace armGate('TAP TO PLAY', cb) with the cb, run
                    through withWorldReady()
  ~6079..6090   rewrite the "FRESH LOAD HAS NO GATE ANY MORE" note so it
                records BOTH retractions and why the reload path lost its
                gate second — including what it cost
```

Nothing in `armGate`'s debug bypass (`DEBUG_HARNESS || TOPDOWN || ASSETVIEW`)
needs preserving: with the gate gone, every path is the harness path.

### 3.4 One more thing the gate does that nobody has written down

On the world-switch path, for a child in session two, the gate's tap does **not**
start the match. It calls `launchWorld()`, which finds `voidTut` unset and raises
the `#tut` modal instead (`:5699-5729`). So that child taps the card, taps the
gate, and taps **LET'S EAT** — *three* taps after choosing a world. Item B's
second half deletes the middle screen and the third tap together. The two items
in this brief are the same journey.

---

## 4. ITEM B — MAPLE'S TUTORIAL, AND THE OLD POPUP

### 4.1 They are two different objects

| | `#hand` — the figure-8 he wants | `#tut` — the popup he wants gone |
| --- | --- | --- |
| what | a ghost hand tracing a lemniscate **over the live game**, wordless | a **full-screen modal**, title "DRAG TO MOVE", with a second copy of the same SVG |
| markup | `index.html:1758-1778` | `index.html:2054-2083` |
| shown by | `prototype3d.ts:9106` | `prototype3d.ts:5699-5729`, inside `launchWorld()` |
| gate | `firstRun`, i.e. `!localStorage.voidPlayed` (`:5506`, `:5541`) | `!localStorage.voidTut` (`:5699`) |
| ends when | the first real drag (`nomArmed`, `:2955`) | the child taps **LET'S EAT** (`:5758-5762`) |

The design intent is written down at `index.html:1753-1757`: *"the card is the
session-two teach, the hand is the first-launch teach"*. They were never meant to
coexist, and `#tut.knows .tHand { display:none }` (`index.html:274`) exists to
stop the card re-showing the figure-8 to a child who has already dragged.

**On "that must be old code":** I cannot date them against each other. This
repository's history begins at `589e31e` (2026-08-16), a squashed import that
already contains both, and `git log -S` for every relevant string returns only
that commit. His read is a fair one — the modal is the older teaching idiom and
the hand is the one the codebase's own comments call "hypercasual-standard
(hole.io's own)" — but I am not going to assert a chronology I cannot show.

### 4.2 The figure-8 disappears because `firstRun` means "never played"

```ts
// prototype3d.ts:5506, :5541, :5544 — inside beginMatch()
const firstEver = !localStorage.getItem('voidPlayed');
…
firstRun = firstEver;
nomArmed = !firstEver;   // the FIRST NOM party waits for a real drag

// prototype3d.ts:9106
handEl.classList.toggle('show', firstRun && started && !ended && dragTaught && !nomArmed);
```

`voidPlayed` is written at `:5521`, at **match start**, not at the whistle. So it
is set roughly one second into the first match a child ever plays, and from the
second match onward `firstRun` is false and the hand can never appear again — on
any world. That is exactly what the owner reports, and §6 measures it: the hand
at `t = 2.2653s` on a fresh profile, and **never**, across 1,282 samples of a
match run past `t = 3.2s`, on the same world with history.

Note the second gate too: `nomArmed` starts `true` for a returning player (so the
FIRST NOM party cannot fire on drift, `:5253-5265`), and the hand needs
`!nomArmed`. **Flipping `firstRun` alone would not bring the hand back** — the
hand's "has not dragged yet" condition is currently carried by a flag that means
something else. This is the part a naive one-line fix gets wrong.

### 4.3 The fix for the hand — narrow, and a switch to widen it

Introduce two things and change one line:

```ts
// Maple is the intro level for everyone, every time (owner, 2026-08-29).
const MAPLE_TEACHES = pickedWorld === 'maple';
// …declared beside firstRun/dragTaught at :5411-5415
let teachDrag = false;     // this match should show the wordless lesson
let dragDone = false;      // a real drag has happened THIS match
let controlsLive = false;  // the intro is over and a drag would actually move

// :2955 — where nomArmed is already set by the first genuine drag
if (joy.mag > 0.25) { dragDone = true; if (!nomArmed) nomArmed = true; }

// :5541-5544, in beginMatch()
firstRun = firstEver;
teachDrag = firstEver || MAPLE_TEACHES;
dragDone = false;
nomArmed = !firstEver;          // unchanged — the party is still once-in-a-lifetime

// :9283 — split "controls are live" from "say the first-run lines"
if (introT <= 0 && !controlsLive) {
  controlsLive = true;
  if (firstRun) { /* the welcome banners, guideStep = 1, the DRAG pill — unchanged */ }
}

// :9106
handEl.classList.toggle('show', teachDrag && started && !ended && controlsLive && !dragDone);
```

**What this deliberately does NOT bring back on Maple:** the two welcome banner
cards ("Auntie NIBBLES…", `:9291-9292`), the DRAG pill and its three repeats
(`:9094-9097`), the FIRST NOM party (`:5260-5265`) and the danger beats
(`:9113-9128`). Those are once-in-a-lifetime moments; replaying them on every
Maple match would turn the intro level into a permanent tutorial, and the owner
asked for the *hand*, not the lecture. The hand is silent, it costs no screen
furniture, and for a child who knows the game it is on screen for well under a
second — it vanishes on the first drag, by construction.

**If he wants the whole ladder:** one line, `firstRun = firstEver ||
MAPLE_TEACHES`, and everything above comes back on Maple every time. Flagged as
the widening switch so the decision is his and not buried.

**A caveat the skeptic should press on:** `MAPLE_TEACHES` is `pickedWorld ===
'maple'`, evaluated at module scope, so it is stable for the page — which is
right today, and would need to become a live read on the day Option 4 (§3.1)
makes the world switchable in place.

### 4.4 The old popup — it is not dead, and here is when it fires

`#tut` is shown from inside `launchWorld()` (`:5699`), which is the **menu**
launch path. First launch never goes through it: `:5766-5769` calls
`beginMatch()` directly, so `voidPlayed` is set and **`voidTut` never is** — only
`#btnGotIt` writes it (`:5760`).

Therefore **every** child arrives at session two with `voidPlayed='1'` and
`voidTut` unset, and the first world they pick from the menu raises a full-screen
modal titled **DRAG TO MOVE**. If they already dragged (`voidFirstNom`), `.knows`
hides the modal's figure-8 — **but not its title**, which is `index.html:2057`,
hardcoded, and still says DRAG TO MOVE. That is precisely the thing the owner
saw "at the next level". §6 measures it firing and photographs it: the modal
comes up, the title reads DRAG TO MOVE, and `.knows` has hidden its figure-8 —
so what is left is a wall of text whose headline instructs a child in the one
thing the game already knows they can do.

This is already a known-dangerous object. `qa/tutstrand.mjs` exists solely because
this modal, on this journey, once produced an **unexitable app**: `launchWorld()`
returns early to show the card, `withWorldReady()` is the only thing that releases
the loading cover, `#loadScr` is z-60 against `#tut`'s z-12, so the card the child
had to tap was underneath a frozen 100% loading screen with the menu hidden. The
`coverRelease('pack')` at `:5727` is the patch, and its comment is twenty lines
long. **All of that disappears with the modal.**

### 4.5 The fix for the popup — delete it, and close the one hole it leaves

Delete, in `index.html`: the markup (`:2054-2083`), the styles (`:1638-1650`),
`#tut .tHand` (`:271`) and `#tut.knows .tHand` with its comment (`:272-274`).
**Careful with `:269`** — `#hand svg, #tut .tHand svg { … }` is a *shared*
selector and the `#hand` half must survive; drop only the second half of it.

Delete, in `src/prototype3d.ts`: the `!voidTut` branch (`:5699-5729`), the
`#btnGotIt` handler (`:5758-5763`), the `tutEl` binding (`:5399`), the `voidTut`
write in the debug bypass (`:7063`), and `'tut'` from `OVERLAYS` (`:1959`).
`voidTut` then has no reader and no writer anywhere; leave the key alone in
existing profiles rather than migrating it — a dead key costs nothing and a
migration can only go wrong.

Three probes reference `#tut` or `#btnGotIt`. `qa/tutstrand.mjs` should be
retired outright — its entire failure mode ceases to exist. `qa/hud.mjs:79,85`
and `qa/hud2.mjs:71,75,79` reach for the button through `?.click()`, so they
degrade to no-ops rather than throwing; they should still lose the dead lines
rather than keep a call that can never do anything.

**What is lost, honestly.** The modal is the only *modal* that states the danger
loop — "eat the family when you're bigger… and RUN when you're not". But that
lesson is also taught in play, in context, at `:9113-9128`: the beat fires the
first time a genuinely bigger rival comes within 70 units, with a sound and a
buzz, and its partner fires when the tables turn. That is better teaching than a
wall of text, and it is where the rest of the guidance ladder already lives.

**The hole:** those beats are gated on `firstRun`, so a child whose first match
ended before a bigger rival came near never gets the lesson at all, and after
this change nothing would ever say it. Close it with the same mechanism as the
hand, not with a modal:

```ts
// bank it when it actually plays, so it is taught once and only once
if (!dangerTaught && rv.r > R * 1.15 && d < 70) { … localStorage.setItem('voidDanger', '1'); }
// …and let it play until it has been banked, on Maple or on a first run
const teachDanger = firstEver || (MAPLE_TEACHES && !localStorage.getItem('voidDanger'));
```

That converts a lesson that *might* have been seen into one that *has* been
seen, and it removes a modal, a flag, a stylesheet block and a twenty-line
workaround comment. It is a subtraction, which is what the brief asked for.

### 4.6 Together with Item A

On the world-switch journey, a session-two child today taps: **world card → TAP
TO PLAY → LET'S EAT**. Landing §3 and §4.5 together takes that to **world card →
the match**, which is the owner's sentence for both items at once.

---

## 5. PROBES 1 AND 2 — `qa/tapgate.mjs` and `qa/gatecarry.mjs`

**The bar.** From the moment a world card is tapped, the game reaches a live
match (`__matchState().t > 0`) with **zero** further taps, and no gate is on
screen. One tap chooses the world; nothing after it may ask again.

**Why this bar and not "the audio is unlocked".** See §2.1: this harness cannot
honestly answer the audio question from the outside. The probe therefore measures
two different things with two different instruments — **tap count** from the
outside, on trusted events only, which is a number this harness can produce; and
**audio state** from the inside, through the in-page policy shim, which is the
only way this harness can produce that one.

### 5.1 Probe 1 — `qa/tapgate.mjs`

```js
// ── HOW MANY TIMES MUST A CHILD TAP TO GET INTO A MATCH? ────────────────────
//
//   node qa/tapgate.mjs [port] [world...]        default: 4177 pirate gameday
//
// THE BAR: from the moment a world card is tapped, the game reaches a live
// match (__matchState().t > 0) with ZERO further taps. One tap chooses the
// world; nothing after it should ask again.
//
// The owner: "Sometimes I'm still seeing the Tao [Tap] to start." The
// "sometimes" is not flaky — it is exactly one branch. Tapping the world you
// are ALREADY on calls launchWorld() in place; tapping a DIFFERENT one writes
// voidAutoPlay and reloads, and the reloaded page raises #tapGate. This probe
// walks both branches from the same profile and prints the tap count for each.
//
// ── WHAT THIS PROBE DELIBERATELY DOES NOT MEASURE ──────────────────────────
// It does NOT measure whether audio is unlocked, and no probe in this harness
// can. Measured 2026-08-29 on chromium-1194 here: on about:blank, with no
// input of any kind and with --autoplay-policy=document-user-activation-
// required, `new AudioContext().state` is 'running' and
// `navigator.userActivation.hasBeenActive` is true. Headless Chromium grants
// activation unconditionally; it cannot be switched off from the command
// line, and the headless_shell binary behaves the same. So a green
// "ctx.state === running" here would be the audio twin of reading colour out
// of a WebGLRenderTarget: a different pipeline from the player's. Tap COUNT
// is a real number this harness can honestly produce. Audio unlock is not.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const TARGETS = process.argv.slice(3).length ? process.argv.slice(3) : ['pirate', 'gameday'];
const HOME = 'maple';   // the world the profile is sitting on before PLAY

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
});

/** Every route worth walking: the world you are on, and a world you are not. */
const journeys = [{ label: `${HOME} -> ${HOME}  (same world, no reload)`, to: HOME }]
  .concat(TARGETS.map((w) => ({ label: `${HOME} -> ${w}  (world switch, reloads)`, to: w })));

let bad = 0;
const rows = [];
for (const j of journeys) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => {
    try {
      // A PROFILE WITH HISTORY — the owner's own state. voidUnlocked is a
      // COMMA-JOINED STRING, not JSON (src/game/unlocks.ts read/write); a
      // JSON.stringify here silently unlocks nothing and the picker refuses
      // every card the probe tries to tap.
      localStorage.setItem('voidPlayed', '1');
      localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidFirstNom', '1');
      localStorage.setItem('voidWorld', 'maple');
      localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
      localStorage.setItem('voidDailyLast', new Date().toDateString());   // no daily card in the way
      // NOTE THE ABSENCE. An addInitScript runs on EVERY document, including
      // the one the world switch navigates to — and `voidWorld` is re-pinned
      // to maple above for the same reason it is harmless (the module has
      // already read it). A `localStorage.removeItem('voidAutoPlay')` here is
      // NOT harmless: it runs before the bundle on the reloaded page, deletes
      // the flag the switch just wrote, and the page comes back to the MENU.
      // The first version of this probe did exactly that and reported "no gate,
      // no match" — a green-looking result that was measuring a boot path the
      // player never takes.
    } catch { /* storage blocked */ }
    // A TAP COUNTER THAT SURVIVES THE RELOAD. The world switch navigates, so
    // anything held in the probe's own closure is fine, but anything held in
    // the page is not — this counts into sessionStorage, which the reload
    // keeps, and counts only TRUSTED events (what the autoplay policy counts).
    window.addEventListener('pointerdown', (e) => {
      if (!e.isTrusted) return;
      try { sessionStorage.setItem('__taps', String(1 + Number(sessionStorage.getItem('__taps') || 0))); } catch {}
    }, { capture: true });
    // …and a trace of what the gate did, stamped on this page's own clock, so
    // a failing run says WHICH state it stopped in rather than just "no match".
    window.__gateTrace = [];
    setInterval(() => {
      const g = document.getElementById('tapGate');
      if (!g) return;
      const row = { t: Math.round(performance.now()),
        vis: g.classList.contains('show') && getComputedStyle(g).display !== 'none',
        label: (g.querySelector('.gPill')?.textContent || '').trim(),
        armed: g.classList.contains('armed') };
      const last = window.__gateTrace[window.__gateTrace.length - 1];
      if (!last || last.vis !== row.vis || last.label !== row.label || last.armed !== row.armed) window.__gateTrace.push(row);
    }, 50);
  });
  const page = await ctx.newPage();
  await page.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await page.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
  }));

  await page.click('#btnPlay');
  await page.waitForSelector('#worlds.show', { timeout: 60000 });
  const tapsBefore = await page.evaluate(() => Number(sessionStorage.getItem('__taps') || 0));

  // THE ONE TAP THAT IS ALLOWED: the world card.
  await page.click(`#worldRow .wCard[data-world="${j.to}"]`);
  const cardAt = Date.now();

  // …and from here the probe touches NOTHING. It waits on the match clock,
  // never on wall time — under swiftshader the match clock runs 14-40x slower
  // than wall, so a wall-clock wait proves nothing about the game's own
  // timeline. 90s of wall is the ceiling on the wait, not the measurement.
  await page.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  let live = false;
  const deadline = Date.now() + 90000;   // wall CAP on the wait, not a measurement
  while (Date.now() < deadline) {
    live = await page.evaluate(() => (window.__matchState?.().t ?? 0) > 0).catch(() => false);
    if (live) break;
    await page.waitForTimeout(500);
  }
  const r = await page.evaluate(() => {
    const g = document.getElementById('tapGate');
    const cs = g ? getComputedStyle(g) : null;
    return {
      taps: Number(sessionStorage.getItem('__taps') || 0),
      gateShown: !!g && g.classList.contains('show') && cs.display !== 'none',
      gateLabel: g ? (g.querySelector('.gPill')?.textContent || '') : '',
      gateArmed: !!g && g.classList.contains('armed'),
      bodyGated: document.body.classList.contains('gated'),
      t: +(window.__matchState?.().t ?? 0).toFixed(1),
      world: localStorage.getItem('voidWorld'),
      trace: (window.__gateTrace || []).map((r) => `${(r.t / 1000).toFixed(1)}s ${r.vis ? 'up' : 'down'} "${r.label}"${r.armed ? ' armed' : ''}`),
    };
  });
  const tapsAfterCard = r.taps - tapsBefore;   // the card tap itself is 1
  const extra = Math.max(0, tapsAfterCard - 1);
  const ok = live && extra === 0 && !r.gateShown;
  if (!ok) bad++;
  rows.push({ journey: j.label, live, matchT: r.t, tapsToPlay: tapsAfterCard, world: r.world,
    secs: ((Date.now() - cardAt) / 1000).toFixed(0), trace: r.trace,
    gateUp: r.gateShown ? `YES ("${r.gateLabel.trim()}")` : 'no', verdict: ok ? 'ok' : 'ASKS AGAIN' });
  await ctx.close();
}

for (const row of rows) {
  console.log(`${row.journey.padEnd(42)} match live: ${String(row.live).padEnd(5)} t=${String(row.matchT).padEnd(6)} `
    + `taps after the card: ${row.tapsToPlay - 1}   gate: ${row.gateUp.padEnd(22)} ${row.verdict}`);
  if (row.trace.length) console.log(`${''.padEnd(42)} gate trace after ${row.secs}s: ${row.trace.join('  |  ')}`);
}
console.log(bad
  ? `\n${bad} of ${rows.length} journeys ask the child to tap again after they have already chosen the world.`
  : `\nall ${rows.length} journeys go card -> match with no second tap.`);
await browser.close();
process.exit(bad ? 1 : 0);
```

### 5.2 The run — FAILS on today's build

(Its default target list is `pirate gameday`; I ran it with `pirate` alone, one
switch being enough to establish the branch — the other four worlds go through
the identical two lines at `:5932-5934` and are listed as inference in §7.3.)

```
$ node qa/tapgate.mjs 4177 pirate

maple -> maple  (same world, no reload)    match live: true  t=0.1    taps after the card: 0   gate: no                     ok
                                           gate trace after 13s: 0.1s down "TAP TO BEGIN"
maple -> pirate  (world switch, reloads)   match live: false t=0      taps after the card: 0   gate: YES ("TAP TO PLAY")    ASKS AGAIN
                                           gate trace after 125s: 8.4s down "TAP TO BEGIN"  |  42.9s up "TAP TO PLAY" armed

1 of 2 journeys ask the child to tap again after they have already chosen the world.
$ echo $?
1
```

**This is the owner's report, reproduced exactly.** One row of cards, one kind of
tap, two outcomes:

* **maple → maple**: the match is live at `t=0.1s` of match time with the probe
  having touched nothing since the card. The gate element exists in the DOM
  carrying its authored default label, and is never shown (`0.1s down "TAP TO
  BEGIN"`). This is the journey where the game does what he asked for, today.
* **maple → pirate**: **125 seconds** after the card was tapped — of which 90
  were the probe sitting on its hands, by construction — the match clock is still
  `0` and the gate is up reading **TAP TO PLAY**. It will wait forever. The trace
  shows the sequence: the unarmed pill exists at 8.4s of the *reloaded page's*
  clock, behind the z-60 loading cover, and the cover comes off it at 42.9s to
  reveal an armed gate.

**Why the tap column reads `0` on the failing row.** It is not that no second
tap was needed — it is that the probe refuses to make one. The column counts
taps the *probe* performed, and the whole design is that it performs none after
the card; the failure shows up as `match live: false` with the gate up, which is
the honest shape of "the game is waiting for something a child would have to
supply". A probe that tapped the gate to be helpful would have gone green and
told us nothing.

None of 8.4s / 42.9s / 125s is a phone's number, and none of them is the
measurement. They are swiftshader page-time (this run overlapped another probe
on the same machine; a separate run of the same journey, §5.3, put the arm at
18.1s) and a probe's self-imposed patience. **The measurement is the pair
`match live: false` and `gate: YES`, and it does not change however long you
wait.**

### 5.3 The second probe — `qa/gatecarry.mjs`

The same journey, with the autoplay policy enforced in the page. This is a
separate file, not a flag on the first one: the two measure different things
with different instruments and only one of them may touch `AudioContext`.
Source, then the run.

```js
// ── DOES THE GESTURE SURVIVE THE WORLD SWITCH? ─────────────────────────────
// The world picker switches world by NAVIGATING (location.href =
// location.pathname). This asks the only question that decides whether the
// TAP TO PLAY gate is redundant: on the page that comes back, does the game
// still hold a user activation from the tap on the world card?
//
// The autoplay policy is enforced IN THE PAGE, exactly as qa/autoplay.mjs
// does it and for the same reason: headless Chromium grants activation
// unconditionally at every --autoplay-policy setting (re-measured today, see
// §3). This shim is one notch STRICTER than autoplay.mjs's: it counts only
// `isTrusted` events, so a synthetic dispatch from the probe cannot unlock it.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const TO = process.argv[3] || 'pirate';

const shim = () => {
  try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidFirstNom', '1'); localStorage.setItem('voidWorld', 'maple');
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
    localStorage.setItem('voidMute', '0');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch {}
  const RealAC = window.AudioContext || window.webkitAudioContext;
  const baseProto = Object.getPrototypeOf(RealAC.prototype);
  const realState = Object.getOwnPropertyDescriptor(baseProto, 'state');
  let gestured = false, trusted = 0, synthetic = 0;
  for (const ev of ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click']) {
    addEventListener(ev, (e) => { if (e.isTrusted) { gestured = true; trusted++; } else synthetic++; },
      { capture: true, passive: true });
  }
  class Policed extends RealAC {
    constructor(...a) { super(...a); if (!gestured) { try { super.suspend(); } catch {} } }
    resume() { if (!gestured) return Promise.resolve(); return super.resume(); }
  }
  Object.defineProperty(Policed.prototype, 'state', {
    configurable: true, get() { return gestured ? realState.get.call(this) : 'suspended'; },
  });
  window.AudioContext = Policed; window.webkitAudioContext = Policed;

  const log = [];
  Object.defineProperty(window, '__startLog', { get: () => log });
  Object.defineProperty(window, '__acts', { get: () => ({ trusted, synthetic, gestured,
    uaHasBeenActive: navigator.userActivation ? navigator.userActivation.hasBeenActive : null }) });
  const S = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...a) {
    let st = '?', len = 0;
    try { st = this.context.state; len = this.buffer ? this.buffer.duration : 0; } catch {}
    if (len > 5) log.push({ t: Math.round(performance.now()), state: st, dur: Math.round(len) });
    return S.apply(this, a);
  };
  // gate trace, stamped against the page's own clock
  window.__gateTrace = [];
  const iv = setInterval(() => {
    const g = document.getElementById('tapGate');
    if (!g) return;
    const vis = g.classList.contains('show') && getComputedStyle(g).display !== 'none';
    const label = (g.querySelector('.gPill')?.textContent || '').trim();
    const armed = g.classList.contains('armed');
    const last = window.__gateTrace[window.__gateTrace.length - 1];
    const row = { t: Math.round(performance.now()), vis, label, armed };
    if (!last || last.vis !== vis || last.label !== label || last.armed !== armed) window.__gateTrace.push(row);
  }, 50);
  window.__stopGateTrace = () => clearInterval(iv);
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
    '--autoplay-policy=document-user-activation-required'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await ctx.addInitScript(shim);
const p = await ctx.newPage();
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));

console.log(`\n  THE GESTURE ACROSS THE SWITCH — maple -> ${TO} @ :${PORT}\n`);

await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));

const pre0 = await p.evaluate(() => ({ acts: window.__acts, music: window.__music?.() ?? null }));
console.log(`  splash, untouched            ctx=${pre0.music?.ctx}   trusted gestures=${pre0.acts.trusted}   navigator.userActivation.hasBeenActive=${pre0.acts.uaHasBeenActive}`);

await p.click('#btnPlay');
await p.waitForSelector('#worlds.show', { timeout: 60000 });
const pre1 = await p.evaluate(() => ({ acts: window.__acts, music: window.__music?.() ?? null }));
console.log(`  after PLAY                   ctx=${pre1.music?.ctx}   trusted gestures=${pre1.acts.trusted}`);

await p.click(`#worldRow .wCard[data-world="${TO}"]`);
const nav0 = Date.now();

await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
const post = await p.evaluate(() => ({ acts: window.__acts, music: window.__music?.() ?? null }));
console.log(`\n  --- the page has reloaded on ${TO} ---`);
console.log(`  on arrival                   ctx=${post.music?.ctx}   trusted gestures ON THIS PAGE=${post.acts.trusted}`
  + `   navigator.userActivation.hasBeenActive=${post.acts.uaHasBeenActive}  <-- headless lies here; the shim does not`);

// wait for the gate to ARM (this is the GETTING READY… dwell)
await p.waitForFunction(() => document.getElementById('tapGate')?.classList.contains('armed'), null, { timeout: 200000 }).catch(() => {});
const armedAt = Date.now();
const trace = await p.evaluate(() => window.__gateTrace);
console.log(`  gate armed after             ${((armedAt - nav0) / 1000).toFixed(1)}s of wall from the card tap`);
console.log(`  gate trace: ` + trace.map((r) => `${(r.t / 1000).toFixed(1)}s ${r.vis ? '' : 'hidden '}${r.label}${r.armed ? ' [armed]' : ''}`).join('  |  '));

// ── THE COUNTERFACTUAL: what a build with NO gate does ────────────────────
// Dismiss it with an UNTRUSTED pointerdown. armGate's own handler runs, so the
// match launches exactly as a gateless build would — but no activation is
// granted, which is precisely the state a gateless reload would be in.
await p.evaluate(() => document.getElementById('tapGate')
  .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
const deadline = Date.now() + 120000;
let live = false;
while (Date.now() < deadline) {
  live = await p.evaluate(() => (window.__matchState?.().t ?? 0) > 0.05).catch(() => false);
  if (live) break;
  await p.waitForTimeout(500);
}
await p.waitForTimeout(6000);
const gone = await p.evaluate(() => ({ acts: window.__acts, music: window.__music?.() ?? null,
  t: window.__matchState?.().t ?? 0, starts: window.__startLog.map((s) => ({ ...s })) }));
console.log(`\n  --- gate DELETED (dismissed without a trusted gesture) ---`);
console.log(`  match live: ${live}   t=${gone.t.toFixed(1)}s   ctx=${gone.music?.ctx}`);
console.log(`  theme channel: wanted=${gone.music?.theme?.wanted} srcs=${gone.music?.theme?.srcs} cold=${gone.music?.theme?.cold} buf=${gone.music?.theme?.dur}s`);
console.log(`  long-buffer start() calls: ${gone.starts.length}` + (gone.starts.length
  ? '  -> ' + gone.starts.map((s) => `${(s.t / 1000).toFixed(1)}s state=${s.state} ${s.dur}s`).join(', ')
  : '  (nothing scheduled at all)'));
const coldStarts = gone.starts.filter((s) => s.state !== 'running').length;
console.log(`  scheduled against a STOPPED clock: ${coldStarts} of ${gone.starts.length}`);

// ── and now a REAL tap, which is what the gate buys ───────────────────────
await p.mouse.click(195, 700);
await p.waitForTimeout(5000);
const after = await p.evaluate(() => ({ acts: window.__acts, music: window.__music?.() ?? null,
  starts: window.__startLog.map((s) => ({ ...s })) }));
console.log(`\n  --- after ONE real, trusted tap ---`);
console.log(`  ctx=${after.music?.ctx}   trusted gestures=${after.acts.trusted}   long-buffer starts now: ${after.starts.length}`
  + `  (${after.starts.filter((s) => s.state === 'running').length} on a running clock)`);
await b.close();
```

The run, verbatim:

```
  THE GESTURE ACROSS THE SWITCH — maple -> pirate @ :4177

  splash, untouched            ctx=suspended   trusted gestures=0   navigator.userActivation.hasBeenActive=true
  after PLAY                   ctx=suspended   trusted gestures=3

  --- the page has reloaded on pirate ---
  on arrival                   ctx=suspended   trusted gestures ON THIS PAGE=0   navigator.userActivation.hasBeenActive=true  <-- headless lies here; the shim does not
  gate armed after             18.1s of wall from the card tap
  gate trace: 3.2s hidden TAP TO BEGIN  |  21.2s TAP TO PLAY [armed]

  --- gate DELETED (dismissed without a trusted gesture) ---
  match live: true   t=0.4s   ctx=suspended
  theme channel: wanted=true srcs=0 cold=true buf=82s
  long-buffer start() calls: 0  (nothing scheduled at all)
  scheduled against a STOPPED clock: 0 of 0

  --- after ONE real, trusted tap ---
  ctx=running   trusted gestures=3   long-buffer starts now: 1  (0 on a running clock)
```

**Two readings I want on the record, because both matter to the skeptic.**

* `ctx=suspended` after PLAY, on the splash, is the shim reporting the real
  context's state at the instant it was sampled — `resume()` is a promise and
  the read is immediate. It is **not** a claim that the menu theme fails to
  start on PLAY; `qa/autoplay.mjs` owns that question and it is out of this
  crew's scope. Do not cite this line as a music bug.
* `long-buffer starts now: 1 (0 on a running clock)` after the real tap is the
  engine's **sanctioned** optimistic schedule — `startLoop` deliberately
  schedules inside the gesture whose `resume()` is still in flight, so the tap
  and the first note share a frame (`audio3d.ts:457-465`, `:789-802`). It is
  the healthy case, not the poison one.

---

## 6. PROBE 3 — `qa/mapleintro.mjs`

**Three bars.**

1. **control** — on a fresh profile the ghost hand appears. If this fails the
   probe is broken, not the build, and nothing else in the run means anything.
2. **maple** — with history, launching MAPLE brings the hand up again.
3. **no modal** — the "DRAG TO MOVE" modal never appears for a child who has
   already played a match and already dragged.

Everything is sampled on the **match clock**, never on wall time.

The probe writes three PNGs to `qa/out/` *relative to the working directory*.
I ran it from a scratchpad, not from the repo, because this crew writes exactly
one file and a probe run must not leave artefacts in a tree it is not allowed to
touch — so `qa/out/mapleintro_*.png` do **not** exist in the repository yet.
Running the landed probe from the repo root produces all three:

| file | what it shows |
| --- | --- |
| `mapleintro_fresh.png` | fresh profile, MAPLE, `t≈2.27s` — the white figure-8 with the finger riding it, over the live town, with the `DRAG to move` pill beneath |
| `mapleintro_history.png` | the same world and the same moment with history — no figure-8, no pill, nothing teaching |
| `mapleintro_oldpopup.png` | the **DRAG TO MOVE** modal with `LET'S EAT`, over the blurred live world, on the first menu launch |

### 6.1 The probe

```js
// ── MAPLE IS THE INTRO LEVEL. DOES IT TEACH? ────────────────────────────────
//
//   node qa/mapleintro.mjs [port]
//
// The owner: "Maple isle should always be sort of that intro level. When you
// start it should be showing that figure 8 with a finger etc. on a fresh
// start it shows it but once you have history it gets rid of it. I also see
// the old version pop up at the next level where it was like a popup to tell
// you to move. That must be old code."
//
// Two different objects, two different gates, one probe:
//   #hand  — the figure-8 ghost hand over the LIVE GAME. Gated on `firstRun`,
//            which is `!localStorage.voidPlayed` (prototype3d.ts:5506/5541).
//   #tut   — a full-screen MODAL titled "DRAG TO MOVE" that carries a second
//            copy of the same figure-8 SVG. Gated on `!localStorage.voidTut`
//            (prototype3d.ts:5699), checked inside launchWorld() — so it can
//            only ever fire on a MENU launch, never on the first-ever run.
//
// THE BARS
//   1. control  — on a fresh profile the hand comes up. (If this fails the
//                 probe is broken, not the build.)
//   2. maple    — with history, launching MAPLE brings the hand up again.
//   3. no modal — the "DRAG TO MOVE" modal never appears for a child who has
//                 already played a match and already dragged.
//
// Sampled on the MATCH CLOCK, never on wall time: under swiftshader the match
// runs 14-40x slower than wall, so "it showed within 3 seconds" measured with
// a wall timer is a statement about the renderer, not about the game.
import { chromium } from 'playwright';
import fs from 'fs';

const PORT = process.argv[2] || '4177';
const OUT = 'qa/out';
fs.mkdirSync(OUT, { recursive: true });

/** A screenshot is NICE TO HAVE, never the evidence — the numbers are. Under
 *  swiftshader a full-page shot of a live 3D scene can blow past Playwright's
 *  30s default and take the whole run down with it, which is how the first run
 *  of this probe died with three completed checks and nothing printed. */
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, timeout: 120000 })
  .then(() => true).catch((e) => { console.log(`  (screenshot ${name} skipped: ${String(e).slice(0, 40)})`); return false; });

/** Print each check the moment it is known, so a later crash cannot erase an
 *  earlier result. */
const say = (r) => { console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(40)} ${r.detail}`); return r; };

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
});

/** Watches #hand and #tut from the first paint and stamps every sighting with
 *  the MATCH clock, so the answer is "at t=2.4s of the match", not "1m10s of
 *  swiftshader". */
const watcher = () => {
  window.__seen = { handAtT: null, handAtMs: null, tutAtT: null, tutTitle: null, samples: 0 };
  const iv = setInterval(() => {
    window.__seen.samples++;
    const t = window.__matchState ? window.__matchState().t : 0;
    const h = document.getElementById('hand');
    if (h && window.__seen.handAtT === null && getComputedStyle(h).display !== 'none') {
      window.__seen.handAtT = t; window.__seen.handAtMs = Math.round(performance.now());
    }
    const tu = document.getElementById('tut');
    if (tu && window.__seen.tutAtT === null && getComputedStyle(tu).display !== 'none') {
      window.__seen.tutAtT = t;
      window.__seen.tutTitle = (tu.querySelector('.tTitle')?.textContent || '').trim();
      window.__seen.tutHandHidden = !!tu.querySelector('.tHand')
        && getComputedStyle(tu.querySelector('.tHand')).display === 'none';
    }
  }, 100);
  window.__stopWatch = () => clearInterval(iv);
};

/** Let the MATCH CLOCK advance to `t` seconds without touching anything, and
 *  stop early the moment the thing being waited for has been seen.
 *
 *  THE CAP HAS TO BE ENORMOUS, AND HERE IS THE NUMBER. The first run of this
 *  probe used 180 s of wall and reported the control check failing with
 *  "reached t=1.5s" — the match clock had not yet cleared MAPLE's 2.2 s
 *  establishing shot, so the ghost hand had not been shown YET rather than
 *  never. On that run the match clock was going ~120x slower than wall, well
 *  past the 14-40x this repo usually quotes. A wall cap that expires mid-intro
 *  measures the renderer, not the build. */
async function untilMatchT(page, t, seenKey = null, capMs = 900000) {
  const deadline = Date.now() + capMs;
  let now = 0;
  while (Date.now() < deadline) {
    now = await page.evaluate(() => window.__matchState?.().t ?? 0).catch(() => 0);
    if (now >= t) return now;
    if (seenKey) {
      const hit = await page.evaluate((k) => window.__seen && window.__seen[k] !== null, seenKey).catch(() => false);
      if (hit) return now;
    }
    await page.waitForTimeout(500);
  }
  return now;
}

const results = [];

// ── 1. CONTROL: a brand-new profile ────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await ctx.addInitScript(watcher);
  const page = await ctx.newPage();
  await page.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  const t = await untilMatchT(page, 3.2, 'handAtT');
  const seen = await page.evaluate(() => window.__seen);
  const store = await page.evaluate(() => ({
    voidPlayed: localStorage.getItem('voidPlayed'), voidTut: localStorage.getItem('voidTut'),
    voidFirstNom: localStorage.getItem('voidFirstNom'),
  }));
  if (seen.handAtT !== null) await shot(page, 'mapleintro_fresh');
  results.push(say({ name: '1 control  fresh profile, hand appears', ok: seen.handAtT !== null,
    detail: `hand at match t=${seen.handAtT}s, reached t=${t.toFixed(1)}s; `
      + `after first match start: voidPlayed=${store.voidPlayed} voidTut=${store.voidTut}` }));
  results.push(say({ name: '1b        first launch leaves voidTut UNSET', ok: store.voidPlayed === '1' && store.voidTut === null,
    detail: `voidPlayed=${store.voidPlayed} voidTut=${store.voidTut} — this is the state session two starts from` }));
  await ctx.close();
}

// ── 2. THE ASK: MAPLE, with history ────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidFirstNom', '1'); localStorage.setItem('voidWorld', 'maple');
      // COMMA-JOINED, not JSON — src/game/unlocks.ts splits on ','.
      localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
    } catch {}
  });
  await ctx.addInitScript(watcher);
  const page = await ctx.newPage();
  await page.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await page.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await page.click('#btnPlay');
  await page.waitForSelector('#worlds.show', { timeout: 60000 });
  await page.click('#worldRow .wCard[data-world="maple"]');   // same world: launches in place
  const t = await untilMatchT(page, 3.2, 'handAtT');
  const seen = await page.evaluate(() => window.__seen);
  await shot(page, 'mapleintro_history');
  results.push(say({ name: '2 MAPLE    with history, hand appears', ok: seen.handAtT !== null,
    detail: `hand at match t=${seen.handAtT === null ? 'NEVER' : seen.handAtT + 's'}, `
      + `match reached t=${t.toFixed(1)}s over ${seen.samples} samples` }));
  await ctx.close();
}

// ── 3. THE OLD POPUP: the state a real session-two child is in ─────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => {
    try {
      // exactly what check 1b measured coming out of a first launch, plus the
      // proof the child can already drag
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidFirstNom', '1');
      localStorage.removeItem('voidTut');
      localStorage.setItem('voidWorld', 'maple');
      localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
    } catch {}
  });
  await ctx.addInitScript(watcher);
  const page = await ctx.newPage();
  await page.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await page.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await page.click('#btnPlay');
  await page.waitForSelector('#worlds.show', { timeout: 60000 });
  await page.click('#worldRow .wCard[data-world="maple"]');
  // the modal is raised synchronously inside launchWorld(), but give the
  // watcher a generous window anyway — nothing here rides the match clock
  await page.waitForFunction(() => window.__seen && window.__seen.tutAtT !== null, null, { timeout: 90000 })
    .catch(() => { /* absence is the PASS case; fall through and report it */ });
  const seen = await page.evaluate(() => window.__seen);
  if (seen.tutAtT !== null) await shot(page, 'mapleintro_oldpopup');
  results.push(say({ name: '3 no modal for a child who has played', ok: seen.tutAtT === null,
    detail: seen.tutAtT === null ? 'no modal' :
      `modal UP, title "${seen.tutTitle}", its own figure-8 ${seen.tutHandHidden ? 'hidden by .knows' : 'VISIBLE'}` }));
  await ctx.close();
}

const bad = results.filter((r) => !r.ok).length;
console.log(bad ? `\n${bad} of ${results.length} fail` : `\nall ${results.length} pass`);
await browser.close();
process.exit(bad ? 1 : 0);
```

### 6.2 The run — FAILS on today's build

```
$ node qa/mapleintro.mjs 4177

PASS  1 control  fresh profile, hand appears   hand at match t=2.265300000001247s, reached t=2.2s; after first match start: voidPlayed=1 voidTut=null
PASS  1b        first launch leaves voidTut UNSET voidPlayed=1 voidTut=null — this is the state session two starts from
FAIL  2 MAPLE    with history, hand appears    hand at match t=NEVER, match reached t=3.2s over 1282 samples
FAIL  3 no modal for a child who has played    modal UP, title "DRAG TO MOVE", its own figure-8 hidden by .knows

2 of 4 fail
$ echo $?
1
```

**Check 1 is the one that makes the other three trustworthy, and it also
corroborates the mechanism.** The hand appears at match `t = 2.2653s` — Maple's
`COPY.introLen` is `2.2` (`prototype3d.ts:1298`), and `:9283` sets `dragTaught`
on the first frame after `introT <= 0`. The number and the source agree to
within one frame, which is what an accurate probe of the right thing looks like.
`qa/out/mapleintro_fresh.png` is that frame: the white figure-8, the finger on
it, and the `DRAG to move — eat & GROW!` pill under it — the owner's "figure 8
with a finger".

**Check 2 is his sentence, reproduced.** Same world, same profile except for
history, sampled 1,282 times across a match that ran past `t = 3.2s` — a second
clear of the moment the control saw the hand — and the hand is never shown.
`qa/out/mapleintro_history.png` is the comparison frame: identical scene,
nothing teaching.

**Check 3 is the popup, caught in the act.** `qa/out/mapleintro_oldpopup.png`
shows a full-screen card over the blurred live world, headed **DRAG TO MOVE**,
with `LET'S EAT` at the bottom. `.knows` did its job and hid the card's own
figure-8 — which leaves a modal whose *headline is an instruction the child has
demonstrably already followed*, sitting between them and the world they just
chose. That is the object the owner called old code, and functionally he is
right even if the git history cannot date it.

**Why "2 of 4" and not "2 of 3":** check 1b is a separate assertion on the same
page load — that a first launch leaves `voidTut` unset — because it is the
premise the whole of §4.4 rests on and it should be measured, not reasoned to.
It passes, which is the bad news: every child really does arrive at session two
primed to get the modal.

---

## 7. EVERYTHING I RAN, AND EVERYTHING I DID NOT

### 7.1 Commands

```
git log -1 --format=%h                                   -> 0d9138f
git status --porcelain | wc -l                           -> 4   (all docs/crews/round-4/*.md)
find src index.html -newer dist/index.html -type f | wc  -> 0
node qa/tapgate.mjs 4177 pirate            (twice — see §7.4)  -> §5.2
node qa/gatecarry.mjs 4177 pirate                              -> §5.3
node qa/mapleintro.mjs 4177               (twice — see §7.5)  -> §6.2
(one-off) the three-row autoplay-policy table                  -> §2.1
```

No build was run: `dist/` was already newer than every file under `src/` and
`index.html`, so `:4177` was already serving this source.

### 7.2 Source reads that carry weight

* `src/proto3d/assets3d.ts:36-46` — `requestedReady` is `Promise.resolve()`; the
  gate's 12-second race waits for nothing (§1.4).
* `src/game/unlocks.ts:38-47` — `voidUnlocked` is comma-joined, not JSON. The
  probes seed it correctly; this is the trap the brief warned about and it is
  live.
* `node_modules/@capacitor/ios/…/CAPBridgeViewController.swift:125` — the iOS
  webview is configured with no user-action requirement for playback (§2.4).
* `playwright-core/lib/server/chromium/chromiumSwitches.js` — no autoplay switch
  is passed by Playwright; §2.1's behaviour is Chromium's own.

### 7.3 What I did NOT measure — hand these to the skeptic

* **Whether iOS actually has no gate.** §2.4 is a source read plus a belief
  about WebKit. It needs a device.
* **How long the silence would last in practice** on a gateless build. The floor
  is the establishing shot (2.2-3.6s of damped movement, `COPY.introLen`, §3.1 Option 1), the
  ceiling is "whenever the child first touches", and no bot can produce the
  distribution. This is the single number Option 2 turns on and it can only come
  from a playtest.
* **The other two `voidAutoPlay` writers** — the season ribbon (`:5957`) and
  "TAKE ME THERE →" (`:5003`). I read them; I did not walk them. They call the
  same two lines as the world card, so the gate must follow, but that is
  inference and it is labelled as such.
* **Whether the modal fires on a world OTHER than maple.** §6 measures it on
  maple, because `launchWorld()` is world-agnostic at `:5699`. The owner saw it
  "at the next level"; the code says it is the first *menu* launch, whichever
  world that is. Same inference, same label.
* **The `.catch`-less race in §1.4.** A hazard, not a defect. I did not make it
  fire and I am not claiming it has.

### 7.4 A probe bug worth recording, because it produced a convincing lie

The first version of `qa/tapgate.mjs` carried
`localStorage.removeItem('voidAutoPlay')` in its `addInitScript`. Init scripts
run on **every** document, including the one the world switch navigates to — so
it deleted the flag the switch had just written, the reloaded page took the
normal boot path, and the probe reported *no gate and no match*: a result that
looked like a different bug entirely and was measuring a journey no player
takes. `qa/tutstrand.mjs` already guards against this class with a
`voidSeeded` sentinel; the fix here was simply to stop clearing the flag.
**This is the fourth item on the trap list in the brief and it cost this crew a
run.**

### 7.5 …and a second one, which is the swiftshader clock trap wearing a hat

`qa/mapleintro.mjs` first ran with a 180-second wall cap on its match-clock
wait, which every other probe in `qa/` would consider generous. It reported:

```
FAIL  1 control  fresh profile, hand appears   hand at match t=nulls, reached t=1.5s
```

The control failing looks like a broken probe, and the temptation is to conclude
the hand does not work at all. It was neither. **The match clock had reached
`t = 1.5s` after 180 seconds of wall** — about 120x slower than real time, well
outside the 14-40x this repo normally quotes, because three live islands were
being rendered in sequence on a busy machine. MAPLE's establishing shot is 2.2s
long and the hand cannot appear until it ends, so the probe had stopped watching
*before the thing it was watching for was due*.

Two changes fixed it, and both are in the shipped probe: the cap went to 900
seconds with an early exit the moment the hand is seen, and the device scale
factor dropped from 2 to 1 (a quarter of the pixels, no effect at all on a DOM
visibility test). The lesson is the brief's own rule stated more sharply: *a
wall-clock cap on a match-clock wait is itself a measurement of the renderer*,
and when it expires it produces a failure that reads exactly like a defect.

A third, smaller one: `page.screenshot()` on a live 3D scene under swiftshader
blew past Playwright's 30-second default and took the whole run down with it,
losing three completed checks that had not been printed yet. The probe now
prints each result as it lands and treats screenshots as best-effort.

### 7.6 Method note on §1.3

`#menu`'s extent (`index.html:1790-1831`) was resolved by counting `<div`
against `</div>` from the opening tag, not by eye, and `#btnPlay` (`:1819`),
`.navRow` (`:1823`) and `#btnSettings` (`:1829`) were each tested for
containment in that range. All three are inside.

---

## 8. LANDING ORDER

1. `qa/tapgate.mjs`, `qa/gatecarry.mjs` and `qa/mapleintro.mjs`, **failing**,
   committed first — the failing run is the evidence (standing rule 2).
   `qa/gatecarry.mjs` is the odd one out: it is not a pass/fail gate, it is the
   measurement that makes the §3 decision arguable at all, and it should be run
   and re-read whenever the audio flow is touched.
2. §4.5, the modal deletion. It is a pure subtraction, it removes the third tap,
   and it takes `qa/tutstrand.mjs`'s whole failure mode out of existence.
3. §4.3, the hand on Maple, narrow variant. Ask the owner about the widening
   switch before choosing it for him.
4. §3.1 Option 2, the gate deletion. Last, because it is the one with a trade in
   it, and because the skeptic may want the playtest number in §7.3 first.
5. Filed, not landed: Option 4 (same-document world switch), the iOS device
   check, and the `.catch` in §1.4.

**One thing the governor should refuse.** If the skeptic softens Option 2 into
"restyle the gate" — a nicer pill, a friendlier word, an auto-dismiss after N
seconds — that is the answer the brief explicitly forbids: a "remove this"
answered with a "restyle this". Either the second tap goes or it stays for a
reason we can state; there is no third thing worth building.
