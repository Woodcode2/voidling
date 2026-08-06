// Independent game-time samples: how often is chrome sitting on the void's face?
// Renderer stubbed so the sim runs at its proper rate; the DOM overlay layer is
// positioned by the game loop, not by render, so rects stay truthful.
import { chromium } from 'playwright';
const PORT=process.argv[3]||'4177', WORLD=process.argv[2]||'lantern';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const p=await b.newPage({viewport:{width:430,height:932},deviceScaleFactor:3});
p.setDefaultTimeout(400000);
await p.route('**/functions/v1/ingest-events',r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>{if(['daily','gift'].includes(e.id))e.classList.remove('show');}));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});
await p.evaluate(()=>{
  // keyboard steering, no synthetic finger
  const key=(ty,c)=>dispatchEvent(new KeyboardEvent(ty,{code:c,key:c,bubbles:true}));
  window.__held=new Set();
  const tick=()=>{ const vs=window.__voidState(); let best=null,bd=1e9;
    for(const e of window.__edibles){if(e.eaten||!e.mesh?.visible||e.radius>vs.r*0.92)continue;
      const dx=e.mesh.position.x-vs.x,dz=e.mesh.position.z-vs.z,d=dx*dx+dz*dz;if(d<bd){bd=d;best={dx,dz};}}
    const want=new Set(); if(best){if(best.dz<-1)want.add('KeyW');if(best.dz>1)want.add('KeyS');
      if(best.dx<-1)want.add('KeyA');if(best.dx>1)want.add('KeyD');}
    for(const c of ['KeyW','KeyA','KeyS','KeyD']){const on=window.__held.has(c);
      if(want.has(c)&&!on){key('keydown',c);window.__held.add(c);}
      if(!want.has(c)&&on){key('keyup',c);window.__held.delete(c);}}
    requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  window.__renderer.render=()=>{};   // sim at proper rate
  window.__cov=()=>{
    const THREE=window.__THREE,cam=window.__cam,vs=window.__voidState(),w=innerWidth,h=innerHeight;
    const pv=new THREE.Vector3(vs.x,0,vs.z).project(cam);
    const cx=(pv.x*0.5+0.5)*w, cy=(-pv.y*0.5+0.5)*h;
    const pe=new THREE.Vector3(vs.x+vs.r,0,vs.z).project(cam);
    const rpx=Math.abs((pe.x*0.5+0.5)*w-cx), fr=rpx*0.72;
    const cov=r=>{const ox=Math.max(0,Math.min(cx+fr,r.right)-Math.max(cx-fr,r.left));
      const oy=Math.max(0,Math.min(cy+fr,r.bottom)-Math.max(cy-fr,r.top));
      return ox*oy/(Math.PI*fr*fr||1);};
    const vis=el=>{const cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity)>0.15;};
    let bub=0,flt=0;
    for(const el of document.querySelectorAll('.vb')) if(vis(el)&&el.textContent) bub=Math.max(bub,cov(el.getBoundingClientRect()));
    for(const el of document.querySelectorAll('.vf.go')) if(vis(el)&&el.textContent) flt=Math.max(flt,cov(el.getBoundingClientRect()));
    return {t:+window.__matchState().t.toFixed(1),bub:+bub.toFixed(3),flt:+flt.toFixed(3)};
  };
});
const log=[];
for(let t=6;t<176;t+=1.6){
  await p.waitForFunction(x=>(window.__matchState?.().t??0)>x,t,{timeout:900000});
  log.push(await p.evaluate(()=>window.__cov()));
}
const n=log.length;
const pct=(f)=>`${(100*log.filter(f).length/n).toFixed(1)}%`;
console.log(`WORLD=${WORLD} independent game-time samples=${n} (every 1.6 game-s across the match)`);
console.log(`  a BUBBLE on the face >10%: ${pct(s=>s.bub>0.10)}   >25%: ${pct(s=>s.bub>0.25)}   >50%: ${pct(s=>s.bub>0.50)}`);
console.log(`  a FLOATER on the face >10%: ${pct(s=>s.flt>0.10)}  >25%: ${pct(s=>s.flt>0.25)}  >50%: ${pct(s=>s.flt>0.50)}`);
console.log(`  face completely clear of both: ${pct(s=>s.bub<0.01&&s.flt<0.01)}`);
await b.close();
