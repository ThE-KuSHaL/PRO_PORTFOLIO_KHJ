"""The Skills-section brain at three triangle budgets, one per quality profile.
  blender -b --factory-startup --python export_brain_lod.py -- <out dir>

Keeps what the site's shader needs: UVs (the circuit routing is drawn in UV space) and one mesh per
region, named so processBrainGeometry.ts can classify it. Drops the texture the site never uses.
Public files are served `immutable`: give them a new name if these ever change after a deploy.
"""
import bpy, os, sys

out = os.path.abspath(sys.argv[sys.argv.index("--") + 1])
src = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "models", "Brain_port.glb"))

REGIONS = ("brainstem", "cerebellum", "frontal", "occipital", "parietal", "temporal")


def region_of(obj):
    names, node = [], obj
    while node:
        names.append(node.name.lower())
        node = node.parent
    joined = " ".join(names)
    for region in REGIONS:
        if region in joined:
            return region
    return None


def triangles(mesh):
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


for profile, ratio in (("full", 1.0), ("balanced", 0.4), ("lite", 0.14)):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src, merge_vertices=True)   # welded, so decimating can't crack UV seams

    found = [(o, region_of(o)) for o in bpy.data.objects if o.type == "MESH"]
    keep = []
    for obj, region in found:
        if region is None:
            continue
        world = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = world
        keep.append((obj, region))
    for obj in [o for o in bpy.data.objects if o not in [k for k, _ in keep]]:
        bpy.data.objects.remove(obj)

    total = 0
    for obj, region in keep:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        if ratio < 1.0:
            mod = obj.modifiers.new("dec", "DECIMATE")
            mod.ratio = ratio
            bpy.ops.object.modifier_apply(modifier="dec")
        obj.data.materials.clear()
        for p in obj.data.polygons:
            p.use_smooth = True
        obj.name = region
        obj.data.name = region
        total += triangles(obj.data)

    path = os.path.join(out, f"brain_{profile}.glb")
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=False,
        export_materials="NONE", export_texcoords=True, export_normals=True, export_attributes=False,
        export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
        export_draco_position_quantization=14, export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=14)
    print("LOD", profile, total, "tris", os.path.getsize(path) // 1024, "KB", sorted(r for _, r in keep))
