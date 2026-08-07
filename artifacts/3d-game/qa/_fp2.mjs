// FRAME PACING, corrected. qa/_fp.mjs measured the rAF INTERVAL and a CPU
// profile of the same window came back 71% idle — in headless swiftshader the
// interval is the compositor's cadence, not the game's cost. So this times the
// game's own animate() callback instead: wrap requestAnimationFrame, stopwatch
// the callback, and (in gpu mode) split renderer.render() out of it.
//   node qa/_fp2.mjs [worlds] [mode js|gpu] [port] [endT]
// JS ms inside animate() is work a phone's main thread must also do. It is the
// only frame number a software renderer can honestly produce.
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const WORLDS = (process.argv[2] || 'maple').split(',');
const MODE   = process.argv[3] || 'js';
const PORT   = process.argv[4] || '4231';
const END_T  = +(process.argv[5] || 178);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
         '--enable-precise-memory-info'] });
const pct = (a, q) => a.length ? a[Math.min(a.length - 1, Math.floor(q * a.length))] : 0;

for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  p.setDefaultTimeout(900000);
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 600000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.3, null, { timeout: 900000 });

  const q = await p.evaluate((mode) => {
    window.__pinQuality(0);
    const rawRAF = window.requestAnimationFrame.bind(window);
    const N = 200000;
    const S = window.__S = { i: 0, js: new Float32Array(N), rdr: new Float32Array(N),
      t: new Float32Array(N), heap: new Float64Array(N), r: new Float32Array(N),
      join: new Uint8Array(N), prog: new Uint16Array(N), calls: new Uint16Array(N),
      gap: new Float32Array(N), cal: new Float32Array(N) };
    let rdrMs = 0;
    if (mode === 'js') { window.__renderer.render = () => {}; }
    else { const R = window.__renderer, orig = R.render.bind(R);
      R.render = (s, c) => { const a = performance.now(); orig(s, c); rdrMs = performance.now() - a; }; }
    // fixed synthetic spin — rises only when the HOST steals the core
    const cal = () => { const a = performance.now(); let s = 0;
      for (let k = 0; k < 300000; k++) s += k * 1.000001; window.__cs = s;
      return performance.now() - a; };
    let prevEnd = performance.now();
    // ONE instrumented callback: animate() re-arms itself through the global,
    // so it lands here from the next frame. The autopilot rides rawRAF.
    window.requestAnimationFrame = (cb) => rawRAF((ts) => {
      const t0 = performance.now();
      rdrMs = 0;
      cb(ts);
      const t1 = performance.now();
      const i = S.i; if (i >= N) { prevEnd = t1; return; }
      const ms = window.__matchState();
      S.js[i] = (t1 - t0) - rdrMs; S.rdr[i] = rdrMs; S.gap[i] = t0 - prevEnd;
      S.t[i] = ms.t; S.r[i] = ms.r;
      S.heap[i] = performance.memory ? performance.memory.usedJSHeapSize : 0;
      let j = 0; for (const rv of ms.rivals) if (rv.joined) j++; S.join[i] = j;
      const inf = window.__renderer.info;
      S.prog[i] = inf.programs ? inf.programs.length : 0;
      S.calls[i] = Math.min(65535, inf.render.calls);
      S.cal[i] = cal();
      S.i = i + 1; prevEnd = performance.now();
    });
    // autopilot on the RAW rAF so it is never counted as a frame
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const drive = () => { const vs = window.__voidState(); let bx = 0, bz = 0, bd = 1e9, ok = false;
      const E = window.__edibles;
      for (let k = 0; k < E.length; k++) { const e = E[k];
        if (e.eaten || !e.mesh || !e.mesh.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; bx = dx; bz = dz; ok = true; } }
      if (ok) { const m = Math.hypot(bx, bz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + bx / m * 110, clientY: cy + bz / m * 110, bubbles: true })); }
      rawRAF(drive); };
    rawRAF(drive);
    return window.__quality();
  }, MODE);
  console.log(`\n═══ ${wid.toUpperCase()}  mode=${MODE}  quality=${JSON.stringify(q)}`);

  await p.waitForFunction(t => (window.__matchState?.().t ?? 0) >= t, END_T, { timeout: 3600000 });
  const raw = await p.evaluate(() => { const S = window.__S, n = S.i; const g = k => Array.from(S[k].slice(0, n));
    return { n, js: g('js'), rdr: g('rdr'), t: g('t'), heap: g('heap'), r: g('r'),
      join: g('join'), prog: g('prog'), calls: g('calls'), gap: g('gap'), cal: g('cal') }; });
  writeFileSync(`qa-out/fp2-${wid}-${MODE}.json`, JSON.stringify(raw));

  const st = 30;
  const js = raw.js.slice(st), ts = raw.t.slice(st);
  const calS = raw.cal.slice(st).filter(v => v > 0).sort((a, x) => a - x);
  const calMed = pct(calS, 0.5);
  const sorted = [...js].sort((a, x) => a - x);
  const med = pct(sorted, 0.5);
  const o2 = js.filter(d => d > 2 * med).length, o4 = js.filter(d => d > 4 * med).length;
  const o16 = js.filter(d => d > 16.7).length, o33 = js.filter(d => d > 33.3).length;
  console.log(`  frames ${js.length} over match t ${ts[0].toFixed(1)}→${ts[ts.length - 1].toFixed(1)}s  (${(js.length / (ts[ts.length - 1] - ts[0])).toFixed(1)} frames per match-second)`);
  console.log(`  host calibrator p50 ${calMed.toFixed(2)}ms p95 ${pct(calS, 0.95).toFixed(2)} p99.9 ${pct(calS, 0.999).toFixed(2)} max ${calS[calS.length - 1].toFixed(1)}`);
  console.log(`  JS INSIDE animate():  p50 ${med.toFixed(2)}  p90 ${pct(sorted, 0.90).toFixed(2)}  p95 ${pct(sorted, 0.95).toFixed(2)}  p99 ${pct(sorted, 0.99).toFixed(2)}  p99.9 ${pct(sorted, 0.999).toFixed(2)}  max ${sorted[sorted.length - 1].toFixed(1)} ms`);
  console.log(`    >2x med (${(2 * med).toFixed(1)}): ${o2} (${(100 * o2 / js.length).toFixed(2)}%)   >4x med (${(4 * med).toFixed(1)}): ${o4} (${(100 * o4 / js.length).toFixed(2)}%)`);
  console.log(`    over a 60fps budget (16.7ms): ${o16} (${(100 * o16 / js.length).toFixed(2)}%)   over 30fps (33.3ms): ${o33} (${(100 * o33 / js.length).toFixed(2)}%)`);
  if (MODE === 'gpu') { const rs = [...raw.rdr.slice(st)].sort((a, x) => a - x);
    console.log(`  render() (SWIFTSHADER — not a device number): p50 ${pct(rs, 0.5).toFixed(1)} p99 ${pct(rs, 0.99).toFixed(1)} max ${rs[rs.length - 1].toFixed(1)} ms`); }
  const gs = [...raw.gap.slice(st)].sort((a, x) => a - x);
  console.log(`  gap between end of one animate() and start of the next: p50 ${pct(gs, 0.5).toFixed(1)} p99 ${pct(gs, 0.99).toFixed(1)} max ${gs[gs.length - 1].toFixed(1)} ms  (harness cadence)`);

  const B = 12, bl = 180 / B; const bc = new Array(B).fill(0), bn = new Array(B).fill(0),
    bmax = new Array(B).fill(0), bsum = new Array(B).fill(0);
  for (let i = 0; i < js.length; i++) { const k = Math.min(B - 1, Math.floor(ts[i] / bl));
    bn[k]++; bsum[k] += js[i]; if (js[i] > 4 * med) bc[k]++; if (js[i] > bmax[k]) bmax[k] = js[i]; }
  console.log('  by match window:   n     mean    >4x   worst');
  for (let k = 0; k < B; k++) if (bn[k]) console.log(`    ${String(k * bl | 0).padStart(3)}-${String((k + 1) * bl | 0).padStart(3)}s ${String(bn[k]).padStart(5)}  ${(bsum[k] / bn[k]).toFixed(2).padStart(6)}ms ${String(bc[k]).padStart(5)}  ${bmax[k].toFixed(1).padStart(6)}ms`);

  const idx = js.map((d, i) => i).sort((a, x) => js[x] - js[a]).slice(0, 12);
  console.log('  twelve worst animate() calls:');
  for (const i of idx) console.log(`    ${js[i].toFixed(1).padStart(7)}ms  t=${ts[i].toFixed(1).padStart(6)}  r=${raw.r[i + st].toFixed(2)}  joined=${raw.join[i + st]}  cal=${raw.cal[i + st].toFixed(2)}  render=${raw.rdr[i + st].toFixed(1)}`);

  const hp = raw.heap.slice(st);
  if (hp[0]) { let up = 0, drops = 0, biggest = 0;
    for (let i = 1; i < hp.length; i++) { const d = hp[i] - hp[i - 1];
      if (d > 0) up += d; else if (d < -262144) { drops++; if (-d > biggest) biggest = -d; } }
    const span = ts[ts.length - 1] - ts[0];
    console.log(`  ALLOC ${(up / 1048576 / span).toFixed(1)} MB / match-second   (${(up / 1048576).toFixed(0)} MB total)`);
    console.log(`  GC ${drops} drops >256KB (${(drops / span).toFixed(2)}/s) biggest ${(biggest / 1048576).toFixed(1)} MB   heap ${(hp[0] / 1048576).toFixed(0)}→${(hp[hp.length - 1] / 1048576).toFixed(0)} MB peak ${(Math.max(...hp) / 1048576).toFixed(0)} MB`);
  }
  console.log(`  shader programs ${raw.prog[st]} → ${raw.prog[raw.n - 1]} (peak ${Math.max(...raw.prog)})`);
  await p.close();
}
await b.close();
