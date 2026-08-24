// functions/data/photos.json.js — serve the library index.
// R2 (_index/photos.json) is the source of truth once uploads happen;
// the static file built by scripts/build_library.py is the fallback
// for a fresh deploy before anything has been uploaded.

export async function onRequestGet(context) {
  const { env, next } = context;
  const obj = await env.PHOTOS.get("_index/photos.json");
  if (!obj) return next(); // fall back to the static data/photos.json
  return new Response(obj.body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    },
  });
}
