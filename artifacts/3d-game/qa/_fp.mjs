// FRAME PACING — the distribution's tail, not the average.
//   node qa/_fp.mjs [worlds] [mode js|gpu] [port] [endT]
// mode js  : renderer.render stubbed. What is left in a frame is the game's own
//            JavaScript — sim, spawn, HUD, news, rivals, particles. That is the
//            number a phone's main thread has to pay too, and it is the only
//            frame number from a software renderer that means anything.
// mode gpu : render left in. Frame total AND render() split out, so raster can
//            be separated from JS. Wall clock here is swiftshader, not a phone.
// Quality is PINNED to rung 0 before the match starts and read back.
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const WORLDS = (process.argv[2] || 'maple').split(',');
const MODE   = process.argv[3] || 'js';
const PORT   = process.argv[4] || '4231';
const END_T  = +(process.argv[5] || 178);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
         '--enable-precise-memory-info', '--js-flags=--expose-gc'] });

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
    // autopilot: chase the nearest edible we can actually swallow
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    window.__drive = () => {
      const vs = window.__voidState(); let bx = 0, bz = 0, bd = 1e9, ok = false;
      const E = window.__edibles;
      for (let i = 0; i < E.length; i++) { const e = E[i];
        if (e.eaten || !e.mesh || !e.mesh.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx * dx + dz * dz; if (d < bd) { bd = d; bx = dx; bz = dz; ok = true; } }
      if (ok) { const m = Math.hypot(bx, bz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + bx / m * 110, clientY: cy + bz / m * 110, bubbles: true })); }
    };
    // ── the sampler. Preallocated typed arrays: the recorder must not be a
    // meaningful part of what it records.
    const N = 200000;
    const S = window.__S = { i: 0, dt: new Float32Array(N), t: new Float32Array(N),
      heap: new Float64Array(N), rdr: new Float32Array(N), r: new Float32Array(N),
      join: new Uint8Array(N), prog: new Uint16Array(N), calls: new Uint16Array(N),
      ed: new Uint16Array(N), driveMs: new Float32Array(N), cal: new Float32Array(N) };
    // CONTENTION CALIBRATOR. This box is shared and its load average has been
    // north of 16. A wall-clock frame spike on a preempted container is not a
    // game event. Every frame also runs a FIXED synthetic workload; when the
    // host steals the core, this rises with the frame. Any spike that is real
    // shows up as frame time rising while the calibrator does not.
    window.__cal = () => { const a = performance.now(); let s = 0;
      for (let k = 0; k < 300000; k++) s += k * 1.000001; window.__calSink = s;
      return performance.now() - a; };
    let rdrMs = 0;
    if (mode === 'js') { window.__renderer.render = () => {}; }
    else { const R = window.__renderer, orig = R.render.bind(R);
      R.render = (s, c) => { const a = performance.now(); orig(s, c); rdrMs = performance.now() - a; }; }
    let prev = performance.now();
    const tick = () => {
      const now = performance.now();
      const d0 = now;
      window.__drive();
      const dms = performance.now() - d0;
      const i = S.i;
      if (i < N) {
        const ms = window.__matchState();
        S.dt[i] = now - prev; S.t[i] = ms.t; S.rdr[i] = rdrMs; S.r[i] = ms.r;
        S.heap[i] = performance.memory ? performance.memory.usedJSHeapSize : 0;
        let j = 0; for (const rv of ms.rivals) if (rv.joined) j++;
        S.join[i] = j;
        const inf = window.__renderer.info;
        S.prog[i] = inf.programs ? inf.programs.length : 0;
        S.calls[i] = Math.min(65535, inf.render.calls);
        S.ed[i] = Math.min(65535, window.__edibles.length);
        S.driveMs[i] = dms;
        S.cal[i] = window.__cal();
        S.i = i + 1;
      }
      prev = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return window.__quality();
  }, MODE);
  console.log(`\n═══ ${wid.toUpperCase()}  mode=${MODE}  quality=${JSON.stringify(q)}`);

  await p.waitForFunction(t => (window.__matchState?.().t ?? 0) >= t || !!document.getElementById('end')?.classList.contains('show'),
    END_T, { timeout: 3600000 });

  const raw = await p.evaluate(() => { const S = window.__S; const n = S.i;
    return { n, dt: Array.from(S.dt.slice(0, n)), t: Array.from(S.t.slice(0, n)),
      heap: Array.from(S.heap.slice(0, n)), rdr: Array.from(S.rdr.slice(0, n)),
      r: Array.from(S.r.slice(0, n)), join: Array.from(S.join.slice(0, n)),
      prog: Array.from(S.prog.slice(0, n)), calls: Array.from(S.calls.slice(0, n)),
      ed: Array.from(S.ed.slice(0, n)), driveMs: Array.from(S.driveMs.slice(0, n)),
      cal: Array.from(S.cal.slice(0, n)) }; });

  writeFileSync(`qa-out/fp-${wid}-${MODE}.json`, JSON.stringify(raw));

  // drop the first 30 frames (page still settling from the picker teardown)
  const st = 30;
  // The probe's own cost lives INSIDE the interval it reports: at frame i the
  // interval since frame i-1 contains frame i-1's drive() and calibrator.
  // Subtract them, then scale by how much the host was stealing at that moment.
  const calAll = raw.cal.slice(st).filter(v => v > 0).sort((a, x) => a - x);
  const calMed = pct(calAll, 0.5);
  const dts = [], ts = [], dtsRaw = [];
  for (let i = st; i < raw.n; i++) {
    const ovh = raw.driveMs[i - 1] + raw.cal[i - 1];
    const scale = raw.cal[i - 1] > 0 ? calMed / raw.cal[i - 1] : 1;
    dts.push(Math.max(0.1, (raw.dt[i] - ovh)) * Math.min(1, scale));
    dtsRaw.push(raw.dt[i]); ts.push(raw.t[i]);
  }
  console.log(`  calibrator (fixed 300k-iter spin): p50 ${calMed.toFixed(2)}ms  p95 ${pct(calAll, 0.95).toFixed(2)}  max ${calAll[calAll.length - 1].toFixed(2)}  ← host contention, not the game`);
  const rawSorted = [...dtsRaw].sort((a, x) => a - x);
  console.log(`  RAW wall interval  p50 ${pct(rawSorted, 0.5).toFixed(1)}  p99 ${pct(rawSorted, 0.99).toFixed(1)}  max ${rawSorted[rawSorted.length - 1].toFixed(1)} ms  (includes probe + host theft)`);
  console.log(`  --- below: probe cost removed, host contention normalised ---`);
  const sorted = [...dts].sort((a, x) => a - x);
  const med = pct(sorted, 0.5);
  const over2 = dts.filter(d => d > 2 * med).length;
  const over4 = dts.filter(d => d > 4 * med).length;
  console.log(`  frames ${dts.length}  match t ${ts[0].toFixed(1)}→${ts[ts.length - 1].toFixed(1)}s`);
  console.log(`  p50 ${med.toFixed(2)}  p90 ${pct(sorted, 0.90).toFixed(2)}  p95 ${pct(sorted, 0.95).toFixed(2)}  p99 ${pct(sorted, 0.99).toFixed(2)}  p99.9 ${pct(sorted, 0.999).toFixed(2)}  max ${sorted[sorted.length - 1].toFixed(2)} ms`);
  console.log(`  >2x med (${(2 * med).toFixed(1)}ms): ${over2} (${(100 * over2 / dts.length).toFixed(2)}%)   >4x med (${(4 * med).toFixed(1)}ms): ${over4} (${(100 * over4 / dts.length).toFixed(2)}%)`);
  console.log(`  drive() overhead: p50 ${pct([...raw.driveMs].sort((a, x) => a - x), 0.5).toFixed(3)}ms  max ${Math.max(...raw.driveMs).toFixed(2)}ms`);

  // where do the spikes live? bucket by match-second decade
  const B = 12, bl = 180 / B; const bc = new Array(B).fill(0), bn = new Array(B).fill(0), bmax = new Array(B).fill(0);
  for (let i = 0; i < dts.length; i++) { const k = Math.min(B - 1, Math.floor(ts[i] / bl));
    bn[k]++; if (dts[i] > 4 * med) bc[k]++; if (dts[i] > bmax[k]) bmax[k] = dts[i]; }
  console.log('  spikes>4x by match window:');
  for (let k = 0; k < B; k++) if (bn[k]) console.log(`    ${String(k * bl | 0).padStart(3)}-${String((k + 1) * bl | 0).padStart(3)}s  n=${String(bn[k]).padStart(4)}  >4x=${String(bc[k]).padStart(4)}  worst ${bmax[k].toFixed(1)}ms`);

  // the ten worst frames, with their context
  const idx = dts.map((d, i) => i).sort((a, x) => dts[x] - dts[a]).slice(0, 10);
  console.log('  ten worst frames:');
  for (const i of idx) console.log(`    ${dts[i].toFixed(1).padStart(7)}ms (raw ${dtsRaw[i].toFixed(0)}, cal ${raw.cal[i + st - 1].toFixed(1)})  t=${ts[i].toFixed(1).padStart(6)}  r=${raw.r[i + st].toFixed(2)}  joined=${raw.join[i + st]}  progs=${raw.prog[i + st]}  render=${raw.rdr[i + st].toFixed(1)}`);

  // allocation: sum of positive heap deltas / match seconds; GC drops
  const hp = raw.heap.slice(st);
  if (hp[0]) {
    let up = 0, drops = 0, biggest = 0;
    for (let i = 1; i < hp.length; i++) { const d = hp[i] - hp[i - 1];
      if (d > 0) up += d; else if (d < -262144) { drops++; if (-d > biggest) biggest = -d; } }
    const span = ts[ts.length - 1] - ts[0];
    console.log(`  ALLOC ${(up / 1048576 / span).toFixed(1)} MB per match-second  (${(up / 1048576).toFixed(0)} MB total over ${span.toFixed(0)}s)`);
    console.log(`  GC: ${drops} heap drops >256KB  (${(drops / span).toFixed(2)}/match-s)  biggest ${(biggest / 1048576).toFixed(1)} MB   heap ${(hp[0] / 1048576).toFixed(0)}→${(hp[hp.length - 1] / 1048576).toFixed(0)} MB  peak ${(Math.max(...hp) / 1048576).toFixed(0)} MB`);
  }
  // shader programs compiled DURING the match
  const p0 = raw.prog[st], p1 = raw.prog[raw.prog.length - 1];
  const pmax = Math.max(...raw.prog);
  console.log(`  shader programs: ${p0} at t=${ts[0].toFixed(0)} → ${p1} at end (peak ${pmax})`);
  if (p1 > p0) { const growth = [];
    for (let i = st + 1; i < raw.prog.length; i++) if (raw.prog[i] > raw.prog[i - 1])
      growth.push(`t=${raw.t[i].toFixed(1)}(+${raw.prog[i] - raw.prog[i - 1]}, frame ${raw.dt[i].toFixed(1)}ms)`);
    console.log(`    compiled mid-match at: ${growth.slice(0, 40).join(' ')}${growth.length > 40 ? ` …${growth.length} total` : ''}`);
  }
  await p.close();
}
await b.close();
