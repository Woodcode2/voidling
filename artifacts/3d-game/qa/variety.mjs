// IS THE TOWN STAMPED FROM ONE MOULD? — the uniformity probe (absence #5).
//
// The owner photographed Maple Falls on his phone and said "the quality of
// people and items look bare minimum here". Two flower beds in that frame are
// identical to each other down to their orientation, and so are the planters,
// and so are the newspaper boxes.
//
// qa/ground.mjs already reports Maple as "has texture at play distance", and it
// is right: the speckle layer is genuinely there. It measures GRAIN. It cannot
// see that forty props share one facing, because grain and sameness are
// different frequencies of the same complaint and only one of them had an
// instrument. This is the other one.
//
// WHAT IT MEASURES, per world:
//   FACING   the distribution of mesh.rotation.y across every edible prop. A
//            town where most props sit at exactly 0 was never turned — the
//            placement code only sets rotation when a call site passes one, and
//            most call sites do not.
//   FORM     distinct geometry signatures per prop, so "one sphere" and "four
//            clustered spheres" are separable. A prop type whose every instance
//            has an identical vertex count and identical bounding box is a
//            stamp, however nice the stamp is.
//
// WHY BOTH: turning identical stamps is not variety either, and neither is
// forty different props all facing north. The two numbers only mean something
// together, so the gate wants both.
//
//   node qa/variety.mjs [port] [worlds...]
//
// TRAP, and it cost this probe its first three runs: voidUnlocked is a
// COMMA-JOINED STRING (`unlocks.ts:39` — `raw.split(',')`), not JSON. Seeding
// it with JSON.stringify([...]) parses to `["maple"`, `"pirate"`, … — quotes
// and brackets baked into every entry — so not one of them matches and every
// world but Maple stays locked. Maple looks fine because read() force-adds it,
// which is exactly what makes the bug invisible.
// TRAP: glb() registers props asynchronously, so the count must be STABLE
// before anything is counted, exactly as qa/determ.mjs does it.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4177';
const WORLDS = process.argv.slice(3).length ? process.argv.slice(3) : ['maple', 'pirate', 'gameday', 'lantern', 'powder'];

// THE CONTRACT, and the numbers are argued rather than picked:
//   A prop with no front — a bush, a flower bed, a planter, a rock — has no
//   reason to face north, and a town of them all facing north is the single
//   cheapest-looking thing in a top-down game. A prop WITH a front — a bench, a
//   signpost, a shopfront — is authored and should keep its facing. Real towns
//   land somewhere in between, so the bar is deliberately not 100%.
const MAX_SHARED_FACING = 0.55;   // at most 55% of props may share the single most common facing
//
// RETRACTION, made the same hour this probe was written, before it ever gated
// anything. The first version of the FORM bar was `distinct forms / prop count
// >= 0.12`, and that ratio is structurally wrong: it falls as a town grows even
// when the town gets richer. Maple Falls has 379 distinct forms across 5,785
// props and scored 6.6%; a hamlet with 30 forms across 100 props scores 30% and
// is plainly the poorer place. The metric was measuring SIZE and calling it
// sameness. It failed the build for the wrong reason and would have failed any
// large world forever.
//
// What the complaint actually is — "I keep seeing the same object" — is a SHARE,
// not a ratio: how much of the town is the single most repeated form. That is
// comparable across towns of any size, which is the property the first version
// lacked. 25% is the bar: a quarter of everything being one object is a stamp,
// and street trees legitimately run to hundreds of identical copies below it.
const MAX_TOP_FORM_SHARE = 0.25;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

const fails = [];
for (const wid of WORLDS) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString());
    localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder');
  } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  // settle: the async props must have landed, or every run counts a different town
  await p.waitForFunction(() => {
    const n = window.__edibles.length;
    if (window.__lastN !== n) { window.__lastN = n; window.__stableSince = performance.now(); return false; }
    return performance.now() - (window.__stableSince || 0) > 2000;
  }, null, { timeout: 300000, polling: 250 });

  const r = await p.evaluate(() => {
    const facings = new Map(), forms = new Map();
    let n = 0, atZero = 0;
    for (const e of window.__edibles) {
      const m = e.mesh; if (!m) continue;
      n++;
      // FACING: bucket to 5 degrees. Two props a tenth of a degree apart are
      // the same facing to an eye, and floating point noise is not variety.
      const deg = Math.round((((m.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) * 180 / Math.PI / 5) * 5;
      if (Math.abs(m.rotation.y) < 1e-6) atZero++;
      facings.set(deg, (facings.get(deg) || 0) + 1);
      // FORM: vertex count plus a coarse bounding box. Same counts and same box
      // means the same object, however it was built.
      let verts = 0, meshes = 0;
      m.traverse((o) => {
        if (o.isMesh && o.geometry) { meshes++; verts += o.geometry.attributes.position ? o.geometry.attributes.position.count : 0; }
      });
      const r2 = Math.round((e.radius || 0) * 4);
      forms.set(`${meshes}:${verts}:${r2}`, (forms.get(`${meshes}:${verts}:${r2}`) || 0) + 1);
    }
    const topFacing = [...facings.entries()].sort((a, c) => c[1] - a[1])[0] || [0, 0];
    const formRank = [...forms.entries()].sort((a, c) => c[1] - a[1]);
    return { n, atZero, distinctFacings: facings.size, topFacingDeg: topFacing[0], topFacingN: topFacing[1],
      distinctForms: forms.size, topFormN: formRank.length ? formRank[0][1] : 0,
      worstForm: formRank.slice(0, 3).map(([k, v]) => `${v}x ${k}`) };
  });
  await p.close();

  const sharedFrac = r.n ? r.topFacingN / r.n : 1;
  const zeroFrac = r.n ? r.atZero / r.n : 1;
  const topFormFrac = r.n ? r.topFormN / r.n : 1;
  const bad = [];
  if (sharedFrac > MAX_SHARED_FACING) bad.push(`${(sharedFrac * 100).toFixed(0)}% of props share one facing (bar ${(MAX_SHARED_FACING * 100).toFixed(0)}%)`);
  if (topFormFrac > MAX_TOP_FORM_SHARE) bad.push(`${(topFormFrac * 100).toFixed(0)}% of the town is one form (bar ${(MAX_TOP_FORM_SHARE * 100).toFixed(0)}%)`);
  if (bad.length) fails.push(`${wid}: ${bad.join('; ')}`);

  console.log(`\n══ ${wid.toUpperCase()} ══  ${r.n} props`);
  console.log(`   facing    ${r.distinctFacings} distinct   top ${r.topFacingDeg}° holds ${r.topFacingN} (${(sharedFrac * 100).toFixed(0)}%)   never-turned ${(zeroFrac * 100).toFixed(0)}%`);
  console.log(`   form      ${r.distinctForms} distinct   biggest single form holds ${r.topFormN} (${(topFormFrac * 100).toFixed(0)}%)   top 3: ${r.worstForm.join(', ')}`);
}
await b.close();
console.log('\n  ' + (fails.length ? 'FAIL — ' + fails.join(' | ') : 'PASS — no world is stamped from one mould') + '\n');
