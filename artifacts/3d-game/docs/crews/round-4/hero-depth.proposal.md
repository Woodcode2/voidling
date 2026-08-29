# HERO DEPTH — what DEPTH means for the void

Character lead, round 4, 2026-08-29. Written against the owner's answer to the
cast review: *"Ok I agree with your recommended. Could we deepen the hero as
well?"*

Read first: `docs/OWNER-2026-08-29.md`, `docs/crews/round-4/void-cast.verdict.md`
(built on, not re-litigated), `docs/GOVERNOR.md` including the HANDS OFF list.
Read in full: `src/proto3d/void3d.ts` (2,466 lines — the rig), the mood
resolver and the three event handlers in `src/prototype3d.ts`, and the charge
and bite dispatch in `src/proto3d/rivals.ts`.

**Everything below is either a source line I can quote or a frame I shot. The
two pixel metrics I built are RETRACTED in §2.3, in place, before anyone uses
them.**

---

## 0. THE ANSWER, IN ONE PARAGRAPH

He is not shallow. He has eight authored faces, a wrapped feature rig, form
light on every feature, a graded bite, a jelly body, a mass-scaled idle, a
direction-flip wind-up and an evolution pop that anticipates before it lands.
What he does not have is **timing**. His face is not missing; it is
*uncorrelated*. Measured over 70 match seconds he wears the fear face 26.9% of
the time — and wore it for neither of the two moments the game stopped to warn
him something was about to eat him. He loses a whole form, the game holds that
loss for six seconds in two separate places, and his face knows about it for
1.3. He climbs back out of it four seconds later wearing the widest grin in the
table, which is the same face he was wearing when he lost it. **Depth here is
not more expression. It is the expressions he already has — all eight of them
authored, several of them approved by name — wired to the moments they belong
to.** That is why both proposals below cost zero triangles, zero
draw calls and zero new per-frame work: nothing is added to the rig, three
numbers are added to the game's own clock.

**Two proposals, not three, on purpose.** I had six candidates and I killed
four of them with numbers rather than with taste (§5) — including the two ideas
I liked most, because one is blocked behind an unresolved ledger item and the
other is behind the HANDS OFF line. Both survivors are measured, both fail a
probe today, and both reuse a face the owner has already looked at and approved.

The three numbers, in full:

| | today | proposed | what it is |
|---|---|---|---|
| the charge | no face at all | `dreadUntil = tClock + 1.2` | he flinches during the 0.85 s wind-up instead of after the lunge |
| the level loss | `0.9` s of face (`1.3` from the bully) | `2.6` s on a form bite | the face asks what it cost, like every other channel already does |
| getting it back | nothing | `smugUntil = tClock + 2.4` | the arc closes on his face, where the soundtrack already closes it |

---

## 1. WHAT I DID

- Read `void3d.ts` end to end: the shared body shader, the wrap, the eyes, the
  mouth pair, the maw, the brows, the Zs, the mood table, the moods' lerp, the
  costume LOD, the hat rig, the accessory factory.
- Read the three places the character is *driven* from `prototype3d.ts`: the
  mood resolver (`:8969-8991`), `onPlayerBitten` (`:2499-2585`), `onCharge` /
  `onNotice` / `onSurge` / `onRivalEaten`, and the evolution beat (`:9403-9470`).
- **Photographed all eight moods** on the shipped canvas at play size — Maple,
  430×932 @ DPR 2, one match second, mouth pinned shut so the free-running gape
  could not move the picture, the camera's follow lerp allowed to settle first.
  Contact sheet committed beside this file:
  **`docs/crews/round-4/hero-depth-moodsheet.png`** (recipe and probe in §2.1
  and appendix A). On-screen radius **58–62 css px** across the eight frames, a
  6.9% spread — the same magnification, so the frames are comparable to each
  other.
- **Ran a mood census** on a driven match (the child driver `qa/rivalnotice.mjs`
  uses), sampling `__faceState()` and `__matchState()` every rendered frame on
  the MATCH clock.
- Ran the census a second time instrumented to record, for every charge, the
  distance to the charging hunter and the face worn for the next two match
  seconds — and to force one demotion through the real handler and watch what
  the face does for the fourteen seconds after it.

Preview on :4177 was up throughout and `dist/` was newer than `src/` at every
shot. No tracked source was edited by me.

**One thing about the tree, recorded because a later reader will not be able to
tell.** `git status` was clean when I started and is not now: another round-4
crew is landing the family's ring-colour work and has `src/proto3d/rivals.ts`
modified in the working tree (+117 lines), plus `qa/ringmeaning.mjs` and
`docs/crews/round-4/family-fix.landing.md`. **All my `rivals.ts` line numbers
below are from HEAD, not from the dirty tree**, and I diffed their change before
citing anything: their hunks are at 89–587 (names, skins, ring colours) and the
charge state machine and the bite dispatch are byte-identical. My frames were
shot against a `dist/` built before their edit, which cannot move the mood
resolver, the charge gate or the demotion path. Nothing in this proposal touches
a line they touched.

---

## 2. HOW HE READS TODAY — the one-frame test, run

### 2.1 The photograph

**`docs/crews/round-4/hero-depth-moodsheet.png`** — eight moods, one match
second, mouth pinned shut, HUD hidden, cropped offline so a drifting camera
cannot outrun the clip. Reading order: **cruise, hungry, frenzy, victory** on the
top row; **scared, hurt, smug, sleepy** underneath. Probe in appendix A.

What it shows:

- **Row two is four characters.** `scared` is wide pale eyes, a shrunk grey
  pupil, angled brows, a sweat drop and a tiny frown. `hurt` is a heavy angry
  brow, a squint, a sweat drop and an open frown. `sleepy` is two closed dark
  lines, level brows and rising Zs. `smug` is a lopsided grin. You can name all
  four from a frozen frame. **The owner is right about the fear face — it is
  the best thing in the set, and nothing in this proposal touches it.**
- **Row one is one character with the mouth on a dimmer.** cruise → hungry →
  frenzy → victory adds brows, then widens the grin, then widens it again. The
  eyes are the same eyes, the blush is the same blush, the brows are the same
  flat brows at 0.85 opacity in three of the four.

That is the honest verdict on the one-frame test: **he has four distinct faces
and one happy face wearing four different amounts of smile.**

The table agrees, and this part is a source read, not a picture
(`void3d.ts` MOODS): `frenzy` and `victory` differ by ≤0.08 on every parameter
they both set (smile 1.42/1.50, maw 0.12/0.18, blush 0.85/0.90, browAng
0.18/0.20, wide 1.05/1.06, pupil identical). They are one row entered twice.

### 2.2 The census — which of the eight a match actually reaches

Two runs, Maple, driven, sampled every rendered frame on the match clock. The
second is instrumented to record, for every charge, the hunter's distance at the
instant `rivalEv.charges` ticks, against the fear gate's own reach recomputed
from the live rival list — with both gates parsed out of the real source and a
throw if either call site has moved (governor rule 4).

```
── MAPLE — 70.0 match seconds, 1591 frames, final r 4.4
   frenzy     66.8%   46.7s
   scared     26.9%   18.8s
   smug        3.3%    2.3s
   hurt        1.8%    1.3s
   hungry      1.2%    0.8s
   cruise      0.1%    0.1s
   NEVER SEEN: sleepy, victory
   scared PROXIMITY GATE open on 28.8% of frames

── CHARGES: 2
   t=19.0s  hunter r 2.7 at 44u; scared needs < 20u  ->  face in the next 2s: frenzy
   t=53.7s  hunter r 5.8 at 28u; scared needs < 26u  ->  face in the next 2s: frenzy,scared
```

(A first 45-second run agreed: frenzy 69.7%, scared 29.7%, hungry 0.4%, cruise
0.1%, one charge, zero `scared` frames after it.)

Three readings.

**The caveat first, because it is large.** The driver hoovers continuously, so
`combo >= 5` is near-permanent and `frenzy` — which sits above `hungry` in the
resolver's ladder — shadows everything under it. A real six-year-old is not that
efficient and would sit in `hungry` far more. **The 66.8% is an artefact of the
driver and I have built nothing on it.** `sleepy` and `victory` are absent for
good reasons too: the driver never lifts its thumb, and the match did not end.

**`hurt` is 1.3 seconds out of seventy.** One hunter bite, held for the 1.3 the
source sets (`:2511`) and then gone. That is proposal two.

**And the charge is the finding.** Both charges fired with the hero's face on
`frenzy` — a wide delighted grin — at the exact instant the game rang the
alert, flashed the screen red, buzzed the phone and played the hero's own
*scared* voice line. The first fired from **44 units against a fear gate that
opens at 20**, and the face never became frightened at all in the two match
seconds that followed. The second fired from 28 against a gate at 26 — two units
outside — and the fear arrived only after she had already closed the distance,
i.e. after the telegraph it was supposed to be part of. That is §3.

### 2.3 TWO METRICS I BUILT AND AM RETRACTING BEFORE ANYONE USES THEM

Governor rule 3b. Both are recorded with their numbers so nobody re-derives
them and believes them.

1. **Mean |ΔL\*| over the hero's disc, mood against mood.** Resampled to a fixed
   160×160 grid spanning ±0.92 of each frame's own measured radius, in CIE L\*.
   It produced a clean-looking ordering — frenzy/victory 2.03, cruise/hungry
   3.59, against scared-versus-anything 10.75–14.73. **It is junk**, because I
   could not produce a null. Eight frames of ONE mood, shot the same way, scored
   a *median pair distance of 12.16 and a max of 23.14* — larger than the entire
   mood signal. The number is dominated by the body shader's animated interior
   (a drifting nebula, a spinning three-shell galaxy, a jelly wobble), not by
   the face.
2. **Feature coverage** — the share of the disc that is eye-white, mouth-pink or
   feature ink, as a 3-vector, L1 distance between moods. Same fate: the null
   ran 0.38 to 14.75 against a mood signal of 0.15 to 12.91.

**And the reason the null failed is itself worth keeping, because it will bite
the next probe that photographs this character.** I pinned the radius with
`__setVoidR(6)` and re-pinned it before every shot; the measured radius held at
6.00–6.09 across eight frames — and the hero's **on-screen** radius still ran
58 → 227 → 63 css px. The camera's follow distance does not settle under the
software renderer; it wanders by a factor of four at a fixed world radius. So
two frames of this hero are two different magnifications unless you check, and
the caricature LOD (`small`, which fattens the eye outline, grows the eye by up
to 18% and the costume by 42%) genuinely changes the face as it swings.
**Anything that compares two frames of the void must report the on-screen radius
of both.** My §2.1 sheet does, which is why I trust the sheet and not the
metrics: 58–62 px across all eight.

I also tried and **abandoned** a third claim: that `hurt` and `sleepy` read as
the same face. Both retracted metrics said they were the closest pair in the
set (4.60 and 0.15). I went to the photograph to write the patch and the
photograph refuted me — an angry angled brow over a squint with a sweat drop is
not a nap, and it does not look like one at 58 px. **The metric was wrong and
the picture was right** — a pattern this repo's ledger already records more than
once (round 2 #3, "the board's eye beat my arithmetic"; retraction 8, "a probe
that passes and a frame that fails are measuring different things"; and the cast
verdict's own two retracted shape metrics). No proposal was built on it.

---

## 3. PROPOSAL ONE — HE NEVER SEES IT COMING

*Anticipation. The single cheapest thing that reads as intelligence, and this
character has none of it aimed at the one thing that can hurt him.*

### 3.1 The defect

Two gates, in two files, and they do not overlap.

**The charge fires from up to 95 units away** (`src/proto3d/rivals.ts:1375`, at HEAD):

```
            if (rv.ctim <= 0 && dp < 95 && dp > rv.r * 0.9) {
              rv.cst = 1; rv.ctim = 0.85; rv.missPend = false;
              api.onCharge?.(rv.name, rv.x, rv.z);
```

`rv.ctim = 0.85` is the wind-up: 0.85 match-seconds of pure telegraph before
the lunge, which is the entire reason the charge has a cue at all.

**The fear face can only fire from inside about a third of that**
(`src/prototype3d.ts:8975`):

```
      if (rv.r > R2 * 1.15 && Math.hypot(rv.x - voidState.x, rv.z - voidState.z) < R2 + rv.r + 16) { scared = true; break; }
```

During the hunt the bully runs at ~1.5× the player (`rivals.ts`, the hunt
window's own note), so that reach is `R + 1.5R + 16` = **21 units at R=2, 28.5
at R=5, 41 at R=10** — arithmetic off the two source lines, flagged as
arithmetic. Against a charge that fires at up to 95.

So the mood resolver's only route to fear is *"it is already on top of me."*
There is no route at all to *"it is coming."*

**Measured, on the shipped build** (§2.2, and this is not arithmetic):

| charge | hunter | fired at | fear gate opens at | face for the next 2s |
|---|---|---|---|---|
| t = 19.0 s | r 2.7 | **44 u** | **20 u** | `frenzy`, the whole beat |
| t = 53.7 s | r 5.8 | **28 u** | **26 u** | `frenzy`, then `scared` once she had closed |

Two charges, two grins. The first is the pure case: the telegraph fires at 2.2×
the distance at which his face is allowed to know about it, and he never becomes
frightened at all. The second fires two units outside the gate, so the fear
arrives *after* the wind-up it was meant to be part of.

**And here is the part that makes this a wiring defect rather than a missing
feature.** In the same 70 seconds the hero wore the fear face for **26.9% of the
match**, with the proximity gate open on 28.8% of frames. He is not
under-frightened. He is frightened for a quarter of every match **by standing
near anything larger**, and not frightened at all in the two moments the game
stops to tell him something is about to eat him. The cue is not scarce; it is
uncorrelated. Wiring it to the charge is what makes the 26.9% mean something,
and it is also why the probe below needs a tight band at the top: a fear face
that already occupies a quarter of a children's game has no headroom to spend.

**And every other channel already fires on the wind-up.** `prototype3d.ts:2590`:

```
rivals.onCharge = (name, x, z) => {
  rivalEv.charges++;
  ...
  fx.ring(x, z, 0xff2b3c, 26, 0.6); fx.flash('rgba(255,43,60,0.16)', 0.35);
  audio.alert(); audio.voice('scared'); buzz(35);
};
```

A red ring in the world, a red wash across the screen, an alert sting, a 35 ms
rumble — **and `audio.voice('scared')`, the hero's own frightened gasp.** The
game already says he is frightened, out loud, in his own voice, while his face
grins.

### 3.2 Why this is the owner's own work order

`docs/GOVERNOR.md`, HANDS OFF:

> **The fear face is approved.** `MOODS.scared` in `void3d.ts` … The owner,
> shown it, said: "I like when the void gets nervous. That face is solid."
> **What he wanted changed was who triggers it**, not how it looks. Do not
> touch the eyes.

This proposal changes exactly and only who triggers it. `MOODS.scared` is not
edited. No eye is touched.

### 3.3 The patch — three hunks, `src/prototype3d.ts`

**HUNK 1a** — the clock. Anchor `:2487`, verified on disk.

BEFORE (verbatim):
```ts
let hungryT = -99, hurtUntil = 0, smugUntil = 0, prevMood: Mood = 'cruise';
```

AFTER:
```ts
let hungryT = -99, hurtUntil = 0, smugUntil = 0, prevMood: Mood = 'cruise';
// ── THE FACE HAS TO ARRIVE BEFORE THE THING IT IS AFRAID OF ────────────────
// tClock until which the hero wears the approved fear face because something is
// COMING, rather than because something is already on top of him. The mood
// resolver's only route to `scared` is a proximity test — R + rv.r + 16, which
// is 28.5 units at r=5 against a hunter running 1.5x — and the bully's charge
// fires at up to 95 (rivals.ts, the `dp < 95` gate). So the 0.85s wind-up, the
// one window the whole telegraph exists for, was the one window his face was
// not in: the alert rang, the screen flashed red, the phone buzzed and his own
// scared voice line played, over a grin.
//
// Nothing here changes MOODS.scared. The governor's HANDS OFF entry records
// the owner on that face — "I like when the void gets nervous. That face is
// solid" — and records that what he wanted changed was WHO TRIGGERS IT. This
// is that, and only that.
let dreadUntil = 0;
```

**HUNK 1b** — set it. Anchor `:2590-2598`, verified on disk.

BEFORE (verbatim):
```ts
rivals.onCharge = (name, x, z) => {
  rivalEv.charges++;
  // The telegraph belongs IN THE WORLD, not across the HUD. A red ring under
  // her, a red pulse on the screen edge, an alert sting and a rumble say
  // "something is coming at you" without a banner — and the banner was firing
  // often enough to read as the game shouting the same sentence all match.
  fx.ring(x, z, 0xff2b3c, 26, 0.6); fx.flash('rgba(255,43,60,0.16)', 0.35);
  audio.alert(); audio.voice('scared'); buzz(35);
};
```

AFTER:
```ts
rivals.onCharge = (name, x, z) => {
  rivalEv.charges++;
  // The telegraph belongs IN THE WORLD, not across the HUD. A red ring under
  // her, a red pulse on the screen edge, an alert sting and a rumble say
  // "something is coming at you" without a banner — and the banner was firing
  // often enough to read as the game shouting the same sentence all match.
  fx.ring(x, z, 0xff2b3c, 26, 0.6); fx.flash('rgba(255,43,60,0.16)', 0.35);
  // …AND THE HERO IS THE CHANNEL THAT WAS MISSING FROM HIS OWN TELEGRAPH.
  // 1.2s covers the 0.85s wind-up (rivals.ts, `rv.ctim = 0.85`) with enough
  // margin that the fear cannot lapse in the frame the lunge starts; from
  // there the proximity test above has her and takes over. It is a starting
  // value, not a measured one — qa/heroflinch.mjs's rate band is what sets it.
  dreadUntil = tClock + 1.2;
  // audio.voice('scared') used to be on the line below, and it is not deleted
  // so much as MOVED: the mood resolver already fires exactly that line on the
  // transition into `scared`, so with the face wired up this call is the same
  // gasp twice in one frame. In the common case the audio is bit-identical; in
  // the case where he was ALREADY frightened, the game now plays one gasp
  // instead of two.
  audio.alert(); buzz(35);
};
```

**HUNK 1c** — read it. Anchor `:8979`, verified on disk.

BEFORE (verbatim):
```ts
    else if (scared) mood = 'scared';
```

AFTER:
```ts
    else if (scared || tClock < dreadUntil) mood = 'scared';
```

The ladder above it is unchanged, so `hurt` and the outro still outrank fear —
a child who has just been bitten does not flinch at the thing that already
bit him.

### 3.4 The probe — `qa/heroflinch.mjs`, and it FAILS today

It must fail in two directions, exactly like `qa/rivalnotice.mjs`, because so
can this change: too little and nothing happened, too much and a six-year-old
is being frightened continuously in a game that must never frighten.

```
COVERAGE   for every charge, was `scared` worn inside the following 1.2 match
           seconds — TIMESTAMPED, not merely present in a window?   BAR: 100%.
           TODAY: charge 1 fails outright (no `scared` anywhere in 2.0s).
           Charge 2 reached `scared` inside 2.0s but my probe recorded the set
           of moods, not when each arrived, so it cannot be credited against a
           1.2s bar. THE LANDING PROBE MUST TIMESTAMP — that is the one thing
           my version got wrong and it is why I am reporting 0 of 2 rather
           than 1 of 2.
RATE       total share of match time in `scared`.
           TODAY (the null, and it is already recorded): 26.9% over 70 match
           seconds on Maple, 29.7% over 45. BAND: the post-patch run must not
           exceed the pre-patch run by more than 3 percentage points, which is
           roughly double the 1.3-2.0% the charge arithmetic predicts. The
           null is the run above, not a runtime switch — `dreadUntil` is a
           module-local, so an A/B here means two builds, and the pre-patch
           numbers are already in this file so the first one is free.
GATES      both gates parsed out of the real source and thrown on if either
           call site has moved (governor rule 4) — the `dp < 95` charge gate in
           rivals.ts and the `R2 * 1.15 … + 16` proximity gate in
           prototype3d.ts. A probe that carries a copy of either is describing
           the build it was written against. (Appendix A.2 already does this
           and the parse is working.)
```

**A photograph goes with it**, because a rate is not a face: shoot the canvas at
`dreadUntil` + 0.4s and at `dreadUntil` + 0.4s with the hunk reverted, same
seed, same match second, both frames reporting their on-screen radius (§2.3).
Two frames, side by side, is the whole argument.

### 3.5 The cost

| | |
|---|---|
| triangles | **0** |
| draw calls | **0** |
| new meshes, textures, materials | **0** |
| new per-frame work | one `number` compare in a branch that already runs |
| new state | one `let` |
| seeded draws (`mrnd`/`mr`/`mpick`/`mchance`) | **0** — nothing in these files touches Maple's stream |
| audio | one call removed, none added |
| how often it fires | the charge cycle is `rand(21,34)` + 0.85 + 2.6 + 1.7 ≈ 26–39 match seconds, inside a hunt window of 55% of a 180 s match — so **2–3 charges a match, 2.4–3.6 seconds of extra fear face out of 180**, or 1.3–2.0%. The census saw exactly 2 charges in 70 match seconds, which agrees. Arithmetic off `rivals.ts` and `MATCH_LEN`, flagged as arithmetic; the probe's rate band is what settles it. |

---

## 4. PROPOSAL TWO — THE LEVEL LOSS HAS NO FACE, AND GETTING IT BACK HAS NONE EITHER

*Consequence. The surge landed this week and gave this game a real level loss.
Every system in the repo treats it as a six-second event. His face treats it as
nine tenths of one, and then grins.*

### 4.1 The defect, at the losing end

`src/prototype3d.ts:2509-2511`, three consecutive lines:

```ts
  biteMercy = tClock + (hit.form ? 6.0 : 2.5);
  rivalEv.bites++; if (hit.hunter) rivalEv.hunterBites++; rivalEv.stolen += hit.steal;
  hurtUntil = tClock + (hit.hunter ? 1.3 : 0.9); audio.voice('hurt');
```

Look at what the two ternaries ask. The mercy window asks **what did it cost**
(`hit.form`). The face asks **who bit** (`hit.hunter`). And twenty-five lines
below, the hold asks the first question again — `demoteHold = tClock + 6`
(`:2546`), six match seconds during which the score floor may not undo the form
loss.

So the game says *six seconds* twice and the face says *one*.

**And it is worse than 1.3, because of which branch a form bite actually takes.**
`rivals.ts:1589` defines `const heavyBite = isHunter && hunting`, and `:1614`
dispatches (both at HEAD):

```ts
          api.onPlayerBitten?.(rv.name, { shrink: 0.85, steal, hunter: heavyBite, form: !(isHunter && !hunting) });
```

`hit.hunter` is true only for the bully *while she is hunting*. A **surged
sibling** — owner decision 2, the newest and most carefully designed setback in
the game, the one whose whole promise is "if they're larger you go and consume
and come back" — takes a whole form off the player and passes `hunter: false`.
**Nine tenths of a second of face, the same as the legacy QA-only percentage
nibble.**

What fills the other 5.1 seconds of the hold? Whatever he was wearing before.
`hungryT` is re-armed by the magnet loop whenever anything edible sits inside
85% of the well (`:9212`) and in a town it never lapses, and `frenzy` sits above
it in the ladder — so within about a second of losing a level he is back to a
grin. **Measured in the census: `hurt` occupied 1.3 seconds of a 70-second run —
one bite, held for about the 1.3 the source sets — against `frenzy` at 46.7
seconds.** And in the forced demotion in §4.4 the flip back to `frenzy` is
timestamped at **+1.16 s**.

### 4.2 The defect, at the winning end — and the file already knows

`src/prototype3d.ts:9405-9409` and `:9461-9464`:

```ts
  if (ns > curStage) {
    curStage = ns;
    // Recovering to a form you have already reached is not an evolution. See
    // bestStage above — everything below this line is ceremony.
    if (ns > bestStage) {
        ...
    }
    // …but the SOUNDTRACK follows the form itself, not the ceremony. A child
    // who is demoted and climbs back should hear the music come back with
    // them; only the congratulations are once-per-match.
    audio.setMusicStage(VISUAL_STAGE[curStage] ?? 4);
  }
```

Somebody has already had this exact thought and acted on it — *"a child who is
demoted and climbs back should hear the music come back with them"* — and they
gave the moment to the **soundtrack**, correctly refusing it the EVOLVED card,
the ring, the shake, the coins and the ceremony counter. What nobody gave it is
the one channel a six-year-old reads first. The hero climbs back out of the
hole he was knocked into and his face does not change.

That is the whole arc as it ships, and §4.4 has it frame by frame: **bitten →
about a second of pain → the widest grin in the table → four seconds later the
form comes back, still wearing that grin, while the music quietly changes
underneath.** A character who loses something and is visibly unbothered has not
lost anything.

### 4.3 The patch — two hunks, `src/prototype3d.ts`

**HUNK 2a** — the face is keyed to the cost, not the biter. Anchor `:2511`,
verified on disk.

BEFORE (verbatim):
```ts
  hurtUntil = tClock + (hit.hunter ? 1.3 : 0.9); audio.voice('hurt');
```

AFTER:
```ts
  // ── THE FACE IS KEYED TO THE COST NOW, NOT TO WHO BIT ────────────────────
  // This asked `hit.hunter` — WHICH VOID — while the line two above it asks
  // `hit.form` — WHAT IT COST — and demoteHold below asks the same question
  // again. So the game holds a form loss for six match seconds in two places
  // and held the hero's face for nine tenths of one. And 0.9 is the branch a
  // SURGED sibling takes: rivals.ts passes `hunter: isHunter && hunting`, so
  // owner decision 2's entire setback — a sibling grows past you and takes a
  // level — got the shortest face in the table, the same one the legacy
  // percentage nibble gets.
  //
  // 2.6 is not a new number. `smug` runs 2.4 seconds for the best thing that
  // happens in a match (see onRivalEaten), so the worst thing gets one beat of
  // face on the same scale. It is deliberately far short of the six-second
  // hold: six seconds of a pained face is a punishment in a game for
  // six-year-olds, and the mercy window means nothing can reach him meanwhile
  // anyway. A starting value; qa/demoteface.mjs is what sets it.
  hurtUntil = tClock + (hit.form ? 2.6 : hit.hunter ? 1.3 : 0.9); audio.voice('hurt');
```

**HUNK 2b** — the recovery. Anchor `:9405-9409`, verified on disk.

BEFORE (verbatim):
```ts
  if (ns > curStage) {
    curStage = ns;
    // Recovering to a form you have already reached is not an evolution. See
    // bestStage above — everything below this line is ceremony.
    if (ns > bestStage) {
```

AFTER:
```ts
  if (ns > curStage) {
    // ── CLIMBING BACK IS NOT AN EVOLUTION, AND IT IS NOT NOTHING EITHER ────
    // The soundtrack already knows: the setMusicStage at the bottom of this
    // block fires on every form change, with the note "a child who is demoted
    // and climbs back should hear the music come back with them; only the
    // congratulations are once-per-match." Everything else in the block is
    // gated on `ns > bestStage`, so the one channel a six-year-old reads first
    // — his face — was silent at BOTH ends of the game's biggest swing.
    //
    // `ns <= bestStage` is exactly "a form I have already reached this match",
    // which can only be true after a demotion: curStage is walked back in one
    // place in this file (onPlayerBitten) and reset in one other (a new match).
    // Read before `bestStage = ns` below, on purpose.
    //
    // NO CEREMONY, deliberately: no card, no ring, no shake, no coins, no
    // evolveCeremonies++ (qa/evolveonce.mjs gates that and must stay green).
    // Just the face he already wears when he wins something — smugUntil is
    // onRivalEaten's own 2.4s clock and the mood resolver already reads it. The
    // arc closes on the character instead of on the HUD, which is the surface
    // the owner spent item 2 of his note asking us to empty.
    if (ns <= bestStage) smugUntil = tClock + 2.4;
    curStage = ns;
    // Recovering to a form you have already reached is not an evolution. See
    // bestStage above — everything below this line is ceremony.
    if (ns > bestStage) {
```

Nothing else moves. `bestStage`, `evolveCeremonies`, the ceremony block, the
music line and `voidling.setStage` are untouched, so `qa/evolveonce.mjs` — which
exists precisely to stop a recovery being congratulated as an evolution — stays
green by construction: the ceremony branch it gates is not entered.

`smugUntil` is written in exactly one other place (`:2452`, onRivalEaten) and
read in exactly one place (the mood resolver, `:8980`). The resolver's
transition audio fires `voice('happy')` only for `frenzy` and `victory`, so this
adds no sound.

### 4.4 The probe — `qa/demoteface.mjs`, and it FAILS today

Everything it needs is already exposed and already used by other probes:
`__bite(true)` runs a real form bite through the real handler
(`prototype3d.ts:1828`, the hook `qa/evolveonce.mjs` uses), `__stages()` reports
`{cur, best, ceremonies}`, and `__faceState()` reports the mood.

```
1. play in to a form above VOIDLING with the child driver
2. record __stages()
3. __bite(true)
4. sample __faceState().mood and __stages().cur every frame for 14 MATCH
   seconds (qa/_clockrate.mjs — a wall-clock wait samples under a second of it)

BAR A  hurt is held for >= 2.0 match seconds.
       TODAY: 1.3 for the bully, 0.9 for everyone else. FAILS.
BAR B  the frame in which __stages().cur climbs back is inside a window in
       which the mood is 'smug'.
       TODAY: `smug` is never set by any recovery path. FAILS, always.
BAR C  __stages().ceremonies is unchanged across the whole window.
       TODAY passes and must keep passing — this is the invariant
       qa/evolveonce.mjs owns and the one thing this patch could break.
```

**I ran steps 1–4 against the shipped build and it fails on A and B.** Maple, a
CHOMPOSAURUS (form 3) driven in and then bitten through the real handler:

```
── THE DEMOTION
   stages before {"cur":3,"best":3,"ceremonies":3}   after 14s {"cur":3,"best":3,"ceremonies":3}
   + 0.05s  mood hurt     form 2
   + 1.16s  mood frenzy   form 2
   hurt held for 1.06s of match clock
   forms seen during the window: 2 -> 3
   climbed back at +5.09s wearing 'frenzy'
```

Read that last line slowly. **He lost a whole form and got it back four seconds
later, and at the instant it came back his face was `frenzy` — the widest,
happiest grin in the table — which is also the face he was wearing one second
after he lost it, and the face he was wearing before any of it happened.** One
second of pain in a fourteen-second arc; the other thirteen are one expression.

BAR C passes today (`ceremonies` 3 → 3) and hunk 2b does not enter the branch
that moves it, which is the whole reason it is written outside `ns > bestStage`.

*Caveat on the 1.06:* the probe samples `__matchState().t`, which is
`matchElapsed()`, while `hurtUntil` is compared against `tClock`. The two are
not guaranteed to be the same clock, so read the 1.06 as "about a second,
consistent with the 1.3 the source sets" rather than as a measurement of that
constant. The landing probe should read the clock the code reads.

### 4.5 The cost

| | |
|---|---|
| triangles | **0** |
| draw calls | **0** |
| new meshes, textures, materials, moods | **0** — both faces already exist and are already tuned by the owner |
| new per-frame work | **0** — `smugUntil` is already compared every frame |
| new state | **0** — two existing variables, written from one more place each |
| seeded draws | **0** |
| audio | none added |
| how often it fires | bounded by the form bite's own 12-second per-rival cooldown and the global 6-second mercy; a match with no bites sees neither half |

---

## 5. WHAT I REJECTED, AND WHY

A proposal with no rejections was not designed. Eight, roughly in the order I
gave them up.

**1. A ninth mood for the level loss.** The obvious move, and it costs nothing
at runtime — a `Mood` union member and a `Partial<typeof mp>` row; the lerp
already walks every parameter every frame regardless of how many rows exist.
Rejected on §2.1: the happy half of an eight-row table is already one face
wearing four amounts of smile, and answering "he has no face for this" by adding
a ninth row to that table is how a character ends up busier. Reusing `hurt` for
longer and `smug` on the reclaim says the same thing with two faces the owner
has already looked at and approved. Governor rule 6 — the smallest fix that
removes the cause.

**2. Anticipating the MEAL.** This is the best pure-animation note in the rig
and I am not filing it. The magnet drags a prop through a quadratic well and
keels it over 43 degrees before it goes in (`prototype3d.ts:9207-9226`), and the
hero's jaw does not part until `capture()` — i.e. until the food is already
inside him. **He opens his mouth after he has swallowed.** The 45 ms wind-up in
`void3d.ts` is real but it starts on the capture frame, so it anticipates
nothing. The fix lives in `chomp()`, and the ledger says: *"Do not change the
retrigger without the owner — `chomp()` fires ~50× a match and its retrigger
rule already has one fix in it"* (round 2, #3b), while the gape's SHAPE is
recorded as reopened and unresolved (#3). Stacking an anticipation change on top
of two unlanded decisions about the same envelope makes all three unreviewable.
**Rejected on sequencing, not on merit — it is the best idea left and it belongs
immediately after the gape shape lands.**

**3. A face graded by the size of the meal — "an opinion about his lunch".**
Rejected on the repo's own rate measurement. The LANDMARK gate inside
`capture()` — the one that carries the hit-stop and the lens punch, and the only
gate in the file that already knows how big a meal was — was measured at **141
firings a minute** on Lantern before it was dialled down, and **19 a minute**
after (`prototype3d.ts`, the `qa/_kickrate.mjs` note). Nineteen a
minute is one every three seconds: any face hung on that gate is the default
face inside ten seconds, which is exactly the "one expression with decorations"
the brief warns about. And the meal's size already reaches the player through
four graded channels — the jaw (`chomp(bite)`, 0.47 → 1.00 of the opening), the
puff count (`3 + min(9, r × 2.2)`), the growth impulse, and the `yum` voice
above r=2. The face is the one channel where grading it costs legibility instead
of buying it.

**4. `onSurge` and `onNotice` should flinch too.** Rejected, and this is the
rejection that makes proposal one work. `onNotice` is held by
`qa/rivalnotice.mjs` to a band of 0.8–7 per minute — my own census saw 2 in 45
match seconds, i.e. 2.7/min — and its own design note says a child must read it
as *"that one saw me", not as an attack*. A flinch every twenty seconds is
weather, and the moment the look and the charge look alike the charge stops
meaning "dodge NOW". `onSurge` fires **once or twice a match** — the window is
`_t > matchLen * 0.55 && _t < matchLen * 0.72`, 30.6 seconds of a 180-second
match, one sibling at a time, with a 12–18 s hold (arithmetic off `rivals.ts`
and `MATCH_LEN`) — for a rival that **never pursues** and is usually off screen.
A face reacting to something the player cannot see is a face reacting to
nothing, and the surge already owns a full-screen card. Both would spend the
fear face on events it cannot help with, and proposal one only works because
the charge is rare.

**5. Idle life.** *"A character who does nothing when unattended is a prop."*
He is not one. `sleepy` fires 8 seconds after the last input and it is the most
carefully finished state in the table: a 0.44 s droop instead of the 0.16 s flick
fired more often (which read as fluttering, the opposite of tired); eyes
genuinely SHUT via the `shut` parameter, which hides the white and the pupil and
leaves the flattened dark backing disc — the line a closed cartoon eye is made
of — rather than the half-lidded stare that read as dazed; a gaze that settles
low and wanders slowly instead of scanning; and three hand-drawn Zs on a 512 px
canvas with a dark stroke, because the owner reported the emoji version as
*"hard to see"*. Every one of those is already an answer to this brief. My
census never reached it because a machine driver never lifts its thumb — a limit
of the probe, not of the character.

**6. Retuning the happy half of the mood table so the one-frame test passes.**
The finding I most wanted to fix, and the one I am most sure should not be
fixed this round. `frenzy` and `victory` are the same row entered twice; `hungry`
is `cruise` with brows. A designer separates them in an afternoon. But
`hungry`'s maw was retuned for the owner in `e1f3d20`, `smug` was rebuilt out of
his own sentence (*"when the void eats family he has this half asleep
reaction"*), and the gape shape is an open item. A sweep across the happy half
moves all of those at once, makes each unreviewable, and moves every store
screenshot. **It is taste, not a defect. One change at a time, a photograph each,
with the owner in the room, after the gape lands.**

**7. Pointing his eyes at what he is looking at.** The strongest idea I
discarded, and I discarded it on the HANDS OFF list rather than on merit. His
gaze is a pure function of his own velocity (`prototype3d.ts:9016-9021`), so he
never looks at the thing about to eat him and never looks at the thing about to
be eaten — his eyes have no attention, only momentum. Aiming the existing
`lookX`/`lookY` at the charger during a wind-up is perhaps six lines in the basis
that is already there, costs nothing, and would double proposal one's read. But
that code was rewritten in answer to the owner's *"when it gets big I feel like
symmetry is off with its face"*, and HANDS OFF ends **"Do not touch the eyes."**
I believe that entry is scoped to `MOODS.scared`'s appearance and would let this
through — and *"I read the hands-off entry narrowly"* is exactly the sentence
this repo's ledger exists to punish. **Not proposed. If the governor rules it
in, it is the cheapest depth left on the table after these two.**

**8. Anything that changes his silhouette or gives him a body part.** Out of
scope by the constraint, and settled by the cast verdict: radius IS the
safe/dangerous rule, and decorating the pole of a sphere buys nothing that
survives being small — four of five siblings turn back into the same ball at
32 px.

---

## 6. WHAT I FAILED TO ESTABLISH

Recorded because a proposal that hides its gaps is worth nothing.

- **Both pixel metrics are retracted** (§2.3), with their numbers, because I
  could not produce a null control. The one-frame verdict rests on the
  photograph and on the mood table, not on arithmetic.
- **The on-screen radius of this hero is not stable under the software renderer
  even at a pinned world radius** — 58 → 227 → 63 css px across eight frames at
  r = 6.00–6.09. I have no explanation beyond "the camera's follow distance does
  not settle", and I did not chase it. It is a measurement trap for anyone who
  photographs this character, and it is the reason §2.1's sheet reports its
  radii.
- **One world.** Maple only. The charge and bite behaviour lives in `rivals.ts`
  and is world-independent, but the mood distribution is not — Lantern's density
  and Powder's sparseness will move it, and the round-2 ledger records exactly
  that mistake being made on grin share.
- **The `frenzy` share (66.8% over 70s, 69.7% over 45s) is an artefact of the
  driver**, stated in §2.2 and worth repeating here: the driver hoovers continuously, `frenzy` outranks `hungry`,
  and a six-year-old is not that efficient. I built no proposal on it.
- **I did not photograph either fix**, because I did not land either patch. The
  "after" frames in §3.4 are a plan, not evidence.
- **The 26.9% is a finding I am not acting on and somebody should.** The fear
  face occupies a quarter of a match, fires on mere proximity to anything 1.15×
  larger, and correlates with nothing the player can act on. Both readings are
  worth an owner's attention on their own terms — *"it must never frighten"* is
  a constraint on this game, and a quarter of every match is a lot of nervous —
  and I did not pursue it because it is a balance question about the family's
  size caps, which the ledger already marks as an owner call ("he asked for 'any
  void that's larger' … not mine to move").
- **Neither patch has been typechecked or built.** They are written against
  anchors verified verbatim on disk this session, and the shapes are simple
  (`let dreadUntil = 0`, two ternaries, one guarded assignment), but nobody has
  run `npx tsc --noEmit` on them.
- **The reclaim can be earned or automatic, and the face cannot tell the
  difference.** `demoteHold` expires by itself after 6 match seconds and the
  score floor then hands the radius back in one frame, so a child who did
  nothing gets the same `smug` beat as one who ate their way out. That is
  already true of the soundtrack, which is the precedent hunk 2b follows, and I
  am not proposing to fix it — but it is a real limit of the patch and it should
  be the first thing anyone looks at in the landing frames.

---

## 7. SEQUENCING, AND WHY THESE TWO IN THIS ORDER

**Land proposal one first, alone.** It is three hunks in one file, it is the
owner's own recorded request ("what he wanted changed was who triggers it"), and
it is the only one whose failure mode is visible in a rate: if the fear face
turns into weather, the probe's band catches it in one run and the hunk reverts
in one line. Landing it alone also gives the second proposal a control — a match
recorded before and after, with nothing else moved.

**Then proposal two.** It touches the same file and the same mood ladder, so
landing them together would make the census unreadable: `scared` outranks
`smug`, and a run with both in it cannot separate a fear that arrived from a
triumph that did not.

**Then, in this order, the things I refused:** the gape shape (already open in
the ledger), then meal anticipation (rejection 2, which is blocked on the gape),
then the governor's ruling on the gaze (rejection 7), then — with the owner in
the room, not a board — the happy half of the mood table (rejection 6).

**What NOT to do with this document.** Neither patch buys anything if it lands
without its probe. Between them they add about seven seconds of face to a
three-minute match; the whole value is that those three seconds land on the right events, and
the only thing that can tell you whether they did is a run that counted before
and counted after. Governor rule 2: the failing run is the evidence.

---

## APPENDIX A — the two probes, in full

Neither is committed to `qa/`: this round's brief was to propose, not to land,
and a probe without its fix beside it rots. Both are pasted whole so whoever
lands a hunk can run the failing case first (governor rule 2) without
rebuilding them from the description.

### A.1 `moods8.mjs` + `crop.mjs` — the eight-mood sheet

```js
// ALL EIGHT MOODS at play size, from the CANVAS. Full-viewport shots, cropped
// offline. Waits for the on-screen radius to STOP MOVING before the first shot
// (the camera lerps its follow distance after __setVoidR, so rpx swings 63->264
// if you shoot straight away) and re-checks it after each.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '4177';
const TAG = process.argv[3] || 'now';
const R = Number(process.argv[4] || 6);
const OUT = `/tmp/claude-0/-home-user-voidling/2a240c97-4d5b-5823-ac36-95bed2f17b29/scratchpad/moods/${TAG}`;
const MOODS = ['cruise','hungry','frenzy','victory','scared','hurt','smug','sleepy'];

mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
await p.evaluate(() => document.getElementById('btnPlay').click());
await p.waitForSelector('#worldRow .wCard[data-world="maple"]', { state: 'visible', timeout: 400000 });
await p.evaluate(() => document.querySelector('#worldRow .wCard[data-world="maple"]').click());
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
await p.waitForTimeout(2500);
await p.addStyleTag({ content:
  '#timer,#board,#coins,#quests,#growth,#banner,#count,#news,#hungerlbl,#hunger,'
  + '#joy,#joyNub,#powers,#evolve,#guide,#hand,#btnQuit,.vb,.vf,.vbN{opacity:0 !important}' });

const probe = () => p.evaluate(() => {
  const THREE = window.__THREE, cam = window.__cam, g = window.__voidGroup();
  const c = new THREE.Vector3(); g.getWorldPosition(c);
  const q = c.clone().project(cam);
  const cx = (q.x * 0.5 + 0.5) * innerWidth, cy = (-q.y * 0.5 + 0.5) * innerHeight;
  const right = new THREE.Vector3(); cam.getWorldDirection(right);
  right.cross(cam.up).normalize().multiplyScalar(window.__voidState().r);
  const p1 = c.clone().add(right).project(cam);
  const rx = Math.abs((p1.x * 0.5 + 0.5) * innerWidth - cx) || 60;
  return { cx, cy, rx, r: window.__voidState().r, t: window.__matchState().t, ...window.__faceState() };
});

await p.evaluate((r) => { window.__setVoidR(r); window.__calm(); window.__pinMouth(true); }, R);
let prev = 0, stable = 0, st = null;
for (let i = 0; i < 90; i++) {
  await p.waitForTimeout(2000);
  st = await probe();
  if (prev && Math.abs(st.rx - prev) / prev < 0.015) stable++; else stable = 0;
  prev = st.rx;
  if (stable >= 3) break;
}
console.log(`settled: r ${st.r.toFixed(2)}  rpx ${st.rx.toFixed(0)} css  matchT ${st.t.toFixed(1)}s`);
const HALF = Math.round(st.rx * 1.25);

const boxes = {};
for (const m of MOODS) {
  await p.evaluate((mm) => { window.__calm(); window.__pinMouth(true); window.__setMood(mm); }, m);
  await p.waitForTimeout(5000);
  await p.screenshot({ path: `${OUT}/full-${m}.png` });
  const s = await probe();
  boxes[m] = { ...s, half: HALF };
  console.log(`  ${m.padEnd(8)} rpx ${s.rx.toFixed(0)}  r ${s.r.toFixed(2)}  maw ${s.maw.toFixed(3)} smile ${s.smile?'shown':'hidden'}`);
}
writeFileSync(`${OUT}/boxes.json`, JSON.stringify(boxes, null, 1));
await p.evaluate(() => { window.__pinMouth(false); window.__setMood(null); });
await b.close();
console.log(`HALF=${HALF} css px`);
```

```js
// crop.mjs — usage:
//   node crop.mjs moods/h6 boxes.json out.png <cols> <scale> <halfCssPx> full-*.png
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'fs';
// crop.mjs dir boxes.json out.png cols scale halfCssPx name...
const [dir, boxf, out, colsS, scaleS, halfS, ...names] = process.argv.slice(2);
const boxes = JSON.parse(readFileSync(`${dir}/${boxf}`));
const cols = +colsS, S = +scaleS, HALF = +halfS;
const DPR = 2;
const cw = Math.round(HALF * 2 * DPR), ch = cw;
const rows = Math.ceil(names.length / cols);
const sheet = new PNG({ width: cw * S * cols, height: ch * S * rows });
names.forEach((n, i) => {
  const m = n.replace(/^full-|\.png$/g, '');
  const im = PNG.sync.read(readFileSync(`${dir}/${n}`));
  const b = boxes[m];
  const x0 = Math.round(b.cx * DPR - cw / 2), y0 = Math.round(b.cy * DPR - ch / 2);
  const ox = (i % cols) * cw * S, oy = Math.floor(i / cols) * ch * S;
  for (let y = 0; y < ch * S; y++) for (let x = 0; x < cw * S; x++) {
    const sx = x0 + Math.floor(x / S), sy = y0 + Math.floor(y / S);
    const di = ((oy + y) * sheet.width + ox + x) * 4;
    if (sx < 0 || sy < 0 || sx >= im.width || sy >= im.height) { sheet.data[di+3] = 255; continue; }
    const si = (sy * im.width + sx) * 4;
    sheet.data[di] = im.data[si]; sheet.data[di+1] = im.data[si+1]; sheet.data[di+2] = im.data[si+2]; sheet.data[di+3] = 255;
  }
});
writeFileSync(out, PNG.sync.write(sheet));
console.log(out, sheet.width, sheet.height);
```

### A.2 `facecensus2.mjs` — the census, the charge alignment and the demotion

This is the probe that fails on today's build for BOTH proposals: it is the
source of the charge table in §3.1 and the demotion trace in §4.4.

```js
// THE ONE-FRAME TEST, AS A CENSUS — plus the two events that have no face.
//
//   node facecensus2.mjs [port] [world]
//
// PART 1  COVERAGE. Which of the eight moods a match actually reaches, in
//         MATCH seconds (qa/_clockrate.mjs: the software renderer runs the
//         match clock 14-40x slower than wall).
// PART 2  THE CHARGE. Every time rivalEv.charges ticks, record the distance to
//         the hunter at that instant and the moods worn for the next 2 match
//         seconds — against the scared gate's own reach, parsed out of the
//         shipped source rather than carried as a copy (governor rule 4).
// PART 3  THE DEMOTION. Force one through the REAL handler (__bite(true)),
//         then watch the face and the form for 12 match seconds: how long is
//         hurt held, and what does the face do when the form comes back?
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const SECS = Number(process.env.SECS || 70);

const SRC = readFileSync('src/prototype3d.ts', 'utf8');
const G = SRC.match(/rv\.r > R2 \* ([\d.]+) && Math\.hypot\(rv\.x - voidState\.x, rv\.z - voidState\.z\) < R2 \+ rv\.r \+ (\d+)/);
if (!G) throw new Error('the scared gate in prototype3d.ts no longer matches the shape this probe parses');
const RSRC = readFileSync('src/proto3d/rivals.ts', 'utf8');
const C = RSRC.match(/rv\.ctim <= 0 && dp < (\d+) && dp > rv\.r \* ([\d.]+)/);
if (!C) throw new Error('the charge gate in rivals.ts no longer matches the shape this probe parses');
const SIZE = Number(G[1]), PAD = Number(G[2]), CHARGE_AT = Number(C[1]);
console.log(`gates read from source: scared needs rv.r > ${SIZE}x AND dist < R + rv.r + ${PAD};  the charge fires at dist < ${CHARGE_AT}`);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 320, height: 640 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log(`  [pageerror] ${e.message.split('\n')[0]}`));
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
  localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder');
} catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
await p.evaluate(() => document.getElementById('btnPlay').click());
await p.waitForSelector(`#worldRow .wCard[data-world="${WORLD}"]`, { state: 'visible', timeout: 400000 });
await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`).click(), WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 400000 });

await p.evaluate(() => {
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  const tick = () => {
    const vs = window.__voidState();
    let best = null, bd = 1e9;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
      const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
      const d = dx*dx + dz*dz; if (d < bd) { bd = d; best = { dx, dz }; }
    }
    if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
      dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
        clientX: cx + best.dx/m*110, clientY: cy + best.dz/m*110, bubbles: true })); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await p.evaluate(([SIZE, PAD]) => {
  const S = { hist: {}, last: null, ch0: null, charges: [], gateOpen: 0, n: 0, bite: null };
  window.__census = S;
  const tick = () => {
    const ms = window.__matchState(), fs = window.__faceState(), vs = window.__voidState();
    if (S.last === null) { S.last = ms.t; S.ch0 = ms.ev.charges; }
    const dt = Math.max(0, ms.t - S.last); S.last = ms.t; S.n++;
    S.hist[fs.mood] = (S.hist[fs.mood] || 0) + dt;
    let open = false;
    for (const rv of ms.rivals) if (rv.r > vs.r * SIZE && Math.hypot(rv.x - vs.x, rv.z - vs.z) < vs.r + rv.r + PAD) open = true;
    if (open) S.gateOpen++;
    if (ms.ev.charges > S.ch0) {
      S.ch0 = ms.ev.charges;
      const h = ms.rivals.filter((r) => r.hunt).sort((a, c) =>
        Math.hypot(a.x-vs.x,a.z-vs.z) - Math.hypot(c.x-vs.x,c.z-vs.z))[0];
      S.charges.push({ t: ms.t, pr: vs.r, hr: h ? h.r : -1,
        dist: h ? Math.hypot(h.x-vs.x, h.z-vs.z) : -1,
        need: h ? vs.r + h.r + PAD : -1, moods: [] });
    }
    for (const c of S.charges) if (ms.t - c.t <= 2.0 && !c.moods.includes(fs.mood)) c.moods.push(fs.mood);
    if (S.bite) { const e = S.bite;
      if (ms.t - e.t0 <= 14) { e.samples.push([+(ms.t - e.t0).toFixed(2), fs.mood, window.__stages().cur]); } }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}, [SIZE, PAD]);

const t0 = await p.evaluate(() => window.__matchState().t);
await p.waitForFunction((tt) => window.__matchState().t > tt, t0 + SECS, { timeout: 1800000 });
const part1 = await p.evaluate(() => ({ ...window.__census, r: window.__voidState().r }));
const total = Object.values(part1.hist).reduce((a, c) => a + c, 0);
console.log(`\n── ${WORLD.toUpperCase()} — ${total.toFixed(1)} match seconds, ${part1.n} frames, r ${part1.r.toFixed(1)}`);
for (const [m, s] of Object.entries(part1.hist).sort((a, c) => c[1] - a[1]))
  console.log(`   ${m.padEnd(9)} ${(100*s/total).toFixed(1).padStart(5)}%   ${s.toFixed(1)}s`);
const missing = ['cruise','hungry','frenzy','scared','hurt','smug','sleepy','victory'].filter(m => !part1.hist[m]);
console.log(`   NEVER SEEN: ${missing.length ? missing.join(', ') : '(none)'}`);
console.log(`   scared PROXIMITY GATE open on ${(100*part1.gateOpen/part1.n).toFixed(1)}% of frames`);
console.log(`\n── CHARGES: ${part1.charges.length}`);
for (const c of part1.charges)
  console.log(`   t=${c.t.toFixed(1)}s  hunter r ${c.hr.toFixed(1)} at ${c.dist.toFixed(0)}u; scared needs < ${c.need.toFixed(0)}u`
    + `  ->  face in the next 2s: ${c.moods.join(',')}`);

// ── PART 3: the demotion, through the real handler
console.log(`\n── THE DEMOTION`);
const before = await p.evaluate(() => window.__stages());
await p.evaluate(() => { const ms = window.__matchState();
  window.__census.bite = { t0: ms.t, samples: [] }; window.__bite(true); });
const tb = await p.evaluate(() => window.__matchState().t);
await p.waitForFunction((tt) => window.__matchState().t > tt, tb + 14, { timeout: 1800000 });
const e2 = await p.evaluate(() => ({ b: window.__census.bite, st: window.__stages() }));
console.log(`   stages before ${JSON.stringify(before)}   after 14s ${JSON.stringify(e2.st)}`);
let lastM = null;
for (const [t, m, cur] of e2.b.samples) if (m !== lastM) { console.log(`   +${t.toFixed(2).padStart(5)}s  mood ${m.padEnd(8)} form ${cur}`); lastM = m; }
const hurtSpan = e2.b.samples.filter(s => s[1] === 'hurt');
console.log(`   hurt held for ${hurtSpan.length ? (hurtSpan[hurtSpan.length-1][0] - hurtSpan[0][0]).toFixed(2) : 0}s of match clock`);
const forms = [...new Set(e2.b.samples.map(s => s[2]))];
console.log(`   forms seen during the window: ${forms.join(' -> ')}`);
const back = e2.b.samples.find((s, i) => i > 0 && s[2] > e2.b.samples[i-1][2]);
console.log(back ? `   climbed back at +${back[0]}s wearing '${back[1]}'` : `   never climbed back inside 14s`);
await b.close();
```
