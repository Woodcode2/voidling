import { chromium } from 'playwright';
import fs from 'fs';
const PORT = process.env.PORT || 4179;
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
  args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
for (const wid of (process.argv[2]||'pirate').split(',')) {
  const p = await b.newPage({ viewport:{width:393,height:852} });
  await p.route('**/functions/v1/ingest-events', r=>r.fulfill({status:200,body:'{}'}));
  await p.addInitScript(()=>{ try{ localStorage.setItem('voidPlayed','1');localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast',new Date().toDateString()); }catch{} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`,{waitUntil:'domcontentloaded',timeout:300000});
  await p.waitForFunction(()=>!!window.__voidState,null,{timeout:400000});
  await p.evaluate(()=>document.querySelectorAll('.show').forEach(e=>{if(['daily','gift'].includes(e.id))e.classList.remove('show');}));
  await p.click('#btnPlay',{timeout:120000}); await p.waitForTimeout(1500);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`,{timeout:120000});
  await p.waitForFunction(()=>(window.__matchState?.().t??0)>2.0,null,{timeout:400000});
  const c = await p.evaluate(() => {
    const sc=window.__scene; let fm=0,ft=0,sm=0,st=0,ov=0,ot=0,nv=0;
    sc.traverse(o=>{ if(!o.isMesh) return; const m=o.material; if(!m||Array.isArray(m)) return;
      const g=o.geometry, idx=g.index?g.index.count:(g.getAttribute('position')?.count??0);
      const tri=(idx/3)*(o.isInstancedMesh?o.count:1);
      const verts=(g.getAttribute('position')?.count??0)*(o.isInstancedMesh?1:1);
      if(g.getAttribute('normal')) nv+=verts;
      if(!m.vertexColors){ov++;ot+=tri;return;}
      if(m.flatShading){fm++;ft+=tri;} else {sm++;st+=tri;} });
    return { propFlatMeshes:fm, propFlatTri:ft, propSmoothMeshes:sm, propSmoothTri:st,
             otherMeshes:ov, otherTri:ot, vertsCarryingNormals:nv,
             normalBytesMB:+(nv*12/1048576).toFixed(1) };
  });
  console.log(wid, JSON.stringify(c));
  fs.writeFileSync(`/tmp/mat_${wid}.json`, JSON.stringify(c));
  await p.close();
}
await b.close();
