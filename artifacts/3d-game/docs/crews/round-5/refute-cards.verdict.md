# DRAFT — in progress (refute-cards)

## What I ran

## What I checked on disk

## Kill shots

## Corrections (verbatim)

<!-- incremental notes, 2026-09-02 ~09:50 UTC -->
## What I checked on disk (running notes)
- `git show 0efda23`: one file, src/prototype3d.ts, +28/-25. Deletions: ARCH_TAG (:2394), announceJoin call (:2404) and body (:3065-3071), the eaten card (:2462-2464), the surge card (:2626), the stuffed card (:2644), the welcome card (:9308). Nothing else. Crown cards at :4281/:4299/:4314 untouched — confirmed at HEAD.
- The 39% figure: `git log -S"39% duty"` → first appears in 589e31e (2026-08-16, "Take the unlicensed theme.mp3 out of the shipping bundle" — a commit that also dumped the whole qa/ tree). Three later comments (:2405, :4265, and the new one in onJoin) all cite it. No probe file in qa/ contains "39%" or "5.6" for the banner (grep). The figure is INHERITED, not re-measured for this commit.
- bubbles.ts:214-218 (say): `if (kind !== 'rival') { if banner.show → return; if a rival bubble active → return }`. So the gag is real for crowd/'event'/'panic' kinds; 'rival' kind is NOT gagged. float() (:296) has no banner check at all. bubbles.ts:353-361 additionally shortens live crowd bubbles to 0.6s when a banner is up.
- rivals.ts:1042-1046: a surge is picked ONLY from rivals at distance 40..200 from the player. rivals.ts:2028: halo red only when rv.r > pr*1.11; surge grows r toward surgeR at rate 0.55/s ("grow, don't pop", :1139) — so red is not instant.
- rivals.ts:2022-2024: GOLD pulsing halo requires `isHunter && !hunting && rv.r > START_R*2 && pr > rv.r*1.05` — i.e. it is the PRIZE colour (player already bigger), not a "stuffed" colour. onStuffed (:1125-1127) fires when hunting ends regardless of size.
- prototype3d.ts onJoin comment (kept by the commit): the join happens "at the rival's own turf, up to 165 units off and usually nowhere near the screen".
- `npx tsc --noEmit -p tsconfig.json` at HEAD: exit 0 (ran 2026-09-02 ~10:55 UTC).
- Card-string assertions in probes: `qa/_rf_hunt.mjs:127` looks for a BANNER matching /too full/ (falls back to the STUFFED sample if absent — `cardAt: card ? card.t : stuffed.t`), `qa/_rfbeats.mjs:73` looks for /is too full/. Both are underscore scratch probes, neither is in qa/gate.mjs (grep). No probe in qa/ or scripts/ matches "CHASES", "copies your route", "runs from everything", "only eats big", "slow and steady" (the ARCH_TAG strings) — the only "slow and steady" hit is a GRUMPS voice line in rivals.ts:199. No probe asserts on "YOU ARE IN FRONT" / "TOOK THE LEAD" / "you passed" either; the `crownprobe.mjs` the crown comment cites (:4267) is in no commit of this repo (`git log --all -- qa/crownprobe.mjs` is empty).
- `#banner .bDot` CSS (index.html:396) — its only producer was announceJoin. Now dead CSS.
- Stale comments left by the commit, all in src/prototype3d.ts: :2452 "announceFam already puts a full-screen card up for this" (no such function; the card is gone); :2473 "a full-screen card" in the ring-count list; :3062-3066 the announceJoin docblock ("A rival has arrived. Was: pink 30px text…") now sits directly above announceBeat with no function of its own; :9303 "Two banner cards riding the existing queue" (one remains); :2408-2411 "while the banner and the alert that actually tell the player were on it" (the banner no longer exists on a join).
- The crew's own bannermix log (docs/crews/round-4/hud-subtract.proposal.md:139-150, parent build): 4 banner cards in match t=0..70, 3 of them family. 4 × 2.4s / 70s = 13.7% — on THAT run the whole banner was under the 39% the commit cites.
- bubbles.ts:11 kinds are 'ambient' | 'panic' | 'event' | 'rival'. The gag at :214 covers the first three. 'event' is the HERO's own set-piece bark (prototype3d.ts:5311, positioned at voidState) — not family speech. So the commit's "crowd and event bubble" wording is right; family ('rival') bubbles were never gagged by the banner.
- Analytic (source, to be confirmed by probe): the SURGE halo. rivals.ts:1049 pins surgeR = max(rv.r, pr*1.26); :1139 eases r toward it at 0.55/s; :2028 paints red only once rv.r > pr*1.11. Starting from a rival at 0.80x the player (the softCap floor, :1088), the fraction of the gap still to close when red begins is (1.26-1.11)/(1.26-0.80)=0.326, and exp(-0.55t)=0.326 gives t≈2.0 match-seconds of a NON-red halo at the top of every surge, before the ring ever says anything. And the pick (:1042-1046) is restricted to 40..200 units from the player.
- Analytic (source): the STUFFED halo. GOLD (:2022-2024) needs `pr > rv.r*1.05`. onStuffed (:1125) fires the frame the hunt ends, when she "looms at ~1.5x whatever you are" (:1108-1111). So at the moment the deleted card said "too full — now is your chance", the halo is RED (rv.r > pr*1.11), and it turns gold only after the player has outgrown her. The card's "now" and the halo's "now" are different moments.
