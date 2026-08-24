// functions/api/import-url.js — POST { url, album? } → fetch server-side → R2 + index.
// The "drop a link" path: paste an image URL, we grab it and file it.

import { readIndex, writeIndex, putPhoto } from "./upload.js";

const EXT_BY_TYPE = {
  "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif",
  "image/webp": "webp", "image/avif": "avif", "image/heic": "heic",
  "image/bmp": "bmp", "image/tiff": "tiff",
  "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm",
};
const MAX_BYTES = 40 * 1024 * 1024;

function sanitizeAlbum(raw) {
  return String(raw || "").toLowerCase().replace(/[^a-z0-9-_ ]/g, "").trim()
    .replace(/\s+/g, "-").slice(0, 60);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let url, album;
  try {
    const body = await request.json();
    url = new URL(String(body.url || ""));
    album = sanitizeAlbum(body.album);
  } catch {
    return Response.json({ ok: false, error: "bad url" }, { status: 400 });
  }

  // SSRF guard: http(s) only, no internal/link-local hosts
  if (!/^https?:$/.test(url.protocol)) {
    return Response.json({ ok: false, error: "http(s) urls only" }, { status: 400 });
  }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(":")) {
    return Response.json({ ok: false, error: "that host is not allowed" }, { status: 400 });
  }

  let upstream;
  try {
    upstream = await fetch(url.toString(), {
      headers: { "User-Agent": "photos.thite.site importer", "Accept": "image/*,video/*" },
      redirect: "follow",
    });
  } catch {
    return Response.json({ ok: false, error: "could not reach that url" }, { status: 502 });
  }

  const type = (upstream.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!upstream.ok || !EXT_BY_TYPE[type]) {
    return Response.json({ ok: false, error: `not an image/video (got ${type || upstream.status})` }, { status: 422 });
  }
  const len = Number(upstream.headers.get("content-length") || 0);
  if (len > MAX_BYTES) return Response.json({ ok: false, error: "file too large" }, { status: 413 });

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  const tail = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "photo");

  const index = await readIndex(env, context);
  const result = await putPhoto(env, index, { bytes, type, name: tail, album });
  if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 422 });

  await writeIndex(env, index);
  return Response.json({ ok: true, key: result.key, name: result.name });
}
