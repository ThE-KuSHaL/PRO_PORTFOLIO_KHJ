"""
Hero portrait: the retouched new head and neck on the existing crossed-arms body.
The seam runs along the shirt collar. Real pixels only, nothing generated.
"""
import json, os, sys
import cv2
import numpy as np
from PIL import Image

S = os.path.dirname(os.path.abspath(__file__))
body = np.asarray(Image.open(f"{S}/in/body.png").convert("RGBA")).astype(np.float32)
head = np.asarray(Image.open(f"{S}/in/nat_retouched_cut.png").convert("RGBA")).astype(np.float32)
lm = json.load(open(f"{S}/landmarks.json"))
H, W = body.shape[:2]

# similarity transform new photo -> body, fitted on eyes + chin
ids = [33, 133, 159, 145, 362, 263, 386, 374, 152]
M, _ = cv2.estimateAffinePartial2D(np.float32([lm["nat_cut"][i] for i in ids]), np.float32([lm["body"][i] for i in ids]),
                                   method=cv2.LMEDS)
scale = float(np.hypot(M[0, 0], M[1, 0])); angle = float(np.degrees(np.arctan2(M[1, 0], M[0, 0])))
print("scale", round(scale, 3), "rotate", round(angle, 2), "deg")

def warp(a):
    pm = a.copy(); pm[..., :3] *= pm[..., 3:] / 255
    out = cv2.warpAffine(pm, M, (W, H), flags=cv2.INTER_LANCZOS4, borderValue=(0, 0, 0, 0)).clip(0, 255)
    al = out[..., 3:]
    out[..., :3] = np.where(al > 1, out[..., :3] * 255 / np.maximum(al, 1), 0)
    return out.clip(0, 255)

nh = warp(head)

# collar line in body coordinates: above it comes from the new photo, below it stays as it was
LINE = [(0, 741), (878, 741), (903, 749), (919, 773), (958, 809), (999, 846), (1039, 885), (1079, 923), (1109, 949),
        (1131, 983), (1148, 1022), (1164, 1070), (1175, 1042), (1185, 1002), (1195, 962), (1199, 922), (1196, 862),
        (1192, 797), (1204, 808), (1225, 848), (1241, 866), (1300, 884), (2047, 884)]
poly = np.array(LINE + [(2047, 0), (0, 0)], np.int32)
above = np.zeros((H, W), np.uint8); cv2.fillPoly(above, [poly], 255)
above = cv2.GaussianBlur(above.astype(np.float32) / 255, (0, 0), 1.1)

def skin_mask(a):
    ycc = cv2.cvtColor(a[..., :3].astype(np.uint8), cv2.COLOR_RGB2YCrCb)
    m = (ycc[..., 1] > 138) & (ycc[..., 1] < 180) & (ycc[..., 2] > 85) & (ycc[..., 2] < 130) & (ycc[..., 0] > 45) & (a[..., 3] > 200)
    return cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)) > 0

def lab_of(a):
    return cv2.cvtColor(a[..., :3].astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)

def to_rgb(l):
    return cv2.cvtColor(l.clip(0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB).astype(np.float32)

yy, xx = np.mgrid[0:H, 0:W]
new_face = skin_mask(nh) & (yy > 330) & (yy < 760) & (xx > 900) & (xx < 1240)
hands = skin_mask(body) & (yy > 1300)
face_lab = np.median(lab_of(nh)[new_face], 0); hand_lab = np.median(lab_of(body)[hands], 0)
print("face LAB", face_lab.round(), "hands LAB", hand_lab.round())

# 1) the new head was lit softer and brighter than the body: bring it part of the way down
nl = lab_of(nh)
nl[..., 0] *= 1 - 0.35 * max(0.0, 1 - (hand_lab[0] + 14) / max(face_lab[0], 1))
nh[..., :3] = to_rgb(nl)
face_lab = np.median(lab_of(nh)[new_face], 0)
# 2) hands (and the skin left in the open collar) move toward the face's colour
below = skin_mask(body) & (above < 0.5)
weight = cv2.GaussianBlur(below.astype(np.float32), (0, 0), 2.0)[..., None]
bl = lab_of(body)
shift = (face_lab - hand_lab) * np.array([0.35, 0.7, 0.7], np.float32)
adjusted = to_rgb(bl + shift)
body[..., :3] = body[..., :3] * (1 - weight) + adjusted * weight

# the new layer: head, hair and neck only (never its own jacket outside the old collar)
new_a = nh[..., 3] / 255 * above
base_a = body[..., 3] / 255 * (1 - above)
# slivers of the new photo's own shirt peeking past the old collar: hand those pixels back to the body
n_lab = lab_of(nh)
white = (n_lab[..., 0] > 150) & (np.abs(n_lab[..., 1] - 128) < 15) & (np.abs(n_lab[..., 2] - 128) < 17)
zone = (xx < 925) & (yy > 700) & (yy < 750)                # left of the neck only (pale chin skin is never in it)
bad = cv2.GaussianBlur(cv2.dilate((white & zone).astype(np.uint8), np.ones((5, 5), np.uint8)).astype(np.float32), (0, 0), 1.2)
collar_zone = ((xx < 960) & (yy >= 744)) | ((xx >= 960) & (yy >= 806))   # only here is the old pixel really collar
base_a = base_a + (body[..., 3] / 255 - base_a) * bad * collar_zone
new_a = new_a * (1 - bad)
alpha = new_a + base_a
col = (nh[..., :3] * new_a[..., None] + body[..., :3] * base_a[..., None]) / np.maximum(alpha, 1e-4)[..., None]

# soften the join inside the open collar, where old neck skin meets new
seam = np.zeros((H, W), np.uint8)
cv2.polylines(seam, [np.array(LINE[3:18], np.int32)], False, 255, 9)
inside = cv2.GaussianBlur((seam > 0).astype(np.float32), (0, 0), 4)
inside *= cv2.GaussianBlur((skin_mask(body) | skin_mask(nh)).astype(np.float32), (0, 0), 3)
col = col * (1 - inside[..., None]) + cv2.GaussianBlur(col.astype(np.float32), (0, 0), 3.5) * inside[..., None]

out = np.dstack([col, np.clip(alpha, 0, 1) * 255]).clip(0, 255).astype(np.uint8)
out[out[..., 3] < 3] = 0
Image.fromarray(out, "RGBA").save(f"{S}/hero_composite.png")

# review sheet: whole figure on the site's navy, plus the seam close up
bg = Image.new("RGBA", (W, H), (3, 8, 16, 255)); bg.alpha_composite(Image.fromarray(out, "RGBA"))
sheet = Image.new("RGB", (1000 + 20 + 1000, 1000), (255, 255, 255))
sheet.paste(bg.convert("RGB").crop((420, 40, 1900, 2048)).resize((737, 1000), Image.LANCZOS), (130, 0))
sheet.paste(bg.convert("RGB").crop((800, 520, 1340, 1160)).resize((844, 1000), Image.LANCZOS), (1100, 0))
sheet.save(f"{S}/view/hero.jpg", quality=94)
