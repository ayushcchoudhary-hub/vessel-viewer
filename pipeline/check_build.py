"""Stop the scheduled build from publishing a broken page. Run from pipeline/ after build_page.py."""
import json, os, sys, datetime
D = json.load(open('data4.json')); bad = []
age = datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(D['captured'])
if age > datetime.timedelta(hours=2): bad.append(f'data is {age} old: the recorder may be down')
for cid in ('sg', 'hk', 'ldn', 'ny'):
    c = D['cities'].get(cid)
    if not c: bad.append(f'{cid}: missing'); continue
    ships = c['ships']; routed = sum(1 for s in ships if s.get('calls'))
    print(f"{cid}: {len(ships)} ships drawn, {routed} with port calls")
    if len(ships) < 8: bad.append(f'{cid}: only {len(ships)} ships')
if sum(1 for c in D['cities'].values() for s in c['ships'] if s.get('calls')) < 20: bad.append('fewer than 20 ships have port calls: Global Fishing Watch may have failed')
page = '../site/index.html'; size = os.path.getsize(page); html = open(page).read()
print(f'page: {size/1e6:.1f} MB')
if size < 1_000_000: bad.append('page is under 1 MB')
for mark in ('/*DATA*/', '/*WORLD*/', '/*WORLD110*/'):
    if mark in html: bad.append(f'{mark} was not filled in')
for need in ('spotBtn', 'loadLive'):
    if need not in html: bad.append(f'{need} is missing from the page')
if bad: print('NOT PUBLISHED:\n- ' + '\n- '.join(bad)); sys.exit(1)
print('OK')
