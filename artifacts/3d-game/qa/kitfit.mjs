// ── EVERY PROP SITS ON THE GROUND ───────────────────────────────────────────
//
//   node qa/kitfit.mjs [kitFile]        default: src/proto3d/skyfield.ts
//
// y = 0 IS THE GROUND PLANE. It is the first house rule every prop kit in this
// game states, and it is the one nothing checks: a prop whose lowest vertex sits
// above zero FLOATS, and one whose lowest vertex sits below zero is BURIED, and
// from the play camera both read as a rendering fault rather than as a mistake.
//
// qa/placement.mjs catches them, but only in a browser, only for props that
// actually got placed, and it reports a COORDINATE — so a kit with one bad
// factory shows up as four hundred offences at four hundred different places,
// which is how SKYLARK FIELD's first populate run filed 2,477 'sunk' and 43
// 'float' with no clue which of fifty factories was at fault.
//
// This instantiates every exported skXxx() factory in Node, off-screen, with no
// browser and no port, and reports each one's own bounding box. One line per
// factory, and the culprit names itself.
import * as THREE from 'three';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const FILE = process.argv[2] || 'src/proto3d/skyfield.ts';
const NAME = path.basename(FILE, '.ts');

// tsx is not available here, so the kit is loaded through vite's own transform
const { createServer } = await import('vite');
const server = await createServer({ configFile: false, appType: 'custom', server: { middlewareMode: true }, logLevel: 'error' });
let kit;
try {
  kit = await server.ssrLoadModule(pathToFileURL(path.resolve(FILE)).href);
} finally { /* server closed below */ }

const FLOAT_TOL = 0.30;   // the same bar qa/placement.mjs uses
const SUNK_TOL = 0.06;    // a hair of overlap is fine; a buried base is not
const PARTS_MAX = 140;    // the house rule, stated in every kit header

let bad = 0;
const rows = [];
for (const [name, fn] of Object.entries(kit)) {
  if (!name.startsWith('sk') || typeof fn !== 'function') continue;
  let obj;
  try { obj = fn(); } catch (e) { rows.push([name, 'THREW', String(e.message).slice(0, 60)]); bad++; continue; }
  const box = new THREE.Box3().setFromObject(obj);
  let tris = 0, meshes = 0;
  obj.traverse((o) => { if (o.isMesh) { meshes++; const p = o.geometry.getAttribute('position'); if (p) tris += p.count / 3; } });
  const minY = box.min.y, maxY = box.max.y;
  const w = box.max.x - box.min.x, d = box.max.z - box.min.z;
  const floats = minY > FLOAT_TOL;
  const sunk = minY < -SUNK_TOL;
  const many = meshes > 1;
  if (floats || sunk || many) bad++;
  rows.push([name,
    floats ? 'FLOAT' : sunk ? 'SUNK' : many ? 'MULTI' : 'ok',
    `minY ${minY.toFixed(3)}  h ${(maxY - minY).toFixed(2)}  foot ${w.toFixed(1)}x${d.toFixed(1)}  meshes ${meshes}  tris ${Math.round(tris)}`]);
}
await server.close();

console.log(`${NAME} — ${rows.length} factories\n`);
for (const [n, v, d] of rows) console.log(`  ${v === 'ok' ? 'ok   ' : v.padEnd(5)} ${n.padEnd(26)} ${d}`);
console.log('');
console.log(`  bars: floats if minY > ${FLOAT_TOL}, buried if minY < -${SUNK_TOL}, and ONE mesh per prop`);
console.log(bad
  ? `FAIL — kitfit: ${bad} factory/factories do not sit on the ground plane, or are not one mesh`
  : `PASS — kitfit: every factory sits on y=0 and is a single merged mesh`);
if (bad) process.exitCode = 1;
