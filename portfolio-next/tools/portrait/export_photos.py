import json, os, sys
import numpy as np
from PIL import Image, ImageFilter, ImageChops

S = os.path.dirname(os.path.abspath(__file__)); P = sys.argv[1]

# ── hero: tight crop, two sizes (new file names because /img/* is cached as immutable)
hero = Image.open(f"{S}/hero_composite.png").convert("RGBA")
x0, y0, x1, y1 = hero.getchannel("A").point(lambda v: 255 if v > 12 else 0).getbbox()
hero = hero.crop((x0 - 8, y0 - 12, x1 + 8, y1))
sizes = {}
for name, height in (("hero-v3", 1600), ("hero-v3-m", 960)):
    w = round(hero.width * height / hero.height)
    hero.resize((w, height), Image.LANCZOS).save(f"{P}/public/img/{name}.avif", "AVIF", quality=56, speed=3, subsampling="4:2:0")
    sizes[name] = (w, height)
    print(name, w, height, os.path.getsize(f"{P}/public/img/{name}.avif") // 1024, "KB")
json.dump({"src": "/img/hero-v3.avif",
           "srcSet": f"/img/hero-v3-m.avif {sizes['hero-v3-m'][0]}w, /img/hero-v3.avif {sizes['hero-v3'][0]}w",
           "width": sizes["hero-v3"][0], "height": sizes["hero-v3"][1]},
          open(f"{P}/lib/portrait-meta.json", "w"), indent=1)
