"""Render printed project-cover textures as dimensional graphite plates.

Usage:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    --python tools/blender/build_work_covers.py -- \
    --only almafrica bcash-trivia-engine

When all seven files exist under tools/blender/work-cover-art/, omit --only to
render the complete gallery. Add --blend /path/to/work-printed-covers.blend to
save all seven editable scenes with their print textures and logo assets packed.
With --blend, all seven source textures are required even when --only is used.
The script uses cwebp for export and Next's installed Sharp for SVG logo assets.
"""
import argparse
import math
import pathlib
import shutil
import subprocess
import sys
import tempfile

import bpy
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parents[2]
ART = ROOT / 'tools/blender/work-cover-art'
COMPANY_LOGOS = ROOT / 'public/images/companies'
OUT = ROOT / 'public/images/work'
WIDTH, HEIGHT = 1200, 600
PLATE_W = 9.35
PRINT_W = 9.06
PRINT_RATIO = 1100 / 640
PRINT_H = PRINT_W / PRINT_RATIO

PROJECTS = (
    'almafrica',
    'bcash-trivia-engine',
    'ist-school-management',
    'wavesops',
    'auction-car',
    'altech-paygo',
    'chequepoint',
)

# Pixel-space placements on the 1100×640 printed face. Each source is the
# official site asset; Auction Car remains intentionally unbranded.
LOGOS = {
    'almafrica': {
        'source': 'almafrica-dark.svg',
        'bounds': (57, 130, 116, 124),
        'backing': (46, 119, 138, 146, '12231A'),
    },
    'bcash-trivia-engine': {
        'source': 'khm-technology-dark.png',
        'bounds': (70, 43, 215, 83),
        'backing': (58, 35, 239, 112, '332B70'),
    },
    'ist-school-management': {
        'source': 'ist-africa-dark.png',
        'bounds': (52, 44, 134, 134),
    },
    'wavesops': {
        'source': 'waves-ressources-dark.svg',
        'bounds': (58, 151, 195, 63),
    },
    'altech-paygo': {
        'source': 'altech-group.svg',
        'bounds': (54, 52, 118, 118),
    },
    'chequepoint': {
        'source': 'fintech-international.png',
        'bounds': (720, 128, 132, 132),
    },
}


def linear_rgb(hex_color):
    value = hex_color.removeprefix('#')
    rgb = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb] + [1]


def material(name, color, metallic=0, roughness=.4):
    mat = bpy.data.materials.new(name)
    rgba = linear_rgb(color)
    mat.diffuse_color = rgba
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = rgba
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = .25
    return mat


def beveled_box(name, location, dimensions, mat, bevel, segments=6):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    edge = obj.modifiers.new('Radiused machined edge', 'BEVEL')
    edge.width = bevel
    edge.segments = segments
    obj.modifiers.new('Hardened face normals', 'WEIGHTED_NORMAL')
    return obj


def print_material(slug, image):
    mat = bpy.data.materials.new(f'{slug} • printed artwork')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    texture = nodes.new('ShaderNodeTexImage')
    texture.name = 'Full-bleed print face'
    texture.label = 'Printed cover art (packed in .blend)'
    texture.image = image
    texture.interpolation = 'Linear'
    texture.extension = 'CLIP'
    emission = nodes.new('ShaderNodeEmission')
    emission.inputs['Strength'].default_value = .92
    output = nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(texture.outputs['Color'], emission.inputs['Color'])
    mat.node_tree.links.new(emission.outputs['Emission'], output.inputs['Surface'])
    return mat


def transparent_logo_material(slug, image):
    mat = bpy.data.materials.new(f'{slug} • official company logo')
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    texture = nodes.new('ShaderNodeTexImage')
    texture.name = 'Official company logo image'
    texture.label = f'Public company asset • {image.name}'
    texture.image = image
    texture.interpolation = 'Linear'
    texture.extension = 'CLIP'
    clear = nodes.new('ShaderNodeBsdfTransparent')
    ink = nodes.new('ShaderNodeEmission')
    ink.inputs['Strength'].default_value = 1
    blend = nodes.new('ShaderNodeMixShader')
    output = nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(texture.outputs['Alpha'], blend.inputs[0])
    mat.node_tree.links.new(clear.outputs['BSDF'], blend.inputs[1])
    mat.node_tree.links.new(texture.outputs['Color'], ink.inputs['Color'])
    mat.node_tree.links.new(ink.outputs['Emission'], blend.inputs[2])
    mat.node_tree.links.new(blend.outputs['Shader'], output.inputs['Surface'])
    return mat


def flat_ink(name, hex_color):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.node_tree.nodes.clear()
    ink = mat.node_tree.nodes.new('ShaderNodeEmission')
    ink.inputs['Color'].default_value = linear_rgb(hex_color)
    output = mat.node_tree.nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(ink.outputs['Emission'], output.inputs['Surface'])
    return mat


def pixel_bounds(slug, bounds, z, aspect):
    x, y, width, height = bounds
    box_width = width / 1100 * PRINT_W
    box_height = height / 640 * PRINT_H
    world_width, world_height = box_width, box_height
    if aspect > box_width / box_height:
        world_height = box_width / aspect
    else:
        world_width = box_height * aspect
    center_x = ((x + width / 2) / 1100 - .5) * PRINT_W
    center_y = (.5 - (y + height / 2) / 640) * PRINT_H
    bpy.ops.mesh.primitive_plane_add(size=1, location=(center_x, center_y, z))
    obj = bpy.context.object
    obj.name = f'{slug} | official company logo print'
    obj.dimensions = (world_width, world_height, 0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.visible_shadow = False
    return obj


def add_logo_print(slug, logo_image):
    layout = LOGOS[slug]
    backing = layout.get('backing')
    if backing:
        x, y, width, height, color = backing
        box_width = width / 1100 * PRINT_W
        box_height = height / 640 * PRINT_H
        center_x = ((x + width / 2) / 1100 - .5) * PRINT_W
        center_y = (.5 - (y + height / 2) / 640) * PRINT_H
        badge = beveled_box(
            f'{slug} | company logo underprint', (center_x, center_y, .348),
            (box_width, box_height, .008), flat_ink(f'{slug} • logo backing ink', color), .025, 4,
        )
        badge['printed_company_logo'] = logo_image.name
        logo_z = .3545
    else:
        logo_z = .347
    decal = pixel_bounds(slug, layout['bounds'], logo_z, logo_image.size[0] / logo_image.size[1])
    decal.data.materials.append(transparent_logo_material(slug, logo_image))
    decal['company_logo_source'] = layout['source']
    decal['company_logo_asset'] = logo_image.name


def studio(scene, scene_name, image, logo_image=None):
    graphite = material(f'{scene_name} • graphite body', '171C27', .72, .3)
    satin = material(f'{scene_name} • dark satin top', '252D3C', .48, .39)
    bright_edge = material(f'{scene_name} • edge glint', '536075', .82, .24)
    catcher_mat = material(f'{scene_name} • shadow catcher', '11151D', .0, .8)

    # Layered slabs reveal a readable bevel and a narrow metal edge under the print.
    beveled_box('Graphite plate | lower edge', (0, 0, -.02), (9.56, 5.63, .48), graphite, .19)
    beveled_box('Plate | machined reveal', (0, 0, .227), (9.42, 5.49, .12), bright_edge, .14)
    beveled_box('Plate | recessed satin land', (0, 0, .292), (9.32, 5.39, .06), satin, .10)
    beveled_box('Print backing', (0, 0, .329), (PRINT_W + .035, PRINT_H + .035, .026), graphite, .018, 3)

    # A clean UV plane keeps every source corner and title intact on the top face.
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, .344))
    face = bpy.context.object
    face.name = f'{scene_name} | full-bleed printed face'
    face.dimensions = (PRINT_W, PRINT_H, 0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    face.data.materials.append(print_material(scene_name, image))
    face['print_image'] = image.name
    face['print_ratio'] = image.size[0] / image.size[1]
    if logo_image:
        add_logo_print(scene_name, logo_image)

    # Only the folio and its soft contact shadow survive the transparent render.
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.278))
    catcher = bpy.context.object
    catcher.name = 'Transparent contact shadow catcher'
    catcher.data.materials.append(catcher_mat)
    catcher.is_shadow_catcher = True

    camera_data = bpy.data.cameras.new('Gallery cover camera')
    camera = bpy.data.objects.new('Gallery cover camera', camera_data)
    scene.collection.objects.link(camera)
    camera.location = (1.2, -9.2, 12.1)
    camera.rotation_euler = (Vector((0, 0, .16)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data.type = 'PERSP'
    camera_data.lens = 47
    scene.camera = camera

    for name, location, power, size, color in (
        ('Warm broad softbox', (-4.4, -2.2, 8.8), 1150, 6.5, 'FFE4C7'),
        ('Cool edge softbox', (4.2, 3.8, 7.4), 1450, 4.5, 'A9C2FF'),
        ('Front fill card', (0, -6.0, 5.5), 420, 5.5, 'DEE7FF'),
    ):
        light = bpy.data.lights.new(name, 'AREA')
        light.energy = power
        light.shape = 'DISK'
        light.size = size
        light.color = tuple(int(color[i:i + 2], 16) / 255 for i in (0, 2, 4))
        light_obj = bpy.data.objects.new(name, light)
        scene.collection.objects.link(light_obj)
        light_obj.location = location
        light_obj.rotation_euler = (Vector((0, 0, .1)) - light_obj.location).to_track_quat('-Z', 'Y').to_euler()

    world = bpy.data.worlds.new(f'{scene_name} • dark studio')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = linear_rgb('0D1220')
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = .32
    scene.world = world
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = WIDTH, HEIGHT
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.film_transparent = True
    scene.view_settings.view_transform = 'AgX'


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blend', type=pathlib.Path, help='optional editable multi-scene .blend output')
    parser.add_argument('--only', nargs='+', choices=PROJECTS, help='render selected project covers')
    return parser.parse_args(argv)


def load_company_logos(temp_dir, slugs):
    svg_to_png = r"""
const { createRequire } = require('node:module');
const req = createRequire(require.resolve('next/package.json'));
const sharp = req('sharp');
const [source, output] = process.argv.slice(1);
sharp(source, { density: 600 }).png().toFile(output)
  .catch((error) => { console.error(error); process.exitCode = 1; });
"""
    images = {}
    for slug, layout in LOGOS.items():
        if slug not in slugs:
            continue
        source = COMPANY_LOGOS / layout['source']
        if source.suffix.lower() == '.svg':
            raster = temp_dir / f'{slug}-company-logo.png'
            subprocess.run(['node', '-e', svg_to_png, str(source), str(raster)], cwd=ROOT, check=True)
            source = raster
        image = bpy.data.images.load(str(source), check_existing=True)
        image.name = layout['source']
        image.pack()
        images[slug] = image
    return images


def main():
    args = parse_args()
    if args.blend:
        build_slugs = PROJECTS
    elif args.only:
        build_slugs = args.only
    else:
        build_slugs = PROJECTS
    missing = [slug for slug in build_slugs if not (ART / f'{slug}.webp').is_file()]
    if missing:
        raise FileNotFoundError('Missing printed artwork: ' + ', '.join(missing))
    missing_logos = [layout['source'] for slug, layout in LOGOS.items()
                     if slug in build_slugs and not (COMPANY_LOGOS / layout['source']).is_file()]
    if missing_logos:
        raise FileNotFoundError('Missing company logo assets: ' + ', '.join(missing_logos))
    encoder = shutil.which('cwebp')
    if not encoder:
        raise RuntimeError('cwebp is required to write optimized WebP covers')

    OUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    with tempfile.TemporaryDirectory(prefix='company-logo-raster-') as logo_temp:
        company_logos = load_company_logos(pathlib.Path(logo_temp), build_slugs)
    scenes = []
    for slug in build_slugs:
        source = ART / f'{slug}.webp'
        image = bpy.data.images.load(str(source), check_existing=True)
        image.pack()
        ratio = image.size[0] / image.size[1]
        if abs(ratio - PRINT_RATIO) > .01:
            raise ValueError(f'{source.name} has ratio {ratio:.4f}; expected about {PRINT_RATIO:.4f}')
        scene = bpy.data.scenes.new(slug)
        bpy.context.window.scene = scene
        studio(scene, slug, image, company_logos.get(slug))
        scenes.append((slug, scene))

    factory_scene = bpy.data.scenes.get('Scene')
    if factory_scene and not factory_scene.objects:
        bpy.data.scenes.remove(factory_scene)
    if args.blend:
        bpy.context.window.scene = bpy.data.scenes['almafrica']
        args.blend.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.file.pack_all()
        bpy.ops.wm.save_as_mainfile(filepath=str(args.blend))
        print(f'Saved editable multi-scene project to {args.blend}')

    selected = set(args.only) if args.only else set(build_slugs)
    with tempfile.TemporaryDirectory(prefix='printed-cover-renders-') as temp_dir:
        temp = pathlib.Path(temp_dir)
        for slug, scene in scenes:
            if slug not in selected:
                continue
            bpy.context.window.scene = scene
            png = temp / f'{slug}.png'
            webp = OUT / f'{slug}.webp'
            scene.render.filepath = str(png)
            bpy.ops.render.render(write_still=True, scene=scene.name)
            subprocess.run([encoder, '-quiet', '-q', '90', '-alpha_q', '100', str(png), '-o', str(webp)], check=True)
            print(f'Wrote {webp.relative_to(ROOT)} ({webp.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
