# WORLD 6 — SKYLARK FIELD — VERDICT

*The governor, as skeptic. Every number here was measured in this container;
nothing is asserted from the design doc.*

---

## THE HEADLINE

SKYLARK FIELD is built, populated, lit, crewed, scored, and reachable. The
push gate covers it in **29 steps**, up from 23 at the start of the stream, and
**six of those steps are new** — every one of them written because it caught
something that was already wrong.

The stream's real finding is not about world 6 at all. It is this:

> **A world is not one thing you build. It is roughly twenty rows in twenty
> unrelated hand-typed lists, and nothing anywhere was checking that you had
> written them all.**

World 6 was, at various points today, invisible to the gate, unselectable by a
child, unreachable by play, silent, hiding nothing, wearing another world's
quest board, and reading another world's newspaper. **None of it crashed.**
Every single one of those was a `?? maple`, an `undefined` that reads as a
default, or a five-entry list that simply did not mention it — and every probe
in the repository stayed green through all of it.

---

## WHAT WAS ACTUALLY WRONG, IN ORDER OF SEVERITY

| # | Defect | Why nothing caught it |
|---|--------|----------------------|
| 1 | **`WORLD_ORDER` had five entries**, so finishing POWDER PASS opened nothing and `isUnlocked('skylark')` was false forever. World 6 could not be reached by playing. | Every probe in `qa/` force-writes `voidUnlocked`, so every probe sailed straight past the ladder. |
| 2 | **No world card in `index.html`.** The picker is the one world list that is *markup*. A child could not select world 6. | No probe read the markup. Two browser probes died on 400–600 s timeouts clicking a selector that matched nothing, and I read those as probe bugs for an hour. |
| 3 | **`qa/gate.mjs:46` hard-coded five worlds.** Every per-world step the gate fans out — smoke, traverse, vary, faceparity, questable, postpipe, switch, newsarc, hero — read that line. | The gate was the thing that was supposed to catch this. |
| 4 | **`MED_BY_WORLD` / `HARD_BY_WORLD` fell through to Maple**, drawing "eat 3 houses" on an airfield with two house-tagged props. | `qa/questable.mjs` exists *precisely* for this bug and was already in the gate — it just ran on five worlds. |
| 5 | **Zero stickers.** The picker card's badge would have read `✨ 0 SECRETS`, on the line whose own comment calls the secrets "the invitation". | `STICKERS` is a hand-written spread of five arrays. `totalCount('skylark')` returns 0 and renders fine. |
| 6 | **No music.** `audio3d.ts` picks a score with an if-chain ending in Maple, so a dawn balloon meet played a sleepy autumn town. | A fall-through chain is not a keyed table; nothing scans it. |
| 7 | **`WORLD_PAR` undefined**, sending rivals down the old scale-invariant ladder nine tuning attempts had failed to fix. | Silent fallback. Symptom is a difficulty curve nobody measured. |
| 8 | **The newsroom was not wired**, so world 6 read the Maple Bugle. | The dispatch had five branches and a Maple fallback. |
| 9 | **`index.html` boot preload** rewrote a skylark session to `'maple'` on the first line the page runs. | One five-world list doing two different jobs. |
| 10 | **Store copy said "five worlds"** and `qa/iapdoc.mjs` passed — because it compares the doc against `WORLD_ORDER`, and *both sides were consistently wrong*. | Two wrong things agreeing is the hardest kind of green to doubt. |

And one that was **one world older**: POWDER PASS declared SNOW DAY and hid
nothing in it. Four seasons carry four stickers each; world 5's carried zero,
for eighteen days a year, since it shipped.

---

## THE SIX NEW GATE STEPS

Each one failed before its fix and passes after. That is the only evidence a
probe is worth having.

| Probe | What it holds | Failed at |
|-------|---------------|-----------|
| `qa/worldlists.mjs` | no probe in `qa/` believes in fewer worlds than exist | **23 stale lists** (21 frozen at *four* worlds since POWDER PASS) |
| `qa/worldreg.mjs` | every per-world table, ordered list, type union, if-chain and the picker markup knows every world | **5 tables**, then 2 more shapes it could not originally see |
| `qa/stickerreg.mjs` | every world hides ≥12 things; every season hides as many as its siblings; every sticker's district exists | **2** (skylark 0, snowday 0) |
| `qa/formsep.mjs` *(existed, unregistered)* | every palette colour can show a shape under its own world's key | world 6 was **invisible** to it, plus 5 real colours on two shipped worlds |
| `qa/blackprops.mjs` *(existed, unregistered)* | no prop face renders as a flat black hole | passing; it was in no profile |
| `qa/airfield.mjs` *(existed, unregistered)* | runway designators match their headings, the ring closes, districts have room | passing since it caught my spawn inside the 03/21 strip; it was in no profile |

---

## MEASUREMENTS

Every figure below came out of a probe in this container. Where a number is
soft, it says so.

**Placement** — 3,978 edibles, 106 big (bar 100). Road 4, float 0, inside 2,
overlap 17. Water, off-island and road-end all 0.

**Purpose** — 461 people, all moving. Drift median **0.996** against a 0.30
bar; **404 of 461 (88%)** complete a journey in thirty match-seconds against a
bar of one third. The crowd on this field is going somewhere.

**The newsroom** — 26 cards, 26 distinct, 0 repeats, 0 unresolved tokens,
longest run of the same opening word **1**. Before the fix it ran **four**
cards opening "The", and 44% of the corpus began that way; now 12%.

**Quests** — every drawable chip clearable. Supply: 3,716 small, 192 big, 72
car, 2 house. The two-house measurement is exactly why `houses` is not on this
world's board.

**Par** — `qa/ab.mjs 5 skylark child`: child mean **46,123** (sd 3,196, range
43,642–51,058), wins 5/5, worst place 1st. Par set at 0.75 of the mean →
**35,000**, where MAPLE, LANTERN and POWDER all sit.

**Palette** — 68 colours, **0** that cannot show form at ΔE 6.

---

## WHAT IS OWED, NAMED

Three things. All are visible on every gate run rather than buried here.

1. **The card poster.** Painted — two takes — and **cannot be vendored from
   this container**: `scripts/asset-refs.mjs` requires every `/assets/hf/`
   reference to exist on disk, and the CDN it fetches from is refused by this
   environment's network policy (403 to CONNECT, every retry). Writing the path
   without the file would break the build guard for everyone, so the path is not
   written. `CARD_FALLBACK` carries the card meanwhile in skylark's own dawn
   amber, balloon violet and morning blue. `qa/worldreg.mjs` prints this as
   **OWED** every run, and fails the day it is filled in so the debt cannot
   outlive its reason. Vendoring is one `curl` each, wherever the CDN is
   reachable.

2. **Par convergence.** The 46,123 was measured with **no par at all**, against
   rivals running the old ladder — the child took first place in all five runs
   and the leader reached only 66.5% of the player. The lane was not trying. It
   is a sound measurement of the child, which is what par is, but the field it
   was measured against was the wrong field. A re-run against the calibrated
   lane is owed, with the owner's floor as its bar: never below 3rd. **POWDER
   PASS carries the identical caveat one world earlier and its convergence pass
   is still outstanding too.**

3. **Five palette colours on two shipped worlds** — lantern PLINTH (ΔE 0.8),
   CASE (1.2), BLACK_L (3.8), powder CHAR (5.7), PLINTH (6.0) — genuinely
   cannot show a shape under their own key. Frozen at their measured numbers,
   not exempted and not called design. Repainting two shipped worlds needs a
   picture, not a probe: the lift that clears ΔE 6 under Lantern's 0.55 key is
   large enough to change how a night market reads. The freeze can only shrink,
   verified in all three directions.

---

## CORRECTIONS I MADE TO MY OWN WORK TODAY

Recorded because a stream that reports only its successes is not evidence.

- **I killed my own shell.** An `awk` filter to stop a probe contained the
  literal string it was matching on, so it matched its own command line. This
  is a mistake I had already written down once.
- **My repo-wide sweep introduced a runtime error into a gate step.** It put
  `ALL_WORLDS` — a node-side binding — inside a `page.addInitScript` closure in
  `qa/pickerfit.mjs`, which would have thrown in the browser on every run.
  Caught by scanning for it, not by luck.
- **I broke the GPU mutex.** An `rmdir` before `mkdir` to clear a stale lock
  removed a lock another run was holding, so two batches fought over the GPU and
  over the same output files. I read a stale result as a fresh one because of it.
- **`qa/stickerreg.mjs` was wrong three times before it was right**: it called
  nine of Maple's stickers broken (the placer maps biomes through `MAPLE_DIST`
  first); it read the last POWDER sticker as carrying maple's season (my brace
  matcher tracked only `'`, so it desynchronised on `name: "Instructor Bo's
  Bobble"`); and it called three of world 6's own stickers broken (it read
  polygon literals, missing the two districts that are strip tests). A parser
  that can read a field off the wrong object is not evidence about anything.
- **I misread `index.html:43`** as the world router when it is the music
  preload. Corrected in the commit that fixed it.
