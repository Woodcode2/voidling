// SCRATCH — the skins, as a SET, at gameplay size.
//
//   node qa/_skinset.mjs [r] [port]
//
// One page load, one pinned camera, every skin photographed from the same
// vantage point. Then, for each LEGENDARY, the same shot with ONE premium
// feature at a time, diffed against that skin's plain-colour version — so
// "does the horn/pattern/aura actually show at gameplay distance" is answered
// in pixels.
//
// Differences from qa/_skins.mjs (which hangs on the current menu flow):
//  - logs every step, so a stall is visible
//  - drives the menu defensively and reports what it clicked
//  - freezes the hero (no eating) instead of re-warping between every shot
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

// R DEFAULTS LOW ON PURPOSE. camDist eases toward 38·(r/0.9)^0.82 at 1.6 units
// per SIM second, and the software renderer runs at ~0.55 fps with dt capped
// at 0.05 — i.e. 0.028x real time — so pinning r=3.6 asks the dolly to travel
// 80 units, which is 51 sim-seconds, which is half an hour of wall clock.
// It also does not matter: the void's APPARENT size goes as r / r^0.82 =
// r^0.18, so between VOIDLING (0.9) and WORLD ENDER (8.0) the hero changes by
// only 8^0.18/0.9^0.18 = 1.46x on screen. One vantage point covers the match.
const R = Number(process.argv[2] || 1.2);
const PORT = process.argv[3] || '4177';
const OUT = 'qa-out/skinset';
fs.mkdirSync(OUT, { recursive: true });
const log = (s) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);

const src = fs.readFileSync('src/proto3d/palette.ts', 'utf8');
const lit = src.slice(src.indexOf('export const SKINS: Skin[] = [') + 'export const SKINS: Skin[] = '.length);
const SKINS = eval(lit.slice(0, lit.indexOf('\n];') + 2));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
p.setDefaultTimeout(600000);
p.on('pageerror', (e) => log(`PAGEERROR ${e.message}`));
await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try {
  localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !!window.__voidState);
log('boot ok');
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift', 'book'].includes(e.id)) e.classList.remove('show'); }));
log('overlays: ' + await p.evaluate(() =>
  [...document.querySelectorAll('.show')].map(e => e.id || e.className).join(',')));
await p.click('#btnPlay');
await p.waitForTimeout(2000);
log('after PLAY, visible overlays: ' + await p.evaluate(() =>
  [...document.querySelectorAll('.show')].map(e => e.id || e.className).join(',')));
const hasCard = await p.evaluate(() => !!document.querySelector('#worldRow .wCard[data-world="maple"]'));
log('maple card present: ' + hasCard);
if (hasCard) await p.click('#worldRow .wCard[data-world="maple"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 4, null, { polling: 500 });
log('match running');

await p.addStyleTag({ content: 'body > *:not(canvas):not(script) { visibility: hidden !important; }' });
await p.evaluate(() => { setInterval(() => window.__rushClock && window.__rushClock(-40), 3000); });
const HOME = await p.evaluate(() => window.__spawn());
await p.evaluate((r) => window.__setVoidR(r), R);
log(`hero pinned at r=${R}`);

// re-pin the radius every time: the hero keeps eating, and a drifting r moves
// the dolly target, which would change the framing between two shots that are
// meant to differ only by a skin.
const settle = async () => {
  await p.evaluate((r) => { window.__setVoidR(r); }, R);
  await p.evaluate((h) => window.__warpVoid(h.x, h.z), HOME);
  await p.waitForFunction(() => {
    const s = window.__voidState(), c = window.__cam;
    const d = Math.hypot(c.position.x - s.x, c.position.y, c.position.z - s.z);
    const want = Math.min(340, Math.max(26, 38 * Math.pow(s.r / 0.9, 0.82)));
    return Math.abs(d - want) / want < 0.01;
  }, null, { polling: 400, timeout: 600000 });
  await p.evaluate((h) => window.__warpVoid(h.x, h.z), HOME);
};
await settle();
await p.waitForTimeout(3000);
await settle();
log('camera settled');

const geom = async () => p.evaluate(() => {
  const T = window.__THREE, cam = window.__cam, s = window.__voidState();
  cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const c = new T.Vector3(s.x, s.r * 0.55, s.z).project(cam);
  const cx = (c.x * 0.5 + 0.5) * innerWidth, cy = (-c.y * 0.5 + 0.5) * innerHeight;
  const d = Math.hypot(cam.position.x - s.x, cam.position.y, cam.position.z - s.z);
  const sil = (s.r / Math.sqrt(Math.max(1e-6, d * d - s.r * s.r)))
    / (2 * Math.tan(cam.fov * Math.PI / 360)) * innerHeight;
  return { cx, cy, rpx: sil, r: s.r, camD: d, fov: cam.fov };
});
const g0 = await geom();
log(`r=${g0.r.toFixed(2)} camD=${g0.camD.toFixed(0)} -> void is ${(g0.rpx * 2).toFixed(0)} CSS px across` +
  ` (${(g0.rpx * 2 / 430 * 100).toFixed(1)}% of a 430px phone)`);

const BOX = Math.round(g0.rpx * 3.2);
const box = { x: Math.round(g0.cx - BOX / 2), y: Math.round(g0.cy - BOX * 0.62), w: BOX, h: BOX };

async function capture(tag) {
  await p.waitForTimeout(400);
  const shot = (await p.screenshot()).toString('base64');
  const res = await p.evaluate(async ([s64, bx]) => {
    const im = await new Promise((r) => { const i = new Image(); i.onload = () => r(i);
      i.src = 'data:image/png;base64,' + s64; });
    const K = im.width / innerWidth;
    const cv = document.createElement('canvas');
    cv.width = Math.round(bx.w * K); cv.height = Math.round(bx.h * K);
    const ctx = cv.getContext('2d');
    ctx.drawImage(im, Math.round(bx.x * K), Math.round(bx.y * K), cv.width, cv.height, 0, 0, cv.width, cv.height);
    return { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height,
      data: Array.from(ctx.getImageData(0, 0, cv.width, cv.height).data) };
  }, [shot, box]);
  fs.writeFileSync(path.join(OUT, tag + '.png'), Buffer.from(res.url.split(',')[1], 'base64'));
  return res;
}

const K = 2;
const CX = BOX * K / 2, CY = BOX * K * 0.62, RR = g0.rpx * K;
const inOrb = (x, y, k) => (x - CX) ** 2 + (y - CY) ** 2 <= (RR * k) ** 2;
const changed = (a, i) => (bb) =>
  Math.abs(a.data[i] - bb.data[i]) + Math.abs(a.data[i + 1] - bb.data[i + 1])
  + Math.abs(a.data[i + 2] - bb.data[i + 2]) > 36;
const diff = (a, refs, k = 1.55) => {
  const R2 = Array.isArray(refs) ? refs : [refs];
  let n = 0, tot = 0;
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
    if (!inOrb(x, y, k)) continue;
    const i = (y * a.w + x) * 4; tot++;
    if (R2.every(changed(a, i))) n++;
  }
  return +(n / tot * 100).toFixed(2);
};
const bodyStats = (a) => {
  const L = [], S = [];
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
    if (!inOrb(x, y, 0.88)) continue;
    const i = (y * a.w + x) * 4;
    const r = a.data[i] / 255, g = a.data[i + 1] / 255, bl = a.data[i + 2] / 255;
    L.push(0.2126 * r + 0.7152 * g + 0.0722 * bl);
    const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
    S.push(mx <= 0 ? 0 : (mx - mn) / mx);
  }
  L.sort((x, y) => x - y); S.sort((x, y) => x - y);
  const q = (arr, f) => arr[Math.min(arr.length - 1, (arr.length * f) | 0)];
  return { lo: +q(L, 0.05).toFixed(3), md: +q(L, 0.5).toFixed(3), hi: +q(L, 0.95).toFixed(3),
    range: +(q(L, 0.95) - q(L, 0.05)).toFixed(3), sat: +q(S, 0.5).toFixed(3) };
};
// SILHOUETTE: how far the orb's own pixels sit from the ground immediately
// around it. This is "can a child see their void on the grass".
const silCon = (a) => {
  const lum = (i) => 0.2126 * a.data[i] / 255 + 0.7152 * a.data[i + 1] / 255 + 0.0722 * a.data[i + 2] / 255;
  const inside = [], ring = [];
  for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
    const i = (y * a.w + x) * 4;
    const d2 = (x - CX) ** 2 + (y - CY) ** 2;
    if (d2 <= (RR * 0.80) ** 2) inside.push(lum(i));
    else if (d2 > (RR * 1.55) ** 2 && d2 <= (RR * 2.1) ** 2) ring.push(lum(i));
  }
  const med = (v) => { v.sort((x, y) => x - y); return v[v.length >> 1]; };
  const a1 = med(inside), b1 = med(ring);
  return { orb: +a1.toFixed(3), ground: +b1.toFixed(3),
    cr: +((Math.max(a1, b1) + 0.05) / (Math.min(a1, b1) + 0.05)).toFixed(2) };
};

const setSkin = async (s) => {
  await p.evaluate((sk) => window.__setSkin(sk), s);
  await p.evaluate((r) => { window.__setVoidR(r); }, R);
  await p.evaluate((h) => window.__warpVoid(h.x, h.z), HOME);
};

await setSkin(SKINS[0]);
const n1 = await capture('_noise-a');
const n2 = await capture('_noise-b');
const NOISE = diff(await capture('_noise-c'), [n1, n2]);
log(`noise floor: ${NOISE}%`);

const rows = [];
for (const s of SKINS) {
  await setSkin(s);
  const full = await capture(s.id);
  const row = { id: s.id, name: s.name, tier: s.cash ? 'LEGENDARY' : s.streak ? 'STREAK' : 'COIN',
    body: bodyStats(full), sil: silCon(full) };
  row.texAmt = await p.evaluate(() => {
    let v = null;
    window.__scene.traverse((o) => {
      const u = o.material?.uniforms;
      if (v === null && u && u.uTexAmt && o.geometry?.parameters?.widthSegments === 96) v = u.uTexAmt.value;
    });
    return v;
  });
  if (s.char || s.acc) {
    const bare = { ...s, char: undefined, acc: undefined };
    await setSkin(bare);
    const c1 = await capture(s.id + '-colouronly');
    const c2 = await capture(s.id + '-colouronly-b');
    const REF = [c1, c2];
    await setSkin(s);
    row.premium = diff(await capture(s.id + '-full-b'), REF);
    const one = async (patch, tag) => {
      await setSkin({ ...bare, ...patch });
      return diff(await capture(s.id + '-' + tag), REF);
    };
    row.acc = s.acc ? await one({ acc: s.acc }, 'acc') : 0;
    row.pat = s.char?.pattern ? await one({ char: { pattern: s.char.pattern, patCol: s.char.patCol } }, 'pat') : 0;
    row.aura = s.char?.aura ? await one({ char: { aura: s.char.aura, auraKind: s.char.auraKind } }, 'aura') : 0;
    row.bodyG = s.char?.body ? await one({ char: { body: s.char.body } }, 'bodyg') : 0;
    row.eyes = s.char?.eyes ? await one({ char: { eyes: s.char.eyes } }, 'eyes') : 0;
    row.gloss = s.char?.gloss ? await one({ char: { gloss: s.char.gloss } }, 'gloss') : 0;
  }
  rows.push(row);
  const bs = row.body;
  log(`${s.name.padEnd(14)} ${row.tier.padEnd(10)} texAmt=${row.texAmt}` +
    ` body L ${bs.lo}-${bs.hi} (range ${bs.range} sat ${bs.sat}) silCR ${row.sil.cr}` +
    (row.premium !== undefined
      ? ` | PREMIUM ${row.premium}% [acc ${row.acc} pat ${row.pat} aura ${row.aura} body ${row.bodyG} eyes ${row.eyes} gloss ${row.gloss}]`
      : ''));
  fs.writeFileSync(path.join(OUT, 'skinset.json'),
    JSON.stringify({ r: g0.r, rpxCss: g0.rpx, camD: g0.camD, noise: NOISE, rows }, null, 2));
}
log(`crops in ${OUT}/ — orb radius ${RR.toFixed(0)}px in a ${n1.w}px crop`);
await b.close();
