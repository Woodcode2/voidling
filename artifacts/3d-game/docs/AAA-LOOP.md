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
| Job 0 / I-1 | The pack photographs what a child sees: `__settleCam()`, hide-HUD stylesheet, width check (frames are ~37% too close) | QA | queued, day 1 |
| B2 / Job 2 | Maple crowns carry 603 faceted "dapple" spheres — one mass each | STATIC | **DONE** b8cda42 — dapples deleted (−480 tris a tree, ~289k across Maple, seeded stream untouched); roundlod ratchet 153→152 / 39320→39240: FAIL before, PASS after. The crop of the nearest maple waits for Job 0's settled frame. |
| B1 / Job 3 | Leaf drifts painted onto the square's walks (two coffee stains in the opening frame); Pirate sand chroma rider | GROUND | **Maple half DONE** — qa/leafsurface.mjs (bake diffed against ?qaleaves=0, Math.random seeded in both): leaf texels off the grass **16,866 → 7** (bar 20); on grass 39,651 → 37,212. Lobes are filled only on green-dominant ground, every dr() still drawn; the protest patch is a worn-grass falloff on grass only. The probe's first two designs measured the wrong thing (colour-only flagged 1,520 texels of plain cream sand; the unseeded diff counted randomly placed beach towels) — both recorded in the probe. Pirate sand rider waits for Job 0's settled frame. |
| B7 / Job 5 | Paint glows (Maple planters halo in the first frame) | LIGHT | **fix in, after-reading pending** — see X2 below: measured on all six worlds (Maple and Pirate fail), per-world bloom cut + petal sheen |
| B3, B4 / Job 4 | Walking people's eyes buried by hair shells and caps | MOTION | queued, day 2 |
| Job 6 | The first two people she sees: chest ruff, eyes proud of the skull | MOTION | queued, day 2 |
| Job 7 | One HUD, and screens without ghosts (timer/news behind the card, countdown stroke, chips, glyphs) | UI | queued, day 2 |
| Job 8 | The void alive at spawn (motion normalised to the settled cap, hurt face, wind-up) | HERO | queued |
| B7 / Job 9 | Lantern Night's lanterns light up; umbrella and moss rock | LIGHT + STATIC | after 0-8 |
| Job 10 | The alarm means danger and only danger; no square waves | AUDIO + PLAY | after 0-8 |
| Job 11 | The bite pays off on the swallow (sound lands 170-290 ms before the sink) | CHOREOGRAPHY | after G4/G6 verified |

### Every world, not only Maple — and the verify pass (2026-09-23)

The owner asked whether the round's work was "just for maple or every level".
It had been measured on Maple. Each probe below was then run on all six
worlds; what failed was fixed and re-measured. And the verify pass on the
pre-merge fixes (5 verifiers + a regression hunter) left residuals and three
minor regressions, each closed here against a probe that failed first.

| id | item | before | after |
|---|---|---|---|
| X1 / G6 | Flights sized so a big bank looks big — on every world | qa/nomstream.mjs on the G6 build: Maple, Pirate, Powder, Skylark 8/8; **Gameday (c) 1.36x, Lantern (c) 1.31x** (bar 1.4x). The flights in order showed why: below the recent average the scale stopped at 1, so a +21 after a run of +50s flew at the same 20px as the +35 that opened the spree | the same law runs down to 0.85 (17px): **Gameday 17.0→27.2px = 1.60x PASS, Lantern 17.0→26.2px = 1.54x PASS**, both 8/8 — exactly what the recorded sequences predicted. **G6 now holds on all six worlds.** |
| X2 / Job 5 | Glow means a light — on every world | qa/halocensus.mjs v2 (below): **Maple FAIL 75 cells** (white planters and sign lettering lit to L 1.177 against a 1.05 cut); **Pirate FAIL 2 cells** (specular sparks at 2.6 off blossoms that four of mainstreet's "lacquered round things" hexes make gloss 0.42 in every world); Gameday, Lantern, Powder, Skylark PASS (paint ceilings 0.70, 0.31, 0.62, 0.42; Lantern's 26,606 over-cut pixels are all lanterns) | per-world `WorldLight.bloomCut` (Maple 1.25, scaled by the hour's sun, floored at 1.05) and blossoms at the canopy's 0.14 sheen: **Pirate PASS** (0 over the cut; brightest 1.00, was 2.6). **Maple 75 → 2 cells** — the last two were sparks to 2.9 off the PLANTER's own blooms (mainstreet makePlanter, the same lacquer hexes, a second builder): same petal sheen; re-reading PENDING |
| X3 | The end beat belongs to the whistle | qa/endbeat.mjs on 641b9cd: **4/6 BAD** — the winning bite crowned the chain (nomCrown, then the whistle a frame later); LEAVE from a pause inside the outro still raised the results card and the finale on the menu; the outro ran out under the pause sheet | **6/6 PASS** on bd38108's build — no crown on the winning bite (calls: pop pop whistle), menu up and no card or finale after leaving, the outro held under the sheet and the card came 2.00 s after KEEP PLAYING (exactly the outro left) |
| X4 | The end beat's rival is heard | qa/chomp.mjs part 6: the plain pop() the review fix used, 20 ms after a bite: **-183 dBFS** (silent — pop's 75 ms gate) | chomp(…, plain): **-30.5 dBFS**, tail identical to a bare pop (no glock, no duck). PASS |
| X5 | The top of the crown ladder is not a whistle in her ear | qa/chomp.mjs part 7, energy above 7 kHz by FFT: crown at 110 **-8.3 dB** (sparkle at 6.3/8.4/10.5 kHz) against the old ceiling's -34.1 | partials over 6 kHz fold down an octave: **-35.5 dB**. PASS. (The first reading used a one-pole cascade that leaked the crown's own 2-3 kHz triad into the band; replaced by an FFT and A/B'd on the same measure.) |
| X6 | PLAY honours BY MYSELF | menu PLAY and the pips called startFresh(false): the persisted toggle held only through the world picker. qa/solotog.mjs re-pointed at one-tap PLAY (it still clicked PLAY expecting the picker) with a PLAY bar | PENDING |
| X7 | Smaller residuals | duckMusic's deeper floor survived the release ramp; OPEN SHOP and LEAVE did not cancel a queued cheer; the bite bank paid under the pause sheet; the ferris wheel's cross tie ran through both rims | fixed in bd38108 (by reading; the cheer and pause paths are inside X3's drive) |

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
| G5 | P1 | What you eat talks back | AUDIO | days | queued |
| G6 | P1 | One number stream a child can read, and a chain she can see | UI | a day | **DONE** 796a246, aeffe9d, 4c11aa4 — qa/nomstream.mjs before (dist-base, Maple, 25-bite spree, probe counting only RISING floaters): **8/8 BAD** — 23 per-bite '+N', 5 decimal COMBO floaters, flights 20px→20px across banks 33→80, no crowns for a chain of 25, no cash-in, no pill, no chain sound, 0/2 flights in the beat colour. After: 7/8 — (a) 0 per-bite, (b) 0 decimal, (d) crowns 10, 20 for a chain of 27, (e) "27 NOMS! +464" 1.55 s after the last bite, (f) pill on 118/120 chain-5+ frames, 0 stray, 0 over the face, (g) 2 crowns + 1 cash-in heard, (h) 2/2 flights in the beat colour. (c) failed twice on FIXED size scales: the spec's formula 1.30x, a meal term on `bite` 1.13x (saturated: early in a match nearly every meal is "big" to him, so every number was 40px). Now sized against her own recent average bank: **(c) 20.0px → 34.4px = 1.72x across banks 39→104. PASS 8/8.** Chain sounds: qa/chomp.mjs part 3 before 3/3 BAD, after PASS. |
| G7 | P1 | 'Now I can eat that!' is heard and seen | PLAY + AUDIO | days | queued |
| G8 | P1 | Time, not the camera, sells the marquee moments | CHOREOGRAPHY | a day | queued |
| G9 | P1 | Follow-through: he savours it, and the BURP OF CHAMPIONS finally exists | HERO | a day | queued |
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
