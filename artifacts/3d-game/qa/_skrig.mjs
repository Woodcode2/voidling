import { createServer } from 'vite';
const s = await createServer({ server:{middlewareMode:true}, appType:'custom', logLevel:'silent', optimizeDeps:{noDiscovery:true,include:[]} });
const SK = await s.ssrLoadModule('/src/proto3d/skylark.ts');
const R = SK.SK_REGIONS.find(r=>r.id==='arrivals');
let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
for(const [px,py] of R.poly){minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);}
const cx=(minX+maxX)*0.5, cy=(minY+maxY)*0.5;
console.log('arrivals bbox',minX,maxX,minY,maxY,'centre',cx,cy);
for (const [ux,uy,vx,vy,tag] of [[Math.sin(30*Math.PI/180),-Math.cos(30*Math.PI/180),Math.cos(30*Math.PI/180),Math.sin(30*Math.PI/180),'030'],[1,0,0,1,'axis']]) {
  for (const [PA,PC,cl] of [[250,280,130],[250,280,60],[200,220,60],[180,200,40]]) {
    let n=0;
    for(let i=-8;i<=8;i++) for(let j=-7;j<=7;j++){
      const p=[cx+ux*(i*PA+(j%2?PA/2:0))+vx*j*PC, cy+uy*(i*PA+(j%2?PA/2:0))+vy*j*PC];
      if(SK.pointInPoly(p[0],p[1],R.poly) && SK.skPlaceable(p[0],p[1],cl)) n++;
    }
    console.log(`${tag} pitch ${PA}x${PC} clear ${cl}: ${n} rig nodes`);
  }
}
// what is the arrivals polygon's own clearance? sample the interior
let inside=0, ok130=0, ok60=0;
for(let k=0;k<20000;k++){const x=minX+Math.random()*(maxX-minX), y=minY+Math.random()*(maxY-minY); if(!SK.pointInPoly(x,y,R.poly)) continue; inside++; if(SK.skPlaceable(x,y,130)) ok130++; if(SK.skPlaceable(x,y,60)) ok60++;}
console.log(`interior: ${inside} samples, placeable@130 ${(100*ok130/inside).toFixed(1)}%, @60 ${(100*ok60/inside).toFixed(1)}%`);
await s.close();
