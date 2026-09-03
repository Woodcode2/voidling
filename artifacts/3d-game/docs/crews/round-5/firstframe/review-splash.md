# TEAM UI — the two screens before the game (Stream D, brief §2D)

Boot loader, menu splash, picker. Evidence: `docs/crews/round-5/shots/firstframe/`
(maple_boot0/boot/menu/picker at 430x932@2; boot and menu at 375x667, 390x844,
393x700, 430x740, 440x814, 440x956; the two contact sheets), the seven JSONs in
`docs/crews/round-5/firstframe-data/`, `owner-splash.txt`, and the owner's own
frame `docs/owner-2026-08-29-splash.png`. Every number below is one of theirs or
one I ran on those PNGs (the row-profile at the end of COVERAGE).

## VERDICT: NO-SHIP

Both of the owner's complaints are real and measured — the loader prints the
game's name twice on every launch after the first, and the 12px "THE CUTE" line
sits under its 4.5:1 bar on three of the six phone viewports we shot and at
1.72:1 on his own phone — and behind them sits a third thing his screenshot
shows: a progress bar reading 0% while the whole world is built.

## THE BAR

**Candy Crush Saga (King) and Subway Surfers (SYBO)** — the two loaders every
6-to-11-year-old has watched most. Mechanically, both do four things:

1. The wordmark is a pre-rendered lockup with its own outline and drop shadow,
   so its legibility never depends on the art behind it.
2. It sits in the top third, in sky the art reserves for it, at a position
   fixed from the top — the art scales under it, the type never migrates.
3. The loader IS the title screen: art still, wordmark still, and when loading
   ends the bar simply becomes the PLAY button. Nothing jumps.
4. The bar moves from the first second — a number that does not change is the
   "is it frozen?" signal, and both titles never show one.

**Where we sit.** The menu already does (2) and half of (3): logo at the top
(`#menu` padding `6vh + safe-area`, index.html:833), the art at
`center 13vh / auto 66vh` (:857), white type with dark drop shadows (:873-878),
measured 10.99:1 (logo) / 6.74:1 (THE CUTE) / 7.68:1 (tag) at 430x932. The
loader paints the SAME art at the SAME place (:1175 is also
`center 13vh / auto 66vh`, so the art holds still across the 0.45 s crossfade
at prototype3d.ts:5689-5690) — and then does everything else backwards: its
lockup is bottom-anchored (`justify-content: flex-end; padding-bottom: 7vh`,
:1167-1168) so it lands on the void's face whenever the viewport is short; it
is 26/12px against the menu's 40/17.6px; its only shadow is a purple glow
(`text-shadow: 0 0 24px #b875ff`, :1182) which the `i` inherits — pink glyphs,
purple halo, purple face; under it the name is printed a second time in yellow
(:1490); and its bar never leaves 0% until the asset pack starts downloading
(:5625-5633). So the crossfade our players see is: art still, the name leaps
from the bottom of the frame to the top and grows 54%, and a second copy of it
vanishes. Against (1)-(4) we score (2) on the menu only.

## FINDINGS

### 1. The name is printed twice on the first frame
SEVERITY: blocker (the owner's words; every launch after the first)
AT: src/prototype3d.ts:1490; index.html:1935, :1941, :1184
SAW: maple_boot0.png, maple_boot.png, maple_boot_440x956.png, _440x814, _430x740,
_393x700, _375x667 and the owner's frame: "THE CUTE / WORLD ENDER" in white,
then "THE CUTE WORLD ENDER" in yellow, tracked 6px, directly beneath — at every
viewport, at the very first paint (boot0) and after the fill.
EVIDENCE: index.html:1935 `<div class="lLogo"><i>THE CUTE</i>WORLD ENDER</div>`;
prototype3d.ts:1490 `if (ln) ln.textContent = goingStraightIn ? nm : 'THE CUTE WORLD ENDER';`;
all six JSONs: `"bootName": "THE CUTE WORLD ENDER"`. The probe's own doubled-name
assertion (qa/firstframe.mjs:119-120) exists, but none of the six JSONs on disk
carries a `doubled` key — this pack was shot before that line was added, so the
FAIL-LINE has never actually been seen to fire. The comment at :1481-1487 explains
the intent well (no world name before the player picks one); the fallback string
was simply the wrong one — the menu's own line for that slot is `STARRING THE
VOIDLINGS` (index.html:1753).
FIX: prototype3d.ts:1490 →
`if (ln) { ln.textContent = goingStraightIn ? nm : 'STARRING THE VOIDLINGS'; ln.classList.toggle('world', goingStraightIn); }`
index.html:1184 → `#loadScr .lName { font-size: 11px; letter-spacing: 7px; color: #fff; font-weight: 700; text-shadow: 0 2px 8px rgba(0,0,0,0.7); }`
plus `#loadScr .lName.world { color: #ffd23f; letter-spacing: 6px; font-size: 14px; }`
so the world-name path (first launch, picker tap) keeps its yellow call-out and
the brand path becomes the menu's tag, same type, same spot once finding 2 lands.
GATE: qa/firstframe.mjs:119-120 as written — fails today (`bootName` equals the
logo text on every view), passes after. Add: assert `.lName` text is one of
`STARRING THE VOIDLINGS` or a `WORLD_NAMES` value; and shoot the boot ONCE with
`voidPlayed` unset (the init script at :103 sets it to 1, so the pack has never
photographed the world-name path) asserting `.lName` reads `MAPLE FALLS`.

### 2. "THE CUTE" fails its bar on three of six phones and on the owner's
SEVERITY: blocker
AT: index.html:1167-1168 (bottom anchor), :1175 (art in vh), :1182-1183 (12px, glow only)
SAW: 430x932 (maple_boot.png) and 440x956: the lockup over dark sky under the
void's chin — fine. 440x814: THE CUTE across the lower-left cheek, under the
mouth. 430x740: across the chin and the right blush. 393x700: across the left
blush and the mouth. 375x667: THE CUTE through the mouth, WORLD ENDER across
both cheeks — the face is behind the whole lockup. Owner's frame: THE CUTE runs
between the eyes and the smile, on the brightest band of the face; "C U T E"
visibly loses its E against the highlight.
EVIDENCE — `boot THE CUTE`, 12px, bar 4.5:1 (p10 = the worst tenth of glyph pixels):

| view | p10 | median | % under 4.5 | behind (mean rgb) |
|---|---|---|---|---|
| 430x932@2 | 7.04 | 10.23 | 0 | 53,26,96 |
| 440x956@3 | 7.53 | 10.99 | 0 | 48,24,89 |
| 440x814@3 | **3.51** | 7.01 | 15 | 89,45,137 |
| 430x740@3 | **3.54** | 5.76 | 27 | 101,42,155 |
| 393x700@3 | **1.82** | 4.01 | 65 | 132,69,174 |
| 375x667@2 | **1.09** | 3.15 | 78 | 149,99,186 |
| owner, 440x956@3 Safari | **1.72** | 3.46 | — | 137,85,187 |

Does our build reproduce his frame? Not at his viewport. His content box is
814 css px tall (status bar bottom at 52, toolbar top at 863 in his shot — the
440x814 run is the right size), but the two frames disagree on where the face
is: a row-brightness profile down the centre band (x 40-62%) puts the face's
brightest slab at content y 570-610 in his frame and at 545-565 in ours, while
his WORLD ENDER glyphs sit 189-207 px above the content bottom against our
177-195. So the lockup is ~12 px higher and the face ~30-45 px lower in his
frame than in ours; his THE CUTE lands ON the peak, ours 60 px below it.
Measured on the art itself, his skyline-tip-to-crystal-tip is 274 css px, ours
262 — his art is drawn 4-5% larger. The code says why: :1175 sizes and places
the art in `vh` (`center 13vh / auto 66vh`) while the box is `position: fixed;
inset: 0` (:1167). Chromium at 814 resolves `vh` to 814; iOS Safari resolves
`vh` to the LARGE viewport (bars collapsed, ~850-870 px on a 956 screen), so
on his phone the art is bigger and starts lower, and its face — the bottom of
the image — reaches further down into the bottom-anchored lockup. Of our six
renders, 393x700 is the nearest twin by the numbers (behind 132,69,174, p10
1.82, median 4.01 against his 137,85,187 / 1.72 / 3.46), for the same
geometric reason at a different phone. The residual ~10 px I cannot account
for from here belongs to the experiment below.

FIX — put the lockup where the art has sky at every viewport, at the menu's
exact spec, so loader and menu become one frame:
```
#loadScr { padding-top: calc(6vh + env(safe-area-inset-top, 0px)); }            /* = #menu, :833 */
#loadScr .lLogo { font-size: clamp(40px, 8vw, 68px); letter-spacing: 2px; line-height: 1.02;
  text-shadow: 0 0 34px rgba(147,80,232,0.9), 0 4px 12px rgba(0,0,0,0.65); }     /* = #menu .logo, :873-874 */
#loadScr .lLogo i { font-size: 0.44em; letter-spacing: 8px; margin-bottom: 2px;
  text-shadow: 0 0 18px rgba(255,150,220,0.8), 0 2px 8px rgba(0,0,0,0.65); }    /* = #menu .logo i, :876-878 */
#loadScr .lName { margin-bottom: auto; }   /* bar, %, label stay at the bottom */
```
Why it survives every viewport: both screens place the art at 13vh from the
top, and the image's own top ~3% is empty sky (the skyline spire is ~15 px into
the image at 667), so the dark band above the skyline is 13vh + 15 px: 102 px
at 667, 106 at 700, 136 at 932. The lockup is fixed pixels — 40 + 18 + 2 + 41 =
101 px to the WORLD ENDER baseline at 6vh on a 667 phone — so it clears at every
phone and gains room as phones get taller; and on iOS Safari the vh-large
effect now moves the art DOWN, away from the type, so the owner's failure mode
reverses into margin. The 1 px at 667 is why finding 3's short-viewport rule
must ship with this. After the move the crossfade is: art still, wordmark
still, the bar cluster fades into PLAY — the bar's shape (3).
The alternative I rejected: a dark scrim behind the block. It moves the number
(the probe hides only the `i`, so a `::before` plate would count as "behind")
but on the owner's phone it puts a dark oval on the void's smile — the one
thing a child looks at. That is the mobile-web fix, not the top-10 one.
GATE: `qa/firstframe.mjs --splash --views=430x932@2,440x956@3,440x814@3,430x740@3,393x700@3,375x667@2`
asserts `boot THE CUTE` p10 ≥ 4.5 at every view — fails today at four views
(3.51, 3.54, 1.82, 1.09), passes after. Add a seventh run that stands in for
iOS Safari's vh: at 440x814 inject
`#loadScr, #menu::after { background-size: auto 574px !important; background-position: center 113px !important; }`
(vh ≈ 870). Run it FIRST as the experiment: on today's build it should
reproduce the owner's behind-mean within ±15 per channel of (137,85,187) and a
p10 near 1.7 — that confirms the mechanism; if it does not, the residual is
something else and the probe says so. Then it stays as a standing view. Also
add `#lPct` and `#loadScr .lTip` to the measured lines (:124-125) — the loader's
other two lines are unmeasured.

### 3. The menu's STARRING THE VOIDLINGS fails on the two short phones
SEVERITY: major
AT: index.html:879-880 (the tag), :833 (6vh padding), :857 (art at 13vh)
SAW: maple_menu_375x667.png — the tag's middle letters sit on the pink top of
the skyline's tallest tower; maple_menu_393x700.png — the tag's baseline touches
the spire. At 430x932 (maple_menu.png) the tag is in clean sky.
EVIDENCE: `menu tag`, 11px, bar 4.5:1 — 375x667 p10 **1.16**, 25% under 4.5,
behind 89,64,124; 393x700 p10 **3.8**, 14% under; 430x740 p10 5.02 (5% under);
430x932 7.68; 440x956 9.86. Geometry: the tag needs 40+18+2+41+2+13 = 116 px
from the top at 6vh; the sky band is 102 px at 667 and 106 at 700.
FIX (and the loader inherits it, since after finding 2 the two screens share
the geometry):
```
@media (max-height: 720px) {
  #menu, #loadScr { padding-top: calc(4vh + env(safe-area-inset-top, 0px)); }
  #menu .logo, #loadScr .lLogo { line-height: 1; }
  #menu .logo i, #loadScr .lLogo i { margin-bottom: 0; }
  #menu .tag, #loadScr .lName { font-size: 10px; letter-spacing: 5px; margin-top: 2px; }
}
```
→ tag bottom at 27+18+40+2+12 = 99 px at 667 (spire at 102), 100 at 700 (spire
at 106). Tight by design — the number decides. If p10 at 393x700 still misses,
the next lever is the honest one: `#menu .tag { display: none }` under 720 px —
a subtitle an iPhone SE does without, rather than a subtitle it cannot read.
GATE: same `--splash` run: `menu tag` p10 ≥ 4.5 at 375x667 and 393x700 — fails
today (1.16, 3.8), passes after.

### 4. The bar reads 0% for the entire world build
SEVERITY: major
AT: src/prototype3d.ts:1504-1507 (bootStage writes only `.lTip`), :5625-5633 and :5727 (the only writers of `#lBar` / `#lPct`)
SAW: the owner's frame: "0%" under an empty bar beneath "Waking the void
family…" — which is the LAST build stage (:2407). Our boots: 0% under "Carving
the coast…", "Raking the park…", "Scattering the leaves…".
EVIDENCE: the code says `const bootStage = (label) => { tip.textContent = label; … }`
and the bar is first written by `requestedReady`'s callback at :5631-5632 — the
asset-pack download that starts after the island exists. The comment at
:1493-1495 sizes the build at "17 s in the sandbox, a handful of seconds on a
phone"; for all of it the child watches a number that does not move.
FIX: give the stages a fraction. `const bootStage = (label: string, frac = 0) =>`
and inside, `if (frac > bootPct) { bootPct = frac; el('lBar').style.width = frac + '%'; el('lPct').textContent = frac + '%'; }`
with `let bootPct = 0` declared ABOVE :1504 (module top level runs in order;
`loadPct` at :5620ish is in its TDZ when :1508 runs). Calls: :1508 → 5, :1510 →
20, :2004 → 45, :2407 → 60 (island.ts's own bootStage calls keep label-only, they
land between 20 and 45). Then :5626 `pct = 60 + Math.round(done / total * 40)`
so the pack takes 60→100 and the existing monotonic guard at :5629 still holds.
No seeded draw is touched; the town is unchanged.
GATE: in firstframe.mjs after the `boot` shot, poll `#lPct` every rAF until the
loader clears and record the distinct values seen; assert ≥ 4 distinct values
and that the value when `.lTip` reads `Waking the void family…` is > 0. Fails
today (one value, `0%`), passes after.

### 5. Three voices in the status line
SEVERITY: polish
AT: index.html:1944; src/prototype3d.ts:1508, :5719
SAW: maple_boot0.png says "Carving the coast…", maple_boot.png "Raking the
park…" 0.2 match-s later; the markup's literal first paint (before either) is
"tip: eat the little stuff first — cones, hydrants, mailboxes" — lowercase
`tip:` in a frame where every other line is tracked caps or Title case — and
the world loader swaps in a random LOAD_TIPS entry (:5719).
EVIDENCE: :1944 `<div class="lTip">tip: eat the little stuff first — cones, hydrants, mailboxes</div>`
replaced by :1508 `await bootStage('Raising the island…')` within a frame.
FIX: :1944 → `<div class="lTip">Waking up…</div>` so the boot has one voice
(stage labels, which is the better idea — they name what the child is waiting
for). Keep LOAD_TIPS for the world loader.
GATE: `.lTip` at boot0 does not match `/^tip:/`. Fails today, passes after.

### 6. Stale comments on the art rule
SEVERITY: polish
AT: index.html:848-853 ("auto 62vh"), :1170-1173 ("78vh … against the menu's 62vh")
EVIDENCE: the rules at :857 and :1175 both read `auto 66vh`. A later reader
tuning the lockup will size against 62.
FIX: correct both to 66vh, and note in :1170 that the loader and menu place the
art identically ON PURPOSE (the crossfade depends on it).
GATE: none — a source read; the governor's rule 4 says comments are evidence.

### 7. Picker — SHIP, one wrap
SEVERITY: polish
AT: the world cards (index.html, `#worldRow .wCard`)
SAW: maple_picker.png — five posters, WORLD n chips, name / tagline / 12 SECRETS /
PLAY on every card; type reads on every poster including the pale Powder Pass.
"THE WHOLE TOWN IS HERE" is the one tagline that wraps to two lines, and the
SECRETS line and PLAY do not move for it, so the wrap eats into the stadium.
Eyeballed, not measured.
FIX: shorten Game Day's tagline to one line at 430 ("WHOLE TOWN'S HERE") or let
the card's text block grow. GATE: no `.wCard` tagline exceeds one line at 375.

## IS THIS THE BEST THIS CAN BE?

No. Between here and the bar, ranked:

1. Finding 2 + 1 together — the lockup at the top at the menu's spec, the tag
   under it, one frame across boot → menu. This is the whole of bar points (2)
   and (3) and it is ~10 lines of CSS and two of TS.
2. Finding 4 — a bar that moves from the first second (bar point 4).
3. Finding 3 — the short-phone rule, so an iPhone SE reads what a Pro Max reads.
4. The iOS-vh view in the gate, so the owner's phone is a view we shoot, not a
   screenshot we get.
5. Findings 5-7.
6. After all of that, the thing shipped titles actually do for bar point (1): a
   rendered wordmark (an SVG lockup with its own outline and shadow) instead of
   live text. It makes the contrast question moot at every viewport forever and
   gives the ad frame a real logo. It is a new asset and the owner approves art,
   so it is a proposal for the round after, not this one.

Two things I want on record as SHIP: the menu at 430x932 and 440x956 (every line
clears its bar with margin, the art has room, PLAY is unmistakable) and the
picker (finding 7 aside). The key art itself carries both screens; nothing
here asks it to change.

## COVERAGE

Images: maple_boot0.png, maple_boot.png, maple_menu.png, maple_picker.png,
sheets/splash_viewports.png, sheets/splash_safari.png, maple_boot_440x956.png,
maple_boot_440x814.png, maple_boot_430x740.png, maple_boot_393x700.png,
maple_boot_375x667.png, maple_menu_375x667.png, maple_menu_393x700.png,
maple_worldload.png, docs/owner-2026-08-29-splash.png. Note: maple_worldload.png
is not a loader — it is a gameplay frame (2:41 on the clock, the drag hint up);
the world loader on the picker-tap path, and the loader's world-name path in
general, are unphotographed (see finding 1's gate).

Numbers: firstframe-data/maple.json, maple_440x956.json, maple_440x814.json,
maple_430x740.json, maple_393x700.json, maple_375x667.json, owner-splash.txt;
plus a row-brightness profile I ran with pngjs over the owner's PNG and the
440x814 / 393x700 boot PNGs (centre band x 40-62%, 20-css-px slabs; near-white
row bands ≥ 235 luminance) to place the face and the glyphs in each — the
570-610 / 545-565 / 189-207 / 177-195 figures in finding 2.

Code: index.html:831-880, :1140-1215, :1745-1760, :1925-1950;
src/prototype3d.ts:1450-1512, :1508/:1510/:2004/:2407, :5620-5640, :5675-5735;
qa/firstframe.mjs (whole file); qa/_record.sh; docs/STUDIO.md; docs/GOVERNOR.md
(standing rules 1-4, the splash-art order at :566).

No source file was edited. No browser was started.
