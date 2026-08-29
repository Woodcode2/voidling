# PRIORITY — is the void cast the best use of the next block of work?

Second opinion, round 4, 2026-08-29. **I write one file and edit no tracked
source.** HEAD `f4fda7d`, working tree clean.

**ANSWER: NO. The cast ranks 9th of 9, below the line, and it should not open.**
**And the naming half of the owner's item 5 is probably aimed at the wrong five
names — there is a live one in today's build that matches his words better than
any rival's, and it is the PLAYER'S.**

---

## 0. WHAT THIS IS, AND WHAT I ACTUALLY RAN

I am the second opinion on **whether**, not the verdict on **what**.
`docs/crews/round-4/void-cast.verdict.md` already killed the cast on the
silhouette test and I am not re-litigating it. I checked its two load-bearing
claims independently and both hold:

```
git log -S"Chompzilla" -- src/   →  502fe1b  2026-08-22  "…real names"
grep -o Chompzilla dist/assets/*.js | wc -l   →  0
grep -o NIBBLES dist/assets/main-*.js | wc -l →  15   (JELLY 7 · BIGSHOT 7
                                                       ECHO 8 · GRUMPS 8)
```

So the rename landed **seven days before** the note that complains about it,
and the current five names *are* live. The verdict's "he may be describing a
build he has not played" is real and unresolved.

What I ran, and it is all of it: `node qa/newsstyle.mjs` (clean), the greps
and `sed` reads quoted inline, `git log`. **I did not play a match, take a
canvas screenshot, or run a live probe.** Every impressions figure below is
arithmetic off source constants, and is labelled as such. Nothing here is a
photograph.

---

## 1. THE FINDING THAT REORDERS THE ROUND — CHOMPOSAURUS IS LIVE

The owner wrote: *"The void names seem lame and childish. Chompzilla etc."*

Everyone has read that as the rival roster. But the rival roster was replaced a
week earlier and does not contain the word he typed. **The form ladder does.**

```
prototype3d.ts:3232
const FORMS = ['VOIDLING','MUNCHKIN','GOBBLIN','CHOMPOSAURUS','COLOSSUS',
               'WORLD ENDER','VOID TITAN'];

grep -o CHOMPOSAURUS dist/assets/main-*.js | wc -l   →  3   (shipped)
```

`Chompzilla` → `CHOMPOSAURUS` is one letter-family apart. If a man who plays his
own game on a phone half-remembers a name he saw in 48-point type, that is the
word he half-remembers.

**And it is not a scoreboard chip. It is the biggest text in the game.**

| where the form name reaches the child | file:line |
|---|---|
| the full-screen EVOLVED banner | `prototype3d.ts:9423` `evolveEl.querySelector('.big')` |
| the permanent HUD form readout | `:4420` `gNowEl.textContent = FORMS[st]` |
| the `{F}` token the newsroom prints | `:4040` |
| the demotion bubble — `BONK!! back to ${FORMS[curStage]}!!` | `:2568` |
| the end card — `BIGGEST · <FORM>` | `:4960` |
| the town reacting to a form change | `:9443` `townReacts({kind:'evolve'})` |

And the game's own pacing comment says when (`prototype3d.ts:3264-3265`,
the repo's number, not mine):

> *law cap ≈ MUNCHKIN ~23s, GOBBLIN ~53s, CHOMPOSAURUS ~100s, WORLD ENDER ~153s
> on a strong run.*

**A child in one 180-second match reads four form names full-screen, sees one of
them permanently in the HUD, and takes one home on the end card.** The rival
names reach that same child in a 13px row, `max-width: 78px`, in the top-left
panel (`index.html:172`) — **the panel the owner asked to DELETE in item 2 of the
same note.**

The cost is already costed, in the source, by whoever wrote it:

```
prototype3d.ts:3227-3231
// VOIDLING is the species and first form (the app itself ships as THE CUTE
// WORLD ENDER … both words are brand and neither moves. Renaming the three
// middle trophies re-awards them once on existing saves (the paid ledger keys
// on trophy name) — a few coins, reads as a small gift.
```

**Item 5, correctly aimed, is three strings: MUNCHKIN, GOBBLIN, CHOMPOSAURUS.**
Not five spheres, five hats, five silhouettes and a franchise bible. Three words,
on the player's own transformation, with the migration path already written down.

I am not certain this is what he meant. I am certain it is a **better-supported**
reading than the one the round is currently built on, and that it is testable in
one screen — see §7.

---

## 2. ARGUE IT FROM THE PLAYER — one child, one match, 180 seconds

Not the pitch deck. What actually crosses this child's eyes.

**News headlines.** `COPY.newsGap` is `[16,8]` in three worlds and `[15,7]` in
two (`prototype3d.ts:1298, 1346, 1377, 1401, 1425`), scaled by
`urgent = 1 - 0.5*tension()` (`:9540`). `tension()` (`:3869`) is ~0 at MUNCHKIN
and 1 at COLOSSUS, which the pacing comment puts at ~23s and ~125s. Integrating
the gap over a 180s match:

```
   0–53s   tension ~0     gap 15–24s   ≈ 3 cards
  53–125s  tension 0→1    gap 20→10s   ≈ 5 cards
 125–180s  tension 1      gap 7.5–12s  ≈ 6 cards
                                       ---------
                                       ≈ 14 scheduled headlines
```
plus the sign-on, the sign-off, and reactive one-shots on an 11s shared cooldown.
**ARITHMETIC, not measured** — but the constants are real and the shape is not in
doubt.

**Now the surfaces, side by side, for that one child:**

| surface | impressions / match | size on a phone | emotional weight |
|---|---|---|---|
| **news headlines** | **≈14** | centre band, `#news`, 11.5px chip + headline | the town's whole voice |
| **form names** | 4 full-screen + 1 permanent HUD + 1 end card | `.big`, the largest type in the game | *what he became* |
| chat bubbles | continuous inside 55 units | pinned in 3D | the family's voice |
| **rival names** | 5 rows, top-left | **13px, 78px wide** | a leaderboard row |

**A rival with a hat changes nothing about this list.** A newsroom that is funny
changes fourteen things in it. That is the answer to the question as the brief
posed it — *a rival with a hat, or a newsroom that is funny?* — and it is not
close.

### And the newsroom's own probe is GREEN while the owner says it is bad

I ran it:

```
$ node qa/newsstyle.mjs
maple 241 lines: 1-sentence 57%, 2-sentence 36%, questions 5%
gameday 245 lines: 1-sentence 53%, 2-sentence 39%, questions 4%
lantern 166 lines: 1-sentence 52%, 2-sentence 39%, questions 3%
react   108 lines: 1-sentence 78%, 2-sentence 20%
clean
```

The bar is *"at most 45% two-sentence"* and the corpus is at 36–39%. **It passes.**
And the owner is still right, twice over:

1. **Arithmetically.** 36–39% of ≈14 headlines is **five two-sentence cards a
   match**, one roughly every 35 seconds. "It's *often* two sentences" is a true
   statement about a corpus that passes its own bar. The bar was set on corpus
   share; he experiences it as *rate*. Those are different quantities and only
   one of them is gated.
2. **Categorically.** He said *"two sentences that make no sense"* and *"it's not
   fun."* `newsstyle.mjs` meters sentence counts, punctuation ladders, token
   vocabulary and length. **It cannot measure sense or funny, and it never
   claimed to.** This is retraction 8 in `GOVERNOR.md` exactly — *"a probe that
   passes and a frame that fails are not in conflict; they are measuring
   different things"* — recurring on a different surface.

That is the strongest single reason the newsroom is rank 1: it is the only item
on the board where the studio's instrument reports success and the owner reports
failure. Everything else, the machine and the man agree about.

---

## 3. THE BOARD, RANKED

Ordered by *what changes for one child in one match, per unit of work*.

| # | item | why here | rough size |
|---|---|---|---|
| **1** | **THE NEWSROOM (his item 3)** | ≈14 impressions/match, his own largest item, and the guarding probe is green while he says it is bad. It is a WRITING commission, judged as writing. His structural note — *"some items triggers those news events"* — is also the one part that is engineering, and `newsroom_react.ts` already has the funnel; the pools are what is thin (27 lines per world across four triggers) | large, and it is a hire |
| **2** | **THE HUD SUBTRACTION (his item 2)** | the only item that makes **every other item on this list more visible**. Delete the void window; delete `#board`. Subtraction has no art risk, no seeded-draw risk, and it is what he asked for twice in one paragraph. Do not answer "remove this" with "restyle this" | small |
| **3** | **THE DRUM, AND THE HOLE THAT LET IT BACK (his item 1)** | a fix that silently reverted. **`qa/music.mjs` exists, tests exactly this mechanism — which score is each world actually playing — and `grep -c "qa/music.mjs" qa/gate.mjs` returns `0`.** The probe was written and never wired into the gate. That is the mechanical reason the drum came back, and it is a five-line fix on top of whatever the audio fix turns out to be. Note `music.mjs`'s `ALL` omits `powder` | small (the gating); unknown (the audio) |
| **4** | **JELLY'S RING IS THE GAME'S DANGER RED** | from the verdict, §5: ΔE 3.1 to `#ff5560` against the repo's own ΔE 7 bar. This is **not cast work** — it is five colour constants and a gameplay-legibility bug that mislabels the one harmless sibling as the threat. It rides in the cast's clothes and should be pulled out and shipped on its own. Needs the rendered-pixel probe the verdict says was never taken | small, needs a probe first |
| **5** | **MAPLE IS ALWAYS THE INTRO (his item 6)** | `firstRun = firstEver` (`prototype3d.ts:5541`) gates the figure-8 hand at `:9106`. Scoping that to "Maple, always" is a condition change. The second half — the dead "move" popup — is a hunt, and dead code that still fires is the cheapest class of defect there is | small |
| **6** | **THE THREE FORM NAMES (his item 5, correctly aimed)** | §1. Three strings on the highest-impression, highest-stakes text in the game, migration already costed in-source | very small |
| **7** | **THE FIRST FRAME (his item 7 + governor's item 8)** | the splash's faded "THE CUTE", the title appearing twice, and a loading screen nobody has ever art-directed. Ranks here and not higher for one reason: it is the frame that sells the game to a **stranger**, and the owner's other seven items are all about the child who already opened it. It jumps to rank 2 the day a store listing goes live | medium |
| **8** | **THE TAP GATE (his item 4)** | cheap to investigate and **the most dangerous item on the board**. Read `prototype3d.ts:6040-6056`: the gate was moved to its current place to fix *his own earlier complaint* — *"it loads the void then when you hit play it's almost like resetting it."* Removing it naively re-opens a closed note. The honest deliverable is a one-paragraph answer to him, not a deletion | small, and it is a conversation |
| — | — | **THE LINE** | — |
| **9** | **THE VOID CAST AS A CAST** | below. Not now | a round, and it would eat this one |

---

## 4. WHAT THE CAST BUYS, AND WHEN IT WOULD PAY

The brief invites "yes, but not now, and here is the trigger." I will take that,
because the honest position is not that a cast is worthless — it is that **a cast
is a retention and merchandising asset priced as an acquisition one.**

**What a cast buys.** Recognition *between sessions*. Angry Birds' birds became
the franchise because millions of people played it hundreds of times, and a
character you meet 400 times is worth naming. The value is realised in the
*second* session and every one after: merch, a cartoon, a plush, a sequel that
sells on a face. None of that value exists on the first play.

**What it costs here.** A round. Not triangles — the verdict costed those and
they are affordable — but the studio's whole attention, at the exact moment the
owner has handed over eight items, seven of which are about a child who is
playing right now and finding the screen cluttered, the news unfunny, the drum
out of sync and the tutorial missing.

**Why the analogy inverts.** The verdict's §6.4 is right and it is worth
restating in priority terms: Angry Birds' birds are the player's **toolkit**,
chosen a hundred times an hour from a queue, which is *why* the silhouettes had
to work. The void siblings are **opponents**, 3–5 per match, never chosen. The
per-character engagement is orders of magnitude apart, so the payoff is too.

**THE TRIGGER — two, and either one opens the round:**

> **(A) THE COMMERCIAL TRIGGER, and it is the real one.** The shop already sells
> the five legendary skins at $2.99 (`store3d.ts:41-45`), and `rivals.ts:452-457`
> already states the strategy out loud — *"every family member looks like
> something the player wants to own."* **The cast round opens when the shop tells
> you which character is worth money:** the first month in which one sibling's
> skin outsells the median of the other four by 2:1 or better, on a sample of at
> least 100 purchases. That is when you have discovered your Red, and you widen
> around the one that already won rather than betting on five at once. Until
> there has been a *single* purchase, a cast is a bet with no evidence, and this
> studio's own rule 1 is that a claim is not a fact until it is measured.
>
> **(B) THE RETENTION TRIGGER.** A cast is remembered *between* sessions. A game
> with no second session has nothing to remember it with. So: the first cohort
> where D1 retention clears 30%. If nobody comes back on day one, no name on any
> sphere will bring them.

**Neither trigger is close to firing.** Nobody has played this game.

**One thing to do NOW, at zero cost, so the trigger can fire later:** the shop's
per-skin purchase counts have to be readable. If skin sales are not attributed
per-SKU today, that is a half-day of instrumentation and it is the only piece of
cast work I would fund this round — because it is the thing that decides whether
cast work ever happens, and it is not cast work.

---

## 5. THE HERO — the version the designer missed, and its ceiling

The brief asks whether the right branding move is to deepen the hero rather than
widen the cast. **Mostly yes, and the specific way in is not the one the question
implies.**

**The franchise asset here has no name.** He is `'YOU'` on the scoreboard
(`prototype3d.ts:4032`). Five named siblings and an unnamed protagonist is
backwards for a franchise — but *the fix is not to name him*, because he already
has seven names and they are the form ladder. **Deepening the hero and fixing
item 5 are the same three strings** (§1).

**And "deepen him" has a hard ceiling that nobody in this round has stated:**

- **The face is closed.** `GOVERNOR.md`'s HANDS OFF: *"The fear face is approved…
  Do not touch the eyes."* An owner order, twice-tested.
- **Even if it were open, it would land on a face nobody sees.** Ledger item 3b:
  raw grin share Maple 28%, Powder 48% — *"in a dense world the hero is mid-bite
  in almost every frame."* New facial nuance on a face that is a gape 72% of the
  time is money spent on frames that do not exist.

So **the hero cannot be deepened through his face.** He can be deepened through
**words** — what he is called at each rung, and what the town says about him —
and that is the *same commission as rank 1*.

**This is the single most useful thing in this document, so I will say it
plainly: items 3 and 5 collapse into ONE hire.** A writer who can make a
small-town newspaper funny is the same writer who can name the thing a
six-year-old turns into. Commissioning them separately is how you get a AAA
newsroom and a trophy called CHOMPOSAURUS in the same build. Brief them together,
with one bar: **read it out loud to a six-year-old and watch their face.**

---

## 6. IF THE OWNER DID ALL OF IT — WHAT I WOULD CUT

He asked. Here is the list, and every line is a refusal, not a deferral.

1. **CUT the entire silhouette / hat / accessory widening.** Zero of it. The
   verdict's §1 proved four of five spheres are the same disc at 32px, and its
   §2 proved a rival hat is *new plumbing* (`buildHat` is hero-only,
   `void3d.ts:1648-1657`; `rivals.ts:8` imports three things and `setHat` is not
   one of them). Any costing that assumed the hat system was reusable is wrong.
2. **CUT the rival rename.** Keep `JELLY · BIGSHOT · ECHO · NIBBLES · GRUMPS`.
   Not because they are good — the verdict is right that four of five are the
   trait with a name badge on — but because **you would be renaming into a
   surface you are deleting the same week** (`#board`, his item 2), and because
   renaming them twice in eight days without ever confirming he saw the first
   rename is precisely how this note arrives a third time.
3. **CUT the `FAMILY_SKIN` re-deal**, even though the verdict calls it cheap
   (`rivals.ts:463-469`, zero triangles). Cost is not the objection. A child
   meets 3–5 rivals for 180 seconds and will never learn that ECHO follows their
   path, so a ninja called Jelly who flees is only *wrong* to someone who read
   the archetype table. **It becomes rank 1 of cast work the day the cast round
   opens** — and it should be held for that round so the change is seen.
4. **CUT wiring the dead `idx % 5` accessories** (`rivals.ts:353-381`). The
   verdict says "delete them or wire them." **Delete.** ~30 lines and five
   authored props that have never rendered, guarded by a branch that can never be
   false — that is a trap for the next reader, and removing a trap is worth doing
   while wiring one more is cast work.
5. **CUT the HUD compromise.** Take *both* his subtractions, not one. And add the
   one he did not ask for: the title appears twice in the splash (governor's own
   item 7 note). If a subtraction round cannot delete a duplicate title, it is
   not a subtraction round.
6. **CUT the studio's cast review.** Do not spend eight teams' attention this
   round on a surface whose verdict is "keep it."

**What I would NOT cut, and it is the shortest line here:** the ΔE 3.1 on
JELLY's ring. It arrived inside the cast proposal and it is not a cast finding —
it is the harmless sibling flagged as the threat, in the channel the game uses to
teach safe-versus-dangerous to a pre-reader. Pull it out of the cast folder and
put it in the bug queue at rank 4, with the rendered-pixel probe the verdict says
has never been taken.

---

## 7. THE ONE THING TO DO BEFORE ANY OF IT — AND IT IS NOT A QUESTION

The verdict says *"ask him which names he was looking at."* I would go one step
further, because a question makes him do the work and he has already done his
share:

**Show him one screen with two lists on it.**

```
   THE FAMILY          WHAT YOU BECOME
   JELLY               VOIDLING
   BIGSHOT             MUNCHKIN
   ECHO                GOBBLIN
   NIBBLES             CHOMPOSAURUS
   GRUMPS              COLOSSUS
                       WORLD ENDER
                       VOID TITAN
```

*"Which of these did you mean?"* — one tap, no thinking, and it settles a round
either way. If he points left, the verdict stands and the answer is "keep them."
If he points right, item 5 is three strings and it ships this week.

And there is a governance finding underneath it that outranks the cast question
and costs nothing to adopt. **Twice on this one board, a new complaint collides
with a fix made for his own earlier complaint:**

- **item 5** — the names were changed on 2026-08-22 at his request; the same
  complaint returns on 2026-08-29 and nobody ever confirmed he saw the change;
- **item 4** — the tap gate is where it is *because* he said the old flow
  *"almost like resetting it"* (`prototype3d.ts:6040-6048`), and he is now asking
  for the thing that produced that complaint.

The repo already has the rule for probes: *a fix without a failing probe is not
finished.* Its sibling belongs next to it in `GOVERNOR.md`:

> **A fix nobody confirmed the owner SAW is not a fix.** Every owner-item closure
> ships with the one frame or the one line that shows him what changed.

That rule, adopted this round, is worth more than the entire cast proposal.

---

## 8. WHERE I MAY BE WRONG

Recorded because a priority call that hides its gaps is worth nothing.

- **I played no match and shot no canvas.** The ≈14-headlines figure is
  integration over source constants, not a count. Someone should count it against
  `__matchState().t` on a real match, on a quiet box, and if it comes back at 8 or
  at 25 the rank-1 argument moves in magnitude — though not in direction, because
  the categorical half of §2 (the probe cannot measure funny) does not depend on
  the number at all.
- **The CHOMPOSAURUS reading is a hypothesis about intent.** It is better
  supported than the rival-name reading — his word is not in the shipped rival
  roster and is one letter-family from a live form name in 48pt type — but it is
  still a guess about a man's memory, and §7 settles it for the price of one
  screen. **Do not spend a round on either reading until he points.**
- **Rank 1 assumes the newsroom's defect is the WRITING.** If the real defect is
  the triggering — his *"some items triggers those news events"* — then rank 1 is
  an engineering job against `newsroom_react.ts` (108 templates, 27 per world,
  four triggers, one 11s funnel) and is cheaper and faster than I have priced it.
  That would raise rank 1, not lower it.
- **I did not verify "the hero casts no shadow in Powder."** It was handed to me
  in the brief and I list it as on the board unverified. One fact for whoever
  takes it: the contact shadow is a **normal-blended near-black disc**
  (`void3d.ts` `contact`, `color: 0x171021`, `opacity: 0.62`, `depthWrite: false`)
  over the brightest ground in the game. If it is genuinely absent in Powder the
  cause is **not** the disc's colour or its alpha, and anyone who "fixes" it by
  darkening the disc is fixing the wrong thing — the same class of error as the
  Lantern light lift that measured +0.4.
- **I did not measure whether skin sales are attributed per-SKU today.** §4's
  trigger (A) depends on it, and that is the one piece of homework this document
  hands back to itself.
- **Nobody has refuted this file.** Like the verdict it sits beside, it has had
  no adversary. Treat it as a first pass.
