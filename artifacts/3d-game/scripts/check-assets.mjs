// Fail loudly if the app is about to ship without its art.
//
// This is the guard that was missing. The build has always succeeded with zero
// AI art in dist/, because on the web the missing files are supplied by a
// Vercel rewrite at request time — so nothing local ever notices. Package that
// same dist/ into an iOS app and there is no rewrite, no server, and no art.
//
// Run before `npx cap sync ios`, and before any App Store archive.
//
//   node scripts/check-assets.mjs          check public/
//   node scripts/check-assets.mjs dist     check a built output instead
//
// Exit code 1 means DO NOT SHIP.
import fs from 'node:fs';
import path from 'node:path';
import { collectRefs, ROOT } from './asset-refs.mjs';

const where = process.argv[2] === 'dist' ? 'dist' : 'public';
const base = path.join(ROOT, where);
const refs = collectRefs();

const missing = [];
const tiny = [];
for (const ref of refs) {
  const p = path.join(base, ref.replace(/^\//, ''));
  if (!fs.existsSync(p)) { missing.push(ref); continue; }
  // A CDN error page saved as a .glb passes an existence check and fails on
  // device, which is the worst possible time to find out.
  if (fs.statSync(p).size < 1024) tiny.push(ref);
}

const glb = (a) => a.filter((r) => r.endsWith('.glb')).length;
console.log(`checking ${where}/ against ${refs.length} referenced assets `
  + `(${glb(refs)} meshes, ${refs.length - glb(refs)} images)`);

if (!missing.length && !tiny.length) {
  console.log('all present. safe to bundle.');
  process.exit(0);
}

if (missing.length) {
  console.error(`\nMISSING ${missing.length} of ${refs.length} (${glb(missing)} meshes):`);
  for (const r of missing.slice(0, 12)) console.error('  ' + r);
  if (missing.length > 12) console.error(`  … and ${missing.length - 12} more`);
}
if (tiny.length) {
  console.error(`\nSUSPICIOUSLY SMALL — probably a saved error page (${tiny.length}):`);
  for (const r of tiny.slice(0, 12)) console.error('  ' + r);
}
console.error('\nOn the web these resolve through the vercel.json rewrites, so the site is');
console.error('fine. An iOS bundle has no rewrite: every one of these fails at runtime and');
console.error('falls back to a plain shape. Paid skins would render as featureless balls.');
console.error('\nFix: node scripts/vendor-assets.mjs');
process.exit(1);
