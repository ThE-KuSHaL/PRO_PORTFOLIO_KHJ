"""
The Roots — procedural tree builder for Blender (tested target: 5.2).

Run headless:
  blender -b --python build_tree.py -- --out <dir> [--preview <png>]

Pipeline (all from scratch, no imported assets):
  1. Skeleton   : trunk, 9 buttress roots + rootlets, 5 whorls of branches, sub-branches, twigs
                  (vertices + radii, deterministic seed).
  2. Sculpt     : Skin modifier turns the skeleton into one fused organic mesh,
                  Subsurf smooths it, a stretched noise Displace carves bark ridges.
  3. Fruits     : three glass bulbs (named fruit_10th / fruit_puc / fruit_be) hung from chosen
                  twig tips, each with a stem cap. Origin of each = its hang point.
  4. LODs       : tree decimated to a triangle budget per tier; fruits re-tessellated per tier.
  5. Export     : Draco-compressed GLB per tier -> tree_high / tree_mid / tree_low.glb
                  (geometry only; shading is done in three.js shaders).
"""
import sys, math, random, os
import bpy, bmesh
from mathutils import Vector, noise

# ── args ────────────────────────────────────────────────────────────────────
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
OUT_DIR = arg("--out", os.getcwd())
PREVIEW = arg("--preview")
os.makedirs(OUT_DIR, exist_ok=True)

# Triangle budgets per tier (tree only) and fruit tessellation.
TIERS = {
    "high": dict(tris=30000, fruit_sub=3),
    "mid":  dict(tris=9000,  fruit_sub=2),
    "low":  dict(tris=4500,  fruit_sub=1),
}

random.seed(11)
noise.seed_set(11)

# ── scene reset ─────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ── 1. skeleton ─────────────────────────────────────────────────────────────
class Skel:
    def __init__(self):
        self.v = []   # (Vector, radius)
        self.e = []
    def add(self, p, r, parent=None):
        i = len(self.v)
        self.v.append((Vector(p), r))
        if parent is not None:
            self.e.append((parent, i))
        return i

sk = Skel()
TRUNK_H = 5.2
base = sk.add((0, 0, -0.15), 0.62)

# Trunk — gentle S-curve, buttress flare at the base, tapering up.
trunk_idx = [base]
N = 16
for k in range(1, N + 1):
    t = k / N
    z = TRUNK_H * t
    x = math.sin(t * 2.3 + 0.4) * 0.32 * t
    y = math.cos(t * 1.7) * 0.22 * t
    r = (0.52 - 0.30 * t) * (1 + 0.40 * math.exp(-z * 1.6))
    trunk_idx.append(sk.add((x, y, z), max(r, 0.09), trunk_idx[-1]))

def trunk_point(t):
    """Index + position on the trunk at normalised height t."""
    k = max(1, min(N, round(t * N)))
    return trunk_idx[k], sk.v[trunk_idx[k]][0]

def grow(parent, start, direction, length, r0, r1, segs, droop=0.0, wobble=0.12, rise=0.0):
    """Grow a tapering chain; returns list of vertex indices."""
    d = Vector(direction).normalized()
    p = Vector(start)
    prev = parent
    out = []
    seg_len = length / segs
    for s in range(1, segs + 1):
        t = s / segs
        d = (d + Vector((random.uniform(-wobble, wobble), random.uniform(-wobble, wobble),
                         random.uniform(-wobble, wobble) + rise * 0.25 - droop * t * 0.35))).normalized()
        p = p + d * seg_len
        r = r0 + (r1 - r0) * (t ** 0.85)
        prev = sk.add(p, max(r, 0.012), prev)
        out.append(prev)
    return out

# Roots — 9 buttress roots spreading and diving, each with 2 rootlets.
for i in range(9):
    a = i / 9 * math.tau + random.uniform(-0.2, 0.2)
    dirv = Vector((math.cos(a), math.sin(a), -0.20))
    start = Vector((math.cos(a) * 0.22, math.sin(a) * 0.22, 0.02))
    chain = grow(base, start, dirv, random.uniform(1.8, 2.6), 0.34, 0.03, 8, droop=0.45, wobble=0.2)
    for _ in range(2):
        j = random.randint(2, 5)
        pi = chain[j]
        pp = sk.v[pi][0]
        side = Vector((-math.sin(a), math.cos(a), -0.25)) * random.choice([-1, 1])
        grow(pi, pp, (dirv + side * 0.9).normalized(), random.uniform(0.7, 1.3), 0.07, 0.012, 4, droop=0.6, wobble=0.25)

# Branch whorls — golden-angle spacing, shrinking with height.
tips = []   # (index, position, height) of terminal twigs for fruit anchoring
golden = 2.39996
heights = [0.20, 0.36, 0.52, 0.68, 0.84]
branch_defs = []
for w, h in enumerate(heights):
    count = 3 if w < 4 else 2
    for b in range(count):
        a = golden * (w * 3 + b) + random.uniform(-0.25, 0.25)
        branch_defs.append((h, a, w))

for h, a, w in branch_defs:
    pi, pp = trunk_point(h)
    outward = Vector((math.cos(a), math.sin(a), 0.0))
    dirv = (outward + Vector((0, 0, 0.62 - 0.08 * w))).normalized()
    length = 3.0 - 0.38 * w + random.uniform(-0.25, 0.25)
    main = grow(pi, pp, dirv, length, 0.17 - 0.012 * w, 0.03, 8, droop=0.35, wobble=0.14, rise=0.5)
    last = main[-1]
    tips.append((last, sk.v[last][0], h))
    for _ in range(3):
        j = random.randint(3, 7)
        si = main[j]
        sp = sk.v[si][0]
        side = Vector((-math.sin(a), math.cos(a), random.uniform(0.1, 0.5)))
        sd = (dirv + side * random.choice([-1.1, 1.1])).normalized()
        sub = grow(si, sp, sd, random.uniform(1.0, 1.7), 0.07, 0.016, 5, droop=0.25, wobble=0.18, rise=0.45)
        tips.append((sub[-1], sk.v[sub[-1]][0], h))
        for _ in range(2):
            k = random.randint(2, 4)
            ti = sub[k]
            tp = sk.v[ti][0]
            td = (sd + Vector((random.uniform(-.7, .7), random.uniform(-.7, .7), random.uniform(0, .5)))).normalized()
            twig = grow(ti, tp, td, random.uniform(0.5, 0.9), 0.03, 0.01, 3, droop=0.2, wobble=0.2, rise=0.4)
            tips.append((twig[-1], sk.v[twig[-1]][0], h))

# Crown leader — extends the trunk top.
leader = grow(trunk_idx[-1], sk.v[trunk_idx[-1]][0], (0.05, 0.02, 1), 1.1, 0.09, 0.012, 4, wobble=0.1)
tips.append((leader[-1], sk.v[leader[-1]][0], 1.0))

# ── 2. sculpt: skin → subsurf → bark displace ───────────────────────────────
me = bpy.data.meshes.new("tree_skeleton")
obj = bpy.data.objects.new("tree", me)
scene.collection.objects.link(obj)
bpy.context.view_layer.objects.active = obj
obj.select_set(True)

bm = bmesh.new()
skin_layer = bm.verts.layers.skin.new()   # must exist before verts are created
bverts = [bm.verts.new(p) for p, _ in sk.v]
bm.verts.ensure_lookup_table()
for a_, b_ in sk.e:
    bm.edges.new((bverts[a_], bverts[b_]))
for i, (p, r) in enumerate(sk.v):
    bverts[i][skin_layer].radius = (r, r)
bverts[0][skin_layer].use_root = True
bm.to_mesh(me)
bm.free()

skin = obj.modifiers.new("Skin", "SKIN")
skin.branch_smoothing = 0.35
skin.use_smooth_shade = True
sub = obj.modifiers.new("Sub", "SUBSURF")
sub.levels = 2
sub.render_levels = 2

# Bark ridges: stretched noise displacement along the up axis.
tex = bpy.data.textures.new("bark", "CLOUDS")
tex.noise_scale = 0.22
tex.noise_depth = 3
tex.noise_basis = "BLENDER_ORIGINAL"
disp = obj.modifiers.new("Bark", "DISPLACE")
disp.texture = tex
disp.texture_coords = "OBJECT"
disp.strength = 0.045
disp.mid_level = 0.5
# Stretch texture coordinates vertically so ridges run along the limbs.
empty = bpy.data.objects.new("bark_coords", None)
scene.collection.objects.link(empty)
empty.scale = (0.55, 0.55, 2.6)
disp.texture_coords_object = empty

# Bake the modifier stack into a real mesh.
dg = bpy.context.evaluated_depsgraph_get()
eval_obj = obj.evaluated_get(dg)
baked = bpy.data.meshes.new_from_object(eval_obj)
tree = bpy.data.objects.new("tree_mesh", baked)
scene.collection.objects.link(tree)
bpy.data.objects.remove(obj)
bpy.data.objects.remove(empty)
bpy.context.view_layer.objects.active = tree
for p in tree.data.polygons:
    p.use_smooth = True

# Triangulate once so budgets are real triangle counts.
bm = bmesh.new(); bm.from_mesh(tree.data)
bmesh.ops.triangulate(bm, faces=bm.faces[:])
bm.to_mesh(tree.data); bm.free()
FULL_TRIS = len(tree.data.polygons)
print(f"[tree] full-res triangles: {FULL_TRIS}")

# ── 3. fruits ───────────────────────────────────────────────────────────────
tips_sorted = sorted(tips, key=lambda t: t[1].z)
def pick(h_target, xmin, xmax):
    """Tip nearest a height whose x lies in [xmin, xmax] — separates fruits in screen space
    (the page camera looks down -Z in glTF space, i.e. along +Y in Blender)."""
    cands = [t for t in tips if xmin <= t[1].x <= xmax]
    if not cands:
        cands = tips
    cands.sort(key=lambda t: abs(t[1].z - h_target))
    return cands[0]

# Diagonal story: 10th low-left -> PUC mid-right -> B.E. crown (biggest, top-centre-right).
anchors = {
    "10th": pick(2.7, -4.5, -2.0),
    "puc":  pick(2.9, 2.4, 4.8),
    "be":   pick(5.0, -0.2, 1.4),
}
FRUIT = {"10th": 0.34, "puc": 0.38, "be": 0.50}   # bulb radius per fruit (BE is the biggest)

def make_fruit(name, anchor_pos, radius, sub_level):
    bmf = bmesh.new()
    # bulb: slightly pear-shaped ico sphere hanging below the anchor
    bmesh.ops.create_icosphere(bmf, subdivisions=sub_level + 1, radius=radius)
    for v in bmf.verts:
        # stretch + taper the top into the stem for a bulb/pear silhouette
        v.co.z *= 1.18
        if v.co.z > 0:
            k = 1.0 - 0.55 * (v.co.z / (radius * 1.18)) ** 2
            v.co.x *= k; v.co.y *= k
        v.co.z -= radius * 1.25   # hang below origin (origin = hang point)
    # stem: thin tube from hang point down into the bulb
    stem = bmesh.ops.create_cone(bmf, cap_ends=True, segments=8 if sub_level > 1 else 6,
                                 radius1=radius * 0.12, radius2=radius * 0.08, depth=radius * 0.9)
    for v in stem["verts"]:
        v.co.z -= radius * 0.35
    # cap ring where stem meets bulb
    cap = bmesh.ops.create_cone(bmf, cap_ends=True, segments=10 if sub_level > 1 else 6,
                                radius1=radius * 0.34, radius2=radius * 0.22, depth=radius * 0.22)
    for v in cap["verts"]:
        v.co.z -= radius * 0.78
    meshf = bpy.data.meshes.new(f"fruit_{name}")
    bmf.to_mesh(meshf); bmf.free()
    for p in meshf.polygons: p.use_smooth = True
    o = bpy.data.objects.new(f"fruit_{name}", meshf)
    o.location = anchor_pos
    scene.collection.objects.link(o)
    return o

# ── 4/5. LODs + export ──────────────────────────────────────────────────────
def export_tier(tier, cfg):
    # fresh tree copy for this tier
    t = tree.copy(); t.data = tree.data.copy(); t.name = "tree"
    scene.collection.objects.link(t)
    bpy.context.view_layer.objects.active = t
    ratio = min(1.0, cfg["tris"] / max(FULL_TRIS, 1))
    if ratio < 1.0:
        dec = t.modifiers.new("Decimate", "DECIMATE")
        dec.ratio = ratio
        dec.use_collapse_triangulate = True
        bpy.ops.object.select_all(action="DESELECT")
        t.select_set(True)
        bpy.ops.object.modifier_apply(modifier="Decimate")
    for p in t.data.polygons: p.use_smooth = True
    tri_count = len(t.data.polygons)

    fruits = [make_fruit(n, a[1], FRUIT[n], cfg["fruit_sub"]) for n, a in anchors.items()]
    bpy.ops.object.select_all(action="DESELECT")
    t.select_set(True)
    for f in fruits: f.select_set(True)

    path = os.path.join(OUT_DIR, f"tree_{tier}.glb")
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=True,
        export_apply=False, export_materials="NONE", export_normals=True,
        export_texcoords=False, export_vertex_color="NONE", export_cameras=False, export_lights=False,
        export_yup=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=7,
        export_draco_position_quantization=12,
        export_draco_normal_quantization=8,
    )
    print(f"[tree] {tier}: tree tris={tri_count}, file={os.path.getsize(path)//1024} KB")

    bpy.data.objects.remove(t)
    for f in fruits: bpy.data.objects.remove(f)

for tier, cfg in TIERS.items():
    export_tier(tier, cfg)

# Anchor report for the web side (world positions, glTF is Y-up: (x, z, -y)).
for n, a in anchors.items():
    p = a[1]
    print(f"[anchor] {n}: blender=({p.x:.3f},{p.y:.3f},{p.z:.3f}) gltf=({p.x:.3f},{p.z:.3f},{-p.y:.3f})")

# ── optional preview render (Workbench, CPU-safe) ───────────────────────────
if PREVIEW:
    import mathutils
    t = tree
    fr = [make_fruit(n, a[1], FRUIT[n], 3) for n, a in anchors.items()]
    cam_data = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam); scene.camera = cam
    cam.location = (0.0, -13.5, 3.2)
    direction = Vector((0, 0, 2.6)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cam_data.lens = 38
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "SINGLE"
    scene.display.shading.single_color = (0.55, 0.42, 0.32)
    scene.display.shading.show_cavity = True
    scene.world = bpy.data.worlds.new("w"); scene.world.color = (0.02, 0.03, 0.06)
    scene.render.resolution_x = 1100; scene.render.resolution_y = 900
    scene.render.filepath = PREVIEW
    bpy.ops.render.render(write_still=True)
    print("[tree] preview:", PREVIEW)
