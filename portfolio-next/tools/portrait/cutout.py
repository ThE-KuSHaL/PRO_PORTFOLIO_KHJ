"""Offline cut-out of the new portraits with BiRefNet-portrait (nothing is uploaded)."""
import inspect, os, sys, time
from PIL import Image
from rembg import new_session, remove

S = os.path.dirname(os.path.abspath(__file__))
print("remove() options:", list(inspect.signature(remove).parameters), flush=True)
session = new_session("birefnet-portrait")
extra = {"decontaminate": True} if "decontaminate" in inspect.signature(remove).parameters else {}
for name in sys.argv[1:] or ["nat"]:
    t = time.time()
    img = Image.open(os.path.join(S, "in", f"{name}.png")).convert("RGB")
    out = remove(img, session=session, **extra)
    out.save(os.path.join(S, "in", f"{name}_cut.png"))
    print(name, "done in", round(time.time() - t, 1), "s", extra, flush=True)
