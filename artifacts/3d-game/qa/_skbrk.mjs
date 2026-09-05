// where can a row of four vans actually go in the breakfast district?
import { createServer } from 'vite';
const s = await createServer({ server:{middlewareMode:true}, appType:'custom', logLevel:'silent', optimizeDeps:{noDiscovery:true,include:[]} });
const SK = await s.ssrLoadModule('/src/proto3d/skylark.ts');
const R = SK.SK_REGIONS.find(r => r.id === 'breakfast');
let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9; for (const [px,py] of R.poly){minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);}
const pts=[]; for (let x=minX;x<=maxX;x+=20) for (let y=minY;y<=maxY;y+=20) if (SK.pointInPoly(x,y,R.poly) && SK.skPlaceable(x,y,71)) pts.push([x,y]);
let tot=0; for (let x=minX;x<=maxX;x+=20) for (let y=minY;y<=maxY;y+=20) if (SK.pointInPoly(x,y,R.poly)) tot++;
const cx=pts.reduce((a,p)=>a+p[0],0)/pts.length, cy=pts.reduce((a,p)=>a+p[1],0)/pts.length;
console.log(`breakfast: ${tot} interior samples, ${pts.length} legal for a van (${(100*pts.length/tot).toFixed(0)}%); legal centroid ${cx.toFixed(0)},${cy.toFixed(0)} (polygon centroid 7829,4930)`);
console.log('poly', JSON.stringify(R.poly));
// best row: for each heading, slide the 4-van row (pitch 300) through the legal centroid and count legal seats
for (const deg of [0,30,60,90,120,150]) { const dx=Math.sin(deg*Math.PI/180), dy=-Math.cos(deg*Math.PI/180);
  let best=0, bo=0; for (let off=-600; off<=600; off+=50) { let n=0; for (let i=0;i<4;i++){ const p=[cx+dx*((i-1.5)*300+off), cy+dy*((i-1.5)*300+off)]; if (SK.pointInPoly(p[0],p[1],R.poly) && SK.skPlaceable(p[0],p[1],71)) n++; } if (n>best){best=n;bo=off;} }
  console.log(`  heading ${deg}: best ${best}/4 at offset ${bo}`); }
await s.close();
