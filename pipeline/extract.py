import os
import json, math, datetime as dt
from sb import q
D=json.load(open(os.environ.get('GEO_JSON','data/geo.json')))
now=dt.datetime.now(dt.timezone.utc)
since=(now-dt.timedelta(minutes=60)).isoformat()
pos=[]; off=0
while True:
    b=q('positions',{'select':'mmsi,ts,area,lat,lon,sog,cog,heading,nav_status','ts':'gte.'+since,'order':'ts.asc','limit':1000,'offset':off})
    pos+=b; off+=1000
    if len(b)<1000: break
ves={}; mm=sorted({p['mmsi'] for p in pos})
for i in range(0,len(mm),150):
    for v in q('vessels',{'select':'*','mmsi':'in.('+','.join(map(str,mm[i:i+150]))+')'}): ves[v['mmsi']]=v
tracks={}
for p in pos: tracks.setdefault(p['mmsi'],[]).append(p)
def nm(a,b):
    k=math.cos(math.radians(a[1])); return math.hypot((b[0]-a[0])*k*60,(b[1]-a[1])*60)
out={}
for cid,c in D['cities'].items():
    rows=[]
    for m,tr in tracks.items():
        last=tr[-1]
        if last['area']!=cid: continue
        if not (len(str(m))==9 and str(m)[0] in '234567'): continue
        v=ves.get(m,{})
        d=nm(c['you'],[last['lon'],last['lat']])
        rows.append(dict(mmsi=m, name=v.get('name'), type=v.get('ship_type'), len=v.get('len_m'), beam=v.get('beam_m'), dest=v.get('destination'), eta=v.get('eta'), draught=v.get('draught'), imo=v.get('imo'),
            lat=last['lat'], lon=last['lon'], sog=last['sog'], cog=last['cog'], hdg=last['heading'], nav=last['nav_status'], ts=last['ts'], d=round(d,2), n=len(tr),
            track=[[p['lon'],p['lat']] for p in tr]))
    out[cid]=rows
    near=[r for r in rows if r['d']<16]
    big=[r for r in near if (r['len'] or 0)>=80]
    print(cid,'ships',len(rows),'within16nm',len(near),'big(>=80m)',len(big),'with type',sum(1 for r in near if r['type']))
    for r in sorted(big,key=lambda r:r['d'])[:8]: print('   ',r['name'],r['type'],r['len'],r['d'],'nm',r['sog'],'kn',r['dest'])
# every ship seen in the last 24 h per area, for the "where they're heading" view
first=q('positions',{'select':'ts','order':'ts.asc','limit':1})[0]['ts']
day=max(now-dt.timedelta(hours=24), dt.datetime.fromisoformat(first)).isoformat(); seen={}; off=0
while True:
    b=q('positions',{'select':'mmsi,area','ts':'gte.'+day,'order':'ts.asc,mmsi.asc','limit':1000,'offset':off}); off+=1000
    for p in b:
        if len(str(p['mmsi']))==9 and str(p['mmsi'])[0] in '234567': seen.setdefault(p['area'],set()).add(p['mmsi'])
    if len(b)<1000: break
allm=sorted(set().union(*seen.values())) if seen else []
vall={}
for i in range(0,len(allm),150):
    for v in q('vessels',{'select':'mmsi,name,ship_type,len_m,destination','mmsi':'in.('+','.join(map(str,allm[i:i+150]))+')'}): vall[v['mmsi']]=v
day24={a:[vall[m] for m in ms if m in vall] for a,ms in seen.items()}
print({a:len(v) for a,v in day24.items()})
json.dump({'captured':now.isoformat(),'cities':out,'day24':day24,'dayStart':day},open('live.json','w'))
