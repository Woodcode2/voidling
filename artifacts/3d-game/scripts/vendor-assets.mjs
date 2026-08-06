// Pull the AI art out of the CDN and into public/, so it ships inside the app.
//
// WHY THIS EXISTS
// ---------------
// Every piece of generated art — the 18 skin/card images and the 33-mesh GLB
// pack — is referenced as a same-origin path (/assets/hf/..., /assets/hf3d/...).
// Those paths only resolve because vercel.json rewrites them to two CloudFront
// distributions, and because vite.config.ts mirrors the same rewrite for the
// dev server.
//
// A Capacitor build has neither. The iOS app loads from file:// with no server
// in front of it, so on device every one of these requests fails: paid skins
// render as plain balls, the void loses its galaxy interior, the sky goes flat,
// and all 33 GLBs — including every car — fall back to boxes. The web build is
// fine; the app is not, and nothing in the build currently says so.
//
// Run this once before `npx cap sync ios`. Files already present are skipped,
// so it is cheap to re-run and safe to leave in a build script.
//
//   node scripts/vendor-assets.mjs            download anything missing
//   node scripts/vendor-assets.mjs --force    re-download everything
//
// The downloaded files are large binaries. Whether they belong in git or in the
// Xcode project as a bundled resource is a call for whoever runs the release —
// see the note this prints when it finishes.
import fs from 'node:fs';
import path from 'node:path';
import { collectRefs, remoteUrl, localPath } from './asset-refs.mjs';

const force = process.argv.includes('--force');
const refs = collectRefs();
const todo = force ? refs : refs.filter((r) => !fs.existsSync(localPath(r)));

console.log(`${refs.length} remote assets referenced · ${refs.length - todo.length} already local · ${todo.length} to fetch`);
if (!todo.length) { console.log('nothing to do.'); process.exit(0); }

let ok = 0;
const failed = [];
for (const [i, ref] of todo.entries()) {
  const url = remoteUrl(ref);
  const dest = localPath(ref);
  process.stdout.write(`  [${String(i + 1).padStart(3)}/${todo.length}] ${path.basename(ref)} … `);
  try {
    // ── BACK OFF, DO NOT GIVE UP ──────────────────────────────────────────
    // The mesh CDN rate-limits, and it says so with 403 rather than 429 —
    // which reads exactly like "this distribution is private" and sent the
    // first investigation off after network plumbing. What it actually is:
    // run 1 fired 34 mesh requests 0.39s apart and every single one was
    // refused, while the 19 images went through untouched because they are
    // 0.5-6 MB and arrived 1-2s apart on their own. Run 2, starting from a
    // partly-filled disk, got 17 of the 34.
    // So the fetch paces itself and retries a refusal instead of recording it
    // as a fact about the file.
    let res = null, wait = 1500;
    for (let attempt = 0; attempt < 5; attempt++) {
      res = await fetch(url);
      if (res.ok) break;
      if (res.status !== 403 && res.status !== 429) break;   // a real 404 is not worth five tries
      if (attempt < 4) {
        process.stdout.write(`${res.status}, retry… `);
        await new Promise((r) => setTimeout(r, wait));
        wait *= 2;
      }
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // A CDN error page is a 200 with HTML in it. A 400-byte "GLB" is not a GLB.
    if (buf.length < 1024) throw new Error(`suspiciously small (${buf.length} bytes)`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    console.log(`${(buf.length / 1024).toFixed(0)} KB`);
    ok++;
    // a small gap between requests, for the same reason. The whole set is 53
    // files and this costs under a minute; being refused costs a whole run.
    await new Promise((r) => setTimeout(r, 400));
  } catch (e) {
    console.log(`FAILED — ${e.message}`);
    failed.push({ ref, url, err: e.message });
  }
}

console.log(`\n${ok} fetched, ${failed.length} failed.`);
if (failed.length) {
  console.log('\nFAILED:');
  for (const f of failed) console.log(`  ${f.ref}\n    ${f.url}\n    ${f.err}`);
  console.log('\nIf these are network refusals rather than 404s, this machine cannot reach');
  console.log('the CDN. Run it somewhere that can — the files are the same either way.');
  process.exit(1);
}
console.log('\nAssets are in public/. `npm run build` will copy them into dist/, and');
console.log('`npx cap sync ios` will carry dist/ into the app bundle.');
console.log('Run `node scripts/check-assets.mjs` to confirm before you archive.');
