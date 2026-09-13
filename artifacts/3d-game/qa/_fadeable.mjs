// CAN THE THING IN FRONT OF THE HERO EVEN FADE?
//
// fadeOccluders (prototype3d.ts:1693) opens with `if (!m.visible || !e.fadeTo)
// continue;`. fadeTo is built at addEdible time by traversing for
// userData.fade !== undefined, and userData.fade is written by armFade(), which
// is called from exactly one place: mergedProp() in island.ts.
//
// GLB landmarks — the Powder lodge, the Lantern pagoda, Pirate's palms — are not
// built by mergedProp. They are loaded by GLTFLoader and handed to addEdible
// directly. If that reading is right they carry no fadeTo, so the fade mechanism
// SKIPS THEM ENTIRELY, and it was never going to clear them on the menu or in a
// match. This asks the live scene instead of trusting the reading.
//
//   node qa/_fadeable.mjs [port] [world]
import { chromium } from 'playwright';
const PORT = process.argv[2] || '4177';
const WORLDS = process.argv[3] ? [process.argv[3]] : ['maple', 'pirate', 'lantern', 'powder'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
try {
for (const w of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  p.on('pageerror', (e) => console.log(`  [pageerror ${w}] ` + e.message.split('\n')[0]));
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try { localStorage.clear();
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1'); localStorage.setItem('voidMute','1');
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
  await p.waitForTimeout(20000);
  const r = await p.evaluate(() => {
    const T = window.__THREE, cam = window.__cam, scene = window.__scene;
    const eds = window.__edibles, vg = window.__voidGroup();
    let bob = null;
    vg.traverse((o) => { const q = o.geometry && o.geometry.parameters;
      if (q && q.radius === 1 && q.widthSegments === 96 && q.heightSegments === 72) bob = o.parent; });
    bob.updateWorldMatrix(true, false);
    const ctr = new T.Vector3(), sc = new T.Vector3();
    bob.matrixWorld.decompose(ctr, new T.Quaternion(), sc);
    const camD = cam.position.distanceTo(ctr);
    const dir = new T.Vector3().subVectors(ctr, cam.position).multiplyScalar(1 / camD);
    // what the centre ray hits on the way to him
    const all = [];
    scene.traverse((o) => { if (!o.isMesh || !o.visible || !o.geometry || !o.material) return;
      let a = o, shown = true; while (a) { if (!a.visible) { shown = false; break; } a = a.parent; }
      if (shown && !vg.getObjectById(o.id)) all.push(o); });
    const rc = new T.Raycaster(cam.position.clone(), dir.clone(), 0.1, camD - 0.05);
    rc.layers.set(0);
    const hits = rc.intersectObjects(all, false);
    if (!hits.length) return { clear: true, edTotal: eds.length,
      edFadeable: eds.filter((e) => e.fadeTo).length };
    // find the edible that owns the hit mesh
    const hit = hits[0].object;
    let owner = null;
    for (const e of eds) { let found = false;
      e.mesh.traverse((o) => { if (o === hit) found = true; });
      if (found) { owner = e; break; } }
    return {
      clear: false,
      hitName: hit.name || hit.type,
      hitAt: +hits[0].distance.toFixed(1),
      inEdibles: !!owner,
      hasFadeTo: !!(owner && owner.fadeTo),
      fadeToLen: owner && owner.fadeTo ? owner.fadeTo.length : 0,
      hasUserDataFade: hit.userData.fade !== undefined,
      // WHAT IT IS FADED TO, RIGHT NOW. This is the number that decides the
      // argument: FO_FLOOR is 0.62, so the mechanism's BEST case leaves a prop
      // 62% solid. On a match that is fine — the camera moves, the occlusion
      // lasts a moment. On a PARKED menu camera it is a permanent 62%-solid
      // building across the hero's face.
      fadeNow: hit.userData.fade,
      // and every fadeTo part, since a GLB is many meshes and only some of them
      // may be armed
      parts: owner && owner.fadeTo ? owner.fadeTo.map((o) => o.userData.fade) : [],
      // WHICH OF fadeOccluders' OWN TESTS REJECTS IT. Recomputed here exactly as
      // prototype3d.ts:1676 does — from e.mesh.position, the camera and the hero
      // — so the answer is the function's own arithmetic and not a paraphrase.
      why: (() => {
        if (!owner) return 'not an edible';
        const vs2 = window.__voidState();
        const cam2 = cam.position;
        const hero = new T.Vector3(vs2.x, vg.position.y, vs2.z);
        const to = new T.Vector3().subVectors(hero, cam2);
        const c2h = to.length();
        const d2 = to.clone().multiplyScalar(1 / c2h);
        const m = owner.mesh;
        const px = m.position.x - cam2.x, py = m.position.y - cam2.y, pz = m.position.z - cam2.z;
        const t = px * d2.x + py * d2.y + pz * d2.z;
        const cx = px - d2.x * t, cy = py - d2.y * t, cz = pz - d2.z * t;
        const perp = Math.sqrt(cx * cx + cy * cy + cz * cz);
        const shield = vs2.r * 1.35 + 1.2;
        const reach = shield + er;
        const parts = [];
        if (owner.eaten) parts.push('eaten');
        if (!m.visible) parts.push('mesh not visible');
        if (!owner.fadeTo) parts.push('no fadeTo');
        // THE SHIPPED TEST, kept in step with prototype3d.ts. It used to read
        // `t <= 0 || t >= c2h` — the prop's CENTRE against the hero's centre —
        // and that is the bug this probe found. After the fix it allows the
        // prop's own radius at both ends, because its NEAR FACE is what occludes.
        // Left un-updated for one run, this probe printed "WHY IT IS NOT FADING"
        // about three props that had just started fading: a probe that
        // reimplements the code it audits has to be changed with it.
        const er = owner.radius || 1;
        if (t + er <= 0) parts.push(`t+r=${(t + er).toFixed(1)} <= 0 (wholly behind the lens)`);
        if (t - er >= c2h) parts.push(`near face t-r=${(t - er).toFixed(1)} >= camToHero ${c2h.toFixed(1)} (wholly past the hero)`);
        if (perp > reach) parts.push(`perp=${perp.toFixed(1)} > reach ${reach.toFixed(1)} (shield ${shield.toFixed(1)} + r ${er.toFixed(1)})`);
        return parts.length ? 'SKIPPED: ' + parts.join('; ') : `selected (t=${t.toFixed(1)}, near face ${(t - er).toFixed(1)} vs hero ${c2h.toFixed(1)}, perp=${perp.toFixed(1)} <= ${reach.toFixed(1)})`;
      })(),
      meshPos: owner ? `${owner.mesh.position.x.toFixed(1)},${owner.mesh.position.y.toFixed(1)},${owner.mesh.position.z.toFixed(1)}` : null,
      edRadius: owner ? owner.radius : null,
      edTotal: eds.length,
      edFadeable: eds.filter((e) => e.fadeTo).length,
    };
  });
  if (r.clear) console.log(`  ${w.padEnd(8)} nothing in the centre ray   (${r.edFadeable}/${r.edTotal} edibles can fade)`);
  else {
    console.log(`  ${w.padEnd(8)} blocked by "${r.hitName}" @${r.hitAt}  can fade: ${r.hasFadeTo ? 'yes' : 'NO'}  faded to: ${r.fadeNow}  edible r=${r.edRadius}  at ${r.meshPos}`);
    console.log(`           fadeOccluders says: ${r.why}`);
  }
  await p.close();
}
} finally { await b.close(); }
