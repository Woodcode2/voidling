// ══════════════════════════════════════════════════════════════════════════
//  THE LADDER — thirty dots, and the one rule that decides where she is
// ══════════════════════════════════════════════════════════════════════════
//
//  Five goals per world in the owner's order — EAT, SET, LANDMARK, RIVALS,
//  CLEAR — thirty levels at launch.
//
//  THE RULE, AND WHOSE IT IS. Goal k+1 opens when goal k is DONE: the goal met
//  inside the clock. Not attempted. Not finished. Met.
//
//  That is the owner's decision of 2026-09-10, taken against the governor's
//  recommendation and with the argument against it in front of him: "We'd like
//  this to get more challenging like Angry Birds right. I think they should be
//  hitting the goals to move on. Maple starts easy. As you tick up maple and
//  other levels it gets harder." The recommendation was finish-advances, and
//  the reasoning behind it is not wrong — it is in docs/MENU-BRIEF.md §9.1 #1
//  and it is worth reading before anyone changes this rule back.
//
//  SO WHERE IS THE SAFETY NET? Two places, and both matter more under a win
//  gate than they would have under a finish gate:
//
//    1. BETWEEN WORLDS THE LADDER IS STILL FINISH-GATED. unlocks.ts is
//       untouched: any finished match on Maple opens Pirate, win or lose. A
//       child stuck on Maple dot 3 can still travel. That is deliberate — it
//       is what stops one hard dot from ending the game — and a future change
//       that win-gates the worlds too would resurrect exactly the wall
//       unlocks.ts's own header refuses.
//    2. THE GOALS CARRY THE DIFFICULTY, NOT THE GATE. Angry Birds can gate on
//       winning because every level is winnable. Ours were not: measured on
//       day 2, a perfect autopilot reached the hero landmark with 13-18
//       seconds left and never on Skylark, and CLEAR was set at a 100% nobody
//       reaches. Every one of the thirty is now set from thirty measured
//       matches (§3.4a) at a fraction of what a competent run manages on its
//       BAD day. If a goal cannot be met, the goal is wrong — never the child.
//
//  WHAT THIS FILE IS NOT. It holds state and the rule that moves it. It does
//  not know what a goal IS — no numbers, no per-world spec, no match wiring.
//  LEVEL_SPEC owns that (day 4), the match reports results into
//  recordLevelResult (day 5), and the pips read current() (day 7). Keeping the
//  numbers out means this file can be reasoned about on its own.

import { WORLD_ORDER, isUnlocked, type WorldKey } from './unlocks';
import { track } from '../proto3d/telemetry';

/** The five dots of a world, in the owner's order. */
export const GOALS = [1, 2, 3, 4, 5] as const;
export type Goal = 1 | 2 | 3 | 4 | 5;

/** The kinds, in dot order — used for telemetry and the goal card. */
export const GOAL_KIND = ['eat', 'set', 'landmark', 'rivals', 'clear'] as const;
export type GoalKind = typeof GOAL_KIND[number];
export const kindOf = (g: Goal): GoalKind => GOAL_KIND[g - 1];

/**  locked  she cannot reach it yet — the dot before it is not done
 *   open    reachable, never attempted
 *   fin     ATTEMPTED AND MISSED. Coins kept, nothing taken away, and under
 *           the owner's win gate this is STILL THE CURRENT DOT: the green ring
 *           does not move. It is not a failure state, it is "not yet".
 *   done    the goal met inside the clock — the tick. This is what advances.
 *   clear   done, AND the world's CLEAR number reached in the same run — the
 *           star. Decoration on top of done; it advances nothing extra. */
export type LevelState = 'locked' | 'open' | 'fin' | 'done' | 'clear';

/** States only ever rise. Every write goes through this ordering, so no code
 *  path can demote a dot a child has already earned — the ladder's version of
 *  unlocks.ts's "NOBODY IS EVER RE-LOCKED". */
const RANK: Record<LevelState, number> = { locked: 0, open: 1, fin: 2, done: 3, clear: 4 };
const higher = (a: LevelState, b: LevelState): LevelState => (RANK[a] >= RANK[b] ? a : b);
/** Has this dot been PASSED? Only a met goal passes; 'fin' does not. */
const passed = (s: LevelState): boolean => s === 'done' || s === 'clear';

export interface LevelRow {
  st: LevelState;
  /** EAT score · SET seconds · LANDMARK seconds · RIVALS rank · CLEAR pct. */
  best: number;
  /** Best devouredPct on this dot. */
  pct: number;
  /** toDateString() of the first attempt — the voidDailyLast convention. */
  first: string;
  /** Attempts, including misses and quits. */
  n: number;
  /** Unknown fields from a newer build are carried through untouched. */
  [k: string]: unknown;
}

const KEY = 'voidLevels';
export const LEVELS_VER = 1;

type Saved = { v?: number; w?: Record<string, Record<string, Partial<LevelRow>>>; [k: string]: unknown };

const blank = (): LevelRow => ({ st: 'locked', best: 0, pct: 0, first: '', n: 0 });

// ── storage ───────────────────────────────────────────────────────────────
// Every read and write is wrapped: localStorage throws in private mode, and a
// ladder that throws on read is a game that will not boot. The convention is
// unlocks.ts's, and the JSON shape is matchdeck's and voidStats's rather than
// unlocks' CSV, because a row has five fields and a CSV of those is a parser.

function readRaw(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { v: LEVELS_VER, w: {} };
    const d = JSON.parse(raw) as Saved;
    return d && typeof d === 'object' ? d : { v: LEVELS_VER, w: {} };
  } catch { return { v: LEVELS_VER, w: {} }; }
}

function writeRaw(d: Saved): void {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* private mode */ }
}

/** GRANDFATHERING, and the one thing it must never do.
 *
 *  Runs on every read, like unlocks.migrate(). It only ever RAISES a state.
 *
 *  What it credits: a world that is unlocked has been reached, so its dot 1 is
 *  at least 'open'. A world with a recorded voidBest_<w> has had a match
 *  FINISHED on it, so its dot 1 is at least 'fin'.
 *
 *  What it deliberately does NOT credit: dot 2. A finished match is not a met
 *  goal, and under the owner's win gate only a met goal opens the next dot.
 *  Crediting it would hand every existing player five dots they never played.
 *  (Once LEVEL_SPEC lands on day 4 this can do better than 'fin' — a recorded
 *  best that clears the new EAT number is a demonstrated win and can be
 *  credited 'done'. It is left conservative until the numbers exist rather
 *  than guessed at now.)
 *
 *  The global voidBestPct is never turned into a per-world 'clear': it is one
 *  key for the whole game (prototype3d.ts), so spending it per world would
 *  award five stars for one good run. */
function migrate(d: Saved): Saved {
  const w = (d.w ??= {});
  let grew = false;
  const raise = (world: string, goal: number, st: LevelState, extra?: Partial<LevelRow>) => {
    const rows = (w[world] ??= {});
    const cur = (rows[String(goal)] ??= blank() as Partial<LevelRow>);
    const was = (cur.st as LevelState) ?? 'locked';
    const now = higher(was, st);
    if (now !== was) { cur.st = now; grew = true; }
    if (extra) for (const [k, v] of Object.entries(extra)) {
      if (typeof v === 'number' && typeof cur[k] === 'number' && (cur[k] as number) >= v) continue;
      cur[k] = v; grew = true;
    }
  };

  // maple/1 is never locked — the mirror of unlocks.ts's "read() adds maple".
  raise('maple', 1, 'open');

  for (const world of WORLD_ORDER) {
    try { if (isUnlocked(world)) raise(world, 1, 'open'); } catch { /* private mode */ }
    let best = 0;
    try { best = Number(localStorage.getItem(`voidBest_${world}`) || 0); } catch { /* private mode */ }
    if (best > 0) raise(world, 1, 'fin', { best });
  }

  if ((d.v ?? 0) < LEVELS_VER) {
    const from = d.v ?? 0;
    d.v = LEVELS_VER;
    grew = true;
    track('save_migrated', { key: KEY, from });
  }
  if (grew) writeRaw(d);
  return d;
}

const load = (): Saved => migrate(readRaw());

/** One dot's row. A missing entry reads 'locked'. */
export function levelRow(world: string, goal: Goal): LevelRow {
  const d = load();
  const r = d.w?.[world]?.[String(goal)];
  return { ...blank(), ...(r as LevelRow | undefined) };
}

/** All thirty, in world then goal order — what the pips and __levels() read.
 *  A dot is 'locked' unless the dot before it is PASSED, so the derived state
 *  can never disagree with the rule. */
export function allLevels(): ({ world: WorldKey; goal: Goal; kind: GoalKind } & LevelRow)[] {
  const d = load();
  const out: ({ world: WorldKey; goal: Goal; kind: GoalKind } & LevelRow)[] = [];
  for (const world of WORLD_ORDER) {
    let prevPassed = true;   // dot 1's "previous" is the world being reachable
    for (const g of GOALS) {
      const stored = { ...blank(), ...(d.w?.[world]?.[String(g)] as LevelRow | undefined) };
      // DERIVED, NOT TRUSTED. 'open' means exactly one thing — the dot before
      // this one was passed — so it is computed here rather than believed from
      // storage, and the pips can never disagree with the rule. Storage may
      // raise a dot ABOVE open (an earned tick is never taken away, and a 'fin'
      // means she was there) but it may not invent reachability.
      if (stored.st === 'locked' && prevPassed) stored.st = 'open';
      else if (stored.st === 'open' && !prevPassed) stored.st = 'locked';
      out.push({ world, goal: g, kind: kindOf(g), ...stored });
      prevPassed = passed(stored.st);
    }
  }
  return out;
}

/** WHERE THE GREEN RING IS, for one world.
 *
 *  A pure function of that world's row — there is no stored "current". Draft 1
 *  kept a cross-world frontier and it disagreed with the pip row on any profile
 *  whose built world was not the frontier world (pickedWorld is a boot const),
 *  and PLAY would have reloaded a ?w=pirate page into Maple for about a hundred
 *  probes.
 *
 *  The lowest dot she has not PASSED. Under the win gate that is the lowest
 *  'open' or 'fin' — a missed dot is still where she is. Goal 5 when the world
 *  is finished, so the ring has somewhere to sit. */
export function current(world: string): Goal {
  const rows = allLevels().filter((r) => r.world === world);
  for (const r of rows) if (!passed(r.st)) return r.goal;
  return 5;
}

/** The level's ordinal for the end card — "LEVEL 8 OF 30". Never shown on the
 *  menu; Hole.io puts it here and the recon agrees. */
export const ordinal = (world: string, goal: Goal): number =>
  Math.max(0, WORLD_ORDER.indexOf(world as WorldKey)) * 5 + goal;

export interface LevelResult {
  world: string;
  goal: Goal;
  kind?: GoalKind;
  /** 'win' — the goal met inside the clock. 'time' — the buzzer, goal unmet.
   *  'quit' — she left; an attempt, never a pass. */
  result: 'win' | 'time' | 'quit';
  /** The dot's own measure: EAT score, SET seconds, LANDMARK seconds, RIVALS
   *  rank, CLEAR pct. */
  best?: number;
  score?: number;
  pct?: number;
  rank?: number;
  secs?: number;
  /** True when the world's CLEAR number was reached in the same run — the star. */
  cleared?: boolean;
}

/** Record what a match did to a dot, and open the next one if it was won.
 *
 *  THE ONLY PLACE A LEVEL STATE RISES. Called from endMatch (day 5) after
 *  `ended` is set and BEFORE the solo branch returns — that return is why a
 *  child who only ever played BY MYSELF never unlocked world 2, and the same
 *  early return would have swallowed every level result.
 *
 *  A quit counts an attempt and nothing else. It is not a finish and it is
 *  certainly not a win; a child who leaves has not met a goal, and counting it
 *  would let a frustrated tap through the gate. */
export function recordLevelResult(r: LevelResult): { opened: Goal | null; state: LevelState } {
  const d = load();
  const rows = ((d.w ??= {})[r.world] ??= {});
  const cur = (rows[String(r.goal)] ??= blank() as Partial<LevelRow>);
  const was = (cur.st as LevelState) ?? 'locked';

  cur.n = (Number(cur.n) || 0) + 1;
  if (!cur.first) cur.first = new Date().toDateString();

  // RIVALS is a RANK: lower is better, so `best` is a MINIMUM on dot 4 and a
  // maximum everywhere else. One field, two directions — and the measure for
  // dot 4 is the rank, never the score. The first version of this read
  // `r.best ?? r.score` on every dot, so a RIVALS result carrying rank 2 and a
  // score of 31,000 would have recorded 31,000 as the child's best RANK and
  // then, being a minimum, refused every genuine rank afterwards.
  const measure = r.goal === 4
    ? (r.best ?? r.rank ?? 0)
    : (r.best ?? r.score ?? 0);
  if (r.goal === 4) {
    const prev = Number(cur.best) || 0;
    if (measure > 0) cur.best = prev > 0 ? Math.min(prev, measure) : measure;
  } else cur.best = Math.max(Number(cur.best) || 0, measure);
  if (typeof r.pct === 'number') cur.pct = Math.max(Number(cur.pct) || 0, r.pct);

  let next: LevelState = was;
  if (r.result === 'win') next = higher(next, r.cleared ? 'clear' : 'done');
  else if (r.result === 'time') next = higher(next, 'fin');
  // 'quit' raises nothing.
  cur.st = next;

  // …and the NEXT dot opens only on a pass. This is the win gate, in one line.
  let opened: Goal | null = null;
  if (passed(next) && r.goal < 5) {
    const nk = String((r.goal + 1) as Goal);
    const nrow = (rows[nk] ??= blank() as Partial<LevelRow>);
    const nwas = (nrow.st as LevelState) ?? 'locked';
    if (nwas === 'locked') { nrow.st = 'open'; opened = (r.goal + 1) as Goal; }
  }
  writeRaw(d);

  const kind = r.kind ?? kindOf(r.goal);
  const base = { world: r.world, goal: r.goal, kind, secs: Math.round(r.secs ?? 0),
    attempt: Number(cur.n), score: Math.round(r.score ?? 0), pct: r.pct ?? 0, rank: r.rank ?? 0 };
  if (r.result === 'win') track('level_win', { ...base, cleared: !!r.cleared });
  else if (r.result === 'time') track('level_fin', base);
  else track('level_quit', base);

  return { opened, state: next };
}

/** Fired when a level is entered — the other half of the funnel. Without this
 *  pair nobody can answer "which dot do they stop on", which is the only
 *  question that matters after launch. */
export const trackLevelStart = (world: string, goal: Goal): void => {
  track('level_start', { world, goal, kind: kindOf(goal), attempt: Number(levelRow(world, goal).n) + 1 });
};
