import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
const [src,X,Y,W,H]=[process.argv[2],+process.argv[3],+process.argv[4],+process.argv[5],+process.argv[6]];
const p=PNG.sync.read(readFileSync(src));
const seen=new Uint8Array(p.width*p.height);
const isB=(x,y)=>{const i=(y*p.width+x)*4;return p.data[i]===0&&p.data[i+1]===0&&p.data[i+2]===0;};
const blobs=[];
for(let y=Y;y<Y+H;y++)for(let x=X;x<X+W;x++){
  const id=y*p.width+x; if(seen[id]||!isB(x,y))continue;
  const st=[[x,y]]; seen[id]=1; let n=0,minx=x,maxx=x,miny=y,maxy=y;
  while(st.length){const [cx,cy]=st.pop();n++;
    if(cx<minx)minx=cx; if(cx>maxx)maxx=cx; if(cy<miny)miny=cy; if(cy>maxy)maxy=cy;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;
      if(nx<0||ny<0||nx>=p.width||ny>=p.height)continue;
      const nid=ny*p.width+nx; if(seen[nid]||!isB(nx,ny))continue; seen[nid]=1; st.push([nx,ny]);}}
  blobs.push({n,w:maxx-minx+1,h:maxy-miny+1,x:minx,y:miny,fill:n/((maxx-minx+1)*(maxy-miny+1))});
}
blobs.sort((a,b)=>b.n-a.n);
for(const b of blobs.slice(0,6)) console.log(`  ${String(b.n).padStart(6)} px  ${b.w}x${b.h} at ${b.x},${b.y}  bboxfill ${(100*b.fill).toFixed(0)}%`);
