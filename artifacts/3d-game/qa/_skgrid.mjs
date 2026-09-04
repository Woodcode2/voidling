import { createServer } from 'vite';
const s = await createServer({ server:{middlewareMode:true}, appType:'custom', logLevel:'error' });
const SK = await s.ssrLoadModule('/src/proto3d/skylark.ts');
const R = SK.SK_REGIONS.find(r=>r.id==='launchfield');
let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
for(const [px,py] of R.poly){minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);}
const ux=Math.sin(30*Math.PI/180), uy=-Math.cos(30*Math.PI/180), vx=-uy, vy=ux;
const cx=(minX+maxX)*0.5, cy=(minY+maxY)*0.5;
// clearance drop() now demands per stage: r*29, floor 40
const stageR = [1.4, 5.2, 4.6, 4.8];
for (const [PA,PC,I,J] of [[235,258,14,13],[285,258,17,15],[270,250,18,16],[260,244,19,17],[250,238,20,18]]) {
  let nodes=0, kept=0, n=0;
  for(let i=-I;i<=I;i++) for(let j=-J;j<=J;j++){
    const along=i*PA + (j%2? PA*0.5:0), across=j*PC;
    const p=[cx+ux*along+vx*across, cy+uy*along+vy*across];
    if(!SK.pointInPoly(p[0],p[1],R.poly)) continue;
    if(!SK.skPlaceable(p[0],p[1],130)) continue;
    nodes++;
    const stage = n%14<2?0 : n%14<6?1 : n%14<9?2 : 3; n++;
    if(SK.skPlaceable(p[0],p[1],Math.max(40, stageR[stage]*29))) kept++;
  }
  // min separation in 3D units
  const same=PA/20, diag=Math.hypot(PA/2,PC)/20;
  console.log(`pitch ${PA}x${PC} sweep ±${I}/±${J}: ${nodes} nodes, ${kept} pass drop's clearance | same-row ${same.toFixed(2)} diag ${diag.toFixed(2)} (need 13.6)`);
}
await s.close();
