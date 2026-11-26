# Portraits: how the two site photos are made

Everything runs on the laptop; no photo is uploaded. No generative face model is used.

Inputs (not in the repo): the "Nat" portrait, and `public/till knee_PORT.png` (the crossed-arms body).

1. `cutout.py nat`: background removal with BiRefNet-portrait via `rembg`.
2. `landmarks.py <portfolio-next>`: MediaPipe face landmarks.
3. `retouch.py`: heals small blemishes and evens blotchy tone. Eyes, lenses, brows, lips and beard are
   excluded; no feature is reshaped.
4. `compose_hero.py`: the retouched head and neck on the crossed-arms body, joined along the collar.
   The collar line is a hand-placed polyline in the body's pixel space. Not mirrored.
5. `export_photos.py <portfolio-next>`: writes `public/img/hero-v3*.avif` and `lib/portrait-meta.json`.
6. `about.py <portfolio-next>`: writes `public/img/about-v3.avif` (needs a wide beauty render of the Roots
   scene for the out-of-focus city; edit the path at the top of the script).

The scripts expect to sit in a working folder with `in/` (source photos as `nat.png`) and `view/`.
Python: `pip install rembg onnxruntime mediapipe opencv-python-headless pillow numpy scipy`.

`/img/*` is served as immutable: use a new file name (`-v4`) whenever a photo changes.
