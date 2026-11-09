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
SG_ANCH=re.compile(r'^(SG ?SIN|SGP|SIN|SG)?[ ,._/-]*\(?(A[EW][A-Z]{0,4}|AS[A-Z]{1,4}|P[EW]B ?G ?-?[A-C]?|PEGB[A-C]?|PGBG|PJSB|ARP|EOPL|WOPL)\)?([ ,._-]*(SG|SIN))?$')
FIX={'HONG KONG':'HKHKG','HONGKONG':'HKHKG','XIANGGANG':'HKHKG','HK':'HKHKG','AOMEN':'MOMFM','SINGAPORE':'SGSIN','MEDWAY PORTS':'GBMED','SHEERNESS':'GBSHS','SHEKOU':'CNSHK','SUEZ':'EGSUZ','QINGDAO':'CNTAO','XIAMEN':'CNXMN','NINGBO':'CNNGB','TILBURY':'GBTIL','YANTIAN':'CNYTN','NANSHA':'CNNSA','CHIWAN':'CNCWN','CLIFFE':'GBCLF','LONDON':'GBLON','THAMES':'GBLON','PASIR PANJANG':'SGSIN','BATU AMPAR':'IDBTM','BATAM':'IDBTM','PASIR GUDANG':'MYPGU','FELIXSTOWE':'GBFXT','PURFLEET':'GBPFT','GRAYS':'GBGRY','ROCHESTER':'GBRCS','LONDON GATEWAY':'GBLGP','PORT KLANG':'MYPKG','PORT KELANG':'MYPKG'}
MORE={'MYPGU':('Pasir Gudang','MY',[103.9,1.45]),'GBFXT':('Felixstowe','GB',[1.32,51.95]),'GBPFT':('Purfleet','GB',[0.24,51.48]),'GBRID':('Ridham Dock','GB',[0.77,51.38]),'GBRCS':('Rochester','GB',[0.5,51.39]),'GBGRY':('Grays','GB',[0.33,51.47]),'GBGYS':('Grays','GB',[0.33,51.47]),'GBLON':('London','GB',[0.07,51.5]),'GBLGP':('London Gateway','GB',[0.48,51.5]),'AUNTL':('Newcastle','AU',[151.78,-32.92]),'TWKEL':('Keelung','TW',[121.74,25.14]),'TWTXG':('Taichung','TW',[120.5,24.27]),'IDBTM':('Batam','ID',[104.0,1.15]),'MOMFM':('Macau','MO',[113.55,22.18])}
for k,(n,cc,ll) in MORE.items(): LOC[k]=dict(name=n,cc=cc,ll=ll,port=True)
CTRY=re.compile(r'\b(INDONESIA|INDIA|CHINA|UK|MALAYSIA|VIETNAM|KOREA|JAPAN|THAILAND|PHILIPPINES|TAIWAN|NETHERLANDS|BELGIUM|GERMANY)\b')
def _one(u):
    u=u.strip(' .,/-')
    if not u: return None
    if SG_ANCH.match(u) and len(u)<=14: return dict(LOC['SGSIN'],name='Singapore')
    for tok in re.findall(r'\b([A-Z]{2}) ?([A-Z2-9]{3})\b',u):
        k=tok[0]+tok[1]
        if k in LOC and LOC[k].get('ll') and LOC[k].get('port'): return LOC[k]
    v=CTRY.sub(' ',u); v=re.sub(r'^(MY|ID|CN|SG)\s+|\s+(MY|ID|CN|SG)$','',v).strip()
    for name,code in sorted(FIX.items(),key=lambda x:-len(x[0])):
        if (re.search(r'\b'+re.escape(name)+r'\b',v) or name==v.replace(' ','')) and code in LOC and LOC[code].get('ll'): return dict(LOC[code])
    for cand in (v, v.replace(' ','')):
        if cand in BYNAME and BYNAME[cand].get('ll'): return BYNAME[cand]
    return None
def clean_name(n):
    n=n or ''
    m=re.search(r'\(([^)]+)\)',n)
    if m: n=m.group(1)
    n=n.split('/')[0]
    return re.sub(r'\s+(Pt|Port)$','',n.strip())
def parse_dest(s):
    if not s: return None
    u=re.sub(r'[^A-Z0-9 />,-]',' ',s.upper()).strip()
    # "A > B", "A->B", "A TO B": the last part is where it is going
    parts=[p for p in re.split(r'=?>+|->| TO |-{2,}|\s-\s',u) if p.strip()]
    for p in list(reversed(parts))+list(reversed(re.split(r'[/,]',u))):
        r=_one(p)
        if r: return dict(r,name=clean_name(r.get('name')))
    return None
# ---------- snap GFW port calls to real ports ----------
PORTS=[(v['ll'][0],v['ll'][1],k,v['name'],v['cc']) for k,v in LOC.items() if v.get('port') and v.get('ll')]
GRID={}
for p in PORTS: GRID.setdefault((int(p[0]//1),int(p[1]//1)),[]).append(p)
def nearest_port(lon,lat,maxnm):
    best=None; k=math.cos(math.radians(lat))
    for gx in range(int(lon//1)-1,int(lon//1)+2):
        for gy in range(int(lat//1)-1,int(lat//1)+2):
            for p in GRID.get((gx,gy),[]):
                d=math.hypot((p[0]-lon)*k*60,(p[1]-lat)*60)
                if d<=maxnm and (best is None or d<best[0]): best=(d,p)
    return best
# ---------- type ----------
CONT=re.compile(r'(\bMSC\b|MAERSK|CMA CGM|COSCO|OOCL|\bONE\b|^EVER |\bHMM\b|^YM |KMTC|WAN HAI|\bZIM\b|SITC|^ESL|^TS |^KOTA|X-PRESS|^APL|SINOKOR|HEUNG-A|^CNC|SEASPAN|^GSL|HYUNDAI|^XIN |CSCL|HAPAG|EXPRESS|NAVIOS|^MOL |^NYK|BALTRUM|PANCON|CAPITAINE|SEALAND|EVERGREEN|YANG MING|KOTA)')
CAR=re.compile(r'(HIGHWAY|LEADER| ACE\b|HOEGH|GLOVIS|ARK |AUTO|CAR CARRIER|DRIVE|ARIES LEADER)')
BULKN=re.compile(r'(BULK|\bORE\b|VALE|CAPE|COAL|GRAIN|IRON|MINERAL)')
HKTYPE={}
try:
    for r in json.load(open('board.json'))['arrivals']: HKTYPE[r['name'].upper()]=r['type']
except Exception: pass
def classify(t, name, gtype, ln):
    n=(name or '').upper()
    if n in HKTYPE and HKTYPE[n]!='other': return HKTYPE[n]
    if re.search(r'LNG|LPG|GAS',n): return 'lng'
    if t and 60<=t<=69: return 'passenger'
    if t and 80<=t<=89: return 'tanker'
    if (t and 70<=t<=79) or gtype=='CARGO':
        if CAR.search(n): return 'car'
        if CONT.search(n): return 'container'
        if BULKN.search(n): return 'bulk'
        if (ln or 0)>=330: return 'container'
        return 'cargo'
    if gtype=='TANKER': return 'tanker'
    if gtype=='PASSENGER': return 'passenger'
    return 'other'
def nmd(a,b):
    la1,la2=math.radians(a[1]),math.radians(b[1]); dl=math.radians(b[0]-a[0])
    return math.acos(max(-1,min(1,math.sin(la1)*math.sin(la2)+math.cos(la1)*math.cos(la2)*math.cos(dl))))*3440
def route(a,b,big=False):
    if nmd(a,b)<3: return [a,b]
    try:
        r=sr.searoute(a,b,units='naut',restrictions=['northwest','panama'] if big else ['northwest']); co=r['geometry']['coordinates']
        co=[a]+co+[b]
        ls=LineString(co).simplify(0.03,preserve_topology=False); return [[round(x,3),round(y,3)] for x,y in ls.coords]
    except Exception as e: return [a,b]
FLAG={'PRT':'Portugal','PAN':'Panama','LBR':'Liberia','MHL':'Marshall Islands','SGP':'Singapore','HKG':'Hong Kong','CHN':'China','MLT':'Malta','GRC':'Greece','GBR':'UK','NLD':'Netherlands','DEU':'Germany','DNK':'Denmark','BHS':'Bahamas','CYP':'Cyprus','KOR':'South Korea','JPN':'Japan','IND':'India','IDN':'Indonesia','MYS':'Malaysia','NOR':'Norway','BEL':'Belgium','ITA':'Italy','FRA':'France','VNM':'Vietnam','THA':'Thailand','PHL':'Philippines','ATG':'Antigua & Barbuda','TGO':'Togo','CMR':'Cameroon','KNA':'St Kitts & Nevis','PLW':'Palau','TUV':'Tuvalu','COK':'Cook Islands','GAB':'Gabon','SLE':'Sierra Leone','BRB':'Barbados','IOM':'Isle of Man','MDA':'Moldova','TZA':'Tanzania','COM':'Comoros','VCT':'St Vincent','BLZ':'Belize','HND':'Honduras','TWN':'Taiwan','SAU':'Saudi Arabia','ARE':'UAE','TUR':'Turkey','RUS':'Russia','IRN':'Iran','QAT':'Qatar','KWT':'Kuwait','EGY':'Egypt','ESP':'Spain','FIN':'Finland','SWE':'Sweden','POL':'Poland','IRL':'Ireland','LUX':'Luxembourg','USA':'USA','CAN':'Canada','AUS':'Australia','BRA':'Brazil','MEX':'Mexico','PRK':'North Korea','MNG':'Mongolia','LKA':'Sri Lanka','BGD':'Bangladesh','PAK':'Pakistan','KHM':'Cambodia','MMR':'Myanmar','BRN':'Brunei','FJI':'Fiji','VUT':'Vanuatu','GIB':'Gibraltar','BMU':'Bermuda','CYM':'Cayman Islands','HRV':'Croatia','GEO':'Georgia','UKR':'Ukraine'}
def pretty(p): return (p or '').title().replace('Hongkong','Hong Kong')
def merge_calls(pc, cur):
    out=[]
    for p in pc:
        np_=nearest_port(p['lon'],p['lat'],15)
        if np_: name,cc,ll=clean_name(np_[1][3]),np_[1][4],[np_[1][0],np_[1][1]]
        else:
            far=nearest_port(p['lon'],p['lat'],60)
            name=('anchorage off '+clean_name(far[1][3])) if far else ((p['top'] or 'sea area').title()); cc=far[1][4] if far else ''; ll=[p['lon'],p['lat']]
        name=pretty(re.sub(r' \(.*\)$','',name)).replace('Hongkong','Hong Kong')
        if out and (out[-1]['port']==name or (out[-1]['cc']==cc and nmd([out[-1]['lon'],out[-1]['lat']],[p['lon'],p['lat']])<30)):
            out[-1]['end']=p['end']; continue
        out.append(dict(port=name,cc=cc,start=p['start'],end=p['end'],lon=round(p['lon'],3),lat=round(p['lat'],3)))
    return out
def fmt(d): return f"{d.day} {d.strftime('%b')}"
MAXN={'sg':60,'hk':45,'ldn':30,'ny':30}
ships_out={}; stats={}
for cid,c in D['cities'].items():
    rows=[r for r in L['cities'][cid] if r['d']<14 and 40<=(r['len'] or 0)<=400 and r['name'] and str(r['mmsi'])[0] in '234567' and len(str(r['mmsi']))==9]
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
        guess = typ in ('container','bulk','car') and not (r['type'] and 80<=r['type']<=89)
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
        if callsj and nmd(cur,[callsj[-1]['lon'],callsj[-1]['lat']])<15 and callsj[-1]['ago']<10: here=callsj.pop()
        dest=parse_dest(r['dest'])
        nxt=None
        if dest:
            dl=dest['ll']
            nxt=dict(port=pretty(dest.get('name')),cc=dest['cc'],eta=r['eta'] or '',lon=dl[0],lat=dl[1])
        legs=[]; big=(r['len'] or 0)>=300 or (typ in ('bulk','tanker') and (r['len'] or 0)>=250)
        pts=[[x['lon'],x['lat']] for x in callsj]
        for a,b in zip(pts,pts[1:]): legs.append(dict(kind='past',coords=route(a,b,big)))
        if pts: legs.append(dict(kind='live',coords=route(pts[-1],cur,big)))
        if nxt and nmd(cur,[nxt['lon'],nxt['lat']])>8: legs.append(dict(kind='next',coords=route(cur,[nxt['lon'],nxt['lat']],big)))
        elif nxt: legs.append(dict(kind='next',coords=[cur,[nxt['lon'],nxt['lat']]]))
        tr=[[round(p[0],4),round(p[1],4)] for p in r['track']]
        moving=(r['sog'] or 0)>1.0 and len(tr)>=2 and nmd(tr[0],tr[-1])>0.2
        status='Underway' if (r['sog'] or 0)>=1.0 else ('At anchor' if r['nav']==1 else ('Moored' if r['nav']==5 else 'Stopped'))
        out.append(dict(id=f"{cid}{r['mmsi']}",mmsi=r['mmsi'],imo=(idn or {}).get('imo') or r.get('imo'),name=r['name'],type=typ,ais_type=r['type'],
            flag=FLAG.get((idn or {}).get('flag'),(idn or {}).get('flag') or ''),built=None,len=(r['len'] if (r['len'] or 0)<=400 else None),beam=r['beam'],status=status,kn=round(r['sog'] or 0,1),
            a=tr[0] if moving else cur,b=cur if moving else None,track=tr if moving else None,cog=r['cog'],hdg=r['hdg'],
            calls=callsj,here=here,typeGuess=guess,next=nxt,dest_raw=r['dest'],legs=legs,real=True,draught=r['draught']))
    ships_out[cid]=out
    stats[cid]=dict(n=len(out),with_calls=sum(1 for s in out if s['calls']),with_next=sum(1 for s in out if s['next']),moving=sum(1 for s in out if s['b']))
    print(cid,stats[cid])
json.dump(dict(captured=L['captured'],ships=ships_out,stats=stats),open('real_ships.json','w'))
