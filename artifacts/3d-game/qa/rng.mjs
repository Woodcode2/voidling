// RNG — THE SCATTER GETS WHAT IT ASKED FOR.
//
//   node qa/rng.mjs [worlds] [port]
//
// A world can look right in a screenshot while a fifth of its authored props
// were never placed. That is what this measures, and it is how the broken
// placement generator was found: the repo's LCG multiplied past 2^53, which
// collapsed its period to 10,466 states, and pirate and skylark took 181,318
// and 169,139 draws through it. Once a stream laps, the scatter re-proposes
// ground it has already claimed, burns its try budget on rejections and gives
// up short — skylark's launchfield asked for 620 props and placed 133.
//
// TWO BARS.
//   R1  every world places at least 97% of the props it authored, and no
//       single district drops below 80% of its own request. A district can
//       legitimately reject a few points for being full; losing a fifth of a
//       district is a generator fault, not a full district.
//   R2  no single stream outruns its generator. mulberry32's period is 2^32,
//       so this is slack now — the bar exists because the failure it names
//       shipped, silently, in five worlds.
//   R3  no scatter pass places NOTHING. R1 is a percentage and a percentage
//       cannot see a landmark: Game Day's plaza asks for two helmet tunnels
//       and Lantern's bridge for ten market sheds, and either could fail in
//       full without moving a world off 98%. A pass that asked for props and
//       got none is a prop that is not in the game.
import { chromium } from 'playwright';
const ALL = 'maple,pirate,gameday,lantern,powder,skylark';
const ARGV = process.argv.slice(2).filter((a) => !a.startsWith('--'));
// --rows prints every scatter call, not just the districts that came up thin.
// A level designer asking "which of my passes is not landing?" needs the call,
// and the district roll-up hides a pass that asked for 40 and placed 2 inside a
// district that is otherwise full.
const ROWS = process.argv.includes('--rows');
const WORLDS = (ARGV[0] === 'all' ? ALL : (ARGV[0] || ALL)).split(',');
const PORT = ARGV[1] || '4177';
const PERIOD = 2 ** 32;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
let fail = 0;
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(400000);
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  const r = await p.evaluate(() => ({
    asks: (window.__scatterAsks?.() ?? []).map(a => [a.where, a.asked, a.placed, a.why]),
    stats: window.__rngStats?.() ?? null,
  }));
  await p.close();
  // MAPLE has no region scatter — it is hand-built off ./mainstreet's own
  // seeded stream — so an empty ledger there is the truth, not a miss.
  if (!r.asks.length) { console.log(`${wid.padEnd(9)} no region scatter (hand-built)`); continue; }
  // Roll the per-call rows up per district: one district is asked for its
  // props over many calls, and a call for 2 goalposts that places 1 is not a
  // district losing half its content.
  const per = new Map();
  let asked = 0, placed = 0;
  for (const [where, a, pl, w] of r.asks) {
    asked += a; placed += pl;
    const e = per.get(where) ?? [0, 0, 0, 0, 0];
    e[0] += a; e[1] += pl; e[2] += w.outside; e[3] += w.blocked; e[4] += w.busy;
    per.set(where, e);
  }
  const pct = (100 * placed) / asked;
  // A thin district reports what it spent its tries on, because "620 asked,
  // 268 placed" does not tell a level designer whether to move the props, thin
  // them out, or widen the clearance they are being held off the paths by.
  const thin = [...per].filter(([, [a, pl]]) => a >= 20 && pl / a < 0.80)
    .map(([w, [a, pl, out, blk, bsy]]) => {
      const t = out + blk + bsy || 1;
      return `${w} ${pl}/${a} (off-poly ${(100 * out / t) | 0}% clearance ${(100 * blk / t) | 0}% occupied ${(100 * bsy / t) | 0}%)`;
    });
  const s = r.stats ?? { longest: 0, streams: 0, draws: 0 };
  // Samples taken, across every scatter on the island. This is what the stall
  // detector spends, and the reason it is printed rather than assumed.
  let tries = 0; for (const [, , , w] of r.asks) tries += w.tries;
  const r1 = pct >= 97 && !thin.length;
  const r2 = s.longest < PERIOD;
  const zero = r.asks.filter(([, a, pl]) => a > 0 && pl === 0).map(([w, a]) => `${w} 0/${a}`);
  const r3 = !zero.length;
  if (!r1 || !r2 || !r3) fail++;
  console.log(`${wid.padEnd(9)} placed ${placed}/${asked} (${pct.toFixed(1)}%)  `
    + `streams ${s.streams}  draws ${s.draws}  tries ${tries}  `
    + `${r1 ? 'R1 ok' : 'R1 FAIL'}  ${r2 ? 'R2 ok' : 'R2 FAIL'}  ${r3 ? 'R3 ok' : 'R3 FAIL'}`);
  if (zero.length) console.log(`          placed NOTHING: ${zero.join('  ')}`);
  for (const t of thin) console.log(`          thin: ${t}`);
  if (ROWS) for (const [w, a, pl, y] of r.asks)
    if (pl < a) console.log(`          row  ${w} ${pl}/${a}`
      + ` (tries ${y.tries} off-poly ${y.outside} clearance ${y.blocked} occupied ${y.busy})`);
}
await b.close();
console.log(fail ? `RNG: ${fail} world(s) FAIL` : 'RNG: ok');
process.exit(fail ? 1 : 0);
