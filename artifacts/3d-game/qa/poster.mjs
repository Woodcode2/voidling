// THE SPLASH, rebuilt from scratch out of the game itself.
//
// The old key art was a generic floating island with a flat painted blob under
// it — it did not say what this game IS. The fantasy of VOIDLING is that you are
// a colossal adorable void eating a whole town, and it is joyful rather than
// frightening. So the art is now a real frame of exactly that: Maple Falls'
// town square, its autumn maples, its storefronts, its fountain and its several
// hundred townspeople, with the void at full size sitting in the middle of it.
// Every pixel of the subject is the shipping game.
//
// It is then treated as a floating diorama: graded, bloomed, and faded to
// transparency at every edge, because index.html wants "key art on its own
// feathered layer … with no hard photo edges" and the menu's own gradient has
// to keep showing through.
import { chromium } from 'playwright';
import fs from 'node:fs';
const b64 = f => fs.readFileSync(f).toString('base64');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
const out = await p.evaluate(async ({ shot }) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + shot; await img.decode();
  const W = 1536, H = 2752;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');

  // ── the frame, scaled to cover, with the void a little above centre ──────
  const sc = Math.max(W / img.naturalWidth, H / img.naturalHeight) * 1.22;
  const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
  x.drawImage(img, (W - dw) / 2 - W * 0.02, (H - dh) / 2 + H * 0.045, dw, dh);

  // the void sits here in the source frame
  const vx = W * 0.45, vy = H * 0.50;

  // ── grade: deepen the corners, push a violet cast into the falloff so the
  //    diorama marries the menu's cosmos instead of sitting on top of it ─────
  const gr = x.createRadialGradient(vx, vy, W * 0.18, vx, vy, W * 0.95);
  gr.addColorStop(0, 'rgba(20,10,48,0)');
  gr.addColorStop(0.55, 'rgba(20,10,48,0.30)');
  gr.addColorStop(1, 'rgba(13,8,33,0.86)');
  x.fillStyle = gr; x.fillRect(0, 0, W, H);

  // ── the void's own glow, lifting it off the town ────────────────────────
  x.globalCompositeOperation = 'lighter';
  const bl = x.createRadialGradient(vx, vy, 0, vx, vy, W * 0.42);
  bl.addColorStop(0, 'rgba(150,80,240,0.30)');
  bl.addColorStop(0.45, 'rgba(126,60,210,0.12)');
  bl.addColorStop(1, 'rgba(120,60,200,0)');
  x.fillStyle = bl; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'source-over';

  // ── FEATHER TO TRANSPARENCY. An ellipse, taller than wide, opaque through
  //    the middle and gone by the edges — no photo border anywhere. ─────────
  const m = document.createElement('canvas'); m.width = W; m.height = H;
  const mx = m.getContext('2d');
  mx.save();
  mx.translate(vx, vy);
  mx.scale(1, 1.30);
  const mg = mx.createRadialGradient(0, 0, 0, 0, 0, W * 0.62);
  mg.addColorStop(0.00, 'rgba(0,0,0,1)');
  mg.addColorStop(0.46, 'rgba(0,0,0,1)');
  mg.addColorStop(0.66, 'rgba(0,0,0,0.80)');
  mg.addColorStop(0.84, 'rgba(0,0,0,0.30)');
  mg.addColorStop(1.00, 'rgba(0,0,0,0)');
  mx.fillStyle = mg; mx.fillRect(-W, -H, W * 3, H * 3);
  mx.restore();
  x.globalCompositeOperation = 'destination-in';
  x.drawImage(m, 0, 0);
  x.globalCompositeOperation = 'source-over';

  // ── cosmos around the diorama: stars, and a few crumbs of the town drifting
  //    off into space so the picture reads as mid-swallow ───────────────────
  let s = 20260803; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const dist = (px, py) => {
    const ddx = (px - vx) / (W * 0.62), ddy = (py - vy) / (W * 0.62 * 1.30);
    return Math.hypot(ddx, ddy);
  };
  for (let i = 0; i < 900; i++) {
    const px = rnd() * W, py = rnd() * H;
    const d = dist(px, py);
    if (d < 0.60) continue;                       // only outside the diorama
    const a = Math.min(1, (d - 0.60) / 0.28) * (rnd() * 0.75 + 0.18);
    x.fillStyle = `rgba(255,255,255,${a})`;
    x.beginPath(); x.arc(px, py, rnd() * 2.0 + 0.35, 0, 7); x.fill();
  }
  for (let i = 0; i < 26; i++) {
    const ang = rnd() * Math.PI * 2, rr = 0.74 + rnd() * 0.34;
    const px = vx + Math.cos(ang) * W * 0.62 * rr;
    const py = vy + Math.sin(ang) * W * 0.62 * 1.30 * rr;
    if (px < 0 || px > W || py < 0 || py > H) continue;
    const a = 0.5 * (1 - (rr - 0.74) / 0.34);
    x.fillStyle = `rgba(226,196,255,${Math.max(0.06, a)})`;
    x.beginPath(); x.arc(px, py, rnd() * 7 + 2, 0, 7); x.fill();
  }

  const half = document.createElement('canvas'); half.width = W / 2; half.height = H / 2;
  const hc = half.getContext('2d'); hc.imageSmoothingQuality = 'high';
  hc.drawImage(c, 0, 0, half.width, half.height);
  return { big: c.toDataURL('image/webp', 0.90), sm: half.toDataURL('image/webp', 0.88) };
}, { shot: b64(process.argv[2] || 'qa-out/keyart-2.png') });
const w = (u, f) => { fs.writeFileSync(f, Buffer.from(u.split(',')[1], 'base64'));
  console.log(f, (fs.statSync(f).size / 1024).toFixed(0) + ' KB'); };
w(out.big, 'public/assets/splash_hero.webp');
w(out.sm, 'public/assets/splash_hero_sm.webp');
await b.close();
