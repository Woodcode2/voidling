# THE LIVING MENU AND THE LADDER — the build brief (round 8)

*Governor's brief for the crew. Owner's ask of 2026-09-10, verbatim: "the menu is still
the same looking … plan an exceptional menu … Each level had different goals … making
our splash image alive … 3 choices … can Opus build this if you plan it?" Yes: Opus
builds from this, at high effort; the governor gives the skeptic verdict on every step;
the owner reads §0 and §8 and the numbers in §6 and decides the twelve questions in §8.*

**Status, stated plainly.** This plan was produced in one round on 2026-09-10: seven
readers took file:line evidence from the real code (`docs/crews/round-8/reader-*.json`),
three independent concepts were written from three angles (`concept-*.json`), three
judges scored them (`judge-*.json`), and one synthesizer wrote the sections below from the
winner and every graft the judges asked for. The governor then verified the load-bearing
citations by reading the lines himself (the unconditional render at `prototype3d.ts:10948`,
`onMenu` at `:10865`, the camera branch at `:10488`, attract mode at `:9849`, the goal card
at `:6029`, `endMatch` at `:5324`, the dead `#gift` at `index.html:1501`, `#coins` at
`:1885`, and the solo-branch return that skips `completeWorld`). **The four-lens skeptic
pass** (the six-year-old / performance on a four-year-old iPhone / the code / the gate)
**is recorded in §9.** The child's lens KILLED draft 1 — its ladder made a WIN the gate on
three of five dots per world, which `src/game/unlocks.ts:9-16` names as the one thing this
build has never done to a child. The spine is therefore changed in this draft: **finishing
advances the ladder, winning decorates the pip** (§0.6, §3.2, §8.1). The other three
lenses returned SOUND WITH CORRECTIONS; every "blocks" and "must-fix" item is applied in
place below and listed in §9 with what changed. Where a bar was rewritten, the old bar is
in §9 so nobody has to trust that the correction happened.

**Three decisions the governor took that differ from the round-7 polish plan**
(`docs/crews/round-7/holeio.polish-plan.md`), each with the alternative named:

1. **Streams B and C are one stream, and they go next — before D (colour and pop).** The
   polish plan put the menu last, "first update", to avoid building it twice against D's
   materials. That reasoning does not hold: the diorama is the LIVE island, so it renders
   whatever materials D later lands, for free. The owner has now asked for the menu, and
   the ladder lives on it, so they ship together. Alternative: D first, as planned, with
   the menu a poster for another month. Rejected.
2. **The void stands ON his island, not under it.** The key art shows the island floating
   above and the void's face below, looking up. The menu keeps the key art's
   *composition* — the island floats in the night through a feathered window, the
   cosmos and the star dots stay — but the creature is a creature on the ground, blinking,
   breathing, chomping when tapped, at 28–42% of the window's height. A void floating in
   space beneath a slab would contradict the game a child is about to play. The painting
   itself is not thrown away: it is the boot cover (§6 day 13) and the store listing.
   Alternative: render the painting's literal scene in 3D (falling houses, the face
   below). Rejected; §7.
3. **"Strictly sequential" means the five dots inside a world, and a dot is passed by
   FINISHING it.** Worlds still open the way `src/game/unlocks.ts` says — finish any match
   on the one before, never a wall — and a dot opens the next dot the same way: any
   finished match on it. The goal decides the *decoration* (tick, star, the on-the-spot
   win ceremony), never the gate. Draft 1 gated dots on a win with a third-miss escape;
   the child skeptic killed that (§9.1) and the owner's 2026-09-06 decision 1 ("the clock
   running out fails it") still holds for the *level result*. §3.2 states the alternatives
   and §8.1 puts the spine to the owner as the first decision.

**One real bug found on the way, fixed in this stream (day 5):** the solo branch of
`endMatch()` returns at `prototype3d.ts:5372` (the `.show` add is `:5364`; the code
skeptic corrected the line) before `completeWorld()` at `:5509`, so a child who only ever
plays BY MYSELF never unlocks world 2. Fixed on day 5 of §6 with `qa/levels.mjs` (b).

**Sources.** `docs/crews/round-8/` (this round's verbatim record); `holeio.recon.md` (the
owner's own frames of Hole.io, measured); `holeio.polish-plan.md` §4 (the owner's
decisions of 2026-09-06, binding); `src/prototype3d.ts`, `src/proto3d/island.ts`,
`src/proto3d/void3d.ts`, `src/proto3d/life.ts`, `src/proto3d/audio3d.ts`,
`src/game/unlocks.ts`, `index.html`, `qa/` at branch head `7ab632b` (the skeptics read
`7ab632b`; the readers read `17246d8`, one docs commit earlier — same source). Where a number of
ours is *derived from code* rather than measured from a frame, it says so, and the first
two days of the stream measure it.

**Standing constraints.** The void is a creature and gets refined, never replaced by a
hole. No ads, no ad-skip currency, 4+ stays 4+, a parental gate on any spend. Nothing
lands without a probe that fails before the fix and a skeptic verdict. The push gate
(`qa/gate.mjs --profile=push`, 35 steps today) stays green at every commit. Measure before
you change anything. Keep every model identifier out of anything pushed.

---

## 0 · The decision, in ten lines

1. The menu becomes a window onto the real island — the one that is already built and
   already drawn behind the menu on every launch. A hole is cut in the curtain and the
   camera is parked low. **What that frame costs is not known** (§2, §9.2): today's hidden
   frame is the spawn shot looking 46° down; the stage looks along the plateau, the frame
   class the intro measured at 4,694 draw calls. Day 1 prints the two side by side before
   anything is authored. **DONE 2026-09-10 — §2.9.** The answer is not what either side
   was arguing about: 72–92% of today's menu frame is the half-rate shadow pass, the
   diorama's own scene costs about +120 draw calls, and at the framing §2.3 asks for the
   menu gets CHEAPER on four of five worlds. The 4,694 figure describes the opening as it
   was BEFORE the shadows-off line beneath it existed; today's opening is 337.
2. The child sees her void, at her size, on her island, breathing and blinking; the
   waterfall pours, the bay swells, the crowd walks. Tap him and he chomps.
3. Under the window: five dots, one per goal on this world — pictures of the goal, not
   numbers. Green and bigger for the one she is on; grey when she has finished it; a tick
   on it when she met the goal; a magenta star when she cleared the world's number; blue
   with a padlock for later.
4. One fat green PLAY. One tap and she is in this world's next dot. No picker, no
   calendar, no price in the way.
5. Three tabs at the bottom, each its own colour, each a picture: SHOP, HOME, SCRAPBOOK
   (stickers, trophies and top voids live inside the scrapbook). The shop never shows her
   a price until a grown-up has opened the gate this session.
6. Thirty levels: five per world in the owner's order — EAT, SET, LANDMARK, RIVALS,
   CLEAR. **MEETING THE GOAL opens the next dot** — the owner's decision of 2026-09-10,
   §8.1: *"they should be hitting the goals to move on … Maple starts easy … as you tick
   up it gets harder."* The Angry Birds shape. The clock running out is "NOT YET" on that
   dot: coins are kept, nothing is taken away, and she plays it again.
   **The gate is only safe because the GOALS carry the difficulty, not the gate** — every
   one of the thirty is set on day 2 from what a real run actually reaches, Maple dot 1
   winnable first try and each dot and each world stepping up (§3.2, §3.4). A goal that
   cannot be met is a wall, and three of the five are unmeetable as first drafted; that is
   day 2's whole job now. The last-ten-seconds ritual is still never a countdown to
   losing (§4.3).
7. A world never walls the next one: finishing any match on a world still opens the next
   world, as today. That is a decision (§3, §8.1); the alternative is named.
8. The end card lights the dot first — the pip itself, big, before any word — then counts
   the coins, then shows the next island as a locked jewel. CONTINUE goes straight into
   the next dot.
9. Our paint, not Hole.io's: our violet cosmos and star dots, our tab colours, our
   painted islands, no platform emoji, no dingbat ticks. Hole.io's proportions (49% world,
   45% ground, five dots, one tap, three tabs) are kept because the owner measured them
   and they work.
10. Numbers before pixels: the first two days measure what the window costs on every
    world at the stage's own frustum, on a page per rung, with `renderer.info` read
    honestly — and what a six-year-old can actually reach on each level. Nothing is
    authored before those numbers exist. ~17 crew-days (§6).

---

## 1 · The screen

**Mechanism.** Hole.io's frame, measured (`holeio.recon.md:25-30`): violet ground over
45% of the frame; a diorama of the current level at 49% of height; five colour-coded
pips (current one 29% wider); PLAY full width; three hue-coded tabs; one tap from menu to
playing. Ours: the same proportions on our own palette, with the world seen through a
feathered oval so the island floats the way the key art's island floats.

**Ours today.** `#menu` is `position:fixed; inset:0; z-index:10`, opaque: three radial
gradients ending at `#0d0821` (`index.html:885-899`), star dots on `::before`
(`:888-896`), painted key art on `::after` at `center 13vh / auto 66vh`
(`:899-912`). Markup order: `.logo`, `.tag`, `#menuOrb` (hidden, `:926`), `#btnPlay`,
`#eventRibbon`, `.navRow` of four tiles, `#btnSettings`, `#gift` (dead: `:1501`,
`prototype3d.ts:7925-7944`) (`index.html:1942-1990`). PLAY → `#worlds` poster grid →
card is two taps (`prototype3d.ts:6493`, `:6503`). `body.menu` is set on every menu entry
(`:5553`, `:7699`, `:7776`) and removed at `beginMatch` (`:6185`); nine HUD hide rules
key on it (`index.html:234-1811`).

### 1.1 Bands (reference 430×932 CSS px @ DPR 2; safe-area top 47, bottom 34)

`#menu` stays `position:fixed; inset:0; z-index:10; display:flex; flex-direction:column`
but paints **nothing itself** (`background:none`; `::after` deleted). It holds four
band elements; only the ones marked GROUND paint colour. No `mask-image` anywhere
(judge 2: iOS WebKit prefixing and per-frame re-raster risk): the window is an ordinary
element whose background is a radial gradient that is transparent in the middle.

| band | y (px) | share | element | paints | holds |
|---|---|---|---|---|---|
| A · status | 0–56 | 6.0% | `#menuTop` (with B) | GROUND, our cosmos `#0d0821 → #1c0f3d` + star dots (`::before` moves here from `#menu`) | `#btnSettings` gear 44×44 at left (kept, `index.html:1981`, `:1507`; the ⚙️ glyph becomes an SVG); `#coins` chip at right (already z11, `:1819`) |
| B · identity | 56–140 | 9.0% | `#menuTop` | GROUND | `.logo` three-layer type, 40 px cap height, one line, selectors `#menu .logo` and `#menu .logo i` kept for the splash step (`qa/firstframe.mjs:215-218`); beneath it the **world chip** `#btnWorlds` 44 px tall: poster thumb 32×32 (`paintWorldCard`, `prototype3d.ts:6689`) + world name in 14 px caps + `▸`. Its text node is the existing `.tag` element re-purposed, so `#menu .tag` still resolves. **The season pennant `#eventRibbon` hangs here**, at the chip's right, 44 px tall (poster thumb + a date, never a countdown), shown only when `liveEvents().find(isUnlocked)` (`prototype3d.ts:6784`), same tap handler (`:6791-6795`) — it reloads into another world, so it lives outside the chomp surface (§9.1 note 10) |
| C · window | 140–597 | **49.0%** | `#menuWindow` | `background: radial-gradient(ellipse 100% 100% at 50% 44%, transparent 0 56%, #1c0f3d 74%)` — transparent centre, 48 px feather, opaque cosmos in the corners; `pointer-events:auto` (the tap-chomp surface, §2.6) | the live world. **Nothing else sits inside the window** — no pennant, no chip, no text: every picture in the window makes him chomp and nothing in it may navigate |
| D · ladder | 597–669 | 7.7% | `#menuGround` | GROUND, lifted violet (bar 1.3) | `.pips` — five pips centred: 4 × 44 px + 1 × 57 px + 4 × 14 px gaps = 289 px; under them `.goalLine` 16 px cream, 32 px tall (the same string the goal card shows, §4.1) with `#soloTog` "BY MYSELF" as a 44 px chip at its right end (id kept for `qa/solotog.mjs`; hidden on goal 4) |
| E · PLAY | 681–769 | 9.4% | `#menuGround` | GROUND | `#btnPlay` 398×88, 16 px gutters, our PLAY green with a 3 px cream rim (the measured 17.9:1 rim trick, recon `:238`), label "PLAY" 34 px, no pulse, no breathe |
| F · tabs | 785–881 | 10.3% | `#menuGround` | each tab its own hue | three tabs 132 px wide × 96 px: SHOP (`#btnShop` kept, `index.html:1977`), HOME (active, default), SCRAPBOOK (`#btnBook` kept, `:1976`); each a 28 px **rendered sprite** (§1.4) over an 11 px label; the active tab lifts 6 px with a 3 px white underline. The SHOP tab opens the coin-skins shelf only; with no grown-up gate passed this session `#shop` renders **no price text and no LEGENDARY tier** — an "ask a grown-up" row stands in its place (§8.5, decided; bar 5.1.21) |
| G · safe | 881–932 | 5.5% | `#menuGround` | GROUND continues under the home indicator | — |

Ground total A+B+D+E+F+G = 475 px = **51.0%**; window 457 px = **49.0%**.

### 1.2 Homes for every existing surface

| today | home | notes |
|---|---|---|
| `#btnPlay` | band E | id kept: 82 probes click it (`qa/smoke.mjs:80` et al.). One tap → `launchWorld()` minus the picker (§4), **on the built world (`pickedWorld`, `:355-358`) at that world's current dot — never a reload; world travel is the chip's job** (gate skeptic: ~110 probes load `?w=` and expect that world) |
| `#worlds` / `#worldRow` / `.wCard[data-world]` / `#soloTog` | untouched, opened by `#btnWorlds` | `data-world` stays on all six cards (`qa/worldreg.mjs:195-197` is a push step); each card gains five mini-pips beside `.wBest` (`prototype3d.ts:6717-6737`); world switch stays a reload (`:6766-6770`) |
| `.navRow` SCRAPBOOK / SHOP / TROPHIES / TOP VOIDS | deleted (`index.html:1975-1980`, `:1454`) | SHOP and SCRAPBOOK become tabs; TROPHIES and TOP VOIDS become chapter chips inside `#book` (`:1986`), ids `#btnTrophies` / `#btnTop` kept on those chips (read by `bookshot.mjs:49`, `econ`, `funnel`, `journey`, `shopdoors`, `uisystem`); `#trophies` (`:2157`) and `#topvoids` (`:2169`) are re-parented as the book's pages 2 and 3, ids kept |
| `#btnSettings` / `#settings` | band A | kept (`prototype3d.ts:8114`, z46 `index.html:1511`) |
| `#gift` | **cut** | dead already (`index.html:1501`, `prototype3d.ts:7925-7944`); markup, CSS and the `if (false)` block deleted |
| `#menuOrb` | **cut** | `index.html:1951-1970` |
| `.tag` "STARRING THE VOIDLINGS" | re-purposed | the element survives as the world chip's text (`firstframe.mjs` selector) |
| `#menu::after` key art | **cut from the menu** | `/assets/splash_hero.webp` stays for the boot cover (§6 day 13) and the store |
| `#eventRibbon` | the pennant in band B, beside the world chip | `prototype3d.ts:6778-6796` unchanged; outside the chomp surface because its tap reloads |
| `#daily` (z45) | **moves to the end card** | today it rises full-screen at module init whenever `voidDailyLast !== today` (`:7966-7967`, `:8083-8084`) with a text button "CLAIM 90✦" (`:8049`) — on her second day that modal is the first thing a non-reader is asked to press, and 383 probe files seed `voidDailyLast = today` so no probe ever saw it (child skeptic). Now: PLAY is never behind it; the day's coins are claimed silently on the first finish of the day and count up on the end card (`#endSub`), where the ceremony already lives; the calendar page itself is a chapter in `#book`. Bar 4.7.1 runs with `voidDailyLast` seeded to today **and** to yesterday |
| `#quests` HUD, `#endQuests`, `QUEST_POOL`, `voidQuest*` keys | **cut** | owner's decision; §7 |
| `#tapGate` reload path | unchanged | `:6840-6931`; the stale comment at `:6919-6931` is deleted so a builder stops designing for a tap that does not exist |

### 1.3 Bars

1. Band shares at 430×932: `#menuWindow.getBoundingClientRect().height / innerHeight`
   = 45–53% (target 49); ground ≥ 45%; the window's box does not intersect `#btnPlay`,
   `.pips`, `.tabs`; and the curtain really has a hole: a screenshot of the window box
   with the canvas hidden vs shown differs in ≥ 60% of its pixels (gate skeptic: a
   changed-pixel bbox measures the crowd, not the window).
2. Every interactive element inside `#menu` is ≥ 44×44 CSS px: gear, world chip, pennant,
   pips (44; current 57), `#soloTog`, PLAY (≥ 72 tall at any viewport), tabs (≥ 72 tall).
   Judges: today's 26–28 px chips are below a six-year-old's finger.
3. Ground: bands D–G are a lifted violet in our hue family — **HSV value 0.45–0.65 and
   chroma 0.35–0.55 as `chroma.py` computes them** (`holeio.polish-plan.md:100-107`),
   sampled in four 8×8 boxes at the corners of the PLAY band on a cranked frame (bar
   5.1.20; `qa/menushot.mjs` prints "ok" with no verdict and stays the lookbook's
   picture only); bands A–B stay the cosmos (`#0d0821 → #1c0f3d`) so the island floats
   against night.
4. PLAY ink contrast ≥ 4.5:1 by `qa/pickerfit.mjs:211-225`'s method (P95 vs P30 inside
   the box on the lit frame) at three orbit phases; label glyph p10 ≥ 4.5:1 by
   `firstframe.mjs:88-105`. The house bar is 4.5, not the 4.2 in the polish plan.
5. Tabs: pairwise ground ΔE (CIE Lab, `qa/lockedcards.mjs:41-49`) ≥ 15; each label
   ≥ 4.5:1 on its own tab; three hues visible at once (the active hue floods its own
   tab only).
6. UI motion after a 260 ms settle: **0 changed pixels** per frame inside `#btnPlay`,
   `.pips`, `.tabs`, `#coins`, `.logo`. No PLAY breathe, no ring pulse (recon `:629`: the
   world moves, the UI does not). The only UI motion is event-driven: the pip hop (§3.3),
   the locked wiggle, the first reveal (§4.6).
7. No platform glyphs: zero code points in `\p{Extended_Pictographic}` **or U+2600–27BF
   (Misc Symbols, Dingbats — the ✓ and ★ a builder reaches for)** inside `.pips`, `.tabs`,
   `.goalLine`, `#goal`, `#titlecard`, `#endPips`, `#endHd`, `#btnWorlds`, `#banner`,
   `#count`. Tick, star and padlock are sprites (§1.4). `index.html:994` already records
   "system emoji standing in for the art" as a shipped mistake; Chromium draws Noto, the
   phone draws Apple, and neither is this game.
8. Viewports (judges: "only one viewport"): at every view the splash step already runs
   (`qa/gate.mjs:233-236`) plus 393×700 and landscape 932×430 — no horizontal overflow,
   window ≥ 40% of height, PLAY ≥ 72 px, pips ≥ 44 px. Collapse order on short screens:
   window 49 → 40%, tab bar 96 → 72, logo band 84 → 56 (cap 40 → 28), PLAY 88 → 72,
   goal line 32 → 28; pips never shrink. Landscape (w > h): two columns — the window
   takes the left 56% at full height, the chrome stacks in the right column. iPad
   portrait: phone bands, chrome capped at 520 px wide and centred, window full width.

### 1.4 Icons are the game's art

Pip, tab and goal-chip icons are **sprites rendered from our own props** at build
time, not glyphs: a new `qa/icons.mjs` drives the ASSETVIEW camera branch
(`prototype3d.ts:10488-10490`, flag beside `_qd` at `:3618`) to render, per world, the
hero landmark (Town Hall `island.ts:8065`, Royal Mariner `:7703`, Stadium `:7150`,
Bathhouse `:6777`, Lodge `:5919`, the hangar `:6499` / whale `:6196` per §8.2), a snack
stack, the SET trio (car + house + snack, or cabana/gold where the world serves them),
a rival's face (via `__voidGroup`, `:2139`, second skin), and the island poster thumb
(`paintWorldCard`, `:6689`) — written to `public/assets/pips/<world>-<goal>@2x.png`
(96×96) and committed, plus the three marks — tick, star, padlock — drawn as sprites
in the same sheet. Tab sprites: a hat (SHOP), the void's own face (HOME), the scrapbook
cover (SCRAPBOOK). The probe for bar 1.3.7 fails on any emoji or dingbat.

Committed renders of live props are a snapshot of the game kept in the repo (gate
skeptic; `GOVERNOR.md:41-52`): a later art pass on the Town Hall would leave a stale icon
and nothing would fail. So `qa/icons.mjs --check` hashes the factory sources named per
icon (`island.ts:8065`, `:7703`, `:7150`, `:6777`, `:5919`, `:6499`/`:6196`) into a
sidecar `public/assets/pips/sources.json` and FAILS when a hash moved and the PNG did
not; registered static in push (the `packfresh` pattern). The sprites are rendered under
swiftshader — AA and precision differ from a device GPU, acceptable at 96 px, and said
so in the sheet's header.

**Probe.** `qa/menu.mjs` bars 1, 4, 5, 7–11, 17 (§5.1).

---

## 2 · The diorama

**Mechanism.** The hero is a live 3D view of the current level's world at 49% of the
frame, on a slow camera move, with the creature in the foreground; the world moves, the
UI does not (recon `:552`, `:629`).

**Ours today.** The whole scene is built before the menu is usable (`createIsland` is a
top-level await, `prototype3d.ts:1728-1734`; the boot cover `#loadScr.boot` z60 holds
while it builds, `index.html:1311`), and `animate()` renders it **every frame behind the
opaque menu** with no gate on `started`, `paused` or `body.menu` (`:10948-10957`) — on
rung 0 with the bloom composer and a half-rate shadow pass (`:10946`, `:1303`). The
adaptive ladder is inert on the menu (`:10912` gated on `started`). Attract mode drives
the void around after 4 s idle (`:9849-9860`); `fadeOccluders` walks every edible every
frame (`:10896`, `:1198`); rivals move on the boot menu and are frozen on the post-HOME
menu (`:10290`). **No menu-idle frame time or draw-call number exists anywhere** —
`qa/_refute_perframe.mjs` samples in-match only. The intro's high shot measured 4,694
draw calls / 1.40 M tris against 1,241 / 355 k in settled play (`:10496-10500`) — **but
both were read with `renderer.info.autoReset` on** (three `:4528`), and on rung 0 the
frame goes through the bloom composer whose quad passes each call `renderer.render`, so
`info.render.calls` after the frame holds the LAST post pass, not the scene (gate
skeptic, §9.4). Those two numbers are re-taken on day 1 with `autoReset = false` before
they are used as a bar. What renders behind today's menu is the **spawn frame**: the
match branch with `armed=false`, `targetDist = PLAY_DIST` 29 (`:750`) along `camOffset`
(0.62, 0.92, 0.62) (`:686`), pitched 46° down so the frustum ends ~36 units ahead. The
stage (§2.4) pitches ~19° down with its top edge ~3° below the horizon — a different
frustum on the same scene, and its cost is unknown until day 1 prints it;
`camera.far` is 1000, raised to 1400 (`:663`, `:10492`) — nothing on the island is ever
far-culled, so **direction, not distance, is the draw-call variable**.

### 2.1 Modes and entry points

- `menuMode: boolean` (new, module scope) with **one** entry `enterMenu()` and **one**
  exit `leaveMenu()`. Entry points: module init, keyed on the **honest signal** `#daily`
  already uses — after the first-launch block (`:6559-6562`) and the `voidAutoPlay` block
  (`:6840-6841`) have run, `if (getComputedStyle(menuEl).display !== 'none') enterMenu()`
  (code skeptic: the complement of `!voidPlayed` misses every fresh profile under a debug
  param, `DEBUG_HARNESS` `:3620`, which shows the menu with attract mode driving the
  void); `#btnHome` (`:7696-7702`), pause-quit (`:7776`), the end-shop door (`:5553`).
  Exits: `beginMatch` (`:6185`) and the reload gate (`:6870`). Bar 5.1.22: whenever
  `#menu` is displayed, `__menuState().menuMode === true`. `body.menu` is set/removed exactly where it
  is today — the menu theme (`:10865-10888`) and the nine HUD hide rules depend on it.
- `menuMode` is **not** `onMenu`: `onMenu` (`:10865`) includes `#end.show` for the music
  and must stay that way; the camera, freeze list and menu rung key on `menuMode` only,
  so the end card keeps sitting over the dimmed match world (`#end` z9, blur 8 px,
  `index.html:708`) and the diorama engages on HOME, not on the whistle.
- `const menuMode` is read at the **top** of `animate()` (`:9467`), never inferred from
  `!started` — `started` is a since-load latch (`:5324` never clears it; only `:7776`
  does), and the boot menu (`started=false`) and the post-HOME menu (`started=true,
  ended=true`) must converge (`streamA.started-census.md:244`).

### 2.2 What `enterMenu()` does, in order

1. **Restore the island** (judge 1: "the post-HOME menu shows a half-eaten island").
   `#btnHome` today only removes `#end.show`, sets `body.menu`, shows the menu and
   re-renders the rank (`:7696-7702`); nothing regrows the world — that is `resetMatch`
   (`:7571`), whose edible loop (`e.eaten=false; e.mesh.visible=true; position/scale/
   rotation from home; setShadowInstance`, `:7620-7640`) and `voidling.setStage(0);
   voidling.setRadius(START_R)` (`:7644`) are split into a new `restoreIsland()` called
   from both `resetMatch` and `enterMenu`. `resetMatch` keeps everything about the
   *match* (news, banners, bubbles, arc, `rivals.reset`). It is a single-frame walk of
   every edible (6,537 on Game Day) writing an instanced shadow attribute per prop; on
   HOME it runs **the frame after** `#btnHome`, behind the still-shown end card, and
   `qa/menuframe.mjs` prints its ms per world (perf skeptic).
2. **Calm the crowd.** `life.calm(Infinity); life.tension(0)` unconditionally — `beginMatch`
   sets `life.calm(COPY.introLen + 1.2)` (`:6120`) and only `endMatch` restores infinity
   (`:5327`); the quit path (`:7765-7778`) never does, so without this the parked void
   sits inside the crowd's fear radius and the diorama screams (code skeptic). Bar 2.8.7.
3. **Park the void** at the world's `MENU_STAGE` (§2.3) by the `__warpVoid` pattern
   (`:2262-2270`: `voidState.x/z`, `camFollow.copy`), then `voidling.setRadius(MENU_R)`
   (rig API, `void3d.ts:24`, `:1704`; read the gate note at `:611` first) in mood
   `'cruise'` via `voidling.setMood` (`void3d.ts:54`) — never the `_dbg` hooks.
4. **Hide the family**: `rivals.setVisible(v)` added to the `Rivals` interface
   (`rivals.ts:35`) beside `reset()` (`:811`), iterating the closure-internal cast
   (`rv.group`, `rv.halo` — `rivals.list` carries no mesh, code skeptic). Rivals are
   already invisible until they join (`:595`), so this matters on the post-HOME and
   post-quit menus. Judges 1 and 2: a frozen walker locked mid-stride inside a scene where
   the crowd keeps working reads as a bug; the family belongs in the match. RIVALS'
   picture on the menu is its pip.
5. **Apply the menu rung** (§2.7). From HOME/quit the camera **hard-cuts** to the parked
   stage behind the end card — the card's 82% ground and 8 px blur (`index.html:708-710`)
   hide the cut, and the end card is hidden one frame later. Draft 1's 900 ms ease from
   the whistle camera (camDist up to 340, 46° down, every eaten prop just restored,
   shadows on) was by construction the most expensive 54 frames of the session on the
   dense worlds (perf skeptic, §9.2); it is gone. At boot the camera starts parked.
6. Run `fadeOccluders` **once** (`:1184`) against the parked line, then every 60th frame
   (it walks all edibles; the camera is static enough for that).
7. `leaveMenu()` (called at `beginMatch`, `:6185`, under the menu hide) reverses 3–4
   (`setRadius(START_R)`, warp to the world's spawn const, `rivals.setVisible(true)`),
   restores the renderer's shadow boolean to `QUALITY[qLevel].shadows && !qShadowLatch`
   **before** `beginMatch`'s intro captures it (`introShadow = renderer.shadowMap.enabled`,
   `:10505`), and **restores pixel ratio and `bloomOn = QUALITY[qLevel].bloom` here too**.
   Draft 1 deferred DPR/bloom to `introT <= 0`; both the code and the perf skeptic
   refuted that (§9.3, §9.2): `introT` only becomes > 0 in `startMatch()` (`:6333`, the
   first touch), so the whole armed idle — the arrival fall, the goal card, the frame the
   owner measured against Hole.io — would render at menu DPR with no bloom, and the
   composer's mip chain would then be reallocated on the controls-live frame, the one
   `qa/opening.mjs` A4 samples. The tap frame is under the menu hide and already snaps
   the camera; it double-flips nothing because shadows are left to the intro's own
   toggle. Bar 4.7.9: the first armed frame's `__quality().pr === QUALITY[qLevel].pr`.

### 2.3 The stage, per world

`MENU_STAGE: Record<WorldId, { x, z, a0, look }>` beside `WORLD_COPY` (`:1492`) — six
rows or the build fails (the ternary-fallthrough bug is recorded three times,
`:3843-3870`, `:3899-3906`). The void is parked so the world's **moving thing** is
behind him for goals 1/2/5 and the camera nudges toward the hero for goal 3 (target
slides 30% toward `COPY.hero`); goal 4 uses the default stage (no family on the menu).

| world | void parked near (3D) | what moves behind him (free, already ticking) | hero for L3 (3D) |
|---|---|---|---|
| Maple | the waterfall lip, inboard of the rim — `WATERFALL` `[9800,10150]` → (190, 207.5) (`island.ts:278`, sheet + spray `:3812-3838`, scroll/pulse `:4019-4020`); balloon overhead (`:8857`) | waterfall, spray, balloon, town crowd | Town Hall (42.75, −68) (`:8065`; `hero:null` at `prototype3d.ts:1501`) |
| Pirate | the bay shore under the Royal Mariner | the swell shader (`island.ts:3880-3931`, one draw), tender / jet-ski afloat movers (`life.ts:4013-4087`) | Royal Mariner (127, −115) (`:7703`) |
| Game Day | the plaza before the bowl | tailgate crowd (`life.ts:5384-5521`) | Stadium (−3.5, −140) (`:7150`) |
| Lantern | the canal bridge | spirit crowd (`life.ts:4603-4685`; ~966 walkers — the hotspot, `:6813`) | Bathhouse (14, −175) (`:6777`) |
| Powder | the frozen lake shore | skaters (`life.ts:4718`, fast movers), Old Bess, lift chairs | Lodge (5, −182.5) (`:5919`) |
| Skylark | the launch circle | balloons, crew walkers, soap bubbles (`life.ts:2433`) | hangar (5.5) `:6499` or whale `:6196` — §8.2 |

The exact `a0` (which way the wedge faces) is **authored from the day-1 azimuth
series**, not guessed: the probe sweeps 0–360° at each stage and prints draw calls per
10°; `a0` is the cheapest 12° arc that still holds the moving thing and the hero in
frame. Maple's waterfall is authored **past** the plateau edge — the sheet is centred at
y −8.5 (spanning −21.5..+4.5, "lip breaks the cliff rim", `island.ts:3825-3832`) and the
spray at y −22 (`:3834-3838`) — so a camera low enough to frame the creature and the
pouring sheet must look past the rim into the cosmos. Draft 1's "no rim sky shows" bar
could not hold with that stage (code skeptic); the bar is now: **rim and cosmos may show
below and behind the sheet; the void stands on standable ground (`inWater3` false,
`biomeAt` non-null) and no ground gap shows between him and the rim.** That is the key
art's own composition — the island edge with the water falling off it.

### 2.4 Camera

A fourth branch beside ASSETVIEW/TOPDOWN (`:10488-10494`): `else if (menuMode)` writes
`camera.position` and `lookAt` directly and never touches `camOffset`, `camDist`,
`camFollow`, `targetDist`. `menuDist = 22` (units from the void), height 9, look-at
2 units above ground at the point one third of the way from the void toward the hero.
`menuDist` is passed in place of `camDist` to `updateLodBias`/`fitShadow`
(`:10894-10895`, `:1113`) and `crowdGate` (`:10277` → 22·2.2+90 = 138 units; pirate ×2).
The fog write (`:10648`) and `camera.updateMatrixWorld()` (`:10643`) are the last
statements **inside** the match `else` branch, so a sibling `else if (menuMode)` never
reaches them (code skeptic): the menu branch writes `scene.fog.near/far` from `menuDist`
and calls `updateMatrixWorld()` itself; bar 2.8.11 reads `__menuState().fogNear === 60 +
menuDist·1.4`. Leaving is free for the camera: `beginMatch` snaps `camDist =
DESCENT_START` (`:6152`) and the follow spring takes the authored position at lerp 1
while armed (`:10629`); DPR and bloom are `leaveMenu`'s job (§2.2.7).

**Pendulum, not orbit** (judges 1 and 3 against the 360° turn): azimuth = a0 +
6°·sin(2πt/16 s), with the phase advanced on `tClock` / `performance.now` and **never
`Date.now`** (the probes virtualise `performance.now` only, `qa/ladder.mjs:70-71`; a
`Date.now` pendulum reads as a constant under the crank) — peak 2.36°/s = 0.039°/frame at
60 fps — so the far plateau never enters the frustum. `__menuState()` exposes the
authored `{a0, amp, period}` so a probe asserts the sampled series against them instead
of fitting a sine to an eighth of a cycle. Under `body.calm` / `reduceMotion()` (`fx.ts:48-65`,
the BIG MOTION switch `prototype3d.ts:7734`, `:8107`; CSS `index.html:1845-1861`) the
azimuth is **constant** at a0 and every menu CSS animation is off; the world's own
idles (water, crowd) continue — they are content, not camera.

**Size on screen** (judge 1: "never authored"): FOV 32° vertical (`:663`), canvas =
full viewport, so px/unit = 932 / (2·d·tan 16°) = 932 / (0.5735·d) = **74 px/unit at
d = 22**. At `START_R` 0.9 the creature is 133 px tall = 29% of the window; `MENU_R =
1.2` (diameter 2.4 u → 178 px = 39% of the window) is the authored default, tuned in the
lookbook inside the bar below. The frustum centre (viewport y 466) lands in the window's
lower 40%, so the void sits low and the landmark rises above him without extra tilt.

### 2.5 Motion budget (60 fps reference)

| what | amount | source |
|---|---|---|
| camera | median 0.2–1.0 px/frame at the landmark silhouette, max ≤ 2 px (recon `:629` "~0.3 px/frame") | pendulum above |
| void | breathe ±1.6% at 2.2 rad/s; blink 0.16 s every 2.5 s + pattern; pupils follow the camera azimuth and the last tap point | `void3d.ts:2050`, `:2297-2310`, `:2340-2347` — untouched |
| void, scripted | gaze up at the hero every 6–9 s for 1.4 s; `chomp(0.6)` every 14 s preceded by 0.8 s of `'hungry'`, only when nobody has tapped for 14 s | rig API `void3d.ts:54-75`; a `voidling.look(nx, ny)` method is added if `lookX/lookY` are not exposed |
| world | waterfall scroll 1.6 uv/s, spray pulse, balloon, bay swell, star twinkle, curios spin, crowd inside 138 units | `island.ts:4011-4028`, `prototype3d.ts:9487`, `life.ts:6808-6866` |
| UI | 0 px/frame after settle | bar 1.3.6 |

### 2.6 The tap

`#menuWindow` (band C) is the hit surface; every other band is `pointer-events:none`
except its buttons. On `pointerdown` anywhere in the window: project the void's centre
(`camera.project`), turn his eyes to the tap point, `voidling.chomp(0.7)`, `buzz(25)`
(`:3596`, honours `voidHaptics` `:3594`), and a chomp sample scheduled 120 ms later at
the mouth-close (the audio unlock ran in the capture-phase window listener before this
handler, `audio3d.ts:282-324`; `startLoop` accepts a gesture inside 1.5 s, `:459` — the
device day confirms the first chomp of a session is audible). The event stops there: the
canvas's `pointerdown` (`:3397`, guarded on `armed`) and `lastInput` (attract mode) never
see it. The whole window is his hit area — a six-year-old's finger is 12 mm wide and
the judges' mis-tap protocol (§8.9) measures whether that is right.

### 2.7 The menu quality rung and the freeze list

**Never through `applyQuality()`** for shadows: its shadow branch sets `qShadowLatch`
(`:1354`, one-way for the session) and rebuilds every material (1,677 ms measured,
`:1340`). The menu rung is `applyMenuRung()`: `bloomOn = false` (module `let`, `:1303`,
read at `:10948`); `renderer.setPixelRatio(Math.min(devicePixelRatio, qLevel <= 1 ? 1.5 :
1.3))` (`:1315` pattern, `PR_TOP` `:142`); shadows stay whatever the renderer already
has. **`applyQuality()` ends with `if (menuMode) applyMenuRung()`** so a `__pinQuality(n)`
on the menu — which writes DPR 2.0 and `bloomOn = true` for rung 0 (`:1315-1316`) —
still renders the menu rung (code skeptic: otherwise every menu probe pinned to rung 0
measures a rung-0 menu with the bloom composer, not the shipped one). `__menuState()`
carries `menuRung` and `pinnedMenuRung` (`__pinMenuRung(n)`, the sibling of
`__pinQuality`) so the two ladders are distinguishable in one read; `__quality().level`
(`qLevel`) never moves on the menu — but note `__quality().shadows` and `.pr` read the
renderer live (`:2259-2260`) and DO move under menu steps 1–2 (gate skeptic).

**Composer warm-up.** Today `ensureComposer()` (`:159-162`) runs on frame 1 under the boot
cover because `bloomOn` starts true. With the menu rung applied before the first
`animate()`, the composer would be constructed on the first frame that turns bloom back
on — `UnrealBloomPass` (bright target + 5 mip pairs + ~12 program compiles) + `OutputPass`
+ a `setSize` reallocation, on a frame a child is looking at (perf skeptic). So: under
the boot cover, **before** `applyMenuRung()`: `ensureComposer()` and one warm
`c.render()`; then the rung. Bloom and DPR return in `leaveMenu` (§2.2.7).

**Shadow program cache.** three 0.185 rebuilds a material's program when
`lights.state.version` changes (`sun.castShadow` flips the `numDirectionalShadows` hash)
and `shadowMapEnabled` is a program-cache parameter, so the first shadows-off toggle of a
session compiles the ~45 shadowless programs ONCE (cached after) — not every match;
`AUDIT-2026-08-23.md:316` places that stall at the first intro. A menu-side step 2 would
move a ~1.7 s freeze into the menu of exactly the phones that trigger it, and
`renderer.compile()` with shadows on does NOT pre-warm that set. So under the cover:
flip `shadowMap.enabled = false; sun.castShadow = false`, `await
renderer.compileAsync(scene, camera)`, flip back — both variants are then cached. Day 2
measures the ms of the **first shadowless frame**, not of the toggle call.

**Menu-only degrade** (`menuRung`, never written to `qLevel`). Draft 1 triggered on "median
`dtRaw` over 120 frames > 17 ms"; both skeptics refuted it (§9.2, §9.4): WKWebView is
vsynced at 60 Hz, so a rAF interval is quantised to ~16.7 or ~33.3 ms and a median only
exceeds 17 ms once MORE THAN HALF the frames miss — a menu dropping every third frame
never degrades — while a healthy device's honest median (16.67) sits 0.33 ms under the
bar with no jitter floor measured. The shipped in-match adapter already knows this and
demotes on a mean of 46 fps (`:10911-10914`). Now: `fps = N / ΣdtRaw` over a 2 s window of
**rendered** frames (idle-skipped frames and the first frame after a visibility resume
excluded; `clock.getDelta()` is called once and discarded on resume, because `dtRaw` is
unclamped, `:9476-9478`) **< 55 → step 1** DPR 1.0 → still under → **step 2** shadows off
(pre-warmed above) → still under → **step 3** pendulum frozen and render every second
rAF (`island.update` dt doubled so the water keeps its speed). Climb back one step on
> 58 fps held for 10 s, mirroring `:10914-10921`. The 55/58 pair is provisional until the
day-15 device pair replaces it (§8.12); bar 2.8.10 tests the hysteresis, not the number.

**Idle and hidden.** `animate()` requests **exactly one rAF per frame, always**
(`:10957`); idle and hidden tiers skip the `renderer.render`/`composer.render` call and
the sim work inside `animate`, never the re-registration — `qa/ladder.mjs` cranks by
capturing the rAF callback (`:65-76`) and fails with "rAF chain broke" the moment a
frame does not re-request (`:83-86`), and every cranked bar in `qa/menu.mjs` uses the
same technique (both skeptics). Tiers: rung ≥ 2 renders every second rAF **from entry**
(a pendulum at 0.039°/frame is invisible at 30 fps; perf skeptic); 20 s without input →
every second frame; 3 min → every fourth, pendulum frozen. On skipped frames the sim
advances at the same cadence with doubled `dt` (the stagger bands already do this,
`life.ts:6852-6864`). `document.hidden` → no render (WKWebView suspends rAF anyway; the
Chromium probe overrides `document.hidden`). One visibility handler: hidden in a match →
the existing pause (`:7751`, unchanged); visible → resume with the discarded delta. The
joystick's own handler (`:3449`) is untouched.

**Overlays on the menu.** `#shop`, `.metaScr`, `#daily`, `#settings`, `#book` carry
`backdrop-filter: blur(6–8px)` (`index.html:1589`, `:1552`, `:1137`, `:1512`); today they
blur a static opaque menu, after the change they blur a live canvas every frame while
`body.ovl` (`:2347-2354`) freezes nothing in the render loop — the "invisible work"
`STUDIO-ROUND-2-BOARD.md:1892` named for the pause sheet. While `body.ovl` is set on the
menu the render stops and thaws on close; bar 5.1.14 asserts `__menuState().frame` (a
RENDER counter) flat while `#shop.show`.

**Frozen while `menuMode`:** attract mode (`:9849`), `rivals.update` (`:10290`),
`bubbles.update` (`:10364`), `fadeOccluders` per frame (`:10896`; once per 60 frames
instead), `refreshHud` (`:10810`), the eat loop (already, `:10367`), and **the shadow
pass**: today `shadowMap.needsUpdate` fires every other frame (`:10946`) though on the
stage nothing moves but the crowd — on the menu it fires every fourth frame, or only when
a mover is inside the 45-unit shadow box. **Kept:** `island.update(dt, tClock, camera)`
(`:9486` — it re-centres the star field and sky on the camera, `island.ts:4014-4017`),
`voidling.update` (`:10246`), `life.update` (`:10281`), curios (`:9487`).

### 2.8 Bars

1. **Baseline first, honestly read.** `qa/menuframe.mjs`, **today, before any change**:
   per world, `_dbg.__frameTimes()` (new: an always-on ring buffer of the last 600
   `dtRaw`, no overlay — `perfFrame` is a no-op without `?perf` and `perfDts` is never
   exposed, `:404-416`, gate skeptic), `renderer.info` draw calls and triangles read with
   `autoReset = false` around one cranked frame (both parities of the half-rate shadow
   pass, `:10946`, printed), `life.moverStats(138)` and `moverStats(276)` (`life.ts:6906`),
   JS heap — at **the STAGE frustum** (menuDist 22, the `a0` sweep) **and** at today's
   parked spawn frame, labelled which is "today". **One page per rung** (0 and 3), pinned
   by `addInitScript` before the first frame, the first 120 frames after any pin
   discarded, the rung read back from `__quality()` printed beside every row
   (`__pinQuality(3)` latches `qShadowLatch`, `:1354` — a rung-0-then-3 sweep on one page
   reads a rung nobody chose, `:2250-2254`). Every row says "sandbox, not device". No
   baseline, no cut.
2. **Frame ratio is a REPORT until its noise floor is known** (gate skeptic,
   `GOVERNOR.md:643-645`): menu vs in-match (r = 12) on the same page, `__pinQuality(0)`
   **and** `__pinMenuRung(0)`, **pixel ratio pinned equal on both sides** (a QA hook
   forcing `setPixelRatio(1)` for the sample — the menu rung's 1.5 vs the match's 2.0
   renders 56% of the pixels and flatters any ratio under swiftshader, perf skeptic),
   three numbers per side: JS ms (`animate()` minus the render call), draw calls,
   triangles. Run twice and print the spread. The 1.15 bar applies to **JS ms and draw
   calls separately** and is armed only after the spread says what 1.15 means here.
3. **Draw calls are the hard bar**: at every 10° of the pendulum, two consecutive frames
   sampled and the max of the pair taken, ≤ 1.3× the max of that world's in-match r = 12
   pair, and ≤ 2,000 absolute — with `info.autoReset = false`, bloom off on **both** sides
   (the menu never has it), and bloom / `shadowMap.enabled` / pixel ratio printed in every
   line. Lantern and Game Day (6,537 edibles, `island.ts:7379`) are named. The 1,241 /
   4,694 reference numbers are re-taken the same way before they are used.
4. **Device, two rows.** Over 600 rendered frames: `fps = N / ΣdtRaw ≥ 57` AND frames
   > 20 ms ≤ 3% AND p95 ≤ 17.5 ms — on **a named tier-B phone (iPhone 11 or SE 2,
   `AAA-BRIEF.md:897-899`)** and on the owner's phone; both rows recorded. Draft 1's
   "≤ 16.7 ms median on the owner's phone" passed with 49% of frames dropped and never
   named the four-year-old iPhone (perf skeptic, blocks). Memory: `performance.memory`
   does not exist in WKWebView (`STUDIO-ROUND-3.md:4069`) and JSC keeps typed-array
   stores outside any heap figure, so the device number is **resident memory from
   Xcode's memory gauge**, menu vs match on Game Day (~446 MB today against tier B's
   450 MB ceiling, `AAA-BRIEF.md:180`, `:900`), plus "no jetsam in a 5-minute menu idle on
   tier B". The Chromium heap delta stays in `menuframe` as the sandbox row.
5. Void on screen: projected diameter 28–42% of the window height; centre inside the
   window's lower 60%; hit circle ≥ 60 px radius. `voidPx` is the game's own projection;
   the probe cross-checks it once by projecting `__voidGroup` through `__cam` (`:2139`,
   `:2048`) and prints both.
6. Clearance: a ray from the camera to the void's centre at each stage hits nothing but
   the void (`__menuState().occluders === 0`).
7. After a match and HOME, and after a quit: `__menuState().eaten === 0`, `voidRadius ===
   __menuState().menuR` (never a typed 1.2 — that is a transcribed constant),
   `rivalsVisible === false`, and `life.moverStats` panic count 0 for 120 cranked frames.
8. Hidden: `__menuState().frame` (renders) does not advance for 60 wall-frames while
   `document.hidden`; idle: the render rate halves after 20 s with no input while the rAF
   count keeps climbing one per frame; overlay: `frame` flat while `#shop.show`.
9. Calm: with `voidMotion='0'` seeded, azimuth variance 0 and
   `document.getAnimations()` inside `#menu` empty.
10. `menuRung` hysteresis on an injected clock: no step at 16.7 ms cranks; steps 0→1→2→3
    in order at 25 ms; climbs back one step after 10 s at 16.7; never writes
    `__quality().level`; `qa/ladder.mjs` scenario 1 still passes (the rAF chain is
    intact).
11. Fog and matrices: `__menuState().fogNear === 60 + menuDist·1.4` and the camera's
    world matrix is current on the menu frame.
12. First armed frame after PLAY: `__quality().pr === QUALITY[qLevel].pr` and `bloomOn ===
    QUALITY[qLevel].bloom` (the `opening.mjs` armed-idle sample reads them).

**Probe.** `qa/menuframe.mjs` (bars 1–3, day 1, before anything; a REPORT step until bar
2 is armed), `qa/menu.mjs` bars 2, 3, 6, 7, 12–16, 22 (§5.1), the device day (bar 4).

### 2.9 The day-1 baseline — measured 2026-09-10

`qa/menuframe.mjs`: six worlds, rungs 0 and 3, **one page per rung**, the rung pinned
before the first frame and read back on every row, `renderer.info.autoReset = false`,
two consecutive animation frames per sample (both shadow parities), max of the pair,
120 frames discarded after the pin. 276 menu frames + 18 match frames. Verbatim runs in
`docs/crews/round-8/menuframe-day1-menu.log` and `-match.log`.

**Every number here is swiftshader, not a device.** This box renders 0.44–0.71 animation
fps at rung 0 and 2.2–2.9 at rung 3, so nothing below is a frame-time bar; §2.8.4's rows
still come off two phones on day 15. Draw calls and triangles do not depend on how fast
the box draws them, which is why they are the numbers quoted.

**TODAY** is the shipped menu frame, nothing overridden. **STAGE** is the same point with
the diorama's camera (22 u out, eye 9, looking 2 u above the ground) swept 0–330° in 30°
steps. **HERO** is the framing §2.3 asks for — standing 40 u off the world's authored
hero landmark, looking at it — with the stand point found on the live island by search,
never transcribed.

| world | rung | TODAY max | STAGE cheapest → dearest | HERO cheapest → dearest | HERO ÷ TODAY |
|---|---|---|---|---|---|
| Maple | 0 | 498 | 772 @330° → 991 @90° | *no hero authored* | — |
| Maple | 3 | 120 | 401 @330° → 629 @120° | *no hero authored* | — |
| Pirate | 0 | 694 | 680 @180° → 1,858 @60° | 307 @210° → 927 @120° | 0.44–1.34× |
| Pirate | 3 | 109 | 95 @180° → 1,243 @60° | 46 @210° → 671 @120° | 0.42–6.16× |
| Game Day | 0 | 1,040 | 1,271 @210° → 1,949 @0° | 394 @180° → 516 @0° | 0.38–0.50× |
| Game Day | 3 | 108 | 344 @210° → 966 @0° | 159 @180° → 284 @0° | 1.47–2.63× |
| Lantern | 0 | 737 | 897 @180° → 2,034 @30° | 821 @180° → 941 @0° | 1.11–1.28× |
| Lantern | 3 | 93 | 112 @210° → 1,289 @30° | 117 @210° → 263 @0° | 1.26–2.83× |
| Powder | 0 | 546 | 637 @270° → 1,419 @30° | 386 @210° → 511 @0° | 0.71–0.94× |
| Powder | 3 | 83 | 183 @270° → 966 @30° | 64 @180° → 194 @0° | 0.77–2.34× |
| Skylark | 0 | 1,649 | 1,785 @300° → 2,692 @120° | 776 @240° → 1,123 @30° | 0.47–0.68× |
| Skylark | 3 | 137 | 218 @300° → 1,151 @120° | 32 @240° → 381 @30° | 0.23–2.78× |

#### 2.9.1 The finding that reorders the stream: the menu is a shadow pass

Every rung-0 sample is a pair of consecutive frames, and at rung 0 they differ wildly —
Skylark 137 and 1,649, Lantern 100 and 737, Game Day 137 and 1,040. That is
`shadowFrame++ & 1` (`prototype3d.ts:10946`) re-rendering the 2048² map on alternate
frames, and the shadow camera is an orthographic box around the void that draws casters
the player's own frustum culls away. At rung 3, where shadows are off, the same pairs are
flat (137/136, 119/120, 109/109) — which is the mechanism confirming itself.

Median of the pair's low frame (scene) against its high frame (scene + shadow map):

| world, rung 0 | scene | with shadow | shadow costs | **shadow share** |
|---|---|---|---|---|
| Skylark, today's menu | 137 | 1,649 | 1,512 | **92%** |
| Game Day, today's menu | 137 | 1,040 | 903 | **87%** |
| Lantern, today's menu | 100 | 737 | 637 | **86%** |
| Powder, today's menu | 95 | 546 | 451 | **83%** |
| Pirate, today's menu | 127 | 694 | 567 | **82%** |
| Maple, today's menu | 139 | 498 | 359 | **72%** |
| Skylark, HERO stage | 273 | 1,010 | 736 | 73% |
| Game Day, HERO stage | 254 | 478 | 224 | 47% |

**So the diorama's own cost is about +120 draw calls of scene** (today 95–139, the HERO
stage 104–273) **against a shadow pass of 359–1,512 that fires every other frame for a
scene in which nothing but the crowd moves.** §2.7's "shadow pass every 4th frame on the
menu" is worth five to twelve times what the diorama costs. It stops being a nice-to-have
and becomes the first thing day 9 lands; if only one performance change ships, it is that
one, and the diorama is affordable on its back.

#### 2.9.2 Where the camera LOOKS is the biggest authored decision in the stream

At one fixed point, sweeping azimuth alone swings the bill 2.7× on Pirate at rung 0
(680 → 1,858) and **11.5× on Lantern at rung 3** (112 → 1,289). Direction, not distance
and not height, is the draw-call variable — §2's "direction, not distance" was right and
is now measured. `a0` (§2.4) is therefore not a framing preference; it is the largest
single performance decision in this stream, and day 8 must author it per world off this
series rather than pick a pleasing angle.

#### 2.9.3 The expensive place is the SPAWN point, not the low camera

STAGE (at spawn) runs 1.08–2.76× today's frame at rung 0; HERO (40 u off the landmark)
runs **0.38–0.50× on Game Day, 0.47–0.68× on Skylark, 0.71–0.94× on Powder and
0.44–1.34× on Pirate** — cheaper than the menu the child gets today. Only Lantern is
dearer (1.11–1.28×). The void starts in the densest part of every island, which is
exactly where today's menu parks him. §2.3's stages are not a cost to be justified; on
four worlds they are a saving.

#### 2.9.4 The ratio is worst on the weakest phones, so no single ratio bar can be true

Rung 3 is where a tier-B device lands, and it is where today's menu frame is smallest
(83–137 calls, no shadows, one pass) — so the same stage frustum reads 1.20–13.86× there
against 1.08–2.76× at rung 0. §2.8.2's 1.15 and §2.8.3's 1.3 have to be **per rung** or
they are false on one of them. The noise floor, meanwhile, is small: Game Day's r=12 pair
came back 4,966 and 4,978 on two separate runs, a 0.2% spread.

#### 2.9.5 The in-match reference pair, re-taken — and it was not this frame

`prototype3d.ts:10613` has said, in three sentences a reader takes as current, that "the
opening frame renders 4,694 draw calls and 1.40M triangles against 1,241 and 355k in
settled play". Re-taken the same way as everything above, rung 0:

| world | INTRO (establishing shot) | PLAY (settled, r 0.9) | R12 (top of the growth law) | R12 triangles | R12 shadow share |
|---|---|---|---|---|---|
| Maple | 448 | 495 | 4,411 | 1.67 M | 91% |
| Pirate | 706 | 664 | 2,280 | 0.72 M | 65% |
| Game Day | **337** | **1,032** | **4,978** | 1.92 M | 79% |
| Lantern | 580 | 788 | 6,436 | 1.67 M | 84% |
| Powder | 247 | 611 | 3,155 | 0.88 M | 76% |
| Skylark | 420 | 1,644 | 5,441 | 1.61 M | 70% |

Game Day's opening is **337 calls / 221k triangles**, not 4,694 / 1.40M — because the
line immediately under that comment turns shadows off for the establishing shot, which is
the fix the comment itself describes. The pair records the problem; the number beside it
is the problem's, not today's. The frame that costs about 4,694 today is **late play at
r 12**. The source comment now carries this re-take beside it.

**This changes what §2.8.3's bar is set against.** "≤ 1.3× the max of that world's
in-match r = 12 pair" is a bar against 2,280–6,436 calls, not against 1,241 — every menu
frame measured above already clears it by a wide margin on every world. The bar as
written is not the constraint the brief assumed it was; day 9 should either set it
against the PLAY pair (611–1,644) or state an absolute, and §2.8.3's "≤ 2,000 absolute"
is the half of it that actually bites (Skylark's STAGE sweep peaks at 2,692).

#### 2.9.6 Also measured

Boot to a usable world, from `performance.timeOrigin`: Skylark 10.2 s, Powder 13.5 s,
Pirate 15.7–16.1 s, Lantern 18.3–18.9 s, Maple 18.8–21.1 s, Game Day 35.6–37.5 s.
Movers inside the 138 u crowd gate: Lantern 351/972 (the hotspot the brief named),
Skylark 369/550, Game Day 291/504, Powder 236/388, Maple 122/372, Pirate 113/337 (gate
doubled to 308). Chromium heap: Game Day 440.7 MB, Maple 370, Lantern 330, Skylark 246,
Pirate 238, Powder 208 — sandbox only; `performance.memory` does not exist in WKWebView
and day 15 reads Xcode's gauge. Today's menu camera is still EASING when the child looks
at it: `camDist` sampled at 29.1–40.1 on its way from `resetMatch`'s 50 to `PLAY_DIST` 29.

#### 2.9.7 What day 1 did NOT measure, recorded as missing

- **Maple has no stage.** `WORLD_COPY.maple.hero` is null (`prototype3d.ts:1502`), so the
  HERO sweep had nothing to stand off and Maple's rows are STAGE-at-spawn only. Its stage
  is the waterfall lip (§2.3), which lives in a module-local const in `island.ts` and the
  probe will not transcribe. **Day 2 exposes the lip and re-runs Maple.**
- **`__pinMenuRung` does not exist.** §6 day 1 lists it, but there is no menu rung to pin
  until day 9; the rungs pinned here are the shipped quality ladder's. Deferred to day 9
  with the rung itself.
- **The INTRO rows are mid-descent, not the peak.** The sample lands at `camDist` 167.8
  of a `DESCENT_START` that begins higher, because the promise chain costs three frames
  and the intro advances 0.05 s per frame. The peak establishing frame is dearer than 337
  by an unmeasured amount; day 9 samples it on the first armed frame if the number is
  wanted.
- Frames were sampled as REAL animation frames, not hand-cranked ones. For a draw-call
  count that is the same measurement; for frame TIMES it means the series is the
  sandbox's, which every row says.

## 3 · The ladder

**Mechanism.** Level = (world, goal). Five goals per world in the owner's order — EAT,
SET, LANDMARK, RIVALS, CLEAR — 30 levels at launch; a goal level wins on the spot when
met, the clock running out fails it; RIVALS is decided at the buzzer (polish plan §4,
decision 1). Five pips under the diorama: done grey, 100%-clear magenta, current green
and 29% wider, locked blue with a padlock (recon `:29-30`, `:249-252`, `:311-312`). Ours
differs from Hole.io in one rule, on purpose: **the dot is passed by finishing, the goal
earns the mark** (§3.2).

**Ours today.** Worlds unlock in `WORLD_ORDER` by **finishing** any match on the
previous one (`src/game/unlocks.ts:5-26`, `completeWorld` `:89-97`); `migrate()`
grandfathers from `voidBest_<w>` and `voidWorld` on every read (`:61-74`); "NOBODY IS
EVER RE-LOCKED" is an invariant asserted by `qa/unlocks.mjs` D. `voidMatchN` is a JSON
object (`matchdeck.ts:25`, match 0 = the shipped baseline); `voidSaveVer` is the only
versioned save (`prototype3d.ts:8213-8230`); `voidStats` backfills fields with `??=`
(`:7805`). `voidBest_<w>` and `completeWorld` are written **only in the rivals branch**
of `endMatch` (`:5449-5452`, `:5503`); the solo branch returns at `:5372` — a solo-only
child never opens world 2 today. `voidBestPct` is one global key (`:5339`), not
per-world. ~40 probes seed `voidUnlocked='maple,pirate,gameday,lantern,powder,skylark'`
(`qa/unlocks.mjs:53` et al.).

### 3.1 State: `voidLevels`

New file `src/game/levels.ts` (~140 lines beside `unlocks.ts`). One key, JSON object
(the `matchdeck`/`voidStats` convention, not `unlocks`' CSV):

```
{ v: 1,
  w: { [world]: { [goal]: {
        st: 'locked'|'open'|'fin'|'done'|'clear',
              // fin   = attempted, goal not met — STILL THE CURRENT DOT under the
              //          owner's win gate (§3.2); coins kept, nothing taken away
              // done  = goal met inside the clock (tick)
              // clear = goal met AND the world's CLEAR number reached in that run (star)
        best: number,   // EAT score | SET seconds | LANDMARK seconds | RIVALS rank | CLEAR pct
        pct: number,    // best devouredPct on that pip
        first: string,  // toDateString(), the voidDailyLast / voidFirstWinDay convention (:7965)
        n: number } } } }   // attempts incl. misses and quits
```

**No global `cur`.** Draft 1 stored a cross-world frontier; the code skeptic showed it
disagreeing with the pip row on any profile whose `voidWorld` is not the frontier world
(`pickedWorld` is a boot const, `:355-358`), and the gate skeptic showed PLAY reloading a
`?w=pirate` page into Maple for ~110 probes. Now: **`current(world)`** is a pure function
of that world's row — the lowest goal with `st === 'open'`; if none, the lowest `'fin'`
(attempted, not met — play it again); if none, goal 5. Because goal k+1 opens only when
goal k is `'done'`, there is at most one `'open'` per world and exactly one current, and a
`'fin'` dot is the current one until its goal is met. PLAY launches
`current(pickedWorld)`; the end card's "N OF 30" is the level's ordinal
(`WORLD_ORDER.indexOf(world)·5 + goal`), not a frontier.

Rules: a missing entry reads `'locked'`, except `maple/1` which is always at least
`'open'` (the "read() adds maple" invariant, `unlocks.ts:50`). Every read/write in
try/catch (`unlocks.ts:48`, `:54`). Unknown fields kept, never dropped
(`stickers.ts:449`). Version gate `if ((d.v ?? 0) < LEVELS_VER) migrateLevels();
track('save_migrated', { key: 'voidLevels', from })` (`:8216-8229` pattern). States only
ever rise (`locked < open < fin < done < clear`). A replay of a `fin`/`done`/`clear` pip
sets a transient `playing = {world, goal}` in `beginMatch` (`:6081`, beside `bumpMatch`
`:6139`; `voidMatchN` untouched); **`playing` is set only by PLAY, a pip tap or
`voidPlayGoal`** — an `AUTO_START` harness match with no seeded `voidLevels` runs
goal-free (gate skeptic: otherwise every existing match probe becomes a level-1 run on
day 5 and can end on the spot, un-pairing `newsfeed`/`faceparity`/`econ`).

**Migration** (runs on every read like `unlocks.migrate()`; only raises): for each `w`
in `WORLD_ORDER`: `isUnlocked(w)` → `w/1 ≥ 'open'`; `voidBest_<w> > 0` (`:5449`) →
`w/1 'fin'` with `best = voidBest_w` and `w/2 'open'` (a finished match, no claim about
the goal); the global `voidBestPct` is **never** turned into a per-world `'clear'`.
Because it derives from `isUnlocked()`, the ~40 QA seeds read as "goal 1 open in every
listed world" and the push gate stays green without touching a seed.

**Cross-reload:** the goal to play travels as `voidPlayGoal` beside
`voidWorld`/`voidAutoPlay` (written at `:6769`, `:5519`; consumed at `:6840-6841` the
same way); `?g=` mirrors `?w=` (`:355`) for probes.

**Telemetry** (judge 2: "the owner reads numbers and nobody gives him the funnel"):
`track('level_start'|'level_win'|'level_fin'|'level_quit', { world, goal, kind, secs,
attempt, score, pct, rank })` (`telemetry.ts:34`) beside the existing `match_quit`
(`:7769`). Without it the polish plan's bar 5 ("median tester clears level 1 in one
run") cannot be measured after launch.

**Hooks** beside `__matchState` (`:2289`): `_dbg.__levels()` → the 30 rows `{world, n,
kind, st, best, pct, attempts}` from the same read path the pips use;
`_dbg.__menuState()` → `{menuMode, world (=== pickedWorld), goal, azimuth, a0, amp,
period, menuDist, menuR, voidPx, voidRadius, frame (renders), rafs, menuRung,
pinnedMenuRung, fogNear, drawCalls, occluders, rivalsVisible, eaten, idleTier}`;
`_dbg.__frameTimes()`; `_dbg.__pinMenuRung(n)`; and the **deterministic goal hooks the
level probe needs on a virtualised clock** (gate skeptic, blocks): `__setScore(n)`
(EAT), `__eatKind(kind, n)` routed through the real eat handler lines (`:5825-5839`,
SET), `__eatLandmark()` setting `byPlayer` on the level's landmark prop (LANDMARK),
`__setRivalScores([...])` with forced joins (RIVALS, both outcomes), `__devourAll()`
(CLEAR), `__goalPools()` = `{ houseLike: HOUSE_LIKE, sets: LEVEL_SPEC[world].set }`
replacing `__questPools` (`:3924-3925`) in the same commit that deletes the board.

### 3.2 Unlock reconciliation — a DECISION

**DECIDED BY THE OWNER, 2026-09-10: WIN advances.** Put to him with the governor's
recommendation (finish advances) and the child skeptic's kill attached; he read both and
chose the other way, for stated reasons: *"I do like your first recommendation but let's
think long term. We'd like this to get more challenging like Angry Birds right. I think
they should be hitting the goals to move on. Maple starts easy. As you tick up maple and
other levels it gets harder etc. we want to focus on retention."* That is the decision and
this brief is built on it. The governor's own recommendation, and why it lost, are kept
below and at §9.1 #1 so nobody has to reconstruct the argument.

Within a world, goals are sequential and **goal k+1 opens when goal k is `'done'`** — the
goal met inside the clock. The ceremony fires on the spot; clearing the world's CLEAR
number in the same run earns the star (`'clear'`). The clock running out is `'fin'`:
attempted, not met, coins kept, nothing taken away, the dot stays where it is and she
plays it again. Between worlds `unlocks.ts` stays the authority unchanged — world W+1
goal 1 is `'open'` whenever `isUnlocked(W+1)`, i.e. when any match on W has **finished**
(`completeWorld`, `:5503`, now also called from the solo branch before its return at
`:5372`). **The world ladder is deliberately NOT win-gated**: a child who stalls on
Maple dot 3 can still travel to Pirate and play there. That is the release valve, and
without it §9.1 #1's kill lands in full.

**WHAT THIS DECISION COSTS, AND WHERE IT IS PAID.** Angry Birds is win-gated because
every level is winnable; the ramp lives in the levels, not in the gate. Ours are not
winnable as first drafted, and these are the code's own words, not an opinion:

- **LANDMARK** — the in-range cue "never fires" for a weaker player (`:1529-1531`), and
  on worlds 2–5 the landmark only comes into reach in the finale surge (`:1553-1555`).
- **RIVALS** — needs `myRank === 1`, and the rubber band floors the family at "never
  below 3rd" (`rivals.ts:256`, `:701`, `:788`), not at first.
- **CLEAR** — ~~100% `devouredPct` is measured in single digits on a real run (`:5462-5466`)~~ **WRONG, corrected day 2 (§3.4a, §9.7 #5):** the cited lines are the end-of-match stats block and say nothing about `devouredPct`, and measurement contradicts the claim — a competent run devours 49–84% of the world. CLEAR is a wall only because 100% was chosen; at 30% it is met at ~70% of the clock on every world.

Win-gate those as drafted and a small six-year-old stops at Maple dot 3, permanently.
So the decision converts §3.4 from a provisional table into the load-bearing one:
**day 2 measures what a real run reaches (`qa/pace.mjs`, radius-vs-time and
score-vs-time, six worlds) and every one of the thirty goals is set from that curve** —
Maple dot 1 winnable on the first try, each dot and each world stepping up, LANDMARK
re-specified against a reachable prop, RIVALS against a rank the band actually allows,
CLEAR against the world's CLEAR number rather than 100%. The owner chose this shape on
2026-09-11 as well (§8.1, second question): measure first, then set every goal from the
curve. **Bar 3.5.4 is rewritten to match: an average run must reach dot 5 of every world,
and no dot may be unwinnable by construction.** If day 2's numbers cannot make a goal
winnable, that goal is re-specified or it does not gate — and the governor says so at the
time rather than shipping a wall.

**The governor's recommendation, for the record.** FINISH advances, WIN decorates: goal
k+1 opens on any finished match, the tick and the star are what the goal earns. It was
recommended because it cannot produce a wall under any tuning, and it lost to a long-term
progression argument the governor does not dispute. The two shapes differ only when a
child misses; under a correctly-tuned §3.4 that case is rarer, which is exactly what day
2 has to establish rather than assume.

**Why the gate moved** (the child skeptic's kill, §9.1, verified by the governor at the
lines): draft 1 moved the green ring only on a WIN, with a third miss as the escape.
`unlocks.ts:9-16` rejects a win gate in so many words — "a six-year-old who cannot come
first would be locked out … the one thing this build has never done is punish a child
for being small". Three of the five dots are walls for a small child by the code's own
admission: LANDMARK's cue "never fires" for a weaker player (`:1529-1531`) and worlds
2–5 land the hero only in the finale surge (`:1553-1555`); RIVALS needs `myRank === 1`
and the rubber band floors the family at "never below 3rd" (`rivals.ts:256`, `:701`,
`:788`), not first place; CLEAR at 100% is unreachable **though not for the reason given — see §9.7 #5**. Under
draft 1 she sat nine minutes on a word she cannot read at each of them. Under this draft
every finished match moves her on, and the marks are hers to come back for.

**The alternatives, named.** (a) Draft 1's win gate with fail-forward at three misses —
rejected above. (b) Thirty levels in one strict sequence — world W+1 opens only after
W's goal 5. Cost, from the code: `devouredPct` counts everyone's meals against the
plateau (`:4886`), **and a competent run lands at 55% on Maple, not single digits (§3.4a)** — so 25 of
30 levels and 5 of 6 worlds would be a wall for a six-year-old who cannot clear Maple —
the exact case `unlocks.ts:8-16` forbids and `qa/unlocks.mjs` D asserts against. (c) A
win gate where dots 3/4/5 are optional marks beside the row, not steps in it — a
legitimate fallback if the owner insists on win-gated steps; then `levels.mjs` (b) must
also assert that a half-speed autopilot reaches dot 5 of every world in ≤ 5 finishes.
Rejected unless the owner overrules.

### 3.3 Pips

| state | look | size |
|---|---|---|
| locked | blue `#98affd` at 55% alpha, sprite dimmed, 16 px padlock **sprite** | 44 |
| current | green gradient (our PLAY green → deeper), 3 px white ring, sprite 28 px | 57 (1.29×) |
| fin | slate `#5d6a92` with a 2 px green outline, sprite, no mark — "finished, come back for the tick" | 44 |
| done | slate `#5d6a92`, sprite, white tick **sprite** | 44 |
| clear | magenta `#b23bc9`, sprite, white star **sprite** | 44 |

Five states, one current per world (§3.1); the "green-and-open skipped pip" of draft 1
that contradicted "exactly one current" no longer exists (child skeptic note 7). Three
of the states read without words — big green = mine, padlock = later, tick = I did it —
and the star is **reachable**: it is the world's CLEAR number (§8.3), not a 100% measured
in single digits **(measured: 49–84% of the world, §3.4a — the star at 30% is comfortably earnable)**, so a good run can earn it (child skeptic note 9).

Taps: current = PLAY; fin/done/clear = replay that level (transient `playing`); locked =
200 ms wiggle + padlock jiggle + one low pop + `buzz(12)`, **no text**, and the void looks
at the padlock and does the `'sleepy'` beat — a yawn, "later" — **never `'scared'`**
(draft 1 said scared; the rig's scared face is the match's hurt/threat face, `void3d.ts
MOODS :1348-1408`, and a six-year-old reads it as "I hurt him"; child skeptic). Bar
5.1.19: after a locked tap `voidling.faceState()` is never `'scared'` or `'hurt'` for 2 s.
No "LEVEL n OF 30" on the menu — the ordinal lives on the end card, as in Hole.io (recon
`:230-232`). **Pip hop on re-entry** (from HOME after a finish): the finished pip flips
to fin/done/clear in 180 ms, then the green ring hops one to the right in 220 ms with
`audio.ready()` and `buzz(18)`; under `body.calm` the flip is a hard cut. World done (pip
5 ≥ fin, or the next world already open): the world chip flashes the next island's
poster with its `.locked` filter lifting (`index.html:1416`); travel is the existing TAKE
ME THERE reload (`:5518-5520`).

### 3.4 Per-world goals — derived from code, provisional until day 2 measures

| world | EAT N (0.6 × `WORLD_PAR` `:550-611`) | SET triple (N each; supply, static/measured) | LANDMARK (hero, eat r, R needed at `EAT_RATIO` 1.11 `:3673`) | RIVALS | CLEAR |
|---|---|---|---|---|---|
| Maple | 48,000 (par 80,000 — a bot mean, `:551` "verified: mean 103,642" is the autopilot child-driver's, not a six-year-old's) | house 5 (70), car 8 (67, `:3841`), snack 40 (2,605 of 5,790, `AAA-BRIEF.md:1057`) — **smallest count first** so a tick lands inside the first minute | Town Hall r 6.5 → R ≥ 5.86; crosses at ~132 s of 180 on an optimal run (`:1517-1520`) — the only measured crossing; `LEVEL_SPEC.maple.landmark = 'townhall'` | `myRank === 1` at the buzzer (`:5374-5378`) | the world's CLEAR number (§8.3; p90 of strong runs from day 2); 100% `devouredPct` (`:4886`) is a hidden extra |
| Pirate | 63,000 (105,000) | gold 4 (`GILD_PER_MATCH` 20, `questable.mjs:57`), cabana 5 (22 requested, `island.ts:7679`; the 2.6–3.4 band `:5828` is honest here only), snack 40 | Royal Mariner r 10 → R ≥ 9.01 (finale surge only, `:1553-1555`); `landmark = 'mariner'` | same | same |
| Game Day | 105,000 (175,000) | car **4** (28 food trucks requested, `:7189/:7215/:7276`; draft 1 said 6 and broke its own 6N ≤ supply rule, 36 > 28), house 8 (24 frat + 52 rv house-like, `:7253`, `:7240`), snack 40 | Stadium r 11 → R ≥ 9.91; `landmark = 'stadium'` | same | same |
| Lantern | 90,000 (150,000) | gold 4, house 10 (276 requested, `:6831-6976`), snack 40 — never car (0, `:3855`) | Bathhouse r 11 → R ≥ 9.91; `landmark = 'bathhouse'` | same | same |
| Powder | 27,000 (45,000) | gold 4, house **4** (26 house-like via `HOUSE_LIKE` `:3919`; draft 1 said 5, 30 > 26), snack 40 — never big (1, `:3864-3866`) | Lodge r 10.5 → R ≥ 9.46; `landmark = 'lodge'` | same | same |
| Skylark | 21,000 (35,000) | gold 4, car 8 (72), snack 40 (3,716 measured, `world6.verdict.md:99`) — never house (2) | `landmark = 'hangar-1'` (there are TWO force-placed hangars, offsets [−340,−120] and [380,160], `:6484-6499`; "the hangar" was undefined) r 5.5 → R ≥ 4.95; the whale r 18 needs R ≥ 16.22 > `LAW_TOP` 12 (`:9745`) and is tethered (`:6196-6197`) — §8.2 | same | same |

Growth is clock-bound (`lawCap`, `:9746-9748`; the clock alone buys r 6.06 at 180 s,
`:9693`) and pace-coupled to score (`pace = playerScore / par`, `:9725`), so the SET
table and LANDMARK reachability are **one measurement**: day 2 runs `qa/pace.mjs` on all
six worlds for radius-vs-time and score-vs-time, once under the autopilot's eating and
once under a SET-style pattern (hunting eight cars scores low and grows slow). Supply
comes from `qa/questable.mjs:74-90`'s block per world with `'big'` de-duplicated per
bite (`:5826` and `:5829` double-fire on tagged-big props ≥ r 6). 3N ≤ supply always;
6N ≤ supply for cars and houses (the family eats 40–50% of the board, `:523-525`) — the
Game Day car and Powder house values above are the first to obey it (code skeptic).

**The landmark is named, not inferred.** Draft 1 reused `heroProp`, which is the LARGEST
edible on the island (`:6114-6116`) — on Skylark that is the tethered whale, so the
mechanism could never point at a hangar and the in-range cue would have printed "🐋 YOU
CAN EAT THE WHALE NOW" (`:1665`) over a hangar level (code skeptic). Now
`LEVEL_SPEC[world].landmark` names a prop tag (`userData.landmark`) set by the factory;
the goal-3 poll reads that prop; the level's cue/gone strings live in `LEVEL_SPEC`;
`heroCue`/`heroProp` stay the world's finale beat, untouched.

### 3.4a The thirty goals, set from measurement — day 2, 2026-09-11

This replaces §3.4's derived table. Every number below comes from
`qa/goalcurve.mjs`: six worlds, five seeded runs each on a virtualised clock at
16.667 ms a frame, plus twelve hunting runs for the SET kinds. Verbatim output
in `docs/crews/round-8/goalcurve-day2-{autopilot,hunts}.log`; the raw per-second
series for all thirty matches is in `qa/out/goalcurve/*.json`.

**THE DRIVER IS NOT A CHILD, AND EVERY NUMBER HERE IS A CEILING.** The autopilot
has perfect information and never hesitates; `WORLD_PAR`'s "verified: mean
103,642" (`:551`) is this driver's mean and §3.4 already recorded that it is not
a six-year-old's. So each goal is set at a fraction of what a competent run
reaches on its BAD day (p10 of five runs), and **the fraction between this
driver and a child is the one number that cannot be measured in a sandbox.** It
comes off the owner's daughter on day 15 (§8.9). Until then every number here is
provisional and says so.

**Why p10 and not the mean.** Seeded, the WORLD is deterministic — rival scores
repeat to within 0.5%. The PLAYER is not: the same seeded Maple came back
108,533 / 176,364 / 182,378 across cranked runs, because the RNG stream's
position when the match starts depends on the handful of real frames before the
crank takes over. Under a win gate a goal must clear the bad days, not the
average one.

#### Dot 1 · EAT — met at about half the clock

Score reached at 50% of the clock (p10), and the goal set under it:

| world | score at 50% (p10) | at 75% (p10) | final (p10) | **EAT goal** | lands at |
|---|---|---|---|---|---|
| Maple | 18,790 | 34,294 | 113,799 | **18,000** | ~49% |
| Pirate | 19,353 | 24,296 | 72,837 | **18,000** | ~47% |
| Game Day | 34,800 | 54,128 | 187,772 | **32,000** | ~47% |
| Lantern | 41,206 | 70,509 | 198,801 | **40,000** | ~49% |
| Powder | 11,104 | 28,146 | 64,392 | **10,000** | ~46% |
| Skylark | 32,020 | 59,502 | 76,827 | **30,000** | ~47% |

Dot 1 is the first thing a child meets in a world and it is deliberately the
easiest: met at about half the clock by a competent run, which leaves the whole
second half as margin for a slower one. §3.4's draft set these at 0.6 x par —
between 21,000 and 105,000 — which on Pirate was **87% of what a competent run
reaches on a bad day**. That would have been a wall on dot 1.

#### Dot 2 · SET — met between 22% and 55% of the clock

The SET numbers could not be set from the autopilot at all. It eats
nearest-first, so by 70% of the clock it had eaten 484 snacks and **zero houses
and zero cars on Maple** — not because houses are unreachable, but because a
snack is always nearer. `DRIVE_KIND` (`qa/_drive.mjs`) hunts a named kind and
falls back to the nearest edible while none is in reach, which is what a child
hunting houses actually does. Same world, same seed: **2 houses became 40.**

The binding constraint is not the count. It is WHEN the kind first becomes
edible — houses and cars sit at r 3.2-3.6 and the void has to grow into them.
On Maple the first house is eaten at 75 s and the fifth at 76 s: once one is
edible they all are, because they stand in streets.

| world | triple | p10 completion | of the clock |
|---|---|---|---|
| Maple | **5 houses · 8 cars · 40 snacks** | 76 s (house 5 @76, car 8 @67) | 42% |
| Pirate | **8 gold · 20 cabanas · 60 snacks** | 56 s (gold 8 @56, cabana 20 @48) | 31% |
| Game Day | **4 trucks · 8 houses · 40 snacks** | 99 s (car 4 @48, house 8 @99) | 55% |
| Lantern | **10 gold · 40 stalls · 100 snacks** | 48 s (gold 10 @48, house 40 @48) | 27% |
| Powder | **4 gold · 4 chalets · 40 snacks** | 91 s (gold 4 @20, house 4 @91) | 50% |
| Skylark | **10 gold · 40 vans · 100 snacks** | 39 s (gold 10 @27, car 40 @39) | 22% |

The spread (22–55%) is not sloppiness, it is the worlds being different:
Lantern's 319 stalls stand shoulder to shoulder and Powder's 25 chalets do not.
**Gold is capped at 10 deliberately** — only 20 props are gilded per match
(`GILD_PER_MATCH`) and the family eats some, so 20 reads "never" on Lantern and
Skylark and 147 s on Pirate. A goal of 15 would be a coin toss.

Supply, checked against the client's own `HOUSE_LIKE` via `__questPools`:
Maple 70 house-like, Game Day 110, Lantern 319, Powder 25, Skylark 2, Pirate
none. Every triple above clears 3N, and the cars-and-houses 6N rule.

#### Dot 3 · LANDMARK — the hero landmark cannot be the goal

Measured, and this is the finding that forces a change. The growth curve is
brutally back-loaded — radius p10 ~2.8 at a quarter of the clock, ~4.0 at half,
~5.1 at three quarters, then 10.5–14.3 at the buzzer. So every world's hero
landmark is edible only in the last seconds, and on one world never:

| world | hero landmark | needs R | reached at (p10 / p50 / p90) | slack |
|---|---|---|---|---|
| Maple | Town Hall r 6.5 | 5.86 | 127 / 137 / 145 s | 36 s |
| Lantern | r 11 | 9.91 | 133 / 157 / 163 s | 18 s |
| Pirate | Royal Mariner r 10 | 9.01 | 146 / 156 / 163 s | 18 s |
| Game Day | Stadium r 11 | 9.91 | 149 / 160 / 168 s | 13 s |
| Powder | Lodge r 10.5 | 9.46 | 163 / 165 / 168 s | **13 s** |
| Skylark | the whale r 18 | 16.22 | **never** | — |

A perfect driver reaches it with 13–18 seconds left on four worlds. Skylark's
resolves to the tethered whale needing R 16.22 against a growth law that tops
out at 12 (`LAW_TOP`) — impossible by construction, which is the trap §3.4
predicted and this confirms.

**The fix, measured rather than guessed.** `__landmarkProbe().band` lists what is
standing at r 3.2–6.0, the band a child reaches with time to spare. Every world
carries buildings there; they are simply untagged:

| world | in the reachable band |
|---|---|
| Maple | 305 untagged (r 3.2–6) · 70 houses · 1 car |
| Pirate | 242 untagged (r 3.4–5.6) |
| Game Day | 68 RVs (r 4.2) · 62 untagged · 26 cars · 1 big (r 4.5) |
| Lantern | 227 houses (r 3.4–4.6) · 3 big (r 4.2–6) |
| Powder | 23 chalets (r 3.6) · 2 untagged (r 4.4–5.6) |
| Skylark | 128 big (r 4.2–5.5) · 1 untagged (r 5.6) |

**Dot 3 therefore names a mid-tier building of radius 5.5–6.0**, tagged in each
world's factory as `LEVEL_SPEC[world].landmark` (day 4). It needs R 5.0–5.4,
which a competent run passes at about 75% of the clock — roughly 45 seconds of
slack instead of 13. The world's hero landmark is untouched and stays the
finale beat (`heroCue`/`heroProp`), exactly as §3.4 requires.

#### Dot 4 · RIVALS — rank 1 is the last world's goal, not the first's

The autopilot takes rank 1 at p10, p50 and p90 on every world — but it
outscores the family roughly two to one (Maple 132,658 against a best rival of
78,305), so this says the goal is winnable by a strong player, not by a small
one. The rubber band floors the family at "never below 3rd"
(`rivals.ts:256`), so a rank goal below 3 is the honest ceiling for a child.

Ramped across the unlock order, which is the difficulty curve the owner asked
for: **Maple and Pirate rank ≤ 3 · Game Day and Lantern rank ≤ 2 · Powder and
Skylark rank 1.**

#### Dot 5 · CLEAR — 30% of the world, not 100%, and probably the boss instead

§3.3, §3.4, §8.1, §8.3 and §9.1 all rest on "100% `devouredPct` is measured in
single digits on a real run (`:5462-5466`)", used to argue the star is "a
colour she would never see". **The citation does not support it** — those lines
are the end-of-match stats block and say nothing about `devouredPct` — and the
measurement contradicts it. Percentage of the world devoured, p10 of five runs:

| world | at 50% of the clock | at 70% | at 90% | buzzer |
|---|---|---|---|---|
| Maple | 17 | 29 | 43 | 55 |
| Pirate | 27 | 29 | 35 | 59 |
| Game Day | 16 | 33 | 51 | 64 |
| Lantern | 30 | 48 | 72 | **84** |
| Powder | 19 | 31 | 43 | 55 |
| Skylark | 21 | 39 | 48 | 49 |

**And there is no tail grind.** The curve accelerates to the buzzer — the last
tenth of the clock adds 10 to 24 points, because a void that size swallows
whole blocks. The grind a child experiences is real but it is the MIDDLE of the
match, before she is big enough for the fast part.

`devouredPct` also counts the family's meals. Her own share at 70% (p10) is
Maple 14%, Pirate 16%, Game Day 19%, Powder 22%, Lantern 28%, Skylark 38%.

**CLEAR set at 30% of the world** is met at about 70% of the clock on every
world — winnable with a minute to spare, against the 100% the brief assumed.

**But dot 5 should probably not be CLEAR at all.** The owner's 2026-09-11 ask —
a boss on the final dot of every world, a bigger family member — turns out to
describe something already shipped and tuned: see §3.4b.

#### 3.4b The boss already exists, and it fires

`rivals.ts` authors NIBBLES (arch `BULLY`) as two acts: a predator looming at
1.5x the player for the first 55% of the match, then STUFFED — growth stops and
her ceiling sags 0.3%/s until the player's finale surge overtakes her and she
becomes, in the file's own words, "the marquee meal — the whole payoff of the
arc". The sag rate is already tuned: a first pass at 0.7%/s deflated her and
"she no longer LOOKED like the biggest meal on the island, which is half of why
a kid goes after her."

Nothing had ever measured whether it lands, and `gate.mjs:210` puts
`qa/rivalnotice` ON PROBATION — "last read 0.0/min in maple, gate open 0%". So
it was measured (Maple, three seeded runs):

| | measured |
|---|---|
| peak size | **1.56–1.74x** the player's radius |
| charges | **3 per match**, every run |
| bites taken off the player | 1–3 |
| first edible | **~120 s of 181** — a minute to hunt her |
| marquee meals taken | p50 **1** · p10 **0** |

**The arc fires.** The pacing the owner asked for already exists. Two things
follow. First, this is naming, not building: dot 5's goal becomes "EAT NIBBLES"
and the percentage drops to a low ticket or out of the gate entirely. Second,
**at p10 the marquee meal is 0** — one run in three misses her even with a
perfect driver, and a boss dot that fails a third of the time for a perfect
player cannot gate anything. The sag rate is a one-number change and day 4
tunes it until p10 is 1.

The threat is already shipped and rated 4+: she charges three times and bites
the player in every match the game has ever run. Naming it raises it from
background to foreground, which is a day-15 observation, not a new risk.

**Different bosses per world** (the owner's ask) is largely already authored:
the five archetypes have genuinely different AI — BULLY hunts, SHOWOFF crosses
the island for the biggest thing, COPYCAT drives the player's own route seven
seconds behind, HOARDER works a patch at half speed, COWARD bolts from anything
bigger. Promoting a different relative per world gives six different fights out
of shipped behaviour. **The blocker is one number and it is the owner's:** only
`BULLY` can exceed `softCap` — both escapes are inside `if (isHunter)` — and
`GOVERNOR.md` logged on 2026-08-25 that raising it is "a measured balance number
the VOID TITAN feast depends on. Not mine to move." It is the same call the
owner made on 2026-08-25 ("any void that's larger") and it is still open.

### 3.5 Bars

1. `__levels()` and the DOM pips agree exactly for every one of the 30 (world, goal)
   seeds; **exactly one current per world row, computed by `current(world)`**; a missing
   `__levels` throws.
2. Migration is monotone: for the three seeds (fresh; `voidUnlocked='maple,pirate'` +
   `voidBest_pirate=8420`; the all-worlds CSV) no state is lower after migration than
   before, and `maple/1 ≥ open` always (mirror `qa/unlocks.mjs` D).
3. Pip geometry: 44/57 px, width ratio 1.25–1.35; adjacent-pip Lab ΔE ≥ 10 **and**
   pairwise luminance contrast ≥ 3:1 (the polish plan's C bar 2, which draft 1 had
   silently replaced with ΔE alone — code skeptic; `pickerfit`'s ratio helper); each pip
   vs ground ≥ 10 ΔE (`lockedcards.mjs:41-49`); padlock sprite p10 ≥ 3:1.
4. **Win advances, and no dot may be a wall** (the owner's decision, §3.2 — this bar is
   what makes it safe). The goal met inside the clock → goal k `'done'` and goal k+1
   `'open'`; the buzzer with the goal unmet → `'fin'`, goal k+1 stays `'locked'`, coins
   kept, `n + 1`; a quit (`:7774`) counts as an attempt and never advances. **And, on
   day 2's measured curve, an AVERAGE run must meet the goal on every one of the thirty
   dots** — the probe drives the autopilot at the median player's own rate (not
   half-speed: under a win gate a deliberately weak run failing is correct, so the bar is
   about the median, not the floor) and asserts dot 5 of every world is reached. A dot the
   average run cannot win is re-specified or does not gate; it never ships as a wall.
   Between worlds the ladder stays finish-gated (`unlocks.ts` unchanged), so a stalled
   child can always travel on.
5. Every SET triple has supply ≥ 3N per kind on a live count (`__goalPools()`); `'big'`
   counts once per bite; cars/houses ≥ 6N.
6. Difficulty (measured, not asserted — polish plan bar 5): the median tester earns the
   tick on goal 1 of a world in one run and on goal 3 in ≤ 3 runs; EAT N lands its win at
   90–150 s of a typical run (day 2 score-vs-time), never at the buzzer.

**Probe.** `qa/levels.mjs` (§5.2) — **not** `qa/ladder.mjs`, which exists and is the
quality-ladder probe.

## 4 · The level flow

**Mechanism.** Menu → one tap → the world armed and idle → the clock starts on the
first touch → goal card → HUD counter for the whole match → win on the spot or the
buzzer → end card: pip first, coins, next reward as a locked jewel → CONTINUE.

**Ours today.** `#btnPlay` opens the picker (`:6493`); `launchWorld()` hides the menu
and runs `withWorldReady(() => startFresh(soloOn()))` (`:6503`); `beginMatch` (`:6081`)
arms without starting the clock (`armed = true` `:6144`), snaps the camera (`:6151`);
`startMatch()` (`:6297-6303`) fires from the first `pointerdown` (`:3397`) and starts the
clock **and** the music (`:6329-6331`) — the owner's decision is already true. The goal
card `#titlecard` is filled once at module init (`:1674-1677`) and shown at
`GOAL_CARD_AT` 0.5 s for `GOAL_CARD_LEN` 0.6 s (`:6029-6031`, `:9512-9518`). The buzzer
sets `outroT = 2.0` (`:9681-9686`) and `endMatch()` is reached through `:9480`;
`endMatch()` takes no parameters and infers the result from `myRank` (`:5434`) or the
solo best (`:5352`); `celebrateEnd()` is called at `:5358` (solo) and `:5442` (rivals),
`.show` is added at `:5364`/`:5570`, and the solo `return` is `:5372`. The last 35 s are
a ritual — red timer, `announce('⏰ 35 SECONDS — EAT FASTER!!')`, a 150 px numeral per
second turning hot red at 3 with a rising tick (`:9650-9679`, `index.html:364-370`) —
built for a match in which finishing IS progress. The end card order is `#endHd, #endSub, #endList, #endFinds,
#endStats, #drop, #endNext, #endQuests`, footer `#btnAgain / #btnHome`
(`index.html:2229-2274`); it already overflows at 430×932 (`:2263-2269`,
`qa/endfit2.mjs`).

### 4.1 Goal card copy (one line ≤ 6 words in the world's voice for dad; sprite + number for the child)

`beginMatch` fills `.lvl` = "LEVEL 3" (world-local 1–5), `.name` = the world name, `.sub`
= the line below, **before** `armed = true` (`:6145`); the one-time fill at `:1674-1677`
goes. `GOAL_CARD_AT/LEN` untouched (measured against Hole.io, recon 11.5). **The card and the
hand must never share the screen** — the first session auto-plays Maple with no menu
(`:6560-6562`) and a five-digit target over the wordless drag lesson is not a first level,
it is noise (child skeptic note 8); on that run dot 1 is passed by finishing like any
other, and the tick is hers if the number falls.

**DAY 4 MEASURED THE CLASH AND FIXED IT ON THE OTHER SIDE.** `levels.mjs` (b) on the
shipped build: on the one frame the card unrolled, the ghost hand was already up — 1 of 1
sampled states. The cause is that `beginMatch` sets `controlsLive = true` at arm without
setting `handHold`, which is only ever set at `:11134` on the far side of the descent —
a line the armed idle never reaches — so the hand was live from the first armed frame and
the card unrolled on top of it half a second later. This brief said "suppress the card
under the hand"; that is the wrong half, because `teachDrag` is `firstEver || pickedWorld
=== 'maple'` (`:6786`), true for **every child on every Maple match**, and Maple is where
all thirty dots begin — a card suppressed under the hand is a card no Maple player ever
sees. The authored order is restored instead (`handHold = GOAL_CARD_AT + GOAL_CARD_LEN`
at arm, plus the hand gated on the card's own `titleUntil` so the two clocks cannot
overlap by a frame at the far edge): card, settle, lesson, exactly as the hand's own
comment has always described it.

| world | 1 EAT | 2 SET | 3 LANDMARK | 4 RIVALS | 5 CLEAR |
|---|---|---|---|---|---|
| Maple | EAT 48,000 OF THE TOWN | 5 HOUSES · 8 CARS · 40 SNACKS | EAT THE TOWN HALL | BE THE BIGGEST VOID | EAT THE TOWN |
| Pirate | EAT 63,000 OF THE BAY | 4 GOLD · 5 CABANAS · 40 SNACKS | EAT THE ROYAL MARINER | BE THE BIGGEST VOID | EAT THE BAY |
| Game Day | EAT 105,000 OF GAME DAY | 4 TRUCKS · 8 HOUSES · 40 SNACKS | EAT THE STADIUM | BE THE BIGGEST VOID | EAT GAME DAY |
| Lantern | EAT 90,000 OF THE NIGHT | 4 GOLD · 10 STALLS · 40 SNACKS | EAT THE BATHHOUSE | BE THE BIGGEST VOID | EAT THE NIGHT |
| Powder | EAT 27,000 OF THE PASS | 4 GOLD · 4 CHALETS · 40 SNACKS | EAT THE LODGE | BE THE BIGGEST VOID | EAT THE PASS |
| Skylark | EAT 21,000 OF THE FIELD | 4 GOLD · 8 VANS · 40 SNACKS | EAT THE HANGAR (§8.2) | BE THE BIGGEST VOID | EAT THE FIELD |

The `.sub` line carries the sprite(s) and the number(s) first, the words after; the same
string paints `.goalLine` on the menu. CLEAR's line names the world, not "everything" —
its number is the world's CLEAR number (§8.3), and the bar under it is what she reads.

### 4.2 HUD

One new `#goal` chip, 44 px tall, in the slot `#quests` (`index.html:1886`) leaves; no
score element exists in the HUD today (`:1884-1891`) and `.gFill` is not repurposed
(`:4949-4955`). Contents by goal:

- **EAT** — sprite + `31,200 / 48,000` with a **fill that is the pip sprite itself**
  filling bottom-up (a 4 px bar under a thumb is invisible; five-digit numbers are for
  dad — child skeptic note 9). `playerScore` (`:3704`) can fall on a hunter steal
  (`:2945`), so the fill holds its **high-water mark** while the number stays honest, and
  the win is a per-frame threshold that latches on first crossing (not an eat event).
- **SET** — three sprite + count pairs counting **down**, each turning into a tick sprite
  at 0, **ordered smallest count first** (houses 5 before snacks 40, so she sees a tick
  inside the first minute); fed at the eat handler's kind lines (`:5825-5839`) with rules
  identical to `questable.mjs:74-90` ported to `__goalPools()`, `'big'` de-duplicated per
  bite; `questEvent` (`:4018`) stays as the signal after the board goes.
- **LANDMARK** — the landmark sprite + a size bar `R / (landmark.radius / EAT_RATIO)` that
  reads "grow until it fills", where `landmark` is the prop tagged
  `LEVEL_SPEC[world].landmark` (§3.4), **not `heroProp`**; the level's own in-range cue
  string from `LEVEL_SPEC` (the world's `heroCue`, `:10753-10766`, stays the finale
  beat); win at a poll on that prop's `userData.byPlayer` (the `:10768-10775` pattern).
  **The landmark prop is excluded from the rivals' eat rule on goal 3** (they can take
  the hero today, `:10770-10774`); no "stolen" state exists.
- **RIVALS** — a rival-face sprite + `#2 OF 6` from the 5 Hz `myRank` (`:4732-4737`),
  the crown at #1; resolves at the buzzer only.
- **CLEAR** — the island sprite + a bar to the world's CLEAR number from `devouredPct`
  (`:4886`); win at the number.

Goal callouts never use `announce()` inside the 35 s window (`:9650-9651`) or over the
title card (`titleUntil`, `:10683`); `holdBanner` stays reserved for EVOLVED and the
landmark cue (`:4744-4748`).

**The last ten seconds key on goal state** (child skeptic, must-fix: under a ladder the
identical ritual becomes a countdown to losing, "a giant red 3-2-1 she cannot read with
the pitch climbing toward the moment the green dot fails to move"). Goal already met →
the match ended on the spot, there is no countdown. Goal unmet at 35 s → no red timer,
no `⏰ EAT FASTER!!` banner (the goal sprite pulses once in `#goal` instead), the
numerals stay gold (`#count` never gains `.hot`), the tick pitch is flat. RIVALS with
`myRank === 1` at 10 s → today's hot countdown, because there it is the bell to a win;
`myRank > 1` → gold and flat. `levels.mjs` (c): with `?len=15` and the goal unmet,
`#count` never has class `hot` and no `#banner` text matches `/FASTER|SECONDS/`.

**Landed day 4, and it is TWO flags, not one** — the build found that out. The nag (red
clock, `⏰ EAT FASTER!!`) and the celebration (hot numerals, rising tick) are different
messages, and only the celebration keeps the RIVALS-at-#1 exemption. With a single flag,
a RIVALS level fired the banner at **t ≈ 0**: on a short match the clock is under 35 s
from the first frame, and the player is #1 before anyone has joined, so the nag rode in
on the celebration's exemption (`levels.mjs` (c), goal 4, the one finding left after the
other sixty-five went). So: `hurry = !goal || goal.met` gates the clock colour and the
banner; `bell = hurry || (goal.n === 4 && rank === 1)` gates the numerals and the tick
pitch. `levels.mjs` (c) holds **both halves** — five goals with the ending gold and
silent, a sixth run where the player leads a RIVALS level and the hot countdown is still
there, and a goal-free control where the whole shipped ending is intact. A rule that only
removes is indistinguishable from a deletion; these three cases tell them apart.

### 4.3 Win on the spot, and the miss

One `goalMet()` check inside `if (started && !ended && !paused)` beside the buzzer
(`:9681`), **with the buzzer's own guard `outroT <= 0`** and result **first-writer-wins**
(code skeptic: during the 2 s outro the eat loop, rivals and score keep running at
`dtw = dt·0.3`, `:9480`, `:10367`, so an unguarded threshold fires after TIME has set the
result and overwrites it with a win; a goal met at `matchClock ≤ 0.6` and the buzzer can
race in one frame). It runs **only when `playing` is set** (§3.1) — a harness match with
no level is goal-free. On true it sets `goal.result = 'win'` and `outroT = 2.0` exactly
as the buzzer does, so the existing slow-mo / rings / music ceremony runs (`:9480`,
`:10203`, `:10562`) and `endMatch` is reached through `:9480` unchanged. The buzzer with
the goal unmet sets `goal.result = 'time'` (RIVALS: `'win'` iff `myRank === 1`).
`endMatch(result)` gains its one argument; the headline is no longer inferred at
`:5352`/`:5434`. `recordLevelResult({world, goal, result, score, pct, rank, secs})` is
called right after `ended = true; voidPlayed = '1'` (`:5329-5330`) and **before** the solo
return (`:5372`); it raises the pip to `'fin'` on a miss, `'done'` on a win, `'clear'`
on a win with the CLEAR number reached, and **opens goal k+1 only on `'done'` or
`'clear'`** (§3.2, the owner's win gate).
`voidBest_<w>` (`:5449-5452`) and `completeWorld` (`:5503`) stay, plus `completeWorld` in
the solo branch. The quit path (`:7774`) records `n += 1` and nothing else — a quit is
not a finish.

On a miss nothing is lost and nothing stops: no lives, no timer pressure, no ad, no red
countdown; coins for what was eaten count up as usual; the pip turns `fin` (grey with the
green outline) and the ring moves on to the next dot, whose padlock pops off on the end
card (§4.4); `audio.ready()`, never `audio.lose()` — the "never a wall" rule of
`unlocks.ts:5-26` applied inside a world. The tick is one replay away, and the pip says
so without words.

### 4.4 The end card, in order

`#end` stays z9 over the dimmed world (`index.html:708-722`).

1. **The pip is the headline.** `#endHd` on a goal level is the finished pip itself,
   drawn large (96 px sprite): on a win it flips green → grey-with-tick; on a miss it
   flips to `fin` with a "come back" arrow sprite; the next pip's padlock pops off beside
   it (320 ms). The word sits **under** it at 12 px for dad — "LEVEL 3", "NOT YET", "#2 ·
   NOT YET", "CLEARED" — never first. Draft 1 led with the word; the child skeptic: "the
   first thing on the one screen that tells her how she did is a word she cannot read,
   and on a miss it is a word with no picture at all."
2. **`#endPips`** (new, between `#endHd` and `#endSub`, `index.html:2230-2231`): the five
   pips in their new states; painted **before** `celebrateEnd()` is called (`:5358` solo,
   `:5442` rivals) so they light before the 900 ms coin count-up (`:5290-5322`). Caption
   under the pips, 12 px, for dad: "LEVEL 8 OF 30" (the ordinal, §3.1).
3. `#endSub` coins/gems/XP count-up as today; the day's calendar coins (§1.2) count up
   here on the first finish of the day, with the calendar's own sprite.
4. `#endStats` cascade unchanged (`index.html:768-787`, the tiles at `:5460-5477`);
   `#endList` standings on RIVALS levels only; `#endFinds` as today; `#drop` unchanged
   (`:5206-5289`).
5. `#endNext` = **the next reward**: for goals 1–4, the next pip drawn large with its
   sprite and line, padlock opening (320 ms); after goal 5, the next world's poster
   painted by `paintWorldCard(host, WORLD_ORDER[i+1])` (`:6689`; five posters on disk,
   Skylark's is CDN-only with `CARD_FALLBACK` `:6672-6688`) under the `.locked` filter and
   a padlock (`index.html:1416`) with the TAKE ME THERE door (`:5509-5537`). On a world's
   **first** finish before goal 5 (the world opens by `unlocks.ts:86-97` regardless) the
   next island appears as **information only** — the jewel with its lock lifting, no
   door: two doors on one card, one of which abandons the ladder on the world just
   played, is the collision the code skeptic named; travel is the world chip's job until
   dot 5. The **OPEN SHOP** door (`:5539-5563`) appears only when a coin skin is affordable
   (its existing `can` state, `:8335-8336`), never as the default next thing (child
   skeptic).
6. `#endQuests` **deleted** with its render block **`:5486-5502`** (`el('endQuests')` at
   `:5488`; CSS `index.html:487-497`). Draft 1 cited `:5461-5476`, which are the `#endStats`
   tiles point 4 says are unchanged — the code skeptic caught it; **re-verify by symbol
   at build time, not by line.** The HUD board is `questsEl` `:3971` + `renderQuests`
   `:3972`; the pool `:3811-3968`.
7. Footer: `#btnAgain` reads CONTINUE on any finish (`resetMatch` `:7571` into
   `current(world)` — the next dot, or this dot again if it was the fifth and unticked;
   no reload; after pip 5 → TAKE ME THERE's reload with `voidWorld + voidAutoPlay +
   voidPlayGoal`); on a miss a second, smaller TRY AGAIN replays the same dot for the
   tick; `#btnHome` → `enterMenu()` where the pip hop plays.

Height budget: removing `#endQuests` (~120 px) pays for the big pip headline (96 px)
and `#endPips` (56 px) + caption (20 px), with `#endHd`'s old two lines of text (~52 px)
gone; the jewel replaces the text card at the same height. `qa/endfit2.mjs` (not in the
gate today; prints no PASS line and defaults to port 4188, `:18`, `:80`) is registered
with `verdict: exitCode` and the gate's PORT, and run at two sticker finds: `#btnAgain`
≥ 90% inside the viewport at 430×932 and 393×700.

### 4.5 Reload moments

A world change, TAKE ME THERE and a cross-world replay stay a page reload
(`:6766-6770`, `:5518-5520`). The boot cover (`#loadScr`, `index.html:2143`) paints
`paintWorldCard(loadScr, voidWorld)` behind its text so the locked jewel on the end card
and the cover are the same picture; `preloadMusic` already orders the world track first
on that path (`audio3d.ts:4040-4062`). The poster for the *next* world is requested
while the end card is up so the cover is warm.

### 4.6 The first reveal (session 2)

The first session never shows the menu (`:6559-6562` auto-plays Maple with no menu, the
goal card suppressed under the hand, §4.1); the daughter's first sight of the ladder is
after her first match, and under §3.2 that match has already passed dot 1 whatever the
number did — her first result screen is a lit dot and coins, never a miss. On the first
menu ever shown (`voidPlayed` set, no `voidLevels.seen`): the pips fade in left to right
80 ms apart, pip 1 flips to its real state (grey-with-tick if the number fell, grey with
the green outline if not), the void looks down at the row for 1.4 s, the current pip's
ring pulses three times **on this reveal only**, PLAY glows once. No words.
`voidLevels.seen = 1` afterwards.

### 4.7 Bars

1. Taps to play = **1** on `/?manual=1` (`AUTO_START` off, `:3631`), **run twice: with
   `voidDailyLast` seeded to today and to yesterday** (child skeptic: 383 probe files seed
   today, so no probe ever met the calendar): after one click on `#btnPlay`,
   `__matchState().armed === true`, `#menu` computed display `none`, `#worlds` never
   gained `.show`, `#daily` never gained `.show`, **and no navigation happened**
   (`window.__marker` set before the click survives it; `__menuState().world ===
   pickedWorld` — gate skeptic); then one `pointerdown` sets `started` and the clock
   ticks from 0 (`qa/opening.mjs` A1 stays 0).
2. Goal card: `#titlecard` `.sub` equals the level's line; shown once inside
   `GOAL_CARD_AT .. +GOAL_CARD_LEN` of arming and never again; not shown at all while the
   hand tutorial is up.
3. HUD presence at match seconds 5 / `matchLen·0.49` / `matchLen·0.9` (on
   `__matchState().t`, never wall; solo levels run the 120 s clock, `:6131`, and never
   reach 163 — code skeptic): `#timer` visible and decreasing; `#goal` visible with a
   value monotone in the right direction (EAT high-water non-decreasing, SET
   non-increasing, LANDMARK bar non-decreasing, RIVALS a rank 1–6, CLEAR non-decreasing);
   `#quests` absent; with the goal unmet, `#count` never has `.hot` and `#banner` never
   matches `/FASTER|SECONDS/`.
4. Win on the spot: driving the counter with the goal hooks (§3.1) opens `#end` with
   `matchClock > 0` and `#endHd` carrying the tick sprite; `?len=8` with the goal unmet
   opens `#end` with the `fin` pip and "NOT YET" under it, `n` incremented, **goal k+1
   still locked** (§3.2) and the green ring still on this dot; RIVALS never ends before the buzzer; **a counter driven across the threshold
   1 s into a TIME outro (`?len=8` + `__rushClock`) still reads NOT YET** (the
   first-writer guard).
5. End-card order, from computed style, not timestamps (gate skeptic: the class is set
   synchronously before `.show`, so a timestamp delta is ≤ 0 by construction, and the
   count-up's first write is a rAF race under swiftshader): the headline pip element is
   visible (`opacity` 1) before any `#endHd` text node is; for the finished pip
   `animationDelay + animationDuration ≤ 0.4 s`; `.endCnt`'s count-up `t0` (exposed) ≥
   the pip's `animationDelay`; element absent → FAIL.
6. Level ordinal text matches `/\d+ OF 30/` on the end card and nowhere in `#menu`.
7. `#btnAgain` ≥ 90% visible at two finds (`endfit2`, exit code).
8. First reveal: seeding `voidPlayed=1` and no `voidLevels` → `.pips.reveal` runs once;
   second load → never.
9. First armed frame: `__quality().pr === QUALITY[qLevel].pr`, `bloomOn ===
   QUALITY[qLevel].bloom` (§2.2.7).
10. Shop, no gate passed: zero visible text nodes inside `#shop` matching
    `/[$€£]|\d,\d\d/`; no LEGENDARY tier rendered; the end card's OPEN SHOP door absent
    unless a skin is affordable.

**Probe.** `qa/levels.mjs` (b), (c), (d); `qa/menu.mjs` bars 5, 21 (taps, shop);
`qa/endfit2.mjs`.

## 5 · The probes

### 5.1 `qa/menu.mjs` — contract

**Output discipline** (gate skeptic: `gate.mjs` judges `pf` as `pass && !fail` over the
whole stdout, `:583-587`, so a probe that prints six `PASS —` lines and then throws on bar
7 is read as PASS — silence-as-consent one level down). Per-bar lines use non-verdict
tokens: `  ok   #3 …` / `  BAD  #3 …`, each with its wall time. Exactly one final `PASS —`
or `FAIL —` line is printed after the last bar; `process.on('uncaughtException')` and
`('unhandledRejection')` print `FAIL — <bar> threw` and exit 1. A missing hook or
selector throws (rule 2: the bar fails on the pre-fix build by absence).

**Two halves** (gate skeptic: unsized, every world load here is minutes and the gate
SIGKILLs at `step.timeout`): `qa/menu.mjs --static` (DOM, boxes, colours, state — seconds;
push, all worlds) and `qa/menu.mjs --live <world>` (cranked frames, renders — push on
Maple only, all six in `live`; the `smoke`/`opening` pattern, `gate.mjs:89`, `:176-181`).
Timeouts are set from one measured run, printed in the PASS line.

Every per-frame bar hand-cranks rAF with a virtualised `performance.now` at
16.667 ms/frame (`qa/ladder.mjs:65-76`) so the sandbox's ~1 fps cannot be read as the
game's; contrast bars crank to a fixed frame first (an orbiting backdrop makes A/B shots
non-deterministic — `firstframe.mjs:76-79` already hit this). Viewport 430×932 @ 2 unless
stated; `__pinQuality(0)` **and** `__pinMenuRung(0)` (the menu rung otherwise degrades at
once under swiftshader and the ratio bar passes for the wrong reason).

| # | bar | method | number |
|---|---|---|---|
| 1 | window share | `#menuWindow.getBoundingClientRect().height / innerHeight`; canvas hidden vs shown screenshots of the window box | 45–53%; disjoint from `#btnPlay`, `.pips`, `.tabs`; ≥ 60% of the box's pixels differ (the curtain has a hole) |
| 2 | void size | `__menuState().voidPx`, cross-checked once by projecting `__voidGroup` through `__cam` | 28–42% of window height; centre in the lower 60%; hit radius ≥ 60 px; both numbers printed |
| 3 | pendulum | `__menuState().azimuth` over **1,000 cranked frames** against the exposed `{a0, amp, period}`; camera motion = a fixed world point (`MENU_STAGE.look`) projected through `__cam` per frame | max error vs the authored sine ≤ 0.2°; amplitude 5–7°, period 15–17 s; projected point median 0.2–1.0 px/frame, max ≤ 2 px |
| 4 | UI still | **canvas hidden** (firstframe's freeze), four shots 150 ms apart after the menu has settled 3.5 s — see correction 12: with the world live behind a 72%-opaque panel this box changes 26.4% of its pixels every 150 ms and no animation fix can reach 0 | 0 changed pixels inside `#btnPlay`, `.pips`, `.tabs`, `#coins`, `.logo`. **Live (report, not a bar):** the same number with the canvas visible, printed |
| 5 | taps to play | `/?manual=1`, `voidDailyLast` = today and = yesterday, count clicks until `armed`; `window.__marker` before the click | exactly 1 in both runs; `#worlds` and `#daily` never `.show`; marker survives; `__menuState().world === pickedWorld`; then one pointerdown → `started`, clock from 0 |
| 6 | frame ratio (REPORT) | `__frameTimes()` medians, 600 frames menu vs 600 in-match, same page, `__pinQuality(0)` + `__pinMenuRung(0)`, pixel ratio pinned 1 both sides; JS ms / draw calls / triangles per side; run twice | printed with the spread and "sandbox, not device"; armed as a ≤ 1.15 bar on JS ms and draw calls once the spread is known |
| 7 | draw calls | `renderer.info` with `autoReset=false`, two consecutive frames at every 10° of the pendulum, bloom off both sides; bloom/shadows/DPR printed per line | max of pair ≤ 1.3× in-match r = 12 pair and ≤ 2,000, per world |
| 8 | PLAY contrast | `pickerfit.mjs:211-225` ink method at three pendulum phases; glyph p10 by `firstframe.mjs:88-105` | ≥ 4.5:1 both |
| 9 | pips | boxes, Lab ΔE (`lockedcards.mjs:41-49`), luminance ratio (`pickerfit`'s helper), padlock sprite | 44/57 px, ratio 1.25–1.35; ΔE ≥ 10 adjacent and vs ground **and** ≥ 3:1 pairwise; padlock ≥ 3:1; exactly one current per world row |
| 10 | tabs | pairwise ground ΔE; label contrast | ≥ 15; ≥ 4.5:1 |
| 11 | no platform glyphs | regex `[\p{Extended_Pictographic}☀-➿]` over `.pips`, `.tabs`, `.goalLine`, `#goal`, `#titlecard`, `#endPips`, `#endHd`, `#btnWorlds`, `#banner`, `#count` `textContent` | 0 |
| 12 | clearance | `__menuState().occluders` at each world's stage | 0 |
| 13 | restored island | end a match (`?len=8`), click `#btnHome`; also quit from pause | `eaten === 0`, `voidRadius === __menuState().menuR`, `rivalsVisible === false`, panic count 0 over 120 cranked frames |
| 14 | hidden / idle / overlay | override `document.hidden`, dispatch `visibilitychange`; crank 20 s with no input; open `#shop` | `frame` (renders) flat for 60 wall-frames; render rate halves after 20 s while `rafs` climbs one per crank; `frame` flat while `#shop.show` |
| 15 | calm | seed `voidMotion='0'` | azimuth variance 0; `getAnimations()` in `#menu` empty |
| 16 | menu rung hysteresis | crank at 16.7 ms, then 25 ms, then 16.7 ms for 10 s | no step at 16.7; `menuRung` 0→1→2→3 in order at 25; back one step after 10 s; `__quality().level` unchanged |
| 17 | layout | the splash step's six views + 393×700 + 932×430 | no horizontal overflow; window ≥ 40%; PLAY ≥ 72; pips ≥ 44; every `#menu` control ≥ 44×44 |
| 18 | first reveal | seed `voidPlayed=1`, no `voidLevels`; the class lands on `#mlPips`, which also carries `class="pips"` so this brief's selector and the code name the same element and the check runs one rAF after the paint, because the boot branch that hides the menu for a first-ever session runs after `enterMenu()` | `#mlPips.reveal` once and `voidLevels.seen` written; absent on the second load of the same profile |
| 19 | locked tap | click a locked pip | wiggle class set for ≤ 220 ms, no text node added, `__levels()` unchanged, `voidling.faceState()` never `'scared'`/`'hurt'` for 2 s |
| 20 | ground colour | four 8×8 boxes at the PLAY band's corners on a cranked frame, HSV value/chroma as `chroma.py` | value 0.45–0.65, chroma 0.35–0.55, the four values printed |
| 21 | shop shield | open `#btnShop` with no gate passed; end a match, read the doors | zero visible text nodes matching `/[$€£]|\d,\d\d/` in `#shop`; no LEGENDARY tier node; OPEN SHOP absent on the end card unless a skin is affordable |
| 22 | menuMode honest | fresh profile with `?len=8` (DEBUG_HARNESS), and a played profile | whenever `#menu` computed display ≠ `none`, `__menuState().menuMode === true`; attract mode never moves the void (`voidState.x/z` constant over 300 cranks) |
| 23 | pennant | with an unlocked live event seeded, stopped rAF, shots with text hidden/shown | pennant text p10 ≥ 4.5:1 on the same frame; pennant box outside `#menuWindow` |

### 5.2 `qa/levels.mjs` — contract (the brief said `qa/ladder.mjs`; that name is taken by the quality-ladder probe and is kept as is)

**On the virtualised clock, or not at all** (gate skeptic, blocks): this harness runs the
match clock ~14× slower than wall (`GOVERNOR.md:54-56`, `:2303-2309`), so ten goal runs to
90–150 match-seconds under real rendering are 4–6 wall-hours inside a gate that SIGKILLs
at `step.timeout` (`gate.mjs:31`). (b) and (c) capture rAF + `performance.now`
(`ladder.mjs:65-76`), stub `__renderer.render`, and crank at 16.667 ms so the eat loop,
growth law and goal check run per frame in pure JS (150 match-s = 9,000 cranks, minutes).
The goal is forced through the explicit hooks of §3.1, never by waiting for the
autopilot. Same output discipline and two halves as §5.1.

- **(a) state machine** (static) — for each of the 30 seeds, `__levels()` and the DOM
  pips agree; seed "pirate goal 3 current" → exactly one current in that row, earlier
  fin/done/clear, later locked; pip star only when that pip's run met the CLEAR number; a
  missing `__levels` throws.
- **(b) advance** (live) — enter each world's goal 1 and one of each kind (ten runs) by
  the one tap; force the goal by its hook (`__setScore`, `__eatKind`, `__eatLandmark`,
  `__setRivalScores` with ≥ 2 forced joins **asserting both a win and a loss**, since
  under `?len=8` the family has not joined and `myRank === 1` trivially — code skeptic;
  `__devourAll`); assert `#end` with the win and goal k+1 open; `?len=8` unmet → pip
  `fin`, goal k+1 **still locked**, `n + 1`, the ring unmoved; a quit → `n + 1` only,
  nothing opens; the first-writer guard (§4.7 bar 4); and the winnability bar of §3.5.4 —
  an autopilot at the median player's measured rate meets the goal on all thirty dots.
- **(c) HUD presence** at t = 5 / `matchLen·0.49` / `matchLen·0.9` match-seconds (§4.7
  bar 3), and the gold-not-red last ten seconds with the goal unmet.
- **(d) next-world card** — goal 5 finished → `#endNext` has the locked-island element and
  the `/\d+ OF 30/` text; TAKE ME THERE writes `voidWorld`, `voidAutoPlay`,
  `voidPlayGoal`; a world's first finish before goal 5 → the jewel without a door.
- **(e) supply** (live) — `questable.mjs:74-90`'s block ported to `__goalPools()`, `'big'`
  de-duplicated: every SET kind ≥ 3N; cars/houses ≥ 6N. Registered in push, and the
  `questable` step retired, **in the same commit** that deletes the board (§6 day 6).
- **(f) migration** (static) — the three seeds of §3.5 bar 2, monotone.
- **(g) telemetry** — the four `level_*` events fire once each in a start→win and
  start→fin run with the right `{world, goal, kind}`.
- **(h) landmark exclusion** — draft 1's "after 60 match-seconds of autopilot the hero is
  uneaten" could not fail before the fix (non-hunter rivals are capped at `softCap`,
  `GOVERNOR.md:172-178`, and never reach r 6.5 in 60 s — gate skeptic). Now: a hook sets
  one rival's radius ≥ landmark radius / `EAT_RATIO` and warps it onto the landmark;
  assert the rivals' eat rule refuses it on goal 3 and takes it on goal 1. The failing run
  on the pre-fix build is committed.
- **(i) harness matches are goal-free** — `?len=8` with no `voidLevels` seeded and
  `AUTO_START` on: `#goal` absent, the match runs to the buzzer, `__levels()` unchanged.

### 5.3 Existing probes that change, by file

| file | today | change |
|---|---|---|
| `qa/pickerfit.mjs` | push; clicks `#btnPlay` then waits for `.wCard` (`:87-89`); ~~PASS on zero cards (`:245-260`)~~ **CORRECTED 2026-09-10 — see §9.7:** it has FAILED on zero cards since `d952532` (2026-09-08), two days before this brief, at `:285`; `:245-260` is the contrast loop. What it really does is PASS on a SHORT picker — every bar iterates `cards`, so four of six cards is measured on four and prints "all 4 world cards" | **day 1 (done):** FAIL when `cards.length !== ALL_WORLDS.length`, naming the missing worlds; **day 10:** open the grid via `#btnWorlds` |
| `qa/lockedcards.mjs` | push; `#btnPlay` + `.wCard` (`:63-65`) | day 10: via `#btnWorlds`; bars unchanged |
| `qa/firstframe.mjs` | push (`splash`); `#menu .logo`, `.logo i`, `.tag` skipped when missing (`:220`); `freeze()` hides the canvas (`:76-83`); non-splash path clicks `#btnPlay`/`.wCard` (`:232-235`) | **day 1:** a missing selector FAILS. **`freeze()` keeps hiding the canvas** — draft 1 said "keeps the canvas"; both the code and the gate skeptic refuted it: every measured selector sits on opaque ground bands A–B, so the canvas contributes nothing to their backdrop, and a moving diorama re-breaks the A/B pair the header at `:76-83` retired. The pennant, the one canvas-adjacent text, gets bar 5.1.23 under a stopped rAF. Day 10: non-splash path via the `_enter` helper |
| `qa/opening.mjs` | push; `/?manual=1`, `#btnPlay` then `.wCard` (`:258-260`) | day 10: one click on `#btnPlay`; all 19 bars unchanged; A4 additionally reads `__quality().pr` on the armed idle (bar 4.7.9) |
| `qa/worldreg.mjs` | push; `data-world` in `index.html` (`:195-197`) | unchanged — the grid keeps its six cards |
| `qa/newsfeed.mjs`, `qa/faceparity.mjs`, `qa/econ.mjs` | push; seeded `SEED=7`, paired runs, rush the clock at t > 3 | **day 5:** unchanged in behaviour because harness matches are goal-free (§3.1); the pair is **re-baselined on the day-5 build anyway** (same seed, same length) and the re-baseline recorded (`GOVERNOR.md:731-733`); econ's end-card DOM read follows the day-6 order |
| `qa/uisystem.mjs`, `qa/smoke.mjs`, `qa/purpose.mjs`, `qa/placement.mjs` | push; the two-click idiom | day 11: the shared helper |
| `qa/solotog.mjs` | `#soloTog` inside the picker (`:36-41`, `:84-85`) | day 10: `#soloTog` on the goal line |
| `qa/bookshot.mjs`, `qa/navfit.mjs`, `qa/tutstrand.mjs`, `qa/hud3.mjs`, `qa/loadpct.mjs`, `qa/hud2.mjs` | `#btnBook` (`bookshot:49`), `.navRow .navCard` (`navfit:19`), `.wCard` | day 10–11: `#btnBook` is the tab; `navfit` measures `.tabs`; the rest via the helper |
| `qa/ladder.mjs` | quality ladder, MENU GATE (`:106-114`), not in the gate | **kept verbatim**; run explicitly after day 9; its MENU GATE reads `.level` only (`:110-113`) and keeps passing because `qLevel` never moves |
| `qa/questable.mjs` | `live` only (`gate.mjs:406`); reads `__questPools().houseLike` (`:41-46`, `:74-77`) | its supply block ported to `__goalPools()` inside `levels.mjs` (e); **retired in the same commit** that deletes the board and registers (e) in push — never a day in which `questable` is dead and (e) has nothing to read (gate skeptic) |
| `qa/menushot.mjs` | screenshot only, prints "ok" with no verdict (`:1-17`) | shoots after 120 cranked frames; stays the lookbook's picture; **never registered `pf`** |
| `qa/endfit2.mjs` | not in the gate; no PASS line, own exit code (`:80`), port 4188 (`:18`) | run at day 6; registered `verdict: exitCode` with the gate's PORT |
| `qa/icons.mjs` (new) | — | renders the sprite sheet under ASSETVIEW; `--check` hashes the factory sources per icon into a sidecar and FAILS when a source moved and the PNG did not; registered static in push |
| `qa/lookbook.mjs` | the studio's evidence pack | day 12: adds the six menu stages at three viewports and the end card |
| the ~110 two-click probes (124 `.wCard[data-world=` hits) | | day 11: `qa/_enter.mjs` `enterWorld(p, world)` (clicks `#btnPlay` when visible, selects the world through `#btnWorlds` when it differs, else relies on `AUTO_START`, then waits on `__matchState`) + `openTab(p, id)`; a static guard `qa/idiomguard.mjs` (worldlists-style) fails if any probe still hard-codes `'#worldRow .wCard[data-world='` outside the helper |

New in the push profile: `menu-static`, `menu-live` (Maple), `levels-static`, `levels-live`
(Maple), `menuframe` (REPORT until bar 2.8.2 is armed), `endfit2`, `icons-check`,
`idiomguard`; `questable` leaves `live` for `levels-live` (all worlds). The gate's step
count goes 35 → 43, each timeout sized from a measured run and printed.

## 6 · Build order — one crew-day per step; what the gate shows green after each

| day | build | gate after |
|---|---|---|
| 1 | **Baseline, honestly read.** `_dbg.__frameTimes()`, `__pinMenuRung`, `autoReset=false` sampling in a new `qa/menuframe.mjs`: menu-idle `dtRaw` / draw calls (both shadow parities) / tris / `moverStats(138)` and `(276)` / heap per world, **one page per rung** pinned by `addInitScript`, at the STAGE frustum (0–360° azimuth series at each candidate stage) **and** today's parked spawn frame, labelled; the 1,241 / 4,694 reference pair re-taken the same way; the boot prefix measured from `performance.timeOrigin` per world (`bootStage` timestamps). Guards: `pickerfit` FAILS on a short picker — zero cards was already guarded at `:285`, the live hole was four-of-six (§9.7); `firstframe` fails on a missing `#menu` selector (`freeze()` unchanged). | push 35/35 green on today's menu; the baseline table in the brief with the two frames side by side |
| 2 | **The ladder's ground.** `qa/pace.mjs` on all six worlds (radius- and score-vs-time; autopilot and SET-style); supply per world with the `'big'` dedupe; CLEAR `devouredPct` at the buzzer, p50/p90 of strong runs → the CLEAR number per world; **the first shadowless FRAME's ms** after the `compileAsync` pre-warm (§2.7). Safe code: `restoreIsland()` split (`:7571-7644`), `life.calm`/`tension` on the menu path, delete the stale gate comment (`:6919-6931`). | push green; §3.4 numbers replaced by measured ones; §8.2/8.3 decided from data |
| 3 | `src/game/levels.ts` (schema with the five states, migrate, `current(world)`, `recordLevelResult`, `__levels`), `level_*` telemetry, `voidPlayGoal`/`?g=`, `playing` set only by PLAY/pip/`voidPlayGoal`. `qa/levels.mjs` (a), (f), (g), (i) written first and failing. | push green; `levels-static` (a)(f)(g) green, (i) green |
| 4 | `LEVEL_SPEC` table beside `WORLD_COPY` (`:1492`) with `landmark` tags set in the factories, goal object in `beginMatch`, goal card per match (the hand held off it, §4.1), `#goal` HUD chip with smallest-first SET order, `questEvent` dedupe, the goal hooks of §3.1, **and the gold-not-red last ten seconds** — moved up from day 5 because it is `levels.mjs` (c)'s own last bar and a probe written but not asserting is worse than one that says it does not cover something. `levels.mjs` (b) and (c). | push green; `levels` (a)(b)(c)(e)(f)(g)(i) |
| 5 | `goalMet()` beside `:9681` with the `outroT <= 0` first-writer guard and the `playing` gate, `endMatch(result)`, `recordLevelResult` at `:5329` (finish → fin, win → done/clear, k+1 opens), `completeWorld` in the solo branch before `:5372`, landmark exclusion, quit path. `levels.mjs` (h) on the virtualised clock; (b)'s "goal already met → no countdown" half, which needs a match that can end on the spot. **Re-baseline `newsfeed`/`faceparity`/`econ` pairs on this build and record it.** | push green; `levels` all but (d)(e); the re-baseline commit |
| 6 | End card: the pip headline, `#endPips`, caption, jewel-as-information vs door, CONTINUE / TRY AGAIN, shop door only when affordable, calendar coins in `#endSub`; **one commit** deletes `#endQuests` (`:5486-5502`) + `QUEST_POOL`/`renderQuests`/`questComplete`/`addEncoreQuest` (`:3811-4004`) + the four `voidQuest*` keys + `__questPools`, adds `__goalPools`, ports `questable`'s block into `levels.mjs` (e), registers (e) in push and retires `questable`. `levels.mjs` (d); `endfit2` registered (exit code, PORT). | push green with `levels-live` and `endfit2` in; `levels` complete |
| 7 | Menu chrome (`index.html`): the four band elements, transparent-centre window, lifted ground, pips from `qa/icons.mjs` sprites (tick/star/padlock as sprites, `--check` sidecar), goal line, PLAY, tabs, world chip with the pennant beside it, `#soloTog`; delete gift/orb/navRow/`::after`; `#book` chapters with `#trophies`/`#topvoids`/the calendar re-parented; the shop shield row. `qa/menu.mjs --static` bars 8–11, 17, 19–21. | push green (the window shows the raw canvas behind — expected); `menu-static` 8–11, 17, 19–21; `icons-check` |
| 8 | `prototype3d.ts`: `menuMode`, `enterMenu`/`leaveMenu` (calm, park, hide family, hard cut behind the end card, DPR/bloom restore in `leaveMenu`), `MENU_STAGE` (a0 from day 1's series), camera branch with its own fog write and `updateMatrixWorld`, `menuDist` plumbing, freeze list incl. the shadow-pass cadence, `MENU_R`, moods and scripted beats (sleepy on a locked tap), tap-chomp + haptics, `__menuState` with the authored pendulum, `menuR`, `fogNear`, `frame`/`rafs`. `menu.mjs --live` bars 1–4, 12, 13, 22, 23. | push green; `menu` 1–4, 8–13, 17, 19–23 |
| 9 | Menu rung (`applyMenuRung`, `applyQuality` tail), composer warm-up under the cover, `compileAsync` pre-warm, fps-window degrade with hysteresis, idle tiers that never skip the rAF, overlay freeze, the discarded resume delta, calm gating. `menu.mjs` 6 (REPORT), 7, 14–16; `menuframe` before/after compare; `qa/ladder.mjs` run explicitly. | push green; `menu` all but 5 and 18; `ladder.mjs` MENU GATE green; the ratio spread and draw-call numbers in the brief; bar 2.8.2 armed or explicitly not |
| 10 | One-tap PLAY (`launchWorld` minus the picker, on `pickedWorld` at `current(world)`, no reload; the calendar off the path), the pip hop, the first reveal; re-point `pickerfit`, `lockedcards`, `opening`, `solotog`, `bookshot`, `navfit`, `firstframe`'s non-splash path. `menu.mjs` 5 (both seeds), 18. | push green with `menu-static`/`menu-live` in; `menu` complete |
| 11 | `qa/_enter.mjs` + `qa/idiomguard.mjs`; sed migration of the ~110 two-click probes; `uisystem`/`smoke`/`purpose`/`placement`/`tutstrand`/`hud3`/`hud2`/`loadpct`. | push 43/43 green; `live` profile run once, red list triaged |
| 12 | Viewports (collapse order, landscape, iPad); `qa/lookbook.mjs` with the six menu stages at three views and the end card; `menushot` after settle. **Fold `qa/_chipfit.mjs` in as a registered bar here**: the HUD's top band has to clear itself at every width, and day 4 shipped a `#goal` chip that overlapped `#timer` by 2px on both tablets because its offset was a number read off a 430px phone (fixed by deriving it from `--timer-bottom`; the diagnostic is written and fails on the old build). Nothing in the push gate measures top-band geometry at more than one width. | push green; `menu` bar 17 at all views; the lookbook exists; the top band clears at 360/430/834/1024 |
| 13 | Chrome-first boot: `#loadScr.boot` becomes the menu with `splash_hero.webp` in the window and PLAY live via `withWorldReady` (`:6455`), cross-fade to the live world on the first rendered frame (`:10931-10935`); cover art = the world's poster on reload (§4.5). Behind a flag. **Bars anchored on `performance.timeOrigin`, not DOMContentLoaded** — the entry is a module with top-level awaits, so DOMContentLoaded fires AFTER `createIsland` and the bar was green by construction (perf skeptic): chrome painted ≤ 300 ms from navigation start; PLAY's pressed state renders within one seam (≤ the longest `bootStage` chunk day 1 printed); the pre-await prefix (renderer + PMREM + `preloadMusic` + font CSS, `:383`, `:657-659`) measured separately. | push green with the flag on and off; §8.7 decides which ships |
| 14 | Studio pass (`studio` skill on the day-12 lookbook): art direction on the window feather, ground lift, tab hues, sprites, the end-card jewel; fixes. Skeptic verdicts on every bar above. | push green; verdicts recorded in the brief |
| 15 | **Device day, two phones.** The owner's reference phone **and a named tier-B phone** (iPhone 11 or SE 2): bar 2.8.4's three numbers per phone, Xcode's memory gauge menu vs match on Game Day, five-minute menu idle with no jetsam, the first chomp audible; the degrade thresholds set from this pair; the child protocol (§8.9): time to first PLAY, mis-taps, "what does the green dot want?", and whether she earns the tick on dot 1. EAT/SET N tuned from days 2 and 15. | push green; the two phones' rows and the child's four numbers in the brief |
| 16 | Buffer and stretch: the Maple lagoon sheet on the `bayWater` pattern (`island.ts:3882-3930`, one draw, `uTime` only, `depthWrite:false`, `renderOrder 1`, y 0.07) if the lookbook says the Maple window feels dead; else nothing. | push green; done |
| 17 | Governor's closing pass: every §9 correction checked against the shipped code by symbol; the brief's numbers replaced by the measured ones; main fast-forwarded only on a full push profile. | push 43/43; main live |

Each step: brief → build → probe fails → fix → probe passes → skeptic verdict → gate →
commit. Corrections are recorded in the brief, never hidden.

---

## 7 · What we do not do

- Render a second scene or a second renderer for the diorama; rebuild the island in
  place to show a non-current world (56 `pickedWorld` sites, 44 `island.*` sites,
  `:1733`); a world change stays a reload.
- Route any menu quality change through `applyQuality()` (`qShadowLatch`, `:1354`), or
  let the adaptive ladder sample on the menu (`:10912`).
- A 360° orbit, a wide/high "whole island" shot (4,694 draw calls, `:10496` — re-taken
  2026-09-10 at 337; the frame that costs 4,694 today is late play at r 12, §2.9.5), or the
  family in the diorama.
- A PLAY breathe, a pip pulse, a countdown, a coin spinner, an ad, an ad-skip currency,
  a "x2" door, lives, hearts, `audio.lose()` on a goal level, a red 3-2-1 with the goal
  unmet, a price on her screen before a grown-up opened the gate, or the creature's
  scared face as UI feedback.
- Gate a dot on a win. Finishing passes it; the goal earns the mark (§3.2, §9.1).
- Reach a bar from `renderer.info` with `autoReset` on, quote a median rAF interval as a
  frame-time bar on a vsynced phone, or pin two rungs on one page.
- Platform emoji anywhere on the menu, the goal card, the HUD chip or the end-card pips.
- Hole.io's hex values, strings, illustration or skins; the five-tab skins store.
- Live water on Lantern (ankle-deep canal, `island.ts:410`), Powder (ice, `:430`),
  Skylark or Game Day (no water, `:434`, `:458`); the key art's falling houses in 3D.
- Derive a per-world CLEAR pip from the global `voidBestPct` (`:5339`); touch
  `voidUnlocked`, `voidBest_<w>`, `voidMatchN` (match 0 is the baseline), `voidSolo`,
  stickers, trophies or seasons.
- Retire the `questable` gate step in any commit other than the one that lands
  `levels.mjs` (e) and `__goalPools` (`GOVERNOR.md:148`); name the level probe
  `qa/ladder.mjs`; skip the rAF re-registration in any idle tier.
- Ship any step without its probe passing at 430×932 @ 2 and the six splash views.

---

## 8 · Open decisions for the owner, with the governor's recommendation

| # | question | governor recommends |
|---|---|---|
| 1 | **The spine: does a dot open the next dot by FINISHING it, or by WINNING it?** | **ANSWERED 2026-09-10 — the owner chose WINNING.** *"They should be hitting the goals to move on. Maple starts easy. As you tick up maple and other levels it gets harder."* The governor recommended finish-advances and the child skeptic's kill was attached to the question; the owner read both and decided the other way for a long-term progression argument. §3.2 is rewritten to it, §9.1 #1 records the overrule, and the cost is paid in §3.4: **every one of the thirty goals is set on day 2 from a measured run** (the owner also chose "measure first, then set every goal from the curve"), and bar 3.5.4 now asserts an average run wins every dot. The world ladder stays finish-gated so a stalled child can always travel on. |
| 2 | **Skylark's landmark.** The whale needs a void of radius 16.2; the growth law tops at 12 without eating four rivals (`:9745`, `island.ts:6196`), and it is tethered. There are two hangars. Level 3 on Skylark: `hangar-1`, or untether the whale for that level? | `hangar-1`, unless day 2's numbers show the whale reachable by a median run. The whale stays the world's ascension beat; the landmark is a named prop tag per world, never "the largest thing" (§3.4). |
| 3 | **What does the star mean?** Hole.io's magenta is a true 100%. Ours is measured in single digits (`:5462-5466`) — a colour she would never see, which the child skeptic calls "a small, permanent not-good-enough" beside a tick she can get. | The star = the world's CLEAR number, set from day 2's p90 of strong runs, reachable by a good run on any dot; dot 5's goal IS that number. A true 100 becomes a hidden sticker. You set the six numbers from the ones we hand you. |
| 4 | **BY MYSELF on the RIVALS level.** | RIVALS always deals the family; the chip greys on dot 4. Solo applies to dots 1, 2, 3, 5 on the 120 s clock (`:6131`). **Re-opened by §8.1's answer:** under the win gate a solo child who never comes first IS stuck on dot 4, so RIVALS' goal must be a rank day 2 shows the rubber band actually allows (`rivals.ts:256` floors the family at 3rd), not `myRank === 1`. |
| 5 | **The SHOP tab is one thumb away and shows prices** (`$4.99–$9.99`, `:8345-8347`, `:8442`; the grown-ups gate is on purchase, `:8160-8172`, i.e. after she has seen and tapped the price). | **Decided, not open** (the child skeptic made it a bar, 4.7.10 / 5.1.21): the coin skins she earned stay open; no price text and no LEGENDARY tier render until a grown-up has opened the gate this session — an "ask a grown-up" row stands there; the end card's OPEN SHOP door appears only when a skin is affordable. Tell us if you want the tier visible and we will say why we still think not. |
| 6 | **Menu sound.** The theme only, plus his chomp on tap — or the world's own ambience (waterfall, bay, crowd) under the window? | Theme + chomp in v1 (no new audio assets); ambience for the first update once day 15 confirms the first chomp is audible on both phones. |
| 7 | **Chrome-first boot** (day 13): show the menu at once with the painted splash in the window and fade to the live island when it is ready — ship it, or hold it for the first update? | Ship it if its bars pass on day 15 measured from navigation start (not DOMContentLoaded — §6 day 13); it is the literal "make our splash image alive" and cuts the wait to under a second. Otherwise hold. |
| 8 | **Ground brightness.** Hole.io's frame is a bright violet slab; ours is a night cosmos. We lift the ground under PLAY and the tabs to a brighter violet and keep the night around the island. | Keep our night around the island so it floats; lift only where PLAY needs it (bar 1.3.3, now a real probe bar). Your two frames side by side on day 14. |
| 9 | **The child's numbers.** A five-minute session with your daughter on day 15: seconds from cover-drop to her first PLAY tap (bar ≤ 10 s), mis-taps in five minutes (≤ 2), whether she can say what the green dot wants without being read to, and whether she earns the tick on dot 1. | This is the only bar that answers "does a six-year-old get it in the first second"; the machine bars cannot. You run it; we write down the four numbers. |
| 10 | **EAT numbers.** 0.6 × par is arithmetic, not a measurement — and the par is a bot's mean (`:551`), not a child's. | Provisional until day 2 (when in a typical run the number is crossed) and day 15 (whether she earns dot 1's tick in one go). Target: the tick on level 1 of every world in one run for the median child. **Under the win gate a wrong number costs her the dot**, which is why §8.1's answer makes day 2's curve load-bearing rather than provisional. |
| 11 | **Water on Maple.** The waterfall is in the window on the Maple stage; the pond and river are painted still. Add a live lagoon sheet (one draw call) or leave it? | Leave it unless the lookbook says the Maple window feels dead; day 16 is reserved for it. |
| 12 | **If the four-year-old iPhone misses 60 fps.** Ship the menu with its own three-step fallback (lower resolution → no shadows → half-rate, still live), or ship a frozen picture? The plan names a tier-B phone now (§2.8.4) because draft 1 only ever measured yours. | Ship live with the fallback; you see the two phones' rows on day 15 — fps, dropped-frame share, p95, resident memory, five-minute idle with no jetsam — and decide. |
| 13 | **The daily calendar moves off the path to PLAY** (§1.2): its coins are claimed silently on the first finish of the day and count up on the end card; the page lives in the scrapbook. | Yes. On her second day the first thing she meets today is a modal with "CLAIM 90✦" in text; no probe ever saw it because 383 files seed the date. PLAY is one tap or the bar fails. |

*Sections 0–8: draft 2, 2026-09-10, corrected from the four-lens skeptic pass recorded
in §9. Every number in §3.4 is derived from code and is replaced by the day-2
measurement before any goal is authored; the menu's cost is unknown until day 1 prints
it, and day 1 now prints it honestly. The skeptic pass runs again on each step's bars
before the next step is briefed.*

---

## 9 · The skeptic pass — four lenses, what each refuted, what changed

Four independent skeptics read draft 1 (sections 0–8 as committed at `7ab632b`) against
the code at its lines, each with one lens and a standing instruction to refute. Their
verbatim verdicts are in `docs/crews/round-8/skeptic-0..3.json`. The governor read every
load-bearing citation himself before applying a correction; the four he checked first
are marked ✔. Severity is the skeptic's own: **blocks** (the plan cannot ship with it),
**must-fix** (a bar or claim that is wrong), **note** (a hazard or a line drift). A
refutation the governor did not accept is marked as such with the reason; there is one.

### 9.1 THE CHILD — a six-year-old who cannot read · verdict: **KILLED**

*"The ladder makes WIN the gate on three of five dots per world … so a small six-year-old
sits nine minutes on 'NOT YET' at each of them while a red countdown she cannot read
counts her down; unlocks.ts:9-16 names this exact design as the one thing the build has
never done to a child. Finish must advance and win must decorate, or the plan cannot
ship."*

| # | sev | draft 1 said | refuted because | changed to |
|---|---|---|---|---|
| 1 | **blocks** | The green dot moves on a WIN; a third miss opens the next dot (§0.6, §3.2, §4.3) | ✔ `unlocks.ts:9-16` rejects a win gate in words; LANDMARK "never fires" for a weaker player (`:1529-1531`, worlds 2–5 in the finale surge only `:1553-1555`); RIVALS needs `myRank === 1` and `rivals.ts:256/:701/:788` floor the family at 3rd, not 1st; CLEAR at 100% lands in single digits (`:5462-5466`); ✔ WORLD_PAR's "verified mean" is the bot child-driver's (`:551`) | **OVERRULED BY THE OWNER, 2026-09-10 (§3.2, §8.1) — and the kill still stands as a description of the risk.** He chose a win gate for a long-term progression argument ("more challenging like Angry Birds"), having read this verdict. What changed is WHERE the difficulty lives: under his decision the gate stays and **the three unwinnable goals this skeptic identified must be re-specified from day 2's measured curve** — that is now bar 3.5.4 (an AVERAGE run wins every one of the thirty dots, and a dot it cannot win is re-specified or does not gate). The five pip states survive; `'fin'` becomes "attempted, still the current dot" rather than "finished, move on". The world ladder is deliberately left finish-gated so a stalled child can still travel on, which is the release valve this verdict's worst case needs. If day 2 cannot make a goal winnable, the governor says so then rather than shipping the wall |
| 2 | must-fix | The 35 s red timer, `⏰ EAT FASTER!!` and the hot 3-2-1 stay (§4.2) | ✔ `:9650-9679` + `index.html:364-370` is a party bell for a match where finishing IS progress; under a ladder it is a countdown to losing, and the emoji bar did not cover `#banner` | The last ten seconds key on goal state (§4.2): gold numerals, flat tick, no banner with the goal unmet; the hot countdown only for RIVALS at #1. `levels.mjs` (c); bar 1.3.7 covers `#banner`, `#count` |
| 3 | must-fix | Taps to play = 1 (bar 4.7.1) | ✔ `#daily` rises at module init when `voidDailyLast !== today` (`:7966-7967`, `:8083`) with a text CLAIM button (`:8049`); 383 probe files seed today so no probe ever met it | The calendar moves off the path: coins claimed silently on the first finish, counted on the end card, page in the scrapbook (§1.2, §8.13). Bar 4.7.1 / 5.1.5 runs with today **and** yesterday |
| 4 | must-fix | SHOP tab one thumb from PLAY; the cash tier left open in §8.5 | Prices are painted on every cash card (`:8345-8347`) under a LEGENDARY header (`:8396`); the gate fires only at purchase (`:8160-8172`); the end card's OPEN SHOP door is the default next thing | Decided, and a bar: no price text, no LEGENDARY tier until the gate is passed this session; the shop door only when a skin is affordable (§1.1 F, §4.4.5, §4.7.10, §5.1.21, §8.5) |
| 5 | must-fix | Locked tap → the void does a `'scared'` blink (§3.3) | The rig's scared face is the match's hurt/threat face (`void3d.ts:1348-1408`); a child reads "I hurt him" | `'sleepy'` — a yawn, "later". Bar 5.1.19: `faceState()` never scared/hurt for 2 s |
| 6 | must-fix | `#endHd` leads with the word ("LEVEL 3 ✓", "NOT YET"); the pip flips within 400 ms after | The first thing on the one screen that tells her how she did is a word; on a miss, a word with no picture | The pip IS the headline, 96 px, the word under it at 12 px (§4.4.1). Bar 4.7.5: the pip element visible before any headline text node |
| 7 | must-fix | "The skipped pip stays green-and-open" (§3.2) vs "exactly one current" (§3.5.1) | Two big green dots after a fail-forward; big green means "mine" and there can only be one | Dissolved by #1: the finished-not-earned pip is `fin` (grey, green outline) and there is at most one `open` per world (§3.1, §3.3) |
| 8 | note | The first-ever session is level maple/1 with "EAT 48,000" over the hand tutorial (§4.6) | A five-digit target from a bot mean over the tutorial hand (`:10336`); her first result could be a miss | Goal card suppressed while the hand is up; under #1 dot 1 is passed by finishing (§4.1, §4.6); "does she earn dot 1's tick" is a day-15 number (§8.9) |
| 9 | note | EAT chip with a 4 px fill; SET "40 SNACKS · 8 CARS · 5 HOUSES" | A 4 px fill under a thumb is invisible; 40 snacks is a long time before the first tick | The pip sprite itself fills; SET ordered smallest count first (§3.4, §4.1, §4.2) |
| 10 | note | Magenta reserved for a true 100% | A reward measured in single digits is a colour she never sees — "a permanent not-good-enough" beside a tick | The star = the world's CLEAR number (p90 of strong runs, day 2); a true 100 is a hidden sticker (§3.3, §8.3) |
| 11 | note | The season pennant hangs inside the window (§1.1 C) | Its tap reloads into another world (`:6791-6795`); a picture in the chomp window that navigates | Moved to band B beside the world chip; nothing in the window may navigate (§1.1 B/C, §1.2, bar 5.1.23) |
| 12 | note | BY MYSELF greys on dot 4 (§8.4) | Acceptable only under finish-advances | **Re-opened by §8.1's answer** (win gate): a solo child who never comes first is stuck on dot 4, so RIVALS' goal has to be a rank the rubber band allows, set on day 2. §8.4 |

### 9.2 PERFORMANCE — a four-year-old iPhone (tier B) · verdict: **SOUND WITH CORRECTIONS**

*"The diorama is a horizon-level frustum … rendered at 60 fps with the shadow pass on,
on a device class the plan never names, and the only frame-time bar it would face is a
median of vsync-quantised rAF intervals that passes with 49% of frames dropped."*

| # | sev | draft 1 said | refuted because | changed to |
|---|---|---|---|---|
| 1 | must-fix | "Nothing new is rendered; a hole is cut in the curtain" — the diorama costs nothing (§0.1, §2) | What renders behind today's menu is the spawn frame: `PLAY_DIST` 29 (`:750`) along `camOffset` (0.62,0.92,0.62) (`:686`), 46° down, frustum ending ~36 units ahead; the stage's top edge is ~3° below the horizon with `camera.far` 1000 (`:663`) — the frame class the intro measured at 4,694 calls | "Costs nothing" struck; §0.1 and §2 say the cost is unknown; day 1 prints the stage frustum and today's spawn frame side by side (§2.8.1, §6 day 1) |
| 2 | **blocks** | Device bar: menu frame ≤ 16.7 ms median on the owner's phone (§2.8.4) | WKWebView is vsynced at 60 Hz (`STUDIO-ROUND-3.md:1888`): a median passes with up to 49% of frames dropped; the tier-B phone (`AAA-BRIEF.md:897-899`) appears nowhere | `fps = N/ΣdtRaw ≥ 57` AND frames > 20 ms ≤ 3% AND p95 ≤ 17.5 ms, over 600 rendered frames, on a named tier-B phone **and** the owner's; both rows recorded (§2.8.4, §6 day 15, §8.12) |
| 3 | must-fix | Degrade when median `dtRaw` over 120 frames > 17 ms (§2.7) | Same quantisation: engages at ≈40 fps and below; a menu dropping every third frame never degrades; the shipped adapter demotes on a mean of 46 (`:10911-10914`) | `fps < 55` over a 2 s window of rendered frames, resume frame excluded; climb back on > 58 after 10 s; thresholds provisional until day 15 (§2.7, §2.8.10) |
| 4 | must-fix | Frame ratio menu/match ≤ 1.15, same page, same rung (§2.8.2) | The menu rung renders at DPR 1.5 vs the match's 2.0 (`:142-143`, `:1265`) — 56% of the pixels; fill-bound under swiftshader, so the bar is flattered by the setting it validates | Pixel ratio pinned equal both sides; JS ms, draw calls, triangles printed per side; 1.15 on JS ms and draw calls separately — and a REPORT until the noise floor is known (with 9.4 #4) |
| 5 | must-fix | `bloomOn=false` before the first `animate()`; DPR/bloom restored at `introT <= 0` (§2.2.6, §2.7) | `ensureComposer` builds lazily (`:159-162`); the composer would then be built — bright target, 5 mip pairs, ~12 compiles, `setSize` — on the controls-live frame `opening.mjs` A4 samples | `ensureComposer()` + one warm render under the boot cover before the rung; DPR and bloom restored in `leaveMenu` (with 9.3 #2) (§2.2.7, §2.7) |
| 6 | must-fix | A 900 ms camera ease from the whistle camera into the parked orbit on HOME/quit (§2.2.4) | camDist up to 340 (`:10495`), 46° down, every prop just restored, shadows on — the most expensive 54 frames of the session on the dense worlds by design | Hard cut behind the end card (82% ground + 8 px blur hides it); the ease is gone from the plan and from bars 2.8.3 / 5.1.7 (§2.2.5) |
| 7 | note | The shadows-off step uses "the intro's toggle, which the game already pays every match" | three 0.185 recompiles ~45 programs ONCE per session on the first toggle (`three.module.js:18386`, `:7732`); `renderer.compile()` with shadows on does not pre-warm them | `compileAsync` pre-warm under the cover with shadows flipped off; day 2 measures the first shadowless FRAME (§2.7, §6 day 2) |
| 8 | must-fix | Baseline per world at rung 0 and rung 3 via `__pinQuality` on one page (§2.8.1) | `__pinQuality(3)` latches `qShadowLatch` (`:1354`); every later sample is shadowless and straddles a 1,677 ms rebuild — the failure `:2250-2254` already records | One page per rung, pinned by `addInitScript`, first 120 frames discarded, rung read back and printed (§2.8.1) |
| 9 | must-fix | Freeze list complete (§2.7) | The 2048² shadow map re-renders every other frame (`:10946`) though nothing on the stage moves but the crowd; every overlay blurs a live canvas every frame (`index.html:1589`, `:1552`, `:1137`, `:1512`) and `body.ovl` freezes nothing | Shadow pass every 4th frame on the menu; render stops while `body.ovl`; bar 5.1.14 (§2.7) |
| 10 | note | Idle tiers at 20 s / 3 min (§2.7) | Skipping the render halves only the render half; the sim over ~966 walkers still runs; the pendulum is invisible at 30 fps anyway | Sim advances at the same cadence with doubled dt; rung ≥ 2 renders every second rAF from entry (§2.7) |
| 11 | note | `document.hidden` → stop the rAF | Mostly already true on WKWebView; the hazard is the resume frame's multi-second `getDelta` (`:9476-9478`) | `clock.getDelta()` called once and discarded on resume; excluded from the degrade window (§2.7) |
| 12 | must-fix | Chrome-first boot bar: chrome visible ≤ 300 ms after DOMContentLoaded (§6 day 13) | The entry is a module with top-level awaits (`index.html:2276`, `:1729`); DOMContentLoaded fires AFTER `createIsland` — green by construction | Anchored on `performance.timeOrigin`; PLAY's pressed state within one seam; the pre-await prefix measured separately (§6 day 13, §8.7) |
| 13 | note | `restoreIsland()` from `enterMenu` | Correct, but a 6,537-prop single-frame walk on the same frame as the cut and the theme; unmeasured on tier B | Runs the frame after `#btnHome` behind the still-shown end card; `menuframe` prints its ms (§2.2.1) |
| 14 | must-fix | Heap ≤ in-match + 10% on the device through `__menuState` (§2.8.4) | `performance.memory` does not exist in WKWebView (`STUDIO-ROUND-3.md:4069`); typed-array stores sit outside any heap figure; tier B's ceiling is 450 MB with Game Day at ~446 | Xcode's memory gauge menu vs match on Game Day; no jetsam in a 5-minute idle; the Chromium heap delta stays as the sandbox row (§2.8.4, §8.12) |
| 15 | note | Draw calls at every 10° (§5.1.7) | `info.render.calls` alternates by shadow-pass parity (`:10946`) | Two consecutive frames per azimuth, max of the pair vs max of the in-match pair, both parities printed (§2.8.3, §5.1.7) |
| 16 | note | `crowdGate` 138 units, "leaving is free" | Arithmetic holds; leaving is free only for the camera | `moverStats(138)` and `(276)` printed per world on day 1; DPR/bloom on leave handled in §2.2.7 |

### 9.3 THE CODE — every citation read at its line at `7ab632b` · verdict: **SOUND WITH CORRECTIONS**

*"The plan's cost story assumes the diorama frame is 'the frame we already pay for', but
the parked camera is a new frustum … Until qa/menuframe.mjs prints those per-azimuth
numbers, every downstream day is authored against an unmeasured budget."*

| # | sev | draft 1 said | refuted because | changed to |
|---|---|---|---|---|
| 1 | must-fix | Global `cur` = the lowest non-done goal of the lowest world with an open goal; fail-forward opens k+1 (§3.1) | After three misses on k, `cur` stays on k forever (the wall); "current" had no state to read; `cur` is global while pips are per built world (`pickedWorld` is a boot const `:355-358`) | No global `cur`; `current(world)` is a pure function of the row with at most one `open`; "N OF 30" is the ordinal (§3.1, §3.5.1). The fail-forward case is dissolved by 9.1 #1 |
| 2 | must-fix | DPR and bloom restored at `introT <= 0` "not on the tap" (§2.2.6) | `introT` becomes > 0 only in `startMatch()` at the first touch (`:6333`); `beginMatch` (`:6081-6190`) never writes it — the whole armed idle would render at menu DPR with no bloom | Restored in `leaveMenu()` under the menu hide (§2.2.7); bar 4.7.9 / 2.8.12 |
| 3 | must-fix | Menu bars measured under `__pinQuality(0)`; "ladder's MENU GATE passes because `__quality()` never moves" (§2.7, §5.1) | `__pinQuality` → `applyQuality` writes DPR 2.0 and `bloomOn = true` (`:1315-1316`), overwriting the menu rung; the probe would measure a rung-0 menu with the composer | `applyQuality()` ends with `if (menuMode) applyMenuRung()`; `__pinMenuRung`; `menuRung`/`pinnedMenuRung` in `__menuState`; the sentence reworded to "`qLevel` never moves" (§2.7) |
| 4 | must-fix | `enterMenu()` at module init when `voidPlayed` is set and no `voidAutoPlay` (§2.1) | The first-launch branch is `!DEBUG_HARNESS && … && !voidPlayed` (`:6559`); a fresh profile under any debug param shows the menu without `voidPlayed`, so `menuMode` would be false on a displayed menu with attract mode driving the void (`:9849`) | Keyed on `getComputedStyle(menuEl).display !== 'none'` after both blocks, the signal `#daily` already uses; bar 5.1.22 (§2.1) |
| 5 | must-fix | `#endQuests` deleted with its render block `:5461-5476` (§4.4.6) | Those lines are the `#endStats` tiles point 4 calls unchanged; the quest block is `:5486-5502` (`el('endQuests')` `:5488`) | Corrected; "re-verify by symbol at build time" written into the step (§4.4.6, §6 day 6) |
| 6 | must-fix | `goalMet()` sets `outroT = 2.0` "exactly as the buzzer does" (§4.3) | Without the buzzer's `outroT <= 0` guard (`:9681`) the check fires during the TIME outro (eat loop and score keep running at `dtw = dt·0.3`, `:9480`, `:10367`) and overwrites the result | The same guard, result first-writer-wins; probe: a counter driven across the threshold 1 s into a TIME outro reads NOT YET (§4.3, §4.7.4) |
| 7 | must-fix | The crowd "kept alive" on the menu (§2.2, §2.7) | `beginMatch` sets `life.calm(introLen + 1.2)` (`:6120`); only `endMatch` restores infinity (`:5327`); the quit path (`:7765-7778`) never does — the parked void sits in the fear radius and the crowd screams | `enterMenu()` calls `life.calm(Infinity); life.tension(0)`; bar 2.8.7 / 5.1.13 panic count 0 (§2.2.2) |
| 8 | must-fix | Skylark LANDMARK = "the hangar (r 5.5)" using `heroProp` (§3.4, §4.2) | `heroProp` is the largest edible (`:6115-6116`) — on Skylark the tethered whale (`:6196-6197`); the cue would print the whale line (`:1665`) over a hangar level; there are two hangars (`:6484-6499`) | `LEVEL_SPEC[world].landmark` names a prop tag; the poll reads it; cue/gone strings in `LEVEL_SPEC`; `heroCue` stays the finale beat; `'hangar-1'` (§3.4, §4.2, §8.2) |
| 9 | must-fix | Game Day car 6, Powder house 5 under "6N ≤ supply always" (§3.4) | 36 > 28 and 30 > 26 by the table's own numbers | Car 4, house 4, provisional; day 2's count replaces them (§3.4, §4.1) |
| 10 | must-fix | Maple stage at the waterfall with "no rim sky shows in the window" (§2.3) | The sheet is centred at y −8.5 spanning −21.5..+4.5 and the spray at y −22 (`island.ts:3825-3838`) — past the rim; the stage and the bar cannot both hold | Rim and cosmos may show below/behind the sheet; the void stands on standable ground with no ground gap (§2.3) |
| 11 | must-fix | `menuDist` passed to fog from a sibling `else if (menuMode)` branch (§2.4) | The fog write (`:10648`) and `updateMatrixWorld()` (`:10643`) are inside the match `else`; a sibling branch never reaches them | The menu branch writes fog and updates the matrix itself; bar 2.8.11 (§2.4) |
| 12 | note | `celebrateEnd` at `:5364` solo / `:5439` rivals; the solo return at `:5364` | Line drift: `:5358` / `:5442`; `:5364` is the `.show` add; the solo `return` is `:5372`. The ordering claim holds | Every `:5364` reference corrected (header, §3, §3.2, §4, §4.3, §4.4.2) |
| 13 | note | `rivals.setVisible` "finds the mesh handle in `rivals.list`" (§2.2.3) | `rivals.list` is the public `Rival[]` with no mesh; groups/halos are closure-internal; rivals are already invisible until they join (`:595`) | Added inside `rivals.ts` beside `reset()`, on the interface (`:35`) (§2.2.4) |
| 14 | note | `firstframe`'s `freeze()` keeps the canvas (§5.3) | Every measured selector is on opaque ground; keeping the canvas reintroduces the A/B nondeterminism `:76-79` documents | `freeze()` unchanged; only a missing selector FAILS; the pennant gets bar 5.1.23 (§5.3, §6 day 1) |
| 15 | note | `first: 'YYYY-MM-DD' (toDateString convention)` (§3.1) | `toDateString()` yields "Wed Sep 10 2026" | `toDateString()`, the label dropped (§3.1) |
| 16 | note | The NEW WORLD card with TAKE ME THERE beside TRY AGAIN on a miss (§4.4.5) | A world opens on ANY finish (`unlocks.ts:86-97`), so a failed first match shows two doors, one of which abandons the ladder | Before goal 5 the jewel is information without a door; the door after goal 5; travel is the world chip's job (§4.4.5, §5.2 d) |
| 17 | note | RIVALS forced by `myRank` at the buzzer under `?len=8` (§5.2 b) | Rows filter `r.joined`; under a short clock nobody has joined and `myRank === 1` trivially | `__setRivalScores` with ≥ 2 forced joins; both a win and a loss asserted (§3.1, §5.2 b) |
| 18 | note | Idle tiers "render every second frame" (§2.7) | `ladder.mjs` captures the rAF each frame and fails on a broken chain (`:65-90`) | Skip the render call, never the rAF (§2.7; with 9.4 #11) |
| 19 | note | HUD presence at 5 / 88 / 163 s (§4.7.3) | Solo levels run 120 s (`:6131`) and never reach 163 | 5 / `matchLen·0.49` / `matchLen·0.9` (§4.7.3, §5.2 c) |
| 20 | note | Pips ΔE ≥ 10 (§3.5.3) | The polish plan's C bar 2 was ≥ 3:1 luminance; ΔE 10 between mid-value hues can sit under 3:1 | Both: ΔE ≥ 10 AND ≥ 3:1 pairwise (§3.5.3, §5.1.9) |
| 21 | confirmed | The "ours today" claims of §2 and §3 (unconditional render `:10948-10957`, `body.menu` sites, `#daily :7966`, `startMatch` from `pointerdown :3380-3397`, buzzer `:9681-9686`, `endMatch() :5324`, `unlocks.ts:44-97`, `matchdeck.ts:25-44`, `applyQuality :1313-1360`, intro toggle `:10510-10513`, lerp `:10629`, `camDist = DESCENT_START :6152`) | — | Recorded as verified |
| 22 | confirmed | §3.2's reconciliation with the owner's decisions of 2026-09-06 | Five goals in order, win on the spot, board retired, clock on first touch, live menu — all honoured; "never a wall" preserved by deriving from `isUnlocked()` and only raising | Recorded; the spine change of 9.1 #1 keeps every one of those |

### 9.4 THE GATE AND THE PROBES — can each bar fail, and can it run here · verdict: **SOUND WITH CORRECTIONS**

*"qa/levels.mjs as contracted runs ten goal-runs to 90–150 match-seconds on a harness
whose match clock is ~14× slower than the wall, inside a gate that SIGKILLs at
step.timeout — so either the ladder ships with its probe never in push, or the push gate
stops being runnable; and on day 5 every existing match probe silently becomes a level-1
run that can end on the spot."*

| # | sev | draft 1 said | refuted because | changed to |
|---|---|---|---|---|
| 1 | **blocks** | `levels.mjs` (b)/(c) force goals "by the game's own path" and sample HUD at 163 s, registered in push (§5.2) | The match clock is ~14× slow here (`GOVERNOR.md:54-56`, `:2303-2309`); ten runs = 4–6 wall-hours; the gate SIGKILLs at `step.timeout` (`gate.mjs:31`); RIVALS by autopilot is nondeterministic and no score hook exists | (b)/(c) on the virtualised clock with the render stubbed (9,000 cranks = 150 match-s); explicit hooks `__setScore`, `__eatKind`, `__eatLandmark`, `__setRivalScores`, `__devourAll`; timeout from a measured run, wall time in the PASS line (§3.1, §5.2) |
| 2 | **blocks** | Draw calls from `renderer.info` under `__pinQuality(0)` ≤ 1.3× in-match (§2.8.3, §5.1.7) | `info.autoReset` is true (three `:4528`) and `reset()` runs at every `renderer.render`; on rung 0 the composer's quad passes each call it (`Pass.js:168`), so the field holds the LAST post pass; `_refute_perframe`/`_gpuframe` never set it off, so the 1,241 / 4,694 pair is suspect | `autoReset = false` around one cranked frame; bloom off both sides; bloom/shadows/DPR printed per line; the reference pair re-taken on day 1 before use (§2, §2.8.1, §2.8.3, §5.1.7, §7) |
| 3 | must-fix | Baseline from `perfFrame` (`:411`) (§2.8.1) | `perfFrame` is a no-op without `?perf` (`:404`, `:412`); `perfDts` is never exposed; `?perf` mounts an overlay that changes the frame | `_dbg.__frameTimes()` — an always-on ring buffer, no overlay (§2.8.1, §3.1) |
| 4 | must-fix | Frame ratio ≤ 1.15 "sandbox, not device" (§2.8.2, §5.1.6) | Under swiftshader every frame is 100–1000 ms, so the menu degrades to rung 3 at once and the ratio passes because the menu was degraded; no noise floor measured (`GOVERNOR.md:643-645`) | `__pinMenuRung(0)`; run twice, print the spread; `menuframe` a REPORT until the spread says what 1.15 means; draw calls and triangles the hard bars (§2.8.2, §5.1.6, §5.3) |
| 5 | must-fix | Pendulum: sine fit over 120 frames; "on the wall clock" (§2.4, §5.1.3) | 120 cranks = 2 s of a 16 s period — an eighth of a cycle cannot separate amplitude from period; a `Date.now` pendulum reads as a constant under the crank (`ladder.mjs:70-71`) | 1,000 cranks against the exposed `{a0, amp, period}`; phase on `tClock`/`performance.now`, never `Date.now` (§2.4, §5.1.3) |
| 6 | must-fix | Hero share = bbox of changed pixels; camera motion = centroid drift of the mask (§5.1.1, §5.1.3) | The mask is the crowd, the water and the blink, not the window or the camera (`GOVERNOR.md:35-39`) | Window share from `#menuWindow`'s box + a canvas-hidden/shown pixel test; camera motion = a fixed world point projected through `__cam` per frame (§1.3.1, §5.1.1, §5.1.3) |
| 7 | must-fix | Day 5 lands `goalMet()` "with push green and no probe changes until day 10" (§6) | `?len`/`?r`/`?at`/`?fast` put the harness in `DEBUG_HARNESS` (`:3619`) with attract mode eating everything in reach (`:9849-9860`) and `AUTO_START` (`:3631`); a run that crosses EAT N ends on the spot, un-pairing `newsfeed` (`:55`), `faceparity` (`:168`), `econ` (`:88`, `:112`) | The goal check runs only when `playing` is set by PLAY/pip/`voidPlayGoal`; harness matches are goal-free (§3.1, §4.3, §5.2 i); the three pairs re-baselined on the day-5 build (§5.3, §6 day 5) |
| 8 | must-fix | Hero exclusion (h): after 60 s of autopilot the hero is uneaten unless `byPlayer` (§5.2 h) | Cannot fail before the fix: non-hunter rivals are capped at `softCap` (`GOVERNOR.md:172-178`) and never reach r 6.5 in 60 s | A hook warps an oversized rival onto the landmark; refused on goal 3, taken on goal 1; the failing run committed (§5.2 h) |
| 9 | must-fix | Ground colour "value/chroma at the four corners … measured by `qa/menushot.mjs`'s frame" (§1.3.3) | `menushot` prints "ok" with no verdict (`:16`); the §5.1 table had no ground bar; the colour model was unnamed | Bar 5.1.20: HSV value/chroma as `chroma.py`, four 8×8 boxes on a cranked frame; `menushot` never `pf` (§1.3.3, §5.1.20, §5.3) |
| 10 | must-fix | `firstframe` `freeze()` keeps the canvas (§5.3, §6 day 1) | Same as 9.3 #14 — the exact nondeterminism the probe's header retired (`:76-83`) | Same correction |
| 11 | must-fix | Idle tiers skip frames; "`ladder.mjs` scenario 1 still passes" (§2.7, §2.8.10) | `ladder.mjs` captures the rAF into `__pend` and fails "rAF chain broke" the moment a frame does not re-request (`:70-71`, `:83-86`); scenario 1 is exactly 20 virtual seconds — the idle threshold | `animate()` always requests exactly one rAF; tiers skip the render and sim, never the rAF; bar 5.1.14 asserts the render counter, not the rAF count (§2.7, §2.8.8) |
| 12 | must-fix | Each bar prints `PASS —`/`FAIL —`, exit 1 on any fail (§5.1 header) | `gate.mjs` judges `pf` as `pass && !fail` over the whole stdout and ignores the exit code (`:583-587`): six PASS lines then a throw on bar 7 reads as PASS; `endfit2` prints no PASS line and defaults to port 4188 | Per-bar `ok`/`BAD` tokens, one final verdict line, `uncaughtException`/`unhandledRejection` → `FAIL — <bar> threw`; `endfit2` registered `exitCode` with PORT (§5.1, §5.3) |
| 13 | must-fix | Day 6 deletes the quest pools; `questable` retired only after (e) is in push on day 10 (§5.3, §6) | (e) reads `__questPools().houseLike` (`questable.mjs:41-46`, `:74-77`) published beside the pools day 6 deletes (`:3924-3925`); four days in which `questable` is dead and (e) has nothing to read | `__goalPools()` replaces `__questPools` in the same commit that deletes the board; (e) registered and `questable` retired in that commit (§3.1, §5.2 e, §5.3, §6 day 6, §7) |
| 14 | must-fix | One tap on `#btnPlay` → `launchWorld()`; `cur` is the cross-world frontier (§1.2, §3.1) | `pickedWorld` is a boot const (`:355-358`) and ~110 probes load `?w=<world>` expecting THAT world; PLAY resolving to `cur.world` reloads a `?w=pirate` page into Maple — the wrong-world-tested-as-right failure `GOVERNOR.md:529-535` records | PLAY launches the built world at `current(pickedWorld)`, never a reload; `__menuState().world === pickedWorld`; bar 5.1.5 asserts no navigation with `window.__marker` (§1.2, §3.1, §4.7.1) |
| 15 | note | "MENU GATE passes because `__quality()` never moves" (§2.7) | `.level` never moves, but `__quality()` reads `shadowMap.enabled` and `getPixelRatio()` live (`:2259-2260`), which DO move under menu steps 1–2 | Reworded to `qLevel`; `menuRung`/`pinnedMenuRung` in `__menuState` (§2.7) |
| 16 | note | Pip/tab sprites rendered once and committed (§1.4) | A committed render of a live prop is a snapshot kept in the repo (`GOVERNOR.md:41-52`); a later art pass leaves a stale icon and nothing fails | `qa/icons.mjs --check` with a source-hash sidecar, static in push (§1.4, §5.3) |
| 17 | note | Emoji regex `\p{Extended_Pictographic}` over six containers (§1.3.7) | Misses ✓ and ★ (U+2713, U+2605), which are the plan's own glyphs and render from Noto/Apple; `#endHd` not in the list | Regex extended to U+2600–27BF; `#endHd`, `#btnWorlds`, `#banner`, `#count` added; the marks are sprites (§1.3.7, §5.1.11) |
| 18 | note | End-card order by DOM timestamps ≤ 400 ms (§4.7.5) | The class is set synchronously before `.show` (`:5570`) so the delta is ≤ 0 by construction; the count-up's first write is a rAF race under swiftshader (`GOVERNOR.md:672-675`) | From computed style: pip `animationDelay + animationDuration ≤ 0.4 s`; `.endCnt` `t0` ≥ the pip's delay; element absent → FAIL (§4.7.5) |
| 19 | note | `voidRadius === MENU_R` in the probe (§5.1.13) | A typed 1.2 is a transcribed constant (rule 4) that drifts the day the lookbook retunes it; `voidPx` is the game grading itself | `__menuState().menuR` compared; `voidPx` cross-checked by projection once (§2.8.5, §2.8.7, §5.1.2, §5.1.13) |
| 20 | note | Five new push steps, 35 → 40 (§5.3) | Unsized: each new probe loads six worlds at minutes each; the gate SIGKILLs and `:216-222` records timeouts going red on a world-count change | Static/DOM halves in push for all worlds, browser halves on Maple in push and all worlds in `live`; timeouts from a measured run; 35 → 43 (§5.1, §5.3) |
| 21 | note | Degrade at median > 17 ms (§2.7) | A healthy 60 Hz median is 16.67; the bar sits 0.33 ms above it with no jitter floor | Folded into 9.2 #3; bar 2.8.10 tests hysteresis, thresholds from day 15 |
| 22 | confirmed | Day-1 guards; bars 2.8.7, 5.1.16, 5.1.19; §3.5 bars 1–4 | Numbers a probe can fail without a GPU; each fails on the pre-fix build by absence of the element/hook | Kept; "missing hook → throw" in every new bar |

### 9.5 What the governor did not accept, and why

- The child skeptic's alternative for #1 — "if the owner insists on win-gated dots, dots
  3/4/5 must be optional marks beside the row" — is recorded as §3.2 alternative (c) and
  §8.1's fallback, not adopted: it keeps a win gate on dots 1–2, and EAT N is a number
  derived from a bot's mean that a small child may also not reach. Finish-advances covers
  every dot with one rule.

Everything else above is applied. Where a correction changed a bar's number or method,
the old one stands in these tables so the change is auditable.

### 9.6 What this pass did not do

It did not run anything. Every refutation is a static read of the code at its line; the
day-1 and day-2 measurements are still the first numbers, and the four skeptics said so
in four different ways. It did not re-verify the ~110 two-click probe count, the 383
`voidDailyLast` seeds or the 124 `.wCard` hits beyond the skeptics' own greps. And it did
not read the code that does not exist yet: `levels.ts`, `enterMenu`, the menu branch —
the skeptic pass of §6 day 14 does that against the shipped diff.

### 9.7 What the BUILD then corrected in this brief — day 1, 2026-09-10

The four skeptics read the code; they did not run it. Building day 1 found three things
the reading had wrong. They are here rather than quietly patched, because the wrong
version of a claim is always the persuasive one (`GOVERNOR.md` rules 3, 3b).

| # | what §5.3 / §2 / §6 said | what is actually true | where it is fixed |
|---|---|---|---|
| 1 | `qa/pickerfit.mjs` "PASS on zero cards (`:245-260`)", and day 1 should "throw if zero cards" | It has FAILED on zero cards since `d952532` (2026-09-08), **two days before this brief**, at `:285` — and `:245-260` is the contrast measurement loop, not a verdict. The reading was of a file that had already been fixed. The hole that IS live is a picker with SOME of its cards: every bar iterates `cards`, so five of six is measured on five and prints "all 5 world cards". Demonstrated: the pre-day-1 probe run against a build with Skylark's card deleted prints exactly that, green | §5.3 row corrected; §6 day 1 corrected; `pickerfit` now FAILS when `cards.length !== ALL_WORLDS.length` and names the missing worlds |
| 2 | §2.8.1's day-1 sampling: "one cranked frame", and `info.render.frame` as the frame counter | `renderer.info.render.frame` counts `renderer.render()` CALLS, and on any rung carrying bloom the composer makes **fifteen of them per animation frame** (measured, all six worlds). A "120-frame" window on that counter is eight animation frames at a frame rate fifteen times too high. The first version of `menuframe` did exactly this and its numbers looked entirely reasonable | `_dbg.__frameInfo().animFrames` is `animate()`'s own count and is what every window in `menuframe` waits on; the per-frame `passes` column prints the render-call count rather than assuming it |
| 3 | §2, §7 and `prototype3d.ts:10613`: the opening is the 4,694-call / 1.40M-triangle frame | Re-taken on Game Day at rung 0 with `autoReset` off: the opening is **337 calls / 221k triangles**, because the shadows-off line directly beneath that comment is the fix the comment describes. The frame that costs ~4,694 today is **late play at r 12** (Game Day 4,978, Lantern 6,436) | §2.9.5; §0.1 and §7 annotated; the re-take written into `prototype3d.ts` beside the number it corrects |

A fourth item is not a correction of the reading but a decision that landed on top of it:
**the owner overruled §3.2's spine on 2026-09-10 and chose a win gate** (§8.1, §3.2,
§9.1 #1). The brief above is rewritten to it. The governor's recommendation and the child
skeptic's kill are kept in place rather than deleted, because the risk they describe is
real and is now managed by a different mechanism — winnable goals set from a measured
curve (bar 3.5.4) plus a world ladder that stays finish-gated so a stalled child can
travel on. **The owner also raised advertising** ("we want to focus on retention and ad
revenue") and, asked whether that changes the standing directive, answered *"Could we skip
this one until we're ready. It's food for thought."* — so `HANDOFF.md` §2's "no ads, no
ad-skip currency, 4+ stays 4+" **stands unchanged and nothing about ads is approved**. It
is recorded here so a later session does not read the phrase as a decision.

**Correction 5, day 2: "CLEAR at 100% is measured in single digits (`:5462-5466`)" is
wrong, and it is load-bearing in six places** (§3.3, §3.4, §8.1, §8.3, §9.1 #1 and #10,
where it argues the magenta star is "a colour she would never see"). The cited lines are
the end-of-match stats block — `stats.matches++`, `stats.best`, the trophy payout — and
say nothing about `devouredPct` at all. Measured across thirty matches (§3.4a): a
competent run devours 49–84% of the world, of which 32–63% is the player's own. The star
is not unreachable; 100% was simply the wrong number to ask for. Every use of the claim
is annotated in place.

**Correction 6, day 2: the autopilot cannot set a SET goal, and for one commit this brief
had the reason backwards.** The nearest-edible driver ate 484 snacks and zero houses by
70% of the clock on Maple, and the first reading of that was "Powder's house supply is
zero, so its SET triple is unwinnable". That was wrong: Powder carries 25 house-like
props, and the zero came from `goalcurve`'s own report printing only the kinds a run had
EATEN rather than the full supply. Every triple §3.4 proposed has the supply it needs.
The real finding is the driver: `DRIVE_KIND` hunts a named kind, and on the same world
with the same seed it eats 40 houses where the autopilot ate 2 (§3.4a, dot 2).

**Correction 8, day 4: the goal card and the ghost hand were already sharing the screen,
and this brief asked for the fix on the wrong side.** §4.1 said "the goal card is
suppressed while the hand tutorial is up". Measured (`levels.mjs` (b), shipped build,
virtualised clock): on the one frame the card unrolled the hand was already up, 1 of 1
sampled states — so the clash is real. But `teachDrag` is true for **every child on every
Maple match** (`:6786`), and Maple is where all thirty dots begin, so suppressing the card
under the hand would mean no Maple player ever sees the card that names her goal. The
cause is on the hand's side: `beginMatch` turns the controls live at arm and never sets
`handHold`, which is only set at `:11134` beyond the descent — a line the armed idle never
reaches. Fixed there; §4.1 rewritten.

**Correction 9, day 4: the goal card never fires on an AUTO_START match, and it is not a
bug.** The card block is inside `if (armed && !started …)` and `AUTO_START` calls
`startMatch()` from a microtask the moment the world arms — so under Playwright (where
`navigator.webdriver` turns AUTO_START on for every probe) `goalCardT` never advances and
the card never appears. It is right for the game: the card belongs to the armed idle a
human sits in. It is a fact any probe of the card has to know, and `levels.mjs` (b) uses
`?manual=1` and the `voidAutoPlay` reload path for exactly this reason. The line in §4.2
that reads "a player who taps at 100 ms sees it unroll over their descent" (a code comment
at `:10095`) is **wrong on the same evidence** — after the tap `started` is true and the
block is skipped.

**Correction 10, day 4: probing a cranked match with the renderer live is not affordable.**
The first run of `levels.mjs` (c) was still cranking a FIFTEEN-SECOND match after nine
minutes of wall clock and was killed there — upwards of 25 s of wall per cranked
match-second under swiftshader, against six matches in the part. With `renderer.render`
and the bloom composer stubbed for the duration of the crank (a harness-side stub; nothing
in (c) reads a pixel) the same match cranks in **34 s**. Recorded because §5.2 mandates
the virtualised clock for the level probe without saying what it costs, and the next probe
to use it will hit the same wall.

**Correction 11, day 5: (h)'s own trap caught the build that fixed it.** §5.2 (h)
already records why draft 1's landmark bar could not fail — non-hunter rivals never reach
the radius a landmark needs — and prescribes the replacement: plant a capable rival and
watch the rule refuse it. The first build of that replacement passed on dot 3 and was
STILL wrong, for the same reason one layer down: `softCap` (`rivals.ts:990`) runs every
frame before the swallow loop, so the hook's `rv.r = 5.63` was clawed back to **1.30**
and the barn survived because nothing capable was ever standing on it. The bar now prints
the rival's real radius and fails when it is under the line; the runs use `?r=8`, which
lifts the cap through the game's own law (`pr * 0.80`) instead of exempting anyone from
it — and that is the real scenario anyway, since a player at r 8 is exactly when the
family can reach a 5.0 barn. Deleting the exclusion and rebuilding: the family ate it in
20.1 s. A bar that cannot be shown failing is not a bar, and "it passed" was true twice
here for two different wrong reasons.

**Correction 12, day 10: §5.1 bar 4 was unsatisfiable, and the code it would have failed
had already shipped.** Bar 4 asks for "0 changed pixels inside `#btnPlay`, `.pips`, `.tabs`,
`#coins`, `.logo`" on a settled menu. Day 7 shipped the menu's "you are here" ring with
`animation: pipHere 2.2s ease-in-out infinite`, on the argument that a ring pointing at a
button should keep asking — which no value of bar 4 can ever accept. The bar went unwritten
for three days while the thing it existed to catch sat in the build. MEASURED
(`qa/reveal.mjs` bar 2, the same method on both builds; logs in
`docs/crews/round-8/reveal-before.log` and `reveal-after.log`): four shots of the ladder
150 ms apart, 3.5 s after the menu came up, with the canvas `display:none` so only CSS could
move — **865 of 18,480 pixels (4.7%) on `a200af9`, 0 after**, and the probe's animation
census names the offender outright: `pipHere@pip s-open here::after`. It changed every
150 ms for as long as the menu was up. The same class of motion had already cost a gate step
once:
the end card's copy of this ring kept Playwright from finding two stable frames to click
PLAY AGAIN on (`econ`, 30 s timeout, "element is not stable"), which is why day 7 scoped it
to the menu. Scoping moved it; it did not fix it. §3.3's own text asked for the right thing
all along — "the current pip's ring pulses three times **on this reveal only**" — and the
infinite version was the build's, not the brief's. It is now three pulses on the reveal,
three more on a hop, and stillness in between.

**And bar 4 itself needs a qualifier it did not have.** It was written on day 1, when the
menu was a still splash. From day 8 the menu is a live 3D world and `#menuLadder`'s panel is
`rgba(18,9,38,0.72)` with a 9 px backdrop blur, so 28% of every pixel in that box is a
blurred photograph of a drifting camera. Measured the same way with the canvas VISIBLE, the
settled ladder changes **18.9%, 26.4%, 35.5% and 51.2% of its pixels every 150 ms across
four runs of the same build** — the spread IS the finding: that number is a reading of the
town, not of the ladder, and no fix to any animation will ever bring it to zero. Day 10's
first attempt at this bar measured exactly that, reported 78.9%, and would have read as a
pass for the fix at any value below it. Bar 4 is a bar on **CSS motion**, and it is only
measurable with the canvas taken out of the picture.

**Two method corrections inside that, both mine, both of which produced a confident wrong
number first.** (1) The clip was the row's own bounding box, and the ring is an `::after` at
`inset: -16%` — 6.4 px outside its dot at 40 px — so the box cropped the top and bottom of
the one element the bar exists to catch. Padded by 12 px. (2) The freeze used
`visibility: hidden`, copied from `firstframe.mjs`, which needs the layout it is measuring
to stay put. `#menuLadder` carries `backdrop-filter: blur(9px)`, and a visibility-hidden
canvas is still in the backdrop root: with the 3D scene at 0.4–2.9 fps here, four shots
150 ms apart sometimes all land inside one slow frame and sometimes straddle two, so **the
same build measured 0 of 18,480 px on one run and 3,107 (16.8%) on the next**. It is
`display: none` now, which takes the canvas out of the layer tree. The first "before" figure
this section carried — 308 of 10,752 px, 2.9% — was taken through the cropped box and the
leaky freeze and is superseded by the 865/18,480 above; both were measuring the right
defect, and only the second was measuring it soundly.

**Correction 13, day 10: §1.2 said the calendar was a UI problem. It was a
BOOKKEEPING problem wearing a modal.** §1.2 describes `#daily` as a card that
"rises full-screen at module init" and prescribes moving it to the end card. Both
true, and both incomplete. MEASURED (`qa/taps.mjs`, log in
`docs/crews/round-8/taps-before.log`): with `voidDailyLast` one day stale, **PLAY
could not be clicked at all** — `page.click` timed out after sixty seconds — and,
the part no reading of the brief would have predicted, **after a FULL FINISHED
MATCH on that same profile `voidDailyLast` was still yesterday's date.** The day
does not roll unless the button is pressed. Moving the card to the end card while
leaving the claim on the button would have left a child permanently owed a day
she cannot collect, and the brief's own bar (§4.7.1, `#daily` never gains
`.show`) would have gone green over it. The claim is now a function
(`claimDaily()`) called on the first finish of the day; the button is a door.

**And §4.7 bar 1's two seeds were the right instinct for the wrong reason.** The
brief asks for the bar to run with `voidDailyLast` seeded to today *and* to
yesterday because "383 probe files seed today, so no probe ever met the
calendar". Correct — and the reason it matters is not that the bar would be
incomplete, it is that **the whole calendar was untested code shipping to
children**, including the fact that its own state machine never advanced without
a tap. One seed tests the game; the other tests the day after, and nothing in
this repo had ever run the second.

A seventh item is a gap this brief did not know it had: **Maple has no stage to measure.** `WORLD_COPY.maple.hero` is null, so there is nothing for a hero-framed
sweep to stand off, and §2.3's Maple stage (the waterfall lip) is a module-local const in
`island.ts` that no probe may transcribe. Day 2 exposes it and re-runs Maple (§2.9.7).
