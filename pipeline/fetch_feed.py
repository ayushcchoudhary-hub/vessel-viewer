"""Download today's Hong Kong Marine Department vessel lists into feed/. Run from pipeline/ before board.py.

A file is replaced only when the download is valid XML with rows in it. If the site is down, the last good copy stays,
and the script still exits 0 so the build goes on.
"""
import os, urllib.request, xml.etree.ElementTree as ET
BASE = 'https://www.mardep.gov.hk/e_files/en/opendata/'
kept = 0
for name in ('RP04005i', 'RP05005i', 'RP05505i', 'RP06005i'):
    try:
        req = urllib.request.Request(BASE + name + '.XML', headers={'User-Agent': 'vessel-viewer/0.1'})
        raw = urllib.request.urlopen(req, timeout=60).read()
        rows = len(list(ET.fromstring(raw)))
        if rows < 1: raise ValueError('no rows')
        with open(f'feed/{name}.xml.tmp', 'wb') as f: f.write(raw)
        os.replace(f'feed/{name}.xml.tmp', f'feed/{name}.xml')
        print(f'{name}: {rows} rows')
    except Exception as e:
        kept += 1; print(f'{name}: kept the old copy ({type(e).__name__}: {e})')
print('feed is fresh' if not kept else f'{kept} of 4 files are old copies')
