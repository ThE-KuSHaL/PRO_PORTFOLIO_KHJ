# The Roots — 3D tree: handoff / resume notes

_Paused at 16:10 IST on 2026-11-24 at the user's request. Resume when they say so._

## What the user asked for (verbatim intent)
- Replace the image in the **"THE ROOTS"** (Education) section with a proper 3D tree + "fruit story"
  (the three education milestones as fruits: 10th, PUC, B.E.).
- Sculpt the model in **Blender** from scratch (user has **Blender 5.2** at
  `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`), give it proper shaders.
- Mesh size must be **configurable per device** (old/mid-range phones must run smoothly);
  everything should feel as smooth as the three.js example pages.
- Open to open-source assets or inventing tooling where needed.
- Done first (and committed): brain rotates/zooms only when the pointer is on/next to it.

## Done
- `72724b0` (local, **not pushed**): `ProximityGate` for the Cortex brain. Verified: wheel away from
  brain scrolls page, wheel over brain zooms, cursor shows `grab`.
- `tools/blender/build_tree.py` — procedural tree (skeleton → Skin → Subsurf → bark Displace),
  3 LODs + 3 fruits, Draco GLB export, optional Workbench preview.
- Outputs in `public/models/`: `tree_high.glb` (~70 KB), `tree_mid.glb` (~29 KB), `tree_low.glb` (~14 KB).
  Budgets in script: high 30k tris, mid 9k, low 2.8k. Geometry only (no materials/UVs).
- Fruit nodes are named `fruit_10th`, `fruit_puc`, `fruit_be`; each node's **origin is its hang point**
  (read positions from the loaded GLB, do not hard-code). Current glTF-space anchors:
  10th (0.770, 2.963, 2.319) · puc (-2.629, 3.551, -0.070) · be (1.820, 4.895, -1.384).
  Anchors change if the skeleton/seed changes.

## Run the build
```
"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b --python tools/blender/build_tree.py -- --out public/models --preview <png>
```
(BlenderMCP add-on prints harmless "cannot start server in background mode" lines.)

## Known model issues / ideas
- Trunk bottle-neck FIXED (branch_smoothing 0.35, whorls lowered to 0.20–0.84). Model now reads as a
  continuous trunk with roots flowing in; reasonable to move on to the web side.
- No foliage by design (bare tree + glowing fruit). Optional: sparse leaf-cards at LOD high only.
- Not yet added: ground/base disc, energy-vein attribute (plan: derive flow from world Y in shader).

## NOT started yet (next steps, in order)
1. New `components/sections/EducationTree3D.tsx` (R3F, dynamic-imported, keep the **same props API**:
   `activeNode, hoveredNode, onNodeClick, onNodeHover, nodesData`) loading the GLB with DRACOLoader.
   Copy decoder from `node_modules/three/examples/jsm/libs/draco/` to `public/draco/` and set
   `useGLTF.setDecoderPath('/draco/')`.
2. Pick LOD by device: `useLite()` → low; mid-range → mid; desktop (≥8 cores, ≥8 GB, not coarse) → high.
   Add an "ultra-lite" path (saveData / reduced-motion / deviceMemory ≤ 2) → static poster (render one
   from the browser) instead of WebGL. Cap DPR (1 on lite), no antialias on lite, 30 fps cap on lite,
   pause when off-screen (`frameloop="never"` via IntersectionObserver, same as SkillsSection).
3. Shaders (three.js `onBeforeCompile` or ShaderMaterial):
   - Bark: procedural triplanar noise albedo/normal-ish + height-based AO; flat vertex-lit on low LOD.
   - Energy: emissive veins pulsing from roots (low Y) to tips (high Y) — matches the copy
     "Energy pulses from roots to branch tips."
   - Fruits: fresnel glass shell + glowing core (cyan for B.E., indigo for 10th/PUC); simple unlit on low LOD.
4. Interaction: hover/click fruit → existing `NodeModal` flow in `EducationSection` (unchanged);
   subtle pointer parallax; optional proximity-gated drag like the brain.
5. Remove the `roots_environment` backdrop image in `EducationSection.tsx` on the 3D path
   (keep dark gradient); keep the mobile node-button list as the accessible fallback.
6. Verify: build, screenshots at 390×844 and 1440×900, 6× CPU-throttle scroll test (earlier result:
   p50 18 ms, p95 30 ms, 0 frames >50 ms), then commit. Do not push without asking.

## Repo / deploy state at pause
- Pushed to `main`: up to `f1c6e61` (contact details + resume downloads, design tokens, mobile fixes).
- Local-only commits: `72724b0` (brain proximity gate) + the WIP commit that adds this file/the tree.
- Vercel: two projects (`portfolio-khj`, `pro-portfolio-khj`) both build this repo; both had
  `f1c6e61` building when last checked. SSO protection on `*.vercel.app` may hide the site from public
  visitors — flagged to the user, unresolved.
- Local server on port 3111 is stopped (`next start -p 3111` after `npx next build`).
- Open user decisions: GitHub URL uses `ThE-KuSHaL` (hyphen) not the underscore they typed;
  2026 resume PDF is 6.2 MB (offer to compress); remaining sections (Projects/Venture/Journey/Contact)
  still use old internal styling for the design pass.
