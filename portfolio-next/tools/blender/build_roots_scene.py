"""
THE ROOTS — master scene: a cable-and-circuit megatree over an electronics cyber city.

Composition is authored in the pixel space of the art reference (public/roots_environment.webp
viewed at 2000x1126) and unprojected into 3D at a chosen depth, so the render lines up with it.

Story spine, encoded in the "flow" attribute (energy travels 0 -> 1):
    city buses 0.00-0.15  ->  roots (schooling) 0.15-0.35  ->  trunk (PUC) 0.35-0.65
    ->  great branch (B.E.) 0.65-1.00  ->  Engineer's Brain fruit

Run:
  blender -b --factory-startup --python build_roots_scene.py -- --layout wide --pass beauty,data
          --out <dir> [--res 2560] [--samples 96] [--with-brain] [--save scene.blend]
"""
import bpy, bmesh, json, math, os, random, sys
from mathutils import Vector, Matrix, noise
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

# ── args ────────────────────────────────────────────────────────────────────
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
LAYOUT = arg("--layout", "wide")
PASSES = arg("--pass", "beauty").split(",")
OUT = os.path.abspath(arg("--out", "."))
RES = int(arg("--res", "1280"))
SAMPLES = int(arg("--samples", "48"))
WITH_BRAIN = "--with-brain" in argv
# all = one picture (poster). tree / back = the two layers the web page stacks, so the tree can swivel
# in front of a still city with nothing doubled behind it.
LAYER = arg("--layer", "all")
SAVE = arg("--save")
HERE = os.path.dirname(os.path.abspath(__file__))
BRAIN_GLB = os.path.join(HERE, "..", "..", "public", "models", "Brain_port.glb")

rng = random.Random(23)

# ── reference-space camera model ────────────────────────────────────────────
REF_W, REF_H = 2000.0, 1126.0
HORIZON = 780.0          # image row of the horizon
F = 2145.0               # focal length in reference pixels (~50 deg horizontal)
CAM_Z = 3.0

def W(px, py, d):
    """Reference pixel (px, py) at depth d -> world point."""
    return Vector(((px - REF_W / 2) / F * d, d, CAM_Z - (py - HORIZON) / F * d))

def ground_depth(py, lift=0.0):
    return F * (CAM_Z - lift) / max(py - HORIZON, 12.0)

def S(px_len, d):
    """Pixel length at depth d -> world units."""
    return px_len * d / F

# framing per layout: (x0, width) window of the reference, full height
# The wide window starts 105 px right of the reference origin: the whole tree sits further left in frame.
LAYOUTS = {"wide": (105.0, 2000.0), "tall": (920.0, 900.0)}
BRAIN_PX, BRAIN_PY, BRAIN_D, BRAIN_R = 1082.0, 440.0, 31.0, 76.0   # fruit centre + brain radius (px)
# fruit skin in brain-radius units, bottom -> neck: (height, radius). Exported to the web through the meta file.
POD_PROFILE = [(-1.20, 0.0), (-1.14, .44), (-.90, .86), (-.42, 1.17), (.12, 1.20), (.58, .96),
               (.98, .58), (1.30, .27), (1.52, .09)]

# calyx: (angle round the stem in degrees, 0 = facing the camera; length in brain radii)
SEPALS = [(-112, 1.05), (-54, .92), (4, .70), (58, 1.00), (118, .86)]

# ── scene reset ─────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
col = scene.collection

# ── materials (all share distance fog; each can be swapped to the data pass) ─
FOG_COL = (0.0036, 0.0098, 0.0205, 1.0)

def _n(nt, kind, **kw):
    node = nt.nodes.new(kind)
    for k, v in kw.items():
        setattr(node, k, v)
    return node

def _math(nt, op, a, b=None, clamp=False):
    m = _n(nt, "ShaderNodeMath", operation=op, use_clamp=clamp)
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            m.inputs[i].default_value = v
        else:
            nt.links.new(v, m.inputs[i])
    return m.outputs[0]

def add_fog(nt, shader_socket):
    """surface -> fog tint by distance -> fade to see-through sky far away."""
    cam = _n(nt, "ShaderNodeCameraData")
    dist = cam.outputs["View Distance"]
    k = _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", dist, 34.0, False), -0.023)
    fog = _math(nt, "SUBTRACT", 1.0, _math(nt, "EXPONENT", _math(nt, "MINIMUM", k, 0.0)), True)
    em = _n(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = FOG_COL
    mix = _n(nt, "ShaderNodeMixShader")
    nt.links.new(fog, mix.inputs[0])
    nt.links.new(shader_socket, mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    far = _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", dist, 95.0), 1.0 / 190.0, True)
    tr = _n(nt, "ShaderNodeBsdfTransparent")
    mix2 = _n(nt, "ShaderNodeMixShader")
    nt.links.new(far, mix2.inputs[0])
    nt.links.new(mix.outputs[0], mix2.inputs[1])
    nt.links.new(tr.outputs[0], mix2.inputs[2])
    return mix2.outputs[0]

MATS = {}

def metal(name, base, rough, metallic=0.85, part=0.0, bump=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = _n(nt, "ShaderNodeOutputMaterial")
    b = _n(nt, "ShaderNodeBsdfPrincipled")
    tc = _n(nt, "ShaderNodeNewGeometry")
    no = _n(nt, "ShaderNodeTexNoise"); no.inputs["Scale"].default_value = 3.1; no.inputs["Detail"].default_value = 5.0
    nt.links.new(tc.outputs["Position"], no.inputs["Vector"])
    ramp = _n(nt, "ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.32
    ramp.color_ramp.elements[0].color = (base[0] * 0.45, base[1] * 0.45, base[2] * 0.45, 1)
    ramp.color_ramp.elements[1].position = 0.72
    ramp.color_ramp.elements[1].color = (base[0] * 1.5, base[1] * 1.5, base[2] * 1.5, 1)
    nt.links.new(no.outputs["Fac"], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], b.inputs["Base Color"])
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    if bump:
        br = _n(nt, "ShaderNodeTexBrick")
        br.inputs["Scale"].default_value = 2.4
        br.inputs["Mortar Size"].default_value = 0.03
        nt.links.new(tc.outputs["Position"], br.inputs["Vector"])
        bp = _n(nt, "ShaderNodeBump"); bp.inputs["Strength"].default_value = bump; bp.inputs["Distance"].default_value = 0.06
        nt.links.new(br.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs[0], b.inputs["Normal"])
    nt.links.new(add_fog(nt, b.outputs[0]), out.inputs["Surface"])
    m["part"] = part
    MATS[name] = m
    return m

def glow(name, color, strength, part=0.0, dash=0.0):
    """Emissive. dash>0 breaks the light into segments along the cable (uses 'flow')."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = _n(nt, "ShaderNodeOutputMaterial")
    em = _n(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1)
    if dash:
        at = _n(nt, "ShaderNodeAttribute", attribute_name="flow")
        lane = _n(nt, "ShaderNodeAttribute", attribute_name="lane")
        comb = _n(nt, "ShaderNodeCombineXYZ")
        nt.links.new(_math(nt, "MULTIPLY", at.outputs["Fac"], dash), comb.inputs["X"])
        nt.links.new(_math(nt, "MULTIPLY", lane.outputs["Fac"], 57.0), comb.inputs["Y"])
        no = _n(nt, "ShaderNodeTexNoise"); no.inputs["Scale"].default_value = 1.0; no.inputs["Detail"].default_value = 2.0
        nt.links.new(comb.outputs[0], no.inputs["Vector"])
        seg = _math(nt, "POWER", _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", no.outputs["Fac"], 0.44), 5.0, True), 2.0)
        nt.links.new(_math(nt, "ADD", _math(nt, "MULTIPLY", seg, strength), strength * 0.045), em.inputs["Strength"])
    else:
        em.inputs["Strength"].default_value = strength
    nt.links.new(add_fog(nt, em.outputs[0]), out.inputs["Surface"])
    m["part"] = part
    MATS[name] = m
    return m

BLUE = (0.016, 0.155, 0.80)
CYAN = (0.050, 0.340, 1.0)
ICE = (0.230, 0.540, 1.0)

# story parts: 0 city, .25 roots, .5 trunk, .75 great branch, 1.0 crown
PARTS = {"city": 0.0, "roots": 0.25, "trunk": 0.5, "branch": 0.75, "crown": 1.0}
for pname, pid in PARTS.items():
    metal(f"cable_{pname}", (0.030, 0.045, 0.068), 0.27, 0.95, pid)
    metal(f"bark_{pname}", (0.014, 0.022, 0.037), 0.40, 0.80, pid, bump=0.55)
    metal(f"jacket_{pname}", (0.007, 0.011, 0.019), 0.52, 0.55, pid)
    metal(f"steel_{pname}", (0.235, 0.300, 0.385), 0.23, 1.0, pid)
    glow(f"vein_{pname}", BLUE, 4.6, pid, dash=95.0)
    glow(f"hot_{pname}", CYAN, 6.4, pid, dash=150.0)
    glow(f"dot_{pname}", ICE, 3.0, pid)
    glow(f"dim_{pname}", BLUE, 0.8, pid)
metal("ground", (0.0055, 0.0085, 0.014), 0.42, 0.7, 0.0, bump=0.9)
metal("chip", (0.020, 0.026, 0.036), 0.40, 0.85, 0.0, bump=0.25)
metal("tower", (0.008, 0.014, 0.026), 0.55, 0.4, 0.0)

# ── mesh accumulator: one object per material keeps Cycles' scene small ─────
BUF = {}

def buf(mat):
    return BUF.setdefault(mat, {"v": [], "f": [], "flow": [], "lane": []})

def flush():
    for mat, b in BUF.items():
        if not b["v"]:
            continue
        me = bpy.data.meshes.new(mat)
        me.from_pydata(b["v"], [], b["f"])
        me.update()
        for key in ("flow", "lane"):
            a = me.attributes.new(key, "FLOAT", "POINT")
            a.data.foreach_set("value", b[key])
        if mat.startswith(("cable_", "jacket_", "steel_", "vein_", "hot_", "bark_")):
            me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
        me.materials.append(MATS[mat])
        col.objects.link(bpy.data.objects.new(mat, me))
    BUF.clear()

def tube_rings(pts, radii, sides):
    """The surface of a cable: one ring of vertices per path point, with a twist-free frame."""
    t0 = (pts[1] - pts[0]).normalized()
    ref = Vector((0, 0, 1)) if abs(t0.z) < 0.9 else Vector((1, 0, 0))
    nrm = t0.cross(ref).normalized()
    prev_t = t0
    rings = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        q = prev_t.rotation_difference(t)
        nrm = (q @ nrm).normalized()
        prev_t = t
        bi = t.cross(nrm).normalized()
        r = radii[i]
        rings.append([p + (nrm * math.cos(2 * math.pi * s / sides) + bi * math.sin(2 * math.pi * s / sides)) * r
                      for s in range(sides)])
    return rings

def emit(mat, rings, flows, lane, cap_start=True, cap_end=True):
    b = buf(mat)
    base = len(b["v"])
    sides = len(rings[0])
    for i, ring in enumerate(rings):
        for v in ring:
            b["v"].append((v.x, v.y, v.z)); b["flow"].append(flows[i]); b["lane"].append(lane)
    for i in range(len(rings) - 1):
        o = base + i * sides
        for s in range(sides):
            b["f"].append((o + s, o + (s + 1) % sides, o + sides + (s + 1) % sides, o + sides + s))
    if cap_start:
        b["f"].append(tuple(base + s for s in range(sides - 1, -1, -1)))
    if cap_end:
        end = base + (len(rings) - 1) * sides
        b["f"].append(tuple(end + s for s in range(sides)))

def tube(mat, pts, radii, flows, sides=6, lane=None):
    if len(pts) < 2:
        return
    lane = rng.random() if lane is None else lane
    emit(mat, tube_rings(pts, radii, sides), flows, lane)

CUBE_V = [(-.5, -.5, -.5), (.5, -.5, -.5), (.5, .5, -.5), (-.5, .5, -.5),
          (-.5, -.5, .5), (.5, -.5, .5), (.5, .5, .5), (-.5, .5, .5)]
CUBE_F = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]

def box(mat, center, size, rot=None, flow=0.0):
    b = buf(mat)
    base = len(b["v"])
    lane = rng.random()
    for x, y, z in CUBE_V:
        v = Vector((x * size[0], y * size[1], z * size[2]))
        if rot is not None:
            v = rot @ v
        v += center
        b["v"].append((v.x, v.y, v.z)); b["flow"].append(flow); b["lane"].append(lane)
    for f in CUBE_F:
        b["f"].append(tuple(base + i for i in f))

# ── splines ─────────────────────────────────────────────────────────────────
def catmull(ctrl, step):
    """ctrl: list of tuples (any width). Returns densely sampled tuples."""
    P = [ctrl[0]] + ctrl + [ctrl[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = (Vector(P[i - 1][:3]), Vector(P[i][:3]), Vector(P[i + 1][:3]), Vector(P[i + 2][:3]))
        n = max(3, int((p2 - p1).length / step))
        for k in range(n):
            t = k / n
            q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                       + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
            r = P[i][3] * (1 - t) + P[i + 1][3] * t
            out.append((q, r))
    out.append((Vector(P[-2][:3]), P[-2][3]))
    return out

# ── THE TREE ────────────────────────────────────────────────────────────────
# Grown like a great tree, not assembled from pipes:
#   1. every great limb starts at the ground, so its cables run up ONE shared trunk and only then peel
#      away at a fork (the trunk thins after each fork because limbs have left it);
#   2. one smooth wood core is fused from the trunk, limbs and root flare, which fillets every crotch
#      and gives each branch a collar and each root a buttress;
#   3. cables are pushed out onto that shared surface, so they flow over a fork instead of through it.
D = 40.0
FORK_ROW = 560.0          # image row where the energy leaves the shared trunk for the limbs

def trunk_flow(py):
    return .35 + .27 * min(1.0, max(0.0, (948 - py) / (948 - FORK_ROW)))

def spine(spec, part, f0, f1, name=None, fork=None):
    """spec: [(px, py, depth_or_None, radius_px)] -> a sampled limb with a stable frame.
    With `fork` (image row) the limb is part of the trunk below it and its own part above it;
    its light climbs the trunk with every other limb and carries on to f1 along the limb."""
    ctrl = []
    for px, py, d, r in spec:
        if d is None:                     # sits on the ground plane
            d = ground_depth(py, lift=0.12)
        p = W(px, py, d)
        ctrl.append((p.x, p.y, p.z, S(r, d)))
    sm = catmull(ctrl, 0.26)
    n = len(sm)
    pos = [s[0] for s in sm]; rad = [s[1] for s in sm]
    tang = [(pos[min(i + 1, n - 1)] - pos[max(i - 1, 0)]).normalized() for i in range(n)]
    view = Vector((0, 1, 0))
    U = []; V = []
    up = view.cross(tang[0]).normalized()
    if up.length < 0.1:
        up = Vector((1, 0, 0))
    prev = tang[0]
    for i in range(n):
        up = (prev.rotation_difference(tang[i]) @ up).normalized()
        prev = tang[i]
        U.append(up); V.append(tang[i].cross(up).normalized())
    arc = [0.0]
    for i in range(1, n):
        arc.append(arc[-1] + (pos[i] - pos[i - 1]).length)
    if fork is None:
        flows = [f0 + (f1 - f0) * a / arc[-1] for a in arc]
        parts = [part] * n
    else:
        rows = [to_px(p)[1] for p in pos]
        split = next((i for i, y in enumerate(rows) if y < fork), n - 1)
        start = trunk_flow(rows[split])
        flows = [trunk_flow(rows[i]) if i < split else
                 start + (f1 - start) * (arc[i] - arc[split]) / max(1e-4, arc[-1] - arc[split]) for i in range(n)]
        parts = ["trunk" if i < split else part for i in range(n)]
    return {"pos": pos, "rad": rad, "tang": tang, "U": U, "V": V, "flow": flows, "parts": parts,
            "part": part, "arc": arc, "name": name}

def to_px(p):
    d = p.y
    return (p.x / d * F + REF_W / 2, HORIZON - (p.z - CAM_Z) / d * F, d)

def tube_parts(prefix, pts, radii, flows, parts, sides, lane):
    """One cable that crosses story parts. It is built as ONE surface and only its material changes (the
    data pass reads the material): the two sides share a ring, so there is no seam or end cap between."""
    if len(pts) < 2:
        return
    rings = tube_rings(pts, radii, sides)
    start = 0
    for i in range(1, len(pts) + 1):
        if i == len(pts) or parts[i] != parts[start]:
            end = min(len(pts), i + 1)                     # share the boundary ring
            if end - start > 1:
                emit(f"{prefix}_{parts[start]}", rings[start:end], flows[start:end], lane, start == 0, end == len(pts))
            start = i

# ── the fused wood core ─────────────────────────────────────────────────────
CORE = {"bvh": None, "face_part": []}

def build_core(members, fillet=0.30):
    """members: [(spine, radius factor, last sample index)]. Union the tubes, then grow and shrink the
    surface by `fillet` (a morphological closing): hollows and crotches fill into smooth concave joins."""
    for sp, factor, end in members:
        pts = sp["pos"][:end]
        tube("bark_trunk", pts, [max(.07, r * factor) for r in sp["rad"][:end]], sp["flow"][:end], 20, .5)
    raw = BUF.pop("bark_trunk")
    me = bpy.data.meshes.new("core")
    me.from_pydata(raw["v"], [], raw["f"])
    me.update()
    ob = bpy.data.objects.new("core", me)
    col.objects.link(ob)
    bpy.context.view_layer.objects.active = ob

    def apply(kind, **settings):
        mod = ob.modifiers.new(kind.lower(), kind)
        for key, value in settings.items():
            setattr(mod, key, value)
        bpy.ops.object.modifier_apply(modifier=mod.name)

    apply("REMESH", mode="VOXEL", voxel_size=.10)
    apply("DISPLACE", strength=fillet, mid_level=0.0)
    apply("REMESH", mode="VOXEL", voxel_size=.10)
    apply("SMOOTH", factor=.5, iterations=8)
    apply("DISPLACE", strength=-fillet, mid_level=0.0)
    apply("REMESH", mode="VOXEL", voxel_size=.085)
    apply("SMOOTH", factor=.5, iterations=5)
    me = ob.data

    # every vertex takes its light position and story part from the limb it is closest to
    samples = [(sp, i) for sp, _, end in members for i in range(end)]
    tree = KDTree(len(samples))
    for k, (sp, i) in enumerate(samples):
        tree.insert(sp["pos"][i], k)
    tree.balance()
    flows, parts = [], []
    for v in me.vertices:
        best = min(tree.find_n(v.co, 10), key=lambda hit: hit[2] - samples[hit[1]][0]["rad"][samples[hit[1]][1]])
        sp, i = samples[best[1]]
        flows.append(sp["flow"][i]); parts.append(sp["parts"][i])
    names = sorted(set(parts))
    for name in names:
        me.materials.append(MATS[f"bark_{name}"])
    face_part = [parts[p.vertices[0]] for p in me.polygons]
    for p, name in zip(me.polygons, face_part):
        p.material_index = names.index(name)
        p.use_smooth = True
    for key, values in (("flow", flows), ("lane", [.5] * len(flows))):
        a = me.attributes.new(key, "FLOAT", "POINT")
        a.data.foreach_set("value", values)
    CORE["bvh"] = BVHTree.FromPolygons([v.co.copy() for v in me.vertices], [list(p.vertices) for p in me.polygons])
    CORE["face_part"] = face_part
    print("ROOTS core faces", len(me.polygons), "parts", names)

def hug(p, radial, limb_r, off):
    """If p is buried in the shared core (typically another limb at a fork), lift it onto the surface.
    The pull fades with depth, so a cable never snaps from one side of the trunk to the other."""
    if CORE["bvh"] is None:
        return p
    loc, nrm, _, dist = CORE["bvh"].ray_cast(p, radial, limb_r * 1.1 + .3)
    if loc is None or nrm.dot(radial) <= 0:               # already outside
        return p
    limit = limb_r * 1.1 + .3
    w = min(1.0, max(0.0, (limit - dist) / (limit * .45)))
    return p.lerp(loc + nrm * off, w * w * (3 - 2 * w))

def relax(pts, passes=2):
    for _ in range(passes):
        pts = [pts[0]] + [(pts[i - 1] + pts[i] * 2 + pts[i + 1]) / 4 for i in range(1, len(pts) - 1)] + [pts[-1]]
    return pts

LIMBS = []   # reused for greebles and twigs

def dress(sp, strands, twist=0.6, veins=0.13, peel=0.14, thick=6, cored=True):
    """Wrap a limb in its cable bundle."""
    pos, rad, U, V, arc, flows, parts = (sp[k] for k in ("pos", "rad", "U", "V", "arc", "flow", "parts"))
    n = len(pos)

    def strand(prefix, rho, a0, wr, i0, i1, tw, flare, sides, lane, wob=.45):
        pts, rr = [], []
        ph = rng.uniform(0, 100)
        for i in range(i0, i1):
            u = (i - i0) / max(1, i1 - i0 - 1)
            a = a0 + tw * arc[i] * 0.15 + noise.noise(Vector((arc[i] * 0.15, ph, 0.0))) * wob
            rr_l = rad[i] * rho * (1 + 0.13 * wob * noise.noise(Vector((arc[i] * 0.35, ph, 7.0))))
            if flare and u > 0.66:
                rr_l += rad[i] * flare * ((u - 0.66) / 0.34) ** 2
            radial = U[i] * math.cos(a) + V[i] * math.sin(a)
            r = max(0.006, rad[i] * wr * (min(1.0, 0.25 + 4 * min(u, 1 - u)) if flare else 1.0))
            pts.append(hug(pos[i] + radial * rr_l, radial, rad[i], r * .55))
            rr.append(r)
        if len(pts) > 2:
            tube_parts(prefix, relax(pts), rr, flows[i0:i1], parts[i0:i1], sides, lane)

    if not cored:                                          # thin limbs keep their own dark core
        tube_parts("jacket", pos, [r * 0.52 for r in rad], flows, parts, 10, 0.3)
    # heavy conduits: the ridges of the bark
    for k in range(thick):
        a0 = 2 * math.pi * k / thick + rng.uniform(-.25, .25)
        rho, wr, tw, lane = rng.uniform(.74, .9), rng.uniform(.14, .23), twist * rng.uniform(.3, .55), rng.random()
        state = rng.getstate()
        strand(rng.choice(['cable', 'steel', 'steel', 'jacket']), rho, a0, wr, 0, n, tw, 0, 12, lane, .10)
        if rng.random() < .7:          # a fibre running along the crest of the pipe
            after = rng.getstate(); rng.setstate(state)
            strand("vein", rho + wr * .99, a0, .010, 0, n, tw, 0, 4, lane, .10)
            rng.setstate(after)
    # second tier: slim steel rails running in tight parallel groups
    for g in range(thick):
        a0 = rng.uniform(0, 2 * math.pi); rho = rng.uniform(.9, 1.04); tw = twist * rng.uniform(.3, .55)
        state = rng.getstate()
        for j in range(rng.randrange(2, 5)):
            rng.setstate(state)
            strand("steel", rho, a0 + j * .17, .034, 0, n, tw, 0, 6, .5, .10)
        rng.random()
    # fine cables, a few peeling away from the limb
    for k in range(int(strands * .55)):
        glowing = rng.random() < veins
        if rng.random() < peel:
            i0 = rng.randrange(n // 3, max(n // 3 + 1, n - 8)); i1 = min(n, i0 + rng.randrange(8, max(9, n // 2)))
            flare = rng.uniform(.15, .5)
        else:
            i0, i1, flare = 0, n, 0
        rho = rng.uniform(.84, 1.1)
        a0 = rng.uniform(0, 2 * math.pi)
        tw = twist * rng.uniform(.45, 1.1)
        if glowing:
            strand('hot' if rng.random() < .2 else 'vein', rho + .03, a0, rng.uniform(.011, .024), i0, i1, tw, flare, 5, rng.random())
        else:
            strand(rng.choice(['cable', 'cable', 'cable', 'steel', 'jacket']), rho, a0, rng.uniform(.028, .08),
                   i0, i1, tw, flare, 6, rng.random())
    LIMBS.append(sp)

# The great limbs. Each one starts at the ground inside the trunk and leaves it at its own fork.
# trunk leader: PUC. Runs out of the top of the frame — the tree is bigger than the screen.
TRUNK = spine([(1588, 952, D, 110), (1580, 842, D, 90), (1572, 700, D + .2, 80), (1562, 560, D, 66),
               (1553, 430, D, 51), (1541, 290, D, 42), (1522, 160, D, 34), (1514, 30, D, 28),
               (1498, -80, D, 23), (1490, -190, D, 18)], "trunk", .35, .72, "trunk", fork=-999)
# great branch: B.E. Leaves the trunk, sweeps over the open sky, and carries the fruit.
GREAT = spine([(1520, 944, D - .9, 78), (1524, 830, D - 1.2, 68), (1534, 705, D - 2, 66),
               (1492, 568, D - 3.5, 59), (1396, 440, D - 4.5, 50), (1296, 345, D - 6, 46),
               (1190, 283, D - 7, 39), (1112, 262, D - 8.2, 29), (1076, 272, BRAIN_D, 19),
               (1068, 300, BRAIN_D, 11)], "branch", .62, .98, "great", fork=620)
# its reach, peeling out of the great branch toward the top-left corner
REACH = spine([(1468, 540, D - 3.7, 20), (1384, 428, D - 4.8, 25), (1288, 332, D - 5.9, 26),
               (1172, 252, D - 5.8, 22), (1040, 220, D - 5, 19), (900, 150, D - 4, 16),
               (790, 78, D - 3, 13), (668, 16, D - 2, 10), (520, -60, D - 1, 7)], "branch", .70, 1.0, "reach")
# right-hand great limb, and the long low bough that leaves it
RISE = spine([(1656, 944, D - .4, 70), (1642, 826, D - .8, 62), (1634, 690, D - 1.2, 61),
              (1656, 568, D - 1.9, 52), (1700, 452, D - 2.4, 40), (1728, 340, D - 2.2, 35),
              (1736, 236, D - 2, 30), (1754, 126, D - 1, 24), (1768, -20, D, 18),
              (1794, -130, D, 13)], "crown", .62, 1.0, "rise", fork=590)
EAST = spine([(1634, 760, D - .9, 26), (1646, 620, D - 1.6, 31), (1708, 528, D - 3.4, 35),
              (1820, 462, D - 5.8, 34), (1935, 412, D - 7, 30), (2070, 366, D - 8, 25),
              (2230, 322, D - 8, 20)], "crown", .62, 1.0, "east", fork=560)
# the two upper leaders the trunk divides into
LEFT = spine([(1552, 936, D + .8, 46), (1542, 790, D + .6, 37), (1534, 640, D + .5, 33),
              (1516, 505, D + .6, 32), (1468, 392, D + 1, 29), (1404, 284, D + 1.5, 24),
              (1368, 168, D + 2, 19), (1326, 62, D + 3, 14), (1246, -70, D + 4, 8)], "trunk", .62, .78, "left", fork=-999)
RIGHT = spine([(1626, 938, D + .9, 46), (1612, 790, D + .7, 37), (1600, 645, D + .6, 33),
               (1598, 515, D + .6, 32), (1630, 402, D + 1, 28), (1678, 308, D + 1.5, 23),
               (1692, 192, D + 2, 19), (1682, 74, D + 3, 15), (1716, -140, D + 3, 10)], "trunk", .62, .78, "right", fork=-999)

# ROOTS: schooling. Defined trunk -> tip; flow runs tip -> trunk (0.15 -> 0.35).
# Each starts low inside the trunk and pours out of it as a buttress.
ROOT_SPECS = [
    # left sweep
    [(1548, 742, D, 40), (1466, 812, D - 2, 42), (1350, 868, D - 5, 36), (1215, 904, D - 7, 27), (1085, 934, None, 15), (950, 944, None, 5)],
    [(1550, 792, D - 1, 42), (1466, 866, D - 4, 39), (1368, 908, D - 7, 29), (1252, 944, None, 20), (1100, 964, None, 9)],
    [(1568, 818, D - 2, 44), (1515, 890, D - 4, 38), (1430, 934, None, 28), (1300, 968, None, 18), (1145, 980, None, 7)],
    # front
    [(1580, 810, D - 2, 48), (1584, 896, D - 5, 42), (1520, 968, None, 34), (1395, 1044, None, 30), (1245, 1135, None, 26)],
    [(1612, 814, D - 2, 44), (1634, 900, D - 5, 36), (1612, 978, None, 28), (1560, 1070, None, 24), (1500, 1180, None, 22)],
    [(1640, 804, D - 2, 44), (1696, 894, D - 4, 37), (1742, 962, None, 28), (1838, 1048, None, 25), (1960, 1160, None, 22)],
    # right sweep
    [(1652, 758, D - 1, 42), (1738, 842, D - 3, 37), (1842, 892, None, 26), (1960, 934, None, 17), (2090, 975, None, 8), (2210, 1000, None, 4)],
    [(1662, 724, D, 36), (1778, 808, D + 1, 30), (1905, 846, None, 19), (2030, 874, None, 10)],
    # back
    [(1536, 780, D + 2, 28), (1420, 828, D + 8, 19), (1300, 838, None, 12), (1180, 838, None, 5)],
    [(1646, 780, D + 3, 28), (1760, 826, D + 10, 18), (1880, 832, None, 10), (1990, 832, None, 4)],
]
ROOT_SPINES = [spine(spec, "roots", .35, .15, "root") for spec in ROOT_SPECS]

def until_row(sp, row):
    """Number of samples below an image row (the thick part of a limb, which belongs in the core)."""
    return next((i for i, p in enumerate(sp["pos"]) if to_px(p)[1] < row), len(sp["pos"]))

build_core(
    [(TRUNK, .84, len(TRUNK["pos"])), (GREAT, .82, until_row(GREAT, 300)), (REACH, .74, until_row(REACH, 235)),
     (RISE, .82, until_row(RISE, 100)), (EAST, .78, len(EAST["pos"]) * 3 // 4),
     (LEFT, .78, until_row(LEFT, 90)), (RIGHT, .78, until_row(RIGHT, 90))]
    + [(sp, .76, len(sp["pos"]) * 3 // 5) for sp in ROOT_SPINES])

dress(TRUNK, 170, twist=.35, veins=.12, peel=.16, thick=10)
dress(GREAT, 170, twist=.5, veins=.17, peel=.12, thick=9)
dress(REACH, 70, twist=.6, veins=.15, peel=.22, thick=4)
dress(RISE, 120, twist=.55, veins=.16, peel=.14, thick=7)
dress(EAST, 76, twist=.65, veins=.19, peel=.18, thick=5)
dress(LEFT, 70, twist=.5, veins=.12, peel=.18, thick=5)
dress(RIGHT, 70, twist=.5, veins=.12, peel=.18, thick=5)
for sp in ROOT_SPINES:
    dress(sp, 50, twist=.6, veins=.15, peel=.22, thick=5)

# Ridges: unbroken cables from a root tip, up the trunk, out along a limb. They are what makes root,
# trunk and branch read as one organism, and a pulse rides them the whole way.
RIDGE_PAIRS = [(0, GREAT), (1, GREAT), (2, GREAT), (3, TRUNK), (3, GREAT), (4, TRUNK), (5, RISE), (6, RISE),
               (6, EAST), (7, EAST), (8, LEFT), (9, RIGHT)]
for root_i, limb_sp in RIDGE_PAIRS:
    root_sp = ROOT_SPINES[root_i]
    base_row = to_px(root_sp["pos"][0])[1]
    climb = next(i for i, p in enumerate(limb_sp["pos"]) if to_px(p)[1] < base_row - 70)
    down = range(len(root_sp["pos"]) - 1, 5, -1)           # tip -> trunk
    up = range(climb, len(limb_sp["pos"]))                 # trunk -> out along the limb
    chain = [(root_sp, i) for i in down] + [(limb_sp, i) for i in up]
    for k in range(5):
        side_a = rng.uniform(-1.15, 1.15)                  # spread over the face the camera sees
        wr = rng.uniform(.05, .11)
        pts, rr = [], []
        for sp, i in chain:
            t = sp["tang"][i]
            front = Vector((0, -1, 0)) - t * Vector((0, -1, 0)).dot(t)
            front = front.normalized() if front.length > .05 else sp["U"][i]
            across = t.cross(front).normalized()
            radial = front * math.cos(side_a) + across * math.sin(side_a) * (1 if sp is limb_sp else -1)
            r = max(.008, sp["rad"][i] * wr)
            pts.append(hug(sp["pos"][i] + radial * sp["rad"][i] * .92, radial, sp["rad"][i], r * .8))
            rr.append(r)
        pts = relax(pts, 6)
        flows = [sp["flow"][i] for sp, i in chain]
        parts = [sp["parts"][i] for sp, i in chain]
        tube_parts("steel" if k % 2 else "cable", pts, rr, flows, parts, 10, rng.random())
        if k < 3:                                          # its light, along the crest
            crest = [p + Vector((0, -1, 0)) * rr[j] * 1.02 for j, p in enumerate(pts)]
            tube_parts("hot" if k == 0 else "vein", crest, [max(.0052, r * .17) for r in rr], flows, parts, 4, rng.random())

def limb(spec, part, f0, f1, strands, twist=0.9, veins=0.13, peel=0.24, thick=6, name=None):
    """A thin limb outside the fused core: spine plus its own cable bundle."""
    dress(spine(spec, part, f0, f1, name), strands, twist=twist, veins=veins, peel=peel, thick=thick, cored=False)

# crown limbs: thinner, each continuing out of a great limb
limb([(910, 156, D - 4, 8), (780, 150, D - 3, 6), (620, 118, D - 2, 4), (440, 104, D, 2.6),
      (260, 84, D + 2, 1.6), (150, 62, D + 3, .9)], "crown", .8, 1.0, 16, peel=.4, thick=0, veins=.2, name="far_left")
limb([(1716, 372, D - 2.1, 15), (1736, 262, D - 1, 13), (1800, 190, D + 2, 10), (1862, 96, D + 3, 7),
      (1950, 40, D + 4, 5), (2060, 10, D + 5, 3), (2200, -12, D + 5, 2)], "crown", .75, 1.0, 26, peel=.4, thick=2, name="high_right")
limb([(1406, 288, D + 1.4, 11), (1384, 168, D + 3, 8), (1290, 92, D + 4, 6), (1185, 26, D + 5, 4),
      (1090, -30, D + 6, 3)], "crown", .72, 1.0, 20, peel=.4, thick=0, veins=.2, name="high_left")

# thin rootlets between the big ones
for i in range(34):
    a = ROOT_SPECS[rng.randrange(8)]
    k = rng.randrange(2, len(a) - 1)
    px, py, d, r = a[k]
    d = d if d is not None else ground_depth(py, .12)
    side = -1 if px < 1590 else 1
    p2y = min(1135, py + rng.uniform(40, 120))
    limb([(px, py, d, r * .42), (px + side * rng.uniform(40, 110), py + rng.uniform(25, 60), d, r * .25),
          (px + side * rng.uniform(120, 260), max(842, p2y), None, 2.2)],
         "roots", .30, .15, 7, twist=1.2, veins=.2, peel=.2, thick=0, name="rootlet")

# ── bark circuitry: traces routed over the surface of the trunk, with PCB elbows ─────────────
def on_bark(px, py):
    origin = Vector((0, 0, CAM_Z))
    aim = (W(px, py, D) - origin).normalized()
    loc, nrm, face, _ = CORE["bvh"].ray_cast(origin, aim, 90.0)
    if loc is None:
        return None
    return loc - aim * .05, CORE["face_part"][face]

for _ in range(110):
    px, py = rng.gauss(1580, 74), rng.uniform(140, 905)
    pts, parts, flows = [], [], []
    for _leg in range(rng.randrange(3, 9)):
        run = rng.uniform(14, 46)
        lean = rng.choice([0, 0, 0, -1, 1])                 # straight up, or a 45 degree elbow
        for _s in range(max(2, int(run / 6))):
            px += lean * 4.2; py -= 6.0
            hit = on_bark(px, py)
            if hit is None:
                break
            pts.append(hit[0]); parts.append(hit[1]); flows.append(trunk_flow(py))
        if hit is None:
            break
    if len(pts) < 5:
        continue
    width = S(rng.uniform(.55, 1.25), D)
    tube_parts("hot" if rng.random() < .12 else "vein", pts, [width] * len(pts), flows, parts, 4, rng.random())
    sz = width * 3.2
    box(f"{'dot' if rng.random() < .35 else 'dim'}_{parts[-1]}", pts[-1], (sz, sz, sz), flow=flows[-1])

# ── greebles: modules and status LEDs hugging every limb ─────────────────────
for L in LIMBS:
    density = .6 if L["name"] in ("trunk", "great", "rise", "root") else .3
    n = len(L["pos"])
    for _ in range(int(L["arc"][-1] * 11 * density)):
        i = rng.randrange(n)
        part = L["parts"][i]
        a = rng.uniform(0, 2 * math.pi)
        r = L["rad"][i]
        out = L["U"][i] * math.cos(a) + L["V"][i] * math.sin(a)
        if out.y > .35:                      # skip the side the camera never sees
            continue
        t = L["tang"][i]
        side = t.cross(out).normalized()
        rot = Matrix((side, t, out)).transposed()
        p = hug(L["pos"][i] + out * r * rng.uniform(.96, 1.06), out, r, r * .04)
        if rng.random() < .45:
            box(f"{rng.choice(['cable', 'steel', 'jacket'])}_{part}", p,
                (r * rng.uniform(.05, .2), r * rng.uniform(.12, .6), r * rng.uniform(.04, .11)), rot, L["flow"][i])
        else:
            sz = max(.012, r * rng.uniform(.018, .042))
            box(f"dot_{part}" if rng.random() < .42 else f"dim_{part}", p + out * .02,
                (sz, sz * rng.uniform(1, 4.5), sz), rot, L["flow"][i])

# ── branch hierarchy: every shoot grows out of a parent, and its light continues the parent's ──
def keep_clear(px, py):
    """Open air around the fruit and behind the headline."""
    if math.hypot(px - BRAIN_PX, (py - BRAIN_PY) * .9) < 175:
        return False
    return not ((px < 1215 and 285 < py < 640) or (px < 930 and 128 < py < 640))

def grow_path(px, py, ang, length, segs, lift, kink):
    """Pixel-space walk that bends toward the sky, with an occasional PCB-style elbow."""
    pts = [(px, py)]
    a = ang
    for _ in range(segs):
        step = length / segs * rng.uniform(.82, 1.18)
        px += math.cos(a) * step; py -= math.sin(a) * step
        pts.append((px, py))
        a += math.atan2(math.sin(math.pi / 2 - a), math.cos(math.pi / 2 - a)) * lift + rng.uniform(-.2, .2)
        if rng.random() < kink:
            a += rng.choice([-1, 1]) * math.pi / 5.5
    return pts

def shoot(px, py, d, ang, length, wpx, part, flow, level):
    """level 1 = bough (bundle with a continuous light), 2 = limb, 3 = fine circuit twig."""
    segs = {1: 6, 2: 5, 3: 3}[level]
    path = grow_path(px, py, ang, length, segs, {1: .13, 2: .10, 3: .05}[level], {1: .14, 2: .26, 3: .5}[level])
    if any(not keep_clear(x, y) for x, y in path[1:]):
        return
    dd = [d + (k / segs) * rng.uniform(-.5, .9) for k in range(len(path))]
    ctrl = [(*W(x, y, dd[k]), S(wpx * (1 - .72 * k / segs), dd[k])) for k, (x, y) in enumerate(path)]
    sm = catmull(ctrl, .16) if level < 3 else [(Vector(c[:3]), c[3]) for c in ctrl]
    pos = [q for q, _ in sm]; rad = [max(.0065, r) for _, r in sm]
    n = len(pos)
    if level < 3:                                    # branch collar: the wood swells into its parent
        reach_in = max(3, n // 5)
        rad = [r * (1 + (.85 if level == 1 else .6) * max(0.0, 1 - k / reach_in) ** 2) for k, r in enumerate(rad)]
    reach = {1: .16, 2: .11, 3: .06}[level]
    flows = [min(1.0, flow + reach * k / (n - 1)) for k in range(n)]
    tube(f"{rng.choice(['cable', 'steel', 'steel'])}_{part}", pos, rad, flows, {1: 8, 2: 6, 3: 4}[level])
    tang = [(pos[min(k + 1, n - 1)] - pos[max(k - 1, 0)]).normalized() for k in range(n)]
    side = [t.cross(Vector((0, 1, 0))).normalized() for t in tang]
    if level < 3:                                    # companion cables wound round the spine
        for c in range(3 if level == 1 else 2):
            ph = rng.uniform(0, 6.28)
            off = [pos[k] + (side[k] * math.cos(ph + k * .23) + Vector((0, 1, 0)) * math.sin(ph + k * .23) * .6)
                   * rad[k] * 1.12 for k in range(n)]
            tube(f"{rng.choice(['cable', 'steel', 'jacket'])}_{part}", off, [max(.0055, r * .42) for r in rad], flows, 5)
    # one unbroken light runs along the crest, so a pulse visibly travels trunk -> tip
    if level == 1 or (level == 2 and rng.random() < .62) or (level == 3 and rng.random() < .22):
        crest = [pos[k] + Vector((0, -1, 0)) * rad[k] * 1.04 for k in range(n)]
        tube(f"{'hot' if level == 1 and rng.random() < .3 else 'vein'}_{part}", crest,
             [max(.0052, rad[k] * (.17 if level == 1 else .24)) for k in range(n)], flows, 4)
    if level < 3:
        kids = 4 if level == 1 else 3
        start = rng.choice([-1, 1])
        for j in range(kids):
            u = .26 + .66 * (j + rng.uniform(.2, .8)) / kids
            k = min(len(path) - 2, int(u * segs))
            t = u * segs - k
            qx = path[k][0] + (path[k + 1][0] - path[k][0]) * t
            qy = path[k][1] + (path[k + 1][1] - path[k][1]) * t
            heading = math.atan2(path[k][1] - path[k + 1][1], path[k + 1][0] - path[k][0])
            turn = start * (1 if j % 2 == 0 else -1) * rng.uniform(.5, 1.0)
            shoot(qx, qy, dd[k], heading + turn, length * rng.uniform(.4, .62) * (1.15 - u * .4),
                  wpx * (1 - .7 * u) * .66, part, min(1.0, flow + reach * u), level + 1)
    # the only lights that are not on a cable: one node at the end of a branch
    if level == 3 and rng.random() < .5:
        sz = S(rng.uniform(1.5, 2.8), dd[-1])
        box(f"dot_{part}" if rng.random() < .3 else f"dim_{part}", pos[-1], (sz, sz, sz), flow=flows[-1])

def sprout(L, count, lo, hi, length, width, part, level=1, py_max=560, upward=False):
    """Evenly spaced shoots along a limb, alternating sides, shorter and thinner toward its tip."""
    n = len(L["pos"])
    first = rng.choice([-1, 1])
    for j in range(count):
        u = lo + (hi - lo) * (j + rng.uniform(.25, .75)) / count
        i = min(n - 2, max(1, int(u * (n - 1))))
        px, py, d = to_px(L["pos"][i])
        qx, qy, _ = to_px(L["pos"][i + 1])
        if py > py_max or py < -60 or px > 2200:
            continue
        heading = math.atan2(py - qy, qx - px)
        side = first * (1 if j % 2 == 0 else -1)
        ang = heading + side * rng.uniform(.55, 1.05)
        if upward and math.sin(ang) < .15:           # fold downward shoots back toward the sky
            ang = heading - side * rng.uniform(.55, 1.05)
        shoot(px, py, d + rng.uniform(-.3, 1.2), ang, length * (1.15 - .45 * u),
              width * (1.1 - .5 * u), part, L["flow"][i], level)

NAMED = {L["name"]: L for L in LIMBS if L["name"] not in (None, "root", "rootlet")}
sprout(NAMED["trunk"], 15, .46, .99, 210, 6.5, "trunk")
sprout(NAMED["great"], 11, .30, .74, 135, 5.0, "branch", upward=True, py_max=470)
sprout(NAMED["reach"], 19, .05, .97, 158, 4.6, "branch", py_max=420)
sprout(NAMED["rise"], 20, .28, .98, 178, 5.6, "crown", py_max=480)
sprout(NAMED["east"], 12, .18, .97, 170, 5.6, "crown", py_max=520)
sprout(NAMED["left"], 6, .58, .96, 165, 4.4, "crown", py_max=400)
sprout(NAMED["right"], 5, .58, .96, 150, 4.4, "crown", py_max=400)
for key in ("far_left", "high_right", "high_left"):    # the smaller crown limbs
    sprout(NAMED[key], 5, .18, .96, 105, 3.4, "crown", level=2, py_max=380)
# a second, deeper tier behind the tree: thinner, hazed by distance, still rooted in the trunk
for base_py, ang, length in [(420, 2.55, 330), (300, .55, 300), (230, 2.25, 290), (170, .95, 260),
                             (360, 2.85, 250), (260, .25, 330), (450, .35, 300)]:
    shoot(1556, base_py, D + 7, ang, length, 8.0, "crown", .62, 1)

# hanging jumper cables
for _ in range(60):
    L = NAMED[rng.choice(["great", "reach", "rise", "east", "left"])]
    n = len(L["pos"])
    i = rng.randrange(n // 4, n); j = min(n - 1, i + rng.randrange(4, 22))
    a, b_ = L["pos"][i], L["pos"][j]
    sag = rng.uniform(.4, 2.4)
    pts = [a.lerp(b_, k / 18) + Vector((0, 0, -sag * 4 * (k / 18) * (1 - k / 18))) for k in range(19)]
    if any(not keep_clear(*to_px(q)[:2]) for q in pts):
        continue
    tube("vein_crown" if rng.random() < .12 else "cable_crown", pts, [rng.uniform(.008, .022)] * 19,
         [L["flow"][i]] * 19, 4)

# ── the stem: cables that leave the great branch and gather into the neck of the fruit ──
brain_c = W(BRAIN_PX, BRAIN_PY, BRAIN_D)
brain_r = S(BRAIN_R, BRAIN_D)
stem = W(1069, 292, BRAIN_D)
neck = brain_c + Vector((0, 0, brain_r * POD_PROFILE[-1][0]))
for k in range(11):
    a = 2 * math.pi * k / 11 + rng.uniform(-.15, .15)
    ring = Vector((math.cos(a), math.sin(a) * .8, 0))
    p1 = stem + ring * brain_r * .13
    p2 = stem.lerp(neck, .55) + ring * brain_r * .075 + Vector((brain_r * .07, 0, 0))
    p3 = neck + ring * brain_r * .05
    sm = [q for q, _ in catmull([(p.x, p.y, p.z, 0) for p in (p1, p2, p3)], .07)]
    m = len(sm)
    glowing = k % 4 == 0
    tube("hot_branch" if glowing else rng.choice(["cable_branch", "steel_branch"]), sm,
         [brain_r * (.016 if glowing else .036) * (1 - .45 * i / m) for i in range(m)],
         [.97 + .03 * i / m for i in range(m)], 7)

def leaf_blade(base_px, tip_px, wpx, d, bow):
    """Pointed leaf in reference pixels: thin steel blade, lit midrib, angled side traces."""
    ax, ay = base_px; bx, by = tip_px
    nx, ny = -(by - ay), bx - ax
    ln = math.hypot(nx, ny); nx, ny = nx / ln, ny / ln
    N = 22
    def spine(u):
        k = math.sin(math.pi * u) * bow
        return ax + (bx - ax) * u + nx * k, ay + (by - ay) * u + ny * k
    def half(u):
        return wpx * math.sin(math.pi * min(1.0, u * .94 + .03)) ** .85 * (1 - .35 * u)
    b = buf("cable_branch"); base = len(b["v"])
    rows = []
    for i in range(N + 1):
        u = i / N; x, y = spine(u); w = half(u)
        for side, lift in ((-1, 0.0), (0, -.05), (1, 0.0)):
            v = W(x + nx * w * side, y + ny * w * side, d + lift)
            b["v"].append((v.x, v.y, v.z)); b["flow"].append(.97 + .03 * u); b["lane"].append(.5)
        rows.append((x, y, w))
    for i in range(N):
        o = base + i * 3
        for k in (0, 1):
            b["f"].append((o + k, o + k + 1, o + 3 + k + 1, o + 3 + k))
    flows = [.97 + .03 * i / N for i in range(N + 1)]
    tube("vein_branch", [W(x, y, d - .09) for x, y, _ in rows], [S(1.5 * (1 - .6 * i / N), d) for i in range(N + 1)], flows, 5)
    for side in (-1, 1):
        edge = [W(x + nx * w * side, y + ny * w * side, d - .02) for x, y, w in rows]
        tube("steel_branch", edge, [S(.9, d)] * (N + 1), flows, 4)
        for i in range(3, N - 4, 4):
            x, y, _ = rows[i]; qx, qy, qw = rows[i + 3]
            tube("vein_branch", [W(x, y, d - .09), W(qx + nx * qw * .86 * side, qy + ny * qw * .86 * side, d - .06)],
                 [S(.75, d), S(.45, d)], [flows[i], flows[i + 3]], 4)

leaf_blade((1070, 303), (1176, 366), 19, BRAIN_D - .5, 12)
leaf_blade((1066, 296), (990, 330), 12, BRAIN_D + .6, -9)

# ── THE CITY: a circuit board at street scale ───────────────────────────────
gm = bpy.data.meshes.new("ground")
gm.from_pydata([(-190, 6, -.02), (190, 6, -.02), (190, 330, -.02), (-190, 330, -.02)], [], [(0, 1, 2, 3)])
gm.materials.append(MATS["ground"])
col.objects.link(bpy.data.objects.new("ground", gm))

base_c = W(1588, 941, D)

def near_tree(x, y):
    return math.hypot(x - base_c.x, y - base_c.y)

def random_ground(dmin, dmax, bias=1.0):
    d = dmin + (dmax - dmin) * rng.random() ** bias
    x = rng.uniform(-.56, .56) * d
    return x, d

# street-level chips and blocks
for _ in range(5200):
    x, y = random_ground(15, 150, 1.45)
    grow = .55 + y / 90
    sx = rng.uniform(.1, 1.15) * grow
    sy = rng.uniform(.1, 1.15) * grow
    h = rng.uniform(.015, .085) if rng.random() < .955 else rng.uniform(.14, .5)
    box("chip", Vector((x, y, h / 2)), (sx, sy, h), flow=.02)
    if rng.random() < .20:                    # pin rows
        for k in range(int(sx / .13)):
            box("dim_city" if rng.random() < .35 else "steel_city",
                Vector((x - sx / 2 + .13 * k, y - sy / 2 - .07, .025)), (.05, .14, .04), flow=.05)
    if rng.random() < .20:                    # status light
        box("dot_city" if rng.random() < .3 else "dim_city",
            Vector((x + rng.uniform(-.4, .4) * sx, y - sy / 2 - .005, h * rng.uniform(.4, .9))),
            (rng.uniform(.03, .22), .02, .018), flow=.04)

# the foundation: low structures packed between the roots
for _ in range(520):
    r = abs(rng.gauss(0, 4.6)); a = rng.uniform(0, 2 * math.pi)
    x = base_c.x + math.cos(a) * r * 1.25; y = base_c.y + math.sin(a) * r
    h = max(.05, rng.uniform(.2, 1.0) * 1.05 * math.exp(-r / 5.0))     # low: it nestles between the buttresses
    sx, sy = rng.uniform(.18, .9), rng.uniform(.18, .9)
    box("chip" if rng.random() < .8 else "tower", Vector((x, y, h / 2)), (sx, sy, h), flow=.14)
    if rng.random() < .30:
        box("dim_city" if rng.random() < .7 else "dot_city",
            Vector((x + rng.uniform(-.4, .4) * sx, y - sy / 2 - .006, h * rng.uniform(.3, .95))),
            (.03, .02, rng.uniform(.04, .45)) if rng.random() < .5 else (rng.uniform(.05, .3), .02, .025), flow=.15)

# the main data highway (nothing is built up in front of the trunk: the root flare must read clearly)
HIGHWAY = [[(1612, 900), (1598, 935), (1520, 972), (1400, 1004), (1290, 1056), (1130, 1150)],
           [(1650, 905), (1640, 945), (1700, 985), (1712, 1060), (1655, 1160)],
           [(1530, 905), (1440, 925), (1300, 930), (1140, 962), (760, 975), (240, 1015), (-60, 1030)]]
for hi, route in enumerate(HIGHWAY):
    ctrl = [(*W(px, py, ground_depth(py, .16)), 0) for px, py in route]
    sm = [q for q, _ in catmull(ctrl, .35)]
    m = len(sm)
    flows = [.15 * (1 - i / (m - 1)) for i in range(m)]
    for lane_i in range(-4, 5):
        pts = []
        for i, q in enumerate(sm):
            t = (sm[min(i + 1, m - 1)] - sm[max(i - 1, 0)]).normalized()
            side = t.cross(Vector((0, 0, 1))).normalized()
            pts.append(q + side * lane_i * .135 + Vector((0, 0, -.03 * abs(lane_i))))
        mat = ("hot_city" if lane_i == 0 and hi < 2 else
               "vein_city" if abs(lane_i) == 3 else ("steel_city" if lane_i % 2 else "cable_city"))
        tube(mat, pts, [.020 if mat.startswith(("hot", "vein")) else .052] * m, flows, 8)

def trace_path(x, y, dirx, diry, steps, seg):
    pts = [(x, y)]
    base = math.atan2(diry, dirx)
    a = base
    for _ in range(steps):
        L_ = rng.uniform(*seg)
        x += math.cos(a) * L_; y += math.sin(a) * L_
        pts.append((x, y))
        a = base + rng.choice([-1, 0, 0, 1]) * math.pi / 4
    return pts

def ribbon(mat, pts, width, z, flows):
    """Flat PCB trace (a thin box per segment)."""
    for i in range(len(pts) - 1):
        a = Vector((pts[i][0], pts[i][1], z)); b_ = Vector((pts[i + 1][0], pts[i + 1][1], z))
        v = b_ - a
        n_cut = max(1, int(v.length / .8))
        rot = Matrix.Rotation(math.atan2(v.y, v.x), 3, "Z")
        for k in range(n_cut):
            c = a + v * ((k + .5) / n_cut)
            f = flows[i] + (flows[i + 1] - flows[i]) * (k + .5) / n_cut
            box(mat, c, (v.length / n_cut + width * .5, width, .014), rot, f)

# board traces, bundled in parallel lanes
for _ in range(820):
    x, y = random_ground(15, 110, 1.3)
    horiz = rng.random() < .5
    path = trace_path(x, y, 1 if horiz else 0, 0 if horiz else 1, rng.randrange(2, 7), (.7, 3.8))
    lanes = rng.choice([1, 1, 2, 3, 5])
    lit = rng.random()
    mat = "vein_city" if lit < .045 else ("dim_city" if lit < .13 else ("steel_city" if lit < .5 else "cable_city"))
    w = rng.uniform(.012, .038)
    for k in range(lanes):
        off = [(px + k * w * 2.7 * (0 if not horiz else 0), py + k * w * 2.7) if horiz else (px + k * w * 2.7, py)
               for px, py in path]
        flows = [.02 + .10 * math.exp(-near_tree(px, py) / 22) for px, py in off]
        ribbon(mat, off, w, rng.uniform(.012, .09), flows)

# data buses: every root tip keeps going as copper into the city (and feeds it)
for spec in ROOT_SPECS:
    px, py, d, r = spec[-1]
    d = d if d is not None else ground_depth(py, .12)
    tip = W(px, py, d)
    outx, outy = tip.x - base_c.x, tip.y - base_c.y
    for k in range(7):
        start = (tip.x + rng.uniform(-.5, .5), tip.y + rng.uniform(-.5, .5))
        path = trace_path(start[0], start[1], outx, min(outy, 0) - .5, 6, (1.0, 3.6))
        flows = [.15 * (1 - i / (len(path) - 1)) for i in range(len(path))]
        ribbon("vein_city" if k % 3 == 0 else ("hot_city" if k == 1 else "steel_city"), path,
               rng.uniform(.025, .085), .05, flows)

# pylons with light slits on square landing pads
for px, py, hpx in [(832, 962, 140), (856, 958, 112), (1048, 1052, 66), (1072, 1056, 60),
                    (1240, 905, 52), (336, 968, 44), (560, 880, 36), (1905, 1010, 70), (690, 1052, 30)]:
    d = ground_depth(py)
    h = S(hpx, d)
    p = W(px, py, d)
    box("tower", Vector((p.x, p.y, h / 2)), (S(20, d), S(20, d), h), flow=.06)
    for k in (-5, 3):
        box("vein_city", Vector((p.x + S(k, d), p.y - S(10.5, d), h * .55)), (S(2.2, d), .02, h * .72), flow=.07)
    pad = S(rng.uniform(46, 85), d)
    corners = [(p.x - pad, p.y - pad * .7), (p.x + pad, p.y - pad * .7), (p.x + pad, p.y + pad * .7),
               (p.x - pad, p.y + pad * .7), (p.x - pad, p.y - pad * .7)]
    ribbon("dim_city", corners, .035, .06, [.05] * 5)

# skyline: districts of the city dissolving into haze
def tower(x, y, h, w):
    box("tower", Vector((x, y, h / 2)), (w, w * rng.uniform(.6, 1.2), h), flow=.01)
    if rng.random() < .5:                     # setback + mast
        h2 = h * rng.uniform(.15, .4)
        box("tower", Vector((x, y, h + h2 / 2)), (w * .55, w * .5, h2), flow=.01)
        box("steel_city", Vector((x, y, h + h2 + h * .09)), (.05, .05, h * .18), flow=.01)
    cols = rng.randrange(0, 4)
    for c in range(cols):
        cx = x + w * (-.34 + .68 * (c + .5) / max(1, cols))
        z = rng.uniform(.2, .8)
        while z < h:
            seg = rng.uniform(.06, .5)
            if rng.random() < .34:
                box("dim_city" if rng.random() < .86 else "dot_city",
                    Vector((cx, y - w * .62, z)), (.055, .02, seg), flow=.02)
            z += seg + rng.uniform(.08, .5)

for _ in range(420):
    y = rng.uniform(70, 225)
    px = rng.uniform(-60, 2220)
    x = (px - REF_W / 2) / F * y
    hpx = rng.uniform(14, 78) * (2.0 if rng.random() < .07 else 1)
    if 330 < px < 1180:
        hpx *= .62                            # keep the sky open behind the headline
    tower(x, y, S(hpx, y) + .4, rng.uniform(.5, 2.4))
for px, d, hpx in [(48, 52, 330), (92, 66, 250), (140, 48, 150), (452, 72, 150), (520, 90, 120),
                   (835, 58, 190), (950, 80, 205), (1190, 70, 170), (1305, 56, 300), (1332, 57, 220),
                   (1860, 60, 220), (1945, 50, 250), (1760, 72, 180), (2070, 62, 210), (2150, 54, 240)]:
    tower((px - REF_W / 2) / F * d, d, S(hpx, d), rng.uniform(.55, 1.2))

# data motes / sparks in the air
for _ in range(170):
    d = rng.uniform(46, 96)
    if rng.random() < .7:
        px, py = rng.gauss(1580, 250), rng.gauss(380, 300)
    else:
        px, py = rng.uniform(0, 2000), rng.uniform(0, 760)
    sz = S(rng.uniform(.55, 1.5), d)
    if math.hypot(px - BRAIN_PX, py - BRAIN_PY) < 170:
        continue
    box("dim_crown", W(px, py, d),
        (sz, sz, sz * rng.uniform(1, 4)), flow=rng.random())

flush()

# ── the Engineer's Brain (same asset as the Skills section) ─────────────────
def load_brain():
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(BRAIN_GLB))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    helpers = [o for o in new if o.type != "MESH"]        # collected before join frees meshes
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    brain = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in helpers:
        bpy.data.objects.remove(o)
    vs = [v.co for v in brain.data.vertices]
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    ctr = (lo + hi) / 2
    ext = max(hi - lo) / 2
    brain.data.transform(Matrix.Translation(-ctr))
    brain.data.transform(Matrix.Scale(1.0 / ext, 4))          # normalised: radius ~1
    brain.name = "brain_fruit"
    return brain

def build_pod():
    """Glassy fruit skin: clear in the middle, bright at the rim."""
    m = bpy.data.materials.new("pod_skin"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = _n(nt, "ShaderNodeOutputMaterial")
    lw = _n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = .3
    rim = _math(nt, "POWER", lw.outputs["Facing"], 2.6)
    em = _n(nt, "ShaderNodeEmission"); em.inputs["Color"].default_value = (.10, .34, 1.0, 1)
    nt.links.new(_math(nt, "ADD", _math(nt, "MULTIPLY", rim, 3.4), .13), em.inputs["Strength"])
    tr = _n(nt, "ShaderNodeBsdfTransparent")
    add = _n(nt, "ShaderNodeAddShader")
    nt.links.new(tr.outputs[0], add.inputs[0]); nt.links.new(em.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs["Surface"])
    m["part"] = .75
    MATS["pod_skin"] = m
    segs = 64
    verts, faces = [], []
    for h, r in POD_PROFILE:
        for i in range(segs):
            a = 2 * math.pi * i / segs
            verts.append(brain_c + Vector((math.cos(a) * r, math.sin(a) * r * .86, h)) * brain_r)
    for j in range(len(POD_PROFILE) - 1):
        for i in range(segs):
            o = j * segs
            faces.append((o + i, o + (i + 1) % segs, o + segs + (i + 1) % segs, o + segs + i))
    me = bpy.data.meshes.new("pod"); me.from_pydata(verts, [], faces)
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    me.materials.append(m)
    col.objects.link(bpy.data.objects.new("pod", me))
    for i in range(6):                              # seams: the segments of a fruit
        a = 2 * math.pi * (i + .5) / 6
        ctrl = [(*(brain_c + Vector((math.sin(a) * r * 1.004, -math.cos(a) * r * .864, h)) * brain_r), 0)
                for h, r in POD_PROFILE]
        seam = [q for q, _ in catmull(ctrl, brain_r * .1)]
        tube("dim_branch", seam, [brain_r * .0085] * len(seam), [.98] * len(seam), 4)
    build_calyx()

def pod_radius(h):
    for (h0, r0), (h1, r1) in zip(POD_PROFILE, POD_PROFILE[1:]):
        if h0 <= h <= h1:
            return r0 + (r1 - r0) * (h - h0) / (h1 - h0)
    return POD_PROFILE[-1][1]

def build_calyx():
    """Sepals lie on the skin from the neck downward; their tips curl away."""
    top = POD_PROFILE[-1][0]
    for deg, length in SEPALS:
        phi = math.radians(deg)
        N = 14
        mids, lefts, rights = [], [], []
        for i in range(N + 1):
            u = i / N
            h = top + .04 - u * length
            r = pod_radius(min(h, top)) + .055 + .30 * u ** 3
            half = .30 * min(1.0, .35 + u * 3.2) * (1 - u) ** .75 + .004
            for offset, bucket, bulge in ((0, mids, .045), (-half, lefts, 0), (half, rights, 0)):
                a = phi + offset / max(r, .2)
                bucket.append(brain_c + Vector((math.sin(a) * (r + bulge), -math.cos(a) * (r + bulge) * .86, h)) * brain_r)
        verts = [v for row in zip(lefts, mids, rights) for v in row]
        faces = [(i * 3 + k, i * 3 + k + 1, i * 3 + k + 4, i * 3 + k + 3) for i in range(N) for k in (0, 1)]
        me = bpy.data.meshes.new("sepal"); me.from_pydata(verts, [], faces); me.materials.append(MATS["cable_branch"])
        col.objects.link(bpy.data.objects.new("sepal", me))
        flows = [.98] * (N + 1)
        tube("vein_branch", mids, [brain_r * .017 * (1 - .6 * i / N) for i in range(N + 1)], flows, 5)
        for edge in (lefts, rights):
            tube("steel_branch", edge, [brain_r * .012] * (N + 1), flows, 4)
    flush()

if WITH_BRAIN:
    brain = load_brain()
    m = bpy.data.materials.new("brain_holo"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = _n(nt, "ShaderNodeOutputMaterial")
    bsdf = _n(nt, "ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (0.01, 0.05, 0.11, 1)
    bsdf.inputs["Metallic"].default_value = .6
    bsdf.inputs["Roughness"].default_value = .28
    lw = _n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = .38
    rim = _math(nt, "POWER", lw.outputs["Facing"], 2.2)
    geo = _n(nt, "ShaderNodeNewGeometry")
    vor = _n(nt, "ShaderNodeTexVoronoi", feature="DISTANCE_TO_EDGE"); vor.inputs["Scale"].default_value = 6.4
    nt.links.new(geo.outputs["Position"], vor.inputs["Vector"])
    line = _math(nt, "LESS_THAN", vor.outputs["Distance"], .028)
    strength = _math(nt, "ADD", _math(nt, "MULTIPLY", rim, .22), _math(nt, "ADD", _math(nt, "MULTIPLY", line, .05), .012))
    bsdf.inputs["Emission Color"].default_value = (0.035, 0.40, 1.0, 1)
    nt.links.new(strength, bsdf.inputs["Emission Strength"])
    nt.links.new(bsdf.outputs[0], out.inputs["Surface"])
    m["part"] = .75
    MATS["brain_holo"] = m
    brain.data.materials.clear(); brain.data.materials.append(m)
    for p in brain.data.polygons:
        p.material_index = 0
    brain.matrix_world = (Matrix.Translation(brain_c - Vector((0, 0, brain_r * .1))) @ Matrix.Rotation(math.radians(24), 4, "Z")
                          @ Matrix.Scale(brain_r * .9, 4))
    build_pod()

# ── lights ──────────────────────────────────────────────────────────────────
world = bpy.data.worlds.new("w"); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.0055, 0.016, 0.040, 1)
bg.inputs["Strength"].default_value = 1.0

def light(kind, pos, energy, color, size=1.0, target=None):
    l = bpy.data.lights.new("l", kind)
    l.energy = energy; l.color = color
    if kind == "AREA":
        l.size = size
    else:
        l.shadow_soft_size = size
    o = bpy.data.objects.new("l", l); col.objects.link(o); o.location = pos
    if target is not None:
        o.rotation_euler = (target - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    o.visible_camera = False
    return o

tc = W(1570, 480, D)
light("AREA", W(1345, 430, 38.5), 330, (0.14, 0.52, 1.0), 3.2, W(1290, 350, 33))   # separates branch from trunk
light("AREA", W(1180, 190, 37), 200, (0.16, 0.50, 1.0), 2.5, W(1120, 270, 32))     # rim along the fruit branch
light("AREA", W(1180, 120, 52), 3600, (0.12, 0.40, 1.0), 14, tc)       # rim, back left
light("AREA", W(2250, 260, 47), 3000, (0.10, 0.32, 1.0), 11, tc)       # rim, back right
light("AREA", W(1000, 520, 24), 420, (0.40, 0.58, 0.90), 4, tc)
light("AREA", W(760, 40, 20), 620, (0.30, 0.48, 0.85), 12, tc)         # soft front key
light("AREA", Vector((-8, 80, 36)), 7000, (0.07, 0.22, 0.70), 60, Vector((0, 60, 0)))  # sky wash on city
for px, py, d, e in [(1590, 915, 34, 260), (1360, 900, 30, 90), (1790, 930, 30, 110),
                     (1600, 640, 36.5, 110), (1560, 300, 36.5, 80), (1660, 560, 36, 60)]:
    light("POINT", W(px, py, d), e, (0.03, 0.34, 1.0), .5)
light("POINT", brain_c + Vector((0, -brain_r * .4, 0)), 140 if not WITH_BRAIN else 60, (0.08, 0.62, 1.0), brain_r * .7)

# ── layers ──────────────────────────────────────────────────────────────────
def is_city(ob):
    name = ob.name
    return name.split(".")[0] in ("ground", "chip", "tower") or name.split(".")[0].endswith("_city")

if LAYER != "all":
    meshes = [o for o in col.objects if o.type == "MESH"]
    for o in meshes:
        if LAYER == "tree" and is_city(o):
            o.is_holdout = True            # still lights the tree and still hides what is behind it
        elif LAYER == "back" and not is_city(o):
            o.visible_camera = False       # still lights the city; the city behind it is complete
    print("ROOTS layer", LAYER, "city objects:", sum(is_city(o) for o in meshes), "tree objects:", sum(not is_city(o) for o in meshes))

# ── camera + render ─────────────────────────────────────────────────────────
x0, ww = LAYOUTS[LAYOUT]
cam = bpy.data.cameras.new("cam")
cam.sensor_width = 36.0; cam.sensor_fit = "HORIZONTAL"
cam.lens = F * 36.0 / ww
cam.shift_x = (x0 + ww / 2 - REF_W / 2) / ww
cam.shift_y = (HORIZON - REF_H / 2) / ww
co = bpy.data.objects.new("cam", cam); col.objects.link(co)
co.location = (0, 0, CAM_Z); co.rotation_euler = (math.radians(90), 0, 0)
# focus on the near face of the tree: foreground board and far skyline soften (beauty pass only)
cam.dof.focus_distance = 36.0
cam.dof.aperture_fstop = 0.55
scene.camera = co

scene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "OPTIX"; prefs.get_devices()
for dev in prefs.devices:
    dev.use = dev.type == "OPTIX"
scene.cycles.device = "GPU"
if "--cpu" in argv:                       # leaves the graphics card free; --threads caps the cores used
    scene.cycles.device = "CPU"
    scene.render.threads_mode = "FIXED"
    scene.render.threads = int(arg("--threads", "6"))
scene.render.resolution_x = RES
scene.render.resolution_y = int(round(RES * REF_H / ww / 2) * 2)
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"

def frac(px, py):
    return [round((px - x0) / ww, 5), round(py / REF_H, 5)]

meta = {
    "layout": LAYOUT,
    "aspect": round(ww / REF_H, 5),
    "brain": {"c": frac(BRAIN_PX, BRAIN_PY), "r": round(BRAIN_R / ww, 5)},
    "anchors": {"roots": frac(1322, 893), "trunk": frac(1562, 455),
                "branch": frac(BRAIN_PX, BRAIN_PY - POD_PROFILE[0][0] * BRAIN_R + 18)},
    "pod": POD_PROFILE,
    "sepals": SEPALS,
}
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, f"meta_{LAYOUT}.json"), "w") as fh:
    json.dump(meta, fh, indent=1)

print("ROOTS objects:", len(col.objects), "faces:", sum(len(o.data.polygons) for o in col.objects if o.type == "MESH"))
if SAVE:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(SAVE))

def render(path):
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("ROOTS rendered", path)

if "beauty" in PASSES:
    cam.dof.use_dof = LAYER != "tree"      # lens blur on the city only: the tree stays crisp
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.exposure = 0.0
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 5
    scene.cycles.transparent_max_bounces = 24
    scene.cycles.sample_clamp_indirect = 6.0
    scene.render.filter_size = 1.4
    scene.render.image_settings.color_depth = "16"
    suffix = '_brain' if WITH_BRAIN else '' if LAYER == 'all' else '_' + LAYER
    render(os.path.join(OUT, f"beauty_{LAYOUT}{suffix}.png"))

if "data" in PASSES:
    # R = flow along the story path, G = story part id, B = nearness (for parallax)
    for m in MATS.values():
        nt = m.node_tree; nt.nodes.clear()
        out = _n(nt, "ShaderNodeOutputMaterial")
        at = _n(nt, "ShaderNodeAttribute", attribute_name="flow")
        cam_n = _n(nt, "ShaderNodeCameraData")
        near = _math(nt, "DIVIDE", 15.0, cam_n.outputs["View Distance"], True)
        comb = _n(nt, "ShaderNodeCombineColor")
        nt.links.new(at.outputs["Fac"], comb.inputs[0])
        comb.inputs[1].default_value = float(m["part"])
        nt.links.new(near, comb.inputs[2])
        em = _n(nt, "ShaderNodeEmission")
        nt.links.new(comb.outputs[0], em.inputs["Color"])
        nt.links.new(em.outputs[0], out.inputs["Surface"])
    cam.dof.use_dof = False
    scene.view_settings.view_transform = "Raw"
    scene.cycles.samples = 8
    scene.cycles.use_denoising = False
    scene.render.filter_size = 0.6
    scene.render.dither_intensity = 0.0
    scene.render.image_settings.color_depth = "8"
    render(os.path.join(OUT, f"data_{LAYOUT}{'' if LAYER == 'all' else '_' + LAYER}.png"))
