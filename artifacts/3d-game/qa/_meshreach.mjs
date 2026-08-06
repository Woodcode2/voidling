// Does the shipping build ever get a mesh? Count GLB responses by status, and
// measure what the load gate actually costs, per world.
import { chromium } from 'playwright';
const PORT = process.env.PORT || 4177;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
for (const wid of (process.argv[2] || 'maple').split(',')) {
  const p = await b.newPage({ viewport: { width: 430, height: 932 } });
  const glb = { ok: 0, bad: 0, codes: {} };
  const img = { ok: 0, bad: 0, codes: {} };
  p.on('response', (r) => {
    const u = r.url();
    const bag = u.includes('/assets/hf3d/') ? glb : u.includes('/assets/hf/') ? img : null;
    if (!bag) return;
    bag.codes[r.status()] = (bag.codes[r.status()] || 0) + 1;
    if (r.status() === 200) bag.ok++; else bag.bad++;
  });
  await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
    localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch {} });
  await p.goto(`http://127.0.0.1:${PORT}/?w=${wid}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });
  await p.evaluate(() => document.querySelectorAll('.show').forEach((e) => {
    if (['daily', 'gift'].includes(e.id)) e.classList.remove('show'); }));
  await p.click('#btnPlay'); await p.waitForTimeout(1200);
  const t0 = Date.now();
  await p.click(`#worldRow .wCard[data-world="${wid}"]`);
  // watch the load cover
  await p.waitForFunction(() => (window.__matchState?.().t ?? 0) > 3, null, { timeout: 600000 });
  const gateMs = Date.now() - t0;
  await p.waitForTimeout(6000);
  const r = await p.evaluate(() => {
    const counts = window.__glbCount || {};
    const placements = Object.entries(counts).reduce((a, [, n]) => a + n, 0);
    // How many edibles are LOD (mesh present) vs plain fallback groups?
    let lods = 0, tot = 0;
    for (const e of (window.__edibles || [])) { tot++; if (e.mesh && e.mesh.isLOD) lods++; }
    return { names: Object.keys(counts).length, placements, edibles: tot, lodEdibles: lods };
  });
  console.log(`${wid.padEnd(8)} gate(wall,SW-renderer)=${gateMs}ms  GLB 200=${glb.ok} non200=${glb.bad} ${JSON.stringify(glb.codes)}`
    + `  IMG 200=${img.ok} non200=${img.bad} ${JSON.stringify(img.codes)}`
    + `  glb() names=${r.names} placements=${r.placements}  edibles=${r.edibles} withMesh(LOD)=${r.lodEdibles}`);
  await p.close();
}
await b.close();
