import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
const hull=(pts)=>{pts=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],up=[];
 for(const p of pts){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}
 for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}
 lo.pop();up.pop();return lo.concat(up);};
const area=(h)=>{let a=0;for(let i=0;i<h.length;i++){const j=(i+1)%h.length;a+=h[i][0]*h[j][1]-h[j][0]*h[i][1];}return Math.abs(a)/2;};
const [src,X,Y,W,H]=[process.argv[2],+process.argv[3],+process.argv[4],+process.argv[5],+process.argv[6]];
const p=PNG.sync.read(readFileSync(src));
const seen=new Uint8Array(p.width*p.height);
const isB=(x,y)=>{const i=(y*p.width+x)*4;return p.data[i]===0&&p.data[i+1]===0&&p.data[i+2]===0;};
const out=[];
for(let y=Y;y<Y+H;y++)for(let x=X;x<X+W;x++){
  const id=y*p.width+x; if(seen[id]||!isB(x,y))continue;
  const st=[[x,y]],pts=[]; seen[id]=1;
  while(st.length){const c=st.pop();pts.push(c);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=c[0]+dx,ny=c[1]+dy;
      if(nx<0||ny<0||nx>=p.width||ny>=p.height)continue;
      const nid=ny*p.width+nx; if(seen[nid]||!isB(nx,ny))continue; seen[nid]=1; st.push([nx,ny]);}}
  if(pts.length<200)continue;
  out.push({n:pts.length, sol: pts.length/Math.max(1,area(hull(pts))), x, y});
}
out.sort((a,b)=>b.n-a.n);
for(const o of out.slice(0,6)) console.log(`  ${String(o.n).padStart(6)} px  solidity ${o.sol.toFixed(3)}  at ${o.x},${o.y}`);
