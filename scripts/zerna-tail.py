"""Echo tail for a teaser track: the source stays bit-identical up to `--wet-from`, then a tempo-synced
echo + reverb throw of the last hit carries the CTA and fades out before the reel ends.
Teaser 1 (defaults): python3 scripts/zerna-tail.py
Teaser 2: python3 scripts/zerna-tail.py --src public/zerna2/music.wav --dst public/zerna2/music-tail.wav \
          --hit 12.10 12.60 --wet-from 12.45 --bpm 150"""
import argparse
import wave

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

ap = argparse.ArgumentParser()
ap.add_argument("--src", default="public/zerna/music.wav")
ap.add_argument("--dst", default="public/zerna/music-tail.wav")
ap.add_argument("--end", type=float, default=15.0, help="reel length, s")
ap.add_argument("--hit", type=float, nargs=2, default=(11.70, 11.92), help="the last hit, s")
ap.add_argument("--wet-from", type=float, default=11.86, help="the tail is silent before this, s")
ap.add_argument("--bpm", type=float, default=140)
args = ap.parse_args()

SRC, DST, END, HIT = args.src, args.dst, args.end, args.hit
QUARTER = 60 / args.bpm  # echo spacing: one beat

w = wave.open(SRC)
sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
dry = np.frombuffer(w.readframes(n), np.int16).reshape(-1, ch).astype(np.float64) / 32768

out = np.zeros((int(END * sr), ch))
out[: len(dry)] = dry

a, b = (int(t * sr) for t in HIT)
stab = dry[a:b].copy()
ramp = lambda k: np.linspace(0, 1, k)[:, None]
stab[: int(0.005 * sr)] *= ramp(int(0.005 * sr))
stab[-int(0.01 * sr):] *= ramp(int(0.01 * sr))[::-1]

wet = np.zeros_like(out)

# echoes: each repeat ~4 dB quieter and darker, panned alternately left / right
for k in range(1, 9):
    sos = butter(2, max(1500, 9000 - 900 * k), "low", fs=sr, output="sos")
    rep = sosfilt(sos, stab, axis=0) * 0.62**k
    pan = np.array([0.75, 0.45]) if k % 2 else np.array([0.45, 0.75])
    at = a + int(k * QUARTER * sr)
    if at >= len(wet):
        break
    seg = (rep * pan)[: len(wet) - at]
    wet[at : at + len(seg)] += seg

# short reverb wash on the hit to glue the echoes (RT60 2.6 s, no low end)
rng = np.random.default_rng(7)
t = np.arange(int(2.8 * sr)) / sr
ir = rng.standard_normal((len(t), ch)) * np.exp(-6.91 * t / 2.6)[:, None]
ir[: int(0.025 * sr)] = 0  # pre-delay
ir = sosfilt(butter(2, [200, 7000], "band", fs=sr, output="sos"), ir, axis=0)
ir /= np.sqrt((ir**2).sum(0))
verb = np.stack([fftconvolve(stab[:, c], ir[:, c]) for c in range(ch)], 1)[: len(wet) - a] * 0.35
wet[a : a + len(verb)] += verb

# the tail starts at --wet-from (teaser 1: where the stab ends),
# and fades out so the loop restarts from silence, like the reference
fade = np.ones(len(wet))
s0, s1 = int(args.wet_from * sr), int(round(args.wet_from + 0.04, 6) * sr)
fade[:s0] = 0
fade[s0:s1] = np.linspace(0, 1, s1 - s0)
f0, f1 = int(14.0 * sr), int(14.9 * sr)
fade[f0:f1] = np.cos(np.linspace(0, np.pi / 2, f1 - f0)) ** 2
fade[f1:] = 0
wet *= fade[:, None]

# the original is never touched: if the overlap would clip, only the tail is turned down
limit = max(np.abs(dry).max(), 10 ** (-1 / 20))
gain = 1.0
while np.abs(out + wet * gain).max() > limit:
    gain *= 0.95
out += wet * gain
o = wave.open(DST, "wb")
o.setnchannels(ch)
o.setsampwidth(2)
o.setframerate(sr)
o.writeframes(np.clip(np.round(out * 32768), -32768, 32767).astype(np.int16).tobytes())
o.close()
print(f"{DST}: {END} s, peak {20 * np.log10(np.abs(out).max()):.1f} dBFS, tail gain {gain:.2f}, original untouched up to {args.wet_from} s")
