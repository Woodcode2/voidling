# THE AAA LOOP — ledger

*"Is this a AAA game that will get people to want to keep playing? If not, fix
it as needed. I want critically the best graphics you can get, the best sfx, I
want teams involved and a governor to review and decide. Do your research on the
top 10 games — make this something special. We're almost there. … Also
critically — the most fun we can make it. If something is missing — add it,
modify, do what's needed. Make this a loop — you keep going until it's done."*
— the owner, 2026-09-23

This file is the loop's memory. Every iteration reads it first and writes it
last. It lives in the repo, not in anyone's context, so a container restart or a
compacted conversation loses nothing.

---

## SHIP MODE — the owner, 2026-09-24. This section outranks everything below it.

*"We've used millions of tokens at this point though. Days and months building.
I feel like we may be over doing it and not going live."* Then, on the plan
below: *"Ok in everything. … I just don't want to spend weeks."*

**Feature freeze.** Only what launch needs, about two days of dev, then his Mac
day. The research governor's G11–G29 move to post-launch (docs/POST-LAUNCH.md);
G11 comes back only if a borrowed older iPhone/iPad stutters, which he will
check later. Process is lighter: one builder and one review per item, the push
gate before `main`, no multi-round workflows for small things.

| # | launch item | state |
|---|---|---|
| S-1 | Merge G5/G7/G8/G9 to main (push gate) and send him the review pack | merged 8f489ee; pack sent |
| S-2 | Five menu posters in Maple's floating-island style (Higgsfield credits approved) | generated 2026-09-24 on Maple's recipe (z_image, 3:4); all five APPROVED by the owner ("Images look great!"); wired 97e685e (MENU_ART + per-world falling touch); the 13 menu steps of the push gate PASS on that build (two runs, a container restart between them); **on main** with S-3, push gate 73/73 |
| S-3 | Skylark, keep the theme and fix it: spread the field (everything sits in the central launch rows), brighter sunrise, more standing balloons, one landmark; his music | **on main** (merge b10685c): envelope in frame from 42.1% -> 90.4% of the island (rough 5.1 -> 98.5, shoulders 19.8 -> 84.5, verge 16.4 -> 86.1); standing 13.9% -> 32.5%; spawn frame luminance 0.371 -> 0.467 (Maple 0.553); the boot sweep had retired 42 envelopes (disc in the box), fixed for Skylark only; other five worlds hash-identical. qa/skylarkfield.mjs FAIL 6 -> PASS. Open: no upright envelope inside her first frame yet; the landmark skipped; his music track |
| S-4 | The hook: a 15-second store clip (the burp after eating the town) and App Store screenshots | |
| S-5 | His calls on the burp (?burp=1), the kill beat (?killbeat=1), the after-bite squint (flat lines vs ^ ^), the too-big bonk rate | he reviews on Vercel once main moves |
| S-6 | Mac day: iOS build (Capacitor, `pnpm build:ios`), TestFlight, App Store Connect | owner |
| S-7 | A short playtest with a few kids, fix what hurts, submit | owner |

He tests on Vercel on an iPhone 17 Pro Max, so the game HAS run on a real iPhone
GPU through WebKit, the engine the Capacitor app runs in; "nothing has ever run
on a GPU" below means none of the crew's own measurements.

---

## How an item moves

1. **Found** — by research, a studio team, a probe, or the owner. Enters as `LEAD`.
2. **Refuted or confirmed** — a skeptic opens the source and tries to kill it.
   A lead nobody could measure stays a lead. (GOVERNOR.md rule 1.)
3. **Ranked by the governor** — `P0` ships-blocking · `P1` the game is clearly
   worse without it · `P2` good, not now. Rank = fun impact × confidence ÷ cost.
4. **Built probe-first** — a probe that FAILS on the current build, then the fix,
   then the same probe passing. (GOVERNOR.md rule 2.) Numbers are ones actually
   run. (Rule 3.)
5. **Shipped** — push gate green, committed, pushed. Rendered and looked at if it
   is visual (STUDIO.md rule 1).

## The bar — when the loop stops

- No `P0` or `P1` open.
- Every studio team returns **SHIP** on its own surface, and art direction says
  it reads as one game.
- `qa/gate.mjs --profile=push` green on the tip, and the `quality` profile green
  (it holds the owner's own complaints — see Q1, Q2).
- Then: hand over ads + the App Store port for the owner's Mac day.

## Fixed — the governor enforces these and no team may trade them away

- Camera shake is **zero**. Powers stay **off**. The void is a **creature**, never
  replaced by a hole.
- No timers that pressure. 4+ stays 4+. A parental gate on any spend or exit.
- **No ads, no ad-skip currency — as of today.** The owner has asked to "figure
  out ads" *after* this loop. Until he decides, nothing ad-shaped is built, and
  nothing is designed to make room for one. (Note for that conversation: a game
  aimed at 6-11 year olds sits under COPPA whether or not it is in Apple's Kids
  Category, and the Kids Category itself forbids most third-party ads.)

**The list above is the owner's.** What follows is NOT — it is the crew's reading of
the research, and it was wrongly written into this list on 2026-09-23 as though he
had said it. The research governor then ranked a change to features he designed
(G2: the daily streak and the streak-gated skins) as a P0 "constraint breach" on the
strength of a rule he never stated. Corrected the same day, before anything was
built on it:

- *Crew practice, from research — his call wherever it touches something he
  designed:* fun that brings a child back rather than a hook that holds one.
  Bloomberg's 2026 investigation into kid-rated games using addictive design draws
  the line at streak-loss punishment, loss-aversion timers, near-miss manipulation
  and spend prompts inside play. Where a change on these grounds would remove or
  alter something the owner built, it goes to him as a recommendation, not into
  the build queue as a P0. (His own rule, "no timers that pressure", stands on its
  own and does not need this paragraph.)
- Ship via `git push` only. Never deploy by hand. Nothing reaches `main` without
  the push gate green.

---

## LEDGER

### Open

| id | rank | item | source | evidence / bar |
|---|---|---|---|---|
| Q1 | PART-MEASURED | **Bigger voids react to you — in Maple, measured.** Re-run 2026-09-23: maple **4.0 looks/min**, inside the 0.8-7 band; family joined 83%, whole gate open 41%. The old "0.0/min" predated two threshold moves. Pirate timed out waiting on the harness (1500 s) — no verdict, so no claim. | gate --profile=quality | Pirate needs a run that reaches its own conclusion |
| Q2 | **PASS** | **The shore launches the player?** No — measured. First the probe carried a stale copy of the steering formula (now reads `__matchState().steer`). With that fixed it read Pirate 1.51x against the 1.35x bar, timed on the MATCH clock — which runs on `dtw`, slowed to 6% by hitStop() while the void is steered on `dt` and never freezes. The probe now windows on `tClock` and prints the match-clock figure and hit-stop frames beside it. Re-run 2026-09-23 on the G1+G10 build: **Pirate 1.35x (20.4 u/s vs a 15.1 cap), Maple 0.99x — PASS**. Caveat, stated: no hit-stop fell in this run's peak windows (the match-clock figure also read 1.35x), so the hit-stop explanation of the earlier 1.51x is plausible but was not reproduced. The clamp itself holds exactly at its designed 1.35x. | qa/edgespeed.mjs; prototype3d.ts `dtw *= 0.06`, `tClock += dt`, the shore clamp | quality profile; promote to push after a second green |
| Q3 | LEAD | **Food pacing misses on four worlds** — F2 lantern 1.83s, gameday 2.11s, pirate 3.00s vs 1.5s; F1 powder 11.5% vs 20% | gate.mjs:350-355 | re-measure |
| A1 | LEAD | **SKYLARK FIELD has no match music** — plays the generic synth bed while five worlds play composed tracks | assetrefs KNOWN_NOWHERE `/assets/music/skylark.mp3` | owner may need to fetch a generated track (CDN egress is blocked here) |
| C1 | LEAD | **Two scrapbooks have no art** — POWDER and SKYLARK, 16 of 16 stickers missing each | assetrefs, 32 entries | |
| U1 | LEAD | **Emoji are the game's icon system, and they are platform art beside a hand-drawn HUD.** The probe freezes 10 on shop/picker/profile, but it walks only five menu screens. The source uses emoji for every world icon (🍁 🎈 🏴‍☠️ …), all six rank tiers (👑 💎 💠 🥇 🥈 🥉, prototype3d.ts:7381), the rarity tiers (🔹 💜 ⭐, :10021), the gem currency on every price and reward line, and the daily gift 🎁 — including the in-match HUD goal chip and the end card, which the probe has never looked at. The inline sheet already has 9 drawn symbols (ic-book, bag, cup, crown, gear, gift, medal, void, chev). | qa/pictograph.mjs, source read 2026-09-23 | an icon helper every string goes through + ~12 new marks drawn to the sheet's style (24-grid, flat fills, one soft highlight, reads at 22px); widen the probe to a live match and the end card FIRST so it fails on today's build |
| Q1n | note | rivalnotice's "0.0/min" in gate.mjs predates two threshold moves (1.2x -> 0.85x -> 0.75x, each set from a measured size distribution). Re-measure before treating Q1 as open. The code raises the real PLAY question itself: the rivals that "notice" you sit at 0.75-0.85x your size, so they cannot actually eat you — "making it literally true means raising the family's cap, which is a measured balance number, and that is his call". | rivals.ts:1430-1475 | |
| S4 | P1 | **Analytics has been silently dropped since the COPPA fix.** The deployed `ingest-events` (v1, unversioned until now) REQUIRES `user_id`; the client correctly stopped sending one. Every batch -> 400 `missing fields`. | read of the deployed function via the Supabase connector, 2026-09-23 | fix written: `supabase/functions/ingest-events/index.ts`. Deploy is production infra -> OWNER QUEUE |
| S2 | LEAD | **All 8 App Store screenshots show a menu the game no longer has** | readiness audit (store) | reshoot at the required sizes |

### Studio round 4 (2026-09-23) — NO-SHIP: the blockers and the order of work

The full record is docs/STUDIO-ROUND-4.md. Bar: **Donut County** (one
tessellation style per frame; faces as flat marks readable from the camera;
the reward lands on the drop). hole.io is the floor; Crossy Road the bar for
"many worlds, one game". Art direction: the six worlds do not yet read as one
game — glow does not mean light, "quiet ground, loud props" holds in two worlds
of six, and the hero is darker on the menus than in play.

**Held before main fast-forwards** (governor's precondition):
- G4 and G6 each have a frame a person has read — qa/hudshots.mjs (new).
- The NOMS pill has a named decision — see below.
- The end card plays at most one celebration within 0.5 s — qa/endparty.mjs (g).
- Job 1 (every frame anti-aliased).

**Decision on the NOMS pill (G6), recorded 2026-09-23.** It stays, as a
TRANSIENT and not a chip: it exists only while a chain of five or more is live,
beside the void, never on the HUD rails, and it is gone the instant the chain
cashes in. The owner's 2026-08-29 clutter complaint was about permanent chips;
this is not one. Its first tier was #8a5cff, a hair off the hero's own 0x9a5cff
and right beside him, against the style's rule that nothing wears his violet —
moved to teal #14a89a. **Owner: veto on sight if it reads as clutter** — the
frame is qa/out/hudshots/maple-noms.png.

| id | blocker / job | team | state |
|---|---|---|---|
| B5 / Job 1 | Every frame anti-aliased (G10 reopened) | LIGHT | **DONE** 2a17344 — qa/aamsaa.mjs (a'), scene-target samples on six consecutive renders: before **4, 0, 4, 0, 4, 0** (BAD), after **4, 4, 4, 4, 4, 4** (ok). Edge blend 29.5% → 29.7% on the frame each happened to catch; native AA on the same frame 32.6-33.4%. |
| B6 / I-2, I-8 | No current frame of the in-match HUD or the G4 end | UI | **frames read** — qa/out/hudshots/: the pill (gold 12 NOMS off his face, +49 in flight, no per-bite numbers), the party (confetti out of the void, pill gone), the card. The card frame's confetti is re-shot (a wall-clock removal beat the software shutter). Two things the frames showed and fixed: the pill stayed up through the outro, and a form-up's evolve() played over the whistle (281c29a). |
| — | End card stacks finale + evolve + win in one millisecond | AUDIO | **DONE** — finale(cheer): the motif, then ONE cheer 0.76 s later; endparty (g) before "win+evolve 0 ms apart", after "finale then win, never two within 0.5 s" |
| Job 0 / I-1 | The pack photographs what a child sees: `__settleCam()`, hide-HUD stylesheet, width check (frames are ~37% too close) | QA | **DONE** — qa/shippedlook.mjs width check, Maple: before **FAIL**, hero 0.599 of the frame against 0.417 settled (camera 69.7, aim 85.8), 43.6% off; after `__settleCam(4)` **PASS**, camera on its aim (86.1), 0.441 against 0.421, 4.7% off (bar 5%; the remainder is the studio's lens constant, the camera itself is exact). HUD hidden by a marked-class `!important` sheet, so addCoins cannot write the chip back. Frame read: qa/out/shippedlook/maple_job0after.png. The other five worlds' pack reshoots with the next lookbook. |
| B2 / Job 2 | Maple crowns carry 603 faceted "dapple" spheres — one mass each | STATIC | **DONE** b8cda42 — dapples deleted (−480 tris a tree, ~289k across Maple, seeded stream untouched); roundlod ratchet 153→152 / 39320→39240: FAIL before, PASS after. **Crop read** on the settled frame (maple_job0after.png): the nearest red, orange and yellow crowns read as one lobed mass each — no dots, not a lollipop. The three-dapple fallback is not needed. |
| B1 / Job 3 | Leaf drifts painted onto the square's walks (two coffee stains in the opening frame); Pirate sand chroma rider | GROUND | **Maple half DONE** — qa/leafsurface.mjs (bake diffed against ?qaleaves=0, Math.random seeded in both): leaf texels off the grass **16,866 → 7** (bar 20); on grass 39,651 → 37,212. Lobes are filled only on green-dominant ground, every dr() still drawn; the protest patch is a worn-grass falloff on grass only. The probe's first two designs measured the wrong thing (colour-only flagged 1,520 texels of plain cream sand; the unseeded diff counted randomly placed beach towels) — both recorded in the probe. **Pirate sand rider: OPEN, needs an art call.** Measured on the settled frame (Job 0): the pale cream round the spawn is mostly the PROMENADE deck (#fdf3de band, quiet('#efe0c2') core), not sand, and at the bay's 0.35 dial sand and deck paint the same cream (≈231,226,212). The rider as written (sand named at 0.6 at all three sites) left a warm-light screen sample at 0.098 because that sample was mostly deck, and it FAILS qa/groundtruth.mjs separation: sand at 0.6 against the resort floor #ffcf8a at 0.35, dE 20.8 → 5.8. Naming the beach district at 0.45 did not move the frame either. What is needed: an art call on sand vs deck vs resort floor (three creams on one island), and a probe that tells sand from deck by paint, not colour (a ?qasand hook, as ?qaleaves does for Job 3). The draft probe is parked, not committed. |
| B7 / Job 5 | Paint glows (Maple planters halo in the first frame) | LIGHT | **DONE** — see X2 below: qa/halocensus.mjs v2 on all six worlds, Maple 75 hot cells and Pirate 2 before, 0 and 0 after (per-world bloom cut + petal sheen on both flower builders) |
| B3, B4 / Job 4 | Walking people's eyes buried by hair shells and caps | MOTION | **DONE** (merged 7b8eabb; three review rounds) — node: qa/faceray.mjs (E) eyes on INK for every Hair x Hat at 46/55/65 outside sun/straw/captain, lowest 69% (beanie at 65); (M) a frozen mouth ratchet; (H) every hat colour, dress-code or authored, clears dE 15 from shirt and skin (31,478 outcomes, closest 15.0) — before: 120 of 126 combinations under 50%, 254 colour collisions. qa/_headcover.mjs FAIL -> PASS. Browser: qa/faceline.mjs on main FAIL (no hook) -> PASS, 486 heads (81 under a convention); Gameday caps 27 heads PASS. **I-3 read** (maple_55 cap/helmet/snorkel, crops): two eyes and a smile under every brim, the tipped helmet still a helmet, the snorkel mask up on the forehead like goggles. Review fixes: the snorkel exemption withdrawn (mask moved), the helmet's floating face bar deleted, authored hat colours re-shaded to clear. Six fixed-colour hats named as outside the rule, with their shirt dE. |
| Job 6 | The first two people she sees: chest ruff, eyes proud of the skull | MOTION | **DONE** (merged d663a06) — chest top 0.40T -> 0.34T (no ruff), a lens eye inside the 0.3563T outline and 0.0058T proud, with a visible-ink floor (0.0052/0.0044/0.0032 T² at 46/55/65); the mouth frozen by ratchet pending its art call; makeTownsfolk's three draws hoisted in their current order (seeded stream unchanged, townface check 1). qa/townface.mjs (node) FAIL 5 checks -> PASS, in push. qa/personsheet.mjs on main FAIL (subject 2 shows the back of his head) -> PASS; the bowler man read: facing the camera, two eyes, a smile, no collar ruff. |
| Job 7 | One HUD, and screens without ghosts (timer/news behind the card, countdown stroke, chips, glyphs) | UI | **DONE** (merged 41acba4) — main -> branch: qa/endghost.mjs 4/6 FAIL -> 6/6 PASS; qa/modalin.mjs 5/5 FAIL -> PASS; the 44px targets (#soloTog, scrapbook tabs) 13 violations -> PASS; glyphs, ovlwire, sheetbox (node) FAIL -> PASS. **Countdown placed**: top 33% -> 62%, from qa/countdown.mjs's own band reading; face-box overlap 56.5/57.1/51.6% -> 0.0% at three phone sizes, 6/6 PASS. The ghost rule also names #goal and #growth (the hudshots read found the goal chip over Lantern's and Powder's cards). Knock-ons fixed at integration: pictograph/pickerfit/lockedcards run --atrest in push (the unflagged pictograph walked 0 nodes behind modalIn; at rest it found two settings emoji that main has too — debt, 12 known); menuquiet bar C arms on live bubbles, bar B on 40 s of tClock (it read 0/16 on main under load). |
| Job 8 | The void alive at spawn (motion normalised to the settled cap, hurt face, wind-up) | HERO | **DONE** (merged bcd2a1b) — node: motionlaw (motion >= 0.85 at every settled radius, worst 1.000 at r 0.9; lean >= 5.67°; flip at 0.25 vRef), moodrule, mouthwind, each FAIL on main -> PASS. Browser on main vs branch: heromotion FAIL (no readback; the old law reads 0.359 at spawn) -> PASS 0.99 at r 0.9 and 1.00 at r 8; moodrule live FAIL -> PASS (hurt lid 0.20 shut 1); mouthwind live FAIL -> PASS (the gather comes before the jaw on a real bite). juice 3/4 channels + the smug face on frame 2. Owed: a person's read of the hurt face — qa/moodsheet.mjs frames three of its four moods cropped inside his face (the void had grown through a 28-link spree before the shot); the sheet's framing is a QA fix. |
| B7 / Job 9 | Lantern Night's lanterns light up; umbrella and moss rock | LIGHT + STATIC | **DONE** (merged 0887367 + 66526eb) — a luminance floor on PROP_GLOW_MAT that rides each world's bloom cut (1.35/1.05 x cut, gain cap 5.0; the gated-prop grey no longer clones lamps). Node: qa/emitters.mjs FAIL (20 of 20 lamp colours under 1.2x the cut) -> PASS (all at 1.29x); qa/propfit.mjs FAIL (ribs through the paper, pole off the apex, feet floating, moss inside the rock) -> PASS 9/9 incl. the spec's literal moss bar (31.1% above the rock's top, worst of 200) and a moss cap laid on the stone. Browser: qa/lampglow.mjs Lantern on main FAIL (71 lamps on a clone) -> PASS 6/6 on-screen lamps halo. **Hero wash, found and tuned:** with every lamp lit, the shipped bloom's haze reached the void (DPR 2 sat loss 0.053 main -> 0.154); Lantern now blooms at 0.2 strength / 0.1 radius — 0.032 at DPR 2, 0.074 at DPR 1 (main 0.078), ~1.6-1.8x main's glow; frames main / untuned / tuned read: the lanterns glow warm and tight, the void crisp. halocensus PASS on all six worlds. |
| Job 10 | The alarm means danger and only danger; no square waves | AUDIO + PLAY | **DONE** (merged 0887367) — a rival joining plays ready(); losing the lead no alarm and no red; a locked dot a soft non-eat 'not yet' (not pop()); the charge's red wash from her side; hit() and alert() on triangle + sine. qa/eightbit.mjs (node) FAIL (square oscillators) -> PASS 0; qa/lnalert.mjs (node) FAIL (first voice at 2.0 s under a recording) -> PASS 0.000 s; qa/dangerchannel.mjs on main FAIL 4 of 5 -> PASS. chomp PASS. |
| Job 11 | The bite pays off on the swallow (sound lands 170-290 ms before the sink) | CHOREOGRAPHY | **DONE** (merged 0887367) — the pop, voice and haptic fire as the meal starts to sink; hit-stop, puff and impulse on the swallow; the evolution ceremony waits for the swallow of the meal that earned it (a pure hold in src/proto3d/evohold.ts — the growth law's rate limiter had cancelled it in a real match; qa/evohold.mjs 7 bars, node); the end-beat decision is taken when the sound plays. qa/bitetime.mjs on main FAIL -> PASS (every bite heard as its meal goes in); qa/juice.mjs (a) on main 0/4 -> 3/4. endbeat 6/6, nomstream 8/8, endparty 8/8, evolveonce, pausechain, mouthwind all PASS on the merge. |

### Every world, not only Maple — and the verify pass (2026-09-23)

The owner asked whether the round's work was "just for maple or every level".
It had been measured on Maple. Each probe below was then run on all six
worlds; what failed was fixed and re-measured. And the verify pass on the
pre-merge fixes (5 verifiers + a regression hunter) left residuals and three
minor regressions, each closed here against a probe that failed first.

| id | item | before | after |
|---|---|---|---|
| X1 / G6 | Flights sized so a big bank looks big — on every world | qa/nomstream.mjs on the G6 build: Maple, Pirate, Powder, Skylark 8/8; **Gameday (c) 1.36x, Lantern (c) 1.31x** (bar 1.4x). The flights in order showed why: below the recent average the scale stopped at 1, so a +21 after a run of +50s flew at the same 20px as the +35 that opened the spree | the same law runs down to 0.85 (17px): **Gameday 17.0→27.2px = 1.60x PASS, Lantern 17.0→26.2px = 1.54x PASS**, both 8/8 — exactly what the recorded sequences predicted. **G6 now holds on all six worlds.** |
| X2 / Job 5 | Glow means a light — on every world | qa/halocensus.mjs v2 (below): **Maple FAIL 75 cells** (white planters and sign lettering lit to L 1.177 against a 1.05 cut); **Pirate FAIL 2 cells** (specular sparks at 2.6 off blossoms that four of mainstreet's "lacquered round things" hexes make gloss 0.42 in every world); Gameday, Lantern, Powder, Skylark PASS (paint ceilings 0.70, 0.31, 0.62, 0.42; Lantern's 26,606 over-cut pixels are all lanterns) | per-world `WorldLight.bloomCut` (Maple 1.25, scaled by the hour's sun, floored at 1.05) and blossoms at the canopy's 0.14 sheen: **Pirate PASS** (0 over the cut; brightest 1.00, was 2.6). **Maple 75 → 2 cells** — the last two were sparks to 2.9 off the PLANTER's own blooms (mainstreet makePlanter, the same lacquer hexes, a second builder): same petal sheen — **Maple PASS**, 0 over the cut (brightest 1.23 against 1.25). **Glow means a light now holds on all six worlds**; the four that passed before are untouched by a cut that only moved in Maple and a sheen that only went down. |
| X3 | The end beat belongs to the whistle | qa/endbeat.mjs on 641b9cd: **4/6 BAD** — the winning bite crowned the chain (nomCrown, then the whistle a frame later); LEAVE from a pause inside the outro still raised the results card and the finale on the menu; the outro ran out under the pause sheet | **6/6 PASS** on bd38108's build — no crown on the winning bite (calls: pop pop whistle), menu up and no card or finale after leaving, the outro held under the sheet and the card came 2.00 s after KEEP PLAYING (exactly the outro left) |
| X4 | The end beat's rival is heard | qa/chomp.mjs part 6: the plain pop() the review fix used, 20 ms after a bite: **-183 dBFS** (silent — pop's 75 ms gate) | chomp(…, plain): **-30.5 dBFS**, tail identical to a bare pop (no glock, no duck). PASS |
| X5 | The top of the crown ladder is not a whistle in her ear | qa/chomp.mjs part 7, energy above 7 kHz by FFT: crown at 110 **-8.3 dB** (sparkle at 6.3/8.4/10.5 kHz) against the old ceiling's -34.1 | partials over 6 kHz fold down an octave: **-35.5 dB**. PASS. (The first reading used a one-pole cascade that leaked the crown's own 2-3 kHz triad into the band; replaced by an FFT and A/B'd on the same measure.) |
| X6 | PLAY honours BY MYSELF | menu PLAY and the pips called startFresh(false): the persisted toggle held only through the world picker. qa/solotog.mjs re-pointed at one-tap PLAY (it still clicked PLAY expecting the picker) with a PLAY bar. On 641b9cd: **FAIL 2/10** — toggle on, PLAY started the 3:00 race (clock 160 s, 2 rivals joined) | startFresh(soloOn()) at PLAY and the pips: **PASS 10/10** — PLAY with the toggle on starts the 2:00 solo match (clock 100 s, 0 joined) |
| X8 / G4 | Every match ends as a party — on every world | qa/endparty.mjs had run on Maple only (8/8 PASS after G4) | on the verify-pass build: **Pirate, Gameday, Lantern, Powder, Skylark 8/8 PASS each** — a whistle and no evolve at both doors, 'victory', 140 confetti before the card, 40 on it, no lose(), never two celebrations within 0.5 s. **G4 holds on all six worlds.** |
| X9 / B6 | The HUD, the party and the card — frames a person has read, on every world | qa/out/hudshots/ had Maple only | qa/hudshots.mjs on main (05c5842) for Pirate, Gameday, Lantern, Powder, Skylark, 3 frames each, **read**: the NOMS pill sits beside the void and off his face on all five, one flight in the stream; the party is confetti out of the void with the victory face on all five; the card reads DONE with the pips. **One defect found by reading:** on Lantern and Powder the in-match goal chip ("EAT 40,001 / 40,000") shows through at the top of the results card. It is a Job 7 ghost, and #goal is missing from the spec's hide list — folded into Job 7. Minor: Lantern's +52 flight crosses a speech bubble on its way to the bar (transient). |
| X10 | Found while verifying Jobs 9-11 (pre-existing on main, open) | qa/postpipe.mjs: composed-at-zero differs from direct by Δval 0.024-0.039 on four worlds (contract 0.02) — on main too; and its "hero survives glow" disc was the ground under him (fixed: centred on his body at the settled camera). qa/placement.mjs lantern: 3 big props in water, 1 off-island, 2 overlaps — identical on main. qa/moodsheet.mjs framed three moods inside his face (fixed: shot after the descent at his projected disc) — the hurt face now reads: eyes squeezed to lines under knitted brows, a sweat drop. | open: postpipe equivalence (LIGHT) and Lantern placement (STATIC) |
| X7 | Smaller residuals | duckMusic's deeper floor survived the release ramp; OPEN SHOP and LEAVE did not cancel a queued cheer; the bite bank paid under the pause sheet; the ferris wheel's cross tie ran through both rims | fixed in bd38108 (by reading; the cheer and pause paths are inside X3's drive) |

**Merged to main at 05c5842 (2026-09-23), push gate 58/58.** The full run
passed 45 steps; 13 (splash through menuquiet, one contiguous window) died on
"browser has been closed" or before printing a verdict while four day-2 fix
agents were busy on the box. The cause was not pinned down (no OOM record);
nothing in them is a game check failing. Re-run alone on the same dist with
nothing else on the machine: 13/13 PASS. Lesson kept: the gate runs with the
box to itself, and no agent work of any kind overlaps it.

**Merged to main at cf34244 (2026-09-23), push gate 67/67 in one run**, the box
to itself: studio Jobs 4, 6, 7, 8, the countdown placed, the pictograph and
picker probes at rest, menuquiet on the game clock.

**Merged to main at e6fb947 (2026-09-24), push gate 73/73 in one run**, the box
to itself: studio Jobs 9, 10, 11, the moodsheet reframe, Lantern's tight lamp
bloom (0.2 / 0.1), postpipe's hero disc on his body, shippedlook's settled-aim
bar. A first run was cut at step 14 by a container restart (13/13 passing to
that point); the recorded run is the full re-run from the top.

**Merged to main at 8f489ee (2026-09-25): research G5, G7, G8, G9.** Push gate
72/73 in one run with the box to itself; the one miss, emitters, aborted on a
missing stub for G5's voiced() tag in the world files (probe harness, not
game). Stub added, and emitters re-run through the gate alone: PASS. No src
changed between the gated commit (6c4feb6) and main. Before the gate, 15
browser probes on the merged build all PASS (eatvoice, nowfood, nowfoodsound,
timebeat, killbeat, savour, burp, endbeat, endparty, nomstream, juice,
heromotion, dangerchannel, bitetime, chomp). The merge also fixed a push-gate
probe no item had run: G9's comment quoted evoHold.due(), which evohold's
wiring bar counts as text.

**Merged to main (2026-09-25): the five menu posters and Skylark (ship mode S-2,
S-3).** Push gate 73/73 in one run, the box to itself.

**halocensus v2, and why v1 was retired.** v1 measured the RESULT — pixels
bloom lifted by 3+ L* more than 16 px from a light — and condemned Lantern's
lanterns (a lit table's haze reaches ~200 px, all 405 "hot" cells) while
reading "nothing measured" on three worlds where nothing crosses. v2 measures
the SOURCES: the frame rendered linear as RenderPass hands it to bloom, every
pixel's luminance against the pass's own threshold, and a mask of the things
that are lights. Same bar size (no 32 px cell of 40+ off-light sources).

Research items G5, G7-G29 wait until these blockers close (governor).

### The research governor's build order (2026-09-23)

Five research lenses (genre, retention, feel, audio, graphics) against a source inventory; 14 agents; the governor's verdict, verbatim: *"No. It is not AAA yet, and today it would not reliably bring a 6-11 year old back."*

| id | rank | item | team | cost | status |
|---|---|---|---|---|---|
| G1 | P0 | Every child's first match is Maple dot 1, and no match ever nags | PLAY + UI | hours | f20e21c — qa/firstrun.mjs before (dist-base): (a) goal 0, (b) timer rgb(255,138,138) + "EAT FASTER!!", (c) solo dot 4 joined 0/3 by t=16. After (dist): (a) ok goal=1 from the first armed frame; (b) ok timer rgb(255,255,255), no EAT FASTER; (c) ok 2 rivals joined by t=16. **PASS 3/3 — DONE** |
| G2 | OWNER | Pull out every calendar hook: missing a day costs nothing | PLAY | a day | OWNER DECISION — removes the daily streak and streak-gated skins he designed; the rule it enforces is the crew's, not his (see Fixed). Recommended: yes — his "come back and your void turns SHINY" survives as a count-up. |
| G3 | P0 | The biggest bite makes the biggest sound: CHOMP and eating a rival | AUDIO | hours | **DONE** d529a31 — CHOMP −20.6 dB → +3.4 dB vs a big bite; rival +26.2 dB; 50 buffers → 1 (call sites land with G1) |
| G4 | P1 | Every match ends as a party in the world, with its own whistle | CHOREOGRAPHY + AUDIO | a day | **DONE** aeffe9d, 7a7f7ef, 2a17344, 281c29a — qa/endparty.mjs before (pre-G4 build, instrumented): **8/8 BAD** — evolve() at both end doors; 'cruise' on a dot won from 3rd; 0 in-world confetti; 16 card confetti; lose() on a 3rd-place card; win+evolve 0 ms apart on the card. After: **8/8 PASS** — a whistle and no evolve at both doors; 'victory'; 140 confetti scraps before the card; 40 on it; no lose(); "finale then win, never two within 0.5 s". Per-world whistle + motif, ticks and bonk: qa/chomp.mjs parts 4-5 before BAD, after PASS. Frames read: qa/out/hudshots/maple-party.png. Not done from the spec: victoryHop (folds into G9, HERO). |
| G5 | P1 | What you eat talks back | AUDIO | days | **DONE** da91d9b (merge) — nine eat voices (meep, wheee, baa, quack, crumble, rustle, crinkle, squeak, poof) under the pop, one per 0.35 s, alternating sides; the pop's transient varies, its note never does. qa/eatvoice.mjs: FAIL 20 of 21 on the instrumented pre-fix build, PASS 24 on the merge. Review caught Skylark's bagged balloons crumbling like houses (now squeak). Open: Maple says 5 of 6 voices, because its pond ducks never spawn (an older bug); owner's call. |
| G6 | P1 | One number stream a child can read, and a chain she can see | UI | a day | **DONE** 796a246, aeffe9d, 4c11aa4 — qa/nomstream.mjs before (dist-base, Maple, 25-bite spree, probe counting only RISING floaters): **8/8 BAD** — 23 per-bite '+N', 5 decimal COMBO floaters, flights 20px→20px across banks 33→80, no crowns for a chain of 25, no cash-in, no pill, no chain sound, 0/2 flights in the beat colour. After: 7/8 — (a) 0 per-bite, (b) 0 decimal, (d) crowns 10, 20 for a chain of 27, (e) "27 NOMS! +464" 1.55 s after the last bite, (f) pill on 118/120 chain-5+ frames, 0 stray, 0 over the face, (g) 2 crowns + 1 cash-in heard, (h) 2/2 flights in the beat colour. (c) failed twice on FIXED size scales: the spec's formula 1.30x, a meal term on `bite` 1.13x (saturated: early in a match nearly every meal is "big" to him, so every number was 40px). Now sized against her own recent average bank: **(c) 20.0px → 34.4px = 1.72x across banks 39→104. PASS 8/8.** Chain sounds: qa/chomp.mjs part 3 before 3/3 BAD, after PASS. |
| G7 | P1 | 'Now I can eat that!' is heard and seen | PLAY + AUDIO | days | **DONE** e49a1a8 (merge) — outgrown sibling announced once (float, outgrow(), startled look, 'uh oh...'), un-gate wave with one class float and a sparkle, bonk(ratio) on a too-big prop. qa/nowfood.mjs PASS 16, qa/nowfoodsound.mjs PASS 7 on the merge. ringcount AWAY share: pre-fix windows alone ranged 15-29%, and G7 adds no ring. Owner to judge the bonk rate (39/min in a chase-heavy census). |
| G8 | P1 | Time, not the camera, sells the marquee moments | CHOREOGRAPHY | a day | **DONE** 3fca2cb (merge) — ships ON: hero clock through a hit-stop, 60 ms ease out, flash governor, rival path's no-op shake/punch/kick and overwritten gold flash gone. Behind ?killbeat=1 for the owner: the kill's 0.14-0.16 s freeze, slow 0.25, dizzy pupils, one ray pulse; landmark/sticker/evolution/goal-met beats. qa/timebeat.mjs PASS on the merge; qa/killbeat.mjs sheets to the owner. |
| G9 | P1 | Follow-through: he savours it, and the BURP OF CHAMPIONS finally exists | HERO | a day | **DONE** 842eb81 (merge) — ships ON: cheek puff, second gulp wobble, happy squint, G4's victoryHop. Behind ?burp=1 for the owner's ear: the burp (0.25 s, no partial under 120 Hz), once per 20 s, never over the whistle or a ceremony. qa/savour.mjs PASS 12, qa/burp.mjs PASS 7 on the merge. Owner art call: the squint as flat lines vs ^ ^. |
| G10 | P1 | Anti-aliasing back on the two best rungs | LIGHT | hours | **DONE (Job 1, 2a17344; reopened by studio round 4 and closed the same day)** — bb1430b gave the composer a 4-sample scene target, but RenderPass draws into `readBuffer`, the composer starts with readBuffer = the 0-sample clone, and OutputPass swaps every frame: the scene alternated 4, 0, 4, 0 — a 30 Hz shimmer the probe passed, because bar (a) read renderTarget1.samples once. The 29.6% edge reading was a frame that happened to be multisampled. Fix: OutputPass `needsSwap = false`, readBuffer pinned to the multisampled target. Probe bar (a') records readBuffer.samples on six consecutive renders. Native AA reference on the same frame 32.9%; bar (b) 35% still unmet by MSAA alone (G10b). |
| G10b | P2 | A post-process AA pass (SMAA) on the bloom rungs, if a real phone can pay for it | LIGHT | hours + a device | queued — cost unmeasurable here (no GPU); needs the TestFlight run |
| G11 | P1 | The WORLD ENDER minute survives a phone: the crowd stops casting shadows | STATIC + MOTION | days | queued |
| G12 | OWNER | Win the dot, keep the show: bank the goal and play on to the bell | PLAY | a day | OWNER DECISION — reverses his 2026-09-06 decision 1 (a won dot ends the match on the spot). |
| G13 | P1 | Progress pays: stars on every dot, a cousin for every world, a party at 30/30 | PLAY + UI | days | queued |
| G14 | P1 | Scale she can feel: 'as big as a HOUSE!', a town that gasps, and a before-and-after | UI + CHOREOGRAPHY | days | queued |
| G15 | P1 | Worlds that breathe: snow, fireflies, falling leaves | MOTION | days | queued |
| G16 | P2 | Growth that keeps accelerating: an exponential ceiling | PLAY | days | queued |
| G17 | P2 | Mouthful: the big meal sits in his cheeks before the gulp | HERO | days | queued |
| G18 | P2 | He wants it: his eyes find the big meal before he eats it | HERO | days | queued |
| G19 | P2 | Pals: a creature collection earned by play, plus secret pals for silly deeds | PLAY | days | queued |
| G20 | P2 | The void's-eye dictionary: a joke the first time she tastes each thing | UI | days | queued |
| G21 | P2 | Wonders: about one match in four, something amazing wanders through | CHOREOGRAPHY | days | queued |
| G22 | P2 | A void with her name, a goodnight and a good morning | UI | days | queued |
| G23 | P2 | SNAP: a photo of the WORLD ENDER over the half-eaten town | UI | a day | queued |
| G24 | P2 | The recorded music opens up as you grow | AUDIO | hours | queued |
| G25 | P2 | Water you can splash through, in every world that has it | GROUND | days | queued |
| G26 | P2 | Soft, cool shadows | LIGHT | a day | queued |
| G27 | P2 | Progress survives the phone | PLAY | days | queued |
| G28 | P2 | Props into BatchedMesh, sized from the phone | STATIC | a week+ | needs an owner asset |
| G29 | P2 | Every bite and stinger in the key of the track | AUDIO | a day | needs an owner asset |

Full change + probe text for every item: the research workflow journal; each is copied into the item's commit when it is built. Rejected by the governor, with reasons, include: drums over the recordings (owner vetoed twice), ground rings behind the void (owner item 4, 2026-08-25), new HUD chips (owner clutter complaint, 2026-08-29), earnable hats (his revenue and his economy line).

### Research and review — in flight

- Top-games research: genre ancestors, kids' retention, feel, audio, graphics — and
  an inventory of what this game actually has, read from source, so every
  recommendation is a concrete gap rather than generic advice.
- Studio round 4 on the 2026-09-23 lookbook — DONE: NO-SHIP, seven blockers, twelve
  jobs (above; docs/STUDIO-ROUND-4.md).
- Re-measuring the owner's complaints: `gate.mjs --profile=quality
  --only=edgespeed,rivalnotice,food` (Q1-Q3).

### Owner queue — only he can do these

| item | why only him |
|---|---|
| Approve deploying the fixed `ingest-events` function (S4), and check `vd_events.user_id` is nullable first | production Supabase — outward-facing infra |
| **G2** — replace the daily streak with a count-up? Today missing a day resets the streak to 1, steps the daily calendar a week down, and two skins (Ember, Prism) need unbroken days; the drops escalate to "the BIG one — more tomorrow". Proposal: Ember = play on 2 different days, Prism = 7 different days, the calendar counts days played, one flat drop per match. Anyone who owns them keeps them. | it changes features he designed, on a rule the crew wrote, not him |
| **G12** — when she wins a dot, keep playing to the bell? Today on 4 of 5 dots a winning child is cut to the end card before the ×3 finale set piece and WORLD ENDER — the best minute in the game. Proposal: bank the win, let the match run to the buzzer. | it reverses his 2026-09-06 decision 1 |
| Download the two missing posters into `public/assets/hf/` (maple, skylark) | CDN egress is blocked from the crew's environment. URLs are in the 2026-09-22 conversation and resolve from any browser |
| Decide on ads | reopens a standing constraint — see Fixed |
| App Store Connect: record, 17 IAP products, Paid Applications agreement, banking/tax, support URL, age-rating questionnaire, privacy label | account-holder only |
| A real iPhone + TestFlight | nothing has ever run on a GPU; every frame measured to date is software-rendered |

### Refuted

| id | lead | why it died |
|---|---|---|
| S1 | "The privacy policy promises no persistent identifier while telemetry sends the child's IP to Supabase" | Read the deployed function: it writes client_ts, user_id, session_id, event, props, app_version, platform — no IP column. Analytics is off by default behind the parental gate, `vd_uid` is removed AND actively deleted on load, and the session id is never persisted. The policy is accurate about what is kept. (What the read turned up instead is S4.) |

### Done this loop

| id | what | commit |
|---|---|---|
| S3 | `?iapmock=1` handed every paid item out free on the public URL. Measured open (public host: "BUY · $2.99"), measured shut ("$2.99 · ON THE APP STORE"; 127.0.0.1 still "BUY" for QA), gated in push as `iapmockhost` | 922e090, 1b3aa57 |
| D1 | RELEASE-GATE.md stops copying the gate (5 steps listed vs 55 run; five worlds vs six; no quality profile) and points at `--list` | 6c0200f |
| — | Lookbook: PASS, every surface; all six play frames with the hero measured in | f15c564, 076179f, 1b3aa57 |
| — | Ferris wheel promoted from dead-GLB fallback to the real prop; 15 draw calls -> 1 | 211a0e8 |
| — | PLAY AGAIN stranded the hero 26u in the sky — proven by A/B, two builds one line apart (groupY 0.81 vs 26.81) | e7d0d63, 1939b53 |
| — | Every person has a mouth; both eyes actually drawn; static townsfolk under the facet bar | db37367, ff3c658 |
