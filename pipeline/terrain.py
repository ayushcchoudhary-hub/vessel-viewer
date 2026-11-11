import os
import math, json, os, io, urllib.request, ssl
from PIL import Image
ctx=ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE'))
D=json.load(open(os.environ.get('DATA_JSON','data4.json')))
Z=12; R_E=6371000; K_REF=0.13; H_OBS=3.0
def tile(x,y):
    f=f'data/tiles/{Z}_{x}_{y}.png'
    if not os.path.exists(f):
        r=urllib.request.Request(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png',headers={'User-Agent':'vessel-viewer/0.1'})
        open(f,'wb').write(urllib.request.urlopen(r,context=ctx,timeout=60).read())
    return Image.open(f).convert('RGB').load()
CACHE={}
def elev(lon,lat):
    n=2**Z; xf=(lon+180)/360*n; yf=(1-math.log(math.tan(math.radians(lat))+1/math.cos(math.radians(lat)))/math.pi)/2*n
    x,y=int(xf),int(yf)
    if (x,y) not in CACHE: CACHE[(x,y)]=tile(x,y)
    px=CACHE[(x,y)][min(255,int((xf-x)*256)),min(255,int((yf-y)*256))]
    return px[0]*256+px[1]+px[2]/256-32768
out={}
for cid,c in D['cities'].items():
    lon0,lat0=c['you']; k=math.cos(math.radians(lat0)); prof=[]
    for i in range(720):
        b=math.radians(i*.5); best=None; d=30.0; wet=False
        while d<45000:
            lon=lon0+math.sin(b)*d/111320/k; lat=lat0+math.cos(b)*d/111320
            e=elev(lon,lat)
            if not wet:
                if e<=0.5: wet=True
                elif d>1200: break
            elif e>1:
                drop=d*d/(2*R_E)*(1-K_REF)
                ang=math.degrees(math.atan2(e-drop-H_OBS,d))
                if best is None or ang>best[0]: best=(ang,d,e)
            d+= 40 if d<2000 else (100 if d<10000 else 250)
        prof.append(None if best is None else [round(best[0],3),round(best[1]/1852,2),round(best[2])])
    out[cid]=prof
    vals=[p for p in prof if p]
    top=max(vals,key=lambda p:p[0]) if vals else None
    print(cid,'bearings with land',len(vals),'highest skyline angle',top,'tiles',len(CACHE))
json.dump(out,open('skyline.json','w'))
