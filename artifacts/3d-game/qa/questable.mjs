// CAN EVERY QUEST THIS WORLD CAN DRAW ACTUALLY BE FINISHED IN IT?
//
// The daily quest board is the come-back-tomorrow hook. It is on screen in
// every match and on every results card. A chip a child cannot move is worse
// than no chip: they will keep trying, because a six-year-old assumes the game
// is right and they are wrong.
//
// THIS BUG HAS SHIPPED THREE TIMES. The comments around MED_Q in
// prototype3d.ts record the first two — Maple drawing 'cars'/'houses' before
// Game Day's trucks and frat houses were tagged, and 'cabanas' sitting in two
// of Pirate's pools. Each was fixed by editing a nested ternary. A ternary
// cannot be checked against the levels, so nothing checked it, and the next
// world reopened it. The third round was found by an audit, not by the kit:
//
//     LANTERN NIGHT   149/365 days drew 'cars'. The level has zero cars.
//     POWDER PASS     234/365 days drew a dead HARD chip — 'houses' (the block
//                     tags chalet/lodge/hut, never 'house') and 'big' (wants
//                     three objects of radius >= 6; the level has one).
//
// So this probe closes the CLASS rather than the instance. For every world it
// takes the pools the client actually publishes (__questPools), replays the
// real day-seed draw over a year, and checks every quest that can come up
// against what the world actually puts on the ground.
//
//   node qa/questable.mjs [port] [worlds...]
//
// SUPPLY is counted the way the game scores it, from the same three rules in
// the eat handler — a tag match, a radius band, or the gild flag — so the
// probe cannot pass on a technicality the game does not honour.
//
// TRAPS: seed voidUnlocked or a locked card refuses the tap by design and this
// hangs; and wait for the async glb props to settle or the count is a different
// world every run.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv.slice(3).length ? process.argv.slice(3) : ['maple', 'pirate', 'gameday', 'lantern', 'powder'];
const DAYS = 365;

// THE HOUSE ALIAS IS READ FROM THE CLIENT, NOT KEPT HERE. The first version of
// this probe carried its own copy of the list, and that copy is exactly how a
// probe passes while the game fails: run against the pre-fix build it counted
// chalets as houses because IT knew they were houses, while the game did not,
// and it reported Powder's dead 'houses' chip as fine. prototype3d.ts publishes
// HOUSE_LIKE through __questPools and this reads that.

const NOT_GROUND = new Set(['devourer', 'combo', 'rival', 'gulp', 'collapse', 'solo40', 'gild']);
// gildTreasure() gilds this many props at the start of every match. The 'gold'
// chip wants 4, so the mechanism covers it on any world with enough props to
// gild — asserted per world below rather than assumed.
const GILD_PER_MATCH = 20;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const fails = [];
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', JSON.stringify(['maple', 'pirate', 'gameday', 'lantern', 'powder']));
  } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState && !!window.__questPools, null, { timeout: 400000 });
  await p.waitForFunction(() => {
    const n = window.__edibles.length;
    if (window.__lastN !== n) { window.__lastN = n; window.__stableSince = performance.now(); return false; }
    return performance.now() - (window.__stableSince || 0) > 2000;
  }, null, { timeout: 300000, polling: 250 });

  const { pools, supply } = await p.evaluate(() => {
    const pools0 = window.__questPools();
    const HL = new Set(pools0.houseLike);
    const s = {};
    const bump = (k) => { s[k] = (s[k] || 0) + 1; };
    for (const e of window.__edibles) {
      const m = e.mesh; if (!m) continue;
      const qk = m.userData.qk;
      const r = e.radius || 0;
      // the eat handler's rules, in its order
      if (r < 1) bump('snack');
      if (r >= 6) bump('big');
      if (m.userData.gild) bump('gild');
      if (r >= 2.6 && r <= 3.4) bump('cabana');
      if (qk) bump(qk);
      if (qk && HL.has(qk) && qk !== 'house') bump('house');
    }
    return { pools: pools0, supply: s };
  });

  // Replay the shipped draw. daySeed is a uint32 imul hash of toDateString(),
  // and the three slots use daySeed, daySeed>>>2 and daySeed>>>4 through a
  // no-duplicate draw. Anything this can produce, a child can be shown.
  const drawable = new Set();
  const base = new Date('2026-01-01T12:00:00Z');
  for (let d = 0; d < DAYS; d++) {
    const day = new Date(base.getTime() + d * 86400000).toDateString();
    let seed = 7;
    for (const c of day) seed = (Math.imul(seed, 31) + c.charCodeAt(0)) >>> 0;
    const taken = new Set();
    const draw = (pool, sd) => {
      const free = pool.filter((id) => !taken.has(id));
      const src = free.length ? free : pool;
      const id = src[sd % src.length];
      taken.add(id); return id;
    };
    drawable.add(draw(pools.easy, seed));
    drawable.add(draw(pools.med, seed >>> 2));
    drawable.add(draw(pools.hard, seed >>> 4));
  }

  const spec = new Map(pools.spec.map((q) => [q.id, q]));
  const dead = [];
  for (const id of drawable) {
    const q = spec.get(id);
    if (!q) { dead.push(`${id} (no such quest in QUEST_POOL)`); continue; }
    // NOT GROUND SUPPLY. Each of these is earned by PLAYING rather than by
    // eating a tagged object, so counting props for them is meaningless — and
    // the first version of this probe did exactly that and reported two false
    // deaths on every world, which is the instrument bug this project's briefs
    // warn about (FABLE-BRIEF's traps, item 10). Listed with the reason rather
    // than as a bare skip-list, so the next person can tell a genuine exemption
    // from a convenient one:
    //   devourer  the form ladder — reaching CHOMPOSAURUS. No prop involved.
    //   combo     a x2.0 multiplier. A rate, not an object.
    //   rival     eating one of the five family voids, which every world spawns.
    //   gulp/collapse/solo40  retired mechanics (POWERS_ON is false).
    //   gild      twenty props are gilded PER MATCH by gildTreasure(), re-rolled
    //             every match, and it runs at match start — after this probe
    //             samples. Supply is guaranteed by that function, not by the
    //             level, so it is checked below against the mechanism instead.
    if (NOT_GROUND.has(q.kind)) continue;
    const have = supply[q.kind] || 0;
    if (have < q.target) dead.push(`${id} needs ${q.target} ${q.kind}, world has ${have}`);
  }
  // the gild mechanism, checked rather than waved through
  const goldQ = pools.spec.find((q) => q.kind === 'gild');
  if (goldQ && drawable.has(goldQ.id)) {
    const eligible = Object.values(supply).length ? (supply.snack || 0) : 0;
    if (Math.min(GILD_PER_MATCH, eligible) < goldQ.target)
      dead.push(`${goldQ.id} needs ${goldQ.target} gilded, and only ${eligible} props are giltable here`);
  }
  if (dead.length) fails.push(`${wid}: ${dead.join('; ')}`);

  console.log(`\n══ ${wid.toUpperCase()} ══`);
  console.log(`   pools     easy[${pools.easy}] med[${pools.med}] hard[${pools.hard}]`);
  console.log(`   drawable  ${[...drawable].sort().join(', ')}`);
  console.log(`   supply    ${Object.entries(supply).sort((a, c) => c[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  ')}`);
  console.log(`   ${dead.length ? '✗ ' + dead.join('; ') : '✓ every drawable chip can be finished here'}`);
  await p.close();
}
await b.close();
console.log('\n  ' + (fails.length ? 'FAIL — ' + fails.join(' | ') : `PASS — over ${DAYS} days no world can show a chip it cannot clear`) + '\n');
