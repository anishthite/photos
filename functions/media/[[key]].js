// functions/media/[key].js — serve originals from the private R2 bucket.
// Reached via the /media/* rewrite in _routes.json. The auth middleware
// runs first, so only signed-in sessions get bytes.

const TYPES = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
  webp: "image/webp", avif: "image/avif", bmp: "image/bmp", tiff: "image/tiff",
  heic: "image/heic", mp4: "video/mp4", mov: "video/quicktime",
  webm: "video/webm", m4v: "video/mp4",
};

export async function onRequestGet(context) {
  const { env, params, request } = context;
  // catch-all params arrive as an array of path segments
  const key = (Array.isArray(params.key) ? params.key : [params.key]).join("/");

  // basic hardening: no traversal, must have a known extension
  if (!key || key.includes("..") || key.startsWith("/")) return new Response("nope", { status: 400 });
  const ext = key.split(".").pop().toLowerCase();
  const type = TYPES[ext];
  if (!type) return new Response("unsupported type", { status: 404 });

  const headers = new Headers();
  if (request.headers.has("Range")) headers.set("Range", request.headers.get("Range"));

  const obj = await env.PHOTOS.get(key, { range: request.headers, onlyIf: request.headers });
  if (!obj) return new Response("not found", { status: 404 });

  const res = new Headers();
  res.set("Content-Type", type);
  res.set("Cache-Control", "private, max-age=86400");
  obj.writeHttpMetadata(res);
  if (obj.range) {
    const { offset, end } = obj.range;
    const len = end !== undefined ? end - offset + 1 : obj.size - offset;
    res.set("Content-Range", `bytes ${offset}-${end !== undefined ? end : obj.size - 1}/${obj.size}`);
    res.set("Content-Length", String(len));
    res.set("Accept-Ranges", "bytes");
    return new Response(obj.body, { status: 206, headers: res });
  }
  res.set("Content-Length", String(obj.size));
  res.set("Accept-Ranges", "bytes");
  return new Response(obj.body, { headers: res });
}
