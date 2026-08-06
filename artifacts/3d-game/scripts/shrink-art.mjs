// Downscale vendored art in place, to the size it is actually drawn at.
//
//   node scripts/shrink-art.mjs            # report only, changes nothing
//   node scripts/shrink-art.mjs --apply    # rewrite the files
//
// WHY IN PLACE, SAME NAME, SAME FORMAT
// -----------------------------------
// These filenames are the CDN keys. scripts/asset-refs.mjs resolves each
// source reference to a remote URL by filename, so renaming one to .webp would
// make vendor-assets.mjs ask the CDN for a file that does not exist. Format
// conversion is a separate, deliberate change that has to move the references
// and the resolver together. This does the part that needs no coordination:
// fewer pixels, same everything else.
//
// TARGETS ARE MEASURED, NOT GUESSED (qa/_imgsize.mjs):
//   world cards render at 191x253 CSS px, so DPR 3 wants 573x759 device px.
//     They ship at 896x1200 — 2.5x the pixels that can ever be displayed.
//   the favicon is drawn at 32px, and apple-touch-icon at up to 180px.
//     It ships at 1024x1024.
//
// The 3D textures — the nebula sky, the void's galaxy interior and the eight
// skin hides — are deliberately NOT in this list. They wrap curved surfaces at
// a zoom that changes through a match, so their honest target is a different
// measurement and softness shows differently on them. 27 of the 37 MB is
// sitting there and it is worth doing, separately, with its own evidence.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const DIR = 'public/assets/hf';
// filename prefix → the longest edge it will ever be drawn at, with headroom
const TARGETS = [
  ['hf_20260723_155631', 256, 'favicon + apple-touch-icon (drawn at 32 and 180)'],
  ['hf_20260730_000329', 858, 'world card: frost'],
  ['hf_20260801_053403', 858, 'world card: gameday'],
  ['hf_20260801_130607', 858, 'world card: maple'],
  ['hf_20260801_130624', 858, 'world card: pirate'],
  ['hf_20260802_020636', 858, 'world card: lantern'],
];

const apply = process.argv.includes('--apply');
const files = fs.readdirSync(DIR);
const jobs = [];
for (const [prefix, maxEdge, what] of TARGETS) {
  const f = files.find((n) => n.startsWith(prefix));
  if (!f) { console.log(`  MISSING ${prefix} — ${what}`); continue; }
  jobs.push({ file: path.join(DIR, f), maxEdge, what, before: fs.statSync(path.join(DIR, f)).size });
}

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const p = await b.newPage();
let saved = 0;
for (const j of jobs) {
  const ext = path.extname(j.file).toLowerCase();
  const mime = ext === '.jpeg' || ext === '.jpg' ? 'image/jpeg' : 'image/png';
  const b64 = fs.readFileSync(j.file).toString('base64');
  const out = await p.evaluate(async ([data, mimeIn, maxEdge]) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = `data:${mimeIn};base64,${data}`; });
    const k = Math.min(1, maxEdge / Math.max(img.width, img.height));
    if (k >= 1) return null;                       // already small enough
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, c.width, c.height);
    return { url: c.toDataURL(mimeIn, 0.92), w: c.width, h: c.height, was: `${img.width}x${img.height}` };
  }, [b64, mime, j.maxEdge]);
  if (!out) { console.log(`  skip  ${path.basename(j.file)} — already within ${j.maxEdge}px`); continue; }
  const buf = Buffer.from(out.url.split(',')[1], 'base64');
  const pct = Math.round((1 - buf.length / j.before) * 100);
  console.log(`  ${out.was.padStart(9)} -> ${String(out.w + 'x' + out.h).padEnd(9)}  ${String(Math.round(j.before / 1024)).padStart(5)} -> ${String(Math.round(buf.length / 1024)).padStart(4)} KB  (-${pct}%)  ${j.what}`);
  saved += j.before - buf.length;
  if (apply) fs.writeFileSync(j.file, buf);
}
await b.close();
console.log(`\n${apply ? 'saved' : 'would save'} ${(saved / 1048576).toFixed(1)} MB`);
if (!apply) console.log('(report only — pass --apply to rewrite)');
