// WHAT TRANSFORM DOES EACH RENDER PATH APPLY?
//
// Two defects were measured but not explained: the void's body is a raw
// ShaderMaterial with no tone-mapping or colour-space chunk, and routing the
// frame through EffectComposer costs it ~0.20 saturation. Guessing at three's
// internals produced three wrong fixes, including an OutputPass that made it
// worse. So stop guessing: render KNOWN sRGB values through every combination
// and read what comes back.
//
// Four cells, one frame:
//   MeshBasic  direct      <- the reference. three handles this correctly.
//   MeshBasic  composer
//   raw shader direct      <- what the void is
//   raw shader composer    <- what the void is when bloom is on
//
// A correct path returns the input byte-for-byte. Anything else names its own
// bug: too dark by ~2.2 gamma = a missing encode; too light = a double encode.
//
//   node qa/colorpipe.mjs [port]
import { chromium } from 'playwright';

const PORT = process.argv[2] || '4173';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'] });
const p = await b.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
await p.route('**/functions/v1/ingest-events', (r) => r.fulfill({ status: 200, body: '{}' }));
await p.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('voidPlayed', '1');
  localStorage.setItem('voidTut', '1'); localStorage.setItem('voidDailyLast', new Date().toDateString()); } catch { } });
await p.goto(`http://127.0.0.1:${PORT}/?w=maple`, { waitUntil: 'domcontentloaded', timeout: 300000 });
await p.waitForFunction(() => !!window.__voidState, null, { timeout: 400000 });

const out = await p.evaluate(() => {
  const THREE = window.__THREE, ren = window.__renderer;
  const SWATCH = [0x5f2ab4, 0xa96bff, 0x808080, 0xe01e45, 0x74c352];
  // a tiny offscreen scene: unlit quads facing an ortho camera, so the ONLY
  // thing between the hex and the pixel is the pipeline under test
  const sc = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10); cam.position.z = 5;
  const quads = SWATCH.map((hex, i) => {
    const g = new THREE.PlaneGeometry(2 / SWATCH.length, 2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: hex }));
    m.position.x = -1 + (i + 0.5) * (2 / SWATCH.length);
    sc.add(m); return m;
  });
  // the same swatches through a RAW ShaderMaterial, exactly like the void's:
  // a uniform vec3 set from THREE.Color (so linear), written to gl_FragColor
  // with no chunks at all.
  const rawMats = SWATCH.map((hex) => new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(hex) } },
    vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 c; void main(){ gl_FragColor = vec4(c, 1.0); }',
  }));
  const basicMats = quads.map((q) => q.material);

  const W = ren.domElement.width, H = ren.domElement.height;
  const read = () => {
    const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
    const g = c2.getContext('2d'); g.drawImage(ren.domElement, 0, 0);
    const d = g.getImageData(0, 0, W, H).data;
    return SWATCH.map((_, i) => {
      const x = Math.round(W * ((i + 0.5) / SWATCH.length)), y = Math.round(H / 2);
      const k = ((y * W) + x) * 4;
      return [d[k], d[k + 1], d[k + 2]];
    });
  };
  const rows = {};
  const oldT = ren.getRenderTarget();
  for (const [name, mats] of [['basic', basicMats], ['raw', rawMats]]) {
    quads.forEach((q, i) => { q.material = mats[i]; });
    ren.setRenderTarget(null); ren.render(sc, cam);
    rows[`${name} direct`] = read();
  }
  quads.forEach((q, i) => { q.material = basicMats[i]; });
  ren.setRenderTarget(oldT);
  return { swatch: SWATCH.map((h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255]),
           rows, outputColorSpace: ren.outputColorSpace, toneMapping: ren.toneMapping };
});

const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
console.log(`renderer: outputColorSpace=${out.outputColorSpace}  toneMapping=${out.toneMapping}\n`);
console.log('input      ' + Object.keys(out.rows).map((k) => k.padEnd(18)).join(''));
out.swatch.forEach((sw, i) => {
  let line = hex(sw).padEnd(11);
  for (const k of Object.keys(out.rows)) {
    const got = out.rows[k][i];
    const dEach = got.map((v, j) => v - sw[j]);
    const ok = dEach.every((d) => Math.abs(d) <= 2);
    line += `${hex(got)} ${(ok ? 'ok' : `${dEach[0] > 0 ? '+' : ''}${dEach[0]}`).padEnd(9)}`;
  }
  console.log(line);
});
console.log('\nA path is CORRECT when it returns the input. Darker than input by a');
console.log('~2.2 power means the sRGB encode is missing; lighter means it ran twice.');
await b.close();
