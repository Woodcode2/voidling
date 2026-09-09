// Does spotFree's broadphase actually reach the biggest claims?
// reach = ceil((rWorld + 260) / CELL) hard-codes 260 as the largest claim in
// the world. Lantern's bathhouse claims 900 and Game Day's stadium 780. A
// claim of radius R conflicts with a small prop out to (R + r) * 0.82, so the
// search has to cover that far — and with reach 1 it covers as little as 400.
import { chromium } from 'playwright';
const CASES = [
  { world: 'lantern', name: 'bathhouse', claim: 900 },
  { world: 'gameday', name: 'stadium', claim: 780 },
];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
for (const c of CASES) {
  const p = await b.newPage({ viewport:{width:430,height:932}, deviceScaleFactor:1 });
  p.setDefaultTimeout(400000);
  await p.route('**/functions/v1/ingest-events', r => r.fulfill({status:200, body:'{}'}));
  await p.addInitScript(() => { try {
    localStorage.setItem('voidPlayed','1'); localStorage.setItem('voidTut','1');
    localStorage.setItem('voidUnlocked','maple,pirate,gameday,lantern,powder,skylark'); } catch {} });
  await p.goto(`http://127.0.0.1:4177/?w=${c.world}`, { waitUntil:'domcontentloaded', timeout:300000 });
  await p.waitForFunction(() => !!window.__voidState, null, { timeout:400000 });
  await p.waitForTimeout(3000);
  // The biggest prop on the world is the landmark that carries the big claim.
  const out = await p.evaluate((claimWorld) => {
    const es = window.__edibles.filter(e => e.mesh && !e.mesh.userData.mover);
    let hero = null;
    for (const e of es) if (!hero || e.radius > hero.radius) hero = e;
    const hx = hero.mesh.position.x, hz = hero.mesh.position.z;
    // world units = 3D * 20
    const conflict3d = (claimWorld + 19) * 0.82 / 20;   // a small prop's sep 0.95 -> 19 world
    let within = 0, inner = 0;
    for (const e of es) {
      if (e === hero) continue;
      const d = Math.hypot(e.mesh.position.x - hx, e.mesh.position.z - hz);
      if (d < conflict3d) { within++; if (d < claimWorld / 20) inner++; }
    }
    return { hero: hero.radius, heroAt: [+hx.toFixed(1), +hz.toFixed(1)],
      conflict3d: +conflict3d.toFixed(1), within, inner, total: es.length };
  }, c.claim);
  console.log(`${c.world}/${c.name}  claim ${c.claim} world (${(c.claim/20).toFixed(1)} units), `
    + `hero r=${out.hero} at ${out.heroAt}`);
  console.log(`   spotFree should reject anything within ${out.conflict3d} units of it: `
    + `${out.within} props are, and ${out.inner} sit INSIDE the claim radius itself`);
  await p.close();
}
await b.close();
