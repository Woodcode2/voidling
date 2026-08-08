// CAN A CHILD ACTUALLY LOSE THIS GAME?
//
// A win that arrives no matter what you do is not a win. An earlier run of
// qa/_econ.mjs found the CHILD driver — which stalls a third of the time, aims
// with 60 degrees of error and chases things too big to eat — still finishing
// 1st of 6. That is a strong hint that the rivals are scenery.
//
// This settles it by adding a driver that cannot possibly deserve to win:
//
//   expert  re-targets the nearest edible every frame          (a good 11yo)
//   child   stalls, mis-aims, chases the shiny thing            (a real 6yo)
//   flail   picks a RANDOM heading every ~2s and holds it       (a thumb on
//           the glass, no strategy, no targeting, no idea)
//
// If `flail` places anywhere near the top, the placement a child is shown at
// the end of a match is not a measure of anything they did — and the five
// rivals are set dressing with names.
//
// Runs headless with the draw stubbed, so a three-minute match takes far less
// than three minutes of wall clock.
//
//   node qa/difficulty.mjs [worlds] [drivers] [port]
import { chromium } from 'playwright';

const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const DRIVERS = (process.argv[3] || 'expert,child,flail').split(',');
const PORT = process.argv[4] || '4173';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const out = [];
for (const wid of WORLDS) {
  for (const drv of DRIVERS) {
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
    await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
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
    }, wid);
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
    await p.evaluate(() => { window.__renderer.render = () => { }; });

    await p.evaluate((drv) => {
      const cv = document.querySelector('canvas');
      const cx = innerWidth / 2, cy = innerHeight / 2;
      cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
      let heldT = -1, held = null, stall = 0, flailA = 0;
      const tick = () => {
        const ms = window.__matchState?.();
        if (!ms) { requestAnimationFrame(tick); return; }
        const vs = window.__voidState();
        // ── FLAIL: no targeting at all ──────────────────────────────────────
        // Not a worse player. NOT A PLAYER. A random heading held for a couple
        // of seconds, which is what the glass sees from someone who has not
        // worked out what the game wants yet.
        if (drv === 'flail') {
          if (ms.t - heldT > 2.0) { heldT = ms.t; flailA = Math.random() * Math.PI * 2; }
          dispatchEvent(new PointerEvent('pointermove', {
            pointerId: 1, clientX: cx + Math.cos(flailA) * 110, clientY: cy + Math.sin(flailA) * 110, bubbles: true,
          }));
          requestAnimationFrame(tick);
          return;
        }
        const gap = drv === 'expert' ? 0 : 2.4;
        if (ms.t - heldT > gap) {
          heldT = ms.t;
          const cand = [];
          let best = null, bd = 1e9;
          for (const e of window.__edibles) {
            if (e.eaten || !e.mesh?.visible) continue;
            const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
            const d = dx * dx + dz * dz;
            if (e.radius <= vs.r * 0.92) { if (d < bd) { bd = d; best = { dx, dz }; } }
            if (drv === 'child' && d < 90000) cand.push({ dx, dz });
          }
          held = best;
          if (drv === 'child') {
            stall = Math.random() < 0.34 ? 1 : 0;
            if (cand.length && Math.random() < 0.30) held = cand[(Math.random() * cand.length) | 0];
          }
        }
        if (held && !stall) {
          let a = Math.atan2(held.dz, held.dx);
          if (drv === 'child') a += (Math.random() - 0.5) * 2.1;
          dispatchEvent(new PointerEvent('pointermove', {
            pointerId: 1, clientX: cx + Math.cos(a) * 110, clientY: cy + Math.sin(a) * 110, bubbles: true,
          }));
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, drv);

    await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
      null, { timeout: 900000 });
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => {
      const ms = window.__matchState?.() || {};
      const rows = [...document.querySelectorAll('#endList .er')].map((e) => ({
        nm: e.querySelector('.nm')?.textContent,
        sc: Number((e.querySelector('.sc')?.textContent || '0').replace(/\D/g, '')),
        me: e.classList.contains('me'),
      }));
      const place = rows.findIndex((x) => x.me) + 1;
      const mine = rows.find((x) => x.me)?.sc ?? 0;
      const top = rows[0]?.sc ?? 0;
      const runnerUp = rows.filter((x) => !x.me)[0]?.sc ?? 0;
      return {
        place, of: rows.length, score: Math.round(ms.score ?? 0), r: Math.round((ms.r ?? 0) * 10) / 10,
        mine, top, runnerUp, head: document.getElementById('endHd')?.textContent?.trim(),
      };
    });
    out.push({ wid, drv, ...r });
    console.log(`${wid.padEnd(8)} ${drv.padEnd(7)} place ${r.place}/${r.of}`
      + `  score ${String(r.score).padStart(7)}  final r ${String(r.r).padStart(5)}`
      + `  best rival ${String(r.runnerUp).padStart(7)}  "${r.head}"`);
    await p.close();
  }
}
await b.close();

console.log('\n══ CAN YOU LOSE?');
for (const drv of DRIVERS) {
  const rows = out.filter((o) => o.drv === drv);
  if (!rows.length) continue;
  const wins = rows.filter((o) => o.place === 1).length;
  const avg = rows.reduce((a, o) => a + o.place, 0) / rows.length;
  const marginPct = rows.map((o) => (o.runnerUp ? (o.mine - o.runnerUp) / o.runnerUp * 100 : 0));
  const mAvg = marginPct.reduce((a, x) => a + x, 0) / marginPct.length;
  console.log(`  ${drv.padEnd(7)} won ${wins}/${rows.length}   mean place ${avg.toFixed(2)}`
    + `   mean margin over the best rival ${mAvg > 0 ? '+' : ''}${mAvg.toFixed(0)}%`);
}
const flail = out.filter((o) => o.drv === 'flail');
if (flail.length) {
  const w = flail.filter((o) => o.place === 1).length;
  console.log(`\nA driver with NO TARGETING AT ALL won ${w} of ${flail.length} matches.`);
  if (w > 0) console.log('  The placement shown at the end of a match is not measuring the player.');
}
