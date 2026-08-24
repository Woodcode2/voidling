// Where is the hero in a frame? The void is a strongly purple/magenta blob:
// look for pixels where blue and red both exceed green by a margin.
import { PNG } from 'pngjs'; import { readFileSync } from 'node:fs';
const p = PNG.sync.read(readFileSync(process.argv[2]));
let n=0, minx=1e9,maxx=-1,miny=1e9,maxy=-1, sx=0, sy=0;
for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
  const i=(y*p.width+x)*4,r=p.data[i],g=p.data[i+1],b=p.data[i+2];
  if(b>g+22 && r>g+10 && b>60 && b<235){ n++; sx+=x; sy+=y;
    if(x<minx)minx=x; if(x>maxx)maxx=x; if(y<miny)miny=y; if(y>maxy)maxy=y; }
}
console.log(process.argv[2].split('/').pop(), 'purple px', n, `(${(100*n/(p.width*p.height)).toFixed(2)}%)`,
  n? `centroid ${(sx/n)|0},${(sy/n)|0} bbox ${minx},${miny}-${maxx},${maxy}`:'');
