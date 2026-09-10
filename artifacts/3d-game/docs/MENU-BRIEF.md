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
pass** (performance on an old iPhone / the six-year-old / the code / the gate) **is
recorded in §9**; where it corrected a bar, the bar below is already corrected and §9
says what changed. Until §9 exists in this file, treat every number here as one
measurement plus its author's second method, not an adversarial verdict.

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
3. **"Strictly sequential" means the five dots inside a world.** Worlds still open the
   way `src/game/unlocks.ts` says — finish any match on the one before, never a wall —
   and a third miss on a dot opens the next dot. §3.2 states the alternative (thirty in one
   line, world 2 waits for a 100% clear of Maple) and why it would lock 25 of 30 levels
   behind luck for a six-year-old. §8.1 puts it to the owner.

**One real bug found on the way, fixed in this stream (day 5):** the solo branch of
`endMatch()` returns at `prototype3d.ts:5364` before `completeWorld()` at `:5509`, so a
child who only ever plays BY MYSELF never unlocks world 2. Shipped today.

**Sources.** `docs/crews/round-8/` (this round's verbatim record); `holeio.recon.md` (the
owner's own frames of Hole.io, measured); `holeio.polish-plan.md` §4 (the owner's
decisions of 2026-09-06, binding); `src/prototype3d.ts`, `src/proto3d/island.ts`,
`src/proto3d/void3d.ts`, `src/proto3d/life.ts`, `src/proto3d/audio3d.ts`,
`src/game/unlocks.ts`, `index.html`, `qa/` at branch head `17246d8`. Where a number of
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
   already drawn behind the menu on every launch (we have been paying for the picture
   and hiding it). Nothing new is rendered; a hole is cut in the curtain.
2. The child sees her void, at her size, on her island, breathing and blinking; the
   waterfall pours, the bay swells, the crowd walks. Tap him and he chomps.
3. Under the window: five dots, one per goal on this world — pictures of the goal, not
   numbers. Grey done, magenta for a 100% clear, green and bigger for the one she is on,
   blue with a padlock for later.
4. One fat green PLAY. One tap and she is in the level. No picker in the way.
5. Three tabs at the bottom, each its own colour, each a picture: SHOP, HOME, SCRAPBOOK
   (stickers, trophies and top voids live inside the scrapbook).
6. Thirty levels: five per world in the owner's order — EAT, SET, LANDMARK, RIVALS,
   CLEAR. A goal met inside the clock wins on the spot. The clock running out is "NOT
   YET", never a punishment: coins are kept, and the third miss opens the next dot too.
7. A world never walls the next one: finishing any match on a world still opens the next
   world, as today. That is a decision (§3, §8.1); the alternative is named.
8. The end card lights the dot first, then counts the coins, then shows the next island
   as a locked jewel. CONTINUE goes straight into the next level.
9. Our paint, not Hole.io's: our violet cosmos and star dots, our tab colours, our
   painted islands, no platform emoji. Hole.io's proportions (49% world, 45% ground, five
   dots, one tap, three tabs) are kept because the owner measured them and they work.
10. Numbers before pixels: the first two days measure what the hidden picture costs
    today, on every world, and what a six-year-old can actually reach on each level.
    Nothing is authored before those numbers exist. ~16 crew-days (§6).

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
| B · identity | 56–140 | 9.0% | `#menuTop` | GROUND | `.logo` three-layer type, 40 px cap height, one line, selectors `#menu .logo` and `#menu .logo i` kept for the splash step (`qa/firstframe.mjs:215-218`); beneath it the **world chip** `#btnWorlds` 44 px tall: poster thumb 32×32 (`paintWorldCard`, `prototype3d.ts:6689`) + world name in 14 px caps + `▸`. Its text node is the existing `.tag` element re-purposed, so `#menu .tag` still resolves |
| C · window | 140–597 | **49.0%** | `#menuWindow` | `background: radial-gradient(ellipse 100% 100% at 50% 44%, transparent 0 56%, #1c0f3d 74%)` — transparent centre, 48 px feather, opaque cosmos in the corners; `pointer-events:auto` (the tap-chomp surface, §2.6) | the live world; the season pennant `#eventRibbon` hung from the window's top-right corner, 44 px tall (poster thumb + a date, never a countdown), shown only when `liveEvents().find(isUnlocked)` (`prototype3d.ts:6784`), same tap handler (`:6791-6795`). Nothing else may sit inside the window |
| D · ladder | 597–669 | 7.7% | `#menuGround` | GROUND, lifted violet (bar 1.3) | `.pips` — five pips centred: 4 × 44 px + 1 × 57 px + 4 × 14 px gaps = 289 px; under them `.goalLine` 16 px cream, 32 px tall (the same string the goal card shows, §4.1) with `#soloTog` "BY MYSELF" as a 44 px chip at its right end (id kept for `qa/solotog.mjs`; hidden on goal 4) |
| E · PLAY | 681–769 | 9.4% | `#menuGround` | GROUND | `#btnPlay` 398×88, 16 px gutters, our PLAY green with a 3 px cream rim (the measured 17.9:1 rim trick, recon `:238`), label "PLAY" 34 px, no pulse, no breathe |
| F · tabs | 785–881 | 10.3% | `#menuGround` | each tab its own hue | three tabs 132 px wide × 96 px: SHOP (`#btnShop` kept, `index.html:1977`), HOME (active, default), SCRAPBOOK (`#btnBook` kept, `:1976`); each a 28 px **rendered sprite** (§1.4) over an 11 px label; the active tab lifts 6 px with a 3 px white underline |
| G · safe | 881–932 | 5.5% | `#menuGround` | GROUND continues under the home indicator | — |

Ground total A+B+D+E+F+G = 475 px = **51.0%**; window 457 px = **49.0%**.

### 1.2 Homes for every existing surface

| today | home | notes |
|---|---|---|
| `#btnPlay` | band E | id kept: 82 probes click it (`qa/smoke.mjs:80` et al.). One tap → `launchWorld()` minus the picker (§4) |
| `#worlds` / `#worldRow` / `.wCard[data-world]` / `#soloTog` | untouched, opened by `#btnWorlds` | `data-world` stays on all six cards (`qa/worldreg.mjs:195-197` is a push step); each card gains five mini-pips beside `.wBest` (`prototype3d.ts:6717-6737`); world switch stays a reload (`:6766-6770`) |
| `.navRow` SCRAPBOOK / SHOP / TROPHIES / TOP VOIDS | deleted (`index.html:1975-1980`, `:1454`) | SHOP and SCRAPBOOK become tabs; TROPHIES and TOP VOIDS become chapter chips inside `#book` (`:1986`), ids `#btnTrophies` / `#btnTop` kept on those chips (read by `bookshot.mjs:49`, `econ`, `funnel`, `journey`, `shopdoors`, `uisystem`); `#trophies` (`:2157`) and `#topvoids` (`:2169`) are re-parented as the book's pages 2 and 3, ids kept |
| `#btnSettings` / `#settings` | band A | kept (`prototype3d.ts:8114`, z46 `index.html:1511`) |
| `#gift` | **cut** | dead already (`index.html:1501`, `prototype3d.ts:7925-7944`); markup, CSS and the `if (false)` block deleted |
| `#menuOrb` | **cut** | `index.html:1951-1970` |
| `.tag` "STARRING THE VOIDLINGS" | re-purposed | the element survives as the world chip's text (`firstframe.mjs` selector) |
| `#menu::after` key art | **cut from the menu** | `/assets/splash_hero.webp` stays for the boot cover (§6 day 13) and the store |
| `#eventRibbon` | the pennant in band C | `prototype3d.ts:6778-6796` unchanged |
| `#daily` (z45) | stays | its raise condition (`:7967`, keys on `menuEl.style.display`) is rewritten to key on `menuMode` (§2.1) — otherwise the calendar can rise over a running match once the menu no longer means `display:none` |
| `#quests` HUD, `#endQuests`, `QUEST_POOL`, `voidQuest*` keys | **cut** | owner's decision; §7 |
| `#tapGate` reload path | unchanged | `:6840-6931`; the stale comment at `:6919-6931` is deleted so a builder stops designing for a tap that does not exist |

### 1.3 Bars

1. Band shares at 430×932: window 45–53% of viewport height (target 49); ground
   ≥ 45%; the window's bounding box does not intersect `#btnPlay`, `.pips`, `.tabs`.
2. Every interactive element inside `#menu` is ≥ 44×44 CSS px: gear, world chip, pennant,
   pips (44; current 57), `#soloTog`, PLAY (≥ 72 tall at any viewport), tabs (≥ 72 tall).
   Judges: today's 26–28 px chips are below a six-year-old's finger.
3. Ground: bands D–G are a lifted violet in our hue family — value 0.45–0.65, chroma
   0.35–0.55 at the four corners of the PLAY band (the polish plan's B0 bar, met where
   PLAY needs it); bands A–B stay the cosmos (`#0d0821 → #1c0f3d`) so the island floats
   against night. Measured by `qa/menushot.mjs`'s frame.
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
7. No platform emoji: zero code points in `\p{Extended_Pictographic}` inside `.pips`,
   `.tabs`, `.goalLine`, `#goal`, `#titlecard`, `#endPips`. `index.html:994` already
   records "system emoji standing in for the art" as a shipped mistake; Chromium draws
   Noto, the phone draws Apple, and neither is this game.
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
(96×96) and committed. Tab sprites: a hat (SHOP), the void's own face (HOME), the
scrapbook cover (SCRAPBOOK). The probe for bar 1.3.7 fails on any emoji.

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
draw calls / 1.40 M tris against 1,241 / 355 k in settled play (`:10496-10500`);
`camera.far` is 1000, raised to 1400 (`:663`, `:10492`) — nothing on the island is ever
far-culled, so **direction, not distance, is the draw-call variable**.

### 2.1 Modes and entry points

- `menuMode: boolean` (new, module scope) with **one** entry `enterMenu()` and **one**
  exit `leaveMenu()`. Entry points: module init when the menu will show (`voidPlayed`
  set and no `voidAutoPlay`, the complement of `:6559-6562` / `:6840-6841`), `#btnHome`
  (`:7696-7702`), pause-quit (`:7776`), the end-shop door (`:5553`). Exits: `beginMatch`
  (`:6185`) and the reload gate (`:6870`). `body.menu` is set/removed exactly where it
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
   *match* (news, banners, bubbles, arc, `rivals.reset`).
2. **Park the void** at the world's `MENU_STAGE` (§2.3) by the `__warpVoid` pattern
   (`:2262-2270`: `voidState.x/z`, `camFollow.copy`), then `voidling.setRadius(MENU_R)`
   (rig API, `void3d.ts:24`, `:1704`; read the gate note at `:611` first) in mood
   `'cruise'` via `voidling.setMood` (`void3d.ts:54`) — never the `_dbg` hooks.
3. **Hide the family**: `rivals.setVisible(false)` (new, beside `rivals.reset` in
   `rivals.ts`; the crew finds the mesh handle in `rivals.list`). Judges 1 and 2: a
   frozen walker locked mid-stride inside a scene where the crowd keeps working reads as
   a bug; the family belongs in the match. RIVALS' picture on the menu is its pip.
4. **Apply the menu rung** (§2.7) and, from HOME/quit only, start the 900 ms camera ease
   from wherever the match camera is into the parked orbit (single lerp on
   `camera.position`/look-at, never `camFollow`); at boot the camera starts parked.
5. Run `fadeOccluders` **once** (`:1184`) against the parked line, then every 60th frame
   (it walks all edibles; the camera is static enough for that).
6. `leaveMenu()` reverses 2–3 (`setRadius(START_R)`, warp to the world's spawn const,
   `rivals.setVisible(true)`) and restores the renderer's shadow boolean to
   `QUALITY[qLevel].shadows && !qShadowLatch` **before** `beginMatch`'s intro captures it
   (`introShadow = renderer.shadowMap.enabled`, `:10505`); DPR and bloom are restored
   where the intro restores shadows (`introT <= 0`, `:10509`), not on the tap — judge 2:
   restoring on the tap double-flips shadows and reallocates the bloom mip chain
   (`c.setPixelRatio/setSize` every frame, `:10948-10950`) on the one frame that matters.

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
frame. Maple's waterfall sits at the plateau rim (`island.ts:278`); the day-12 lookbook
confirms the stage is standable ground and no rim sky shows in the window.

### 2.4 Camera

A fourth branch beside ASSETVIEW/TOPDOWN (`:10488-10494`): `else if (menuMode)` writes
`camera.position` and `lookAt` directly and never touches `camOffset`, `camDist`,
`camFollow`, `targetDist`. `menuDist = 22` (units from the void), height 9, look-at
2 units above ground at the point one third of the way from the void toward the hero.
`menuDist` is passed in place of `camDist` to `updateLodBias`/`fitShadow`
(`:10894-10895`, `:1113`), `crowdGate` (`:10277` → 22·2.2+90 = 138 units; pirate ×2)
and fog (`:10647`). Leaving is free: `beginMatch` snaps `camDist = DESCENT_START`
(`:6151`) and the follow spring takes the authored position at lerp 1 while armed
(`:10629`).

**Pendulum, not orbit** (judges 1 and 3 against the 360° turn): azimuth = a0 +
6°·sin(2πt/16 s) on the wall clock — peak 2.36°/s = 0.039°/frame at 60 fps — so the far
plateau never enters the frustum. Under `body.calm` / `reduceMotion()` (`fx.ts:48-65`,
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
`:1340`). On `enterMenu`: `bloomOn = false` (module `let`, `:1303`, read at `:10948`),
composer targets released (`ensureComposer` rebuilds lazily when bloom returns at the
intro's end); `renderer.setPixelRatio(Math.min(devicePixelRatio, qLevel <= 1 ? 1.5 :
1.3))` (`:1315` pattern, `PR_TOP` `:142`); shadows stay whatever the renderer already
has. Applied at module top level **before** the first `animate()` (`:10974`) so the
frame that drops the boot cover (`:10931-10935`) is the cheap one. `qa/ladder.mjs`'s
MENU GATE (rung 0 after 500 virtual frames, `qa/ladder.mjs:106-114`) keeps passing
because `__quality()` never moves.

**Menu-only degrade** (`menuRung` in `__menuState`, never written to `qLevel`): if the
in-page median `dtRaw` over the last 120 frames exceeds **17 ms** → step 1 DPR 1.0 →
still over → step 2 shadows off via the intro's toggle (`renderer.shadowMap.enabled =
false; sun.castShadow = false`, `:10505-10509`) → still over → step 3 pendulum frozen
and render every second rAF (dt into `island.update` doubled so the water keeps its
speed). Day 2 measures whether the first shadows-off toggle recompiles programs
(`docs/AUDIT-2026-08-23.md:316`); if it does, `renderer.compile()` is pre-warmed under
the boot cover, conditional on that measurement.

**Idle and hidden** (there is no gate on the rAF today, `:10957`): 20 s without input on
the menu → render every second frame; 3 min → every fourth, pendulum frozen;
`document.hidden` → no render. One visibility handler: hidden **and** `menuMode` →
stop the rAF; hidden in a match → the existing pause (`:7751`, unchanged); visible →
resume. The joystick's own handler (`:3449`) is untouched.

**Frozen while `menuMode`:** attract mode (`:9849`), `rivals.update` (`:10290`),
`bubbles.update` (`:10364`), `fadeOccluders` per frame (`:10896`; once per 60 frames
instead), `refreshHud` (`:10810`), the eat loop (already, `:10367`). **Kept:**
`island.update(dt, tClock, camera)` (`:9486` — it re-centres the star field and sky on
the camera, `island.ts:4014-4017`), `voidling.update` (`:10246`), `life.update`
(`:10281`), curios (`:9487`).

### 2.8 Bars

1. Baseline first: menu-idle median and p95 `dtRaw` (`perfFrame`, `:411`),
   `renderer.info` draw calls and triangles, `life.moverStats(gate)` (`life.ts:6906`)
   and JS heap, per world, rung 0 and rung 3 (`__pinQuality`, `:2255`), **today, before
   any change** — printed with the words "sandbox, not device". No baseline, no cut.
2. Frame ratio: menu median / in-match (r = 12, same page, same rung) median ≤ 1.15.
3. Draw calls at **every sampled azimuth of the pendulum and along the 900 ms ease
   path** ≤ 1.3× that world's in-match r = 12 count, and ≤ 2,000 absolute; Lantern and
   Game Day (6,537 edibles, `island.ts:7379`) are named.
4. Device: menu frame ≤ 16.7 ms median and heap ≤ in-match heap + 10% on the owner's
   reference phone, read from `__menuState` through the Capacitor shell (polish plan
   `:120`); the owner is handed the menu/match pair.
5. Void on screen: projected diameter 28–42% of the window height; centre inside the
   window's lower 60%; hit circle ≥ 60 px radius.
6. Clearance: a ray from the camera to the void's centre at each stage hits nothing but
   the void (`__menuState().occluders === 0`).
7. After a match and HOME: `__menuState().eaten === 0`, `voidRadius === MENU_R`,
   `rivalsVisible === false`.
8. Hidden: `__menuState().frame` does not advance for 60 wall-frames while
   `document.hidden`; idle: frame rate halves after 20 s with no input.
9. Calm: with `voidMotion='0'` seeded, azimuth variance 0 and
   `document.getAnimations()` inside `#menu` empty.
10. `menuRung` steps 0→1→2→3 in order on an injected 25 ms clock and never writes
    `__quality().level`; `qa/ladder.mjs` scenario 1 still passes.

**Probe.** `qa/menuframe.mjs` (bars 1–3, day 1, before anything), `qa/menu.mjs` bars
2, 3, 6, 12–16 (§5.1), the device day (bar 4).

---

## 3 · The ladder

**Mechanism.** Level = (world, goal). Five goals per world in the owner's order — EAT,
SET, LANDMARK, RIVALS, CLEAR — 30 levels at launch; a goal level wins on the spot when
met, the clock running out fails it; RIVALS is decided at the buzzer (polish plan §4,
decision 1). Five pips under the diorama: done grey, 100%-clear magenta, current green
and 29% wider, locked blue with a padlock (recon `:29-30`, `:249-252`, `:311-312`).

**Ours today.** Worlds unlock in `WORLD_ORDER` by **finishing** any match on the
previous one (`src/game/unlocks.ts:5-26`, `completeWorld` `:89-97`); `migrate()`
grandfathers from `voidBest_<w>` and `voidWorld` on every read (`:61-74`); "NOBODY IS
EVER RE-LOCKED" is an invariant asserted by `qa/unlocks.mjs` D. `voidMatchN` is a JSON
object (`matchdeck.ts:25`, match 0 = the shipped baseline); `voidSaveVer` is the only
versioned save (`prototype3d.ts:8213-8230`); `voidStats` backfills fields with `??=`
(`:7805`). `voidBest_<w>` and `completeWorld` are written **only in the rivals branch**
of `endMatch` (`:5449-5452`, `:5503`); the solo branch returns at `:5364` — a solo-only
child never opens world 2 today. `voidBestPct` is one global key (`:5339`), not
per-world. ~40 probes seed `voidUnlocked='maple,pirate,gameday,lantern,powder,skylark'`
(`qa/unlocks.mjs:53` et al.).

### 3.1 State: `voidLevels`

New file `src/game/levels.ts` (~130 lines beside `unlocks.ts`). One key, JSON object
(the `matchdeck`/`voidStats` convention, not `unlocks`' CSV):

```
{ v: 1,
  cur: { world: WorldId, goal: 1|2|3|4|5 },            // the frontier, not the last played
  w: { [world]: { [goal]: {
        st: 'locked'|'open'|'done'|'clear',              // clear = that run devoured 100%
        best: number,   // EAT score | SET seconds | LANDMARK seconds | RIVALS rank | CLEAR pct
        pct: number,    // best devouredPct on that pip
        first: 'YYYY-MM-DD',                             // toDateString convention, :5395
        n: number } } } }                                // attempts incl. misses and quits
```

Rules: a missing entry reads `'locked'`, except `maple/1` which is always at least
`'open'` (the "read() adds maple" invariant, `unlocks.ts:50`). Every read/write in
try/catch (`unlocks.ts:48`, `:54`). Unknown fields kept, never dropped
(`stickers.ts:449`). Version gate `if ((d.v ?? 0) < LEVELS_VER) migrateLevels();
track('save_migrated', { key: 'voidLevels', from })` (`:8216-8229` pattern). States only
ever rise. `cur` = the lowest non-done goal of the lowest world with an open goal,
recomputed only in `recordLevelResult`. A replay sets a transient `playing = {world,
goal}` in `beginMatch` (`:6081`, beside `bumpMatch` `:6139`; `voidMatchN` untouched) and
never moves `cur`; a replay that devours 100% raises `'done'` → `'clear'`.

**Migration** (runs on every read like `unlocks.migrate()`; only raises): for each `w`
in `WORLD_ORDER`: `isUnlocked(w)` → `w/1 ≥ 'open'`; `voidBest_<w> > 0` (`:5449`) →
`w/1 'done'` with `best = voidBest_w` and `w/2 'open'` (no-regression reading, regardless
of N); the global `voidBestPct` is **never** turned into a per-world `'clear'`. Because it
derives from `isUnlocked()`, the ~40 QA seeds read as "goal 1 open in every listed
world" and the push gate stays green without touching a seed.

**Cross-reload:** the goal to play travels as `voidPlayGoal` beside
`voidWorld`/`voidAutoPlay` (written at `:6769`, `:5519`; consumed at `:6840-6841` the
same way); `?g=` mirrors `?w=` (`:355`) for probes.

**Telemetry** (judge 2: "the owner reads numbers and nobody gives him the funnel"):
`track('level_start'|'level_win'|'level_fail'|'level_quit', { world, goal, kind, secs,
attempt, score, pct, rank })` (`telemetry.ts:34`) beside the existing `match_quit`
(`:7769`). Without it the polish plan's bar 5 ("median tester clears level 1 in one
run") cannot be measured after launch.

**Hooks** beside `__matchState` (`:2289`): `_dbg.__levels()` → the 30 rows `{world, n,
kind, st, best, pct, attempts}` from the same read path the pips use; `_dbg.__menuState()`
→ `{menuMode, world, goal, azimuth, menuDist, voidPx, voidRadius, frame, menuRung,
drawCalls, occluders, rivalsVisible, eaten, idleTier}`.

### 3.2 Unlock reconciliation — a DECISION

**Decided (governor, for the owner to confirm in §8.1):** within a world, goals are
sequential — goal k+1 opens when goal k is `'done'`/`'clear'` **or** when goal k has
`n ≥ 3` (fail-forward; the skipped pip stays green-and-open and can still be earned).
Between worlds, `unlocks.ts` stays the authority unchanged: world W+1 goal 1 is `'open'`
whenever `isUnlocked(W+1)`, i.e. when any match on W has **finished** (`completeWorld`,
`:5503`, now also called from the solo branch before its return at `:5364`). "Strictly
sequential" in the polish plan (C bar 1, `:155-166`) is read as the pip row.

**The alternative, named:** thirty levels in one strict sequence — world W+1 opens only
after W's goal 5 (100% devoured). Cost, from the code: `devouredPct` counts everyone's
meals against the plateau (`:4886`), real matches land in single digits on Maple
(`:5462-5466`), so 25 of 30 levels and 5 of 6 worlds would be a wall for a six-year-old
who cannot clear Maple — the exact case `unlocks.ts:8-16` forbids and `qa/unlocks.mjs` D
asserts against. Rejected unless the owner overrules.

### 3.3 Pips

| state | look | size |
|---|---|---|
| locked | blue `#98affd` at 55% alpha, sprite dimmed, 16 px padlock | 44 |
| current | green gradient (our PLAY green → deeper), 3 px white ring, sprite 28 px | 57 (1.29×) |
| done | slate `#5d6a92`, sprite, small white tick | 44 |
| clear | magenta `#b23bc9`, sprite, white star | 44 |

Taps: current = PLAY; done/clear = replay that level (transient `playing`); locked =
200 ms wiggle + padlock jiggle + one low pop + `buzz(12)`, **no text**, and the void
does a `'scared'` blink (rig API). No "LEVEL n OF 30" on the menu — the global count
lives on the end card, as in Hole.io (recon `:230-232`). **Pip hop on re-entry** (from
HOME after a win): the finished pip flips grey/magenta in 180 ms, then the green ring
hops one to the right in 220 ms with `audio.ready()` and `buzz(18)`; under `body.calm`
the flip is a hard cut. World done (pip 5 done, or the next world already open): the
world chip flashes the next island's poster with its `.locked` filter lifting
(`index.html:1416`); travel is the existing TAKE ME THERE reload (`:5518-5520`).

### 3.4 Per-world goals — derived from code, provisional until day 2 measures

| world | EAT N (0.6 × `WORLD_PAR` `:550-611`) | SET triple (N each; supply, static/measured) | LANDMARK (hero, eat r, R needed at `EAT_RATIO` 1.11 `:3673`) | RIVALS | CLEAR |
|---|---|---|---|---|---|
| Maple | 48,000 (par 80,000) | snack 40 (2,605 of 5,790, `AAA-BRIEF.md:1057`), car 8 (67, `:3841`), house 5 (70) | Town Hall r 6.5 → R ≥ 5.86; crosses at ~132 s of 180 on an optimal run (`:1517-1520`) — the only measured crossing | `myRank === 1` at the buzzer (`:5374-5378`) | 100% `devouredPct` (`:4886`); reachability unmeasured |
| Pirate | 63,000 (105,000) | snack 40, cabana 5 (22 requested, `island.ts:7679`; the 2.6–3.4 band `:5828` is honest here only), gold 4 (`GILD_PER_MATCH` 20, `questable.mjs:57`) | Royal Mariner r 10 → R ≥ 9.01 (finale surge only, `:1553-1555`) | same | same |
| Game Day | 105,000 (175,000) | snack 40, car 6 (28 food trucks requested, `:7189/:7215/:7276`), house 8 (24 frat + 52 rv house-like, `:7253`, `:7240`) | Stadium r 11 → R ≥ 9.91 | same | same |
| Lantern | 90,000 (150,000) | snack 40, house 10 (276 requested, `:6831-6976`), gold 4 — never car (0, `:3855`) | Bathhouse r 11 → R ≥ 9.91 | same | same |
| Powder | 27,000 (45,000) | snack 40, house 5 (26 house-like via `HOUSE_LIKE` `:3919`), gold 4 — never big (1, `:3864-3866`) | Lodge r 10.5 → R ≥ 9.46 | same | same |
| Skylark | 21,000 (35,000) | snack 40 (3,716 measured, `world6.verdict.md:99`), car 8 (72), gold 4 — never house (2) | hangar r 5.5 (`:6499`) → R ≥ 4.95; the whale r 18 needs R ≥ 16.22 > `LAW_TOP` 12 (`:9745`) — §8.2 | same | same |

Growth is clock-bound (`lawCap`, `:9746-9748`; the clock alone buys r 6.06 at 180 s,
`:9693`) and pace-coupled to score (`pace = playerScore / par`, `:9725`), so the SET
table and LANDMARK reachability are **one measurement**: day 2 runs `qa/pace.mjs` on all
six worlds for radius-vs-time and score-vs-time, once under the autopilot's eating and
once under a SET-style pattern (hunting eight cars scores low and grows slow). Supply
comes from `qa/questable.mjs:74-90`'s block per world with `'big'` de-duplicated per
bite (`:5826` and `:5829` double-fire on tagged-big props ≥ r 6). 3N ≤ supply always;
6N ≤ supply for cars and houses (the family eats 40–50% of the board, `:523-525`).

### 3.5 Bars

1. `__levels()` and the DOM pips agree exactly for every one of the 30 (world, goal)
   seeds; exactly one `'current'`; a missing `__levels` throws.
2. Migration is monotone: for the three seeds (fresh; `voidUnlocked='maple,pirate'` +
   `voidBest_pirate=8420`; the all-worlds CSV) no state is lower after migration than
   before, and `maple/1 ≥ open` always (mirror `qa/unlocks.mjs` D).
3. Pip geometry: 44/57 px, width ratio 1.25–1.35; adjacent-pip ΔE ≥ 10 and each pip vs
   ground ≥ 10 (`lockedcards.mjs:41-49`); padlock p10 ≥ 3:1.
4. Fail-forward: three recorded misses on goal k → goal k+1 `'open'`, goal k still
   `'open'`; a quit (`:7774`) counts as an attempt and never as a win.
5. Every SET triple has supply ≥ 3N per kind on a live count; `'big'` counts once per
   bite.
6. Difficulty (measured, not asserted — polish plan bar 5): the median tester clears
   goal 1 of a world in one run and goal 3 in ≤ 3 runs; EAT N lands its win at
   90–150 s of a typical run (day 2 score-vs-time), never at the buzzer.

**Probe.** `qa/levels.mjs` (§5.2) — **not** `qa/ladder.mjs`, which exists and is the
quality-ladder probe.

---

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
solo best (`:5352`). The end card order is `#endHd, #endSub, #endList, #endFinds,
#endStats, #drop, #endNext, #endQuests`, footer `#btnAgain / #btnHome`
(`index.html:2229-2274`); it already overflows at 430×932 (`:2263-2269`,
`qa/endfit2.mjs`).

### 4.1 Goal card copy (one line ≤ 6 words in the world's voice for dad; sprite + number for the child)

`beginMatch` fills `.lvl` = "LEVEL 3" (world-local 1–5), `.name` = the world name, `.sub`
= the line below, **before** `armed = true` (`:6144`); the one-time fill at `:1674-1677`
goes. `GOAL_CARD_AT/LEN` untouched (measured against Hole.io, recon 11.5).

| world | 1 EAT | 2 SET | 3 LANDMARK | 4 RIVALS | 5 CLEAR |
|---|---|---|---|---|---|
| Maple | EAT 48,000 OF THE TOWN | 40 SNACKS · 8 CARS · 5 HOUSES | EAT THE TOWN HALL | BE THE BIGGEST VOID | EAT EVERYTHING |
| Pirate | EAT 63,000 OF THE BAY | 40 SNACKS · 5 CABANAS · 4 GOLD | EAT THE ROYAL MARINER | BE THE BIGGEST VOID | EAT EVERYTHING |
| Game Day | EAT 105,000 OF GAME DAY | 40 SNACKS · 6 TRUCKS · 8 HOUSES | EAT THE STADIUM | BE THE BIGGEST VOID | EAT EVERYTHING |
| Lantern | EAT 90,000 OF THE NIGHT | 40 SNACKS · 10 STALLS · 4 GOLD | EAT THE BATHHOUSE | BE THE BIGGEST VOID | EAT EVERYTHING |
| Powder | EAT 27,000 OF THE PASS | 40 SNACKS · 5 CHALETS · 4 GOLD | EAT THE LODGE | BE THE BIGGEST VOID | EAT EVERYTHING |
| Skylark | EAT 21,000 OF THE FIELD | 40 SNACKS · 8 VANS · 4 GOLD | EAT THE HANGAR (§8.2) | BE THE BIGGEST VOID | EAT EVERYTHING |

The `.sub` line carries the sprite(s) and the number(s) first, the words after; the same
string paints `.goalLine` on the menu.

### 4.2 HUD

One new `#goal` chip, 44 px tall, in the slot `#quests` (`index.html:1886`) leaves; no
score element exists in the HUD today (`:1884-1891`) and `.gFill` is not repurposed
(`:4949-4955`). Contents by goal:

- **EAT** — sprite + `31,200 / 48,000` with a 4 px fill. `playerScore` (`:3704`) can
  fall on a hunter steal (`:2945`), so the fill holds its **high-water mark** while the
  number stays honest, and the win is a per-frame threshold that latches on first
  crossing (not an eat event).
- **SET** — three sprite + count pairs counting **down**, each turning into a tick at 0;
  fed at the eat handler's kind lines (`:5825-5839`) with rules identical to
  `questable.mjs:74-90`, `'big'` de-duplicated per bite; `questEvent` (`:4018`) stays as
  the signal after the board goes.
- **LANDMARK** — the hero sprite + a size bar `R / (heroProp.radius / EAT_RATIO)` that
  reads "grow until it fills" (`heroProp` resolved at `:6114-6116`); the existing in-range
  cue (`:10753-10766`) is unchanged; win at the hero poll (`:10768-10775`) on
  `userData.byPlayer`. **`heroProp` is excluded from the rivals' eat rule on goal 3**
  (they can take it today, `:10770-10774`); no "stolen" state exists.
- **RIVALS** — a rival-face sprite + `#2 OF 6` from the 5 Hz `myRank` (`:4732-4737`),
  the crown at #1; resolves at the buzzer only.
- **CLEAR** — the island sprite + `37% DEVOURED` bar from `devouredPct` (`:4886`); win at
  100.

Goal callouts never use `announce()` inside the 35 s window (`:9650-9651`) or over the
title card (`titleUntil`, `:10683`); `holdBanner` stays reserved for EVOLVED and the hero
cue (`:4744-4748`).

### 4.3 Win on the spot, and the miss

One `goalMet()` check inside `if (started && !ended && !paused)` beside the buzzer
(`:9681`): on true it sets `goal.result = 'win'` and `outroT = 2.0` exactly as the buzzer
does, so the existing slow-mo / rings / music ceremony runs (`:9480`, `:10203`,
`:10562`) and `endMatch` is reached through `:9480` unchanged. The buzzer with the goal
unmet sets `goal.result = 'time'` (RIVALS: `'win'` iff `myRank === 1`). `endMatch(result)`
gains its one argument; the headline is no longer inferred at `:5352`/`:5434`.
`recordLevelResult({world, goal, result, score, pct, rank, secs})` is called right after
`ended = true; voidPlayed = '1'` (`:5329-5330`) and **before** the solo return
(`:5364`); `voidBest_<w>` (`:5449-5452`) and `completeWorld` (`:5503`) stay, plus
`completeWorld` in the solo branch. The quit path (`:7774`) records `n += 1` and nothing
else.

On a miss nothing is lost: no lives, no timer pressure, no ad; coins for what was eaten
count up as usual; the pip stays green; `audio.ready()`, never `audio.lose()`; the third
miss opens the next pip and the end card shows its padlock popping off (§4.4) — the
"never a wall" rule of `unlocks.ts:5-26` applied inside a world.

### 4.4 The end card, in order

`#end` stays z9 over the dimmed world (`index.html:708-722`).

1. `#endHd`: win "LEVEL 3 ✓" (CLEAR: "100% DEVOURED"); miss "NOT YET"; RIVALS miss
   "#2 · NOT YET".
2. **`#endPips`** (new, inserted between `#endHd` and `#endSub`, `index.html:2230-2231`):
   the five pips; the finished pip flips grey/magenta within **≤ 400 ms** of
   `#end.show`, painted **before** `celebrateEnd()` is called (`:5364` solo, `:5439`
   rivals) so it lights before the 900 ms coin count-up (`:5290-5322`); on a third miss
   the next pip's padlock pops off here (320 ms). Caption under the pips, 12 px, for dad:
   "LEVEL 8 OF 30".
3. `#endSub` coins/gems/XP count-up as today.
4. `#endStats` cascade unchanged (`index.html:768-787`); `#endList` standings on RIVALS
   levels only; `#endFinds` as today; `#drop` unchanged (`:5206-5289`).
5. `#endNext` = **the next reward**: for goals 1–4, the next pip drawn large with its
   sprite and line, padlock opening (320 ms); after goal 5 (or on the world's first
   finish, `completeWorld` `:5503`), the next world's poster painted by
   `paintWorldCard(host, WORLD_ORDER[i+1])` (`:6689`; five posters on disk, Skylark's is
   CDN-only with `CARD_FALLBACK` `:6672-6688`) under the `.locked` filter and a padlock
   (`index.html:1416`) beside the existing TAKE ME THERE / OPEN SHOP doors
   (`:5509-5563`).
6. `#endQuests` **deleted** with its render block (`:5461-5476`, CSS `index.html:487-497`).
7. Footer: `#btnAgain` reads CONTINUE on a win (`resetMatch` `:7571` into the next pip
   of the same world, no reload; after pip 5 → TAKE ME THERE's reload with
   `voidWorld + voidAutoPlay + voidPlayGoal`), TRY AGAIN on a miss (same level);
   `#btnHome` → `enterMenu()` where the pip hop plays.

Height budget: removing `#endQuests` (~120 px) pays for `#endPips` (56 px) + caption
(20 px); the jewel replaces the text card at the same height. `qa/endfit2.mjs` (not in
the gate today) is run at two sticker finds: `#btnAgain` ≥ 90% inside the viewport at
430×932 and 393×700.

### 4.5 Reload moments

A world change, TAKE ME THERE and a cross-world replay stay a page reload
(`:6766-6770`, `:5518-5520`). The boot cover (`#loadScr`, `index.html:2143`) paints
`paintWorldCard(loadScr, voidWorld)` behind its text so the locked jewel on the end card
and the cover are the same picture; `preloadMusic` already orders the world track first
on that path (`audio3d.ts:4040-4062`). The poster for the *next* world is requested
while the end card is up so the cover is warm.

### 4.6 The first reveal (session 2)

The first session never shows the menu (`:6559-6562` auto-plays Maple with no menu);
the daughter's first sight of the ladder is after her first match. On the first menu
ever shown (`voidPlayed` set, no `voidLevels.seen`): the pips fade in left to right
80 ms apart, pip 1 flips to its real state (grey if she won, green if not), the void
looks down at the row for 1.4 s, the current pip's ring pulses three times **on this
reveal only**, PLAY glows once. No words. `voidLevels.seen = 1` afterwards.

### 4.7 Bars

1. Taps to play = **1** on `/?manual=1` (`AUTO_START` off, `:3631`): after one click on
   `#btnPlay`, `__matchState().armed === true`, `#menu` computed display `none`,
   `#worlds` never gained `.show`; then one `pointerdown` sets `started` and the clock
   ticks from 0 (`qa/opening.mjs` A1 stays 0).
2. Goal card: `#titlecard` `.sub` equals the level's line; shown once inside
   `GOAL_CARD_AT .. +GOAL_CARD_LEN` of arming and never again.
3. HUD presence at match seconds 5 / 88 / 163 (on `__matchState().t`, never wall):
   `#timer` visible and decreasing; `#goal` visible with a value monotone in the right
   direction (EAT high-water non-decreasing, SET non-increasing, LANDMARK bar
   non-decreasing, RIVALS a rank 1–6, CLEAR non-decreasing); `#quests` absent.
4. Win on the spot: driving the counter with `__rushClock` / the game's own path
   (`:2171`, `:2289`) opens `#end` with `matchClock > 0` and `#endHd` containing "✓";
   `?len=8` with the goal unmet opens `#end` with "NOT YET", the pip state unchanged,
   `n` incremented; RIVALS never ends before the buzzer.
5. End-card order by DOM timestamps: `#endPips` finished-pip class set ≤ 400 ms after
   `#end.show` and before the first `.endCnt` mutation.
6. Level bar text matches `/\d+ OF 30/` on the end card and nowhere in `#menu`.
7. `#btnAgain` ≥ 90% visible at two finds (`endfit2`).
8. First reveal: seeding `voidPlayed=1` and no `voidLevels` → `.pips.reveal` runs once;
   second load → never.

**Probe.** `qa/levels.mjs` (b), (c), (d); `qa/menu.mjs` bar 5 (taps); `qa/endfit2.mjs`.

---

## 5 · The probes

### 5.1 `qa/menu.mjs` — contract (each bar prints `PASS —` / `FAIL —`, exit 1 on any fail)

Every per-frame bar hand-cranks rAF with a virtualised `performance.now` at
16.667 ms/frame (`qa/ladder.mjs:65-76`) so the sandbox's ~1 fps cannot be read as the
game's; contrast bars crank to a fixed frame first (an orbiting backdrop makes A/B shots
non-deterministic — `firstframe.mjs:76-79` already hit this). Viewport 430×932 @ 2 unless
stated; `__pinQuality(0)`.

| # | bar | method | number |
|---|---|---|---|
| 1 | hero share | bbox of pixels that change between two cranked frames 30 apart | 45–53% of viewport height; disjoint from `#btnPlay`, `.pips`, `.tabs` |
| 2 | void size | `__menuState().voidPx` | 28–42% of window height; centre in the lower 60%; hit radius ≥ 60 px |
| 3 | pendulum | `__menuState().azimuth` over 120 frames, sine fit; centroid drift of the changed-pixel mask | amplitude 5–7°, period 15–17 s; median 0.2–1.0 px/frame, max ≤ 2 px |
| 4 | UI still | 1-frame-apart screenshots after 120 frames | 0 changed pixels inside `#btnPlay`, `.pips`, `.tabs`, `#coins`, `.logo` |
| 5 | taps to play | `/?manual=1`, count Playwright clicks until `armed` | exactly 1; `#worlds` never `.show`; then one pointerdown → `started`, clock from 0 |
| 6 | frame ratio | in-page `dtRaw` medians, 120 frames menu vs 120 in-match, same page and rung | menu/match ≤ 1.15, labelled "sandbox, not device" |
| 7 | draw calls | `renderer.info` at every 10° of the pendulum and along the 900 ms ease | ≤ 1.3× in-match r = 12 and ≤ 2,000, per world |
| 8 | PLAY contrast | `pickerfit.mjs:211-225` ink method at three orbit phases; glyph p10 by `firstframe.mjs:88-105` | ≥ 4.5:1 both |
| 9 | pips | boxes, Lab ΔE (`lockedcards.mjs:41-49`), padlock glyph | 44/57 px, ratio 1.25–1.35; ΔE ≥ 10 adjacent and vs ground; padlock ≥ 3:1; exactly one current |
| 10 | tabs | pairwise ground ΔE; label contrast | ≥ 15; ≥ 4.5:1 |
| 11 | no emoji | regex `\p{Extended_Pictographic}` over the named containers' `textContent` | 0 |
| 12 | clearance | `__menuState().occluders` at each world's stage | 0 |
| 13 | restored island | end a match (`?len=8`), click `#btnHome` | `eaten === 0`, `voidRadius === MENU_R`, `rivalsVisible === false` |
| 14 | hidden / idle | override `document.hidden`, dispatch `visibilitychange`; crank 20 s with no input | frame counter flat for 60 wall-frames; render rate halves after 20 s |
| 15 | calm | seed `voidMotion='0'` | azimuth variance 0; `getAnimations()` in `#menu` empty |
| 16 | menu rung | crank at 25 ms | `menuRung` 0→1→2→3 in order; `__quality().level` unchanged |
| 17 | layout | the splash step's six views + 393×700 + 932×430 | no horizontal overflow; window ≥ 40%; PLAY ≥ 72; pips ≥ 44; every `#menu` control ≥ 44×44 |
| 18 | first reveal | seed `voidPlayed=1`, no `voidLevels` | `.pips.reveal` once; absent on the second load |
| 19 | locked tap | click a locked pip | wiggle class set for ≤ 220 ms, no text node added, `__levels()` unchanged |

### 5.2 `qa/levels.mjs` — contract (the brief said `qa/ladder.mjs`; that name is taken by the quality-ladder probe and is kept as is)

- **(a) state machine** — for each of the 30 seeds, `__levels()` and the DOM pips agree;
  seed "pirate goal 3 current" → exactly one current, earlier done/clear, later locked;
  pip 5 magenta only when that pip's `pct === 100`; a missing `__levels` throws.
- **(b) advance** — enter each world's goal 1 and one of each kind (five kinds) by the
  one tap; force the goal by the game's own path (score threshold, three counted kinds,
  the hero via `heroProp`, `myRank` at the buzzer, `devouredPct`); assert `#end` with the
  win, `cur` advanced by exactly 1; `?len=8` unmet → no advance, `n + 1`; three misses →
  next pip open; a quit → `n + 1` only.
- **(c) HUD presence** at t = 5 / 88 / 163 match-seconds (§4.7 bar 3).
- **(d) next-world card** — goal 5 done → `#endNext` has the locked-island element and
  the `/\d+ OF 30/` text; TAKE ME THERE writes `voidWorld`, `voidAutoPlay`,
  `voidPlayGoal`.
- **(e) supply** — `questable.mjs:74-90`'s block per world, `'big'` de-duplicated: every
  SET kind ≥ 3N; cars/houses ≥ 6N.
- **(f) migration** — the three seeds of §3.5 bar 2, monotone.
- **(g) telemetry** — the four `level_*` events fire once each in a start→win and
  start→fail run with the right `{world, goal, kind}`.
- **(h) hero exclusion** — on goal 3, after 60 match-seconds of autopilot with the
  rivals hunting, `heroProp.mesh.userData.eaten` is false unless `byPlayer`.

### 5.3 Existing probes that change, by file

| file | today | change |
|---|---|---|
| `qa/pickerfit.mjs` | push; clicks `#btnPlay` then waits for `.wCard` (`:87-89`); PASS on zero cards (`:245-260`) | **day 1:** throw if zero cards; **day 10:** open the grid via `#btnWorlds` |
| `qa/lockedcards.mjs` | push; `#btnPlay` + `.wCard` (`:63-65`) | day 10: via `#btnWorlds`; bars unchanged |
| `qa/firstframe.mjs` | push (`splash`); `#menu .logo`, `.logo i`, `.tag` skipped when missing (`:220`); `freeze()` hides the canvas (`:76-83`); non-splash path clicks `#btnPlay`/`.wCard` (`:232-235`) | **day 1:** a missing selector FAILS; `freeze()` keeps the canvas; day 10: non-splash path via the `_enter` helper |
| `qa/opening.mjs` | push; `/?manual=1`, `#btnPlay` then `.wCard` (`:258-260`) | day 10: one click on `#btnPlay`; all 19 bars unchanged |
| `qa/worldreg.mjs` | push; `data-world` in `index.html` (`:195-197`) | unchanged — the grid keeps its six cards |
| `qa/uisystem.mjs`, `qa/econ.mjs`, `qa/smoke.mjs`, `qa/faceparity.mjs`, `qa/purpose.mjs`, `qa/placement.mjs`, `qa/newsfeed.mjs` | push; the two-click idiom | day 11: the shared helper |
| `qa/solotog.mjs` | `#soloTog` inside the picker (`:36-41`, `:84-85`) | day 10: `#soloTog` on the goal line |
| `qa/bookshot.mjs`, `qa/navfit.mjs`, `qa/tutstrand.mjs`, `qa/hud3.mjs`, `qa/loadpct.mjs`, `qa/hud2.mjs` | `#btnBook` (`bookshot:49`), `.navRow .navCard` (`navfit:19`), `.wCard` | day 10–11: `#btnBook` is the tab; `navfit` measures `.tabs`; the rest via the helper |
| `qa/ladder.mjs` | quality ladder, MENU GATE (`:106-114`), not in the gate | **kept verbatim**; run explicitly after day 9 |
| `qa/questable.mjs` | `live` only (`gate.mjs:406`) | supply block reused by `levels.mjs` (e); the step is retired **only after** `levels.mjs` (e) is in the push profile |
| `qa/menushot.mjs` | screenshot only (`:1-17`) | shoots after 120 cranked frames; stays the lookbook's menu source |
| `qa/endfit2.mjs` | not in the gate | run at day 6; registered in push |
| `qa/lookbook.mjs` | the studio's evidence pack | day 12: adds the six menu stages at three viewports and the end card |
| the ~110 two-click probes (124 `.wCard[data-world=` hits) | | day 11: `qa/_enter.mjs` `enterWorld(p, world)` (clicks `#btnPlay` when visible, selects the world through `#btnWorlds` when it differs, else relies on `AUTO_START`, then waits on `__matchState`) + `openTab(p, id)`; a static guard `qa/idiomguard.mjs` (worldlists-style) fails if any probe still hard-codes `'#worldRow .wCard[data-world='` outside the helper |

New in the push profile: `menu`, `levels`, `menuframe` (baseline compare), `endfit2`,
`idiomguard`. The gate's step count goes 35 → 40.

---

## 6 · Build order — one crew-day per step; what the gate shows green after each

| day | build | gate after |
|---|---|---|
| 1 | **Baseline.** `qa/menuframe.mjs`: menu-idle `dtRaw` / draw calls / tris / `moverStats` / heap per world at rung 0 and 3, **and** a 0–360° azimuth series at each candidate stage plus the HOME-ease path. Guards: `pickerfit` throws on zero cards; `firstframe` fails on a missing `#menu` selector and keeps the canvas in `freeze()`. | push 35/35 green on today's menu; the baseline table in the brief |
| 2 | **The ladder's ground.** `qa/pace.mjs` on all six worlds (radius- and score-vs-time; autopilot and SET-style); `questable` supply per world with the `'big'` dedupe; CLEAR `devouredPct` at the buzzer, p50/p90 of strong runs; first shadow-toggle recompile check. Safe code: `restoreIsland()` split (`:7571-7644`), the `#daily` condition (`:7967`) on a `menuMode` stub, delete the stale gate comment (`:6919-6931`). | push green; §3.4 numbers replaced by measured ones; §8.2/8.3 decided from data |
| 3 | `src/game/levels.ts` (schema, migrate, `cur`, `recordLevelResult`, `__levels`), `level_*` telemetry, `voidPlayGoal`/`?g=`. `qa/levels.mjs` (a), (f), (g) written first and failing. | push green; `levels` (a)(f)(g) green |
| 4 | `LEVEL_SPEC` table beside `WORLD_COPY` (`:1492`), goal object in `beginMatch`, goal card per match, `#goal` HUD chip, `questEvent` dedupe. `levels.mjs` (c), (e). | push green; `levels` (a)(c)(e)(f)(g) |
| 5 | `goalMet()` beside `:9681`, `endMatch(result)`, `recordLevelResult` at `:5329`, `completeWorld` in the solo branch, hero exclusion, quit path, fail-forward. `levels.mjs` (b), (h). | push green; `levels` all but (d) |
| 6 | End card: `#endPips`, caption, jewel in `#endNext`, CONTINUE / TRY AGAIN, delete `#endQuests` + `QUEST_POOL`/`renderQuests`/`questComplete`/`addEncoreQuest` (`:3811-4004`) + the four `voidQuest*` keys. `levels.mjs` (d); `endfit2` registered. | push 36/36; `levels` complete; `endfit2` green |
| 7 | Menu chrome (`index.html`): the four band elements, transparent-centre window, lifted ground, pips from `qa/icons.mjs` sprites, goal line, PLAY, tabs, world chip, pennant, `#soloTog`; delete gift/orb/navRow/`::after`; `#book` chapters with `#trophies`/`#topvoids` re-parented. `qa/menu.mjs` bars 8–11, 17, 19. | push green (the window shows the raw canvas behind — expected); `menu` 8–11, 17, 19 |
| 8 | `prototype3d.ts`: `menuMode`, `enterMenu`/`leaveMenu`, `MENU_STAGE` (a0 from day 1's series), camera branch + `menuDist` plumbing, freeze list, rivals hidden, `MENU_R`, moods and scripted beats, tap-chomp + haptics, the 900 ms ease, `__menuState`. `menu.mjs` bars 1–4, 12, 13. | push green; `menu` 1–4, 8–13, 17, 19 |
| 9 | Menu rung, degrade ladder, idle tiers, one visibility handler, calm gating, restore at `introT <= 0`, conditional `renderer.compile()`. `menu.mjs` 6, 7, 14–16; `menuframe` before/after compare; `qa/ladder.mjs` run explicitly. | push green; `menu` all but 5 and 18; `ladder.mjs` MENU GATE green; the ratio and draw-call numbers in the brief |
| 10 | One-tap PLAY (`launchWorld` minus the picker, `voidPlayGoal`), the pip hop, the first reveal; re-point `pickerfit`, `lockedcards`, `opening`, `solotog`, `bookshot`, `navfit`, `firstframe`'s non-splash path. `menu.mjs` 5, 18. | push 38/38 green (`menu`, `levels` in); `menu` complete |
| 11 | `qa/_enter.mjs` + `qa/idiomguard.mjs`; sed migration of the ~110 two-click probes; `uisystem`/`econ`/`smoke`/`faceparity`/`purpose`/`placement`/`newsfeed`/`tutstrand`/`hud3`/`hud2`/`loadpct`. | push 40/40 green; `live` profile run once, red list triaged |
| 12 | Viewports (collapse order, landscape, iPad); `qa/lookbook.mjs` with the six menu stages at three views and the end card; `menushot` after settle. | push green; `menu` bar 17 at all views; the lookbook exists |
| 13 | Chrome-first boot: `#loadScr.boot` becomes the menu with `splash_hero.webp` in the window and PLAY live via `withWorldReady` (`:6455`), cross-fade to the live world on the first rendered frame (`:10931-10935`); cover art = the world's poster on reload (§4.5). Behind a flag; bar: chrome visible ≤ 300 ms after DOMContentLoaded, a PLAY tap during the build is honoured. | push green with the flag on and off; §8.7 decides which ships |
| 14 | Studio pass (`studio` skill on the day-12 lookbook): art direction on the window feather, ground lift, tab hues, sprites, the end-card jewel; fixes. Skeptic verdicts on every bar above. | push green; verdicts recorded in the brief |
| 15 | **Device day.** Owner's reference phone: menu vs match ms and heap through `__menuState`; the first chomp audible; the child protocol (§8.9): time to first PLAY, mis-taps, "what does the green dot want?". EAT/SET N tuned from days 2 and 15. | push green; the owner's number pair and the child's three numbers in the brief |
| 16 | Buffer and stretch: the Maple lagoon sheet on the `bayWater` pattern (`island.ts:3882-3930`, one draw, `uTime` only, `depthWrite:false`, `renderOrder 1`, y 0.07) if the lookbook says the Maple window feels dead; else nothing. | push green; done |

Each step: brief → build → probe fails → fix → probe passes → skeptic verdict → gate →
commit. Corrections are recorded in the brief, never hidden.

---

## 7 · What we do not do

- Render a second scene or a second renderer for the diorama; rebuild the island in
  place to show a non-current world (56 `pickedWorld` sites, 44 `island.*` sites,
  `:1733`); a world change stays a reload.
- Route any menu quality change through `applyQuality()` (`qShadowLatch`, `:1354`), or
  let the adaptive ladder sample on the menu (`:10912`).
- A 360° orbit, a wide/high "whole island" shot (4,694 draw calls, `:10496`), or the
  family in the diorama.
- A PLAY breathe, a pip pulse, a countdown, a coin spinner, an ad, an ad-skip currency,
  a "x2" door, lives, hearts, or `audio.lose()` on a goal level.
- Platform emoji anywhere on the menu, the goal card, the HUD chip or the end-card pips.
- Hole.io's hex values, strings, illustration or skins; the five-tab skins store.
- Live water on Lantern (ankle-deep canal, `island.ts:410`), Powder (ice, `:430`),
  Skylark or Game Day (no water, `:434`, `:458`); the key art's falling houses in 3D.
- Derive a per-world CLEAR pip from the global `voidBestPct` (`:5339`); touch
  `voidUnlocked`, `voidBest_<w>`, `voidMatchN` (match 0 is the baseline), `voidSolo`,
  stickers, trophies or seasons.
- Retire the `questable` gate step before `levels.mjs` (e) replaces its supply count
  (`GOVERNOR.md:148`); name the level probe `qa/ladder.mjs`.
- Ship any step without its probe passing at 430×932 @ 2 and the six splash views.

---

## 8 · Open decisions for the owner, with the governor's recommendation

| # | question | governor recommends |
|---|---|---|
| 1 | **How strict is "strictly sequential"?** Dots in order inside a world, and the next world still opens by finishing any match (as today) — or all thirty in one line, so world 2 waits for a 100% clear of Maple? | Inside a world only. A 100% clear depends partly on what the family eats (`:4886`) and real matches land in single digits (`:5462`); the strict line would lock 25 of 30 levels behind luck for a six-year-old. The third miss opens the next dot either way. |
| 2 | **Skylark's landmark.** The whale needs a void of radius 16.2; the growth law tops at 12 without eating four rivals (`:9745`, `island.ts:6196`). Level 3 on Skylark: the hangar, or untether the whale for that level? | The hangar, unless day 2's numbers show the whale reachable by a median run. The whale stays the world's ascension beat. |
| 3 | **What does 100% mean?** Everything eaten by anyone (as coded), or by her alone? And if 100% is out of reach on a world in 180 s? | As coded (in solo they coincide). If day 2 shows 100% unreachable on a world, the fifth dot's number becomes the p90 of strong runs on that world — you set it from the number we hand you — and magenta stays reserved for a true 100. |
| 4 | **BY MYSELF on the RIVALS level.** | RIVALS always deals the family; the chip greys on dot 4. Solo applies to dots 1, 2, 3, 5 on the 120 s clock (`:6131`). |
| 5 | **The SHOP tab is one thumb away and shows prices** (`$4.99–$9.99`, `:8345`, `:8442`; the grown-ups gate is on purchase, `:8160-8172`). Show the cash tier to her, or shield it? | Keep the coin skins she earned open; put the LEGENDARY cash tier (`:8396`) behind an "ask a grown-up" row so a price is never on her screen unless a grown-up opened it this session. |
| 6 | **Menu sound.** The theme only, plus his chomp on tap — or the world's own ambience (waterfall, bay, crowd) under the window? | Theme + chomp in v1 (no new audio assets); ambience for the first update once day 15 confirms the first chomp is audible on the phone. |
| 7 | **Chrome-first boot** (day 13): show the menu at once with the painted splash in the window and fade to the live island when it is ready — ship it, or hold it for the first update? | Ship it if its two bars pass on day 15; it is the literal "make our splash image alive" and cuts the wait to under a second. Otherwise hold. |
| 8 | **Ground brightness.** Hole.io's frame is a bright violet slab; ours is a night cosmos. We lift the ground under PLAY and the tabs to a brighter violet and keep the night around the island. | Keep our night around the island so it floats; lift only where PLAY needs it (bar 1.3.3). Your two frames side by side on day 14. |
| 9 | **The child's numbers.** A five-minute session with your daughter on day 15: seconds from cover-drop to her first PLAY tap (bar ≤ 10 s), mis-taps in five minutes (≤ 2), and whether she can say what the green dot wants without being read to. | This is the only bar that answers "does a six-year-old get it in the first second"; the machine bars cannot. You run it; we write down the three numbers. |
| 10 | **EAT numbers.** 0.6 × par is arithmetic, not a measurement. | Provisional until day 2 (when in a typical run the number is crossed) and day 15 (whether she clears dot 1 in one go). Target: level 1 of every world in one run for the median child. |
| 11 | **Water on Maple.** The waterfall is in the window on the Maple stage; the pond and river are painted still. Add a live lagoon sheet (one draw call) or leave it? | Leave it unless the lookbook says the Maple window feels dead; day 16 is reserved for it. |
| 12 | **If the phone misses 16.7 ms.** Ship the menu with its own three-step fallback (lower resolution → no shadows → half-rate, still live), or ship a frozen picture? | Ship live with the fallback; you see the menu/match pair from your own phone on day 15 and decide. |

*Sections 0–8: draft 1, 2026-09-10, governor-verified as stated in the header. Every number in §3.4 is derived from code and is replaced by the
day-2 measurement before any goal is authored; the menu's cost is unknown until day 1
prints it. The skeptic pass runs on each step's bars before the next step is briefed.*