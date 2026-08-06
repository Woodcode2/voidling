// SCRATCH — THE FIRST SIXTY SECONDS OF A COLD INSTALL, in MATCH time.
//
// The software renderer is 1/9–1/40 real time, so this probe neutralises
// renderer.render the instant the debug hook is assigned (the standard trick
// from qa/README) and then samples the DOM against __matchState().t. Every
// number printed is MATCH seconds — the same seconds a child on a phone lives
// through — except the ones explicitly labelled wall.
//
//   node qa/_first60.mjs [mode] [world]
//     mode: idle  — the child never touches the screen (does it teach itself?)
//           child — the child does the one thing it was told: drag at things
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
const MODE = process.argv[2] || 'idle';
const WORLD = process.argv[3] || '';
const OUT = './qa-out/first60/';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1, hasTouch: true });
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  try { localStorage.clear(); } catch {}
  // kill the pixels, keep the simulation: see qa/README "the software renderer"
  Object.defineProperty(window, '__renderer', {
    configurable: true,
    set(v) { try { v.render = () => {}; } catch {}
      Object.defineProperty(window, '__renderer', { value: v, writable: true, configurable: true }); },
    get() { return undefined; },
  });
});

const t0 = Date.now();
await p.goto('http://127.0.0.1:4177/' + (WORLD ? `?w=${WORLD}` : ''), { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__matchState, null, { timeout: 500000 });

const SAMPLE = () => {
  const g = (id) => document.getElementById(id);
  const vis = (e) => { if (!e) return false; const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.02 && r.width > 2 && r.height > 2; };
  const txt = (e) => vis(e) ? (e.innerText || '').replace(/\s+/g, ' ').trim() : '';
  const ms = window.__matchState ? window.__matchState() : null;
  const vs = window.__voidState ? window.__voidState() : null;
  const load = g('loadScr');
  return {
    load: vis(load), pct: g('lPct') ? g('lPct').textContent : '',
    menu: vis(g('menu')),
    tut: !!g('tut') && g('tut').classList.contains('show'),
    title: (() => { const t = g('titlecard'); if (!t) return ''; const cs = getComputedStyle(t);
      return (+cs.opacity > 0.05 && cs.display !== 'none') ? (t.innerText || '').replace(/\s+/g, ' ').trim() : ''; })(),
    guide: txt(g('guide')),
    evolve: (() => { const e = g('evolve'); return e && e.classList.contains('show') ? txt(e) : ''; })(),
    joy: vis(g('joy')),
    news: txt(g('news')).replace(/\n/g, ' ').slice(0, 100),
    growth: txt(g('growth')).slice(0, 46),
    mood: window.__voidMood || '',
    t: ms ? +ms.t.toFixed(2) : null,
    r: vs ? +vs.r.toFixed(3) : null,
    x: vs ? +vs.x.toFixed(1) : null, z: vs ? +vs.z.toFixed(1) : null,
  };
};

const log = [];
let last = '', down = false;
const marks = {};
const T_END = 62;
while (Date.now() - t0 < 900000) {
  let s;
  try { s = await p.evaluate(SAMPLE); } catch (e) { console.log('eval died', String(e).slice(0, 80)); break; }
  const key = JSON.stringify([s.load, s.pct, s.menu, s.tut, s.title, s.guide, s.evolve, s.joy, s.news, s.growth]);
  if (key !== last) { last = key; log.push({ wall: Date.now() - t0, ...s }); }
  if (!marks.matchLive && s.t > 0) marks.matchLive = { t: s.t, wall: Date.now() - t0 };
  if (!marks.coverGone && !s.load) marks.coverGone = { t: s.t, wall: Date.now() - t0 };
  if (!marks.dragPill && /DRAG/i.test(s.guide)) marks.dragPill = { t: s.t };
  if (!marks.evolve && s.evolve) marks.evolve = { t: s.t, r: s.r, txt: s.evolve };
  if (!marks.firstNews && s.news) marks.firstNews = { t: s.t, txt: s.news };

  if (MODE === 'child' && s.t > 0) {
    const aim = await p.evaluate(() => {
      const vs = window.__voidState(); const es = window.__edibles || [];
      let best = null, bd = 1e9;
      for (const e of es) {
        if (!e || !e.mesh || e.eaten || !e.mesh.visible) continue;
        if (e.radius > vs.r * 0.9) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = Math.hypot(dx, dz);
        if (d < bd) { bd = d; best = [dx / (d || 1), dz / (d || 1), d]; }
      }
      return best;
    }).catch(() => null);
    if (aim) {
      const cx = 215, cy = 620;
      if (!down) { await p.mouse.move(cx, cy); await p.mouse.down(); down = true; }
      // world +x is screen right, world +z is screen down for this camera rig
      await p.mouse.move(cx + aim[0] * 90, cy + aim[1] * 90, { steps: 1 });
    }
  }
  if (s.t !== null && s.t > T_END) break;
  await p.waitForTimeout(60);
}
if (down) await p.mouse.up().catch(() => {});

// what the run actually produced
const fin = await p.evaluate(() => {
  const ms = window.__matchState(), vs = window.__voidState();
  return { t: ms.t, score: ms.score, r: vs.r,
    eatenLeft: (window.__edibles || []).filter(e => e.eaten).length,
    stage: document.getElementById('growth')?.innerText?.replace(/\s+/g, ' ') };
}).catch(() => ({}));

console.log(`\n════ COLD INSTALL · ${MODE.toUpperCase()} · sim-accelerated ════`);
console.log('matchT | screen');
for (const e of log) {
  const bits = [];
  if (e.load) bits.push(`LOAD ${e.pct}`);
  if (e.menu) bits.push('MENU');
  if (e.tut) bits.push('TUT-CARD');
  if (e.title) bits.push(`TITLE «${e.title}»`);
  if (e.guide) bits.push(`GUIDE «${e.guide}»`);
  if (e.evolve) bits.push(`EVOLVE «${e.evolve}»`);
  if (e.joy) bits.push('joy-visible');
  if (e.news) bits.push(`NEWS «${e.news}»`);
  if (e.growth) bits.push(`bar[${e.growth}]`);
  console.log(`${String(e.t ?? '').padStart(6)} | r${String(e.r).padEnd(6)} ${bits.join('  ')}`);
}
console.log('\n── MARKS (match seconds) ──');
for (const k of Object.keys(marks)) console.log(' ', k, JSON.stringify(marks[k]));
console.log('  at end:', JSON.stringify(fin));
if (errs.length) console.log('PAGE ERRORS:', errs);
writeFileSync(`${OUT}${MODE}.json`, JSON.stringify({ marks, fin, log }, null, 1));
await b.close();
