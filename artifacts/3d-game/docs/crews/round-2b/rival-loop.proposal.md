# ROUND 2B — crew:rival-loop proposal

**Status: PROPOSAL ONLY. No skeptic has ruled. Nothing here has landed.**

All anchors below were read from disk TODAY (2026-08-27, worktree at commit
`773fc1c`). NOTE for the skeptic: the worktree carries the salvaged light-rig
RUNG 1 edits to `src/prototype3d.ts` UNCOMMITTED (git status shows ` M`, +23/-5,
all above line 830 — this crew touched nothing). Every prototype3d line number
below is against that on-disk state, not against HEAD; against a clean HEAD
they sit ~18 lines earlier. Line numbers are PRE-PATCH positions; hunks are
listed in file order, so later line numbers shift as earlier hunks apply —
apply by the before-text, which is verbatim from disk.

---

## decision

Decision 2, the owner, verbatim (docs/OWNER-2026-08-25.md):

> "yes, however there needs to be a way where if they're larger you go and
> consume and come back right. It should be back and forth. We want people to
> feel challenged but give them an edge to win. If a void eats you it should be
> more punishing then 10 percent loss. Like a level loss."

**What is already landed, and must not be re-landed:** the HUNTER's connecting
bite already costs a form — `prototype3d.ts:2456-2472` walks `curStage` back,
the HUD renames, `bestStage` stops the ceremony re-firing (qa/evolveonce.mjs
gates it). "Like a level loss" exists for one character.

**What Decision 2 still lacks, verified in source today:**

1. **"if they're larger" is impossible for everyone but the hunter.**
   `rivals.ts:840`: `softCap = max(min(START_R + 0.02t, 1.6), pr * 0.80)`;
   `hardCap` IS `softCap` for every non-hunter — the two escapes (`want * 1.04`
   at :888, `stuffCap` at :902) are both inside `if (isHunter)` (:883) — and it
   is clamped every frame (:911, :1689). Measured (GOVERNOR.md, the 0.75x
   note at rivals.ts:1191-1200): 94% of family samples live at 0.75-0.85x the
   player, 0% above 0.85x, bite gate open **0%** of the match in two worlds.
2. **The form price is hunter-only.** The rivals.ts bite gate (:1417) is
   `rv.r > pr * 1.2` — every bite that can fire IS from a strictly larger
   void — but the dispatch (:1436) sends `shrink: 0.90` for a non-hunter and
   the handler (:2463) keys the demotion on `hit.hunter`. A non-hunter bite is
   exactly the 10% loss the owner called insufficient.
3. **No instrument measures "back and forth".** Nothing counts lead changes.

## design — THE SURGE, and the universal form bite

**THE SURGE.** One non-hunter sibling at a time, in the middle half of the
match, grows to **1.26x the player's size at that moment** — an absolute
radius pinned at surge start, NOT a tracking multiplier. The pin is the whole
counterplay: the player who goes and consumes grows past a rival that cannot
follow, comes back, and eats it. After a 12-18s hold the surge sags 3.5%/s
back under the 0.80x cap, so the lead is handed back even to a player who ate
nothing. Size is authored by easing, the same way the hunter's has been since
she landed (`rv.r += (want - rv.r) * min(1, dt*0.9)` at :887) — a surge that
waited for organic growth would be a gate that never opens, the exact failure
the look gate had twice (rivals.ts:1177-1189).

Why 1.26: clears the bite gate's 1.2 with margin (the red ring finally tells
the truth for a sibling); stays under the hunter's hunt want of 1.5x (she
remains the apex; the surge must not out-threat the threat); the 1.11x
EAT_RATIO red halo and the 0.75x look gate both open on it, so every existing
warning system fires for free.

**The universal form bite.** Every bite dispatched through rivals.ts is now a
FORM bite (`form: true`), because the gate itself guarantees "strictly
larger", and the owner priced that bite unconditionally. The hunter keeps her
8%/1200 steal; a surged sibling banks a smaller 5%/600 steal; both are paid
back when the biter is eaten. `hunter` in `RivalHit` survives for the
steal/analytics distinction; `form` decides the demotion.

**Kid-mercy, explicit and enumerated** (each is a specific patch line):

- **Post-bite grace**: `biteMercy` rises to **4.0s** for any form bite (was
  3.2 hunter / 2.5 ordinary). One connecting bite ends a surge's hold on the
  spot, so a surge can never take two forms; every form bite carries the
  hunter's 12s `biteCd`, not the ordinary 9.
- **Comeback edge**: eating a rival that bit you pays its banked `stolen`
  back plus a +150 revenge bounty on top of the existing meal, and every rival
  eaten already buys `feastR` lawCap headroom (prototype3d.ts:2405) — the
  points and the size both come home through the exact play the owner
  described. The score race's own edge is untouched: `PLAYER_CEIL` still
  guarantees only lane 0 can beat a playing child.
- **No death spiral**: demotion floors at VOIDLING (`st > 0` guard, already
  landed); the sag ALWAYS ends below the swallow line, so "too big to eat" is
  never a permanent state; the surge window closes at 72% of the clock so the
  finale and VOID TITAN's feast (qa/titan.mjs's measured dependency) are never
  fought against a wall.
- **No shit-show** (owner: "I don't want to create this shit show of every
  void attacking you"): one surge at a time; never started while the hunter is
  mid-charge; the BULLY is excluded (she has her own act) and so is the
  COPYCAT — the one archetype whose ordinary errand FOLLOWS the player, and a
  bigger-than-you void on your footprints is a pursuit; a surged rival never
  pursues — visits are switched off for it and it forages where it stands; it
  starts 40-200 units out, never inside biting range; its announce cue is ONE
  ring in its own colour plus a card — deliberately quieter than the charge
  telegraph, for the same reason onNotice is (prototype3d.ts:2530-2535).

Cast arithmetic check: every cast is NIBBLES + at least 2 of
{JELLY, BIGSHOT, ECHO, GRUMPS}, so at least one eligible (non-BULLY,
non-COPYCAT) sibling exists in every possible cast.

Timeline arithmetic on a 180s clock: window opens 43.2s, first surge ~47-55s
(initial cd 4-12s), hold 12-18s, sag ~13s (ln(1.26/0.80)/0.035 ≈ 13.0), next
cd 26-40s counted after clear → second surge ~98-126s, clear by ~131-157s,
window hard-closes at 129.6s for new starts. Typical match: **2 surges,
~20-28s of "a sibling is larger" each** — back and forth, twice, and done
before the finale.

---

## patch 1 — src/proto3d/rivals.ts (RivalHit carries the price)

**anchor:** lines 21-22 — verified on disk 2026-08-27

**before:**
```ts
// what a rival COSTS you when it catches you — the HUD reports both halves
export interface RivalHit { shrink: number; steal: number; hunter: boolean; }
```

**after:**
```ts
// what a rival COSTS you when it catches you — the HUD reports both halves.
// `form` is the owner's price (decision 2, 2026-08-26: "more punishing then 10
// percent loss. Like a level loss"): true means the handler walks the player
// one rung down the form ladder; false is the legacy percentage nibble, which
// only the QA __bite hook can still send.
export interface RivalHit { shrink: number; steal: number; hunter: boolean; form: boolean; }
```

**why:** the demotion decision must ride the hit, not be re-derived from
`hunter` — a surged sibling is not the hunter and still costs a form. Required
(not optional) so the compiler finds every constructor; both exist
(rivals.ts:1436, prototype3d.ts:1784) and both are patched below.

## patch 2 — src/proto3d/rivals.ts (Rival exposes `surge` to QA)

**anchor:** line 27 — verified on disk 2026-08-27

**before:**
```ts
  lane?: number; dry?: number; full?: boolean; }
```

**after:**
```ts
  lane?: number; dry?: number; full?: boolean;
  // QA: is THE SURGE (owner decision 2) holding this rival above the player
  // right now? qa/rivalswing.mjs attributes size-lead crossings with it.
  surge?: boolean; }
```

**why:** the probe must attribute a size crossing to the mechanism, not infer
it. Follows the precedent of `lane`/`dry`/`full`, added for the same reason
("cost five wrong guesses to answer without them").

## patch 3 — src/proto3d/rivals.ts (the onSurge callback)

**anchor:** lines 52-54 — verified on disk 2026-08-27

**before:**
```ts
  onNearMiss?: (name: string, x: number, z: number) => void; // …and it whiffs. the retellable beat.
  onStuffed?: (name: string, x: number, z: number) => void;  // the threat turns into the MEAL
  reset(matchLen?: number): void;                        // instant rematch
```

**after:**
```ts
  onNearMiss?: (name: string, x: number, z: number) => void; // …and it whiffs. the retellable beat.
  onStuffed?: (name: string, x: number, z: number) => void;  // the threat turns into the MEAL
  /** THE SURGE (owner decision 2): a sibling has grown LARGER than the player
   *  and will hold it for a beat before sagging back. Like onNotice, the cue
   *  for this must stay quieter than onCharge's — it is "be on your toes",
   *  not "dodge NOW". See rivals.onSurge in prototype3d.ts. */
  onSurge?: (name: string, x: number, z: number, color: number) => void;
  reset(matchLen?: number): void;                        // instant rematch
```

**why:** prototype3d owns presentation; rivals.ts owns behaviour. Same split
as every other beat in this file.

## patch 4 — src/proto3d/rivals.ts (interface R state)

**anchor:** lines 402-403 — verified on disk 2026-08-27

**before:**
```ts
    // BULLY: the charge state machine (0 prowl, 1 wind-up, 2 lunge, 3 recover)
    cst: number; ctim: number; missPend: boolean; missCd: number; stolen: number; stuffedSaid: boolean; stuffCap: number;
```

**after:**
```ts
    // BULLY: the charge state machine (0 prowl, 1 wind-up, 2 lunge, 3 recover)
    cst: number; ctim: number; missPend: boolean; missCd: number; stolen: number; stuffedSaid: boolean; stuffCap: number;
    // THE SURGE (owner decision 2). surgeR is the pinned target radius while a
    // surge runs (0 = not surging) — absolute, fixed at surge start, so a
    // player who goes and consumes can outgrow it; surgeT is the hold time
    // left before it sags. bitYou marks a rival that has taken a form off the
    // player this life — eating it pays the revenge bounty.
    surgeR: number; surgeT: number; bitYou: boolean;
```

**why:** the state machine mirrors the hunter's stuffCap pattern already in
this interface — one absolute pin, one timer.

## patch 5 — src/proto3d/rivals.ts (scheduler state)

**anchor:** lines 424-425 — verified on disk 2026-08-27

**before:**
```ts
  let grazeN = 0;   // QA: larder bites this match (see api.grazeCount)
  let bandSum = 0, bandMax = 0, bandPinned = 0, bandN = 0;   // QA: see bandStat
```

**after:**
```ts
  let grazeN = 0;   // QA: larder bites this match (see api.grazeCount)
  let bandSum = 0, bandMax = 0, bandPinned = 0, bandN = 0;   // QA: see bandStat
  // THE SURGE's clock: seconds until the next surge MAY start. It only counts
  // down while no surge is running and the window is open, so the 26-40s gap
  // it is refilled with is measured from the moment the previous surge CLEARS.
  let surgeCd = rand(4, 12);
```

**why:** one number, same lifecycle as `grazeN`/band stats, reset in patch 7.

## patch 6 — src/proto3d/rivals.ts (roster init)

**anchor:** lines 468-470 — verified on disk 2026-08-27

**before:**
```ts
      combo: 0, comboT: 0, raw: 0, cst: 0, ctim: rand(6, 10), missPend: false, missCd: 0,
      eye: 0, eyeCd: rand(4, 12),
      stolen: 0, stuffedSaid: false, stuffCap: 0, lockR: 0,
```

**after:**
```ts
      combo: 0, comboT: 0, raw: 0, cst: 0, ctim: rand(6, 10), missPend: false, missCd: 0,
      eye: 0, eyeCd: rand(4, 12),
      stolen: 0, stuffedSaid: false, stuffCap: 0, lockR: 0,
      surgeR: 0, surgeT: 0, bitYou: false,
```

**why:** required fields must be initialised where R objects are built.

## patch 7 — src/proto3d/rivals.ts (reset)

**anchor A:** lines 674-676 — verified on disk 2026-08-27

**before:**
```ts
      shrinking.length = 0; grazeN = 0;
      bandSum = 0; bandMax = 0; bandPinned = 0; bandN = 0;
      trail.length = 0; trailT = 0;
```

**after:**
```ts
      shrinking.length = 0; grazeN = 0;
      bandSum = 0; bandMax = 0; bandPinned = 0; bandN = 0;
      surgeCd = rand(4, 12);
      trail.length = 0; trailT = 0;
```

**anchor B:** lines 685-686 — verified on disk 2026-08-27

**before:**
```ts
        rv.missPend = false; rv.missCd = 0; rv.stolen = 0; rv.stuffedSaid = false; rv.stuffCap = 0;
        rv.lockR = 0; rv.tgt = null; rv.dry = 0; rv.full = false;
```

**after:**
```ts
        rv.missPend = false; rv.missCd = 0; rv.stolen = 0; rv.stuffedSaid = false; rv.stuffCap = 0;
        rv.surgeR = 0; rv.surgeT = 0; rv.bitYou = false; rv.surge = false;
        rv.lockR = 0; rv.tgt = null; rv.dry = 0; rv.full = false;
```

**why:** rematches must not inherit a half-run surge — the exact class of
reset bug this function's own comments document twice.

## patch 8 — src/proto3d/rivals.ts (THE SCHEDULER)

**anchor:** lines 840-841, immediately after the softCap line and before the
per-rival loop — verified on disk 2026-08-27

**before:**
```ts
      const softCap = Math.max(Math.min(START_R + 0.02 * _t, 1.6), pr * 0.80);
      for (const rv of rivals) {
```

**after:**
```ts
      const softCap = Math.max(Math.min(START_R + 0.02 * _t, 1.6), pr * 0.80);
      // ── THE SURGE: the family finally gets to be LARGER ──────────────────
      // Owner decision 2, verbatim: "yes, however there needs to be a way
      // where if they're larger you go and consume and come back right. It
      // should be back and forth." softCap above pins every non-hunter at
      // 0.80x the player — measured, 94% of family samples at 0.75-0.85x and
      // 0% above 0.85x, bite gate open 0% of two worlds (see the 0.75x note at
      // the look gate below). This is the bounded escape: ONE sibling at a
      // time, in the middle half of the match, is grown to 1.26x the player's
      // size AT THAT MOMENT — an absolute pin, fixed at surge start, NOT a
      // tracking multiplier. The pin is the counterplay: go and consume, grow
      // past a rival that cannot follow, come back and eat it. After a 12-18s
      // hold it sags 3.5%/s back under softCap, so the surge always ends
      // EATABLE even for a player who ate nothing. 1.26 clears the bite gate's
      // 1.2 with margin (a sibling's red ring finally tells the truth) and
      // stays under the hunter's 1.5x hunt loom — she remains the apex.
      //
      // Size is AUTHORED by easing, exactly like the hunter's `want` below —
      // a surge that waits for organic eating is a gate that never opens,
      // which is the failure the look gate shipped twice.
      //
      // Kid-mercy, explicit (owner: "no shit show of every void attacking"):
      //   · one surge at a time; never started while the hunter is mid-charge
      //   · BULLY excluded (she has her own act); COPYCAT excluded — the one
      //     archetype whose errand FOLLOWS the player, and a bigger-than-you
      //     void on your footprints is a pursuit
      //   · a surged rival never pursues: visits are off (see `sociable`), it
      //     forages where it stands, bigger
      //   · starts 40-200 units out — never inside biting range, never off
      //     the far coast where the growth plays to nobody
      //   · window 24%-72% of the clock: not in the opening (a VOIDLING has no
      //     form to lose) and not in the finale (VOID TITAN's feast needs the
      //     family eatable — qa/titan.mjs measured that dependency)
      //   · ONE connecting bite ends the hold (see the bite block), so a
      //     surge can never take two forms
      const surgeOpen = _t > matchLen * 0.24 && _t < matchLen * 0.72;
      const anySurge = rivals.some((r) => r.surgeR > 0);
      if (surgeOpen && !anySurge
        && !rivals.some((r) => r.arch === 'BULLY' && r.hunting && r.cst >= 1)) {
        surgeCd -= dt;
        if (surgeCd <= 0) {
          let sPick: R | null = null, sD = Infinity;
          for (const c of rivals) {
            if (!c.joined || c.dyingT > 0 || c.respawnT > 0) continue;
            if (c.arch === 'BULLY' || c.arch === 'COPYCAT') continue;
            const d = Math.hypot(c.x - px, c.z - pz);
            if (d < 40 || d > 200) continue;
            if (d < sD) { sD = d; sPick = c; }
          }
          if (sPick) {
            sPick.surgeR = Math.min(R_CAP, Math.max(sPick.r, pr * 1.26));
            sPick.surgeT = rand(12, 18);
            sPick.visiting = false; sPick.visitT = Math.max(sPick.visitT, 25); sPick.tgt = null;
            api.onSurge?.(sPick.name, sPick.x, sPick.z, sPick.color);
            // the nearBig pool was written for exactly this moment and has
            // been waiting for a trigger that can reach it
            api.onSpeak?.(sPick.x, sPick.z, pickLine(RIVAL_VOICE[sPick.name].nearBig), sPick.name);
            sPick.speakCd = rand(8, 12);
            surgeCd = rand(26, 40);   // gap to the NEXT surge, counted after this one clears
          } else surgeCd = 4;   // nobody in the 40-200 band right now — ask again shortly
        }
      }
      for (const rv of rivals) {
```

**why:** the scheduler lives beside the number it escapes. Every cast contains
at least one eligible sibling (NIBBLES + ≥2 of the other four, only ECHO
excluded among them). `surgeCd` freezes while a surge runs because the whole
block is skipped under `anySurge`, which is what makes the 26-40 an
inter-surge gap rather than a rate.

## patch 9 — src/proto3d/rivals.ts (the cap escape — the round-2 target)

**anchor:** lines 903-911, the tail of the hunter's two-acts block and the
first hardCap clamp — verified on disk 2026-08-27

**before:**
```ts
            if (!rv.stuffedSaid) {
              rv.stuffedSaid = true; rv.cst = 0;
              api.onStuffed?.(rv.name, rv.x, rv.z);
              api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].stuffed ?? RIVAL_VOICE[rv.name].taunt), rv.name);
              rv.speakCd = rand(8, 12);
            }
          }
        }
        if (rv.r > hardCap) rv.r = hardCap;
```

**after:**
```ts
            if (!rv.stuffedSaid) {
              rv.stuffedSaid = true; rv.cst = 0;
              api.onStuffed?.(rv.name, rv.x, rv.z);
              api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].stuffed ?? RIVAL_VOICE[rv.name].taunt), rv.name);
              rv.speakCd = rand(8, 12);
            }
          }
        } else if (rv.surgeR > 0) {
          // THE SURGE (scheduler above). Two acts, the same shape as the
          // hunter's: ease up to the pinned target, hold, then sag back under
          // the cap. This is the third hardCap escape and the first one
          // outside `if (isHunter)` — the exact line the round-2 brief names.
          if (rv.surgeT > 0) {
            rv.surgeT -= dt;
            rv.r += (rv.surgeR - rv.r) * Math.min(1, dt * 0.55);   // grow, don't pop
            hardCap = rv.surgeR * 1.02;
          } else {
            // 3.5%/s: from 1.26x down through the swallow line (1/1.2 =
            // 0.8333) to the 0.80x floor in about 13 seconds. A player who
            // went and consumed crosses it sooner; a player who ate nothing
            // still gets the lead handed back. Either way it ends EATABLE.
            rv.surgeR *= 1 - dt * 0.035;
            if (rv.surgeR <= softCap) rv.surgeR = 0;
            else hardCap = rv.surgeR;
          }
        }
        rv.surge = rv.surgeR > 0;   // QA: __matchState reads this per frame
        if (rv.r > hardCap) rv.r = hardCap;
```

**why:** this is the patch the retained round-2 outline targeted: softCap
(:840) stays exactly as measured and tuned — the escape is scoped, bounded and
temporary, the same architecture as the hunter's two escapes. The sag drives
`rv.r` down through the existing clamp on the next line; the non-hunter score
floor at :1683 is `Math.min(softCap, …)` so it cannot fight the sag.

## patch 10 — src/proto3d/rivals.ts (a surged rival pays no visits)

**anchor:** lines 1006-1007 — verified on disk 2026-08-27

**before:**
```ts
        // the HOARDER does not travel and the BULLY is not paying a social call
        const sociable = rv.arch !== 'HOARDER' && !(rv.arch === 'BULLY' && hunting);
```

**after:**
```ts
        // the HOARDER does not travel, the BULLY is not paying a social call —
        // and a SURGED rival must never beeline to the player: while it is the
        // one thing on the island that can take a form off them, an approach
        // is a pursuit, and pursuit belongs to the hunter alone (kid-mercy).
        const sociable = rv.arch !== 'HOARDER' && !(rv.arch === 'BULLY' && hunting) && !(rv.surgeR > 0);
```

**why:** without it, the visit system (`rv.tx = px`) walks a form-costing void
straight at the player. In-flight visits are cancelled at surge start
(patch 8: `visiting = false`).

## patch 11 — src/proto3d/rivals.ts (the comeback meal pays out)

**anchor:** lines 1391-1401, the hole-vs-hole eaten block — verified on disk
2026-08-27

**before:**
```ts
          const marquee = isHunter && !hunting;
          const looted = marquee ? Math.round(rv.score * 0.5) : 0;
          const pts = marquee
            ? Math.round(400 + rv.r * 180 + looted + rv.stolen)
            : Math.round(100 + rv.r * 40);
          if (marquee) { rv.score -= looted; rv.stolen = 0; }
          api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].eaten), rv.name);
          rv.halo.visible = false;
          rv.dyingT = 0.55; rv.visiting = false; rv.tgt = null; rv.cst = 0;
          api.onRivalEaten?.(rv.name, pts, rv.x, rv.z, rv.r, marquee);
          continue;
```

**after:**
```ts
          const marquee = isHunter && !hunting;
          const looted = marquee ? Math.round(rv.score * 0.5) : 0;
          // THE COMEBACK EDGE (owner decision 2: "give them an edge to win").
          // A sibling that surged and bit pays its banked steal BACK when
          // eaten, plus a flat revenge bounty — the same contract the hunter
          // has always had, at sibling scale. The marquee arithmetic is
          // untouched: it was measured and it already includes rv.stolen.
          const pts = marquee
            ? Math.round(400 + rv.r * 180 + looted + rv.stolen)
            : Math.round(100 + rv.r * 40 + rv.stolen + (rv.bitYou ? 150 : 0));
          if (marquee) { rv.score -= looted; rv.stolen = 0; }
          else if (rv.stolen > 0) { rv.score = Math.max(0, rv.score - rv.stolen); rv.stolen = 0; }
          rv.bitYou = false;
          rv.surgeR = 0; rv.surgeT = 0;   // a devoured rival respawns small, never mid-surge
          api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].eaten), rv.name);
          rv.halo.visible = false;
          rv.dyingT = 0.55; rv.visiting = false; rv.tgt = null; rv.cst = 0;
          api.onRivalEaten?.(rv.name, pts, rv.x, rv.z, rv.r, marquee);
          continue;
```

**why:** "go and consume and come back" has to be worth points on the
leaderboard the child is watching, not just worth the meal. The sibling's
banked steal leaves its score when it is eaten (the points visibly come home);
the hunter's marquee branch is not touched by one character.

## patch 12 — src/proto3d/rivals.ts (every bite through this gate is a form bite)

**anchor:** lines 1417-1437, the bite block — verified on disk 2026-08-27

**before:**
```ts
        if (rv.r > pr * 1.2 && dp < rv.r * 1.05 && rv.biteCd <= 0 && canBite) {
          // ── WHAT A BITE COSTS ───────────────────────────────────────────────
          // -12% radius was undone by the score floor within a frame or two, so
          // being caught was free and the family had no teeth at all. A bite now
          // takes SCORE as well as size — and the threat's bite is the one that
          // hurts, because she banks what she takes and you can win it all back
          // by eating her later. Shrink alone can be refunded by the growth law;
          // points cannot, so this is a cost the leaderboard actually shows.
          const heavyBite = isHunter && hunting;
          const steal = heavyBite ? Math.min(1200, Math.round(pScore * 0.08)) : 0;
          rv.biteCd = heavyBite ? 12 : 9; rv.pulse = 1;
          rv.missPend = false;   // she connected: this was no near miss
          if (heavyBite) {
            // she got what she came for: break off, wallow, and leave a long
            // gap before the next attempt
            rv.cst = 3; rv.ctim = 2.2;
          }
          if (steal > 0) { rv.score += steal; rv.stolen += steal; }
          api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].bite), rv.name);
          api.onPlayerBitten?.(rv.name, { shrink: heavyBite ? 0.85 : 0.90, steal, hunter: heavyBite });
        }
```

**after:**
```ts
        if (rv.r > pr * 1.2 && dp < rv.r * 1.05 && rv.biteCd <= 0 && canBite) {
          // ── WHAT A BITE COSTS ───────────────────────────────────────────────
          // -12% radius was undone by the score floor within a frame or two, so
          // being caught was free and the family had no teeth at all. A bite now
          // takes SCORE as well as size — and the threat's bite is the one that
          // hurts, because she banks what she takes and you can win it all back
          // by eating her later. Shrink alone can be refunded by the growth law;
          // points cannot, so this is a cost the leaderboard actually shows.
          //
          // …and it costs A FORM. Every bite this gate can fire is from a void
          // strictly larger than the player (the gate itself is rv.r > pr*1.2)
          // and the owner priced that bite: "more punishing then 10 percent
          // loss. Like a level loss" (decision 2). form:true sends the handler
          // in prototype3d.ts down the demotion path for every biter — the
          // hunter keeps her heavier steal, a surged sibling banks a smaller
          // one, and both are paid back through the eaten branch above.
          const heavyBite = isHunter && hunting;
          const steal = heavyBite ? Math.min(1200, Math.round(pScore * 0.08))
            : rv.surgeR > 0 ? Math.min(600, Math.round(pScore * 0.05)) : 0;
          // every form bite carries the hunter's long cooldown (kid-mercy:
          // the same void cannot take two forms inside twelve seconds)
          rv.biteCd = 12; rv.pulse = 1;
          rv.bitYou = true;
          // KID-MERCY: one bite ends a surge's hold on the spot — it starts
          // sagging toward the comeback meal, so a surge never costs two forms
          if (rv.surgeT > 0) rv.surgeT = 0;
          rv.missPend = false;   // she connected: this was no near miss
          if (heavyBite) {
            // she got what she came for: break off, wallow, and leave a long
            // gap before the next attempt
            rv.cst = 3; rv.ctim = 2.2;
          }
          if (steal > 0) { rv.score += steal; rv.stolen += steal; }
          api.onSpeak?.(rv.x, rv.z, pickLine(RIVAL_VOICE[rv.name].bite), rv.name);
          api.onPlayerBitten?.(rv.name, { shrink: 0.85, steal, hunter: heavyBite, form: true });
        }
```

**why:** the owner's sentence, implemented at the one line where a bite is
priced. `shrink: 0.85` is near-immaterial on the form path — the handler takes
`min(radius*shrink, bottom-of-previous-form)` and the form bottom dominates —
but keeping one number for all form bites removes a spurious degree of
freedom. `biteCd` 12 uniformly: there are no 9s "light" bites left on this
path.

## patch 13 — src/proto3d/rivals.ts (two stale comments about "the ordinary 10%")

Numbers in comments are load-bearing in this repo (GOVERNOR.md rule 3); after
patch 12 these two are false.

**anchor A:** lines 412-416 — verified on disk 2026-08-27

**before:**
```ts
    // So the rest of the family NOTICES. A big one that finds you close by
    // stops what it is doing, turns to face you, and holds for a beat. It does
    // not pursue, it does not charge, and it cannot start a chase — if you
    // walk into it you get the ordinary 10% bite that has always been there.
    // It is a LOOK, and a look is enough to make a child steer around someone.
```

**after:**
```ts
    // So the rest of the family NOTICES. A big one that finds you close by
    // stops what it is doing, turns to face you, and holds for a beat. It does
    // not pursue, it does not charge, and it cannot start a chase — but since
    // owner decision 2 (2026-08-26), walking into one that is strictly larger
    // costs A FORM, not the old 10%, so the look is the warning for something
    // real. It is a LOOK, and it is enough to make a child steer around someone.
```

**anchor B:** lines 1146-1148 — verified on disk 2026-08-27

**before:**
```ts
        // No pursuit. No charge. Walking into one still costs the ordinary 10%
        // that has always been there. The whole job is to make a child steer
        // around a big void instead of through it.
```

**after:**
```ts
        // No pursuit. No charge. Walking into one strictly larger costs A FORM
        // since owner decision 2 (the bite block below sends form:true). The
        // whole job is to make a child steer around a big void instead of
        // through it — and now the steering is worth something.
```

**why:** a comment that says 10% beside a bite that costs a form is a planted
false measurement for the next reader.

## patch 14 — src/prototype3d.ts (rivalEv counts surges)

**anchor:** line 1676 — verified on disk 2026-08-27

**before:**
```ts
const rivalEv = { bites: 0, hunterBites: 0, stolen: 0, charges: 0, nearMiss: 0, eaten: 0, marquee: 0, notices: 0 };
```

**after:**
```ts
const rivalEv = { bites: 0, hunterBites: 0, stolen: 0, charges: 0, nearMiss: 0, eaten: 0, marquee: 0, notices: 0, surges: 0 };
```

**why:** `qa/rivalswing.mjs` reads it through `__matchState().ev`, the same
route qa/rivalnotice.mjs reads `notices`. On the pre-patch build this field
does not exist, which is one of the two ways the probe fails-before.

## patch 15 — src/prototype3d.ts (the QA __bite hook keeps its meaning)

**anchor:** lines 1780-1784 — verified on disk 2026-08-27

**before:**
```ts
// QA: take a bite, through the REAL handler rather than a copy of it. A
// hunter's bite is the only thing in the game that walks a form back, and
// nothing else can reproduce the bug it used to cause.
_dbg.__bite = (hunter = true) =>
  rivals.onPlayerBitten?.('QA', { shrink: hunter ? 0.85 : 0.90, steal: 0, hunter });
```

**after:**
```ts
// QA: take a bite, through the REAL handler rather than a copy of it. A FORM
// bite is the only thing in the game that walks a form back, and nothing else
// can reproduce the bug it used to cause. form rides hunter here so existing
// probes keep their exact behaviour: __bite(true) demotes (qa/evolveonce.mjs),
// __bite(false) is the legacy percentage nibble.
_dbg.__bite = (hunter = true) =>
  rivals.onPlayerBitten?.('QA', { shrink: hunter ? 0.85 : 0.90, steal: 0, hunter, form: hunter });
```

**why:** RivalHit.form is required (patch 1); qa/evolveonce.mjs calls
`__bite(true)` and must keep demoting.

## patch 16 — src/prototype3d.ts (the handler keys on form, mercy rises to 4.0s)

Three hunks in one function (rivals.onPlayerBitten, lines 2443-2510).

**anchor A:** lines 2445-2447 — verified on disk 2026-08-27

**before:**
```ts
  // MERCY FRAMES. Longer after the hunter connects, so a caught player gets a
  // clear, visible moment to drive away instead of being chain-bitten.
  biteMercy = tClock + (hit.hunter ? 3.2 : 2.5);
```

**after:**
```ts
  // MERCY FRAMES. Longest after a FORM bite — the game's biggest setback buys
  // the clearest, most visible moment to drive away instead of being
  // chain-bitten. (Was 3.2s keyed on hit.hunter; every strictly-larger bite is
  // a form bite now — owner decision 2 — and all of them get the full window.)
  biteMercy = tClock + (hit.form ? 4.0 : 2.5);
```

**anchor B:** lines 2456-2463 — verified on disk 2026-08-27

**before:**
```ts
  // A LEVEL. Not a percentage. A 15% shrink is a number the player cannot see
  // and the growth law hands most of it back within seconds; being eaten should
  // cost the thing the whole game is about. The hunter's connecting bite drops
  // you to the bottom of the form you are in — one rung down the ladder, with
  // the form name on the HUD changing to prove it — and the shallow nibble
  // keeps its percentage. START_R is the floor: a VOIDLING cannot go lower.
  let demoted = false;
  if (hit.hunter) {
```

**after:**
```ts
  // A LEVEL. Not a percentage. A 15% shrink is a number the player cannot see
  // and the growth law hands most of it back within seconds; being eaten should
  // cost the thing the whole game is about. ANY strictly-larger void's
  // connecting bite drops you to the bottom of the form you are in — one rung
  // down the ladder, with the form name on the HUD changing to prove it.
  // rivals.ts can only fire a bite through its rv.r > pr * 1.2 gate, and the
  // owner priced that bite (decision 2): "more punishing then 10 percent loss.
  // Like a level loss." The non-form nibble keeps its percentage — today only
  // the QA __bite hook can send one. START_R is the floor: a VOIDLING cannot
  // go lower, so there is no rung below the first and no spiral out of the
  // bottom of the ladder.
  let demoted = false;
  if (hit.form) {
```

**anchor C:** lines 2492-2510 — verified on disk 2026-08-27

**before:**
```ts
  floatPos.set(voidState.x, voidling.radius + 5, voidState.z);
  bubbles.float(floatPos, demoted ? `BONK!! back to ${FORMS[curStage]}!! 💫`
    : hit.hunter ? 'BONK!! 💫' : 'OOF!! 💫', true);
  if (demoted) {
    growthEl.classList.remove('pop', 'down'); void growthEl.offsetWidth;
    growthEl.classList.add('pop', 'down');
    setTimeout(() => growthEl.classList.remove('pop', 'down'), 420);
  }
  audio.hit(); fx.flash('rgba(154,92,255,0.3)', 0.4);
  // …and none here either. A hunter bite is frequent once the family turns on
  // you, so it was the other half of the periodic shaking. The red wash and
  // the 90ms buzz already say "you are being attacked" without moving the
  // camera the player is steering by.
  if (hit.hunter) fx.flash('rgba(255,43,60,0.4)', 0.5);
  buzz(hit.hunter ? 90 : 50);
  track(hit.hunter ? 'caught' : 'nibbled', {
    name, sec: elapsed(), form: curStage, stolen: Math.round(hit.steal),
  });
```

**after:**
```ts
  floatPos.set(voidState.x, voidling.radius + 5, voidState.z);
  bubbles.float(floatPos, demoted ? `BONK!! back to ${FORMS[curStage]}!! 💫`
    : hit.form ? 'BONK!! 💫' : 'OOF!! 💫', true);
  if (demoted) {
    growthEl.classList.remove('pop', 'down'); void growthEl.offsetWidth;
    growthEl.classList.add('pop', 'down');
    setTimeout(() => growthEl.classList.remove('pop', 'down'), 420);
  }
  audio.hit(); fx.flash('rgba(154,92,255,0.3)', 0.4);
  // …and none here either. A form bite is frequent once the family turns on
  // you, so it was the other half of the periodic shaking. The red wash and
  // the 90ms buzz already say "you are being attacked" without moving the
  // camera the player is steering by.
  if (hit.form) fx.flash('rgba(255,43,60,0.4)', 0.5);
  buzz(hit.form ? 90 : 50);
  track(hit.form ? 'caught' : 'nibbled', {
    name, sec: elapsed(), form: curStage, stolen: Math.round(hit.steal),
  });
```

**why:** one key (`hit.form`) decides everything severe — demotion, the red
wash, the 90ms buzz, the 'caught' analytics event — so a sibling's form bite
and the hunter's read identically to the child and to the funnel. The `name`
field in `track` still distinguishes who bit.

## patch 17 — src/prototype3d.ts (the surge cue — quiet on purpose)

**anchor:** lines 2536-2539, the onNotice block — verified on disk 2026-08-27

**before:**
```ts
rivals.onNotice = (name, x, z, color) => {
  rivalEv.notices++;   // QA: qa/rivalnotice.mjs reads this through __matchState().ev
  fx.ring(x, z, color, 22, 0.45);
};
```

**after:**
```ts
rivals.onNotice = (name, x, z, color) => {
  rivalEv.notices++;   // QA: qa/rivalnotice.mjs reads this through __matchState().ev
  fx.ring(x, z, color, 22, 0.45);
};
// ── A SIBLING HAS GROWN LARGER THAN YOU ────────────────────────────────────
// THE SURGE (owner decision 2): for the next stretch this rival can genuinely
// take a form off you, and eating your way past it is the counterplay. The cue
// sits between onNotice's whisper and onCharge's siren, and deliberately
// closer to the whisper: one ring in the rival's OWN colour (bigger than the
// look's 22, no red — red means "dodge NOW" and belongs to the charge alone),
// and a card that teaches the whole loop in six words. No sting, no shake, no
// rumble: a surged rival never pursues, so nothing is coming at the child.
rivals.onSurge = (name, x, z, color) => {
  rivalEv.surges++;   // QA: qa/rivalswing.mjs reads this through __matchState().ev
  fx.ring(x, z, color, 34, 0.6);
  announceHtml(`<div class="bCard"><span class="bIco">📢</span><span class="bTx">${esc(name)} grew BIGGER than you<span class="bSub">eat up, then eat THEM</span></span></div>`);
};
```

**why:** presentation follows the onNotice/onStuffed house style already in
this file — `announceHtml` + `esc` are both in scope here (onStuffed at :2555
uses both). The distinctness rule (the onNotice comment above it) is honoured:
no red, no alert sting.

## patch 18 — src/prototype3d.ts (__matchState exposes surge)

**anchor:** lines 1885-1887 — verified on disk 2026-08-27

**before:**
```ts
  rivals: rivals.list.map((r) => ({ name: r.name, score: r.score, r: r.r, x: r.x, z: r.z,
    joined: !!r.joined, arch: r.arch ?? '', hunt: !!r.hunting,
    lane: r.lane ?? -1, dry: Math.round((r.dry ?? 0) * 10) / 10, full: !!r.full })),
```

**after:**
```ts
  rivals: rivals.list.map((r) => ({ name: r.name, score: r.score, r: r.r, x: r.x, z: r.z,
    joined: !!r.joined, arch: r.arch ?? '', hunt: !!r.hunting,
    lane: r.lane ?? -1, dry: Math.round((r.dry ?? 0) * 10) / 10, full: !!r.full,
    surge: !!r.surge })),
```

**why:** the probe attributes size-lead crossings to the mechanism. `lane`,
`dry` and `full` already ride this map beyond the declared `__matchState` type
at :1651-1653 and compile; `surge` follows the same precedent.

---

## seeded-draw accounting (Maple mulberry32 stream)

**mrnd / mr / mpick / mchance count delta: ZERO.**

- `src/proto3d/rivals.ts` contains **no calls** to any of the four (verified
  by grep today: zero matches for `mrnd|mpick|mchance|\bmr(` in the file).
  Every random draw in this proposal goes through the file's own `rand()` /
  `shuffle()` / `pickLine()`, which are `Math.random` — the UNSEEDED stream.
- The `src/prototype3d.ts` hunks add no random draws of any kind.
- New `Math.random` draws added: 1 per `createRivals` (surgeCd init), 1 per
  `reset()`, and per surge: 1 hold length + 1 speak cooldown + 1 pickLine + 1
  next-gap (≈8 per match). `Math.random` carries no seed and no
  reproducibility contract in this repo; qa/determ.mjs is red PRE-EXISTING
  (GOVERNOR.md ledger #11) and Maple's authored placements are untouched.

## triangle cost

**Zero new triangles.** The surge scales an existing, always-resident rival
body (SphereGeometry 40×30) through the same per-frame `group.scale` path that
already sizes it; no new geometry, no new materials, no new draw calls.
Per-surge presentation is one pooled `fx.ring` (~2 per match) and one DOM card.

---

## the probe — qa/rivalswing.mjs (NEW FILE, complete)

Measures the owner's sentence clause by clause, in MATCH time, and **fails on
the pre-patch build by construction** (governor rule 2), two independent ways:
`ev.surges` does not exist pre-patch (reads 0 against a bar of ≥1), and a
non-hunter size-lead change is arithmetically impossible once the player
passes r=2 (`cap = max(1.6, 0.80·pr) < pr` — the measured distribution shows
0% of family samples above 0.85x). This crew's constraints forbid running
servers; whoever lands the patch runs the probe on the pre-patch build first
and commits the failing run as the evidence, per the standing rule.

```js
// DOES THE MATCH SWING? — the lead-changes probe for owner decision 2.
//
// The owner, verbatim (docs/OWNER-2026-08-25.md): "yes, however there needs
// to be a way where if they're larger you go and consume and come back right.
// It should be back and forth. We want people to feel challenged but give
// them an edge to win. If a void eats you it should be more punishing then 10
// percent loss. Like a level loss."
//
// Measured clause by clause, all in MATCH seconds (__matchState().t — the
// swiftshader wall clock runs 14-40x slow and is never consulted):
//
//   "if they're larger"       >=1 surge (ev.surges), and a NON-HUNTER radius
//                             crossing above the player's. The hunter is
//                             excluded from every size series here: her two
//                             acts cross the player line by design and would
//                             mask the thing under test, which is the FAMILY.
//   "go and consume and come  the SAME rival seen >1.2x the player (its bite
//    back"                    gate open against you) is later seen <1/1.2x
//                             (eatable by you).
//   "back and forth"          >=2 size-lead sign changes, 3% hysteresis so
//                             cap jitter cannot count as a lead change.
//   "challenged … an edge"    the family is larger for SOME of the window and
//                             never most of it: larger-share <= 45% of samples
//                             in the 24%-80% stretch of the clock.
//   "like a level loss"       demotions (curStage decreases) stay under the
//                             arithmetic ceiling, and no two land inside one
//                             4.0s mercy window (min gap >= 3.5s, sampling
//                             slop allowed below the 4.0 the handler grants).
//
// The demotion ceiling is DERIVED, not guessed (rule: bars need stated
// reasons): form bites are capped by biteCd 12 + biteMercy 4.0; a surge ends
// its hold on its one connecting bite and stays >1.2x only ~5 more sag
// seconds, so <=2 per surge x ~2 surges; the hunter's charge cycle is >=21s
// over a 99s hunt, <=4 connects; stuffed-hunter contact <=2 while she is
// still >1.2x. Worst arithmetic case ~6. More than 6 means a mercy rail
// broke, whatever else looks fine.
//
// FAILS BEFORE THE PATCH by construction: ev.surges is absent (reads 0), and
// softCap = max(min(0.9 + 0.02t, 1.6), 0.80*pr) keeps every non-hunter BELOW
// the player once pr > 2 — measured 94% of family samples at 0.75-0.85x and
// 0% above 0.85x (rivals.ts, the 0.75x note).
//
// No ?fast: rivals.update receives real dt while the clock scales, so ?fast
// distorts the family. No quality pin: no colour claim, and rendering is
// disabled for speed (laneshort.mjs precedent).
//
//   node qa/rivalswing.mjs [world] [port]
import { chromium } from 'playwright';

const WORLD = process.argv[2] || 'maple';
const PORT = process.argv[3] || '4173';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch { }
});
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show');
}));
await p.evaluate(() => document.getElementById('btnPlay')?.click());
await p.waitForTimeout(1400);
await p.evaluate((w) => {
  const c = document.querySelector(`#worldRow .wCard[data-world="${w}"]`)
    || document.querySelector('#worldRow .wCard[data-world]');
  c?.click();
}, WORLD);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
// THIS match's length, from the source the newsarc comment blesses — never
// assumed, never read from the query string.
const LEN = await p.evaluate(() => window.__newsArc?.().len ?? 180);
await p.evaluate(() => { window.__renderer.render = () => { }; });

// the measured "child" driver, verbatim from qa/laneshort.mjs — this probe
// must ride the same play profile the lane measurements rode
await p.evaluate(() => {
  window.__samples = [];
  const cv = document.querySelector('canvas');
  const cx = innerWidth / 2, cy = innerHeight / 2;
  cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
  let heldT = -1, held = null, stall = 0, sampleT = -1;
  const tick = () => {
    const ms = window.__matchState?.();
    if (!ms) { requestAnimationFrame(tick); return; }
    const vs = window.__voidState();

    // ── the sample, every half MATCH second ──────────────────────────────
    if (ms.t - sampleT >= 0.5) {
      sampleT = ms.t;
      window.__samples.push({
        t: Math.round(ms.t * 10) / 10,
        pR: Math.round(vs.r * 1000) / 1000,
        pScore: Math.round(ms.score),
        stage: window.__stages().cur,
        surges: ms.ev?.surges ?? 0,
        bites: ms.ev?.bites ?? 0,
        rivals: (ms.rivals || []).filter((r) => r.joined && r.arch !== 'BULLY')
          .map((r) => ({ n: r.name, r: Math.round(r.r * 1000) / 1000, surge: !!r.surge })),
      });
    }

    const gap = 2.4;
    if (ms.t - heldT > gap) {
      heldT = ms.t;
      const cand = [];
      let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz;
        if (e.radius <= vs.r * 0.92) { if (d < bd) { bd = d; best = { dx, dz }; } }
        if (d < 90000) cand.push({ dx, dz });
      }
      held = best;
      stall = Math.random() < 0.34 ? 1 : 0;
      if (cand.length && Math.random() < 0.30) held = cand[(Math.random() * cand.length) | 0];
    }
    if (held && !stall) {
      let a = Math.atan2(held.dz, held.dx);
      a += (Math.random() - 0.5) * 2.1;
      dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 1, clientX: cx + Math.cos(a) * 110, clientY: cy + Math.sin(a) * 110, bubbles: true,
      }));
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
  null, { timeout: 900000 });
const S = await p.evaluate(() => window.__samples);
await b.close();

// SILENCE IS A FAIL: no samples means no conclusion.
if (!S || S.length < 40) { console.log(`RIVALSWING: FAIL — only ${S?.length ?? 0} samples (no conclusion)`); process.exit(1); }

const famR = (s) => s.rivals.reduce((a, r) => Math.max(a, r.r), 0);

// 1) surges fired
const surges = S[S.length - 1].surges;

// 2) size-lead changes, 3% hysteresis
let side = null, changes = 0; const flips = [];
for (const s of S) {
  const f = famR(s); if (!f || !s.pR) continue;
  const ratio = f / s.pR;
  const next = ratio > 1.03 ? 'family' : ratio < 0.97 ? 'player' : null;
  if (next && side && next !== side) { changes++; flips.push({ t: s.t, to: next }); }
  if (next) side = next;
}

// 3) "larger -> eatable" arcs, per rival: seen >1.2x (its bite gate open),
//    later seen <1/1.2x (your swallow gate open on it)
const arc = {};
for (const s of S) for (const r of s.rivals) {
  const a = (arc[r.n] ??= { larger: false, done: false, tL: 0, tE: 0 });
  if (!a.larger && r.r > s.pR * 1.2) { a.larger = true; a.tL = s.t; }
  else if (a.larger && !a.done && r.r < s.pR / 1.2) { a.done = true; a.tE = s.t; }
}
const arcsDone = Object.entries(arc).filter(([, a]) => a.done);

// 4) larger-share inside the active window
const win = S.filter((s) => s.t > LEN * 0.24 && s.t < LEN * 0.80);
const largerN = win.filter((s) => famR(s) > s.pR).length;
const share = win.length ? largerN / win.length : 0;

// 5) demotions and mercy spacing
let demos = 0, lastDemoT = -99, minGap = 99;
for (let i = 1; i < S.length; i++) if (S[i].stage < S[i - 1].stage) {
  demos++;
  if (lastDemoT > 0) minGap = Math.min(minGap, S[i].t - lastDemoT);
  lastDemoT = S[i].t;
}

// ── the record ──────────────────────────────────────────────────────────────
console.log(`${WORLD} — ${S.length} samples over ${S[S.length - 1].t}s of a ${LEN}s match\n`);
console.log('    t     pR   famR(max non-hunter)  surge?  stage');
for (const s of S.filter((_, i) => i % 30 === 0 || i === S.length - 1)) {
  const f = famR(s);
  console.log(`${String(s.t).padStart(6)} ${String(s.pR).padStart(6)} ${String(f).padStart(10)}`
    + `  (${(f && s.pR ? f / s.pR : 0).toFixed(2)}x)`
    + ` ${s.rivals.some((r) => r.surge) ? '  SURGE' : '       '}  ${s.stage}`);
}
console.log(`\nlead changes (3% hysteresis): ${changes}`
  + (flips.length ? ` — ${flips.map((f) => `t=${f.t} -> ${f.to}`).join(', ')}` : ''));
console.log(`surges fired: ${surges}`);
console.log(`larger->eatable arcs: ${arcsDone.length}`
  + (arcsDone.length ? ` — ${arcsDone.map(([n, a]) => `${n} (bigger @${a.tL}s, eatable @${a.tE}s)`).join(', ')}` : ''));
console.log(`family-larger share of ${Math.round(LEN * 0.24)}-${Math.round(LEN * 0.80)}s window: ${(share * 100).toFixed(0)}%`);
console.log(`form demotions: ${demos}${demos >= 2 ? `, min gap ${minGap.toFixed(1)}s` : ''}`);

// ── the bars, both ends ─────────────────────────────────────────────────────
const fails = [];
if (surges < 1) fails.push('surges < 1 — the mechanism never fired (pre-patch build reads 0 here)');
if (changes < 2) fails.push(`lead changes ${changes} < 2 — no back-and-forth: the lead must go AND come back`);
if (!arcsDone.length) fails.push('no rival completed larger -> eatable — the owner\'s "go and consume and come back" is unproven');
if (share > 0.45) fails.push(`family larger ${(share * 100).toFixed(0)}% > 45% of the window — a wall, not a swing (the other end of the band)`);
if (demos > 6) fails.push(`${demos} demotions > 6 — above the arithmetic ceiling, a mercy rail is broken`);
if (demos >= 2 && minGap < 3.5) fails.push(`two demotions ${minGap.toFixed(1)}s apart < 3.5 — inside one 4.0s mercy window`);

if (fails.length) {
  console.log(`\nRIVALSWING: FAIL`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`\nRIVALSWING: PASS — the match swings, the swing completes, and the mercy rails held`);
```

**Probe design notes, for the skeptic:**

- Reads the thing itself on its own clock (governor rule 4): every wait and
  every sample keys on `__matchState().t`; per-name arcs read the live rival
  list; nothing is snapshotted from source into the probe except the two gate
  constants (1.2 and its reciprocal), which ARE the claim under test — if the
  bite gate constant ever changes, the owner's price changed and this probe
  SHOULD be re-derived, loudly.
- The hunter is filtered out of every size series at the sample, so a pass
  can never be the hunter's own arc wearing a hat.
- Bars at both ends, per the round-2b brief: too little (no surge, no
  crossing, no completed arc) and too much (larger-share > 45%, demotions
  above the derived ceiling, mercy gap violated) both fail.
- Run at least twice on Maple plus once on Pirate before landing: the surge
  count is stochastic (typical 2, floor 1) and the bar is set at the floor.

---

## the other instruments this lands against

- `qa/rivalnotice.mjs` — looks/min will RISE (a surged sibling holds looks
  legitimately). The band is 0.8-7/min; the throttle (9-16s per rival, one
  look at a time globally) gives a hard ceiling near 5/min, inside the band.
  Re-run after landing; a reading outside 0.8-7 kills the patch.
- `qa/evolveonce.mjs` — demotions now also come from siblings; `bestStage`
  already guards the ceremony on the identical path the hunter uses. Re-run.
- `qa/titan.mjs` — the feast depends on the family being eatable; the surge
  window hard-closes at 72% and every sag ends below the swallow line. Re-run.
- `qa/laneshort.mjs` — the score race is untouched by design (the surge is a
  SIZE story; laneWant, satiety, PLAYER_CEIL all unmodified); the sibling
  steal adds ≤1200/match to family scores. Re-run to confirm the ladder still
  separates.

## risks the crew itself sees

1. **Steal-during-mercy asymmetry (pre-existing, inherited).** rivals.ts banks
   `rv.score += steal` BEFORE `onPlayerBitten` fires, and the handler's mercy
   return (`if (tClock < biteMercy) return`) voids the player's loss but not
   the rival's gain — up to 1200 phantom points on the leaderboard today; the
   surge bite adds a ≤600 variant. Not fixed here (rule 6: it is a separate
   cause, and fixing it changes hunter balance mid-proposal). Flagged for its
   own patch.
2. **A surged rival in a tight spot.** The body-fit ring grows with r; a rival
   that surges in an alley can pin and take the existing `stuckN >= 3`
   placeOnLand relocation — a visible teleport at its most visible size.
   Pre-existing machinery, higher exposure. Watch the playtest; the corrective
   would be requiring `fitsAt(c.x, c.z, pr * 1.26)` at pick time.
3. **Island stripping during the hold.** At 1.26x the player, the rival's
   EAT_RATIO reach covers prop classes the player cannot eat yet, for 12-18s,
   ≤2 times a match, satiety still binding. The family-must-never-empty-the-
   island concern (rivals.ts:798) is bounded but not zero; `ate.family` in the
   probe output is the number to watch.
4. **The stuffed-hunter contact bite escalates** from 10% to a form — the one
   case where the game just said "now is your chance" and a child charging
   3 seconds early gets BONKed. Chosen deliberately: red ring = form,
   one rule, pre-reader legible. If playtest shows it punishing eagerness,
   the recorded corrective is `form: !(isHunter && !hunting)` at the dispatch
   — one boolean, no re-design.
5. **'caught' analytics now includes sibling form bites.** Funnels keyed on
   'caught' ≡ hunter will over-count her; the `name` payload field
   disambiguates. Noted for whoever owns the dashboards.
6. **The tuning triplet (1.26x, 12-18s, 3.5%/s) is designed, not measured.**
   The probe measures OUTCOMES (swings, arcs, share) rather than the
   constants; if larger-share breaches 45% the first lever is the hold
   length, then the sag rate — never the 0.80 softCap, which carries its own
   measured history.
7. **This crew could not run the probe** (no servers under crew constraints).
   The fails-before argument is by construction (a counter that does not
   exist, an arithmetically closed gate); the skeptic should demand the
   failing pre-patch run and the passing post-patch run from whoever lands
   this, in that order, before any verdict of SOUND becomes a landing.
