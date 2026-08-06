// REFUTE part 2: in REAL play the joystick is anchored at the THUMB, not the void.
// The graphics-worlds probe pressed the finger at innerWidth/2, innerHeight/2 —
// which is exactly where the camera parks the void. Measure both.
import { chromium } from 'playwright';
const PORT = process.argv[3] || '4177';
const WORLD = process.argv[2] || 'maple';
const MODE = process.argv[4] || 'thumb';   // 'thumb' | 'centre'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:3 });
p.setDefaultTimeout(400000);
await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
  localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
await p.goto(`http://127.0.0.1:${PORT}/?w=${WORLD}`,{waitUntil:'domcontentloaded',timeout:300000});
await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>{if(['daily','gift'].includes(e.id))e.classList.remove('show');}));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(()=>(window.__matchState?.().t??0)>0.2,null,{timeout:400000});

await p.evaluate((mode)=>{
  window.__RR=window.__renderer.render.bind(window.__renderer);
  window.__stub=()=>{window.__renderer.render=()=>{}};
  window.__unstub=()=>{window.__renderer.render=window.__RR};
  const cv=document.querySelector('canvas');
  // THUMB: right-hand thumb rest on a 430x932 phone — ~72% down, ~72% across.
  // CENTRE: what _worldshots.mjs does.
  const cx = mode==='thumb' ? innerWidth*0.72 : innerWidth/2;
  const cy = mode==='thumb' ? innerHeight*0.78 : innerHeight/2;
  window.__anchor={cx,cy};
  cv.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:cx,clientY:cy,bubbles:true}));
  const tick=()=>{
    const vs=window.__voidState(); let best=null,bd=1e9;
    for(const e of window.__edibles){ if(e.eaten||!e.mesh?.visible||e.radius>vs.r*0.92)continue;
      const dx=e.mesh.position.x-vs.x,dz=e.mesh.position.z-vs.z,d=dx*dx+dz*dz; if(d<bd){bd=d;best={dx,dz};}}
    if(best){const m=Math.hypot(best.dx,best.dz)||1;
      dispatchEvent(new PointerEvent('pointermove',{pointerId:1,
        clientX:cx+best.dx/m*110, clientY:cy+best.dz/m*110, bubbles:true}));}
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.__probe=()=>{
    const THREE=window.__THREE,cam=window.__cam,vs=window.__voidState(),w=innerWidth,h=innerHeight;
    const pv=new THREE.Vector3(vs.x,0,vs.z).project(cam);
    const vx=(pv.x*0.5+0.5)*w, vy=(-pv.y*0.5+0.5)*h;
    const pe=new THREE.Vector3(vs.x+vs.r,0,vs.z).project(cam);
    const rpx=Math.abs((pe.x*0.5+0.5)*w-vx);
    const j=document.getElementById('joy'); const cs=getComputedStyle(j);
    const on = cs.display!=='none';
    const r=j.getBoundingClientRect();
    const jx=r.left+r.width/2, jy=r.top+r.height/2;
    return { t:+window.__matchState().t.toFixed(1), on, vx:+vx.toFixed(0), vy:+vy.toFixed(0), rpx:+rpx.toFixed(0),
      jx:+jx.toFixed(0), jy:+jy.toFixed(0), jr:+(r.width/2).toFixed(0),
      d:+Math.hypot(jx-vx,jy-vy).toFixed(0),
      // does the joystick RING annulus cross the void's disc?
      onVoid: on && Math.hypot(jx-vx,jy-vy) < (r.width/2 + rpx) };
  };
},MODE);

const log=[];
for(const m of [10,30,60,90,120,150,170]){
  await p.evaluate(()=>window.__stub());
  await p.waitForFunction(t=>(window.__matchState?.().t??0)>t,m,{timeout:900000});
  await p.evaluate(()=>window.__unstub());
  for(let i=0;i<12;i++){ log.push(await p.evaluate(()=>window.__probe())); await p.waitForTimeout(50); }
}
const on=log.filter(s=>s.on);
console.log(`WORLD=${WORLD} MODE=${MODE} samples=${log.length} joyVisible=${on.length}`);
console.log(`  joy centre -> void centre distance: min=${Math.min(...on.map(s=>s.d))} med=${on.map(s=>s.d).sort((a,b)=>a-b)[on.length>>1]} max=${Math.max(...on.map(s=>s.d))} CSS px`);
console.log(`  joy ring overlapping the void disc: ${on.filter(s=>s.onVoid).length}/${on.length}`);
console.log(`  void rpx: ${Math.min(...log.map(s=>s.rpx))}..${Math.max(...log.map(s=>s.rpx))}  joy r=${on[0]?.jr}`);
console.log(`  sample: ${JSON.stringify(log[40])}`);
await b.close();
