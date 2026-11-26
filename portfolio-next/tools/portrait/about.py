"""About avatar: the retouched portrait in front of the Roots city, softly out of focus, with a faint edge light."""
import os, sys
import cv2
import numpy as np
from PIL import Image

S = os.path.dirname(os.path.abspath(__file__)); P = sys.argv[1]
SP = os.path.dirname(S)
SIZE = 720
cut = Image.open(f"{S}/in/nat_retouched_cut.png").convert("RGBA")
# square around head and shoulders, a little air above the hair
side = 940
left, top = 591 - side // 2 - 6, 44
fg = np.asarray(cut.crop((left, top, left + side, top + side)).resize((SIZE, SIZE), Image.LANCZOS)).astype(np.float32) / 255

# backdrop: our own rendered city, as an out-of-focus night view
plate = Image.open(f"{SP}/roots3/beauty_wide.png").convert("RGBA")
w, h = plate.size
crop = plate.crop((int(w * .04), int(h * .36), int(w * .04) + int(h * .62), int(h * .98))).resize((SIZE, SIZE), Image.LANCZOS)
c = np.asarray(crop).astype(np.float32) / 255
y = np.linspace(0, 1, SIZE, dtype=np.float32)[:, None, None]
sky = np.array([12, 30, 52], np.float32) / 255 * (1 - y) + np.array([6, 16, 30], np.float32) / 255 * y
city = c[..., :3] * c[..., 3:] + sky * (1 - c[..., 3:])
glint = np.clip(city - 0.20, 0, 1)
disc = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (19, 19)).astype(np.float32); disc /= disc.sum()
bokeh = cv2.filter2D(glint, -1, disc)                       # lens-style round highlights
bg = cv2.GaussianBlur(city, (0, 0), 7) + bokeh * 1.9
yy, xx = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32) / SIZE
halo = np.exp(-(((xx - .5) / .36) ** 2 + ((yy - .40) / .40) ** 2))[..., None]
bg = np.clip(bg + halo * np.array([14, 44, 70], np.float32) / 255, 0, 1)

alpha = fg[..., 3]
def edge(dx):
    moved = cv2.warpAffine(alpha, np.float32([[1, 0, dx], [0, 1, 3]]), (SIZE, SIZE), borderMode=cv2.BORDER_REPLICATE)
    return cv2.GaussianBlur(np.clip(alpha - moved, 0, 1), (0, 0), 2.2) * alpha
rim = edge(9)[..., None] * np.array([34, 211, 238], np.float32) / 255 * 0.42 \
    + edge(-9)[..., None] * np.array([99, 122, 255], np.float32) / 255 * 0.30
col = 1 - (1 - fg[..., :3]) * (1 - rim)
out = col * alpha[..., None] + bg * (1 - alpha[..., None])
img = Image.fromarray((np.clip(out, 0, 1) * 255 + .5).astype(np.uint8))
img.save(f"{P}/public/img/about-v3.avif", "AVIF", quality=62, speed=3, subsampling="4:2:0")
img.save(f"{S}/view/about.jpg", quality=94)
print("about-v2", img.size, os.path.getsize(f"{P}/public/img/about-v2.webp") // 1024, "KB")
