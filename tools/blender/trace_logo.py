"""Trace the S-mark in public/images/sudi-logo.png into smooth outline polygons.

Usage: python3 tools/blender/trace_logo.py
Writes tools/blender/logo-mark.json, which build_cosmos.py extrudes in Blender.
Needs Pillow and numpy; Blender itself only reads the JSON.
"""
import json
import pathlib
from collections import deque

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'public/images/sudi-logo.png'
TARGET = pathlib.Path(__file__).with_name('logo-mark.json')
MARK_WIDTH = 303  # columns 0..302 hold the mark; the "Sudi David" letters start after a gap.


def components(mask):
    labels = np.zeros(mask.shape, int)
    count = 0
    for start in zip(*np.nonzero(mask)):
        if labels[start]:
            continue
        count += 1
        labels[start] = count
        queue = deque([start])
        while queue:
            y, x = queue.popleft()
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and mask[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = count
                    queue.append((ny, nx))
    return [labels == i for i in range(1, count + 1)]


def outline(mask):
    """Moore-neighbour trace of the outer boundary, as (x, y) pixel centres."""
    padded = np.pad(mask, 1)
    ys, xs = np.nonzero(padded)
    start = (ys[0], xs[0])
    around = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]
    points, current, backtrack = [start], start, 6
    while True:
        for step in range(8):
            direction = (backtrack + step) % 8
            ny, nx = current[0] + around[direction][0], current[1] + around[direction][1]
            if padded[ny, nx]:
                current = (ny, nx)
                backtrack = (direction + 5) % 8
                break
        if current == start:
            break
        points.append(current)
    return np.array([(x - 1, y - 1) for y, x in points], float)


def smooth(points, window=7):
    kernel = np.ones(window) / window
    wrapped = np.concatenate([points[-window:], points, points[:window]])
    return np.stack([np.convolve(wrapped[:, i], kernel, 'same')[window:-window] for i in range(2)], 1)


def simplify(points, tolerance):
    """Ramer-Douglas-Peucker on an open polyline."""
    if len(points) < 3:
        return points
    start, end = points[0], points[-1]
    line = end - start
    length = np.hypot(*line) or 1.0
    distances = np.abs(line[0] * (points[:, 1] - start[1]) - line[1] * (points[:, 0] - start[0])) / length
    index = int(np.argmax(distances))
    if distances[index] <= tolerance:
        return np.array([start, end])
    return np.concatenate([simplify(points[:index + 1], tolerance)[:-1], simplify(points[index:], tolerance)])


def main():
    alpha = np.array(Image.open(SOURCE))[:, :MARK_WIDTH, 3] > 128
    parts = sorted(components(alpha), key=lambda part: np.nonzero(part)[0].mean())
    polygons = []
    for part in parts:
        points = smooth(outline(part))
        half = len(points) // 2
        closed = np.concatenate([simplify(points[:half + 1], 0.35)[:-1], simplify(points[half:], 0.35)[:-1]])
        polygons.append([[round(float(x), 2), round(float(y), 2)] for x, y in closed])
    TARGET.write_text(json.dumps({'source': 'public/images/sudi-logo.png', 'size': [MARK_WIDTH, alpha.shape[0]], 'parts': polygons}) + '\n')
    print(f'{len(polygons)} parts, {[len(p) for p in polygons]} points -> {TARGET.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
