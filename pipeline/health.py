"""Is Vessel Viewer healthy? Exit code 1 means something needs a look. Uses only the public site, so it can run anywhere.

Checks: the live API answers for all four shores with fresh positions, and the published page was built recently.
"""
import datetime as dt, json, re, sys, urllib.request
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
if bad: print('NEEDS A LOOK:\n- ' + '\n- '.join(bad)); sys.exit(1)
print('OK')
