"""
Post for THE ROOTS renders: bloom + grade.

  python -I post_roots.py preview <beauty.png> <out.png> [--ref reference.webp]
      composite over a navy sky (optionally stacked above the art reference for comparison)
  python -I post_roots.py export <render dir> <public/roots>
"""
import json
import os
import sys
import numpy as np
from PIL import Image, ImageFilter

def load_rgba(path):
    return np.asarray(Image.open(path).convert("RGBA"), dtype=np.float32) / 255.0

def blur(arr, radius):
    """Gaussian blur of a float HxWx3 array; large radii are done downsampled."""
    h, w = arr.shape[:2]
    k = max(1, int(radius // 6))
    img = Image.fromarray((np.clip(arr, 0, 1) * 255 + .5).astype(np.uint8))
    if k > 1:
        img = img.resize((max(1, w // k), max(1, h // k)), Image.BOX)
    img = img.filter(ImageFilter.GaussianBlur(radius / k))
    if k > 1:
        img = img.resize((w, h), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32) / 255.0

def bloom_grade(rgba):
    """Returns straight-alpha RGBA with glow that also spills into the transparent sky."""
    rgb, a = rgba[..., :3], rgba[..., 3:]
    pre = rgb * a
    lum = (pre * np.array([.2126, .7152, .0722], np.float32)).sum(-1, keepdims=True)
    peak = pre.max(-1, keepdims=True)
    bright = pre * np.clip((np.maximum(lum * 1.6, peak) - .30) / .55, 0, 1)
    s = rgb.shape[1] / 2000.0
    glow = (blur(bright, 2.5 * s) * .55 + blur(bright, 9 * s) * .50 + blur(bright, 34 * s) * .42)
    glow *= np.array([.80, .95, 1.12], np.float32)
    out = 1 - (1 - pre) * (1 - np.clip(glow, 0, 1))                  # screen
    out = np.clip(out, 0, 1) ** np.array([1.06, 1.0, .96], np.float32)  # cool the mids
    grey = (out * np.array([.2126, .7152, .0722], np.float32)).sum(-1, keepdims=True)
    out = np.clip(grey + (out - grey) * .86, 0, 1)                     # muted, filmic
    ga = np.clip(glow.max(-1, keepdims=True) * 1.6, 0, 1)
    oa = np.clip(a + (1 - a) * ga, 0, 1)
    straight = np.where(oa > 1e-4, out / np.maximum(oa, 1e-4), 0)
    return np.concatenate([np.clip(straight, 0, 1), oa], -1)

def sky(h, w):
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    x = np.linspace(0, 1, w, dtype=np.float32)[None, :, None]
    top = np.array([7, 15, 27], np.float32) / 255
    mid = np.array([10, 24, 42], np.float32) / 255
    base = top + (mid - top) * np.clip(1 - np.abs(y - .68) / .55, 0, 1)
    haze = np.exp(-(((x - .72) / .34) ** 2 + ((y - .60) / .36) ** 2))
    return base * np.ones((h, w, 3), np.float32) + haze * np.array([4, 16, 32], np.float32) / 255

def composite(rgba):
    h, w = rgba.shape[:2]
    c = rgba[..., :3] * rgba[..., 3:] + sky(h, w) * (1 - rgba[..., 3:])
    yy = np.linspace(-1, 1, h, dtype=np.float32)[:, None]
    xx = np.linspace(-1, 1, w, dtype=np.float32)[None, :]
    vig = 1 - .38 * np.clip((xx ** 2 * .75 + yy ** 2 * .65) - .35, 0, 1)
    return np.clip(c * vig[..., None], 0, 1)

def to_img(arr):
    return Image.fromarray((arr * 255 + .5).astype(np.uint8))

def defringe(rgba):
    """Give see-through pixels the colour of their neighbours. Left black, they darken every thin edge once
    the picture is filtered or compressed (dark outlines that read as a doubled twig)."""
    rgb, a = rgba[..., :3], rgba[..., 3:]
    s = rgb.shape[1] / 2000.0
    fill = np.zeros_like(rgb)
    weight = np.zeros_like(a)
    for radius in (2 * s, 8 * s, 32 * s):
        num = blur(rgb * a, max(1.0, radius))
        den = blur(np.repeat(a, 3, -1), max(1.0, radius))[..., :1]
        take = (weight < .5) & (den > .008)
        fill = np.where(take, np.clip(num / np.maximum(den, 1e-4), 0, 1), fill)
        weight = np.where(take, 1.0, weight)
    mix = np.clip(a * 4, 0, 1)                         # keep true colour wherever there is real coverage
    return np.concatenate([rgb * mix + fill * (1 - mix), a], -1)

def save_avif(arr, path, width=None, quality=70, sharpen=True):
    img = Image.fromarray((arr * 255 + .5).astype(np.uint8), "RGBA")
    if width and width < img.width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
        if sharpen:   # downsampling softens the finest twigs: give their edges back (colour only)
            crisp = img.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.1, percent=55, threshold=2))
            crisp.putalpha(img.getchannel("A"))
            img = crisp
    img.save(path, "AVIF", quality=quality, speed=3, subsampling="4:2:0")

def aura_map(data_rgb, alpha, width):
    """Soft halo around each story part: R = roots, G = trunk, B = great branch.
    The page uses it to make one part glow on its own, spilling a little past its edges."""
    part = np.asarray(data_rgb, dtype=np.float32)[..., 1]
    h, w = part.shape
    mask_a = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR), np.float32) / 255
    channels = []
    for target in (64, 128, 191):                     # part ids .25 / .5 / .75 in 8 bits
        m = ((np.abs(part - target) < 9) & (mask_a > .35)).astype(np.float32)
        img = Image.fromarray((m * 255).astype(np.uint8)).resize((width, round(h * width / w)), Image.BOX)
        near = np.asarray(img.filter(ImageFilter.GaussianBlur(width * .006)), np.float32)
        wide = np.asarray(img.filter(ImageFilter.GaussianBlur(width * .022)), np.float32)
        channels.append(Image.fromarray(np.clip(near * .75 + wide * 1.1, 0, 255).astype(np.uint8)))
    return Image.merge("RGB", channels)

def export(src, dst):
    """Renders in <src> -> web assets in <dst> (public/roots).
    Two layers per layout: `plate` is the tree alone (kept sharp), `back` is the city alone (lens blur, haze).
    Neither ever moves: the tree must read as a rigid structure."""
    os.makedirs(dst, exist_ok=True)
    meta = {}
    for layout, tree_widths, back_width in (("wide", (2560, 1600), 1600), ("tall", (1100, 760), 760)):
        tree = defringe(bloom_grade(load_rgba(os.path.join(src, f"beauty_{layout}_tree.png"))))
        for w in tree_widths:
            save_avif(tree, os.path.join(dst, f"plate_{layout}_{w}.avif"), w, 68)
        back = defringe(bloom_grade(load_rgba(os.path.join(src, f"beauty_{layout}_back.png"))))
        save_avif(back, os.path.join(dst, f"back_{layout}.avif"), back_width, 62, sharpen=False)  # lens-blurred anyway
        poster = defringe(bloom_grade(load_rgba(os.path.join(src, f"beauty_{layout}_brain.png"))))
        save_avif(poster, os.path.join(dst, f"poster_{layout}.avif"), tree_widths[1], 62)
        # data maps must stay exact per channel: lossless, no resampling
        data = Image.open(os.path.join(src, f"data_{layout}_tree.png")).convert("RGB")
        data.save(os.path.join(dst, f"data_{layout}.webp"), "WEBP", lossless=True, method=6)
        Image.open(os.path.join(src, f"data_{layout}_back.png")).convert("RGB").save(
            os.path.join(dst, f"backdata_{layout}.webp"), "WEBP", lossless=True, method=6)
        aura_map(data, tree[..., 3], 480 if layout == "wide" else 360).save(
            os.path.join(dst, f"aura_{layout}.webp"), "WEBP", quality=82, method=6)
        with open(os.path.join(src, f"meta_{layout}.json")) as fh:     # label / fruit positions the web reads
            meta[layout] = {k: v for k, v in json.load(fh).items() if k != "layout"}
    with open(os.path.join(dst, "..", "..", "lib", "roots-meta.json"), "w") as fh:
        json.dump(meta, fh, separators=(",", ":"))
    for f in sorted(os.listdir(dst)):
        print(f"{os.path.getsize(os.path.join(dst, f)) / 1024:8.0f} KB  {f}")

if __name__ == "__main__" and len(sys.argv) > 3 and sys.argv[1] == "export":
    export(sys.argv[2], sys.argv[3])

if __name__ == "__main__" and len(sys.argv) > 3 and sys.argv[1] == "preview":
    src, dst = sys.argv[2], sys.argv[3]
    img = to_img(composite(bloom_grade(load_rgba(src))))
    if "--ref" in sys.argv:
        ref = Image.open(sys.argv[sys.argv.index("--ref") + 1]).convert("RGB").resize(img.size, Image.LANCZOS)
        both = Image.new("RGB", (img.width, img.height * 2 + 8), (255, 80, 0))
        both.paste(ref, (0, 0)); both.paste(img, (0, img.height + 8))
        img = both
    img.save(dst)
    print("saved", dst, img.size)
