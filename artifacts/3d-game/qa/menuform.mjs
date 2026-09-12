// ── THE MENU'S HERO IS ONE CREATURE, AND HIS SIZE IS FREE ────────────────────
//
// The level picker is the screen that decides whether a child taps PLAY, and the
// void on it is the whole invitation. Two things about him have to be true, and
// neither was:
//
//   1. HE IS THE SAME CREATURE ON EVERY WORLD. He was not. The menu scales him
//      to the stage (menuVoidR = dist/18, clamped 1.8-3.8) and the game derives
//      his FORM from his RADIUS (FORM_MIN[3] = 3.6), so a world whose photogenic
//      corner sits closer than 64.8 units showed a different animal. Measured on
//      the build before the fix: Maple (staged 58 units back) wore visual stage
//      2 and the other five (80-92) wore 3.
//
//   2. NO CEREMONY ON THE MENU. curStage and bestStage both start at 0 and the
//      menu's radius implies 2 or 3, so the first menu frame took the evolution
//      branch: audio.evolve(), camPunch(5), camDist *= 1.07, fx.ring, buzz(45),
//      townReacts({kind:'evolve'}) and track('evolve'). Six worlds of six, every
//      load — which means every analytics funnel over the evolve event has been
//      counting one phantom evolution per session.
//
// And a third bar, which is the one the diorama needs (docs/DIORAMA-BRIEF.md
// §11.2). A camera far enough back to frame a whole city block is 178 units out
// against today's 58-95, so holding the hero's on-screen size means multiplying
// his radius by 2-3x — which under the old coupling walked him up to WORLD
// ENDER on the level picker. With the form pinned his radius is free, so:
//
//   3. MOVING HIS MENU RADIUS DOES NOT CHANGE THE CREATURE. Set on the live
//      menu, through the game's own setter, and then checked a full second of
//      frames later — because in a live game loop anything a probe sets once is
//      a suggestion, not a state, and the frame loop is what decides.
//
// Two worlds, not six: Maple is the one that differed and Skylark is the
// furthest-staged. A third world would cost a page load and could only agree.
//
//   node qa/menuform.mjs [port]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4173';
// Maple: staged 58 units back, the only world under FORM_MIN[3]'s 64.8 and so
// the only one the old coupling dressed differently. Skylark: staged 92, the
// furthest, where he reads smallest.
const WORLDS = ['maple', 'skylark'];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });

function fail(m) { console.log('FAIL — ' + m); }
let bad = 0;
const seen = [];

try {
  for (const w of WORLDS) {
    const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
    p.on('pageerror', (e) => console.log(`  [pageerror ${w}] ` + e.message.split('\n')[0]));
    await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
    await p.addInitScript(() => { try { localStorage.clear();
      localStorage.setItem('voidPlayed', '1'); localStorage.setItem('voidTut', '1');
      localStorage.setItem('voidMute', '1');
      localStorage.setItem('voidDailyLast', new Date().toDateString());
      // all six, like the other 93 probes — a short list is what qa/worldlists.mjs
      // is for and it has caught this exact shortcut before
      localStorage.setItem('voidUnlocked', 'maple,pirate,gameday,lantern,powder,skylark');
    } catch {} });
    await p.goto(`http://127.0.0.1:${PORT}/?w=${w}&manual=1`, { waitUntil: 'domcontentloaded', timeout: 300000 });
    await p.waitForFunction(() => !!window.__menuState && window.__menuState().menuMode, null, { timeout: 420000 });
    // long enough that a first-frame ceremony has certainly fired. evolveT is
    // 0.7s of GAME time and this sandbox runs the clock at ~14x wall, so a
    // shorter wait could miss the body pop it leaves behind.
    await p.waitForTimeout(4000);

    const read = () => p.evaluate(() => {
      const T = window.__THREE, cam = window.__cam, g = window.__voidGroup();
      // WHAT HE IS WEARING is the body shader's uStage uniform, which setStage()
      // writes and nothing else reads. No new debug hook: the uniform IS the
      // dressing, so this bar cannot drift away from what a child sees.
      let bob = null, mat = null;
      g.traverse((o) => { const q = o.geometry && o.geometry.parameters;
        if (q && q.radius === 1 && q.widthSegments === 96 && q.heightSegments === 72) {
          bob = o.parent; mat = o.material; } });
      if (!bob) return { error: 'body sphere not found' };
      bob.updateWorldMatrix(true, false);
      const sc = new T.Vector3(), ctr = new T.Vector3(), q0 = new T.Quaternion();
      bob.matrixWorld.decompose(ctr, q0, sc);
      // HOW BIG A SPHERE IS ON SCREEN IS AN ANGLE, NOT A BOUNDING BOX. void3d.ts
      // computes this for its own LOD ladder; the same formula here, against the
      // body's world scale rather than voidling.radius, because dispR is a
      // spring and the two differ whenever he is changing size. An earlier
      // version projected the eight corners of his Box3 and read 289 px for a
      // body that is 180 — a cube's silhouette is up to sqrt(3) wider than the
      // ball inside it, and its near corners are closer to the camera.
      const D = ctr.distanceTo(cam.position);
      const k = 932 / (2 * D * Math.tan(cam.fov * Math.PI / 360));
      const st = window.__stages();
      return { vstage: mat.uniforms.uStage.value, cer: st.ceremonies,
        r: window.__menuState().voidR, wR: +sc.y.toFixed(2),
        camD: +D.toFixed(1), px: +(2 * sc.y * k).toFixed(1) };
    });

    const a = await read();
    if (a.error) { fail(`${w}: ${a.error}`); bad++; await p.close(); continue; }
    console.log(`  ${w.padEnd(8)} camD ${String(a.camD).padStart(5)}  r ${a.r}  worn stage ${a.vstage}  body ${a.px} px  ceremonies ${a.cer}`);
    seen.push({ w, ...a });

    if (a.cer !== 0) { fail(`${w}: the menu fired ${a.cer} evolution ceremony/ceremonies for a form nobody played for`); bad++; }

    // ── BAR 3: HIS SIZE IS FREE ────────────────────────────────────────────
    // r=12 is the diorama's working figure: at a block-filling camera 178 units
    // back it reads 219 px, the top of today's measured 135-218 px band. Under
    // the old coupling stageFor(12) is 4 and VISUAL_STAGE[4] is 3 — which
    // happens to be the same dressing, so 12 alone could not catch a
    // regression. 17 is past FORM_MIN[6] (13.5) and wears stage 4, so it can.
    for (const big of [12, 17]) {
      await p.evaluate((r) => window.__voidSetMenuR(r), big);
      // WAIT FOR THE BODY TO ARRIVE, NOT FOR A CLOCK.
      //
      // dispR chases radius through a spring (void3d.ts: dispV += (radius -
      // dispR) * 95 * dt), so the mesh is somewhere between the old size and the
      // new one for as long as that takes. A fixed 1200 ms wait is nothing here:
      // this sandbox renders 0.4-2.9 frames a second, so it can be ZERO frames,
      // and the first run of this bar failed twice on exactly that — reading
      // 3.86 and 12.69 for targets of 12 and 17 while the spring was still in
      // flight. Poll the mesh instead. If it never converges that is a real
      // finding and the timeout says so.
      const wantWR = (r) => p.waitForFunction((target) => {
        const g = window.__voidGroup(); let bob = null;
        g.traverse((o) => { const q = o.geometry && o.geometry.parameters;
          if (q && q.radius === 1 && q.widthSegments === 96 && q.heightSegments === 72) bob = o.parent; });
        if (!bob) return false;
        bob.updateWorldMatrix(true, false);
        const s = new window.__THREE.Vector3();
        bob.matrixWorld.decompose(new window.__THREE.Vector3(), new window.__THREE.Quaternion(), s);
        // 6%: his rest scale carries a breathe term, measured at +4.5% of radius
        return Math.abs(s.y - target) / target < 0.06;
      }, r, { timeout: 180000 });
      let arrived = true;
      try { await wantWR(big); } catch { arrived = false; }
      const c = await p.evaluate(() => {
        const T = window.__THREE, g = window.__voidGroup(); let mat = null, bob = null;
        g.traverse((o) => { const q = o.geometry && o.geometry.parameters;
          if (q && q.radius === 1 && q.widthSegments === 96 && q.heightSegments === 72) {
            mat = o.material; bob = o.parent; } });
        bob.updateWorldMatrix(true, false);
        // DECOMPOSE. bob carries a rotation (bob.rotation.z/x lean with travel),
        // so matrixWorld.elements[5] is not scale.y — it is m22 of a rotated
        // basis, which is how the first version of this read printed 3.86.
        const sc = new T.Vector3();
        bob.matrixWorld.decompose(new T.Vector3(), new T.Quaternion(), sc);
        return { vstage: mat.uniforms.uStage.value, cer: window.__stages().ceremonies,
          wR: +sc.y.toFixed(2), r: window.__menuState().voidR };
      });
      if (!arrived) { fail(`${w}: the body never reached menu radius ${big} — world scale stalled at ${c.wR} after 180 s of frames`); bad++; }
      console.log(`  ${w.padEnd(8)} -> menu r ${big}: worn stage ${c.vstage}, r held at ${c.r}, body scale ${c.wR}, ceremonies ${c.cer}`);
      if (c.vstage !== a.vstage) {
        fail(`${w}: menu radius ${big} changed the creature — worn stage went ${a.vstage} -> ${c.vstage}. His size and his form are still coupled, and the diorama cannot pull the camera back without promoting him on the level picker.`);
        bad++;
      }
      if (c.cer !== a.cer) { fail(`${w}: menu radius ${big} fired a ceremony (${a.cer} -> ${c.cer})`); bad++; }
      // …and the radius actually took. A bar that only checks "the form did not
      // change" passes trivially if the setter did nothing at all.
      if (Math.abs(c.r - big) > 0.01) { fail(`${w}: __voidSetMenuR(${big}) did not hold — radius is ${c.r}. Something clamped it, so bar 3 proved nothing.`); bad++; }
    }
    await p.close();
  }

  // ── BAR 1: ONE CREATURE ────────────────────────────────────────────────────
  const worn = [...new Set(seen.map((q) => q.vstage))];
  if (seen.length === WORLDS.length && worn.length > 1) {
    fail(`the menu shows ${worn.length} different creatures across ${WORLDS.length} worlds (visual stages ${worn.join(', ')}), decided by how far back each world's camera happens to sit. A child should meet the same hero every time she opens the picker.`);
    bad++;
  }
  if (seen.length !== WORLDS.length) { fail(`only ${seen.length} of ${WORLDS.length} worlds were read`); bad++; }

  if (!bad) {
    const px = seen.map((q) => q.px);
    console.log(`\nPASS — one creature (visual stage ${worn[0]}) on every world, no ceremony on the menu, and his radius moves to 17 without changing him. Body reads ${Math.min(...px)}-${Math.max(...px)} px of 932 at today's camera.`);
  }
} catch (e) {
  fail('threw: ' + (e && e.message ? e.message.split('\n')[0] : String(e)));
  bad++;
} finally {
  await b.close();
}
process.exit(bad ? 1 : 0);
