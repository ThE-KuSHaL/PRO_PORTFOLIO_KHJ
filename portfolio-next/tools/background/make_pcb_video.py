"""The moving circuit background as one small video instead of 75 stills drawn by JavaScript.
  python -I make_pcb_video.py <frames dir (public/bg)> <out dir (public/bg)>

Reproduces what PCBBackground.tsx used to draw: a 70 s forward-and-back breath over the frames, with
neighbouring frames cross-blended. Framing (scale, shift, dimming) stays in the component.
/bg/* is served `immutable`: use a new file name if the video ever changes after a deploy.
"""
import math, pathlib, subprocess, sys
from PIL import Image

SRC, OUT = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
CYCLE, FPS, EASE = 70, 12, 0.15
frames = [Image.open(SRC / f"f{i:03d}.webp").convert("RGB") for i in range(75)]
W, H = frames[0].size


def position(theta):
    t = (theta / (2 * math.pi)) % 1
    linear = t * 2 if t < 0.5 else (1 - t) * 2
    return (linear * (1 - EASE) + (1 - math.cos(theta)) / 2 * EASE) * (len(frames) - 1)


def picture(n):
    pos = position(2 * math.pi * n / (CYCLE * FPS))
    a = int(pos)
    b = min(a + 1, len(frames) - 1)
    return Image.blend(frames[a], frames[b], pos - a)


def encode(name, args):
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-an", *args, "-pix_fmt", "yuv420p", "-g", str(CYCLE * FPS), str(OUT / name)]      # one key frame: the loop restarts on it
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for n in range(CYCLE * FPS):
        proc.stdin.write(picture(n).tobytes())
    proc.stdin.close()
    if proc.wait():
        raise SystemExit(f"ffmpeg failed for {name}")
    print(name, (OUT / name).stat().st_size // 1024, "KB")


# AV1 first (smallest by far); H.264 for browsers without AV1, mainly older Apple devices.
# Measured against the exact blends, as dimmed on the page: SSIM about 0.98 (AV1) and 0.97 (H.264).
encode("pcb-v1.webm", ["-c:v", "libsvtav1", "-crf", "58", "-preset", "4"])
encode("pcb-v1.mp4", ["-c:v", "libx264", "-preset", "veryslow", "-crf", "35", "-movflags", "+faststart"])
