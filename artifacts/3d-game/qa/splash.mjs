// Finish supplied key art into the menu's splash layer.
//
//   node qa/splash.mjs <source-image>
//
// THE FEATHER IS THE FORMAT, not decoration. index.html renders the art as
// `#menu::after { background: url(...) center 7vh / auto 70vh no-repeat }` over
// the menu's own radial gradient, and asks for "key art on its own feathered
// layer — the island, waterfall and the void's face melt into the cosmos with
// no hard photo edges". The original asset delivered exactly that: 66% of its
// pixels semi-transparent, all four corners at alpha 0. Drop a fully opaque
// rectangle in there and its left and right edges show as two vertical lines
// down the menu — which is what happened when an earlier pass exported without
// alpha, and an edge vignette only darkened the inside of the rectangle.
//
// So: downscale, then fade alpha to zero along every edge. The hero sits at the
// bottom right and is already cropped by the frame, so fading that corner melts
// it into the starfield rather than cutting it with a border.
import { chromium } from 'playwright';
import fs from 'node:fs';

const SRC = process.argv[2];
if (!SRC) { console.error('usage: node qa/splash.mjs <source-image>'); process.exit(1); }
// 0.744, not the source's 0.558. The menu has chrome at BOTH ends — the rank
// chip runs to 20vh, PLAY starts at 75vh — so a 9:16 asset either overlaps them
// or sits too small to fill the width. Cropping empty sky off the top and the
// hero's already-clipped bottom gives a shorter, wider frame that fills a phone
// at `auto 62vh` with the island under the chip and the hero above PLAY.
const W = 1536, H = 2313;
// Measured off a gridded copy of the source, not estimated: skyline top 0.11,
// island grass 0.24-0.38, rock to 0.55, debris spiral 0.52-0.80, the hero's eyes
// 0.72-0.82 and its mouth 0.83-0.87. Keeping 0.08-0.92 holds the whole
// composition and drops only empty sky and the hero's already-clipped chin.
// A first pass guessed 0.195 off the bottom and cut the face in half.
const CROP_TOP = 0.08, CROP_BOTTOM = 0.08;      // fractions of the SOURCE height

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
const out = await p.evaluate(async ({ src, W, H, CROP_TOP, CROP_BOTTOM }) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + src; await img.decode();
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.imageSmoothingQuality = 'high';
  // take the authored band out of the source first, then cover-fit that
  const sy = img.naturalHeight * CROP_TOP;
  const sh = img.naturalHeight * (1 - CROP_TOP - CROP_BOTTOM);
  const sc = Math.max(W / img.naturalWidth, H / sh);
  const dw = img.naturalWidth * sc, dh = sh * sc;
  x.drawImage(img, 0, sy, img.naturalWidth, sh, (W - dw) / 2, (H - dh) / 2, dw, dh);

  // ── feather every edge to transparency ──────────────────────────────────
  const m = document.createElement('canvas'); m.width = W; m.height = H;
  const mx = m.getContext('2d');
  mx.fillStyle = '#000'; mx.fillRect(0, 0, W, H);
  mx.globalCompositeOperation = 'destination-in';
  const hg = mx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0.00, 'rgba(0,0,0,0)');
  hg.addColorStop(0.11, 'rgba(0,0,0,1)');
  hg.addColorStop(0.89, 'rgba(0,0,0,1)');
  hg.addColorStop(1.00, 'rgba(0,0,0,0)');
  mx.fillStyle = hg; mx.fillRect(0, 0, W, H);
  const vg = mx.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0.00, 'rgba(0,0,0,0)');
  vg.addColorStop(0.075, 'rgba(0,0,0,1)');
  vg.addColorStop(0.90, 'rgba(0,0,0,1)');
  vg.addColorStop(1.00, 'rgba(0,0,0,0)');
  mx.fillStyle = vg; mx.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'destination-in';
  x.drawImage(m, 0, 0);
  x.globalCompositeOperation = 'source-over';

  const half = document.createElement('canvas'); half.width = W / 2; half.height = H / 2;
  const hc = half.getContext('2d'); hc.imageSmoothingQuality = 'high';
  hc.drawImage(c, 0, 0, half.width, half.height);
  return { big: c.toDataURL('image/webp', 0.92), sm: half.toDataURL('image/webp', 0.86),
           srcW: img.naturalWidth, srcH: img.naturalHeight };
}, { src: fs.readFileSync(SRC).toString('base64'), W, H, CROP_TOP, CROP_BOTTOM });

const w = (u, f) => { fs.writeFileSync(f, Buffer.from(u.split(',')[1], 'base64'));
  console.log(f, (fs.statSync(f).size / 1024).toFixed(0) + ' KB'); };
console.log(`source ${out.srcW}x${out.srcH} -> ${W}x${H}`);
w(out.big, 'public/assets/splash_hero.webp');
w(out.sm, 'public/assets/splash_hero_sm.webp');
await b.close();
