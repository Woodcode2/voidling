// AUDIT 3 — WILL IT STICK?
//
// The question a retention audit has to answer is not "is it fun once", it is
// "what is DIFFERENT on run 20". So: boot the same world several times and
// diff everything a returning child could notice.
//
//   • the WORLD — is the prop layout identical, or reseeded?
//   • the SPAWN — is the opening frame the same every time (it should be:
//     that is an explicit design rule) and is the rest not?
//   • the NEWS — how much of the writing does one match show, and how much
//     repeats within a single match, which is the thing that reads as thin
//   • the RIVALS — same names, same order, same behaviour?
//   • the BEATS — same four moments at the same four times?
import { chromium } from 'playwright';
const WORLD = process.argv[2] || 'maple';
const RUNS = +(process.argv[3] || 3);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const runs = [];
for (let k = 0; k < RUNS; k++) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  const snap = await p.evaluate(() => {
    // a cheap fingerprint of the whole prop layout: quantised positions and
    // radii, summed into one number. Same layout -> same number.
    let h = 2166136261, n = 0;
    const sizes = {};
    for (const e of window.__edibles) {
      const m = e.mesh; if (!m) continue;
      n++;
      const k2 = `${Math.round(m.position.x * 4)},${Math.round(m.position.z * 4)},${Math.round((e.radius || 0) * 8)}`;
      for (let i = 0; i < k2.length; i++) { h ^= k2.charCodeAt(i); h = Math.imul(h, 16777619); }
      const band = Math.min(9, Math.floor(e.radius || 0));
      sizes[band] = (sizes[band] || 0) + 1;
    }
    const vs = window.__voidState();
    return { layoutHash: (h >>> 0).toString(16), n,
      spawn: `${vs.x.toFixed(2)},${vs.z.toFixed(2)}`, sizes };
  });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; });
  const live = await p.evaluate(() => {
    window.__cap = { news: [], beats: [], bubbles: [], rivals: null };
    let lastNews = '', lastBeat = '';
    const seenB = new Map();
    setInterval(() => {
      const ms = window.__matchState?.(); if (!ms) return;
      if (!window.__cap.rivals) window.__cap.rivals = ms.rivals.map(r => `${r.name}/${r.arch}`);
      const nb = document.getElementById('news');
      if (nb && nb.classList.contains('show')) {
        const t2 = (nb.textContent || '').trim();
        if (t2 && t2 !== lastNews) { window.__cap.news.push(t2.slice(0, 90)); lastNews = t2; }
      }
      const bn = document.getElementById('banner');
      if (bn && bn.classList.contains('show')) {
        const t2 = (bn.textContent || '').trim();
        if (t2 && t2 !== lastBeat) { window.__cap.beats.push(`${Math.round(ms.t)}s ${t2.slice(0, 44)}`); lastBeat = t2; }
      }
      for (const el of document.querySelectorAll('.vb')) {
        const s = (el.textContent || '').trim(); if (!s) continue;
        if (seenB.get(el) === s) continue; seenB.set(el, s);
        window.__cap.bubbles.push(s.slice(0, 60));
      }
    }, 200);
    // drive, so the match actually progresses and fires its beats
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
    return true;
  });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 900000 });
  const cap = await p.evaluate(() => window.__cap);
  runs.push({ ...snap, ...cap });
  console.log(`run ${k + 1}: ${snap.n} props, layout ${snap.layoutHash}, ${cap.news.length} headlines, ${cap.bubbles.length} bubbles`);
  await p.close();
}
await b.close();

const uniq = (a) => [...new Set(a)];
console.log(`\n══ ${WORLD.toUpperCase()} — ${RUNS} RUNS ══`);
console.log('  layout hash per run :', runs.map(r => r.layoutHash).join('  '));
console.log('    ' + (uniq(runs.map(r => r.layoutHash)).length === 1
  ? 'IDENTICAL every run — the world is fully deterministic'
  : 'DIFFERENT every run — the world reseeds'));
console.log('  prop count per run  :', runs.map(r => r.n).join('  '));
console.log('  spawn per run       :', runs.map(r => r.spawn).join('  '));
console.log('    ' + (uniq(runs.map(r => r.spawn)).length === 1 ? 'identical (as designed)' : 'VARIES'));
for (const key of ['news', 'bubbles', 'beats']) {
  const per = runs.map(r => r[key].length);
  const all = runs.flatMap(r => r[key]);
  const u = uniq(all);
  const withinRun = runs.map(r => (r[key].length - uniq(r[key]).length));
  console.log(`  ${key.toUpperCase()}: ${per.join(' / ')} shown per run, ${u.length} distinct across all runs`);
  console.log(`     repeats WITHIN a single run: ${withinRun.join(' / ')}`);
  const overlap = runs.length > 1
    ? uniq(runs[0][key].filter(x => runs[1][key].includes(x))).length : 0;
  console.log(`     lines run 1 also showed in run 2: ${overlap} of ${uniq(runs[0][key]).length}`);
}
console.log('  rivals run 1 :', (runs[0].rivals || []).join(', '));
if (runs[1]) console.log('  rivals run 2 :', (runs[1].rivals || []).join(', '));
console.log('\n  BEATS');
for (let i = 0; i < runs.length; i++) console.log(`    run ${i + 1}: ${runs[i].beats.join(' | ')}`);
