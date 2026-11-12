"""Read-only access to the recorder database through Supabase's REST API."""
import json, os, ssl, time, urllib.request, urllib.parse, urllib.error
URL = os.environ['SUPABASE_URL'].rstrip('/') + '/rest/v1/'
KEY = os.environ['SUPABASE_PUBLISHABLE_KEY']
ctx = ssl.create_default_context(cafile=os.environ.get('SSL_CERT_FILE'))
def q(table, params):
    r = urllib.request.Request(URL + table + '?' + urllib.parse.urlencode(params),
        headers={'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'User-Agent': 'vessel-viewer/0.1'})
    for attempt in range(4):                       # the database sometimes answers 500 or times out: try again
        try:
            return json.load(urllib.request.urlopen(r, context=ctx, timeout=60))
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt == 3 or (isinstance(e, urllib.error.HTTPError) and e.code < 500): raise
            time.sleep(5 * (attempt + 1))
