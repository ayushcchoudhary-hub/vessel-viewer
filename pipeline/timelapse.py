import json, math, collections, datetime as dt
from sb import q
rows=[]; off=0
while True:
    b=q('positions',{'select':'mmsi,ts,area,lat,lon,sog','order':'ts.asc,mmsi.asc','limit':1000,'offset':off}); rows+=b; off+=1000
    if len(b)<1000: break
print('positions',len(rows))
BUCKET=600
end=max(r['ts'] for r in rows); endt=dt.datetime.fromisoformat(end).timestamp()
first=min(dt.datetime.fromisoformat(r['ts']).timestamp() for r in rows)
start=max(endt-24*3600, first)
tr=collections.defaultdict(dict)
for r in rows:
    m=r['mmsi']
    if not (len(str(m))==9 and str(m)[0] in '234567'): continue
    t=dt.datetime.fromisoformat(r['ts']).timestamp()
    if t<start: continue
    k=int((t-start)//BUCKET); tr[(r['area'],m)].setdefault(k,(r['lon'],r['lat']))
mm=sorted({m for _,m in tr})
ves={}
for i in range(0,len(mm),150):
    for v in q('vessels',{'select':'mmsi,name,ship_type,len_m','mmsi':'in.('+','.join(map(str,mm[i:i+150]))+')'}): ves[v['mmsi']]=v
def typ(v):
    t=v.get('ship_type') or 0; n=(v.get('name') or '').upper()
    if 'LNG' in n or 'LPG' in n: return 4
    if 80<=t<=89: return 1
    if 60<=t<=69: return 5
    if 70<=t<=79: return 2
    return 0
out={}
for (area,m),pts in tr.items():
    v=ves.get(m,{}); L=v.get('len_m') or 0
    if L and L>400: L=0
    ks=sorted(pts)
    if len(ks)<2: continue
    seq=[]; 
    for k in ks:
        lon,lat=pts[k]; seq+= [k, round(lon*1e3), round(lat*1e3)]
    out.setdefault(area,[]).append([m, typ(v), L, (v.get('name') or '')[:22], seq])
meta={'start':dt.datetime.fromtimestamp(start,dt.timezone.utc).isoformat(),'end':end,'bucket':BUCKET,'n':int((endt-start)//BUCKET)}
json.dump({'meta':meta,'areas':out},open('timelapse.json','w'),separators=(',',':'))
import os; print({a:len(v) for a,v in out.items()}, os.path.getsize('timelapse.json'))
