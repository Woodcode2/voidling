# LADDER — where VOIDLING stands against the shelf it will ship onto

Compiled 2026-08-13, per `docs/LADDER-BRIEF.md`. Every competitor claim below
carries a source and date or the tag UNVERIFIED; every claim about our build
carries an instrument. **Method limitation, stated up front:** from this
sandbox, `apps.apple.com` and every chart aggregator (Similarweb, Appfigures,
Sensor Tower, AppBrain, apptopia…) are egress-blocked for direct fetch. All
external evidence is server-side web-search snippet level — dated where the
snippet was dated — plus GitHub-mirrored press datasets and earnings-call
transcripts. That is weaker than a live chart pull and the confidence labels
reflect it. One dossier (Roblox) died on a session usage limit and is absent;
the Toca Boca dossier exhausted its search budget and is inference-labelled.

---

## 1. THE FIELD (as of 2026-08-13)

**Action Top Free, US iPhone** — order mostly UNVERIFIED beyond the top:
Roblox #1 (Similarweb, Jul 23), Warline: Sniper Strike #2 (same), then in
evidence-supported but unconfirmed order: Fortnite, Subway Surfers, Soccer
Superstar, Brawl Stars, Dicero!, CoD Mobile, Free Fire, Squid Game: Unleashed,
Division Resurgence, Delta Force, PUBG, Clash Royale, Squad Busters, Sniper 3D,
Mob Control, Pure Sniper, Survivor!.io, Stumble Guys.

**Simulation Top Free, US iPhone** — top 3 verified from Apple's own page
snippet (Aug 13): Whiteout Survival, Among Us!, 8 Ball Pool; then (Appfigures
index crawls, ±3–6 places): EA FC Mobile, Lamar Idle Vlogger, Glow Fashion
Idol, Sled Surfers, OneState RP, EA College Football, Rap Star (#10,
corroborated), Pizza Ready!, Merge Cooking, Idle Dot Shooter, Snake Clash!,
Sunday City, My Perfect Hotel (#16, corroborated ×3), Block Craft 3D, Melon
Sandbox, Sims FreePlay, Toca Boca World.

**Kids ages 6–8, US** — positions 1–7 verified from Apple's own chart page
snippet (Aug 13): Toca Boca World, Bluey: Let's Play!, Times Tables Rock
Stars, Barbie Dreamhouse Adventures, Chibi Dolls, Bible App for Kids, NumBots.
The aisle is licensed IP + subscriptions (Budge, Toca), salted with school
math apps — and one $9.99/week subscription sitting at #5.

**Where hole.io itself is:** #57 US Top Free Games overall (AppBrain, Aug 11),
~2M US downloads/month, ~$200k/month revenue (Sensor Tower snippet), record
119.1M installs in 2025 against **$3.7M player spending all year**
(PocketGamer.biz) — ads carry the business. It is rated 9+/12+ (sources
conflict; current US rating UNVERIFIED) and **appears nowhere in the Kids
section** — it cannot, it is not Made-for-Kids.

**The set.** True comparables: hole.io, Subway Surfers, Stumble Guys, Snake
Clash!, Pizza Ready!, My Perfect Hotel, Mob Control, Toca Boca World.
Ladder-holders: Roblox, Fortnite, Brawl Stars, Whiteout Survival, Among Us!,
8 Ball Pool, Squid Game: Unleashed. Noise (named, dropped): the shooter/battle
royale franchises (CoD, PUBG, Free Fire, Delta Force, Division, Warline,
Sniper 3D, Pure Sniper) — core-gamer brands whose slots are bought with UA and
franchise recognition, not with anything a kids' eater can imitate; EA's
sports licences; Whiteout/Kingshot-class 4X (Strategy in Simulation clothing).

**The structural fact the charts force:** VOIDLING sits between two shelves.
Its *mechanics* live on the Simulation/Action hyper-casual shelf (Supercent,
SayGames, Voodoo — ad-arbitrage machines, 9+/12+); its *values* (4+, no ads,
parental gates, voids-earned/hats-bought) live on the Kids shelf, where the
competition is Bluey and Toca Boca subscriptions and the buyer is a parent.
No game currently occupies "hole.io, but a parent never has to worry about
it." That gap is the position.

---

## 2. THE SCORECARD

Definitions are operational (brief §2). Ours measured by instrument; theirs by
sourced description. Scale: −− well behind · − behind · = par · + ahead ·
++ well ahead, **for our shelf and audience**.

| Axis | Us vs comparables | The evidence |
|---|---|---|
| GRAPHICS | **+** | Thumb test (qa/out/ladder_thumbtest.png, corrected): hero and scene content legible at 120px in **5/5 worlds** — an earlier lantern "fail" was frame-selection bias from an unrepresentative shadow-corner shot and is retracted in action #1 below. AO + colour grade + selective bloom + per-vertex specular shipped and photographed; hole.io ships "simple animations" (listing mirrors) and Mob Control gets called "mobile stink" (eshopper review, 2024). Our install is a fraction of hole.io's bloated 723MB iOS floor. Behind Brawl (a $1B art team) — but Brawl is not our shelf. |
| PACE | **++** | Instrumented: zero-tap first launch (autoplay), controls live at t=2.2s game-time, score accrues before the first tap (23 by t=2.4s, suction feeds a resting child), first drag-driven bite ~0.1s after the drag (firstrun2.mjs). No ads = zero dead air, ever. hole.io's atoms are 2:00 of play mortared with 15–30s interstitials *including a halftime break inside the round* (gamigion, adlock, Aug 13). Supercent's own FTUE bar (no play button, first reward <60s) — we match it. Cold-launch wall time on device: UNVERIFIED here (sandbox clock is not a phone). |
| FLASH | **=** | Post fanfare-rationing (evolve() is growth-only now), banner-level events run ~8–9/min in a driven match (crownprobe log, n=1 — proxy, floats/rings uncounted). Ritualized like Brawl (crown duel, countdown, finale beats that change the world) rather than dense like Snake Clash. Under-juiced vs Brawl's per-character audio identity; correctly quieter than ad-broken rivals whose "juice" is interruption. |
| MTX | **++ / unproven** | Ours (from code): no ads of any kind, no timers, no loot boxes, coins earned in play (~550/match measured), skins coin-only on the owner's curve, hats real-money behind a parental gate + platform gate. Cleaner than every comparable except Toca (its model, with packs) and Squid Game (no monetization at all — and Netflix shut that studio: chart position without a revenue line is not a business). **Unproven half:** our revenue engine is hats-IAP only; every chart-holding comparable monetizes reach with ads or deep IAP. This is a position, not a flaw — but it must be priced (see §3). |
| POP | **−** | Icon holds at 60px (qa/out/ladder_icontest.png): face reads, palette distinctive. Title/subtitle "VOIDLING · The cute world ender" is a real pitch. Approved splash + key-art world posters. **Behind on everything after that:** no store screenshot set, no preview video, no seasonal icon cadence (Subway Surfers changes its *icon* every World Tour so the shelf itself advertises novelty). hole.io's shelf verb is "Eat the world" + a skyscraper going down in screenshot 1 — ours is not yet staged. This axis decides installs and is our weakest measured position. |
| FUN | **= now, + trajectory** | Play 1–4 loop is built and verified this week: ghost-hand teach, crown/lost-crown duel (measured firing), world-reactive beats (goat/treasure/band/drum), encore quests (the board never says stop), sticker hints on empty runs, NEW PLACE badges. Difficulty floor holds (never below 3rd; maple child-driver mean place 1.0, sd 0). Missing vs the bar the big three set: **a daily tap-to-reveal ritual** (Brawl's Starr Drops: win-gated, capped, on the main hub, un-missable), **a public liveops cadence** (Subway's 3–4-week tour), and **an end-of-run tally ceremony** (Stumble ends even a loss on "I got something"). |

**Where we lose, plainly:** POP to everyone with a store presence; FLASH to
Brawl; the *business* axis to every ad-funded comparable (they monetize reach,
we don't); GRAPHICS to nobody on our shelf, but Lantern fails its own thumb
test. **Where we win:** PACE against the entire ad-funded shelf (structurally
— they cannot remove their interruptions without removing their revenue), and
MTX cleanliness against everything that isn't Toca or Netflix.

---

## 3. LADDER MATH — what a top-10 slot costs

**What code can move** (sized small→large): Lantern thumb legibility (S);
end-of-run tally ceremony (S); daily reveal ritual (M); store screenshot/
preview capture rig (M — assets for the owner's listing); seasonal icon/liveops
scaffolding (M); device-floor proof on real hardware (owner's phone + one old
device, S but hardware-gated); localization (L, later).

**What code cannot move — the owner's column:**
1. **The shelf decision.** Kids Category (4+, Made-for-Kids: fights Bluey/Toca
   for parents, needs subscription-or-packs economics, Apple kids rules) vs
   general Games 4+ (fights Voodoo/Supercent for kids' thumbs, discovery via
   UA). The build supports either; the *listing* must pick one. This single
   decision reframes every axis above.
2. **UA spend and CPI.** hole.io holds #57 on ~2M installs/month bought with
   ad revenue recycled into UA. Organic-only top-20 in Action/Simulation is
   not a thing the record shows for any comparable — Subway's "mostly organic"
   400M/yr rides a 13-year brand. There is no code substitute.
3. **Featuring.** Apple editorial (the Kids shelf especially) is applied-for,
   relationship-driven, and worth more than any craft point on the Kids aisle.
4. **Store assets & IAP creation** — screenshots/video we can capture, but the
   listing, the Kids-category questionnaire, and App Store Connect IAPs are
   owner-only (task #9).
5. **Revenue model conviction.** Hats-only is the cleanest sheet on the shelf
   *and* the least proven. The Squid Game record is the warning in both
   directions: quality-without-interruption tops charts, and charts without
   revenue close studios. Decide what the game is being paid to do.

**The honest sentence:** we are approximately three craft points (POP assets,
daily ritual, Lantern legibility) from being the best-in-class *product* in
the "clean hole.io" gap — and one business lever (shelf choice + the UA/
featuring push behind it) from that product being *found*. Code alone does not
buy the slot; the record of every comparable says so.

---

## 4. ACTION LIST — impact × confidence ÷ effort, descending

| # | Action | Axis | Effort | Impact | Conf | Status |
|---|---|---|---|---|---|---|
| 1 | Lantern thumb legibility | GRAPHICS | — | — | — | **FINDING RETRACTED IN FULL** (two steps, both instrumented). First the lever: a lantern-only +55% hemisphere floor measured +0.4 luminance — nothing (qa/out/lantern_thumb_ab.png). Then the finding itself: the original "fail" was judged from an unrepresentative shadow-corner verification shot; at standard gameplay framing the 120px crop **passes** name-the-objects (void, stalls, lantern pools, figures — see the corrected qa/out/ladder_thumbtest.png). The authored dark-base palette (which exists precisely so the amber pools carry the night) stands untouched. GRAPHICS row corrected to 5/5. |
| 2 | End-of-run tally ceremony: results screen counts up coins/XP/finds one at a time (Stumble's "I got something" shape; we have the data, not the ceremony) | FUN | S | M | High — pattern sourced ×3 | **BUILT, this commit set** |
| 3 | Store capture rig: scripted, HUD-clean, per-world hero shots at App-Store sizes → `qa/out/store/` for the owner's listing | POP | M | H | High — the axis we measurably lose | **BUILT, this commit set** |
| 4 | Daily reveal ritual: upgrade the daily card claim into a held-tap reveal ceremony (Brawl's lesson, de-gambled: fixed value, earned, capped) | FUN | M | H | Med-high | queued next |
| 5 | Seasonal scaffolding: a dated event table (icon swap hook, world accent, one limited sticker set) — Subway's cadence at our scale | FUN/POP | M | H | Med | design written, build next |
| 6 | Device-floor proof on real hardware | GRAPHICS/PACE | S | M | blocked on hardware | owner + next session |
| 7 | Preview-video storyboard (30s: bite→grow→landmark→goat) for owner's capture | POP | S | M | Med | after #3 |

Below the line (returns thin or owner-gated): localization; Android/back-catalog
questions; any difficulty retune (floor holds, leave it); PRICES curve
(owner's, modelled fine as-is at ~550✦/match).

---

*Verification appendix: thumb/icon tests `qa/out/ladder_thumbtest.png`,
`qa/out/ladder_icontest.png`; pace `firstrun2.mjs` (session log 2026-08-13);
EPM proxy crownprobe banner log; economy `prototype3d.ts` PRICES + measured
earn rate; chart/dossier sources inline above and in the workflow journals
(`wf_54c7f7d7`, `wf_d3e4ebe4`). Roblox dossier: absent (session limit).
Toca dossier: inference-labelled (search budget exhausted).*
