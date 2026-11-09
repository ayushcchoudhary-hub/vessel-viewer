import os
d=open('data4.json').read(); t=open('../web/template.html').read()
W=os.environ.get('NODE_MODULES','node_modules/')
out=t.replace('/*DATA*/',d).replace('/*WORLD*/',open(W+'world-atlas/land-50m.json').read()).replace('/*WORLD110*/',open(W+'world-atlas/land-110m.json').read())
open('../web/vessel-viewer.html','w').write(out)
loc=out.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>','<script>'+open(W+'d3/dist/d3.min.js').read()+'</script>').replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js"></script>','<script>'+open(W+'topojson-client/dist/topojson-client.min.js').read()+'</script>')
open('local.html','w').write(loc); print(len(out))
