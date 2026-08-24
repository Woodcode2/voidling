// mainstreet.ts personParts head: skull sph(0.36T,16,11) at 2.22T,
// hair sph(0.355T,16,9) at 2.40T scaled (1,0.58,1).  T = 1.
import * as THREE from 'three';
const mk=(g,x,y,z,sx,sy,sz)=>{const c=g.clone();
  c.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion(),new THREE.Vector3(sx,sy,sz)));return c;};
const skull=mk(new THREE.SphereGeometry(0.36,16,11),0,2.22,0,1,1,1);
const hair =mk(new THREE.SphereGeometry(0.355,16,9),0,2.40,0,1,0.58,1);
const ms=new THREE.Mesh(skull), mh=new THREE.Mesh(hair);
[ms,mh].forEach(m=>m.updateMatrixWorld(true));
const rc=new THREE.Raycaster(); const D=new THREE.Vector3(0,-1,0);
let s=0,c=0; const N=300,R=0.5;
for(let i=0;i<N;i++)for(let j=0;j<N;j++){
  const x=(i/(N-1)-0.5)*2*R, z=(j/(N-1)-0.5)*2*R;
  rc.set(new THREE.Vector3(x,6,z),D);
  const a=rc.intersectObject(ms,false), b=rc.intersectObject(mh,false);
  const da=a.length?a[0].distance:Infinity, db=b.length?b[0].distance:Infinity;
  if(da===Infinity&&db===Infinity)continue;
  if(da<db)s++; else c++;
}
console.log(`mainstreet STATIC townsperson: scalp bare from overhead ${(100*s/(s+c)).toFixed(1)}%`);
