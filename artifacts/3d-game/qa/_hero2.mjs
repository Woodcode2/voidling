// THE HERO AND THE FAMILY, EVERYTHING IN ONE BOOT.
//
//   node qa/_hero2.mjs [world] [dpr]
//
// Measured on 2026-08-05: this harness runs at 0.020x real time (qa/_tick.mjs),
// so a 180s match is two and a half hours and any probe that WAITS on the match
// clock cannot finish. Everything here is driven with __setVoidR / __warpVoid
// instead, off a single boot, and nothing blocks on the clock past t>6.
//
// It answers four things:
//  1. PORTRAIT + THE NUMBERS. Shoots the hero at each form's radius and prints
//     the shader state that produced the frame — critically uSmall
//     (void3d.ts:1221), which re-widens the rim band the 0.86 stop narrowed
//     (void3d.ts:147). "The rim is 26% of the disc" is a claim about uSmall=0.
//  2. UNIFORMS, HERO vs FAMILY. rivals.ts:247 hands the family the hero's body
//     shader; rivals.ts:644-648 drives only two of its seven per-frame inputs.
//  3. SIDE BY SIDE. Hero warped next to the biggest rival AT THAT RIVAL'S
//     RADIUS, so anything that differs in the frame is a real difference.
//  4. OCCLUSION. A slab between camera and rival: the family's eyes, blush and
//     smile are built depthTest:false (rivals.ts:280-298), so this asks whether
//     a face paints through solid scenery.
import { chromium } from 'playwright';
import fs from 'node:fs';

const WORLD = process.argv[2] || 'maple';
const DPR = Number(process.argv[3] || 2);
const RS = process.argv.slice(4).map(Number).filter((n) => n > 0);
const radii = RS.length ? RS : [1.4, 3, 5, 8, 12];
fs.mkdirSync('qa-out/portrait', { recursive: true });
fs.mkdirSync('qa-out/family', { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: DPR });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
} catch { /* private mode */ } });
await p.goto(`http://127.0.0.1:4177/?w=${WORLD}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.querySelectorAll('.show')
  .forEach((e) => { if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
// NOT p.click(). Playwright's click waits for the element to be "stable",
// which means it waits on the page's own event loop — and at 0.020x real time
// that check exceeds the 30s action timeout before the game has drawn two
// frames. Every probe in the kit that clicks its way into a match inherits
// this and fails with a click timeout that looks like a missing selector.
const tap = async (sel) => {
  await p.waitForSelector(sel, { timeout: 300000 });
  await p.evaluate((s) => document.querySelector(s).click(), sel);
};
await tap('#btnPlay'); await p.waitForTimeout(2500);
await tap(`#worldRow .wCard[data-world="${WORLD}"]`);
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6, null, { timeout: 1800000 });
await p.addStyleTag({ content: '#news,#hud,#stageBar,.bub,#btnHome,#coins{opacity:0!important}' });

await p.evaluate(() => {
  window.__bodies = () => {
    const THREE = window.__THREE, cam = window.__cam, out = [];
    // CSS pixels, which is the unit void3d.ts:1219 measures uSmall in
    const H = window.innerHeight, k = 2 * Math.tan(cam.fov * Math.PI / 360);
    window.__scene.traverse((o) => {
      const m = o.material;
      if (!o.isMesh || !m || !m.uniforms || !m.uniforms.uAbyss) return;
      const wp = new THREE.Vector3(); o.getWorldPosition(wp);
      const sc = new THREE.Vector3(); o.getWorldScale(sc);
      const camD = Math.max(1, cam.position.distanceTo(wp));
      out.push({ hero: (o.geometry.parameters?.widthSegments ?? 0) >= 90,
        x: +wp.x.toFixed(1), z: +wp.z.toFixed(1),
        r: +sc.x.toFixed(2), camD: +camD.toFixed(1), pxR: +((H / (camD * k)) * sc.x).toFixed(1),
        uSmall: +m.uniforms.uSmall.value.toFixed(3), uStage: m.uniforms.uStage.value,
        uSlow: +m.uniforms.uSlow.value.toFixed(3),
        uStretch: +m.uniforms.uStretchAmt.value.toFixed(3) });
    });
    return out;
  };
});

console.log(`\n### ${WORLD} — HERO PORTRAIT, and the shader state behind it`);
for (const r of radii) {
  await p.evaluate((rr) => window.__setVoidR(rr), r);
  await p.waitForTimeout(3200);
  const h = (await p.evaluate(() => window.__bodies())).find((o) => o.hero);
  const stop = 0.86 + (0.50 - 0.86) * h.uSmall;
  // u in the shader is the NORMALISED DISC RADIUS, so the rim's share of the
  // visible disc is 1 - stop^2. That square is the whole argument.
  console.log(`r=${String(r).padStart(4)}  camD=${String(h.camD).padStart(5)}  pxR=${String(h.pxR).padStart(5)}css  uSmall=${String(h.uSmall).padStart(5)}  uStage=${h.uStage}  uSlow=${h.uSlow}  ->  rim stop ${stop.toFixed(3)}, rim = ${((1 - stop * stop) * 100).toFixed(0)}% of disc AREA`);
  const S = 620;
  await p.screenshot({ path: `qa-out/portrait/${WORLD}-r${r}.png`,
    clip: { x: (430 - S / 3) / 2, y: 932 / 2 - S / 6 - 40, width: S / 3, height: S / 3 } });
}

console.log(`\n### ${WORLD} — every void in the scene`);
for (const o of await p.evaluate(() => window.__bodies())) {
  console.log(`${o.hero ? 'HERO ' : 'rival'} r=${String(o.r).padStart(6)} camD=${String(o.camD).padStart(6)} pxR=${String(o.pxR).padStart(6)}  uSmall=${o.uSmall} uStage=${o.uStage} uSlow=${o.uSlow} uStretch=${o.uStretch}`);
}

// ── SIDE BY SIDE ────────────────────────────────────────────────────────────
const pos = await p.evaluate(() => {
  const bs = window.__bodies().filter((o) => !o.hero).sort((a, c) => c.r - a.r);
  const t = bs[0];
  window.__setVoidR(t.r);
  window.__warpVoid(t.x - t.r * 3.6, t.z);
  return t;
});
await p.waitForTimeout(4000);
await p.screenshot({ path: `qa-out/family/${WORLD}-pair.png` });
console.log(`\nqa-out/family/${WORLD}-pair.png — hero (left) vs ${'rival'} r=${pos.r} (right), same radius, same light`);

// ── OCCLUSION ───────────────────────────────────────────────────────────────
await p.evaluate(() => {
  const THREE = window.__THREE, cam = window.__cam;
  const t = window.__bodies().filter((o) => !o.hero).sort((a, c) => c.r - a.r)[0];
  const wp = new THREE.Vector3(t.x, t.r, t.z);
  const box = new THREE.Mesh(new THREE.BoxGeometry(60, 60, 60),
    new THREE.MeshBasicMaterial({ color: 0x00cc22 }));
  box.position.copy(wp.clone().lerp(cam.position, 0.30));
  window.__scene.add(box);
});
await p.waitForTimeout(3000);
await p.screenshot({ path: `qa-out/family/${WORLD}-occlude.png` });
console.log(`qa-out/family/${WORLD}-occlude.png — anything drawn ON the green slab is drawing through solid geometry`);
await b.close();
