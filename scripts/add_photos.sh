#!/bin/sh
# add_photos.sh — import photos, rebuild the index, redeploy to Cloudflare Pages.
#
# Usage:
#   scripts/add_photos.sh ~/Desktop/vacation          # copies a folder of images in
#   scripts/add_photos.sh ~/Desktop/pic.jpg beach     # copies one file into photos/beach/
#   scripts/add_photos.sh --no-deploy ~/Downloads/pics
#
# After importing it runs build_library.py and (unless --no-deploy)
# pushes the whole folder to Cloudflare Pages via wrangler.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEPLOY=1
if [ "$1" = "--no-deploy" ]; then
  DEPLOY=0
  shift
fi

SRC="$1"
ALBUM="$2"

if [ -z "$SRC" ]; then
  echo "usage: $0 [--no-deploy] <file-or-folder> [album-name]" >&2
  exit 1
fi

DEST="photos"
[ -n "$ALBUM" ] && DEST="photos/$ALBUM"
mkdir -p "$DEST"

if [ -d "$SRC" ]; then
  COPIED=0
  for f in "$SRC"/*; do
    case "$(echo "${f##*.}" | tr 'A-Z' 'a-z')" in
      jpg|jpeg|png|gif|webp|heic|avif|bmp|tiff|mp4|mov|webm|m4v)
        cp -v "$f" "$DEST/" && COPIED=$((COPIED + 1));;
    esac
  done
  [ "$COPIED" -gt 0 ] || { echo "no image/video files found in $SRC" >&2; exit 1; }
else
  cp -v "$SRC" "$DEST/"
fi

python3 scripts/build_library.py

echo "uploading new/changed objects to r2…"
find photos -type f ! -name ".gitkeep" | while read -r f; do
  key="${f#photos/}"
  wrangler r2 object put "photos-library/$key" --file "$f" --content-type "$(file -b --mime-type "$f")" --remote >/dev/null
done

if [ "$DEPLOY" = "1" ]; then
  wrangler pages deploy . --project-name photos --branch main --commit-dirty=true
fi

echo "done."
