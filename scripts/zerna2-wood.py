"""Procedural wall of vertical wooden boards (like the chalet facades) for teaser 2.
Writes public/zerna2/wood-wall.jpg, 1080x1920. Usage: python3 scripts/zerna2-wood.py"""
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom

W, H = 1080, 1920
rng = np.random.default_rng(11)


def fbm(h, w, scale_y, scale_x, octaves=5, seed=0):
    """Smooth value noise, stretched by (scale_y, scale_x)."""
    r = np.random.default_rng(seed)
    out = np.zeros((h, w))
    amp, total = 1.0, 0.0
    for o in range(octaves):
        gy = max(2, int(h / scale_y * 2**o))
        gx = max(2, int(w / scale_x * 2**o))
        g = r.standard_normal((gy + 1, gx + 1))
        out += amp * zoom(g, ((h + 1) / (gy + 1), (w + 1) / (gx + 1)), order=3)[:h, :w]
        total += amp
        amp *= 0.5
    return out / total


yy, xx = np.mgrid[0:H, 0:W].astype(float)
edges = np.linspace(0, W, 8).round().astype(int)  # seven boards across the frame
img = np.zeros((H, W, 3))

for b, (x0, x1) in enumerate(zip(edges[:-1], edges[1:])):
    cols = x1 - x0
    u = xx[:, x0:x1] - x0
    # grain: rings along the board, warped by stretched noise, with a knot or two
    v = u + fbm(H, cols, 700, 50, seed=100 + b) * 30
    for _ in range(rng.integers(0, 3)):
        ky, kx = rng.uniform(150, H - 150), rng.uniform(30, cols - 30)
        dy, dx = (yy[:, x0:x1] - ky) / 3.2, u - kx
        v += 18 * np.exp(-(dx**2 + dy**2) / 900) * np.sign(dx + 1e-3)
    rings = (0.5 + 0.5 * np.sin(v * 0.55 + fbm(H, cols, 400, 30, seed=300 + b) * 6)) ** 3
    tone = rng.uniform(0.82, 1.12)
    base = np.array([118, 82, 50]) * tone
    dark = np.array([78, 52, 30]) * tone
    c = base * (1 - 0.45 * rings[..., None]) + dark * 0.45 * rings[..., None]
    c *= (1 + 0.10 * fbm(H, cols, 60, 3, octaves=3, seed=200 + b))[..., None]
    # long darker streaks, weathering
    c *= (0.92 + 0.08 * fbm(H, cols, 1200, 80, seed=400 + b))[..., None]
    img[:, x0:x1] = c

# seams between boards: dark gap with a slight bevel highlight
seam = np.zeros((H, W))
for x0 in edges[1:-1]:
    seam += np.exp(-((xx - x0) ** 2) / 6)
    seam -= 0.25 * np.exp(-((xx - x0 - 4) ** 2) / 8)
img *= (1 - 0.75 * np.clip(seam, 0, 1))[..., None]
img += 10 * np.clip(-seam, 0, 1)[..., None]

# nails: three per board
for x0, x1 in zip(edges[:-1], edges[1:]):
    for y in (260, 980, 1700):
        cx = (x0 + x1) / 2 + rng.uniform(-30, 30)
        cy = y + rng.uniform(-25, 25)
        img *= (1 - 0.55 * np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / 18))[..., None]
        img += (25 * np.exp(-((xx - cx + 1.5) ** 2 + (yy - cy + 1.5) ** 2) / 4))[..., None]

img = gaussian_filter(img, (0.6, 0.6, 0))
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save("public/zerna2/wood-wall.jpg", quality=92)
print("public/zerna2/wood-wall.jpg", W, H)
