import { createServer } from 'vite';
const s = await createServer({ server:{middlewareMode:true}, appType:'custom', logLevel:'silent', optimizeDeps:{noDiscovery:true,include:[]} });
const SK = await s.ssrLoadModule('/src/proto3d/skylark.ts');
const R = SK.SK_REGIONS.find(r => r.id === 'breakfast');
const ok = (p) => SK.pointInPoly(p[0],p[1],R.poly) && SK.skPlaceable(p[0],p[1],71);
const rows=[];
for (let deg=0; deg<180; deg+=10) { const dx=Math.sin(deg*Math.PI/180), dy=-Math.cos(deg*Math.PI/180), nx=-dy, ny=dx;
  for (const pitch of [300,280,260,240]) for (let ax=7200; ax<=8500; ax+=40) for (let ay=4500; ay<=5330; ay+=40) {
    let n=0, minClear=1e9; const seats=[]; for (let i=0;i<4;i++){ const p=[ax+dx*(i-1.5)*pitch, ay+dy*(i-1.5)*pitch]; if (ok(p)) n++; seats.push(p); }
    if (n===4) { // margin: how far can the row shift across before a seat fails?
      let m=0; for (const d of [40,80,120,160]) { if (seats.every(p=>ok([p[0]+nx*d,p[1]+ny*d])) && seats.every(p=>ok([p[0]-nx*d,p[1]-ny*d]))) m=d; else break; }
      rows.push({deg,pitch,ax,ay,m}); } } }
rows.sort((a,b)=> b.pitch-a.pitch || b.m-a.m);
console.log(`${rows.length} full rows; best:`); for (const r of rows.slice(0,6)) console.log(' ', JSON.stringify(r));
await s.close();
