import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
// connected components of EXACTLY rgb(0,0,0) inside the play area
for(const f of process.argv.slice(2)){
  const p=PNG.sync.read(readFileSync(f)); const W=p.width,H=p.height;
  const y0=340,y1=H-300;
  const seen=new Uint8Array(W*H); const blobs=[];
  const isB=(x,y)=>{const i=(y*W+x)*4;return p.data[i]===0&&p.data[i+1]===0&&p.data[i+2]===0;};
  for(let y=y0;y<y1;y++)for(let x=0;x<W;x++){
    const id=y*W+x; if(seen[id]||!isB(x,y))continue;
    let n=0,minx=x,maxx=x,miny=y,maxy=y; const st=[id]; seen[id]=1;
    while(st.length){const c=st.pop();const cy=(c/W)|0,cx=c-cy*W;n++;
      if(cx<minx)minx=cx;if(cx>maxx)maxx=cx;if(cy<miny)miny=cy;if(cy>maxy)maxy=cy;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;
        if(nx<0||ny<y0||nx>=W||ny>=y1)continue;const ni=ny*W+nx;
        if(!seen[ni]&&isB(nx,ny)){seen[ni]=1;st.push(ni);}}}
    if(n>=700)blobs.push({n,x:minx,y:miny,w:maxx-minx+1,h:maxy-miny+1,fill:(n/((maxx-minx+1)*(maxy-miny+1))*100).toFixed(0)});
  }
  blobs.sort((a,b)=>b.n-a.n);
  console.log(`${f}  pure-black blobs >=700px in the play area: ${blobs.length}`);
  for(const b of blobs.slice(0,12)) console.log(`   ${String(b.n).padStart(6)}px  at ${b.x},${b.y}  ${b.w}x${b.h}  bbox-fill ${b.fill}%`);
}
