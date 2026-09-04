// WHEN DOES THE SCORE CHANGE, IN MATCH SECONDS?
//
//   node qa/_stagetime.mjs <port> [worlds] [runs]
//
// Wraps every method on window.__audio and stamps each call with
// __matchState().t — never a wall clock, because the software renderer runs
// the sim at a fraction of real time. Reports: the match time of each
// setMusicStage transition, how long the score spends frozen at its top rung,
// and the per-second call rate of every one-shot in 20s windows.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const PORT = process.argv[2] || '4243';
const WORLDS = (process.argv[3] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const RUNS = Number(process.argv[4] || 1);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const all = [];

for (const wid of WORLDS) {
  for (let run = 0; run < RUNS; run++) {
    const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
    await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
    await p.addInitScript(() => { try {
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidMute', '0');
      localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { /* */ } });
    await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
    // hook BEFORE the match starts so startMusic/stage 0 are captured
    await p.evaluate(() => {
      window.__alog = [];
      const a = window.__audio;
      for (const k of Object.keys(a)) {
        if (typeof a[k] !== 'function') continue;
        const o = a[k].bind(a);
        a[k] = (...args) => {
          const ms = window.__matchState?.();
          window.__alog.push({ k, t: ms ? +ms.t.toFixed(2) : -1, r: ms ? +ms.r.toFixed(2) : -1,
            a: args.filter((x) => typeof x !== 'object').slice(0, 3) });
          return o(...args);
        };
      }
    });
    await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
      if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
    await p.click('#btnPlay'); await p.waitForTimeout(1400);
    await p.click(`#worldRow .wCard[data-world="${wid}"]`);
    await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
    await p.evaluate(() => { window.__renderer.render = () => {}; });
    await p.evaluate(() => {
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
      null, { timeout: 1200000 });
    const log = await p.evaluate(() => window.__alog);
    all.push({ wid, run, log });
    await p.close();
  }
}
await b.close();

for (const { wid, run, log } of all) {
  const END = Math.max(...log.map((e) => e.t));
  const stages = log.filter((e) => e.k === 'setMusicStage');
  const trans = [];
  let cur = null;
  for (const s of stages) { const v = s.a[0]; if (v !== cur) { trans.push({ t: s.t, v, r: s.r }); cur = v; } }
  const top = trans.length ? trans[trans.length - 1] : null;
  console.log(`\n══ ${wid.toUpperCase()} run${run} ══  ${END.toFixed(0)}s match`);
  console.log(`   stage transitions: ${trans.map((x) => `${x.v}@${x.t.toFixed(0)}s(r${x.r})`).join('  ')}`);
  const lastChange = trans.filter((x) => x.v >= 1).slice(-1)[0];
  const frozenFrom = trans.filter((x) => x.v >= 3)[0];
  if (frozenFrom) console.log(`   score reaches its TOP musical rung (stage 3) at ${frozenFrom.t.toFixed(0)}s -> frozen for the last ${(END - frozenFrom.t).toFixed(0)}s = ${(100 * (END - frozenFrom.t) / END).toFixed(0)}% of the match`);
  else console.log('   never reached stage 3');
  const kinds = {};
  for (const e of log) kinds[e.k] = (kinds[e.k] || 0) + 1;
  console.log(`   calls: ${Object.entries(kinds).sort((a, c) => c[1] - a[1]).map(([k, n]) => `${k} ${n}`).join('  ')}`);
  // one-shot rate in 20s windows
  const W = 20, nb = Math.ceil(END / W);
  const KS = ['pop', 'ready', 'bigEat', 'alert', 'evolve', 'gulp', 'collapse', 'voice', 'matchBeat', 'hit'];
  console.log(`   window   ${KS.map((k) => k.padStart(8)).join('')}`);
  for (let i = 0; i < nb; i++) {
    const lo = i * W, hi = lo + W;
    const win = log.filter((e) => e.t >= lo && e.t < hi);
    console.log(`   ${String(lo).padStart(3)}-${String(hi).padStart(3)}s ${KS.map((k) => String(win.filter((e) => e.k === k).length).padStart(8)).join('')}`);
  }
  // peak density: most pops in any 1.0 s of match time
  const pops = log.filter((e) => e.k === 'pop').map((e) => e.t);
  let mx = 0; for (let i = 0; i < pops.length; i++) { let n = 0; for (let j = i; j < pops.length && pops[j] < pops[i] + 1; j++) n++; if (n > mx) mx = n; }
  console.log(`   busiest second: ${mx} pop() in one match-second`);
}
writeFileSync('/tmp/claude-0/-home-user-voidling/1f93d8f7-3ff2-5559-8b0b-a74b62b39437/scratchpad/stagetime2.json', JSON.stringify(all));
