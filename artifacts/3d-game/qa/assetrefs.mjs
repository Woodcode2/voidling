// DOES EVERY FILE THIS GAME ASKS FOR ACTUALLY EXIST ANYWHERE?
//
//   node qa/assetrefs.mjs
//
// Static: reads files, runs no browser, under a second.
//
// ── WHY THIS IS NOT scripts/check-assets.mjs ────────────────────────────────
// That script already guards the iOS bundle, and it is good, but its reference
// set comes from scripts/asset-refs.mjs collectRefs(), which by design matches
// ONE pattern: /assets/hf/<file>.png. That is correct for what it is for —
// asset-refs is "which REMOTE art does vendor-assets.mjs have to download" and
// the CDN only hosts the hf set. The side effect is that the build's only
// asset guard sees 16 of the roughly 150 files the game asks for, and is blind
// to every sticker, every music track and every mesh.
//
// Three defects reached main through that gap, all of them 404 in DEV, on the
// WEB and on iOS — not merely in a bundle, because no rewrite covers them:
//
//   · /assets/hf3d/…/….glb — island.ts:3925 still loads the ferris wheel from
//     the GLB pack that assets3d.ts's own header says is gone.
//   · /assets/music/skylark.mp3 — SKYLARK FIELD is a selectable world and the
//     only one of six with no match track.
//   · 32 of 96 stickers — every single one for POWDER PASS (16/16) and
//     SKYLARK FIELD (16/16), so two of the six scrapbooks are pure glyphs.
//
// Every one of those falls back gracefully, which is exactly why nobody saw it.
//
// ── THE THREE OUTCOMES, WHICH ARE NOT THE SAME DEFECT ───────────────────────
//   ON DISK      under public/. Works everywhere.
//   REWRITTEN    absent locally but matched by a vercel.json rewrite, so the
//                web serves it and an iOS bundle does not. That is real debt
//                and it is scripts/check-assets.mjs's job; counted here, not
//                barred here.
//   NOWHERE      not on disk and not rewritten. 404 in every environment.
//
// ── THE BAR IS A FROZEN DEBT, AND THAT IS DELIBERATE ────────────────────────
// 34 references are NOWHERE today and 32 of them need artwork that does not
// exist. A bar that demands zero would be red until somebody draws 32 stickers
// and scores a music cue, and a permanently red step is a step people learn to
// scroll past. So the count is frozen at the number found the day this was
// written, the offenders are listed by name, and the bar fails if the set
// GROWS or if a name changes. Same idiom as roundlod's frozen 153 and
// peoplefacet's WIDEST_PX.
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const t0 = Date.now();
let fail = 0, bars = 0;
const ok = (m) => { bars++; console.log(`  ok   ${m}`); };
const no = (m) => { bars++; fail++; console.log(`  BAD  ${m}`); };
const die = (e) => { console.log(`\nFAIL — assetrefs threw: ${String(e && e.message || e).split('\n')[0]}`); process.exit(1); };
process.on('uncaughtException', die);
process.on('unhandledRejection', die);

// ── THE DEBT, AS IT STOOD WHEN THIS FILE WAS WRITTEN ────────────────────────
// Each line is a reference that resolves nowhere. Fix one and delete its line;
// the bar checks set equality, so a stale entry fails just as loudly as a new
// defect and the list cannot rot.
const KNOWN_NOWHERE = new Set([
  // the ferris wheel still loading from the retired GLB pack
  '/assets/hf3d/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/f1918f07-d6ac-4589-abe2-eeaf7ca703b2.glb',
  // SKYLARK FIELD is the only one of six worlds with no match track
  '/assets/music/skylark.mp3',
  // OPTIONAL BY DESIGN, not a defect: audio3d.ts:3915 only reaches for
  // theme.mp3 when voidTheme=1 is set by hand, and lists maple.mp3 right
  // behind it in the same urls array. Listed so the count is honest.
  '/assets/music/theme.mp3',
  // POWDER PASS and SKYLARK FIELD have NO sticker art at all — 16 of 16 each.
  // Two of the six scrapbooks render as pure tier glyphs. Written out by id
  // rather than derived from the directory: a list built by asking the
  // filesystem what is missing can never catch a NEW missing file, because the
  // answer and the expectation come from the same place. (First draft of this
  // guard did exactly that and would have passed over a deleted sticker.)
  '/assets/stickers/closure-board.webp',
  '/assets/stickers/champion-snowman.webp',
  '/assets/stickers/lost-mitten.webp',
  '/assets/stickers/grit-lorry.webp',
  '/assets/stickers/frozen-fountain.webp',
  '/assets/stickers/ski-instructor-hat.webp',
  '/assets/stickers/lift-chair-nine.webp',
  '/assets/stickers/hot-choc-summit.webp',
  '/assets/stickers/pinecone-king.webp',
  '/assets/stickers/sled-record.webp',
  '/assets/stickers/ice-fish-hut.webp',
  '/assets/stickers/aurora-jar.webp',
  '/assets/stickers/whale-rosette.webp',
  '/assets/stickers/pyms-anemometer.webp',
  '/assets/stickers/first-skylark.webp',
  '/assets/stickers/gretes-binoculars.webp',
  '/assets/stickers/sheep-of-zero-nine.webp',
  '/assets/stickers/rosette-board.webp',
  '/assets/stickers/hares-form.webp',
  '/assets/stickers/franz-gloves.webp',
  '/assets/stickers/last-bacon-roll.webp',
  '/assets/stickers/thirty-pence-teapot.webp',
  '/assets/stickers/old-windsock.webp',
  '/assets/stickers/retrieve-map.webp',
  '/assets/stickers/snow-day-bell.webp',
  '/assets/stickers/thermos-of-record.webp',
  '/assets/stickers/abandoned-homework.webp',
  '/assets/stickers/sledding-queue-sign.webp',
  '/assets/stickers/glow-baton.webp',
  '/assets/stickers/tethered-whale.webp',
  '/assets/stickers/glow-programme.webp',
  '/assets/stickers/last-burner.webp',
]);

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); }
    else if (/\.(ts|tsx|js|mjs|html|css)$/.test(e.name)) out.push(p);
  }
  return out;
};

// src/ui/** IS NOT IN THE BUILD. index.html loads src/prototype3d.ts, and
// nothing under src/ that IS in that graph imports src/ui — checked, not
// assumed: `grep -rn "from './ui/\|from '../ui/" src/ --include=*.ts` returns
// nothing. UILayer.tsx's /assets/splash_screen.jpg and /assets/objects/*.png
// are references from the retired 2D entry point, so counting them as live
// 404s would put three permanent reds in front of a reader for code that never
// runs. Excluded here, named in the (c) report so the exclusion is visible.
const RETIRED = /^src\/ui\//;
const ALL = [...walk('src'), 'index.html'];
const FILES = ALL.filter((f) => !RETIRED.test(f));
const SKIPPED = ALL.filter((f) => RETIRED.test(f));
const SRC = new Map(FILES.map((f) => [f, readFileSync(f, 'utf8')]));

// ── the rewrites, read from vercel.json rather than remembered ──────────────
const rewrites = (JSON.parse(readFileSync('vercel.json', 'utf8')).rewrites || [])
  .map((r) => new RegExp('^' + String(r.source).replace(/:[A-Za-z]+\*?/g, '[^?]+') + '$'));
const rewritten = (ref) => rewrites.some((re) => re.test(ref));

// ── every reference, literal and expanded ───────────────────────────────────
const refs = new Map();                 // web path -> [where it came from]
const add = (ref, where) => { (refs.get(ref) || refs.set(ref, []).get(ref)).push(where); };

// 1 · literals with a real extension
for (const [f, s] of SRC) {
  for (const m of s.matchAll(/\/assets\/[A-Za-z0-9_./-]+\.(?:png|jpg|jpeg|webp|mp3|ogg|wav|glb|gltf|svg|json|ttf|woff2?)/g)) {
    add(m[0], f);
  }
}

// 2 · the template families, expanded from the SAME lists the game uses. A
//     family with no expander here is a hole in the guard, so the unexpanded
//     ones are collected and reported rather than dropped.
const families = new Set();
for (const [, s] of SRC) {
  for (const m of s.matchAll(/["'`]\/assets\/[A-Za-z0-9_./-]*\$\{[^}]+\}[A-Za-z0-9_./-]*["'`]/g)) families.add(m[0].slice(1, -1));
  for (const m of s.matchAll(/\/assets\/[A-Za-z0-9_./-]*\{[a-zA-Z.]+\}[A-Za-z0-9_./-]*/g)) families.add(m[0]);
}
const expanded = new Set();

// stickers — ids straight out of the table the scrapbook renders from
{
  const s = SRC.get('src/game/stickers.ts') || readFileSync('src/game/stickers.ts', 'utf8');
  const rows = [...s.matchAll(/\{\s*id:\s*'([^']+)',\s*world:\s*'([^']+)'/g)];
  if (rows.length < 40) die(new Error(`only ${rows.length} stickers parsed out of stickers.ts — the expander broke, not the game`));
  for (const [, id] of rows) add(`/assets/stickers/${id}.webp`, 'src/game/stickers.ts (expanded)');
  expanded.add('/assets/stickers/${st.id}.webp');
}

// world music — the slot list audio3d.ts itself switches on
{
  const s = SRC.get('src/proto3d/audio3d.ts') || '';
  const slots = new Set(['maple']);
  for (const m of s.matchAll(/is([A-Z][a-z]+)\(\)\s*\?\s*'([a-z]+)'/g)) slots.add(m[2]);
  if (slots.size < 5) die(new Error(`only ${slots.size} music slots parsed out of audio3d.ts — the expander broke`));
  for (const w of slots) add(`/assets/music/${w}.mp3`, 'src/proto3d/audio3d.ts (expanded)');
  expanded.add('/assets/music/${slot}.mp3');
  expanded.add('/assets/music/${f}');           // preload of the same set
}

// the retired 2D entry point's families. src/ui and src/game/draw* are not in
// the vite graph — index.html loads src/prototype3d.ts — so they are named and
// set aside rather than counted as live references.
for (const fam of ['/assets/ground/{id}.png', '/assets/layers/{id}.png',
  '/assets/objects/{id}.png', '/assets/skins/{id}.png', '/assets/objects/${panel.spriteKind}.png']) expanded.add(fam);

const unexpanded = [...families].filter((f) => !expanded.has(f));

// ── classify ────────────────────────────────────────────────────────────────
const onDisk = [], viaRewrite = [], nowhere = [];
for (const [ref, where] of refs) {
  if (existsSync(`public${ref}`)) onDisk.push(ref);
  else if (rewritten(ref)) viaRewrite.push(ref);
  else nowhere.push({ ref, where: [...new Set(where)] });
}

console.log(`\n  ${refs.size} asset references across ${FILES.length} source files`);
console.log(`    ${onDisk.length} on disk · ${viaRewrite.length} served only by a vercel rewrite · ${nowhere.length} nowhere at all\n`);

// ── (a) the guard cannot be silently narrow ─────────────────────────────────
if (!unexpanded.length) {
  ok(`(a) every templated /assets family has an expander here (${expanded.size} known)`);
} else {
  no(`(a) ${unexpanded.length} templated /assets family/families have no expander, so this guard is blind to them: `
    + unexpanded.join(', ') + ' — add one above rather than letting the count of checked files drift');
}

// ── (b) the frozen debt ─────────────────────────────────────────────────────
{
  const now = new Set(nowhere.map((n) => n.ref));
  const added = [...now].filter((r) => !KNOWN_NOWHERE.has(r));
  const fixed = [...KNOWN_NOWHERE].filter((r) => !now.has(r));
  const byDir = {};
  for (const n of nowhere) { const d = n.ref.split('/').slice(0, 3).join('/'); byDir[d] = (byDir[d] || 0) + 1; }
  console.log(`       nowhere, by directory: ${Object.entries(byDir).map(([d, n]) => `${d} ${n}`).join(' · ')}`);
  for (const n of nowhere.filter((x) => !x.ref.startsWith('/assets/stickers/'))) {
    console.log(`       · ${n.ref}\n           asked for by ${n.where.join(', ')}`);
  }
  if (!added.length && !fixed.length) {
    ok(`(b) the ${now.size} references that resolve nowhere are exactly the ones already written down`);
  } else {
    if (added.length) no(`(b) ${added.length} NEW reference(s) resolve nowhere — 404 in dev, on the web and on iOS: ${added.slice(0, 8).join(', ')}${added.length > 8 ? ` …and ${added.length - 8} more` : ''}`);
    if (fixed.length) no(`(b) ${fixed.length} entry/entries in the frozen list now resolve — delete them from KNOWN_NOWHERE so the list cannot rot: ${fixed.slice(0, 8).join(', ')}${fixed.length > 8 ? ' …' : ''}`);
  }
}

// ── (c) the iOS-bundle debt, reported ───────────────────────────────────────
console.log(`\n  ·    ${SKIPPED.length} file(s) under src/ui/ were not scanned — the retired 2D entry point, not in the vite graph: `
  + SKIPPED.join(', '));
console.log(`  ·    ${viaRewrite.length} reference(s) exist only behind the vercel rewrite — fine on the web, absent from an `
  + `iOS bundle until scripts/vendor-assets.mjs has run (REPORT; scripts/check-assets.mjs is the bar for that)`
  + (viaRewrite.length ? `: ${viaRewrite.join(', ')}` : ''));

const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log('');
if (fail) { console.log(`FAIL — ${fail} of ${bars} bar(s) [${secs}s]`); process.exit(1); }
console.log(`PASS — ${bars} bars over ${refs.size} asset references [${secs}s]`);
