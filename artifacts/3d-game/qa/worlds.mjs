// THE WORLD LIST, DERIVED ONCE — the fix for a gate that could go green on a
// world it never loaded.
//
// Every probe in this directory needs two things from the game: the list of
// worlds to sweep, and an unlock string that makes all of them clickable. Both
// were hand-typed, in eighty files. So the day SKYLARK FIELD landed, eighty
// probes still believed the game had five worlds — and four of them are IN THE
// PUSH GATE. `faceparity`, `purpose`, `newsfeed` and `variety` would have swept
// five worlds and printed PASS; `econ`, `pickerfit`, `uisystem` and `skycut`
// would have unlocked five and tested whichever of them the harness picked.
// None of them would have said a word about world 6. The gate would have gone
// green on a world no probe had ever opened.
//
// That is the same failure that shipped a stale world list in qa/newsstyle.mjs
// and a stale KNOWN list in qa/placement.mjs — twice fixed by deriving the list
// from source, twice left un-generalised. This is the generalisation.
//
// The source of truth is island.ts's WorldId union, because that is the union
// the renderer switches on: a world that is not in it cannot be drawn, and a
// world that is in it MUST be handled by every dispatch in island.ts or tsc
// fails the build. So it cannot drift from what the game can actually show.
import fs from 'node:fs';

/** Every world the game can render, in declaration order. */
export const ALL_WORLDS = (() => {
  const src = fs.readFileSync(new URL('../src/proto3d/island.ts', import.meta.url), 'utf8');
  const m = /export type WorldId =([^;]+);/.exec(src);
  if (!m) throw new Error('qa/worlds: cannot read the WorldId union from src/proto3d/island.ts');
  const ids = [...m[1].matchAll(/'([a-z0-9]+)'/g)].map(([, id]) => id);
  if (!ids.length) throw new Error('qa/worlds: the WorldId union parsed to nothing');
  return ids;
})();

/** What goes in localStorage.voidUnlocked to make every card clickable.
 *  Probes that are TESTING the lock (unlocks, lockedcards, _lockab) must keep
 *  their own partial strings — this is for the other eighty. */
export const UNLOCK_ALL = ALL_WORLDS.join(',');

/** The standard probe preamble. Pass a seed for a deterministic run, or null.
 *  Written as a string of source rather than a function because it is handed to
 *  page.addInitScript, which serialises it into the page — a closure over
 *  UNLOCK_ALL would not survive the trip. */
export const initScript = (seed = null) => `
  try {
    localStorage.clear();
    localStorage.setItem('voidPlayed', '1');
    localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidUnlocked', ${JSON.stringify(UNLOCK_ALL)});
  } catch {}
  ${seed === null ? '' : `
  { let s = ${Number(seed)} >>> 0;
    Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }`}
`;
