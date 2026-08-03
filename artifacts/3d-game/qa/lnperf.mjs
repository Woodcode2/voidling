// Draw calls, triangles and frame cost for LANTERN NIGHT against GAME DAY,
// which is the densest world that already ships. SwiftShader is ~1/9 real
// time so the FPS number is meaningless; the renderer's own info counters are
// not, and they are what a phone actually pays for.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
for (const wid of (process.argv[2] || 'gameday,lantern').split(',')) {
  const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:1 });
  await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
  await p.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast',new Date().toDateString());}catch{}});
  await p.goto(`http://127.0.0.1:4177/?w=${wid}`,{waitUntil:'domcontentloaded',timeout:300000});
  await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
  await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>{if(['daily','gift'].includes(e.id))e.classList.remove('show')}));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(()=>window.__matchState&&window.__matchState().t>3,null,{timeout:600000});
  const r = await p.evaluate(async () => {
    const R = window.__renderer;
    // let it settle, then sample the info counters over a second of frames
    await new Promise(r => setTimeout(r, 2500));
    const s = [];
    for (let i = 0; i < 8; i++) {
      await new Promise(r => requestAnimationFrame(r));
      s.push({ calls: R.info.render.calls, tris: R.info.render.triangles });
    }
    const avg = k => Math.round(s.reduce((a, x) => a + x[k], 0) / s.length);
    let meshes = 0; window.__scene.traverse(o => { if (o.isMesh) meshes++; });
    return { calls: avg('calls'), tris: avg('tris'), meshes,
      mem: R.info.memory, prog: R.info.programs?.length ?? 0 };
  });
  console.log(`${wid.padEnd(9)}  draw calls ${String(r.calls).padStart(5)}   triangles ${String(r.tris).padStart(8)}   meshes in scene ${String(r.meshes).padStart(5)}   geometries ${r.mem.geometries}  textures ${r.mem.textures}  programs ${r.prog}`);
  await p.close();
}
await b.close();
