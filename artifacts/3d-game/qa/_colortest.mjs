import * as THREE from 'three';
console.log('ColorManagement.enabled =', THREE.ColorManagement.enabled);
const base = 0xe86a2a;                       // LEAF_A
for (const k of [0.74, 0.80, 0.70, 1.16, 1.28]) {
  const c = new THREE.Color(base).multiplyScalar(k);
  const outHex = c.getHex();
  // displayed channel ratio vs the base, in sRGB 0-255 terms
  const b = [(base>>16)&255, (base>>8)&255, base&255];
  const o = [(outHex>>16)&255, (outHex>>8)&255, outHex&255];
  const ratio = o.map((v,i)=> b[i] ? (v/b[i]).toFixed(3) : 'n/a').join(', ');
  console.log(`  x${k}  ->  #${outHex.toString(16).padStart(6,'0')}   displayed ratio per channel: ${ratio}`);
}
