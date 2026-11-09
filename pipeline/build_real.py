import os
import json, math, re, csv, datetime as dt, sys
import searoute as sr
from shapely.geometry import LineString
from gfw import identity, port_calls
L=json.load(open('live.json')); D=json.load(open('os.environ.get('GEO_JSON','data/geo.json')'))
NOW=dt.datetime.fromisoformat(L['captured'])
# ---------- UN/LOCODE ----------
LOC={}; BYNAME={}
def dm(s):
    m=re.match(r'(\d{2})(\d{2})([NS]) (\d{3})(\d{2})([EW])',s or '')
    if not m: return None
    lat=int(m[1])+int(m[2])/60; lon=int(m[4])+int(m[5])/60
    return [round(-lon if m[6]=='W' else lon,3), round(-lat if m[3]=='S' else lat,3)]
for r in csv.DictReader(open('unlocode.csv',encoding='utf-8',errors='ignore')):
    c=dm(r['Coordinates'])
    if not c: continue
    k=r['Country']+r['Location']; port='1' in (r['Function'] or '')[:1]
    LOC[k]=dict(name=r['NameWoDiacritics'],cc=r['Country'],ll=c,port=port)
    n=re.sub(r' (PT|PORT)$','',r['NameWoDiacritics'].upper())
    if port and n not in BYNAME: BYNAME[n]=LOC[k]
MANUAL={'CNTAO':('Qingdao','CN',[120.32,36.07]),'CNXMN':('Xiamen','CN',[118.07,24.45]),'CNSHA':('Shanghai','CN',[121.9,30.62]),'CNNGB':('Ningbo','CN',[121.85,29.93]),
 'GBSHS':('Sheerness','GB',[0.74,51.44]),'GBCLF':('Cliffe','GB',[0.49,51.47]),'CNNSA':('Nansha','CN',[113.63,22.73]),'CNDCB':('Da Chan Bay','CN',[113.85,22.53]),
 'GBTIL':('Tilbury','GB',[0.36,51.45]),'GBMED':('Medway','GB',[0.55,51.45]),'CNSZX':('Shenzhen','CN',[113.9,22.48]),'CNCWN':('Chiwan','CN',[113.88,22.47])}
for k,(n,cc,ll) in MANUAL.items():
    LOC[k]=dict(name=n,cc=cc,ll=ll,port=True); BYNAME[n.upper()]=LOC[k]
import glob
for f in glob.glob('cache/*.json'):
    try: j=json.load(open(f))
    except Exception: continue
    for e in j.get('entries',[]) if isinstance(j,dict) else []:
        a=(e.get('port_visit') or {}).get('startAnchorage') or {}
        nm_=(a.get('name') or '').upper()
        if nm_ and a.get('lat') and nm_ not in BYNAME and not re.match(r'^[A-Z]{3}-',nm_):
            BYNAME[nm_]=dict(name=nm_.title(),cc=(a.get('flag') or '')[:2],ll=[round(a['lon'],3),round(a['lat'],3)],port=True)
SG_ANCH=re.compile(r'^(A?E?P?B|AEBB|AEPB|PEBG|PEB|AW|ASPLU|SG ?SIN|SINGAPORE|SGP)')
FIX={'HONG KONG':'HKHKG','HONGKONG':'HKHKG','SINGAPORE':'SGSIN','MEDWAY PORTS':'GBMED','SHEERNESS':'GBSHS','SHEKOU':'CNSHK','SUEZ':'EGSUZ','QINGDAO':'CNTAO','XIAMEN':'CNXMN','NINGBO':'CNNGB','TILBURY':'GBTIL','YANTIAN':'CNYTN','NANSHA':'CNNSA','CHIWAN':'CNCWN','CLIFFE':'GBCLF','LONDON':'GBLON','THAMES':'GBLON'}
def parse_dest(s):
    if not s: return None
    u=re.sub(r'[^A-Z0-9 /]',' ',s.upper()).strip()
    if re.match(r'^(AEBB|AEPB|AEPBB|PEBG[A-C]?|AEPB/C|SGP|SG ?SIN)',u) or u.startswith('SGP ') : return dict(LOC['SGSIN'],name='Singapore')
    for tok in re.findall(r'\b([A-Z]{2}) ?([A-Z2-9]{3})\b',u):
        k=tok[0]+tok[1]
        if k in LOC and LOC[k].get('ll'): return LOC[k]
    for name,code in FIX.items():
        if name in u and code in LOC: return dict(LOC[code],name=name.title())
    for part in re.split(r'[/,-]| TO |>',u):
        p=part.strip()
        if p in BYNAME: return BYNAME[p]
    return None
# ---------- type ----------
CONT=re.compile(r'^(MSC|MAERSK|CMA CGM|COSCO|OOCL|ONE |EVER |HMM|YM |KMTC|WAN HAI|ZIM|SITC|ESL|TS |KOTA|X-PRESS|APL|SINOKOR|HEUNG-A|CNC|SEASPAN|GSL|HYUNDAI|XIN |CSCL|HAPAG|NAVIOS|MOL |NYK|BALTRUM|MSC)')
CAR=re.compile(r'(HIGHWAY|LEADER| ACE\b|HOEGH|GLOVIS|ARK |AUTO|CAR CARRIER|DRIVE|ARIES LEADER)')
def classify(t, name, gtype, ln):
    n=(name or '').upper()
    if re.search(r'\bLNG\b|\bLPG\b|GAS',n): return 'lng'
    if t and 60<=t<=69: return 'passenger'
    if t and 80<=t<=89: return 'tanker'
    if (t and 70<=t<=79) or gtype=='CARGO':
        if CAR.search(n): return 'car'
        if CONT.search(n): return 'container'
        return 'bulk' if (ln or 0)>=150 else 'other'
    if gtype=='TANKER': return 'tanker'
    if gtype=='PASSENGER': return 'passenger'
    return 'other'
def nmd(a,b):
    la1,la2=math.radians(a[1]),math.radians(b[1]); dl=math.radians(b[0]-a[0])
    return math.acos(max(-1,min(1,math.sin(la1)*math.sin(la2)+math.cos(la1)*math.cos(la2)*math.cos(dl))))*3440
def route(a,b):
    if nmd(a,b)<3: return [a,b]
    try:
        r=sr.searoute(a,b,units='naut'); co=r['geometry']['coordinates']
        co=[a]+co+[b]
        ls=LineString(co).simplify(0.03,preserve_topology=False); return [[round(x,3),round(y,3)] for x,y in ls.coords]
    except Exception as e: return [a,b]
FLAG={'PRT':'Portugal','PAN':'Panama','LBR':'Liberia','MHL':'Marshall Islands','SGP':'Singapore','HKG':'Hong Kong','CHN':'China','MLT':'Malta','GRC':'Greece','GBR':'UK','NLD':'Netherlands','DEU':'Germany','DNK':'Denmark','BHS':'Bahamas','CYP':'Cyprus','KOR':'South Korea','JPN':'Japan','IND':'India','IDN':'Indonesia','MYS':'Malaysia','NOR':'Norway','BEL':'Belgium','ITA':'Italy','FRA':'France','VNM':'Vietnam','THA':'Thailand','PHL':'Philippines','ATG':'Antigua & Barbuda','TGO':'Togo','CMR':'Cameroon','KNA':'St Kitts & Nevis','PLW':'Palau','TUV':'Tuvalu','COK':'Cook Islands','GAB':'Gabon','SLE':'Sierra Leone','BRB':'Barbados','IOM':'Isle of Man','MDA':'Moldova','TZA':'Tanzania','COM':'Comoros','VCT':'St Vincent','BLZ':'Belize','HND':'Honduras','TWN':'Taiwan','SAU':'Saudi Arabia','ARE':'UAE','TUR':'Turkey','RUS':'Russia','IRN':'Iran','QAT':'Qatar','KWT':'Kuwait','EGY':'Egypt','ESP':'Spain','FIN':'Finland','SWE':'Sweden','POL':'Poland','IRL':'Ireland','LUX':'Luxembourg','USA':'USA','CAN':'Canada','AUS':'Australia','BRA':'Brazil','MEX':'Mexico','PRK':'North Korea','MNG':'Mongolia','LKA':'Sri Lanka','BGD':'Bangladesh','PAK':'Pakistan','KHM':'Cambodia','MMR':'Myanmar','BRN':'Brunei','FJI':'Fiji','VUT':'Vanuatu','GIB':'Gibraltar','BMU':'Bermuda','CYM':'Cayman Islands','HRV':'Croatia','GEO':'Georgia','UKR':'Ukraine'}
def pretty(p): return (p or '').title().replace('Hongkong','Hong Kong')
def merge_calls(pc, cur):
    out=[]
    for p in pc:
        name=p['port'] if p['port'] and not re.match(r'^[A-Z]{3}-\d+',p['port']) else (p['top'] or p['port'])
        name=re.sub(r'\s+(ANCHORAGE|ANCH|ANCHORAGE AREA)$','',name or '')
        if re.match(r'^[A-Z]{5}$',name) and name in LOC: name=LOC[name]['name']
        if re.match(r'^[A-Z]{3}[-_]\d+$',name or '') or not name: name=(FLAG.get(p['cc'],p['cc'] or '')+' port').strip()
        name=pretty(re.sub(r' \(.*\)$','',name))
        name=name.replace('Hongkong','Hong Kong')
        if out and out[-1]['port']==name: out[-1]['end']=p['end']; continue
        out.append(dict(port=name,cc=p['cc'],start=p['start'],end=p['end'],lon=round(p['lon'],3),lat=round(p['lat'],3)))
    # drop a last call that is just "here" (the current port) if ongoing near current position
    return out
def fmt(d): return f"{d.day} {d.strftime('%b')}"
MAXN={'sg':45,'hk':35,'ldn':30}
ships_out={}; stats={}
for cid,c in D['cities'].items():
    rows=[r for r in L['cities'][cid] if r['d']<14 and (r['len'] or 0)>=40 and r['name']]
    rows.sort(key=lambda r:(-(r['len'] or 0)/(1+r['d'])))
    rows=rows[:MAXN[cid]]
    out=[]
    for r in rows:
        try: idn=identity(r['mmsi'])
        except Exception as e: print('id err',r['name'],e); idn=None
        calls=[]
        if idn:
            try: calls=merge_calls(port_calls(idn['ids']),[r['lon'],r['lat']])
            except Exception as e: print('pc err',r['name'],e)
        typ=classify(r['type'],r['name'],idn and idn.get('shiptype'),r['len'])
        cur=[round(r['lon'],4),round(r['lat'],4)]
        # recent calls: last 5, at most 60 days
        calls=[x for x in calls if (NOW-dt.datetime.fromisoformat(x['end'].replace('Z','+00:00'))).days<=75][-5:]
        callsj=[]
        for x in calls:
            e=dt.datetime.fromisoformat(x['end'].replace('Z','+00:00')); s=dt.datetime.fromisoformat(x['start'].replace('Z','+00:00'))
            ago=max(0,round((NOW-e).total_seconds()/86400,1))
            callsj.append(dict(port=x['port'],cc=x['cc'],when=fmt(s) if s.date()==e.date() else f"{fmt(s)} – {fmt(e)}",ago=ago,src='gfw',lon=x['lon'],lat=x['lat']))
        # if the last call is the port we're at now (within 15 nm), mark as current rather than a past leg
        here=None
        if callsj and nmd(cur,[callsj[-1]['lon'],callsj[-1]['lat']])<15 and callsj[-1]['ago']<3: here=callsj.pop()
        dest=parse_dest(r['dest'])
        nxt=None
        if dest:
            dl=dest['ll']
            nxt=dict(port=pretty(dest.get('name')),cc=dest['cc'],eta=r['eta'] or '',lon=dl[0],lat=dl[1])
        legs=[]
        pts=[[x['lon'],x['lat']] for x in callsj]
        for a,b in zip(pts,pts[1:]): legs.append(dict(kind='past',coords=route(a,b)))
        if pts: legs.append(dict(kind='live',coords=route(pts[-1],cur)))
        if nxt and nmd(cur,[nxt['lon'],nxt['lat']])>8: legs.append(dict(kind='next',coords=route(cur,[nxt['lon'],nxt['lat']])))
        elif nxt: legs.append(dict(kind='next',coords=[cur,[nxt['lon'],nxt['lat']]]))
        tr=[[round(p[0],4),round(p[1],4)] for p in r['track']]
        moving=(r['sog'] or 0)>1.5 and len(tr)>=2 and nmd(tr[0],tr[-1])>0.3
        status='Underway' if moving else ('At anchor' if r['nav']==1 else ('Moored' if r['nav']==5 else 'Stopped'))
        out.append(dict(id=f"{cid}{r['mmsi']}",mmsi=r['mmsi'],imo=(idn or {}).get('imo') or r.get('imo'),name=r['name'],type=typ,ais_type=r['type'],
            flag=FLAG.get((idn or {}).get('flag'),(idn or {}).get('flag') or ''),built=None,len=r['len'],beam=r['beam'],status=status,kn=round(r['sog'] or 0,1),
            a=tr[0] if moving else cur,b=cur if moving else None,track=tr if moving else None,cog=r['cog'],hdg=r['hdg'],
            calls=callsj,here=here,next=nxt,dest_raw=r['dest'],legs=legs,real=True,draught=r['draught']))
    ships_out[cid]=out
    stats[cid]=dict(n=len(out),with_calls=sum(1 for s in out if s['calls']),with_next=sum(1 for s in out if s['next']),moving=sum(1 for s in out if s['b']))
    print(cid,stats[cid])
json.dump(dict(captured=L['captured'],ships=ships_out,stats=stats),open('real_ships.json','w'))
