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
- Fun means **fun that brings a child back**, not a hook that holds one. Bloomberg's
  2026 investigation into kid-rated games using addictive design is the line: no
  streak-loss punishment, no loss-aversion timers, no near-miss manipulation, no
  spend prompts inside play.
- Ship via `git push` only. Never deploy by hand. Nothing reaches `main` without
  the push gate green.

---

## LEDGER

### Open

| id | rank | item | source | evidence / bar |
|---|---|---|---|---|
| Q1 | LEAD | **Bigger voids never react to you.** `rivalnotice` last read 0.0/min in maple, gate open 0% — the owner's own item 1 | gate.mjs:250, quality profile | re-measure; the bar is in the probe |
| Q2 | LEAD | **The shore launches the player.** `edgespeed` last read 1.78x against a 1.35x bar — the owner's own item 3 | gate.mjs:208-216, quality profile | re-measure |
| Q3 | LEAD | **Food pacing misses on four worlds** — F2 lantern 1.83s, gameday 2.11s, pirate 3.00s vs 1.5s; F1 powder 11.5% vs 20% | gate.mjs:350-355 | re-measure |
| A1 | LEAD | **SKYLARK FIELD has no match music** — plays the generic synth bed while five worlds play composed tracks | assetrefs KNOWN_NOWHERE `/assets/music/skylark.mp3` | owner may need to fetch a generated track (CDN egress is blocked here) |
| C1 | LEAD | **Two scrapbooks have no art** — POWDER and SKYLARK, 16 of 16 stickers missing each | assetrefs, 32 entries | |
| U1 | LEAD | **Ten emoji on shop / picker / profile** — platform art beside a hand-drawn HUD | qa/pictograph.mjs KNOWN (10) | freeze-by-name list must reach 0 |
| S4 | P1 | **Analytics has been silently dropped since the COPPA fix.** The deployed `ingest-events` (v1, unversioned until now) REQUIRES `user_id`; the client correctly stopped sending one. Every batch -> 400 `missing fields`. | read of the deployed function via the Supabase connector, 2026-09-23 | fix written: `supabase/functions/ingest-events/index.ts`. Deploy is production infra -> OWNER QUEUE |
| S2 | LEAD | **All 8 App Store screenshots show a menu the game no longer has** | readiness audit (store) | reshoot at the required sizes |
| S3 | LEAD | **`?iapmock=1` hands out every paid item free on the public web URL** | readiness audit (money) | |
| D1 | LEAD | **RELEASE-GATE.md is stale** — 5 push steps documented vs 55 run; "five worlds" vs six; no `quality` profile | readiness audit (web) | |

### Research and review — in flight

- Top-games research: genre ancestors, kids' retention, feel, audio, graphics — and
  an inventory of what this game actually has, read from source, so every
  recommendation is a concrete gap rather than generic advice.
- Studio lookbook reshoot (`qa/lookbook.mjs`) — the first pack in which the six play
  frames contain the hero. Teams may not review a surface they have not seen.

### Owner queue — only he can do these

| item | why only him |
|---|---|
| Approve deploying the fixed `ingest-events` function (S4), and check `vd_events.user_id` is nullable first | production Supabase — outward-facing infra |
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
| — | Ferris wheel promoted from dead-GLB fallback to the real prop; 15 draw calls -> 1 | 211a0e8 |
| — | PLAY AGAIN stranded the hero 26u in the sky — proven by A/B, two builds one line apart (groupY 0.81 vs 26.81) | e7d0d63, 1939b53 |
| — | Every person has a mouth; both eyes actually drawn; static townsfolk under the facet bar | db37367, ff3c658 |
