"""Brain fruit for the web: the Skills-section brain, decimated, posed as in the master render.
  blender -b --factory-startup --python export_brain_fruit.py -- <out dir>
"""
import bpy, math, os, sys
from mathutils import Matrix, Vector

out = os.path.abspath(sys.argv[sys.argv.index("--") + 1])
src = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "models", "Brain_port.glb")

for name, target in (("brain_fruit", 16000), ("brain_fruit_low", 6000)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(src))
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    helpers = [o for o in bpy.data.objects if o.type != "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw; o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    brain = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in helpers:
        bpy.data.objects.remove(o)
    me = brain.data
    vs = [v.co for v in me.vertices]
    lo = Vector([min(v[i] for v in vs) for i in range(3)]); hi = Vector([max(v[i] for v in vs) for i in range(3)])
    me.transform(Matrix.Translation(-(lo + hi) / 2))
    me.transform(Matrix.Scale(2.0 / max(hi - lo), 4))
    me.transform(Matrix.Rotation(math.radians(24), 4, "Z"))     # same pose as the render
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    mod = brain.modifiers.new("dec", "DECIMATE"); mod.ratio = min(1.0, target / tris)
    bpy.ops.object.modifier_apply(modifier="dec")
    for p in me.polygons:
        p.use_smooth = True
    me.materials.clear()
    brain.name = "brain"
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(out, name + ".glb"), export_format="GLB", use_selection=False,
        export_materials="NONE", export_texcoords=False, export_attributes=False,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
    print("BRAIN", name, sum(len(p.vertices) - 2 for p in brain.data.polygons), "tris",
          os.path.getsize(os.path.join(out, name + ".glb")) // 1024, "KB")
