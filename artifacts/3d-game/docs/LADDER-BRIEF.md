# THE LADDER BRIEF — get VOIDLING into the top ten, honestly

You are taking over VOIDLING: a three.js/TypeScript 3D hole.io-style game for
children aged roughly 6–11, built to ship on the Apple App Store. The repo is
`woodcode2/voidling`, the game is `artifacts/3d-game/`, and you push to `main`
(push = deploy). **Read `docs/FABLE-BRIEF.md` first** — it carries the current
status, the instruments, and the traps that have already cost wrong
conclusions. Then read this.

The owner's ask, verbatim in intent: *review the top games in Action and
Simulation, compare us on graphics, pace, flashiness, microtransactions, pop
and fun, work out what separates us from a top-ten position, and action it.*

No bias. Not toward the game because we built it, not toward a competitor
because it is famous. The point of this exercise is to find out what is
actually true and then change the build.

---

## PHASE 1 — MEASURE THE FIELD

**Pick the set from real data, not memory.** **Apple App Store only** — iOS,
US storefront, the Games category. Not Google Play, not Steam, not a
cross-platform "best of" listicle. Take the **Action top 20** and the
**Simulation top 20** (Top Free, and note each title's paid/free model as you
go). Add a third lens the owner did not ask for and needs: **the Kids 6–8
shelf**, because that is the aisle a parent actually browses and our real
competitive set lives there as much as it does in Action.

Chart positions move daily. Fetch them, **stamp every claim with a date and a
source URL**, and where a live chart is not reachable from this sandbox, say
so plainly and use a dated secondary source labelled as such. A number you
cannot source is not a number — mark it `UNVERIFIED` and it may not carry a
decision.

From those ~40–50 titles, split into:
- **True comparables** (~8): 3D casual/hypercasual, tap-or-drag one-finger
  control, short sessions, child-legible. hole.io itself belongs here.
- **Ladder-holders** (~8): the games actually sitting top-10 whether or not
  they resemble us. These teach what a top-10 slot *costs*, not what it looks
  like.
- **Category noise**: everything else. Name them, drop them, say why.

**Do not vendor competitor art, screenshots, video or audio into this repo.**
Describe, cite, link. Never copy an asset, a name, or a distinctive visual
mark.

## PHASE 2 — SCORE, ON DEFINITIONS THAT CANNOT BE FUDGED

Six axes. Each one gets an **operational definition** before anything is
scored, and ours is measured with an instrument, not an opinion.

1. **GRAPHICS** — not "pretty". Silhouette legibility at thumb size (crop a
   frame to 120px and see if you can still name the objects), material
   variety and specular response, lighting model, post chain, art-direction
   consistency across scenes, frame budget and heap at the sizes a phone
   actually runs. Ours: `qa/shading.mjs`, `qa/glosscov.mjs`, `qa/heap.mjs`,
   screenshots. Theirs: their store video and screenshots, honestly read.
2. **PACE** — time from cold launch to first input, to first reward, to first
   *meaningful* reward; distribution of gaps between rewards across a session;
   where the dead air is. We have hard numbers for ours already; get theirs
   from public gameplay footage by counting, with timestamps.
3. **FLASHINESS — AND ITS OPPOSITE.** Events per minute, screen-space FX
   coverage, camera moves, hit-stop, audio layering. This axis is **two
   sided**: too little reads cheap, too much reads noisy and desensitises —
   we already shipped a fix for a fanfare that fired 8–12 times a session and
   therefore meant nothing. Score both failure modes.
4. **MICROTRANSACTIONS** — surface count, timing of the first prompt, price
   ladder, earn-rate against prices, IAP types, ad presence and format.
   Describe theirs factually. For **ours**, every recommendation must be legal
   and clean for a 4+ kids title: no loot boxes, no gambling shapes, no
   pressure timers aimed at children, parental gate before any payment sheet,
   and Apple's Kids Category rules respected. The owner's rules stand: **voids
   are earned with coins, hats are the real-money layer**, and **the PRICES
   curve is the owner's decision — you may model it and recommend, you may
   not quietly retune it.**
5. **POP** — store-shelf physics. Icon read at 60px against a grid of
   competitors, screenshot 1, the first three seconds of the video, title and
   subtitle, colour contrast in the category page, memorability of the brand
   mark. This is the axis most likely to be under-weighted by an engineer and
   it is disproportionately what decides an install.
6. **FUN** — the reason for play four. Mastery curve, variance, the shape of
   the last thirty seconds, collection loop, competitive hook, and whether a
   session ends on a cliffhanger or a full stop.

Produce a scored table: every title on the axes that apply, us in the same
table, on the same definitions. **Where we win, say so. Where we lose, say by
how much and to whom.** A comparison where we come out well on every axis is
evidence the scoring was rigged, not evidence the game is good.

## PHASE 3 — THE LADDER MATH, WITHOUT FLATTERY

This is the part the ask most needs and is easiest to fake. A top-10 slot is
not purchased with craft alone. Decompose it and be honest:

- **What code can move**: install→first-session conversion, D1 retention, the
  first sixty seconds, session shape, juice, store creative *assets*, IAP
  surface and pacing, event/liveops hooks, performance floor on old devices,
  accessibility and one-handed play.
- **What code cannot move**: UA spend and CPI, ASO keyword competition,
  featuring, brand recognition, an existing install base, seasonal timing,
  publisher relationships.

Give the owner **both lists**, sized. If the honest read is that we are three
craft-points and one business-lever away, say exactly that. Do not present a
code-only plan as a route to top ten if it is not one. Do not inflate a
finding to make the plan look complete. **The most valuable thing you can hand
back may be "these four are ours to fix, this fifth is yours and no amount of
engineering substitutes for it."**

## PHASE 4 — ACTION IT

Rank every craft finding by `impact × confidence ÷ effort`. Then build, top
down, until the returns go thin.

- One coherent change per commit, with the measurement in the message.
- **Measure before. Change. Measure after.** A change with no number attached
  ships as `unverified` and says so in the commit.
- Screenshot the canvas for anything visual. "Looks better" is not a claim.
- `node qa/smoke.mjs` (preview on :4177, read the output for PASS) before
  **every** push.
- If a difficulty-shaped change is in scope, `qa/ab.mjs` with N≥3 and respect
  the spread; the owner's floor is *never finishing below 3rd*.
- Retract loudly when an instrument disagrees with you. This session alone
  produced three probe artifacts that read as real findings; catching them was
  worth more than the features shipped around them.

---

## EVIDENCE RULES

- Every competitor claim: source URL + date, or `UNVERIFIED`.
- Every claim about our build: an instrument run or a `file:line` you actually
  opened. Not memory, not the comment above the code.
- Single runs prove nothing on anything stochastic. Report mean and spread.
- A finding must survive an attempt to **refute** it before it costs
  engineering time. Spawn skeptics; default to "not real" when uncertain.

## TRAPS THAT HAVE ALREADY PRODUCED CONFIDENT WRONG ANSWERS HERE

- `__matchState().ate` is an **object** (`{you, family}` percentages).
  `.ate > 0` is `NaN > 0` — false forever. A probe built on it swallowed a
  400-second timeout and reported it as a 23-second result, which then read as
  a serious UX bug that did not exist.
- A probe may only perform gestures a child can. JS-clicking a `display:none`
  button manufactures states no finger can reach — that is how the same
  investigation "found" a match running behind the tutorial card.
- Game time under swiftshader runs ~10–20× slower than wall time. Sampling a
  1.7-game-second pulse every 180 wall-ms reads as a flat line. Pace probes by
  the **game** clock.
- Compare against the current baseline, not the one in an old table. A stale
  106.9% once made a healthy 78.9% look like a regression and stopped feature
  work for an afternoon.
- A backtick inside a comment inside a GLSL template literal silently produces
  a stale bundle.
- Preview servers die on container restart; `pnpm install --frozen-lockfile`
  at the repo root restores tooling; asset CDN requests **403 in this sandbox
  and that is correct**.

## RULES OF ENGAGEMENT

- **Never bypass the CDN egress block.** Never disable TLS verification or
  unset `HTTPS_PROXY`.
- Push to `main`. **Do not open a pull request** unless asked.
- **No model identifiers** in commits, code comments, docs or anything else
  pushed.
- Music and assets: CC0 / Public Domain / Pixabay / Kenney only.
- The splash and world-picker posters were photographed and approved — do not
  redesign them on a hunch.
- Nothing in this brief authorises a rewrite. If a finding implies one, write
  it up and hand it to the owner with a cost.

## DELIVERABLES

1. `docs/LADDER.md` — the scored teardown: the set, the definitions, the
   table, the sourced evidence, and the two-column craft/business split.
2. A ranked action list with effort, impact and confidence on each row.
3. The top items **built, measured and pushed**, one commit each.
4. A closing report that states plainly: what moved and by how much, what you
   could not verify, what you got wrong along the way, and what is now waiting
   on the owner.

Done means the owner can read four pages, know exactly where the game stands
against the shelf it will ship onto, and see that the top of the list is
already live.
