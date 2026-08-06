// Does the proposed fix survive three's mergeGeometries? No GL needed.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const mk = (uv, u8) => {
  const g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  const n = g.attributes.position.count;
  if (!uv) g.deleteAttribute('uv');
  if (u8) {
    const c = new Uint8Array(n * 3); c.fill(128);
    g.setAttribute('color', new THREE.Uint8BufferAttribute(c, 3, true));
  } else {
    const c = new Float32Array(n * 3); c.fill(0.5);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  return g;
};
const bytes = (g) => { let b = 0; for (const k in g.attributes) b += g.attributes[k].array.byteLength; return b; };

for (const [label, uv, u8] of [['baseline f32+uv', true, false], ['no-uv f32', false, false],
                               ['no-uv u8', false, true], ['uv + u8', true, true]]) {
  const parts = [mk(uv, u8), mk(uv, u8), mk(uv, u8)];
  const m = mergeGeometries(parts, false);
  console.log(label.padEnd(18), m ? `OK attrs=${Object.keys(m.attributes).sort().join('+')} bytes=${bytes(m)} colorNorm=${m.attributes.color.normalized} type=${m.attributes.color.array.constructor.name}`
    : 'MERGE RETURNED NULL');
}
// mixed: one part keeps uv, one doesn't -> must fail, proving the delete has to be uniform
const mixed = mergeGeometries([mk(true, false), mk(false, false)], false);
console.log('mixed uv       ', mixed ? 'OK (unexpected)' : 'NULL as expected');
// mixed: one f32 colour, one u8 colour
const mixed2 = mergeGeometries([mk(false, false), mk(false, true)], false);
console.log('mixed colour ty', mixed2 ? `OK type=${mixed2.attributes.color.array.constructor.name} norm=${mixed2.attributes.color.normalized}` : 'NULL');

// what does mergeAttributes do about normalized / array type?
const src = await import('fs');
const txt = src.readFileSync('/home/user/voidling/artifacts/3d-game/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js', 'utf8');
const i = txt.indexOf('function mergeAttributes');
console.log('\n--- mergeAttributes ---\n' + txt.slice(i, i + 1500));
