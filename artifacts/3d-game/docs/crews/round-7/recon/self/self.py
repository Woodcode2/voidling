"""Measure OUR frames with the recon's methods. Usage: self.py frame.png [top_frac bot_frac]
Playfield = frame minus the HUD bands (default top 18%, bottom 10%, matching the recon's
HUD-band exclusion on theirs). Chroma=(max-min)/255 (chroma.py). Void located as the
largest connected blob whose pixels are lilac/violet (hue 255-290, chroma>0.25) or very dark
(value<0.18) within the lower-centre 60% of the playfield; diameter = blob width."""
import sys, numpy as np
from PIL import Image
fn=sys.argv[1]; top=float(sys.argv[2]) if len(sys.argv)>2 else 0.18; bot=float(sys.argv[3]) if len(sys.argv)>3 else 0.10
im=np.asarray(Image.open(fn).convert('RGB')).astype(np.float32)/255
H,W,_=im.shape; y0,y1=int(H*top),int(H*(1-bot)); pf=im[y0:y1]
mx=pf.max(2); mn=pf.min(2); ch=mx-mn; n=ch.size
print(f"{fn}: {W}x{H}; playfield rows {y0}-{y1} ({n} px)")
print(f"  chroma median {np.median(ch):.3f}  p90 {np.percentile(ch,90):.3f}  <0.12: {100*(ch<0.12).mean():.1f}%  <0.15: {100*(ch<0.15).mean():.1f}%  >0.35: {100*(ch>0.35).mean():.1f}%   value median {np.median(mx):.2f}")
# hue
r,g,b=pf[...,0],pf[...,1],pf[...,2]; d=np.where(ch>0,ch,1)
h=np.where(mx==r,(g-b)/d%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
lil=((h>250)&(h<295)&(ch>0.25)); dark=(mx<0.18)
sel=(lil|dark).copy(); sel[:int(sel.shape[0]*0.2)]=False  # lower 80% of playfield only
from scipy import ndimage
lab,k=ndimage.label(sel); 
if k:
    sizes=ndimage.sum(sel,lab,range(1,k+1)); i=int(np.argmax(sizes))+1
    ys,xs=np.where(lab==i); w=xs.max()-xs.min()+1; hh=ys.max()-ys.min()+1
    cx,cy=xs.mean(),ys.mean()+y0
    print(f"  void blob: {w}x{hh} px at ({cx:.0f},{cy:.0f}), {100*w/W:.1f}% of width, {100*hh/H:.1f}% of height, {int(sizes[i-1])} px")
    # rim: along the row through the blob centre, run-length of lilac vs dark
    row=int(ys.mean()); rl=lil[row]; rd=dark[row]
    xs_l=np.where(rl[xs.min():xs.max()+1])[0]; 
    print(f"  rim (lilac px on centre row): {len(xs_l)} of width {w} -> {100*len(xs_l)/w:.1f}% of diameter (both sides summed)")
