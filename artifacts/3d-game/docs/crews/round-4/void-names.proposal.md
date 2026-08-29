# PROPOSAL — the void names

Round 4, 2026-08-29. Owner item 5: *"The void names seem lame and childish.
Chompzilla etc."*

**I write one file and edit no tracked source.** HEAD `0d9138f`. Working tree
carries three other round-4 proposals and nothing of mine.

**THE ANSWER IN ONE LINE.** He is right, and he is right about *both* name
lists, because both were built by the same machine: **take the verb the game
already runs on — eating — and bolt it to a suffix.** Renaming them once did
not remove the machine. It is still running, and he can hear it.

---

## 0. WHAT I ACTUALLY RAN

Every number below is one I ran. The scripts are scratch (they measure a
proposal, they do not guard a build); the two that should become permanent
probes are specified in §8.

| what | how |
|---|---|
| the shipped roster is live | `grep -o <name> dist/assets/*.js \| wc -l` — NIBBLES 15, ECHO 8, GRUMPS 8, BIGSHOT 7, JELLY 7, **CHOMPOSAURUS 3, Chompzilla 0** |
| both renames landed the same day | `git log -S` → `502fe1b` (rivals) and `edcf9eb` (forms), both **2026-08-22** |
| the formula census | static pass over `NAMES`, `FORMS` and the weekly-board seeds |
| name-to-voice agreement | static pass over `RIVAL_VOICE`, 204 lines |
| substring safety | 2,996 news-pool string literals across all seven `newsroom*.ts` |
| the news guard is blind | `qa/newsstyle.mjs` re-run with four different `RIVALS` arrays |
| rendered width | Playwright, real page, Fredoka loaded, rules copied from source |
| the EVOLVED banner | live `#evolve .big`, animation frozen, `Range` over the text node |

**Two retractions, in the open, before anyone quotes me.**

1. My first banner pass read `scrollWidth` on `#evolve .big` while
   `#evolve.show` was running `@keyframes ev`, which is a `transform: scale()`.
   The numbers were scaled and one of them was nonsense. Redone with animations
   frozen and a `Range` over the text node.
2. My first roster pass tried to measure inside the *live* `#board .nm`,
   `.er .nm` and `.vf.big`. The `.vb`/`.vf` rules live in a stylesheet
   `bubbles.ts` injects **at match start**, so on the menu I measured a 16px/400
   default and got 265px where the real answer is 449px. Redone against the
   literal rules from `index.html:168/552/816` and `bubbles.ts:157/168`.
   **Method validated:** synthesized `CHOMPOSAURUS` at 46px/700/ls2 = 383.1px;
   the live frozen element = 383px.

I did **not** play a full match or shoot a canvas frame. Nothing here is a
photograph of gameplay; it is source, DOM text and the shipped bundle.

---

## 1. THE WORD HE TYPED IS NOT IN THE GAME — AND THAT SETTLES THE SCOPE, NOT THE READING

`Chompzilla` was deleted on 2026-08-22 and appears **zero** times in the five
shipped chunks. So he is looking at something else. There are exactly two
candidates, and I checked both rather than picking one:

| reading | evidence for | evidence against |
|---|---|---|
| **the rival roster** — he means the new five and named the old one as the *genre* | it is what "void names" most plainly means; the family are the only named voids | none of the five he would have seen is anywhere near the word he typed |
| **the form ladder** — he half-remembers `CHOMPOSAURUS` | one letter-family from the word he typed; **3 occurrences shipped**; it is the largest type in the game (46px, full screen, up to five times a match) | it is the *player's* name, not a "void name" in the roster sense |

`docs/crews/round-4/void-cast.priority.md` §1 argues hard for the second and I
think it is the better-supported guess. **But the choice does not need to be
made,** and that is the useful finding here:

> The two lists have the **same defect**, from the **same commit day**, and the
> whole repair is **29 lines in two files**. Fixing both costs less than
> arguing about which one he meant, and it closes the item under either
> reading. Ask him anyway (priority §7's two-column screen is the right
> instrument) — but ask him *after*, with the fix on the screen.

---

## 2. THE DIAGNOSIS — four candidate faults, tested against the real list

The brief offered four hypotheses. Three survive contact with the source. One
does not, and I am reporting the miss.

### 2.1 A pun formula applied mechanically — TRUE, and it survived a rename

Fourteen names reach the player: five rivals, seven forms, two weekly-board
ghosts. **Seven of the fourteen (50%) are built on an eating word.**

```
JELLY  NIBBLES  MUNCHKIN  GOBBLIN  CHOMPOSAURUS  B1G-B1TE  snackrat
```

In a game whose **only verb is eating**, a name made of an eating word carries
no information. It tells the child something they learned in second one. Half
the cast is named after the thing everyone in the game is already doing.

And the formula is visible rung by rung. The three renameable forms are, with
no exceptions, `EATING VERB × MONSTER SUFFIX`:

```
MUNCH  + -kin   (Oz)        GOBBLE + goblin        CHOMP + -osaurus
```

Now the part that matters. Look at what those three replaced:

```
edcf9eb  2026-08-22  "Forms: a ladder of pictures, not a thesaurus"
-  'VOIDLING', 'MUNCHER',  'GOBBLER', 'DEVOURER',     'COLOSSUS', ...
+  'VOIDLING', 'MUNCHKIN', 'GOBBLIN', 'CHOMPOSAURUS', 'COLOSSUS', ...
```

The old three were `EATING VERB + -er`. The new three are `EATING VERB +
MONSTER`. The commit set out to kill the thesaurus and **killed the synonyms
while leaving the machine running.** Same day, `502fe1b` did the identical
thing to the family: `WOBBLES · GLITZ · BITSY · CHOMPZILLA · DOZER` (trait +
`-s`) became `JELLY · BIGSHOT · ECHO · NIBBLES · GRUMPS` (trait, unsuffixed).

**That is why the note came back.** He is not complaining about five words. He
is hearing a generator, and a generator sounds the same however many times you
re-roll it.

### 2.2 Borrowed brand shapes — TRUE, three of fourteen

`-zilla` (Toho), `-osaurus`, `-kin` (Oz's Munchkins), `-blin`. 3/14 = 21% carry
a suffix that belongs to somebody else's property. This is the weakest of the
four faults — `-osaurus` is a real taxonomic suffix and nobody is going to sue
over `GOBBLIN` — but it is the *sound* of a placeholder list, and the owner has
heard a thousand of them.

### 2.3 Names that describe the mechanic instead of suggesting a character — TRUE, and this is the deepest one

**A name that is its own description can never be learned, because there is
nothing left to learn.** JELLY = wobbly. BIGSHOT = show-off. ECHO = copies you.
GRUMPS = grumpy. Four of five are the trait with a name badge on.

I can put a number on how badly this has come apart, and it is the single most
useful measurement in this document. **The voice pools were written by someone
who knew exactly who these five are. The names were assigned by a different
process. They no longer describe the same people.**

For each rival: what share of its own 39–48 lines supports the word it is
*named* after, and what share is actually about something else?

```
          n   lines supporting the NAME      what the lines are ACTUALLY about
JELLY    39     0  ( 0%)                     fear / apology   12 (31%)
BIGSHOT  39     0  ( 0%)                     vanity           13 (33%)
ECHO     39     1  ( 3%)                     toddler          13 (33%)
NIBBLES  48     1  ( 2%)                     theatre          21 (44%)
GRUMPS   39     1  ( 3%)                     sleep            26 (67%)
```

The three outliers are funnier than the zeroes.

- **GRUMPS's one grumpy line is `'rude. *angry yawn*'`.** The only cross word in
  thirty-nine belongs to a yawn. He is not grumpy. He is *asleep* — 67% of his
  pool is naps, "cardio?? never again", "passed you in my sleep". **He has been
  named for an emotion he never displays.**
- **NIBBLES's one supporting line is `'bow before NIBBLES'`** — she says her own
  name. Discount that and **nothing in forty-eight lines nibbles.** 44% of her
  pool is theatre: *"BEHOLD: dinner AND a show"*, *"a TRAGEDY in one act"*,
  *"exit!! stage LEFT!!"*, *"the gala is SATURDAY"*. She calls the player
  **darling**. She is a grande dame, and she is named after a hamster.
- **ECHO's one supporting line is `'copying you!! hehehe'`** — which is the
  archetype tag, not a character.

So the defect is not "the names are bad words". It is:

> **Five real characters are already written, in the voice pools, and none of
> them is wearing their own name.** The names are labels for the archetype
> table. The people are somewhere else in the same file.

That reframes the job. This is not a naming exercise. It is a **casting
correction**: find the five who are already there and call them by their names.

### 2.4 Pitched at a younger child than 6–11 — TRUE, and the previous crew said so themselves

`rivals.ts:83-84` states the round-2 goal in the crew's own words:

> *"Every name SAYS its game, in a six-year-old's own vocabulary."*

The owner's word for the result is **"childish."**

For a children's game that is not a synonym for "simple". It means *this sounds
like it was written **by** a child rather than **for** one.* Writing in a
six-year-old's vocabulary is how you get names a six-year-old would have
invented — and the top of this game's 6–11 band polices babyishness far harder
than the bottom rewards simplicity. An eight-year-old will happily play a game
about a purple hole eating a town. He will not tell a friend that the boss is
called Grumps.

**Running the same brief again with different words will fail a third time.**

### 2.5 THE ONE THE BRIEF DID NOT LIST, AND IT IS THE STRUCTURAL MISS

The game insists, everywhere, that these are a **family**. The loading line is
*"Waking the void family…"*. `FAMILY_TITLE` (`prototype3d.ts:2390`) gives every
member a relation — Cousin, Uncle, Baby, Auntie, Grandpa. There is a trophy
called **"Bigger Than Auntie"**.

Now say the five names out loud: **JELLY. BIGSHOT. ECHO. NIBBLES. GRUMPS.**

Those are five names from five different games. There is no shared register, no
generation, no era — nothing that makes them sound *related*. The game asserts a
family in the UI and the name set denies it in the same frame. Every animated
cast that has ever stuck does the opposite: the Incredibles are Bob, Helen,
Violet, Dash and Jack-Jack, and you can hear the household. Bluey's family are
Bandit, Chilli, Bluey, Bingo, Muffin and Socks — an audience two years *younger*
than this one, and not one of those names describes a behaviour.

**That is what "placeholder" sounds like.** Not the individual words. The
absence of a family.

---

## 3. WHAT IS ALREADY GOOD, AND KILLING IT WOULD BE A LOSS

Six things. I have changed none of them.

1. **The voice pools are genuinely good writing.** *"I KNEW this would happen."*
   *"no photos, please."* *"cardio?? never again."* *"I'm telling NIBBLES."*
   *"the gala is SATURDAY."* This is real character work and it is the reason
   the renaming job is *easy* — the people already exist. **Nothing in this
   proposal touches a voice line except the three that print a sibling's name.**
2. **`FAMILY_TITLE` is the best system in the file.** Auntie / Uncle / Baby /
   Cousin / Grandpa does the family work, unglamorously, in every surface. It is
   also durable: the trophy is called *"Bigger Than Auntie"*, so it survived the
   last rename untouched. Do not touch it. It is why the names themselves are
   free to be *people* rather than a themed set.
3. **NIBBLES's idea** — the sweetest name on the apex predator. That gap is a
   real character invention and it is the only place in the current five where
   the name and the behaviour are not the same fact. I keep the idea. I retire
   the word, because "Nibbles" is the most common pet-rodent name in English
   *and* an eating word *and* it describes nothing she does.
4. **Four of the seven form rungs are fine.** `VOIDLING` and `WORLD ENDER` are
   brand and locked (the app ships as THE CUTE WORLD ENDER). `COLOSSUS` and
   `VOID TITAN` are real, grand, unpunned nouns that escalate correctly. **Only
   three rungs are broken and only three should move.**
5. **The short-name discipline.** The ≤7-character rule was over-cautious —
   measured, even `CHOMPOSAURUS` fits `#board .nm` at 13px — but the instinct is
   right for the surfaces that *do* bite (§7). Keep it.
6. **`ECHO` was the closest of the five to being a person.** It is a real given
   name and the only one of the four labels that is not an eating word. It still
   goes, because it names the mechanic out loud and a six-year-old knows the word
   from a cave. But it was the near miss and it deserves the credit.

---

## 4. THE FAMILY — the replacement set

Five people, one photo album. The rules I held myself to, in order:

1. **A child can say it cold**, first try, no coaching.
2. **It is somebody, not something** — a name, not a description, not a noun.
3. **No eating word.** The game is at 50%. That number goes to zero.
4. **No formula.** Not a suffix set, not a rhyme set, and explicitly *not* a
   themed set — see the rejected gemstone family in §6. A theme is a machine and
   the machine is the disease.
5. **They sound related** without a shared gimmick — one era, one register. The
   *titles* carry the family; the names carry the person.
6. **Five distinct initials**, because a pre-reader reads a leaderboard row by
   first letter and shape.
7. **Zero substring collisions** with the town, the news corpus or each other
   (§6 killed two of my favourites on this rule alone).

### THE CAST

| | name | who they ARE — one line | archetype | the gap the name buys |
|---|---|---|---|---|
| **Auntie** | **OPAL** | A retired grande dame of the theatre who treats hunting you as the second act, calls you *darling*, and means every word of it. | `BULLY` | The name is a shiny bauble. The behaviour is the only thing on the island that can eat you. That is NIBBLES's joke, upgraded from a hamster to a person. |
| **Uncle** | **DUKE** | Believes he is famous. Crosses the whole island to be seen eating something enormous. Would like it known that his glow is natural. | `SHOWOFF` | Everyone has an uncle who thinks he is a big deal. Nobody has an uncle called Bigshot. |
| **Baby** | **TILLY** | Toddler. Follows you everywhere, seven seconds behind, narrating. Adores you. Will tell Auntie Opal on you. | `COPYCAT` | She does not *copy* you, she *idolises* you — which is what the behaviour actually looks like on screen, and what a name gets to say that a mechanic label cannot. |
| **Cousin** | **NORA** | A worrier. Apologises for eating, apologises for winning, and knew this was going to happen. | `COWARD` | "Coward" is a judgement. Nora is a person who is having a hard time, which is funnier and kinder — and this game is rated 4+. |
| **Grandpa** | **WALT** | Found a nice spot. Is not leaving the nice spot. Is winning, and is asleep. | `HOARDER` | GRUMPS named an emotion he never has. Walt names nobody's temperament at all, so his 67%-naps pool is finally allowed to be the joke on its own. |

**Read it back the way the game prints it:**

> `Auntie OPAL joined — ⚡ she CHASES you`
> `👑 You beat the chaser! · OPAL is out · +2,140`
> `Grandpa WALT DEVOURED! +240`
> `💬 TILLY — "I go where YOU go!!"`
> `💬 NORA — "I KNEW this would happen"`

Every one of those is a sentence about a person. Not one of them explains a
joke, and not one of them is about food.

### THE NUMBERS

```
              letters  syllables  news-corpus hits  src-wide hits
   OPAL          4        2             0                0
   DUKE          4        1             0                0
   TILLY         5        2             0                0
   NORA          4        2             0                1  (dead code, §6)
   WALT          4        1             0                0
   initials  O · D · T · N · W   — five distinct, five distinct shapes
```

Every name is ≤5 characters, ≤2 syllables, opens with a different letter, and
does not appear anywhere in 154,742 characters of town copy.

### ONE NOTE FOR WHOEVER LATER RE-DEALS `FAMILY_SKIN`

Out of scope here — the priority doc holds the skin re-deal for a future round
and I am not reopening it. But record this while it is cheap: `NIBBLES` already
wears `kingvoid`, the crown (`rivals.ts:469`). **An opal in a crown is right,**
so Auntie Opal needs no change at all. And a vain man on a unicorn is funnier
than a vain man on anything else, so Uncle Duke keeps `univoid`. Two of the five
costume disagreements the verdict found (§4, *"a ninja called Jelly"*) get
quieter for free, because a *person's* name can wear any costume — it is a
*trait* name that fights the picture.

---

## 5. THE FORM LADDER — three strings

This is the half the owner probably typed, and it is the highest-stakes text in
the game: 46px, full screen, up to five times a match, plus a permanent HUD
readout, plus the `{F}` token the newsroom prints, plus the end card.

```
   0  VOIDLING       locked — species, and the app ships as THE CUTE WORLD ENDER
   1  MUNCHKIN   →   RASCAL
   2  GOBBLIN    →   MONSTER
   3  CHOMPOSAURUS → BEHEMOTH
   4  COLOSSUS       keep
   5  WORLD ENDER    locked — brand
   6  VOID TITAN     keep
```

**Who each rung IS, which is what the source comment at `:3225` asked for and
did not get — *"a ladder of pictures, not a thesaurus"*:**

- **RASCAL** — no longer a baby, not yet a problem. A word a grandparent uses
  fondly, which is exactly right in a game where your grandpa is on the field.
- **MONSTER** — the plainest word on the list and the one a seven-year-old
  actually wants to be. It is also the designer's own intent, undecorated: the
  comment at `:3225` literally says *"little monster"* for this rung, and the
  previous pass decorated it into `GOBBLIN`.
- **BEHEMOTH** — the first genuinely big word, and it is *earned*: ~100 seconds
  into a strong run. Real, ancient, unpunned, and it hands the child a word
  worth repeating.

**Three properties the current three do not have, all measured:**

1. **Zero eating verbs, zero borrowed suffixes.** The 50% eating-word share
   across all player-facing void names drops to **0%** once the two board ghosts
   go too (§9).
2. **The mouth-feel escalates with the size.** Syllables become
   `2 · 2 · 2 · 3 · 3 · 3 · 3` — never decreasing. Today they run
   `2 · 2 · 2 · 4 · 3 · 3 · 3`: **the biggest mouthful in the game is at rung
   three and then it gets *easier* as you get bigger.**
3. **They fit on the phone.** Which brings me to the thing I did not expect to
   find.

### THE FINDING — `CHOMPOSAURUS` DOES NOT FIT THE SCREEN IT IS PRINTED ON

`#evolve .big` is 46px Fredoka with 2px letter-spacing, inside a full-width
block with `white-space: normal` and `#evolve { overflow: visible }`.
`CHOMPOSAURUS` is one unbreakable word **383px wide**. Measured on the live
element with the `ev` scale animation frozen, glyph run via `Range`:

```
   vw=320   CHOMPOSAURUS  glyphs 383px at x   0..383   CUT 63px off the right
   vw=360   CHOMPOSAURUS  glyphs 383px at x   0..383   CUT 23px off the right
   vw=375   CHOMPOSAURUS  glyphs 383px at x   0..383   CUT  8px off the right
   vw=390   every form fits
   vw=430   every form fits
```

**It is the only name in the game that does this.** Every other form clears
320px with room. `WORLD ENDER` is wider in raw glyphs but contains a space, so
it wraps to two lines and stays on screen; `CHOMPOSAURUS` cannot wrap and simply
walks off the right edge.

360 CSS px is the common Android width. 375 is the iPhone SE 2/3 and the 13
mini. **On those phones, the biggest celebration in the game — the moment a
child's void becomes a dinosaur — prints with its last letters cut off.**

The three replacements are 183px, 223px and 256px. All three clear 320px with
at least 32px of margin on each side.

I did not go looking for this. I went looking for a reason the word sounds bad
and found that it also does not fit. If the owner's eye caught that banner
mid-flight on a phone, "lame" is a generous word for it.

### THE MIGRATION, COSTED

`voidTrophyPaid` is a list of trophy **names** and payment is gated on
`!paid.includes(t.nm)` (`prototype3d.ts:6714-6722`). Three trophies are named
for the three moving rungs:

```
:6688  { nm: 'Munchkin',     ds: 'reach MUNCHKIN form',     pay: 10 }
:6689  { nm: 'Gobblin',      ds: 'reach GOBBLIN form',      pay: 15 }
:6690  { nm: 'Chomposaurus', ds: 'reach CHOMPOSAURUS form', pay: 25 }
```

Renaming them re-awards all three exactly once on an existing save:
**50 coins, 0 gems.** No trophy is lost, no gem is minted, no purchase is
affected. The source comment at `:3227-3231` predicted *"a few coins, reads as a
small gift"* and it is right — I have now put the figure on it.

---

## 6. REJECTED — with the reason, and two of these hurt

A set with no rejections was not curated. These are the ones that got far enough
to be measured.

**Killed by measurement:**

| rejected | why, exactly |
|---|---|
| **PEARL** (Auntie) | My first pick, and the best name in this document. **Maple Falls already has a Pearl** — she grows vegetables the size of cars, and she is in **20** news-pool strings. The town paper would talk about Auntie Opal's namesake all match. Worse: `qa/newsstyle.mjs` **fails** on it. I ran it — `✗ react MAPLE: names the rival PEARL · 1 problem(s)`. |
| **GUS** (Grandpa) | Same fault, worse. **Gus owns the diner in Maple Falls** — **29** news-pool strings. `qa/newsstyle.mjs` **fails**: `✗ react MAPLE: names the rival GUS`. |
| **STAN** (Grandpa) | Second pick after Gus died. The news guard is `text.toUpperCase().includes(NAME)` — and `STAN` is inside *instantly, distance, understand, manager, constant*. **59 hits across the news string literals** (Game Day 29, Maple 21, Powder 7, Lantern 6) **plus 7 inside the family's own chat lines.** Every one would be a false failure, forever. |
| **IMP** (form, rung 2) | 11 hits: *simply, blimp, impressed, important, impeccable, shrimp*. |
| **PIP** (Baby) | Clean today (0 hits) and lovely in the mouth. Rejected anyway: three letters under an `.includes()` guard is a landmine, and *pipes* and *piping* are one small-town plumbing headline away — **in a round whose rank-1 item is rewriting the newsroom.** |
| **MOSS** (Grandpa) | 2 hits (*"Three hundred years of moss"*, Lantern). Also, on reflection, a thing rather than a somebody. |

**Killed by the bar:**

| rejected | why |
|---|---|
| **Keeping NIBBLES** | The verdict calls it the best of the five and I agree it has the best *idea*. But the pool is 44% theatre and **0% nibbling once you discount the line where she says her own name.** It is an eating word in a game that is 50% eating words, and it is a hamster's name on the apex predator — not ironically, just inaccurately. The idea is kept; the word is not. |
| **A gemstone family** — Opal, Ruby, Jade, Onyx, Pearl | Tempting: it would "sound like a family" in one stroke. **Rejected because it is a formula, and formula is the disease.** Swapping `verb+monster` for `mineral+mineral` changes the machine's output, not the machine. The family sound has to come from a shared *era*, not a shared category. |
| **SPROUT / BEAN** (form, rung 1) | Both are food. In this game, everything on the ground is food. |
| **BEAST** (form, rung 3) | Good word, and clean. One syllable, so it breaks the escalation — rung 3 would be *easier* to say than rung 2. Held as the fallback if `BEHEMOTH` is judged too long for a six-year-old. |
| **WOBBLES / BITSY / DOZER** (any revival) | The previous set, and the purest statement of the fault: **BITSY is a size. BETSY is a person.** One letter apart, and only one of them is somebody. (BETSY was my runner-up for Cousin; NORA won on being marginally easier to say and having no near-namesake in the old set.) |

**Known residual risks, recorded rather than hidden:**

- **NORA** has one hit in the whole repo: *"Pigeon elected honorary citizen"* —
  `ho**NORA**ry`. It is in `src/game/engine.ts`, the **retired 2D game, which
  `vite.config.ts:299` confirms is no longer built** and does not ship. Zero
  player-facing risk. If the 2D game is ever revived, this is the one line to
  check.
- **WALT** is clean today (0 hits) but sits inside *waltz*. The correct fix is
  not a different name — it is §8's probe change from `.includes()` to a
  word-boundary match, which retires the whole class of hazard.
- **BEHEMOTH is three syllables** and the current rung 3 pretends to be a
  dinosaur, which children love. I think a real ancient monster beats a fake
  dinosaur and that earning a big word *is* the reward at that rung — but this
  is a judgement, not a measurement, and it is the line in this document most
  likely to be wrong.
- **The whole set is deliberately plain**, and "plain" is adjacent to the thing
  he complained about. My defence is that the current names are *decorated* and
  lame, and that ordinary names on absurd creatures is the standard trick of
  every feature this game is being measured against — Bruce the shark, Doug the
  dog, Bandit the dog, Bob and Helen. A giant purple hole called **Walt** is
  funnier than one called Chompzilla, and the child gets a person either way.
  If the skeptic disagrees, that is the argument to have.

---

## 7. WHAT THE NAMES TOUCH — every surface, measured

The priority doc argues the rival names reach the child only through a 13px
leaderboard row in *"the panel the owner asked to DELETE"*. **That is wrong, and
it is the one correction I would press.** Names reach the child through **five**
surfaces. Deleting `#board` removes the *smallest* of them.

| surface | where | type | survives the HUD subtraction? |
|---|---|---|---|
| **the join banner** | `announceJoin`, `prototype3d.ts:3065-3071`, fires 3–5×/match | full-screen card, `Auntie OPAL` + archetype tag | **yes** |
| **the chat-bubble speaker chip** | `bubbles.ts:275-283`, every line spoken within 55 units | 10px/900, ls 1.2, uppercase, in the rival's own colour | **yes** |
| **the DEVOURED floater** | `bubbles.ts:296`, `prototype3d.ts:2482` | **26px/900, `white-space: nowrap`** | **yes** |
| **the end-screen leaderboard** | `prototype3d.ts:5053`, `#end .er .nm` | 16px/700 | **yes — and the owner explicitly asked to keep it** (*"At the end we can reflect scores"*) |
| the HUD scoreboard | `index.html:168-172`, `#board .nm`, clips at 78px | 13px/700 | **no — this is the one he is deleting** |

**Rendered widths, 390px viewport, Fredoka loaded, rules copied from source:**

```
                   board    chip     end    "<Title> <NAME> DEVOURED! +240"
   Cousin JELLY    36.2px  33.9px  44.6px   394.8px   5px off a 390px screen
   Uncle BIGSHOT   52.8px  49.0px  65.0px   417.5px  28px off
   Baby ECHO       33.9px  30.9px  41.7px   368.0px  fits
   Auntie NIBBLES  49.9px  46.8px  61.5px   424.7px  35px off
   Grandpa GRUMPS  51.3px  46.6px  63.1px   449.4px  59px off
   ---
   Cousin NORA     34.8px  31.6px  42.8px   390.9px   1px off
   Uncle DUKE      32.9px  30.1px  40.5px   374.7px  fits
   Baby TILLY      32.9px  31.3px  40.5px   367.0px  fits
   Auntie OPAL     32.7px  29.9px  40.2px   387.2px  fits
   Grandpa WALT    36.9px  33.2px  45.4px   418.6px  29px off
```

Nothing clips in the board (78px) or the end row. But **the DEVOURED floater
string exceeds a 390px screen for 4 of the 5 current names** — and the floater
has **no viewport clamp**: `bubbles.ts:481-491` projects it and writes
`left`/`top` straight through, with `translate(-50%,-50%)` and `nowrap`.

**I am not claiming this as a naming win.** The proposed set takes the worst
case from 449.4px to 418.6px and the over-count from 4/5 to 2/5, but most of
that string is `"Grandpa "` and `" DEVOURED! +240"`, and a four-digit score
makes it worse. **This is a HUD defect, it is not caused by the names, and
renaming will not fix it.** I found it while measuring and I am handing it to
whoever owns `bubbles.ts` — with the note that the fix is a clamp in the float
branch of the update loop, not shorter words.

### `telemetry`

Two events carry a name; neither is affected beyond the string value.

- `prototype3d.ts:2459` — `track('ate_rival', { name, … })` — passes the live
  rival name through. No enum, no allow-list, no schema to update.
- `:9444` — `track('evolve', { form: curStage, name: FORMS[curStage], … })` —
  the same for form names. `form` is the **index**, so every existing funnel and
  cohort keyed on `form` is unaffected by a rename; only the free-text `name`
  changes.
- `:4138` and `:4155` — `rivalName: top?.name ?? 'NIBBLES'` — a hardcoded
  fallback into the Pirate Bay and Maple newsrooms. **These two are the sharpest
  trap in the rename:** they are not a display string, they are a default, and if
  they are missed the town will one day print a name that no longer exists.

### `qa/` — three probes are already broken, and two are in the gate

This is the part the brief asked me to find, and it is worse than a rename
hazard: **it is already broken today, seven days before I got here.**

| probe | line | pinned to | status |
|---|---|---|---|
| **`qa/newsstyle.mjs`** — **IN THE GATE** | `:172` | `['WOBBLES','GLITZ','BITSY','CHOMPZILLA','DOZER','NIBBLES']` | **covers 1 of the 5 live names.** Four dead names guarded; four live names unguarded |
| **`qa/newsarc.mjs`** — **IN THE GATE** | `:75` | the same six | same, and its comment says *"the six family names, from `FAMILY_TITLE`"* — `FAMILY_TITLE` has **five** entries and **none** of those six except NIBBLES |
| `qa/_rf_hunt.mjs` | `:67, :97` | `ms.rivals.find(r => r.name === 'CHOMPZILLA')` | finds nothing, silently |
| `qa/_rf_face3.mjs` | `:26, :37, :46` | `m.rivals.some(r => r.name === 'CHOMPZILLA')` — inside a **wait predicate** | can never become true; the probe waits out its timeout |
| `qa/_rf_face2.mjs` | `:97, :107` | `'NIBBLES'` | live today, dies with this rename |
| `qa/solotog.mjs` | `:41` | comment only | cosmetic |

`_rf_*` are scratch and not in the gate. **`newsstyle` and `newsarc` are.** That
guard exists for one specific shipped bug — a rival's speech printing under a
newspaper's brand chip, `💬 CHOMPZILLA: ACT TWO: I CHARGE!!` — and today it would
not catch that bug for four of the five voids that can cause it.

**The same rot has hit the form ladder.** Five probes still carry
`['VOIDLING','MUNCHER','GOBBLER','DEVOURER','COLOSSUS','WORLD ENDER']` — the
ladder that was replaced on 2026-08-22: `_rhythm.mjs:70`, `_fpev.mjs:8`,
`_demote.mjs:25`, `_evoframe.mjs:68`, `_rf_evoshot.mjs:44`. All scratch, none in
the gate, but that is **two generations of names now fossilised in `qa/`.**

### The complete touch list — 29 lines, two files

**The family — 24 lines.** `src/proto3d/rivals.ts`: `:91` `NAMES`, `:93`
`FIRST_LANE`, `:106` `ARCH_OF`, `:126/:139/:152/:165/:183` the five
`RIVAL_VOICE` keys, `:468-469` `FAMILY_SKIN`, `:518/:519/:533` the three
`'NIBBLES'` literals that pin the hunter to her seat, and **`:155/:156/:172` —
the three voice lines that name a sibling** (*"I'm telling NIBBLES"*, *"I'm
telling GRUMPS!!"*, *"bow before NIBBLES"*). `src/prototype3d.ts`: `:2390`
`FAMILY_TITLE`, `:4138/:4155` the two telemetry fallbacks, `:5606` the loading
tip that names ECHO, `:6776-6778` the weekly-board seeds, `:9291` the hardcoded
*"👋 Auntie NIBBLES"* welcome card.

**The ladder — 5 lines.** `src/prototype3d.ts:3232` `FORMS`, `:3391` the quest
label `'Evolve to CHOMPOSAURUS'`, `:6688/:6689/:6690` the three trophies (`nm`
and `ds` on each). **`APPSTORE.md` contains none of the three** — no store copy
moves.

**Plus** the two gate probe arrays, and comment blocks in `rivals.ts` that still
describe Wobbles, Bitsy, Dozer, Uncle Glitz and Auntie Chompzilla as if they
were live (`:82, :113, :456, :460, :553, :1098, :1105, :1106, :1215, :1428`).

---

## 8. THE PROBE THAT MUST LAND WITH IT

Standing rule 2: every fix needs a probe that fails before it. A rename cannot
fail a correctness probe — so here is the probe that **does** fail, and I ran it.

### It fails on the wrong answer

`qa/newsstyle.mjs`, unmodified except for its `RIVALS` array, run four ways:

```
   shipped array (WOBBLES…NIBBLES)      clean
   the live roster (JELLY…GRUMPS)       clean
   the proposed roster (NORA…WALT)      clean
   canary: ['GUS']       ✗ react MAPLE: names the rival GUS      1 problem(s)
   canary: ['PEARL']     ✗ react MAPLE: names the rival PEARL    1 problem(s)
```

The guard **works**. It is simply pointed at the wrong five names. And it is the
instrument that killed my two favourite candidates — which is the best evidence
I can offer that the proposed five are safe.

### What must land

1. **Point both arrays at the live roster, from the source of truth.**
   `newsstyle.mjs` already reads `newsroom_react.ts` off disk; it can read
   `NAMES` out of `rivals.ts` the same way instead of hardcoding a copy. A probe
   that hardcodes the thing it is guarding will go stale again, and this is the
   second time. **Derive it.**
2. **Change `.toUpperCase().includes(name)` to a word-boundary match.** One
   line, in both probes. It is what killed STAN as a candidate, and it will kill
   the next good name too if it stays.
3. **Add a rename guard.** The cheapest possible version, static, no browser:
   assert that every key in `ARCH_OF`, `FIRST_LANE`, `FAMILY_TITLE`,
   `FAMILY_SKIN` and `RIVAL_VOICE` is exactly the set in `NAMES`, and that no
   voice line contains a name that is not in `NAMES`. **Run against today's
   build it passes; run against a half-finished rename it fails on the first
   missed map.** That is the probe whose absence let `:4138`'s
   `?? 'NIBBLES'` become possible in the first place.
4. **A width bar for the EVOLVED banner.** `every FORMS entry, rendered at
   `#evolve .big`'s computed rule, must fit 320 CSS px`. It **fails today on
   CHOMPOSAURUS at 383px** and passes on all three replacements. That is a probe
   that fails before the fix and passes after it, on a number, with a stated
   reason for the bar — 320px is the narrowest phone the store screenshots
   target.
5. **Retire or repoint the three `CHOMPZILLA` scratch probes.** They are not in
   the gate, but `_rf_face3.mjs` waits on a predicate that can never be true and
   the next person to run it will lose twenty minutes deciding whether the game
   or the probe is broken.

---

## 9. THE TWO GHOSTS — small, optional, low confidence

`prototype3d.ts:6778` seeds the weekly board with two fake other players:
`'B1G-B1TE'` and `'snackrat'`. They sit in the same rows as the family, with
coloured dots, so a child reads them as more voids. Both are eating puns; one is
in leetspeak.

They are strangers, not family, so they should read as *other kids' handles* —
a different register from Opal and Walt. My suggestion is **`ZIGZAG`** and
**`plumhat`** (both 0 hits corpus-wide). I hold this loosely: it is two strings,
it is the least important thing in this document, and if the skeptic has better
handles they should win. But taking these two out is what moves the eating-word
share across all player-facing void names from **50% to 0%**, so they should
move with the rest and not be left behind for a third round.

---

## 10. WHERE I MAY BE WRONG

- **I never saw a match.** No canvas frame, no gameplay. My banner and floater
  numbers are DOM text in the real page with the real font, which is the right
  instrument for type — but I have not watched `Auntie OPAL joined` land over a
  live island, and the join banner sits on whatever terrain the player is
  standing on. Someone should shoot it.
- **The intent question is still open.** I have argued the scope does not depend
  on it, and I believe that. But if he points at the left-hand column and says
  *"the rivals were fine, it's the trophy"*, then §4 is work he did not ask for.
  It is 24 lines and it fixes a defect I have measured either way — but that is
  my judgement, not his instruction.
- **`BEHEMOTH` is the weakest link in §5.** Three syllables, and it trades a
  dinosaur a child recognises for a monster they have to learn. `BEAST` is the
  fallback and it costs the syllable escalation.
- **The plainness is a bet.** §6 records it. Opal, Duke, Tilly, Nora and Walt
  are not clever, on purpose, and someone could reasonably read that as trading
  one flavour of bland for another. The argument I would make in the room: the
  *characters* are already vivid, they have been vivid since somebody wrote
  *"cardio?? never again"*, and what they have been missing is not more flavour
  in the label. It is a name.
- **Nobody has refuted this file.** Like the verdict and the priority note it
  sits beside, it has had no adversary. Treat it as a first pass.

---

## 11. THE ASK

1. **Land both renames in one commit.** 29 lines, two files, plus the two gate
   arrays. It closes owner item 5 under either reading of what he was looking
   at.
2. **Land the four probe changes in §8 with it,** not after. Two of them are
   already-broken gate probes and one of them fails on today's build.
3. **Then show him the frame,** not the diff — the EVOLVED banner reading
   `BEHEMOTH` and a join card reading `Auntie OPAL`. Priority §7 is right that
   this item has now arrived twice without anyone confirming he saw the first
   fix. **A fix nobody confirmed the owner saw is not a fix.** Adopt that rule
   and this note does not come back a third time.
