// ── MATCH 2 IS NOT MATCH 1 — the deck that deals a match its hand ───────────
//
// The AAA audit's finding (docs/AAA-BRIEF.md §4.5): "Match 2 of a world is
// identical to match 1: same island, same hand-authored spawn, same four beats
// in the same order, same lighting." The spine of the fix is here; the content
// it deals — the middle-beat pools and the light hours — is authored where
// beats and light already live (prototype3d.ts).
//
// TWO RULES, BOTH LOAD-BEARING:
//
//   1. MATCH 1 OF A FRESH PROFILE IS ALWAYS THE SHIPPED BASELINE. The owner's
//      recorded call on the opening (see FIXED START in resetMatch: "the void
//      should start somewhere more fun and super crisp. Consistency is key
//      here") is why the SPAWN never varies at all — and why the first match
//      a child ever plays is the hand-tuned one, bit-identical to what every
//      probe measures on a fresh profile. Variation begins on match two.
//      Every qa instrument seeds a fresh profile, so every instrument keeps
//      measuring the baseline without knowing this module exists.
//
//   2. THE DEAL IS A CYCLE, NOT A ROLL. A random draw can deal the same hand
//      twice in a row — and "match 2 must differ from match 1" is the entire
//      point. The pair cycle below changes BOTH middle slots on every
//      consecutive match and shows all four of a world's middle beats inside
//      any two consecutive matches.
const KEY = 'voidMatchN';

function readAll(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, number>; }
  catch { return {}; }
}

/** How many matches this profile has STARTED on this world. */
export function matchNumber(world: string): number { return readAll()[world] || 0; }

/** Bank the start of a match; returns the 0-based index of the match that is
 *  starting (0 = the baseline first match). Called once, from beginMatch —
 *  several entry points lead into a match and they all pass through there. */
export function bumpMatch(world: string): number {
  const all = readAll();
  const n = all[world] || 0;
  all[world] = n + 1;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage blocked: memory profile, still varies within the session */ }
  return n;
}

/** [slot-66, slot-110] as indexes into the world's pool of four middle beats.
 *  Authored so consecutive entries share no index IN EITHER SLOT. */
const PAIRS: [number, number][] = [[0, 1], [2, 3], [3, 0], [1, 2]];

export interface Deal { n: number; mid: [number, number]; hour: number }

/** The hand for match n on a world with `hours` authored light variants.
 *  Pure — the probes call it too. */
export function deal(n: number, hours: number): Deal {
  return { n, mid: PAIRS[n % PAIRS.length], hour: hours > 1 ? n % hours : 0 };
}
