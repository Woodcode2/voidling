// REFUTE PASS on "WORLD ENDER costs 4,719 draw calls".
// Anatomy of the r=12 frame: how much of the bill is the shadow pass, how much
// the ±220 shadow box specifically, and what the adaptive quality ladder is
// doing while it happens.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const WORLDS = (process.argv[2] || 'gameday,lantern').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.setItem('voidPlayed','1');
    localStorage.setItem('voidTut','1'); localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil:'domcontentloaded', timeout:300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout:400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach(e => { if (['daily','gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1400);
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { timeout:600000 });

  const r = await p.evaluate(async () => {
    const R = window.__renderer, S = window.__scene;
    let sun = null; S.traverse(o => { if (o.isDirectionalLight && o.castShadow) sun = o; });
    const settle = async n => { for (let i=0;i<n;i++) await new Promise(x=>requestAnimationFrame(x)); };
    const samp = async () => { const s=[]; for (let i=0;i<5;i++){ await new Promise(x=>requestAnimationFrame(x));
      s.push([R.info.render.calls, R.info.render.triangles]); }
      const avg = j => Math.round(s.reduce((a,x)=>a+x[j],0)/s.length); return [avg(0), avg(1)]; };

    window.__setVoidR(12);
    await settle(40);
    const box0 = sun ? Math.round(sun.shadow.camera.right) : -1;
    const on = await samp();
    const camY = Math.round(window.__cam.position.y);
    const edibles0 = window.__edibles.length;
    const alive0 = window.__edibles.filter(e => !e.eaten && e.mesh.parent).length;

    // (a) shadow pass off entirely, same camera
    const prev = R.shadowMap.enabled;
    R.shadowMap.enabled = false; if (sun) sun.castShadow = false;
    S.traverse(o => { const m = o.material; if (m) (Array.isArray(m)?m:[m]).forEach(mm=>{mm.needsUpdate=true;}); });
    await settle(8);
    const off = await samp();

    // (b) shadows back on but the box capped at 120 (the finding's proposed fix)
    R.shadowMap.enabled = prev; if (sun) sun.castShadow = prev;
    S.traverse(o => { const m = o.material; if (m) (Array.isArray(m)?m:[m]).forEach(mm=>{mm.needsUpdate=true;}); });
    await settle(8);
    if (sun) { const c = sun.shadow.camera; c.left=-120;c.right=120;c.top=120;c.bottom=-120; c.updateProjectionMatrix(); }
    await settle(8);
    const box120 = await samp();
    const boxNow = sun ? Math.round(sun.shadow.camera.right) : -1;

    return { camY, box0, boxNow, edibles0, alive0, on, off, box120,
      shadowsEnabled: prev, pr: R.getPixelRatio(), mapSize: sun ? sun.shadow.mapSize.x : -1 };
  });
  console.log(`\n===== ${wid.toUpperCase()} r=12 camY ${r.camY} =====`);
  console.log(`edibles array ${r.edibles0}, still standing in scene ${r.alive0}; pixelRatio ${r.pr}; shadow map ${r.mapSize}; box ±${r.box0} -> ±${r.boxNow}`);
  console.log(`shadows ON,  box ±${r.box0}:  ${r.on[0]} calls  ${r.on[1]} tris`);
  console.log(`shadows OFF          :  ${r.off[0]} calls  ${r.off[1]} tris   (shadow pass = ${r.on[0]-r.off[0]} calls, ${(100*(r.on[0]-r.off[0])/r.on[0]).toFixed(0)}%)`);
  console.log(`shadows ON,  box ±120:  ${r.box120[0]} calls  ${r.box120[1]} tris   (saves ${r.on[0]-r.box120[0]} calls vs ±${r.box0})`);
  await p.close();
}
await b.close();
