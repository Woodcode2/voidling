// GEOMETRY / SILHOUETTE FIDELITY: measures triangles drawn vs screen coverage,
// per-mesh, in a live match. Answers "how many triangles for a 10px prop".
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4179;
const WORLDS = (process.argv[2] || 'maple,pirate,gameday,lantern,powder,skylark').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil:'domcontentloaded', timeout:300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout:400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e=>{ if(['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3.0, null, { timeout:400000 });
  // drive forward so the void grows and the camera settles out of the intro dive
  await p.evaluate(() => { const cv=document.querySelector('canvas');
    cv.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:innerWidth/2,clientY:innerHeight/2,bubbles:true}));
    cv.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:innerWidth/2+40,clientY:innerHeight/2-40,bubbles:true})); });
  await p.waitForFunction(() => window.__cam.position.length() < 70, null, { timeout:200000 });
  await p.waitForTimeout(6000);
  const out = await p.evaluate(() => {
    const T = window.__THREE, sc = window.__scene, cam = window.__cam, r = window.__renderer;
    if (!T || !sc || !cam) return { err:'no hooks', hooks:Object.keys(window).filter(k=>k.startsWith('__')) };
    cam.updateMatrixWorld(); sc.updateMatrixWorld(true);
    const proj = new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    const frustum = new T.Frustum().setFromProjectionMatrix(proj);
    const H = window.innerHeight * r.getPixelRatio();
    const fovR = cam.fov * Math.PI/180;
    const sph = new T.Sphere(); const buckets = {};
    let visTri = 0, visMesh = 0, totTri = 0, totMesh = 0, culled = 0;
    const rows = [];
    sc.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      const g = o.geometry;
      const idx = g.index ? g.index.count : (g.getAttribute('position')?.count ?? 0);
      const tri = (idx/3) * (o.isInstancedMesh ? o.count : 1);
      totTri += tri; totMesh++;
      if (!g.boundingSphere) g.computeBoundingSphere();
      if (!g.boundingSphere) return;
      sph.copy(g.boundingSphere).applyMatrix4(o.matrixWorld);
      if (o.frustumCulled !== false && !frustum.intersectsSphere(sph)) { culled++; return; }
      if (!o.visible) return; let par=o.parent, hid=false;
      while(par){ if(!par.visible){hid=true;break;} par=par.parent; }
      if (hid) return;
      visTri += tri; visMesh++;
      const d = cam.position.distanceTo(sph.center);
      // projected screen diameter in DEVICE px
      let rr = sph.radius;
      if (o.isInstancedMesh) { const bb=new T.Box3().setFromObject(o); rr = bb.getSize(new T.Vector3()).length()/2; }
      const px = d > rr ? (2*rr) / (2*d*Math.tan(fovR/2)) * H : H;
      const k = px<5?'<5px':px<10?'5-10px':px<20?'10-20px':px<40?'20-40px':px<80?'40-80px':px<200?'80-200px':'>200px';
      buckets[k] = buckets[k] || { n:0, tri:0 };
      buckets[k].n++; buckets[k].tri += tri;
      const gp = g.parameters ? JSON.stringify(g.parameters).slice(0,90) : (g.type||'');
      rows.push({ name:o.name||o.parent?.name||'?', type:g.type, params:gp, px:+px.toFixed(1), tri, d:+d.toFixed(1), mat:(o.material&&o.material.name)||(o.material&&o.material.type)||'' });
    });
    rows.sort((a,b)=>(b.tri/Math.max(1,b.px))-(a.tri/Math.max(1,a.px)));
    // triangles drawn by things SMALLER than N px
    const under = n => rows.filter(r=>r.px<n).reduce((s,r)=>s+r.tri,0);
    const underN = n => rows.filter(r=>r.px<n).length;
    const vs = window.__voidState();
    return { world:document.title, dpr:r.getPixelRatio(), H, camDist:+cam.position.length().toFixed(1),
      r:+vs.r.toFixed(2), totMesh, totTri, visMesh, visTri, culled, buckets,
      tinyTri:{ u5:under(5), u10:under(10), u20:under(20), u40:under(40) },
      tinyN:{ u5:underN(5), u10:underN(10), u20:underN(20), u40:underN(40) },
      worst: rows.slice(0,15), info: r.info ? { calls:r.info.render.calls, tris:r.info.render.triangles } : null };
  });
  const fs = await import('fs');
  fs.writeFileSync(`/tmp/sil_${wid}.json`, JSON.stringify(out));
  console.log(`${wid}: written`);
  await p.close();
}
await b.close();
