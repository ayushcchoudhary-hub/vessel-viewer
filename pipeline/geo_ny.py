import os
import json, math
from shapely.geometry import shape, Point, box
from shapely.ops import unary_union
from shapely.prepared import prep
ne=json.load(open('ne10.geojson'))
bb=(-74.35,40.38,-73.70,40.78)
B=box(*bb)
parts=[shape(f['geometry']).buffer(0).intersection(B) for f in ne['features'] if shape(f['geometry']).intersects(B)]
land=unary_union([p for p in parts if not p.is_empty]); pl=prep(land)
json.dump({'type':'FeatureCollection','features':[{'type':'Feature','properties':{},'geometry':json.loads(json.dumps(land.__geo_interface__))}]},open('land_ny.json','w'))
x0,y0,x1,y1=bb; s=0.0045; dots=[]; yy=y0; row=0
while yy<=y1:
    xx=x0+(s/2 if row%2 else 0)
    while xx<=x1:
        if pl.contains(Point(xx,yy)): dots.append([round(xx,4),round(yy,4)])
        xx+=s
    yy+=s*.9; row+=1
polys=[]
for g in (land.geoms if hasattr(land,'geoms') else [land]):
    if g.geom_type=='Polygon': polys.append([[round(x,4),round(y,4)] for x,y in g.simplify(0.0008).exterior.coords])
you=(-74.0385,40.6215)
print('you on land?',pl.contains(Point(*you)))
lon0,lat0=you; k=math.cos(math.radians(lat0)); prof=[]
for i in range(720):
    b=math.radians(i*.5); hit=None; dist=0.0; wet=False
    while dist<26:
        p=Point(lon0+math.sin(b)*dist/60/k, lat0+math.cos(b)*dist/60); on=pl.contains(p)
        if not wet:
            if not on: wet=True
            elif dist>0.6: hit=0.12; break
        elif on: hit=round(max(dist,0.15),2); break
        dist+=0.03 if dist<3 else 0.15
    prof.append(hit)
c={'id':'ny','name':'New York','spot':'Bay Ridge waterfront','you':list(you),'bbox':list(bb),'step':s,'face':200,'dots':dots,'polys':polys,'landProfile':prof}
json.dump(c,open('geo_ny.json','w'))
print('dots',len(dots),'polys',len(polys),'open bearings',sum(1 for p in prof if p is None or p>2))
