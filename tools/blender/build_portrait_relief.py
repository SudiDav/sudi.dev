"""Build a small, source-bound shallow portrait surface as a textured GLB."""

from collections import deque
from hashlib import sha256
import json
import math
from pathlib import Path
import shutil
import subprocess
import tempfile

import bpy

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "public/images/sudi.jpeg"
OUTPUT = ROOT / "public/models/sudi-portrait-relief.glb"
MANIFEST = ROOT / "components/portrait-relief-manifest.json"
SWIFT = ROOT / "tools/blender/segment_portrait.swift"
FRAME_ASPECT = 0.74
TEXTURE_HEIGHT = 693
TEXTURE_WIDTH = round(TEXTURE_HEIGHT * FRAME_ASPECT)
MESH_COLUMNS = 96
MESH_ROWS = 132


def source_bound_vision_data():
    """Use local Vision where its model is available; the builder has a local matte fallback."""
    swift = shutil.which("swift")
    if not swift:
        return None
    with tempfile.TemporaryDirectory(prefix="portrait-relief-") as temporary:
        temporary = Path(temporary)
        mask_path = temporary / "person-mask.png"
        landmarks_path = temporary / "landmarks.json"
        cache_path = temporary / "module-cache"
        result = subprocess.run(
            [
                swift,
                "-module-cache-path",
                str(cache_path),
                str(SWIFT),
                str(SOURCE),
                str(mask_path),
                str(landmarks_path),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0 or not landmarks_path.exists():
            print("Vision was unavailable; deriving the matte from the real portrait background.")
            if result.stderr:
                print(result.stderr.splitlines()[-1])
            return None
        data = json.loads(landmarks_path.read_text())
        if mask_path.exists():
            data["maskBytes"] = mask_path.read_bytes()
        return data


def load_pixels(path):
    image = bpy.data.images.load(str(path), check_existing=False)
    image.colorspace_settings.name = "sRGB"
    width, height = image.size
    pixels = [0.0] * (width * height * 4)
    image.pixels.foreach_get(pixels)
    return image, width, height, pixels


def background_matte(width, height, pixels):
    """Find only border-connected near-neutral pixels, leaving bright skin intact."""
    luminance = [0.0] * (width * height)
    chroma = [0.0] * (width * height)
    for index in range(width * height):
        offset = index * 4
        r, g, b = pixels[offset : offset + 3]
        luminance[index] = r * 0.2126 + g * 0.7152 + b * 0.0722
        chroma[index] = max(r, g, b) - min(r, g, b)

    edge_values = []
    edge_values.extend(luminance[:width])
    edge_values.extend(luminance[(height - 1) * width :])
    edge_values.extend(luminance[y * width] for y in range(0, height, 3))
    edge_values.extend(luminance[y * width + width - 1] for y in range(0, height, 3))
    edge_values.sort()
    border_level = edge_values[len(edge_values) // 2]
    threshold = max(0.34, border_level - 0.105)

    candidate = bytearray(width * height)
    for index in range(width * height):
        if luminance[index] >= threshold and chroma[index] <= 0.075:
            candidate[index] = 1

    background = bytearray(width * height)
    queue = deque()
    for x in range(width):
        if candidate[x]:
            background[x] = 1
            queue.append(x)
        bottom = (height - 1) * width + x
        if candidate[bottom] and not background[bottom]:
            background[bottom] = 1
            queue.append(bottom)
    for y in range(1, height - 1):
        for index in (y * width, y * width + width - 1):
            if candidate[index] and not background[index]:
                background[index] = 1
                queue.append(index)

    while queue:
        index = queue.popleft()
        x = index % width
        for neighbor in (index - width, index + width, index - 1, index + 1):
            if neighbor < 0 or neighbor >= width * height or background[neighbor] or not candidate[neighbor]:
                continue
            if abs(x - neighbor % width) > 1:
                continue
            background[neighbor] = 1
            queue.append(neighbor)

    alpha = [0.0] * (width * height)
    for index in range(width * height):
        if background[index]:
            continue
        x = index % width
        near_edge = False
        for neighbor in (index - width, index + width, index - 1, index + 1):
            if neighbor < 0 or neighbor >= width * height or abs(x - neighbor % width) > 1:
                continue
            if background[neighbor]:
                near_edge = True
                break
        alpha[index] = 0.72 if near_edge else 1.0

    print(f"Derived subject matte from neutral border ({sum(1 for value in background if value):,} background pixels).")
    return alpha


def smoothstep(low, high, value):
    x = max(0.0, min(1.0, (value - low) / (high - low)))
    return x * x * (3.0 - 2.0 * x)


def make_portrait_texture(source_width, source_height, source_pixels, matte):
    crop_width = source_height * FRAME_ASPECT
    crop_left = (source_width - crop_width) * 0.5
    result = [0.0] * (TEXTURE_WIDTH * TEXTURE_HEIGHT * 4)
    for y in range(TEXTURE_HEIGHT):
        source_y = min(source_height - 1, max(0, round(y * (source_height - 1) / (TEXTURE_HEIGHT - 1))))
        for x in range(TEXTURE_WIDTH):
            source_x = min(source_width - 1, max(0, round(crop_left + x * (crop_width - 1) / (TEXTURE_WIDTH - 1))))
            source_index = (source_y * source_width + source_x) * 4
            target_index = (y * TEXTURE_WIDTH + x) * 4
            result[target_index : target_index + 3] = source_pixels[source_index : source_index + 3]
            result[target_index + 3] = matte[source_y * source_width + source_x]

    image = bpy.data.images.new(
        "Portrait photo relief · source bound",
        width=TEXTURE_WIDTH,
        height=TEXTURE_HEIGHT,
        alpha=True,
        float_buffer=True,
    )
    image.colorspace_settings.name = "sRGB"
    image.pixels.foreach_set(result)
    image.pack()
    return image, crop_left / source_width, crop_width / source_width


def build_depth_mesh(source_width, source_height, crop_left, crop_ratio, source_pixels, matte, face):
    vertices = []
    uv_by_vertex = []
    for row in range(MESH_ROWS + 1):
        v = row / MESH_ROWS
        source_y = min(source_height - 1, max(0, round(v * (source_height - 1))))
        for column in range(MESH_COLUMNS + 1):
            u = column / MESH_COLUMNS
            source_x = min(source_width - 1, max(0, round(crop_left + u * (source_height * FRAME_ASPECT - 1))))
            source_index = source_y * source_width + source_x
            alpha = matte[source_index]
            r, g, b = source_pixels[source_index * 4 : source_index * 4 + 3]
            luma = r * 0.2126 + g * 0.7152 + b * 0.0722
            source_u = source_x / max(1, source_width - 1)
            source_v = source_y / max(1, source_height - 1)

            face_dx = (source_u - face["x"]) / face["rx"]
            face_dy = (source_v - face["y"]) / face["ry"]
            face_hump = math.exp(-0.5 * (face_dx * face_dx + face_dy * face_dy))
            nose_dx = (source_u - face["noseX"]) / 0.030
            nose_dy = (source_v - face["noseY"]) / 0.045
            nose_ridge = math.exp(-0.5 * (nose_dx * nose_dx + nose_dy * nose_dy))
            eyes = 0.0
            for eye_x in face["eyes"]:
                dx = (source_u - eye_x) / 0.045
                dy = (source_v - face["eyeY"]) / 0.027
                eyes += math.exp(-0.5 * (dx * dx + dy * dy))
            shoulders = 0.0
            for center_x in (0.30, 0.68):
                dx = (source_u - center_x) / 0.115
                dy = (source_v - 0.55) / 0.10
                shoulders += math.exp(-0.5 * (dx * dx + dy * dy))
            folded_arm = math.exp(
                -0.5 * (((source_u - 0.54) / 0.26) ** 2 + ((source_v - 0.37) / 0.095) ** 2)
            )
            torso = math.exp(
                -0.5 * (((source_u - 0.50) / 0.23) ** 2 + ((source_v - 0.32) / 0.29) ** 2)
            )

            # The photograph is the surface; this shallow field only lends relief to its real features.
            depth = alpha * (
                0.008
                + 0.031 * torso
                + 0.035 * shoulders
                + 0.037 * folded_arm
                + 0.050 * face_hump
                + 0.065 * nose_ridge
                - 0.008 * eyes
                + max(-0.003, min(0.003, (luma - 0.35) * 0.006))
            )
            vertices.append(((u - 0.5), (v - 0.5) * (1.0 / FRAME_ASPECT), depth))
            uv_by_vertex.append((u, v))

    stride = MESH_COLUMNS + 1
    faces = []
    for row in range(MESH_ROWS):
        for column in range(MESH_COLUMNS):
            lower_left = row * stride + column
            lower_right = lower_left + 1
            upper_left = lower_left + stride
            upper_right = upper_left + 1
            faces.append((lower_left, lower_right, upper_right, upper_left))

    mesh = bpy.data.meshes.new("Subtle facial and shoulder relief grid")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="Photo UV")
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        for loop_index in polygon.loop_indices:
            uv_layer.data[loop_index].uv = uv_by_vertex[mesh.loops[loop_index].vertex_index]

    obj = bpy.data.objects.new("Sudi portrait · photographic shallow relief", mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def face_geometry(vision_data, crop_left, crop_width, source_width, source_height):
    if vision_data and vision_data.get("faces"):
        box = vision_data["faces"][0]["box"]
        # VN points are normalized from the lower-left, matching Blender's UV origin.
        center_x = (box[0] + box[2] * 0.50) * source_width
        center_y = (box[1] + box[3] * 0.52) * source_height
        half_x = box[2] * source_width * 0.65
        half_y = box[3] * source_height * 0.62
        landmarks = vision_data["faces"][0]
        nose = landmarks.get("nose", [])
        left_eye = landmarks.get("leftEye", [])
        right_eye = landmarks.get("rightEye", [])
        nose_x = sum(point[0] for point in nose) / len(nose) if nose else center_x / source_width
        nose_y = sum(point[1] for point in nose) / len(nose) if nose else center_y / source_height
        eye_points = left_eye + right_eye
        eye_xs = [point[0] for point in eye_points]
        eye_ys = [point[1] for point in eye_points]
        return {
            "x": center_x / source_width,
            "y": center_y / source_height,
            "rx": half_x / source_width,
            "ry": half_y / source_height,
            "noseX": nose_x,
            "noseY": nose_y,
            "eyes": eye_xs or [0.43, 0.53],
            "eyeY": sum(eye_ys) / len(eye_ys) if eye_ys else 0.78,
        }

    # Measurements from the supplied 800 x 693 image; no face pixels are synthesized.
    return {"x": 0.465, "y": 0.785, "rx": 0.155, "ry": 0.180, "noseX": 0.468, "noseY": 0.716, "eyes": [0.418, 0.517], "eyeY": 0.770}


def create_material(image):
    material = bpy.data.materials.new("Original portrait image · transparent person matte")
    material.use_nodes = True
    material.diffuse_color = (0.7, 0.65, 0.58, 1)
    material.surface_render_method = "DITHERED"
    nodes = material.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.78
    bsdf.inputs["Metallic"].default_value = 0.0
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.interpolation = "Linear"
    material.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    material.node_tree.links.new(texture.outputs["Alpha"], bsdf.inputs["Alpha"])
    return material


def export_glb():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    model = bpy.data.objects.get("Sudi portrait · photographic shallow relief")
    if model is None:
        raise RuntimeError("The portrait relief mesh was not created")
    model.select_set(True)
    bpy.context.view_layer.objects.active = model
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_yup=False,
    )


def main():
    if not SOURCE.exists():
        raise FileNotFoundError(f"Configured source portrait is missing: {SOURCE}")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    source_hash = sha256(SOURCE.read_bytes()).hexdigest()
    vision_data = source_bound_vision_data()
    source_image, width, height, source_pixels = load_pixels(SOURCE)
    if vision_data and vision_data.get("maskBytes"):
        print("Vision provided a person matte; rebuilding an embedded matte texture.")
        vision_mask_path = Path(tempfile.gettempdir()) / "portrait-relief-vision-mask.png"
        vision_mask_path.write_bytes(vision_data["maskBytes"])
        _, mask_width, mask_height, mask_pixels = load_pixels(vision_mask_path)
        matte = []
        for y in range(height):
            my = min(mask_height - 1, round(y * (mask_height - 1) / (height - 1)))
            for x in range(width):
                mx = min(mask_width - 1, round(x * (mask_width - 1) / (width - 1)))
                matte.append(smoothstep(0.12, 0.82, mask_pixels[(my * mask_width + mx) * 4]))
        vision_mask_path.unlink(missing_ok=True)
    else:
        matte = background_matte(width, height, source_pixels)

    texture, crop_left_ratio, crop_width_ratio = make_portrait_texture(width, height, source_pixels, matte)
    face = face_geometry(vision_data, crop_left_ratio * width, crop_width_ratio * width, width, height)
    model = build_depth_mesh(width, height, crop_left_ratio * width, crop_width_ratio, source_pixels, matte, face)
    model.data.materials.append(create_material(texture))
    export_glb()

    relief_z = max(vertex.co.z for vertex in model.data.vertices) - min(vertex.co.z for vertex in model.data.vertices)
    manifest = {
        "source": "/images/sudi.jpeg",
        "sourceSha256": source_hash,
        "model": "/models/sudi-portrait-relief.glb",
        "texture": {"width": TEXTURE_WIDTH, "height": TEXTURE_HEIGHT, "frameAspect": FRAME_ASPECT},
        "depth": {"faceAndShoulderRelief": True, "zRange": round(relief_z, 5)},
        "vision": bool(vision_data and vision_data.get("faces")),
        "matte": "Vision person segmentation" if vision_data and vision_data.get("maskBytes") else "border-connected neutral-background segmentation",
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Wrote {OUTPUT} ({OUTPUT.stat().st_size:,} bytes) bound to {source_hash[:12]}…")


if __name__ == "__main__":
    main()
