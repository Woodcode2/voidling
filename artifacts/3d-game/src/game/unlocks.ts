// ══════════════════════════════════════════════════════════════════════════
//  WORLD UNLOCKS — four little ceremonies, and never a wall
// ══════════════════════════════════════════════════════════════════════════
//
//  THE RULE, AND WHY IT IS THIS ONE. A world opens when you FINISH a match on
//  the world before it. Not win it. Not place. Not pay.
//
//  Winning was the obvious alternative and it is the wrong one for this
//  audience: a six-year-old who cannot come first would be locked out of three
//  quarters of the game they can see on the shelf, and the one thing this
//  build has never done is punish a child for being small. Finishing is nearly
//  unmissable — a match is three minutes and the difficulty floor means nobody
//  ends below third — so in practice this is not a gate at all. It is four
//  "NEW WORLD!" moments spread across a first session, which is the thing a
//  kid actually plays for. And coins were never a candidate: a currency gate
//  in a 4+ game is a paywall wearing a hat.
//
//  LOCKED IS NOT HIDDEN. The picker still shows every world, desaturated, with
//  the reason spelled out on the card ("FINISH MAPLE FALLS TO UNLOCK"). A lock
//  that does not say why is just a broken button; a lock that says why is a
//  goal. The art is the advertisement for the next one.
//
//  NOBODY IS EVER RE-LOCKED. Anyone who has already played a world keeps it,
//  forever, whatever this file says (see migrate()) — this shipped after
//  players existed, and taking a world away from a child who was in it
//  yesterday would be the worst possible way to introduce progression.

export type WorldKey = 'maple' | 'pirate' | 'gameday' | 'lantern' | 'powder';

/** The order they open in. Maple is world 1 and is always open. */
export const WORLD_ORDER: WorldKey[] = ['maple', 'pirate', 'gameday', 'lantern', 'powder'];

/** Display names, for the "finish X to unlock" line on a locked card. */
export const WORLD_LABEL: Record<WorldKey, string> = {
  maple: 'MAPLE FALLS', pirate: 'PIRATE BAY', gameday: 'GAME DAY', lantern: 'LANTERN NIGHT', powder: 'POWDER PASS',
};

const KEY = 'voidUnlocked';

function read(): Set<string> {
  let raw = '';
  try { raw = localStorage.getItem(KEY) ?? ''; } catch { /* private mode */ }
  const s = new Set(raw ? raw.split(',').filter(Boolean) : []);
  s.add('maple');   // world 1 is never locked, whatever is in storage
  return s;
}
function write(s: Set<string>): void {
  try { localStorage.setItem(KEY, [...s].join(',')); } catch { /* private mode */ }
}

/** GRANDFATHERING. A world with a recorded best score, or the world the player
 *  currently has selected, has obviously been played — it stays open. Runs on
 *  every read path, so an existing player never sees a world they know
 *  suddenly wearing a padlock. */
function migrate(s: Set<string>): Set<string> {
  let grew = false;
  for (const w of WORLD_ORDER) {
    if (s.has(w)) continue;
    let played = false;
    try {
      played = Number(localStorage.getItem(`voidBest_${w}`) || 0) > 0
        || localStorage.getItem('voidWorld') === w;
    } catch { /* private mode */ }
    if (played) { s.add(w); grew = true; }
  }
  if (grew) write(s);
  return s;
}

export const isUnlocked = (w: string): boolean => migrate(read()).has(w);

/** The world that must be finished to open this one, or null if it is open
 *  (or is world 1). Drives the copy on a locked card. */
export function gateFor(w: string): WorldKey | null {
  const i = WORLD_ORDER.indexOf(w as WorldKey);
  if (i <= 0) return null;
  return isUnlocked(w) ? null : WORLD_ORDER[i - 1];
}

/** Call when a match FINISHES on `world` (win or lose — finishing is the bar).
 *  Returns the world this just opened, or null if nothing changed. The caller
 *  owns the celebration; this only records it. */
export function completeWorld(world: string): WorldKey | null {
  const i = WORLD_ORDER.indexOf(world as WorldKey);
  if (i < 0 || i >= WORLD_ORDER.length - 1) return null;   // no world after the last
  const next = WORLD_ORDER[i + 1];
  const s = migrate(read());
  if (s.has(next)) return null;                            // already open, no ceremony
  s.add(next); write(s);
  return next;
}

/** How many of the four are open — for the picker's header and telemetry. */
export const unlockedCount = (): number =>
  WORLD_ORDER.filter((w) => migrate(read()).has(w)).length;
