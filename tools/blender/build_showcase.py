"""Build the homepage featured-projects showcase and export public/models/showcase.glb.

Usage:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    --python tools/blender/build_showcase.py [-- --preview out.png --blend out.blend]

Three monoliths, one per featured project: a hexagonal pedestal with an
energy ring, a beam of light, a floating holographic screen (its material
`Screen_<i>` receives the project's cover on the web), orbit rings, a crystal
and a helix of motes. Energy pulses run along conduits between pedestals.
Everything loops seamlessly over LOOP_FRAMES, keyed on every frame and
exported at every second frame (6 samples a second is smooth for these slow
motions and halves the file).

Node names are the contract with components/project-showcase/showcase-engine.ts
and lib/cosmos-model.test.ts.
"""
import math
import pathlib
import sys

import bmesh
import bpy

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from build_cosmos import (  # noqa: E402  (path set up above)
    FPS, LOGO, LOOP_FRAMES, ROOT, TAU, empty, key_every_frame, material, mesh_object, points,
    render_stars, slab, smooth_primitive, sphere, spin, srgb, torus,
)

OUTPUT = ROOT / 'public/models/showcase.glb'
COUNT = 3
SPACING = 3.4
SCREEN = (1.76, 0.99)
SPARK = (12, 8)  # tiny glowing spheres need few faces


def rounded_rect(width, height, radius, steps=8):
    corners = ((width / 2 - radius, height / 2 - radius, 0), (-width / 2 + radius, height / 2 - radius, 1),
               (-width / 2 + radius, -height / 2 + radius, 2), (width / 2 - radius, -height / 2 + radius, 3))
    outline = []
    for cx, cy, quarter in corners:
        for i in range(steps + 1):
            a = (quarter + i / steps) * TAU / 4
            outline.append((cx + radius * math.cos(a), cy + radius * math.sin(a)))
    return outline


def prism(name, radius_bottom, radius_top, depth, parent, mat, z):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=radius_bottom, radius2=radius_top, depth=depth)
    bm.to_mesh(mesh)
    bm.free()
    obj = mesh_object(name, mesh, parent, mat, (0, 0, z))
    bevel = obj.modifiers.new('Bevel', 'BEVEL')
    bevel.width = 0.03
    bevel.segments = 2
    return obj


def screen_plane(name, parent, mat):
    """A UV-mapped 16:9 plane facing the viewer (-Y), for the project's cover."""
    w, h = SCREEN
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([(-w / 2, 0, -h / 2), (w / 2, 0, -h / 2), (w / 2, 0, h / 2), (-w / 2, 0, h / 2)], [], [(0, 1, 2, 3)])
    uv = mesh.uv_layers.new(name='UVMap')
    for loop, coords in zip(mesh.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        uv.data[loop.index].uv = coords
    return mesh_object(name, mesh, parent, mat, (0, -0.05, 0))


def crystal(name, parent, mat, z):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.17)
    bm.to_mesh(mesh)
    bm.free()
    obj = mesh_object(name, mesh, parent, mat, (0, 0, z))
    obj.scale = (1, 1, 1.6)
    return obj


def beam(name, parent, mat):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=24, radius1=0.08, radius2=0.42, depth=1.25)
    bm.to_mesh(mesh)
    bm.free()
    return smooth_primitive(mesh_object(name, mesh, parent, mat, (0, 0, 0.95)))


def build_monolith(index, mats):
    phase = index / COUNT
    root = empty(f'Monolith_{index}', location=((index - (COUNT - 1) / 2) * SPACING, 0, 0))
    prism(f'Pedestal_{index}', 0.95, 0.82, 0.32, root, mats['Pedestal'], 0.16)
    prism(f'PedestalTop_{index}', 0.66, 0.6, 0.1, root, mats['Pedestal'], 0.37)
    ring = torus(f'EnergyRing_{index}', 0.8, 0.026, root, mats['Energy'], segments=64, sides=6)
    ring.location.z = 0.34
    key_every_frame(ring, 'scale', lambda p, o=phase: [1 + 0.06 * math.sin((p * 8 + o) * TAU)] * 3)
    beam(f'Beam_{index}', root, mats['Beam'])

    hover = empty(f'Hover_{index}', root, (0, 0, 2.05))
    key_every_frame(hover, 'location', lambda p, o=phase: (0, 0, 2.05 + 0.09 * math.sin((p * 6 + o) * TAU)))
    key_every_frame(hover, 'rotation_euler', lambda p, o=phase: (0, 0, 0.12 * math.sin((p * 3 + o) * TAU)))
    frame = slab(f'Frame_{index}', rounded_rect(SCREEN[0] + 0.16, SCREEN[1] + 0.16, 0.1), 0.07, 0.02)
    frame.parent = hover
    frame.data.materials.append(mats['Frame'])
    screen_plane(f'Screen_{index}', hover, material(f'Screen_{index}', '#0B0B11', 0, 0.6, 0.2))
    for layer, (major, tilt, turns) in enumerate(((1.25, 0.5, 3), (1.4, -0.9, -2))):
        gimbal = empty(f'Gimbal_{index}_{layer}', hover)
        gimbal.rotation_euler = (math.pi / 2 + tilt, tilt * 0.6, 0)
        orbit = torus(f'Orbit_{index}_{layer}', major, 0.011, gimbal, mats['Frame'], segments=64, sides=5)
        spin(orbit, 2, turns + index)
        sphere(f'Satellite_{index}_{layer}', 0.05, orbit, mats['Glow'], (major, 0, 0), SPARK)

    gem = crystal(f'Crystal_{index}', root, mats['Crystal'], 3.25)
    key_every_frame(gem, 'rotation_euler', lambda p, i=index: (0, 0, p * TAU * (4 + i)))
    key_every_frame(gem, 'location', lambda p, o=phase: (0, 0, 3.25 + 0.12 * math.sin((p * 6 + o + 0.25) * TAU)))

    helix = [(0.42 * math.cos(t * TAU * 3), 0.42 * math.sin(t * TAU * 3), 0.45 + t * 1.25) for t in (i / 90 for i in range(90))]
    motes = points(f'Motes_{index}', helix, root)
    spin(motes, 2, 8 if index % 2 == 0 else -8)


def build_conduits(mats):
    """Energy pulses run from pedestal to pedestal, hidden inside them as they wrap."""
    start, end = -(COUNT - 1) / 2 * SPACING, (COUNT - 1) / 2 * SPACING
    mesh = bpy.data.meshes.new('Conduit')
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.022, radius2=0.022, depth=end - start)
    bm.to_mesh(mesh)
    bm.free()
    conduit = mesh_object('Conduit', mesh, None, mats['Frame'], (0, 0, 0.12))
    conduit.rotation_euler = (0, math.pi / 2, 0)
    for k in range(4):
        pulse = sphere(f'Pulse_{k}', 0.07, None, mats['Glow'], segments=SPARK)
        travel = (lambda p, k=k: (p * 12 + k / 4) % 1) if k % 2 == 0 else (lambda p, k=k: 1 - (p * 12 + k / 4) % 1)
        key_every_frame(pulse, 'location', lambda p, t=travel: (start + (end - start) * t(p), 0, 0.12))
        # Shrink to nothing at the ends, so the jump back to the start is never seen.
        key_every_frame(pulse, 'scale', lambda p, t=travel: [max(math.sin(math.pi * t(p)), 0) ** 0.5] * 3)


def build_crown(mats):
    """The S logo crowning the trio: thick, metallic, turning to show its depth."""
    width, height = LOGO['size']
    scale = 2.3 / height
    root = empty('Crown', location=(0, 2.6, 4.25))
    turning = empty('CrownSpin', root)
    key_every_frame(turning, 'rotation_euler', lambda p: (0.12 * math.sin(p * 2 * TAU), 0, 0.75 * math.sin(p * 3 * TAU)))
    for name, part, direction in zip(('CrownTop', 'CrownBottom'), LOGO['parts'], (1, -1)):
        outline = [((x - width / 2) * scale, -(y - height / 2) * scale) for x, y in part]
        piece = slab(name, outline, 0.36, 0.045)
        piece.parent = turning
        piece.data.materials.append(mats['Logo'])
        # The halves part along the S's diagonal and click back together, six times a loop.
        key_every_frame(piece, 'location', lambda p, d=direction: (
            -d * 0.16 * math.sin(p * 6 * math.pi) ** 2, d * 0.1 * math.sin(p * 6 * math.pi) ** 2, d * 0.12 * math.sin(p * 6 * math.pi) ** 2))
    halo = torus('CrownHalo', 1.55, 0.02, root, mats['Energy'], (math.pi / 2, 0, 0), segments=72, sides=6)
    key_every_frame(halo, 'scale', lambda p: [1 + 0.04 * math.sin(p * 12 * TAU)] * 3)
    for index, (major, tilt, turns) in enumerate(((1.8, 0.45, 2), (2.0, -0.6, -3))):
        gimbal = empty(f'CrownGyro{index}', root)
        gimbal.rotation_euler = (math.pi / 2 + tilt, 0, tilt)
        ring = torus(f'CrownRing{index}', major, 0.012, gimbal, mats['Frame'], segments=64, sides=5)
        spin(ring, 2, turns)
        sphere(f'CrownSpark{index}', 0.06, ring, mats['Glow'], (major, 0, 0), SPARK)


def stage(path_png, path_blend):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x, scene.render.resolution_y = 1400, 640
    scene.world = bpy.data.worlds.new('Space')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = srgb('#0B0B11')
    camera = bpy.data.objects.new('PreviewCamera', bpy.data.cameras.new('PreviewCamera'))
    scene.collection.objects.link(camera)
    camera.location = (0, -11.5, 4.2)
    camera.rotation_euler = (math.radians(83), 0, 0)
    camera.data.lens = 32
    scene.camera = camera
    for name, energy, rotation in (('Key', 3, (0.8, 0.2, -0.6)), ('Rim', 4, (-0.9, 0, 2.6))):
        light = bpy.data.objects.new(name, bpy.data.lights.new(name, 'SUN'))
        light.data.energy = energy
        light.rotation_euler = rotation
        scene.collection.objects.link(light)
    render_stars(bpy.data.materials['Glow'], [f'Motes_{i}' for i in range(COUNT)], 0.02)
    scene.frame_set(LOOP_FRAMES // 5)
    if path_png:
        scene.render.filepath = path_png
        bpy.ops.render.render(write_still=True)
    if path_blend:
        bpy.ops.wm.save_as_mainfile(filepath=path_blend)


def main():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.frame_start, scene.frame_end = 0, LOOP_FRAMES
    beam_mat = material('Beam', '#7C9BE0', 0, 0.3, 2.5)
    beam_mat.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.16
    beam_mat.surface_render_method = 'BLENDED'
    mats = {
        'Pedestal': material('Pedestal', '#15151F', 0.65, 0.28),
        'Energy': material('Energy', '#607EBC', 0.2, 0.3, 4),
        'Frame': material('Frame', '#607EBC', 0.85, 0.2, 0.3),
        'Glow': material('Glow', '#B9CBF2', 0, 0.5, 3),
        'Crystal': material('Crystal', '#9DB4F0', 0.3, 0.1, 1.5),
        'Beam': beam_mat,
        'Logo': material('Logo', '#607EBC', 0.9, 0.22, 0.15),
    }
    for index in range(COUNT):
        build_monolith(index, mats)
    build_conduits(mats)
    build_crown(mats)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT), export_format='GLB', export_apply=True,
        export_animations=True, export_animation_mode='ACTIVE_ACTIONS',
        export_force_sampling=True, export_frame_step=2, export_optimize_animation_size=False,
        use_mesh_vertices=True, export_cameras=False, export_lights=False, export_yup=True,
    )
    print(f'exported {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size // 1024} KB)')
    png = args[args.index('--preview') + 1] if '--preview' in args else None
    blend = args[args.index('--blend') + 1] if '--blend' in args else None
    if png or blend:
        stage(png, blend)


if __name__ == '__main__':
    main()
