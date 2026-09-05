// replay the three hand-authored placements the density survey found silently missing
import { createServer } from 'vite';
const s = await createServer({ server:{middlewareMode:true}, appType:'custom', logLevel:'silent', optimizeDeps:{noDiscovery:true,include:[]} });
const SK = await s.ssrLoadModule('/src/proto3d/skylark.ts');
const REG = (id) => SK.SK_REGIONS.find(r => r.id === id);
const ux = Math.sin(Math.PI/6), uy = -Math.cos(Math.PI/6);
console.log('── BREAKFAST ROW: 4 vans at (i-1.5)*320 along 030 from the centroid');
{ const R = REG('breakfast'); let cx=0, cy=0; for (const [px,py] of R.poly) { cx+=px; cy+=py; } cx/=R.poly.length; cy/=R.poly.length;
  for (let i=0;i<4;i++){ const p=[cx+ux*(i-1.5)*320, cy+uy*(i-1.5)*320];
    console.log(`  van ${i}: land ${SK.onSkylarkLand(p[0],p[1])} region ${SK.skRegionAt(p[0],p[1])} placeable@40 ${SK.skPlaceable(p[0],p[1],40)} @71(drop) ${SK.skPlaceable(p[0],p[1],71)}`); }
  // what direction would fit? try the other heading (across) and axis
  for (const [dx,dy,tag] of [[ux,uy,'030'],[-uy,ux,'120'],[1,0,'E-W'],[0,1,'N-S']]) { let n=0; for (let i=0;i<4;i++){ const p=[cx+dx*(i-1.5)*320, cy+dy*(i-1.5)*320]; if (SK.onSkylarkLand(p[0],p[1]) && SK.skPlaceable(p[0],p[1],71)) n++; } console.log(`  heading ${tag}: ${n}/4 legal at drop clearance`); }
  // the district's own extent along each axis
  let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9; for (const [px,py] of R.poly){minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);} console.log(`  breakfast bbox x ${minX}-${maxX} y ${minY}-${maxY} centroid ${cx.toFixed(0)},${cy.toFixed(0)}`);
}
console.log('── WHALE PRECINCT: 4 kit items inside the launch circle, force=false');
for (const [dx,dy] of [[-880,250],[860,-300],[200,820],[-300,-800]]) { const p=[SK.LAUNCH.cx+dx, SK.LAUNCH.cy+dy]; console.log(`  kit at ${dx},${dy}: inCircle ${SK.inLaunchCircle(p[0],p[1])} placeable@30 ${SK.skPlaceable(p[0],p[1],30)}`); }
console.log('── SPECTATOR BAND: one car per perimeter segment, 260 OUTSIDE the track');
{ const T = SK.PERIMETER; let out=0, inn=0, outLand=0;
  for (let i=0;i<T.length-1;i++){ const [x1,y1]=T[i],[x2,y2]=T[i+1]; const mx=(x1+x2)/2,my=(y1+y2)/2; const inx=6000-mx,iny=6000-my,il=Math.hypot(inx,iny)||1;
    const po=[mx-(inx/il)*260, my-(iny/il)*260], pi=[mx+(inx/il)*260, my+(iny/il)*260];
    if (SK.onSkylarkLand(po[0],po[1])) outLand++;
    if (SK.onSkylarkLand(po[0],po[1]) && SK.skPlaceable(po[0],po[1],58)) out++;
    if (SK.onSkylarkLand(pi[0],pi[1]) && SK.skPlaceable(pi[0],pi[1],58)) inn++; }
  console.log(`  ${T.length-1} segments: outside-260 on land ${outLand}, legal ${out}; inside-260 legal ${inn}`); }
await s.close();
