import os
import json, sys
from sb import q
for table,order in [('vessels','mmsi.asc'),('sightings','day.asc'),('positions','ts.asc,mmsi.asc')]:
    rows=[]; off=0
    while True:
        b=q(table,{'select':'*','order':order,'limit':1000,'offset':off}); rows+=b; off+=1000
        if len(b)<1000: break
    json.dump(rows,open(f'export/{table}.json','w'))
    print(table,len(rows))
