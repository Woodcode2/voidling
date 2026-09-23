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
| Q2 | PROBE WAS WRONG, TWICE | **The shore launches the player?** First the probe carried a stale copy of the steering formula (fixed: it reads `__matchState().steer`). Re-run with that fix on the G1+G10 build: Pirate **1.51x** against the 1.35x bar. Second fault, found reading why: it timed its windows on the MATCH clock, which runs on `dtw` — hitStop() slows it to 6% for 55-105 ms on every big bite — while the void is steered on `dt` and never freezes. A window holding a hit-stop divides real movement by a crawling clock. The probe now windows on `tClock` (advanced by `dt`, the clock the shore clamp uses) and prints the match-clock figure beside it with the hit-stop frame count. Re-measure pending. | qa/edgespeed.mjs vs prototype3d.ts:12873 (`dtw *= 0.06`), :12874 (`tClock += dt`), :13625 (the clamp) | re-run on the new probe |
| Q3 | LEAD | **Food pacing misses on four worlds** — F2 lantern 1.83s, gameday 2.11s, pirate 3.00s vs 1.5s; F1 powder 11.5% vs 20% | gate.mjs:350-355 | re-measure |
| A1 | LEAD | **SKYLARK FIELD has no match music** — plays the generic synth bed while five worlds play composed tracks | assetrefs KNOWN_NOWHERE `/assets/music/skylark.mp3` | owner may need to fetch a generated track (CDN egress is blocked here) |
| C1 | LEAD | **Two scrapbooks have no art** — POWDER and SKYLARK, 16 of 16 stickers missing each | assetrefs, 32 entries | |
| U1 | LEAD | **Emoji are the game's icon system, and they are platform art beside a hand-drawn HUD.** The probe freezes 10 on shop/picker/profile, but it walks only five menu screens. The source uses emoji for every world icon (🍁 🎈 🏴‍☠️ …), all six rank tiers (👑 💎 💠 🥇 🥈 🥉, prototype3d.ts:7381), the rarity tiers (🔹 💜 ⭐, :10021), the gem currency on every price and reward line, and the daily gift 🎁 — including the in-match HUD goal chip and the end card, which the probe has never looked at. The inline sheet already has 9 drawn symbols (ic-book, bag, cup, crown, gear, gift, medal, void, chev). | qa/pictograph.mjs, source read 2026-09-23 | an icon helper every string goes through + ~12 new marks drawn to the sheet's style (24-grid, flat fills, one soft highlight, reads at 22px); widen the probe to a live match and the end card FIRST so it fails on today's build |
| Q1n | note | rivalnotice's "0.0/min" in gate.mjs predates two threshold moves (1.2x -> 0.85x -> 0.75x, each set from a measured size distribution). Re-measure before treating Q1 as open. The code raises the real PLAY question itself: the rivals that "notice" you sit at 0.75-0.85x your size, so they cannot actually eat you — "making it literally true means raising the family's cap, which is a measured balance number, and that is his call". | rivals.ts:1430-1475 | |
| S4 | P1 | **Analytics has been silently dropped since the COPPA fix.** The deployed `ingest-events` (v1, unversioned until now) REQUIRES `user_id`; the client correctly stopped sending one. Every batch -> 400 `missing fields`. | read of the deployed function via the Supabase connector, 2026-09-23 | fix written: `supabase/functions/ingest-events/index.ts`. Deploy is production infra -> OWNER QUEUE |
| S2 | LEAD | **All 8 App Store screenshots show a menu the game no longer has** | readiness audit (store) | reshoot at the required sizes |

### The research governor's build order (2026-09-23)

Five research lenses (genre, retention, feel, audio, graphics) against a source inventory; 14 agents; the governor's verdict, verbatim: *"No. It is not AAA yet, and today it would not reliably bring a 6-11 year old back."*

| id | rank | item | team | cost | status |
|---|---|---|---|---|---|
| G1 | P0 | Every child's first match is Maple dot 1, and no match ever nags | PLAY + UI | hours | f20e21c — qa/firstrun.mjs before (dist-base): (a) goal 0, (b) timer rgb(255,138,138) + "EAT FASTER!!", (c) solo dot 4 joined 0/3 by t=16. After (dist): (a) ok goal=1 from the first armed frame; (b) ok timer rgb(255,255,255), no EAT FASTER; (c) ok 2 rivals joined by t=16. **PASS 3/3 — DONE** |
| G2 | OWNER | Pull out every calendar hook: missing a day costs nothing | PLAY | a day | OWNER DECISION — removes the daily streak and streak-gated skins he designed; the rule it enforces is the crew's, not his (see Fixed). Recommended: yes — his "come back and your void turns SHINY" survives as a count-up. |
| G3 | P0 | The biggest bite makes the biggest sound: CHOMP and eating a rival | AUDIO | hours | **DONE** d529a31 — CHOMP −20.6 dB → +3.4 dB vs a big bite; rival +26.2 dB; 50 buffers → 1 (call sites land with G1) |
| G4 | P1 | Every match ends as a party in the world, with its own whistle | CHOREOGRAPHY + AUDIO | a day | queued |
| G5 | P1 | What you eat talks back | AUDIO | days | queued |
| G6 | P1 | One number stream a child can read, and a chain she can see | UI | a day | **IN PROGRESS, UNVERIFIED** — qa/nomstream.mjs before (dist-base, Maple, 25-bite spree): **8/8 BAD** — 33 per-bite '+N', 5 decimal COMBO floaters, flights 20.0px→20.0px (1.00x) across banks 35→101, no crowns for a chain of 25, no cash-in, no pill, no chain sound, 0/2 flights in the beat's colour. After-run pending; chain sounds in qa/chomp.mjs part 3: before 3/3 BAD (no sound exists), after PASS (crowns −38.6/−38.1, cash-in −37.7 dBFS above 450 Hz vs a plain bite's −50.4; nothing below 250 Hz) |
| G7 | P1 | 'Now I can eat that!' is heard and seen | PLAY + AUDIO | days | queued |
| G8 | P1 | Time, not the camera, sells the marquee moments | CHOREOGRAPHY | a day | queued |
| G9 | P1 | Follow-through: he savours it, and the BURP OF CHAMPIONS finally exists | HERO | a day | queued |
| G10 | P1 | Anti-aliasing back on the two best rungs | LIGHT | hours | **DEFECT FIXED, BAR (b) NOT MET** bb1430b — composer samples 0 → 4; blended edge pixels 4.2% → 29.6% (rung 0, Maple, same harness, before on dist-base). Bar (b) was 35%, set before any run. The same frame drawn DIRECT to the antialias:true canvas reads **32.9%**: the hardware's own 4x MSAA misses 35% too, so no MSAA change can reach it. Composer is at 90% of native. Reaching 35% needs a post-AA pass — see G10b. aamsaa stays out of the gate until its bar is one a fix can meet. |
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
- Studio round (`studio` workflow) on the 2026-09-23 lookbook — PASS, all 11 shots,
  and the first pack in which all six play frames carry the hero (each measured in
  by shippedlook's coverage bar). Nine teams, a skeptic per finding, art direction,
  the governor.
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
