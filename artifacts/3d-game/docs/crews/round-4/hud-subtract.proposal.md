# crew:hud-subtract — two things off the screen

**Filed 2026-08-29. Nothing here is landed. This crew edited no tracked file;
`docs/crews/round-4/hud-subtract.proposal.md` is the only file it wrote.**
HEAD `f4fda7d`, working tree clean. `dist/` was rebuilt from that source with
`npm run build` at the top of this session (`✓ built in 4.11s`,
`dist/assets/main-B7gQaMJp.js`) and served into the preview already running on
`:4177`, which was never restarted and never replaced.

Brief: `docs/OWNER-2026-08-29.md` item 2. His words, verbatim:

> The news, chat, bubbles, scoreboard - sometimes it gets so cluttered it's
> distracting. Do we remove the void window - when they talk it's just chat
> bubbles? The scoreboard on the top left seems useless -'like we know sort of
> who's wining by size. At the end we can reflect scores.

⟪SHORT-VERSION⟫

---

## 1. WHAT IS ACTUALLY ON THE SCREEN

Nobody had photographed it. Every look probe in this repo hides the overlay
before the shutter (`qa/lookpair.mjs:332-335` walks `document.body.children` and
sets `display:none` on everything that is not the canvas), and `qa/uisystem.mjs`
— the one gate on the ui tier — only ever visits the menu, the picker, the shop
and the settings sheet. **The in-match overlay has never been measured, in this
repo, in any run.**

`qa/hudarea.mjs` (§7.1) plays a real driven match at the 430×932 reference
viewport, keeps the overlay up, and reads every visible panel's rect every
frame. Maple Falls, **997 frames across match t = 8 … 60 s**:

```
  BUSIEST FRAME  t=25.8s   8 panels   union 92,080 px2 = 23.0% of a 400,760 px2 frame

      #news       25,105   379x 96 = 36,555 px2   "THE BUGLE · Somebody left a casserole dish on the ba…"
      #growth     17,868   396x 50 = 19,780 px2   "VOIDLING 2m   NEXT MUNCHKIN"
      #joy       149,400   132x132 = 17,424 px2   (the stick ring)
      #board      10, 10   130x 83 = 10,802 px2   "1 ⚡NIBBLES 172 · 2 You 121 · 3 BIGSHOT 114 · 4 JELLY 50"
      #timer     268, 12    67x 42 =  2,833 px2   "2:35"
      #joyNub    193,376    52x 52 =  2,704 px2   (the nub)
      #btnQuit   374, 56    44x 44 =  1,936 px2   "⌂"
      #coins     368, 12    50x 30 =  1,508 px2   "✦ 10"

  MEAN over the window         7.3 panels, 14.2% of the frame
  ALWAYS ON, all 997 frames    7 panels — #timer #board #coins #growth #joy #joyNub #btnQuit
                               covering 55,525 px2 = 13.9% at the busiest frame
```

Transients, as a share of frames: speech bubbles **30%** (capped at two —
`createBubbles(camera)` defaults `max = 2`), the news card 1%, a banner card 1%,
score floaters 0%, and `fx.ts`'s full-frame screen flash 0.9%.

**Read those two transient figures with the clock in mind, because they are the
one place this probe's arithmetic is not the player's.** `#news` and `#banner`
are CSS animations — `animation: news 5.6s … forwards` (index.html:367) and
`bnr 2.4s … forwards` (:422) — and a CSS animation runs on **wall** time while
the match clock is dilated (`dt = min(0.05, dtRaw)`, `prototype3d.ts:8344`, so
match time advances 0.05 s per rendered frame and swiftshader renders about one
frame a second). So on this machine a 5.6-second card occupies a few tenths of a
match second and shows up as 1% of frames. On a phone at 60 fps the two clocks
are the same clock: `qa/bannermix.mjs` measured **4 news cards in 70 match
seconds**, one every 17.5 s, each up for 5.6 s — **about a third of a real
match.** The 23.0% frame above is not a rare peak on a device. It is roughly
what a third of the match looks like.

Two things in that table are worth saying out loud before anything is removed:

- **The news card is three and a half times the board** (36,555 against 10,802
  px²) and is the single largest thing on the screen. The board is the fourth
  largest, behind the growth bar and the joystick ring.
- **The board measured here is four rows.** Its CSS cap is `max-width: 38vw`
  by `max-height: 152px` (index.html:150-151) — 163×152 = 24,776 px² = **6.2%
  of the frame** — which is what a full six-void match draws.

The two frames the probe photographed are `qa/out/hudarea/maple_today_busiest.png`
and `maple_minus-board_busiest.png`.

---

## 2. "THE VOID WINDOW" IS NOT AN ELEMENT. HERE IS WHICH ONE HE MEANS

**Nothing in this build is called the void window.** `<body>` has exactly 35
element children (index.html:1731-2141) and none of them carries a name, class
or comment resembling it:

```
timer  board  coins  quests  growth  banner  count  news  hungerlbl  hunger
joy  joyNub  powers  evolve  guide  hand  btnQuit  titlecard  menu  book
settings  pause  policy  gate  worlds  daily  skinPrev  tapGate  loadScr
trophies  topvoids  shop  tut  end
```

plus, appended at runtime by `bubbles.ts:182/191`, two `.vb` speech bubbles and
fourteen `.vf` floaters. Of that list, `quests`, `powers`, `hunger` and
`hungerlbl` are `display: none !important` (index.html:487, :529) and the rest
of the tail is menu furniture. So the surface has to be named by argument, and
the argument has to be shown.

**It is not where the family SPEAKS, because that is already bubbles-only.**
`rivals.onSpeak` (prototype3d.ts:2429) is four lines:

```ts
rivals.onSpeak = (x, z, line, name) => {
  const d = Math.hypot(x - voidState.x, z - voidState.z);
  if (d < 55) bubbles.say(rivalBubblePos.set(x, 5, z), line, 'rival', rivalChip(name));
};
```

There is no `else`. The `breakingNews(\`💬 ${name}: ${line}\`)` fallback that
`docs/NEWSROOM-BRIEF.md:30` calls out — the one that put a void's dialogue in a
town newspaper — is gone from the tree (`grep -rn "💬" src/` returns exactly one
hit, the comment recording its removal at `prototype3d.ts:2431`). All fifteen
`api.onSpeak` triggers in `rivals.ts` land in a bubble or nowhere. **"When they
talk it's just chat bubbles" is already true of literal speech**, so the thing
he wants gone is the *other* panel that carries the family.

**That panel is `#banner`.** It is the only window-shaped object on the play
screen: a centred card at `top: 27%`, `max-width: min(92vw, 420px)`, with a
gradient fill, a 1.5px violet border, a 30px drop shadow and a backdrop blur
(index.html:385, :403-409). And it is where the family lives:

| # | site | the card | is it a void? |
|---|---|---|---|
| 1 | `prototype3d.ts:9291` | `👋 Auntie NIBBLES: "ooooh… this planet looks DELICIOUS!"` | **a family member talking, in a window** |
| 2 | `:2404` → `announceJoin` `:3065` | `Auntie NIBBLES` + colour dot + `⚡ she CHASES you` | yes |
| 3 | `:2462` | `🍽️ You ate NIBBLES! / Auntie is out  +240` | yes |
| 4 | `:2626` `onSurge` | `📢 NIBBLES grew BIGGER than you / eat up, then eat THEM` | yes |
| 5 | `:2644` `onStuffed` | `🍰 NIBBLES is too full / now is your chance` | yes |
| 6 | `:4283` | `👑 YOU ARE IN FRONT! / NIBBLES is behind you` | yes |
| 7 | `:4301` | `👑 NIBBLES TOOK THE LEAD! / get it back!` | yes |
| 8 | `:4316` | `👑 you passed NIBBLES!` | yes |

Card 1 settles it on its own: a family member speaks a quoted line *inside a
window* while the rest of their dialogue goes to bubbles. That is exactly the
inconsistency his sentence names.

**Measured, not argued.** `qa/bannermix.mjs` (§7.4) put a `MutationObserver` on
`#banner` and `#news` and logged every distinct card either printed across a
real driven Maple match, t = 0 … 70 s:

```
  #banner — 4 distinct cards, 3 of them about a void
     VOID   t=10.4   "Cousin JELLY · runs from everything"
     VOID   t=12.2   "Auntie NIBBLES · she CHASES you"
     VOID   t=19.2   "Baby ECHO · copies your route"
            t=31.5   "🎺 Band practice · they only know one song  ×2"
  #news   — 4 distinct headlines, none of them about a void
            t= 6.0   "THE BUGLE · Good morning, Maple Falls! Whose trampoline is up the elm on Pine Road?"
            t=25.2   "THE BUGLE · Carla Webb has now edited this paper for nineteen years running."
            t=41.8   "THE BUGLE · The trombone section has gone and the song has not."
            t=60.2   "THE BUGLE · It ate a snack. One tiny burp. That was the whole event."
```

**Three quarters of everything the window said in the first seventy seconds was
the family announcing itself**, at a rate matching the newspaper's. The town
and the family are running two cards a minute each at the top of the screen —
which is the "cluttered" he is describing, and the family's half is the half he
asked to delete.

(Card 1 of the table above, the `👋 Auntie NIBBLES` hello, did not fire in this
run and could not have: `:9283` gates it on `firstRun`, which is
`firstEver` — never having finished a match (`:5411`, `:5541`). It is a
**first-launch-only** card, which matters for what deleting it costs. See §8.1.)

**The alternative reading, and why it fails his own test.** The other candidate
is the speaker chip on a rival's bubble — `.vbN`, the rival's name in their
leaderboard colour with a coloured dot (`bubbles.ts:157-160`), which does look
like a little nameplate. Removing it would satisfy "when they talk it's just
chat bubbles" in the narrowest sense. It fails on the reason he gave: the chip
is 10px of text *inside* a bubble that stays, so deleting it removes **zero**
square pixels of clutter, and the sentence he wrote is about clutter. It also
undoes a comms decision the brief calls "already built and NOT to be redone"
(`docs/NEWSROOM-BRIEF.md:57`). Recorded so the skeptic can overrule me; if he
does, the patch is one line in `bubbles.ts` and none of §6.1 applies.

**One caution about his vocabulary, because it matters for a naming argument.**
In the same feedback he calls a void "Chompzilla". No rival has been called that
since `rivals.ts:82` renamed the family *at his own earlier request* — today's
five are JELLY, BIGSHOT, ECHO, NIBBLES and GRUMPS. So he is describing the game
from memory and from a build that is not this one, and "the void window" is a
description rather than a handle. That is a reason to name the surface precisely
in the patch, not a reason to discount the ask.

---

## 3. THE VOID WINDOW: EVERY JOB IT DOES THAT A BUBBLE DOES NOT

I took the eight cards one at a time and asked what channel would still carry
the fact if the card were deleted. Seven of the eight already have a shipped
world-space twin; **one does not.**

| card | what else says it, today, with no patch |
|---|---|
| **1 welcome** | nothing. NIBBLES joins at t=7-13s (`rivals.ts:533`) and this card fires at the end of the intro, so she is not on the island yet and cannot carry a bubble. **Lost, unless it moves.** |
| **2 joined** | the void walks into the world wearing its own colour, with a ground halo (`rivals.ts:1906-1923`) and `audio.alert()` (`prototype3d.ts:2409`). The card's extra payload is the ARCHETYPE line, which is a *teach*, not news |
| **3 you ate one** | a big floater at the kill site — `bubbles.float(pos, "Auntie NIBBLES DEVOURED! +240", true)` (`:2482`) — plus two rings, two flashes, a camera punch, `audio.bigEat()` and an 80ms buzz (`:2472-2484`) |
| **4 it grew bigger than you** | its halo turns **red**. `rivals.ts:1917` sets `0xff5560` whenever `rv.r > pr * EAT_RATIO`, and a surge pins the rival at 1.26x the player against `EAT_RATIO` 1.11 — so the ring is red for the whole surge. `onSurge` also fires its own 34-unit ring in the rival's colour (`:2624`) |
| **5 it is too full** | its halo turns **gold** and pulses (`rivals.ts:1914`), plus `breakingNews(COPY.rivalFullNews)` in the town lane and `audio.ready()` |
| **6 you took the lead** | **nothing.** See below |
| **7 it took the lead** | **nothing.** See below |
| **8 you passed one** | the passed rival brags in a bubble when they are within 55 units (`:4322-4343`) — but only when *they* pass *you*; the reverse case is banner-only |

So the honest tally is: **the void window's only irreplaceable job is telling a
child where they stand in the race.** Everything else on it is a second telling
of something the world already says louder and in the right place.

**And it does one thing that is worse than redundant: it gags the channel he
wants to keep.** `bubbles.ts:214-218`, inside `say()`:

```ts
if (kind !== 'rival') {
  const ban = document.getElementById('banner');
  if (ban && ban.classList.contains('show')) return;      // dropped, not queued
  if (slots.some((s) => s.active && s.el.classList.contains('rival'))) return;
}
```

While a card is on screen, every crowd and event bubble is **discarded** — not
delayed, `return`ed. The banner's own comment (`prototype3d.ts:3130`) records
its duty cycle as *"39%, one impression every 5.6 seconds"* on a measured
match. So for something close to two fifths of a match, the town is silent
because a card is up, and a large share of those cards are the family
announcing itself. Delete the family's cards and the chat bubbles he wants get
their airtime back for free.

And "where they stand in the race" is the exact job the owner is also deleting
in his second sentence. §5 is about that collision, and it is the one place in
this document where I am not simply doing what he asked.

---

## 4. THE SCOREBOARD: IS SIZE A FAITHFUL PROXY FOR RANK?

This is the one argument that could have saved the board, and it is his own:
*"like we know sort of who's wining by size."* It is checkable, because the game
hands both numbers to the same function — `refreshHud` (`prototype3d.ts:4252`)
builds its rows from `r.score`, and `__matchState().rivals` reports `score` and
`r` side by side for every void.

### 4.1 What the source says before any probe runs

**The player's radius is a clock, not a score.** `prototype3d.ts:8565` clamps
the hero every frame to

```
lawCap = min(12, START_R + (0.022·min(t,30) + 0.025·t)·paceK + surge) + feastR
```

and `:8585` pulls him *up* to a `scoreFloor` whenever he is under it. The
source's own measurement, in the comment at `:8587`: *"a par run at 60s: lawCap
3.06, raw floor 4.18, so scoreFloor IS lawCap and the player's radius sits
pinned exactly on it."* `paceK` moves that by at most ±8% above par
(`:8548`). A child who scores twice as much is not twice the size; they are the
same size, a few per cent sooner.

**Every non-hunter sibling's radius is a clamp on the PLAYER's radius, not on
their own score.** `rivals.ts:865`:

```ts
const softCap = Math.max(Math.min(START_R + 0.02 * _t, 1.6), pr * 0.80);
...
if (rv.r > hardCap) rv.r = hardCap;          // hardCap === softCap for them
```

`hardCap` is `softCap` for every non-hunter — the two escapes that lift it,
`want * 1.04` and `stuffCap`, are both inside `if (isHunter)` (`:997-1016`), and
`docs/GOVERNOR.md` already has this on the ledger under "The family cannot be a
threat". So the family's size is a function of the player's size and the clock.
**Their scores are not in it at all.** Two siblings a thousand points apart are
drawn the same size, and the player — pinned at `lawCap`, with everyone else
pinned at 0.80 of it — is drawn as the biggest void on the island whether they
are winning or losing.

Meanwhile their *scores* are driven by a lane: `want ≈ 0.94 · playerScore`, a
`band` multiplier, and a graze interval that self-corrects toward it
(`rivals.ts:1813`). Score and size are computed from different inputs, by
different rules, in different files. There is no reason for them to agree, and
the measurement below is what happens when you ask whether they do.

### 4.2 What the game says when you ask it

`qa/sizerank.mjs` (§7.2) plays a real driven match and reads `score` and `r` for
the player and every joined void off `__matchState()`, on the match clock, every
frame. Maple Falls, one match, **786 frames across t = 20 … 60 s** — the whole
window at the 20 Hz the clamped `dt` gives (`prototype3d.ts:8344`,
`dt = min(0.05, dtRaw)`). The raw run took 491,681 CDP samples; those collapse
to 786 distinct match times, and every figure below is per FRAME, not per
sample, because oversampling inside one frame would have weighted a still
picture 600 times.

```
  whole-order disagreement (size order != score order)  99.9% of frames
  strict pair inversions (size says the wrong thing)    41.5% of 4,674 pairs
  …plus size-ties with different scores                  2.1%
  the PLAYER's own rank, read off size, is wrong        99.7% of frames
  mean |score rank − size rank| for the player           2.17 places
  player's score rank → size rank:  2→4 in 77.1% of frames · 1→4 in 19.8%
```

**In one frame in five the player is winning the match and is the fourth-biggest
void on the island.** Not "roughly right"; inverted.

And the mechanism the source predicted is exactly what the numbers show:

```
  family (non-hunter) SIZE  spread max/min   median 1.0123   p90 1.0823   max 1.3149
  family (non-hunter) SCORE spread max/min   median 2.25     p90 2.55
  non-hunter voids sitting within 2% of softCap                       40.2% of samples
  final frame, t=60:  You 209 r1.27 │ ECHO 142 r1.60 │ GRUMPS 63 r1.60 │ NIBBLES 267 r1.91 (hunting)
```

Read that last line. **ECHO and GRUMPS are 2.3 times apart on score and the same
size to two decimal places**, because both are pinned on the same
`min(START_R + 0.02·t, 1.6)` ceiling. Over the window their radii travelled
1.18→1.60 and 0.90→1.60 while their scores travelled 37→142 and 0→63. The
family's size is a clock they share. It cannot rank them, and it does not.

**Three honest caveats, because this number is strong enough to be worth
attacking:**

1. *One match is one match.* So I ran a second, on a different world with a
   different cast — **Game Day, 789 frames, four rivals** (JELLY, BIGSHOT,
   GRUMPS and NIBBLES hunting):

   | | Maple (3 rivals) | Game Day (4 rivals) |
   |---|---|---|
   | frames | 786 | 789 |
   | whole-order disagreement | 99.9% | **100.0%** |
   | strict pair inversions | 41.5% of 4,674 | 35.0% of 7,037 |
   | size-ties with different scores | 2.1% | 4.2% |
   | player's rank wrong | 99.7% | **100.0%** |
   | family SIZE spread (median) | 1.0123x | 1.1652x |
   | family SCORE spread (median) | 2.25x | 2.75x |
   | worst common case | 2→4 in 77.1% | 2→5 in 37.6%, 3→5 in 36.6% |
   | leading and NOT biggest | 1→4 in 19.8% | 1→4 in 6.6% |

   Game Day's final frame: `JELLY 21 r1.60 │ BIGSHOT 54 r1.60` — **2.6x apart on
   score, identical to two decimal places in size.** Two worlds, two casts, same
   answer. And the clamp is in `rivals.ts` with no world term in it, so this was
   never going to be a world property.
2. *Neither cast was five.* Maple drew three voids and Game Day four. A
   five-void match has more pairs to invert, not fewer.
3. *My driver is a weak player.* `qa/sizerank.mjs` steers on a slowly rotating
   heading; it does not hunt food. So the hero finished at r 1.27, under the
   family's absolute 1.6 ceiling, and "player is the biggest void in **0.0%** of
   frames" is a fact about this driver, not about the game. A strong player
   crosses 2.0 and then `pr * 0.80` becomes the binding term, the family tracks
   them at 0.8x, and the player is the biggest void permanently — **which is the
   same defect from the other side: their size then says "1st" all match no
   matter what the score does.** Either way size is not reporting rank; it is
   reporting the clock and the clamp.

### 4.3 What this does and does not settle

It does **not** save the board; it demolishes the premise underneath the
sentence rather than the sentence. He said the board is useless *because* size
tells you who is winning. Size does not tell you who is winning. The board is
still the wrong instrument, for reasons that have nothing to do with size:

- it is a **13px, six-row numeric table** (`index.html:168`) in a game rated 4+,
  and `qa/uisystem.mjs`'s reading floor is 11px for decorative marks and 12px
  for anything a child must read — it clears the floor and still asks a
  six-year-old to compare four-digit numbers;
- it is the **only** thing on the play screen that shows `playerScore` at all
  (`grep -n playerScore src/prototype3d.ts`: the sole in-match display is
  `:4252`, the board's own row) — and a raw score is a number a child cannot
  act on, which is the same argument that already deleted the "N EATEN" chip
  (index.html:131) and the "you 1% · family 3%" line (`prototype3d.ts:4389`);
- the danger it flags with `⚡` is flagged better and earlier by the ground
  halo, in world space, in colour, with no reading at all.

So: **remove it.** But remove it knowing that his stated reason is false, which
matters because the same false reason would otherwise justify removing the
crown cards too, and those are the last rank channel standing.

---

## 5. WHAT THE END SCREEN ALREADY HAS, AND WHAT IT MUST GAIN

"At the end we can reflect scores" is **already built.** `endMatch()` at
`prototype3d.ts:4859` assembles the same rows the live board does, filtered the
same way, and `:5053` paints them into `#endList`:

```
1 ● NIBBLES  2140
2 ● You      1980      ← .me, gold
3 ● JELLY     870
```

`#endList` is the third element inside `#endScroll` — headline, sub-line,
standings, then finds, stats, drop, quests (index.html:2095-2128). The headline
above it is already the placement: `#${myRank} · STILL HUNGRY!` or one of
`COPY.winTitles`.

`qa/endboard.mjs` (§7.3) drove a match to the whistle and measured the panel at
430×932 rather than reading the stylesheet. **The standings are already where
they need to be:**

```
  headline   "#3 · STILL SO MUCH LEFT TO EAT!"
  #endScroll 749px tall, content 799px  — SCROLLS (by 50px)
  #endList   y = 196 … 331   4 rows   IN VIEW, no scrolling needed
      1 ● JELLY    528
      2 ● NIBBLES  400
      3 ● You      154        ← .me, gold, 16px
      4 ● BIGSHOT  125
  panel order: endHd > endSub > endList > endFinds > endStats > drop > endNext > endQuests
  stats: YOU ATE 50% OF IT │ BITES 6 │ BIGGEST MUNCHKIN │ NEW BEST! 154 │ LEVEL UP! 🥉 LVL 2
```

`#endList` sits third in the scroll column, above the finds, the stat tiles,
the void drop, the skin nudge and the quests — so its position depends only on
the headline and the sub-line and is stable however rich the rest of the panel
gets. Its rows are 16px (`index.html:816`) against the live board's 13px, and
the player's row is highlighted. **He already has what he asked for.** (One
honest caveat on that run: `?fast` was used to reach the whistle inside a
software renderer's clock — it multiplies `matchClock` only, so the SCORES on
that screen are smaller than a real match's. The layout, the row count and the
ordering are unaffected, and those are what this measures.)

**One thing the run caught that is not a layout bug.** The sub-line under the
headline reads `🏆 MUNCHKIN EARNED!` — because the lead-line priority at
`prototype3d.ts:4924` is *trophy → level-up → placement*, and
`${rows[0].name} devoured the most` is the last of the three. In the measured
run the child finished 3rd and was **never told who beat them**, in words, at
the one moment the game is supposed to reflect the race. Today the live board
covers that. Take the board away and it is a hole.

**What it must gain, and why each one is caused by the removals rather than
being a wish list:**

**5.1 The margin.** With the live board gone, the results panel is the first
and only time a child sees these numbers, and `2140` against `1980` is a
subtraction a six-year-old cannot do. One span per row, from numbers already in
`rows`:

```ts
const top = rows[0].score;
... `<span class="gap">${r.me && i === 0 ? 'WON BY ' + Math.round(rows[0].score - (rows[1]?.score ?? 0))
                                        : '−' + Math.round(top - r.score)}</span>`
```

Zero new state. It turns a table into "you were 160 behind", which is the
sentence that makes a child tap PLAY AGAIN.

**5.2 The crown, if it is leaving the match.** If §6.2 lands in full, the words
"you are winning" are said nowhere in the game until the whistle. Then the
results headline is carrying the entire feature and must say it in one glance —
it does today for 1st (`COPY.winTitles`), and for 2nd-6th it says
`#4 · OUT-NOMMED!`, which names the placement but never names the void that
beat you. `${rows[0].name} devoured the most` already exists as the lead line
(`:4926`) but is *third* in a priority chain behind a trophy and a level-up, so
in a match that earned either, the child is never told who won. Make the
opponent line unconditional and demote the trophy line to the tile row.

**5.3 A quit run still reflects nothing.** `doQuit()` (`:6600`) goes straight to
the menu: no `#end`, no standings, no score. That is true today and the live
board was the only thing that made it survivable. **Flagged, not patched** — a
results screen on quit is a design decision about whether leaving should feel
like finishing, and it is his call, not a crew's.

---

## 6. THE PATCHES

Two independent patch sets. Either can land without the other; §6.2 is the one
that interacts with §5.2. Neither adds a triangle, a draw call or a seeded
draw, so `mainstreet.ts:252`'s mulberry32 stream is untouched and Maple's
authored placement cannot move (`docs/GOVERNOR.md`, HANDS OFF).

### 6.1 PATCH SET A — the top-left scoreboard, removed

| # | file | anchor | change |
|---|---|---|---|
| **A1** | `index.html` | `:1732` | delete `<div id="board"></div>` |
| **A2** | `index.html` | `:150-173` | delete the `#board` rule and its five descendant rules (`.row`, `.row.me`, `.dot`, `.nm`, `.sc`). Keep the panel-opacity note at `:152-164` — it is the measurement behind `rgba(16,8,30,0.88)`, which `#coins` and `#btnQuit` also use, so it moves to `#coins` rather than dying with the board |
| **A3** | `index.html` | `:1657` | `body.menu #timer, body.menu #board, body.menu #growth,` → drop `body.menu #board,` |
| **A4** | `index.html` | `:118-120` | `#timer { … left: 42vw; right: 8px; … }` → `left: 0; right: 0;`. **Required by the removal, not a restyle:** the comment on the two lines above it reads *"a clear lane: the board owns the left, so the clock centres in what is left rather than in the whole screen"*. Delete the board and the clock is 12% off-centre for a reason that no longer exists |
| **A5** | `prototype3d.ts` | `:3044` | `const timerEl = el('timer'), boardEl = el('board');` → `const timerEl = el('timer');` |
| **A6** | `prototype3d.ts` | `:4241-4242` | delete `let lastBoardHtml = ''` and its comment; the paint-cache note above it stays for `lastTimerText` |
| **A7** | `prototype3d.ts` | `:4345-4361` | delete `const shown = rows;`, the `boardHtml` template and the `boardEl.innerHTML` write. **`rows` and `myRank` stay** — the rank machine (`:4258`) and the rival's brag bubble (`:4322-4343`) both read them, and that bubble is family speech, which is the channel he is keeping |
| **A8** | `prototype3d.ts` | `:4254` | `name: r.hunting ? \`⚡ ${r.name}\` : r.name` → `name: r.name`. The `⚡` existed only to mark the chaser *on the board*; with the board gone the three `.replace('⚡ ', '')` guards at `:4282`, `:4300` and `:4316` become no-ops and go too |
| **A9** | `prototype3d.ts` | `:5524` | delete `boardEl.style.display = solo ? 'none' : '';` |
| **A10** | `qa/solotog.mjs` | `:60`, `:71`, `:79` | this probe hard-dereferences `getComputedStyle(document.getElementById('board'))` and asserts *"leaderboard visible in normal run"* / *"leaderboard hidden in solo"*. It throws on a null the moment A1 lands. Both assertions describe the surface being deleted: cut them and keep the rest of the file, which also checks the solo clock and the rival count |
| **A11** | `src/proto3d/bubbles.ts` | `:62-64` | `HUD_TOP = 206` is documented as *"the top strip the leaderboard, clock and wallet own"*. With the leaderboard gone the strip is the clock and the wallet only. **Land this as a measured rect, in its own commit, with `qa/bubbleclear.mjs` green** — see §7.3. It is a win, not a cost: today 206 of 932 px (22% of the screen) is closed to speech |

Everything else that touches `#board` is a `querySelectorAll` HUD-hiding
selector (`qa/crowdface.mjs:35`, `qa/personsheet.mjs:77`, `qa/gapesheet.mjs:67`,
`qa/moodsheet.mjs:66`, `qa/moverface.mjs:36`) or a `if (!el) continue` loop
(`qa/contrast2.mjs:36`, `qa/hudsize.mjs:26`). All seven degrade silently and
correctly. None of them is in `qa/gate.mjs`.

### 6.2 PATCH SET B — the void window, removed

| # | file | anchor | change |
|---|---|---|---|
| **B1** | `prototype3d.ts` | `:9291` | delete `announceHtml(cardHtml('👋 Auntie NIBBLES: "…"'))`. The line 3 seconds behind it (`:9292`, *"eat everything SMALLER than you"*) already opens the game, and it is the instruction rather than the flavour. **This is the one card with no world-space twin** — NIBBLES joins at t=7-13s (`rivals.ts:533`) and is not on the island when it fires, so it cannot become a bubble without moving her join time, which is a balance number |
| **B2** | `prototype3d.ts` | `:2403-2410` | in `rivals.onJoin`, delete the `announceJoin(...)` call and keep `audio.alert()`. `announceJoin` (`:3065-3072`) then has no caller and goes with it; `ARCH_TAG` (`:2394`) loses its only reader |
| **B3** | `prototype3d.ts` | `:2461-2465` | delete the `announceHtml(marquee ? … : …)` card. `bubbles.float(pos, "Auntie NIBBLES DEVOURED! +240", true)` at `:2482` already carries the name, the title and the points, at the kill site, where the child is looking |
| **B4** | `prototype3d.ts` | `:2626` | in `rivals.onSurge`, delete the `announceHtml`; keep `fx.ring` and `rivalEv.surges++` (which `qa/rivalswing.mjs` reads). The rival's halo is already red for the whole surge |
| **B5** | `prototype3d.ts` | `:2644` | in `rivals.onStuffed`, delete the `announceHtml`; keep `breakingNews(COPY.rivalFullNews)` and `audio.ready()` |
| **B6** | `prototype3d.ts` | `:4275-4308` | delete both crown cards — `👑 YOU ARE IN FRONT!` and `👑 X TOOK THE LEAD!` — with their `fx.ring`/`fx.flash`/`audio`/`buzz` |
| **B7** | `prototype3d.ts` | `:4312-4318` | delete the `👑 you passed X!` announce |
| **B8** | `prototype3d.ts` | `:4206-4210` | with B6 and B7 gone, `rankHold`, `shownRank`, `announcedRank`, `lastLeadBrag`, `crownLive`, `everBehind`, `settled` and `ledJust` have no readers. Delete them. **`prevRank` and `lastRankBrag` stay**: the rival-passes-you brag bubble at `:4322-4343` is family speech and is exactly what he is keeping |

After B, `#banner` still exists and still carries fifteen non-void cards —
EVOLVED, the scripted beats, `⭐ STICKER FOUND!`, `🏠 FIRST BUILDING!`,
`🍽️ HALF THE TOWN`, `⏰ 35 SECONDS`, the quest lines and the world's finale
copy. **The window stops being the family's second mouth; it does not stop
being the game's.** If the skeptic reads "the void window" as the whole
`#banner` element, the extra deletion is those fifteen call sites plus
`announceBeat`, `cardHtml`, `holdBanner`, `pumpBanner`, the queue and the
`bnr` keyframes — and the EVOLVED ceremony, which `docs/GOVERNOR.md` records
as deliberately reserved (`holdBanner` exists for it). I do not think he meant
that and I have not costed it.

### 6.3 The two patch sets collide, and it is worth saying out loud

A7 keeps the rank machine alive; B6 deletes what it feeds. Land both and
**`myRank` is computed at 5Hz for a whole match and shown to nobody** until the
whistle. That is not an argument against either patch — it is the reason §5.2
exists, and the reason the channel table in §8.4 matters.

---

## 7. THE PROBE

⟪PROBE⟫

---

## 8. WHAT IS LOST, PLAINLY

My default was to do what he asked and find out what breaks. Four things break.
Three of them are cheap. One is not, and I am not going to bury it.

**8.1 The family's hello (B1).** `👋 Auntie NIBBLES: "ooooh… this planet looks
DELICIOUS!"` is the only line of family dialogue in the first ten seconds and it
was added on his own ask (the comment at `:9286` says so). It cannot become a
bubble where it stands, because NIBBLES does not arrive until t=7-13s. **Cost is
smaller than it looks:** `:9283` gates it on `firstRun`, which `:5541` sets from
`firstEver` — so it fires **once per install**, on the very first match a child
ever plays, and never again. `qa/bannermix.mjs` did not see it at all on a
profile that had played before. Deleting it costs one beat, once, in the first
ten seconds of a child's life with the game. **If he wants it kept: it is a
card about a void, so the card goes; move the hello to the moment she actually
walks in, as a bubble, and it obeys his rule exactly.** Two lines inside
`rivals.onJoin`; I have not costed its effect on the join beat.

**8.2 The archetype teach (B2).** The join card is the only place the game ever
says `⚡ she CHASES you` / `👣 copies your route` / `😴 slow and steady`. After
B2 a child has to infer four archetypes from watching. The ARCH_TAG comment
(`:2397`) already records what happens when the teach and the behaviour
disagree, so this is a teach the code does honour. Cost: real but small — the
behaviours are legible by design (`rivals.ts:96`: *"a game a child can NAME
after watching it for"*).

**8.3 The player's own live score.** The board's `You` row is the only place
`playerScore` appears during a match. He asked for this explicitly, and the
same reasoning already deleted the "N EATEN" chip and the "you 1% · family 3%"
line. Not a cost I would argue with.

**8.4 THE LIVE RANK CHANNEL, ALL BUT ENTIRELY — and this is the one.**

Here is every channel that tells a child where they stand, today, and what is
left of each after §6:

| channel | where | gate | after A + B |
|---|---|---|---|
| the board's own rows | `#board`, continuous, 5Hz | none | **gone (A7)** |
| `👑 YOU ARE IN FRONT!` | `#banner` | rank settled 1.4s, `everBehind`, 6s budget | **gone (B6)** |
| `👑 X TOOK THE LEAD!` | `#banner` | same, shares the 6s budget | **gone (B6)** |
| `👑 you passed X!` | `#banner` | 12s budget, `myRank > 1`, `:4312` | **gone (B7)** |
| a rival's `rankUp` brag | **a chat bubble** | they passed YOU, within 55 units, 12s budget | **survives** |
| the news card | `#news` | — | never carried it — §9.2 |
| the halo colours | world space | — | reports THREAT, not rank |
| the standings | `#endList` | the whistle | survives, and becomes the whole story |

So it is not quite nothing, and the thing that survives is a chat bubble, which
is exactly the channel he said he wanted. But look at what it can say.
`prototype3d.ts:4322` fires only on `myRank > prevRank` — when a sibling passes
**you**. Gaining a place is the branch above it at `:4312`, and B7 deletes it.
**After the patches, losing a place is spoken and gaining one is silent.** A
child who claws from 4th to 1st is told nothing, by anything, until the whistle.

And the surviving channel leaks its own budget: `:4323` sets
`lastRankBrag = tClock` *before* the `dp < 55` test at `:4340`, so a rival who
passes you on the far side of the island burns the twelve-second window and says
nothing at all. The one channel left is throttled by events it does not deliver.

**The fix that stays inside his rule, if he wants one:** give the family a
`passed` pool — three lines each, the mirror of `rankUp` — and speak it from the
overtaken sibling when the player goes past them, in a bubble, on the same
budget. It is new writing, so it belongs to the same crew as items 3 and 5, not
to this one. It is not a window, it is a void talking, and it is the exact
shape of the sentence he wrote.

Take both subtractions in full and with no such addition, there is **no moment
in a match when the game tells a child they are winning.** Not a number, not a
card, not a colour. The information exists — `myRank` is computed five times a
second — and reaches nobody until the results panel.

I am not softening either patch to avoid this. Both are written as he asked and
both are in §6 in full. What I am doing is putting the smallest possible
reinstatement in front of him as **a separate decision with a one-line revert**,
so it is his call and not a crew quietly defending a surface:

> **OWNER CALL.** Keep **B6 only** — the two crown cards, `👑 YOU ARE IN
> FRONT!` and `👑 X TOOK THE LEAD!` — and delete B1-B5, B7 and all of A.
> They fire at most twice per lead change on a 6-second budget, they are the
> only cards in the eight that are *the match talking, not a void talking*,
> and this exact moment was measured **dead** once already and repaired on
> purpose. (That measurement is second-hand and I say so: the comment at
> `prototype3d.ts:4270` reads *"MEASURED DEAD 2026-08-13 (crownprobe.mjs:
> eight settled crossings into 1st, zero crowns)"* — and `qa/crownprobe.mjs`
> is **not in the tree**; `qa/` has only `_crownstatic.mjs`. I did not re-run
> it and I am not treating its number as mine.)

If he says no, delete them; the game is his and the end screen still tells the
story. If he says yes, the file reads exactly as §6 minus the B6 row, and §5.2
becomes optional rather than required.

---

## 9. THINGS I KILLED BEFORE PROPOSING THEM

**9.1 "The void window is the news card printing a void's dialogue."** This is
the most attractive reading, because `docs/NEWSROOM-BRIEF.md:30` describes
exactly that bug and the owner's own words there are that he *"could not tell
whether the news was the town or the void"*. **It is fixed and gone.**
`grep -rn "💬" src/` returns one hit and it is the comment recording the
removal; `rivals.onSpeak` has no `else` branch. Proposing a fix for it would
have been a patch against a build from two weeks ago.

**9.2 "Put the rank in the news card instead."** The plumbing is already there
and deliberately dead: `fillHeadline` passes `rivalName` and `rivalLead` into
every newsroom (`prototype3d.ts:4133`, `:4150`), and every newsroom refuses
them in writing — `newsroom_maple.ts:1091`, `newsroom.ts:844`,
`newsroom_gameday.ts:1079` all carry the same note: *"ctx.rivalName /
ctx.rivalLead are NOT read here, on purpose… Nobody in this town could know
another void's name, so the paper has no way to print one."* The town cannot
be the rank channel without breaking the three-voice rule that the newsroom
brief was written to enforce. Do not re-propose it.

**9.3 "Keep the board but shrink it / fade it / show it only on a lead change."**
I am recording that I considered this and did not write it, because it is the
exact move `docs/OWNER-2026-08-29.md:52` warns against: *"Do not let a crew
answer a 'remove this' with a 'restyle this'."* An auto-hiding board is a board.

**9.4 "The board is how a child knows which void can eat them."** It is not,
and the better channel already ships. `rivals.ts:1904-1923` paints every
rival's ground halo by threat: red when `rv.r > pr * EAT_RATIO`, green when
`pr > rv.r * 1.2`, gold when the chaser is the best meal on the island, and a
strobing red swell for the two seconds of a charge wind-up. That is colour, in
world space, on the object itself, with no reading. The board's `⚡` is a glyph
in a 13px row that has to be found, parsed and mapped back to a void somewhere
on screen.

**9.5 "Removing the board frees the top band, so put something else there."**
No. The frame is the game.

---

## 10. WHAT THIS CREW DID NOT DO

- It did not touch the news card. That is item 3 of the same feedback and it is
  a writing job with its own crew and its own bar.
- It did not touch the crowd's ambient bubbles. He listed them as part of the
  clutter but proposed no subtraction, and the bubble pool is already capped at
  **two** (`createBubbles(camera)` defaults `max = 2`, `prototype3d.ts:1976`) —
  a cap that was itself the answer to a measured pile-up.
- It did not touch the void names (item 5), the growth bar, the clock, the
  wallet or the home button.
- It edited no tracked source. Every number in this file came from a run
  against `dist/` on `:4177`, or from a line of source quoted with its path.
