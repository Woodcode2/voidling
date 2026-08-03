// DOES THE CROWD ACTUALLY INVERT? For each nearby spirit, take the dot product
// of its per-frame movement with the direction TO the void. Positive means it
// closed the gap; negative means it fled. Sample across the whole match and
// bucket by act. Act one should be positive, act three negative.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:1 });
await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
await p.goto('http://127.0.0.1:4177/?w=lantern',{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>{if(['daily','gift'].includes(e.id))e.classList.remove('show')}));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click('#worldRow .wCard[data-world="lantern"]');
await p.waitForFunction(()=>window.__matchState&&window.__matchState().t>0.2,null,{timeout:400000});
await p.evaluate(()=>{ window.__renderer.render = () => {}; });

await p.evaluate(() => {
  window.__mv = [];      // {t, closing, fleeing, still, greet}
  window.__bub = [];
  const prev = new Map();
  const seen = new Map();
  setInterval(() => {
    const ms = window.__matchState?.(); if (!ms) return;
    const vs = window.__voidState();
    let closing = 0, fleeing = 0, still = 0;
    for (const e of window.__edibles) {
      if (e.eaten || !e.mesh.visible || !e.mesh.userData.mover) continue;
      const m = e.mesh, d = Math.hypot(m.position.x - vs.x, m.position.z - vs.z);
      if (d > vs.r + 40) { prev.delete(m); continue; }     // only those in reach
      const p0 = prev.get(m);
      prev.set(m, { x: m.position.x, z: m.position.z });
      if (!p0) continue;
      const dx = m.position.x - p0.x, dz = m.position.z - p0.z;
      const step = Math.hypot(dx, dz);
      if (step < 0.004) { still++; continue; }
      // unit vector from the ped TOWARD the void
      const tx = (vs.x - m.position.x) / (d || 1), tz = (vs.z - m.position.z) / (d || 1);
      const dot = (dx * tx + dz * tz) / step;
      if (dot > 0.3) closing++; else if (dot < -0.3) fleeing++; else still++;
    }
    window.__mv.push({ t: Math.round(ms.t), closing, fleeing, still, tense: +ms.tense.toFixed(3) });
    for (const el of document.querySelectorAll('.vb')) {
      const s = (el.textContent||'').trim(); if (!s) continue;
      if (seen.get(el) === s) continue; seen.set(el, s);
      window.__bub.push({ t: Math.round(ms.t), s });
    }
  }, 200);
  // drive toward food so the void grows and tension climbs
  const cv = document.querySelector('canvas'); const cx=innerWidth/2, cy=innerHeight/2;
  cv.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:cx,clientY:cy,bubbles:true}));
  const tick = () => {
    const vs = window.__voidState(); let best=null,bd=1e9;
    for (const e of window.__edibles){ if(e.eaten||!e.mesh.visible||e.radius>vs.r*0.92) continue;
      const dx=e.mesh.position.x-vs.x, dz=e.mesh.position.z-vs.z; const d=dx*dx+dz*dz; if(d<bd){bd=d;best={dx,dz};}}
    if(best){const m=Math.hypot(best.dx,best.dz)||1;
      dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:cx+best.dx/m*110,clientY:cy+best.dz/m*110,bubbles:true}));}
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await p.waitForFunction(()=>document.getElementById('end')?.classList.contains('show'),null,{timeout:900000});
const { mv, bub } = await p.evaluate(()=>({ mv: window.__mv, bub: window.__bub }));

// The bands life.ts actually branches on — guest below 0.42, wary to 0.74,
// and everything above that is a flat-out flee. Bucketing by clock thirds was
// measuring something the code does not know about.
const act = m => m.tense < 0.42 ? 0 : m.tense < 0.74 ? 1 : 2;
const NAMES = ['ACT 1  GUEST   tense < 0.42', 'ACT 2  WARY    0.42-0.74', 'ACT 3  PANIC   >= 0.74'];
const tot = [ {c:0,f:0,s:0}, {c:0,f:0,s:0}, {c:0,f:0,s:0} ];
for (const m of mv) { const k = tot[act(m)]; k.c += m.closing; k.f += m.fleeing; k.s += m.still; }
const first = (f) => { const m = mv.find(f); return m ? m.t : null; };
const END = mv.length ? mv[mv.length-1].t : 180;
const t1 = first(m=>m.tense>=0.42) ?? END, t2 = first(m=>m.tense>=0.74) ?? END;
const secs = [t1, t2 - t1, END - t2];
console.log(`WALL CLOCK PER ACT (match ran ${END}s)`);
NAMES.forEach((n,i)=>console.log(`  ${n}   ${secs[i].toFixed(0)}s   ${(secs[i]/END*100).toFixed(0)}%`));
console.log(`  crosses 0.42 at ${t1}s, crosses 0.74 at ${t2}s`);
console.log('');
console.log('SPIRIT MOVEMENT relative to the void (samples of peds within reach)');
console.log('act                 toward    away    still    net');
tot.forEach((k,i)=>{
  const n = k.c + k.f + k.s || 1;
  const net = ((k.c - k.f) / n * 100).toFixed(0);
  console.log(`  ${NAMES[i]}  ${String(k.c).padStart(6)}  ${String(k.f).padStart(6)}  ${String(k.s).padStart(6)}   ${net > 0 ? '+' : ''}${net}%`);
});
console.log('\nwhat the market said, by act:');
const tenseAt = (t) => { let best = 0; for (const m of mv) { if (m.t <= t) best = m.tense; } return best; };
for (const a of [0,1,2]) {
  const lines = bub.filter(x=>act({tense: tenseAt(x.t)})===a);
  console.log(`  ${NAMES[a]}  (${lines.length} lines)`);
  for (const x of lines.slice(0,4)) console.log(`     ${String(x.t).padStart(3)}s  ${x.s}`);
}
await b.close();
