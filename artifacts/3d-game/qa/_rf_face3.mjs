// FORCED-ENCOUNTER version: warp the player onto CHOMPZILLA during the hunt
// window and photograph her face at the exact camera a child plays with, plus
// a 4x crop of her head so the mouth can be judged, not guessed.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
fs.mkdirSync('qa-out/rf-face3', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private */ } });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1500);
await p.click(`#worldRow .wCard[data-world="${WORLD}"]`);
// everyone joined, hunt window open (ends at 0.55*180 = 99s)
await p.waitForFunction(() => {
  const m = window.__matchState?.(); if (!m) return false;
  return m.t > 16 && m.rivals.some((r) => r.name === 'CHOMPZILLA' && r.joined);
}, null, { timeout: 2400000 });

await p.evaluate(() => { window.__setVoidR(2.4); });

const grab = async (tag) => {
  // sit on top of her, let the camera settle against SIM time not wall time
  const t0 = await p.evaluate(() => window.__matchState().t);
  while (true) {
    const st = await p.evaluate(() => {
      const m = window.__matchState();
      const z = m.rivals.find((r) => r.name === 'CHOMPZILLA');
      if (z) window.__warpVoid(z.x - 14, z.z - 14);
      return { t: m.t, z: z && { r: +z.r.toFixed(2), hunt: z.hunt } };
    });
    if (st.t - t0 > 3) break;
    await p.waitForTimeout(60);
  }
  const info = await p.evaluate(() => {
    const THREE = window.__THREE, cam = window.__cam, m = window.__matchState();
    const z = m.rivals.find((r) => r.name === 'CHOMPZILLA');
    let rig = null;
    window.__scene.traverse((o) => {
      const g = o.geometry && o.geometry.parameters;
      if (!g || !o.isMesh) return;
      if (Math.abs(g.radius - 0.095) < 1e-6 && g.segments === 24
          && Math.abs((g.thetaLength ?? 0) - Math.PI) < 1e-6) {
        const wp = new THREE.Vector3(); o.getWorldPosition(wp);
        if (Math.hypot(wp.x - z.x, wp.z - z.z) < 4) rig = o;
      }
    });
    if (!rig) return { err: 'no rig' };
    const wp = new THREE.Vector3(), sc = new THREE.Vector3();
    rig.getWorldPosition(wp); rig.getWorldScale(sc);
    const H = window.innerHeight * (window.devicePixelRatio || 1);
    const W = window.innerWidth * (window.devicePixelRatio || 1);
    const camD = cam.position.distanceTo(wp);
    const perUnit = H / (2 * camD * Math.tan((cam.fov ?? 32) * Math.PI / 360));
    const ndc = wp.clone().project(cam);
    return { t: +m.t.toFixed(1), pr: +m.r.toFixed(2), zr: +z.r.toFixed(2), hunt: z.hunt,
      camD: +camD.toFixed(1),
      smilePxDevice: +(2 * 0.095 * sc.x * perUnit).toFixed(1),
      smilePxCSS: +(2 * 0.095 * sc.x * perUnit / (window.devicePixelRatio || 1)).toFixed(1),
      smileScaleY: rig.scale.y,
      headPx: [Math.round((ndc.x * 0.5 + 0.5) * W), Math.round((-ndc.y * 0.5 + 0.5) * H)] };
  });
  console.log(tag, JSON.stringify(info));
  await p.addStyleTag({ content: '#news,#stageBar{opacity:0!important}' });
  await p.screenshot({ path: `qa-out/rf-face3/${WORLD}-${tag}.png` });
  if (info.headPx) {
    const [cx, cy] = info.headPx;
    const s = 160;
    await p.screenshot({ path: `qa-out/rf-face3/${WORLD}-${tag}-crop.png`,
      clip: { x: Math.max(0, cx / 3 - s / 2), y: Math.max(0, cy / 3 - s / 2), width: s, height: s } });
  }
  return info;
};

await grab('hunting');
// …and again after she is STUFFED (hunt window closed) — same face?
await p.evaluate(() => window.__rushClock(120));
await p.waitForTimeout(2000);
await grab('stuffed');
await b.close();
