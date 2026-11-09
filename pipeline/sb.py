"""Read-only access to the recorder database through Supabase's REST API."""
import json, os, ssl, urllib.request, urllib.parse
URL = os.environ['SUPABASE_URL'].rstrip('/') + '/rest/v1/'
KEY = os.environ['SUPABASE_PUBLISHABLE_KEY']
ctx = ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE'))
def q(table, params):
    r = urllib.request.Request(URL + table + '?' + urllib.parse.urlencode(params),
        headers={'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'User-Agent': 'vessel-viewer/0.1'})
    return json.load(urllib.request.urlopen(r, context=ctx, timeout=60))
