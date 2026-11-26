"""
Non-generative retouch of the Nat portrait: heals small blemishes and evens blotchy tone.
No face model redraws anything, no feature is reshaped, and pore-scale texture is kept.
"""
import json, os
import cv2
import numpy as np
from PIL import Image

S = os.path.dirname(os.path.abspath(__file__))
rgb = np.asarray(Image.open(f"{S}/in/nat.png").convert("RGB"))
lm = np.array(json.load(open(f"{S}/landmarks.json"))["nat_cut"], np.float32)
H, W = rgb.shape[:2]

def hull(ids, grow=0):
    m = np.zeros((H, W), np.uint8)
    cv2.fillConvexPoly(m, cv2.convexHull(lm[ids].astype(np.int32)), 255)
    return cv2.dilate(m, np.ones((grow * 2 + 1,) * 2, np.uint8)) if grow else m

OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176,
        149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)

# face outline, pushed up to reach the hairline, then limited to skin colour so hair stays out
poly = lm[OVAL].copy()
top = poly[:, 1] < lm[105, 1]
poly[top, 1] -= 55
face = np.zeros((H, W), np.uint8)
cv2.fillPoly(face, [poly.astype(np.int32)], 255)
cheek = np.median(lab[(hull([117, 118, 101, 36, 205, 187, 123]) > 0)], 0)
dist = np.sqrt((((lab - cheek) * np.array([0.35, 1.3, 1.0])) ** 2).sum(-1))
skin = ((face > 0) & (dist < 30) & (lab[..., 0] > cheek[0] * 0.55)).astype(np.uint8) * 255
skin = cv2.morphologyEx(skin, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))

EYE_L = [33, 133, 159, 145, 70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 160, 144, 158, 153]
EYE_R = [362, 263, 386, 374, 300, 293, 334, 296, 336, 285, 295, 282, 283, 276, 385, 380, 387, 373]
LIPS = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146]
keep = hull(EYE_L, 9) | hull(EYE_R, 9) | hull(LIPS, 8) | hull([61, 291, 2, 98, 327, 205, 425], 3) | hull([2, 98, 327, 97, 326, 48, 278], 6)
keep = keep | hull(EYE_L, 34) | hull(EYE_R, 34)        # whole lens + frame: nothing is touched there
beard = np.zeros((H, W), np.uint8)
beard[int(lm[17, 1]) - 4:] = 255                       # stubble below the lips is not a blemish

grey = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
edges = cv2.Canny(cv2.GaussianBlur(grey, (0, 0), 1.0), 40, 90)
n, cc, st, _ = cv2.connectedComponentsWithStats(edges, 8)
long_edges = np.isin(cc, [i for i in range(1, n) if max(st[i, 2], st[i, 3]) > 55]).astype(np.uint8) * 255
frames = cv2.dilate(long_edges, np.ones((7, 7), np.uint8))    # glasses frames, jaw line

allow = (skin > 0) & (keep == 0) & (beard == 0) & (frames == 0)
L, A = lab[..., 0], lab[..., 1]
g = lambda c, s: cv2.GaussianBlur(c, (0, 0), s)
dark = (g(L, 7) - g(L, 1.1)) > 4.2
red = (g(A, 1.2) - g(A, 9)) > 2.1
bright = ((g(L, 1.1) - g(L, 7)) > 5.5) & (np.arange(H)[:, None] < lm[105, 1] - 10)   # forehead bumps only
cand = ((dark | red | bright) & allow).astype(np.uint8)
n, cc, st, _ = cv2.connectedComponentsWithStats(cand, 8)
good = [i for i in range(1, n)
        if 4 <= st[i, cv2.CC_STAT_AREA] <= 240
        and max(st[i, 2], st[i, 3]) <= 3.2 * max(1, min(st[i, 2], st[i, 3]))
        and st[i, cv2.CC_STAT_AREA] / (st[i, 2] * st[i, 3]) > 0.34]
spots = np.isin(cc, good).astype(np.uint8) * 255
spots = cv2.dilate(spots, np.ones((5, 5), np.uint8)) & (allow.astype(np.uint8) * 255)
print("blemishes healed:", len(good), "pixels:", int((spots > 0).sum()))

img = rgb.astype(np.float32)
def masked_blur(src, weight, sigma):
    num = cv2.GaussianBlur(src * weight[..., None], (0, 0), sigma)
    den = cv2.GaussianBlur(weight, (0, 0), sigma)[..., None]
    return num / np.maximum(den, 1e-4)

# heal: new low frequencies from clean neighbours, real pore texture borrowed from beside the spot
clean = (1.0 - (spots > 0)).astype(np.float32) * (skin > 0)
low_fill = masked_blur(img, clean, 4.5)
high = img - cv2.GaussianBlur(img, (0, 0), 2.2)
donor = np.zeros_like(high); taken = np.zeros((H, W), bool)
for dx, dy in ((11, 3), (-11, -3), (4, 12), (-4, -12), (17, 0)):
    shifted = np.roll(high, (dy, dx), (0, 1)); ok = np.roll(clean, (dy, dx), (0, 1)) > 0
    use = ok & ~taken
    donor[use] = shifted[use]; taken |= use
soft = cv2.GaussianBlur((spots > 0).astype(np.float32), (0, 0), 1.3)[..., None]
healed = img * (1 - soft) + np.clip(low_fill + donor * 0.85, 0, 255) * soft

# tone: shrink mid-sized blotches (redness, patchiness); shading and pores are outside this band
lab2 = cv2.cvtColor(healed.clip(0, 255).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
w_skin = ((skin > 0) & (keep == 0) & (frames == 0)).astype(np.float32)
band = masked_blur(lab2, w_skin, 3.6) - masked_blur(lab2, w_skin, 26)
beard_ease = 1.0 - cv2.GaussianBlur((beard > 0).astype(np.float32), (0, 0), 14) * 0.7
feather = (cv2.GaussianBlur(w_skin, (0, 0), 5) * w_skin * beard_ease)[..., None]
lab2 -= band * np.array([0.42, 0.62, 0.34], np.float32) * feather
out = cv2.cvtColor(lab2.clip(0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
Image.fromarray(out).save(f"{S}/in/nat_retouched.png")
cut = np.dstack([np.where(feather > 0.02, out, np.asarray(Image.open(f"{S}/in/nat_cut.png").convert("RGB"))),
                 np.asarray(Image.open(f"{S}/in/nat_cut.png").convert("RGBA"))[..., 3]])
Image.fromarray(cut.astype(np.uint8), "RGBA").save(f"{S}/in/nat_retouched_cut.png")

box = (360, 300, 820, 760)
pair = Image.new("RGB", (460 * 2 * 2 + 20, 460 * 2), (255, 255, 255))
pair.paste(Image.fromarray(rgb).crop(box).resize((920, 920), Image.LANCZOS), (0, 0))
pair.paste(Image.fromarray(out).crop(box).resize((920, 920), Image.LANCZOS), (940, 0))
pair.save(f"{S}/view/retouch.jpg", quality=94)
