// AUDIT — WHAT THE VOID ACTUALLY DOES, PER FRAME.
// Does eating make you visibly bigger, or does the growth law eat the growth?
// Per-frame radius, per-frame eat count, and whether the radius ever goes DOWN
// on a frame the child is watching.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, { waitUntil:'domcontentloaded', timeout:300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout:400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
    if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 0.2, null, { timeout:400000 });
  await p.evaluate(() => { window.__renderer.render = () => {}; });

  await p.evaluate(() => {
    const F = [];  // per frame { t, r, alive }
    window.__gf = F;
    const alive = () => { let n=0; for (const e of window.__edibles) if(!e.eaten && e.mesh?.visible) n++; return n; };
    const cv = document.querySelector('canvas');
    const cx = innerWidth/2, cy = innerHeight/2;
    cv.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:cx,clientY:cy,bubbles:true}));
    const tick = () => {
      const ms = window.__matchState?.(); const vs = window.__voidState();
      if (ms) F.push({ t:+ms.t.toFixed(3), r:+ms.r.toFixed(4), a: alive() });
      let best=null,bd=1e9;
      for (const e of window.__edibles) {
        if (e.eaten||!e.mesh?.visible||e.radius>vs.r*0.92) continue;
        const dx=e.mesh.position.x-vs.x, dz=e.mesh.position.z-vs.z, d=dx*dx+dz*dz;
        if(d<bd){bd=d;best={dx,dz};}
      }
      if(best){const m=Math.hypot(best.dx,best.dz)||1;
        dispatchEvent(new PointerEvent('pointermove',{pointerId:1,
          clientX:cx+best.dx/m*110, clientY:cy+best.dz/m*110, bubbles:true}));}
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await p.waitForFunction(() => document.getElementById('end')?.classList.contains('show'), null, { timeout:1200000 });
  const F = await p.evaluate(() => window.__gf);
  await p.close();

  // ── analysis ────────────────────────────────────────────────────────────
  let frames=0, ateFrames=0, growOnAte=0, shrinkFrames=0, shrinkTotal=0, biggestShrink=0, biggestShrinkT=0;
  let ateNoGrow=0, growSum=0;
  const perEatGrowth=[];
  for (let i=1;i<F.length;i++){
    const a=F[i-1], c=F[i];
    if (c.t < a.t) continue;
    frames++;
    const dr = c.r - a.r;
    const eaten = a.a - c.a;
    if (dr < -1e-4){ shrinkFrames++; shrinkTotal += -dr; if(-dr>biggestShrink){biggestShrink=-dr;biggestShrinkT=c.t;} }
    if (eaten > 0){ ateFrames++; if (dr > 1e-4) growOnAte++; else ateNoGrow++; perEatGrowth.push(dr/eaten); }
    if (dr>0) growSum += dr;
  }
  perEatGrowth.sort((x,y)=>x-y);
  console.log(`\n══ ${wid.toUpperCase()} — PER-FRAME GROWTH ══  ${frames} frames, ${F.at(-1).t.toFixed(0)}s`);
  console.log(`  frames where a prop was eaten:        ${ateFrames}`);
  console.log(`  ...of those, radius went UP:          ${growOnAte}  (${(100*growOnAte/(ateFrames||1)).toFixed(1)}%)`);
  console.log(`  ...of those, radius flat or DOWN:     ${ateNoGrow}  (${(100*ateNoGrow/(ateFrames||1)).toFixed(1)}%)`);
  console.log(`  frames where radius DECREASED:        ${shrinkFrames}  (${(100*shrinkFrames/frames).toFixed(1)}% of all frames)`);
  console.log(`  total radius lost to shrink:          ${shrinkTotal.toFixed(2)}u   (total gained ${growSum.toFixed(2)}u)`);
  console.log(`  biggest single-frame shrink:          ${biggestShrink.toFixed(3)}u at t=${biggestShrinkT.toFixed(1)}s`);
  console.log(`  median radius gained per prop eaten:  ${(perEatGrowth[Math.floor(perEatGrowth.length/2)]??0).toFixed(5)}u`);
  console.log(`  p90 radius gained per prop eaten:     ${(perEatGrowth[Math.floor(perEatGrowth.length*0.9)]??0).toFixed(5)}u`);
  // per-second growth vs law rate
  console.log(`\n  radius by 10s (and gain in that decade)`);
  let pr=null;
  for (let t=0;t<=180;t+=10){
    const s=F.reduce((a,c)=>Math.abs(c.t-t)<Math.abs(a.t-t)?c:a,F[0]);
    console.log(`   ${String(t).padStart(4)}s  r=${s.r.toFixed(3)}  +${pr===null?'—':(s.r-pr).toFixed(3)}`);
    pr=s.r;
  }
}
await b.close();
