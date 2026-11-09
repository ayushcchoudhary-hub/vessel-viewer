import json, math
D=json.load(open('os.environ.get('GEO_JSON','data/geo.json')')); R=json.load(open('real_ships.json')); B=json.load(open('board.json'))
def nm(a,b):
    k=math.cos(math.radians(a[1])); return math.hypot((b[0]-a[0])*k*60,(b[1]-a[1])*60)
def brg(a,b):
    k=math.cos(math.radians(a[1])); return (math.degrees(math.atan2((b[0]-a[0])*k,(b[1]-a[1])))+360)%360
out={'cities':{},'worldDots':D['worldDots'],'board':B,'captured':R['captured']}
for cid,c in D['cities'].items():
    c=dict(c); c['ships']=R['ships'][cid]; c.pop('hub',None)
    for sh in c['ships']:
        if sh['type']=='other' and sh.get('ais_type') and 70<=sh['ais_type']<=79: sh['type']='cargo'
    # chart: zoom to the visible range around the viewpoint
    r=7.5/60; k=math.cos(math.radians(c['you'][1]))
    c['bbox']=[c['you'][0]-r/k*1.25, c['you'][1]-r, c['you'][0]+r/k*1.25, c['you'][1]+r]
    lp=c['landProfile']; vis=[]
    for s in c['ships']:
        p=s['b'] or s['a']; d=nm(c['you'],p); b=brg(c['you'],p); L=lp[round(b*2)%720]
        if (L is None or L>d) and d<14: vis.append((b,(s['len'] or 50)/(1+d)))
    best=max(range(0,360,2),key=lambda f:sum(w for b,w in vis if abs((b-f+540)%360-180)<=28))
    c['face']=best; c['nVisible']=len(vis)
    print(cid,'ships',len(c['ships']),'visible',len(vis),'face',best,'in view',sum(1 for b,w in vis if abs((b-best+540)%360-180)<=28))
    out['cities'][cid]=c
json.dump(out,open('data4.json','w'),separators=(',',':'))
import os; print(os.path.getsize('data4.json'))
