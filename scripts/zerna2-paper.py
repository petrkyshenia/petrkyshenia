"""Poster paper texture (wheat-pasted print) and the sprout icon for teaser 2.
Writes public/zerna2/paper.png and public/zerna2/icon-green.png. Usage: python3 scripts/zerna2-paper.py"""
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom

rng = np.random.default_rng(5)
W, H = 640, 905  # A-format, 1:1.414
yy, xx = np.mgrid[0:H, 0:W].astype(float)

fibres = gaussian_filter(rng.standard_normal((H, W)), (0.6, 1.4)) * 2.2
blotch = zoom(rng.standard_normal((12, 9)), (H / 12, W / 9), order=3)[:H, :W] * 3.0
# paste wrinkles: a few soft diagonal ridges
wrinkle = np.zeros((H, W))
for _ in range(5):
    a, c, w = rng.uniform(-0.6, 0.6), rng.uniform(0, W + H), rng.uniform(6, 22)
    d = xx * np.cos(a) + yy * np.sin(a) - c * 0.6
    wrinkle += np.exp(-(d**2) / (2 * w**2)) * rng.choice([-1, 1]) * rng.uniform(3, 7)
shade = (xx / W * 0.5 + yy / H * 0.5) * -10  # light from the top left
lum = 250 + fibres + blotch + wrinkle + shade
ivory = np.array([250, 246, 240]) / 250
img = np.clip(lum[..., None] * ivory, 0, 255).astype(np.uint8)
Image.fromarray(img).save("public/zerna2/paper.png")

# sprout icon: top part of the vertical logo, recoloured to Deep Forest Green
logo = np.asarray(Image.open("public/zerna/logo-vertical-ivory-sand.png").convert("RGBA"))
alpha = logo[..., 3]
rows = np.where(alpha.max(1) > 0)[0]
gap = np.where(np.diff(rows) > 20)[0][0]  # first empty band under the leaves
icon = logo[: rows[gap] + 1]
cols = np.where(icon[..., 3].max(0) > 0)[0]
icon = icon[:, cols.min() : cols.max() + 1].copy()
icon[..., :3] = (8, 40, 29)
Image.fromarray(icon).save("public/zerna2/icon-green.png")
print("paper", W, H, "| icon", icon.shape[1], icon.shape[0])
