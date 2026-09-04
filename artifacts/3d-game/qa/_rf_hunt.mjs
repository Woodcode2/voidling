// REFUTATION PROBE — "the game promises 'now is your chance' at 99.0s and never
// pays it".
//
// The rhythm audit's number (1 marquee eat in 9 matches) came from qa/_rhythm.mjs,
// whose bot steers at `window.__edibles` ONLY. Rivals are not in __edibles, so
// that bot never once pointed itself at CHOMPZILLA. It measures how often she
// walks into an idle mouth, not whether she is reachable.
//
// This probe runs the SAME world, same length, two bots:
//   GREEDY  — verbatim copy of the rhythm bot (control)
//   HUNTER  — greedy until the stuffed card, then goes for her when she is
//             swallowable, otherwise keeps growing. This is what a child who
//             read the card does.
// It also samples the size gap and the closing rate, so "she outruns a
// DEVOURER" is a number, not an impression.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const MODE = process.argv[3] || 'hunter';       // hunter | greedy
const RUNS = Number(process.argv[4] || 1);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const OUT = [];
for (const wid of WORLDS) {
 for (let run = 0; run < RUNS; run++) {
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
  await p.evaluate(() => { window.__renderer.render = () => {}; });

  await p.evaluate((MODE) => {
    const T = () => window.__matchState?.().t ?? 0;
    const ev = [];
    const log = (kind, text) => ev.push({ t: +T().toFixed(2), kind, text });
    window.__rf = { ev, samples: [], mode: MODE };

    // banners, verbatim, so the "player ate a rival" card is counted the same
    // way the rhythm audit counted it
    const watch = (id, kind) => {
      const el = document.getElementById(id); if (!el) return;
      let last = '';
      new MutationObserver(() => {
        const shown = el.classList.contains('show');
        const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (shown && txt && txt !== last) { last = txt; log(kind, txt); }
        if (!shown) last = '';
      }).observe(el, { attributes: true, childList: true, subtree: true, characterData: true });
    };
    watch('banner', 'BANNER'); watch('evolve', 'EVOLVE');

    let lastHX = null, lastHZ = null, lastT = null, lastPX = null, lastPZ = null;
    let stuffedAt = null, marqueeSeen = 0;
    const iv = setInterval(() => {
      const ms = window.__matchState?.(); if (!ms) return;
      const vs = window.__voidState();
      const h = ms.rivals.find(r => r.name === 'CHOMPZILLA');
      if (h && h.joined && !h.hunt && stuffedAt === null) { stuffedAt = ms.t; log('STUFFED', `r=${h.r.toFixed(2)} pr=${ms.r.toFixed(2)}`); }
      if ((ms.ev?.marquee ?? 0) > marqueeSeen) { marqueeSeen = ms.ev.marquee; log('MARQUEE', `t=${ms.t.toFixed(1)}`); }
      let hspd = null, pspd = null, close = null;
      if (h && lastT !== null && ms.t > lastT) {
        const dt = ms.t - lastT;
        hspd = Math.hypot(h.x - lastHX, h.z - lastHZ) / dt;
        pspd = Math.hypot(vs.x - lastPX, vs.z - lastPZ) / dt;
      }
      if (h) { lastHX = h.x; lastHZ = h.z; }
      lastPX = vs.x; lastPZ = vs.z; lastT = ms.t;
      window.__rf.samples.push({
        t: +ms.t.toFixed(2), pr: +ms.r.toFixed(3), score: Math.round(ms.score),
        hr: h ? +h.r.toFixed(3) : null, hjoin: !!h?.joined, hhunt: !!h?.hunt, hfull: !!(h && h.joined && !h.hunt),
        hd: h ? Math.round(Math.hypot(h.x - vs.x, h.z - vs.z)) : null,
        ratio: h && h.r > 0 ? +(ms.r / h.r).toFixed(3) : null,
        hspd: hspd === null ? null : +hspd.toFixed(1), pspd: pspd === null ? null : +pspd.toFixed(1),
        marquee: ms.ev?.marquee ?? 0, eaten: ms.ev?.eaten ?? 0, bites: ms.ev?.bites ?? 0,
      });
      if (document.getElementById('end')?.classList.contains('show')) clearInterval(iv);
    }, 200);

    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => {
      const vs = window.__voidState();
      const ms = window.__matchState?.();
      let tx = null, tz = null;
      if (MODE === 'hunter' && ms) {
        const h = ms.rivals.find(r => r.name === 'CHOMPZILLA');
        // Go for her the moment the swallow rule allows it (pr > hr*1.2), and
        // only after the card. Before that, or if she is too big, keep growing.
        if (h && h.joined && !h.hunt && vs.r > h.r * 1.2) { tx = h.x - vs.x; tz = h.z - vs.z; }
      }
      if (tx === null) {
        let bd = 1e9;
        for (const e of window.__edibles) {
          if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
          const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
          const d = dx * dx + dz * dz; if (d < bd) { bd = d; tx = dx; tz = dz; }
        }
      }
      if (tx !== null) { const m = Math.hypot(tx, tz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + tx / m * 110, clientY: cy + tz / m * 110, bubbles: true })); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, MODE);

  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 1200000 });
  const data = await p.evaluate(() => window.__rf);
  await p.close();

  const { ev, samples } = data;
  const s = samples;
  const END = s.length ? s.at(-1).t : 180;
  const stuffed = ev.find(e => e.kind === 'STUFFED');
  const card = ev.find(e => e.kind === 'BANNER' && /too full/i.test(e.text));
  const marq = ev.filter(e => e.kind === 'MARQUEE');
  const ateCards = ev.filter(e => e.kind === 'BANNER' && /(ATE|GULP|swallow)/i.test(e.text));
  // first sample after the card where the swallow rule is satisfied
  const firstEatable = s.find(x => x.hfull && x.ratio !== null && x.ratio > 1.2);
  const post = s.filter(x => x.hfull);
  const spdPairs = post.filter(x => x.hspd !== null && x.hd < 120);
  const meanH = spdPairs.length ? spdPairs.reduce((a, c) => a + c.hspd, 0) / spdPairs.length : 0;
  const meanP = spdPairs.length ? spdPairs.reduce((a, c) => a + c.pspd, 0) / spdPairs.length : 0;
  const rec = {
    world: wid, run, mode: MODE, end: +END.toFixed(1),
    cardAt: card ? card.t : (stuffed ? stuffed.t : null),
    stuffedAt: stuffed ? stuffed.t : null,
    marqueeAt: marq.length ? marq[0].t : null,
    marqueeN: s.at(-1)?.marquee ?? 0,
    rivalEatsN: s.at(-1)?.eaten ?? 0,
    firstEatableAt: firstEatable ? firstEatable.t : null,
    ratioAtCard: stuffed ? (s.find(x => x.t >= stuffed.t)?.ratio ?? null) : null,
    ratioAtEnd: s.at(-1)?.ratio ?? null,
    hrAtCard: stuffed ? (s.find(x => x.t >= stuffed.t)?.hr ?? null) : null,
    hrAtEnd: s.at(-1)?.hr ?? null,
    prAtEnd: s.at(-1)?.pr ?? null,
    meanHunterSpd: +meanH.toFixed(1), meanPlayerSpd: +meanP.toFixed(1),
    maxHunterSpdPost: post.length ? Math.max(...post.map(x => x.hspd ?? 0)) : 0,
    maxPlayerSpdPost: post.length ? Math.max(...post.map(x => x.pspd ?? 0)) : 0,
    meanDistPost: post.length ? Math.round(post.reduce((a, c) => a + c.hd, 0) / post.length) : null,
    minDistPost: post.length ? Math.min(...post.map(x => x.hd)) : null,
    onScreenPost: post.length ? +(post.filter(x => x.hd < 90).length / post.length).toFixed(2) : null,
    bites: s.at(-1)?.bites ?? 0,
    ateCards: ateCards.map(e => `${e.t}s ${e.text.slice(0, 44)}`),
  };
  OUT.push(rec);
  console.log(`\n${'='.repeat(74)}\n${wid.toUpperCase()} run${run} [${MODE}]`);
  console.log(JSON.stringify(rec, null, 1));
  console.log('  t   pr    hr   ratio  dist  hspd pspd  full');
  for (let t = 90; t <= END; t += 10) {
    const x = s.reduce((a, c) => Math.abs(c.t - t) < Math.abs(a.t - t) ? c : a, s[0]);
    console.log(`  ${String(t).padStart(3)} ${String(x.pr).padStart(5)} ${String(x.hr).padStart(5)} ${String(x.ratio).padStart(6)} ${String(x.hd).padStart(5)} ${String(x.hspd).padStart(5)} ${String(x.pspd).padStart(5)}  ${x.hfull ? 'Y' : '.'}`);
  }
 }
}
fs.writeFileSync(process.env.RF_OUT || '/tmp/rfhunt.json', JSON.stringify(OUT, null, 1));
console.log('\nSUMMARY');
for (const r of OUT) console.log(` ${r.world.padEnd(8)}${r.mode.padEnd(8)} card=${r.cardAt} eatableAt=${r.firstEatableAt} marquee=${r.marqueeAt} n=${r.marqueeN} rivalEats=${r.rivalEatsN} ratio@card=${r.ratioAtCard} ratio@end=${r.ratioAtEnd}`);
await b.close();
