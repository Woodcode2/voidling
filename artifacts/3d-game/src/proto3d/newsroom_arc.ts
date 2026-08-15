// ══════════════════════════════════════════════════════════════════════════
//  THE ARC — the town tells a story, it does not just have a mood
// ══════════════════════════════════════════════════════════════════════════
//
//  WHY THIS EXISTS. The newsroom had three tiers picked fresh on every card
//  from "how bad is it" — a MOOD. A mood can drift, it can go backwards, and
//  it has no beginning. The owner asked for a STORY, and the difference is
//  order: morning, then nobody believes it, then they believe it, then chaos.
//  A child should be able to feel where they are in the match from the
//  newspaper alone.
//
//    0 MORNING  the town is fine. The void is NOT MENTIONED. This is the
//               baseline every later beat lands against.
//    1 DOUBT    something is happening and nobody believes it. Officials deny,
//               experts explain it away. The comedy engine.
//    2 ALARM    they believe it now. Lines shorten. Advice replaces theory.
//    3 PANIC    funny chaos, never frightening. The newsroom keeps filing.
//
//  PHASES 1-3 MAP ONTO THE EXISTING TIERS, deliberately. Those pools are
//  written, voice-checked and style-metered; re-authoring them to fit a new
//  shape would throw away work that is already good. Only MORNING is new.
//
//  THE ARC NEVER REVERSES, and that is enforced in three places rather than
//  hoped for — see below. It used to be non-reversing only by accident:
//  devouredPct is recomputed every tick against initialMass, and a late GLB
//  registering can revise that denominator DOWN, which walks the meter
//  backwards. A town that un-panics is worse than a town that never panicked.

export type Phase = 0 | 1 | 2 | 3;

/** Phase -> the existing NewsTier whose pools it draws. MORNING has no tier of
 *  its own; the caller supplies the new morning pool. */
export const TIER_OF_PHASE: [0, 0, 1, 2] = [0, 0, 1, 2];

/** Where each phase begins on the 0..1 driver. */
const PHASE_AT = [0, 0.13, 0.45, 0.78];

/** MORNING always gets at least this many cards, so the baseline exists even
 *  for a child who eats a house in the first ten seconds.
 *
 *  EVERY card counts toward this, including a reactive one, because the caller
 *  runs arcPhase() on every card it prints. That is deliberate: if a landmark
 *  goes in the first ten seconds the town has genuinely bigger news than the
 *  goat, and holding morning open afterwards would have the paper report a
 *  water tower vanishing and then go back to the parking meter. The first card
 *  is the greeting either way — the caller clears the reactive queue before it
 *  — so the baseline is never skipped outright. */
const MORNING_MIN_CARDS = 2;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

let arcHigh = 0;          // high-water mark of the driver
let phaseShown: Phase = 0;
let cardsShown = 0;

/** Call at every match start. */
export function resetArc(): void {
  arcHigh = 0; phaseShown = 0; cardsShown = 0;
}

export interface ArcIn {
  devouredPct: number;   // 0..100
  elapsed: number;       // seconds INTO the match (matchElapsed())
  matchLen: number;      // this match's length — solo is 120, ?len= overrides
  stage: number;         // curStage, already latched non-decreasing
}

/**
 * The phase for the card about to be shown.
 *
 * THE DRIVER IS max(how much is gone, how far through the clock) — the brief's
 * formula exactly. A child who eats fast sees the town panic early; a child who
 * wanders still gets there before the whistle.
 *
 * The clock term is a FRACTION of matchLen, never absolute seconds: solo runs
 * are 120s and ?len= overrides the rest, so an absolute term would strand a
 * short match in DOUBT for its whole life.
 */
export function arcPhase(inp: ArcIn): { phase: Phase; tier: 0 | 1 | 2; stepped: boolean } {
  const pctProg = clamp01((inp.devouredPct - 2) / 38);          // 0 at 2%, 1 at 40%
  const frac = inp.matchLen > 0 ? inp.elapsed / inp.matchLen : 0;
  const clockProg = clamp01((frac - 0.0667) / 0.7666);           // 0 at 6.7%, 1 at 83%
  // (1) HIGH-WATER MARK. The inputs themselves can fall; the arc may not.
  arcHigh = Math.max(arcHigh, Math.max(pctProg, clockProg));

  let target: Phase = 0;
  for (let p = 3; p >= 1; p--) if (arcHigh >= PHASE_AT[p]) { target = p as Phase; break; }

  // (2) FORM IS A FLOOR, NOT A TERM. The driver stays exactly max(pct, clock)
  // as specified — but a WORLD ENDER flattening downtown must never be handed
  // "spelling bee ends in a 14-way tie", which is a guarantee the old tier
  // logic made and this must not regress. curStage is already latched
  // non-decreasing by the NEVER-downgrade guard, so the floor is monotone too.
  const formFloor: Phase = inp.stage >= 4 ? 3 : inp.stage >= 3 ? 2 : inp.stage >= 1 ? 1 : 0;
  if (formFloor > target) target = formFloor;

  // MORNING is never skipped: the baseline has to be established or the
  // escalation has nothing to escalate from.
  if (cardsShown < MORNING_MIN_CARDS) target = 0;

  // (3) ONE STEP PER CARD. Makes "phases appear in order, never skipping,
  // never reversing" true by construction rather than by observation — a
  // fast eater climbs a rung per headline instead of teleporting to PANIC.
  const next = Math.min(target, phaseShown + 1) as Phase;
  const stepped = next > phaseShown;
  phaseShown = next;
  cardsShown++;
  return { phase: next, tier: TIER_OF_PHASE[next], stepped };
}

/** QA/telemetry: where the arc currently stands without advancing it. */
export const arcState = () => ({ phase: phaseShown, cards: cardsShown, high: arcHigh });
