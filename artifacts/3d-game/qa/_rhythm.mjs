// AUDIT — RHYTHM. A full match per world, timeline of EVERY beat a child can
// see or hear, stamped against __matchState().t (never wall clock: the software
// renderer is 1/9 to 1/40 real time). Renderer stubbed so the sim runs at rate.
//
// Emits: an event log, gap analysis (dead air), and the growth curves.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const RUNS = Number(process.argv[3] || 1);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const OUT = {};

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

  await p.evaluate(() => {
    const T = () => window.__matchState?.().t ?? 0;
    const ev = [];   // { t, kind, text }
    const log = (kind, text) => ev.push({ t: +T().toFixed(2), kind, text });
    window.__rh = { ev, samples: [] };

    // ── every visible banner / news / evolve, via MutationObserver ──────────
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

    // ── audio: what the child HEARS. wrap every method on the audio object we
    // can reach through the debug surface, else fall back to AudioContext
    // node creation counts per second.
    let acNodes = 0;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const orig = AC.prototype.createOscillator;
      AC.prototype.createOscillator = function (...a) { acNodes++; return orig.apply(this, a); };
      const ob = AC.prototype.createBufferSource;
      AC.prototype.createBufferSource = function (...a) { acNodes++; return ob.apply(this, a); };
    } catch {}

    // ── state-derived events ───────────────────────────────────────────────
    let lastR = null, lastScore = 0, lastForm = -1;
    const joined = {}, hunting = {}, gone = {};
    let lastAlive = null, eats = 0;
    let lastMyRank = null;
    const FORM_MIN = [0, 1.6, 2.5, 3.6, 5.5, 8.0];
    const FORMS = ['VOIDLING','MUNCHER','GOBBLER','DEVOURER','COLOSSUS','WORLD ENDER'];
    const formFor = r => { let s = 0; for (let i=0;i<FORM_MIN.length;i++) if (r>=FORM_MIN[i]) s=i; return s; };

    const iv = setInterval(() => {
      const ms = window.__matchState?.(); if (!ms) return;
      const vs = window.__voidState();
      const t = ms.t;
      // rivals
      for (const r of ms.rivals) {
        if (r.joined && !joined[r.name]) { joined[r.name] = t; log('RIVAL_JOIN', `${r.name} (${r.arch}) r=${r.r.toFixed(2)}`); }
        if (r.hunt && !hunting[r.name]) { hunting[r.name] = t; log('HUNT_ON', r.name); }
        if (!r.hunt && hunting[r.name] && !gone[r.name+'h']) { gone[r.name+'h'] = 1; log('HUNT_OFF', r.name); }
        if (r.full && !gone[r.name+'f']) { gone[r.name+'f'] = 1; log('RIVAL_STUFFED', r.name); }
      }
      // form
      const f = formFor(ms.r);
      if (f !== lastForm) { if (lastForm >= 0) log('FORM', FORMS[f]); lastForm = f; }
      // edibles / reach
      let alive = 0, inReach = 0, nearest = 1e9, eatableAnywhere = 0;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible) continue;
        alive++;
        if (e.radius > vs.r * 0.92) continue;
        eatableAnywhere++;
        const d = Math.hypot(e.mesh.position.x - vs.x, e.mesh.position.z - vs.z);
        if (d < nearest) nearest = d;
        if (d < vs.r + 30) inReach++;
      }
      if (lastAlive !== null && alive < lastAlive) eats += lastAlive - alive;
      lastAlive = alive;
      // rank
      const scores = ms.rivals.filter(r=>r.joined).map(r=>r.score);
      const rank = 1 + scores.filter(s => s > ms.score).length;
      if (lastMyRank !== null && rank !== lastMyRank) log('RANK', `#${lastMyRank} -> #${rank}`);
      lastMyRank = rank;

      window.__rh.samples.push({ t:+t.toFixed(2), r:+ms.r.toFixed(3), score: Math.round(ms.score),
        alive, inReach, nearest: Math.round(Math.min(nearest,999)), eats,
        eatable: eatableAnywhere, rank, nodes: acNodes,
        rivalTop: Math.round(Math.max(0, ...ms.rivals.map(r=>r.score))),
        tense: +(ms.tense??0).toFixed(2),
        bites: ms.ev?.bites ?? 0 });
      acNodes = 0;
      if (document.getElementById('end')?.classList.contains('show')) clearInterval(iv);
    }, 200);

    // ── drive: greedy nearest edible, the competent-player baseline ─────────
    const cv = document.querySelector('canvas');
    const cx = innerWidth / 2, cy = innerHeight / 2;
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: cx, clientY: cy, bubbles: true }));
    const tick = () => {
      const vs = window.__voidState(); let best = null, bd = 1e9;
      for (const e of window.__edibles) {
        if (e.eaten || !e.mesh?.visible || e.radius > vs.r * 0.92) continue;
        const dx = e.mesh.position.x - vs.x, dz = e.mesh.position.z - vs.z;
        const d = dx*dx + dz*dz; if (d < bd) { bd = d; best = { dx, dz }; }
      }
      if (best) { const m = Math.hypot(best.dx, best.dz) || 1;
        dispatchEvent(new PointerEvent('pointermove', { pointerId: 1,
          clientX: cx + best.dx/m*110, clientY: cy + best.dz/m*110, bubbles: true })); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'),
    null, { timeout: 1200000 });
  const data = await p.evaluate(() => window.__rh);
  OUT[`${wid}#${run}`] = data;
  await p.close();

  // ── report ───────────────────────────────────────────────────────────────
  const { ev, samples } = data;
  const END = samples.length ? samples[samples.length-1].t : 180;
  console.log(`\n${'='.repeat(78)}\n${wid.toUpperCase()}  run ${run}   ${END.toFixed(0)}s   final r=${samples.at(-1)?.r}  score=${samples.at(-1)?.score}\n${'='.repeat(78)}`);

  // TIMELINE
  const sorted = ev.slice().sort((a,b)=>a.t-b.t);
  // "player-visible beat" = anything that is a card, an evolution, a find, a
  // rival arriving, or the hunt turning on/off. News is a separate lane.
  const BEATKINDS = new Set(['BANNER','EVOLVE','FIND','RIVAL_JOIN','HUNT_ON','HUNT_OFF','RIVAL_STUFFED','GUIDE']);
  let prev = 0;
  console.log('    t      gap  kind          text');
  for (const e of sorted) {
    const isBeat = BEATKINDS.has(e.kind);
    const gap = isBeat ? (e.t - prev) : null;
    if (isBeat) prev = e.t;
    console.log(`  ${String(e.t.toFixed(1)).padStart(6)} ${gap===null?'      ':(gap.toFixed(1)+'s').padStart(6)}  ${e.kind.padEnd(13)} ${e.text.slice(0,72)}`);
  }
  const beats = sorted.filter(e=>BEATKINDS.has(e.kind));
  const gaps = [];
  let last = 0;
  for (const e of beats) { gaps.push({ from: last, to: e.t, len: e.t-last, next: e.kind+' '+e.text.slice(0,40) }); last = e.t; }
  gaps.push({ from: last, to: END, len: END-last, next: 'END' });
  gaps.sort((a,b)=>b.len-a.len);
  console.log(`\n  DEAD AIR — longest gaps with NO card, evolution, find or rival event:`);
  for (const g of gaps.slice(0,6))
    console.log(`    ${g.len.toFixed(1)}s   ${g.from.toFixed(1)}s -> ${g.to.toFixed(1)}s   broken by ${g.next}`);

  // news lane
  const news = sorted.filter(e=>e.kind==='NEWS');
  const ngaps = []; let ln = 0;
  for (const n of news) { ngaps.push(n.t-ln); ln = n.t; }
  console.log(`\n  NEWS: ${news.length} headlines, mean gap ${(ngaps.reduce((a,c)=>a+c,0)/(ngaps.length||1)).toFixed(1)}s, max ${Math.max(0,...ngaps).toFixed(1)}s`);

  // growth curve
  console.log(`\n  CURVE (every 15s)`);
  console.log('     t     r    score   rivalTop  rank  eats  inReach  nearest  eatable  audio/s');
  for (let t = 0; t <= END; t += 15) {
    const s = samples.reduce((a,c)=> Math.abs(c.t-t) < Math.abs(a.t-t) ? c : a, samples[0]);
    console.log(`  ${String(t).padStart(4)} ${String(s.r).padStart(6)} ${String(s.score).padStart(7)} ${String(s.rivalTop).padStart(9)} ${String(s.rank).padStart(5)} ${String(s.eats).padStart(5)} ${String(s.inReach).padStart(8)} ${String(s.nearest).padStart(8)} ${String(s.eatable).padStart(8)} ${String(s.nodes*5).padStart(8)}`);
  }
  // per-20s eat rate
  console.log(`\n  EAT RATE per 20s window`);
  for (let t=0;t<END;t+=20){
    const w = samples.filter(s=>s.t>=t&&s.t<t+20); if(!w.length) continue;
    const n = w.at(-1).eats - w[0].eats;
    const dead = w.filter(s=>s.inReach===0).length/w.length;
    const bar = '#'.repeat(Math.round(n/2));
    console.log(`   ${String(t).padStart(3)}-${String(t+20).padStart(3)}s ${String(n).padStart(4)} eats  ${(n/20).toFixed(2)}/s  dead ${(dead*100).toFixed(0).padStart(3)}%  ${bar}`);
  }
 }
}
fs.writeFileSync(process.env.RH_OUT || '/tmp/rhythm.json', JSON.stringify(OUT));
await b.close();
