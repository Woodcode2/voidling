// HOW MANY STICKERS DOES A REAL PLAYTHROUGH ACTUALLY FIND?
//
//   npm run build && npx vite preview --port 4177 --host 127.0.0.1
//   node qa/finds.mjs [worlds] [runs] [policy] [port]
//
// POLICY is the player being simulated, and it is the whole experiment:
//   keen    — drive at the nearest thing you can swallow. A competent player.
//   wander  — pick a direction, hold it for a couple of seconds, pick another,
//             and only divert to something edible if it is already close. This
//             is a SIX-YEAR-OLD, and it is the floor that decides whether the
//             Scrapbook ships: `keen` finding four per run is meaningless if
//             the child who actually buys this game finds nothing.
//
// This is the one claim the whole Scrapbook rests on and it had never been
// measured. Twelve curios are hidden across an island spanning ±290 units in
// a 180-second match. If a competent player finds zero, the book is a menu
// screen full of locked cells that nothing in the game ever opens — which is
// worse than not shipping it, because an empty collection reads as a broken
// promise rather than as an absent feature.
//
// The target is not "all twelve". A collection you complete in one run is not
// a collection. But there is a floor: a first-time player who plays one match
// and unlocks NOTHING has no reason to believe the book is reachable, and a
// player who unlocks all twelve has no reason to play a second time. The
// honest range is roughly 2-5 per run — enough that the reveal fires and the
// grid visibly fills, few enough that four worlds x twelve is a season rather
// than an afternoon.
//
// The autopilot is the one from pace.mjs: drive at the nearest edible you can
// currently swallow. That is a COMPETENT player and deliberately not an
// omniscient one — it does not know where the curios are and never steers
// toward them, so a find here is incidental, exactly as it is in the product.
// A probe that homed on the curios would measure the hiding places instead of
// the hunting, and would report a number no child will ever see.
import { chromium } from 'playwright';

const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const RUNS = +(process.argv[3] || 1);
const POLICY = process.argv[4] || 'keen';
const PORT = process.argv[5] || '4177';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const rows = [];
for (const wid of WORLDS) {
  for (let run = 0; run < RUNS; run++) {
    const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
    await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
    // A COLD BOOK, every run. voidStickers is explicitly cleared: with a warm
    // book placeStickers() skips everything already found, so run 2 would hide
    // fewer curios than run 1 and the average would drift down for a reason
    // that has nothing to do with findability.
    await p.addInitScript(() => { try {
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidBookSeen', '1');
      localStorage.removeItem('voidStickers');
      localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
    await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
    await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
      if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
    await p.click('#btnPlay'); await p.waitForTimeout(1400);
    await p.click(`#worldRow .wCard[data-world="${wid}"]`);
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
    await p.evaluate(() => { window.__renderer.render = () => { }; });

    const placed = await p.evaluate(() => window.__edibles.filter((e) => e.mesh?.userData?.sticker).length);

    await p.evaluate((policy) => {
      // Log each find with the clock and the void's radius at that moment.
      // WHEN a find happens is as interesting as whether: all twelve landing
      // in the last thirty seconds would mean the curios are simply gated
      // behind size, not hidden — a different feature with a different fix.
      window.__hits = [];
      const seen = new Set();
      setInterval(() => {
        const ms = window.__matchState?.(); if (!ms) return;
        for (const e of window.__edibles) {
          const sid = e.mesh?.userData?.sticker;
          if (!sid || !e.eaten || seen.has(sid)) continue;
          seen.add(sid);
          window.__hits.push({ id: sid, t: +ms.t.toFixed(1), r: +ms.r.toFixed(2) });
        }
      }, 200);
      const cv = document.querySelector('canvas');
      const cx = innerWidth / 2, cy = innerHeight / 2;
      cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
      // the wanderer's current heading and how long it has held it — seeded off
      // a fixed number so a wander run is repeatable rather than a coin toss
      let seed = 20260805, head = 0, holdUntil = -1;
      const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 100000) / 100000; };
      const tick = () => {
        const vs = window.__voidState(); let best = null, bd = 1e9;
        for (const e of window.__edibles) {
          if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
          const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
          const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
        }
        let aim = best;
        if (policy === 'wander') {
          const t = (window.__matchState?.().t ?? 0);
          if (t > holdUntil) { head = rnd() * Math.PI * 2; holdUntil = t + 1.6 + rnd() * 2.2; }
          // only divert to food already under your nose — 22 units, which is
          // about a thumb's width on the screen. Everything further away the
          // wanderer simply does not go and get.
          aim = (best && bd < 22 * 22) ? best : { dx: Math.cos(head), dz: Math.sin(head) };
        }
        if (aim) { const m = Math.hypot(aim.dx, aim.dz) || 1;
          dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
            clientX: cx + aim.dx / m * 110, clientY: cy + aim.dz / m * 110, bubbles: true })); }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, POLICY);

    await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
      null, { timeout: 900000 });
    const r = await p.evaluate(() => ({
      hits: window.__hits,
      // the results-screen reveal is the payoff; if it does not appear the
      // find never reached the player no matter what the counter says
      reveal: document.getElementById('endFinds')?.classList.contains('show') ?? false,
      revealCells: document.querySelectorAll('#endFinds .stk').length,
    }));
    rows.push({ wid, run, placed, ...r });
    console.log(`${wid.padEnd(8)} ${POLICY.padEnd(6)} run${run + 1}  hid ${String(placed).padStart(2)}  found ${String(r.hits.length).padStart(2)}`
      + `  reveal ${r.reveal ? `yes (${r.revealCells})` : 'NO '}`
      + `  at ${r.hits.map((h) => `${h.id}@${h.t}s/r${h.r}`).join(' ') || '—'}`);
    await p.close();
  }
}
await b.close();

const tot = rows.reduce((a, r) => a + r.hits.length, 0);
const hid = rows.reduce((a, r) => a + r.placed, 0);
console.log(`\n[${POLICY}] ${tot} finds across ${rows.length} run(s), ${hid} hidden — ${(tot / rows.length).toFixed(1)} per run`);
const zero = rows.filter((r) => r.hits.length === 0);
const mismatch = rows.filter((r) => r.hits.length !== r.revealCells);
if (rows.some((r) => r.placed !== 12)) console.log(`WARN: a run hid ${rows.map((r) => r.placed).join('/')} curios, not 12`);
if (zero.length) console.log(`WARN: ${zero.length} run(s) found nothing — the book is unreachable in a single match`);
if (mismatch.length) console.log(`WARN: ${mismatch.length} run(s) where finds !== reveal cells`);
