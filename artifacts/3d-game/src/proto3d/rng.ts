// ─────────────────────────────────────────────────────────────────────────────
// THE PLACEMENT GENERATOR
//
// Every world's scatter draws from here, and it exists because the generator it
// replaces did not work.
//
// WHAT WAS THERE. Five worlds carried a copy of the same LCG closure:
//
//     let sd = SEED;
//     () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
//
// which is the textbook glibc constant, and in C it has a period of 2^31. In
// JavaScript it does not. `sd` reaches 2^31, the multiply reaches 2.4e18, and
// the double runs out of mantissa at 9.0e15 — so the low bits of the product,
// which are the only bits `& 0x7fffffff` keeps, are rounding noise. Measured,
// not reasoned: from every seed in this repo the state enters a cycle of
// exactly 10,466.
//
// WHAT IT COST. Live draw counts on the shipped build: pirate 181,318 and
// skylark 169,139 — sixteen and seventeen laps of that 10,466-state loop, so
// scatter positions repeat exactly, many times over. scatterInRegion samples
// and rejects, and a position it has already claimed is rejected; once the
// stream is looping, a scatter spends its `n * 60` try budget re-proposing
// ground it already filled and then gives up short. The shortfall measured the
// same way, requested against placed:
//
//     powder    4493 / 4493   100.0%      23,655 draws — 2.3 laps
//     gameday   6071 / 6200    97.9%
//     lantern   5305 / 5494    96.6%
//     pirate    3659 / 4042     90.5%    181,318 draws
//     skylark   3926 / 4667     84.1%    169,139 draws
//
// Skylark's launchfield — the district the match opens on — asked for 620 props
// and placed 133. The world with the fewest draws is the only one that placed
// everything it authored. Maple is absent because maple never used this
// generator: it has had mulberry32 in ./mainstreet since it was written, and it
// is the one world that was never short.
//
// AND THE CYCLE WAS ONLY ONE OF THREE FAULTS, which is worth saying plainly
// because fixing it alone would have looked like a fix and left two thirds of
// the shortfall standing. Pirate went 90.5% -> 97.5% on the generator, 97.5% ->
// 98.6% on the try budget below, and skylark needed neither: 86.2% -> 99.1% on
// an authoring figure. Three causes, one symptom.
//
// WHAT IS HERE NOW. mulberry32: full 2^32 period, every step through Math.imul
// so nothing leaves the 32-bit lane, and already the generator qa/_worldshots
// installs over Math.random — so the page and its probes now agree on one
// generator instead of two.
//
// AND ONE STREAM PER CALL. A single per-world generator was still wrong in a
// way that only shows up when you edit: giving pirate's party deck its litter
// swung the spawn frame's food coverage from 37.9% to 16.2%, not because
// content left but because ~266 extra draws shifted the shared stream and
// reshuffled every district downstream. A measurement that moves when you add
// to a different district is not a measurement. So a scatter's stream is seeded
// from WHAT IT ASKED FOR — module, district, count, clearance, separation —
// and not from where it sits in the file. Two identical requests in one
// district are told apart by a counter, which is the only remaining way file
// order can matter, and it only matters between calls asking for exactly the
// same thing.
//
// WHAT THAT DOES AND DOES NOT BUY, precisely, because the weaker half is easy
// to forget. The DRAWS a scatter makes are now a function of what it asked for.
// The POINTS it keeps are not: scatterInRegion proposes and then rejects
// against the spatial hash, so a scatter still sees whatever ground earlier
// passes have claimed. For two scatters in disjoint districts that is nothing —
// adding litter to the party deck cannot move the market, which is the case
// this was written for. For the island-wide `scatterLand` passes it is not
// nothing: they cross every district, so they still shift when anything placed
// before them changes. Those passes are the wild scrub between the districts,
// and that is the honest boundary of the guarantee.
// ─────────────────────────────────────────────────────────────────────────────

/** FNV-1a, 32-bit. A string key in, a seed out, every step inside the lane. */
function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** mulberry32 — 2^32 period, no value repeats until the state comes back round. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How many streams have already been handed out under each key this build. */
const SEQ = new Map<string, number>();

/** What the streams did this build, for qa/rng.mjs. `longest` is the number
 *  that matters: the most draws any one stream took. A stream that outruns its
 *  generator's period starts proposing ground it has already filled, and the
 *  scatter gives up short — which is the bug this module was written for. The
 *  old LCG's period was 10,466 and pirate took 181,318 draws through it. */
export const RNG_STATS = { draws: 0, streams: 0, longest: 0 };

/** A world build starts with every counter at zero — the player can switch
 *  worlds without a reload (qa/worldswitch.mjs does exactly that), and a second
 *  build on the same page must lay the island out the same way as the first. */
export function resetStreams(): void {
  SEQ.clear(); ASKS.length = 0;
  RNG_STATS.draws = 0; RNG_STATS.streams = 0; RNG_STATS.longest = 0;
}

/** A stream that is the SAME every time it is asked for — no counter, no
 *  sequence. For a layout that TWO callers have to agree on: Lantern's stall
 *  slots are read three times, by the ground bake that paints a griddle pool
 *  under each stall, by the stalls themselves, and by the stallholders who
 *  stand behind them. They used to be three different draws off Math.random at
 *  three different points in one stream, and two of them did not even ask for
 *  the same pitch — so the brightest ground in the level was painted where no
 *  stall stood, and the spirit doing the greeting stood in the road. Same key,
 *  same slots, for anyone who asks. */
export function fixed(...parts: (string | number | undefined)[]): () => number {
  return mulberry32(seedOf(parts.map((x) => (x === undefined ? '' : String(x))).join('|')));
}

/** A generator for one scatter call, seeded from the call's own shape.
 *  `parts` is what was asked for: module, district, count, clearance, and
 *  whatever else distinguishes this request from its neighbours. */
export function stream(...parts: (string | number | undefined)[]): () => number {
  const key = parts.map((p) => (p === undefined ? '' : String(p))).join('|');
  const n = SEQ.get(key) ?? 0;
  SEQ.set(key, n + 1);
  const g = mulberry32(seedOf(`${key}#${n}`));
  RNG_STATS.streams++;
  let mine = 0;
  return () => {
    RNG_STATS.draws++;
    if (++mine > RNG_STATS.longest) RNG_STATS.longest = mine;
    return g();
  };
}

/** ── WHAT THE SCATTER ASKED FOR, AND WHAT IT GOT ──────────────────────────
 *  Every scatter call files its request and its result here, and qa/rng.mjs
 *  reads the ledger off the live page. This is the number that found the
 *  broken generator: a world can look right in a screenshot while a fifth of
 *  its authored props were never placed, and nothing in the build said so.
 *  One push per scatter call — about a hundred per world build. */
export interface Why { tries: number; outside: number; blocked: number; busy: number }
export interface Ask { where: string; asked: number; placed: number; why: Why }
export const ASKS: Ask[] = [];
export function tally(where: string, asked: number, placed: number, why: Why): void {
  ASKS.push({ where, asked, placed, why });
}

// ── HOW HARD A SCATTER TRIES ────────────────────────────────────────────────
// The budget used to be `n * 60` samples, flat, and that is the wrong shape:
// the work of placing a prop is not proportional to how many were asked for, it
// rises as the ground fills, and a flat budget stops a scatter that is still
// finding room while letting a hopeless one grind. So: keep sampling until the
// REGION says no, not until the counter does. STALL consecutive rejections is
// that signal; CAP is the backstop for a pathological region.
//
// AND IT MAY NEVER TAKE BUDGET AWAY. The first cut let STALL fire from the
// first sample, and qa/rng.mjs caught what that costs: Pirate's six lifeguard
// towers went to none placed. The counter resets on a success, so a pass that
// scores early keeps going — the beach's palms ran 12,492 and 16,736 tries —
// while a pass that has not yet scored once gives up at 2,500 however much
// budget it was granted. The lifeguards' beach is a thin diagonal strip inside
// a fat bounding box, so 78% of their samples miss the polygon before any
// other test runs, and they never got the early hit that would have kept them
// alive. This detector exists to let a scatter run LONGER; it has no business
// running one shorter, so the stall only applies once a pass has spent the
// budget it used to have.
//
// IT IS CHEAPER AS WELL AS BETTER, which was not the expected result. Pirate
// went from 3,940 of 4,042 props placed to 4,210 of 4,268 — and did it on
// 67,994 samples against 98,652, because a saturated region now bails at 2,500
// misses instead of spending the whole of `n * 60`. The beach was the district
// it fixed: 171 of 241, and 79% of its rejections were samples landing inside
// the bounding box but outside a long diagonal strip of a polygon — a scatter
// that needed more tries, not less room.
//
// WHAT IT DID NOT FIX, because a comment that only records the wins is not
// worth reading. Skylark's launch field went from 268 placed to 271 — three
// props for twice the budget, so budget was never its problem. Its fault was a
// third one and it lived in the authoring: a single scatter of 620 mixed props
// asked for `sep: 1.3` when the largest prop in the mix has a radius of 0.55,
// and since spotFree spaces two props at (sepA + sepB) x 0.82, every tether pin
// was holding 2.4x its own footprint against its neighbours. Split by prop
// class, each on its own footprint, the same 620 fit: skylark went 86.2% to
// 99.1% placed, 601 more props on the island. The ground was there the whole
// time. That is why qa/rng.mjs reports what a scatter spent its tries ON —
// three different faults produced the same symptom, and only the breakdown
// told them apart.
export const STALL = 2500;
export const CAP = (n: number, per: number) => Math.max(n * per, 40000);
