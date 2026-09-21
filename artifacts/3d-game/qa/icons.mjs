// ── THE GOAL'S PICTURE, RENDERED FROM THE GAME'S OWN PROP ───────────────────
//
//   node qa/icons.mjs [port] [outdir]
//
// docs/MENU-BRIEF.md §1.4 ("Icons are the game's art") asks for pip and goal
// icons to be "sprites rendered from our own props at build time, not glyphs",
// and names a `qa/icons.mjs` to do it. That file was never written.
//
// It matters for the one question the menu cannot answer today. The ladder's
// goal line says EAT THE BARN and the HERE flag points at a circle with the
// numeral 3 in it, so a six-year-old who cannot read is told to eat a thing she
// has never seen, by a symbol for grown-ups. A picture of the actual barn, in
// the dot the flag already points at, is the other half of the owner's own
// sentence — "keeping the floating islands pictures for each level WITH THE
// LEVEL STEPS - maybe an arrow or something floating above the current level".
// The arrow half shipped as the flag.
//
// WHY A RENDER AND NOT A DRAWING. A hand-drawn barn and the world's barn are
// two different objects, and the child has to recognise the second from the
// first. Rendering the real prop makes them the same object by construction —
// which is the reason §1.4 chose this route, and the reason it also specified a
// staleness gate: a later art pass on the prop would otherwise leave a correct
// icon of a building that no longer exists.
//
// THE BRIEF'S PROP LIST IS STALE AND IS NOT USED. §1.4 names "Town Hall,
// Royal Mariner, Stadium, Bathhouse, Lodge, hangar". LEVEL_SPEC now names barn,
// lookout, clock tower, gate, bell tower, hangar — five of six have moved. So
// this asks the GAME which prop is the landmark, by the same `userData.landmark`
// tag that beginMatch resolves goalProp from (prototype3d.ts ~:9119), and can
// never drift from what dot 3 actually asks for.
//
// THE FRAME IS FROZEN, NOT RACED. animate() drives the camera every frame, so
// pointing it at a prop and then screenshotting is a race this sandbox loses at
// one frame per two seconds. requestAnimationFrame is replaced with a no-op
// first — animate() schedules its successor at the end of each pass, so the
// loop stops after the current one — and the frame is then composed and drawn
// on demand through __renderer.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.argv[2] || '4177';
const OUT = process.argv[3] || 'qa-out/pips';
const WORLDS = ['maple', 'pirate', 'gameday', 'lantern', 'powder', 'skylark'];
const PX = 256;                    // rendered at 256, the pip shows it at 44-52

mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const rows = [];

for (const w of WORLDS) {
  const p = await b.newPage({ viewport: { width: PX, height: PX }, deviceScaleFactor: 2 });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => (window.__edibles || []).length > 500, null, { timeout: 600000 });

  const info = await p.evaluate(() => {
    const THREE = window.__THREE, scene = window.__scene, cam = window.__cam;
    window.requestAnimationFrame = () => 0;          // the loop stops after this pass
    const lm = (window.__edibles || []).find((e) => e.mesh && e.mesh.userData && e.mesh.userData.landmark);
    if (!lm) return { found: false };
    // frame it: a three-quarter view from slightly above, filling the square
    const box = new THREE.Box3().setFromObject(lm.mesh);
    const size = box.getSize(new THREE.Vector3());
    const mid = box.getCenter(new THREE.Vector3());
    const reach = Math.max(size.x, size.y, size.z);
    const d = reach * 2.15;
    cam.position.set(mid.x + d * 0.72, mid.y + d * 0.52, mid.z + d * 0.72);
    cam.lookAt(mid.x, mid.y + size.y * 0.05, mid.z);
    cam.fov = 32; cam.near = 0.1; cam.far = d * 12; cam.updateProjectionMatrix();
    // HIDE THE DOM, NOT THE SCENE. The first cut walked the scene and hid every
    // mesh that was not a descendant of the landmark — and rendered three of six
    // worlds as an empty purple square, because this repo MERGES props: the
    // geometry the child actually sees is inside a shared merged mesh that is
    // not the landmark's descendant, so hiding "everything else" hid the
    // building too. Framing tightly does the same job with none of that risk,
    // and shows the prop where it stands, which is what she will be looking for.
    for (const c of Array.from(document.body.children)) {
      if (c.tagName !== 'CANVAS') c.style.display = 'none';
    }
    window.__renderer.render(scene, cam);
    return { found: true, name: String(lm.mesh.userData.landmark),
      size: [+size.x.toFixed(1), +size.y.toFixed(1), +size.z.toFixed(1)],
      at: [Math.round(mid.x), Math.round(mid.z)] };
  });

  if (!info.found) { rows.push({ w, err: 'no prop carries userData.landmark' }); await p.close(); continue; }
  const cv = await p.$('canvas');
  await cv.screenshot({ path: `${OUT}/${w}-landmark.png` });
  rows.push({ w, ...info });
  await p.close();
}
await b.close();

console.log(`\n  RENDERED FROM THE LIVE PROPS, not from a list — ${OUT}/\n`);
for (const r of rows) {
  console.log(r.err ? `  BAD  ${r.w.padEnd(9)} ${r.err}`
    : `  ok   ${r.w.padEnd(9)} "${r.name}"  ${r.size.join(' x ')} units at (${r.at})`);
}
const bad = rows.filter((r) => r.err);
console.log(bad.length
  ? `\nFAIL — ${bad.length} world(s) have no prop tagged userData.landmark, so dot 3 has nothing to point at there\n`
  : `\nPASS — all ${rows.length} worlds rendered their own dot-3 landmark\n`);
process.exit(bad.length ? 1 : 0);
