// AUDIT 2 — PACE, measured in MATCH TIME so the software renderer cannot
// corrupt it. Every sample is stamped with __matchState().t, and every rate is
// per match-second, not per wall-second.
//
// THE METRIC THAT MATTERS MOST is dead time: the fraction of the match with
// nothing edible within a short drive. "It feels empty" and "there's nothing
// to do" are the same complaint, and this is the number behind both. A world
// can be dense on paper and still starve a player if the food is in clumps
// they have to cross a field to reach.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  // rendering off: the sim then runs at its proper rate instead of 1/9th, and
  // nothing measured here is visual
  await p.evaluate(() => { window.__renderer.render = () => {}; });

  await p.evaluate(() => {
    window.__pace = [];
    let lastN = null, lastX = null, lastZ = null, dist = 0, eats = 0;
    const seenNews = [];
    let lastNews = '';
    setInterval(() => {
      const ms = window.__matchState?.(); if (!ms) return;
      const vs = window.__voidState();
      let alive = 0, inReach = 0, nearest = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible) continue;
        alive++;
        if (e.radius > vs.r * 0.92) continue;          // too big to eat right now
        const d = Math.hypot(e.mesh.position.x - vs.x, e.mesh.position.z - vs.z);
        if (d < nearest) nearest = d;
        if (d < vs.r + 30) inReach++;
      }
      if (lastN !== null && alive < lastN) eats += lastN - alive;
      lastN = alive;
      if (lastX !== null) dist += Math.hypot(vs.x - lastX, vs.z - lastZ);
      lastX = vs.x; lastZ = vs.z;
      const nb = document.getElementById('news');
      const txt = (nb && nb.classList.contains('show')) ? (nb.textContent || '').trim() : '';
      if (txt && txt !== lastNews) { seenNews.push({ t: Math.round(ms.t), s: txt.slice(0, 70) }); lastNews = txt; }
      window.__pace.push({ t: +ms.t.toFixed(1), r: +ms.r.toFixed(2), score: Math.round(ms.score),
        alive, inReach, nearest: Math.round(Math.min(nearest, 999)), eats, dist: Math.round(dist) });
      window.__news2 = seenNews;
    }, 250);
    // drive at the nearest edible, which is what a competent player does
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => {
      const vs = window.__voidState(); let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
      }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 900000 });
  const { pace, news } = await p.evaluate(() => ({ pace: window.__pace, news: window.__news2 || [] }));

  // ── report ────────────────────────────────────────────────────────────────
  const END = pace.length ? pace[pace.length - 1].t : 180;
  const bucket = 20;
  const nb = Math.ceil(END / bucket);
  const rows = [];
  for (let i = 0; i < nb; i++) {
    const lo = i * bucket, hi = lo + bucket;
    const win = pace.filter(s => s.t >= lo && s.t < hi);
    if (!win.length) continue;
    const e0 = win[0].eats, e1 = win[win.length - 1].eats;
    const d0 = win[0].dist, d1 = win[win.length - 1].dist;
    const dead = win.filter(s => s.inReach === 0).length / win.length;
    rows.push({ lo, hi, eats: e1 - e0, rate: (e1 - e0) / bucket,
      dist: d1 - d0, r: win[win.length - 1].r, score: win[win.length - 1].score,
      dead, nearest: Math.round(win.reduce((a, s) => a + s.nearest, 0) / win.length) });
  }
  const deadAll = pace.filter(s => s.inReach === 0).length / (pace.length || 1);
  const totEats = pace.length ? pace[pace.length - 1].eats : 0;
  const totDist = pace.length ? pace[pace.length - 1].dist : 0;
  console.log(`\n══ ${wid.toUpperCase()} ══  ${Math.round(END)}s   ${totEats} eaten   final r=${pace[pace.length-1]?.r}   score ${pace[pace.length-1]?.score}`);
  console.log(`   DEAD TIME (nothing edible within r+30): ${(deadAll*100).toFixed(1)}%   travel per eat: ${(totDist/(totEats||1)).toFixed(1)}u`);
  console.log('   window     eats  per sec   dist   mean nearest   dead%   radius   score');
  for (const r of rows)
    console.log(`   ${String(r.lo).padStart(3)}-${String(r.hi).padStart(3)}s ${String(r.eats).padStart(7)} ${r.rate.toFixed(2).padStart(8)} ${String(r.dist).padStart(6)} ${String(r.nearest).padStart(13)} ${(r.dead*100).toFixed(0).padStart(6)}% ${String(r.r).padStart(8)} ${String(r.score).padStart(7)}`);
  console.log(`   headlines: ${news.length} in ${Math.round(END)}s (one every ${(END/(news.length||1)).toFixed(0)}s)`);
  for (const n of news.slice(0, 3)) console.log(`      ${String(n.t).padStart(3)}s  ${n.s}`);
  await p.close();
}
await b.close();
