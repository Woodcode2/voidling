// SCRATCH — HOW MUCH OF THE ORB DOES A COIN SKIN'S AI TEXTURE OWN?
//
//   node qa/_texshare.mjs [r] [port]
//
// The five coin skins (Toxic..Honey) each carry `tex`, and void3d sets
// uTexAmt to 1 the moment it loads (void3d.ts:1091). In the fragment shader
// that is `col = mix(col, tc * (0.34 + 0.9*u), uTexAmt)` — at 1.0 it DISCARDS
// the uInner/uMid ramp and the uRim lip that were just retuned this session.
//
// The CDN that serves those textures is unreachable from the QA sandbox, so
// the real art cannot be photographed here. What CAN be measured, and is the
// decision-useful number, is the shader's SHARE: feed uTex a synthetic
// high-contrast image and count how many orb pixels the texture path is
// allowed to move. That is the ceiling on "does the texture read at gameplay
// distance", and the floor on "how much of the tuned void palette survives".
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const R = Number(process.argv[2] || 3.6);
const PORT = process.argv[3] || '4177';
const OUT = 'qa-out/texshare';
fs.mkdirSync(OUT, { recursive: true });
const log = (s) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
p.setDefaultTimeout(900000);
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !!window.__voidState);
await p.click('#btnPlay'); await p.waitForTimeout(1600);
await p.click('#worldRow .wCard[data-world="maple"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { polling: 500 });
log('match running');
await p.addStyleTag({ content: 'body > *:not(canvas):not(script) { visibility: hidden !important; }' });
await p.evaluate(() => { setInterval(() => window.__rushClock && window.__rushClock(-40), 3000); });
const HOME = await p.evaluate(() => window.__spawn());
await p.evaluate((r) => window.__setVoidR(r), R);
const settle = async () => {
  await p.evaluate((h) => window.__warpVoid(h.x, h.z), HOME);
  await p.waitForFunction(() => {
    const s = window.__voidState(), c = window.__cam;
    const d = Math.hypot(c.position.x - s.x, c.position.y, c.position.z - s.z);
    const want = Math.min(340, Math.max(26, 38 * Math.pow(s.r / 0.9, 0.82)));
    return Math.abs(d - want) / want < 0.006;
  }, null, { polling: 400 });
  await p.evaluate((h) => window.__warpVoid(h.x, h.z), HOME);
};
await settle(); await p.waitForTimeout(2500); await settle();
log('settled');

const g0 = await p.evaluate(() => {
  const T = window.__THREE, cam = window.__cam, s = window.__voidState();
  cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const c = new T.Vector3(s.x, s.r * 0.55, s.z).project(cam);
  const d = Math.hypot(cam.position.x - s.x, cam.position.y, cam.position.z - s.z);
  return { cx: (c.x * 0.5 + 0.5) * innerWidth, cy: (-c.y * 0.5 + 0.5) * innerHeight,
    rpx: (s.r / Math.sqrt(Math.max(1e-6, d * d - s.r * s.r))) / (2 * Math.tan(cam.fov * Math.PI / 360)) * innerHeight };
});
const BOX = Math.round(g0.rpx * 3.2);
const box = { x: Math.round(g0.cx - BOX / 2), y: Math.round(g0.cy - BOX * 0.62), w: BOX, h: BOX };
const K = 2, CX = BOX * K / 2, CY = BOX * K * 0.62, RR = g0.rpx * K;

async function capture(tag) {
  await p.waitForTimeout(400);
  const shot = (await p.screenshot()).toString('base64');
  const res = await p.evaluate(async ([s64, bx]) => {
    const im = await new Promise((r) => { const i = new Image(); i.onload = () => r(i);
      i.src = 'data:image/png;base64,' + s64; });
    const KK = im.width / innerWidth;
    const cv = document.createElement('canvas');
    cv.width = Math.round(bx.w * KK); cv.height = Math.round(bx.h * KK);
    const ctx = cv.getContext('2d');
    ctx.drawImage(im, Math.round(bx.x * KK), Math.round(bx.y * KK), cv.width, cv.height, 0, 0, cv.width, cv.height);
    return { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height,
      data: Array.from(ctx.getImageData(0, 0, cv.width, cv.height).data) };
  }, [shot, box]);
  fs.writeFileSync(path.join(OUT, tag + '.png'), Buffer.from(res.url.split(',')[1], 'base64'));
  return res;
}
const diff = (a, refs, thr = 36) => {
  const R2 = Array.isArray(refs) ? refs : [refs];
  let n = 0, tot = 0;
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
    if ((x - CX) ** 2 + (y - CY) ** 2 > (RR * 0.98) ** 2) continue;
    const i = (y * a.w + x) * 4; tot++;
    if (R2.every((bb) => Math.abs(a.data[i] - bb.data[i]) + Math.abs(a.data[i + 1] - bb.data[i + 1])
      + Math.abs(a.data[i + 2] - bb.data[i + 2]) > thr)) n++;
  }
  return +(n / tot * 100).toFixed(2);
};

// find the hero body material (96-segment sphere, per _skins.mjs) and give it
// a synthetic magenta/black checker so any texture influence is unmistakable
const install = await p.evaluate(() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const x = cv.getContext('2d');
  for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
    x.fillStyle = ((i + j) & 1) ? '#ff00c8' : '#003c14';
    x.fillRect(i * 16, j * 16, 16, 16);
  }
  const T = window.__THREE;
  const t = new T.CanvasTexture(cv);
  t.wrapS = T.RepeatWrapping; t.wrapT = T.ClampToEdgeWrapping; t.colorSpace = T.SRGBColorSpace;
  let m = null;
  window.__scene.traverse((o) => {
    const u = o.material?.uniforms;
    if (!m && u && u.uTexAmt && o.geometry?.parameters?.widthSegments === 96) m = o.material;
  });
  if (!m) return false;
  window.__texMat = m; window.__texTest = t;
  return true;
});
log('hero body material found: ' + install);

await p.evaluate(() => { window.__texMat.uniforms.uTexAmt.value = 0; });
const off1 = await capture('texamt-0-a');
const off2 = await capture('texamt-0-b');
for (const amt of [1, 0.55]) {
  await p.evaluate((a) => {
    window.__texMat.uniforms.uTex.value = window.__texTest;
    window.__texMat.uniforms.uTexAmt.value = a;
  }, amt);
  const on = await capture('texamt-' + amt);
  log(`uTexAmt=${amt}: ${diff(on, [off1, off2])}% of the orb disc moved`);
}
await p.evaluate(() => { window.__texMat.uniforms.uTexAmt.value = 0; });
log('done — crops in ' + OUT);
await b.close();
