// DOES THE CHARACTER FILL ITS CARD, AND DOES ANYTHING RUN OFF IT?
//
// The shop rendered every void into 58% of its own frame. The cause was not the
// camera: a permanently transparent "Zzz" sleep billboard — PlaneGeometry(1.15)
// at opacity 0, parked above and to the side of the head — sat inside the
// fit-to-frame walk, which skipped `visible === false` but not "draws nothing".
// It reached y=2.77 on every skin, including a plain orb topping out near 1.12,
// and pushed the fit span from 2.6 to 3.50. Every card was framed for a ghost.
//
// The same walk had been COPIED into the preview turntable, the hat thumbnails
// and the mirror, so fixing one fixed one. It is one function now, and this
// probe measures the result on the real shop cards rather than a QA-only
// render path — the alpha bounding box of each card canvas, which is the only
// thing that answers "how big does the child actually see it".
//
// It fails both ways. Too small is a wasted card; touching the border is a
// clipped horn, and Uni-Void's horn is exactly what the old margin protected.
//
//   node qa/framing.mjs [port]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
// iPhone-class density: the resolution half of this only shows up above 1x
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => {
  localStorage.clear();
  localStorage.setItem('voidPlayed', '1');
  localStorage.setItem('voidTut', '1');
  localStorage.setItem('voidDailyLast', new Date().toDateString());
});
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
await p.evaluate(() => document.getElementById('btnShop').click());

// The grid paints across frames on a per-frame budget, so wait for the LAST
// card. Not `width > 0`: an untouched canvas already reports 300x150, which is
// how the first run of this probe reported all eighteen voids empty and
// believed it. The shooter sets width to its own buffer size, so a card that
// has actually been painted is square.
await p.waitForFunction(() => {
  const cvs = [...document.querySelectorAll('#shopGrid .skCard canvas')];
  return cvs.length > 0 && cvs.every((c) => c.width > 0 && c.width === c.height);
}, null, { timeout: 300000 }).catch(() => { });
await p.waitForTimeout(1500);

const measure = async (sel) => p.evaluate((s) => {
  const out = [];
  for (const cv of document.querySelectorAll(s)) {
    if (!cv.width) continue;
    const c2 = document.createElement('canvas');
    c2.width = cv.width; c2.height = cv.height;
    const x = c2.getContext('2d'); x.drawImage(cv, 0, 0);
    const d = x.getImageData(0, 0, cv.width, cv.height).data;
    let minX = cv.width, maxX = -1, minY = cv.height, maxY = -1;
    for (let y = 0; y < cv.height; y++) for (let xx = 0; xx < cv.width; xx++) {
      if (d[(y * cv.width + xx) * 4 + 3] > 24) {
        if (xx < minX) minX = xx; if (xx > maxX) maxX = xx;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    const r = cv.getBoundingClientRect();
    out.push({
      id: (cv.id || '').replace(/^(skcv_|hatcv_)/, '') || 'preview',
      empty: maxX < 0,
      fill: maxX < 0 ? 0 : Math.max(maxX - minX + 1, maxY - minY + 1) / cv.width,
      cx: maxX < 0 ? 0.5 : (minX + maxX + 2) / 2 / cv.width,
      cy: maxX < 0 ? 0.5 : (minY + maxY + 2) / 2 / cv.height,
      clipped: maxX >= 0 && (minX <= 0 || minY <= 0 || maxX >= cv.width - 1 || maxY >= cv.height - 1),
      buf: cv.width,
      need: Math.round(r.width * devicePixelRatio),
    });
  }
  return out;
}, sel);

const fail = [];
const report = (label, rows) => {
  console.log(`\n══ ${label}`);
  for (const r of rows) {
    const res = r.need ? (r.buf / r.need) : 1;
    console.log(`  ${r.id.padEnd(13)} fills ${(r.fill * 100).toFixed(0).padStart(3)}%`
      + `  centre ${(r.cx * 100).toFixed(0)}/${(r.cy * 100).toFixed(0)}`
      + `  buffer ${String(r.buf).padStart(3)}/${String(r.need).padStart(3)}px = ${res.toFixed(2)}x native`
      + `${r.clipped ? '   <-- CLIPPED' : ''}${r.empty ? '   <-- EMPTY' : ''}`
      + `${res < 0.98 ? '   <-- UPSCALED' : ''}`);
    if (r.clipped) fail.push(`${label}/${r.id} clipped`);
    if (r.empty) fail.push(`${label}/${r.id} empty`);
    if (!r.empty && r.fill < 0.70) fail.push(`${label}/${r.id} fills only ${(r.fill * 100).toFixed(0)}%`);
    if (res < 0.98) fail.push(`${label}/${r.id} upscaled (${res.toFixed(2)}x)`);
  }
};

report('VOID CARDS', await measure('#shopGrid .skCard canvas'));
// measured on the voids tab, where it is actually looked at — the hats tab
// repaints it against a hat and that is a different subject
report('MIRROR', await measure('#mirrorCv'));

// the hats tab, which had its own copy of the same framing walk
await p.evaluate(() => { const t = document.getElementById('tabHats'); (t?.closest('button,div') || t)?.click(); });
await p.waitForFunction(() => {
  const cvs = [...document.querySelectorAll('#hatGrid .hatCard canvas')];
  return cvs.length > 0 && cvs.every((c) => c.width > 0 && c.width === c.height);
}, null, { timeout: 300000 }).catch(() => { });
await p.waitForTimeout(1500);
report('HAT CARDS', await measure('#hatGrid .hatCard canvas'));

// and the preview turntable, which had another
await p.evaluate(() => { const t = document.getElementById('tabVoids'); (t?.closest('button,div') || t)?.click(); });
await p.waitForTimeout(1500);
await p.evaluate(() => {
  const c = [...document.querySelectorAll('#shopGrid .skCard')]
    .find((x) => (x.querySelector('canvas')?.id || '') === 'skcv_univoid');
  c?.click();
});
await p.waitForTimeout(9000);
report('PREVIEW (uni-void: the horn is what the margin protects)', await measure('#spOrb canvas'));
await p.screenshot({ path: 'qa-out/framing-preview.png' });

if (errs.length) console.log('\nPAGE ERRORS:', errs.slice(0, 4));
await b.close();
console.log(fail.length ? `\nFAIL (${fail.length}):\n  ${fail.join('\n  ')}` : '\nevery render fills its frame, nothing clipped, nothing upscaled');
process.exit(fail.length ? 1 : 0);
