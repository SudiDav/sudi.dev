"""Build the homepage cosmos in Blender and export public/models/cosmos.glb.

Usage:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    --python tools/blender/build_cosmos.py [-- --preview out.png --blend out.blend]

Everything is generated from code so the scene can be rebuilt and reviewed.
Blender is Z-up; the glTF exporter converts to the web's Y-up, so a face that
points at -Y here points at the viewer (+Z) in Three.js.

One seamless loop is keyed on every frame: each motion completes a whole
number of cycles in LOOP_FRAMES, so the clip repeats without a seam. Node
names are the contract with components/world/world-model.ts,
components/logo-3d.ts and lib/cosmos-model.test.ts.

shortcut: the exporter's output bytes vary slightly between runs (internal
ordering), so a rebuild shows a binary diff even when nothing changed;
revisit: if model churn in review becomes a nuisance.
"""
import json
import math
import pathlib
import random
import sys

import bmesh
import bpy

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'public/models/cosmos.glb'
LOGO_OUTPUT = ROOT / 'public/models/logo.glb'
LOGO = json.loads(pathlib.Path(__file__).with_name('logo-mark.json').read_text())
FPS = 12
LOOP_FRAMES = 48 * FPS
TAU = math.tau
LOGO_TALL = 2.2  # height of the S at the centre; world-model.ts anchors its label to the base
SECTORS = {
    # id: (colour, body radius)
    'emotion': ('#E86A92', 0.24),
    'energy': ('#F2A541', 0.2),
    'vibration': ('#8B6CEF', 0.27),
    'frequency': ('#3FC1C9', 0.22),
    'reality': ('#7C9BE0', 0.3),
}


def srgb(hex_colour):
    value = [int(hex_colour[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in value] + [1]


def material(name, colour, metallic=0.0, roughness=0.4, emission=0.0):
    mat = bpy.data.materials.new(name)
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = srgb(colour)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = srgb(colour)
        bsdf.inputs['Emission Strength'].default_value = emission
    return mat


def empty(name, parent=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = location
    return obj


def mesh_object(name, mesh, parent=None, mat=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = location
    if mat:
        mesh.materials.append(mat)
    return obj


def chrome_edges(piece):
    """Smooth shading with hardened bevel normals: crisp faces, glossy rounded edges."""
    smooth_primitive(piece)
    piece.modifiers['Bevel'].harden_normals = True
    return piece


def slab(name, outline, depth, bevel, segments=2):
    """A flat outline in the XZ plane, given thickness along Y with rounded edges."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bm.faces.new([bm.verts.new((u, 0, v)) for u, v in outline])
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    obj = mesh_object(name, mesh)
    solidify = obj.modifiers.new('Solidify', 'SOLIDIFY')
    solidify.thickness = depth
    solidify.offset = 0
    rounded = obj.modifiers.new('Bevel', 'BEVEL')
    rounded.width = bevel
    rounded.segments = segments
    rounded.limit_method = 'ANGLE'
    rounded.angle_limit = math.radians(40)
    return obj


def smooth_primitive(obj):
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def sphere(name, radius, parent, mat, location=(0, 0, 0), segments=(32, 16)):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments[0], v_segments=segments[1], radius=radius)
    bm.to_mesh(mesh)
    bm.free()
    return smooth_primitive(mesh_object(name, mesh, parent, mat, location))


def torus(name, major, minor, parent, mat, rotation=(0, 0, 0), segments=96, sides=8):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    ring_verts = []
    for i in range(segments):
        a = i / segments * TAU
        ring = []
        for j in range(sides):
            b = j / sides * TAU
            r = major + minor * math.cos(b)
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), minor * math.sin(b))))
        ring_verts.append(ring)
    for i in range(segments):
        for j in range(sides):
            a, b = ring_verts[i], ring_verts[(i + 1) % segments]
            bm.faces.new((a[j], b[j], b[(j + 1) % sides], a[(j + 1) % sides]))
    bm.to_mesh(mesh)
    bm.free()
    obj = smooth_primitive(mesh_object(name, mesh, parent, mat))
    obj.rotation_euler = rotation
    return obj


def points(name, coordinates, parent=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(coordinates, [], [])
    return mesh_object(name, mesh, parent)


def key_every_frame(obj, path, value_at):
    """Key `path` on every frame of the loop from value_at(phase), phase in [0, 1]."""
    for frame in range(LOOP_FRAMES + 1):
        setattr(obj, path, value_at(frame / LOOP_FRAMES))
        obj.keyframe_insert(path, frame=frame)


def spin(obj, axis, turns, base=(0, 0, 0)):
    def at(phase):
        rotation = list(base)
        rotation[axis] += turns * TAU * phase
        return rotation
    key_every_frame(obj, 'rotation_euler', at)


def arc(cx, cy, radius, start, end, steps):
    return [(cx + radius * math.cos(start + (end - start) * i / steps),
             cy + radius * math.sin(start + (end - start) * i / steps)) for i in range(steps)]


def build_yin_yang(mats):
    radius, depth = 2.15, 0.3
    root = empty('YinYang')
    turning = empty('YinYangSpin', root)
    spin(turning, 1, 2)  # two full turns around the face normal per loop
    # One half: the big left arc down, then the S back up through the centre.
    outline = (arc(0, 0, radius, TAU / 4, TAU * 3 / 4, 64)
               + arc(0, -radius / 2, radius / 2, -TAU / 4, TAU / 4, 32)
               + arc(0, radius / 2, radius / 2, -TAU / 4, -TAU * 3 / 4, 32))
    for name, rotation, seed_colour, direction in (('Yin', 0, 'Yang', -1), ('Yang', math.pi, 'Yin', 1)):
        half = slab(name, outline, depth, 0.05)
        half.parent = turning
        half.rotation_euler = (0, rotation, 0)
        half.data.materials.append(mats[name])
        # The halves breathe apart along the face normal four times per loop.
        key_every_frame(half, 'location', lambda p, d=direction: (0, d * 0.22 * math.sin(p * 4 * math.pi) ** 2, 0))
        seed = sphere(f'Seed{seed_colour}', 0.27, half, mats[seed_colour], (0, 0, -radius / 2))
        key_every_frame(seed, 'scale', lambda p: [1 + 0.18 * math.sin(p * 12 * TAU) ** 2] * 3)
    torus('YinYangRim', radius + 0.11, 0.03, turning, mats['Accent'], (math.pi / 2, 0, 0))
    return root


def build_logo(mats):
    """The S stands at the centre beneath the symbol, swaying to show its depth."""
    width, height = LOGO['size']
    scale = LOGO_TALL / height
    root = empty('Logo')
    turning = empty('LogoSpin', root)
    # A sway rather than a full turn, so it always reads as an S: four a loop.
    key_every_frame(turning, 'rotation_euler', lambda p: (0, 0, 0.55 * math.sin(p * 4 * TAU)))
    for name, part in zip(('LogoTop', 'LogoBottom'), LOGO['parts']):
        outline = [((x - width / 2) * scale, -(y - height / 2) * scale) for x, y in part]
        # Deep, softly rounded edges catch the light like a modern chrome mark.
        piece = chrome_edges(slab(name, outline, 0.34, 0.07, 6))
        piece.parent = turning
        piece.data.materials.append(mats['Logo'])
    return root


def export_logo_mark(mats):
    """A small, deeper-cut logo on its own for the menu bar, so other pages skip the cosmos."""
    width, height = LOGO['size']
    scale = 1.0 / height
    collection = bpy.data.collections.new('HeaderLogo')
    bpy.context.scene.collection.children.link(collection)
    bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection.children['HeaderLogo']
    root = empty('LogoMark')
    for name, part in zip(('MarkTop', 'MarkBottom'), LOGO['parts']):
        outline = [((x - width / 2) * scale, -(y - height / 2) * scale) for x, y in part]
        piece = chrome_edges(slab(name, outline, 0.24, 0.045, 5))
        piece.parent = root
        piece.data.materials.append(mats['Logo'])
    bpy.ops.export_scene.gltf(
        filepath=str(LOGO_OUTPUT), export_format='GLB', export_apply=True, export_animations=False,
        use_active_collection=True, export_cameras=False, export_lights=False, export_yup=True,
    )
    print(f'exported {LOGO_OUTPUT.relative_to(ROOT)} ({LOGO_OUTPUT.stat().st_size // 1024} KB)')
    for obj in list(collection.objects):
        bpy.data.objects.remove(obj)
    bpy.data.collections.remove(collection)


def build_planets():
    for sector, (colour, radius) in SECTORS.items():
        root = empty(f'Planet_{sector}')
        sphere(f'{sector}_Body', radius, root, material(f'Planet_{sector}', colour, 0.15, 0.45, 0.35))


def build_universe():
    rng = random.Random(7)
    arm = []
    for _ in range(3400):
        t = rng.random() ** 0.8
        radius = 6 + t * 22
        angle = t * 3.4 + rng.gauss(0, 0.16 + 0.1 * t)
        arm.append((radius + rng.gauss(0, 0.5), angle, rng.gauss(0, 0.15 + 0.3 * t)))
    # Four identical arms make the galaxy symmetric under a quarter turn, so a
    # quarter turn per loop repeats seamlessly.
    coordinates = [(r * math.cos(a + k * TAU / 4), r * math.sin(a + k * TAU / 4), h)
                   for k in range(4) for r, a, h in arm]
    # A dense bulge of old stars around the centre.
    for _ in range(2400):
        r = 4.5 + abs(rng.gauss(0, 3.2))
        a = rng.uniform(0, TAU)
        coordinates.append((r * math.cos(a), r * math.sin(a), rng.gauss(0, 0.35)))
    galaxy = points('Galaxy', coordinates)
    galaxy.location = (0, 0, -0.6)
    spin(galaxy, 2, 0.25)
    shell = []
    for _ in range(2600):
        z = rng.uniform(-1, 1)
        a = rng.uniform(0, TAU)
        r = rng.uniform(30, 52)
        shell.append((r * math.sqrt(1 - z * z) * math.cos(a), r * math.sqrt(1 - z * z) * math.sin(a), r * z))
    points('Starfield', shell)
    # Small two-armed galaxies far behind the scene, spread across the website
    # camera's view (it sits at (10, -12, 10) looking at the centre), each
    # tilted its own way.
    look = (-10 / 18.5, 12 / 18.5, -10 / 18.5)
    right = (look[1], -look[0], 0)
    norm = math.hypot(*right)
    right = (right[0] / norm, right[1] / norm, 0)
    up = (right[1] * look[2], -right[0] * look[2], right[0] * look[1] - right[1] * look[0])
    far = []
    for u, v in ((-19, 9), (-8, 13), (9, 12), (20, 4), (-18, -6), (19, -8), (8, -14), (-7, -14)):
        depth = rng.uniform(30, 40)
        centre = [look[k] * depth + right[k] * (u + rng.gauss(0, 1.5)) + up[k] * (v + rng.gauss(0, 1.5)) for k in range(3)]
        tilt, turn, size = rng.uniform(0.3, 1.1), rng.uniform(0, TAU), rng.uniform(2.0, 3.2)
        for i in range(700):
            t = rng.random() ** 0.7
            a = t * 4 + (i % 2) * math.pi + rng.gauss(0, 0.2 + 0.25 * t)
            x, y, h = size * t * math.cos(a), size * t * math.sin(a), rng.gauss(0, 0.08)
            y, h = y * math.cos(tilt) - h * math.sin(tilt), y * math.sin(tilt) + h * math.cos(tilt)
            x, y = x * math.cos(turn) - y * math.sin(turn), x * math.sin(turn) + y * math.cos(turn)
            far.append((centre[0] + x, centre[1] + y, centre[2] + h))
    points('FarGalaxies', far)


def render_stars(mat, names=('Galaxy', 'Starfield', 'FarGalaxies'), radius=0.035):
    """Point clouds don't render in Blender; instance tiny spheres on them for preview only."""
    tree = bpy.data.node_groups.new('StarPoints', 'GeometryNodeTree')
    tree.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    tree.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    nodes, links = tree.nodes, tree.links
    source, result = nodes.new('NodeGroupInput'), nodes.new('NodeGroupOutput')
    to_points = nodes.new('GeometryNodeMeshToPoints')
    to_points.inputs['Radius'].default_value = radius
    shade = nodes.new('GeometryNodeSetMaterial')
    shade.inputs['Material'].default_value = mat
    links.new(source.outputs[0], to_points.inputs['Mesh'])
    links.new(to_points.outputs[0], shade.inputs['Geometry'])
    links.new(shade.outputs[0], result.inputs[0])
    for name in names:
        bpy.data.objects[name].modifiers.new('StarPoints', 'NODES').node_group = tree


def stage():
    """Camera, lights and layout matching the website, for renders and the .blend."""
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x, scene.render.resolution_y = 1280, 800
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new('Space')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = srgb('#0B0B11')
    camera = bpy.data.objects.new('PreviewCamera', bpy.data.cameras.new('PreviewCamera'))
    scene.collection.objects.link(camera)
    camera.location = (10, -12, 10)
    track = camera.constraints.new('TRACK_TO')
    track.target = bpy.data.objects['YinYang']
    scene.camera = camera
    for name, energy, location in (('Key', 4, (-5, -8, 12)), ('Rim', 6, (4, 8, 6))):
        light = bpy.data.objects.new(name, bpy.data.lights.new(name, 'SUN'))
        light.data.energy = energy
        light.location = location
        light.constraints.new('TRACK_TO').target = bpy.data.objects['YinYang']
        scene.collection.objects.link(light)
    bpy.data.objects['YinYang'].location = (0, 0, 2.3)
    bpy.data.objects['Logo'].location = (0, 0, 0.1)
    for sector, (x, z) in zip(SECTORS, ((-4, 0.5), (-4.1, -2.8), (2.5, -3.6), (4, 0.5), (0, 4.3))):
        bpy.data.objects[f'Planet_{sector}'].location = (x, -z, 0.7)
    camera.data.lens = 30
    render_stars(bpy.data.materials['Glow'])
    scene.frame_set(LOOP_FRAMES // 7)


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.frame_start, scene.frame_end = 0, LOOP_FRAMES
    mats = {
        'Yin': material('Yin', '#13131B', 0.55, 0.22),
        'Yang': material('Yang', '#EDEDF0', 0.1, 0.28),
        'Accent': material('Accent', '#607EBC', 0.8, 0.25, 0.4),
        'Glow': material('Glow', '#B9CBF2', 0, 0.5, 3),
        'Logo': material('Logo', '#607EBC', 0.85, 0.18, 0.25),
    }
    build_yin_yang(mats)
    build_logo(mats)
    build_planets()
    build_universe()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT), export_format='GLB', export_apply=True,
        export_animations=True, export_animation_mode='ACTIVE_ACTIONS',
        export_force_sampling=True, export_frame_step=1, export_optimize_animation_size=False,
        use_mesh_vertices=True, export_cameras=False, export_lights=False, export_yup=True,
    )
    print(f'exported {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size // 1024} KB)')
    export_logo_mark(mats)
    # Staging happens after export so the preview camera, lights and star
    # instancing never reach the website's model.
    if '--preview' in args or '--blend' in args:
        stage()
    if '--preview' in args:
        render(args[args.index('--preview') + 1])
    if '--blend' in args:
        bpy.ops.wm.save_as_mainfile(filepath=args[args.index('--blend') + 1])


if __name__ == '__main__':
    main()
