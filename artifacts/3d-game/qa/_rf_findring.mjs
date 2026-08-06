// REFUTE part 3: the "find circle" — when is it up, what colour, and is it
// actually off-centre from the body?
import { chromium } from 'playwright';
const PORT=process.argv[3]||'4177', WORLD=process.argv[2]||'maple';
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
  window.__RR=window.__renderer.render.bind(window.__renderer);
  window.__stub=()=>{window.__renderer.render=()=>{}};window.__unstub=()=>{window.__renderer.render=window.__RR};
  window.__fr=()=>{
    // the FIND ring is the only RingGeometry parented straight to the scene
    const rings=window.__scene.children.filter(o=>o.geometry?.type==='RingGeometry');
    const vs=window.__voidState();
    return rings.map(o=>({name:o.name||'(anon)',visible:o.visible,
      op:+(o.material.opacity??0).toFixed(3),
      col:'#'+o.material.color.getHexString(),
      dx:+(o.position.x-vs.x).toFixed(3), dz:+(o.position.z-vs.z).toFixed(3),
      scale:+o.scale.x.toFixed(2), r:+vs.r.toFixed(2)}));
  };
});
const rows=[];
for(const m of [1,4,8,12,16,19,22,30,60,120,170]){
  await p.evaluate(()=>window.__stub());
  await p.waitForFunction(t=>(window.__matchState?.().t??0)>t,m,{timeout:900000});
  await p.evaluate(()=>window.__unstub()); await p.waitForTimeout(80);
  const fr=await p.evaluate(()=>window.__fr());
  const t=await p.evaluate(()=>+window.__matchState().t.toFixed(1));
  rows.push({t,fr});
  console.log(`t=${String(t).padStart(5)}  ${JSON.stringify(fr)}`);
}
await b.close();
