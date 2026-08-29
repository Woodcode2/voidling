# LANDING — the family's costumes, and the ring that was lying about danger

Round 4, 2026-08-29. Two work orders out of `docs/crews/round-4/void-cast.verdict.md`,
both approved by the owner in `docs/OWNER-2026-08-29.md` ("fix the mismatch,
keep the names"; and on the ring bug he never reported, "fix now").

**Touched: `src/proto3d/rivals.ts` and one new probe, `qa/ringmeaning.mjs`.
Nothing else. Not committed.** `npx tsc --noEmit` clean before and after;
`npm run build` green; the :4177 preview is serving the new `dist/`.

---

## 1. THE PROBE CAME FIRST, AND IT FAILED

`qa/ringmeaning.mjs --authored`, run against `rivals.ts` as it stood, with the
final version of the probe and the final bar (the change was `git stash`ed to
take this):

```
  RING MEANING — bar ΔE 25 (2 x floor 6 from qa/formsep.mjs / rho 0.5)
    WIND-UP  #ff2b3c  if (isHunter && hunting && rv.cst >= 1 && rv.cst <= 2) {
    PRIZE    #ffcf3a  } else if (isHunter && !hunting && rv.r > START_R * 2 && pr > rv.r * 1.05) {
    SAFE     #54e88a  if (pr > rv.r * 1.2) hm.color.setHex(0x54e88a);
    DANGER   #ff5560  else if (rv.r > pr * EAT_RATIO) hm.color.setHex(0xff5560);
    NEUTRAL  rv.color   else hm.color.setHex(rv.color);
  identity colours resolved via sk.rim → FAMILY_SKIN → palette.ts

  MEANING  sibling  colour    WIND-UP   PRIZE    SAFE  DANGER   nearest
           JELLY    #ff4d5e     17.2!   82.5   129.5     3.1!   DANGER 3.1
           BIGSHOT  #fff4ff     95.3    79.8    77.1    77.8    SAFE 77.1
           ECHO     #8ef07a    130.5    60.4    16.6!  119.8    SAFE 16.6
           NIBBLES  #ffd25a     81.1    11.3!   69.3    74.5    PRIZE 11.3
           GRUMPS   #5ee8d8    129.8    89.9    42.2   113.8    SAFE 42.2
  MEANING  FAIL — JELLY … ΔE 3.1 from the DANGER cue (bar 25)
  MEANING  FAIL — ECHO … ΔE 16.6 from the SAFE cue (bar 25)
  MEANING  FAIL — NIBBLES … ΔE 11.3 from the PRIZE cue (bar 25)
  IDENTITY PASS — closest pair is BIGSHOT/GRUMPS at ΔE 48.4, bar 25.

FAIL — 3 ring-channel defects. A six-year-old cannot read this ground.   exit 1
```

Every number reproduces the verdict's exactly — from a probe that parses the
four cue hexes out of the halo block itself and then *follows* `rv.color` →
`sk.rim` → `FAMILY_SKIN` → `palette.ts` rather than carrying a copy of any of
them. It throws rather than guessing if the block gains a fifth meaning, if a
cue stops being a literal, or if the neutral band starts taking its colour from
a shape it does not know how to follow.

### Where the bar came from — derived, not picked

- **FLOOR** is read at run time out of `qa/formsep.mjs`: its own `MIN_DE`, **6**.
  That is the repo's standing answer to "can a child see that this face is not
  that face" for two patches of one prop, adjacent, in the same instant.
- **×2** because this is a *memory* match, not a discrimination: the two
  colours are never on screen together, so the child is comparing a ring in
  front of them against a meaning learned minutes ago. That factor is a
  judgement and the probe's header says so in those words. Nothing in this repo
  measures it.
- **÷RHO** because the pipeline compresses — and that half is measured, below.
  `RHO_ASSUMED = 0.50`, deliberately below every pair measured.
- `BAR = 2 × 6 / 0.50 = 24`, rounded up to **25**.

---

## 2. ORDER 1 — THE CASTING, RE-DEALT

`src/proto3d/rivals.ts:463-469` on disk before the change. The verdict's anchor
is exact:

```ts
  const FAMILY_SKIN: Record<string, string> = {
    JELLY: 'shadowninja', BIGSHOT: 'univoid', ECHO: 'rexling',
    NIBBLES: 'kingvoid', GRUMPS: 'drako',
  };
```

### The actors, read before casting them

What a child actually sees — the props from `void3d.ts:2285` `buildAccessory`,
the bodies from `palette.ts:256-263`. Noting one thing that constrains the whole
job: rivals get the body **colours and pattern only**. `applySkinToBody`
(`void3d.ts:484`) never reads the `char` rig, so none of them gets its shop-card
face, its aura, its mane, snout or muzzle. The costume is the accessory plus a
gradient.

| costume | what is on screen | what it says |
|---|---|---|
| **univoid** | a spiral rainbow horn 1.22 body-radii tall, two soft lathe ears with pink inners; pearl-white body, pink glow, fur pattern | sparkly, precious, harmless, *look at me* |
| **kingvoid** | a tilted gold five-point crown set with purple amethysts; near-black body, purple nebula heart, gold rim | the boss, royalty, the biggest deal here |
| **drako** | folded teal wings at the shoulders, two gold horns, a pale belly plate; teal-blue scaled body | fierce, ancient, powerful — the one that could eat you |
| **rexling** | six alternating green-and-gold dorsal plates down the back, two brow horns; green scaled body | a slow plated grazer; prehistoric, cranky, not fast |
| **shadowninja** | a red headband with a knot and two flowing tails behind; near-black body, stitch pattern | dark, quiet, always behind you |

And the five behaviours, read out of the code rather than the comments above it:

- **NIBBLES — BULLY.** Prowls the player's own block (`reach 85`), winds up,
  lunges, bites, gloats. The only sibling that can take a form off you.
- **BIGSHOT — SHOWOFF.** `bigHunger = 1` — size beats distance, so he crosses
  the whole island for the biggest thing on it.
- **JELLY — COWARD.** Bolts at `pr > rv.r * 1.02` from `pr + rv.r * 4.5`, four
  and a half times anyone else's flee radius, and runs from the family too. The
  code's own line: *"You can name him from the far side of a street."*
- **ECHO — COPYCAT.** Drives the player's own breadcrumb trail about four
  seconds behind, eating what you drove past.
- **GRUMPS — HOARDER.** Half everyone else's cruising speed (16 against 25-27),
  working a drifting patch.

> **A correction I made in passing.** Two comments in `rivals.ts` still
> described GRUMPS as camping one district and never leaving it. The camp was
> deleted — the file's own target-picker records the five attempts and why —
> and he is now simply the slow one. The verdict's phrase "a dragon called
> Grumps who won't move" was quoting that dead comment. The mismatch is real
> either way, but a costume cast against a comment that lies about the code is
> how this happens twice, so both lines now say what the code does.

### The re-deal

| sibling | was | now | why, in one line |
|---|---|---|---|
| **NIBBLES** BULLY | kingvoid | **drako** | the only sibling that can eat you wears the only costume that looks like it might; the sweetest name in the family on the fiercest body is the same joke, finally told with a picture |
| **BIGSHOT** SHOWOFF | univoid | **kingvoid** | a gold crown *is* "I am the biggest deal on this island", and crossing the map for the biggest thing on it is literally his target rule |
| **JELLY** COWARD | shadowninja | **univoid** | the harmless one a child is meant to CHASE now looks harmless — pastel, soft-eared, pink-glowing — and the sibling you must name from across a street gets the family's one long-range silhouette |
| **ECHO** COPYCAT | rexling | **shadowninja** | the skin is called SHADOW, and a shadow is exactly what a copycat is: the dark one always behind you, driving the route you drove four seconds ago |
| **GRUMPS** HOARDER | drako | **rexling** | a plated back and brow horns read as a slow grazer, not a runner — the right body for the one who moves at half speed |

### The rule the deal was made on

Not "which costume is funniest". **How dangerous a costume LOOKS has to track
how dangerous the sibling IS.** The costume is on screen for the whole match and
a six-year-old reads a picture before it reads a ring, so the fiercest body
belongs on the only sibling that can hurt them and the softest on the one they
are supposed to chase. The old deal had that inverted twice over: the dragon on
the sibling who ambles at half speed, the ninja on the one who runs away.

JELLY's horn has a second, colder justification. The verdict's silhouette shoot
found that Uni-Void is the **one** costume of five that still has an outline at
32 px, because its accessory changes the silhouette at the scale of the body
rather than decorating the pole of a sphere. JELLY is also, by four and a half
times, the sibling most often seen far away. The one long-range costume now sits
on the one long-range character.

### Two calls that go beyond the verdict's three — flagged, not buried

The verdict named JELLY, ECHO and GRUMPS and said NIBBLES passes. **NIBBLES and
BIGSHOT moved too.** That is a decision, it is one string each to put back, and
here is the reasoning so it can be overturned cheaply:

With NIBBLES and BIGSHOT pinned, the three remaining costumes can only be dealt
to the three remaining siblings two ways, and both are worse than what they
replace — one puts the ninja on the grandpa who never hurries and the dragon on
the baby; the other puts the dragon on the coward. **Every good deal in the set
needs the dragon on the BULLY**, and once it moves, the crown lands where it
belongs anyway.

What the verdict praised is untouched: NIBBLES is still the apex predator with
the sweetest name in the family. What changed is that the picture now agrees.
There is a second gain, and it is Order 2's: the crown's gold rim comes OFF the
one sibling whose ground ring turns PRIZE gold.

### The weakest fit, stated rather than hidden

**GRUMPS / rexling.** The picture is right — a slow plated grazer — but the shop
sells that costume as **"Rexling"**, which says *little rex* where the sibling
says *old*. The product name is in `palette.ts`, which this work order does not
open, and renaming a $2.99 character is an owner call, not a casting one.

The other four agree on all three axes — name, picture, behaviour. Nothing in
the set had to be forced, and no sibling was left without a costume that fits.

### The cost

**Zero triangles, zero draw calls, zero seeded draws.**

- The **set** of skins built is unchanged. `makeRivalMesh(sk)` builds from `sk`
  alone and the five `sk` objects are the same five in a different order, so the
  multiset of meshes, materials and accessories is identical. That is an
  argument from construction, not a measurement — what is *measured* is the
  invariant that makes it true, and it now has a gate:
  `COSTUME PASS — 5 siblings, 5 legendaries, a bijection.` A future re-deal that
  drops a costume, doubles one up, or reaches for a non-legendary skin fails.
- **Seeded draws: 0.** `grep -c "mrnd\|mpick\|mchance\|\bmr(" src/proto3d/rivals.ts`
  → `0`, run here rather than quoted. No authored Maple placement can move.

---

## 3. ORDER 2 — THE RING WAS LYING ABOUT DANGER

### What the bug actually was

`rivals.ts:1904-1922`, verified on disk. Four meanings and a fallback:

```
0xff2b3c  wind-up red   the bully is charging
0xffcf3a  prize gold    the best meal on the island
0x54e88a  safe green    you can eat this one
0xff5560  danger red    this one can eat you
rv.color  the sibling's own colour — the fair fight
```

`rv.color` was `sk.rim`: **a shop palette, authored to match five product cards,
used as a safety signal without ever being measured against the four things the
signal means.** That is the cause and it is one line.

The blast radius is wider than the halo. `rv.color` is the sibling's identity
everywhere: the LOOK ring (`onNotice`), the SURGE ring (`onSurge`), the dot on
the join banner (`announceJoin`), the dot on the leaderboard row, and the chip
on its speech bubble. Both of those fx rings carry a comment in `prototype3d.ts`
promising **"no red — red means dodge NOW and belongs to the charge alone"** —
while JELLY's own colour was `#ff4d5e`. The rule was written and the data broke
it. The same one-line fix closes that too.

### The fix

A `FAMILY_INK` table in `rivals.ts`, authored beside the cue colours it has to
stay away from, and `roster.push({ … color: FAMILY_INK[nm] … })`. Smallest
change that removes the CAUSE: the identity colour stops coming from a palette
that was never asked this question.

| sibling | ink | tie to the costume |
|---|---|---|
| JELLY | `#ff8fd0` | the unicorn's own pink glow |
| BIGSHOT | `#b96bff` | the amethysts set in the crown |
| ECHO | `#1ac6ff` | electric blue, the one thing that reads off a black body |
| NIBBLES | `#5ee8d8` | the dragon's own teal |
| GRUMPS | `#9ea0fa` | faded periwinkle — **not** green, because green is SAFE |

They are all **cool** on purpose. "Not red, not gold, not green" reads as *the
fair fight* before a child has learned which sibling is which, so the channel
still carries its meaning for a player who has memorised nothing. And none of
them is near white (min ΔE 44.0 measured), because a white ring at a rival's
feet is already the NEAR MISS flash.

### Both distances, which is what was asked — AUTHORED

`node qa/ringmeaning.mjs --authored`, after:

```
  MEANING  sibling  colour    WIND-UP   PRIZE    SAFE  DANGER   nearest
           JELLY    #ff8fd0     67.3   101.9   120.7    49.3    DANGER 49.3
           BIGSHOT  #b96bff    108.6   149.4   153.4    92.8    DANGER 92.8
           ECHO     #1ac6ff    129.3   116.9    83.7   111.1    SAFE 83.7
           NIBBLES  #5ee8d8    129.8    89.9    42.2   113.8    SAFE 42.2
           GRUMPS   #9ea0fa    106.6   122.2   113.5    88.2    DANGER 88.2
  MEANING  PASS — closest any sibling comes to a cue is ΔE 42.2, bar 25.
  IDENTITY PASS — closest pair is ECHO/GRUMPS at ΔE 41.6, bar 25.
```

- **Constraint 1, MEANING:** worst is **NIBBLES at ΔE 42.2 from SAFE green**
  (was JELLY at 3.1 from DANGER red). Seven times the ΔE 6 floor.
- **Constraint 2, IDENTITY:** worst pair is **ECHO/GRUMPS at ΔE 41.6** (was
  48.4 — the old rims were further apart from each other, because being far
  apart from each other was the only thing they had ever been chosen for).

Both were solved together rather than in sequence: I searched the colour space
under all of them at once — ≥ 40 from every cue, ≥ 40 from white, a lightness
floor on the search grid so a ring still reads on Lantern's near-black ground
(the five land at L\* 60, 69, 73, 75, 85), and a hue window per sibling taken
from the costume it now wears. A 400,000-sample random search over
that grid tops out at **min 43.3**; the hand-picked set that also has to *look
like the character* lands at **41.6**. So the set is within 4% of the achievable
ceiling, and the ceiling is low because four hue families (pink, violet, blue,
teal) have to hold five siblings once red, gold, green and white are spoken for.

The control the probe prints matters here: **the cue colours' own closest pair
is WIND-UP/DANGER at ΔE 18.8**, and that is not a defect. Both of those mean
RUN; they are deliberately one colour in two shades.

### Both distances — RENDERED, which is a different claim

Authored albedo is not a photograph, and the verdict said so about its own
table. So the probe also takes the **real halo of a real rival in a real Maple
match**, freezes it in world space, repaints it with each of the nine colours in
turn, and **screenshots the canvas** — never a render target, because
three@0.185.1 forces `NoToneMapping` on a `WebGLRenderTarget` and a probe that
rendered into its own target would be measuring a pipeline with no ACES, no toe,
no exposure and no sRGB encode.

Final run, GRUMPS's ring, 149 mask pixels, ring opacity 0.85 over real ground:

```
  WIND-UP #ff2b3c→rgb(204, 53, 44)      JELLY   #ff8fd0→rgb(202,117,174)
  PRIZE   #ffcf3a→rgb(201,171, 47)      BIGSHOT #b96bff→rgb(151, 80,205)
  SAFE    #54e88a→rgb( 77,187,115)      ECHO    #1ac6ff→rgb( 49,163,202)
  DANGER  #ff5560→rgb(206, 79, 73)      NIBBLES #5ee8d8→rgb(102,187,177)
                                        GRUMPS  #9ea0fa→rgb(131,141,200)
  mask stability across the whole shoot: median 8, p90 37 (of 255)
  rho over 36 pairs: min 0.65 (NIBBLES/GRUMPS, ΔE 75.8→49.4), median 0.81,
                     max 1.15 (BIGSHOT/GRUMPS)
  worst sibling-vs-meaning pair on screen: SAFE/NIBBLES at ΔE 36.0 rendered
                     (42.2 authored), floor 6
  PASS
```

Each sibling against its nearest meaning **as rendered**, arithmetic on those
measured pixels:

| sibling | nearest meaning, on screen | ΔE rendered | ΔE authored |
|---|---|---|---|
| NIBBLES | SAFE | **36.0** | 42.2 |
| JELLY | DANGER | 47.7 | 49.3 |
| ECHO | SAFE | 63.7 | 83.7 |
| GRUMPS | DANGER | 73.8 | 88.2 |
| BIGSHOT | DANGER | 83.5 | 92.8 |

An earlier, independent shoot of a *different* sibling's ring over a *different*
patch of ground (ECHO's, 879 mask px) gave min ρ 0.62, median 0.83, and the same
worst pair at **ΔE 34.6**. Two shoots, two rings, two grounds, agreeing inside
1.4 ΔE is the strongest thing in this document.

**Compression is real but it is not universal:** median ρ 0.81, and one pair
came back **15% wider** on screen than authored. So "the rendered ΔE is
necessarily smaller than the authored one" — which the verdict offered as a
reason its own table understated the problem — is not quite right as stated. The
direction is right on average; it is not a rule.

The pre-fix build's rendered numbers were **not** captured: the rendered half of
the probe only started working after the fix had landed (the instrument history
is below), and rebuilding backwards to photograph a ring whose authored distance
is already 3.1 — half the floor before any pipeline touches it — was not worth
the twenty minutes. That is a gap and it is stated as one.

### One more thing the probe proves, and it is not a ΔE

It samples every hex the **running** game paints on a ring, and requires each to
be one of the nine the source read accounts for. After the fix that set contains
`#5ee8d8` — NIBBLES's ink — so `FAMILY_INK` is demonstrably reaching the shipped
bundle and not merely the source file. Before the fix the same check returned
`#54e88a #ffd25a #ff5560`, all accounted for by the old table.

---

## 4. THE INSTRUMENT'S OWN HISTORY

Recorded because rule 3b asks for it in writing, and because every one of these
was a number that moved for the wrong reason.

1. **A fixed drift bar rejected 95% of a real ring** — 53 px of 1090. It assumed
   the world holds still between two screenshots, and under a software renderer
   a screenshot takes seconds during which everything keeps moving. Replaced by
   a ratio test: a ring pixel is one that moves *much* further when the ring
   appears than it moves on its own.
2. **One probe colour silently selected for ground that contrasted with it.**
   A white ring over pale pavement barely changes a pixel. Now white *and*
   black, larger response wins.
3. **`matrixAutoUpdate = false` freezes the matrix, not the fields.** The game
   kept writing `halo.position` every frame, so the probe was projecting where
   the rival *now is* while photographing where the ring *still is*. This is the
   one that mattered: it is why a 1,426-point band yielded 92 pixels, and then
   none at all. The frozen transform is captured in the same breath as the
   freeze now.
4. **The camera drifted through the shoot and nobody was watching.** Nothing was
   driving, but the void keeps residual velocity and the shore eases it inland,
   so by the fourth colour the mask was sampling grass — the run reported
   `rgb(178,180,86)` for a RED ring and a ρ of 0.06, and it reported it in a
   confident table. Fixed by re-snapping the camera before every shot, and
   **caught** by a new end-of-shoot check that re-photographs bare ground and
   compares it to the start over the same pixels (median 8 of 255 on the final
   run). A probe that cannot detect this failure would have published that ρ.
5. **The first framing attempt looked for rings 16-34 units to the SIDE** of the
   player and found nothing in frame, three times. The camera is a 32-degree
   *vertical* lens on a portrait viewport: the horizontal half-angle is 8.7
   degrees, about 11 world units at this follow distance. Sideways is the one
   direction with no room in it.
6. **The second attempt settled for 30 frames before looking.** `dt` is capped
   at 0.05, so 30 frames is exactly 1.5 MATCH seconds however slow the renderer
   is, and a rival cruising at 25 u/s covers 37 units in that — out of an
   11-unit window. It measured rings at NDC x −1.5, −2.2 and −4.5.

---

## 5. WHAT I DID NOT ESTABLISH

- **No child has read either version.** Every number here is colorimetric. ΔE is
  a distance between colours, not a measurement of whether a six-year-old reads
  the right instruction off a ring while steering.
- **The casting is a judgement and cannot be measured.** "Does this picture
  agree with this name" has no probe. What is measured is the invariant that
  makes the re-deal free and the fact that it moves no seeded draw. Any of the
  five is one string to overturn.
- **The rendered pass samples one world, one ground patch per shoot, one camera
  distance.** ρ has a spread over ground albedo that two shoots do not map.
- **The BODIES are untouched, and one of them is worth a look.** ECHO now wears
  `shadowninja`, whose rim is `#ff4d5e` and whose glow sprite is `#ff7a8a`, so
  the harmless baby has a red-lit body while its ring is blue. That is the same
  class of mistake one layer out — a shop palette doing a game's signalling — and
  it lives in `palette.ts`, which this work order does not open. Before the
  change the same red body belonged to JELLY, so nothing got worse; it moved.
- **The family still all wear one face.** The verdict's §2b stands untouched:
  `applySkinToBody` writes body colours only, so the fierce eyes sold on the shop
  card still never reach a match. Separate work order.
- **The dead `idx % 5` personality props are still dead** (verdict §2a). Not
  wired, not deleted. Separate work order.
- **I did not photograph the old casting against the new.** A frame cannot tell
  you which rival is which without a label, so a side-by-side would prove
  nothing that the table above does not.
- **`qa/gate.mjs` does not know about this probe.** Adding it is a one-line edit
  to a file this work order may not touch.

---

## 6. HOW TO OVERTURN ANY OF IT

Every decision here is one string.

- A costume: change its entry in `FAMILY_SKIN` and swap the sibling it traded
  with. `qa/ringmeaning.mjs` fails if the result is not a bijection.
- A colour: change its entry in `FAMILY_INK` and run `node qa/ringmeaning.mjs
  --authored`, which takes under a second and will tell you which of the two
  constraints you broke.
- The bar: it is `2 × FLOOR / RHO_ASSUMED` with FLOOR read live from
  `qa/formsep.mjs`. Move `RHO_ASSUMED` and the bar moves with it — and the
  rendered pass will fail if you move it above what the pipeline actually does.
