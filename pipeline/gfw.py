import json, os, ssl, urllib.request, urllib.parse, time, hashlib
env={'GFW_TOKEN': os.environ['GFW_TOKEN']}
ctx=ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE'))
os.makedirs('cache',exist_ok=True)
def get(path, params):
    qs=urllib.parse.urlencode(params, doseq=True); f='cache/'+hashlib.md5((path+qs).encode()).hexdigest()+'.json'
    if os.path.exists(f): return json.load(open(f))
    for i in range(4):
        try:
            r=urllib.request.Request('https://gateway.api.globalfishingwatch.org/v3/'+path+'?'+qs, headers={'Authorization':'Bearer '+env['GFW_TOKEN'],'User-Agent':'vessel-viewer/0.1'})
            j=json.load(urllib.request.urlopen(r, context=ctx, timeout=90)); json.dump(j,open(f,'w')); return j
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(5*(i+1)); continue
            raise
def identity(mmsi):
    s=get('vessels/search',{'query':str(mmsi),'datasets[0]':'public-global-vessel-identity:latest','limit':5,'includes[0]':'MATCH_CRITERIA'})
    best=None
    for e in s.get('entries',[]):
        for si in e.get('selfReportedInfo',[]):
            if str(si.get('ssvid'))==str(mmsi):
                if not best or (si.get('transmissionDateTo') or '')>(best[1].get('transmissionDateTo') or ''): best=(e,si)
    if not best: return None
    e,si=best
    reg=(e.get('registryInfo') or [{}])[0]
    st=(e.get('combinedSourcesInfo') or [{}])[0].get('shiptypes',[])
    return dict(id=si['id'], ids=[x['id'] for x in e.get('selfReportedInfo',[]) if str(x.get('ssvid'))==str(mmsi)], name=si.get('shipname'), flag=si.get('flag'), imo=si.get('imo') or reg.get('imo'),
                shiptype=st[-1]['name'] if st else None, reg_len=reg.get('lengthM'), reg_built=reg.get('builtYear') or reg.get('yearBuilt'), reg_type=(reg.get('shiptypes') or [None])[0] if isinstance(reg.get('shiptypes'),list) else reg.get('shiptypes'))
def port_calls(ids, start='2026-04-01', end='2026-11-09'):
    params={'datasets[0]':'public-global-port-visits-events:latest','start-date':start,'end-date':end,'limit':200,'offset':0}
    for i,x in enumerate(ids[:3]): params[f'vessels[{i}]']=x
    ev=get('events',params)
    out=[]
    for e in sorted(ev.get('entries',[]),key=lambda e:e['start']):
        pv=e.get('port_visit',{}); a=pv.get('intermediateAnchorage') or pv.get('startAnchorage') or {}
        out.append(dict(start=e['start'],end=e['end'],port=a.get('name'),cc=a.get('flag'),lat=a.get('lat') or e['position']['lat'],lon=a.get('lon') or e['position']['lon'],
                        top=a.get('topDestination'), hours=pv.get('durationHrs')))
    return out
