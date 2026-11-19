"""Render the Blog reading desk and About portrait studio backdrops."""

from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "images"


def material(name, color, roughness=0.7, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def cube(name, location, scale, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("Soft furniture edges", "BEVEL")
        mod.width = bevel
        mod.segments = 3
        obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
    return obj


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


def area(name, location, target, power, color, size, shape="DISK", size_y=None):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.color = color
    data.shape = shape
    data.size = size
    if size_y is not None and shape == "RECTANGLE":
        data.size_y = size_y
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    aim(obj, target)


def sun(name, location, target, power, color, angle=0.08):
    data = bpy.data.lights.new(name, "SUN")
    data.energy = power
    data.color = color
    data.angle = angle
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    aim(obj, target)


def scene_base(name, wall, floor, output):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    s.cycles.samples = 24
    s.cycles.use_denoising = True
    s.render.resolution_x = 1600
    s.render.resolution_y = 1000
    s.render.resolution_percentage = 100
    s.render.image_settings.file_format = "WEBP"
    s.render.image_settings.quality = 88
    s.render.filepath = str(output)
    s.world.color = (0.08, 0.08, 0.08)
    s.view_settings.view_transform = "AgX"
    s.view_settings.look = "AgX - Medium High Contrast"
    ground = material(f"{name} limestone", floor, 0.8)
    wall_mat = material(f"{name} wall", wall, 0.85)
    cube("Continuous stone floor", (0, 1.0, -0.17), (14, 13, 0.3), ground, 0.04)
    cube("Quiet architectural wall", (0, 3.1, 4.25), (14, 0.3, 8.5), wall_mat, 0.06)
    camera_data = bpy.data.cameras.new(f"{name} wide camera")
    camera = bpy.data.objects.new(f"{name} wide camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0, -13.8, 6.6)
    aim(camera, (0, 0.9, 2.35))
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 12.4
    s.camera = camera
    area("Soft window daylight", (-5.5, -4.0, 7.4), (0, 1, 2.1), 680, (1.0, 0.82, 0.63), 3.5, "RECTANGLE", 4)
    area("Warm room bounce", (5.0, -1.0, 6.3), (0, 2.5, 2.5), 370, (1.0, 0.72, 0.49), 4)
    area("Ceiling softbox", (0, 1.0, 7.6), (0, 0, 0.8), 210, (1.0, 0.91, 0.78), 5)
    sun("Late afternoon shaft", (-7.0, -7.0, 9.5), (0, 1.7, 1.5), 1.25, (1.0, 0.78, 0.54), 0.09)


def make_reading_desk():
    out = OUT / "reading-desk-room.webp"
    scene_base("Reading desk", (0.035, 0.06, 0.12), (0.16, 0.14, 0.12), out)
    navy = material("Ink blue alcove", (0.025, 0.048, 0.10), 0.9)
    walnut = material("Oiled walnut", (0.22, 0.105, 0.052), 0.32)
    walnut_bsdf = walnut.node_tree.nodes.get("Principled BSDF")
    grain = walnut.node_tree.nodes.new("ShaderNodeTexNoise")
    grain.inputs["Scale"].default_value = 3.2
    grain.inputs["Detail"].default_value = 2.4
    grain.inputs["Roughness"].default_value = 0.72
    ramp = walnut.node_tree.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.22
    ramp.color_ramp.elements[0].color = (0.105, 0.045, 0.02, 1)
    ramp.color_ramp.elements[1].position = 0.82
    ramp.color_ramp.elements[1].color = (0.31, 0.15, 0.065, 1)
    walnut.node_tree.links.new(grain.outputs["Fac"], ramp.inputs["Fac"])
    walnut.node_tree.links.new(ramp.outputs["Color"], walnut_bsdf.inputs["Base Color"])
    walnut_edge = material("Walnut edge", (0.10, 0.042, 0.024), 0.45)
    brass = material("Brushed brass", (0.58, 0.39, 0.16), 0.28, 0.72)
    paper = material("Warm paper", (0.82, 0.75, 0.59), 0.8)
    cloths = [
        material("Book cloth " + str(i), c, 0.82)
        for i, c in enumerate(((0.13, 0.18, 0.28), (0.26, 0.18, 0.12), (0.14, 0.22, 0.20), (0.35, 0.22, 0.16)))
    ]
    cube("Inset ink-blue reading alcove", (0, 2.88, 4.45), (12.9, 0.12, 7.4), navy, 0.08)

    # A simple brass-edged bookcase brings depth to the left of the desk.
    cube("Bookcase left stile", (-5.15, 2.35, 3.3), (0.16, 0.62, 5.2), walnut_edge, 0.025)
    cube("Bookcase right stile", (-3.1, 2.35, 3.3), (0.16, 0.62, 5.2), walnut_edge, 0.025)
    for z in (1.15, 2.65, 4.15, 5.65):
        cube("Floating walnut shelf", (-4.12, 2.34, z), (2.16, 0.78, 0.13), walnut, 0.035)
        cube("Fine brass shelf reveal", (-4.12, 1.91, z - 0.045), (2.0, 0.018, 0.018), brass, 0.008)
    for row, z in enumerate((1.75, 3.25, 4.75)):
        x = -4.95
        for i in range(7):
            w = (0.17, 0.22, 0.26, 0.19)[(i + row) % 4]
            h = (0.74, 0.88, 0.96, 0.81, 0.91, 0.72, 0.86)[(i + row) % 7]
            book = cube("Clothbound volume", (x + w / 2, 1.98, z + h / 2), (w, 0.32, h), cloths[(i + row) % len(cloths)], 0.025)
            book.rotation_euler[1] = (i % 3 - 1) * 0.035
            x += w + 0.045

    # Window light is represented by a tall inset opening and warm oak sill.
    glass = material("Blue grey window glass", (0.24, 0.37, 0.49), 0.2, 0.25)
    cube("Tall window opening", (-5.95, 2.82, 5.0), (0.96, 0.07, 3.7), glass, 0.03)
    for x in (-6.45, -5.47):
        cube("Window mullion", (x, 2.72, 5.0), (0.035, 0.14, 3.9), paper, 0.008)
    for z in (3.05, 5.0, 6.92):
        cube("Window mullion", (-5.96, 2.72, z), (1.0, 0.14, 0.035), paper, 0.008)

    # Broad desk and pedestal fill the foreground while leaving room for the live HTML book.
    cube("Wide walnut reading desk", (0.3, -1.42, 1.16), (11.5, 3.2, 0.25), walnut, 0.12)
    cube("Front brass inlay", (0.3, -3.04, 1.12), (11.15, 0.025, 0.025), brass, 0.01)
    cube("Left desk pedestal", (-4.25, -1.35, 0.5), (1.12, 2.25, 1.1), walnut_edge, 0.09)
    cube("Right desk pedestal", (4.8, -1.35, 0.5), (1.12, 2.25, 1.1), walnut_edge, 0.09)
    for i in range(3):
        # A compact, aligned stack keeps the desk believable at the room's wide crop.
        x, y, base = 2.65, -1.1, 1.30 + i * 0.18
        pages = cube("Stacked ivory pages", (x, y, base + 0.065), (1.78, 0.88, 0.13), paper, 0.025)
        cover = cube("Stacked cloth cover", (x, y, base + 0.148), (1.84, 0.93, 0.036), cloths[(i + 1) % len(cloths)], 0.02)
        pages.rotation_euler[2] = (i - 1) * 0.015
        cover.rotation_euler[2] = (i - 1) * 0.015
    # A small desk lamp and its warm pool of light.
    cube("Lamp foot", (-3.7, -1.0, 1.35), (0.68, 0.54, 0.08), brass, 0.06)
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.035, depth=0.9, location=(-3.7, -1.0, 1.82))
    bpy.context.object.name = "Lamp stem"
    bpy.context.object.data.materials.append(brass)
    bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=0.48, radius2=0.19, depth=0.48, location=(-3.7, -1.0, 2.32))
    bpy.context.object.name = "Brass reading lamp"
    bpy.context.object.data.materials.append(brass)
    area("Lamp warm pool", (-3.7, -1.0, 2.05), (-3.0, -1.6, 1.1), 90, (1.0, 0.62, 0.32), 0.65)
    bpy.context.scene.render.image_settings.color_mode = "RGB"
    bpy.ops.render.render(write_still=True)


def make_portrait_studio():
    out = OUT / "portrait-studio-room.webp"
    scene_base("Portrait studio", (0.75, 0.70, 0.60), (0.48, 0.41, 0.32), out)
    wall = material("Warm plaster", (0.72, 0.65, 0.54), 0.9)
    inner = material("Recessed shadow", (0.34, 0.29, 0.24), 0.88)
    ledge = material("Travertine ledge", (0.78, 0.71, 0.60), 0.45)
    brass = material("Champagne brass", (0.60, 0.45, 0.27), 0.28, 0.65)
    wood = material("Oak ledge underside", (0.30, 0.18, 0.11), 0.5)
    cube("Softly lit plaster surround", (0, 2.86, 4.35), (12.9, 0.16, 7.5), wall, 0.08)

    # Architectural inset arch as a broad, shallow rounded recess with a clear portrait well.
    cube("Recess deep shadow", (3.25, 2.68, 3.52), (3.45, 0.1, 4.95), inner, 0.28)
    cube("Recess back plaster", (3.25, 2.60, 3.5), (3.06, 0.08, 4.52), wall, 0.22)
    # A bright plaster pilaster and reveal create the soft arched-window silhouette.
    cube("Left reveal", (1.38, 2.44, 3.52), (0.13, 0.2, 4.95), ledge, 0.055)
    cube("Right reveal", (5.12, 2.44, 3.52), (0.13, 0.2, 4.95), ledge, 0.055)
    cube("Upper reveal", (3.25, 2.44, 5.97), (3.85, 0.2, 0.13), ledge, 0.055)
    cube("Lower reveal", (3.25, 2.42, 1.08), (3.85, 0.22, 0.16), ledge, 0.055)
    cube("Portrait ledge", (3.25, 1.72, 0.92), (4.75, 1.18, 0.24), ledge, 0.1)
    cube("Ledge bronze shadow line", (3.25, 1.72, 0.77), (4.6, 1.0, 0.025), brass, 0.008)
    cube("Warm wood ledge underside", (3.25, 1.88, 0.56), (4.25, 0.78, 0.25), wood, 0.055)

    # Side pilasters and a high horizontal lintel make the recess read as a room, not a cutout.
    cube("Left studio return", (-4.35, 2.52, 3.6), (0.28, 0.44, 6.3), ledge, 0.08)
    cube("Right studio return", (6.15, 2.52, 3.6), (0.28, 0.44, 6.3), ledge, 0.08)
    cube("Ceiling reveal", (0.8, 2.55, 6.95), (10.8, 0.46, 0.16), ledge, 0.06)
    cube("Low wall bench", (-2.4, 1.75, 0.52), (3.15, 1.05, 0.24), ledge, 0.1)
    cube("Bench shadow reveal", (-2.4, 1.76, 0.36), (2.95, 0.86, 0.025), brass, 0.008)

    # A restrained potted olive branch softens the empty wall without crossing the portrait.
    pot = material("Ceramic planter", (0.28, 0.30, 0.25), 0.55)
    leaf = material("Olive leaves", (0.17, 0.27, 0.18), 0.68)
    bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=0.32, depth=0.55, location=(-5.2, 1.75, 0.72))
    bpy.context.object.name = "Stoneware planter"
    bpy.context.object.data.materials.append(pot)
    for i in range(9):
        start = Vector((-5.2 + (i % 3 - 1) * 0.07, 1.75, 0.98))
        end = Vector((-5.2 + (i % 3 - 1) * 0.26, 1.75, 2.15 + (i % 4) * 0.15))
        direction = end - start
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.018, depth=direction.length, location=(start + end) / 2)
        stem = bpy.context.object
        stem.name = "Olive branch"
        stem.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
        stem.data.materials.append(wood)
        for j in range(4):
            t = 0.35 + j * 0.14
            pos = start.lerp(end, t) + Vector(((-1) ** j * 0.22, 0, 0.12))
            bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.14, location=pos)
            leaf_obj = bpy.context.object
            leaf_obj.name = "Olive leaf"
            leaf_obj.scale = (1.5, 0.36, 0.48)
            leaf_obj.rotation_euler[1] = (-1) ** j * 0.45
            leaf_obj.data.materials.append(leaf)
    area("Window keylight", (-5.5, -3.5, 7.8), (2.0, 2.0, 2.5), 760, (1.0, 0.79, 0.57), 3.3, "RECTANGLE", 3.8)
    area("Cool ambient fill", (4.5, -2.5, 6.4), (2.5, 2.3, 3.0), 220, (0.76, 0.84, 1.0), 4.0)
    sun("Sun through the studio window", (-6.4, -6.5, 8.7), (1.4, 2.3, 1.4), 1.4, (1.0, 0.82, 0.61), 0.055)
    bpy.context.scene.render.image_settings.color_mode = "RGB"
    bpy.ops.render.render(write_still=True)


OUT.mkdir(parents=True, exist_ok=True)
make_reading_desk()
make_portrait_studio()
