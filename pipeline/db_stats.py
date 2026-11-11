"""Count the rows in the recorder's tables. Writes db_stats.json, which build4.py reads."""
import json, urllib.request
from sb import URL, KEY, ctx
def count(table):
    r = urllib.request.Request(URL + table + '?select=*&limit=1', headers={'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Prefer': 'count=exact', 'Range': '0-0', 'User-Agent': 'vessel-viewer/0.1'})
    with urllib.request.urlopen(r, context=ctx, timeout=60) as f:
        return int(f.headers['Content-Range'].split('/')[1])
d = {'positions': count('positions'), 'vessels': count('vessels')}
json.dump(d, open('db_stats.json', 'w')); print(d)
