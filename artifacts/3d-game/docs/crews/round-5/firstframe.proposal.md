# VERDICT: SOUND WITH CORRECTIONS — the first frame (Stream D), 2026-09-03

Owner, brief §2D: "Nobody has ever art-directed the establishing shot, because everyone
believed it used the gameplay camera. It does not. It is the first thing a player sees, the
frame an ad opens on, and it is currently unreviewed. Shoot it in all five worlds across its
swing and judge it. Also: the splash screen's 'THE CUTE' line is low-contrast against the
artwork behind it, and the title appears twice in that frame."

Method: instrument first, then the studio, then the governor. `qa/firstframe.mjs` shoots the
opening move at six moments per world (u100 → settled, and five more on a first-ever run),
as the PAGE the child sees and as the CANVAS alone, stamped in match seconds; and the two
screens before it at seven viewports, measuring every line of type against the real pixels
behind its glyphs. Every number below is from a run named here.

## How the studio ran, and what stopped it

Seventeen agents: five establishing-shot cinematographers (one per world), TEAM UI on the
splash, CHOREOGRAPHY carrying PLAY's question, TEAM HERO, a skeptic on each, art direction,
and the order of work. **It reached 7 of 8 reviews and then hit the account's session limit;
a continuation run refuted five of them and then ran out of usage credits.** What survived:
eight reviews and five skeptics, each pushed to the branch by its own author the moment it
was written (`qa/_record.sh`) — the rule from this round's launch, when fifteen agents died
at a limit with nothing on disk. Nothing was lost this time.

The three unrefuted reviews (splash, choreography, hero) were refuted by the governor
instead: every cited line opened and checked. All three hold. The corrections are noted
where they change the fix.

## What was wrong, and what landed

### 1. Pirate Bay's establishing shot held on a hotel that no longer existed (BLOCKER)
The Pirate cinematographer read the frame, not the code: at u100 the centre of the shot is
sand, a food truck and three palms. The code holds the subject on the Royal Mariner at
(127, −115) for the first quarter of the move.

`qa/_bigprops.mjs` asked the scene: **six of Pirate's thirteen r≥7 props survived the boot
passes**. The Royal Mariner (r10), the fort, the lighthouse and four more were retired the
instant a match started. `qa/_islandtest.mjs` ruled out the off-island cull — every one of
them is inside the island by the same test. The cause is `settleFootprints()`'s tie-break,
landed by this round's own placement stream: when two footprints clash it retires *whichever
was dropped later*, and Pirate scatters its resort palms (island.ts:6406) **before** it drops
the hotel (:6408).

Fix (f6c210b): a forced drop — the landmark path in all four island worlds — marks
`userData.authored`, and the tie-break never retires an authored landmark.
Paired SEED=7 placement runs, one build apart: overlap 52 → 56, under 30 → 31, clutter 77 →
71, inside and road unchanged (`firstframe-data/landmark-fix-placement.txt`). Four more
footprint overlaps against restored landmarks, and seven landmarks that exist.
Probe: `qa/_bigprops.mjs` (6 of 13 before, 13 of 13 after), `qa/_heroprop.mjs` (Pirate FAIL
before, PASS after).

### 2. The splash printed the game's name twice (BLOCKER — the owner's words)
`index.html` paints `THE CUTE / WORLD ENDER` as the loader's wordmark and
`prototype3d.ts:1490` filled the line beneath it with `THE CUTE WORLD ENDER` again, in
yellow, on every launch after the first. The line now carries the menu's own tag,
`STARRING THE VOIDLINGS`, and keeps its yellow world-name styling on the path where a world
really is being entered. Probe: the doubled-name assertion in `qa/firstframe.mjs`, which
fails on the old build and passes on the new one.

### 3. "THE CUTE" was unreadable on every phone shorter than the test rig (BLOCKER — his words)
Measured against the pixels behind the glyphs, p10 = the worst tenth of glyph pixels,
bar 4.5:1 for 12px text:

| viewport | before | after |
|---|---|---|
| 430×932 | 7.04 | 9.85 |
| 440×956 | 7.53 | 10.52 |
| 440×814 | **3.51** | 10.50 |
| 430×740 | **3.54** | 10.49 |
| 393×700 | **1.82** | 9.88 |
| 375×667 | **1.09** | 8.16 |
| the owner's own frame | **1.72** (median 3.46) | — |

The mechanism: both screens place the key art at `13vh` and the loader's lockup was anchored
to the BOTTOM, so on a short viewport the type landed on the void's face — and iOS Safari
resolves `vh` to the large viewport, which is why his phone was worse than any of our
renders. The lockup now sits at the top at the menu's exact spec, so the loader and the menu
are one frame across the crossfade, and a tighter block covers every phone under 900 tall
(the loader's second line was landing on the lit skyline at 440×814, 2.90:1, and 430×740,
1.14:1 — both now over 12:1). The key art itself is untouched; it is approved.

### 4. The HUD was live over the whole establishing shot (all five cinematographers)
At the first frame a child sees, the clock read 3:00 over the county fair, the coin chip and
home button sat on it, and an empty growth bar ran across the bottom — on the one frame an ad
opens on. `body.intro` is now set for exactly the length of the move and the HUD fades up as
the controls go live. Census on the first-ever run: HUD opacity 0 at u100/u75/u50/u25, 1
from u0.

### 5. The title card sat on the subject, and outlived the shot (all five, plus HERO)
It was centred — on the exact pixels the dive delivers the void to, and where the drag hand's
loop is drawn — and its fade is a 4.2 s WALL-clock animation against an opening move of
2.2–3.6 s, so on a phone the name is still at full opacity 0.8 s after the controls go live.
The card now rides the upper third (its scrim with it) and its duration is driven from the
world's own `introLen + 0.45`, so it leaves as the camera settles. The ghost hand waits
0.45 s after that, giving the MK8D order: card, settle, teach. Census: hand 0 at u0, 1 at
u0+0.5.
The card's timing cannot be photographed here — the match clock runs 14–40× slow under the
software renderer, so four wall-seconds pass inside half a match-second and every sampled
frame reads opacity 0. The probe therefore checks the duration from the DOM against that
world's `introLen`, which is deterministic.

### 6. The crowd talked over the cinematic (four worlds)
`chatCd` starts at 2 s, so the first ambient line landed at 2.0 match-seconds on every world
— inside the shot on all five, from a camera 50–100 units up where the speaker is a speck.
`life.calm()` now also holds ambient chatter, and the match calls it for `introLen + 1.2`
rather than a flat 4 s that Lantern's 3.6 s shot outlived. Census: 0 bubbles through the
whole move; the first appears 1.3 s after the controls.
Correction to the review: `calm(Infinity)` is called at match end, so the cooldown takes a
finite value only — otherwise the crowd would be silenced for every later match.

### 7. The loading bar read 0% for the entire world build (TEAM UI)
The bar was written only by the asset pack's callback, which starts after the island exists.
The owner's own screenshot shows 0% under "Waking the void family…", the LAST stage. The
boot stages now own 0–60 (the island's fourteen seams walk 6→20) and the pack owns 60–100.
Measured on a first-ever run: **five distinct values (15, 22, 42, 58, 100) against one before.**

## What I did not do, and why

- **The clock runs during the shot** (2.6–3.9 s of a 180 s match). Real, and it is TEAM PLAY's
  call, not art direction's: every rival's join is keyed to `matchElapsed()`. Filed, not touched.
- **The first touch is taxed** — the controls are damped for the whole move, so a child who
  drags at 0.4 s gets nothing. The choreography review proposes ending the shot on the first
  touch (a 3× intro clock). It is the right idea and it changes how the game feels in its
  first second, so it wants the owner's eye, not a governor's patch at midnight.
- **Powder's shadows snap on in one frame** as the controls go live, on a still camera. Real
  (the intro turns shadows off to pay for a 4,694-draw-call frame and restores them at
  `introT ≤ 0`). Cheap to mask by restoring them mid-dive; not tonight.
- **Frame one has no subject on Maple** (`hero: null` — it opens on the void at camDist 300,
  a 15px dot). Two cinematographers and the hero team filed it; both skeptics called it an
  experiment rather than a defect. It is a real question for the owner: Maple is the first
  world a child sees.
- **The taglines** ("the little void is hungry · eat the town") put the verb last, at 16px,
  under a 62px name. The review's verb-first rewrite is a copy change the owner should read.
- **A rendered wordmark** (an SVG lockup with its own outline) would make the contrast
  question moot at every viewport forever. New art, so it is the owner's call.

## What I could not verify

- **Anything about the card ON the picture.** The pack cannot photograph a wall-clock
  animation against a slow match clock; the relationship is checked from the DOM instead.
- **iOS Safari's `vh`.** Our renders reproduce the failure geometrically at 393×700 and
  440×814, and the owner's own frame measures the same way, but nothing here runs iOS.
  The TEAM UI review proposes an injected-`vh` view in the probe as the standing check.
- **The first-ever run on the other four worlds** — only Maple was shot with `--first`.
- **The re-shot pack's own frames** are the record for worlds 2–5; the numbers land with them.
