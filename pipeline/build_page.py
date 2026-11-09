"""Build the single-file page from web/src and the data files.

Run from pipeline/ after build4.py and timelapse.py.
NODE_MODULES must point at a folder with world-atlas, d3 and topojson-client.
"""
import json, os
W = os.environ.get('NODE_MODULES', 'node_modules/')
SRC = '../web/src/'
D = json.load(open('data4.json'))
for c in D['cities'].values():
    c.pop('allShips', None)
D.pop('board', None)
js = lambda f: open(SRC + f).read()
html = '\n;'.join(js(f) for f in ['head.html', 'core.js', 'partA.js', 'horizon.js', 'globe.js', 'partB.js', 'flow.js', 'partC.js'])
html = (html.replace('/*DATA*/', json.dumps(D, separators=(',', ':')))
            .replace('/*TL*/', open('timelapse.json').read())
            .replace('/*WORLD*/', open(W + 'world-atlas/land-50m.json').read())
            .replace('/*WORLD110*/', open(W + 'world-atlas/land-110m.json').read()))
open('../web/vessel-viewer.html', 'w').write(html)
open('../site/index.html', 'w').write(html)  # the deployed page
print(len(html), 'bytes')
