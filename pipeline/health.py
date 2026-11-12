"""Is Vessel Viewer healthy? Exit code 1 means something needs a look. Uses only the public site, so it can run anywhere.

Checks: the live API answers for all four shores with fresh positions, the published page was built recently,
and the database is under its size limit with the recorder running.
"""
import datetime as dt, json, re, sys, urllib.request, urllib.error
SITE = 'https://vessels.ayushcchoudhary.com'
MAX_LIVE_MIN = 20          # the recorder runs every minute
MAX_PAGE_HOURS = 14        # the build runs about every 6 hours; allow two missed runs
now = dt.datetime.now(dt.timezone.utc); bad = []

def get(path):
    r = urllib.request.Request(SITE + path, headers={'User-Agent': 'vessel-viewer-health/1'})
    return urllib.request.urlopen(r, timeout=60).read().decode('utf-8', 'replace')

for area in ('sg', 'hk', 'ldn', 'ny'):
    try:
        j = json.loads(get('/api/live?area=' + area)); n = len(j.get('ships') or [])
        age = (now - dt.datetime.fromisoformat(j['at'])).total_seconds() / 60 if j.get('at') else None
        print(f"live {area}: {n} ships, last heard {age:.0f} min ago" if age is not None else f"live {area}: no data")
        if not n or age is None: bad.append(f'live {area}: no ships')
        elif age > MAX_LIVE_MIN: bad.append(f'live {area}: last position is {age:.0f} min old (the recorder may be down)')
    except Exception as e:
        bad.append(f'live {area}: {type(e).__name__} {e}')
try:
    m = re.search(r'"captured":"([^"]+)"', get('/'))
    age = (now - dt.datetime.fromisoformat(m.group(1))).total_seconds() / 3600
    print(f'page: built {age:.1f} hours ago')
    if age > MAX_PAGE_HOURS: bad.append(f'page: built {age:.0f} hours ago (the scheduled build may be failing)')
except Exception as e:
    bad.append(f'page: {type(e).__name__} {e}')
# database size and recorder errors, through a read-only database function (supabase/migrations/0002)
SB_URL = 'https://twgfnjrejumoihageznk.supabase.co'; SB_KEY = 'sb_publishable_cV3Qt7i2ubzfdBq-Gq07iw_Q_SryxpR'   # public by design
MAX_DB_MB = 350            # the free limit is 500
try:
    r = urllib.request.Request(SB_URL + '/rest/v1/rpc/db_health', data=b'{}', method='POST',
        headers={'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json'})
    h = json.loads(urllib.request.urlopen(r, timeout=60).read())
    print(f"database: {h['db_mb']:.0f} MB, {h['positions']:,} positions, {h['runs_24h']} recorder runs in 24 h, {h['errors_24h']} errors")
    if h['db_mb'] > MAX_DB_MB: bad.append(f"database is {h['db_mb']:.0f} MB (limit 500): the nightly trim may not be running")
    if h['runs_24h'] < 1200: bad.append(f"recorder ran {h['runs_24h']} times in 24 h (expected about 1,440)")
    if h['errors_24h'] > 72: bad.append(f"recorder had {h['errors_24h']} errors in 24 h")
except urllib.error.HTTPError as e:
    if e.code == 404: print('database: db_health() is not installed yet (supabase/migrations/0002), check skipped')
    else: bad.append(f'database check: HTTP {e.code}')
except Exception as e:
    bad.append(f'database check: {type(e).__name__} {e}')
if bad: print('NEEDS A LOOK:\n- ' + '\n- '.join(bad)); sys.exit(1)
print('OK')
