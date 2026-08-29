# VERDICT — void-cast: can the void siblings be a franchise cast?

Skeptic, round 4, 2026-08-29.

**VERDICT: NO NEW CAST WORK. And "better names on unchanged spheres" is also
refused — that is what round 2 already shipped, and the owner's complaint came
back seven days later in the same words.**

The cast the proposal would build **already exists and already ships**. Five
fixed characters, five permanent costumes, five archetypes, five voice sets,
one rival object per name, never re-cast between matches. Nobody has to build
it. What is wrong with it is not that it is missing; it is that three parts of
it are **broken in ways that cost gameplay legibility**, and one of them puts
the game's own DANGER colour on its most harmless character.

---

## 0. THE PROPOSAL DOES NOT EXIST

`docs/crews/round-4/void-cast.proposal.md` **was never written.** Nothing on
this filesystem matches `void-cast*` except the workflow script itself
(`/root/.claude/projects/.../workflows/scripts/void-cast-wf_a8c860c2-21c.js`),
`git status` is clean, and the design phase's own summary handed to me was the
empty object `{}`.

So there is no designer's silhouette answer to accuse of flattery, no costing
to check, and no cast list to say out loud. I ran the five tests against the
real code and the shipped frames instead, and the answers below are mine.
**Nothing in this file is a refutation of a document; it is a first pass.**
Whoever reads it should treat it as unrefuted — I have had no adversary.

---

## 1. THE SILHOUETTE TEST — RUN, WITH MY OWN IMAGES

### What I shot

I did **not** trust an in-world screenshot for a shape question, and my live
probe died anyway (below). I used `store/07-skins.png` — the shipped App Store
screenshot of the five legendary skins, which **are** the five siblings'
costumes (`rivals.ts:463-472`). This is the *friendliest possible* frame for
the proposal: five characters isolated on a flat panel, ~220 device px each,
no world behind them, no motion, no occlusion, no ground ring. **A cast that
fails here fails everywhere.**

Two images, both reproducible:

```
node .../silhouette.mjs store/07-skins.png \
  '[[110,1205,230,240,"univoid"],[525,1205,230,240,"rexling"],[939,1205,230,240,"kingvoid"],
    [110,1778,230,240,"drako"],[525,1778,230,240,"ninja"]]' '[240,48,32,20,12]' sil2.png
```

`sil2.png` — pure silhouette (per-card polarity-adaptive threshold off the
card's own panel colour, so the dark Shadow Ninja is not inverted), five
columns, rows at 240 / 48 / **32** / 20 / 12 px.
`cards_ladder.png` — the same crops in full colour at 160 / 32 / 16 / 8 px.

### What it showed

**At 32 px, one of five has a silhouette. The other four are the same ball
with a different bump on the north pole.**

| | at 32 px, shape only | verdict |
|---|---|---|
| **Uni-Void** (BIGSHOT) | ball + a tall thin spike that roughly doubles the height, plus two ears | **PASSES.** A real outline. |
| **Rexling** (ECHO) | ball + three low nubs | fails — reads as a plain ball |
| **King Void** (NIBBLES) | ball + three low points | fails |
| **Drako** (GRUMPS) | ball + two low points | fails — **and is not separable from King Void** |
| **Shadow Ninja** (JELLY) | ball + an internal light/dark break | fails as a *silhouette*; it separates only by TONE, which is not a silhouette and which dies against a dark world |

At 20 px, only Uni-Void survives. At 12 px all five are discs.

### The reason, and it is structural

Uni-Void works for exactly one reason: **its accessory changes the outline at
the scale of the body.** The horn is ~1.2 body-radii tall (`void3d.ts:2287`,
`spiralHorn(1.22, 0.185, 3.0)`). Every other signature is a decoration sitting
on the pole of a unit sphere, and at 32 px the pole is four pixels.

Which gives the rule that decides the whole question:

> **Angry Birds' birds differ in BODY. Red is a rounded triangle, Chuck is a
> wedge, Bomb is a big black sphere, Matilda is a tall egg, the Blues are
> tiny. Not one of them is distinguished by headwear.**

And the void siblings **cannot** differ in body, because in this game the body
IS the rule. Radius = who can eat whom (`rivals.ts:202`, `EAT_RATIO = 1.11`).
A child must read a void's size instantly and compare it to their own. Change
the outline enough to make five silhouettes and you have broken the one read
the game cannot lose. **The single lever that would make this a cast is the
one lever this game is not allowed to pull.**

That is not a taste objection. It is the mechanic refusing the branding.

### Two shape metrics I ran and am RETRACTING before anyone uses them

I tried to put a number on it twice and both numbers move for the wrong reason.
Recording them so nobody re-derives them and believes them:

- **Pairwise IoU on bounding-box-normalised masks** (worst pair 0.83). Junk:
  a circle inside a square scores 0.79 by construction, so 0.83 does not mean
  "confusable", it means "both are mostly disc". Also, normalising each blob to
  its own bbox *stretches* Uni-Void's horn away.
- **"Shared core" area** (37–53% "signature"). Same normalisation artefact,
  and it flatters the proposal badly.
- Centroid-aligned, un-rescaled IoU has one honest row in it — the **control**:
  each measurable sibling scores **0.67–0.79 IoU against a featureless disc of
  the same radius**. Every character resembles a plain ball more than it
  resembles any sibling. That is the only number here I would defend, and even
  it is an area statistic on a shape question.

**The evidence for section 1 is the picture, not the arithmetic.** Look at
`sil2.png` row 3. That is the finding.

### The bar itself needs splitting — a correction to the brief

The "32 pixels" bar is imported from a 2D franchise's icon/plush/thumbnail
context. It is the right bar for **branding** and the wrong bar for **in-game
legibility**, and conflating them is how this round would produce the wrong
work order.

From the real camera law — `prototype3d.ts:9268`,
`targetDist = min(340, max(26, 38 · (R/0.9)^0.82))`, `prototype3d.ts:585`,
`PerspectiveCamera(32, …)` — on a 430×932 viewport at DPR 3, a rival standing
near the player is:

| player R | camDist | rival r (cap floor 0.80·R) | on-screen diameter |
|---|---|---|---|
| 0.9 (spawn) | 38 | 0.9 | ~231 device px (77 css) |
| 3 | 101 | 2.4 | ~232 device px (77 css) |
| 8 | 225 | 6.4 | ~278 device px (93 css) |

Near-constant by design: the camera pulls back as everything grows. Checked
against a real shipped frame — in `qa/out/lookpair/maple_look.png` (860×1864,
DPR 2, shot 2026-08-28 21:01 against the current build) NIBBLES measures
~235 device px across, which back-solves to r≈1.6 at d≈45, exactly the
`min(START_R + 0.02t, 1.6)` cap. The arithmetic and the photograph agree.

So: **at conversational range a rival is a fifth of the screen wide, not 32
pixels.** The ~32 px regime is a rival roughly three camera-distances away —
"who is that over there, and will it eat me?" — which is a real and important
range, and it is precisely the range at which the ground ring, not the
accessory, is doing all the work. See section 5.

---

## 2. THE MACHINERY CLAIM — half right, and the half that is right is not the
   half the brief names

**Can a rival wear a hat today? NO. `hatgeo` is hero-only, and that is a hard
fact from the code.** `buildHat` is imported once (`void3d.ts:9`) and called
once, inside `setHat` (`void3d.ts:1648-1657`), which is a method on the object
returned by `createVoid()` (`void3d.ts:591`) — the player's void. `rivals.ts`
imports exactly three things from `void3d` (`rivals.ts:8`):
`buildAccessory`, `makeVoidBody`, `applySkinToBody`. It never calls
`createVoid`, never sees `setHat`, and there is no hat anchor, no `hatLean`
yaw-tracking and no `HAT_MAX_W` clamp anywhere in the rival path. **A shop hat
on a rival is new plumbing, and any costing that assumes otherwise is wrong.**

**But the brief's premise — "the machinery for visual difference already
exists" — is right for a different reason, and understates it.** The *skin
accessory* rig already runs per-rival and is already fixed per sibling,
permanently:

```
rivals.ts:463   JELLY: 'shadowninja', BIGSHOT: 'univoid', ECHO: 'rexling',
                NIBBLES: 'kingvoid',  GRUMPS: 'drako'
rivals.ts:315   if (sk.acc) group.add(buildAccessory(sk.acc));
```

with the comment above it already stating the design intent in full: *"FIXED
CASTING… so a kid learns 'the sparkly unicorn is Uncle Glitz' instead of
meeting five strangers in new costumes every match. Recognition is the whole
point."* Someone has already had this idea, argued it, and shipped it — and
the ledger records that they also fixed the bug where rematches swapped the
costumes between siblings.

### Three findings the machinery read turns up

**(a) The "cheapest credible version" is already written, and it is DEAD CODE.**
`rivals.ts:353-381` contains a five-way `idx % 5` ladder of hand-authored
personality accessories — a sweat drop for JELLY, star shades for BIGSHOT, a
baby hair-curl for ECHO, a tilted gold crown for NIBBLES, a floppy nightcap
and pom-pom for GRUMPS. **None of them has ever rendered.** The branch above
them, `rivals.ts:352`, is `if (sk.acc) { /* legendary accessory IS the look */ }`,
and `skinFor` (`rivals.ts:471-472`) is
`SKINS.find(...) ?? SKINS.filter((s) => s.acc)[0]` — the fallback is itself
filtered to skins that HAVE an accessory, so `sk.acc` is truthy for every
rival on every path. Roughly 30 lines and five authored props that no player
has ever seen. Any proposal whose cheap version is "give each sibling a
signature accessory" is proposing something the repo has already built twice.

**(b) The face — the hero's best asset, per the brief — is the one thing the
family does NOT get.** `palette.ts:256-263` authors a per-skin CHARACTER RIG:
`eyes: 'star' | 'fierce' | 'glow'`, an aura kind (`stars`/`bubbles`/`embers`/
`bolts`), and a narrowed predator pupil. All of it is applied inside
`createVoid` at `void3d.ts:1750-1770` (`pupilSquash = eyeMode === 'fierce' ? 0.72 : 1`).
What rivals call is `applySkinToBody` (`void3d.ts:484-495`), which writes only
`uAbyss/uInner/uMid/uRim/uSwirl/uGloss/uPat/uPatCol` — **body colours and
pattern, and nothing else.**

So every sibling wears the *identical* face, hard-coded in `makeRivalMesh`:
the same 0.20 sclera, the same 0.11 pupil, the same 0.038 glint, the same two
blush ovals, the same 0.095 half-circle smile (`rivals.ts:322-348`). The shop
card sells Rexling, Drako and Shadow Ninja with **fierce** eyes; in a match all
three blink the same round kawaii eye as the coward. If any cast work ever
happens, **this is the lever — it is authored data that already exists two
files away and is simply not read** — and it is *not* a hat.

**(c) The shop card and the game disagree, which is worth a line to the owner
on its own.** Whoever art-directed `store/07-skins.png` gave five characters
five faces. The game gives them one.

---

## 3. THE COST — measured, and it does not land where the brief expects

Every number here I ran. Accessory counts come from the **shipped bundle**
(`dist/assets/void3d-Bwu5pXTP.js`, export `b` = `buildAccessory`); rival body
counts come from parsing the geometry constructors out of `rivals.ts` and
building them with the repo's own three, with a throw if `makeRivalMesh` moves.

**The five accessories the family already wears:**

| sibling | accessory | triangles | meshes |
|---|---|---|---|
| JELLY | ninja | 656 | 4 |
| BIGSHOT | unicorn | **1,932** | 7 |
| ECHO | dino | 76 | 8 |
| NIBBLES | king | 504 | 9 |
| GRUMPS | dragon | 642 | 5 |
| | **total** | **3,810** | **33** |

**What one rival costs before its accessory** (live path only — the dead
`idx % 5` props excluded):

```
SphereGeometry(1, 40, 30)   body      2,320
2× sclera + 2× pupil + 2× glint + 2× blush + 1 smile   144
RingGeometry(1.15, 1.42, 40)  halo       80
                              ------------------
                                       2,544 tris, 12 drawables
```

So per rival: **2,620 (ECHO) to 4,476 (BIGSHOT) triangles, 16–21 draw calls**
— every face element builds its own `MeshBasicMaterial` inside the loop, so
nothing batches. All five resident: **16,530 triangles**, of which 3–5 are
visible per match (`rivals.ts:517`, `count = 3 + Math.floor(Math.random() * 3)`).

**Against the Game Day harvest of 28,448:** the family's *entire* resident
geometry is 58% of it; the five accessories are **13%** of it. A new
accessory in the same style is 500–2,000 tris each, so a fresh per-sibling
signature hands back **9–35% of the harvest**. That is a real cost and it is
the right thing to be suspicious of.

**But the harvest is not where the money is.** The rival body is
`SphereGeometry(1, 40, 30)` — **2,320 triangles, 91% of a rival's
non-accessory cost** — on an object that renders at ~120 px radius and whose
vertex shader displaces it by ±1.2%. That single constant is worth more than
every accessory in the family combined: at 24×18 it is 816 tris, freeing
**1,504 per rival / 7,520 across five** — twice the whole accessory budget.
If anyone ever does want a cast, **it can be paid for out of the rivals' own
tessellation and never touch Game Day.** (I am not proposing that change; it
needs the silhouette-error work `qa/roundlod.mjs` already does. I am saying the
budget argument against a cast is weaker than it looks, and the budget
argument *for* the current bodies is weaker still.)

**THE SEEDED STREAM: no risk, and this is a correction to anyone who claims
there is.** `rivals.ts` contains **zero** uses of `mrnd`/`mr`/`mpick`/
`mchance` (grep count: 0). That stream is `mainstreet.ts`'s own mulberry32
(`mainstreet.ts:30-35`) and is separate from `Math.random` — `island.ts:1108`
records exactly that. Rivals use plain `Math.random()` and a local `rand()`.
**Any change confined to `rivals.ts` / `void3d.ts` / `palette.ts` cannot move
a single authored Maple placement.**

---

## 4. THE NAMES, OUT LOUD

Current shipped roster (`rivals.ts:91`):
`JELLY · BIGSHOT · ECHO · NIBBLES · GRUMPS`.

### First: the owner may not have been looking at these

`Chompzilla` was deleted on **2026-08-22** (`502fe1b`, *"…real names"*), seven
days before the 2026-08-29 note that says *"The void names seem lame and
childish. Chompzilla etc."* The shipped bundle proves the rename landed:
`dist/assets/main-B7gQaMJp.js` contains NIBBLES ×15, GRUMPS ×8, BIGSHOT ×7,
and all five built chunks contain **zero** occurrences of Chompzilla, Glitz,
Bitsy, Dozer or Wobbles. `index.html` has none either.

(Precisely: the old names *do* survive in `src/` — ten times, all of them in
**comments** in `rivals.ts` (`:82, :113, :456, :460, :553, :1098, :1105,
:1106, :1215, :1428`). No player can reach any of them. It is worth one line
anyway: the file that owns the family is written in two vocabularies at once,
and the next person to read `rivals.ts` will meet Wobbles, Bitsy, Dozer,
Uncle Glitz and Auntie Chompzilla described as if they were live.)

Either he is describing the *current* names and naming the old one as the
genre he dislikes, or **he is playing a stale build and item 5 is a phantom.**
Those two readings demand opposite work and nobody can design a cast without
knowing which. **This is one question and it should be asked before anything
else in this round is funded.**

And note what it means either way: **this is the second time the same
complaint has been recorded, and the first rename was done without anyone
confirming the owner ever saw it.** The repo has a rule that a premise
repeated in three files is not thereby true. Its sibling: *a fix nobody
confirmed the owner saw is not a fix.*

### Second, and worse: the previous rename's stated principle IS the complaint

`rivals.ts:83-84` and `docs/AAA-BRIEF.md:1321` state the round-2 goal in the
crew's own words: *"Every name SAYS its game, in a six-year-old's own
vocabulary."* The owner's word for the result is **"childish."**

For a children's game, "childish" is not "too simple" — it is *this sounds
like it was written **by** a child rather than **for** one*. Baby-talk. The
crew optimised for precisely the property being complained about. **Running
the same brief again with different words will fail again.**

### Third, name by name

| name | can a 6-year-old say it? | does it sound like somebody? | borrowing a shape? |
|---|---|---|---|
| **NIBBLES** | yes | **yes** — the best of the five; the irony of the sweetest name on the apex predator is a real character idea | no |
| **ECHO** | yes | half — a real given name, but it is the *mechanic* said out loud, and a 6-year-old knows the word from a cave, not a person | no |
| **JELLY** | yes | no — it is a **food**, in a game whose only verb is eating. It names lunch, and it names a texture, not a temperament | no |
| **BIGSHOT** | yes, phonetically | no — an **adult idiom**. A six-year-old does not own "a big shot". It fails the crew's own stated bar | borrows a stock phrase |
| **GRUMPS** | yes | no — **Grumpy with an S**. That is a dwarf with a plural | **yes — kill it on the shape test** |

Four of five are **the trait with a name badge on**: JELLY = wobbly,
BIGSHOT = show-off, ECHO = copies you, GRUMPS = grumpy, NIBBLES = eats. A name
that *is* its description can never surprise you. Of Angry Birds' four
best-known birds — Red, Chuck, Bomb, Matilda — exactly one is its function.

### Fourth, the actual defect: the name, the costume and the behaviour disagree

This is the finding I would put in front of the owner, because I think it is
what he is actually seeing.

| what he is TOLD | what he SEES | what it DOES |
|---|---|---|
| JELLY | a **shadow ninja** with a red headband | runs away from everything |
| BIGSHOT | a **unicorn** | crosses the island to show off at landmarks |
| ECHO | a **T-rex** | toddles along your own footsteps |
| NIBBLES | a **king** | hunts you, charges, bites |
| GRUMPS | a **dragon** | sits on one district and won't move |

Three of five are three characters wearing one body. A ninja called Jelly who
flees is not a lame name — it is a name with nothing behind it. **A name only
sounds like somebody when the picture agrees with it,** and no rewrite of the
word list fixes a disagreement between the word and the costume. If anything
in this round is cheap and worth doing, it is re-dealing five strings in
`FAMILY_SKIN` (`rivals.ts:463-469`) so the costume matches the archetype —
zero triangles, zero draw calls, zero seeded draws.

---

## 5. GAMEPLAY LEGIBILITY — the kill shot, and it is already shipped

Legibility outranks branding, and **the signature colours already collide with
the safe/danger read.** This is not an objection to a hypothetical cast. It is
a live defect in the cast that ships today.

The ground ring is the game's whole safe/dangerous channel
(`rivals.ts:1904-1922`, comment: *"hole.io's danger cue, pre-reader-proof: the
ground disc tells the truth at a glance — green = you can eat them, red = RUN,
skin glow when it's a fair fight"*). Four states:

```
0xff2b3c  wind-up red      the bully is charging
0xffcf3a  prize gold       best meal on the island, come and get it
0x54e88a  safe green       you can eat this one
0xff5560  danger red       this one can eat you
rv.color  the sibling's OWN rim colour   — the neutral band
```

That last line is the bug. `rv.color` is `sk.rim` (`rivals.ts:291`, `:479`).
Parsed straight out of `rivals.ts` and `palette.ts` and measured in CIE Lab
with the repo's own ΔE convention (`qa/formsep.mjs`, whose bar for *"these are
the same colour"* is **ΔE 7**):

| sibling | rim | ΔE to SAFE green | ΔE to DANGER red | ΔE to PRIZE gold |
|---|---|---|---|---|
| **JELLY** (the coward) | `#ff4d5e` | 129.5 | **3.1** | 82.5 |
| BIGSHOT | `#fff4ff` | 77.1 | 77.8 | 79.8 |
| ECHO | `#8ef07a` | **16.6** | 119.8 | 60.4 |
| **NIBBLES** (the bully) | `#ffd25a` | 69.3 | 74.5 | **11.3** |
| GRUMPS | `#5ee8d8` | 42.2 | 113.8 | 89.9 |

**JELLY — the harmless one, the coward, the sibling a child is supposed to
chase — wears a ground ring at ΔE 3.1 from the game's own "IT CAN EAT YOU"
red. That is under half the repo's own bar for two colours being the same
colour.** For JELLY the ring is red when she is dangerous and red when she is
not; the channel carries no information about her at all.

And **NIBBLES — the apex threat — sits at ΔE 11.3 from "come and eat me"
gold**, in the branch that fires exactly when the player is *not yet* big
enough to eat her. Two golds, adjacent meanings, opposite instructions.

ECHO at ΔE 16.6 from the safe green is the same family of mistake, one hue
further out.

Stated honestly: **these are authored albedos, not rendered pixels.** The ring
is a `MeshBasicMaterial` at opacity 0.85 over varied ground, then through ACES
and the world's exposure. That pipeline is compressive, so the *rendered* ΔE
is very likely **smaller** than the authored one, not larger — which makes the
finding worse, not better. It is the same basis `qa/formsep.mjs` uses and the
same basis the Lantern lift was landed on. It has not been photographed. A
probe that samples the ring's rendered pixels against the four cue colours
would settle it and would fail on today's build.

**Read from source, NOT photographed — flagged as such:** the family's eyes,
blush and smile are built `depthTest: false, depthWrite: false` with
renderOrder 5–7 (`rivals.ts:326-347`), while the halo is depth-tested by
default (`rivals.ts:384`) and `buildAccessory` returns depth-tested
`MeshStandardMaterial`. If that reads the way it looks, a rival behind a
building shows the child **a floating smiling face with no body, no costume
and no danger ring**. `qa/_family.mjs`'s third question exists to answer
exactly this and I can find no recorded answer anywhere in `docs/`. Somebody
should run it. **I am not claiming it; I am claiming nobody has checked.**

Either way it settles the brief's fifth question: a signature accessory cannot
compete with the safe/danger read, because **the accessory is depth-tested and
loses to a wall, and the danger ring loses to the wall too, and the only thing
that survives is the friendly face.** More accessories buy nothing here.

---

## 6. CORRECTIONS TO THE GOVERNOR'S OWN READ

Offered for attack, so: attacked.

1. **"The void siblings are currently colour variants of the same sphere" —
   FALSE, and it is the load-bearing premise.** They have five distinct 3D
   accessories, five body patterns (fur / scales / starfield / stitch), five
   rim-and-glow pairs, three body mods (mane, snout, muzzle) and five fixed
   archetypes with their own voice sets. **One of them (Uni-Void) passes the
   32-px silhouette test outright.** The true statement is narrower and far
   more useful: *four of five are the same sphere with a different bump on the
   pole, and the one that works, works because its accessory changes the
   OUTLINE rather than decorating the top.*

2. **"The minimum credible version may be small" — it is smaller than that: it
   is already built, and part of it is unreachable dead code** (§2a).

3. **"The machinery for visual difference already exists (a hat system and a
   skin system)" — half wrong in a way that matters.** The hat system is
   hero-only and would be new plumbing. The skin system already runs per-rival.
   Costing built on the hat half is wrong; the skin half needs no costing at
   all because it has already been paid.

4. **The Angry Birds analogy is structurally inverted, and this is the
   strongest reason to say no.** Angry Birds' cast is the player's **toolkit** —
   you choose a bird every shot, a hundred times an hour, and the silhouette
   exists so you can pick one from a queue. The void siblings are **opponents**
   the player never chooses, met 3–5 per match. The engagement per character is
   orders of magnitude apart, and so is the payoff from making them
   identifiable. The Angry Birds asset that this game actually has an analogue
   of is **the shop**: five purchasable characters the player plays AS, at
   $2.99 each (`store3d.ts:41-45`) — and `rivals.ts:452-457` already states the
   strategy out loud: *"the family wears LEGENDARIES ONLY… Aspirational: every
   family member looks like something the player wants to own."* **The cast
   already exists, it is already monetised, and the siblings are already its
   billboard.** Widening it is not a new idea; it is the idea that shipped.

5. **A franchise-history check the brief invites and does not survive.** Angry
   Birds launched in December 2009 and its birds were **unnamed** for years —
   the names most people know arrived with the 2013 cartoon and the 2016 film,
   after the game was already a phenomenon on the strength of shape and
   ability alone. (Recalled, not measured — it is outside this repo and I
   cannot cite a file for it, so weigh it accordingly.) If it is right, the
   Angry Birds precedent argues the *opposite* of the round's premise: **the
   named cast is what a hit game earns, not what earns a game its hit.**

6. **Where the names actually appear is the surface the owner is deleting.**
   A rival's name reaches the player in two places: `#board`, the top-left
   scoreboard (`index.html:1732`; `.nm { max-width: 78px; font-size: 13px }`
   at `index.html:172`), written at `prototype3d.ts:4359` — which is item 2 of
   the same feedback note, *"The scoreboard on the top left seems useless"* —
   and the chat-bubble name chip (`prototype3d.ts:2425-2428`,
   `:4340`), which only fires inside 55 units. **Fund a naming round and item 2
   deletes most of its surface area the following week.** Sequencing beats
   wordsmithing here.

---

## 7. WHAT I FAILED TO ESTABLISH

Recorded because a verdict that hides its gaps is worth nothing.

- **My live in-world probe died and produced nothing.** `silh.mjs` booted
  Maple at DPR 2, pinned quality rung 0, rushed the clock to 58s and was to
  screenshot the canvas at player R = 3 / 7 / 11 while dumping every void
  body's true device-pixel radius. Under a box at load average 21 it never got
  past boot and Chromium killed itself:
  `GPU process isn't usable. Goodbye.` — exit after ~13 minutes with no
  frames. **So every on-screen-size number in §1 is arithmetic off the real
  camera law plus one measurement from a shipped frame, not a fresh
  photograph.** It should be re-run on a quiet box.
- **The ΔE table is authored albedo, not rendered pixels** (§5). Directionally
  safe, but not photographed.
- **The depth-test/occlusion finding is a source read only** (§5).
- **The two shape metrics in §1 are retracted by me, in place, before use.**
- **Nobody refuted any of this.** There was no proposal. Treat this document
  as a first pass, not as a verdict on somebody's argument.

---

## 8. THE ANSWER TO THE OWNER'S QUESTION

> *"If you think branding does it work? If we can make this scale? … If you
> think it's good we can keep it."*

**No — and you already have the cast, so nothing is lost by saying no.**

Five voids with five permanent costumes, five personalities you can name after
watching them for ten seconds, and five voices already ship. That is a cast.
It will not scale into an Angry Birds line-up, and the reason is not effort or
taste: **in your game, size is the rule.** A child has to read how big a void
is before anything else, so every void has to stay a ball. Angry Birds' birds
are recognisable because their *bodies* are different shapes, and that is the
one thing this game cannot give you. Piling more hats on top of five identical
spheres buys a picture that does not survive being small — I made the picture,
and four of the five turn back into the same ball.

**Keep the names.** They are not what is wrong. What is wrong is that the name,
the costume and the behaviour disagree — a ninja called Jelly who runs away, a
dinosaur called Echo who copies you, a dragon called Grumps who won't move —
and three defects that are legibility bugs, not branding:

1. **JELLY's ring is the game's danger red** (ΔE 3.1). The harmless one is
   flagged as the threat. Fix the five colour constants; probe it first.
2. **The family's five personality props are dead code** and have never
   rendered (`rivals.ts:352-381`). Delete them or wire them.
3. **The fierce eyes you sell on the shop card never reach the game.** The data
   exists in `palette.ts`; `applySkinToBody` just doesn't read it. That, not a
   hat, is where a character gets a face.

And before any of it: **ask him which names he was looking at.** Chompzilla has
been gone for a week.

