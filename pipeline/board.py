import os
import json, re, datetime as dt, xml.etree.ElementTree as ET, sys
sys.argv=['x']
src=open('build_real.py').read(); src=src[:src.index('MAXN=')]
exec(src)  # gives LOC, BYNAME, FLAG, parse helpers
F='os.environ.get('HK_FEED_DIR','data/hk_feed/')'
def tmap(t):
    t=(t or '').upper()
    for k,v in [('CONTAINER','container'),('NATURAL GAS','lng'),('LNG','lng'),('PETROLEUM GAS','lng'),('TANKER','tanker'),('CHEMICAL','tanker'),('BULK','bulk'),('CAR CARRIER','car'),('RO-RO','car'),('RORO','car'),('PASSENGER','passenger'),('CRUISE','passenger')]:
        if k in t: return v
    return 'other'
def clean(p):
    p=(p or '').strip()
    if p.startswith('OTHER, '): p=p[7:]
    p=re.sub(r',\s*[A-Z]{2}$','',p).split(',')[0].strip()
    return p
ALIAS={'KAOHSIUNG':'TWKHH','HO CHI MINH CITY':'VNSGN','HAIPHONG':'VNHPH','SHEKOU':'CNSHK','YANTIAN':'CNYTN','NANSHA':'CNNSA','SHANGHAI':'CNSHA','NINGBO':'CNNGB','QINGDAO':'CNTAO','XIAMEN':'CNXMN','BUSAN':'KRPUS','PUSAN':'KRPUS','SINGAPORE':'SGSIN','PORT KELANG':'MYPKG','PORT KLANG':'MYPKG','TANJUNG PELEPAS':'MYTPP','LAEM CHABANG':'THLCH','MANILA':'PHMNL','JAKARTA':'IDJKT','TOKYO':'JPTYO','YOKOHAMA':'JPYOK','KOBE':'JPUKB','OSAKA':'JPOSA','TAICHUNG':'TWTXG','KEELUNG':'TWKEL','DA NANG':'VNDAD','DANANG':'VNDAD','CAI MEP':'VNCMT','ZHOUSHAN':'CNZOS','CHIWAN':'CNCWN','MACAU':'MOMFM','MACAO':'MOMFM','ZHUHAI':'CNZUH','GAOLAN':'CNZUH','HUANGPU':'CNHUA','GUANGZHOU':'CNCAN','LIANYUNGANG':'CNLYG','TIANJIN':'CNTSN','XINGANG':'CNTXG','DALIAN':'CNDLC','FUZHOU':'CNFOC','SHANTOU':'CNSWA','ZHANJIANG':'CNZHA','BEIHAI':'CNBHY','FANGCHENG':'CNFAN','QINZHOU':'CNQZH','HAIKOU':'CNHAK','COLOMBO':'LKCMB','DUBAI':'AEDXB','JEBEL ALI':'AEJEA','ROTTERDAM':'NLRTM','HAMBURG':'DEHAM','LOS ANGELES':'USLAX','LONG BEACH':'USLGB','OMAN':'OMSOH','SOHAR':'OMSOH','PORT HEDLAND':'AUPHE','NEWCASTLE':'AUNTL','SYDNEY':'AUSYD','MELBOURNE':'AUMEL','BRISBANE':'AUBNE'}
EXTRA={'TWKHH':('Kaohsiung','TW',[120.28,22.6]),'VNSGN':('Ho Chi Minh City','VN',[106.75,10.77]),'MYTPP':('Tanjung Pelepas','MY',[103.55,1.36]),'CNZOS':('Zhoushan','CN',[122.1,29.95]),'MOMFM':('Macau','MO',[113.55,22.18]),'CNZUH':('Zhuhai','CN',[113.58,22.25]),'CNCAN':('Guangzhou','CN',[113.6,22.8]),'CNHUA':('Huangpu','CN',[113.5,23.08]),'CNLYG':('Lianyungang','CN',[119.45,34.75]),'CNTSN':('Tianjin','CN',[117.75,38.98]),'CNTXG':('Tianjin Xingang','CN',[117.75,38.98]),'CNDLC':('Dalian','CN',[121.65,38.93]),'CNFOC':('Fuzhou','CN',[119.45,26.0]),'CNSWA':('Shantou','CN',[116.7,23.35]),'CNZHA':('Zhanjiang','CN',[110.4,21.2]),'CNHAK':('Haikou','CN',[110.3,20.03]),'CNQZH':('Qinzhou','CN',[108.6,21.7]),'CNFAN':('Fangcheng','CN',[108.35,21.6]),'CNBHY':('Beihai','CN',[109.1,21.47]),'JPTYO':('Tokyo','JP',[139.8,35.6]),'TWTXG':('Taichung','TW',[120.5,24.28]),'TWKEL':('Keelung','TW',[121.75,25.15]),'OMSOH':('Sohar','OM',[56.62,24.5]),'AUPHE':('Port Hedland','AU',[118.58,-20.3]),'AUNTL':('Newcastle','AU',[151.8,-32.92])}
for k,(n,cc,ll) in EXTRA.items(): LOC[k]=dict(name=n,cc=cc,ll=ll,port=True)
def geo(p):
    u=p.upper().strip()
    if u in ALIAS and ALIAS[u] in LOC and LOC[ALIAS[u]].get('ll'): return LOC[ALIAS[u]]['ll']
    if u in BYNAME and BYNAME[u].get('ll'): return BYNAME[u]['ll']
    return None
now_hkt=dt.datetime.utcnow()+dt.timedelta(hours=8)
arr=[]; miss={}
for r in ET.parse(F+'RP04005i.xml').getroot().iter('G_SQL1'):
    try: t=dt.datetime.strptime((r.findtext('ETA') or '').strip(),'%Y/%m/%d %H:%M')
    except: continue
    if t<now_hkt: continue
    p=clean(r.findtext('LAST_PORT')); g=geo(p)
    if not g: miss[p]=miss.get(p,0)+1
    arr.append(dict(t=t.strftime('%a %H:%M'),ts=t.isoformat(),name=(r.findtext('VESSEL_NAME') or '').strip(),type=tmap(r.findtext('SHIP_TYPE')),port=p.title(),ll=g))
arr.sort(key=lambda x:x['ts'])
dep=[]
for r in ET.parse(F+'RP05505i.xml').getroot().iter('G_SQL1'):
    try: t=dt.datetime.strptime((r.findtext('ATD_TIME') or '').strip(),'%Y/%m/%d %H:%M')
    except: continue
    dep.append(dict(t=t.strftime('%a %H:%M'),ts=t.isoformat(),name=(r.findtext('VESSEL_NAME') or '').strip(),type=tmap(r.findtext('SHIP_TYPE')),port=(r.findtext('LAST_BERTH') or '').strip().title()))
dep.sort(key=lambda x:x['ts'],reverse=True)
inport=len(list(ET.parse(F+'RP06005i.xml').getroot().iter('G_SQL1')))
snap=now_hkt.strftime('%a %-d %b %Y, %H:%M HKT')
json.dump(dict(snapshot=snap,arrivals=arr,departures=dep,counts=dict(due=len(arr),departed36=len(dep),inPort=inport)),open('board.json','w'))
print(snap,len(arr),'geocoded',sum(1 for a in arr if a['ll']),len(dep),inport); print('missing',sorted(miss.items(),key=lambda x:-x[1])[:25])
