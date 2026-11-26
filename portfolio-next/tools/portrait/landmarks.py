"""Face landmarks (offline MediaPipe) for the new portrait and the current hero body; also a gridded neck crop."""
import json, os, sys, urllib.request
import numpy as np
from PIL import Image, ImageDraw
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import FaceLandmarker, FaceLandmarkerOptions

S = os.path.dirname(os.path.abspath(__file__)); P = sys.argv[1]
model = os.path.join(S, "face_landmarker.task")
if not os.path.exists(model):   # public model file download; nothing is sent
    urllib.request.urlretrieve("https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task", model)
det = FaceLandmarker.create_from_options(FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path=model), num_faces=1))

body = Image.open(os.path.join(P, "public", "till knee_PORT.png")).convert("RGBA")
body.save(f"{S}/in/body.png")
body.transpose(Image.FLIP_LEFT_RIGHT).save(f"{S}/in/body_mirror.png")
out = {}
for name in ("nat_cut", "body", "body_mirror"):
    im = Image.open(f"{S}/in/{name}.png").convert("RGBA")
    bg = Image.new("RGBA", im.size, (128, 128, 128, 255)); bg.alpha_composite(im)
    arr = np.ascontiguousarray(np.asarray(bg.convert("RGB")))
    if name.startswith("body"):                       # detect on the head region, then map back
        x0, y0 = (560, 80) if name == "body" else (2048 - 560 - 800, 80)
        crop = np.ascontiguousarray(arr[y0:y0 + 700, x0:x0 + 800])
    else:
        x0, y0, crop = 0, 0, arr
    res = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=crop))
    assert res.face_landmarks, name
    h, w = crop.shape[:2]
    pts = [[x0 + l.x * w, y0 + l.y * h] for l in res.face_landmarks[0]]
    out[name] = pts
    eye = lambda ids: np.mean([pts[i] for i in ids], 0).round(1).tolist()
    print(name, "eyeA", eye([33, 133, 159, 145]), "eyeB", eye([362, 263, 386, 374]), "chin", np.round(pts[152], 1).tolist(),
          "brow-top", np.round(pts[10], 1).tolist(), "face-x", round(pts[234][0]), round(pts[454][0]))
json.dump(out, open(f"{S}/landmarks.json", "w"))

def grid(path, box, k, out_path):
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", im.size, (0, 190, 90, 255)); bg.alpha_composite(im)
    c = bg.crop(box).resize(((box[2] - box[0]) * k, (box[3] - box[1]) * k), Image.LANCZOS)
    d = ImageDraw.Draw(c)
    for x in range(box[0] - box[0] % 40, box[2], 40):
        d.line([((x - box[0]) * k, 0), ((x - box[0]) * k, c.height)], fill=(255, 255, 0, 90)); d.text(((x - box[0]) * k + 2, 2), str(x), fill=(255, 255, 0))
    for y in range(box[1] - box[1] % 40, box[3], 40):
        d.line([(0, (y - box[1]) * k), (c.width, (y - box[1]) * k)], fill=(255, 255, 0, 90)); d.text((2, (y - box[1]) * k + 2), str(y), fill=(255, 255, 0))
    c.convert("RGB").save(out_path, quality=92)

grid(f"{S}/in/body_mirror.png", (900, 360, 1300, 760), 3, f"{S}/view/neck_mirror.jpg")
grid(f"{S}/in/nat_cut.png", (240, 540, 860, 1160), 2, f"{S}/view/neck_nat.jpg")
