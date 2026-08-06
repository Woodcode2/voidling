// REFUTE PROBE — what is actually on screen during the claimed 60-130s "trough".
// Counts the PLAYER's own eats (mesh.userData.byPlayer), the on-screen card
// coverage (#news / #banner / #evolve carrying .show), and the growth bar text.
import { chromium } from 'playwright';
import fs from 'node:fs';
const wid = process.argv[2] || 'gameday';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil:'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${wid}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout: 400000 });

await p.evaluate(() => { window.__realRender = window.__renderer.render.bind(window.__renderer); window.__renderer.render = () => {}; });
await p.evaluate(() => {
  window.__tr = [];
  const cv = document.querySelector('canvas');
  const cx = innerWidth/2, cy = innerHeight/2;
  cv.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:cx,clientY:cy,bubbles:true}));
  const tick = () => { const vs = window.__voidState(); let best=null,bd=1e9;
    for (const e of window.__edibles){ if(e.eaten||!e.mesh?.visible||e.radius>vs.r*0.92) continue;
      const dx=e.mesh.position.x-vs.x, dz=e.mesh.position.z-vs.z, d=dx*dx+dz*dz;
      if(d<bd){bd=d;best={dx,dz};} }
    if(best){const m=Math.hypot(best.dx,best.dz)||1;
      dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:cx+best.dx/m*110,clientY:cy+best.dz/m*110,bubbles:true}));}
    requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const ids = ['news','banner','evolve','find','sticker','guide'];
  setInterval(() => {
    const ms = window.__matchState?.(); if (!ms) return;
    let mine = 0;
    for (const e of window.__edibles) if (e.eaten && e.mesh?.userData?.byPlayer) mine++;
    const shown = ids.filter(i => document.getElementById(i)?.classList.contains('show'));
    const g = document.getElementById('growth');
    window.__tr.push({ t:+ms.t.toFixed(2), mine, r:+ms.r.toFixed(2), score: Math.round(ms.score),
      cards: shown.join('+'),
      bar: g ? (g.textContent||'').replace(/\s+/g,' ').trim().slice(0,40) : '',
      fill: document.querySelector('#growth .gFill')?.style.width || '' });
  }, 250);
});
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 132, null, { timeout: 2400000 });
await p.evaluate(() => { window.__renderer.render = window.__realRender; });
await p.waitForTimeout(1500);
const shot = await p.screenshot();
fs.writeFileSync(`/tmp/claude-0/-home-user-voidling/1f93d8f7-3ff2-5559-8b0b-a74b62b39437/scratchpad/trough-${wid}.png`, shot);
const tr = await p.evaluate(() => window.__tr);
await p.close(); await b.close();

console.log(`${wid}: ${tr.length} samples, t ${tr[0].t} -> ${tr.at(-1).t}`);
console.log('\n  win   PLAYER eats  score gain   r     bar fill   seconds a card was on screen');
for (let t=0;t<135;t+=15){
  const w = tr.filter(s=>s.t>=t&&s.t<t+15); if(!w.length) continue;
  const cardSamples = w.filter(s=>s.cards).length;
  console.log(`  ${String(t).padStart(3)}-${String(t+15).padStart(3)}s ${String(w.at(-1).mine-w[0].mine).padStart(8)} ${String(w.at(-1).score-w[0].score).padStart(11)} ${String(w.at(-1).r).padStart(6)} ${String(w.at(-1).fill).padStart(9)}   ${(cardSamples/w.length*15).toFixed(1)}s (${Math.round(cardSamples/w.length*100)}%)`);
}
console.log('\n  growth bar label over time:');
let lb=''; for(const s of tr){ if(s.bar!==lb){ lb=s.bar; console.log(`   ${s.t.toFixed(1)}s  ${lb}`);} }
console.log('\n  longest stretch 55-135s with NO card of any kind on screen:');
{
  const w = tr.filter(s=>s.t>=55&&s.t<=135);
  let run=0,best=0,at=0;
  for(const s of w){ if(!s.cards){ run+=0.25; if(run>best){best=run;at=s.t;} } else run=0; }
  console.log(`   ${best.toFixed(1)}s (ending ${at.toFixed(1)}s)`);
}
fs.writeFileSync(`/tmp/claude-0/-home-user-voidling/1f93d8f7-3ff2-5559-8b0b-a74b62b39437/scratchpad/trough-${wid}.json`, JSON.stringify(tr));
