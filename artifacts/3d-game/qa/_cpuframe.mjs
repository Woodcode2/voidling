// PERF-FRAME pass 1 — THE CPU BUDGET, over a whole match, at real rate.
//
// The software renderer is 1/9 to 1/40 real time, so renderer.render() dominates
// any wall-clock frame measurement and tells you nothing about a phone. So it is
// STUBBED, and what is left is the game's own JavaScript: the eat loop, the wall
// solver, the rivals, the crowd, the HUD. That work is identical on a phone (only
// slower by the CPU ratio), and it is the half that causes hitching, because it
// is where allocation and O(n) sweeps live.
//
// Per frame we record: JS ms, edible count, radius, match time, heap bytes.
// Markers: evolve, news card, rival join, beat banner, results screen.
// Output: p50/p95/p99/max of JS frame time, the worst frame and what fired on it,
// heap growth rate (GC pressure), and a CDP CPU profile of the top self-time.
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const PORT = process.env.PORT || 4177;
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--js-flags=--expose-gc'] });

const out = {};
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });

  // instrument BEFORE stubbing render so the wrapper sees a clean frame
  await p.evaluate(() => {
    const R = window.__renderer;
    R.render = () => {};                     // GPU out of the picture entirely
    window.__F = [];                         // per-frame rows
    window.__MARK = [];                      // events, stamped with frame index
    const rawRAF = window.requestAnimationFrame.bind(window);
    window.__rawRAF = rawRAF;                // the autopilot rides THIS, uninstrumented
    let last = performance.now(), fi = 0, prevAlive = null, prevStage = -1;
    const prevJoin = new Set();
    let prevNews = '';
    window.__alive = -1;
    // ONE instrumented callback only: animate() re-arms itself through the
    // patched rAF, so wrapping every callback double-counted the harness's own
    // autopilot as a frame and made the distribution bimodal for no reason.
    window.requestAnimationFrame = (cb) => rawRAF((ts) => {
      const t0 = performance.now();
      cb(ts);
      const t1 = performance.now();
      const ms = window.__matchState?.(); if (!ms) { last = t1; return; }
      const alive = window.__alive;
      const nb = document.getElementById('news');
      const news = (nb && nb.classList.contains('show')) ? (nb.textContent || '').trim().slice(0, 40) : '';
      if (news && news !== prevNews) { window.__MARK.push({ f: fi, k: 'news', v: news }); prevNews = news; }
      for (const rv of ms.rivals) if (rv.joined && !prevJoin.has(rv.name)) { prevJoin.add(rv.name); window.__MARK.push({ f: fi, k: 'rivaljoin', v: rv.name }); }
      const st = document.getElementById('evolve');
      if (st && st.classList.contains('show') && prevStage !== 1) { window.__MARK.push({ f: fi, k: 'evolve', v: st.textContent.slice(0, 24) }); prevStage = 1; }
      else if (st && !st.classList.contains('show')) prevStage = 0;
      if (alive >= 0 && prevAlive !== null && alive < prevAlive - 2) window.__MARK.push({ f: fi, k: 'multieat', v: prevAlive - alive });
      if (alive >= 0) prevAlive = alive;
      window.__nEdible = window.__edibles.length;
      const mem = performance.memory ? performance.memory.usedJSHeapSize : 0;
      window.__F.push([+(t1 - t0).toFixed(3), +ms.t.toFixed(2), +ms.r.toFixed(2), alive, mem, +(t0 - last).toFixed(3)]);
      last = t1; fi++;
    });
  });

  await cdp.send('Profiler.start');
  // drive at the nearest edible, same policy as pace.mjs — a competent player
  await p.evaluate(() => {
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    let n = 0;
    const tick = () => {
      const vs = window.__voidState(); let best = null, bd = 1e9, alive = 0;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.mesh.userData.eaten) continue;
        alive++;
        if (e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = { dx, dz }; }
      }
      if ((n++ % 5) === 0) window.__alive = alive;
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + best.dx / m * 110, clientY: cy + best.dz / m * 110, bubbles: true })); }
      window.__rawRAF(tick);
    };
    window.__rawRAF(tick);
  });
  // RUSH=<sec> cuts the match short for attribution runs (names, not timings)
  if (process.env.RUSH) await p.waitForFunction(
    (s) => (window.__matchState().t > s) && (window.__rushClock(0.6), true),
    Number(process.env.RUSH), { timeout: 900000 });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 900000 });
  // keep sampling for a second of results-screen frames
  await p.waitForTimeout(1500);
  const prof = await cdp.send('Profiler.stop');
  const { F, MARK } = await p.evaluate(() => ({ F: window.__F, MARK: window.__MARK }));

  // ── frame time distribution ────────────────────────────────────────────
  const js = F.map(r => r[0]).sort((a, x) => a - x);
  const q = k => js[Math.min(js.length - 1, Math.floor(js.length * k))];
  // worst frames + what fired near them
  const idx = F.map((r, i) => [r[0], i]).sort((a, x) => x[0] - a[0]).slice(0, 8);
  const markNear = i => MARK.filter(m => Math.abs(m.f - i) <= 3).map(m => `${m.k}:${m.v}`).join(' ') || '-';
  // heap
  const heap = F.filter(r => r[4] > 0);
  const mem0 = heap.length ? heap[0][4] : 0, memN = heap.length ? heap[heap.length - 1][4] : 0;
  let sawDrop = 0, alloc = 0;
  for (let i = 1; i < heap.length; i++) {
    const d = heap[i][4] - heap[i - 1][4];
    if (d < -1e6) sawDrop++; else if (d > 0) alloc += d;
  }
  const dur = F.length ? F[F.length - 1][1] - F[0][1] : 1;

  // ── CPU profile: top self time ────────────────────────────────────────
  const nodes = prof.profile.nodes;
  const byId = new Map(nodes.map(n => [n.id, n]));
  const self = new Map();
  const total = prof.profile.samples.length;
  for (const s of prof.profile.samples) {
    const n = byId.get(s); if (!n) continue;
    const cf = n.callFrame;
    const key = `${cf.functionName || '(anon)'} ${(cf.url || '').split('/').pop()}:${cf.lineNumber + 1}`;
    self.set(key, (self.get(key) || 0) + 1);
  }
  const top = [...self.entries()].sort((a, x) => x[1] - a[1]).slice(0, 14);

  out[wid] = { frames: F.length, matchSec: +dur.toFixed(1),
    p50: q(0.5), p90: q(0.9), p95: q(0.95), p99: q(0.99), max: js[js.length - 1],
    mean: +(js.reduce((a, x) => a + x, 0) / js.length).toFixed(3),
    over8: js.filter(x => x > 8).length, over16: js.filter(x => x > 16).length, over33: js.filter(x => x > 33).length,
    worst: idx.map(([ms, i]) => ({ ms, t: F[i][1], r: F[i][2], alive: F[i][3], near: markNear(i) })),
    heapMB0: +(mem0 / 1048576).toFixed(1), heapMBn: +(memN / 1048576).toFixed(1),
    gcDrops: sawDrop, allocMBperSec: +(alloc / 1048576 / Math.max(1, dur)).toFixed(2),
    marks: MARK.length, top };
  console.log(`\n===== ${wid.toUpperCase()} =====`);
  const o = out[wid];
  console.log(`frames ${o.frames} over ${o.matchSec}s match   JS ms: mean ${o.mean}  p50 ${o.p50}  p90 ${o.p90}  p95 ${o.p95}  p99 ${o.p99}  MAX ${o.max}`);
  console.log(`frames over 8ms ${o.over8} (${(100*o.over8/o.frames).toFixed(1)}%)  over 16ms ${o.over16}  over 33ms ${o.over33}`);
  console.log(`heap ${o.heapMB0} -> ${o.heapMBn} MB   allocation ${o.allocMBperSec} MB/match-sec   GC drops ${o.gcDrops}`);
  console.log('worst frames:');
  for (const w of o.worst) console.log(`  ${String(w.ms).padStart(8)}ms  t=${String(w.t).padStart(6)}s r=${String(w.r).padStart(5)} alive=${String(w.alive).padStart(4)}  ${w.near}`);
  console.log('top self time (CPU profile, 200us sampling):');
  for (const [k, n] of o.top) console.log(`  ${String((100 * n / total).toFixed(1)).padStart(5)}%  ${k}`);
  await p.close();
}
writeFileSync('qa-out/_cpuframe.json', JSON.stringify(out, null, 1));
await b.close();
