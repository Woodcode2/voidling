import { chromium } from 'playwright';
for (const w of ['maple','gameday']) {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--enable-precise-memory-info'] });
  const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
  await ctx.addInitScript(()=>{try{localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');}catch{}});
  const p = await ctx.newPage();
  await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
  await p.goto(`http://127.0.0.1:4177/?w=${w}`, {waitUntil:'commit'});
  await p.waitForFunction(()=>!!window.__scene, null, {timeout:400000});
  console.log(w, JSON.stringify(await p.evaluate(()=>{
    let v=0,tri=0,meshes=0; const seen=new Set();
    window.__scene.traverse(o=>{ const g=o.geometry; if(!g)return; meshes++; if(seen.has(g.uuid))return; seen.add(g.uuid);
      const pos=g.attributes&&g.attributes.position; if(pos)v+=pos.count; if(g.index)tri+=g.index.count/3; else if(pos)tri+=pos.count/3;});
    const m=performance.memory||{};
    return { uniqueGeoms:seen.size, meshes, verts:v, tris:Math.round(tri),
      jsHeapMB:Math.round((m.usedJSHeapSize||0)/1048576), renderInfo: window.__renderer && window.__renderer.info.memory };
  })));
  await b.close();
}
