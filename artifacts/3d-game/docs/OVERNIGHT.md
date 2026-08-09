# OVERNIGHT BRIEF — make VOIDLING a top-10 App Store game

Owner's mandate, given 2026-08-08 evening: work through the night. By morning
they port to the App Store and supply music. Everything else is mine to drive.

> "A beautifully designed game, visually breathtaking from every item, ground
> pixel, events etc. Item placement needs to be dialed in. Items crisp and well
> defined. World events that make this super fun. Void family fun. If something
> is missing to make this addicting, add it."

The concept is the asset: **a cute void that eats worlds.** Everything below
serves that.

---

## RULES THAT DO NOT BEND

1. **Measure, then change.** This codebase has cost me seven wrong conclusions
   in one day, every one caught by an instrument and none by reasoning. If a
   change cannot be measured, build the probe first.
2. **A single run proves nothing.** `qa/ab.mjs` exists because three readings of
   59/44/48 turned out to be one number measured three times. Means and spreads,
   or it did not happen.
3. **Never rebuild `dist/` while a probe is running.** It contaminated a
   five-match A/B: later runs silently loaded the new bundle.
4. **Commit unverified work as unverified.** Say so in the message. Retract in
   the next commit if the instrument disagrees; never defend.
5. **Licence rule for any asset: CC0 / Public Domain / Pixabay / Kenney only.**
   Egress blocks both downloads AND the pages, so a session cannot choose
   tracks — see `public/assets/music/README.md`.
6. **Run `qa/smoke.mjs` before every push to main.** Push to main is a deploy.
7. Working directory resets to the repo root between commands. `cd
   artifacts/3d-game` first, every time.

---

## PRIORITY ORDER

### 1. THE MATCH MUST BE A CONTEST  (the only structural gap)

**NINE ATTEMPTS, AND THE MAP IS NOW CLEAR. READ THIS BEFORE TRYING A TENTH.**

Measured, `qa/ab.mjs`, 5 matches each, maple/child:

| attempt | lever | leader/lane | verdict |
|---|---|---|---|
| baseline | — | 47.4% sd 6.2 | player wins 5/5 |
| 1-3 (pre-existing) | raise band ceiling | — | failed, documented in rivals.ts |
| 4 | rival size cap 0.78 -> 0.88 | worse | ALSO broke eating rivals (0.88 > 1/1.2) |
| 5 | crumb floor 0.45r -> 0.18r (larder) | inside noise | real finding, kept |
| 6 | band squared past setpoint | 41.8% sd 11.4 | failed |
| **7** | **player combo sub-linear** | **62.2% sd 9.2** | **WORKED — kept, 0.24 is optimum** |
| 8 | combo pushed to 0.18 | 59.8% sd 14.2 | saturated |
| 8b | field 3-5 -> 3 rivals | 53.5% sd 16.2 | failed, DOUBLED variance |
| 9 | larder takes 3 items/tick | 61.1% sd 10.1 | failed (bites +3.7pp, score flat) |

**THE REASON THEY ALL FAIL.** `leader/lane` is SCALE-INVARIANT. The lane is
`0.94 x pScore` and the band is `want/score`, so any change that scales the
player, the target, or a rival's earnings gets cancelled by the band's own
negative feedback. Attempt 9 is the proof: the family ate measurably MORE
(36.7% -> 40.4% of all bites) and scored exactly the same, because earning more
drops `off`, which drops the multiplier, which drops points per bite.

The band is not a broken corrective. It is a controller holding the ratio at a
fixed point near 60%, and it will absorb anything fed into it.

**SO THE TENTH ATTEMPT MUST CHANGE THE CONTROLLER, NOT ITS INPUTS.** Options,
untried, in order of how much I would trust them:
1. **Make `want` not a function of `pScore`.** Anchor lane 0 to an absolute
   par curve for the world (what a good run scores there), so the target stops
   fleeing. The scale-invariance dies with it. This is the one I would do.
2. Remove the band's feedback entirely for lane 0 and give the leader a flat
   points multiplier, letting satiety alone stop the rout.
3. Give the leader a food source the player cannot touch (its own spawn
   stream), so its earnings are not a share of a pool the player is draining.

Do NOT try: another ceiling, another exponent, another size cap, another field
size, or another cut to the player's multipliers. Nine runs say the controller
eats all of them.

Verify any attempt with `node qa/ab.mjs 5 maple child 4173`.
TARGET: leader 85-110% of lane, player place mean ~1.3, worst place <= 3
(owner's floor: never finish below 3rd).
WHERE IT STANDS: 62.2% of lane, player still wins 5/5.

### 2. VISUAL — "breathtaking from every ground pixel"
The shop already renders at native resolution filling 86% of frame. The WORLD
does not get the same scrutiny. In rough value order:

- **Post-processing.** `grep createConvolver`-equivalent for visuals: check
  whether there is ANY post chain. Bloom on the void's rim and on lantern/neon
  emissives is the single biggest "expensive game" tell for the least work.
- **Ground.** The islands are painted to a canvas texture. Check its resolution
  against device pixels — the shop was rendering at 0.67x native and nobody had
  noticed. The same class of bug on a ground plane is very likely.
- **Item crispness.** Owner: "items crisp and well defined". Check mipmaps,
  anisotropy, and whether merged kit props lost their normals.
- **Item placement.** The road sweep was measuring 45% of each prop (fixed,
  82a049f). Look for the same shape of bug in the OTHER placement rules —
  water, cliffs, plaza edges, and the three worlds that are not Maple.

### 3. WORLD EVENTS + VOID FAMILY  ("super fun", "family fun")
- The family already has arch types, voice lines, a hunter arc and a marquee
  meal. Once #1 lands they will actually be felt. Re-playtest before adding.
- Scheduled beats exist (`announceBeat`). Audit what fires, when, and whether
  the last 30 seconds of a match has a shape.
- The fun audit (`w4bfnaeh0`, 14 ideas / 6 survived) has five findings not yet
  built: first-60-seconds, moment-vs-celebration mismatches, what looks
  unfinished in motion, the reason to play a fourth time, and reading it as a
  six-year-old. Re-run it if the file is gone.

### 4. THE REASON TO PLAY AGAIN
Coins dead-end at ~30 matches: 16,450✦ of voids at ~550/match, and hats are
real money by the owner's explicit call. After that the currency is inert.
Something must want buying at match 40.

### 5. STILL OPEN, SMALLER
- Mouth sits left of the eye midline at size; body silhouette goes lumpy.
  (Pupil pinning fixed in bceeb1c — that was the big one.)
- The smile itself. Owner called it "weird looking". TASTE CALL — render three
  variants at 20m and let them pick; do not silently change a face.
- `store/preview.mp4` is still the retired 2D game and there is no tool to
  reshoot it.
- 17 IAP products need creating in App Store Connect (owner-only).

---

## THE INSTRUMENTS (use them, extend them)

| probe | answers |
|---|---|
| `qa/ab.mjs` | N matches, mean + sd. The only trustworthy difficulty read. |
| `qa/difficulty.mjs` | expert / child / flail drivers. Can a bad player win? |
| `qa/laneshort.mjs` | per-second: leader vs lane, larder eligibility, size cap |
| `qa/titan.mjs` | is the top form earned? Fails BOTH ways, incl. a broken control |
| `qa/framing.mjs` | every shop render: fill %, centring, native resolution |
| `qa/shopdoors.mjs` | both shop entrances paint |
| `qa/streakunlock.mjs`, `qa/streakdrift.mjs` | the daily/streak counter |
| `qa/tutstrand.mjs` | the session-two world-switch dead end |
| `qa/iapdoc.mjs` | APPSTORE.md vs the client's real product list |
| `qa/smoke.mjs` | boots, loads, grows, eats, makes sound |
