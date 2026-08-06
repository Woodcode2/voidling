// SCRATCH — ARE THE SKINS DIALED?
//
//   node qa/_skins.mjs [r] [port]
//
// Renders every skin on the HERO, in a live Maple Falls match, at a pinned
// radius and from a pinned vantage point, and answers three things with pixels
// rather than opinion:
//
//  1. how big the void actually is on a phone (px across) at that radius,
//  2. how much of each LEGENDARY's premium content is visible at that size —
//     measured by re-rendering the same skin with ONE feature at a time and
//     diffing against the same skin's plain colour version, and
//  3. what each coin skin's AI texture contributes (tex on vs tex off).
//
// The hero is warped back to the same point before every capture, so every
// frame in qa-out/skins/ is the same shot with a different skin in it.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const R = Number(process.argv[2] || 3.6);
const PORT = process.argv[3] || '4177';
const OUT = 'qa-out/skins';
fs.mkdirSync(OUT, { recursive: true });

// pull SKINS straight out of palette.ts so this can never drift from the game
const src = fs.readFileSync('src/proto3d/palette.ts', 'utf8');
const lit = src.slice(src.indexOf('export const SKINS: Skin[] = [') + 'export const SKINS: Skin[] = '.length);
const SKINS = eval(lit.slice(0, lit.indexOf('\n];') + 2));

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
await p.evaluate(() => document.querySelectorAll('.show').forEach(e => {
  if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
await p.click('#btnPlay'); await p.waitForTimeout(1400);
await p.click('#worldRow .wCard[data-world="maple"]');
await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 6);
// nothing but the game world in the crop — speech bubbles and the news ticker
// are DOM, and they land ON the hero
await p.addStyleTag({ content: 'body > *:not(canvas):not(script) { visibility: hidden !important; }' });
// the match clock must not run out mid-probe
await p.evaluate(() => { setInterval(() => window.__rushClock && window.__rushClock(150), 4000); });
const HOME = await p.evaluate(() => window.__spawn());
await p.evaluate((r) => window.__setVoidR(r), R);

// THE CAMERA IS THE MEASUREMENT. camDist eases toward 38·(r/0.9)^0.82 at
// 1.6/s; the first version of this probe called the shot "settled" after one
// stable poll and photographed the dolly still moving — two frames of the SAME
// skin differed across 90% of the orb. Wait for the analytic target.
const settle = async () => {
  await p.evaluate((h) => window.__warpVoid(h.x, h.z), HOME);
  await p.waitForFunction(() => {
    const s = window.__voidState(), c = window.__cam;
    const d = Math.hypot(c.position.x - s.x, c.position.y, c.position.z - s.z);
    const want = Math.min(340, Math.max(26, 38 * Math.pow(s.r / 0.9, 0.82)));
    return Math.abs(d - want) / want < 0.004;
  }, null, { polling: 300 });
  await p.evaluate((h) => window.__warpVoid(h.x, h.z), HOME);
};
await settle();
// let the hero clear whatever it can reach, so the background stops changing
await p.waitForTimeout(4000);
await settle();

const geom = async () => p.evaluate(() => {
  const T = window.__THREE, cam = window.__cam, s = window.__voidState();
  cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const c = new T.Vector3(s.x, s.r * 0.55, s.z).project(cam);
  const e = new T.Vector3(s.x, s.r * 0.55 + s.r, s.z).project(cam);
  const cx = (c.x * 0.5 + 0.5) * innerWidth, cy = (-c.y * 0.5 + 0.5) * innerHeight;
  const ey = (-e.y * 0.5 + 0.5) * innerHeight;
  // the SILHOUETTE radius of a sphere is analytic and does not care which way
  // the camera is tilted: tan(theta) = r / sqrt(d^2 - r^2)
  const d = Math.hypot(cam.position.x - s.x, cam.position.y, cam.position.z - s.z);
  const sil = (s.r / Math.sqrt(Math.max(1e-6, d * d - s.r * s.r)))
    / (2 * Math.tan(cam.fov * Math.PI / 360)) * innerHeight;
  return { cx, cy, rpx: sil, topPx: Math.abs(cy - ey), r: s.r, camD: d, fov: cam.fov };
});

const g0 = await geom();
console.log(`\n  MAPLE FALLS · hero pinned at r=${g0.r.toFixed(2)}, camera ${g0.camD.toFixed(0)}u back, fov ${g0.fov}`);
console.log(`  ON A 430x932 PHONE THE VOID IS ${(g0.rpx * 2).toFixed(0)} CSS px ACROSS` +
  ` — ${(g0.rpx * 2 / 430 * 100).toFixed(1)}% of screen width\n`);

const BOX = Math.round(g0.rpx * 3.2);
const box = { x: Math.round(g0.cx - BOX / 2), y: Math.round(g0.cy - BOX * 0.62), w: BOX, h: BOX };

async function capture(tag) {
  await p.waitForTimeout(450);
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

// diff restricted to the ORB REGION — a disc 1.55x the body radius, which
// contains the body, the crown/horn/mane and the near aura, and excludes
// scenery that a rival or a falling leaf may have changed between shots
const K = 2;
const CX = BOX * K / 2, CY = BOX * K * 0.62, RR = g0.rpx * K;
const inOrb = (x, y, k) => (x - CX) ** 2 + (y - CY) ** 2 <= (RR * k) ** 2;
// …and the body SHIMMERS: the interior galaxy twinkles, the horizon
// iridescence rotates, the idle bob breathes. A single-frame diff counts all
// of that as "premium content". A pixel only counts here if it differs from
// BOTH reference frames, which is a change that survived time.
const changed = (a, i) => (b) =>
  Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1])
  + Math.abs(a.data[i + 2] - b.data[i + 2]) > 36;
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
// how the BODY ITSELF reads: luminance spread and saturation inside the disc.
// A flat skin is one where the 5th and 95th percentile are close together.
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

const setSkin = async (s) => {
  await p.evaluate((sk) => window.__setSkin(sk), s);
  await settle();
};

await setSkin(SKINS[0]);
const n1 = await capture('_noise-a');
const n2 = await capture('_noise-b');
const n3 = await capture('_noise-c');
const NOISE = diff(n3, [n1, n2]);
console.log(`  noise floor (same skin, third frame vs the first two): ${NOISE}% of the orb region\n`);

const rows = [];
for (const s of SKINS) {
  await setSkin(s);
  const full = await capture(s.id);
  const row = { id: s.id, name: s.name, tier: s.cash ? 'LEGENDARY' : s.streak ? 'STREAK' : 'COIN',
    body: bodyStats(full) };
  row.texAmt = await p.evaluate(() => {
    let v = null;
    window.__scene.traverse((o) => {
      const u = o.material?.uniforms;
      if (v === null && u && u.uTexAmt && o.geometry?.parameters?.widthSegments === 96) v = u.uTexAmt.value;
    });
    return v;
  });
  if (s.tex) {
    const full2 = await capture(s.id + '-b');
    await setSkin({ ...s, tex: undefined });
    row.tex = diff(await capture(s.id + '-notex'), [full, full2]);
    await setSkin(s);
  }
  if (s.char || s.acc) {
    const bare = { ...s, char: undefined, acc: undefined };
    await setSkin(bare);
    const cBare = await capture(s.id + '-colouronly');
    const cBare2 = await capture(s.id + '-colouronly-b');
    const REF = [cBare, cBare2];
    row.premium = diff(full, REF);
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
  console.log(`  ${s.name.padEnd(14)} ${row.tier.padEnd(10)} texAmt=${row.texAmt}` +
    `  body L ${bs.lo}–${bs.hi} (range ${bs.range}, sat ${bs.sat})` +
    (row.tex !== undefined ? `  TEX ${row.tex}%` : '') +
    (row.premium !== undefined
      ? `  PREMIUM ${row.premium}%  [acc ${row.acc} · pat ${row.pat} · aura ${row.aura} · body ${row.bodyG} · eyes ${row.eyes} · gloss ${row.gloss}]`
      : ''));
}

fs.writeFileSync(path.join(OUT, 'skins.json'),
  JSON.stringify({ r: g0.r, rpxCss: g0.rpx, camD: g0.camD, noise: NOISE, rows }, null, 2));
console.log(`\n  crops in ${OUT}/ — ${n1.w}x${n1.h}, orb radius ${RR.toFixed(0)}px in-crop\n`);
await b.close();
