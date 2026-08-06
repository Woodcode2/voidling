// REFUTE — "the middle 60-130s is dead". Logs EVERY lane a child sees or hears,
// match-time stamped, and counts them per 15s BOTH with and without the news
// lane, plus the eat-feedback lane the banner-count metric never touched.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLDS = (process.argv[2] || 'maple,gameday').split(',');
const RUNS = Number(process.argv[3] || 1);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const OUT = {};

await Promise.all(WORLDS.map(async (wid) => {
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

  await p.evaluate(() => {
    const T = () => window.__matchState?.().t ?? 0;
    const ev = [];
    const log = (kind, text) => ev.push({ t: +T().toFixed(2), kind, text });
    window.__rm = { ev, samples: [] };
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
    watch('banner', 'BANNER'); watch('news', 'NEWS'); watch('evolve', 'EVOLVE');
    watch('guide', 'GUIDE'); watch('find', 'FIND'); watch('sticker', 'FIND');

    // musStage — the actual argument the soundtrack receives
    let lastMus = -1;
    const origMus = window.__audioSetMus;
    // fall back: derive it from the shipped table
    const VIS = [0, 1, 2, 3, 3, 4];
    const FORM_MIN = [0, 1.6, 2.5, 3.6, 5.5, 8.0];
    const FORMS = ['VOIDLING','MUNCHER','GOBBLER','DEVOURER','COLOSSUS','WORLD ENDER'];
    const formFor = r => { let s = 0; for (let i=0;i<FORM_MIN.length;i++) if (r>=FORM_MIN[i]) s=i; return s; };

    let lastForm = -1, lastAlive = null, eats = 0, lastRank = null, lastMult = 1;
    const hunting = {}, joined = {}, stuffed = {};
    const iv = setInterval(() => {
      const ms = window.__matchState?.(); if (!ms) return;
      const vs = window.__voidState(); const t = ms.t;
      for (const r of ms.rivals) {
        if (r.joined && !joined[r.name]) { joined[r.name] = t; log('RIVAL_JOIN', `${r.name} ${r.arch}`); }
        if (r.hunt && !hunting[r.name]) { hunting[r.name] = t; log('HUNT_ON', r.name); }
        if (!r.hunt && hunting[r.name] === t) {}
      }
      const f = formFor(ms.r);
      if (f !== lastForm) { if (lastForm >= 0) log('FORM', FORMS[f]); lastForm = f; }
      const m = VIS[f] > 3 ? 3 : VIS[f];             // what the schedulers actually clamp to
      if (m !== lastMus) { if (lastMus >= 0) log('MUSIC', `tier ${lastMus} -> ${m}`); lastMus = m; }
      let alive = 0, inReach = 0;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible) continue;
        alive++;
        if (e.radius > vs.r * 0.92) continue;
        const d = Math.hypot(e.mesh.position.x - vs.x, e.mesh.position.z - vs.z);
        if (d < vs.r + 30) inReach++;
      }
      if (lastAlive !== null && alive < lastAlive) eats += lastAlive - alive;
      lastAlive = alive;
      const scores = ms.rivals.filter(r=>r.joined).map(r=>r.score);
      const rank = 1 + scores.filter(s => s > ms.score).length;
      if (lastRank !== null && rank !== lastRank) log('RANK', `#${lastRank} -> #${rank}`);
      lastRank = rank;
      window.__rm.samples.push({ t:+t.toFixed(2), r:+ms.r.toFixed(3), score: Math.round(ms.score),
        eats, alive, inReach, rank, bites: ms.ev?.bites ?? 0,
        hunters: ms.rivals.filter(r=>r.hunt).length,
        stuffed: ms.rivals.filter(r=>r.full).length,
        rivalTop: Math.round(Math.max(0, ...ms.rivals.map(r=>r.score))) });
      if (document.getElementById('end')?.classList.contains('show')) clearInterval(iv);
    }, 200);

    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => { const vs = window.__voidState(); let best = null, bd = 1e9;
      for (const e of window.__edibles) { if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z; const d = dx*dx + dz*dz;
        if (d < bd) { bd = d; best = { dx, dz }; } }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + best.dx/m*110, clientY: cy + best.dz/m*110, bubbles: true })); }
      requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });

  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 1800000 });
  const data = await p.evaluate(() => window.__rm);
  OUT[`${wid}#${run}`] = data;
  await p.close();
 }
}));

// ── report ──────────────────────────────────────────────────────────────────
const BEAT = new Set(['BANNER','EVOLVE','FIND','RIVAL_JOIN','HUNT_ON','GUIDE','RANK','MUSIC']);
for (const key of Object.keys(OUT)) {
  const { ev, samples } = OUT[key];
  const END = samples.at(-1)?.t ?? 180;
  console.log(`\n${'='.repeat(84)}\n${key}   ${END.toFixed(0)}s  final r=${samples.at(-1)?.r} score=${samples.at(-1)?.score}`);
  const sorted = ev.slice().sort((a,b)=>a.t-b.t);
  console.log('  --- FULL TIMELINE 55s..135s (the claimed trough) ---');
  for (const e of sorted) if (e.t >= 55 && e.t <= 135)
    console.log(`   ${String(e.t.toFixed(1)).padStart(6)}  ${e.kind.padEnd(11)} ${e.text.slice(0,66)}`);
  console.log('  --- FORM / MUSIC / RANK across the whole match ---');
  for (const e of sorted) if (['FORM','MUSIC','RANK','BANNER','FIND'].includes(e.kind))
    console.log(`   ${String(e.t.toFixed(1)).padStart(6)}  ${e.kind.padEnd(7)} ${e.text.slice(0,60)}`);
  console.log('\n   win   beats  +news  ALLev   eats/s   r      score    rank  gapMax');
  for (let t = 0; t < END; t += 15) {
    const w = sorted.filter(e => e.t >= t && e.t < t+15);
    const nb = w.filter(e => BEAT.has(e.kind)).length;
    const nn = w.filter(e => e.kind === 'NEWS').length;
    const s0 = samples.find(s=>s.t>=t), s1 = [...samples].reverse().find(s=>s.t<t+15);
    const de = (s1&&s0) ? (s1.eats - s0.eats) : 0;
    const dt = (s1&&s0) ? Math.max(0.1, s1.t - s0.t) : 15;
    // longest silence inside this window counting ALL lanes
    const ts = [t, ...w.map(e=>e.t), t+15]; let gm = 0;
    for (let i=1;i<ts.length;i++) gm = Math.max(gm, ts[i]-ts[i-1]);
    console.log(`  ${String(t).padStart(4)}  ${String(nb).padStart(5)}  ${String(nn).padStart(5)}  ${String(nb+nn).padStart(5)}  ` +
      `${(de/dt).toFixed(1).padStart(6)}  ${String(s1?.r??'').padStart(6)} ${String(s1?.score??'').padStart(7)}  ` +
      `${String(s1?.rank??'').padStart(4)}  ${gm.toFixed(1).padStart(5)}s`);
  }
  const stf = samples.find(s=>s.stuffed>0);
  const hunt = samples.filter(s=>s.hunters>0);
  console.log(`   first stuffed rival: ${stf? stf.t+'s':'never'};  hunter active in ${hunt.length}/${samples.length} samples` +
    `  (windows: ${[0,30,60,90,120,150].map(a=>`${a}-${a+30}:${samples.filter(s=>s.t>=a&&s.t<a+30&&s.hunters>0).length}`).join(' ')})`);
}
fs.writeFileSync(process.env.RM_OUT || '/tmp/rf_middle.json', JSON.stringify(OUT));
await b.close();
