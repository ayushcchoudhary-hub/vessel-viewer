"""Vessel Viewer score. Clip: 22.93 s, 136 BPM, 14 bars, shots cut to whole bars.
Palette: soft keys, buoy bell, warm pad, sub, shaker. D major. Payoff: the zoom-out cut at bar 8 (14.12 s).
Run: python3 vessel_score.py out.wav"""
import sys, os, numpy as np
sys.path.insert(0, os.environ.get('SOUND_LIB', '.'))  # sound.py lives in the personal-site repo
from sound import *
BPM = 136; B = 60 / BPM; BAR = 4 * B; DUR = 14 * BAR
S = [0, 2*BAR, 5*BAR, 8*BAR, 10*BAR, 12*BAR]         # starts: horizon, tap+ticket, journey, zoom out, flow, end card
TK = 4*BAR                                            # ticket shot
EV = dict(hk=1.9, ring1=2.2, tap=S[1]+1.85, ticket=TK, ring2=TK+0.55, ring3=S[2]+4.3, ring4=S[3]+1.6, ring5=S[4]+1.5, flow2=S[4]+1.2)
CH = {'D': [50, 54, 57], 'Bm': [47, 50, 54], 'G': [43, 47, 50], 'A': [45, 49, 52]}
PROG = ['D', 'Bm', 'G', 'A']
buf = track(DUR + 0.2); drums = track(DUR + 0.2); fx = track(DUR + 0.2)
# intro: pad + motif on the first caption
add(buf, pad([hz(m + 12) for m in CH['D']], 2 * BAR + 0.4, 1600), 0, 0.30)
for k, m in enumerate([74, 78, 81]): add(buf, bell(hz(m), 1.6), 0.15 + k * B, 0.16)
add(fx, whoosh(0.6), EV['hk'] - 0.6, 0.16); add(fx, pop(True), EV['hk'], 0.22)
add(buf, bell(hz(86), 1.2), EV['ring1'], 0.20)
def groove(b0, b1, level):                              # level 1 light, 2 full, 0 thin
    for bar in range(b0, b1):
        ch = CH[PROG[bar % 4]]; t0 = bar * BAR
        add(buf, pad([hz(m + 12) for m in ch], BAR + 0.3, 1500 + 500 * level), t0, 0.13 + 0.05 * level)
        add(buf, sub(hz(ch[0] - 12), 1.8 * B), t0, 0.42 if level else 0.3)
        if level == 2: add(buf, sub(hz(ch[0] - 12), 0.9 * B), t0 + 2.5 * B, 0.3)
        for q in range(4):
            at = t0 + q * B
            if level: add(drums, kick(soft=(level == 1)), at, 0.8 if level == 2 else 0.5) if q in ((0, 2) if level == 1 else (0, 1, 2, 3)) else None
            if level == 2 and q in (1, 3): add(drums, rim(), at, 0.3)
            add(drums, shaker(), at + B / 2, 0.16 if level == 2 else 0.1)
            if level == 2: add(drums, shaker(), at + B / 4, 0.06); add(drums, shaker(), at + 3 * B / 4, 0.06)
            add(buf, keys(hz(ch[q % 3] + 12), B * 0.9), at + (B / 2 if q % 2 else 0), 0.10 + 0.03 * level)
groove(2, 5, 1)
add(fx, pop(True), EV['tap'], 0.3); add(fx, whoosh(0.5), EV['tap'], 0.12)
add(fx, pop(True), EV['ticket'], 0.25)
add(buf, bell(hz(81), 1.2), EV['ring2'], 0.2); add(fx, sparkle(86, (0, 4, 7)), EV['ring2'] + 0.05, 0.10)
# journey: light groove for 2 bars, then thin out and build
add(fx, whoosh(0.7), S[2] - 0.7, 0.2)
groove(5, 7, 1)
for k, m in enumerate([62, 66, 69, 74, 78, 81, 86, 90]): add(buf, pluck(hz(m), 0.5), S[2] + 0.5 + k * B, 0.2 + 0.01 * k)   # the ship moves along its route: rising line
add(buf, bell(hz(88), 1.2), EV['ring3'], 0.18)
add(buf, pad([hz(m + 12) for m in CH['A']], BAR + 0.1, 2200), 7 * BAR, 0.2)
add(fx, riser(BAR - 0.12), 7 * BAR, 0.20)
at = 7 * BAR; k = 0
while at < S[3] - 0.14: add(drums, shaker(), at, 0.08 + 0.2 * (at - 7 * BAR) / BAR); at += B / 2 if at < 7 * BAR + 2 * B else B / 4
# payoff: zoom out
add(fx, impact(), S[3], 0.55)
groove(8, 10, 2)
MEL = [86, 81, 78, 81, 83, 81, 78, 74]
for k, m in enumerate(MEL + MEL): add(buf, pluck(hz(m), 0.4), S[3] + k * B / 2, 0.15)

add(buf, bell(hz(86), 1.2), EV['ring4'], 0.18)
# flow: thinner, precise
add(fx, whoosh(0.6), S[4] - 0.6, 0.18)
groove(10, 12, 1)
for k in range(16):
    if k % 4 != 3: add(buf, pluck(hz([74, 78, 81, 86][k % 4]), 0.3), S[4] + k * B / 2, 0.11)
add(buf, bell(hz(81), 1.2), EV['ring5'], 0.2); add(fx, sparkle(86, (0, 4, 7, 12)), EV['ring5'] + 0.05, 0.12)
# end card: chord + motif echo
add(fx, whoosh(0.5), S[5] - 0.5, 0.14)
add(drums, kick(soft=True), S[5], 0.7)
add(buf, pad([hz(m + 12) for m in CH['D']] + [hz(74)], DUR - S[5] + 0.2, 1800), S[5], 0.32)
add(buf, sub(hz(38), 2.5), S[5], 0.4)
for k, m in enumerate([74, 78, 81, 86]): add(buf, bell(hz(m), 1.8), S[5] + 0.1 + k * B / 2, 0.2)
write(master((buf + drums + fx)[:int(DUR * SR)], fade_out=0.9), sys.argv[1]); print('ok', round(DUR, 2))
