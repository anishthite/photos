// functions/api/upload.js — POST JSON { files: [{name, type, data(b64)}], album? } → R2 + index.
// Note: we accept base64 JSON instead of multipart because Pages' production
// multipart parser decomposes File parts into strings; JSON is reliable
// everywhere (browser, iOS Shortcuts, curl).

const TYPES = {
  "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif",
  "image/webp": "webp", "image/avif": "avif", "image/heic": "heic",
  "image/bmp": "bmp", "image/tiff": "tiff",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
};
const MAX_FILE_BYTES = 30 * 1024 * 1024;
const MAX_FILES = 25;

function sanitizeAlbum(raw) {
  return String(raw || "").toLowerCase().replace(/[^a-z0-9-_ ]/g, "").trim()
    .replace(/\s+/g, "-").slice(0, 60);
}

function safeName(name, fallbackExt) {
  const base = String(name || "photo").split("/").pop().split("\\").pop();
  const dot = base.lastIndexOf(".");
  const stem = (dot > 0 ? base.slice(0, dot) : base)
    .toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "photo";
  return `${stem}.${fallbackExt}`;
}

function b64ToBytes(b64) {
  const bin = atob(b64.replace(/^data:[^,]*,/, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function readIndex(env, context) {
  const obj = await env.PHOTOS.get("_index/photos.json");
  if (obj) return obj.json();
  // First-ever write: seed from the static file built by build_library.py so
  // uploads don't clobber the scanned library.
  if (context) {
    try {
      const res = await context.next();
      if (res.ok) {
        const seeded = await res.json();
        if (seeded && Array.isArray(seeded.photos)) {
          await writeIndex(env, { count: seeded.photos.length, photos: seeded.photos });
          return { count: seeded.photos.length, photos: seeded.photos };
        }
      }
    } catch { /* fall through to empty */ }
  }
  return { count: 0, photos: [] };
}

export async function writeIndex(env, index) {
  index.photos.sort((a, b) => b.ts - a.ts);
  index.count = index.photos.length;
  await env.PHOTOS.put("_index/photos.json", JSON.stringify(index, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });
  return index;
}

export async function putPhoto(env, index, { bytes, type, name, album }) {
  const ext = TYPES[type];
  if (!ext) return { name, error: "unsupported type " + type };
  if (bytes.byteLength > MAX_FILE_BYTES) return { name, error: "file too large" };

  let finalName = safeName(name, ext);
  let key = album ? `${album}/${finalName}` : finalName;
  let n = 2;
  while (await env.PHOTOS.head(key)) {
    const d = finalName.lastIndexOf(".");
    finalName = `${finalName.slice(0, d)}-${n}${finalName.slice(d)}`;
    key = album ? `${album}/${finalName}` : finalName;
    n++;
  }

  await env.PHOTOS.put(key, bytes, { httpMetadata: { contentType: type } });

  const now = Date.now();
  index.photos.push({
    src: "media/" + key,
    name: finalName.replace(/\.[a-z0-9]+$/, ""),
    date: new Date(now).toISOString().slice(0, 10),
    ts: Math.floor(now / 1000),
    album,
    kind: type.startsWith("video/") ? "video" : "photo",
  });
  return { name: finalName, key, ok: true };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: "expected JSON body" }, { status: 400 }); }

  const album = sanitizeAlbum(body.album);
  const files = Array.isArray(body.files) ? body.files.slice(0, MAX_FILES) : [];
  if (!files.length) return Response.json({ ok: false, error: "no files" }, { status: 400 });

  const index = await readIndex(env, context);
  const added = [];
  for (const f of files) {
    try {
      const bytes = b64ToBytes(String(f.data || ""));
      added.push(await putPhoto(env, index, { bytes, type: String(f.type || ""), name: String(f.name || "photo"), album }));
    } catch (e) {
      added.push({ name: String(f.name || "?"), error: "decode failed" });
    }
  }

  await writeIndex(env, index);
  return Response.json({ ok: true, added });
}
