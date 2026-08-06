// AUDIT — DOES THE HUD DEMOTE THE CHILD?
// paintGrowth() labels the bar from stageFor(radius) live, while the evolve card
// uses curStage which never goes down. The growth-law clamp pulls radius back
// under a form threshold constantly. This reads the actual text in the bar,
// every frame, and counts how many times it goes BACKWARDS.
import { chromium } from 'playwright';
const WORLDS = (process.argv[2] || 'maple').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({status:200,body:'{}'}));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`, {waitUntil:'domcontentloaded',timeout:300000});
  await p.waitForFunction(() => !!window.__voidState, null, {timeout:400000});
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e=>{
    if(['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t??0)>0.2, null, {timeout:400000});
  await p.evaluate(() => { window.__renderer.render = () => {}; });
  await p.evaluate(() => {
    const FORMS=['VOIDLING','MUNCHER','GOBBLER','DEVOURER','COLOSSUS','WORLD ENDER'];
    const log=[]; window.__dm=log;
    const gNow=document.querySelector('#growth .gNow');
    const gFill=document.querySelector('#growth .gFill');
    let last=null, lastFill=null, fillBack=0, fillBackWorst=0;
    window.__fillBack=()=>({fillBack,fillBackWorst});
    const cv=document.querySelector('canvas'); const cx=innerWidth/2, cy=innerHeight/2;
    cv.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:cx,clientY:cy,bubbles:true}));
    const tick=()=>{
      const ms=window.__matchState?.(); const vs=window.__voidState();
      if(ms){
        const txt=(gNow?.textContent||'').trim();
        if(txt && txt!==last){ log.push({t:+ms.t.toFixed(2), from:last, to:txt,
          dir: last===null?0:(FORMS.indexOf(txt)-FORMS.indexOf(last)), r:+ms.r.toFixed(3)}); last=txt; }
        const w=parseFloat((gFill?.style.width||'0'));
        if(lastFill!==null && txt===last && w<lastFill-0.5){ fillBack++; fillBackWorst=Math.max(fillBackWorst,lastFill-w); }
        lastFill=w;
      }
      let best=null,bd=1e9;
      for(const e of window.__edibles){ if(e.eaten||!e.mesh?.visible||e.radius>vs.r*0.92) continue;
        const dx=e.mesh.position.x-vs.x, dz=e.mesh.position.z-vs.z, d=dx*dx+dz*dz; if(d<bd){bd=d;best={dx,dz};} }
      if(best){const m=Math.hypot(best.dx,best.dz)||1;
        dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:cx+best.dx/m*110,clientY:cy+best.dz/m*110,bubbles:true}));}
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await p.waitForFunction(()=>document.getElementById('end')?.classList.contains('show'),null,{timeout:1200000});
  const {log, fb} = await p.evaluate(()=>({log:window.__dm, fb:window.__fillBack()}));
  await p.close();
  const back = log.filter(x=>x.dir<0);
  console.log(`\n══ ${wid.toUpperCase()} — HUD FORM LABEL ══`);
  console.log(`  total label changes: ${log.length}`);
  console.log(`  BACKWARDS (demotions the child reads on the HUD): ${back.length}`);
  console.log(`  growth-bar fill went backwards on ${fb.fillBack} frames, worst ${fb.fillBackWorst.toFixed(1)}% of the bar`);
  for(const x of log) console.log(`   ${String(x.t.toFixed(1)).padStart(6)}s  ${String(x.from).padEnd(12)} -> ${x.to.padEnd(12)} ${x.dir<0?'  <<< DEMOTED':''}  r=${x.r}`);
}
await b.close();
