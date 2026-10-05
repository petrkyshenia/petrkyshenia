"""Soft copies of the genplan renders: phase 0 shows the silhouettes, not the details.

Gaussian blur in source pixels, so every place a render appears (videos at 1.7x, covers at 0.6-1x)
loses the same detail: windows, cars, people and paths blur, house and road shapes stay readable.
The day render gets more because its houses are about twice as large in the frame.
"""
from PIL import Image, ImageFilter

SOFT = [
    ("public/zerna/genplan-night.jpg", "public/zerna/genplan-night-soft.jpg", 6.5),
    ("public/zerna2/genplan.jpg", "public/zerna2/genplan-soft.jpg", 9),
]

for src, dst, radius in SOFT:
    Image.open(src).convert("RGB").filter(ImageFilter.GaussianBlur(radius)).save(dst, quality=92)
    print(dst, radius)
