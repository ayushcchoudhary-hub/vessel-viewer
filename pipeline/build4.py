import json, math, os
D=json.load(open(os.environ.get('GEO_JSON','data/geo.json'))); LIVE=json.load(open('live.json')); R=json.load(open('real_ships.json')); B=json.load(open('board.json'))
def nm(a,b):
    k=math.cos(math.radians(a[1])); return math.hypot((b[0]-a[0])*k*60,(b[1]-a[1])*60)
def brg(a,b):
    k=math.cos(math.radians(a[1])); return (math.degrees(math.atan2((b[0]-a[0])*k,(b[1]-a[1])))+360)%360
import re, csv
_src=open('build_real.py').read(); exec(_src[_src.index('# ---------- UN/LOCODE'):_src.index('# ---------- snap GFW')]+_src[_src.index('PORTALIAS={'):_src.index('CITYCC=')])
import collections
SKY=json.load(open(os.environ.get('SKYLINE_JSON','data/skyline.json')))
out={'db':json.load(open('db_stats.json')),'cities':{},'worldDots':D['worldDots'],'board':B,'captured':R['captured']}
for cid,c in D['cities'].items():
    c=dict(c); c['ships']=R['ships'][cid]; c.pop('hub',None)
    for sh in c['ships']:
        if sh['type']=='other' and sh.get('ais_type') and 70<=sh['ais_type']<=79: sh['type']='cargo'
    # chart: zoom to the visible range around the viewpoint
    c['bboxWide']=list(c['bbox'])
    r=7.5/60; k=math.cos(math.radians(c['you'][1]))
    c['bbox']=[c['you'][0]-r/k*1.25, c['you'][1]-r, c['you'][0]+r/k*1.25, c['you'][1]+r]
    lp=c['landProfile']; vis=[]
    for s in c['ships']:
        p=s['b'] or s['a']; d=nm(c['you'],p); b=brg(c['you'],p); L=lp[round(b*2)%720]
        if (L is None or L>d) and d<14: vis.append((b,(s['len'] or 50)/(1+d)))
    best=max(range(0,360,2),key=lambda f:(sum(1 for b,w in vis if abs((b-f+540)%360-180)<=25), sum(w for b,w in vis if abs((b-f+540)%360-180)<=25)))
    c['face']=best; c['nVisible']=len(vis)
    print(cid,'ships',len(c['ships']),'visible',len(vis),'face',best,'in view',sum(1 for b,w in vis if abs((b-best+540)%360-180)<=28))
    c['skyline']=SKY[cid]
    feat={s['mmsi'] for s in c['ships']}
    c['allShips']=[[round(r['lon'],4),round(r['lat'],4),r['type'] or 0,r['len'] or 0,round(r['cog'] or 0),r['name'] or '',1 if (r['sog'] or 0)>1.5 else 0] for r in LIVE['cities'][cid] if r['mmsi'] not in feat]
    agg=collections.OrderedDict(); unk=0; local=0
    for v in LIVE.get('day24',{}).get(cid,[]):
        if (v.get('len_m') or 0)<60: continue
        d=parse_dest(v.get('destination'))
        if not d or not d.get('ll'): unk+=1; continue
        if nm(c['you'],d['ll'])<40: local+=1; continue
        _u=clean_name(d.get('name','')).upper(); k='Suez Canal (transit)' if _u in ('SUEZ','AS SUWAYS') else PORTALIAS.get(_u,_u.title()); a=agg.setdefault(k,{'port':k,'cc':d['cc'],'ll':d['ll'],'n':0,'t':collections.Counter()})
        a['n']+=1; t=v.get('ship_type') or 0; a['t']['tanker' if 80<=t<=89 else 'passenger' if 60<=t<=69 else 'cargo' if 70<=t<=79 else 'other']+=1
    hd=sorted(agg.values(),key=lambda a:-a['n'])
    for a in hd: a['t']=a['t'].most_common(1)[0][0]
    c['heading']={'ports':hd[:80],'staying':local,'unknown':unk,'nolen':sum(1 for v in LIVE.get('day24',{}).get(cid,[]) if not v.get('len_m')),'start':LIVE.get('dayStart'),'total':sum(1 for v in LIVE.get('day24',{}).get(cid,[]) if (v.get('len_m') or 0)>=60)}
    c['counts']={'hour':len(LIVE['cities'][cid]),'hourBig':sum(1 for r in LIVE['cities'][cid] if (r['len'] or 0)>=80),'day':len(LIVE.get('day24',{}).get(cid,[]))}
    if len(c['ships'])<5: print('skip',cid,'(not enough data yet)'); continue
    out['cities'][cid]=c
if 'ldn' in out['cities']: out['cities']['ldn']['name']='Thames Estuary'
json.dump(out,open('data4.json','w'),separators=(',',':'))
import os; print(os.path.getsize('data4.json'))
