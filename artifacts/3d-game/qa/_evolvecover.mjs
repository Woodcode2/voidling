// IS ANYTHING PAINTED OVER THE EVOLUTION?
//
//   node qa/_evolvecover.mjs [port] [world]
//
// The owner, on his own recording: "When we evolve it's like a lag. Hole.io
// evolves is more expressive." The frame he is describing has the word GOBBLIN
// rendered as a pale ghost UNDERNEATH a solid "NIBBLES TOOK THE LEAD!" card.
//
// It is not lag and the ceremony is not under-designed — #evolve already
// carries a 46px stroked name, a gold/pink burst and a ray ring. #evolve sat at
// z-index 7 while #banner and #count sit at 8, and all three are plain body
// siblings with no stacking context between them, so the rival chatter and the
// countdown painted OVER the biggest moment in the match on every device.
//
// WHAT THIS MEASURES: the fraction of the evolve card's own text box that any
// higher-painting HUD element covers, by rectangle intersection, at several
// phone widths. Not "is the banner visible" — a banner beside the card is fine;
// only overlap is the defect.
//
// It drives the SHIPPED ceremony through window.__forceEvolve(), which fires
// the real stage-change block on the next frame without touching the radius.
// Reaching an evolution honestly means playing a real match to a real size at
// the 1-2fps a software renderer manages, and a probe that cannot reach the
// moment ends up asserting about a moment that never arrived.
import { chromium } from 'playwright';
import { enterMatch } from './_enter.mjs';

const PORT = process.argv[2] || '4177';
const WORLD = process.argv[3] || 'maple';
const WIDTHS = [360, 390, 430];
/** anything above this fraction of a line box covered is a fail */
const TOL = 0.02;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const rows = [];
for (const W of WIDTHS) {
  const p = await b.newPage({ viewport: { width: W, height: 844 } });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidFirstNom', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
  } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await enterMatch(p, WORLD);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 5, null, { timeout: 600000 });

  // A RIVAL BANNER, FIRED FIRST — this is the case the owner photographed, and
  // it is the one holdBanner() never covered: the banner is already on screen
  // when the evolution lands.
  await p.evaluate(() => {
    const el = document.getElementById('banner');
    el.classList.remove('bye');
    el.innerHTML = '<div class="bCard"><span class="bIco">\u{1F451}</span>'
      + '<span class="bTx">NIBBLES TOOK THE LEAD!<span class="bSub">get it back!</span></span></div>';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  });
  await p.waitForTimeout(500);
  await p.evaluate(() => window.__forceEvolve());

  // sample across the card's opaque window (ev holds opacity 1 from 18% to 70%
  // of 1.8s), and keep the WORST overlap seen
  let worst = null;
  for (let i = 0; i < 10; i++) {
    await p.waitForTimeout(130);
    const s = await p.evaluate((tol) => {
      const ev = document.getElementById('evolve');
      if (!ev || !ev.classList.contains('show')) return null;
      const zOf = (el) => { const z = parseInt(getComputedStyle(el).zIndex, 10); return Number.isNaN(z) ? 0 : z; };
      const evZ = zOf(ev);
      const over = [];
      for (const id of ['banner', 'count', 'news', 'guide', 'quests']) {
        const el = document.getElementById(id);
        if (!el) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) continue;
        // only elements that actually PAINT ABOVE the card can cover it
        if (zOf(el) < evZ) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        over.push({ id, z: zOf(el), r: { x: r.x, y: r.y, w: r.width, h: r.height } });
      }
      const box = (sel) => { const e = ev.querySelector(sel); if (!e) return null;
        const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
      const cover = (t) => { if (!t || t.w < 1 || t.h < 1) return 0;
        let a = 0;
        for (const o of over) {
          const ix = Math.max(0, Math.min(t.x + t.w, o.r.x + o.r.w) - Math.max(t.x, o.r.x));
          const iy = Math.max(0, Math.min(t.y + t.h, o.r.y + o.r.h) - Math.max(t.y, o.r.y));
          a = Math.max(a, (ix * iy) / (t.w * t.h));
        }
        return a; };
      return { evZ, big: cover(box('.big')), sm: cover(box('.sm')),
        over: over.map(o => `${o.id}(z${o.z})`) };
    }, TOL);
    if (!s) continue;
    if (!worst || s.big + s.sm > worst.big + worst.sm) worst = s;
  }
  await p.close();
  if (!worst) { rows.push({ W, err: 'the evolve card never showed — __forceEvolve did not fire' }); continue; }
  rows.push({ W, ...worst });
}
await b.close();

console.log(' width   #evolve z   .big covered   .sm covered   painting above it');
for (const r of rows) {
  if (r.err) { console.log(`${String(r.W).padStart(6)}   ${r.err}`); continue; }
  console.log(`${String(r.W).padStart(6)}   ${String(r.evZ).padStart(9)}   ${(r.big * 100).toFixed(1).padStart(12)}%  ${(r.sm * 100).toFixed(1).padStart(12)}%   ${r.over.join(' ') || '(nothing)'}`);
}
console.log('');
const bad = rows.filter(r => r.err || r.big > TOL || r.sm > TOL);
if (bad.length) {
  for (const r of bad) {
    if (r.err) console.log(`FAIL — ${r.W}px: ${r.err}`);
    else console.log(`FAIL — ${r.W}px: ${(r.big * 100).toFixed(1)}% of the form name and ${(r.sm * 100).toFixed(1)}% of the EVOLVED line are painted over by ${r.over.join(', ')}`);
  }
  process.exit(1);
}
console.log(`PASS — at ${WIDTHS.join(', ')}px nothing paints over the evolve card; a rival banner fired half a second earlier is pulled down rather than left on top of it`);
