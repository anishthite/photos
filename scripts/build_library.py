#!/usr/bin/env python3
"""Scan ./photos for images and write ./data/photos.json.

Usage:
    python3 scripts/build_library.py [photos_dir]

- Reads EXIF DateTimeOriginal when Pillow is available (optional).
- Falls back to file mtime for dates.
- Extracts the location-ish parent folder name as an album hint.
"""
import json
import os
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS_DIR = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, "photos")
OUT = os.path.join(ROOT, "data", "photos.json")

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".avif", ".bmp", ".tiff"}
VIDEO_EXTS = {".mp4", ".mov", ".webm", ".m4v"}

try:
    from PIL import Image, ExifTags  # type: ignore
except Exception:  # Pillow is optional
    Image = None
    ExifTags = None


def exif_date(path):
    if Image is None:
        return None
    try:
        with Image.open(path) as img:
            exif = img.getexif()
            if not exif:
                return None
            tag = next((k for k, v in ExifTags.TAGS.items() if v == "DateTimeOriginal"), None)
            raw = exif.get(tag) if tag else None
            if raw:
                return datetime.strptime(raw, "%Y:%m:%d %H:%M:%S")
    except Exception:
        return None
    return None


def main():
    photos = []
    for dirpath, _dirnames, filenames in os.walk(PHOTOS_DIR):
        for name in sorted(filenames):
            ext = os.path.splitext(name)[1].lower()
            if ext not in IMAGE_EXTS | VIDEO_EXTS:
                continue
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, PHOTOS_DIR).replace(os.sep, "/")
            stat = os.stat(full)
            taken = exif_date(full) if ext in IMAGE_EXTS else None
            dt = taken or datetime.fromtimestamp(stat.st_mtime)
            album = os.path.relpath(dirpath, PHOTOS_DIR).replace(os.sep, " / ")
            if album == ".":
                album = ""
            photos.append({
                "src": "media/" + rel,
                "name": os.path.splitext(name)[0],
                "date": dt.strftime("%Y-%m-%d"),
                "ts": int(dt.timestamp()),
                "album": album,
                "kind": "video" if ext in VIDEO_EXTS else "photo",
            })

    photos.sort(key=lambda p: p["ts"], reverse=True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump({"count": len(photos), "photos": photos}, f, indent=2)
    print(f"wrote {OUT} with {len(photos)} item(s)")


if __name__ == "__main__":
    main()
