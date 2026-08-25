// IS THE SKY ACTUALLY IN SPACE? — the sky census.
//
//   node qa/skypop.mjs [port] [worlds...]
//
// The owner: "The background of the space /galaxy - it's like this weird faded
// color. It should pop. It doesn't give me the illusion this is in space."
//
// "Faded" is a feeling, and a feeling cannot be fixed twice in a row without a
// number under it. Three numbers, then, measured off the shipped frame:
//
//   SAT    mean HSV saturation of the sky. A wash is desaturated; space is not.
//   RANGE  P95 minus P5 luminance across the sky. This is the one that matters
//          most and the one an intensity slider CANNOT fix — turning the whole
//          sky up moves the mean and leaves the range exactly where it was.
//          A flat fill has a range near zero however bright you make it.
//   DARK   share of sky below L=0.06. Space is mostly empty and mostly black;
//          a sky with no true darks reads as a painted ceiling, not a vacuum.
//
// ── THE SKY MASK IS MEASURED, NOT ASSUMED ────────────────────────────────
// It does not sample "the top of the frame" and hope. It renders the scene
// twice: once with the background keyed to magenta, to learn exactly which
// pixels are sky at this world's real camera, and once as shipped, to measure
// them. If the key render finds less than 4% of the frame is sky it throws,
// because a mask that small means the swap did not take and every number below
// would be measured on the island instead.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv.slice(3).length ? process.argv.slice(3)
  : ['maple', 'pirate', 'gameday', 'lantern', 'powder'];
// ── THERE ARE TWO SKIES, AND THE GAME PICKS ONE BY NETWORK TIMING ────────
// island.ts paints a canvas sky at bgI 1.0 and then swaps in a 4.1 MB painted
// nebula at bgI 0.46-0.60 when it arrives. Those are not two versions of one
// picture, they are two different pictures at half a stop apart, and which one
// a child gets depends on how fast the download was. SKY_FALLBACK=1 blocks the
// PNG so the canvas path can be measured on its own terms.
const FALLBACK = process.env.SKY_FALLBACK === '1';

console.log(FALLBACK ? '\nCANVAS FALLBACK (the sky a slow connection gets)\n' : '\nPAINTED SKY (the sky a fast connection gets)\n');
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const rows = [];
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  if (FALLBACK) await p.route('**/assets/hf/hf_*.png', (r) => r.abort());
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
  } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.waitForSelector('#btnPlay', { state: 'visible', timeout: 400000 });
  await p.evaluate(() => document.getElementById('btnPlay').click());
  await p.waitForSelector(`#worldRow .wCard[data-world="${wid}"]`, { state: 'visible', timeout: 400000 });
  await p.evaluate((w) => document.querySelector(`#worldRow .wCard[data-world="${w}"]`).click(), wid);
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 10, null, { timeout: 400000 });
  // let the painted sky land — the canvas fallback and the PNG are different
  // pictures at different intensities, and measuring the wrong one is the
  // whole trap this probe exists to avoid.
  if (!FALLBACK) await p.waitForFunction(() => window.__scene?.background?.isTexture
    && (window.__scene.background.image?.width ?? 0) > 2048, null, { timeout: 400000 })
    .catch(() => console.log(`  (${wid}: painted sky never arrived — measuring the canvas fallback)`));

  const r = await p.evaluate(() => {
    const S = window.__scene, T = window.__THREE;
    const cv = window.__renderer.domElement;
    const shot = () => {
      window.__renderBloom();
      const c = document.createElement('canvas');
      c.width = cv.width; c.height = cv.height;
      c.getContext('2d').drawImage(cv, 0, 0);
      return c.getContext('2d').getImageData(0, 0, c.width, c.height);
    };
    const keptBg = S.background, keptI = S.backgroundIntensity, keptFog = S.fog;
    // fog tints distant geometry toward the sky colour, which would let island
    // pixels pass as sky in the key pass. Off for the mask, back for the shot.
    S.fog = null;
    S.background = new T.Color(1, 0, 1); S.backgroundIntensity = 1;
    const key = shot();
    S.background = keptBg; S.backgroundIntensity = keptI; S.fog = keptFog;
    const real = shot();

    const n = key.data.length / 4;
    const mask = new Uint8Array(n);
    let m = 0;
    for (let i = 0; i < n; i++) {
      const R = key.data[i * 4], G = key.data[i * 4 + 1], B = key.data[i * 4 + 2];
      if (R > 150 && B > 150 && G < 90) { mask[i] = 1; m++; }
    }
    const lum = [], sat = [];
    for (let i = 0; i < n; i++) {
      if (!mask[i]) continue;
      const R = real.data[i * 4] / 255, G = real.data[i * 4 + 1] / 255, B = real.data[i * 4 + 2] / 255;
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      lum.push(0.2126 * R + 0.7152 * G + 0.0722 * B);
      sat.push(mx <= 0 ? 0 : (mx - mn) / mx);
    }
    lum.sort((a, x) => a - x);
    const q = (f) => lum[Math.min(lum.length - 1, Math.max(0, Math.round(f * (lum.length - 1))))] ?? 0;
    return {
      skyPct: 100 * m / n,
      sat: sat.reduce((a, x) => a + x, 0) / Math.max(1, sat.length),
      p5: q(0.05), p50: q(0.50), p95: q(0.95),
      dark: 100 * lum.filter((x) => x < 0.06).length / Math.max(1, lum.length),
      painted: !!(S.background?.image?.width > 2048),
      bgI: S.backgroundIntensity,
    };
  });
  if (r.skyPct < 4) {
    console.log(`FAIL — ${wid}: the key render found only ${r.skyPct.toFixed(1)}% sky. `
      + `The background swap did not take, so every number here would be the island.`);
    await b.close(); process.exit(2);
  }
  const range = r.p95 - r.p5;
  rows.push({ wid, ...r, range });
  console.log(`  ${wid.padEnd(9)} sky ${r.skyPct.toFixed(0).padStart(2)}%  sat ${r.sat.toFixed(3)}  `
    + `L p5/p50/p95 ${r.p5.toFixed(3)}/${r.p50.toFixed(3)}/${r.p95.toFixed(3)}  `
    + `range ${range.toFixed(3)}  dark ${r.dark.toFixed(0)}%  `
    + `[${r.painted ? 'painted' : 'canvas'} @ bgI ${r.bgI.toFixed(2)}]`);
  await p.close();
}
await b.close();
console.log('');
console.log(`  mean sat ${(rows.reduce((a, r) => a + r.sat, 0) / rows.length).toFixed(3)}, `
  + `mean range ${(rows.reduce((a, r) => a + r.range, 0) / rows.length).toFixed(3)}, `
  + `mean dark ${(rows.reduce((a, r) => a + r.dark, 0) / rows.length).toFixed(0)}%`);
