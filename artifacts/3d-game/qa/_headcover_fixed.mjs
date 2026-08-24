// TEAM MOVERS — is the top of a crowd person's head covered?
//
// Static geometry probe. No browser, no world, no lighting: it rebuilds the
// head exactly as life.ts builds it and asks one question — from DIRECTLY
// OVERHEAD, what share of the head's silhouette is bare skull?
//
// Why overhead and not the front: the play camera is camOffset (0.62,0.92,0.62)
// = 46.4 degrees above the ground, so the crown is the largest single facet of
// a person on screen. A hairstyle verified in a front elevation is verified in
// the one view the game never uses.
//
// Bar: <= 2%. From straight down the only legitimate skin is the sliver of brow
// at the silhouette edge; anything more is scalp. 'bald' is exempt.
import * as THREE from 'three';
const B = {
  sph:  new THREE.SphereGeometry(0.5, 16, 11),
  sphS: new THREE.SphereGeometry(0.5, 12, 8),
  dot:  new THREE.SphereGeometry(0.5, 9, 6),
  hemi: new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
  cyl:  new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  disc: new THREE.CylinderGeometry(0.5, 0.5, 1, 14),
  tri:  new THREE.CylinderGeometry(0.5, 0.5, 1, 3),
  flare:new THREE.CylinderGeometry(0.34, 0.5, 1, 14, 1, true),
  taper:new THREE.CylinderGeometry(0.4, 0.5, 1, 9, 1, true),
  box:  new THREE.BoxGeometry(1, 1, 1),
  ring: new THREE.TorusGeometry(0.42, 0.13, 5, 12),
  cone: new THREE.ConeGeometry(0.5, 1, 10),
};
const pc = (base, x=0,y=0,z=0, sx=1, sy=sx, sz=sx, rx=0,ry=0,rz=0) => {
  const g = base.clone();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz,'ZYX'));
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z), q, new THREE.Vector3(sx,sy,sz)));
  return g;
};
// life.ts:1109 — the skull, half-extents 0.53 x 0.56 x 0.495
const SKULL = pc(B.sph, 0, 0, 0.01, 1.06, 1.12, 0.99);
// life.ts:701-717 hairParts
const HAIR = {
  bald: () => [],
  buzz: () => [pc(B.hemi,0,0.03,-0.02,1.09,1.10,1.09)],
  curly:() => { const o=[pc(B.hemi,0,0.04,-0.02,1.12,1.12,1.12)];
    for(let i=0;i<5;i++){const a=i*1.2566;
      o.push(pc(B.dot,Math.sin(a)*0.35,0.28+(i%2)*0.11,Math.cos(a)*0.35-0.03,0.38));} return o; },
  short:() => [pc(B.hemi,0,0.05,-0.02,1.14,1.12,1.14)],
  bob:  () => [pc(B.hemi,0,0.05,-0.02,1.14,1.12,1.14), pc(B.flare,0,-0.16,-0.03,1.24,0.48,1.24)],
  long: () => [pc(B.hemi,0,0.05,-0.02,1.14,1.12,1.14), pc(B.box,0,-0.38,-0.30,0.70,0.86,0.34)],
  bun:  () => [pc(B.hemi,0,0.05,-0.02,1.14,1.12,1.14), pc(B.sphS,0,0.34,-0.30,0.44)],
  pony: () => [pc(B.hemi,0,0.05,-0.02,1.14,1.12,1.14), pc(B.taper,0,-0.24,-0.52,0.24,0.66,0.24,-0.5)],
  braids:()=> [pc(B.hemi,0,0.05,-0.02,1.14,1.12,1.14),
               pc(B.taper,-0.36,-0.30,-0.12,0.20,0.68,0.20), pc(B.taper,0.36,-0.30,-0.12,0.20,0.68,0.20)],
};
// life.ts:633-698 hatParts — crown-covering pieces only (brims do not matter here)
const HAT = {
  tricorn:()=>[pc(B.tri,0,0.24,0,2.0,0.09,2.0), pc(B.hemi,0,0.18,0,1.06,1.15,1.06)],
  bandana:()=>[pc(B.hemi,0,0.08,0,1.13,1.02,1.13)],
  captain:()=>[pc(B.hemi,0,0.11,0,1.16,0.92,1.16), pc(B.cyl,0,0.10,0,1.18,0.12,1.18)],
  sun:    ()=>[pc(B.disc,0,0.26,0,2.26,0.07,2.26,0.07), pc(B.hemi,0,0.19,0,1.15,0.82,1.15)],
  visor:  ()=>[pc(B.cyl,0,0.16,0,1.18,0.13,1.18)],
  toque:  ()=>[pc(B.cyl,0,0.36,0,0.90,0.54,0.90), pc(B.sphS,0,0.64,0,0.72)],
  bellhop:()=>[pc(B.cyl,0,0.30,0,0.92,0.34,0.92), pc(B.cyl,0,0.15,0,0.96,0.10,0.96)],
  bucket: ()=>[pc(B.disc,0,0.22,0,1.66,0.09,1.66), pc(B.cyl,0,0.34,0,1.16,0.40,1.16)],
  cap:    ()=>[pc(B.hemi,0,0.14,-0.02,1.17,0.94,1.17), pc(B.box,0,0.16,0.56,0.54,0.08,0.42)],
  straw:  ()=>[pc(B.disc,0,0.20,0,2.60,0.07,2.60), pc(B.hemi,0,0.14,0,1.14,0.88,1.14), pc(B.cyl,0,0.20,0,1.19,0.10,1.19)],
  hood:   ()=>[pc(B.hemi,0,0.02,-0.10,1.40,1.24,1.44), pc(B.cyl,0,-0.34,-0.06,1.30,0.30,1.34)],
  helmet: ()=>[pc(B.hemi,0,0.02,0,1.24,1.14,1.24), pc(B.cyl,0,-0.06,0,1.26,0.20,1.26)],
  shako:  ()=>[pc(B.cyl,0,0.52,0,0.96,0.86,0.96), pc(B.cyl,0,0.20,0,1.00,0.10,1.00)],
  postal: ()=>[pc(B.hemi,0,0.14,-0.02,1.17,0.94,1.17), pc(B.box,0,0.16,0.56,0.54,0.08,0.42)],
  beanie: ()=>[pc(B.hemi,0,0.10,0,1.16,1.18,1.16), pc(B.cyl,0,0.02,0,1.21,0.16,1.21)],
  flower: ()=>[pc(B.ring,0,0.14,0,1.30,1.30,1.30,Math.PI/2)],
};
const DOWN = new THREE.Vector3(0,-1,0);
function scalpShare(covers){
  const skin = new THREE.Mesh(SKULL);
  const rest = covers.map((g)=>new THREE.Mesh(g));
  const all=[skin,...rest]; all.forEach((m)=>m.updateMatrixWorld(true));
  const rc = new THREE.Raycaster();
  const N=300, R=0.95; let s=0, c=0;
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){
    const x=(i/(N-1)-0.5)*2*R, z=(j/(N-1)-0.5)*2*R;
    rc.set(new THREE.Vector3(x,4,z), DOWN);
    let best=Infinity, who=null;
    for(const m of all){ const h=rc.intersectObject(m,false); if(h.length&&h[0].distance<best){best=h[0].distance;who=m;} }
    if(who===skin) s++; else if(who) c++;
  }
  return s+c ? s/(s+c) : 0;
}
const BAR = 0.02;
let fails=0;
console.log('  HAIR (no hat)                        scalp bare from overhead');
for(const [k,f] of Object.entries(HAIR)){
  if(k==='bald') { console.log(`    ${k.padEnd(8)} exempt`); continue; }
  const v=scalpShare(f()); const bad=v>BAR; if(bad)fails++;
  console.log(`    ${k.padEnd(8)} ${(100*v).toFixed(1).padStart(6)}%   ${bad?'FAIL':'ok'}`);
}
console.log('  HAT (over a bald head)');
for(const [k,f] of Object.entries(HAT)){
  const v=scalpShare(f()); const open = k==='visor'||k==='flower';
  const bad = !open && v>BAR; if(bad)fails++;
  console.log(`    ${k.padEnd(8)} ${(100*v).toFixed(1).padStart(6)}%   ${open?'open by design':(bad?'FAIL':'ok')}`);
}
console.log(fails ? `\nFAIL — ${fails} head covering(s) leave more than ${100*BAR}% of the skull bare from directly overhead`
                  : '\nPASS — every head covering closes over the crown');

// COMPOSITE — what actually ships: hairParts runs first, then hatParts.
console.log('\n  COMPOSITE hair + hat (as makePerson builds it, life.ts:1109-1113)');
for (const h of ['short','curly','buzz']) for (const t of ['bellhop','toque','bandana','helmet','cap']) {
  const v = scalpShare([...HAIR[h](), ...HAT[t]()]);
  console.log(`    ${(h+' + '+t).padEnd(18)} ${(100*v).toFixed(1).padStart(6)}%   ${v>BAR?'FAIL':'ok'}`);
}
