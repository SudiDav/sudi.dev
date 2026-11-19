"""Render the Home orbit gallery room layer and its complete still.

Run with:
  /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_home_gallery.py

Append -- --blend /path/to/gallery.blend to save an editable scene.

The room art is transparent so the site theme remains visible around it. The
complete, matching stills are loaded by PortfolioWorld until the live canvas is
ready (or when WebGL is unavailable). The imported cosmos remains editable.
"""
from pathlib import Path
import argparse
import math
import sys
import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / 'public/models/cosmos.glb'
IMAGES = ROOT / 'public/images'
ROOM_OBJECTS = set()
COSMOS_OBJECTS = set()


def rgba(hex_colour):
    values = [int(hex_colour[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in values) + (1,)


def material(name, colour, metallic=0.0, roughness=0.55):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = rgba(colour)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = rgba(colour)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


def rounded_box(name, location, dimensions, mat, bevel=0.12):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    bevel_mod = obj.modifiers.new('Soft architectural edges', 'BEVEL')
    bevel_mod.width = bevel
    bevel_mod.segments = 5
    bevel_mod.harden_normals = True
    obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    ROOM_OBJECTS.add(obj.name)
    return obj


def round_plinth(name, location, radius, depth, mat, bevel=0.05, vertices=96):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    edge = obj.modifiers.new('Turned and softened edges', 'BEVEL')
    edge.width = bevel
    edge.segments = 4
    obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    ROOM_OBJECTS.add(obj.name)
    return obj


def look_at(obj, target):
    obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()


def build_room():
    wall = material('Gallery plaster · blue charcoal', '#323B49', 0.03, 0.82)
    recess = material('Alcove shadow', '#1B2636', 0.08, 0.65)
    stone = material('Honed limestone', '#A7A199', 0.12, 0.34)
    bronze = material('Brushed bronze detail', '#92764F', 0.72, 0.29)
    # Floating architectural surround. The broad rear plane gives the orbit a
    # quiet display wall; stepped trim and reveal create a real alcove depth.
    # Align the gallery's face with the fixed preview camera so the recess reads
    # as an alcove instead of a narrow, skewed board. Its back sits behind even
    # the far planets (the orbit layer remains independent and manipulable).
    rounded_box('Gallery wall', (0, 7.9, 0.7), (42, 0.45, 30), wall, 0.46)
    rounded_box('Alcove inner field', (0, 7.61, 0.75), (9.7, 0.18, 9.3), recess, 1.15)
    rounded_box('Alcove left reveal', (-5.03, 7.05, 0.8), (0.42, 1.25, 10.6), stone, 0.18)
    rounded_box('Alcove right reveal', (5.03, 7.05, 0.8), (0.42, 1.25, 10.6), stone, 0.18)
    rounded_box('Alcove crown', (0, 7.05, 5.55), (10.5, 1.25, 0.42), stone, 0.18)
    rounded_box('Bronze inset line', (0, 6.39, 5.26), (8.8, 0.035, 0.035), bronze, 0.016)
    # A continuous, quiet stone floor and a turned plinth with bronze mount.
    rounded_box('Gallery floor', (0, 6.5, -4.2), (100, 100, 0.22), stone, 0.09)
    round_plinth('Plinth lower drum', (0, 0, -3.14), 1.84, 1.9, recess, 0.12)
    round_plinth('Plinth bronze reveal', (0, 0, -2.15), 1.72, 0.09, bronze, 0.035)
    round_plinth('Plinth honed cap', (0, 0, -2.045), 1.78, 0.15, stone, 0.055)
    round_plinth('S mount', (0, 0, -1.91), 0.5, 0.12, bronze, 0.035)
    # Everything architectural follows the gallery face, but the camera and
    # cosmos keep the web camera's exact fixed pose.
    architecture = bpy.data.objects.new('Gallery architecture alignment', None)
    bpy.context.collection.objects.link(architecture)
    angle = math.atan2(10, 12)
    architecture.rotation_euler.z = angle
    rotation = Matrix.Rotation(angle, 4, 'Z')
    for name in ROOM_OBJECTS:
        obj = bpy.data.objects[name]
        world_matrix = rotation @ obj.matrix_world.copy()
        obj.parent = architecture
        obj.matrix_world = world_matrix


def setup_scene():
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'WEBP'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'
    scene.render.image_settings.quality = 88
    scene.render.resolution_percentage = 100
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'AgX'
    scene.render.resolution_x, scene.render.resolution_y = 1200, 800
    scene.world = bpy.data.worlds.new('Gallery studio')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = rgba('#202B3B')
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.14

    camera_data = bpy.data.cameras.new('Home Gallery Camera')
    camera = bpy.data.objects.new('Home Gallery Camera', camera_data)
    scene.collection.objects.link(camera)
    camera.location = (10, -12, 10)
    look_at(camera, Vector((0, 0, 0.3)))
    camera_data.type = 'PERSP'
    camera_data.lens = 36
    camera_data.sensor_fit = 'VERTICAL'
    camera_data.sensor_height = 24
    scene.camera = camera

    for name, energy, location, size, colour in (
        ('Daylight · window', 2300, (-6, -8, 10), 6.2, '#FFF2DF'),
        ('Cool gallery fill', 1450, (5, -4, 5), 5.0, '#C7D8F7'),
        ('Alcove rim', 1700, (1, 3, 8), 3.5, '#E9D3AC'),
    ):
        light_data = bpy.data.lights.new(name, 'AREA')
        light_data.energy = energy
        light_data.shape = 'DISK'
        light_data.size = size
        light_data.color = rgba(colour)[:3]
        light = bpy.data.objects.new(name, light_data)
        scene.collection.objects.link(light)
        light.location = location
        look_at(light, Vector((0, 0, 0)))
    scene.render.image_settings.file_format = 'WEBP'
    return scene


def render_variant(scene, name, mobile=False, include_cosmos=False):
    camera = scene.camera
    if mobile:
        scene.render.resolution_x, scene.render.resolution_y = 960, 1000
        camera.data.lens = 26
    else:
        scene.render.resolution_x, scene.render.resolution_y = 1200, 800
        camera.data.lens = 36
    scene.render.film_transparent = True
    for obj in bpy.data.objects:
        if obj.name in ROOM_OBJECTS or obj.name not in COSMOS_OBJECTS:
            obj.hide_render = False
        else:
            obj.hide_render = not include_cosmos
    scene.render.filepath = str(IMAGES / name)
    bpy.ops.render.render(write_still=True)


def feather_edges(path, sides=0.14, top=0.06, bottom=0.15):
    """Blend the room layer into the ink hero instead of showing a hard card edge."""
    image = bpy.data.images.load(str(IMAGES / path), check_existing=False)
    image.alpha_mode = 'STRAIGHT'
    pixels = list(image.pixels[:])
    w, h = image.size

    def ramp(distance, extent):
        t = max(0.0, min(1.0, distance / extent))
        return t * t * (3.0 - 2.0 * t)

    for y in range(h):
        vertical = min(ramp(y, h * bottom), ramp(h - 1 - y, h * top))
        for x in range(w):
            horizontal = min(ramp(x, w * sides), ramp(w - 1 - x, w * sides))
            alpha_i = (y * w + x) * 4 + 3
            pixels[alpha_i] *= horizontal * vertical
    image.pixels[:] = pixels
    image.filepath_raw = str(IMAGES / path)
    image.file_format = 'WEBP'
    image.save()
    bpy.data.images.remove(image)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend', type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    bpy.ops.wm.read_factory_settings(use_empty=True)
    IMAGES.mkdir(parents=True, exist_ok=True)
    build_room()
    scene = setup_scene()
    render_variant(scene, 'home-orbit-room-wide.webp', mobile=False)
    render_variant(scene, 'home-orbit-room-narrow.webp', mobile=True)

    bpy.ops.import_scene.gltf(filepath=str(MODELS))
    COSMOS_OBJECTS.update(obj.name for obj in bpy.data.objects if obj.name not in ROOM_OBJECTS and obj.type in {'MESH', 'CURVE', 'EMPTY'})
    # The rendered stage matches the web's resting object positions. GLB source
    # geometry/materials/animations remain untouched by this render-only file.
    positions = {
        'YinYang': (0, 0, 3.2), 'Logo': (0, 0, -0.75),
        'Planet_emotion': (-4, -0.5, 0.7), 'Planet_energy': (-5.15, 0.64, 0.7),
        'Planet_vibration': (2.5, 3.6, 0.7), 'Planet_frequency': (4, -0.5, 0.7),
        'Planet_reality': (0, -4.3, 0.7),
    }
    for name, location in positions.items():
        obj = bpy.data.objects.get(name)
        if obj is not None:
            obj.location = location
    for name in ('Galaxy', 'Starfield', 'FarGalaxies'):
        obj = bpy.data.objects.get(name)
        if obj is not None:
            obj.hide_render = True
    scene.frame_set(0)
    render_variant(scene, 'home-orbit-still-wide.webp', mobile=False, include_cosmos=True)
    render_variant(scene, 'home-orbit-still-narrow.webp', mobile=True, include_cosmos=True)
    for path in (
        'home-orbit-room-wide.webp', 'home-orbit-room-narrow.webp',
        'home-orbit-still-wide.webp', 'home-orbit-still-narrow.webp',
    ):
        feather_edges(path)
    if args.blend:
        args.blend.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(args.blend.resolve()))


if __name__ == '__main__':
    main()
