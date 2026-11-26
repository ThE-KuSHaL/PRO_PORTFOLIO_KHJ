# The Roots: how it is built

## Story spine (do not break)
Roots = schooling (10th) · trunk = PUC · great branch = engineering (B.E.), ending in the
**Engineer's Brain** fruit (same model as the Skills section), which leads into Skills.
Visual reference: `public/roots_environment.webp`. Theme: electronics cyber city. The PCB background
animation must stay visible behind the section.

## Pipeline
1. `build_roots_scene.py`: the whole world (cable-bundle megatree, circuit city, skyline, lights),
   authored in the reference image's 2000x1126 pixel space and rendered with Cycles/OptiX
   (about 30-60 s per frame on an RTX 4050). `--layout wide|tall`, `--pass beauty|data`, `--with-brain`.
   Data pass: R = path along the cables (city 0 -> brain 1), G = part (roots .25, trunk .5, branch .75), B = nearness.
2. `export_brain_fruit.py`: decimated brain, posed as in the render (16k and 6k triangles).
3. `post_roots.py export <renders> public/roots`: bloom + grade, WebP assets, writes `lib/roots-meta.json`
   (fruit and label positions). `post_roots.py preview a.png b.png --ref ...` makes the side-by-side.
4. `components/sections/RootsScene.tsx`: one plate quad (parallax, energy pulses, part highlight) + live brain.

## Re-render everything (from this folder; B = path to blender.exe, R = a temp folder)
Close games first: with 4.7 GB of the 6 GB card taken, one pass crawled for 7+ minutes (normally about 70 s).
    each layout:  tree  --layer tree  beauty  wide 2880/128 · tall 1320/128      (no lens blur)
                  city  --layer back  beauty  wide 1600/96  · tall 760/96
                  poster              beauty --with-brain   wide 1600/96 · tall 900/96
                  data  --layer tree  wide 1280 · tall 720
                  data  --layer back  wide 640  · tall 360
    "$B" -b --factory-startup --python build_roots_scene.py -- --out R --layout L --pass P --res N --samples S [--layer X]
    (add --cpu --threads 6 to leave the graphics card alone; the data passes take under a minute that way)
    python -I post_roots.py export R ../../public/roots        # AVIF layers and maps; marker positions -> lib/roots-meta.json

**Then bump `ASSET_VERSION` in RootsScene.tsx**: `/roots/*` and `/models/*` are served `immutable`.

## Tiers (`lib/device.ts`)
none (data saver, reduced motion, <=2 GB): still poster · low: 760/1600 plate, 6k brain, 30 fps
mid: full frame rate · high: 2560 plate on large screens.

## Status 2026-11-25 (after the user's visual review)
- Tree shifted left (wide window starts at reference x=105), real branch hierarchy (`shoot`/`sprout`) instead of
  scattered twigs, deeper haze, rim lights, lens blur on the beauty pass only. Fruit = glass skin + seams + calyx +
  leaf; brain smaller and quieter. `POD_PROFILE`/`SEPALS` travel to the web through `lib/roots-meta.json`.
- Re-render sizes now: wide beauty 2880/128, wide with-brain 1600/96, wide data 1280, tall beauty 1320/128,
  tall with-brain 900/96, tall data 720. `post_roots.py export` also writes `aura_<layout>.webp` (per-part glow).
- Interaction: no label boxes. `.beacon` markers; names appear on approach (or on each part's glow turn on touch).
  The tree itself is clickable through the data map. Story beat: roots, trunk, fruit, 6.6 s.
- Site scaling: fluid root font size above 1920x960; sidebar toggle in its header; hero portrait uses `contain`.
- Portraits: see `tools/portrait/README.md`.
- Checked at 11 viewport sizes (50-200% zoom, ultrawide, tablet, phone, landscape). Not tested on a real phone.
- Server: `npx next start -p 3111`. TaskStop can leave the node process holding the port.
- Automated tests: close every browser context they create. A leftover fixed 1440x900 window looks like a
  layout gap on the right when the user browses in it.
- All of this is uncommitted; 5 older commits are unpushed. No commit or push without the user asking.

## Status 2026-11-25, later (resumed and finished; awaiting the user's review)
Nothing committed or pushed.

**Third review round:** Roots title card (Bungee Inline, striped teal shadow); sidebar processor mark (`CpuCore.tsx`);
brain on every device with Lite / Balanced / Full (`cortex/config/quality.ts`, `QualitySwitch.tsx`, models from
`export_brain_lod.py`); one heading in Skills.

**Great tree (fourth request: trunk and branches blend like a great tree).** How `build_roots_scene.py` grows it:
- every great limb (`TRUNK, GREAT, REACH, RISE, EAST, LEFT, RIGHT`) starts at the ground, so its cables run up one
  shared trunk and peel away at a fork; `spine(..., fork=row)` keeps part = trunk and a shared light below the fork;
- `build_core` fuses trunk, limbs and root flare into one wood surface (voxel union, grow then shrink = filleted
  crotches); `hug` lifts buried cables onto it; ridge cables run root tip -> trunk -> limb; circuit traces are
  ray-cast onto the bark; shoots swell into their parent (no clamp rings);
- `tube_parts` builds a cable as ONE surface and only changes material at a part boundary (two tubes left a visible seam);
- the raised decks in front of the trunk were removed: they hid the root flare.
Assets re-rendered at the sizes listed above; `ASSET_VERSION` is '3'. Pre-change script and assets:
session scratchpad `before_tree/` (temporary).

**Also fixed:** keyword sync no longer uses `:has` + a text-shadow fade (RootsScene calls `onLit`); phone slow-profile
median back to 18.2 ms (was 24). Arrow keys scroll the page again (they cycle lobes only while one is hovered).
Brain shaders are compiled ahead (`Warmup.tsx`): cold-start freeze on arrival, phone profile, 4.2-4.5 s -> under
0.05 s (3 fresh browsers). Upright tablets frame fruit + trunk (`fitPlate`).

**Open**
- Laptop Full profile still froze 1.7 s on a cold first view (more programs: post-processing, shadows, glass). No
  "before" figure for the laptop.
- Cold first load of the tree at 1920 wide took 8.6 s to appear (3 s next time) in a headless browser. Cause not
  confirmed; shader preparation is a guess. Same warm-up idea may apply.
- At 6x CPU the page is ~99% busy even idle on Skills (probe overhead included). Which part is not identified; it is
  why a Lite drag feels slow there. At normal speed idle and drag both ran at 6.1 ms per frame.
- Never tried on a real phone.

**Testing notes:** a covered Playwright window is throttled to 1 frame/s and ruins timings. Use a separate headless
`chrome` (`--enable-gpu --use-angle=d3d11`; it runs on the AMD iGPU) for comparable A/B runs.
**Preview:** `npx next build`, then `npx next start -p 3111` (stop any server first).

## Status 2026-11-25, round five (built; awaiting the user's review; user says more changes will follow)
- **THE TREE IS RIGID. Owner's rule: no movement and no reaction to mouse position.** Two earlier attempts were rejected:
  per-pixel depth parallax (doubled and tore twigs) and a smooth sideways "swivel" warp (wavered like a flame). The
  swivel code is removed. Only light travels on the cables, and the fruit sways slightly. Hover/tap still highlights a
  part. Real rotation would need live geometry (less detail, more cost): only if the owner asks for it.
- Tree = two still layers (sharp tree over lens-blurred, hazed city), defringed, uploaded premultiplied.
- Fruit brain deliberately barely visible. Markers: radar ping + "Roots / Trunk / Fruit" tag. Title: Chakra Petch,
  two fine teal keylines, in the open sky top left (`.roots-head`); the low_left limb was removed to clear it.
- Skills: brain right of centre, slides left while a card is open; instruction line under the subtitle; stand
  flicker was coplanar disc/grooves with the base top; disc shader now anti-aliased; MSAA 4 (Full) / 2 (Balanced).
- **Speed:** background = video (`tools/background/make_pcb_video.py`; AV1 471 KB, H.264 1023 KB) replacing 75
  stills; the stills `public/bg/f*.webp` are now unused (tracked; delete only if the user agrees). Tree and photos
  are AVIF. Same-method load: laptop first screen 3284 -> 929 KB, whole page 5748 -> 2857; phone first 539 -> 406,
  whole 1834 -> 1558. Quality against sources: tree SSIM 0.97, video 0.98 (as dimmed), hero face same as before.
- **Idle load fixes** (headless 1536x776, main-thread busy per second, before -> after): education 80% -> 50%,
  projects 91% -> 39% (off-screen brain kept rendering: IntersectionObserver counts edge contact; use -2px margin).
  Also: cursor sway is CSS (script only on mouse events), light rays drawn at 1/4 size at 20 fps only on screen,
  scroll hint has no frame loop, tree shaders compiled ahead (cold first show at 1920: 8.6 s once -> 4.1-4.6 s, 3 runs).
- Open: ~1.2 s freeze while the tree first loads (cold); laptop Full brain cold freeze 1.7 s; contact section is
  ~54% busy at idle (cause not looked at); two-layer tree never timed on a real phone.
- Earlier wrong claim corrected: phones had been downloading the 141 KB hero, not the 54 KB one (`sizes` now 70vw).
- Preview: `npx next build`, then `npx next start -p 3111`.

## Limits and ideas
- The camera is baked: parallax only, no orbit. A free camera would need a realtime-geometry version.
- Ideas: click-through transition from fruit to Skills; replace the PCB background video (it carries a "Veo" mark).
- Never push without the user asking.
